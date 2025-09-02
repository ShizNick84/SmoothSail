/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - AI ENGINE
 * =============================================================================
 * 
 * Core AI engine that provides intelligent market analysis, trade signal
 * generation, and adaptive learning capabilities using Google Gemini AI.
 * 
 * Features:
 * - Market sentiment analysis
 * - Trade signal generation
 * - Risk assessment
 * - Performance prediction
 * - Adaptive learning
 * - Anomaly detection
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { Logger } from '../core/logging/logger';
import { LLMEngine } from './llm-engine';
import { MarketAnalyzer } from './market-analyzer';
import { AnomalyDetector } from './anomaly-detector';
import { AdaptiveLearner } from './adaptive-learner';
import { ResourceMonitor } from './resource-monitor';

/**
 * AI Engine configuration interface
 */
export interface AIEngineConfig {
  llmProvider: 'google' | 'openai' | 'anthropic';
  modelName: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  enableLearning: boolean;
  enableAnomalyDetection: boolean;
  resourceLimits: {
    maxMemoryMB: number;
    maxCpuPercent: number;
  };
}

/**
 * Market analysis result interface
 */
export interface MarketAnalysis {
  symbol: string;
  timestamp: Date;
  sentiment: {
    score: number; // -1 to 1
    confidence: number; // 0 to 1
    factors: string[];
  };
  technicalAnalysis: {
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: number; // 0 to 1
    support: number;
    resistance: number;
    indicators: Record<string, number>;
  };
  fundamentalAnalysis: {
    score: number; // -1 to 1
    factors: string[];
  };
  prediction: {
    direction: 'up' | 'down' | 'sideways';
    confidence: number; // 0 to 1
    timeframe: string;
    targetPrice?: number;
  };
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    score: number; // 0 to 1
  };
}

/**
 * Trade signal interface
 */
export interface TradeSignal {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: number; // 0 to 1
  reasoning: string[];
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  positionSize?: number;
  timeframe: string;
  timestamp: Date;
}

/**
 * AI system health interface
 */
export interface AISystemHealth {
  isHealthy: boolean;
  components: {
    llmEngine: boolean;
    marketAnalyzer: boolean;
    anomalyDetector: boolean;
    adaptiveLearner: boolean;
    resourceMonitor: boolean;
  };
  performance: {
    responseTime: number;
    accuracy: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  lastUpdate: Date;
  errors: string[];
  warnings: string[];
}

/**
 * Main AI Engine class
 * Orchestrates all AI components and provides intelligent trading insights
 */
export class AIEngine extends EventEmitter {
  private logger: Logger;
  private config: AIEngineConfig;
  private llmEngine: LLMEngine;
  private marketAnalyzer: MarketAnalyzer;
  private anomalyDetector: AnomalyDetector;
  private adaptiveLearner: AdaptiveLearner;
  private resourceMonitor: ResourceMonitor;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private analysisInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: AIEngineConfig) {
    super();
    this.logger = new Logger('AIEngine');
    this.config = config;

    // Initialize AI components
    this.llmEngine = new LLMEngine({
      provider: config.llmProvider,
      modelName: config.modelName,
      apiKey: config.apiKey,
      maxTokens: config.maxTokens,
      temperature: config.temperature
    });

    this.marketAnalyzer = new MarketAnalyzer(this.llmEngine);
    this.anomalyDetector = new AnomalyDetector();
    this.adaptiveLearner = new AdaptiveLearner();
    this.resourceMonitor = new ResourceMonitor(config.resourceLimits);

    this.logger.info('AI Engine created', {
      provider: config.llmProvider,
      model: config.modelName,
      learningEnabled: config.enableLearning,
      anomalyDetectionEnabled: config.enableAnomalyDetection
    });
  }

  /**
   * Initialize the AI Engine
   * Sets up all AI components and validates connections
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('🤖 Initializing AI Engine...');

      // Initialize LLM engine
      await this.llmEngine.initialize();
      this.logger.info('✅ LLM engine initialized');

      // Initialize market analyzer
      await this.marketAnalyzer.initialize();
      this.logger.info('✅ Market analyzer initialized');

      // Initialize anomaly detector if enabled
      if (this.config.enableAnomalyDetection) {
        await this.anomalyDetector.initialize();
        this.logger.info('✅ Anomaly detector initialized');
      }

      // Initialize adaptive learner if enabled
      if (this.config.enableLearning) {
        await this.adaptiveLearner.initialize();
        this.logger.info('✅ Adaptive learner initialized');
      }

      // Initialize resource monitor
      await this.resourceMonitor.initialize();
      this.logger.info('✅ Resource monitor initialized');

      // Test AI capabilities
      await this.testAICapabilities();
      this.logger.info('✅ AI capabilities verified');

      this.isInitialized = true;
      this.logger.info('✅ AI Engine initialization complete');

      this.emit('initialized');

    } catch (error) {
      this.logger.error('❌ AI Engine initialization failed:', error);
      throw new Error(`AI Engine initialization failed: ${error}`);
    }
  }

  /**
   * Start AI operations
   * Begins continuous market analysis and learning
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AI Engine must be initialized before starting');
    }

    if (this.isRunning) {
      this.logger.warn('AI Engine is already running');
      return;
    }

    try {
      this.logger.info('🚀 Starting AI Engine...');

      // Start continuous market analysis
      this.startContinuousAnalysis();

      // Start health monitoring
      this.startHealthMonitoring();

      // Start resource monitoring
      await this.resourceMonitor.start();

      this.isRunning = true;
      this.logger.info('✅ AI Engine started successfully');

      this.emit('started');

    } catch (error) {
      this.logger.error('❌ Failed to start AI Engine:', error);
      throw error;
    }
  }

  /**
   * Stop AI operations
   * Gracefully shuts down all AI activities
   */
  async shutdown(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('AI Engine is not running');
      return;
    }

