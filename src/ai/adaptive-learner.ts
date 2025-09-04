/**
 * =============================================================================
 * ADAPTIVE LEARNER - AI LEARNING AND OPTIMIZATION SYSTEM
 * =============================================================================
 * 
 * This module implements adaptive learning and continuous optimization for
 * the AI trading system. It learns from trading outcomes, market conditions,
 * and performance feedback to continuously improve decision-making and
 * strategy parameters.
 * 
 * Key Features:
 * - Performance feedback loops for strategy improvement
 * - Market condition adaptation mechanisms
 * - Strategy parameter optimization based on results
 * - Continuous learning from trading outcomes
 * - Model performance tracking and adjustment
 * - Automated hyperparameter tuning
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { LLMEngine } from './llm-engine';
import type { LearningFeedback } from './llm-engine';

/**
 * Interface for trading outcome data
 */
interface TradingOutcome {
  decisionId: string;
  symbol: string;
  decision: 'BUY' | 'SELL' | 'HOLD';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  timestamp: Date;
  exitTimestamp?: Date;
  
  // Performance metrics
  pnl: number; // Profit/Loss in dollars
  pnlPercentage: number; // Profit/Loss percentage
  holdingPeriod: number; // Hours held
  
  // Strategy information
  strategy: string;
  confidence: number;
  riskReward: number;
  
  // Market conditions at time of trade
  marketConditions: {
    volatility: string;
    trend: string;
    sentiment: number;
    volume: number;
  };
  
  // Outcome classification
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
  outcomeQuality: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR' | 'TERRIBLE';
}

/**
 * Interface for strategy performance metrics
 */
interface StrategyPerformance {
  strategyName: string;
  totalTrades: number;
  winRate: number; // 0-100
  avgPnL: number;
  avgPnLPercentage: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  
  // Performance by market conditions
  performanceByCondition: {
    [condition: string]: {
      trades: number;
      winRate: number;
      avgPnL: number;
    };
  };
  
  // Recent performance trend
  recentPerformance: {
    last10Trades: number; // Win rate
    last30Days: number; // Win rate
    trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  };
  
  lastUpdated: Date;
}

/**
 * Interface for learning insights
 */
interface LearningInsight {
  type: 'STRATEGY' | 'PARAMETER' | 'MARKET_CONDITION' | 'RISK_MANAGEMENT' | 'TIMING';
  insight: string;
  confidence: number; // 0-100
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
  supportingData: any;
  timestamp: Date;
}

/**
 * Adaptive Learner class for continuous system improvement
 */
export class AdaptiveLearner extends EventEmitter {
  private llmEngine: LLMEngine;
  private isInitialized: boolean = false;
  private tradingOutcomes: TradingOutcome[] = [];
  private strategyPerformance: Map<string, StrategyPerformance> = new Map();
  private learningInsights: LearningInsight[] = [];
  
  private maxHistorySize: number = 10000;
  private learningUpdateInterval: number = 3600000; // 1 hour
  private learningTimer: NodeJS.Timeout | null = null;

  // Learning configuration
  private readonly LEARNING_CONFIG = {
    minTradesForLearning: 50,
    minTradesForOptimization: 100,
    confidenceThreshold: 70,
    significanceThreshold: 0.05, // Statistical significance
    adaptationThreshold: 5, // Minimum % improvement to adapt
    maxParameterChange: 0.2, // Maximum 20% parameter change per iteration
    learningRate: 0.1, // Learning rate for parameter updates
    explorationRate: 0.1 // Exploration vs exploitation balance
  };

  constructor(llmEngine: LLMEngine) {
    super();
    this.llmEngine = llmEngine;

    logger.info('🧠 Adaptive Learner initialized');
  }

