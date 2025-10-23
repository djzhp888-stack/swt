import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { useDB } from '@/contexts/dbContext';

// 库存商品数据类型
interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  cost: number;
  quantity: number;
  unit: string;
  threshold: number;
  createdAt: string;
  updatedAt: string;
  isLowStock?: boolean;
}

// 库存记录数据类型
interface StockHistory {
  id: string;
  productId: string;
  productName: string;
  changeAmount: number;
  previousQuantity: number;
  currentQuantity: number;
  reason: string;
  operator: string;
  createdAt: string;
}

export default function InventoryManagement() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [stockChangeAmount, setStockChangeAmount] = useState('');
  const [stockChangeReason, setStockChangeReason] = useState('');
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  
  const { theme } = useTheme();
  const { inventory: inventoryAPI, isConnected } = useDB();
  const itemsPerPage = 10;

  // 预设品牌列表
  const brands = ['cuppa', '奥秘', '南匠', '天工', '莱利', '皮尔力', '松力道', '兵甲', '威利', '库洛克', 'JFLOWERS', '蓝蔻', '戈力'];
  
  // 预设分类列表
  const categories = ['台球杆', '配件'];
  
  // 添加/编辑库存商品表单
  const [addInventoryForm, setAddInventoryForm] = useState({
    name: '',
    description: '',
    category: '',
    brand: '',
    price: 0,
    cost: 0,
    quantity: 0,
    unit: '',
    threshold: 10
  });

  // 加载库存数据
  const loadInventory = async () => {
    if (!isConnected || !inventoryAPI || typeof inventoryAPI.getAll !== 'function') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await inventoryAPI.getAll(currentPage, itemsPerPage, searchTerm);
      // 适配后端返回的数据格式
      const inventoryData = result.data || result; // 尝试直接使用result（如果data不存在）
      // 确保所有数字字段都是数字类型
      const normalizedData = Array.isArray(inventoryData) ? inventoryData.map(item => ({
        ...item,
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
        cost: typeof item.cost === 'number' ? item.cost : parseFloat(item.cost) || 0,
        quantity: typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0,
        threshold: typeof item.threshold === 'number' ? item.threshold : parseInt(item.threshold) || 10
      })) : [];
      setInventory(normalizedData);
    } catch (error) {
      console.error('加载库存数据失败:', error);
      toast.error('加载库存数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 加载低库存商品
  const loadLowStockItems = async () => {
    // 立即从本地数据筛选低库存商品，确保用户能看到数据
    const filterLowStockItems = (items: InventoryItem[]) => {
      try {
        return items.filter(item => {
          const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
          const threshold = typeof item.threshold === 'number' ? item.threshold : parseInt(item.threshold) || 10;
          // 确保库存为0的商品总是被包含在低库存列表中
          return quantity <= threshold || quantity === 0;
        }).map(item => ({
          ...item,
          price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
          cost: typeof item.cost === 'number' ? item.cost : parseFloat(item.cost) || 0,
          quantity: typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0,
          threshold: typeof item.threshold === 'number' ? item.threshold : parseInt(item.threshold) || 10
        }));
      } catch (filterError) {
        console.error('筛选低库存商品时出错:', filterError);
        return [];
      }
    };

    // 优先使用本地数据
    const localLowStockItems = filterLowStockItems(inventory);
    setLowStockItems(localLowStockItems);
    console.log('已显示本地低库存商品数据，包括库存为0的商品');

    // 尝试从API获取数据，但不影响用户体验
    try {
      const token = localStorage.getItem('authToken');
      if (token && isConnected) {
        try {
          // 使用正确的API调用方式，确保与后端路由匹配
          const threshold = 10; // 默认阈值为10
          // 直接使用fetch调用，确保正确的URL路径
          const response = await fetch(`/api/inventory/low-stock?threshold=${threshold}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.data && Array.isArray(data.data)) {
              const normalizedData = data.data.map((item: any) => ({
                ...item,
                price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
                cost: typeof item.cost === 'number' ? item.cost : parseFloat(item.cost) || 0,
                quantity: typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0,
                threshold: typeof item.threshold === 'number' ? item.threshold : parseInt(item.threshold) || 10
              }));
              setLowStockItems(normalizedData);
              console.log('从API成功加载低库存商品数据');
            }
          }
        } catch (apiError) {
          // 静默处理API错误，保持使用本地数据
          console.warn('API调用失败，但已使用本地数据作为后备:', apiError);
          // 只在初始化时显示一次提示，避免频繁提示
          if (inventory.length > 0 && lowStockItems.length === 0) {
            toast.info('已从本地数据中显示低库存商品（包括库存为0的商品）');
          }
        }
      }
    } catch (error) {
      console.error('加载低库存商品过程中发生错误:', error);
    }
  };

  // 加载库存历史记录
  const loadStockHistory = async (productId: string) => {
    if (!isConnected || !inventoryAPI || typeof inventoryAPI.getStockHistory !== 'function' || !productId) return;

    try {
      const result = await inventoryAPI.getStockHistory(productId);
      // 适配后端返回的数据格式
      const historyData = result.data || result; // 尝试直接使用result（如果data不存在）
      setStockHistory(Array.isArray(historyData) ? historyData : []);
    } catch (error) {
      console.error('加载库存历史记录失败:', error);
      toast.error('加载库存历史记录失败，请稍后重试');
    }
  };

  useEffect(() => {
    loadInventory();
    loadLowStockItems();
  }, [currentPage, searchTerm, isConnected]);

  // 处理查看商品详情
  const handleViewDetail = async (item: InventoryItem) => {
    if (!item || !item.id) return;
    
    setSelectedItem(item);
    setIsDetailModalOpen(true);
    await loadStockHistory(item.id);
  };

  // 处理打开新建商品模态框
  const handleAddInventory = () => {
    setEditingItem(null);
    setAddInventoryForm({
      name: '',
      description: '',
      category: '',
      price: 0,
      cost: 0,
      quantity: 0,
      unit: '',
      threshold: 10
    });
    setIsAddModalOpen(true);
  };

  // 处理编辑商品
  const handleEditInventory = (item: InventoryItem) => {
    setEditingItem(item);
    setAddInventoryForm({
      name: item.name,
      description: item.description || '',
      category: item.category || '',
      price: item.price,
      cost: item.cost || 0,
      quantity: item.quantity,
      unit: item.unit || '',
      threshold: item.threshold || 10
    });
    setIsAddModalOpen(true);
  };

  // 处理删除商品
  const handleDeleteInventory = async (id: string) => {
    if (!window.confirm('确定要删除此商品吗？此操作不可撤销。')) {
      return;
    }
    
    if (!isConnected || !inventoryAPI || typeof inventoryAPI.delete !== 'function' || !id) {
      toast.error('系统未准备好，请稍后重试');
      return;
    }
    
    try {
      await inventoryAPI.delete(id);
      toast.success('商品删除成功');
      await loadInventory();
    } catch (error) {
      console.error('删除商品失败:', error);
      toast.error('删除商品失败，请稍后重试');
    }
  };

  // 处理打开库存调整模态框
  const handleOpenStockModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setStockChangeAmount('');
    setStockChangeReason('');
    setIsStockModalOpen(true);
  };

  // 处理库存调整
  const handleStockAdjustment = async () => {
    if (!selectedItem || !selectedItem.id) return;
    
    if (!isConnected || !inventoryAPI || typeof inventoryAPI.updateStock !== 'function') {
      toast.error('系统未准备好，请稍后重试');
      return;
    }
    
    const changeAmount = parseInt(stockChangeAmount);
    if (isNaN(changeAmount)) {
      toast.error('请输入有效的调整数量');
      return;
    }
    
    if (!stockChangeReason.trim()) {
      toast.error('请输入调整原因');
      return;
    }
    
    try {
      const newQuantity = selectedItem.quantity + changeAmount;
      if (newQuantity < 0) {
        toast.error('调整后的库存数量不能为负数');
        return;
      }
      
      await inventoryAPI.updateStock(selectedItem.id, newQuantity);
      toast.success('库存调整成功');
      setIsStockModalOpen(false);
      await loadInventory();
      if (selectedItem.id === (selectedItem?.id)) {
        await loadStockHistory(selectedItem.id);
      }
    } catch (error) {
      console.error('库存调整失败:', error);
      toast.error('库存调整失败，请稍后重试');
    }
  };

  // 提交商品表单
  const handleSubmitInventory = async () => {
    if (!isConnected || !inventoryAPI) {
      toast.error('系统未准备好，请稍后重试');
      return;
    }
    
    // 表单验证
    if (!addInventoryForm.name.trim()) {
      toast.error('请输入商品名称');
      return;
    }
    
    if (addInventoryForm.price < 0 || addInventoryForm.cost < 0) {
      toast.error('价格和成本不能为负数');
      return;
    }
    
    if (addInventoryForm.quantity < 0) {
      toast.error('库存数量不能为负数');
      return;
    }
    
    if (addInventoryForm.threshold < 0) {
      toast.error('库存预警值不能为负数');
      return;
    }
    
    try {
      if (editingItem && editingItem.id && typeof inventoryAPI.update === 'function') {
        // 编辑现有商品
        await inventoryAPI.update(editingItem.id, addInventoryForm);
        toast.success('商品更新成功');
      } else if (!editingItem && typeof inventoryAPI.create === 'function') {
        // 创建新商品
        await inventoryAPI.create(addInventoryForm);
        toast.success('商品创建成功');
      } else {
        toast.error('操作功能不可用');
        return;
      }
      
      setIsAddModalOpen(false);
      await loadInventory();
    } catch (error) {
      console.error('保存商品失败:', error);
      toast.error('保存商品失败，请稍后重试');
    }
  };

  // 计算总库存价值
  const calculateTotalValue = () => {
    return inventory.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  // 计算总成本
  const calculateTotalCost = () => {
    return inventory.reduce((total, item) => {
      return total + ((item.cost || 0) * item.quantity);
    }, 0);
  };

  // 计算总利润潜力
  const calculateTotalProfit = () => {
    return calculateTotalValue() - calculateTotalCost();
  };

  // 筛选库存商品
  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 分页
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredInventory.slice(startIndex, endIndex);

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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold">库存管理</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddInventory}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <i className="fa-solid fa-plus"></i>
            <span>新增商品</span>
          </motion.button>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="搜索商品名称/描述/分类..."
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

      {/* 库存统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`rounded-xl p-5 border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">商品总数</p>
              <h3 className="text-2xl font-bold mt-1">{inventory.length}</h3>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400">
              <i className="fa-solid fa-boxes"></i>
            </div>
          </div>
        </div>
        
        <div className={`rounded-xl p-5 border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">低库存商品</p>
              <h3 className="text-2xl font-bold mt-1" style={{ color: lowStockItems.length > 0 ? '#ef4444' : '' }}>
                {lowStockItems.length}
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400">
              <i className="fa-solid fa-exclamation-triangle"></i>
            </div>
          </div>
        </div>
        
        <div className={`rounded-xl p-5 border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">库存总值</p>
              <h3 className="text-2xl font-bold mt-1">¥{new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(calculateTotalValue())}</h3>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10 text-green-500 dark:bg-green-500/20 dark:text-green-400">
              <i className="fa-solid fa-rmb"></i>
            </div>
          </div>
        </div>
        
        <div className={`rounded-xl p-5 border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">利润潜力</p>
              <h3 className="text-2xl font-bold mt-1">¥{new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(calculateTotalProfit())}</h3>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400">
              <i className="fa-solid fa-chart-line"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 库存列表 */}
      <div className={`rounded-xl overflow-hidden border ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex justify-between items-center px-6 py-3 border-b" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
          <h3 className="font-medium">库存列表</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">商品名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">分类</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">单价</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">库存</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">单位</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">预警值</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {currentItems.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  item.quantity <= item.threshold ? (theme === 'dark' ? 'bg-red-900/10' : 'bg-red-50') : ''
                }`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.category || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">¥{typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{
                    color: item.quantity <= item.threshold ? '#ef4444' : (item.quantity <= item.threshold * 1.5 ? '#f59e0b' : '')
                  }}>
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.unit || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.threshold}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetail(item)}
                        className={`p-1.5 rounded-md ${
                          theme === 'dark' ? 'hover:bg-gray-700 text-blue-400' : 'hover:bg-gray-100 text-blue-600'
                        }`}
                        aria-label="查看详情"
                      >
                        <i className="fa-solid fa-eye"></i>
                      </button>
                      <button
                        onClick={() => handleEditInventory(item)}
                        className={`p-1.5 rounded-md ${
                          theme === 'dark' ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-yellow-600'
                        }`}
                        aria-label="编辑商品"
                      >
                        <i className="fa-solid fa-edit"></i>
                      </button>
                      <button
                        onClick={() => handleOpenStockModal(item)}
                        className={`p-1.5 rounded-md ${
                          theme === 'dark' ? 'hover:bg-gray-700 text-green-400' : 'hover:bg-gray-100 text-green-600'
                        }`}
                        aria-label="调整库存"
                      >
                        <i className="fa-solid fa-sync-alt"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteInventory(item.id)}
                        className={`p-1.5 rounded-md ${
                          theme === 'dark' ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'
                        }`}
                        aria-label="删除商品"
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
        
        {/* 分页控制 */}
        <div className="px-6 py-4 border-t" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              显示 {(currentPage - 1) * itemsPerPage + 1} 到 {Math.min(currentPage * itemsPerPage, filteredInventory.length)} 条，共 {filteredInventory.length} 条
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded border ${theme === 'dark' 
                  ? currentPage === 1 
                    ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  : currentPage === 1
                    ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded border ${theme === 'dark'
                    ? page === currentPage
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    : page === currentPage
                      ? 'bg-blue-500 border-blue-400 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded border ${theme === 'dark' 
                  ? currentPage === totalPages 
                    ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  : currentPage === totalPages
                    ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 商品详情模态框 */}
      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-3xl rounded-xl overflow-hidden border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
              <h3 className="font-medium text-lg">商品详情</h3>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className={`p-1.5 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">商品名称</p>
                  <h4 className="text-lg font-medium mt-1">{selectedItem.name}</h4>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">分类</p>
                  <p className="mt-1">{selectedItem.category || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">单价</p>
                  <p className="mt-1 font-medium">¥{typeof selectedItem.price === 'number' ? selectedItem.price.toFixed(2) : '0.00'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">成本</p>
                  <p className="mt-1">¥{typeof selectedItem.cost === 'number' ? selectedItem.cost.toFixed(2) : '0.00'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">当前库存</p>
                  <p className="mt-1 font-medium" style={{
                    color: selectedItem.quantity <= selectedItem.threshold ? '#ef4444' : ''
                  }}>
                    {selectedItem.quantity} {selectedItem.unit || ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">库存预警值</p>
                  <p className="mt-1">{selectedItem.threshold}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">商品描述</p>
                <p className="mt-1">{selectedItem.description || '-'}</p>
              </div>
            </div>
            
            {/* 库存历史记录 */}
            <div className="px-6 py-4 border-t" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
              <h4 className="font-medium mb-3">库存历史记录</h4>
              <div className={`rounded-lg overflow-hidden border ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">调整数量</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">调整后数量</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">原因</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作人</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {stockHistory.length > 0 ? (
                      stockHistory.map((record) => (
                        <tr key={record.id}>
                          <td className={`px-4 py-3 text-sm ${
                            record.changeAmount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {record.changeAmount > 0 ? '+' : ''}{record.changeAmount}
                          </td>
                          <td className="px-4 py-3 text-sm">{record.currentQuantity}</td>
                          <td className="px-4 py-3 text-sm">{record.reason}</td>
                          <td className="px-4 py-3 text-sm">{record.operator}</td>
                          <td className="px-4 py-3 text-sm">
                            {(() => {
                              const dateValue = record.createdAt || record.created_at;
                              if (!dateValue) return '--';
                              
                              try {
                                const date = new Date(dateValue);
                                if (isNaN(date.getTime())) {
                                  return '--';
                                }
                                return date.toLocaleString('zh-CN');
                              } catch (e) {
                                return '--';
                              }
                            })()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                          暂无库存历史记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑商品模态框 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-2xl rounded-xl overflow-hidden border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
              <h3 className="font-medium text-lg">{editingItem ? '编辑商品' : '新增商品'}</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className={`p-1.5 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>商品名称 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={addInventoryForm.name}
                    onChange={(e) => setAddInventoryForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="请输入商品名称"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:outline-none ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>分类</label>
                  <select
                    value={addInventoryForm.category}
                    onChange={(e) => setAddInventoryForm(prev => ({ ...prev, category: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:outline-none ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}`}
                  >
                    <option value="">请选择商品分类</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>品牌</label>
                  <select
                    value={addInventoryForm.brand}
                    onChange={(e) => setAddInventoryForm(prev => ({ ...prev, brand: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:outline-none ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}`}
                  >
                    <option value="">请选择品牌</option>
                    {brands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>单价 <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={addInventoryForm.price}
                    onChange={(e) => setAddInventoryForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                    placeholder="请输入商品单价"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:outline-none ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>成本</label>
                  <input
                    type="number"
                    value={addInventoryForm.cost}
                    onChange={(e) => setAddInventoryForm(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                    placeholder="请输入商品成本"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:outline-none ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>库存数量 <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={addInventoryForm.quantity}
                    onChange={(e) => setAddInventoryForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    min="0"
                    placeholder="请输入库存数量"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:outline-none ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>单位</label>
                  <input
                    type="text"
                    value={addInventoryForm.unit}
                    onChange={(e) => setAddInventoryForm(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="如：个、件、箱等"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:outline-none ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>库存预警值 <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={addInventoryForm.threshold}
                    onChange={(e) => setAddInventoryForm(prev => ({ ...prev, threshold: parseInt(e.target.value) || 0 }))}
                    min="0"
                    placeholder="当库存低于此值时将显示预警"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:outline-none ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>商品描述</label>
                  <textarea
                    value={addInventoryForm.description}
                    onChange={(e) => setAddInventoryForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="请输入商品描述"
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:outline-none ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                取消
              </button>
              <button
                onClick={handleSubmitInventory}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                {editingItem ? '保存修改' : '创建商品'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 库存调整模态框 */}
      {isStockModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl overflow-hidden border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
              <h3 className="font-medium text-lg">调整库存</h3>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className={`p-1.5 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">商品名称</p>
                <p className="mt-1 font-medium">{selectedItem.name}</p>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">当前库存</p>
                <p className="mt-1 font-medium">{selectedItem.quantity} {selectedItem.unit || ''}</p>
              </div>
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>调整数量 <span className="text-red-500">*</span></label>
                <div className="flex items-center">
                  <span className={`inline-flex items-center justify-center w-10 h-10 border-r ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-300' : 'border-gray-300 bg-gray-50 text-gray-700'}`}>数量</span>
                  <input
                    type="number"
                    value={stockChangeAmount}
                    onChange={(e) => setStockChangeAmount(e.target.value)}
                    placeholder="输入调整数量（正数增加，负数减少）"
                    className={`w-full px-3 py-2 border rounded-r-md text-sm focus:ring-2 focus:outline-none ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">正数表示增加库存，负数表示减少库存</p>
              </div>
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>调整原因 <span className="text-red-500">*</span></label>
                <textarea
                  value={stockChangeReason}
                  onChange={(e) => setStockChangeReason(e.target.value)}
                  placeholder="请输入库存调整原因"
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:outline-none ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  }`}
                />
              </div>
              {stockChangeAmount && !isNaN(parseInt(stockChangeAmount)) && (
                <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm">
                    调整后库存: <span className="font-medium">
                      {selectedItem.quantity + parseInt(stockChangeAmount)}
                    </span> {selectedItem.unit || ''}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                取消
              </button>
              <button
                onClick={handleStockAdjustment}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
              >
                确认调整
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}