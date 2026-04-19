const { getSession, refreshSession } = require('../redis');

const SESSION_HEADER = 'Authorization';
const SESSION_PREFIX = 'Bearer ';

const extractSessionId = (req) => {
  const authHeader = req.headers[SESSION_HEADER.toLowerCase()];
  if (authHeader && authHeader.startsWith(SESSION_PREFIX)) {
    return authHeader.slice(SESSION_PREFIX.length);
  }
  
  if (req.cookies && req.cookies.sessionId) {
    return req.cookies.sessionId;
  }
  
  return null;
};

const authMiddleware = async (req, res, next) => {
  try {
    const sessionId = extractSessionId(req);
    
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: '未登录，请先登录',
        code: 'UNAUTHORIZED'
      });
    }
    
    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({
        success: false,
        message: '登录已过期，请重新登录',
        code: 'SESSION_EXPIRED'
      });
    }
    
    await refreshSession(sessionId);
    
    req.user = {
      id: session.userId,
      email: session.email
    };
    req.sessionId = sessionId;
    
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    return res.status(500).json({
      success: false,
      message: '认证失败，请稍后重试'
    });
  }
};

const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const sessionId = extractSessionId(req);
    
    if (!sessionId) {
      req.user = null;
      return next();
    }
    
    const session = await getSession(sessionId);
    
    if (!session) {
      req.user = null;
      return next();
    }
    
    await refreshSession(sessionId);
    
    req.user = {
      id: session.userId,
      email: session.email
    };
    req.sessionId = sessionId;
    
    next();
  } catch (error) {
    console.error('可选认证中间件错误:', error);
    req.user = null;
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  extractSessionId
};
