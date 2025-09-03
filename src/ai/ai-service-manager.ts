/**
 * =============================================================================
 * AI SERVICE MANAGER WITH COMPREHENSIVE ERROR HANDLING
 * =============================================================================
 * 
 * Manages AI services with integrated error handling, fallbacks, and recovery.
 * Provides a unified interface for all AI operations with automatic error
 * recovery and graceful degradation.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { Logger } from '../core/logging/logger';
import { AIErrorHandler, AIRequest, AIResponse } from '../core/error-handling/ai-error-handler';
import { SystemErrorManager, SystemComponent } from '../core/error-handling/system-error-manager';

export interface TradingAnalysisRequest {
  marketData: any;
  symbol: string;
  timeframe: string;
  analysisType: 'technical' | 'sentiment' | 'risk' | 'signal';
  context?: any;
}

export interface TradingAnalysisResponse {
  analysis: string;
  confidence: number;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  signals: {
    action: 'buy' | 'sell' | 'hold';
    strength: number;
    reasoning: string;
  }[];
  processingTime: number;
  modelUsed: string;
  fallbackUsed: boolean;
}

export class AIServiceManager extends EventEmitter {
  private logger: Logger;
  private aiErrorHandler: AIErrorHandler;
  private systemErrorManager: SystemErrorManager;
  private isInitialized: boolean = false;
  private requestCounter: number = 0;

  constructor() {
    super();
    this.logger = new Logger('AIServiceManager');
    this.aiErrorHandler = new AIErrorHandler();
    this.systemErrorManager = new SystemErrorManager();
    this.setupErrorHandling();
  }

  /**
   * Initialize AI service manager
   */
  async initialize(): Promise<boolean> {
    try {
      this.logger.info('🤖 Initializing AI Service Manager...');

      // Check AI system health
      const systemStatus = this.aiErrorHandler.getSystemStatus();
      const availableModels = systemStatus.availableModels;

      if (availableModels === 0) {
        throw new Error('No AI models are available');
      }

      this.isInitialized = true;
      this.logger.info(`✅ AI Service Manager initialized with ${availableModels} available models`);

      return true;

    } catch (error) {
      this.logger.error('❌ Failed to initialize AI Service Manager:', error);
      
      await this.systemErrorManager.handleComponentError(SystemComponent.AI_SYSTEM, {
        type: 'INITIALIZATION_FAILED',
        severity: 'CRITICAL',
        message: 'AI Service Manager initialization failed',
        details: { error: error.message }
      });

      return false;
    }
  }

  /**
   * Perform trading analysis with comprehensive error handling
   */
  async performTradingAnalysis(request: TradingAnalysisRequest): Promise<TradingAnalysisResponse> {
    if (!this.isInitialized) {
      throw new Error('AI Service Manager not initialized');
    }

    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      this.logger.info(`🔍 Performing trading analysis: ${requestId}`, {
        symbol: request.symbol,
        analysisType: request.analysisType,
        timeframe: request.timeframe
      });

      // Create AI request
      const aiRequest: AIRequest = {
        id: requestId,
        prompt: this.buildAnalysisPrompt(request),
        requiredCapabilities: ['trading', 'analysis'],
        maxTokens: 2048,
        temperature: 0.3,
        timeout: 30000,
        fallbackAllowed: true,
        context: {
          symbol: request.symbol,
          analysisType: request.analysisType,
          timeframe: request.timeframe
        }
      };

      // Process request through AI error handler
      const aiResponse = await this.aiErrorHandler.processRequest(aiRequest);

      // Parse and validate response
      const analysisResponse = this.parseAnalysisResponse(aiResponse, request);

      this.logger.info(`✅ Trading analysis completed: ${requestId}`, {
        confidence: analysisResponse.confidence,
        modelUsed: analysisResponse.modelUsed,
        processingTime: analysisResponse.processingTime,
        fallbackUsed: analysisResponse.fallbackUsed
      });

      return analysisResponse;

    } catch (error) {
      this.logger.error(`❌ Trading analysis failed: ${requestId}`, { error: error.message });

      // Handle AI service error
      await this.systemErrorManager.handleComponentError(SystemComponent.AI_SYSTEM, {
        type: 'ANALYSIS_FAILED',
        severity: 'HIGH',
        message: 'Trading analysis failed',
        details: { 
          requestId, 
          request, 
          error: error.message 
        }
      });

      // Return degraded response
      return this.getDegradedAnalysisResponse(request, Date.now() - startTime);
    }
  }

  /**
   * Generate market sentiment analysis
   */
  async generateMarketSentiment(marketData: any, symbol: string): Promise<any> {
    const requestId = this.generateRequestId();

    try {
      const aiRequest: AIRequest = {
        id: requestId,
        prompt: this.buildSentimentPrompt(marketData, symbol),
        requiredCapabilities: ['analysis', 'reasoning'],
        maxTokens: 1024,
        temperature: 0.5,
        timeout: 20000,
        fallbackAllowed: true
      };

      const response = await this.aiErrorHandler.processRequest(aiRequest);
      
      return {
        sentiment: this.parseSentiment(response.response),
        confidence: response.confidence,
        modelUsed: response.modelUsed,
        fallbackUsed: response.fallbackUsed
      };

    } catch (error) {
      this.logger.error(`Market sentiment analysis failed: ${requestId}`, { error: error.message });
      
      return {
        sentiment: 'neutral',
        confidence: 0,
        modelUsed: 'fallback',
        fallbackUsed: true,
        error: 'Sentiment analysis unavailable'
      };
    }
  }

  /**
   * Generate trading signals
   */
  async generateTradingSignals(marketData: any, symbol: string, strategy: string): Promise<any> {
    const requestId = this.generateRequestId();

    try {
      const aiRequest: AIRequest = {
        id: requestId,
        prompt: this.buildSignalPrompt(marketData, symbol, strategy),
        requiredCapabilities: ['trading', 'reasoning'],
        maxTokens: 1536,
        temperature: 0.2,
        timeout: 25000,
        fallbackAllowed: true
      };

      const response = await this.aiErrorHandler.processRequest(aiRequest);
      
      return {
        signals: this.parseSignals(response.response),
        confidence: response.confidence,
        modelUsed: response.modelUsed,
        fallbackUsed: response.fallbackUsed
      };

    } catch (error) {
      this.logger.error(`Trading signal generation failed: ${requestId}`, { error: error.message });
      
      return {
        signals: [{ action: 'hold', strength: 0, reasoning: 'AI analysis unavailable' }],
        confidence: 0,
        modelUsed: 'fallback',
        fallbackUsed: true,
        error: 'Signal generation unavailable'
      };
    }
  }

  /**
   * Setup error handling listeners
   */
  private setupErrorHandling(): void {
    // Listen for AI model errors
    this.aiErrorHandler.on('modelError', (error) => {
      this.logger.warn('AI model error detected', error);
      this.emit('modelError', error);
    });

    // Listen for model recovery
    this.aiErrorHandler.on('modelRecovered', (modelName) => {
      this.logger.info(`AI model recovered: ${modelName}`);
      this.emit('modelRecovered', modelName);
    });

    // Listen for request timeouts
    this.aiErrorHandler.on('requestTimeout', (requestId) => {
      this.logger.warn(`AI request timeout: ${requestId}`);
      this.emit('requestTimeout', requestId);
    });

    // Listen for system error manager restart requests
    this.systemErrorManager.on('restartComponent', async (component: SystemComponent) => {
      if (component === SystemComponent.AI_SYSTEM) {
        await this.handleServiceRestart();
      }
    });
  }

  /**
   * Handle AI service restart
   */
  private async handleServiceRestart(): Promise<void> {
    try {
      this.logger.info('Handling AI service restart...');
      
      // Shutdown current AI error handler
      this.aiErrorHandler.shutdown();
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reinitialize
      this.aiErrorHandler = new AIErrorHandler();
      this.setupErrorHandling();
      
      // Reinitialize service
      await this.initialize();
      
      this.logger.info('AI service restart completed');
      
    } catch (error) {
      this.logger.error('AI service restart failed:', error);
      throw error;
    }
  }

  /**
   * Build analysis prompt for AI model
   */
  private buildAnalysisPrompt(request: TradingAnalysisRequest): string {
    const { marketData, symbol, timeframe, analysisType } = request;
    
    let prompt = `Perform ${analysisType} analysis for ${symbol} on ${timeframe} timeframe.\n\n`;
    
    prompt += `Market Data:\n`;
    prompt += `- Current Price: ${marketData.price}\n`;
    prompt += `- Volume: ${marketData.volume}\n`;
    prompt += `- 24h Change: ${marketData.change24h}%\n`;
    
    if (marketData.indicators) {
      prompt += `- RSI: ${marketData.indicators.rsi}\n`;
      prompt += `- MACD: ${marketData.indicators.macd}\n`;
      prompt += `- Moving Averages: ${JSON.stringify(marketData.indicators.ma)}\n`;
    }
    
    prompt += `\nProvide analysis in the following format:
    ANALYSIS: [detailed analysis]
    CONFIDENCE: [0-100]
    RECOMMENDATIONS: [list of recommendations]
    RISK_LEVEL: [low/medium/high]
    SIGNALS: [buy/sell/hold with strength 0-100 and reasoning]`;
    
    return prompt;
  }

  /**
   * Build sentiment analysis prompt
   */
  private buildSentimentPrompt(marketData: any, symbol: string): string {
    return `Analyze market sentiment for ${symbol} based on:
    - Price action: ${marketData.priceAction}
    - Volume trends: ${marketData.volumeTrends}
    - Market indicators: ${JSON.stringify(marketData.indicators)}
    
    Provide sentiment as: bullish, bearish, or neutral with reasoning.`;
  }

  /**
   * Build trading signal prompt
   */
  private buildSignalPrompt(marketData: any, symbol: string, strategy: string): string {
    return `Generate trading signals for ${symbol} using ${strategy} strategy:
    
    Market Data: ${JSON.stringify(marketData)}
    
    Provide signals in format:
    ACTION: [buy/sell/hold]
    STRENGTH: [0-100]
    REASONING: [explanation]`;
  }

  /**
   * Parse AI analysis response
   */
  private parseAnalysisResponse(aiResponse: AIResponse, request: TradingAnalysisRequest): TradingAnalysisResponse {
    const response = aiResponse.response;
    
    // Extract analysis components using regex patterns
    const analysisMatch = response.match(/ANALYSIS:\s*(.+?)(?=CONFIDENCE:|$)/s);
    const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)/);
    const recommendationsMatch = response.match(/RECOMMENDATIONS:\s*(.+?)(?=RISK_LEVEL:|$)/s);
    const riskLevelMatch = response.match(/RISK_LEVEL:\s*(low|medium|high)/i);
    const signalsMatch = response.match(/SIGNALS:\s*(.+?)$/s);
    
    return {
      analysis: analysisMatch?.[1]?.trim() || 'Analysis not available',
      confidence: aiResponse.confidence || (confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0.5),
      recommendations: this.parseRecommendations(recommendationsMatch?.[1] || ''),
      riskLevel: (riskLevelMatch?.[1]?.toLowerCase() as any) || 'medium',
      signals: this.parseSignals(signalsMatch?.[1] || ''),
      processingTime: aiResponse.processingTime,
      modelUsed: aiResponse.modelUsed,
      fallbackUsed: aiResponse.fallbackUsed
    };
  }

  /**
   * Parse recommendations from text
   */
  private parseRecommendations(text: string): string[] {
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, 5); // Limit to 5 recommendations
  }

  /**
   * Parse trading signals from text
   */
  private parseSignals(text: string): any[] {
    const actionMatch = text.match(/ACTION:\s*(buy|sell|hold)/i);
    const strengthMatch = text.match(/STRENGTH:\s*(\d+)/);
    const reasoningMatch = text.match(/REASONING:\s*(.+?)$/s);
    
    return [{
      action: actionMatch?.[1]?.toLowerCase() || 'hold',
      strength: strengthMatch ? parseInt(strengthMatch[1]) : 50,
      reasoning: reasoningMatch?.[1]?.trim() || 'No reasoning provided'
    }];
  }

  /**
   * Parse sentiment from response
   */
  private parseSentiment(response: string): string {
    const sentimentMatch = response.match(/(bullish|bearish|neutral)/i);
    return sentimentMatch?.[1]?.toLowerCase() || 'neutral';
  }

  /**
   * Get degraded analysis response when AI fails
   */
  private getDegradedAnalysisResponse(request: TradingAnalysisRequest, processingTime: number): TradingAnalysisResponse {
    return {
      analysis: `AI analysis is currently unavailable for ${request.symbol}. Please perform manual analysis or wait for service recovery.`,
      confidence: 0,
      recommendations: [
        'Verify market conditions manually',
        'Check technical indicators independently',
        'Consider postponing trading decisions',
        'Monitor for AI service recovery'
      ],
      riskLevel: 'high',
      signals: [{
        action: 'hold',
        strength: 0,
        reasoning: 'AI analysis unavailable - manual review required'
      }],
      processingTime,
      modelUsed: 'degraded-fallback',
      fallbackUsed: true
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `ai_req_${Date.now()}_${++this.requestCounter}`;
  }

  /**
   * Get AI service status
   */
  getServiceStatus(): any {
    const aiStatus = this.aiErrorHandler.getSystemStatus();
    
    return {
      isInitialized: this.isInitialized,
      totalModels: aiStatus.totalModels,
      availableModels: aiStatus.availableModels,
      activeRequests: aiStatus.activeRequests,
      queuedRequests: aiStatus.queuedRequests,
      models: aiStatus.models,
      fallbackChains: aiStatus.fallbackChains
    };
  }

  /**
   * Shutdown AI service manager
   */
  shutdown(): void {
    this.logger.info('Shutting down AI Service Manager...');
    
    this.aiErrorHandler.shutdown();
    this.isInitialized = false;
    
    this.logger.info('AI Service Manager shutdown completed');
  }
}