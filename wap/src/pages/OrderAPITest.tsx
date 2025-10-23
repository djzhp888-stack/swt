import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/contexts/authContext";
import { orderAPI } from "@/services/apiService";
import { toast } from "sonner";

interface Order {
  id: string;
  employee_id: number;
  employee_name: string;
  department: string;
  customer_name: string;
  customer_contact: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function OrderAPITest() {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // 测试API调用
  const testOrderAPI = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!user || !user.id) {
        const error = new Error("用户未登录或信息不完整");
        throw error;
      }
      
      const response = await orderAPI.getByEmployeeId(
        user.id,  // 员工ID
        1,        // 页码
        10,       // 每页数量
        "",       // 搜索关键词
        "all"     // 状态筛选
      );
      
      setOrders(response.data || []);
      setTotal(response.total || 0);
      toast.success(`成功获取到 ${response.data?.length || 0} 条订单记录`);
    } catch (err: any) {
      const errorMessage = err.message || "获取订单失败";
      setError(errorMessage);
      toast.error(`API调用失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取状态显示文本
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'completed': '已完成',
      'refunded': '已退款'
    };
    return statusMap[status] || status;
  };

  // 格式化金额
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">订单API测试页面</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">当前用户信息:</h2>
        {user ? (
          <div className="space-y-2">
            <p>ID: {user.id}</p>
            <p>姓名: {user.name}</p>
            <p>角色: {user.role}</p>
          </div>
        ) : (
          <p className="text-red-500">用户未登录或信息不完整</p>
        )}
      </div>

      <button 
        onClick={testOrderAPI}
        disabled={loading || !user?.id}
        className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mb-6"
      >
        {loading ? '正在获取...' : '测试订单API调用'}
      </button>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          <strong>错误:</strong> {error}
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold">API响应信息:</h2>
        <p>总订单数: {total}</p>
        <p>当前页订单数: {orders.length}</p>
      </div>

      {orders.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">订单列表:</h2>
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div><strong>订单ID:</strong> {order.id}</div>
                  <div><strong>状态:</strong> {getStatusText(order.status)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div><strong>客户名称:</strong> {order.customer_name}</div>
                  <div><strong>客户联系:</strong> {order.customer_contact}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>订单金额:</strong> {formatCurrency(order.amount)}</div>
                  <div><strong>创建时间:</strong> {new Date(order.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 text-center text-sm text-gray-500">
        <p>此页面仅用于测试订单API功能</p>
      </div>
    </div>
  );
}