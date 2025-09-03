/**
 * =============================================================================
 * OLLAMA MANAGER - MULTI-MODEL LLM INFRASTRUCTURE FOR INTEL NUC
 * =============================================================================
 * 
 * This module manages Ollama integration for running multiple LLM models
 * locally on Intel NUC hardware. It provides model management, load balancing,
 * and performance optimization for trading decision making.
 * 
 * Supported Models:
 * - Llama 3.1 8B: Primary trading decision model
 * - Mistral 7B: Fast sentiment analysis and confluence scoring
 * - CodeLlama 7B: Strategy code generation and optimization
 * 
 * Hardware Optimization:
 * - Memory management for 12GB RAM constraint
 * - CPU optimization for Intel i5 processor
 * - Model switching based on system load
 * - Efficient batching and caching
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { Ollama } from 'ollama';
import { logger } from '@/core/logging/logger';
import { SystemMonitor } from '@/infrastructure/system-monitor';

/**
 * Interface for Ollama model configuration
 */
interface OllamaModelConfig {
  name: string;
  displayName: string;
  purpose: 'trading' | 'sentiment' | 'code' | 'general';
  memoryRequirement: number; // MB
  contextLength: number;
  temperature: number;
  topP: number;
  topK: number;
  numCtx: number;
  numGpu: number;
  numThread: number;
  repeatPenalty: number;
  seed: number;
  stop: string[];
  tfsZ: number;
  numPredict: number;
  mirostat: number;
  mirostatEta: number;
  mirostatTau: number;
}

/**
 * Interface for model performance metrics
 */
interface ModelPerformanceMetrics {
  modelName: string;
  averageResponseTime: number;
  tokensPerSecond: number;
  memoryUsage: number;
  cpuUsage: number;
  successRate: number;
  totalRequests: number;
  failedRequests: number;
  lastUsed: Date;
  isLoaded: boolean;
}

/**
 * Interface for AI analysis request
 */
interface AIAnalysisRequest {
  prompt: string;
  modelType: 'trading' | 'sentiment' | 'code';
  priority: 'low' | 'medium' | 'high' | 'critical';
  maxTokens?: number;
  temperature?: number;
  context?: Record<string, any>;
}

/**
 * Interface for AI analysis response
 */
interface AIAnalysisResponse {
  content: string;
  modelUsed: string;
  responseTime: number;
  tokensGenerated: number;
  confidence: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Interface for confluence scoring result
 */
interface ConfluenceScore {
  overallScore: number; // 0-100
  modelAgreement: number; // 0-100
  confidenceLevel: 'low' | 'medium' | 'high';
  individualScores: {
    trading: number;
    sentiment: number;
    technical: number;
  };
  reasoning: string[];
  recommendations: string[];
}

/**
 * Ollama Manager class for multi-model LLM infrastructure
 * Optimized for Intel NUC hardware constraints
 */
export class OllamaManager extends EventEmitter {
  private ollama: Ollama;
  private systemMonitor: SystemMonitor;
  private isInitialized: boolean = false;
  private loadedModels: Map<string, boolean> = new Map();
  private modelConfigs: Map<string, OllamaModelConfig> = new Map();
  private performanceMetrics: Map<string, ModelPerformanceMetrics> = new Map();
  private requestQueue: AIAnalysisRequest[] = [];
  private isProcessingQueue: boolean = false;
  private modelSwitchThreshold: number = 0.8; // Switch models at 80% memory usage

