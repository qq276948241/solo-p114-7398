const { pool } = require('../config/db');
const { PRODUCT_STATUS } = require('../config');
const { success } = require('../utils/response');
const { asyncHandler, BusinessError } = require('../middleware/errorHandler');

const getProducts = asyncHandler(async (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC';

  const [rows] = await pool.query(sql, params);
  res.json(success(rows));
});

const getProductDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [rows] = await pool.query(
    'SELECT p.*, i.date, i.total_quantity, i.remaining_quantity FROM products p LEFT JOIN inventory i ON p.id = i.product_id WHERE p.id = ? ORDER BY i.date ASC',
    [id]
  );

  if (rows.length === 0) {
    throw new BusinessError('商品不存在', 404);
  }

  const product = {
    id: rows[0].id,
    name: rows[0].name,
    description: rows[0].description,
    price: rows[0].price,
    image: rows[0].image,
    status: rows[0].status,
    created_at: rows[0].created_at,
    updated_at: rows[0].updated_at,
    inventory: rows[0].date ? rows.map(r => ({
      date: r.date,
      total_quantity: r.total_quantity,
      remaining_quantity: r.remaining_quantity
    })) : []
  };

  res.json(success(product));
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, image, status } = req.body;

  const [result] = await pool.query(
    'INSERT INTO products (name, description, price, image, status) VALUES (?, ?, ?, ?, ?)',
    [name, description || null, price, image || null, status || PRODUCT_STATUS.ON_SALE]
  );

  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
  res.json(success(rows[0], '商品创建成功'));
});

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, price, image, status } = req.body;

  const [exists] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
  if (exists.length === 0) {
    throw new BusinessError('商品不存在', 404);
  }

  const updateFields = [];
  const updateValues = [];

  if (name !== undefined) {
    updateFields.push('name = ?');
    updateValues.push(name);
  }
  if (description !== undefined) {
    updateFields.push('description = ?');
    updateValues.push(description);
  }
  if (price !== undefined) {
    updateFields.push('price = ?');
    updateValues.push(price);
  }
  if (image !== undefined) {
    updateFields.push('image = ?');
    updateValues.push(image);
  }
  if (status !== undefined) {
    updateFields.push('status = ?');
    updateValues.push(status);
  }

  if (updateFields.length === 0) {
    throw new BusinessError('没有需要更新的字段', 400);
  }

  updateValues.push(id);

  await pool.query(
    `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  res.json(success(rows[0], '商品更新成功'));
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [exists] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
  if (exists.length === 0) {
    throw new BusinessError('商品不存在', 404);
  }

  await pool.query('DELETE FROM products WHERE id = ?', [id]);
  res.json(success(null, '商品删除成功'));
});

const setProductStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const [exists] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
  if (exists.length === 0) {
    throw new BusinessError('商品不存在', 404);
  }

  if (![PRODUCT_STATUS.ON_SALE, PRODUCT_STATUS.OFF_SALE].includes(status)) {
    throw new BusinessError('无效的状态值', 400);
  }

  await pool.query('UPDATE products SET status = ? WHERE id = ?', [status, id]);

  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  res.json(success(rows[0], status === PRODUCT_STATUS.ON_SALE ? '商品已上架' : '商品已下架'));
});

const setInventory = asyncHandler(async (req, res) => {
  const { product_id, date, total_quantity } = req.body;

  const [productExists] = await pool.query('SELECT id FROM products WHERE id = ?', [product_id]);
  if (productExists.length === 0) {
    throw new BusinessError('商品不存在', 404);
  }

  const [existing] = await pool.query(
    'SELECT * FROM inventory WHERE product_id = ? AND date = ?',
    [product_id, date]
  );

  if (existing.length > 0) {
    const usedQuantity = existing[0].total_quantity - existing[0].remaining_quantity;
    if (total_quantity < usedQuantity) {
      throw new BusinessError(`库存不能少于已售出数量 ${usedQuantity}`, 400);
    }
    const newRemaining = total_quantity - usedQuantity;
    await pool.query(
      'UPDATE inventory SET total_quantity = ?, remaining_quantity = ? WHERE id = ?',
      [total_quantity, newRemaining, existing[0].id]
    );
  } else {
    await pool.query(
      'INSERT INTO inventory (product_id, date, total_quantity, remaining_quantity) VALUES (?, ?, ?, ?)',
      [product_id, date, total_quantity, total_quantity]
    );
  }

  const [rows] = await pool.query(
    'SELECT * FROM inventory WHERE product_id = ? AND date = ?',
    [product_id, date]
  );

  res.json(success(rows[0], '库存设置成功'));
});

const getInventory = asyncHandler(async (req, res) => {
  const { date } = req.query;
  let sql = `
    SELECT i.*, p.name as product_name, p.price, p.status 
    FROM inventory i 
    LEFT JOIN products p ON i.product_id = p.id 
    WHERE 1=1
  `;
  const params = [];

  if (date) {
    sql += ' AND i.date = ?';
    params.push(date);
  }

  sql += ' ORDER BY i.date ASC, i.product_id ASC';

  const [rows] = await pool.query(sql, params);
  res.json(success(rows));
});

module.exports = {
  getProducts,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
  setProductStatus,
  setInventory,
  getInventory
};
