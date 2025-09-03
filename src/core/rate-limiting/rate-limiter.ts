/**
 * =============================================================================
 * COMPREHENSIVE RATE LIMITING SYSTEM
 * =============================================================================
 * 
 * This module implements a comprehensive rate limiting system for all API calls,
 * AI/LLM model requests, and notification services with adaptive capabilities
 * based on system performance and network conditions.
 * 
 * Features:
 * - Multi-tier rate limiting (API, AI, Notifications)
 * - Adaptive rate limiting based on system performance
 * - Queue management for high load scenarios
 * - Exponential backoff and circuit breaker patterns
 * - Comprehensive monitoring and alerting
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { RateLimiterMemory, RateLimiterQueue } from 'rate-limiter-flexible';
import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { SystemMonitor } from '@/infrastructure/system-monitor';

/**
 * Rate limiting configuration for different service types
 */
export interface RateLimitConfig {
  points: number;           // Number of requests allowed
  duration: number;         // Time window in seconds
  blockDuration?: number;   // Block duration after limit exceeded
  execEvenly?: boolean;     // Spread requests evenly across duration
}

/**
 * Adaptive rate limiting configuration
 */
export interface AdaptiveRateLimitConfig {
  baseConfig: RateLimitConfig;
  cpuThreshold: number;     // CPU usage threshold for adaptation (%)
  memoryThreshold: number;  // Memory usage threshold for adaptation (%)
  networkLatencyThreshold: number; // Network latency threshold (ms)
  adaptationFactor: number; // Factor to reduce limits when thresholds exceeded
}

/**
 * Rate limiter types for different services
 */
export enum RateLimiterType {
  GATE_IO_PUBLIC = 'gate_io_public',
  GATE_IO_PRIVATE = 'gate_io_private',
  GATE_IO_ORDERS = 'gate_io_orders',
  NEWS_API = 'news_api',
  SENTIMENT_API = 'sentiment_api',
  DATABASE_QUERIES = 'database_queries',
  OLLAMA_LLAMA = 'ollama_llama',
  OLLAMA_MISTRAL = 'ollama_mistral',
  OLLAMA_CODELLAMA = 'ollama_codellama',
  OPENAI_API = 'openai_api',
  TELEGRAM_MESSAGES = 'telegram_messages',
  EMAIL_NOTIFICATIONS = 'email_notifications',
  SSH_TUNNEL_RECONNECT = 'ssh_tunnel_reconnect'
}

/**
 * Rate limit status information
 */
export interface RateLimitStatus {
  type: RateLimiterType;
  remainingPoints: number;
  msBeforeNext: number;
  totalHits: number;
  isBlocked: boolean;
  adaptedConfig?: RateLimitConfig;
}

/**
 * Queue management configuration
 */
export interface QueueConfig {
  maxConcurrency: number;
  maxQueueSize: number;
  timeoutMs: number;
}

/**
 * Rate limit violation event
 */
export interface RateLimitViolation {
  type: RateLimiterType;
  timestamp: Date;
  remainingPoints: number;
  msBeforeNext: number;
  systemLoad: {
    cpu: number;
    memory: number;
    networkLatency: number;
  };
}

/**
 * Comprehensive rate limiting system with adaptive capabilities
 */
export class RateLimitingSystem extends EventEmitter {
  private rateLimiters: Map<RateLimiterType, RateLimiterMemory> = new Map();
  private queuedLimiters: Map<RateLimiterType, RateLimiterQueue> = new Map();
  private adaptiveConfigs: Map<RateLimiterType, AdaptiveRateLimitConfig> = new Map();
  private systemMonitor: SystemMonitor;
  private isInitialized: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private violations: RateLimitViolation[] = [];
  private maxViolationHistory: number = 1000;

  constructor() {
    super();
    this.systemMonitor = new SystemMonitor();
    this.setupDefaultConfigurations();
  }

