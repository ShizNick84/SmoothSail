/**
 * =============================================================================
 * RATE LIMITING SYSTEM - MAIN EXPORTS
 * =============================================================================
 * 
 * This module exports all rate limiting components for the AI Crypto Trading
 * Agent with comprehensive API, AI/LLM, and notification rate limiting.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

// Core rate limiting system
export {
  RateLimitingSystem,
  RateLimiterType,
  RateLimitConfig,
  AdaptiveRateLimitConfig,
  RateLimitStatus,
  RateLimitViolation
} from './rate-limiter';

// API rate limiting
export {
  APIRateLimiter,
  GateIOAPIRateLimiter,
  NewsAPIRateLimiter,
  DatabaseRateLimiter,
  APIRateLimitConfig
} from './api-rate-limiter';

// AI/LLM rate limiting
export {
  AIRateLimiter,
  AIModelType,
  AIRequestConfig,
  AIModelMetrics
} from './ai-rate-limiter';

// Notification rate limiting
export {
  NotificationRateLimiter,
  NotificationType,
  NotificationPriority,
  NotificationConfig,
  NotificationStats
} from './notification-rate-limiter';

// Adaptive rate limiting
export {
  AdaptiveRateLimiter,
  PerformanceThresholds,
  AdaptationStrategy,
  SystemPerformanceMetrics,
  RateLimitAdaptation
} from './adaptive-rate-limiter';

/**
 * Rate limiting manager that coordinates all rate limiting systems
 */
import { RateLimitingSystem } from './rate-limiter';
import { APIRateLimiter, GateIOAPIRateLimiter, NewsAPIRateLimiter, DatabaseRateLimiter } from './api-rate-limiter';
import { AIRateLimiter } from './ai-rate-limiter';
import { NotificationRateLimiter } from './notification-rate-limiter';
import { AdaptiveRateLimiter } from './adaptive-rate-limiter';
import { SystemMonitor } from '@/infrastructure/system-monitor';
import { logger } from '@/core/logging/logger';

export class RateLimitingManager {
  private rateLimitingSystem: RateLimitingSystem;
  private apiRateLimiter: APIRateLimiter;
  private gateIOAPIRateLimiter: GateIOAPIRateLimiter;
  private newsAPIRateLimiter: NewsAPIRateLimiter;
  private databaseRateLimiter: DatabaseRateLimiter;
  private aiRateLimiter: AIRateLimiter;
  private notificationRateLimiter: NotificationRateLimiter;
  private adaptiveRateLimiter: AdaptiveRateLimiter;
  private systemMonitor: SystemMonitor;
  private isInitialized: boolean = false;

  constructor() {
    // Initialize core system
    this.rateLimitingSystem = new RateLimitingSystem();
    this.systemMonitor = new SystemMonitor();

    // Initialize specialized rate limiters
    this.apiRateLimiter = new APIRateLimiter(this.rateLimitingSystem);
    this.gateIOAPIRateLimiter = new GateIOAPIRateLimiter(this.rateLimitingSystem);
    this.newsAPIRateLimiter = new NewsAPIRateLimiter(this.rateLimitingSystem);
    this.databaseRateLimiter = new DatabaseRateLimiter(this.rateLimitingSystem);
    this.aiRateLimiter = new AIRateLimiter(this.rateLimitingSystem);
    this.notificationRateLimiter = new NotificationRateLimiter(this.rateLimitingSystem);
    this.adaptiveRateLimiter = new AdaptiveRateLimiter(this.rateLimitingSystem, this.systemMonitor);
  }

