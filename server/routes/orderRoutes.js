import express from 'express';
import db, { executeQuery } from '../config/db.js';
import authMiddleware from '../middleware/authMiddleware.js';
const router = express.Router();

// 获取订单列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT o.*, e.name as employee_name, e.department 
      FROM orders o
      LEFT JOIN employees e ON o.employee_id = e.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // 添加搜索条件
    if (search) {
      query += ` AND (o.id LIKE ? OR o.customer_name LIKE ? OR e.name LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    // 添加状态筛选
    if (status !== 'all') {
      query += ` AND o.status = ?`;
      params.push(status);
    }
    
    // 添加分页和排序
    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);
    
    const rows = await executeQuery(query, params);
    
    // 获取总数
    const countResult = await executeQuery(`
      SELECT COUNT(*) as count FROM orders o
      LEFT JOIN employees e ON o.employee_id = e.id
      WHERE 1=1
      ${search ? ` AND (o.id LIKE ? OR o.customer_name LIKE ? OR e.name LIKE ?)` : ''}
      ${status !== 'all' ? ` AND o.status = ?` : ''}
    `, search ? [...params.slice(0, 3), ...(status !== 'all' ? params.slice(3, 4) : [])] : (status !== 'all' ? [status] : []));
    
    res.json({
      code: 200,
      message: '获取订单列表成功',
      data: rows,
      total: countResult[0].count
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取订单列表失败'
    });
  }
});

// 创建新订单
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { orderId, employeeId, customerName, customerContact, amount, items, status } = req.body;
    
    // 验证必填字段
    if (!orderId || !employeeId || !customerName || !customerContact || !amount || !items || !Array.isArray(items)) {
      return res.status(400).json({
        code: 400,
        message: '缺少必填字段'
      });
    }
    
    // 检查订单号是否已存在
    const existingRows = await executeQuery('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (existingRows.length > 0) {
      return res.status(400).json({
        code: 400,
        message: '订单号已存在'
      });
    }
    
    // 开始事务
    await executeQuery('START TRANSACTION');
    
    try {
      // 检查库存是否足够
      for (const item of items) {
        if (!item.productId || !item.quantity) {
          throw new Error('订单项缺少必要信息');
        }
        
        const inventoryResult = await executeQuery('SELECT * FROM inventory WHERE id = ?', [item.productId]);
        if (inventoryResult.length === 0) {
          throw new Error(`商品 ${item.productId} 不存在`);
        }
        
        const product = inventoryResult[0];
        if (product.quantity < item.quantity) {
          throw new Error(`商品 ${product.name} 库存不足，当前库存：${product.quantity}，需要：${item.quantity}`);
        }
      }
      
      // 扣减库存
      for (const item of items) {
        const { productId, quantity } = item;
        
        // 获取当前库存
        const [product] = await executeQuery('SELECT * FROM inventory WHERE id = ?', [productId]);
        const previousQuantity = product.quantity;
        const newQuantity = previousQuantity - quantity;
        
        // 更新库存
        await executeQuery(
          'UPDATE inventory SET quantity = ? WHERE id = ?',
          [newQuantity, productId]
        );
        
        // 记录库存历史
        await executeQuery(
          `INSERT INTO stock_history (id, product_id, product_name, change_amount, previous_quantity, current_quantity, reason, operator)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `HIST${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
            productId,
            product.name,
            -quantity, // 负数表示减少
            previousQuantity,
            newQuantity,
            `订单销售: ${orderId}`,
            req.user?.name || '系统'
          ]
        );
      }
      
      // 插入订单记录
      await executeQuery(
        `INSERT INTO orders (id, employee_id, customer_name, customer_contact, amount, items, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [orderId, employeeId, customerName, customerContact, amount, JSON.stringify(items), status || 'completed']
      );
      
      // 如果订单状态为已完成，自动同步到业绩表
      if ((status || 'completed') === 'completed') {
        await executeQuery(
          `INSERT INTO performance_records (employee_id, order_id, amount, type, record_date, customer_name, product)
           VALUES (?, ?, ?, 'sale', DATE_FORMAT(NOW(), '%Y-%m-%d'), ?, '产品销售')`,
          [employeeId, orderId, amount, customerName]
        );
        console.log(`订单 ${orderId} 已同步到业绩表`);
      }
      
      // 提交事务
      await executeQuery('COMMIT');
      
      res.json({
        code: 200,
        message: '订单创建成功，库存已扣减',
        data: { orderId }
      });
    } catch (transactionError) {
      // 回滚事务
      await executeQuery('ROLLBACK');
      console.error('订单创建事务失败:', transactionError);
      
      // 根据错误类型返回不同的提示
      if (transactionError.message.includes('库存不足')) {
        return res.status(400).json({
          code: 400,
          message: transactionError.message
        });
      }
      
      throw transactionError;
    }
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '创建订单失败'
    });
  }
});