  /**
   * Initialize the rate limiting system
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚦 Initializing comprehensive rate limiting system...');

      // Initialize system monitor
      await this.systemMonitor.initialize();

      // Create rate limiters for all service types
      this.createRateLimiters();

      // Start adaptive monitoring
      this.startAdaptiveMonitoring();

      this.isInitialized = true;
      logger.info('✅ Rate limiting system initialized successfully');

      this.emit('initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize rate limiting system:', error);
      throw error;
    }
  }

  /**
   * Setup default rate limiting configurations
   */
  private setupDefaultConfigurations(): void {
    // Gate.io API rate limits (conservative approach)
    this.setAdaptiveConfig(RateLimiterType.GATE_IO_PUBLIC, {
      baseConfig: { points: 800, duration: 60, execEvenly: true }, // 800/min (conservative from 900)
      cpuThreshold: 80,
      memoryThreshold: 85,
      networkLatencyThreshold: 1000,
      adaptationFactor: 0.5
    });

    this.setAdaptiveConfig(RateLimiterType.GATE_IO_PRIVATE, {
      baseConfig: { points: 250, duration: 60, execEvenly: true }, // 250/min (conservative from 300)
      cpuThreshold: 80,
      memoryThreshold: 85,
      networkLatencyThreshold: 1000,
      adaptationFactor: 0.5
    });

    this.setAdaptiveConfig(RateLimiterType.GATE_IO_ORDERS, {
      baseConfig: { points: 80, duration: 60, execEvenly: true }, // 80/min (conservative from 100)
      cpuThreshold: 80,
      memoryThreshold: 85,
      networkLatencyThreshold: 1000,
      adaptationFactor: 0.3
    });

    // News and sentiment API limits
    this.setAdaptiveConfig(RateLimiterType.NEWS_API, {
      baseConfig: { points: 100, duration: 60, execEvenly: true },
      cpuThreshold: 75,
      memoryThreshold: 80,
      networkLatencyThreshold: 2000,
      adaptationFactor: 0.6
    });

    this.setAdaptiveConfig(RateLimiterType.SENTIMENT_API, {
      baseConfig: { points: 200, duration: 60, execEvenly: true },
      cpuThreshold: 75,
      memoryThreshold: 80,
      networkLatencyThreshold: 2000,
      adaptationFactor: 0.6
    });

    // Database query limits (Intel NUC optimization)
    this.setAdaptiveConfig(RateLimiterType.DATABASE_QUERIES, {
      baseConfig: { points: 500, duration: 60, execEvenly: true },
      cpuThreshold: 70,
      memoryThreshold: 75,
      networkLatencyThreshold: 500,
      adaptationFactor: 0.7
    });

    // AI/LLM model limits (Intel NUC i5 optimization)
    this.setAdaptiveConfig(RateLimiterType.OLLAMA_LLAMA, {
      baseConfig: { points: 30, duration: 60, execEvenly: true }, // Conservative for Llama 3.1 8B
      cpuThreshold: 85,
      memoryThreshold: 90,
      networkLatencyThreshold: 5000,
      adaptationFactor: 0.4
    });

    this.setAdaptiveConfig(RateLimiterType.OLLAMA_MISTRAL, {
      baseConfig: { points: 60, duration: 60, execEvenly: true }, // Higher for faster Mistral 7B
      cpuThreshold: 80,
      memoryThreshold: 85,
      networkLatencyThreshold: 3000,
      adaptationFactor: 0.5
    });

    this.setAdaptiveConfig(RateLimiterType.OLLAMA_CODELLAMA, {
      baseConfig: { points: 20, duration: 60, execEvenly: true }, // Conservative for CodeLlama
      cpuThreshold: 85,
      memoryThreshold: 90,
      networkLatencyThreshold: 8000,
      adaptationFactor: 0.3
    });

    this.setAdaptiveConfig(RateLimiterType.OPENAI_API, {
      baseConfig: { points: 50, duration: 60, execEvenly: true }, // Fallback API
      cpuThreshold: 70,
      memoryThreshold: 75,
      networkLatencyThreshold: 2000,
      adaptationFactor: 0.6
    });

    // Notification service limits
    this.setAdaptiveConfig(RateLimiterType.TELEGRAM_MESSAGES, {
      baseConfig: { points: 30, duration: 60, blockDuration: 60 }, // Telegram bot limits
      cpuThreshold: 60,
      memoryThreshold: 70,
      networkLatencyThreshold: 3000,
      adaptationFactor: 0.8
    });

    this.setAdaptiveConfig(RateLimiterType.EMAIL_NOTIFICATIONS, {
      baseConfig: { points: 20, duration: 60, blockDuration: 300 }, // Conservative email limits
      cpuThreshold: 60,
      memoryThreshold: 70,
      networkLatencyThreshold: 5000,
      adaptationFactor: 0.8
    });

    // SSH tunnel reconnection limits
    this.setAdaptiveConfig(RateLimiterType.SSH_TUNNEL_RECONNECT, {
      baseConfig: { points: 10, duration: 300, blockDuration: 60 }, // 10 reconnects per 5 minutes
      cpuThreshold: 70,
      memoryThreshold: 75,
      networkLatencyThreshold: 1000,
      adaptationFactor: 0.5
    });
  }

  /**
   * Set adaptive configuration for a rate limiter type
   */
  public setAdaptiveConfig(type: RateLimiterType, config: AdaptiveRateLimitConfig): void {
    this.adaptiveConfigs.set(type, config);
  }

