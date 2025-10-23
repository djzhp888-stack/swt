import React, { createContext, useState, useEffect, useContext } from 'react';
import { toast } from 'sonner';
import * as api from '@/services/apiService';

// 定义API上下文的类型
interface APIContextType {
  isConnected: boolean;
  error: Error | null;
  employee: typeof api.employeeAPI;
  order: typeof api.orderAPI;
  performance: typeof api.performanceAPI;
  notification: typeof api.notificationAPI;
  dashboard: typeof api.dashboardAPI;
  auth: typeof api.authAPI;
  inventory: typeof api.inventoryAPI;
}

// 创建API上下文
export const APIContext = createContext<APIContextType>({
  isConnected: false,
  error: null,
  employee: api.employeeAPI,
  order: api.orderAPI,
  performance: api.performanceAPI,
  notification: api.notificationAPI,
  dashboard: api.dashboardAPI,
  auth: api.authAPI,
  inventory: api.inventoryAPI,
});

// API提供组件
interface APIProviderProps {
  children: React.ReactNode;
}

export const APIProvider: React.FC<APIProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 在组件挂载时测试API连接
  useEffect(() => {
    const testAPIConnection = async () => {
      try {
        // 尝试一个简单的API请求来测试连接
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        await fetch(`${apiBaseUrl}/health`);
        setIsConnected(true);
        setError(null);
        console.log('===== API模式 =====');
        console.log('当前应用使用API接口与后端通信');
        console.log(`API基础URL: ${apiBaseUrl}`);
        console.log('==================');
      } catch (err) {
        setIsConnected(false);
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'API连接失败，请检查后端服务是否正常运行';
        setError(new Error(errorMessage));
        console.error('API连接测试失败:', err);
        
        // 显示用户友好的错误提示
        setTimeout(() => {
          toast.warning(`API服务连接失败: ${errorMessage}`);
        }, 1000);
      }
    };

    // 延迟测试，确保应用能够先渲染基本界面
    const timer = setTimeout(() => {
      testAPIConnection();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // API服务对象
  const apiServices = {
    isConnected,
    error,
    employee: api.employeeAPI,
    order: api.orderAPI,
    performance: api.performanceAPI,
    notification: api.notificationAPI,
    dashboard: api.dashboardAPI,
    auth: api.authAPI,
    inventory: api.inventoryAPI,
  };

  return (
    <APIContext.Provider value={apiServices}>
      {children}
    </APIContext.Provider>
  );
};

// 自定义hook用于访问API服务
export const useDB = () => {
  const context = useContext(APIContext);
  if (!context) {
    throw new Error('useDB must be used within a APIProvider');
  }
  return context;
};

// 为了保持兼容性，继续导出旧的名称
export const DBProvider = APIProvider;
export const DBContext = APIContext;