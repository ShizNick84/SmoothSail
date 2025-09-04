/**
 * =============================================================================
 * AI/LLM MODEL RATE LIMITING SYSTEM
 * =============================================================================
 * 
 * This module provides comprehensive rate limiting for AI/LLM model requests
 * including Ollama models (Llama, Mistral, CodeLlama) with adaptive rate
 * limiting based on model response times and system performance.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { RateLimitingSystem, RateLimiterType } from './rate-limiter';
import { logger } from '@/core/logging/logger';
import { EventEmitter } from 'events';

/**
 * AI model types supported by the system
 */
export enum AIModelType {
  LLAMA_3_1_8B = 'llama3.1:8b',
  MISTRAL_7B = 'mistral:7b',
  CODELLAMA_7B = 'codellama:7b',
  OPENAI_GPT = 'openai-gpt',
  FALLBACK = 'fallback'
}

/**
 * AI request configuration
 */
export interface AIRequestConfig {
  model: AIModelType;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  retryOnLimit?: boolean;
  maxRetries?: number;
  fallbackModel?: AIModelType;
}

/**
 * AI model performance metrics
 */
export interface AIModelMetrics {
  model: AIModelType;
  averageResponseTime: number;
  successRate: number;
  totalRequests: number;
  failedRequests: number;
  lastRequestTime: Date | null;
  isHealthy: boolean;
}

/**
 * AI request queue item
 */
interface AIRequestQueueItem {
  id: string;
  config: AIRequestConfig;
  requestFn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: Date;
  retryCount: number;
}

/**
 * AI/LLM rate limiting system with adaptive capabilities
 */
export class AIRateLimiter extends EventEmitter {
  private rateLimitingSystem: RateLimitingSystem;
  private isInitialized: boolean = false;
  private modelMetrics: Map<AIModelType, AIModelMetrics> = new Map();
  private requestQueue: AIRequestQueueItem[] = [];
  private processingQueue: boolean = false;
  private queueProcessingInterval: NodeJS.Timeout | null = null;
  private metricsUpdateInterval: NodeJS.Timeout | null = null;

  constructor(rateLimitingSystem: RateLimitingSystem) {
    super();
    this.rateLimitingSystem = rateLimitingSystem;
    this.initializeModelMetrics();
  }

  /**
   * Initialize the AI rate limiter
   */
  public async initialize(): Promise<void> {
    if (!this.rateLimitingSystem) {
      throw new Error('Rate limiting system not provided');
    }

    // Start queue processing
    this.startQueueProcessing();

    // Start metrics monitoring
    this.startMetricsMonitoring();

    this.isInitialized = true;
    logger.info('🤖 AI rate limiter initialized with adaptive capabilities');
  }

  /**
   * Initialize model performance metrics
   */
  private initializeModelMetrics(): void {
    const models = [
      AIModelType.LLAMA_3_1_8B,
      AIModelType.MISTRAL_7B,
      AIModelType.CODELLAMA_7B,
      AIModelType.OPENAI_GPT
    ];

    for (const model of models) {
      this.modelMetrics.set(model, {
        model,
        averageResponseTime: 0,
        successRate: 100,
        totalRequests: 0,
        failedRequests: 0,
        lastRequestTime: null,
        isHealthy: true
      });
    }
  }

  /**
   * Execute AI model request with rate limiting and fallback
   */
  public async executeAIRequest<T>(
    requestFn: () => Promise<T>,
    config: AIRequestConfig
  ): Promise<T> {
    if (!this.isInitialized) {
      throw new Error('AI rate limiter not initialized');
    }

    return new Promise<T>((resolve, reject) => {
      const requestId = this.generateRequestId();
      const queueItem: AIRequestQueueItem = {
        id: requestId,
        config,
        requestFn,
        resolve,
        reject,
        timestamp: new Date(),
        retryCount: 0
      };

      // Add to queue based on priority
      this.addToQueue(queueItem);
      
      logger.debug(`🤖 Queued AI request ${requestId} for model ${config.model} with priority ${config.priority}`);
    });
  }

