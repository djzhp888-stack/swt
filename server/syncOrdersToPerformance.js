import pool, { executeQuery } from './config/db.js';

/**
 * 同步订单数据到业绩记录表
 * 这个脚本会从orders表读取所有已完成的订单，并将它们插入到performance_records表
 */
async function syncOrdersToPerformance() {
  try {
    console.log('开始同步订单数据到业绩记录表...');
    
    // 1. 查询所有已完成的订单
    const ordersQuery = `
      SELECT 
        o.id as order_id,
        o.amount,
        o.customer_name,
        o.employee_id,
        DATE_FORMAT(o.created_at, '%Y-%m-%d') as order_date
      FROM orders o
      WHERE o.status = 'completed'
    `;
    
    const orders = await executeQuery(ordersQuery);
    console.log(`找到 ${orders.length} 个未同步的完成订单`);
    
    if (orders.length === 0) {
      console.log('没有需要同步的订单，任务完成');
      return;
    }
    
    // 2. 准备插入业绩记录的数据
    const insertValues = [];
    for (const order of orders) {
      // 确保employee_id有效（如果为null或0，使用1作为默认值）
      const employeeId = order.employee_id && order.employee_id > 0 ? order.employee_id : 1;
      
      // 确保所有值都安全处理并验证日期格式
      const safeOrderId = String(order.order_id).replace(/'/g, "''");
      const safeCustomerName = (order.customer_name || '客户').replace(/'/g, "''");
      
      // 确保日期格式为YYYY-MM-DD
      let formattedDate = order.order_date;
      if (formattedDate) {
        if (typeof formattedDate === 'string' && !formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const date = new Date(formattedDate);
          if (!isNaN(date.getTime())) {
            formattedDate = date.toISOString().split('T')[0];
          }
        }
      }
      
      insertValues.push(`
        (${employeeId}, '${safeOrderId}', ${order.amount}, 'sale', '${formattedDate}', '${safeCustomerName}', '产品销售')
      `);
    }
    
    // 3. 批量插入业绩记录
    const insertQuery = `
      INSERT INTO performance_records 
      (employee_id, order_id, amount, type, record_date, customer_name, product)
      VALUES ${insertValues.join(',')}
    `;
    
    await executeQuery(insertQuery);
    console.log(`✅ 成功同步 ${orders.length} 个订单到业绩记录表`);
    
    // 4. 显示同步的详细信息
    console.log('\n同步详情:');
    orders.forEach(order => {
      console.log(`- 订单ID: ${order.order_id}, 金额: ¥${order.amount}, 日期: ${order.order_date}`);
    });
    
  } catch (error) {
    console.error('❌ 同步订单数据失败:', error.message);
  } finally {
    // 关闭数据库连接
    await pool.end();
    console.log('\n数据库连接已关闭，同步任务结束');
  }
}

// 执行同步
if (import.meta.url === new URL(import.meta.url).href) {
  syncOrdersToPerformance();
}

export default syncOrdersToPerformance;