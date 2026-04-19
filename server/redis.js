require('dotenv').config();
const Redis = require('ioredis');
const crypto = require('crypto');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

const redis = new Redis(redisConfig);

const SESSION_PREFIX = 'session:';
const SESSION_TTL = parseInt(process.env.SESSION_TTL) || 86400;

const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

const createSession = async (user) => {
  const sessionId = generateSessionId();
  const sessionKey = `${SESSION_PREFIX}${sessionId}`;
  
  const sessionData = {
    userId: user.id,
    email: user.email,
    createdAt: Date.now()
  };
  
  await redis.set(sessionKey, JSON.stringify(sessionData), 'EX', SESSION_TTL);
  
  return sessionId;
};

const getSession = async (sessionId) => {
  if (!sessionId) return null;
  
  const sessionKey = `${SESSION_PREFIX}${sessionId}`;
  const sessionData = await redis.get(sessionKey);
  
  if (!sessionData) return null;
  
  return JSON.parse(sessionData);
};

const deleteSession = async (sessionId) => {
  if (!sessionId) return false;
  
  const sessionKey = `${SESSION_PREFIX}${sessionId}`;
  const result = await redis.del(sessionKey);
  
  return result > 0;
};

const refreshSession = async (sessionId) => {
  if (!sessionId) return false;
  
  const sessionKey = `${SESSION_PREFIX}${sessionId}`;
  const result = await redis.expire(sessionKey, SESSION_TTL);
  
  return result > 0;
};

const checkRedisConnection = async () => {
  try {
    await redis.ping();
    console.log('Redis 连接成功');
    return true;
  } catch (error) {
    console.error('Redis 连接失败:', error);
    return false;
  }
};

module.exports = {
  redis,
  createSession,
  getSession,
  deleteSession,
  refreshSession,
  checkRedisConnection
};