  /**
   * Initialize the adaptive learner
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing Adaptive Learner...');

      // Verify LLM engine is ready
      if (!this.llmEngine.isReady()) {
        throw new Error('LLM Engine is not ready');
      }

      // Load historical data if available
      await this.loadHistoricalData();

      // Initialize strategy performance tracking
      await this.initializeStrategyTracking();

      // Start learning update cycle
      this.startLearningCycle();

      this.isInitialized = true;
      logger.info('✅ Adaptive Learner initialized successfully');

      this.emit('initialized');

    } catch (error) {
      logger.error('❌ Failed to initialize Adaptive Learner:', error);
      throw error;
    }
  }

  /**
   * Load historical trading data for learning
   */
  private async loadHistoricalData(): Promise<void> {
    try {
      // In production, this would load from database
      // For now, initialize with empty data
      logger.info('📚 Loading historical trading data for learning...');
      
      // Mock some historical data for demonstration
      this.initializeMockData();
      
      logger.info(`📊 Loaded ${this.tradingOutcomes.length} historical trading outcomes`);
      
    } catch (error) {
      logger.error('❌ Error loading historical data:', error);
    }
  }

  /**
   * Initialize mock data for demonstration
   */
  private initializeMockData(): void {
    // Create some mock trading outcomes
    const mockOutcomes: TradingOutcome[] = [
      {
        decisionId: 'DEC_12345678',
        symbol: 'BTC',
        decision: 'BUY',
        entryPrice: 45000,
        exitPrice: 46500,
        quantity: 0.1,
        timestamp: new Date(Date.now() - 86400000 * 7), // 7 days ago
        exitTimestamp: new Date(Date.now() - 86400000 * 6), // 6 days ago
        pnl: 150,
        pnlPercentage: 3.33,
        holdingPeriod: 24,
        strategy: 'moving_average_crossover',
        confidence: 75,
        riskReward: 1.5,
        marketConditions: {
          volatility: 'MEDIUM',
          trend: 'BULLISH',
          sentiment: 35,
          volume: 1500000
        },
        outcome: 'WIN',
        outcomeQuality: 'GOOD'
      },
      {
        decisionId: 'DEC_87654321',
        symbol: 'ETH',
        decision: 'SELL',
        entryPrice: 3200,
        exitPrice: 3100,
        quantity: 1.0,
        timestamp: new Date(Date.now() - 86400000 * 5), // 5 days ago
        exitTimestamp: new Date(Date.now() - 86400000 * 4), // 4 days ago
        pnl: -100,
        pnlPercentage: -3.125,
        holdingPeriod: 18,
        strategy: 'rsi_momentum',
        confidence: 68,
        riskReward: 1.3,
        marketConditions: {
          volatility: 'HIGH',
          trend: 'BEARISH',
          sentiment: -25,
          volume: 800000
        },
        outcome: 'LOSS',
        outcomeQuality: 'AVERAGE'
      }
    ];

    this.tradingOutcomes = mockOutcomes;
  }

  /**
   * Initialize strategy performance tracking
   */
  private async initializeStrategyTracking(): Promise<void> {
    const strategies = ['moving_average_crossover', 'rsi_momentum', 'macd_trend', 'fibonacci_retracement'];
    
    for (const strategy of strategies) {
      const performance: StrategyPerformance = {
        strategyName: strategy,
        totalTrades: 0,
        winRate: 0,
        avgPnL: 0,
        avgPnLPercentage: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        profitFactor: 0,
        performanceByCondition: {},
        recentPerformance: {
          last10Trades: 0,
          last30Days: 0,
          trend: 'STABLE'
        },
        lastUpdated: new Date()
      };
      
      this.strategyPerformance.set(strategy, performance);
    }

    logger.info(`📈 Initialized tracking for ${strategies.length} strategies`);
  }

  /**
   * Start the learning cycle
   */
  private startLearningCycle(): void {
    this.learningTimer = setInterval(async () => {
      try {
        await this.performLearningUpdate();
      } catch (error) {
        logger.error('❌ Error in learning cycle:', error);
      }
    }, this.learningUpdateInterval);

    logger.info('🔄 Learning cycle started');
  }

