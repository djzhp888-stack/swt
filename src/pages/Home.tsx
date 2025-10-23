import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="p-8 md:p-12 flex flex-col md:flex-row">
          <div className="md:w-1/2 md:pr-8 mb-8 md:mb-0">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              三尾豚技术公司
            </h1>
            <h2 className="text-xl md:text-2xl font-semibold text-blue-600 dark:text-blue-400 mb-6">
              销售管理系统
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              高效管理销售流程，实时跟踪业绩数据，助力企业数字化转型
            </p>
            <div className="flex space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                <Link to="/login">管理员登录</Link>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors duration-200"
              >
                了解更多
              </motion.button>
            </div>
          </div>
          <div className="md:w-1/2">
            <img
              src="https://space.coze.cn/api/coze_space/gen_image?image_size=landscape_16_9&prompt=Sales%20management%20dashboard%20with%20charts%20and%20statistics%2C%20modern%20UI%2C%20professional%20business%20software&sign=76ab5be6bccf3e3c801e51361d62e658"
              alt="销售管理系统"
              className="w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-6 text-center text-gray-600 dark:text-gray-300">
          <p>© 2025 三尾豚技术公司. 保留所有权利.</p>
        </div>
      </motion.div>
    </div>
  );
}