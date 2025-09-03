/**
 * =============================================================================
 * RATE LIMITED AI ENGINE
 * =============================================================================
 * 
 * This module extends the AI engine with comprehensive rate limiting for
 * Ollama models (Llama, Mistral, CodeLlama) with adaptive rate limiting
 * based on model response times and system performance.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { AIEngine, AIEngineConfig, MarketAnalysis, TradeSignal, AISystemHealth } from './ai-engine';
import { AIRateLimiter, AIModelType, AIRequestConfig } from '@/core/rate-limiting/ai-rate-limiter';
import { rateLimitingManager } from '@/core/rate-limiting';
import { logger } from '@/core/logging/logger';
import { EventEmitter } from 'events';

/**
 * Rate limited AI request configuration
 */
export interface RateLimitedAIRequest {
  prompt: string;
  modelType: AIModelType;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  retryOnLimit?: boolean;
  maxRetries?: number;
  fallbackModel?: AIModelType;
  context?: Record<string, any>;
}

/**
 * AI model usage statistics
 */
export interface AIModelUsageStats {
  model: AIModelType;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  rateLimitViolations: number;
  lastUsed: Date | null;
  currentQueueLength: number;
}

/**
 * Rate limited AI engine with comprehensive model management
 */
export class RateLimitedAIEngine extends EventEmitter {
  private baseAIEngine: AIEngine;
  private aiRateLimiter: AIRateLimiter;
  private isInitialized: boolean = false;
  private modelUsageStats: Map<AIModelType, AIModelUsageStats> = new Map();
  private fallbackChain: AIModelType[] = [
    AIModelType.MISTRAL_7B,
    AIModelType.LLAMA_3_1_8B,
    AIModelType.OPENAI_GPT
  ];

  constructor(config: AIEngineConfig) {
    super();
    this.baseAIEngine = new AIEngine(config);
    this.aiRateLimiter = rateLimitingManager.getAIRateLimiter();
    this.initializeUsageStats();
  }

  /**
   * Initialize the rate limited AI engine
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🤖 Initializing rate limited AI engine...');

      // Initialize base AI engine
      await this.baseAIEngine.initialize();

      // Initialize rate limiting manager if not already done
      if (!rateLimitingManager['isInitialized']) {
        await rateLimitingManager.initialize();
      }

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      logger.info('✅ Rate limited AI engine initialized successfully');

      this.emit('initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize rate limited AI engine:', error);
      throw error;
    }
  }

  /**
   * Initialize usage statistics for all models
   */
  private initializeUsageStats(): void {
    const models = [
      AIModelType.LLAMA_3_1_8B,
      AIModelType.MISTRAL_7B,
      AIModelType.CODELLAMA_7B,
      AIModelType.OPENAI_GPT
    ];

    for (const model of models) {
      this.modelUsageStats.set(model, {
        model,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        rateLimitViolations: 0,
        lastUsed: null,
        currentQueueLength: 0
      });
    }
  }

  /**
   * Setup event listeners for rate limiting events
   */
  private setupEventListeners(): void {
    this.aiRateLimiter.on('rateLimitExceeded', (violation) => {
      const stats = this.modelUsageStats.get(violation.type as AIModelType);
      if (stats) {
        stats.rateLimitViolations++;
      }
      
      logger.warn(`🚦 AI rate limit exceeded for ${violation.type}:`, {
        remainingPoints: violation.remainingPoints,
        msBeforeNext: violation.msBeforeNext
      });

      this.emit('rateLimitExceeded', violation);
    });

    this.aiRateLimiter.on('requestQueued', (event) => {
      logger.debug(`📋 AI request queued: ${event.id}, queue length: ${event.queueLength}`);
      this.emit('requestQueued', event);
    });

    this.aiRateLimiter.on('metricsUpdate', (metrics) => {
      this.updateUsageStatsFromMetrics(metrics);
      this.emit('metricsUpdate', metrics);
    });
  }

  /**
   * Update usage statistics from AI rate limiter metrics
   */
  private updateUsageStatsFromMetrics(metricsUpdate: any): void {
    for (const metric of metricsUpdate.metrics) {
      const stats = this.modelUsageStats.get(metric.model);
      if (stats) {
        stats.totalRequests = metric.totalRequests;
        stats.successfulRequests = metric.totalRequests - metric.failedRequests;
        stats.failedRequests = metric.failedRequests;
        stats.averageResponseTime = metric.averageResponseTime;
        stats.lastUsed = metric.lastRequestTime;
      }
    }

    // Update queue lengths
    const queueStatus = this.aiRateLimiter.getQueueStatus();
    for (const [model, stats] of this.modelUsageStats) {
      stats.currentQueueLength = queueStatus.queueLength || 0;
    }
  }