  // Optimized model configurations for Intel NUC
  private readonly MODEL_CONFIGS: OllamaModelConfig[] = [
    {
      name: 'llama3.1:8b',
      displayName: 'Llama 3.1 8B',
      purpose: 'trading',
      memoryRequirement: 6144, // 6GB
      contextLength: 8192,
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      numCtx: 4096,
      numGpu: 0, // CPU only for Intel NUC
      numThread: 4, // Optimize for Intel i5
      repeatPenalty: 1.1,
      seed: -1,
      stop: ['</s>', '<|end|>', '<|eot_id|>'],
      tfsZ: 1.0,
      numPredict: 2048,
      mirostat: 0,
      mirostatEta: 0.1,
      mirostatTau: 5.0
    },
    {
      name: 'mistral:7b',
      displayName: 'Mistral 7B',
      purpose: 'sentiment',
      memoryRequirement: 4608, // 4.5GB
      contextLength: 4096,
      temperature: 0.8,
      topP: 0.95,
      topK: 50,
      numCtx: 2048,
      numGpu: 0,
      numThread: 3,
      repeatPenalty: 1.05,
      seed: -1,
      stop: ['</s>', '<|end|>'],
      tfsZ: 1.0,
      numPredict: 1024,
      mirostat: 0,
      mirostatEta: 0.1,
      mirostatTau: 5.0
    },
    {
      name: 'codellama:7b',
      displayName: 'CodeLlama 7B',
      purpose: 'code',
      memoryRequirement: 4608, // 4.5GB
      contextLength: 4096,
      temperature: 0.3,
      topP: 0.9,
      topK: 30,
      numCtx: 2048,
      numGpu: 0,
      numThread: 3,
      repeatPenalty: 1.1,
      seed: -1,
      stop: ['</s>', '<|end|>', '```'],
      tfsZ: 1.0,
      numPredict: 1024,
      mirostat: 0,
      mirostatEta: 0.1,
      mirostatTau: 5.0
    }
  ];

  constructor(systemMonitor: SystemMonitor, ollamaHost: string = 'http://localhost:11434') {
    super();
    this.systemMonitor = systemMonitor;
    this.ollama = new Ollama({ host: ollamaHost });

    // Initialize model configurations
    this.MODEL_CONFIGS.forEach(config => {
      this.modelConfigs.set(config.name, config);
      this.performanceMetrics.set(config.name, {
        modelName: config.name,
        averageResponseTime: 0,
        tokensPerSecond: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        successRate: 100,
        totalRequests: 0,
        failedRequests: 0,
        lastUsed: new Date(),
        isLoaded: false
      });
    });

    logger.info('🤖 Ollama Manager initialized for Intel NUC');
  }

  /**
   * Initialize Ollama and verify model availability
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing Ollama Manager...');

      // Check Ollama service availability
      await this.checkOllamaService();

      // Get system resources
      const systemResources = await this.systemMonitor.getCurrentResources();
      logger.info(`📊 System resources - Memory: ${systemResources.memory.available}MB, CPU cores: ${systemResources.cpu.cores}`);

      // Check available models
      await this.checkAvailableModels();

      // Pull missing models if needed
      await this.pullMissingModels();

      // Load initial model based on available resources
      await this.loadOptimalInitialModel();

      // Start performance monitoring
      this.startPerformanceMonitoring();

      // Start request queue processing
      this.startQueueProcessing();

      this.isInitialized = true;
      logger.info('✅ Ollama Manager initialized successfully');

      this.emit('initialized');

    } catch (error) {
      logger.error('❌ Failed to initialize Ollama Manager:', error);
      throw new Error(`Ollama Manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Check if Ollama service is running and accessible
   */
  private async checkOllamaService(): Promise<void> {
    try {
      logger.info('🔍 Checking Ollama service...');
      
      // Test connection to Ollama
      const models = await this.ollama.list();
      logger.info(`✅ Ollama service is running with ${models.models.length} models available`);
      
    } catch (error) {
      logger.error('❌ Ollama service check failed:', error);
      throw new Error(`Ollama service is not accessible: ${error.message}. Please ensure Ollama is installed and running.`);
    }
  }

  /**
   * Check which models are available locally
   */
  private async checkAvailableModels(): Promise<void> {
    try {
      logger.info('📋 Checking available models...');
      
      const modelList = await this.ollama.list();
      const availableModelNames = modelList.models.map(model => model.name);
      
      for (const config of this.MODEL_CONFIGS) {
        const isAvailable = availableModelNames.some(name => name.includes(config.name.split(':')[0]));
        
        if (isAvailable) {
          logger.info(`✅ Model available: ${config.displayName}`);
        } else {
          logger.warn(`⚠️ Model not found: ${config.displayName}`);
        }
      }
      
    } catch (error) {
      logger.error('❌ Error checking available models:', error);
      throw error;
    }
  }

