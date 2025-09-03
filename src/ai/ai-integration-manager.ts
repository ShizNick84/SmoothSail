/**
 * =============================================================================
 * AI INTEGRATION MANAGER - COMPLETE AI/LLM SYSTEM ORCHESTRATION
 * =============================================================================
 * 
 * This module orchestrates the complete AI/LLM integration system, managing
 * all AI components and providing a unified interface for the trading system.
 * 
 * Components Managed:
 * - Ollama Manager: Multi-model LLM infrastructure
 * - Multi-Model Decision Engine: Trading decision fusion
 * - Enhanced Sentiment Analyzer: Multi-model sentiment analysis
 * - AI Strategy Optimizer: CodeLlama-powered strategy generation
 * - AI Confluence Engine: Decision fusion and model voting
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { SystemMonitor } from '@/infrastructure/system-monitor';
import { SecurityManager } from '@/security/security-manager';

// Import all AI components
import { OllamaManager } from './ollama-manager';
import { MultiModelDecisionEngine, TradingDecision, MarketDataInput } from './multi-model-decision-engine';
import { EnhancedSentimentAnalyzer, SentimentInput, AggregatedSentiment } from './enhanced-sentiment-analyzer';
import { AIStrategyOptimizer, StrategyGenerationRequest, GeneratedStrategy } from './ai-strategy-optimizer';
import { AIConfluenceEngine, ConfluenceDecision } from './ai-confluence-engine';

/**
 * Interface for AI system configuration
 */
interface AISystemConfig {
  ollama: {
    host: string;
    enabled: boolean;
  };
  fallback: {
    enableOpenAI: boolean;
    openAIApiKey?: string;
    openAIModel: string;
  };
  performance: {
    maxConcurrentRequests: number;
    requestTimeoutMs: number;
    enablePerformanceTracking: boolean;
  };
  models: {
    enableLlama: boolean;
    enableMistral: boolean;
    enableCodeLlama: boolean;
  };
}

/**
 * Interface for comprehensive AI analysis
 */
interface ComprehensiveAIAnalysis {
  symbol: string;
  tradingDecision: TradingDecision;
  confluenceDecision: ConfluenceDecision;
  sentimentAnalysis: AggregatedSentiment;
  recommendedStrategies: GeneratedStrategy[];
  overallRecommendation: {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  metadata: {
    processingTime: number;
    modelsUsed: string[];
    timestamp: Date;
  };
}

/**
 * AI Integration Manager - Central orchestrator for all AI components
 */
export class AIIntegrationManager extends EventEmitter {
  private systemMonitor: SystemMonitor;
  private securityManager: SecurityManager;
  private config: AISystemConfig;
  private isInitialized: boolean = false;

  // AI Components
  private ollamaManager: OllamaManager;
  private decisionEngine: MultiModelDecisionEngine;
  private sentimentAnalyzer: EnhancedSentimentAnalyzer;
  private strategyOptimizer: AIStrategyOptimizer;
  private confluenceEngine: AIConfluenceEngine;

  // Performance tracking
  private performanceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    averageResponseTime: 0,
    errorRate: 0,
    lastReset: new Date()
  };

  constructor(
    systemMonitor: SystemMonitor,
    securityManager: SecurityManager,
    config: AISystemConfig
  ) {
    super();
    this.systemMonitor = systemMonitor;
    this.securityManager = securityManager;
    this.config = config;

    logger.info('🤖 AI Integration Manager created');
  }