  /**
   * Add request to queue based on priority
   */
  private addToQueue(item: AIRequestQueueItem): void {
    const priority = this.getPriorityValue(item.config.priority);
    
    // Find insertion point based on priority
    let insertIndex = this.requestQueue.length;
    for (let i = 0; i < this.requestQueue.length; i++) {
      const queuePriority = this.getPriorityValue(this.requestQueue[i].config.priority);
      if (priority > queuePriority) {
        insertIndex = i;
        break;
      }
    }

    this.requestQueue.splice(insertIndex, 0, item);
    this.emit('requestQueued', { id: item.id, queueLength: this.requestQueue.length });
  }

  /**
   * Get numeric priority value
   */
  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'normal': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  /**
   * Start queue processing
   */
  private startQueueProcessing(): void {
    this.queueProcessingInterval = setInterval(async () => {
      if (!this.processingQueue && this.requestQueue.length > 0) {
        await this.processQueue();
      }
    }, 100); // Check every 100ms

    logger.info('🔄 Started AI request queue processing');
  }

  /**
   * Process the AI request queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      const item = this.requestQueue.shift();
      if (!item) return;

      await this.processQueueItem(item);
    } catch (error) {
      logger.error('❌ Error processing AI request queue:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Process individual queue item
   */
  private async processQueueItem(item: AIRequestQueueItem): Promise<void> {
    const { config, requestFn, resolve, reject, id } = item;
    const rateLimiterType = this.getModelRateLimiterType(config.model);

    try {
      // Check if model is healthy
      const metrics = this.modelMetrics.get(config.model);
      if (metrics && !metrics.isHealthy && config.fallbackModel) {
        logger.warn(`⚠️ Model ${config.model} unhealthy, using fallback ${config.fallbackModel}`);
        config.model = config.fallbackModel;
      }

      // Apply rate limiting
      await this.rateLimitingSystem.consume(rateLimiterType, 1, true);

      // Execute the request with timeout
      const startTime = Date.now();
      const timeoutMs = config.timeout || this.getDefaultTimeout(config.model);
      
      const result = await Promise.race([
        requestFn(),
        this.createTimeoutPromise(timeoutMs)
      ]);

      const responseTime = Date.now() - startTime;
      
      // Update metrics
      this.updateModelMetrics(config.model, true, responseTime);
      
      logger.debug(`✅ AI request ${id} completed in ${responseTime}ms`);
      resolve(result);

    } catch (error) {
      const responseTime = Date.now() - item.timestamp.getTime();
      
      // Update metrics
      this.updateModelMetrics(config.model, false, responseTime);

      // Handle rate limit errors
      if (this.isRateLimitError(error)) {
        if (config.retryOnLimit && item.retryCount < (config.maxRetries || 3)) {
          item.retryCount++;
          logger.warn(`⏳ Rate limit hit for ${config.model}, retrying request ${id} (attempt ${item.retryCount})`);
          
          // Re-add to queue with delay
          setTimeout(() => this.addToQueue(item), 5000);
          return;
        }
      }

      // Try fallback model if available
      if (config.fallbackModel && item.retryCount === 0) {
        logger.warn(`🔄 Trying fallback model ${config.fallbackModel} for request ${id}`);
        item.config.model = config.fallbackModel;
        item.retryCount++;
        this.addToQueue(item);
        return;
      }

      logger.error(`❌ AI request ${id} failed:`, error.message);
      reject(error);
    }
  }

  /**
   * Get rate limiter type for AI model
   */
  private getModelRateLimiterType(model: AIModelType): RateLimiterType {
    switch (model) {
      case AIModelType.LLAMA_3_1_8B:
        return RateLimiterType.OLLAMA_LLAMA;
      case AIModelType.MISTRAL_7B:
        return RateLimiterType.OLLAMA_MISTRAL;
      case AIModelType.CODELLAMA_7B:
        return RateLimiterType.OLLAMA_CODELLAMA;
      case AIModelType.OPENAI_GPT:
        return RateLimiterType.OPENAI_API;
      default:
        return RateLimiterType.OLLAMA_MISTRAL; // Default fallback
    }
  }

