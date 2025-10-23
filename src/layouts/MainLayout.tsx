import { useState, useContext } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { useTheme } from '@/hooks/useTheme';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { logout, user } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    toast.success('已成功退出登录');
  };

  const navItems = [
    { id: 'dashboard', label: '数据看板', icon: 'fa-chart-line', path: '/dashboard' },
    { id: 'employees', label: '员工管理', icon: 'fa-users', path: '/employees' },
    { id: 'orders', label: '订单管理', icon: 'fa-shopping-cart', path: '/orders' },
    { id: 'inventory', label: '库存管理', icon: 'fa-boxes', path: '/inventory' },
  ];

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? '240px' : '64px' }}
        transition={{ duration: 0.3 }}
        className={`${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border-r h-full flex flex-col overflow-hidden`}
      >
        {/* Logo */}
        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
          {isSidebarOpen && (
            <h1 className="text-lg font-bold text-blue-600 dark:text-blue-400">
              三尾豚管理系统
            </h1>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 rounded-md ${
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
            aria-label="切换侧边栏"
          >
            <i className={`fa-solid ${isSidebarOpen ? 'fa-chevron-left' : 'fa-chevron-right'}`}></i>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-lg transition-colors duration-200 ${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : `${
                          theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`
                  }`}
                >
                  <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
                  {isSidebarOpen && (
                    <span className="ml-3">{item.label}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User profile */}
        <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 dark:bg-blue-900/50 dark:text-blue-400`}>
              <i className="fa-solid fa-user"></i>
            </div>
            {isSidebarOpen && (
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">管理员</p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className={`h-16 flex items-center justify-between px-6 border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center">
            <h2 className="text-xl font-semibold">
              {navItems.find(item => item.path === location.pathname)?.label || '管理系统'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              aria-label="切换主题"
            >
              {theme === 'dark' ? (
                <i className="fa-solid fa-sun"></i>
              ) : (
                <i className="fa-solid fa-moon"></i>
              )}
            </button>
            
            <div className={`relative p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
              <i className="fa-solid fa-bell"></i>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </div>
            
            <button
              onClick={handleLogout}
              className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-red-400' : 'bg-gray-100 hover:bg-gray-200 text-red-500'}`}
              aria-label="退出登录"
            >
              <i className="fa-solid fa-sign-out-alt"></i>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;