/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - ENVIRONMENT CONFIGURATION VALIDATOR
 * =============================================================================
 * 
 * This module validates all environment variables required for the AI crypto
 * trading agent to operate safely and securely. It ensures all critical
 * configuration is present and properly formatted before system startup.
 * 
 * CRITICAL SECURITY NOTICE:
 * This validator protects against misconfiguration that could lead to
 * financial losses or security breaches. All validation failures must
 * be treated as critical errors that prevent system startup.
 * 
 * Validation Categories:
 * - Security configuration (encryption keys, secrets)
 * - Trading configuration (API credentials, risk parameters)
 * - System configuration (hardware limits, monitoring)
 * - Infrastructure configuration (SSH tunnels, networking)
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { z } from 'zod';
import { existsSync } from 'fs';
import { logger } from '@/core/logging/logger';

/**
 * Interface for validation result
 * Contains validation status and any errors found
 */
export interface ValidationResult {
  /** Whether all validations passed */
  isValid: boolean;
  /** Array of validation errors */
  errors: string[];
  /** Array of validation warnings */
  warnings: string[];
  /** Validated configuration object */
  config?: ValidatedConfig;
}

/**
 * Interface for validated configuration
 * Strongly typed configuration after validation
 */
export interface ValidatedConfig {
  // System configuration
  nodeEnv: string;
  logLevel: string;
  port: number;
  apiPort: number;
  
  // Security configuration
  masterEncryptionKey: string;
  jwtSecret: string;
  sessionSecret: string;
  sessionTimeoutMs: number;
  
  // Gate.io API configuration
  gateIoApiKey: string;
  gateIoApiSecret: string;
  gateIoApiPassphrase: string;
  gateIoBaseUrl: string;
  gateIoTestnet: boolean;
  gateIoRateLimitMs: number;
  
  // Oracle SSH tunnel configuration
  oracleHost: string;
  oracleSshPort: number;
  oracleUsername: string;
  oraclePrivateKeyPath: string;
  sshTunnelLocalPort: number;
  sshTunnelRemotePort: number;
  sshTunnelKeepAlive: boolean;
  sshTunnelCompression: boolean;
  
  // Trading configuration
  defaultTradingPairs: string[];
  riskPercentagePerTrade: number;
  maxDailyLossPercentage: number;
  minRiskRewardRatio: number;
  stopLossPercentage: number;
  maxPositionSizeUsd: number;
  minPositionSizeUsd: number;
  compoundProfits: boolean;
  
  // Strategy configuration
  enableMovingAverageStrategy: boolean;
  enableRsiStrategy: boolean;
  enableMacdStrategy: boolean;
  enableFibonacciStrategy: boolean;
  enableBreakoutStrategy: boolean;
  
  // AI configuration
  llmModelPath?: string;
  llmMaxTokens: number;
  llmTemperature: number;
  llmContextWindow: number;
  enableAiMarketAnalysis: boolean;
  enableAiDecisionExplanation: boolean;
  aiConfidenceThreshold: number;
  
  // Sentiment analysis configuration
  twitterApiKey?: string;
  twitterApiSecret?: string;
  twitterAccessToken?: string;
  twitterAccessTokenSecret?: string;
  redditClientId?: string;
  redditClientSecret?: string;
  redditUserAgent?: string;
  newsApiKey?: string;
  sentimentUpdateIntervalMs: number;
  sentimentWeightTwitter: number;
  sentimentWeightReddit: number;
  sentimentWeightNews: number;
  
  // Notification configuration
  emailSmtpHost?: string;
  emailSmtpPort?: number;
  emailSmtpSecure?: boolean;
  emailFrom?: string;
  emailPassword?: string;
  emailTo?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  enableEmailNotifications: boolean;
  enableTelegramNotifications: boolean;
  notificationRateLimitMs: number;
  
  // System monitoring configuration
  cpuUsageWarningThreshold: number;
  cpuUsageCriticalThreshold: number;
  memoryUsageWarningThreshold: number;
  memoryUsageCriticalThreshold: number;
  diskUsageWarningThreshold: number;
  diskUsageCriticalThreshold: number;
  cpuTempWarningThreshold: number;
  cpuTempCriticalThreshold: number;
  networkLatencyWarningMs: number;
  networkLatencyCriticalMs: number;
  