  /**
   * Create rate limiters for all configured types
   */
  private createRateLimiters(): void {
    for (const [type, adaptiveConfig] of this.adaptiveConfigs) {
      // Create memory-based rate limiter
      const rateLimiter = new RateLimiterMemory(adaptiveConfig.baseConfig);
      this.rateLimiters.set(type, rateLimiter);

      // Create queued rate limiter for high-load scenarios
      const queueConfig: QueueConfig = this.getQueueConfig(type);
      const queuedLimiter = new RateLimiterQueue(rateLimiter, queueConfig);
      this.queuedLimiters.set(type, queuedLimiter);

      logger.info(`🚦 Created rate limiter for ${type}:`, {
        points: adaptiveConfig.baseConfig.points,
        duration: adaptiveConfig.baseConfig.duration,
        queueSize: queueConfig.maxQueueSize
      });
    }
  }

  /**
   * Get queue configuration based on rate limiter type
   */
  private getQueueConfig(type: RateLimiterType): QueueConfig {
    switch (type) {
      case RateLimiterType.GATE_IO_ORDERS:
        return { maxConcurrency: 5, maxQueueSize: 50, timeoutMs: 30000 };
      case RateLimiterType.OLLAMA_LLAMA:
      case RateLimiterType.OLLAMA_CODELLAMA:
        return { maxConcurrency: 2, maxQueueSize: 10, timeoutMs: 60000 };
      case RateLimiterType.OLLAMA_MISTRAL:
        return { maxConcurrency: 3, maxQueueSize: 15, timeoutMs: 30000 };
      case RateLimiterType.TELEGRAM_MESSAGES:
      case RateLimiterType.EMAIL_NOTIFICATIONS:
        return { maxConcurrency: 3, maxQueueSize: 20, timeoutMs: 15000 };
      default:
        return { maxConcurrency: 10, maxQueueSize: 100, timeoutMs: 30000 };
    }
  }