  /**
   * Get default timeout for model
   */
  private getDefaultTimeout(model: AIModelType): number {
    switch (model) {
      case AIModelType.LLAMA_3_1_8B:
        return 60000; // 60 seconds for Llama
      case AIModelType.CODELLAMA_7B:
        return 90000; // 90 seconds for CodeLlama
      case AIModelType.MISTRAL_7B:
        return 30000; // 30 seconds for Mistral
      case AIModelType.OPENAI_GPT:
        return 30000; // 30 seconds for OpenAI
      default:
        return 45000; // 45 seconds default
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`AI request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Update model performance metrics
   */
  private updateModelMetrics(
    model: AIModelType,
    success: boolean,
    responseTime: number
  ): void {
    const metrics = this.modelMetrics.get(model);
    if (!metrics) return;

    metrics.totalRequests++;
    metrics.lastRequestTime = new Date();

    if (success) {
      // Update average response time using exponential moving average
      const alpha = 0.1;
      metrics.averageResponseTime = 
        (alpha * responseTime) + ((1 - alpha) * metrics.averageResponseTime);
    } else {
      metrics.failedRequests++;
    }

    // Update success rate
    metrics.successRate = ((metrics.totalRequests - metrics.failedRequests) / metrics.totalRequests) * 100;

    // Update health status
    metrics.isHealthy = metrics.successRate > 70 && metrics.averageResponseTime < 30000;

    this.modelMetrics.set(model, metrics);
  }

  /**
   * Start metrics monitoring
   */
  private startMetricsMonitoring(): void {
    this.metricsUpdateInterval = setInterval(() => {
      this.emitMetricsUpdate();
    }, 60000); // Every minute

    logger.info('📊 Started AI model metrics monitoring');
  }

  /**
   * Emit metrics update event
   */
  private emitMetricsUpdate(): void {
    const metricsSnapshot = Array.from(this.modelMetrics.values());
    this.emit('metricsUpdate', {
      timestamp: new Date(),
      metrics: metricsSnapshot,
      queueLength: this.requestQueue.length
    });
  }

  /**
   * Check if error is rate limit related
   */
  private isRateLimitError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('quota exceeded')
    );
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `ai_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get model performance metrics
   */
  public getModelMetrics(model?: AIModelType): AIModelMetrics | AIModelMetrics[] {
    if (model) {
      return this.modelMetrics.get(model) || null;
    }
    return Array.from(this.modelMetrics.values());
  }

  /**
   * Get queue status
   */
  public getQueueStatus(): any {
    return {
      queueLength: this.requestQueue.length,
      processingQueue: this.processingQueue,
      queueByPriority: this.getQueueByPriority()
    };
  }

  /**
   * Get queue breakdown by priority
   */
  private getQueueByPriority(): Record<string, number> {
    return this.requestQueue.reduce((acc, item) => {
      acc[item.config.priority] = (acc[item.config.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Clear queue for specific model
   */
  public clearModelQueue(model: AIModelType): number {
    const initialLength = this.requestQueue.length;
    this.requestQueue = this.requestQueue.filter(item => {
      if (item.config.model === model) {
        item.reject(new Error(`Queue cleared for model ${model}`));
        return false;
      }
      return true;
    });

    const clearedCount = initialLength - this.requestQueue.length;
    logger.info(`🧹 Cleared ${clearedCount} requests for model ${model}`);
    return clearedCount;
  }

  /**
   * Shutdown the AI rate limiter
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down AI rate limiter...');

    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
      this.queueProcessingInterval = null;
    }

    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
    }

    // Reject all pending requests
    for (const item of this.requestQueue) {
      item.reject(new Error('AI rate limiter shutting down'));
    }
    this.requestQueue = [];

    this.modelMetrics.clear();
    this.isInitialized = false;

    logger.info('✅ AI rate limiter shutdown completed');
  }
}

// Exports are handled by individual export statements above