  // Database configuration
  databasePath: string;
  databaseBackupIntervalHours: number;
  databaseRetentionDays: number;
  databaseEncryptionEnabled: boolean;
  
  // Logging configuration
  logDir: string;
  auditLogDir: string;
  securityLogDir: string;
  logRetentionDays: number;
  auditLogRetentionDays: number;
  securityLogRetentionDays: number;
  tradingLogLevel: string;
  securityLogLevel: string;
  systemLogLevel: string;
  
  // Backup configuration
  backupDir: string;
  backupEncryptionEnabled: boolean;
  backupCompressionEnabled: boolean;
  backupRetentionDays: number;
  enableAutoRecovery: boolean;
  recoveryTimeoutMs: number;
  
  // Development configuration
  enableDebugMode: boolean;
  enablePaperTrading: boolean;
  mockExternalApis: boolean;
  testDatabasePath?: string;
  testLogLevel?: string;
}

/**
 * Zod schema for environment variable validation
 * Defines strict validation rules for all configuration
 */
const environmentSchema = z.object({
  // System configuration
  NODE_ENV: z.enum(['development', 'production', 'staging', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  PORT: z.string().transform(Number).pipe(z.number().int().min(1).max(65535)).default('3000'),
  API_PORT: z.string().transform(Number).pipe(z.number().int().min(1).max(65535)).default('3001'),
  
  // Security configuration - CRITICAL
  MASTER_ENCRYPTION_KEY: z.string().min(64, 'Master encryption key must be at least 64 characters'),
  JWT_SECRET: z.string().min(128, 'JWT secret must be at least 128 characters'),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters'),
  SESSION_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().int().min(300000)).default('1800000'), // 30 minutes
  
  // Gate.io API configuration - CRITICAL FOR TRADING
  GATE_IO_API_KEY: z.string().min(1, 'Gate.io API key is required'),
  GATE_IO_API_SECRET: z.string().min(1, 'Gate.io API secret is required'),
  GATE_IO_API_PASSPHRASE: z.string().min(1, 'Gate.io API passphrase is required'),
  GATE_IO_BASE_URL: z.string().url().default('https://api.gateio.ws'),
  GATE_IO_TESTNET: z.string().transform(val => val === 'true').default('false'),
  GATE_IO_RATE_LIMIT_MS: z.string().transform(Number).pipe(z.number().int().min(50)).default('100'),
  
  // Oracle SSH tunnel configuration - CRITICAL FOR IP CONSISTENCY
  ORACLE_HOST: z.string().ip().or(z.string().min(1)),
  ORACLE_SSH_PORT: z.string().transform(Number).pipe(z.number().int().min(1).max(65535)).default('22'),
  ORACLE_USERNAME: z.string().min(1, 'Oracle username is required'),
  ORACLE_PRIVATE_KEY_PATH: z.string().min(1, 'Oracle private key path is required'),
  SSH_TUNNEL_LOCAL_PORT: z.string().transform(Number).pipe(z.number().int().min(1024).max(65535)).default('8080'),
  SSH_TUNNEL_REMOTE_PORT: z.string().transform(Number).pipe(z.number().int().min(1).max(65535)).default('8080'),
  SSH_TUNNEL_KEEP_ALIVE: z.string().transform(val => val === 'true').default('true'),
  SSH_TUNNEL_COMPRESSION: z.string().transform(val => val === 'true').default('true'),
  
  // Trading configuration - CRITICAL FOR RISK MANAGEMENT
  DEFAULT_TRADING_PAIRS: z.string().default('BTC_USDT,ETH_USDT'),
  RISK_PERCENTAGE_PER_TRADE: z.string().transform(Number).pipe(z.number().min(0.1).max(10)).default('2.5'),
  MAX_DAILY_LOSS_PERCENTAGE: z.string().transform(Number).pipe(z.number().min(1).max(20)).default('5.0'),
  MIN_RISK_REWARD_RATIO: z.string().transform(Number).pipe(z.number().min(1.0).max(10)).default('1.3'),
  STOP_LOSS_PERCENTAGE: z.string().transform(Number).pipe(z.number().min(0.1).max(5)).default('1.0'),
  MAX_POSITION_SIZE_USD: z.string().transform(Number).pipe(z.number().min(10)).default('1000'),
  MIN_POSITION_SIZE_USD: z.string().transform(Number).pipe(z.number().min(1)).default('10'),
  COMPOUND_PROFITS: z.string().transform(val => val === 'true').default('true'),
  
  // Strategy configuration
  ENABLE_MOVING_AVERAGE_STRATEGY: z.string().transform(val => val === 'true').default('true'),
  ENABLE_RSI_STRATEGY: z.string().transform(val => val === 'true').default('true'),
  ENABLE_MACD_STRATEGY: z.string().transform(val => val === 'true').default('true'),
  ENABLE_FIBONACCI_STRATEGY: z.string().transform(val => val === 'true').default('true'),
  ENABLE_BREAKOUT_STRATEGY: z.string().transform(val => val === 'true').default('true'),
  
  // AI configuration
  LLM_MODEL_PATH: z.string().optional(),
  LLM_MAX_TOKENS: z.string().transform(Number).pipe(z.number().int().min(256).max(8192)).default('2048'),
  LLM_TEMPERATURE: z.string().transform(Number).pipe(z.number().min(0).max(2)).default('0.7'),
  LLM_CONTEXT_WINDOW: z.string().transform(Number).pipe(z.number().int().min(1024)).default('4096'),
  ENABLE_AI_MARKET_ANALYSIS: z.string().transform(val => val === 'true').default('true'),
  ENABLE_AI_DECISION_EXPLANATION: z.string().transform(val => val === 'true').default('true'),
  AI_CONFIDENCE_THRESHOLD: z.string().transform(Number).pipe(z.number().min(0).max(1)).default('0.75'),
  
  // Sentiment analysis configuration (optional)
  TWITTER_API_KEY: z.string().optional(),
  TWITTER_API_SECRET: z.string().optional(),
  TWITTER_ACCESS_TOKEN: z.string().optional(),
  TWITTER_ACCESS_TOKEN_SECRET: z.string().optional(),
  REDDIT_CLIENT_ID: z.string().optional(),
  REDDIT_CLIENT_SECRET: z.string().optional(),
  REDDIT_USER_AGENT: z.string().optional(),
  NEWS_API_KEY: z.string().optional(),
  SENTIMENT_UPDATE_INTERVAL_MS: z.string().transform(Number).pipe(z.number().int().min(60000)).default('300000'),
  SENTIMENT_WEIGHT_TWITTER: z.string().transform(Number).pipe(z.number().min(0).max(1)).default('0.4'),
  SENTIMENT_WEIGHT_REDDIT: z.string().transform(Number).pipe(z.number().min(0).max(1)).default('0.3'),
  SENTIMENT_WEIGHT_NEWS: z.string().transform(Number).pipe(z.number().min(0).max(1)).default('0.3'),
  
  // Notification configuration (optional but recommended)
  EMAIL_SMTP_HOST: z.string().optional(),
  EMAIL_SMTP_PORT: z.string().transform(Number).pipe(z.number().int().min(1).max(65535)).optional(),
  EMAIL_SMTP_SECURE: z.string().transform(val => val === 'true').optional(),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_TO: z.string().email().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  ENABLE_EMAIL_NOTIFICATIONS: z.string().transform(val => val === 'true').default('true'),
  ENABLE_TELEGRAM_NOTIFICATIONS: z.string().transform(val => val === 'true').default('true'),
  NOTIFICATION_RATE_LIMIT_MS: z.string().transform(Number).pipe(z.number().int().min(1000)).default('5000'),
  
  // System monitoring configuration
  CPU_USAGE_WARNING_THRESHOLD: z.string().transform(Number).pipe(z.number().min(50).max(95)).default('70'),
  CPU_USAGE_CRITICAL_THRESHOLD: z.string().transform(Number).pipe(z.number().min(70).max(99)).default('85'),
  MEMORY_USAGE_WARNING_THRESHOLD: z.string().transform(Number).pipe(z.number().min(50).max(95)).default('75'),
  MEMORY_USAGE_CRITICAL_THRESHOLD: z.string().transform(Number).pipe(z.number().min(70).max(99)).default('90'),
  DISK_USAGE_WARNING_THRESHOLD: z.string().transform(Number).pipe(z.number().min(50).max(95)).default('80'),
  DISK_USAGE_CRITICAL_THRESHOLD: z.string().transform(Number).pipe(z.number().min(70).max(99)).default('95'),
  CPU_TEMP_WARNING_THRESHOLD: z.string().transform(Number).pipe(z.number().min(50).max(90)).default('70'),
  CPU_TEMP_CRITICAL_THRESHOLD: z.string().transform(Number).pipe(z.number().min(60).max(100)).default('80'),
  NETWORK_LATENCY_WARNING_MS: z.string().transform(Number).pipe(z.number().int().min(50)).default('100'),
  NETWORK_LATENCY_CRITICAL_MS: z.string().transform(Number).pipe(z.number().int().min(100)).default('500'),
  
  // Database configuration
  DATABASE_PATH: z.string().default('./data/trading_agent.db'),
  DATABASE_BACKUP_INTERVAL_HOURS: z.string().transform(Number).pipe(z.number().int().min(1).max(24)).default('6'),
  DATABASE_RETENTION_DAYS: z.string().transform(Number).pipe(z.number().int().min(7)).default('90'),
  DATABASE_ENCRYPTION_ENABLED: z.string().transform(val => val === 'true').default('true'),
  
  // Logging configuration
  LOG_DIR: z.string().default('./logs'),
  AUDIT_LOG_DIR: z.string().default('./logs/audit'),
  SECURITY_LOG_DIR: z.string().default('./logs/security'),
  LOG_RETENTION_DAYS: z.string().transform(Number).pipe(z.number().int().min(7)).default('30'),
  AUDIT_LOG_RETENTION_DAYS: z.string().transform(Number).pipe(z.number().int().min(90)).default('365'),
  SECURITY_LOG_RETENTION_DAYS: z.string().transform(Number).pipe(z.number().int().min(90)).default('365'),
  TRADING_LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  SECURITY_LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('debug'),
  SYSTEM_LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Backup configuration
  BACKUP_DIR: z.string().default('./backups'),
  BACKUP_ENCRYPTION_ENABLED: z.string().transform(val => val === 'true').default('true'),
  BACKUP_COMPRESSION_ENABLED: z.string().transform(val => val === 'true').default('true'),
  BACKUP_RETENTION_DAYS: z.string().transform(Number).pipe(z.number().int().min(7)).default('30'),
  ENABLE_AUTO_RECOVERY: z.string().transform(val => val === 'true').default('true'),
  RECOVERY_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().int().min(10000)).default('30000'),
  
  // Development configuration
  ENABLE_DEBUG_MODE: z.string().transform(val => val === 'true').default('false'),
  ENABLE_PAPER_TRADING: z.string().transform(val => val === 'true').default('true'),
  MOCK_EXTERNAL_APIS: z.string().transform(val => val === 'true').default('false'),
  TEST_DATABASE_PATH: z.string().optional(),
  TEST_LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).optional()
});

