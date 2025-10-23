import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { useDB } from '@/contexts/dbContext.tsx';

  // 员工数据类型
  interface Employee {
    id: number;
    name: string;
    username: string;
    department: string;
    role: 'admin' | 'sales';
    isActive: boolean;
    createdAt: string;
  }

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    department: '',
    role: 'sales' as 'admin' | 'sales',
    isActive: true,
  });
  
  const { theme } = useTheme();
  const itemsPerPage = 10;
  const { employee, isConnected } = useDB();

  // 加载员工数据
  const loadEmployees = async () => {
    setLoading(true);
    try {
      console.log('开始加载员工数据...');
      const result = await employee.getAll(1, 100); // 获取所有员工数据
      console.log('API返回原始数据:', result);
      
      // 修复数据格式处理
      let employeesData = [];
      if (result && result.data) {
        // 检查result.data是否是数组
        if (Array.isArray(result.data)) {
          employeesData = result.data;
        } else if (Array.isArray(result)) {
          // 如果result本身就是数组（某些API可能直接返回数据数组）
          employeesData = result;
        }
      } else if (Array.isArray(result)) {
        // 兼容直接返回数组的情况
        employeesData = result;
      }
      
      console.log('处理前的员工数据:', employeesData);
      
      // 格式化数据
      const formattedEmployees = employeesData.map((emp: any) => ({
        id: emp.id,
        name: emp.name,
        username: emp.username,
        department: emp.department,
        role: emp.role,
        isActive: emp.is_active,
        createdAt: emp.created_at ? (typeof emp.created_at === 'string' ? emp.created_at.split('T')[0] || emp.created_at.split(' ')[0] : new Date(emp.created_at).toLocaleDateString()) : ''
      }));
      
      console.log('格式化后的员工数据:', formattedEmployees);
      setEmployees(formattedEmployees);
      toast.success(`成功加载 ${formattedEmployees.length} 名员工数据`);
    } catch (error) {
      console.error('加载员工数据失败:', error);
      toast.error('加载员工数据失败，请稍后重试');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [isConnected]);

  // 过滤员工
  const filteredEmployees = employees.filter(
    emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      emp.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 分页
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  // 处理添加员工
  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      username: '',
      department: '',
      role: 'sales',
      isActive: true,
    });
    setIsAddModalOpen(true);
  };

  // 处理编辑员工
  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      username: employee.username,
      department: employee.department,
      role: employee.role,
      isActive: employee.isActive,
    });
    setIsAddModalOpen(true);
  };

  // 处理删除员工
  const handleDeleteEmployee = async (id: number) => {
    if (window.confirm('确定要删除这个员工吗？')) {
      try {
        await employee.delete(id);
        setEmployees(employees.filter(emp => emp.id !== id));
        toast.success('员工已删除');
      } catch (error) {
        console.error('删除员工失败:', error);
        toast.error('删除员工失败，请稍后重试');
      }
    }
  };

  // 处理重置密码
  const handleResetPassword = async (id: number) => {
    if (window.confirm('确定要重置这个员工的密码吗？')) {
      const newPassword = prompt('请输入新密码:', '');
      
      // 验证密码
      if (newPassword === null) {
        // 用户取消了操作
        return;
      }
      
      if (newPassword.length < 6) {
        toast.warning('密码长度不能少于6个字符');
        return;
      }
      
      try {
        await employee.resetPassword(id, newPassword);
        toast.success('密码已重置成功');
      } catch (error) {
        console.error('重置密码失败:', error);
        toast.error('重置密码失败，请稍后重试');
      }
    }
  };

  // 处理启用/禁用员工
  const handleToggleActive = async (id: number) => {
      try {
        const employeeToToggle = employees.find(emp => emp.id === id);
        if (employeeToToggle) {
          const newIsActive = !employeeToToggle.isActive;
          
          // 传递正确的字段名is_active给后端
          await employee.update(id, {
            name: employeeToToggle.name,
            department: employeeToToggle.department,
            role: employeeToToggle.role,
            is_active: newIsActive
          });
          
          // 前端仍然使用isActive字段
          setEmployees(employees.map(emp => 
            emp.id === id ? { ...emp, isActive: newIsActive } : emp
          ));
          toast.success('员工状态已更新');
        }
      } catch (error) {
        console.error('更新员工状态失败:', error);
        toast.error('更新员工状态失败，请稍后重试');
      }
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.username || !formData.department) {
      toast.error('请填写完整信息');
      return;
    }

    try {
      if (editingEmployee) {
        // 编辑现有员工 - 传递正确的字段名给后端
        await employee.update(editingEmployee.id, {
          name: formData.name,
          department: formData.department,
          role: formData.role,
          is_active: formData.isActive
        });
        
        setEmployees(employees.map(emp => 
          emp.id === editingEmployee.id ? { ...emp, ...formData } : emp
        ));
        toast.success('员工信息已更新');
      } else {
        // 添加新员工
        const newEmployeeData = {
          ...formData,
          password: '123456', // 密码将在后端进行哈希处理
          is_active: formData.isActive // 使用正确的字段名
        };
        
        await employee.create(newEmployeeData);
        
        // 重新加载员工列表以获取新员工的ID
        await loadEmployees();
        toast.success('员工已添加');
      }
      
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('保存员工信息失败:', error);
      toast.error('保存员工信息失败，请稍后重试');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold">员工管理</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索员工..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // 重置到第一页
              }}
              className={`pl-10 pr-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              } w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            />
            <i className="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddEmployee}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <i className="fa-solid fa-plus"></i>
            <span>添加员工</span>
          </motion.button>
        </div>
      </div>

      {/* 员工列表 */}
      <div className={`rounded-xl overflow-hidden border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">用户名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">部门</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">角色</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">创建日期</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {currentEmployees.map((employee) => (
                <tr key={employee.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{employee.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{employee.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{employee.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{employee.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      employee.role === 'admin' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {employee.role === 'admin' ? '管理员' : '销售'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      employee.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {employee.isActive ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{employee.createdAt}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        className={`p-1.5 rounded-md ${
                          theme === 'dark' ? 'hover:bg-gray-700 text-blue-400' : 'hover:bg-gray-100 text-blue-600'
                        }`}
                        aria-label="编辑"
                      >
                        <i className="fa-solid fa-edit"></i>
                      </button>
                      <button
                        onClick={() => handleResetPassword(employee.id)}
                        className={`p-1.5 rounded-md ${
                          theme === 'dark' ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-yellow-600'
                        }`}
                        aria-label="重置密码"
                      >
                        <i className="fa-solid fa-key"></i>
                      </button>
                      <button
                        onClick={() => handleToggleActive(employee.id)}
                        className={`p-1.5 rounded-md ${
                          theme === 'dark' ? 'hover:bg-gray-700 text-purple-400' : 'hover:bg-gray-100 text-purple-600'
                        }`}
                        aria-label={employee.isActive ? '禁用' : '启用'}
                      >
                        {employee.isActive ? (
                          <i className="fa-solid fa-lock"></i>
                        ) : (
                          <i className="fa-solid fa-unlock"></i>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className={`p-1.5 rounded-md ${
                          theme === 'dark' ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'
                        }`}
                        aria-label="删除"
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
          显示 {(currentPage - 1) * itemsPerPage + 1} 到 {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} 条，共 {filteredEmployees.length} 条
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

      {/* 添加/编辑员工模态框 */}
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
            className={`w-full max-w-lg rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className="text-xl font-semibold">{editingEmployee ? '编辑员工' : '添加员工'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    姓名
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                    placeholder="请输入姓名"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    用户名
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                    placeholder="请输入用户名"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    部门
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                    placeholder="请输入部门"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    角色
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'sales' })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                  >
                    <option value="sales">销售</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
                
                <div>
                  <label className={`flex items-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className={`mr-2 ${theme === 'dark' ? 'accent-blue-500' : ''}`}
                    />
                    <span className="text-sm">启用账号</span>
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={`px-4 py-2 rounded-lg ${
                    theme === 'dark' 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  } transition-colors`}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingEmployee ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}