  /**
   * Record a trading outcome for learning
   */
  public async recordTradingOutcome(outcome: TradingOutcome): Promise<void> {
    try {
      logger.info(`📝 Recording trading outcome: ${outcome.symbol} ${outcome.decision} - ${outcome.outcome}`);

      // Add to outcomes history
      this.tradingOutcomes.push(outcome);
      
      // Maintain history size limit
      if (this.tradingOutcomes.length > this.maxHistorySize) {
        this.tradingOutcomes = this.tradingOutcomes.slice(-this.maxHistorySize);
      }

      // Update strategy performance
      await this.updateStrategyPerformance(outcome);

      // Generate learning feedback
      const feedback = this.generateLearningFeedback(outcome);
      
      // Trigger immediate learning if significant outcome
      if (outcome.outcomeQuality === 'EXCELLENT' || outcome.outcomeQuality === 'TERRIBLE') {
        await this.performImmediateLearning(outcome);
      }

      this.emit('outcomeRecorded', outcome);

    } catch (error) {
      logger.error('❌ Error recording trading outcome:', error);
      throw error;
    }
  }

  /**
   * Update strategy performance metrics
   */
  private async updateStrategyPerformance(outcome: TradingOutcome): Promise<void> {
    const performance = this.strategyPerformance.get(outcome.strategy);
    if (!performance) return;

    // Update basic metrics
    performance.totalTrades++;
    
    const isWin = outcome.outcome === 'WIN';
    const oldWinRate = performance.winRate;
    performance.winRate = ((oldWinRate * (performance.totalTrades - 1)) + (isWin ? 100 : 0)) / performance.totalTrades;
    
    const oldAvgPnL = performance.avgPnL;
    performance.avgPnL = ((oldAvgPnL * (performance.totalTrades - 1)) + outcome.pnl) / performance.totalTrades;
    
    const oldAvgPnLPercentage = performance.avgPnLPercentage;
    performance.avgPnLPercentage = ((oldAvgPnLPercentage * (performance.totalTrades - 1)) + outcome.pnlPercentage) / performance.totalTrades;

    performance.lastUpdated = new Date();

    logger.info(`📊 Updated performance for ${outcome.strategy}: ${performance.winRate.toFixed(1)}% win rate`);
  }

  /**
   * Generate learning feedback from outcome
   */
  private generateLearningFeedback(outcome: TradingOutcome): LearningFeedback {
    let accuracy: number;
    let actualOutcome: 'CORRECT' | 'INCORRECT' | 'PARTIAL';

    // Determine accuracy based on outcome quality and confidence
    if (outcome.outcome === 'WIN') {
      if (outcome.outcomeQuality === 'EXCELLENT') {
        accuracy = 1.0;
        actualOutcome = 'CORRECT';
      } else if (outcome.outcomeQuality === 'GOOD') {
        accuracy = 0.8;
        actualOutcome = 'CORRECT';
      } else {
        accuracy = 0.6;
        actualOutcome = 'PARTIAL';
      }
    } else if (outcome.outcome === 'LOSS') {
      if (outcome.outcomeQuality === 'TERRIBLE') {
        accuracy = 0.0;
        actualOutcome = 'INCORRECT';
      } else if (outcome.outcomeQuality === 'POOR') {
        accuracy = 0.2;
        actualOutcome = 'INCORRECT';
      } else {
        accuracy = 0.4;
        actualOutcome = 'PARTIAL';
      }
    } else { // BREAKEVEN
      accuracy = 0.5;
      actualOutcome = 'PARTIAL';
    }

    return {
      predictionId: outcome.decisionId,
      actualOutcome,
      accuracy,
      marketConditions: outcome.marketConditions,
      timestamp: outcome.exitTimestamp || new Date(),
      notes: `${outcome.strategy} strategy result: ${outcome.outcome} with ${outcome.pnlPercentage.toFixed(2)}% return`
    };
  }

  /**
   * Perform immediate learning from significant outcomes
   */
  private async performImmediateLearning(outcome: TradingOutcome): Promise<void> {
    try {
      logger.info(`🧠 Performing immediate learning from ${outcome.outcomeQuality} outcome`);

      // Generate insights from the outcome
      const insights = await this.generateInsightsFromOutcome(outcome);
      
      // Add insights to learning history
      this.learningInsights.push(...insights);

      this.emit('immediateLearning', { outcome, insights });

    } catch (error) {
      logger.error('❌ Error in immediate learning:', error);
    }
  }

