export default () => ({
  // ==========================================
  // APPLICATION
  // ==========================================
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'EventFlow+',
  appUrl: process.env.APP_URL || 'http://localhost:3000',

  // ==========================================
  // DATABASE
  // ==========================================
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'eventflow',
  },

  // ==========================================
  // REDIS
  // ==========================================
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // ==========================================
  // AUTHENTICATION
  // ==========================================
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // ==========================================
  // SECURITY
  // ==========================================
  security: {
    apiKeySalt: process.env.API_KEY_SALT || 'dev-api-key-salt',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  },

  // ==========================================
  // QUEUE
  // ==========================================
  queue: {
    prefix: process.env.QUEUE_PREFIX || 'bullmq',
    actionQueue: process.env.ACTION_QUEUE_NAME || 'action-execution',
    retryQueue: process.env.RETRY_QUEUE_NAME || 'retry-queue',
    deadLetterQueue: process.env.DEAD_LETTER_QUEUE_NAME || 'dead-letter',
    workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  },

  // ==========================================
  // RETRY CONFIGURATION
  // ==========================================
  retry: {
    maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
    baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000', 10),
    maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '60000', 10),
  },

  // ==========================================
  // MONITORING
  // ==========================================
  monitoring: {
    enabled: process.env.METRICS_ENABLED === 'true',
    port: parseInt(process.env.METRICS_PORT || '9090', 10),
    path: process.env.METRICS_PATH || '/metrics',
    logLevel: process.env.LOG_LEVEL || 'debug',
    logFormat: process.env.LOG_FORMAT || 'json',
  },

  // ==========================================
  // EXTERNAL SERVICES
  // ==========================================
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'EventFlow+ <noreply@eventflow.com>',
  },

  webhook: {
    timeoutMs: parseInt(process.env.WEBHOOK_TIMEOUT_MS || '30000', 10),
    maxRedirects: parseInt(process.env.WEBHOOK_MAX_REDIRECTS || '5', 10),
  },

  // ==========================================
  // FEATURE FLAGS
  // ==========================================
  features: {
    idempotency: process.env.ENABLE_IDEMPOTENCY !== 'false',
    retry: process.env.ENABLE_RETRY !== 'false',
    deadLetter: process.env.ENABLE_DEAD_LETTER !== 'false',
    executionHistory: process.env.ENABLE_EXECUTION_HISTORY !== 'false',
  },

  // ==========================================
  // DEVELOPMENT
  // ==========================================
  development: {
    swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
    bullBoardEnabled: process.env.BULL_BOARD_ENABLED !== 'false',
    bullBoardPath: process.env.BULL_BOARD_PATH || '/admin/queues',
  },
});