    try {
      this.logger.info('🛑 Shutting down AI Engine...');

      // Stop continuous analysis
      if (this.analysisInterval) {
        clearInterval(this.analysisInterval);
        this.analysisInterval = null;
      }

      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Stop resource monitoring
      await this.resourceMonitor.stop();

      // Save learning data if enabled
      if (this.config.enableLearning) {
        await this.adaptiveLearner.saveModel();
      }

      this.isRunning = false;
      this.logger.info('✅ AI Engine shutdown complete');

      this.emit('shutdown');

    } catch (error) {
      this.logger.error('❌ Error during AI Engine shutdown:', error);
      throw error;
    }
  }

  /**
   * Analyze market conditions for a specific symbol
   */
  async analyzeMarket(symbol: string, marketData: any): Promise<MarketAnalysis> {
    try {
      this.logger.debug(`Analyzing market for ${symbol}`);

      // Perform comprehensive market analysis
      const analysis = await this.marketAnalyzer.analyze(symbol, marketData);

      // Check for anomalies if enabled
      if (this.config.enableAnomalyDetection) {
        const anomalies = await this.anomalyDetector.detectAnomalies(marketData);
        if (anomalies.length > 0) {
          analysis.riskAssessment.level = 'high';
          analysis.riskAssessment.factors.push(...anomalies.map(a => a.description));
        }
      }

      // Apply learning insights if enabled
      if (this.config.enableLearning) {
        const learningInsights = await this.adaptiveLearner.getInsights(symbol);
        analysis.prediction.confidence *= learningInsights.confidenceMultiplier;
      }

      this.logger.debug(`Market analysis complete for ${symbol}`, {
        sentiment: analysis.sentiment.score,
        trend: analysis.technicalAnalysis.trend,
        prediction: analysis.prediction.direction
      });

      this.emit('marketAnalysis', analysis);
      return analysis;

    } catch (error) {
      this.logger.error(`Market analysis failed for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Generate trading signal based on market analysis
   */
  async generateTradeSignal(symbol: string, marketData: any): Promise<TradeSignal> {
    try {
      this.logger.debug(`Generating trade signal for ${symbol}`);

      // Get market analysis
      const analysis = await this.analyzeMarket(symbol, marketData);

      // Generate trade signal based on analysis
      const signal: TradeSignal = {
        symbol,
        action: 'hold',
        confidence: 0,
        reasoning: [],
        timeframe: '1h',
        timestamp: new Date()
      };

      // Determine action based on analysis
      if (analysis.sentiment.score > 0.3 && analysis.technicalAnalysis.trend === 'bullish') {
        signal.action = 'buy';
        signal.confidence = Math.min(analysis.sentiment.confidence, analysis.prediction.confidence);
        signal.reasoning.push('Bullish sentiment and technical trend');
        signal.entryPrice = marketData.price;
        signal.stopLoss = marketData.price * (1 - 0.02); // 2% stop loss
        signal.takeProfit = marketData.price * (1 + 0.06); // 6% take profit
      } else if (analysis.sentiment.score < -0.3 && analysis.technicalAnalysis.trend === 'bearish') {
        signal.action = 'sell';
        signal.confidence = Math.min(analysis.sentiment.confidence, analysis.prediction.confidence);
        signal.reasoning.push('Bearish sentiment and technical trend');
        signal.entryPrice = marketData.price;
        signal.stopLoss = marketData.price * (1 + 0.02); // 2% stop loss
        signal.takeProfit = marketData.price * (1 - 0.06); // 6% take profit
      }

      // Adjust confidence based on risk assessment
      if (analysis.riskAssessment.level === 'high') {
        signal.confidence *= 0.5;
        signal.reasoning.push('High risk detected - reduced confidence');
      }

      this.logger.debug(`Trade signal generated for ${symbol}`, {
        action: signal.action,
        confidence: signal.confidence
      });

      this.emit('tradeSignal', signal);
      return signal;

    } catch (error) {
      this.logger.error(`Trade signal generation failed for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Learn from trade results to improve future predictions
   */
  async learnFromTrade(tradeResult: any): Promise<void> {
    if (!this.config.enableLearning) {
      return;
    }

    try {
      await this.adaptiveLearner.learnFromTrade(tradeResult);
      this.logger.debug('Learning from trade result', {
        symbol: tradeResult.symbol,
        success: tradeResult.profitable
      });

    } catch (error) {
      this.logger.error('Learning from trade failed:', error);
    }
  }

  /**
   * Get AI system health status
   */
  async getSystemHealth(): Promise<AISystemHealth> {
    const health: AISystemHealth = {
      isHealthy: true,
      components: {
        llmEngine: false,
        marketAnalyzer: false,
        anomalyDetector: false,
        adaptiveLearner: false,
        resourceMonitor: false
      },
      performance: {
        responseTime: 0,
        accuracy: 0,
        memoryUsage: 0,
        cpuUsage: 0
      },
      lastUpdate: new Date(),
      errors: [],
      warnings: []
    };

    try {
      // Check component health
      health.components.llmEngine = await this.llmEngine.isHealthy();
      health.components.marketAnalyzer = this.marketAnalyzer.isHealthy();
      health.components.anomalyDetector = this.config.enableAnomalyDetection ? 
        this.anomalyDetector.isHealthy() : true;
      health.components.adaptiveLearner = this.config.enableLearning ? 
        this.adaptiveLearner.isHealthy() : true;
      health.components.resourceMonitor = this.resourceMonitor.isHealthy();

      // Get performance metrics
      const resourceStats = await this.resourceMonitor.getStats();
      health.performance.memoryUsage = resourceStats.memoryUsage;
      health.performance.cpuUsage = resourceStats.cpuUsage;
      health.performance.responseTime = await this.measureResponseTime();

      // Overall health
      health.isHealthy = Object.values(health.components).every(status => status);

      if (!health.isHealthy) {
        health.errors.push('One or more AI components are unhealthy');
      }

      // Check resource limits
      if (health.performance.memoryUsage > this.config.resourceLimits.maxMemoryMB) {
        health.warnings.push('Memory usage exceeds limit');
      }

      if (health.performance.cpuUsage > this.config.resourceLimits.maxCpuPercent) {
        health.warnings.push('CPU usage exceeds limit');
      }

    } catch (error) {
      health.isHealthy = false;
      health.errors.push(`Health check failed: ${error}`);
    }

    return health;
  }

  /**
   * Test AI capabilities
   */
  private async testAICapabilities(): Promise<void> {
    try {
      // Test LLM engine
      const testResponse = await this.llmEngine.generateResponse(
        'Analyze the current Bitcoin market sentiment in one sentence.'
      );

      if (!testResponse || testResponse.length < 10) {
        throw new Error('LLM engine test failed - invalid response');
      }

      this.logger.info('AI capabilities test passed');

    } catch (error) {
      this.logger.error('AI capabilities test failed:', error);
      throw new Error(`AI capabilities test failed: ${error}`);
    }
  }

  /**
   * Start continuous market analysis
   */
  private startContinuousAnalysis(): void {
    this.analysisInterval = setInterval(async () => {
      try {
        // Analyze major trading pairs
        const symbols = ['BTC_USDT', 'ETH_USDT'];
        
        for (const symbol of symbols) {
          // This would get real market data
          const mockMarketData = {
            symbol,
            price: 50000,
            volume: 1000000,
            timestamp: new Date()
          };

          await this.analyzeMarket(symbol, mockMarketData);
        }

      } catch (error) {
        this.logger.error('Continuous analysis error:', error);
      }
    }, 300000); // Analyze every 5 minutes

    this.logger.info('Continuous market analysis started');
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        if (!health.isHealthy) {
          this.logger.warn('AI system health check failed', health.errors);
          this.emit('healthWarning', health);
        }
      } catch (error) {
        this.logger.error('AI health monitoring error:', error);
      }
    }, 120000); // Check every 2 minutes

    this.logger.info('AI health monitoring started');
  }

  /**
   * Measure AI response time
   */
  private async measureResponseTime(): Promise<number> {
    const startTime = Date.now();
    try {
      await this.llmEngine.generateResponse('Test response time');
      return Date.now() - startTime;
    } catch (error) {
      return -1;
    }
  }

  /**
   * Get AI engine status for monitoring
   */
  getStatus(): {
    isRunning: boolean;
    isInitialized: boolean;
    learningEnabled: boolean;
    anomalyDetectionEnabled: boolean;
    timestamp: number;
  } {
    return {
      isRunning: this.isRunning,
      isInitialized: this.isInitialized,
      learningEnabled: this.config.enableLearning,
      anomalyDetectionEnabled: this.config.enableAnomalyDetection,
      timestamp: Date.now()
    };
  }
}

export default AIEngine;
