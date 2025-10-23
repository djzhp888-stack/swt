// 简单的API测试脚本
console.log('开始测试API连接...');

// 测试API连接和认证的脚本
async function testApi() {
  console.log('开始测试API连接...');
  
  // 测试账号列表
  const testAccounts = [
    { username: '楚航', password: '123456' },
    { username: '天天', password: '123456' }
  ];
  
  try {
    // 逐个测试账号登录
    for (const account of testAccounts) {
      console.log(`\n尝试使用账号 ${account.username} 登录...`);
      const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-type': 'wap'
        },
        body: JSON.stringify(account)
      });
      
      const loginData = await loginResponse.json();
      console.log(`登录响应状态:`, loginResponse.status);
      console.log(`登录响应数据:`, loginData);
      
      if (loginResponse.ok && loginData.code === 200 && loginData.data?.token) {
        const token = loginData.data.token;
        const employeeId = loginData.data.user.id;
        console.log(`登录成功！员工ID: ${employeeId}, Token: ${token.substring(0, 20)}...`);
        
        // 使用获取的token测试订单API
        console.log(`\n测试订单API (员工ID: ${employeeId})...`);
        const orderResponse = await fetch(`http://localhost:5000/api/orders/employee/${employeeId}?page=1&limit=10&status=all`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('订单API响应状态:', orderResponse.status);
        const orderData = await orderResponse.json();
        console.log('订单API响应数据:', orderData);
        
        return; // 登录成功就停止测试
      }
    }
    
    console.log('\n所有账号登录测试失败');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

testApi();