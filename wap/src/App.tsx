import { Routes, Route, Navigate } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import SalesRecords from "@/pages/SalesRecords";
import Profile from "@/pages/Profile";
import OrderAPITest from "@/pages/OrderAPITest"; // 导入测试页面
import { useState, useEffect } from "react";
import { AuthContext, UserInfo } from '@/contexts/authContext';
import ProtectedRoute from "@/components/ProtectedRoute";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 从localStorage加载认证信息
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken'); // 使用与Login组件相同的键名
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        // 添加try-catch确保JSON解析安全
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('解析用户信息失败:', error);
        // 清除损坏的存储数据
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
      }
    }
  }, []);

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken'); // 统一使用'authToken'键名
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{ 
        isAuthenticated, 
        user, 
        token,
        setIsAuthenticated, 
        setUser, 
        setToken,
        logout 
      }}
    >
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/api-test" element={isAuthenticated ? <OrderAPITest /> : <Navigate to="/login" />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><SalesRecords /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthContext.Provider>
  );
}
