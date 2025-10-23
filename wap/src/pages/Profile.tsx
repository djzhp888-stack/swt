import { useContext, useState, useEffect } from "react";
import { AuthContext } from "@/contexts/authContext";
import { Empty } from "@/components/Empty";
import { toast } from "sonner";
import BottomNavigation from "@/components/BottomNavigation";
import { authAPI, employeeAPI } from "@/services/apiService";

export default function Profile() {
  const { user, logout } = useContext(AuthContext);
  
  const handleLogout = () => {
    if (window.confirm("确定要退出登录吗？")) {
      logout();
      window.location.href = "/login";
    }
  };
  
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        if (!user || !user.id) return;
        
        // 调用API获取详细的用户信息
        const details = await employeeAPI.getById(user.id);
        setUserDetails(details);
      } catch (error) {
        console.error("获取用户详情失败:", error);
        toast.error("获取用户详情失败");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserDetails();
  }, [user]);
  
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm p-4">
          <h1 className="text-xl font-bold text-gray-800">个人信息</h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </main>
      </div>
    );
  }
  
  if (!user) {
    return <Empty message="加载用户信息失败" />;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold text-gray-800">个人信息</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-xl p-6 shadow-sm text-center mb-6">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-user text-4xl text-blue-600"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">{user.name}</h2>
          <p className="text-gray-500">{user.role === 'admin' ? '管理员' : '普通员工'}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base font-medium text-gray-800">基本信息</h3>
          </div>
          
          <div className="divide-y divide-gray-100">
            <div className="p-4 flex justify-between items-center">
              <span className="text-gray-500">用户ID</span>
              <span className="text-gray-800">{user.id}</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="text-gray-500">角色</span>
              <span className="text-gray-800">{user.role === 'admin' ? '管理员' : '普通员工'}</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="text-gray-500">所属部门</span>
              <span className="text-gray-800">{userDetails?.department || '-'}</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="text-gray-500">入职时间</span>
              <span className="text-gray-800">{userDetails?.hireDate || '-'}</span>
            </div>
            {userDetails?.email && (
              <div className="p-4 flex justify-between items-center">
                <span className="text-gray-500">邮箱</span>
                <span className="text-gray-800">{userDetails.email}</span>
              </div>
            )}
            {userDetails?.phone && (
              <div className="p-4 flex justify-between items-center">
                <span className="text-gray-500">联系电话</span>
                <span className="text-gray-800">{userDetails.phone}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* 退出登录按钮 */}
        <div className="px-4 py-6">
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-red-50 text-red-600 font-medium rounded-lg transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
          >
            <i className="fa-solid fa-sign-out-alt mr-2"></i>
            退出登录
          </button>
        </div>
      </main>

      {/* 底部导航 */}
      <BottomNavigation active="profile" />
    </div>
  );
}