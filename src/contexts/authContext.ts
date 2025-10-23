import { createContext } from "react";

// 定义用户类型
interface UserType {
  name: string;
  role: string;
}

// 定义上下文类型
interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  user: UserType | null;
  setUser: (user: UserType | null) => void;
  logout: () => void;
  token: string;
  setToken: (token: string) => void;
  isCheckingAuth: boolean;
}

// 创建上下文，提供默认值
const defaultContextValue: AuthContextType = {
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  user: null,
  setUser: () => {},
  logout: () => {},
  token: "",
  setToken: () => {},
  isCheckingAuth: false
};

export const AuthContext = createContext<AuthContextType>(defaultContextValue);