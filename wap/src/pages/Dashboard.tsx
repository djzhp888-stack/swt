import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/contexts/authContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Empty } from "@/components/Empty";
import { toast } from "sonner";
import BottomNavigation from "@/components/BottomNavigation";
import { performanceAPI } from "@/services/apiService";

// KPI数据类型
interface KPI {
  totalRevenue: number;
  totalOrders: number;
  activeEmployees: number;
  refundAmount: number;
  monthOnMonthGrowth: number;
  yearOnYearGrowth: number;
}

// 业绩趋势数据类型
interface PerformanceData {
  date: string;
  value: number;
}

// 通知消息类型
interface Notification {
  id: number;
  title: string;
  content: string;
  time: string;
  read: boolean;
}

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const [kpiData, setKpiData] = useState<KPI | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('month');

  // 获取KPI数据
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !user.id) {
        setLoading(false);
        return;
      }
      
      try {
        // 获取KPI数据
        const kpiResponse = await performanceAPI.getKPI(user.id);
        setKpiData(kpiResponse.data || kpiResponse || null);
        
        // 获取业绩趋势数据
        const performanceResponse = await performanceAPI.getPerformanceTrend(user.id, timeRange);
        setPerformanceData(performanceResponse.data || performanceResponse || []);
        
        // 获取通知消息
        const notificationResponse = await performanceAPI.getNotifications(user.id);
        setNotifications(Array.isArray(notificationResponse.data) ? notificationResponse.data : (Array.isArray(notificationResponse) ? notificationResponse : []));
      } catch (error) {
        console.error('获取仪表盘数据失败:', error);
        // 不显示多个错误提示，避免影响用户体验
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, timeRange]);

  // 处理时间范围切换
  const handleTimeRangeChange = (range: 'day' | 'week' | 'month') => {
    setTimeRange(range);
    setLoading(true);
  };

  // 格式化金额
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // 计算未读消息数量
  const unreadCount = Array.isArray(notifications) ? notifications.filter(notification => !notification.read).length : 0;

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-gray-500">请先登录</div>
        </div>
        <BottomNavigation active="dashboard" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">员工仪表盘</h1>
            <p className="text-gray-500 text-sm">欢迎回来，{user.name}</p>
          </div>
          <div className="relative">
            <button className="p-2 text-gray-500 hover:text-blue-600 transition">
              <i className="fa-solid fa-bell text-xl"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {/* KPI卡片 */}
        <section className="mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">总销售额</p>
              <p className="text-2xl font-bold text-gray-800">{kpiData ? formatCurrency(kpiData.totalRevenue) : '-'}</p>
              <div className="flex items-center mt-2 text-sm">
                {kpiData && kpiData.monthOnMonthGrowth > 0 ? (
                  <span className="text-green-500 flex items-center">
                    <i className="fa-solid fa-arrow-up mr-1"></i>
                    {kpiData.monthOnMonthGrowth}%
                  </span>
                ) : kpiData && kpiData.monthOnMonthGrowth < 0 ? (
                  <span className="text-red-500 flex items-center">
                    <i className="fa-solid fa-arrow-down mr-1"></i>
                    {Math.abs(kpiData.monthOnMonthGrowth)}%
                  </span>
                ) : (
                  <span className="text-gray-500">持平</span>
                )}
                <span className="text-gray-400 ml-2">环比</span>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">订单总数</p>
              <p className="text-2xl font-bold text-gray-800">{kpiData ? kpiData.totalOrders : '-'}</p>
              <div className="flex items-center mt-2 text-sm">
                <span className="text-gray-500">本月</span>
              </div>
            </div>
          </div>
        </section>

        {/* 业绩趋势图表 */}
        <section className="mb-8 bg-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">业绩趋势</h2>
            <div className="flex space-x-2">
              {['day', 'week', 'month'].map((range) => (
                <button
                  key={range}
                  onClick={() => handleTimeRangeChange(range as 'day' | 'week' | 'month')}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range === 'day' ? '日' : range === 'week' ? '周' : '月'}
                </button>
              ))}
            </div>
          </div>
          
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : performanceData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={12} 
                    tickMargin={8}
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    fontSize={12} 
                    tickMargin={8}
                    stroke="#9ca3af"
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(Number(value)), '销售额']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty message="暂无业绩数据" />
          )}
        </section>

        {/* 通知消息 */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">最新通知</h2>
          
          {notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.read ? 'border-gray-100 bg-gray-50' : 'border-blue-100 bg-blue-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-gray-800">{notification.title}</h3>
                    <span className="text-xs text-gray-400">{notification.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <Empty message="暂无通知消息" />
          )}
        </section>
      </main>

      {/* 底部导航 */}
      <BottomNavigation active="dashboard" />
    </div>
  );
}