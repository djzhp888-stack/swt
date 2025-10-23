import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { useDB } from '@/contexts/dbContext';

// 订单数据类型
interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  isGift?: boolean; // 是否为赠品
}

interface Order {
  id: string;
  employeeId: number;
  employeeName: string;
  customerName: string;
  customerContact: string;
  amount: number;
  status: 'completed' | 'refunded';
  items: OrderItem[];
  createdAt: string;
  department?: string;
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]); // 库存商品列表
  const { order, employee, inventory, isConnected } = useDB();
  
  const { theme } = useTheme();
  const itemsPerPage = 10;

  // 加载员工数据
  const loadEmployees = async () => {
    try {
      const empResult = await employee.getAll(1, 100);
      let employeesData = [];
      if (empResult && empResult.data) {
        if (Array.isArray(empResult.data)) {
          employeesData = empResult.data;
        } else if (Array.isArray(empResult)) {
          employeesData = empResult;
        }
      } else if (Array.isArray(empResult)) {
        employeesData = empResult;
      }
      setEmployees(employeesData);
    } catch (error) {
      console.error('加载员工数据失败:', error);
      setEmployees([]);
    }
  };

  // 加载库存商品数据
  const loadInventoryItems = async () => {
    try {
      const result = await inventory.getAll(1, 100);
      let inventoryData = [];
      if (result && result.data) {
        if (Array.isArray(result.data)) {
          inventoryData = result.data;
        } else if (Array.isArray(result)) {
          inventoryData = result;
        }
      } else if (Array.isArray(result)) {
        inventoryData = result;
      }
      // 过滤掉库存为0的商品（可选）
      // inventoryData = inventoryData.filter(item => item.quantity > 0);
      setInventoryItems(inventoryData);
    } catch (error) {
      console.error('加载库存商品失败:', error);
      setInventoryItems([]);
    }
  };

  // 加载订单数据
  const loadOrders = async () => {
    setLoading(true);
    try {
      const result = await order.getAll(1, 100, searchTerm, statusFilter);
      console.log('API返回的订单数据:', result || []);
      // 格式化数据 - 注意：apiService已经返回了data.data部分
      const formattedOrders = (result || []).map(o => ({
        id: o.id,
        employeeId: o.employee_id,
        employeeName: o.employee_name,
        customerName: o.customer_name,
        customerContact: o.customer_contact,
        amount: o.amount,
        status: o.status,
        // items可能已经是解析后的对象，也可能需要JSON.parse
        items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []),
        // 处理created_at可能是ISO格式或其他格式
        createdAt: typeof o.created_at === 'string' ? 
          (o.created_at.includes('T') ? o.created_at.split('T')[0] : o.created_at.split(' ')[0]) : 
          new Date().toISOString().split('T')[0],
        department: o.department
      }));
      setOrders(formattedOrders);
    } catch (error) {
      console.error('加载订单数据失败:', error);
      toast.error('加载订单数据失败，请稍后重试');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    loadEmployees();
    loadInventoryItems(); // 加载库存商品
  }, [isConnected, searchTerm, statusFilter]);

  // 过滤订单
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // 分页
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  // 处理查看订单详情
  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  // 处理退款
  const handleRefund = async (orderId: string) => {
    if (window.confirm('确定要将此订单标记为退款吗？这将影响对应员工的业绩。')) {
      try {
        console.log('开始处理订单退款:', orderId);
        const result = await order.updateStatus(orderId, 'refunded');
        console.log('退款API返回结果:', result);
        await loadOrders(); // 重新加载订单列表
        toast.success('订单已标记为退款');
      } catch (error: any) {
        console.error('处理退款失败:', error.message || error);
        // 显示更具体的错误信息给用户
        toast.error(error.message?.includes('商品') ? '退款失败：商品信息异常，请联系管理员' : '处理退款失败，请稍后重试');
      }
    }
  };

  // 处理撤销退款
  const handleUndoRefund = async (orderId: string) => {
    if (window.confirm('确定要撤销此订单的退款状态吗？')) {
      try {
        console.log('开始撤销订单退款:', orderId);
        const result = await order.updateStatus(orderId, 'completed');
        console.log('撤销退款API返回结果:', result);
        await loadOrders(); // 重新加载订单列表
        toast.success('已撤销退款状态');
      } catch (error: any) {
        console.error('撤销退款失败:', error.message || error);
        toast.error('撤销退款失败，请稍后重试');
      }
    }
  };

  // 处理删除订单
  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('确定要删除此订单吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      await order.delete(orderId);
      toast.success('订单删除成功');
      await loadOrders();
    } catch (error) {
      console.error('删除订单失败:', error);
      toast.error('删除订单失败，请稍后重试');
    }
  };

  // 处理打开新建订单模态框
  const handleAddOrder = () => {
    setEditingOrder(null);
    setAddOrderForm({
      orderId: '',
      employeeId: 0,
      customerName: '',
      customerContact: '',
      items: [{ id: Date.now().toString(), name: '', quantity: 1, price: 0 }]
    });
    setIsAddModalOpen(true);
  };

  // 处理编辑订单
  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setAddOrderForm({
      orderId: order.id,
      employeeId: order.employeeId,
      customerName: order.customerName,
      customerContact: order.customerContact,
      items: order.items.map(item => ({ ...item, isGift: item.isGift || false }))
    });
    setIsAddModalOpen(true);
  };

  // 添加订单表单状态
  const [addOrderForm, setAddOrderForm] = useState({
    orderId: '',
    employeeId: 0,
    customerName: '',
    customerContact: '',
    items: [{ id: Date.now().toString(), name: '', quantity: 1, price: 0, isGift: false }]
  });

  // 更新表单字段
  const updateFormField = (field: string, value: any) => {
    setAddOrderForm(prev => ({ ...prev, [field]: value }));
  };

  // 更新订单项
  const updateOrderItem = (index: number, field: string, value: any) => {
    const newItems = [...addOrderForm.items];
    
    // 如果选择了商品，自动填充价格等信息
    if (field === 'productId' && value) {
      const selectedInventoryItem = inventoryItems.find(item => item.id === value);
      if (selectedInventoryItem) {
        newItems[index] = {
          ...newItems[index],
          // 不要覆盖productId，而是确保它是正确的库存商品ID
          productId: value,
          name: selectedInventoryItem.name,
          price: selectedInventoryItem.price || 0,
          quantity: newItems[index].quantity || 1 // 保持原有数量或默认为1
        };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    
    setAddOrderForm(prev => ({ ...prev, items: newItems }));
  };

  // 添加订单项
  const addOrderItem = () => {
    setAddOrderForm(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now().toString(), name: '', quantity: 1, price: 0, isGift: false }]
    }));
  };

  // 删除订单项
  const removeOrderItem = (index: number) => {
    if (addOrderForm.items.length > 1) {
      const newItems = addOrderForm.items.filter((_, i) => i !== index);
      setAddOrderForm(prev => ({ ...prev, items: newItems }));
    } else {
      toast.error('订单至少需要包含一个商品');
    }
  };

  // 计算订单总价 - 排除赠品金额
  const calculateTotal = () => {
    return addOrderForm.items.reduce((total, item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      // 如果是赠品，则不计入总价
      if (item.isGift) {
        return total;
      }
      return total + (quantity * price);
    }, 0);
  };

  // 提交订单
  const handleSubmitOrder = async () => {
    // 表单验证
    if (!addOrderForm.employeeId || addOrderForm.employeeId === 0) {
      toast.error('请选择销售人员');
      return;
    }
    
    if (!addOrderForm.customerName.trim()) {
      toast.error('请输入客户名称');
      return;
    }
    
    if (!addOrderForm.customerContact.trim()) {
      toast.error('请输入客户联系方式');
      return;
    }
    
    // 验证订单号
    if (!addOrderForm.orderId.trim()) {
      toast.error('请输入订单号');
      return;
    }
    
    // 验证商品项
    if (addOrderForm.items.some(item => !item.name.trim() || Number(item.quantity) <= 0 || (!item.isGift && Number(item.price) <= 0))) {
      toast.error('请完善商品信息，数量必须大于0，非赠品的价格必须大于0');
      return;
    }
    
    try {
      // 计算总价 - 排除赠品金额
    const totalAmount = addOrderForm.items.reduce((sum, item) => {
      // 如果是赠品，则不计入总价
      if (item.isGift) {
        return sum;
      }
      return sum + Number(item.quantity) * Number(item.price);
    }, 0);
      
      // 准备订单数据，确保每个订单项都有正确的productId字段
      const orderData = {
        orderId: addOrderForm.orderId.trim(),
        employeeId: addOrderForm.employeeId,
        customerName: addOrderForm.customerName.trim(),
        customerContact: addOrderForm.customerContact.trim(),
        amount: totalAmount,
        items: addOrderForm.items.map(item => ({
          ...item,
          // 优先使用专门设置的productId，如果没有则使用id
          productId: item.productId || item.id,
          quantity: Number(item.quantity) || 0,
          price: Number(item.price) || 0
        }))
      };
      console.log('提交的订单数据:', orderData);
      
      if (editingOrder) {
        // 更新现有订单
        await order.update(editingOrder.id, orderData);
        toast.success('订单更新成功');
      } else {
        // 创建新订单
        await order.create({ ...orderData, status: 'completed' });
        toast.success('订单创建成功');
      }
      
      setIsAddModalOpen(false);
      await loadOrders(); // 重新加载订单列表
      setEditingOrder(null);
    } catch (error) {
      console.error(editingOrder ? '更新订单失败:' : '创建订单失败:', error);
      toast.error(editingOrder ? '更新订单失败，请稍后重试' : '创建订单失败，请稍后重试');
    }
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

  // 计算统计数据
  const totalOrders = orders.length;
  const completedOrders = orders.filter(order => order.status === 'completed').length;
  const refundedOrders = orders.filter(order => order.status === 'refunded').length;
  // 确保将金额转换为数字进行计算
  const totalSalesAmount = orders
    .filter(order => order.status === 'completed')
    .reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const totalRefundAmount = orders
    .filter(order => order.status === 'refunded')
    .reduce((sum, order) => sum + Number(order.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold">订单管理</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddOrder}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <i className="fa-solid fa-plus"></i>
            <span>新建订单</span>
          </motion.button>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="搜索订单号/客户/员工..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // 重置到第一页
              }}
              className={`pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              }`}
            />
            <i className="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          </div>
        </div>
      </div>

      {/* 订单统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`rounded-xl p-5 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">总订单数</p>
              <h3 className="text-2xl font-bold mt-1">{totalOrders}</h3>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400">
              <i className="fa-solid fa-shopping-cart"></i>
            </div>
          </div>
        </div>
        
        <div className={`rounded-xl p-5 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">已完成订单</p>
              <h3 className="text-2xl font-bold mt-1">{completedOrders}</h3>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10 text-green-500 dark:bg-green-500/20 dark:text-green-400">
              <i className="fa-solid fa-check-circle"></i>
            </div>
          </div>
        </div>
        
        <div className={`rounded-xl p-5 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">已退款订单</p>
              <h3 className="text-2xl font-bold mt-1">{refundedOrders}</h3>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400">
              <i className="fa-solid fa-undo-alt"></i>
            </div>
          </div>
        </div>
        
        <div className={`rounded-xl p-5 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">销售净额</p>
  <h3 className="text-2xl font-bold mt-1">¥{new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalSalesAmount)}</h3>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400">
              <i className="fa-solid fa-rmb"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 订单列表 */}
      <div className={`rounded-xl overflow-hidden border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex justify-between items-center px-6 py-3 border-b" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
          <h3 className="font-medium">订单列表</h3>
          <div className="flex items-center">
            <label className={`text-sm mr-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              状态:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1); // 重置到第一页
              }}
              className={`text-sm px-3 py-1.5 border rounded-md focus:outline-none ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">全部</option>
              <option value="completed">已完成</option>
              <option value="refunded">已退款</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">订单号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">客户名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">所属员工</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">部门</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">金额</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">创建日期</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {currentOrders.map((order) => (
                <tr key={order.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{order.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{order.customerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{order.employeeName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{order.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    ¥{order.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {order.status === 'completed' ? '已完成' : '已退款'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{order.createdAt}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetail(order)}
                        className={`p-1.5 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-blue-400' : 'hover:bg-gray-100 text-blue-600'}`}
                        aria-label="查看详情"
                      >
                        <i className="fa-solid fa-eye"></i>
                      </button>
                      <button
                        onClick={() => handleEditOrder(order)}
                        className={`p-1.5 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-yellow-600'}`}
                        aria-label="编辑订单"
                      >
                        <i className="fa-solid fa-edit"></i>
                      </button>
                      {order.status === 'completed' ? (
                        <button
                          onClick={() => handleRefund(order.id)}
                          className={`p-1.5 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'}`}
                          aria-label="标记退款"
                        >
                          <i className="fa-solid fa-undo-alt"></i>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUndoRefund(order.id)}
                          className={`p-1.5 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-green-400' : 'hover:bg-gray-100 text-green-600'}`}
                          aria-label="撤销退款"
                        >
                          <i className="fa-solid fa-redo-alt"></i>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className={`p-1.5 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-red-500' : 'hover:bg-gray-100 text-red-700'}`}
                        aria-label="删除订单"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          显示 {(currentPage - 1) * itemsPerPage + 1} 到 {Math.min(currentPage * itemsPerPage, filteredOrders.length)} 条，共 {filteredOrders.length} 条
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-md text-sm ${
              currentPage === 1
                ? `${theme === 'dark' ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'} cursor-not-allowed`
                : `${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} hover:text-blue-600 dark:hover:text-blue-400`
            }`}
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1 rounded-md text-sm ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white'
                    : `${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} hover:text-blue-600 dark:hover:text-blue-400`
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-md text-sm ${
              currentPage === totalPages
                ? `${theme === 'dark' ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'} cursor-not-allowed`
                : `${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} hover:text-blue-600 dark:hover:text-blue-400`
            }`}
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>

      {/* 订单详情模态框 */}
      {isDetailModalOpen && selectedOrder && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">订单详情</h3>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className={`p-1 rounded-full ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  aria-label="关闭"
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    订单信息
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>订单号:</span>
                      <span className="text-sm font-medium">{selectedOrder.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>创建日期:</span>
                      <span className="text-sm">{selectedOrder.createdAt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>状态:</span>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        selectedOrder.status === 'completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {selectedOrder.status === 'completed' ? '已完成' : '已退款'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    客户信息
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>客户名称:</span>
                      <span className="text-sm font-medium">{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>联系方式:</span>
                      <span className="text-sm">{selectedOrder.customerContact}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    销售信息
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>销售员工:</span>
                      <span className="text-sm font-medium">{selectedOrder.employeeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>所属部门:</span>
                      <span className="text-sm">{selectedOrder.department}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    金额信息
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>订单金额:</span>
                      <span className="text-sm font-medium">¥{selectedOrder.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>支付状态:</span>
                      <span className="text-sm">已支付</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  产品明细
                </h4>
                <div className={`rounded-lg overflow-hidden border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">产品名称</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">数量</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">单价</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">赠品</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">小计</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedOrder.items.map((item) => (
                        <tr key={item.id} className={item.isGift ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}>
                          <td className="px-4 py-3 text-sm">{item.name}</td>
                          <td className="px-4 py-3 text-sm">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm">{item.isGift ? '赠品' : `¥${item.price.toLocaleString()}`}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            {item.isGift ? (
                              <span className="text-green-600 dark:text-green-400 font-medium">✓</span>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {item.isGift ? '赠品' : `¥${(item.quantity * item.price).toLocaleString()}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className={`px-4 py-2 rounded-lg ${
                    theme === 'dark' 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  } transition-colors`}
                >
                  关闭
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 新建订单模态框 */}
      {isAddModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">{editingOrder ? '编辑订单' : '新建订单'}</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className={`p-1 rounded-full ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  aria-label="关闭"
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    订单号 *
                  </label>
                  <input
                    type="text"
                    value={addOrderForm.orderId}
                    onChange={(e) => updateFormField('orderId', e.target.value)}
                    placeholder="请输入订单号"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-all ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    销售人员 *
                  </label>
                  <select
                    value={addOrderForm.employeeId}
                    onChange={(e) => updateFormField('employeeId', Number(e.target.value))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                  >
                    <option value={0}>请选择销售人员</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    客户名称 *
                  </label>
                  <input
                    type="text"
                    value={addOrderForm.customerName}
                    onChange={(e) => updateFormField('customerName', e.target.value)}
                    placeholder="请输入客户名称"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    客户联系方式 *
                  </label>
                  <input
                    type="text"
                    value={addOrderForm.customerContact}
                    onChange={(e) => updateFormField('customerContact', e.target.value)}
                    placeholder="请输入客户联系方式"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    商品明细 *
                  </label>
                  <button
                    onClick={addOrderItem}
                    className={`text-sm flex items-center gap-1 ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    <i className="fa-solid fa-plus"></i>
                    <span>添加商品</span>
                  </button>
                </div>
                
                <div className={`rounded-lg overflow-hidden border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">产品名称</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">库存</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">数量</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">单价</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">赠品</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">小计</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {addOrderForm.items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {/* 库存商品选择下拉框 */}
                              <select
                                value={item.productId || ''}
                                onChange={(e) => updateOrderItem(index, 'productId', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:outline-none ${
                                  theme === 'dark' 
                                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                }`}
                              >
                                <option value="">选择商品...</option>
                                {inventoryItems.map(inventoryItem => (
                                  <option key={inventoryItem.id} value={inventoryItem.id}>
                                    {inventoryItem.name}
                                  </option>
                                ))}
                              </select>
                              {/* 可选：允许手动输入产品名称（作为备选） */}
                              {!item.productId && (
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => updateOrderItem(index, 'name', e.target.value)}
                                  placeholder="或手动输入产品名称"
                                  className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:outline-none ${
                                    theme === 'dark' 
                                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                  }`}
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {/* 显示选中商品的当前库存 */}
                            {item.productId && (
                              <div className="text-sm">
                                库存: {inventoryItems.find(i => i.id === item.productId)?.quantity || 0}
                                {Number(inventoryItems.find(i => i.id === item.productId)?.quantity || 0) < Number(item.quantity) && (
                                  <span className="text-red-500 ml-1">⚠️</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateOrderItem(index, 'quantity', e.target.value)}
                              min="1"
                              className={`w-20 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:outline-none ${
                                theme === 'dark' 
                                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                              }`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.isGift ? 0 : item.price}
                              onChange={(e) => updateOrderItem(index, 'price', e.target.value)}
                              min="0"
                              step="0.01"
                              disabled={item.isGift}
                              placeholder={item.isGift ? '赠品' : '单价'}
                              className={`w-24 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:outline-none ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <label className="flex items-center justify-center space-x-2">
                              <input
                                type="checkbox"
                                checked={item.isGift || false}
                                onChange={(e) => updateOrderItem(index, 'isGift', e.target.checked)}
                                className="h-4 w-4 text-blue-600 dark:text-blue-400"
                              />
                              <span className="text-xs">是</span>
                            </label>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {item.isGift ? '赠品' : `¥${(Number(item.quantity) * Number(item.price)).toFixed(2)}`}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removeOrderItem(index)}
                              className={`p-1.5 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'}`}
                              aria-label="删除商品"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} font-medium`}>
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right text-sm">总计：</td>
                        <td className="px-4 py-3 text-sm font-bold">¥{calculateTotal().toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
                >
                  取消
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmitOrder}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingOrder ? '保存修改' : '创建订单'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}