/**
 * =============================================================================
 * API RATE LIMITING INTEGRATION
 * =============================================================================
 * 
 * This module provides rate limiting integration for all API calls including
 * Gate.io API, news APIs, sentiment APIs, and database operations with
 * exponential backoff and queue management.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { RateLimitingSystem, RateLimiterType } from './rate-limiter';
import { logger } from '@/core/logging/logger';

/**
 * API request configuration with rate limiting
 */
export interface APIRateLimitConfig {
  type: RateLimiterType;
  points?: number;
  useQueue?: boolean;
  retryOnLimit?: boolean;
  maxRetries?: number;
  backoffMultiplier?: number;
}

/**
 * API rate limiting integration class
 */
export class APIRateLimiter {
  private rateLimitingSystem: RateLimitingSystem;
  private isInitialized: boolean = false;

  constructor(rateLimitingSystem: RateLimitingSystem) {
    this.rateLimitingSystem = rateLimitingSystem;
  }

  /**
   * Initialize the API rate limiter
   */
  public async initialize(): Promise<void> {
    if (!this.rateLimitingSystem) {
      throw new Error('Rate limiting system not provided');
    }

    this.isInitialized = true;
    logger.info('🚦 API rate limiter initialized');
  }

  /**
   * Execute API request with rate limiting
   */
  public async executeWithRateLimit<T>(
    apiCall: () => Promise<T>,
    config: APIRateLimitConfig
  ): Promise<T> {
    if (!this.isInitialized) {
      throw new Error('API rate limiter not initialized');
    }

    const {
      type,
      points = 1,
      useQueue = false,
      retryOnLimit = true,
      maxRetries = 3,
      backoffMultiplier = 2
    } = config;

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= maxRetries) {
      try {
        // Consume rate limit points
        await this.rateLimitingSystem.consume(type, points, useQueue);

        // Execute the API call
        const result = await apiCall();
        
        if (attempt > 0) {
          logger.info(`✅ API call succeeded after ${attempt} retries for ${type}`);
        }

        return result;

      } catch (error) {
        lastError = error as Error;

        // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          if (!retryOnLimit || attempt >= maxRetries) {
            logger.error(`❌ Rate limit exceeded for ${type}, max retries reached`);
            throw error;
          }

          // Calculate backoff delay
          const baseDelay = this.extractDelayFromError(error) || 1000;
          const backoffDelay = baseDelay * Math.pow(backoffMultiplier, attempt);
          
          logger.warn(`⏳ Rate limit hit for ${type}, retrying in ${backoffDelay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          
          await this.delay(backoffDelay);
          attempt++;
          continue;
        }

        // Non-rate-limit error, throw immediately
        throw error;
      }
    }

    throw lastError || new Error(`Max retries exceeded for ${type}`);
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      error.status === 429 ||
      error.code === 'RATE_LIMIT_EXCEEDED'
    );
  }

  /**
   * Extract delay from rate limit error
   */
  private extractDelayFromError(error: any): number | null {
    if (!error) return null;

    // Try to extract delay from error message
    const message = error.message || '';
    const delayMatch = message.match(/wait (\d+)ms/i);
    if (delayMatch) {
      return parseInt(delayMatch[1]);
    }

    // Check for retry-after header value in error
    if (error.retryAfter) {
      return error.retryAfter * 1000; // Convert seconds to milliseconds
    }

    return null;
  }

  /**
   * Delay execution for specified milliseconds
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get rate limit status for API type
   */
  public async getAPIRateLimitStatus(type: RateLimiterType): Promise<any> {
    return await this.rateLimitingSystem.getStatus(type);
  }

  /**
   * Reset rate limiter for API type
   */
  public async resetAPIRateLimit(type: RateLimiterType): Promise<void> {
    await this.rateLimitingSystem.reset(type);
    logger.info(`🔄 Reset API rate limiter for ${type}`);
  }
}

/**
 * Gate.io API rate limiting wrapper
 */
export class GateIOAPIRateLimiter extends APIRateLimiter {
  
  /**
   * Execute Gate.io public API call with rate limiting
   */
  public async executePublicCall<T>(apiCall: () => Promise<T>): Promise<T> {
    return this.executeWithRateLimit(apiCall, {
      type: RateLimiterType.GATE_IO_PUBLIC,
      points: 1,
      useQueue: true,
      retryOnLimit: true,
      maxRetries: 3
    });
  }

  /**
   * Execute Gate.io private API call with rate limiting
   */
  public async executePrivateCall<T>(apiCall: () => Promise<T>): Promise<T> {
    return this.executeWithRateLimit(apiCall, {
      type: RateLimiterType.GATE_IO_PRIVATE,
      points: 1,
      useQueue: true,
      retryOnLimit: true,
      maxRetries: 3
    });
  }

  /**
   * Execute Gate.io order API call with rate limiting
   */
  public async executeOrderCall<T>(apiCall: () => Promise<T>): Promise<T> {
    return this.executeWithRateLimit(apiCall, {
      type: RateLimiterType.GATE_IO_ORDERS,
      points: 1,
      useQueue: true,
      retryOnLimit: true,
      maxRetries: 5,
      backoffMultiplier: 1.5
    });
  }
}

/**
 * News and sentiment API rate limiting wrapper
 */
export class NewsAPIRateLimiter extends APIRateLimiter {
  
  /**
   * Execute news API call with rate limiting
   */
  public async executeNewsCall<T>(apiCall: () => Promise<T>): Promise<T> {
    return this.executeWithRateLimit(apiCall, {
      type: RateLimiterType.NEWS_API,
      points: 1,
      useQueue: true,
      retryOnLimit: true,
      maxRetries: 2
    });
  }

  /**
   * Execute sentiment API call with rate limiting
   */
  public async executeSentimentCall<T>(apiCall: () => Promise<T>): Promise<T> {
    return this.executeWithRateLimit(apiCall, {
      type: RateLimiterType.SENTIMENT_API,
      points: 1,
      useQueue: true,
      retryOnLimit: true,
      maxRetries: 2
    });
  }
}

/**
 * Database operations rate limiting wrapper
 */
export class DatabaseRateLimiter extends APIRateLimiter {
  
  /**
   * Execute database query with rate limiting
   */
  public async executeQuery<T>(queryCall: () => Promise<T>): Promise<T> {
    return this.executeWithRateLimit(queryCall, {
      type: RateLimiterType.DATABASE_QUERIES,
      points: 1,
      useQueue: true,
      retryOnLimit: true,
      maxRetries: 2,
      backoffMultiplier: 1.2
    });
  }

  /**
   * Execute batch database operation with higher point cost
   */
  public async executeBatchOperation<T>(batchCall: () => Promise<T>): Promise<T> {
    return this.executeWithRateLimit(batchCall, {
      type: RateLimiterType.DATABASE_QUERIES,
      points: 5, // Higher cost for batch operations
      useQueue: true,
      retryOnLimit: true,
      maxRetries: 1
    });
  }
}

export { APIRateLimitConfig };