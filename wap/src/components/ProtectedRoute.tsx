import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "@/contexts/authContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useContext(AuthContext);
  
  if (!isAuthenticated) {
    // 如果未认证，重定向到登录页面
    return <Navigate to="/login" replace />;
  }
  
  // 已认证，渲染子组件
  return <>{children}</>;
}