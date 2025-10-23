import React, { useState, useContext, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import EmployeeManagement from "@/pages/EmployeeManagement";
import OrderManagement from "@/pages/OrderManagement";
import InventoryManagement from "@/pages/InventoryManagement";
import { AuthContext } from '@/contexts/authContext';
import MainLayout from "@/layouts/MainLayout";
import { APIProvider } from '@/contexts/dbContext.tsx';
import * as apiService from '@/services/apiService';

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // 确保在组件顶层调用Hook
  const authContext = useContext(AuthContext);
  
  // 简单的降级策略：如果上下文未提供或出错，使用默认值
  const isAuthenticated = authContext?.isAuthenticated || false;
  const isCheckingAuth = authContext?.isCheckingAuth || false;
  
  // 在检查认证状态时显示加载中，避免过早重定向
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl font-semibold">正在验证登录状态...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Login />;
  }
  
  return children;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [token, setToken] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 在组件挂载时验证localStorage中的token
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // 检查localStorage中是否有token
        const savedToken = localStorage.getItem('authToken');
        if (savedToken) {
          setToken(savedToken);
          // 尝试获取当前用户信息，验证token是否有效
          const userInfo = await apiService.authAPI.me();
          // 确保userInfo存在且包含必要的属性
          if (userInfo && typeof userInfo.name === 'string' && typeof userInfo.role === 'string') {
            setUser({ name: userInfo.name, role: userInfo.role });
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        // token无效或过期，清除localStorage
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        setUser(null);
        setToken('');
        console.log('认证验证失败，token无效或已过期');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, []);

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setToken('');
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, setIsAuthenticated, user, setUser, logout, token, setToken, isCheckingAuth }}
    >
      <APIProvider>
        <Routes>
          {/* Web routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected web routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/employees" element={
            <ProtectedRoute>
              <MainLayout>
                <EmployeeManagement />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/orders" element={
            <ProtectedRoute>
              <MainLayout>
                <OrderManagement />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/inventory" element={
            <ProtectedRoute>
              <MainLayout>
                <InventoryManagement />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          {/* 404 页面 */}
          <Route path="*" element={<Home />} />
        </Routes>
      </APIProvider>
    </AuthContext.Provider>
  );
}