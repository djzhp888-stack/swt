import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { executeQuery } from '../config/db.js';

const router = express.Router();

// 生成唯一ID
function generateId(prefix) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
}

// 获取所有库存商品
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    let query = 'SELECT * FROM inventory';
    let countQuery = 'SELECT COUNT(*) as total FROM inventory';
    let params = [];
    
    if (search) {
      const searchParam = `%${search}%`;
      query += ' WHERE name LIKE ? OR description LIKE ? OR category LIKE ?';
      countQuery += ' WHERE name LIKE ? OR description LIKE ? OR category LIKE ?';
      params = [searchParam, searchParam, searchParam];
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);
    
    // 执行查询
    const items = await executeQuery(query, params);
    const [countResult] = await executeQuery(countQuery, search ? [searchParam, searchParam, searchParam] : []);
    
    // 标记低库存商品
    const itemsWithLowStock = items.map(item => ({
      ...item,
      isLowStock: item.quantity <= item.threshold
    }));
    
    res.json({
      code: 200,
      message: 'success',
      data: itemsWithLowStock,
      total: countResult.total
    });
  } catch (error) {
    console.error('获取库存商品失败:', error);
    res.status(500).json({ code: 500, message: '获取库存商品失败' });
  }
});

// 根据ID获取库存商品
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const query = 'SELECT * FROM inventory WHERE id = ?';
    const items = await executeQuery(query, [req.params.id]);
    
    if (items.length === 0) {
      return res.status(404).json({ code: 404, message: '商品不存在' });
    }
    
    res.json({
      code: 200,
      message: 'success',
      data: items[0]
    });
  } catch (error) {
    console.error('获取商品详情失败:', error);
    res.status(500).json({ code: 500, message: '获取商品详情失败' });
  }
});

// 创建新商品
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, category, brand, price, cost, quantity, unit, threshold } = req.body;
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({ code: 400, message: '商品名称不能为空' });
    }
    
    const itemId = generateId('INV');
    const query = `
      INSERT INTO inventory (id, name, description, category, brand, price, cost, quantity, unit, threshold)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await executeQuery(query, [
      itemId,
      name,
      description || '',
      category || '',
      brand || '',
      parseFloat(price) || 0,
      parseFloat(cost) || 0,
      parseInt(quantity) || 0,
      unit || '',
      parseInt(threshold) || 10
    ]);
    
    // 获取刚创建的商品
    const [newItem] = await executeQuery('SELECT * FROM inventory WHERE id = ?', [itemId]);
    
    // 记录库存历史
    if (newItem.quantity > 0) {
      const historyQuery = `
        INSERT INTO stock_history (id, product_id, product_name, change_amount, previous_quantity, current_quantity, reason, operator)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await executeQuery(historyQuery, [
        generateId('HIST'),
        newItem.id,
        newItem.name,
        newItem.quantity,
        0,
        newItem.quantity,
        '初始化库存',
        req.user?.name || '系统'
      ]);
    }
    
    res.status(201).json({
      code: 201,
      message: 'success',
      data: newItem
    });
  } catch (error) {
    console.error('创建商品失败:', error);
    res.status(500).json({ code: 500, message: '创建商品失败' });
  }
});

// 更新商品信息
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, brand, price, cost, quantity, unit, threshold } = req.body;
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({ code: 400, message: '商品名称不能为空' });
    }
    
    // 检查商品是否存在
    const [existingItem] = await executeQuery('SELECT * FROM inventory WHERE id = ?', [id]);
    if (!existingItem) {
      return res.status(404).json({ code: 404, message: '商品不存在' });
    }
    
    const query = `
      UPDATE inventory SET 
        name = ?, 
        description = ?, 
        category = ?, 
        brand = ?, 
        price = ?, 
        cost = ?, 
        quantity = ?, 
        unit = ?, 
        threshold = ? 
      WHERE id = ?
    `;
    
    await executeQuery(query, [
      name,
      description || '',
      category || '',
      brand || '',
      parseFloat(price) || 0,
      parseFloat(cost) || 0,
      parseInt(quantity) || 0,
      unit || '',
      parseInt(threshold) || 10,
      id
    ]);
    
    // 获取更新后的商品
    const [updatedItem] = await executeQuery('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    
    res.json({
      code: 200,
      message: 'success',
      data: updatedItem
    });
  } catch (error) {
    console.error('更新商品失败:', error);
    res.status(500).json({ code: 500, message: '更新商品失败' });
  }
});

