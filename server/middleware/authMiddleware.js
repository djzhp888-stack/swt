import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const authMiddleware = (req, res, next) => {
  try {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        code: 401,
        message: '缺少认证令牌'
      });
    }
    
    // 提取令牌
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        code: 401,
        message: '无效的认证令牌格式'
      });
    }
    
    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    
    // 将用户信息添加到请求对象中
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        code: 401,
        message: '无效的认证令牌'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        message: '认证令牌已过期'
      });
    }
    
    console.error('认证错误:', error);
    res.status(500).json({
      code: 500,
      message: '认证失败'
    });
  }
};

export default authMiddleware;