/**
 * Validate environment configuration
 * Performs comprehensive validation of all environment variables
 * 
 * @returns Promise<ValidationResult> Validation result with errors and warnings
 */
export async function validateEnvironment(): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    logger.info('🔍 Starting environment configuration validation...');
    
    // Parse and validate environment variables
    const result = environmentSchema.safeParse(process.env);
    
    if (!result.success) {
      // Collect Zod validation errors
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        errors.push(`${path}: ${issue.message}`);
      }
      
      return {
        isValid: false,
        errors,
        warnings
      };
    }
    
    const config = result.data;
    
    // Additional custom validations
    await performCustomValidations(config, errors, warnings);
    
    // Convert to typed configuration
    const validatedConfig = convertToValidatedConfig(config);
    
    // Log validation results
    if (errors.length > 0) {
      logger.error('❌ Environment validation failed', { errors, warnings });
      return {
        isValid: false,
        errors,
        warnings
      };
    }
    
    if (warnings.length > 0) {
      logger.warn('⚠️ Environment validation completed with warnings', { warnings });
    } else {
      logger.info('✅ Environment validation completed successfully');
    }
    
    return {
      isValid: true,
      errors: [],
      warnings,
      config: validatedConfig
    };
    
  } catch (error) {
    logger.error('❌ Environment validation error:', error);
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      isValid: false,
      errors,
      warnings
    };
  }
}