// 更新订单状态
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // 验证状态值
    if (!status || !['completed', 'refunded'].includes(status)) {
      return res.status(400).json({
        code: 400,
        message: '状态值无效，仅支持 completed 或 refunded'
      });
    }
    
    // 检查订单是否存在
    const orderResult = await executeQuery('SELECT * FROM orders WHERE id = ?', [id]);
    if (orderResult.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '订单不存在'
      });
    }
    
    const order = orderResult[0];
    
    // 如果状态未变化，直接返回成功
    if (order.status === status) {
      return res.json({
        code: 200,
        message: '订单状态未变化',
        data: { orderId: id }
      });
    }
    
    // 如果是退单，需要恢复库存
    if (status === 'refunded' && order.status !== 'refunded') {
      // 开始事务
      await executeQuery('START TRANSACTION');
      
      try {
        let items = [];
        // 安全解析items数据
        try {
          items = typeof order.items === 'string' ? JSON.parse(order.items) : [];
          // 确保items是数组
          if (!Array.isArray(items)) {
            items = [];
          }
        } catch (parseError) {
          console.error('解析订单项失败:', parseError);
          // 即使解析失败，仍然继续处理订单状态更新
          items = [];
        }
        
        let inventoryErrors = [];
        
        // 恢复库存（允许部分商品恢复失败，但不中断整个退款流程）
        for (const item of items) {
          // 使用防御性编程，确保必要字段存在
          const productId = item.productId || item.id; // 兼容不同的字段名
          const quantity = Number(item.quantity) || 0;
          
          if (!productId || quantity <= 0) {
            console.warn(`订单项缺少有效信息: ${JSON.stringify(item)}`);
            continue;
          }
          
          try {
            // 获取当前库存
            const inventoryResult = await executeQuery('SELECT * FROM inventory WHERE id = ?', [productId]);
            
            if (inventoryResult.length > 0) {
              const product = inventoryResult[0];
              const previousQuantity = product.quantity || 0;
              const newQuantity = previousQuantity + quantity;
              
              // 更新库存
              await executeQuery(
                'UPDATE inventory SET quantity = ? WHERE id = ?',
                [newQuantity, productId]
              );
              
              // 记录库存历史
              await executeQuery(
                `INSERT INTO stock_history (id, product_id, product_name, change_amount, previous_quantity, current_quantity, reason, operator)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  `HIST${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
                  productId,
                  product.name || '未知商品',
                  quantity, // 正数表示增加
                  previousQuantity,
                  newQuantity,
                  `订单退款: ${id}`,
                  req.user?.name || '系统'
                ]
              );
            } else {
              inventoryErrors.push(`商品 ${productId} 不存在，跳过库存恢复`);
              console.warn(inventoryErrors[inventoryErrors.length - 1]);
            }
          } catch (itemError) {
            // 记录错误但继续处理其他商品
            inventoryErrors.push(`恢复商品 ${productId} 库存失败: ${itemError.message}`);
            console.error(inventoryErrors[inventoryErrors.length - 1]);
          }
        }
        
        // 无论库存恢复是否完全成功，都更新订单状态
        await executeQuery(
          'UPDATE orders SET status = ? WHERE id = ?',
          [status, id]
        );
        
        // 同步到业绩表
        const refundRecord = await executeQuery(
          'SELECT * FROM performance_records WHERE order_id = ? AND type = ?',
          [id, 'refund']
        );
        
        if (refundRecord.length === 0) {
          try {
            await executeQuery(
              `INSERT INTO performance_records (employee_id, order_id, amount, type, record_date, customer_name, product)
               VALUES (?, ?, ?, 'refund', DATE_FORMAT(NOW(), '%Y-%m-%d'), ?, '产品退款')`,
              [order.employee_id, id, order.amount, order.customer_name]
            );
            console.log(`订单 ${id} 退款已同步到业绩表`);
          } catch (perfError) {
            console.error('同步业绩记录失败:', perfError);
            // 不影响主流程
          }
        }
        
        // 提交事务
        await executeQuery('COMMIT');
        
        // 根据是否有错误返回不同的消息
        let message = '订单已退款，库存已恢复';
        if (inventoryErrors.length > 0) {
          message = `订单已退款，部分库存恢复失败: ${inventoryErrors.join('; ')}`;
        }
        
        res.json({
          code: 200,
          message,
          data: { orderId: id, inventoryErrors }
        });
      } catch (transactionError) {
        // 回滚事务
        await executeQuery('ROLLBACK');
        console.error('订单退款事务失败:', transactionError);
        
        // 返回友好的错误信息，而不是直接抛出异常
        return res.status(500).json({
          code: 500,
          message: '订单退款失败，请稍后重试',
          error: transactionError.message
        });
      }
    } else {
      // 普通状态更新（不是退单）
      await executeQuery(
        'UPDATE orders SET status = ? WHERE id = ?',
        [status, id]
      );
      
      // 如果是完成状态，同步到业绩表
      if (status === 'completed') {
        const saleRecord = await executeQuery(
          'SELECT * FROM performance_records WHERE order_id = ? AND type = ?',
          [id, 'sale']
        );
        
        if (saleRecord.length === 0) {
          await executeQuery(
            `INSERT INTO performance_records (employee_id, order_id, amount, type, record_date, customer_name, product)
             VALUES (?, ?, ?, 'sale', DATE_FORMAT(NOW(), '%Y-%m-%d'), ?, '产品销售')`,
            [order.employee_id, id, order.amount, order.customer_name]
          );
        }
      }
      
      res.json({
        code: 200,
        message: '订单状态更新成功',
        data: { orderId: id }
      });
    }
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '更新订单状态失败'
    });
  }
});