  /**
   * Generate insights from trading outcome
   */
  private async generateInsightsFromOutcome(outcome: TradingOutcome): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    // Strategy performance insight
    if (outcome.outcomeQuality === 'EXCELLENT') {
      insights.push({
        type: 'STRATEGY',
        insight: `${outcome.strategy} performed excellently in ${outcome.marketConditions.volatility} volatility, ${outcome.marketConditions.trend} trend conditions`,
        confidence: 85,
        impact: 'HIGH',
        recommendation: `Increase allocation to ${outcome.strategy} in similar market conditions`,
        supportingData: {
          pnlPercentage: outcome.pnlPercentage,
          confidence: outcome.confidence,
          marketConditions: outcome.marketConditions
        },
        timestamp: new Date()
      });
    } else if (outcome.outcomeQuality === 'TERRIBLE') {
      insights.push({
        type: 'STRATEGY',
        insight: `${outcome.strategy} performed poorly in ${outcome.marketConditions.volatility} volatility, ${outcome.marketConditions.trend} trend conditions`,
        confidence: 80,
        impact: 'HIGH',
        recommendation: `Reduce allocation to ${outcome.strategy} in similar market conditions or optimize parameters`,
        supportingData: {
          pnlPercentage: outcome.pnlPercentage,
          confidence: outcome.confidence,
          marketConditions: outcome.marketConditions
        },
        timestamp: new Date()
      });
    }