  /**
   * Initialize the complete AI system
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing AI Integration Manager...');

      // Initialize Ollama Manager first
      this.ollamaManager = new OllamaManager(this.systemMonitor, this.config.ollama.host);
      await this.ollamaManager.initialize();
      logger.info('✅ Ollama Manager initialized');

      // Initialize Decision Engine
      this.decisionEngine = new MultiModelDecisionEngine(this.ollamaManager, this.systemMonitor);
      await this.decisionEngine.initialize();
      logger.info('✅ Multi-Model Decision Engine initialized');

      // Initialize Sentiment Analyzer
      this.sentimentAnalyzer = new EnhancedSentimentAnalyzer(this.ollamaManager);
      await this.sentimentAnalyzer.initialize();
      logger.info('✅ Enhanced Sentiment Analyzer initialized');

      // Initialize Strategy Optimizer
      this.strategyOptimizer = new AIStrategyOptimizer(this.ollamaManager, this.systemMonitor);
      await this.strategyOptimizer.initialize();
      logger.info('✅ AI Strategy Optimizer initialized');

      // Initialize Confluence Engine
      this.confluenceEngine = new AIConfluenceEngine(
        this.ollamaManager,
        this.decisionEngine,
        this.sentimentAnalyzer,
        this.strategyOptimizer,
        this.systemMonitor,
        this.config.fallback
      );
      await this.confluenceEngine.initialize();
      logger.info('✅ AI Confluence Engine initialized');

      // Set up event listeners
      this.setupEventListeners();

      // Start performance monitoring
      this.startPerformanceMonitoring();

      this.isInitialized = true;
      logger.info('✅ AI Integration Manager fully initialized');

      this.emit('initialized');

    } catch (error) {
      logger.error('❌ Failed to initialize AI Integration Manager:', error);
      throw new Error(`AI Integration Manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive AI analysis for trading
   */
  public async generateComprehensiveAnalysis(
    marketData: MarketDataInput,
    sentimentInputs?: SentimentInput[],
    additionalContext?: Record<string, any>
  ): Promise<ComprehensiveAIAnalysis> {
    try {
      logger.info(`🧠 Generating comprehensive AI analysis for ${marketData.symbol}...`);

      const startTime = Date.now();
      this.performanceMetrics.totalRequests++;

      // Generate all analyses in parallel where possible
      const [
        tradingDecision,
        confluenceDecision,
        sentimentAnalysis
      ] = await Promise.all([
        // Trading decision from multi-model engine
        this.decisionEngine.generateTradingDecision(
          marketData,
          sentimentInputs ? { symbol: marketData.symbol, news: [], socialMedia: [] } : undefined,
          additionalContext
        ),

        // Confluence decision from all models
        this.confluenceEngine.generateConfluenceDecision(marketData, additionalContext),

        // Sentiment analysis if inputs provided
        sentimentInputs && sentimentInputs.length > 0
          ? this.sentimentAnalyzer.aggregateSentiment(sentimentInputs, marketData.symbol)
          : Promise.resolve(null)
      ]);

      // Generate recommended strategies based on market conditions
      const recommendedStrategies = await this.generateRecommendedStrategies(
        marketData,
        tradingDecision,
        confluenceDecision
      );

      // Generate overall recommendation
      const overallRecommendation = this.generateOverallRecommendation(
        tradingDecision,
        confluenceDecision,
        sentimentAnalysis
      );

      const processingTime = Date.now() - startTime;

      const analysis: ComprehensiveAIAnalysis = {
        symbol: marketData.symbol,
        tradingDecision,
        confluenceDecision,
        sentimentAnalysis: sentimentAnalysis || {
          symbol: marketData.symbol,
          timeframe: '1h',
          overallSentiment: 50,
          confidence: 0,
          trendDirection: 'STABLE',
          volatility: 0,
          sources: { news: [], social: [], analyst: [] },
          marketSignals: { buyPressure: 0, sellPressure: 0, fearLevel: 0, greedLevel: 0 },
          recommendations: [],
          lastUpdated: new Date()
        },
        recommendedStrategies,
        overallRecommendation,
        metadata: {
          processingTime,
          modelsUsed: this.getActiveModels(),
          timestamp: new Date()
        }
      };

      // Update performance metrics
      this.performanceMetrics.successfulRequests++;
      this.performanceMetrics.averageResponseTime = 
        (this.performanceMetrics.averageResponseTime + processingTime) / 2;

      logger.info(`✅ Comprehensive AI analysis completed for ${marketData.symbol} (${processingTime}ms)`);

      this.emit('analysisCompleted', analysis);

      return analysis;

    } catch (error) {
      logger.error('❌ Error generating comprehensive AI analysis:', error);
      this.performanceMetrics.errorRate = 
        (this.performanceMetrics.totalRequests - this.performanceMetrics.successfulRequests) / 
        this.performanceMetrics.totalRequests;
      throw error;
    }
  }