// 更新库存数量
router.put('/:id/stock', authMiddleware, async (req, res) => {
  try {
    const { quantity } = req.body;
    
    // 先检查商品是否存在
    const [existingItem] = await executeQuery('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    if (!existingItem) {
      return res.status(404).json({ code: 404, message: '商品不存在' });
    }
    
    if (quantity < 0) {
      return res.status(400).json({ code: 400, message: '库存数量不能为负数' });
    }
    
    const previousQuantity = existingItem.quantity;
    const changeAmount = quantity - previousQuantity;
    
    if (changeAmount !== 0) {
      // 开始事务
      await executeQuery('START TRANSACTION');
      
      try {
        // 更新库存
        await executeQuery(
          'UPDATE inventory SET quantity = ? WHERE id = ?',
          [quantity, req.params.id]
        );
        
        // 记录库存历史
        const historyQuery = `
          INSERT INTO stock_history (id, product_id, product_name, change_amount, previous_quantity, current_quantity, reason, operator)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await executeQuery(historyQuery, [
          generateId('HIST'),
          req.params.id,
          existingItem.name,
          changeAmount,
          previousQuantity,
          quantity,
          req.body.reason || '手动调整',
          req.user?.name || '系统'
        ]);
        
        // 提交事务
        await executeQuery('COMMIT');
      } catch (transactionError) {
        // 回滚事务
        await executeQuery('ROLLBACK');
        throw transactionError;
      }
    }
    
    // 获取更新后的商品
    const [updatedItem] = await executeQuery('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    
    res.json({
      code: 200,
      message: 'success',
      data: updatedItem
    });
  } catch (error) {
    console.error('更新库存失败:', error);
    res.status(500).json({ code: 500, message: '更新库存失败' });
  }
});

// 删除商品
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // 先检查商品是否存在
    const [existingItem] = await executeQuery('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    if (!existingItem) {
      return res.status(404).json({ code: 404, message: '商品不存在' });
    }
    
    await executeQuery('DELETE FROM inventory WHERE id = ?', [req.params.id]);
    
    res.json({
      code: 200,
      message: 'success',
      data: { id: req.params.id }
    });
  } catch (error) {
    console.error('删除商品失败:', error);
    res.status(500).json({ code: 500, message: '删除商品失败' });
  }
});

// 获取低库存商品
router.get('/low-stock', authMiddleware, async (req, res) => {
  try {
    const { threshold = 10 } = req.query;
    const thresholdNum = parseInt(threshold);
    
    const query = 'SELECT * FROM inventory WHERE quantity <= ? ORDER BY quantity ASC';
    const lowStockItems = await executeQuery(query, [thresholdNum]);
    
    // 标记低库存商品
    const itemsWithLowStock = lowStockItems.map(item => ({ ...item, isLowStock: true }));
    
    res.json({
      code: 200,
      message: 'success',
      data: itemsWithLowStock
    });
  } catch (error) {
    console.error('获取低库存商品失败:', error);
    res.status(500).json({ code: 500, message: '获取低库存商品失败' });
  }
});

// 获取库存历史记录
router.get('/:productId/history', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    // 检查商品是否存在
    const [productExists] = await executeQuery('SELECT * FROM inventory WHERE id = ?', [productId]);
    if (!productExists) {
      return res.status(404).json({ code: 404, message: '商品不存在' });
    }
    
    // 获取该商品的库存历史
    const query = 'SELECT * FROM stock_history WHERE product_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const paginatedHistory = await executeQuery(query, [productId, limitNum, offset]);
    
    // 获取总数
    const [countResult] = await executeQuery(
      'SELECT COUNT(*) as total FROM stock_history WHERE product_id = ?',
      [productId]
    );
    
    res.json({
      code: 200,
      message: 'success',
      data: paginatedHistory,
      total: countResult.total
    });
  } catch (error) {
    console.error('获取库存历史失败:', error);
    res.status(500).json({ code: 500, message: '获取库存历史失败' });
  }
});

export default router;