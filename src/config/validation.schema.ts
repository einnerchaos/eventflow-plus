import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  APP_NAME: Joi.string().default('EventFlow+'),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),

  // Database
  DATABASE_URL: Joi.string().uri().optional(),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().default('postgres'),
  DB_NAME: Joi.string().default('eventflow'),

  // Redis
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_DB: Joi.number().integer().min(0).max(15).default(0),

  // JWT
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET must be at least 32 characters long',
  }),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Security
  API_KEY_SALT: Joi.string().min(16).required().messages({
    'string.min': 'API_KEY_SALT must be at least 16 characters long',
  }),
  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(20).default(10),

  // Queue
  QUEUE_PREFIX: Joi.string().default('bullmq'),
  ACTION_QUEUE_NAME: Joi.string().default('action-execution'),
  RETRY_QUEUE_NAME: Joi.string().default('retry-queue'),
  DEAD_LETTER_QUEUE_NAME: Joi.string().default('dead-letter'),
  WORKER_CONCURRENCY: Joi.number().integer().min(1).default(5),

  // Retry
  MAX_RETRY_ATTEMPTS: Joi.number().integer().min(1).max(10).default(3),
  RETRY_BASE_DELAY_MS: Joi.number().integer().min(100).default(1000),
  RETRY_MAX_DELAY_MS: Joi.number().integer().min(1000).default(60000),

  // Monitoring
  METRICS_ENABLED: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(9090),
  METRICS_PATH: Joi.string().default('/metrics'),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'log', 'debug', 'verbose')
    .default('debug'),
  LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),

  // SMTP
  SMTP_HOST: Joi.string().default('smtp.gmail.com'),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  SMTP_FROM: Joi.string().default('EventFlow+ <noreply@eventflow.com>'),

  // Webhook
  WEBHOOK_TIMEOUT_MS: Joi.number().integer().min(1000).default(30000),
  WEBHOOK_MAX_REDIRECTS: Joi.number().integer().min(0).default(5),

  // Feature flags
  ENABLE_IDEMPOTENCY: Joi.boolean().default(true),
  ENABLE_RETRY: Joi.boolean().default(true),
  ENABLE_DEAD_LETTER: Joi.boolean().default(true),
  ENABLE_EXECUTION_HISTORY: Joi.boolean().default(true),

  // Development
  SWAGGER_ENABLED: Joi.boolean().default(true),
  BULL_BOARD_ENABLED: Joi.boolean().default(true),
  BULL_BOARD_PATH: Joi.string().default('/admin/queues'),
});
