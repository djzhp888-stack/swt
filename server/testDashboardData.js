import { executeQuery } from './config/db.js';

async function testDashboardData() {
  try {
    console.log('开始检查仪表板数据...');
    
    // 1. 检查业绩记录表中的数据
    console.log('\n1. 检查业绩记录表内容:');
    const performanceRecords = await executeQuery(
      'SELECT * FROM performance_records LIMIT 10'
    );
    console.log(`找到 ${performanceRecords.length} 条业绩记录`);
    if (performanceRecords.length > 0) {
      console.table(performanceRecords);
    }
    
    // 2. 检查仪表板KPI数据查询
    console.log('\n2. 检查仪表板KPI数据查询:');
    const kpiData = await executeQuery(
      `SELECT 
        SUM(amount) as totalSales,
        COUNT(*) as orderCount,
        AVG(amount) as avgOrderValue 
      FROM performance_records 
      WHERE type = 'sale' 
      AND record_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)`
    );
    console.log('KPI数据:', kpiData[0]);
    
    // 3. 检查仪表板趋势数据查询
    console.log('\n3. 检查仪表板趋势数据查询:');
    const trendData = await executeQuery(
      `SELECT 
        DATE(record_date) as date,
        SUM(amount) as sales 
      FROM performance_records 
      WHERE type = 'sale' 
      AND record_date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY) 
      GROUP BY DATE(record_date) 
      ORDER BY date`
    );
    console.log('趋势数据:', trendData);
    
    // 4. 检查顶级销售者数据查询
    console.log('\n4. 检查顶级销售者数据查询:');
    const topPerformers = await executeQuery(
      `SELECT 
        employee_id,
        SUM(amount) as totalSales 
      FROM performance_records 
      WHERE type = 'sale' 
      GROUP BY employee_id 
      ORDER BY totalSales DESC 
      LIMIT 5`
    );
    console.log('顶级销售者数据:', topPerformers);
    
  } catch (error) {
    console.error('检查仪表板数据失败:', error.message);
  }
}

testDashboardData();