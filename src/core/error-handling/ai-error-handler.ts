/**
 * =============================================================================
 * AI/LLM ERROR HANDLING AND FALLBACKS
 * =============================================================================
 * 
 * Comprehensive error handling for AI model failures including:
 * - Model timeout and failure recovery
 * - Fallback mechanisms between different AI models
 * - Ollama service failure recovery
 * - Graceful degradation when AI services are unavailable
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { Logger } from '../logging/logger';
import { NotificationService } from '../notifications/notification-service';

export enum AIErrorType {
  MODEL_TIMEOUT = 'MODEL_TIMEOUT',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  OLLAMA_SERVICE_DOWN = 'OLLAMA_SERVICE_DOWN',
  INFERENCE_FAILED = 'INFERENCE_FAILED',
  CONTEXT_LIMIT_EXCEEDED = 'CONTEXT_LIMIT_EXCEEDED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  MEMORY_EXHAUSTED = 'MEMORY_EXHAUSTED',
  GPU_ERROR = 'GPU_ERROR',
  MODEL_LOADING_FAILED = 'MODEL_LOADING_FAILED'
}

export interface AIModel {
  name: string;
  type: 'local' | 'remote';
  endpoint?: string;
  capabilities: string[];
  priority: number;
  maxTokens: number;
  timeout: number;
  isAvailable: boolean;
  lastError?: Date;
  errorCount: number;
}

export interface AIRequest {
  id: string;
  prompt: string;
  context?: any;
  requiredCapabilities: string[];
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  fallbackAllowed: boolean;
}

export interface AIResponse {
  requestId: string;
  modelUsed: string;
  response: string;
  confidence?: number;
  processingTime: number;
  tokensUsed: number;
  fallbackUsed: boolean;
}

export class AIErrorHandler extends EventEmitter {
  private logger: Logger;
  private notificationService: NotificationService;
  private models: Map<string, AIModel> = new Map();
  private fallbackChains: Map<string, string[]> = new Map();
  private requestQueue: AIRequest[] = [];
  private processingRequests: Map<string, NodeJS.Timeout> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger = new Logger('AIErrorHandler');
    this.notificationService = new NotificationService();
    this.initializeModels();
    this.setupFallbackChains();
    this.startHealthMonitoring();
  }

  /**
   * Initialize available AI models
   */
  private initializeModels(): void {
    // Local Ollama models
    this.models.set('llama3.1', {
      name: 'llama3.1',
      type: 'local',
      endpoint: 'http://localhost:11434',
      capabilities: ['analysis', 'reasoning', 'trading'],
      priority: 1,
      maxTokens: 8192,
      timeout: 30000,
      isAvailable: true,
      errorCount: 0
    });

    this.models.set('codellama', {
      name: 'codellama',
      type: 'local',
      endpoint: 'http://localhost:11434',
      capabilities: ['code', 'analysis'],
      priority: 2,
      maxTokens: 4096,
      timeout: 25000,
      isAvailable: true,
      errorCount: 0
    });

    this.models.set('mistral', {
      name: 'mistral',
      type: 'local',
      endpoint: 'http://localhost:11434',
      capabilities: ['analysis', 'reasoning'],
      priority: 3,
      maxTokens: 4096,
      timeout: 20000,
      isAvailable: true,
      errorCount: 0
    });

    // Fallback simple model
    this.models.set('simple-fallback', {
      name: 'simple-fallback',
      type: 'local',
      endpoint: 'internal',
      capabilities: ['basic'],
      priority: 10,
      maxTokens: 1024,
      timeout: 5000,
      isAvailable: true,
      errorCount: 0
    });
  }

  /**
   * Setup fallback chains for different capabilities
   */
  private setupFallbackChains(): void {
    this.fallbackChains.set('trading', ['llama3.1', 'mistral', 'simple-fallback']);
    this.fallbackChains.set('analysis', ['llama3.1', 'codellama', 'mistral', 'simple-fallback']);
    this.fallbackChains.set('reasoning', ['llama3.1', 'mistral', 'simple-fallback']);
    this.fallbackChains.set('code', ['codellama', 'llama3.1', 'simple-fallback']);
    this.fallbackChains.set('basic', ['simple-fallback']);
  }

  /**
   * Process AI request with automatic fallback
   */
  async processRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Processing AI request: ${request.id}`, {
        capabilities: request.requiredCapabilities,
        fallbackAllowed: request.fallbackAllowed
      });

      // Find suitable model
      const model = await this.selectModel(request.requiredCapabilities);
      if (!model) {
        throw new Error('No suitable AI model available');
      }

      // Set timeout for request
      const timeoutId = setTimeout(() => {
        this.handleTimeout(request.id);
      }, request.timeout || model.timeout);

      this.processingRequests.set(request.id, timeoutId);

      try {
        // Attempt inference
        const response = await this.performInference(model, request);
        
        // Clear timeout
        clearTimeout(timeoutId);
        this.processingRequests.delete(request.id);

        // Reset error count on success
        model.errorCount = 0;
        model.lastError = undefined;

        const processingTime = Date.now() - startTime;
        
        this.logger.info(`AI request completed successfully`, {
          requestId: request.id,
          modelUsed: model.name,
          processingTime
        });

        return {
          requestId: request.id,
          modelUsed: model.name,
          response: response.text,
          confidence: response.confidence,
          processingTime,
          tokensUsed: response.tokensUsed,
          fallbackUsed: false
        };

      } catch (error) {
        // Clear timeout
        clearTimeout(timeoutId);
        this.processingRequests.delete(request.id);

        // Handle model error
        await this.handleModelError(model, error, request);

        // Attempt fallback if allowed
        if (request.fallbackAllowed) {
          return this.attemptFallback(request, model.name, startTime);
        }

        throw error;
      }

    } catch (error) {
      this.logger.error(`AI request failed: ${request.id}`, { error: error.message });
      
      // Return degraded response if possible
      if (request.fallbackAllowed) {
        return this.getDegradedResponse(request, Date.now() - startTime);
      }

      throw error;
    }
  }

  /**
   * Select best available model for capabilities
   */
  private async selectModel(capabilities: string[]): Promise<AIModel | null> {
    // Find models that support all required capabilities
    const suitableModels = Array.from(this.models.values())
      .filter(model => 
        model.isAvailable && 
        capabilities.every(cap => model.capabilities.includes(cap))
      )
      .sort((a, b) => a.priority - b.priority);

    if (suitableModels.length === 0) {
      // Try to find models with partial capability match
      const partialModels = Array.from(this.models.values())
        .filter(model => 
          model.isAvailable && 
          capabilities.some(cap => model.capabilities.includes(cap))
        )
        .sort((a, b) => a.priority - b.priority);

      return partialModels[0] || null;
    }

    return suitableModels[0];
  }

  /**
   * Perform inference with selected model
   */
  private async performInference(model: AIModel, request: AIRequest): Promise<any> {
    if (model.name === 'simple-fallback') {
      return this.getSimpleFallbackResponse(request);
    }

    // Check Ollama service health
    if (model.type === 'local') {
      const isHealthy = await this.checkOllamaHealth(model.endpoint!);
      if (!isHealthy) {
        throw new Error('Ollama service is not available');
      }
    }

    // Perform actual inference
    const response = await this.callModel(model, request);
    
    // Validate response
    if (!this.validateResponse(response)) {
      throw new Error('Invalid response from AI model');
    }

    return response;
  }

  /**
   * Call AI model API
   */
  private async callModel(model: AIModel, request: AIRequest): Promise<any> {
    const fetch = (await import('node-fetch')).default;
    
    const payload = {
      model: model.name,
      prompt: request.prompt,
      stream: false,
      options: {
        temperature: request.temperature || 0.7,
        num_predict: request.maxTokens || model.maxTokens
      }
    };

    const response = await fetch(`${model.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: model.timeout
    });

    if (!response.ok) {
      throw new Error(`Model API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      text: result.response,
      confidence: this.calculateConfidence(result),
      tokensUsed: result.eval_count || 0
    };
  }

  /**
   * Handle model errors and update availability
   */
  private async handleModelError(model: AIModel, error: any, request: AIRequest): Promise<void> {
    model.errorCount++;
    model.lastError = new Date();

    this.logger.error(`Model error: ${model.name}`, {
      error: error.message,
      errorCount: model.errorCount,
      requestId: request.id
    });

    // Determine error type
    let errorType = AIErrorType.INFERENCE_FAILED;
    if (error.message.includes('timeout')) {
      errorType = AIErrorType.MODEL_TIMEOUT;
    } else if (error.message.includes('not available') || error.message.includes('connection')) {
      errorType = AIErrorType.MODEL_UNAVAILABLE;
    } else if (error.message.includes('Ollama')) {
      errorType = AIErrorType.OLLAMA_SERVICE_DOWN;
    }

    // Mark model as unavailable after multiple failures
    if (model.errorCount >= 3) {
      model.isAvailable = false;
      this.logger.warn(`Marking model as unavailable: ${model.name}`);
      
      await this.notificationService.sendAlert({
        title: 'AI Model Unavailable',
        message: `Model ${model.name} marked as unavailable after ${model.errorCount} failures`,
        details: { errorType, lastError: error.message },
        priority: 'HIGH'
      });
    }

    // Emit error event
    this.emit('modelError', {
      model: model.name,
      errorType,
      error: error.message,
      errorCount: model.errorCount
    });
  }

  /**
   * Attempt fallback to alternative models
   */
  private async attemptFallback(request: AIRequest, failedModel: string, startTime: number): Promise<AIResponse> {
    this.logger.info(`Attempting fallback for request: ${request.id}`, { failedModel });

    // Get fallback chain for primary capability
    const primaryCapability = request.requiredCapabilities[0];
    const fallbackChain = this.fallbackChains.get(primaryCapability) || ['simple-fallback'];

    // Find next available model in chain
    const failedIndex = fallbackChain.indexOf(failedModel);
    const remainingModels = fallbackChain.slice(failedIndex + 1);

    for (const modelName of remainingModels) {
      const model = this.models.get(modelName);
      if (!model || !model.isAvailable) continue;

      try {
        this.logger.info(`Trying fallback model: ${modelName}`, { requestId: request.id });

        const response = await this.performInference(model, request);
        const processingTime = Date.now() - startTime;

        this.logger.info(`Fallback successful with model: ${modelName}`, { requestId: request.id });

        return {
          requestId: request.id,
          modelUsed: model.name,
          response: response.text,
          confidence: response.confidence,
          processingTime,
          tokensUsed: response.tokensUsed,
          fallbackUsed: true
        };

      } catch (fallbackError) {
        this.logger.warn(`Fallback model failed: ${modelName}`, { 
          error: fallbackError.message,
          requestId: request.id 
        });
        continue;
      }
    }

    // All fallbacks failed
    throw new Error('All fallback models failed');
  }

  /**
   * Get degraded response when all models fail
   */
  private getDegradedResponse(request: AIRequest, processingTime: number): AIResponse {
    let degradedResponse = 'AI services are currently unavailable. ';
    
    if (request.requiredCapabilities.includes('trading')) {
      degradedResponse += 'Trading decisions should be made manually or postponed.';
    } else if (request.requiredCapabilities.includes('analysis')) {
      degradedResponse += 'Analysis is not available at this time.';
    } else {
      degradedResponse += 'Please try again later.';
    }

    return {
      requestId: request.id,
      modelUsed: 'degraded-fallback',
      response: degradedResponse,
      confidence: 0,
      processingTime,
      tokensUsed: 0,
      fallbackUsed: true
    };
  }

  /**
   * Simple fallback response for basic queries
   */
  private getSimpleFallbackResponse(request: AIRequest): any {
    const responses = {
      trading: 'Unable to provide trading analysis. Please review market conditions manually.',
      analysis: 'Analysis service unavailable. Please check data manually.',
      reasoning: 'Reasoning service unavailable. Please make decisions based on available data.',
      code: 'Code analysis unavailable. Please review code manually.',
      basic: 'Service temporarily unavailable. Please try again later.'
    };

    const capability = request.requiredCapabilities[0] || 'basic';
    const response = responses[capability as keyof typeof responses] || responses.basic;

    return {
      text: response,
      confidence: 0.1,
      tokensUsed: response.length / 4 // Rough token estimate
    };
  }

  /**
   * Check Ollama service health
   */
  private async checkOllamaHealth(endpoint: string): Promise<boolean> {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate AI model response
   */
  private validateResponse(response: any): boolean {
    return response && 
           typeof response.text === 'string' && 
           response.text.length > 0 &&
           response.text.length < 50000; // Reasonable length limit
  }

  /**
   * Calculate confidence score for response
   */
  private calculateConfidence(result: any): number {
    // Simple confidence calculation based on response characteristics
    if (!result.response) return 0;
    
    const length = result.response.length;
    const hasNumbers = /\d/.test(result.response);
    const hasStructure = /[.!?]/.test(result.response);
    
    let confidence = 0.5; // Base confidence
    
    if (length > 50) confidence += 0.2;
    if (hasNumbers) confidence += 0.1;
    if (hasStructure) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Handle request timeout
   */
  private handleTimeout(requestId: string): void {
    this.logger.warn(`AI request timeout: ${requestId}`);
    this.processingRequests.delete(requestId);
    this.emit('requestTimeout', requestId);
  }

  /**
   * Start health monitoring for AI models
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 60000); // Check every minute

    this.logger.info('AI model health monitoring started');
  }

  /**
   * Perform health checks on all models
   */
  private async performHealthChecks(): Promise<void> {
    for (const [name, model] of this.models) {
      if (model.type === 'local' && model.endpoint !== 'internal') {
        const isHealthy = await this.checkOllamaHealth(model.endpoint!);
        
        if (isHealthy && !model.isAvailable && model.errorCount >= 3) {
          // Model recovered
          model.isAvailable = true;
          model.errorCount = 0;
          model.lastError = undefined;
          
          this.logger.info(`Model recovered: ${name}`);
          this.emit('modelRecovered', name);
        } else if (!isHealthy && model.isAvailable) {
          // Model became unhealthy
          model.errorCount++;
          if (model.errorCount >= 3) {
            model.isAvailable = false;
            this.logger.warn(`Model became unavailable: ${name}`);
          }
        }
      }
    }
  }

  /**
   * Get AI system status
   */
  getSystemStatus(): any {
    const models = Array.from(this.models.values()).map(model => ({
      name: model.name,
      type: model.type,
      isAvailable: model.isAvailable,
      errorCount: model.errorCount,
      lastError: model.lastError,
      capabilities: model.capabilities
    }));

    return {
      totalModels: models.length,
      availableModels: models.filter(m => m.isAvailable).length,
      models,
      activeRequests: this.processingRequests.size,
      queuedRequests: this.requestQueue.length,
      fallbackChains: Object.fromEntries(this.fallbackChains)
    };
  }

  /**
   * Shutdown AI error handler
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Clear all processing timeouts
    for (const timeout of this.processingRequests.values()) {
      clearTimeout(timeout);
    }
    this.processingRequests.clear();

    this.logger.info('AI error handler shutdown completed');
  }
}