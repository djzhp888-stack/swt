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
    const headers = {
      'Content-Type': 'application/json',
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
          window.location.href = '/login';
          throw new Error(errorData.message || '认证已过期，请重新登录');
        }
        // 抛出包含后端错误消息的错误
        throw new Error(errorData.message || `API请求失败: ${response.status} ${response.statusText}`);
      } catch (jsonError) {
        // 如果解析JSON失败，使用默认错误消息
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    // 处理后端返回的{code, message, data}格式，提取data字段
    return data.data || data as T;
  } catch (error) {
    console.error(`请求 ${url} 失败:`, error);
    throw error;
  }
};

// 认证相关API
export const authAPI = {
  login: async (username: string, password: string) => {
    return request<{ token: string; user: { id: number; name: string; role: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  
  logout: async () => {
    return request('/auth/logout', {
      method: 'POST',
    });
  },
  
  me: async () => {
    return request<{ id: number; name: string; role: string }>('/auth/me');
  },
};

// 员工相关API
export const employeeAPI = {
  getAll: async (page: number = 1, limit: number = 10, search?: string) => {
    return request<{ data: any[]; total: number }>('/employees', {
      params: { page, limit, search: search || '' },
    });
  },
  
  getById: async (id: number) => {
    return request<any>(`/employees/${id}`);
  },
  
  getByUsername: async (username: string) => {
    return request<any>(`/employees/username/${username}`);
  },
  
  create: async (data: any) => {
    return request<any>('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: async (id: number, data: any) => {
    return request<any>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  delete: async (id: number) => {
    return request<any>(`/employees/${id}`, {
      method: 'DELETE',
    });
  },
  
  resetPassword: async (id: number, newPassword: string) => {
    return request<any>(`/employees/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },
};

// 订单相关API
export const orderAPI = {
  getAll: async (page: number = 1, limit: number = 10, search?: string, status?: string) => {
    return request<{ data: any[]; total: number }>('/orders', {
      params: { page, limit, search: search || '', status: status || 'all' },
    });
  },
  
  getById: async (id: string) => {
    return request<any>(`/orders/${id}`);
  },
  
  getByEmployeeId: async (employeeId: number, page: number = 1, limit: number = 10) => {
    return request<{ data: any[]; total: number }>(`/orders/employee/${employeeId}`, {
      params: { page, limit },
    });
  },
  
  create: async (data: any) => {
    return request<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  updateStatus: async (id: string, status: 'completed' | 'refunded') => {
    return request<any>(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
  
  update: async (id: string, data: any) => {
    return request<any>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  delete: async (id: string) => {
    return request<any>(`/orders/${id}`, {
      method: 'DELETE',
    });
  },
};

// 业绩相关API
export const performanceAPI = {
  getAll: async (page: number = 1, limit: number = 10, filters?: Record<string, string | number>) => {
    return request<{ data: any[]; total: number }>('/performance', {
      params: { page, limit, ...filters },
    });
  },
  
  getByEmployeeId: async (employeeId: number, page: number = 1, limit: number = 10) => {
    return request<{ data: any[]; total: number }>(`/performance/employee/${employeeId}`, {
      params: { page, limit },
    });
  },
  
  getByDateRange: async (startDate: string, endDate: string, page: number = 1, limit: number = 10) => {
    return request<{ data: any[]; total: number }>('/performance/date-range', {
      params: { startDate, endDate, page, limit },
    });
  },
  
  create: async (data: any) => {
    return request<any>('/performance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  export: async (filters?: Record<string, string | number>) => {
    const response = await fetch(`${API_BASE_URL}/performance/export`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('导出失败');
    }
    
    return response.blob();
  },
};

// 通知相关API
export const notificationAPI = {
  getAll: async (page: number = 1, limit: number = 10, search?: string, status?: string) => {
    return request<{ data: any[]; total: number }>('/notifications', {
      params: { page, limit, search: search || '', status: status || '' },
    });
  },
  
  getPublished: async (page: number = 1, limit: number = 10) => {
    return request<{ data: any[]; total: number }>('/notifications/published', {
      params: { page, limit },
    });
  },
  
  getById: async (id: number) => {
    return request<any>(`/notifications/${id}`);
  },
  
  create: async (data: any) => {
    return request<any>('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: async (id: number, data: any) => {
    return request<any>(`/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  delete: async (id: number) => {
    return request<any>(`/notifications/${id}`, {
      method: 'DELETE',
    });
  },
  
  publish: async (id: number) => {
    return request<any>(`/notifications/${id}/publish`, {
      method: 'POST',
    });
  },
  
  unpublish: async (id: number) => {
    return request<any>(`/notifications/${id}/unpublish`, {
      method: 'POST',
    });
  },
};

// 库存相关API
export const inventoryAPI = {
  getAll: async (page: number = 1, limit: number = 10, search?: string) => {
    return request<{ data: any[]; total: number }>('/inventory', {
      params: { page, limit, search: search || '' },
    });
  },
  
  getById: async (id: string) => {
    return request<any>(`/inventory/${id}`);
  },
  
  create: async (data: any) => {
    return request<any>('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: async (id: string, data: any) => {
    return request<any>(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  updateStock: async (id: string, quantity: number) => {
    return request<any>(`/inventory/${id}/stock`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  },
  
  delete: async (id: string) => {
    return request<any>(`/inventory/${id}`, {
      method: 'DELETE',
    });
  },
  
  getLowStock: async (threshold: number = 10) => {
    return request<any>('/inventory/low-stock', {
      params: { threshold },
    });
  },
  
  getStockHistory: async (productId: string, page: number = 1, limit: number = 10) => {
    return request<any>(`/inventory/${productId}/history`, {
      params: { page, limit },
    });
  },
};

// 仪表板数据API
export const dashboardAPI = {
  getKpiData: async (timeRange: 'day' | 'week' | 'month' = 'month') => {
    return request<any>(`/dashboard/kpi`, {
      params: { timeRange },
    });
  },
  
  getPerformanceTrend: async (timeRange: 'day' | 'week' | 'month' = 'month') => {
    return request<any>(`/dashboard/performance-trend`, {
      params: { timeRange },
    });
  },
  
  getTopPerformers: async (limit: number = 5) => {
    return request<any>(`/dashboard/top-performers`, {
      params: { limit },
    });
  },
  
  getSalesByCategory: async () => {
    return request<any>('/dashboard/sales-by-category');
  },
};