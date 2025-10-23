import express from 'express';
import pool, { executeQuery } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authMiddleware from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// 登录接口
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 查询用户
    const users = await executeQuery('SELECT * FROM employees WHERE username = ?', [username]);
    
    if (users.length === 0) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误'
      });
    }
    
    const user = users[0];
    
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误'
      });
    }
    
    // 检查用户状态
    if (!user.is_active) {
      return res.status(401).json({
        code: 401,
        message: '账号已被禁用'
      });
    }
    
    // 检查用户角色
    // 从请求头判断是否来自wap端
    const isWapRequest = req.headers['user-agent']?.includes('Mobile') || req.headers['x-client-type'] === 'wap';
    
    // Wap端允许员工角色登录，后台系统只允许管理员角色登录
    if (!isWapRequest && user.role !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '没有权限登录后台系统，请使用管理员账号'
      });
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.role
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      {
        expiresIn: '24h'
      }
    );
    
    res.json({
      code: 200,
      message: 'success',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      code: 500,
      message: '登录失败，请重试'
    });
  }
});

// 退出登录
router.post('/logout', authMiddleware, (req, res) => {
  // 在实际应用中，这里可能需要将令牌加入黑名单
  res.json({
    code: 200,
    message: 'success'
  });
});

// 获取当前用户信息
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { id } = req.user;
    const users = await executeQuery('SELECT id, name, role FROM employees WHERE id = ?', [id]);
    
    if (users.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }
    
    res.json({
      code: 200,
      message: 'success',
      data: users[0]
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

export default router;