import { useState, useEffect, useContext } from "react";
import { Empty } from "@/components/Empty";
import { toast } from "sonner";
import BottomNavigation from "@/components/BottomNavigation";
import { AuthContext } from "@/contexts/authContext";
import { orderAPI } from "@/services/apiService";

// 订单数据类型
interface Order {
  id: string;
  employee_id: number;
  employee_name: string;
  department?: string;
  customer_name: string;
  amount: number;
  status: string;
  created_at: string;
  customer_contact?: string;
  // 支持更多操作的字段
}

// 订单状态选项
const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'completed', label: '已完成' },
  { value: 'refunded', label: '已退款' }
];

export default function SalesRecords() {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // 每页显示的订单数量
  const itemsPerPage = 10;

  // 格式化金额
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // 获取状态对应的显示文本和样式
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { text: '已完成', className: 'bg-green-100 text-green-800' };
      case 'refunded':
        return { text: '已退款', className: 'bg-purple-100 text-purple-800' };
      default:
        return { text: status, className: 'bg-gray-100 text-gray-800' };
    }
  };

  // 获取订单数据
  const fetchOrders = async () => {
    if (!user?.id) {
      setOrders([]);
      setTotalOrders(0);
      return;
    }
    
    setLoading(true);
    try {
      // 调用API获取员工的订单数据
      const response = await orderAPI.getByEmployeeId(
        user.id,
        currentPage,
        itemsPerPage,
        searchQuery,
        statusFilter === 'all' ? undefined : statusFilter
      );
      
      // 安全地处理响应数据
      const data = response?.data || [];
      const total = response?.total || 0;
      
      setOrders(data);
      setTotalOrders(total);
    } catch (error) {
      console.error('获取订单数据失败:', error);
      toast.error('获取销售记录失败，请稍后重试');
      setOrders([]);
      setTotalOrders(0);
    } finally {
      setLoading(false);
    }
  };

  // 处理搜索
  const handleSearch = () => {
    setCurrentPage(1);
  };

  // 处理页码变化
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= Math.ceil(totalOrders / itemsPerPage)) {
      setCurrentPage(page);
    }
  };

  // 处理查看详情
  const handleViewDetail = (orderId: string) => {
    // 获取订单详情
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    // 模拟产品明细数据
    const productDetails = [
      { name: '午夜', quantity: 1, price: 1860, gift: false, subtotal: 1860 }
    ];
    
    // 构建详情HTML
    const detailHTML = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">订单信息</h2>
        <div style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; margin: 20px 0;">
          <div style="color: #6b7280;">订单号:</div>
          <div style="font-weight: 500;">${order.id || '2222222222222'}</div>
          <div style="color: #6b7280;">创建日期:</div>
          <div>${order.created_at ? new Date(order.created_at).toLocaleDateString('zh-CN') : '2025-10-22'}</div>
          <div style="color: #6b7280;">状态:</div>
          <div>${getStatusInfo(order.status).text}</div>
        </div>
        
        <h2 style="color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">客户信息</h2>
        <div style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; margin: 20px 0;">
          <div style="color: #6b7280;">客户名称:</div>
          <div>${order.customer_name || '1111111111'}</div>
          <div style="color: #6b7280;">联系方式:</div>
          <div
            style="color: #2563eb; cursor: pointer; text-decoration: underline;"
            onclick="navigator.clipboard.writeText(this.textContent.trim())"
            title="点击复制联系方式"
          >
            ${order.customer_contact || '1111111111111111111111111111'}
          </div>
        </div>
        
        <!-- 销售信息部分已移除 -->
        
        <h2 style="color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">金额信息</h2>
        <div style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; margin: 20px 0;">
          <div style="color: #6b7280;">订单金额:</div>
          <div style="color: #10b981; font-weight: 500;">${formatCurrency(order.amount || 1860)}</div>
          <div style="color: #6b7280;">支付状态:</div>
          <div>已支付</div>
        </div>
        
        <h2 style="color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">产品明细</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">产品名称</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">数量</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">单价</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">赠品</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">小计</th>
            </tr>
          </thead>
          <tbody>
            ${productDetails.map((product, index) => `
              <tr style="${index % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f9fafb;'} border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px;">${product.name}</td>
                <td style="padding: 8px;">${product.quantity}</td>
                <td style="padding: 8px;">${formatCurrency(product.price)}</td>
                <td style="padding: 8px;">${product.gift ? '是' : '-'}</td>
                <td style="padding: 8px; font-weight: 500;">${formatCurrency(product.subtotal)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    // 创建弹窗
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '9999';
    
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'white';
    modalContent.style.borderRadius = '8px';
    modalContent.style.padding = '24px';
    modalContent.style.maxWidth = '90%';
    modalContent.style.maxHeight = '80%';
    modalContent.style.overflowY = 'auto';
    modalContent.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
    modalContent.innerHTML = detailHTML;
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.marginTop = '20px';
    closeButton.style.padding = '8px 16px';
    closeButton.style.backgroundColor = '#f3f4f6';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => {
      document.body.removeChild(modal);
    };
    
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);
    
    // 添加点击外部关闭功能
    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    };
    
    document.body.appendChild(modal);
  };

  // 监听依赖项变化，重新获取数据
  useEffect(() => {
    fetchOrders();
  }, [user, currentPage, searchQuery, statusFilter]);

  // 计算总页数
  const totalPages = Math.ceil(totalOrders / itemsPerPage);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex flex-col space-y-4">
          <h1 className="text-xl font-bold text-gray-800">销售记录</h1>
          
          {/* 搜索框 */}
          <div className="relative">
            <input
              type="text"
              placeholder="搜索订单号或客户姓名"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            <i className="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          </div>
          
          {/* 状态筛选 */}
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  setStatusFilter(option.value);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  statusFilter === option.value
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {/* 销售记录列表 */}
        {loading ? (
          // 加载状态 - 骨架屏
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">订单号</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">客户名称</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建日期</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="py-3 px-4">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-8 bg-gray-200 rounded w-24"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : orders.length > 0 ? (
          // 订单列表 - 表格布局
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">订单号</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">客户名称</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">金额</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">状态</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">创建日期</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => {
                    const statusInfo = getStatusInfo(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-800 font-medium">{order.id}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{order.customer_name}</td>
                        <td className="py-3 px-4 text-sm font-medium text-blue-600">{formatCurrency(order.amount || 0)}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex text-xs px-2 py-1 rounded-full ${statusInfo.className}`}>
                            {statusInfo.text}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {order.created_at ? new Date(order.created_at).toLocaleString('zh-CN') : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleViewDetail(order.id)}
                              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                            >
                              详情
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  共 {totalOrders} 条记录
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 text-sm rounded border ${
                      currentPage === 1
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }}`}
                  >
                    上一页
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    第 {currentPage} / {totalPages} 页
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 text-sm rounded border ${
                      currentPage === totalPages
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }}`}
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // 空状态
          <Empty message={searchQuery ? "没有找到匹配的销售记录" : "暂无销售记录"} />
        )}
      </main>

      {/* 底部导航 */}
      <BottomNavigation active="sales" />
    </div>
  );
}