  /**
   * Initialize all rate limiting systems
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚦 Initializing comprehensive rate limiting manager...');

      // Initialize core system first
      await this.rateLimitingSystem.initialize();

      // Initialize specialized rate limiters
      await this.apiRateLimiter.initialize();
      await this.gateIOAPIRateLimiter.initialize();
      await this.newsAPIRateLimiter.initialize();
      await this.databaseRateLimiter.initialize();
      await this.aiRateLimiter.initialize();
      await this.notificationRateLimiter.initialize();
      await this.adaptiveRateLimiter.initialize();

      this.isInitialized = true;
      logger.info('✅ Rate limiting manager initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize rate limiting manager:', error);
      throw error;
    }
  }

  /**
   * Get Gate.io API rate limiter
   */
  public getGateIOAPIRateLimiter(): GateIOAPIRateLimiter {
    return this.gateIOAPIRateLimiter;
  }

  /**
   * Get news API rate limiter
   */
  public getNewsAPIRateLimiter(): NewsAPIRateLimiter {
    return this.newsAPIRateLimiter;
  }

  /**
   * Get database rate limiter
   */
  public getDatabaseRateLimiter(): DatabaseRateLimiter {
    return this.databaseRateLimiter;
  }

  /**
   * Get AI rate limiter
   */
  public getAIRateLimiter(): AIRateLimiter {
    return this.aiRateLimiter;
  }

  /**
   * Get notification rate limiter
   */
  public getNotificationRateLimiter(): NotificationRateLimiter {
    return this.notificationRateLimiter;
  }

  /**
   * Get adaptive rate limiter
   */
  public getAdaptiveRateLimiter(): AdaptiveRateLimiter {
    return this.adaptiveRateLimiter;
  }

  /**
   * Get core rate limiting system
   */
  public getRateLimitingSystem(): RateLimitingSystem {
    return this.rateLimitingSystem;
  }

  /**
   * Get comprehensive statistics from all rate limiters
   */
  public async getComprehensiveStatistics(): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Rate limiting manager not initialized');
    }

    return {
      timestamp: new Date(),
      core: this.rateLimitingSystem.getStatistics(),
      ai: this.aiRateLimiter.getModelMetrics(),
      notifications: this.notificationRateLimiter.getStatistics(),
      adaptive: this.adaptiveRateLimiter.getAdaptationStatistics(),
      queueStatus: {
        ai: this.aiRateLimiter.getQueueStatus(),
        notifications: this.notificationRateLimiter.getStatistics()
      }
    };
  }

  /**
   * Health check for all rate limiting systems
   */
  public async healthCheck(): Promise<any> {
    const health = {
      isHealthy: true,
      systems: {
        core: { initialized: this.isInitialized, healthy: true },
        api: { initialized: true, healthy: true },
        ai: { initialized: true, healthy: true },
        notifications: { initialized: true, healthy: true },
        adaptive: { initialized: true, healthy: true }
      },
      timestamp: new Date()
    };

    try {
      // Check core system
      const coreStats = this.rateLimitingSystem.getStatistics();
      health.systems.core.healthy = coreStats.activeLimiters > 0;

      // Check AI system
      const aiQueue = this.aiRateLimiter.getQueueStatus();
      health.systems.ai.healthy = aiQueue.queueLength < 100; // Arbitrary threshold

      // Check notification system
      const notificationStats = this.notificationRateLimiter.getStatistics();
      health.systems.notifications.healthy = notificationStats.queueLength < 50;

      // Overall health
      health.isHealthy = Object.values(health.systems).every(system => system.healthy);

    } catch (error) {
      logger.error('❌ Error in rate limiting health check:', error);
      health.isHealthy = false;
    }

    return health;
  }

  /**
   * Shutdown all rate limiting systems
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down rate limiting manager...');

    try {
      // Shutdown in reverse order
      await this.adaptiveRateLimiter.shutdown();
      await this.notificationRateLimiter.shutdown();
      await this.aiRateLimiter.shutdown();
      // API rate limiters don't need explicit shutdown
      await this.rateLimitingSystem.shutdown();

      this.isInitialized = false;
      logger.info('✅ Rate limiting manager shutdown completed');

    } catch (error) {
      logger.error('❌ Error during rate limiting manager shutdown:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const rateLimitingManager = new RateLimitingManager();