// 获取订单详情
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const rows = await executeQuery(
      `SELECT o.*, e.name as employee_name, e.department 
       FROM orders o
       LEFT JOIN employees e ON o.employee_id = e.id
       WHERE o.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '订单不存在'
      });
    }
    
    const order = rows[0];
    if (order.items) {
      order.items = JSON.parse(order.items);
    }
    
    res.json({
      code: 200,
      message: '获取订单详情成功',
      data: order
    });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取订单详情失败'
    });
  }
});

// 更新订单
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { orderId, employeeId, customerName, customerContact, amount, items } = req.body;
    
    // 验证必填字段
    if (!employeeId || !customerName || !customerContact || !amount || !items || !Array.isArray(items)) {
      return res.status(400).json({
        code: 400,
        message: '缺少必填字段'
      });
    }
    
    // 检查订单是否存在
    const existingRows = await executeQuery('SELECT id FROM orders WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '订单不存在'
      });
    }
    
    // 检查新订单号是否已被使用（如果提供了新订单号且与原订单号不同）
    if (orderId && orderId !== id) {
      const duplicateRows = await executeQuery('SELECT id FROM orders WHERE id = ?', [orderId]);
      if (duplicateRows.length > 0) {
        return res.status(400).json({
          code: 400,
          message: '订单号已存在'
        });
      }
    }
    
    // 根据是否需要更新订单号使用不同的SQL语句
    if (orderId && orderId !== id) {
      // 先获取原订单所有字段
      const orderRows = await executeQuery('SELECT * FROM orders WHERE id = ?', [id]);
      const orderData = orderRows[0];
      
      // 删除原订单
      await executeQuery('DELETE FROM orders WHERE id = ?', [id]);
      
      // 创建新订单（更新订单号）
      await executeQuery(
        'INSERT INTO orders (id, employee_id, customer_name, customer_contact, amount, items, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [orderId, employeeId, customerName, customerContact, amount, JSON.stringify(items), orderData.status, orderData.created_at]
      );
    } else {
      // 只更新其他字段
        await executeQuery(
        'UPDATE orders SET employee_id = ?, customer_name = ?, customer_contact = ?, amount = ?, items = ? WHERE id = ?',
        [employeeId, customerName, customerContact, amount, JSON.stringify(items), id]
      );
    }
    
    // 检查订单状态，如果是已完成，需要更新业绩表中的相关记录
    const orderStatusCheck = await executeQuery(
      'SELECT status FROM orders WHERE id = ?',
      [orderId || id]
    );
    
    if (orderStatusCheck.length > 0 && orderStatusCheck[0].status === 'completed') {
      // 更新业绩表中的记录
      await executeQuery(
        `UPDATE performance_records 
         SET employee_id = ?, amount = ?, customer_name = ? 
         WHERE order_id = ? AND type = 'sale'`,
        [employeeId, amount, customerName, orderId || id]
      );
      console.log(`订单 ${orderId || id} 已更新，业绩表中的相关记录也已更新`);
    }
    
    res.json({
      code: 200,
      message: '订单更新成功'
    });
  } catch (error) {
    console.error('更新订单失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新订单失败'
    });
  }
});

// 删除订单
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查订单是否存在
    const existingRows = await executeQuery('SELECT id FROM orders WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '订单不存在'
      });
    }
    
    // 删除订单
    const result = await executeQuery('DELETE FROM orders WHERE id = ?', [id]);
    
    // 同时从业绩表中删除相关记录
    await executeQuery(
      'DELETE FROM performance_records WHERE order_id = ?',
      [id]
    );
    console.log(`订单 ${id} 已删除，业绩表中的相关记录也已删除`);
    
    res.json({
      code: 200,
      message: '订单删除成功',
      data: { affectedRows: result.affectedRows }
    });
  } catch (error) {
    console.error('删除订单失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除订单失败'
    });
  }
});

// 根据员工ID获取订单列表
router.get('/employee/:employeeId', authMiddleware, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 验证员工是否存在
    const employeeResult = await executeQuery('SELECT id FROM employees WHERE id = ?', [parseInt(employeeId)]);
    if (employeeResult.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '员工不存在'
      });
    }
    
    let query = `
      SELECT o.*, e.name as employee_name, e.department 
      FROM orders o
      LEFT JOIN employees e ON o.employee_id = e.id
      WHERE o.employee_id = ?
    `;
    
    const params = [parseInt(employeeId)];
    
    // 添加搜索条件
    if (search) {
      query += ` AND (o.id LIKE ? OR o.customer_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // 添加状态筛选
    if (status !== 'all') {
      query += ` AND o.status = ?`;
      params.push(status);
    }
    
    // 添加分页和排序
    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);
    
    const rows = await executeQuery(query, params);
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as count FROM orders o
      WHERE o.employee_id = ?
      ${search ? ` AND (o.id LIKE ? OR o.customer_name LIKE ?)` : ''}
      ${status !== 'all' ? ` AND o.status = ?` : ''}
    `;
    
    const countParams = [parseInt(employeeId)];
    if (search) {
      countParams.push(`%${search}%`, `%${search}%`);
    }
    if (status !== 'all') {
      countParams.push(status);
    }
    
    const countResult = await executeQuery(countQuery, countParams);
    
    res.json({
      code: 200,
      message: '获取员工订单列表成功',
      data: rows,
      total: countResult[0].count
    });
  } catch (error) {
    console.error('获取员工订单列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取员工订单列表失败'
    });
  }
});

export default router;