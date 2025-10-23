import express from 'express';
import pool, { executeQuery } from '../config/db.js';
import authMiddleware from '../middleware/authMiddleware.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// 获取员工列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM employees WHERE 1=1';
    let params = [];
    
    if (search) {
      query += ' AND (name LIKE ? OR username LIKE ? OR department LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const employees = await executeQuery(query, params);
    const totalResult = await executeQuery('SELECT COUNT(*) as total FROM employees');
    
    res.json({
      code: 200,
      message: 'success',
      data: employees,
      total: totalResult[0].total
    });
  } catch (error) {
    console.error('获取员工列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 根据ID获取单个员工
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const employees = await executeQuery('SELECT * FROM employees WHERE id = ?', [id]);
    
    if (employees.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '员工不存在'
      });
    }
    
    res.json({
      code: 200,
      message: 'success',
      data: employees[0]
    });
  } catch (error) {
    console.error('获取员工信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 根据用户名获取员工
router.get('/username/:username', authMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    const employees = await executeQuery('SELECT * FROM employees WHERE username = ?', [username]);
    
    if (employees.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '员工不存在'
      });
    }
    
    res.json({
      code: 200,
      message: 'success',
      data: employees[0]
    });
  } catch (error) {
    console.error('获取员工信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 创建员工
router.post('/', authMiddleware, async (req, res) => {
  try {
    // 检查是否为管理员权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '没有权限进行此操作'
      });
    }
    
    const { username, password, name, role, department, is_active = true } = req.body;
    
    // 对密码进行哈希处理
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    const result = await executeQuery(
      'INSERT INTO employees (username, password_hash, name, role, department, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [username, password_hash, name, role, department, is_active]
    );
    
    res.status(201).json({
      code: 200,
      message: 'success',
      data: {
        id: result.insertId,
        username,
        name,
        role,
        department,
        is_active,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('创建员工失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 更新员工信息
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // 检查是否为管理员权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '没有权限进行此操作'
      });
    }
    
    const { id } = req.params;
    const { name, department, role, is_active } = req.body;
    
    const result = await executeQuery(
      'UPDATE employees SET name = ?, department = ?, role = ?, is_active = ? WHERE id = ?',
      [name, department, role, is_active, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: '员工不存在'
      });
    }
    
    const updatedEmployee = await executeQuery('SELECT * FROM employees WHERE id = ?', [id]);
    
    res.json({
      code: 200,
      message: 'success',
      data: updatedEmployee[0]
    });
  } catch (error) {
    console.error('更新员工信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 删除员工 - 实现的主要接口
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // 检查是否为管理员权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '没有权限进行此操作'
      });
    }
    
    const { id } = req.params;
    
    // 检查员工是否存在
    const employees = await executeQuery('SELECT * FROM employees WHERE id = ?', [id]);
    if (employees.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '员工不存在'
      });
    }
    
    // 执行删除操作
    await executeQuery('DELETE FROM employees WHERE id = ?', [id]);
    
    res.json({
      code: 200,
      message: 'success'
    });
  } catch (error) {
    console.error('删除员工失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 重置员工密码
router.post('/:id/reset-password', authMiddleware, async (req, res) => {
  try {
    // 检查是否为管理员权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '没有权限进行此操作'
      });
    }
    
    const { id } = req.params;
    const { newPassword } = req.body;
    
    // 生成盐值并哈希密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    const result = await executeQuery(
      'UPDATE employees SET password_hash = ? WHERE id = ?',
      [hashedPassword, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: '员工不存在'
      });
    }
    
    res.json({
      code: 200,
      message: 'success'
    });
  } catch (error) {
    console.error('重置密码失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

export default router;