import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// 创建数据库连接池，增加超时设置和连接重试
const pool = mysql.createPool({
  host: '14.103.171.248',
  port: 3306,
  user: 'swt',
  password: 'm3AwwkeLkkh5xAkG',
  database: 'swt',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 添加连接超时和keepalive设置
  connectTimeout: 10000, // 10秒连接超时
  idleTimeout: 60000, // 空闲连接60秒超时
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000 // 10秒发送keepalive包
});

// 带重试机制的数据库连接函数
const connectWithRetry = async (retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log(`✅ 数据库连接成功（尝试 ${i + 1}/${retries}）`);
      // 执行一个简单查询确保连接有效
      await connection.query('SELECT 1');
      connection.release();
      return true;
    } catch (error) {
      console.error(`❌ 数据库连接失败（尝试 ${i + 1}/${retries}）:`, error.message);
      if (i === retries - 1) {
        console.error('❌ 所有数据库连接尝试失败');
        console.log('⚠️  将使用模拟数据进行开发...');
        return false;
      }
      // 指数退避重试
      const waitTime = delay * Math.pow(2, i);
      console.log(`⏳ ${waitTime}ms后重试...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

// 带重试的查询执行器
async function executeQuery(query, params = []) {
  let connection;
  let retries = 3;
  
  while (retries > 0) {
    try {
      connection = await pool.getConnection();
      const [results] = await connection.query(query, params);
      connection.release();
      return results;
    } catch (error) {
      if (connection) {
        try {
          connection.release();
        } catch (releaseError) {}
      }
      
      retries--;
      
      // 处理连接重置错误
      if (error.code === 'ECONNRESET' && retries > 0) {
        console.warn(`⚠️  数据库连接重置，${retries}次重试剩余，正在重试...`);
        // 短暂等待后重试
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      console.error('数据库查询执行失败:', error);
      throw error;
    }
  }
}

// 启动时测试连接
connectWithRetry();

// 导出增强的查询执行器
export { executeQuery };

export default pool;