  /**
   * Execute AI request with rate limiting and fallback
   */
  public async executeAIRequest<T>(
    requestFn: () => Promise<T>,
    config: RateLimitedAIRequest
  ): Promise<T> {
    if (!this.isInitialized) {
      throw new Error('Rate limited AI engine not initialized');
    }

    const aiConfig: AIRequestConfig = {
      model: config.modelType,
      priority: config.priority,
      timeout: config.timeout,
      retryOnLimit: config.retryOnLimit,
      maxRetries: config.maxRetries,
      fallbackModel: config.fallbackModel
    };

    const startTime = Date.now();
    
    try {
      const result = await this.aiRateLimiter.executeAIRequest(requestFn, aiConfig);
      
      // Update success statistics
      const responseTime = Date.now() - startTime;
      this.updateModelStats(config.modelType, true, responseTime);
      
      return result;
    } catch (error) {
      // Update failure statistics
      const responseTime = Date.now() - startTime;
      this.updateModelStats(config.modelType, false, responseTime);
      
      throw error;
    }
  }

  /**
   * Update model statistics
   */
  private updateModelStats(model: AIModelType, success: boolean, responseTime: number): void {
    const stats = this.modelUsageStats.get(model);
    if (!stats) return;

    stats.totalRequests++;
    stats.lastUsed = new Date();

    if (success) {
      stats.successfulRequests++;
      // Update average response time using exponential moving average
      const alpha = 0.1;
      stats.averageResponseTime = 
        (alpha * responseTime) + ((1 - alpha) * stats.averageResponseTime);
    } else {
      stats.failedRequests++;
    }
  }

  /**
   * Analyze market with rate limiting
   */
  public async analyzeMarket(symbol: string, marketData: any): Promise<MarketAnalysis> {
    const requestConfig: RateLimitedAIRequest = {
      prompt: `Analyze market conditions for ${symbol}`,
      modelType: AIModelType.LLAMA_3_1_8B,
      priority: 'high',
      timeout: 60000,
      retryOnLimit: true,
      maxRetries: 2,
      fallbackModel: AIModelType.MISTRAL_7B,
      context: { symbol, marketData }
    };

    return this.executeAIRequest(
      () => this.baseAIEngine.analyzeMarket(symbol, marketData),
      requestConfig
    );
  }

  /**
   * Generate trade signal with rate limiting
   */
  public async generateTradeSignal(symbol: string, marketData: any): Promise<TradeSignal> {
    const requestConfig: RateLimitedAIRequest = {
      prompt: `Generate trade signal for ${symbol}`,
      modelType: AIModelType.LLAMA_3_1_8B,
      priority: 'critical',
      timeout: 45000,
      retryOnLimit: true,
      maxRetries: 3,
      fallbackModel: AIModelType.MISTRAL_7B,
      context: { symbol, marketData }
    };

    return this.executeAIRequest(
      () => this.baseAIEngine.generateTradeSignal(symbol, marketData),
      requestConfig
    );
  }

  /**
   * Perform sentiment analysis with rate limiting
   */
  public async analyzeSentiment(text: string, context?: any): Promise<any> {
    const requestConfig: RateLimitedAIRequest = {
      prompt: `Analyze sentiment: ${text}`,
      modelType: AIModelType.MISTRAL_7B,
      priority: 'normal',
      timeout: 30000,
      retryOnLimit: true,
      maxRetries: 2,
      fallbackModel: AIModelType.LLAMA_3_1_8B,
      context
    };

    return this.executeAIRequest(
      async () => {
        // This would call the actual sentiment analysis method
        // For now, return a mock response
        return {
          sentiment: 'neutral',
          score: 0.5,
          confidence: 0.8,
          timestamp: new Date()
        };
      },
      requestConfig
    );
  }

