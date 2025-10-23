-- 创建业绩记录表
CREATE TABLE IF NOT EXISTS performance_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  order_id VARCHAR(50),
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'sale', -- sale或refund
  record_date DATE NOT NULL,
  customer_name VARCHAR(100),
  product VARCHAR(200),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- 创建索引提高查询性能
CREATE INDEX idx_employee_id ON performance_records(employee_id);
CREATE INDEX idx_record_date ON performance_records(record_date);
CREATE INDEX idx_type ON performance_records(type);

-- 插入一些测试数据
INSERT INTO performance_records (employee_id, order_id, amount, type, record_date, customer_name, product) VALUES
(2, 'ORD-2025-0001', 15000.00, 'sale', '2025-10-15', '客户A', '产品X'),
(3, 'ORD-2025-0002', 8000.00, 'sale', '2025-10-16', '客户B', '产品Y'),
(2, 'ORD-2025-0003', 12000.00, 'sale', '2025-10-17', '客户C', '产品Z'),
(4, 'ORD-2025-0004', 5000.00, 'sale', '2025-10-18', '客户D', '产品X'),
(3, null, 2000.00, 'refund', '2025-10-19', '客户B', '产品Y');