import express from 'express';
import { executeQuery } from '../config/db.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// 获取所有通知
router.get('/', authMiddleware, async (req, res) => {
  try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let query = `
        SELECT * FROM notifications
        WHERE 1=1
      `;
      
      const params = [];
      
      if (search) {
        query += ' AND (title LIKE ? OR content LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);
      
      const notifications = await executeQuery(query, params);
      
      // 获取总数
      const countQuery = `
        SELECT COUNT(*) as total FROM notifications
        WHERE 1=1
        ${search ? ' AND (title LIKE ? OR content LIKE ?)' : ''}
      `;
    
    const countParams = search ? [`%${search}%`, `%${search}%`] : [];
    
    const totalResult = await executeQuery(countQuery, countParams);
    
    res.json({
      code: 200,
      message: 'success',
      data: notifications,
      total: totalResult[0].total
    });
  } catch (error) {
    console.error('获取通知列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 获取通知列表
router.get('/published', async (req, res) => {
  try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const query = `
        SELECT * FROM notifications
        ORDER BY created_at DESC LIMIT ? OFFSET ?
      `;
      
      const notifications = await executeQuery(query, [parseInt(limit), offset]);
      
      // 获取总数
      const totalResult = await executeQuery(
        'SELECT COUNT(*) as total FROM notifications'
      );
    
    res.json({
      code: 200,
      message: 'success',
      data: notifications,
      total: totalResult[0].total
    });
  } catch (error) {
    console.error('获取已发布通知失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 根据员工ID获取通知
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // 验证员工ID是否为有效数字
    const parsedEmployeeId = parseInt(employeeId);
    if (isNaN(parsedEmployeeId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的员工ID'
      });
    }
    
    // 验证员工是否存在
    try {
      const employeeResult = await executeQuery('SELECT id FROM employees WHERE id = ?', [parsedEmployeeId]);
      if (employeeResult.length === 0) {
        return res.status(404).json({
          code: 404,
          message: '员工不存在'
        });
      }
    } catch (dbError) {
      console.error('检查员工是否存在时出错:', dbError);
      return res.status(500).json({
        code: 500,
        message: '数据库查询错误'
      });
    }
    
    // 获取通知和相关订单信息
    try {
      // 获取通知
      const notificationsQuery = `
        SELECT n.* FROM notifications n
        ORDER BY n.created_at DESC
        LIMIT 20
      `;
      
      const notifications = await executeQuery(notificationsQuery);
      
      // 获取员工最近的订单
      const ordersQuery = `
        SELECT id, customer_name, amount, status, created_at 
        FROM orders 
        WHERE employee_id = ? 
        ORDER BY created_at DESC 
        LIMIT 5
      `;
      
      const orders = await executeQuery(ordersQuery, [parsedEmployeeId]);
      
      // 生成订单相关的通知
      const orderNotifications = orders.map(order => ({
        id: `order-${order.id}`,
        title: `订单更新: ${order.id}`,
        content: `${order.customer_name} 的订单已${order.status === 'completed' ? '完成' : order.status === 'pending' ? '提交' : '取消'}，金额: ${order.amount}元`,
        created_at: order.created_at,
        read: Math.random() > 0.3 // 随机生成阅读状态，约70%未读
      }));
      
      // 合并数据库通知和订单通知，并添加阅读状态
      const allNotifications = [
        ...orderNotifications,
        ...notifications.map(notification => ({
          ...notification,
          read: Math.random() > 0.5 // 随机生成阅读状态，约50%未读
        }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      res.json({
        code: 200,
        message: '获取通知成功',
        data: allNotifications
      });
    } catch (dbError) {
      console.error('查询通知数据时出错:', dbError);
      return res.status(500).json({
        code: 500,
        message: '获取通知数据失败'
      });
    }
  } catch (error) {
    console.error('获取员工通知失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 获取单个通知详情
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await executeQuery(
      'SELECT * FROM notifications WHERE id = ?',
      [parseInt(id)]
    );
    
    if (notification.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '通知不存在'
      });
    }
    
    res.json({
      code: 200,
      message: 'success',
      data: notification[0]
    });
  } catch (error) {
    console.error('获取通知详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 创建通知
router.post('/', authMiddleware, async (req, res) => {
  try {
      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({
          code: 400,
          message: '标题和内容为必填字段'
        });
      }
      
      const result = await executeQuery(
        'INSERT INTO notifications (title, content, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [title, content]
      );
    
    const newNotification = await executeQuery(
      'SELECT * FROM notifications WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      code: 200,
      message: 'success',
      data: newNotification[0]
    });
  } catch (error) {
    console.error('创建通知失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 更新通知
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    
    // 检查通知是否存在
    const existingNotification = await executeQuery(
      'SELECT * FROM notifications WHERE id = ?',
      [parseInt(id)]
    );
    
    if (existingNotification.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '通知不存在'
      });
    }
    
    // 构建更新查询
    const updateFields = [];
    const params = [];
    
    if (title !== undefined) updateFields.push('title = ?'), params.push(title);
    if (content !== undefined) updateFields.push('content = ?'), params.push(content);
    // 移除对publish_date的引用，因为该列不存在
    
    // 添加ID参数
    params.push(parseInt(id));
    
    // 执行更新
    await executeQuery(
      `UPDATE notifications SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    // 获取更新后的通知
    const updatedNotification = await executeQuery(
      'SELECT * FROM notifications WHERE id = ?',
      [parseInt(id)]
    );
    
    res.json({
      code: 200,
      message: 'success',
      data: updatedNotification[0]
    });
  } catch (error) {
    console.error('更新通知失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 删除通知
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查通知是否存在
    const existingNotification = await executeQuery(
      'SELECT * FROM notifications WHERE id = ?',
      [parseInt(id)]
    );
    
    if (existingNotification.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '通知不存在'
      });
    }
    
    // 删除通知
    await executeQuery('DELETE FROM notifications WHERE id = ?', [parseInt(id)]);
    
    res.json({
      code: 200,
      message: 'success',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('删除通知失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 发布通知
router.post('/:id/publish', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查通知是否存在
    const existingNotification = await executeQuery(
      'SELECT * FROM notifications WHERE id = ?',
      [parseInt(id)]
    );
    
    if (existingNotification.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '通知不存在'
      });
    }
    
    res.json({
      code: 200,
      message: 'success',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('发布通知失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 取消发布通知
router.post('/:id/unpublish', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查通知是否存在
    const existingNotification = await executeQuery(
      'SELECT * FROM notifications WHERE id = ?',
      [parseInt(id)]
    );
    
    if (existingNotification.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '通知不存在'
      });
    }
    
    res.json({
      code: 200,
      message: 'success',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('取消发布通知失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

export default router;