  /**
   * Generate recommended strategies based on analysis
   */
  private async generateRecommendedStrategies(
    marketData: MarketDataInput,
    tradingDecision: TradingDecision,
    confluenceDecision: ConfluenceDecision
  ): Promise<GeneratedStrategy[]> {
    try {
      // Determine strategy types based on market conditions and decisions
      const strategyTypes: StrategyGenerationRequest['strategyType'][] = [];

      // Add strategy types based on market conditions
      if (Math.abs(marketData.change24h) > 5) {
        strategyTypes.push('momentum');
      }
      
      if (tradingDecision.action !== 'HOLD') {
        strategyTypes.push('breakout');
      }

      if (confluenceDecision.consensusLevel < 70) {
        strategyTypes.push('mean_reversion');
      }

      // Generate strategies (limit to 2 to avoid overload)
      const strategies: GeneratedStrategy[] = [];
      
      for (const strategyType of strategyTypes.slice(0, 2)) {
        try {
          const request: StrategyGenerationRequest = {
            strategyType,
            marketConditions: {
              volatility: Math.abs(marketData.change24h) > 10 ? 'HIGH' : 
                         Math.abs(marketData.change24h) > 3 ? 'MEDIUM' : 'LOW',
              trend: marketData.change24h > 2 ? 'BULLISH' : 
                     marketData.change24h < -2 ? 'BEARISH' : 'SIDEWAYS',
              volume: 'MEDIUM' // Would need actual volume comparison
            },
            riskProfile: confluenceDecision.overallConfidence > 80 ? 'AGGRESSIVE' : 
                        confluenceDecision.overallConfidence > 60 ? 'MODERATE' : 'CONSERVATIVE',
            timeframe: '1h',
            symbols: [marketData.symbol],
            constraints: {
              maxDrawdown: 10,
              maxPositionSize: 5,
              minWinRate: 60,
              maxTrades: 10
            }
          };

          const strategy = await this.strategyOptimizer.generateStrategy(request);
          strategies.push(strategy);

        } catch (strategyError) {
          logger.warn(`⚠️ Failed to generate ${strategyType} strategy:`, strategyError);
        }
      }

      return strategies;

    } catch (error) {
      logger.error('❌ Error generating recommended strategies:', error);
      return [];
    }
  }

  /**
   * Generate overall recommendation from all analyses
   */
  private generateOverallRecommendation(
    tradingDecision: TradingDecision,
    confluenceDecision: ConfluenceDecision,
    sentimentAnalysis: AggregatedSentiment | null
  ): ComprehensiveAIAnalysis['overallRecommendation'] {
    // Collect all recommendations
    const decisions = [tradingDecision.action, confluenceDecision.finalDecision];
    const confidences = [tradingDecision.confidence, confluenceDecision.overallConfidence];

    // Add sentiment if available
    if (sentimentAnalysis) {
      if (sentimentAnalysis.overallSentiment > 60) {
        decisions.push('BUY');
      } else if (sentimentAnalysis.overallSentiment < 40) {
        decisions.push('SELL');
      } else {
        decisions.push('HOLD');
      }
      confidences.push(sentimentAnalysis.confidence);
    }

    // Count votes
    const voteCounts = { BUY: 0, SELL: 0, HOLD: 0 };
    decisions.forEach(decision => {
      voteCounts[decision]++;
    });

    // Determine final action
    const finalAction = Object.entries(voteCounts).reduce((a, b) => 
      voteCounts[a[0] as keyof typeof voteCounts] > voteCounts[b[0] as keyof typeof voteCounts] ? a : b
    )[0] as 'BUY' | 'SELL' | 'HOLD';

    // Calculate overall confidence
    const overallConfidence = Math.round(
      confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
    );

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    
    if (confluenceDecision.consensusLevel < 50) {
      riskLevel = 'HIGH';
    } else if (overallConfidence < 60) {
      riskLevel = 'MEDIUM';
    }

    if (confluenceDecision.riskAssessment.level === 'CRITICAL') {
      riskLevel = 'CRITICAL';
    }

    // Generate reasoning
    const reasoning = [
      `Trading engine recommends ${tradingDecision.action} (${tradingDecision.confidence}% confidence)`,
      `Confluence analysis suggests ${confluenceDecision.finalDecision} (${confluenceDecision.overallConfidence}% confidence)`,
      `Model consensus level: ${confluenceDecision.consensusLevel}%`
    ];

    if (sentimentAnalysis) {
      reasoning.push(`Market sentiment: ${sentimentAnalysis.overallSentiment}/100`);
    }

    return {
      action: finalAction,
      confidence: overallConfidence,
      reasoning,
      riskLevel
    };
  }

  /**
   * Get list of active AI models
   */
  private getActiveModels(): string[] {
    const models: string[] = [];
    
    if (this.config.models.enableLlama) models.push('llama3.1:8b');
    if (this.config.models.enableMistral) models.push('mistral:7b');
    if (this.config.models.enableCodeLlama) models.push('codellama:7b');
    
    return models;
  }