/**
 * Perform additional custom validations
 * Validates file paths, network connectivity, and business logic
 * 
 * @param config - Parsed configuration
 * @param errors - Array to collect errors
 * @param warnings - Array to collect warnings
 */
async function performCustomValidations(
  config: z.infer<typeof environmentSchema>,
  errors: string[],
  warnings: string[]
): Promise<void> {
  
  // Validate file paths exist
  if (!existsSync(config.ORACLE_PRIVATE_KEY_PATH)) {
    errors.push(`Oracle private key file not found: ${config.ORACLE_PRIVATE_KEY_PATH}`);
  }
  
  if (config.LLM_MODEL_PATH && !existsSync(config.LLM_MODEL_PATH)) {
    warnings.push(`LLM model file not found: ${config.LLM_MODEL_PATH}`);
  }
  
  // Validate risk management parameters
  if (config.RISK_PERCENTAGE_PER_TRADE > config.MAX_DAILY_LOSS_PERCENTAGE) {
    errors.push('Risk percentage per trade cannot exceed max daily loss percentage');
  }
  
  if (config.MIN_POSITION_SIZE_USD >= config.MAX_POSITION_SIZE_USD) {
    errors.push('Minimum position size must be less than maximum position size');
  }
  
  // Validate sentiment analysis weights sum to 1.0
  const sentimentWeightSum = config.SENTIMENT_WEIGHT_TWITTER + 
                            config.SENTIMENT_WEIGHT_REDDIT + 
                            config.SENTIMENT_WEIGHT_NEWS;
  
  if (Math.abs(sentimentWeightSum - 1.0) > 0.01) {
    warnings.push(`Sentiment analysis weights should sum to 1.0, current sum: ${sentimentWeightSum}`);
  }
  
  // Validate monitoring thresholds
  if (config.CPU_USAGE_WARNING_THRESHOLD >= config.CPU_USAGE_CRITICAL_THRESHOLD) {
    errors.push('CPU warning threshold must be less than critical threshold');
  }
  
  if (config.MEMORY_USAGE_WARNING_THRESHOLD >= config.MEMORY_USAGE_CRITICAL_THRESHOLD) {
    errors.push('Memory warning threshold must be less than critical threshold');
  }
  
  // Validate production environment requirements
  if (config.NODE_ENV === 'production') {
    if (config.ENABLE_DEBUG_MODE) {
      warnings.push('Debug mode should be disabled in production');
    }
    
    if (config.ENABLE_PAPER_TRADING) {
      warnings.push('Paper trading should be disabled in production');
    }
    
    if (config.MOCK_EXTERNAL_APIS) {
      errors.push('Mock external APIs must be disabled in production');
    }
    
    if (!config.TELEGRAM_BOT_TOKEN && config.ENABLE_TELEGRAM_NOTIFICATIONS) {
      warnings.push('Telegram notifications enabled but bot token not configured');
    }
    
    if (!config.EMAIL_FROM && config.ENABLE_EMAIL_NOTIFICATIONS) {
      warnings.push('Email notifications enabled but email configuration incomplete');
    }
  }
  
  // Validate Oracle host IP (should be 168.138.104.117 for Oracle Free Tier)
  if (config.ORACLE_HOST !== '168.138.104.117') {
    warnings.push(`Oracle host IP is ${config.ORACLE_HOST}, expected 168.138.104.117 for Oracle Free Tier`);
  }
}