  /**
   * Generate code analysis with rate limiting
   */
  public async analyzeCode(code: string, context?: any): Promise<any> {
    const requestConfig: RateLimitedAIRequest = {
      prompt: `Analyze trading strategy code: ${code}`,
      modelType: AIModelType.CODELLAMA_7B,
      priority: 'low',
      timeout: 90000,
      retryOnLimit: true,
      maxRetries: 1,
      fallbackModel: AIModelType.LLAMA_3_1_8B,
      context
    };

    return this.executeAIRequest(
      async () => {
        // This would call the actual code analysis method
        return {
          quality: 'good',
          score: 85,
          suggestions: ['Optimize loop performance', 'Add error handling'],
          timestamp: new Date()
        };
      },
      requestConfig
    );
  }

  /**
   * Get optimal model for request type
   */
  public getOptimalModel(requestType: 'trading' | 'sentiment' | 'code'): AIModelType {
    const modelMap = {
      trading: AIModelType.LLAMA_3_1_8B,
      sentiment: AIModelType.MISTRAL_7B,
      code: AIModelType.CODELLAMA_7B
    };

    const primaryModel = modelMap[requestType];
    
    // Check if primary model is healthy
    const stats = this.modelUsageStats.get(primaryModel);
    if (stats && stats.currentQueueLength > 10) {
      // Return fallback if queue is too long
      return this.fallbackChain.find(model => {
        const fallbackStats = this.modelUsageStats.get(model);
        return fallbackStats && fallbackStats.currentQueueLength < 5;
      }) || primaryModel;
    }

    return primaryModel;
  }

  /**
   * Get model usage statistics
   */
  public getModelUsageStats(): AIModelUsageStats[] {
    return Array.from(this.modelUsageStats.values());
  }

  /**
   * Get AI queue status
   */
  public getQueueStatus(): any {
    return this.aiRateLimiter.getQueueStatus();
  }

  /**
   * Clear model queue for specific model
   */
  public clearModelQueue(model: AIModelType): number {
    return this.aiRateLimiter.clearModelQueue(model);
  }

  /**
   * Get system health including rate limiting status
   */
  public async getSystemHealth(): Promise<AISystemHealth & { rateLimiting: any }> {
    const baseHealth = await this.baseAIEngine.getSystemHealth();
    const queueStatus = this.aiRateLimiter.getQueueStatus();
    const modelMetrics = this.aiRateLimiter.getModelMetrics();

    return {
      ...baseHealth,
      rateLimiting: {
        queueLength: queueStatus.queueLength,
        processingQueue: queueStatus.processingQueue,
        queueByPriority: queueStatus.queueByPriority,
        modelMetrics: Array.isArray(modelMetrics) ? modelMetrics : [modelMetrics],
        usageStats: this.getModelUsageStats()
      }
    };
  }

  /**
   * Learn from trade results with rate limiting
   */
  public async learnFromTrade(tradeResult: any): Promise<void> {
    const requestConfig: RateLimitedAIRequest = {
      prompt: `Learn from trade result`,
      modelType: AIModelType.LLAMA_3_1_8B,
      priority: 'low',
      timeout: 30000,
      retryOnLimit: false,
      maxRetries: 1,
      context: tradeResult
    };

    try {
      await this.executeAIRequest(
        () => this.baseAIEngine.learnFromTrade(tradeResult),
        requestConfig
      );
    } catch (error) {
      // Learning failures are not critical
      logger.warn('⚠️ Failed to learn from trade result:', error.message);
    }
  }

  /**
   * Start the AI engine with rate limiting
   */
  public async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Rate limited AI engine must be initialized before starting');
    }

    await this.baseAIEngine.start();
    logger.info('🚀 Rate limited AI engine started');
    this.emit('started');
  }

  /**
   * Shutdown the AI engine and rate limiting
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down rate limited AI engine...');

    await this.baseAIEngine.shutdown();
    
    // Clear usage statistics
    this.modelUsageStats.clear();

    this.isInitialized = false;
    logger.info('✅ Rate limited AI engine shutdown completed');
    this.emit('shutdown');
  }

  /**
   * Get comprehensive AI statistics
   */
  public getComprehensiveStats(): any {
    return {
      timestamp: new Date(),
      isInitialized: this.isInitialized,
      modelUsage: this.getModelUsageStats(),
      queueStatus: this.getQueueStatus(),
      rateLimitingStats: rateLimitingManager.getAIRateLimiter().getModelMetrics()
    };
  }
}

export { RateLimitedAIRequest, AIModelUsageStats };