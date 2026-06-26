const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

let customerToken = '';
let kitchenToken = '';
let adminToken = '';

async function request(method, path, data = null, token = null) {
  const config = {
    method,
    url: `${API_URL}${path}`,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    return error.response ? error.response.data : { error: error.message };
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAuth() {
  console.log('\n=== 1. 用户登录测试 ===\n');

  const phone = '13800000001';
  const kitchenPhone = '13800000002';
  const adminPhone = '13800000000';

  console.log('发送验证码（顾客）:', phone);
  const sendCodeResult = await request('POST', '/auth/send-code', { phone });
  console.log('结果:', JSON.stringify(sendCodeResult, null, 2));

  const codeMatch = sendCodeResult.message.match(/验证码已发送（模拟）：(\d+)/);
  if (!codeMatch) {
    console.log('未能提取验证码，跳过登录测试');
    return;
  }

  const code = codeMatch[1];
  console.log('\n使用验证码登录:', code);
  const loginResult = await request('POST', '/auth/login', { phone, code });
  console.log('结果:', JSON.stringify(loginResult, null, 2));

  if (loginResult.data && loginResult.data.token) {
    customerToken = loginResult.data.token;
    console.log('\n顾客Token获取成功');
  }

  console.log('\n--- 后厨登录 ---');
  const sendCodeKitchen = await request('POST', '/auth/send-code', { phone: kitchenPhone });
  const kitchenCodeMatch = sendCodeKitchen.message.match(/验证码已发送（模拟）：(\d+)/);
  if (kitchenCodeMatch) {
    const kitchenLogin = await request('POST', '/auth/login', { phone: kitchenPhone, code: kitchenCodeMatch[1] });
    if (kitchenLogin.data && kitchenLogin.data.token) {
      kitchenToken = kitchenLogin.data.token;
      console.log('后厨Token获取成功');
    }
  }

  console.log('\n--- 管理员登录 ---');
  const sendCodeAdmin = await request('POST', '/auth/send-code', { phone: adminPhone });
  const adminCodeMatch = sendCodeAdmin.message.match(/验证码已发送（模拟）：(\d+)/);
  if (adminCodeMatch) {
    const adminLogin = await request('POST', '/auth/login', { phone: adminPhone, code: adminCodeMatch[1] });
    if (adminLogin.data && adminLogin.data.token) {
      adminToken = adminLogin.data.token;
      console.log('管理员Token获取成功');
    }
  }

  console.log('\n--- 获取个人信息 ---');
  const profile = await request('GET', '/auth/profile', null, customerToken);
  console.log('个人信息:', JSON.stringify(profile, null, 2));
}

async function testProducts() {
  console.log('\n=== 2. 商品管理测试 ===\n');

  console.log('获取商品列表:');
  const products = await request('GET', '/products', null, customerToken);
  console.log('结果:', JSON.stringify(products, null, 2));

  if (products.data && products.data.length > 0) {
    const productId = products.data[0].id;
    console.log('\n获取商品详情 ID:', productId);
    const detail = await request('GET', `/products/${productId}`, null, customerToken);
    console.log('结果:', JSON.stringify(detail, null, 2));
  }

  console.log('\n--- 设置库存（后厨权限） ---');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const inventoryResult = await request('POST', '/products/inventory', {
    product_id: 1,
    date: tomorrowStr,
    total_quantity: 100
  }, kitchenToken);
  console.log('设置库存结果:', JSON.stringify(inventoryResult, null, 2));

  console.log('\n--- 获取库存列表 ---');
  const inventoryList = await request('GET', '/products/inventory/list', null, kitchenToken);
  console.log('库存列表:', JSON.stringify(inventoryList, null, 2));
}

async function testOrders() {
  console.log('\n=== 3. 下单测试 ===\n');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  console.log('创建订单（顾客）:');
  const orderResult = await request('POST', '/orders', {
    product_id: 1,
    quantity: 2,
    pickup_date: tomorrowStr,
    pickup_slot: '08:00-09:00'
  }, customerToken);
  console.log('结果:', JSON.stringify(orderResult, null, 2));

  console.log('\n查看我的订单:');
  const myOrders = await request('GET', '/orders/my', null, customerToken);
  console.log('结果:', JSON.stringify(myOrders, null, 2));

  if (myOrders.data && myOrders.data.length > 0) {
    const orderId = myOrders.data[0].id;
    console.log('\n查看订单详情 ID:', orderId);
    const orderDetail = await request('GET', `/orders/${orderId}`, null, customerToken);
    console.log('结果:', JSON.stringify(orderDetail, null, 2));
  }

  console.log('\n--- 后厨查看明日生产清单 ---');
  const productionList = await request('GET', '/orders/production', null, kitchenToken);
  console.log('生产清单:', JSON.stringify(productionList, null, 2));

  if (myOrders.data && myOrders.data.length > 0) {
    const orderId = myOrders.data[0].id;
    console.log('\n--- 更新订单状态为可取 ---');
    const updateStatus = await request('PATCH', `/orders/${orderId}/status`, { status: 'ready' }, kitchenToken);
    console.log('更新结果:', JSON.stringify(updateStatus, null, 2));
  }
}

async function runAllTests() {
  console.log('========================================');
  console.log('🍞 面包店预订系统 API 自动化测试');
  console.log('========================================');

  try {
    await testAuth();
    await delay(500);
    await testProducts();
    await delay(500);
    await testOrders();

    console.log('\n========================================');
    console.log('✅ 所有测试执行完成');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n❌ 测试执行出错:', error);
  }
}

runAllTests();
