const { pool } = require('../config/db');
const { ORDER_CUTOFF_HOUR, PRODUCT_STATUS, ORDER_STATUS, TIME_SLOTS, ROLES } = require('../config');
const { success } = require('../utils/response');
const { asyncHandler, BusinessError } = require('../middleware/errorHandler');
const { generateOrderNo, isValidTimeSlot, isBeforeCutoffTime, getTomorrow, getDayAfterTomorrow } = require('../utils/order');

const createOrder = asyncHandler(async (req, res) => {
  const { product_id, quantity, pickup_date, pickup_slot } = req.body;
  const userId = req.user.id;

  const [productRows] = await pool.query('SELECT * FROM products WHERE id = ?', [product_id]);
  if (productRows.length === 0) {
    throw new BusinessError('商品不存在', 404);
  }

  const product = productRows[0];
  if (product.status !== PRODUCT_STATUS.ON_SALE) {
    throw new BusinessError('商品已下架', 400);
  }

  if (!isValidTimeSlot(pickup_slot)) {
    throw new BusinessError('无效的取货时段', 400);
  }

  const pickupDateObj = new Date(pickup_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  if (pickupDateObj < tomorrow) {
    throw new BusinessError('只能预订明天及以后的面包', 400);
  }

  if (pickupDateObj.getTime() === tomorrow.getTime() && !isBeforeCutoffTime(ORDER_CUTOFF_HOUR)) {
    throw new BusinessError(`已过当日${ORDER_CUTOFF_HOUR}点截单时间，无法预订明天的面包`, 400);
  }

  if (pickupDateObj > dayAfterTomorrow) {
    throw new BusinessError('只能预订明天和后天的面包', 400);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [inventoryRows] = await connection.query(
      'SELECT * FROM inventory WHERE product_id = ? AND date = ? FOR UPDATE',
      [product_id, pickup_date]
    );

    if (inventoryRows.length === 0) {
      throw new BusinessError('该日期暂无此商品的库存', 400);
    }

    const inventory = inventoryRows[0];
    if (inventory.remaining_quantity < quantity) {
      throw new BusinessError(`库存不足，剩余 ${inventory.remaining_quantity} 个`, 400, {
        remaining_quantity: inventory.remaining_quantity,
        requested_quantity: quantity
      });
    }

    const [updateResult] = await connection.query(
      'UPDATE inventory SET remaining_quantity = remaining_quantity - ? WHERE id = ? AND remaining_quantity >= ?',
      [quantity, inventory.id, quantity]
    );

    if (updateResult.affectedRows === 0) {
      throw new BusinessError('库存扣减失败，请重试', 400);
    }

    const totalAmount = (product.price * quantity).toFixed(2);
    const orderNo = generateOrderNo();

    const [orderResult] = await connection.query(
      'INSERT INTO orders (order_no, user_id, product_id, quantity, pickup_date, pickup_slot, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [orderNo, userId, product_id, quantity, pickup_date, pickup_slot, totalAmount, ORDER_STATUS.PENDING]
    );

    await connection.commit();

    const [orderRows] = await pool.query(`
      SELECT o.*, p.name as product_name, p.price, p.image, u.phone, u.name as user_name
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [orderResult.insertId]);

    res.json(success(orderRows[0], '下单成功'));
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
});

const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status } = req.query;

  let sql = `
    SELECT o.*, p.name as product_name, p.price, p.image
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    WHERE o.user_id = ?
  `;
  const params = [userId];

  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY o.created_at DESC';

  const [rows] = await pool.query(sql, params);
  res.json(success(rows));
});

const getOrderDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  let sql = `
    SELECT o.*, p.name as product_name, p.price, p.image, p.description, u.phone, u.name as user_name
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `;
  const params = [id];

  if (userRole === ROLES.CUSTOMER) {
    sql += ' AND o.user_id = ?';
    params.push(userId);
  }

  const [rows] = await pool.query(sql, params);

  if (rows.length === 0) {
    throw new BusinessError('订单不存在', 404);
  }

  res.json(success(rows[0]));
});

const getProductionList = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date || getTomorrow();

  const [rows] = await pool.query(`
    SELECT 
      o.product_id,
      p.name as product_name,
      p.price,
      SUM(o.quantity) as total_quantity,
      COUNT(o.id) as order_count,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'order_id', o.id,
          'order_no', o.order_no,
          'user_name', u.name,
          'user_phone', u.phone,
          'quantity', o.quantity,
          'pickup_slot', o.pickup_slot,
          'status', o.status
        )
      ) as orders
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.pickup_date = ?
    GROUP BY o.product_id, p.name, p.price
    ORDER BY o.product_id ASC
  `, [targetDate]);

  const [slotSummary] = await pool.query(`
    SELECT pickup_slot, COUNT(*) as order_count, SUM(quantity) as total_quantity
    FROM orders
    WHERE pickup_date = ?
    GROUP BY pickup_slot
    ORDER BY pickup_slot ASC
  `, [targetDate]);

  res.json(success({
    date: targetDate,
    products: rows,
    slot_summary: slotSummary
  }));
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const [exists] = await pool.query('SELECT id FROM orders WHERE id = ?', [id]);
  if (exists.length === 0) {
    throw new BusinessError('订单不存在', 404);
  }

  await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

  const [rows] = await pool.query(`
    SELECT o.*, p.name as product_name, p.price, u.phone, u.name as user_name
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `, [id]);

  const statusText = {
    [ORDER_STATUS.PENDING]: '待生产',
    [ORDER_STATUS.READY]: '可取',
    [ORDER_STATUS.PICKED]: '已取'
  };

  res.json(success(rows[0], `订单状态已更新为${statusText[status] || status}`));
});

const getOrders = asyncHandler(async (req, res) => {
  const { date, status, user_id } = req.query;

  let sql = `
    SELECT o.*, p.name as product_name, p.price, p.image, u.phone, u.name as user_name
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN users u ON o.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (date) {
    sql += ' AND o.pickup_date = ?';
    params.push(date);
  }
  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }
  if (user_id) {
    sql += ' AND o.user_id = ?';
    params.push(user_id);
  }

  sql += ' ORDER BY o.pickup_date ASC, o.pickup_slot ASC, o.created_at DESC';

  const [rows] = await pool.query(sql, params);
  res.json(success(rows));
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderDetail,
  getProductionList,
  updateOrderStatus,
  getOrders
};
