import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authMiddleware from './middleware/authMiddleware.js';

// 加载环境变量
dotenv.config({
  path: path.resolve(process.cwd(), '.env')
});

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors());
app.use(express.json());

// 导入路由
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import performanceRoutes from './routes/performanceRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

// 健康检查端点（放在最前面）
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 注册路由
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/notifications', notificationRoutes);

// 测试端点，直接在index.js中添加
app.put('/api/performance-test/:id', authMiddleware, async (req, res) => {
  console.log('测试更新端点被调用:', req.params.id);
  try {
    res.json({
      code: 200,
      message: 'success',
      data: { id: req.params.id, ...req.body }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Error' });
  }
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ code: 404, message: 'Not Found' });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ code: 500, message: 'Internal Server Error' });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`服务器运行在 http://127.0.0.1:${PORT}`);
});

export default app;