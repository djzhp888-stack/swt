import { createContext } from "react";

// 定义用户信息类型
export interface UserInfo {
  id: number;
  name: string;
  role: string;
}

// 定义认证上下文类型
interface AuthContextType {
  isAuthenticated: boolean;
  user: UserInfo | null;
  token: string | null;
  setIsAuthenticated: (value: boolean) => void;
  setUser: (user: UserInfo | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  token: null,
  setIsAuthenticated: () => {},
  setUser: () => {},
  setToken: () => {},
  logout: () => {},
});