  /**
   * Set up event listeners for all AI components
   */
  private setupEventListeners(): void {
    // Ollama Manager events
    this.ollamaManager.on('modelLoaded', (data) => {
      logger.info(`📥 Model loaded: ${data.modelName}`);
      this.emit('modelLoaded', data);
    });

    this.ollamaManager.on('modelUnloaded', (data) => {
      logger.info(`📤 Model unloaded: ${data.modelName}`);
      this.emit('modelUnloaded', data);
    });

    // Decision Engine events
    this.decisionEngine.on('decisionGenerated', (decision) => {
      logger.debug(`🎯 Trading decision: ${decision.action} (${decision.confidence}%)`);
      this.emit('tradingDecision', decision);
    });

    // Sentiment Analyzer events
    this.sentimentAnalyzer.on('sentimentAnalyzed', (result) => {
      logger.debug(`💭 Sentiment analyzed: ${result.overallScore}`);
      this.emit('sentimentAnalyzed', result);
    });

    // Strategy Optimizer events
    this.strategyOptimizer.on('strategyGenerated', (strategy) => {
      logger.info(`🤖 Strategy generated: ${strategy.name}`);
      this.emit('strategyGenerated', strategy);
    });

    // Confluence Engine events
    this.confluenceEngine.on('confluenceDecisionGenerated', (decision) => {
      logger.info(`🧠 Confluence decision: ${decision.finalDecision} (${decision.overallConfidence}%)`);
      this.emit('confluenceDecision', decision);
    });
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    if (!this.config.performance.enablePerformanceTracking) {
      return;
    }

    setInterval(() => {
      const metrics = {
        ...this.performanceMetrics,
        modelPerformance: this.confluenceEngine.getModelPerformance(),
        systemResources: this.systemMonitor.getCurrentResources()
      };

      this.emit('performanceUpdate', metrics);

      // Reset metrics periodically
      const hoursSinceReset = (Date.now() - this.performanceMetrics.lastReset.getTime()) / (1000 * 60 * 60);
      if (hoursSinceReset > 24) {
        this.resetPerformanceMetrics();
      }

    }, 60000); // Every minute
  }

  /**
   * Reset performance metrics
   */
  private resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastReset: new Date()
    };
    
    logger.info('📊 Performance metrics reset');
  }

  /**
   * Get system health status
   */
  public async getSystemHealth(): Promise<{
    isHealthy: boolean;
    components: Record<string, boolean>;
    performance: typeof this.performanceMetrics;
    issues: string[];
  }> {
    const components = {
      ollamaManager: this.ollamaManager ? true : false,
      decisionEngine: this.decisionEngine ? true : false,
      sentimentAnalyzer: this.sentimentAnalyzer ? true : false,
      strategyOptimizer: this.strategyOptimizer ? true : false,
      confluenceEngine: this.confluenceEngine ? true : false
    };

    const issues: string[] = [];
    
    // Check component health
    Object.entries(components).forEach(([component, isHealthy]) => {
      if (!isHealthy) {
        issues.push(`${component} is not initialized`);
      }
    });

    // Check performance issues
    if (this.performanceMetrics.errorRate > 0.1) {
      issues.push(`High error rate: ${(this.performanceMetrics.errorRate * 100).toFixed(1)}%`);
    }

    if (this.performanceMetrics.averageResponseTime > 10000) {
      issues.push(`Slow response times: ${this.performanceMetrics.averageResponseTime}ms average`);
    }

    const isHealthy = Object.values(components).every(Boolean) && issues.length === 0;

    return {
      isHealthy,
      components,
      performance: this.performanceMetrics,
      issues
    };
  }

  /**
   * Get AI component instances (for direct access if needed)
   */
  public getComponents() {
    return {
      ollamaManager: this.ollamaManager,
      decisionEngine: this.decisionEngine,
      sentimentAnalyzer: this.sentimentAnalyzer,
      strategyOptimizer: this.strategyOptimizer,
      confluenceEngine: this.confluenceEngine
    };
  }

  /**
   * Update system configuration
   */
  public updateConfiguration(newConfig: Partial<AISystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('⚙️ AI system configuration updated');
    this.emit('configurationUpdated', this.config);
  }

  /**
   * Shutdown the entire AI system
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('🛑 Shutting down AI Integration Manager...');

      // Shutdown all components in reverse order
      if (this.confluenceEngine) {
        await this.confluenceEngine.shutdown();
      }

      if (this.strategyOptimizer) {
        await this.strategyOptimizer.shutdown();
      }

      if (this.sentimentAnalyzer) {
        await this.sentimentAnalyzer.shutdown();
      }

      if (this.decisionEngine) {
        await this.decisionEngine.shutdown();
      }

      if (this.ollamaManager) {
        await this.ollamaManager.shutdown();
      }

      this.isInitialized = false;

      logger.info('✅ AI Integration Manager shutdown completed');

      this.emit('shutdown');

    } catch (error) {
      logger.error('❌ Error during AI Integration Manager shutdown:', error);
      throw error;
    }
  }
}

// Export types
export type {
  AISystemConfig,
  ComprehensiveAIAnalysis
};