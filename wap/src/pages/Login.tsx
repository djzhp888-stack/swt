import { useState, useContext } from "react";
import { AuthContext } from "@/contexts/authContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { authAPI } from "@/services/apiService";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { setIsAuthenticated, setUser, setToken } = useContext(AuthContext);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("请输入用户名和密码");
      return;
    }
    
    setLoading(true);
    
    try {
      // 调用真实的登录API
      const response = await authAPI.login(username, password);
      
      // 保存认证信息
      setIsAuthenticated(true);
      setUser(response.user);
      setToken(response.token);
      
      // 存储到localStorage
      localStorage.setItem('authToken', response.token); // 注意：apiService使用'authToken'作为键名
      localStorage.setItem('user', JSON.stringify(response.user));
      
      toast.success("登录成功");
    } catch (error: any) {
      toast.error(error.message || "登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 p-6">
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">员工管理系统</h1>
          <p className="text-gray-500">请登录您的账号</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              用户名
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="请输入用户名"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              密码
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="请输入密码"
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            className={`w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <i className="fa fa-spinner fa-spin mr-2"></i>
                登录中...
              </div>
            ) : (
              "登录"
            )}
          </button>
        </form>
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>© 2025 员工管理系统 版权所有</p>
      </div>
    </div>
  );
}