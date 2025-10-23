import { useContext } from "react";
import { AuthContext } from "@/contexts/authContext";
import { Navigate } from "react-router-dom";

export default function Home() {
  const { isAuthenticated } = useContext(AuthContext);
  
  // 根据认证状态重定向
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  } else {
    return <Navigate to="/login" />;
  }
}