import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell 
} from 'recharts';
import { useTheme } from '@/hooks/useTheme';
import { useDB } from '@/contexts/dbContext.tsx';
import { toast } from 'sonner';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const { theme } = useTheme();
  const { order, employee, performance, dashboard } = useDB();
  
  // 简单的数据状态
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [salesByCategory, setSalesByCategory] = useState<any[]>([]);
  const [kpiData, setKpiData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeEmployees: 0,
    refundAmount: 0,
    monthOnMonthGrowth: 0,
    yearOnYearGrowth: 0,
  });
  
  // 加载仪表板数据
  const loadData = async () => {
    setLoading(true);
    try {
      console.log('开始加载仪表板数据...');
      
      // 使用仪表板API获取数据
      const [kpiDataResponse, trendDataResponse, topPerformersResponse, categoryDataResponse] = await Promise.all([
        dashboard.getKpiData({ timeRange }),
        dashboard.getPerformanceTrend({ timeRange }),
        dashboard.getTopPerformers(),
        dashboard.getSalesByCategory()
      ]);
      
      // 直接使用API返回的数据（apiService.ts中的request函数已经处理了响应格式）
      setKpiData({
        totalRevenue: kpiDataResponse.totalRevenue || 0,
        totalOrders: kpiDataResponse.totalOrders || 0,
        activeEmployees: kpiDataResponse.activeEmployees || 0,
        refundAmount: kpiDataResponse.refundAmount || 0,
        monthOnMonthGrowth: kpiDataResponse.monthOnMonthGrowth || 0,
        yearOnYearGrowth: kpiDataResponse.yearOnYearGrowth || 0
      });
      
      // 直接使用趋势数据
      setPerformanceData(trendDataResponse || []);
      
      // 格式化员工业绩排行数据
      const formattedPerformers = (topPerformersResponse || []).map((p: any) => ({
        ...p,
        sales: p.amount, // 确保有sales字段供图表使用
        orders: p.orders || 0
      }));
      setTopPerformers(formattedPerformers);
      
      // 直接使用销售构成数据
      setSalesByCategory(categoryDataResponse || []);
      
      console.log('仪表板数据加载完成:', {
        kpiData: kpiDataResponse,
        trendDataCount: (trendDataResponse || []).length,
        performersCount: (topPerformersResponse || []).length,
        categoryDataCount: (categoryDataResponse || []).length
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      toast.error('加载数据失败，请稍后重试');
      
      // 发生错误时，设置为默认空值
      setKpiData({
        totalRevenue: 0,
        totalOrders: 0,
        activeEmployees: 0,
        refundAmount: 0,
        monthOnMonthGrowth: 0,
        yearOnYearGrowth: 0
      });
      
      // 清空图表数据
      setPerformanceData([]);
      setTopPerformers([]);
      setSalesByCategory([]);
    } finally {
      setLoading(false);
    }
  };
  
  // 首次加载和时间范围变化时刷新数据
  useEffect(() => {
    loadData();
  }, [order, employee, timeRange]); // 依赖timeRange，实现时间范围切换时的数据更新
  
  // 设置定时刷新 - 每30秒自动更新一次数据
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('自动刷新Dashboard数据...');
      loadData();
    }, 30000); // 30秒刷新一次
    
    // 清理函数，组件卸载时清除定时器
    return () => clearInterval(intervalId);
  }, [order, employee, timeRange]); // 确保依赖正确

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
      },
    }),
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-lg font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 不再使用模拟数据的提示 */}
      
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">数据看板</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* 手动刷新按钮 */}
          <button
            onClick={loadData}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm flex items-center transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} disabled:opacity-50`}
          >
            {loading ? (
              <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
            ) : (
              <i className="fa-solid fa-sync mr-2"></i>
            )}
            刷新
          </button>
          
          {/* 时间范围选择器 */}
          <div className="flex space-x-2">
            <button
              onClick={() => setTimeRange('day')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${timeRange === 'day' ? 'bg-blue-600 text-white': theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              日
            </button>
            <button
              onClick={() => setTimeRange('week')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${timeRange === 'week' ? 'bg-blue-600 text-white' : theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              周
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${timeRange === 'month' ? 'bg-blue-600 text-white' : theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              月
            </button>
          </div>
        </div>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(kpiData).map(([key, value], index) => {
          // 为每个KPI设置适当的标签和图标
          let label = '';
          let icon = '';
          let colorClass = '';
          
          switch (key) {
            case 'totalRevenue':
              label = '总销售额';
              icon = 'fa-rmb';
              colorClass = 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400';
              break;
            case 'totalOrders':
              label = '总订单数';
              icon = 'fa-shopping-cart';
              colorClass = 'bg-green-500/10 text-green-500 dark:bg-green-500/20 dark:text-green-400';
              break;
            case 'activeEmployees':
              label = '活跃销售人数';
              icon = 'fa-users';
              colorClass = 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400';
              break;
            case 'refundAmount':
              label = '退款总额';
              icon = 'fa-undo-alt';
              colorClass = 'bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400';
              break;
            case 'monthOnMonthGrowth':
              label = '环比增长';
              icon = 'fa-chart-line';
              colorClass = 'bg-yellow-500/10 text-yellow-500 dark:bg-yellow-500/20 dark:text-yellow-400';
              break;
            case 'yearOnYearGrowth':
              label = '同比增长';
              icon = 'fa-chart-bar';
              colorClass = 'bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400';
              break;
            default:
              label = key;
              icon = 'fa-info-circle';
              colorClass = 'bg-gray-500/10 text-gray-500';
          }
          
          // 格式化数值显示
          let formattedValue = '';
          if (typeof value === 'number') {
            if (key.includes('Growth')) {
              formattedValue = `${value}%`;
            } else if (key.includes('Amount') || key === 'totalRevenue') {
              formattedValue = `¥${value.toLocaleString()}`;
            } else {
              formattedValue = value.toString();
            }
          }
          
          return (
            <motion.div
              key={key}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                  <h3 className="text-2xl font-bold mt-1">{formattedValue}</h3>
                </div>
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <i className={`fa-solid ${icon}`}></i>
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs">
                {key.includes('Growth') && value > 0 ? (
                  <span className="text-green-500 flex items-center">
                    <i className="fa-solid fa-arrow-up mr-1"></i> {value}%
                  </span>
                ) : value === 0 ? (
                  <span className="text-gray-500 flex items-center">
                    <i className="fa-solid fa-minus mr-1"></i> 0%
                  </span>
                ) : null}
                {key.includes('Growth') && value !== 0 && (
                  <span className="ml-2 text-gray-500 dark:text-gray-400">vs 上月</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 销售趋势图 */}
        <div className={`lg:col-span-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-5 shadow-sm`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">销售趋势</h3>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">销售额</button>
              <button className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">订单数</button>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData.length > 0 ? performanceData : [{ date: '暂无数据', sales: 0, revenue: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  dataKey="date" 
                  stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} 
                />
                <YAxis 
                  stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} 
                />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? `¥${value.toLocaleString()}` : value,
                    name === 'revenue' ? '销售额' : '订单数'
                  ]}
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                    borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                    color: theme === 'dark' ? '#ffffff' : '#111827'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  name="销售额" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  name="订单数" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 销售构成饼图 */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-5 shadow-sm`}>
          <h3 className="font-semibold mb-4">销售构成</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {salesByCategory.filter(item => item.name && item.value > 0).length > 0 ? (
                  <Pie
                    data={salesByCategory.filter(item => item.name && item.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {salesByCategory.filter(item => item.name && item.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                ) : (
                  <Pie
                    data={[{ name: '暂无数据', value: 1 }]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#cccccc"
                    dataKey="value"
                    label={() => '暂无数据'}
                  >
                    <Cell fill="#cccccc" />
                  </Pie>
                )}
                <Tooltip 
                  formatter={(value) => [`${value}`, '数量']}
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                    borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                    color: theme === 'dark' ? '#ffffff' : '#111827'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {salesByCategory.filter(item => item.name && item.value > 0).map((entry, index) => (
              <div key={index} className="flex items-center text-sm">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 员工业绩排行 */}
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-5 shadow-sm`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">员工业绩排行</h3>
          <button className={`text-sm flex items-center ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
            查看全部 <i className="fa-solid fa-chevron-right ml-1 text-xs"></i>
          </button>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPerformers.filter(item => item.name && (item.sales > 0 || item.orders > 0)).length > 0 ? 
                topPerformers.filter(item => item.name && (item.sales > 0 || item.orders > 0)) : 
                [{ name: '暂无数据', sales: 0, orders: 0 }]
              }>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
              <XAxis 
                dataKey="name" 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} 
              />
              <YAxis 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} 
              />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'sales' ? `¥${value.toLocaleString()}` : value, 
                  name === 'sales' ? '销售额' : '订单数'
                ]}
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                  color: theme === 'dark' ? '#ffffff' : '#111827'
                }}
              />
              <Legend />
              <Bar dataKey="sales" name="销售额" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="orders" name="订单数" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}