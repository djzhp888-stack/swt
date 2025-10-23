/**
 * API服务层 - 负责与后端API通信
 */

// 基础API URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// RequestInit 是 Web API 的一部分，属于 DOM 类型定义
// 请求配置选项
interface RequestOptions extends globalThis.RequestInit {
  params?: Record<string, string | number>;
}

// 基础请求函数
const request = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { params, ...fetchOptions } = options;
  
  // 构建URL
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, value.toString());
    });
    url += `?${searchParams.toString()}`;
  }
  
  try {
    // 添加默认headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Type': 'wap', // 添加客户端类型标识
      ...fetchOptions.headers,
    };
    
    // 获取认证token（如果有）
    const token = localStorage.getItem('authToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
    
    if (!response.ok) {
      // 尝试从响应中提取错误信息
      try {
        const errorData = await response.json();
        // 处理401错误 - token过期或无效
        if (response.status === 401) {
          // 清除过期的token
          localStorage.removeItem('authToken');
          // 强制页面刷新，触发重新登录
          // 注释掉自动跳转，让用户手动处理
          // window.location.href = '/login';
          throw new Error(errorData.message || '认证已过期，请重新登录');
        }
        // 抛出包含后端错误消息的错误
        throw new Error(errorData.message || `API请求失败: ${response.status} ${response.statusText}`);
      } catch (jsonError: any) {
        // 如果解析JSON失败，使用默认错误消息
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    
    // 对于包含分页数据的响应，保留完整的数据结构
    // 不提取data字段，确保total等字段也能被前端获取
    return data as T;
  } catch (error: any) {
    throw error;
  }
};

// 认证相关API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await request<{ code: number; message: string; data: { token: string; user: { id: number; name: string; role: string } } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return response.data; // 返回实际的登录数据
  },
  
  logout: async () => {
    const response = await request<{ code: number; message: string }>('/auth/logout', {
      method: 'POST',
    });
    return response;
  },
  
  me: async () => {
    const response = await request<{ code: number; message: string; data: { id: number; name: string; role: string } }>('/auth/me');
    return response.data; // 返回实际的用户信息
  },
};

// 订单相关API
export const orderAPI = {
  getAll: async (page: number = 1, limit: number = 10, search?: string, status?: string) => {
    const response = await request<{ code: number; message: string; data: any[]; total: number }>('/orders', {
      params: { page, limit, search: search || '', status: status || 'all' },
    });
    return response; // 保留total字段，直接返回完整响应
  },
  
  getById: async (id: string) => {
    const response = await request<{ code: number; message: string; data: any }>(`/orders/${id}`);
    return response.data;
  },
  
  getByEmployeeId: async (employeeId: number, page: number = 1, limit: number = 10, search?: string, status?: string) => {
    const response = await request<{ code: number; message: string; data: any[]; total: number }>(`/orders/employee/${employeeId}`, {
      params: { page, limit, search: search || '', status: status || 'all' },
    });
    return response; // 保留total字段，直接返回完整响应
  },
  
  updateStatus: async (orderId: string, status: string) => {
    const response = await request<{ code: number; message: string; data: any }>(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return response.data;
  },
};

// 员工相关API
export const employeeAPI = {
  getById: async (id: number) => {
    // 正确提取后端返回的data字段
    const response = await request<{ code: number; message: string; data: any }>(`/employees/${id}`);
    return response.data; // 返回实际的员工数据
  },
};

// 业绩相关API
export const performanceAPI = {
  getKPI: async (employeeId: number) => {
    const response = await request<{ code: number; message: string; data: any }>(`/performance/kpi/${employeeId}`);
    return response.data;
  },
  
  getPerformanceTrend: async (employeeId: number, timeRange: string) => {
    const response = await request<{ code: number; message: string; data: any }>(`/performance/trend/${employeeId}`, {
      params: { timeRange },
    });
    return response.data;
  },
  
  getNotifications: async (employeeId: number) => {
    const response = await request<{ code: number; message: string; data: any[] }>(`/notifications/employee/${employeeId}`);
    return response.data;
  },
};