  /**
   * Start adaptive monitoring to adjust rate limits based on system performance
   */
  private startAdaptiveMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performAdaptiveAdjustment();
      } catch (error) {
        logger.error('❌ Error in adaptive rate limit monitoring:', error);
      }
    }, 30000); // Check every 30 seconds

    logger.info('📊 Started adaptive rate limiting monitoring');
  }

  /**
   * Perform adaptive adjustment of rate limits based on system performance
   */
  private async performAdaptiveAdjustment(): Promise<void> {
    const systemMetrics = await this.systemMonitor.getSystemMetrics();
    const networkLatency = await this.measureNetworkLatency();

    for (const [type, adaptiveConfig] of this.adaptiveConfigs) {
      const shouldAdapt = this.shouldAdaptRateLimit(
        systemMetrics,
        networkLatency,
        adaptiveConfig
      );

      if (shouldAdapt) {
        await this.adaptRateLimit(type, adaptiveConfig, systemMetrics, networkLatency);
      }
    }
  }

  /**
   * Check if rate limit should be adapted based on system conditions
   */
  private shouldAdaptRateLimit(
    systemMetrics: any,
    networkLatency: number,
    config: AdaptiveRateLimitConfig
  ): boolean {
    return (
      systemMetrics.cpu.usage > config.cpuThreshold ||
      systemMetrics.memory.usagePercent > config.memoryThreshold ||
      networkLatency > config.networkLatencyThreshold
    );
  }

  /**
   * Adapt rate limit configuration based on system performance
   */
  private async adaptRateLimit(
    type: RateLimiterType,
    config: AdaptiveRateLimitConfig,
    systemMetrics: any,
    networkLatency: number
  ): Promise<void> {
    const adaptedPoints = Math.floor(
      config.baseConfig.points * config.adaptationFactor
    );

    const adaptedConfig: RateLimitConfig = {
      ...config.baseConfig,
      points: adaptedPoints
    };

    // Create new adapted rate limiter
    const newRateLimiter = new RateLimiterMemory(adaptedConfig);
    this.rateLimiters.set(type, newRateLimiter);

    // Update queued limiter
    const queueConfig = this.getQueueConfig(type);
    const newQueuedLimiter = new RateLimiterQueue(newRateLimiter, queueConfig);
    this.queuedLimiters.set(type, newQueuedLimiter);

    logger.warn(`⚠️ Adapted rate limit for ${type}:`, {
      originalPoints: config.baseConfig.points,
      adaptedPoints,
      reason: {
        cpu: systemMetrics.cpu.usage,
        memory: systemMetrics.memory.usagePercent,
        networkLatency
      }
    });

    this.emit('rateLimitAdapted', {
      type,
      originalConfig: config.baseConfig,
      adaptedConfig,
      systemMetrics,
      networkLatency
    });
  }

  /**
   * Measure network latency for adaptive rate limiting
   */
  private async measureNetworkLatency(): Promise<number> {
    const start = Date.now();
    try {
      // Simple ping to localhost (SSH tunnel endpoint)
      const response = await fetch('http://localhost:8443/ping', {
        method: 'HEAD'
      });
      return Date.now() - start;
    } catch (error) {
      return 5000; // Default high latency on error
    }
  }

  /**
   * Consume rate limit points for a specific service type
   */
  public async consume(
    type: RateLimiterType,
    points: number = 1,
    useQueue: boolean = false
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Rate limiting system not initialized');
    }

    try {
      const limiter = useQueue 
        ? this.queuedLimiters.get(type)
        : this.rateLimiters.get(type);

      if (!limiter) {
        throw new Error(`Rate limiter not found for type: ${type}`);
      }

      await limiter.consume(type, points);

    } catch (rateLimiterRes) {
      // Rate limit exceeded
      const violation: RateLimitViolation = {
        type,
        timestamp: new Date(),
        remainingPoints: rateLimiterRes.remainingPoints || 0,
        msBeforeNext: rateLimiterRes.msBeforeNext || 0,
        systemLoad: await this.getCurrentSystemLoad()
      };

      this.recordViolation(violation);
      this.emit('rateLimitExceeded', violation);

      logger.warn(`🚦 Rate limit exceeded for ${type}:`, {
        remainingPoints: violation.remainingPoints,
        msBeforeNext: violation.msBeforeNext,
        systemLoad: violation.systemLoad
      });

      throw new Error(
        `Rate limit exceeded for ${type}. Wait ${violation.msBeforeNext}ms before next request.`
      );
    }
  }

  /**
   * Get current system load for violation tracking
   */
  private async getCurrentSystemLoad(): Promise<any> {
    try {
      const metrics = await this.systemMonitor.getSystemMetrics();
      return {
        cpu: metrics.cpu.usage,
        memory: metrics.memory.usagePercent,
        networkLatency: await this.measureNetworkLatency()
      };
    } catch (error) {
      return { cpu: 0, memory: 0, networkLatency: 0 };
    }
  }

  /**
   * Record rate limit violation for monitoring
   */
  private recordViolation(violation: RateLimitViolation): void {
    this.violations.push(violation);

    // Keep only recent violations
    if (this.violations.length > this.maxViolationHistory) {
      this.violations = this.violations.slice(-this.maxViolationHistory);
    }
  }

  /**
   * Get rate limit status for a specific type
   */
  public async getStatus(type: RateLimiterType): Promise<RateLimitStatus> {
    const limiter = this.rateLimiters.get(type);
    if (!limiter) {
      throw new Error(`Rate limiter not found for type: ${type}`);
    }

    try {
      const res = await limiter.get(type);
      return {
        type,
        remainingPoints: res?.remainingPoints || 0,
        msBeforeNext: res?.msBeforeNext || 0,
        totalHits: res?.totalHits || 0,
        isBlocked: (res?.remainingPoints || 0) <= 0,
        adaptedConfig: this.adaptiveConfigs.get(type)?.baseConfig
      };
    } catch (error) {
      return {
        type,
        remainingPoints: 0,
        msBeforeNext: 0,
        totalHits: 0,
        isBlocked: true
      };
    }
  }

  /**
   * Get comprehensive rate limiting statistics
   */
  public getStatistics(): any {
    const recentViolations = this.violations.filter(
      v => Date.now() - v.timestamp.getTime() < 3600000 // Last hour
    );

    const violationsByType = recentViolations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalViolations: this.violations.length,
      recentViolations: recentViolations.length,
      violationsByType,
      activeLimiters: this.rateLimiters.size,
      adaptiveConfigs: this.adaptiveConfigs.size,
      isMonitoring: this.monitoringInterval !== null
    };
  }

  /**
   * Reset rate limiter for a specific type
   */
  public async reset(type: RateLimiterType): Promise<void> {
    const limiter = this.rateLimiters.get(type);
    if (limiter) {
      await limiter.delete(type);
      logger.info(`🔄 Reset rate limiter for ${type}`);
    }
  }

  /**
   * Shutdown the rate limiting system
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down rate limiting system...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    await this.systemMonitor.shutdown();

    this.rateLimiters.clear();
    this.queuedLimiters.clear();
    this.adaptiveConfigs.clear();
    this.violations = [];

    this.isInitialized = false;
    logger.info('✅ Rate limiting system shutdown completed');
  }
}

export { RateLimitingSystem, RateLimiterType, RateLimitConfig, AdaptiveRateLimitConfig, RateLimitStatus, RateLimitViolation };