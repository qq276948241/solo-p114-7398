require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PORT } = require('./config');
const { testConnection } = require('./config/db');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { success } = require('./utils/response');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/', (req, res) => {
  res.json(success({
    name: '面包店预订系统 API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders'
    }
  }));
});

app.get('/health', (req, res) => {
  res.json(success({ status: 'ok', timestamp: new Date().toISOString() }));
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`🚀 面包店预订系统后端已启动`);
      console.log(`📍 服务地址: http://localhost:${PORT}`);
      console.log(`📚 API 文档: http://localhost:${PORT}/`);
      console.log(`💊 健康检查: http://localhost:${PORT}/health`);
      console.log(`========================================\n`);
    });
  } catch (err) {
    console.error('启动服务器失败:', err);
    process.exit(1);
  }
}

startServer();
