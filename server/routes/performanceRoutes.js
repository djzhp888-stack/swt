import express from 'express';
import pool, { executeQuery } from '../config/db.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// 获取所有业绩记录
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, employeeId, department, startDate, endDate } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT pr.*, e.name as employee_name, e.department 
      FROM performance_records pr
      LEFT JOIN employees e ON pr.employee_id = e.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // 添加筛选条件
    if (employeeId) {
      query += ' AND pr.employee_id = ?';
      params.push(parseInt(employeeId));
    }
    
    if (department && department !== 'all') {
      query += ' AND e.department = ?';
      params.push(department);
    }
    
    if (startDate) {
      query += ' AND pr.record_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND pr.record_date <= ?';
      params.push(endDate);
    }
    
    // 添加分页和排序
    query += ' ORDER BY pr.record_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const records = await executeQuery(query, params);
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM performance_records pr
      LEFT JOIN employees e ON pr.employee_id = e.id
      WHERE 1=1
      ${employeeId ? ' AND pr.employee_id = ?' : ''}
      ${department && department !== 'all' ? ' AND e.department = ?' : ''}
      ${startDate ? ' AND pr.record_date >= ?' : ''}
      ${endDate ? ' AND pr.record_date <= ?' : ''}
    `;
    
    const countParams = [...params].slice(0, -2); // 移除limit和offset参数
    const totalResult = await executeQuery(countQuery, countParams);
    
    res.json({
      code: 200,
      message: 'success',
      data: records,
      total: totalResult[0].total
    });
  } catch (error) {
    console.error('获取业绩记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 根据员工ID获取业绩记录
router.get('/employee/:employeeId', authMiddleware, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const query = `
      SELECT pr.*, e.name as employee_name, e.department 
      FROM performance_records pr
      LEFT JOIN employees e ON pr.employee_id = e.id
      WHERE pr.employee_id = ?
      ORDER BY pr.record_date DESC LIMIT ? OFFSET ?
    `;
    
    const records = await executeQuery(query, [parseInt(employeeId), parseInt(limit), offset]);
    
    // 获取总数
    const totalResult = await executeQuery(
      'SELECT COUNT(*) as total FROM performance_records WHERE employee_id = ?', 
      [parseInt(employeeId)]
    );
    
    res.json({
      code: 200,
      message: 'success',
      data: records,
      total: totalResult[0].total
    });
  } catch (error) {
    console.error('获取员工业绩记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 根据日期范围获取业绩记录
router.get('/date-range', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        code: 400,
        message: '请提供开始日期和结束日期'
      });
    }
    
    const query = `
      SELECT pr.*, e.name as employee_name, e.department 
      FROM performance_records pr
      LEFT JOIN employees e ON pr.employee_id = e.id
      WHERE pr.record_date BETWEEN ? AND ?
      ORDER BY pr.record_date DESC LIMIT ? OFFSET ?
    `;
    
    const records = await executeQuery(query, [
      startDate, 
      endDate, 
      parseInt(limit), 
      offset
    ]);
    
    // 获取总数
    const totalResult = await executeQuery(
      'SELECT COUNT(*) as total FROM performance_records WHERE record_date BETWEEN ? AND ?', 
      [startDate, endDate]
    );
    
    res.json({
      code: 200,
      message: 'success',
      data: records,
      total: totalResult[0].total
    });
  } catch (error) {
    console.error('获取日期范围业绩记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 创建业绩记录
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { employeeId, orderId, amount, type, recordDate, customerName, product } = req.body;
    
    // 验证必填字段
    if (!employeeId || !amount || !type || !recordDate) {
      return res.status(400).json({
        code: 400,
        message: '员工ID、金额、类型和记录日期为必填字段'
      });
    }
    
    // 验证员工是否存在
    const employeeResult = await executeQuery('SELECT id FROM employees WHERE id = ?', [employeeId]);
    if (employeeResult.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '员工不存在'
      });
    }
    
    // 创建业绩记录
    const result = await executeQuery(
      `INSERT INTO performance_records 
       (employee_id, order_id, amount, type, record_date, customer_name, product) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, orderId || null, amount, type, recordDate, customerName || '', product || '']
    );
    
    // 获取刚创建的记录
    const newRecord = await executeQuery(
      'SELECT * FROM performance_records WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      code: 200,
      message: 'success',
      data: newRecord[0]
    });
  } catch (error) {
    console.error('创建业绩记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 更新业绩记录
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, orderId, amount, type, recordDate, customerName, product } = req.body;
    
    // 检查记录是否存在
    const existingRecord = await executeQuery(
      'SELECT * FROM performance_records WHERE id = ?',
      [id]
    );
    
    if (existingRecord.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '业绩记录不存在'
      });
    }
    
    // 如果更新员工ID，验证员工是否存在
    if (employeeId) {
      const employeeResult = await executeQuery('SELECT id FROM employees WHERE id = ?', [employeeId]);
      if (employeeResult.length === 0) {
        return res.status(404).json({
          code: 404,
          message: '员工不存在'
        });
      }
    }
    
    // 构建更新查询
    const updateFields = [];
    const params = [];
    
    if (employeeId !== undefined) updateFields.push('employee_id = ?'), params.push(employeeId);
    if (orderId !== undefined) updateFields.push('order_id = ?'), params.push(orderId || null);
    if (amount !== undefined) updateFields.push('amount = ?'), params.push(amount);
    if (type !== undefined) updateFields.push('type = ?'), params.push(type);
    if (recordDate !== undefined) updateFields.push('record_date = ?'), params.push(recordDate);
    if (customerName !== undefined) updateFields.push('customer_name = ?'), params.push(customerName);
    if (product !== undefined) updateFields.push('product = ?'), params.push(product);
    
    // 添加ID参数
    params.push(id);
    
    // 执行更新
    await executeQuery(
      `UPDATE performance_records SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    // 获取更新后的记录
    const updatedRecord = await executeQuery(
      'SELECT * FROM performance_records WHERE id = ?',
      [id]
    );
    
    res.json({
      code: 200,
      message: 'success',
      data: updatedRecord[0]
    });
  } catch (error) {
    console.error('更新业绩记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 删除业绩记录
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查记录是否存在
    const existingRecord = await executeQuery(
      'SELECT * FROM performance_records WHERE id = ?',
      [id]
    );
    
    if (existingRecord.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '业绩记录不存在'
      });
    }
    
    // 删除记录
    await executeQuery('DELETE FROM performance_records WHERE id = ?', [id]);
    
    res.json({
      code: 200,
      message: 'success',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('删除业绩记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 导出业绩数据
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, employeeId, department } = req.query;
    
    let query = `
      SELECT pr.*, e.name as employee_name, e.department 
      FROM performance_records pr
      LEFT JOIN employees e ON pr.employee_id = e.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // 添加筛选条件
    if (employeeId) {
      query += ' AND pr.employee_id = ?';
      params.push(parseInt(employeeId));
    }
    
    if (department && department !== 'all') {
      query += ' AND e.department = ?';
      params.push(department);
    }
    
    if (startDate) {
      query += ' AND pr.record_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND pr.record_date <= ?';
      params.push(endDate);
    }
    
    // 添加排序
    query += ' ORDER BY pr.record_date DESC';
    
    const records = await executeQuery(query, params);
    
    // 设置响应头为CSV格式
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="performance_export_${new Date().toISOString().split('T')[0]}.csv"`);
    
    // 生成CSV内容
    const headers = ['ID', '员工ID', '员工姓名', '部门', '订单号', '金额', '类型', '记录日期', '客户名称', '产品', '创建时间'];
    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        record.id,
        record.employee_id,
        `"${record.employee_name || ''}"`,
        `"${record.department || ''}"`,
        `"${record.order_id || ''}"`,
        record.amount,
        record.type,
        record.record_date,
        `"${record.customer_name || ''}"`,
        `"${record.product || ''}"`,
        record.created_at
      ].join(','))
    ].join('\n');
    
    res.send(csvContent);
  } catch (error) {
    console.error('导出业绩数据失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 获取员工KPI数据
router.get('/kpi/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // 验证员工是否存在
    const employeeResult = await executeQuery('SELECT id, name, department FROM employees WHERE id = ?', [parseInt(employeeId)]);
    if (employeeResult.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '员工不存在'
      });
    }
    
    const employee = employeeResult[0];
    
    // 查询本月业绩数据
    const monthQuery = `
      SELECT 
        SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as totalRevenue,
        COUNT(CASE WHEN type = 'sale' THEN 1 END) as totalOrders,
        SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END) as refundAmount
      FROM performance_records
      WHERE employee_id = ? AND record_date >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
    `;
    
    const monthResult = await executeQuery(monthQuery, [parseInt(employeeId)]);
    const monthData = monthResult[0];
    
    // 查询上月业绩数据（用于计算增长率）
    const lastMonthQuery = `
      SELECT 
        SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as totalRevenue
      FROM performance_records
      WHERE employee_id = ? 
      AND record_date >= DATE_FORMAT(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-01')
      AND record_date < DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
    `;
    
    const lastMonthResult = await executeQuery(lastMonthQuery, [parseInt(employeeId)]);
    const lastMonthRevenue = parseFloat(lastMonthResult[0].totalRevenue || 0);
    
    // 计算增长率
    const monthOnMonthGrowth = lastMonthRevenue > 0 
      ? ((parseFloat(monthData.totalRevenue || 0) - lastMonthRevenue) / lastMonthRevenue * 100)
      : 0;
    
    res.json({
      code: 200,
      message: 'success',
      data: {
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        totalRevenue: parseFloat(monthData.totalRevenue || 0),
        totalOrders: monthData.totalOrders || 0,
        refundAmount: parseFloat(monthData.refundAmount || 0),
        monthOnMonthGrowth: monthOnMonthGrowth
      }
    });
  } catch (error) {
    console.error('获取员工KPI数据失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 获取员工业绩趋势数据
router.get('/trend/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { timeRange = 'month' } = req.query;
    
    // 验证员工是否存在
    const employeeResult = await executeQuery('SELECT id FROM employees WHERE id = ?', [parseInt(employeeId)]);
    if (employeeResult.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '员工不存在'
      });
    }
    
    let query;
    
    switch (timeRange) {
      case 'day':
        // 按小时统计今日数据
        query = `
          SELECT 
            HOUR(created_at) as date,
            SUM(amount) as value
          FROM performance_records
          WHERE employee_id = ? AND type = 'sale' AND record_date = CURRENT_DATE
          GROUP BY HOUR(created_at)
          ORDER BY date
        `;
        break;
      case 'week':
        // 按天统计最近7天数据
        query = `
          SELECT 
            DATE_FORMAT(record_date, '%m/%d') as date,
            SUM(amount) as value
          FROM performance_records
          WHERE employee_id = ? AND type = 'sale' AND record_date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
          GROUP BY record_date
          ORDER BY record_date
        `;
        break;
      case 'month':
      default:
        // 按天统计最近30天数据
        query = `
          SELECT 
            DATE_FORMAT(record_date, '%m/%d') as date,
            SUM(amount) as value
          FROM performance_records
          WHERE employee_id = ? AND type = 'sale' AND record_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
          GROUP BY record_date
          ORDER BY record_date
        `;
        break;
    }
    
    const result = await executeQuery(query, [parseInt(employeeId)]);
    
    // 格式化数据
    const formattedData = result.map(row => ({
      date: row.date,
      value: parseFloat(row.value || 0)
    }));
    
    res.json({
      code: 200,
      message: 'success',
      data: formattedData
    });
  } catch (error) {
    console.error('获取员工业绩趋势数据失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

export default router;