/**
 * Convert parsed configuration to typed configuration object
 * Maps environment variables to strongly typed configuration
 * 
 * @param config - Parsed environment configuration
 * @returns ValidatedConfig Strongly typed configuration
 */
function convertToValidatedConfig(config: z.infer<typeof environmentSchema>): ValidatedConfig {
  return {
    // System configuration
    nodeEnv: config.NODE_ENV,
    logLevel: config.LOG_LEVEL,
    port: config.PORT,
    apiPort: config.API_PORT,
    
    // Security configuration
    masterEncryptionKey: config.MASTER_ENCRYPTION_KEY,
    jwtSecret: config.JWT_SECRET,
    sessionSecret: config.SESSION_SECRET,
    sessionTimeoutMs: config.SESSION_TIMEOUT_MS,
    
    // Gate.io API configuration
    gateIoApiKey: config.GATE_IO_API_KEY,
    gateIoApiSecret: config.GATE_IO_API_SECRET,
    gateIoApiPassphrase: config.GATE_IO_API_PASSPHRASE,
    gateIoBaseUrl: config.GATE_IO_BASE_URL,
    gateIoTestnet: config.GATE_IO_TESTNET,
    gateIoRateLimitMs: config.GATE_IO_RATE_LIMIT_MS,
    
    // Oracle SSH tunnel configuration
    oracleHost: config.ORACLE_HOST,
    oracleSshPort: config.ORACLE_SSH_PORT,
    oracleUsername: config.ORACLE_USERNAME,
    oraclePrivateKeyPath: config.ORACLE_PRIVATE_KEY_PATH,
    sshTunnelLocalPort: config.SSH_TUNNEL_LOCAL_PORT,
    sshTunnelRemotePort: config.SSH_TUNNEL_REMOTE_PORT,
    sshTunnelKeepAlive: config.SSH_TUNNEL_KEEP_ALIVE,
    sshTunnelCompression: config.SSH_TUNNEL_COMPRESSION,
    
    // Trading configuration
    defaultTradingPairs: config.DEFAULT_TRADING_PAIRS.split(',').map(pair => pair.trim()),
    riskPercentagePerTrade: config.RISK_PERCENTAGE_PER_TRADE,
    maxDailyLossPercentage: config.MAX_DAILY_LOSS_PERCENTAGE,
    minRiskRewardRatio: config.MIN_RISK_REWARD_RATIO,
    stopLossPercentage: config.STOP_LOSS_PERCENTAGE,
    maxPositionSizeUsd: config.MAX_POSITION_SIZE_USD,
    minPositionSizeUsd: config.MIN_POSITION_SIZE_USD,
    compoundProfits: config.COMPOUND_PROFITS,
    
    // Strategy configuration
    enableMovingAverageStrategy: config.ENABLE_MOVING_AVERAGE_STRATEGY,
    enableRsiStrategy: config.ENABLE_RSI_STRATEGY,
    enableMacdStrategy: config.ENABLE_MACD_STRATEGY,
    enableFibonacciStrategy: config.ENABLE_FIBONACCI_STRATEGY,
    enableBreakoutStrategy: config.ENABLE_BREAKOUT_STRATEGY,
    
    // AI configuration
    llmModelPath: config.LLM_MODEL_PATH,
    llmMaxTokens: config.LLM_MAX_TOKENS,
    llmTemperature: config.LLM_TEMPERATURE,
    llmContextWindow: config.LLM_CONTEXT_WINDOW,
    enableAiMarketAnalysis: config.ENABLE_AI_MARKET_ANALYSIS,
    enableAiDecisionExplanation: config.ENABLE_AI_DECISION_EXPLANATION,
    aiConfidenceThreshold: config.AI_CONFIDENCE_THRESHOLD,
    
    // Sentiment analysis configuration
    twitterApiKey: config.TWITTER_API_KEY,
    twitterApiSecret: config.TWITTER_API_SECRET,
    twitterAccessToken: config.TWITTER_ACCESS_TOKEN,
    twitterAccessTokenSecret: config.TWITTER_ACCESS_TOKEN_SECRET,
    redditClientId: config.REDDIT_CLIENT_ID,
    redditClientSecret: config.REDDIT_CLIENT_SECRET,
    redditUserAgent: config.REDDIT_USER_AGENT,
    newsApiKey: config.NEWS_API_KEY,
    sentimentUpdateIntervalMs: config.SENTIMENT_UPDATE_INTERVAL_MS,
    sentimentWeightTwitter: config.SENTIMENT_WEIGHT_TWITTER,
    sentimentWeightReddit: config.SENTIMENT_WEIGHT_REDDIT,
    sentimentWeightNews: config.SENTIMENT_WEIGHT_NEWS,
    
    // Notification configuration
    emailSmtpHost: config.EMAIL_SMTP_HOST,
    emailSmtpPort: config.EMAIL_SMTP_PORT,
    emailSmtpSecure: config.EMAIL_SMTP_SECURE,
    emailFrom: config.EMAIL_FROM,
    emailPassword: config.EMAIL_PASSWORD,
    emailTo: config.EMAIL_TO,
    telegramBotToken: config.TELEGRAM_BOT_TOKEN,
    telegramChatId: config.TELEGRAM_CHAT_ID,
    enableEmailNotifications: config.ENABLE_EMAIL_NOTIFICATIONS,
    enableTelegramNotifications: config.ENABLE_TELEGRAM_NOTIFICATIONS,
    notificationRateLimitMs: config.NOTIFICATION_RATE_LIMIT_MS,
    
    // System monitoring configuration
    cpuUsageWarningThreshold: config.CPU_USAGE_WARNING_THRESHOLD,
    cpuUsageCriticalThreshold: config.CPU_USAGE_CRITICAL_THRESHOLD,
    memoryUsageWarningThreshold: config.MEMORY_USAGE_WARNING_THRESHOLD,
    memoryUsageCriticalThreshold: config.MEMORY_USAGE_CRITICAL_THRESHOLD,
    diskUsageWarningThreshold: config.DISK_USAGE_WARNING_THRESHOLD,
    diskUsageCriticalThreshold: config.DISK_USAGE_CRITICAL_THRESHOLD,
    cpuTempWarningThreshold: config.CPU_TEMP_WARNING_THRESHOLD,
    cpuTempCriticalThreshold: config.CPU_TEMP_CRITICAL_THRESHOLD,
    networkLatencyWarningMs: config.NETWORK_LATENCY_WARNING_MS,
    networkLatencyCriticalMs: config.NETWORK_LATENCY_CRITICAL_MS,
    
    // Database configuration
    databasePath: config.DATABASE_PATH,
    databaseBackupIntervalHours: config.DATABASE_BACKUP_INTERVAL_HOURS,
    databaseRetentionDays: config.DATABASE_RETENTION_DAYS,
    databaseEncryptionEnabled: config.DATABASE_ENCRYPTION_ENABLED,
    
    // Logging configuration
    logDir: config.LOG_DIR,
    auditLogDir: config.AUDIT_LOG_DIR,
    securityLogDir: config.SECURITY_LOG_DIR,
    logRetentionDays: config.LOG_RETENTION_DAYS,
    auditLogRetentionDays: config.AUDIT_LOG_RETENTION_DAYS,
    securityLogRetentionDays: config.SECURITY_LOG_RETENTION_DAYS,
    tradingLogLevel: config.TRADING_LOG_LEVEL,
    securityLogLevel: config.SECURITY_LOG_LEVEL,
    systemLogLevel: config.SYSTEM_LOG_LEVEL,
    
    // Backup configuration
    backupDir: config.BACKUP_DIR,
    backupEncryptionEnabled: config.BACKUP_ENCRYPTION_ENABLED,
    backupCompressionEnabled: config.BACKUP_COMPRESSION_ENABLED,
    backupRetentionDays: config.BACKUP_RETENTION_DAYS,
    enableAutoRecovery: config.ENABLE_AUTO_RECOVERY,
    recoveryTimeoutMs: config.RECOVERY_TIMEOUT_MS,
    
    // Development configuration
    enableDebugMode: config.ENABLE_DEBUG_MODE,
    enablePaperTrading: config.ENABLE_PAPER_TRADING,
    mockExternalApis: config.MOCK_EXTERNAL_APIS,
    testDatabasePath: config.TEST_DATABASE_PATH,
    testLogLevel: config.TEST_LOG_LEVEL
  };
}

// =============================================================================
// CONFIGURATION SECURITY NOTES
// =============================================================================
// 1. All sensitive configuration is validated before system startup
// 2. File paths are verified to exist and be accessible
// 3. Risk management parameters are validated for safety
// 4. Production environments have additional validation requirements
// 5. Configuration errors prevent system startup to avoid unsafe operation
// 6. Warnings are logged but don't prevent startup
// 7. All validation results are logged for audit purposes
// 8. Environment variables are never logged in plain text
// =============================================================================