  /**
   * Pull missing models from Ollama registry
   */
  private async pullMissingModels(): Promise<void> {
    try {
      logger.info('📥 Checking for missing models to pull...');
      
      const modelList = await this.ollama.list();
      const availableModelNames = modelList.models.map(model => model.name);
      
      for (const config of this.MODEL_CONFIGS) {
        const isAvailable = availableModelNames.some(name => name.includes(config.name.split(':')[0]));
        
        if (!isAvailable) {
          logger.info(`📥 Pulling model: ${config.displayName}...`);
          
          // Check if we have enough disk space
          const systemResources = await this.systemMonitor.getCurrentResources();
          if (systemResources.disk.available < config.memoryRequirement * 2) {
            logger.warn(`⚠️ Insufficient disk space for ${config.displayName}`);
            continue;
          }
          
          try {
            // Pull the model with progress tracking
            const stream = await this.ollama.pull({ model: config.name, stream: true });
            
            for await (const chunk of stream) {
              if (chunk.status) {
                logger.info(`📥 ${config.displayName}: ${chunk.status}`);
              }
            }
            
            logger.info(`✅ Successfully pulled ${config.displayName}`);
            
          } catch (pullError) {
            logger.error(`❌ Failed to pull ${config.displayName}:`, pullError);
            // Continue with other models
          }
        }
      }
      
    } catch (error) {
      logger.error('❌ Error pulling missing models:', error);
      // Don't throw here, continue with available models
    }
  }

  /**
   * Load optimal initial model based on system resources
   */
  private async loadOptimalInitialModel(): Promise<void> {
    try {
      logger.info('🎯 Loading optimal initial model...');
      
      const systemResources = await this.systemMonitor.getCurrentResources();
      const availableMemory = systemResources.memory.available;
      
      // Find the best model that fits in available memory (leave 2GB buffer)
      const viableModels = this.MODEL_CONFIGS.filter(
        config => config.memoryRequirement <= (availableMemory - 2048)
      );
      
      if (viableModels.length === 0) {
        logger.warn('⚠️ No models fit in available memory, will load on-demand');
        return;
      }
      
      // Sort by capability (trading > sentiment > code) and memory requirement
      const sortedModels = viableModels.sort((a, b) => {
        const purposePriority = { trading: 3, sentiment: 2, code: 1, general: 0 };
        const aPriority = purposePriority[a.purpose];
        const bPriority = purposePriority[b.purpose];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return b.memoryRequirement - a.memoryRequirement;
      });
      
      const selectedModel = sortedModels[0];
      logger.info(`🎯 Selected initial model: ${selectedModel.displayName}`);
      
      // Load the selected model
      await this.loadModel(selectedModel.name);
      
    } catch (error) {
      logger.error('❌ Error loading optimal initial model:', error);
      // Continue without pre-loading a model
    }
  }