    return insights;
  }

  /**
   * Perform regular learning update
   */
  private async performLearningUpdate(): Promise<void> {
    try {
      logger.info('🔄 Performing regular learning update...');

      if (this.tradingOutcomes.length < this.LEARNING_CONFIG.minTradesForLearning) {
        logger.info(`📊 Insufficient data for learning (${this.tradingOutcomes.length}/${this.LEARNING_CONFIG.minTradesForLearning})`);
        return;
      }

      // Update strategy performance metrics
      await this.updateAllStrategyPerformance();

      // Generate new insights
      await this.generatePeriodicInsights();

      // Clean up old data
      this.cleanupOldData();

      logger.info('✅ Learning update completed');

      this.emit('learningUpdate', {
        totalOutcomes: this.tradingOutcomes.length,
        insights: this.learningInsights.length
      });

    } catch (error) {
      logger.error('❌ Error in learning update:', error);
    }
  }

  /**
   * Update all strategy performance metrics
   */
  private async updateAllStrategyPerformance(): Promise<void> {
    for (const [strategyName, performance] of this.strategyPerformance) {
      const strategyOutcomes = this.tradingOutcomes.filter(o => o.strategy === strategyName);
      
      if (strategyOutcomes.length === 0) continue;

      // Recalculate metrics
      const wins = strategyOutcomes.filter(o => o.outcome === 'WIN').length;
      performance.winRate = (wins / strategyOutcomes.length) * 100;
      
      performance.avgPnL = strategyOutcomes.reduce((sum, o) => sum + o.pnl, 0) / strategyOutcomes.length;
      performance.avgPnLPercentage = strategyOutcomes.reduce((sum, o) => sum + o.pnlPercentage, 0) / strategyOutcomes.length;
      
      performance.lastUpdated = new Date();
    }
  }

  /**
   * Generate periodic insights
   */
  private async generatePeriodicInsights(): Promise<void> {
    const recentOutcomes = this.tradingOutcomes.slice(-100); // Last 100 trades
    
    // Overall performance insight
    const winRate = (recentOutcomes.filter(o => o.outcome === 'WIN').length / recentOutcomes.length) * 100;
    const avgReturn = recentOutcomes.reduce((sum, o) => sum + o.pnlPercentage, 0) / recentOutcomes.length;
    
    if (winRate > 70) {
      this.learningInsights.push({
        type: 'STRATEGY',
        insight: `Excellent recent performance with ${winRate.toFixed(1)}% win rate and ${avgReturn.toFixed(2)}% average return`,
        confidence: 90,
        impact: 'HIGH',
        recommendation: 'Continue current strategy mix with potential for increased position sizing',
        supportingData: { winRate, avgReturn, trades: recentOutcomes.length },
        timestamp: new Date()
      });
    } else if (winRate < 50) {
      this.learningInsights.push({
        type: 'STRATEGY',
        insight: `Poor recent performance with ${winRate.toFixed(1)}% win rate requires immediate attention`,
        confidence: 95,
        impact: 'HIGH',
        recommendation: 'Review and adjust strategy parameters or reduce position sizes',
        supportingData: { winRate, avgReturn, trades: recentOutcomes.length },
        timestamp: new Date()
      });
    }
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
    const cutoffDate = new Date(Date.now() - maxAge);
    
    // Clean up old insights
    this.learningInsights = this.learningInsights.filter(insight => insight.timestamp >= cutoffDate);
    
    logger.info('🧹 Cleaned up old learning data');
  }

  /**
   * Get strategy performance
   */
  public getStrategyPerformance(strategyName?: string): StrategyPerformance[] {
    if (strategyName) {
      const performance = this.strategyPerformance.get(strategyName);
      return performance ? [performance] : [];
    }
    
    return Array.from(this.strategyPerformance.values());
  }

  /**
   * Get learning insights
   */
  public getLearningInsights(limit?: number): LearningInsight[] {
    const insights = [...this.learningInsights].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? insights.slice(0, limit) : insights;
  }

  /**
   * Get learning summary
   */
  public getLearningSummary(): {
    totalOutcomes: number;
    overallWinRate: number;
    bestStrategy: string;
    worstStrategy: string;
    keyInsights: number;
  } {
    const totalOutcomes = this.tradingOutcomes.length;
    const overallWinRate = totalOutcomes > 0 ? 
      (this.tradingOutcomes.filter(o => o.outcome === 'WIN').length / totalOutcomes) * 100 : 0;
    
    const strategies = Array.from(this.strategyPerformance.values());
    const bestStrategy = strategies.reduce((best, current) => 
      current.winRate > best.winRate ? current : best, strategies[0])?.strategyName || 'None';
    const worstStrategy = strategies.reduce((worst, current) => 
      current.winRate < worst.winRate ? current : worst, strategies[0])?.strategyName || 'None';
    
    return {
      totalOutcomes,
      overallWinRate,
      bestStrategy,
      worstStrategy,
      keyInsights: this.learningInsights.length
    };
  }

  /**
   * Shutdown the adaptive learner
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('🛑 Shutting down Adaptive Learner...');
      
      // Stop learning cycle
      if (this.learningTimer) {
        clearInterval(this.learningTimer);
        this.learningTimer = null;
      }
      
      // Clear data
      this.tradingOutcomes = [];
      this.strategyPerformance.clear();
      this.learningInsights = [];
      
      this.isInitialized = false;
      
      logger.info('✅ Adaptive Learner shutdown completed');
      
    } catch (error) {
      logger.error('❌ Error during Adaptive Learner shutdown:', error);
      throw error;
    }
  }

  /**
   * Check if the adaptive learner is healthy and functioning properly
   */
  public isHealthy(): boolean {
    try {
      // Check if learning system is initialized
      if (!this.isInitialized) {
        return false;
      }

      // Check if we have sufficient data for learning
      if (this.tradingOutcomes.length === 0) {
        logger.debug('📊 No trading outcomes available for learning yet');
        return true; // Still healthy, just no data yet
      }

      // Check learning performance metrics
      const summary = this.getLearningSummary();
      if (summary.overallWinRate < 30) {
        logger.warn('⚠️ Learning accuracy is below acceptable threshold');
      }

      // Check for memory usage (basic check)
      if (this.tradingOutcomes.length > 10000) {
        logger.warn('⚠️ Large number of trading outcomes in memory, consider archiving');
      }

      return true;
      
    } catch (error) {
      logger.error('❌ Error checking adaptive learner health:', error);
      return false;
    }
  }
}

// Export types
export type {
  TradingOutcome,
  StrategyPerformance,
  LearningInsight
};