  /**
   * Load a specific model into memory
   */
  public async loadModel(modelName: string): Promise<void> {
    try {
      logger.info(`📥 Loading model: ${modelName}...`);
      
      const config = this.modelConfigs.get(modelName);
      if (!config) {
        throw new Error(`Model configuration not found: ${modelName}`);
      }
      
      // Check system resources
      const systemResources = await this.systemMonitor.getCurrentResources();
      if (config.memoryRequirement > systemResources.memory.available) {
        // Try to unload other models to make space
        await this.unloadLeastUsedModel();
        
        // Check again
        const updatedResources = await this.systemMonitor.getCurrentResources();
        if (config.memoryRequirement > updatedResources.memory.available) {
          throw new Error(`Insufficient memory to load ${modelName}`);
        }
      }
      
      // Test model with a simple prompt
      const testResponse = await this.ollama.generate({
        model: modelName,
        prompt: 'Hello, are you ready?',
        options: {
          num_predict: 10,
          temperature: 0.1
        }
      });
      
      if (!testResponse.response) {
        throw new Error(`Model ${modelName} failed to respond`);
      }
      
      this.loadedModels.set(modelName, true);
      
      // Update performance metrics
      const metrics = this.performanceMetrics.get(modelName)!;
      metrics.isLoaded = true;
      metrics.lastUsed = new Date();
      
      logger.info(`✅ Model ${modelName} loaded successfully`);
      
      this.emit('modelLoaded', { modelName, config });
      
    } catch (error) {
      logger.error(`❌ Failed to load model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Unload the least recently used model to free memory
   */
  private async unloadLeastUsedModel(): Promise<void> {
    try {
      // Find the least recently used loaded model
      let oldestModel: string | null = null;
      let oldestTime = Date.now();
      
      for (const [modelName, metrics] of this.performanceMetrics) {
        if (metrics.isLoaded && metrics.lastUsed.getTime() < oldestTime) {
          oldestTime = metrics.lastUsed.getTime();
          oldestModel = modelName;
        }
      }
      
      if (oldestModel) {
        logger.info(`📤 Unloading least used model: ${oldestModel}`);
        await this.unloadModel(oldestModel);
      }
      
    } catch (error) {
      logger.error('❌ Error unloading least used model:', error);
    }
  }

  /**
   * Unload a specific model from memory
   */
  public async unloadModel(modelName: string): Promise<void> {
    try {
      this.loadedModels.set(modelName, false);
      
      // Update performance metrics
      const metrics = this.performanceMetrics.get(modelName);
      if (metrics) {
        metrics.isLoaded = false;
      }
      
      logger.info(`📤 Model ${modelName} unloaded from memory`);
      
      this.emit('modelUnloaded', { modelName });
      
    } catch (error) {
      logger.error(`❌ Error unloading model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Generate AI analysis using the appropriate model
   */
  public async generateAnalysis(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      // Add to queue if high load
      if (this.shouldQueueRequest()) {
        return await this.queueRequest(request);
      }
      
      // Select appropriate model
      const modelName = this.selectModelForRequest(request);
      
      // Ensure model is loaded
      if (!this.loadedModels.get(modelName)) {
        await this.loadModel(modelName);
      }
      
      const startTime = Date.now();
      
      // Generate response
      const response = await this.ollama.generate({
        model: modelName,
        prompt: this.buildPrompt(request),
        options: this.buildModelOptions(modelName, request)
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Update performance metrics
      this.updatePerformanceMetrics(modelName, responseTime, response.response.length);
      
      const analysisResponse: AIAnalysisResponse = {
        content: response.response,
        modelUsed: modelName,
        responseTime,
        tokensGenerated: response.response.split(' ').length, // Rough token count
        confidence: this.calculateConfidence(response.response, request),
        timestamp: new Date(),
        metadata: {
          evalCount: response.eval_count,
          evalDuration: response.eval_duration,
          loadDuration: response.load_duration,
          promptEvalCount: response.prompt_eval_count,
          promptEvalDuration: response.prompt_eval_duration,
          totalDuration: response.total_duration
        }
      };
      
      logger.debug(`🤖 Generated analysis using ${modelName} in ${responseTime}ms`);
      
      this.emit('analysisGenerated', analysisResponse);
      
      return analysisResponse;
      
    } catch (error) {
      logger.error('❌ Error generating AI analysis:', error);
      throw error;
    }
  }

  /**
   * Generate confluence score by combining multiple model outputs
   */
  public async generateConfluenceScore(
    marketData: any,
    tradingContext: any
  ): Promise<ConfluenceScore> {
    try {
      logger.info('🎯 Generating confluence score with multiple models...');
      
      // Prepare requests for different models
      const requests: AIAnalysisRequest[] = [
        {
          prompt: `Analyze the trading opportunity for ${marketData.symbol}. Current price: ${marketData.price}. Provide a score from 0-100 and reasoning.`,
          modelType: 'trading',
          priority: 'high',
          context: { marketData, tradingContext }
        },
        {
          prompt: `Analyze market sentiment for ${marketData.symbol}. Consider news, social media, and market indicators. Provide sentiment score 0-100.`,
          modelType: 'sentiment',
          priority: 'high',
          context: { marketData }
        }
      ];
      
      // Generate analyses in parallel
      const analyses = await Promise.all(
        requests.map(request => this.generateAnalysis(request))
      );
      
      // Extract scores from responses
      const tradingScore = this.extractScore(analyses[0].content);
      const sentimentScore = this.extractScore(analyses[1].content);
      
      // Calculate technical score (placeholder - would use actual technical analysis)
      const technicalScore = this.calculateTechnicalScore(marketData);
      
      // Calculate overall confluence score
      const overallScore = Math.round(
        (tradingScore * 0.4) + (sentimentScore * 0.3) + (technicalScore * 0.3)
      );
      
      // Calculate model agreement
      const scores = [tradingScore, sentimentScore, technicalScore];
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((acc, score) => acc + Math.pow(score - avgScore, 2), 0) / scores.length;
      const modelAgreement = Math.max(0, 100 - (variance * 2)); // Lower variance = higher agreement
      
      // Determine confidence level
      let confidenceLevel: 'low' | 'medium' | 'high' = 'low';
      if (modelAgreement > 80 && overallScore > 70) {
        confidenceLevel = 'high';
      } else if (modelAgreement > 60 && overallScore > 50) {
        confidenceLevel = 'medium';
      }
      
      const confluenceScore: ConfluenceScore = {
        overallScore,
        modelAgreement: Math.round(modelAgreement),
        confidenceLevel,
        individualScores: {
          trading: tradingScore,
          sentiment: sentimentScore,
          technical: technicalScore
        },
        reasoning: [
          `Trading model scored ${tradingScore}/100`,
          `Sentiment analysis scored ${sentimentScore}/100`,
          `Technical analysis scored ${technicalScore}/100`,
          `Model agreement: ${Math.round(modelAgreement)}%`
        ],
        recommendations: this.generateRecommendations(overallScore, confidenceLevel, analyses)
      };
      
      logger.info(`🎯 Confluence score generated: ${overallScore}/100 (${confidenceLevel} confidence)`);
      
      this.emit('confluenceScoreGenerated', confluenceScore);
      
      return confluenceScore;
      
    } catch (error) {
      logger.error('❌ Error generating confluence score:', error);
      throw error;
    }
  }

  /**
   * Extract numerical score from AI response
   */
  private extractScore(response: string): number {
    // Look for patterns like "Score: 75" or "75/100" or "75%"
    const scorePatterns = [
      /score[:\s]+(\d+)/i,
      /(\d+)\/100/,
      /(\d+)%/,
      /(\d+)\s*out\s*of\s*100/i
    ];
    
    for (const pattern of scorePatterns) {
      const match = response.match(pattern);
      if (match) {
        const score = parseInt(match[1]);
        if (score >= 0 && score <= 100) {
          return score;
        }
      }
    }
    
    // Fallback: analyze sentiment of response
    if (response.toLowerCase().includes('bullish') || response.toLowerCase().includes('positive')) {
      return 75;
    } else if (response.toLowerCase().includes('bearish') || response.toLowerCase().includes('negative')) {
      return 25;
    } else {
      return 50; // Neutral
    }
  }

  /**
   * Calculate technical score based on market data
   */
  private calculateTechnicalScore(marketData: any): number {
    // Placeholder technical analysis - would implement actual indicators
    let score = 50; // Start neutral
    
    if (marketData.volume > marketData.avgVolume * 1.5) {
      score += 10; // High volume is positive
    }
    
    if (marketData.price > marketData.sma20) {
      score += 15; // Above 20-day moving average
    }
    
    if (marketData.rsi && marketData.rsi > 30 && marketData.rsi < 70) {
      score += 10; // RSI in healthy range
    }
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generate recommendations based on confluence analysis
   */
  private generateRecommendations(
    overallScore: number,
    confidenceLevel: string,
    analyses: AIAnalysisResponse[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (overallScore > 75 && confidenceLevel === 'high') {
      recommendations.push('Strong BUY signal - High confidence across all models');
      recommendations.push('Consider increasing position size within risk limits');
    } else if (overallScore > 60 && confidenceLevel === 'medium') {
      recommendations.push('Moderate BUY signal - Proceed with standard position size');
      recommendations.push('Monitor for confirmation signals');
    } else if (overallScore < 40 && confidenceLevel === 'high') {
      recommendations.push('Strong SELL signal - High confidence across all models');
      recommendations.push('Consider reducing exposure or taking profits');
    } else if (overallScore < 50) {
      recommendations.push('Weak signal - Consider HOLD or wait for better opportunity');
      recommendations.push('Monitor market conditions for clearer signals');
    } else {
      recommendations.push('Neutral signal - No clear directional bias');
      recommendations.push('Maintain current positions and wait for better setup');
    }
    
    return recommendations;
  }

  /**
   * Select appropriate model for request type
   */
  private selectModelForRequest(request: AIAnalysisRequest): string {
    const purposeToModel = {
      trading: 'llama3.1:8b',
      sentiment: 'mistral:7b',
      code: 'codellama:7b'
    };
    
    return purposeToModel[request.modelType] || 'llama3.1:8b';
  }

  /**
   * Build prompt with context and formatting
   */
  private buildPrompt(request: AIAnalysisRequest): string {
    let prompt = request.prompt;
    
    if (request.context) {
      prompt += '\n\nContext:\n' + JSON.stringify(request.context, null, 2);
    }
    
    // Add model-specific instructions
    const modelName = this.selectModelForRequest(request);
    const config = this.modelConfigs.get(modelName);
    
    if (config?.purpose === 'trading') {
      prompt += '\n\nProvide analysis in this format:\n- Market Assessment:\n- Risk Factors:\n- Recommendation:\n- Confidence Score (0-100):';
    } else if (config?.purpose === 'sentiment') {
      prompt += '\n\nProvide sentiment analysis with:\n- Overall Sentiment Score (0-100):\n- Key Factors:\n- Market Mood:';
    } else if (config?.purpose === 'code') {
      prompt += '\n\nProvide code analysis with:\n- Code Quality Score (0-100):\n- Optimization Suggestions:\n- Risk Assessment:';
    }
    
    return prompt;
  }

  /**
   * Build model options for request
   */
  private buildModelOptions(modelName: string, request: AIAnalysisRequest): any {
    const config = this.modelConfigs.get(modelName);
    if (!config) return {};
    
    return {
      temperature: request.temperature || config.temperature,
      top_p: config.topP,
      top_k: config.topK,
      num_ctx: config.numCtx,
      num_gpu: config.numGpu,
      num_thread: config.numThread,
      repeat_penalty: config.repeatPenalty,
      seed: config.seed,
      stop: config.stop,
      tfs_z: config.tfsZ,
      num_predict: request.maxTokens || config.numPredict,
      mirostat: config.mirostat,
      mirostat_eta: config.mirostatEta,
      mirostat_tau: config.mirostatTau
    };
  }

  /**
   * Calculate confidence score for response
   */
  private calculateConfidence(response: string, request: AIAnalysisRequest): number {
    let confidence = 50; // Base confidence
    
    // Increase confidence for longer, more detailed responses
    if (response.length > 500) confidence += 20;
    if (response.length > 1000) confidence += 10;
    
    // Increase confidence for specific keywords
    const confidenceKeywords = ['analysis', 'data', 'trend', 'pattern', 'evidence'];
    const keywordCount = confidenceKeywords.filter(keyword => 
      response.toLowerCase().includes(keyword)
    ).length;
    confidence += keywordCount * 5;
    
    // Decrease confidence for uncertainty keywords
    const uncertaintyKeywords = ['maybe', 'possibly', 'uncertain', 'unclear'];
    const uncertaintyCount = uncertaintyKeywords.filter(keyword => 
      response.toLowerCase().includes(keyword)
    ).length;
    confidence -= uncertaintyCount * 10;
    
    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Check if request should be queued due to high load
   */
  private shouldQueueRequest(): boolean {
    // Queue if system resources are under pressure
    return this.requestQueue.length > 5 || this.isProcessingQueue;
  }

  /**
   * Add request to queue and process when ready
   */
  private async queueRequest(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    return new Promise((resolve, reject) => {
      const queuedRequest = {
        ...request,
        resolve,
        reject
      } as any;
      
      this.requestQueue.push(queuedRequest);
      
      // Sort queue by priority
      this.requestQueue.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    });
  }

  /**
   * Start processing request queue
   */
  private startQueueProcessing(): void {
    setInterval(async () => {
      if (this.requestQueue.length > 0 && !this.isProcessingQueue) {
        this.isProcessingQueue = true;
        
        try {
          const request = this.requestQueue.shift();
          if (request) {
            const response = await this.generateAnalysis(request);
            request.resolve(response);
          }
        } catch (error) {
          const request = this.requestQueue.shift();
          if (request) {
            request.reject(error);
          }
        } finally {
          this.isProcessingQueue = false;
        }
      }
    }, 1000); // Process queue every second
  }

  /**
   * Update performance metrics for a model
   */
  private updatePerformanceMetrics(modelName: string, responseTime: number, responseLength: number): void {
    const metrics = this.performanceMetrics.get(modelName);
    if (!metrics) return;
    
    metrics.totalRequests++;
    metrics.averageResponseTime = (metrics.averageResponseTime + responseTime) / 2;
    metrics.tokensPerSecond = responseLength / (responseTime / 1000);
    metrics.lastUsed = new Date();
    
    // Update success rate (assume success if we got here)
    metrics.successRate = (metrics.totalRequests - metrics.failedRequests) / metrics.totalRequests * 100;
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(async () => {
      try {
        const systemResources = await this.systemMonitor.getCurrentResources();
        
        // Update memory usage for loaded models
        for (const [modelName, isLoaded] of this.loadedModels) {
          if (isLoaded) {
            const metrics = this.performanceMetrics.get(modelName);
            const config = this.modelConfigs.get(modelName);
            
            if (metrics && config) {
              metrics.memoryUsage = config.memoryRequirement;
              metrics.cpuUsage = systemResources.cpu.usage;
            }
          }
        }
        
        // Check if we need to optimize for resource pressure
        if (systemResources.memory.available < 2048) { // Less than 2GB available
          await this.optimizeForMemoryPressure();
        }
        
        this.emit('performanceUpdate', {
          systemResources,
          modelMetrics: Array.from(this.performanceMetrics.values())
        });
        
      } catch (error) {
        logger.error('❌ Error in performance monitoring:', error);
      }
    }, 30000); // Monitor every 30 seconds
  }

  /**
   * Optimize for memory pressure by unloading models
   */
  private async optimizeForMemoryPressure(): Promise<void> {
    logger.warn('⚠️ Memory pressure detected, optimizing model usage...');
    
    // Unload least recently used models
    const loadedModelMetrics = Array.from(this.performanceMetrics.values())
      .filter(metrics => metrics.isLoaded)
      .sort((a, b) => a.lastUsed.getTime() - b.lastUsed.getTime());
    
    // Unload oldest models until we have enough memory
    for (const metrics of loadedModelMetrics) {
      const systemResources = await this.systemMonitor.getCurrentResources();
      if (systemResources.memory.available > 3072) { // Keep 3GB buffer
        break;
      }
      
      await this.unloadModel(metrics.modelName);
    }
  }

  /**
   * Get performance metrics for all models
   */
  public getPerformanceMetrics(): ModelPerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Get loaded models
   */
  public getLoadedModels(): string[] {
    return Array.from(this.loadedModels.entries())
      .filter(([_, isLoaded]) => isLoaded)
      .map(([modelName, _]) => modelName);
  }

  /**
   * Get available models
   */
  public getAvailableModels(): OllamaModelConfig[] {
    return Array.from(this.modelConfigs.values());
  }

  /**
   * Test all models with a simple prompt
   */
  public async testAllModels(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const config of this.MODEL_CONFIGS) {
      try {
        logger.info(`🧪 Testing model: ${config.displayName}...`);
        
        const response = await this.ollama.generate({
          model: config.name,
          prompt: 'Hello, please respond with "OK" if you are working correctly.',
          options: { num_predict: 5, temperature: 0.1 }
        });
        
        results[config.name] = response.response.toLowerCase().includes('ok');
        
        if (results[config.name]) {
          logger.info(`✅ Model ${config.displayName} test passed`);
        } else {
          logger.warn(`⚠️ Model ${config.displayName} test failed`);
        }
        
      } catch (error) {
        logger.error(`❌ Model ${config.displayName} test error:`, error);
        results[config.name] = false;
      }
    }
    
    return results;
  }

  /**
   * Shutdown Ollama manager gracefully
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('🛑 Shutting down Ollama Manager...');
      
      // Clear request queue
      this.requestQueue = [];
      
      // Unload all models
      for (const modelName of this.loadedModels.keys()) {
        await this.unloadModel(modelName);
      }
      
      this.isInitialized = false;
      
      logger.info('✅ Ollama Manager shutdown completed');
      
    } catch (error) {
      logger.error('❌ Error during Ollama Manager shutdown:', error);
      throw error;
    }
  }
}

// Export types
export type {
  OllamaModelConfig,
  ModelPerformanceMetrics,
  AIAnalysisRequest,
  AIAnalysisResponse,
  ConfluenceScore
};