/**
 * =============================================================================
 * BACKTESTING ENGINE - REALISTIC EXECUTION SIMULATION
 * =============================================================================
 * 
 * This module implements a comprehensive backtesting engine that simulates
 * realistic trading execution with proper slippage, fees, and market impact.
 * The engine processes historical market data and executes trading strategies
 * to validate their performance under real market conditions.
 * 
 * CRITICAL FEATURES:
 * - NO MOCK DATA - only real historical market data
 * - Realistic execution simulation with slippage and fees
 * - Comprehensive risk management integration
 * - Strategy harmonization and signal processing
 * - Real-time progress tracking and reporting
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/core/logging/logger';
import { AuditService } from '@/security/audit-service';
import { HistoricalDataFetcher } from './historical-data-fetcher';
import { PerformanceCalculator } from './performance-calculator';
import { 
  BacktestConfig,
  BacktestResult,
  BacktestTrade,
  BacktestPortfolio,
  BacktestPosition,
  BacktestEngineState,
  BacktestProgress,
  HistoricalMarketData,
  ValidationRules,
  StrategyBacktestResult,
  DataValidationResult
} from './types';
import { TradingSignal, HarmonizedSignal } from '../strategies/types';
import { GateIOClient } from '../api/gate-io-client';

/**
 * Strategy interface for backtesting
 */
interface BacktestStrategy {
  name: string;
  generateSignals(marketData: HistoricalMarketData[]): Promise<TradingSignal[]>;
  harmonizeSignals?(signals: TradingSignal[]): Promise<HarmonizedSignal>;
}

/**
 * Execution simulation parameters
 */
interface ExecutionSimulation {
  slippage: number; // Percentage slippage
  marketImpact: number; // Additional impact for large orders
  latency: number; // Execution delay in milliseconds
  partialFills: boolean; // Allow partial order fills
  rejectProbability: number; // Probability of order rejection
}

/**
 * Comprehensive Backtesting Engine
 */
export class BacktestingEngine extends EventEmitter {
  private dataFetcher: HistoricalDataFetcher;
  private auditService: AuditService;
  private state: BacktestEngineState;
  private strategies: Map<string, BacktestStrategy>;
  private validationRules: ValidationRules;

  constructor(gateIOClient: GateIOClient) {
    super();
    
    this.dataFetcher = new HistoricalDataFetcher(gateIOClient);
    this.auditService = new AuditService();
    this.strategies = new Map();
    
    // Initialize state
    this.state = {
      currentTime: new Date(),
      portfolio: this.createInitialPortfolio(new Date(), 0),
      openPositions: new Map(),
      tradeHistory: [],
      signals: [],
      marketData: [],
      isRunning: false,
      progress: 0,
    };
    
    // Set validation rules
    this.validationRules = {
      minDataPoints: 100,
      maxGapMinutes: 60,
      requireRealData: true,
      minTradeAmount: 10,
      maxPositionSize: 0.1, // 10% of portfolio
      maxOpenPositions: 5,
      maxRiskPerTrade: 0.03, // 3%
      maxTotalRisk: 0.15, // 15%
      maxDrawdown: 0.2, // 20%
      minSharpeRatio: 0.5,
      minWinRate: 0.4, // 40%
      minProfitFactor: 1.2,
    };
    
    logger.info('🚀 Backtesting Engine initialized - REAL DATA ONLY');
  }

  /**
   * Register a trading strategy for backtesting
   */
  public registerStrategy(strategy: BacktestStrategy): void {
    this.strategies.set(strategy.name, strategy);
    logger.info(`📊 Strategy registered: ${strategy.name}`);
  }

  /**
   * Run comprehensive backtesting
   */
  public async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`🎯 Starting backtesting for ${config.symbol} from ${config.startDate.toISOString()} to ${config.endDate.toISOString()}`);
      
      // Validate configuration
      this.validateBacktestConfig(config);
      
      // Initialize state
      this.initializeBacktestState(config);
      
      // Fetch and validate historical data
      this.emit('progress', { status: 'INITIALIZING', progress: 0, message: 'Fetching historical data...' });
      const historicalData = await this.dataFetcher.fetchForBacktest(config);
      
      // Validate data quality
      const dataValidation = await this.dataFetcher.validateForBacktesting(historicalData, config);
      if (!dataValidation.isValid) {
        throw new Error(`Data validation failed: ${dataValidation.errors.join(', ')}`);
      }
      
      this.state.marketData = historicalData;
      logger.info(`📈 Loaded ${historicalData.length} historical data points`);
      
      // Generate trading signals for all strategies
      this.emit('progress', { status: 'RUNNING', progress: 10, message: 'Generating trading signals...' });
      const allSignals = await this.generateAllSignals(historicalData, config.strategies);
      
      // Run simulation
      this.emit('progress', { status: 'RUNNING', progress: 20, message: 'Running simulation...' });
      const portfolioHistory = await this.runSimulation(historicalData, allSignals, config);
      
      // Calculate performance metrics
      this.emit('progress', { status: 'RUNNING', progress: 80, message: 'Calculating performance metrics...' });
      const result = await this.calculateBacktestResults(config, portfolioHistory, dataValidation);
      
      // Log audit event
      await this.auditService.logSecurityEvent({
        type: 'BACKTEST_COMPLETED',
        severity: 'INFO',
        details: {
          symbol: config.symbol,
          duration: Date.now() - startTime,
          trades: result.trades.total,
          performance: result.performance,
        },
        timestamp: new Date(),
      });
      
      this.emit('progress', { status: 'COMPLETED', progress: 100, message: 'Backtesting completed successfully' });
      
      logger.info(`✅ Backtesting completed in ${Date.now() - startTime}ms`);
      logger.info(`📊 Results: ${result.trades.total} trades, ${result.performance.totalReturnPercentage.toFixed(2)}% return, ${result.performance.sharpeRatio.toFixed(2)} Sharpe ratio`);
      
      return result;
      
    } catch (error) {
      logger.error('❌ Backtesting failed:', error);
      
      await this.auditService.logSecurityEvent({
        type: 'BACKTEST_FAILED',
        severity: 'ERROR',
        details: {
          symbol: config.symbol,
          error: error.message,
          duration: Date.now() - startTime,
        },
        timestamp: new Date(),
      });
      
      this.emit('progress', { status: 'ERROR', progress: 0, message: `Backtesting failed: ${error.message}` });
      throw error;
      
    } finally {
      this.state.isRunning = false;
    }
  }

  /**
   * Generate signals from all registered strategies
   */
  private async generateAllSignals(
    historicalData: HistoricalMarketData[],
    strategyNames: string[]
  ): Promise<Map<string, TradingSignal[]>> {
    const allSignals = new Map<string, TradingSignal[]>();
    
    for (const strategyName of strategyNames) {
      const strategy = this.strategies.get(strategyName);
      if (!strategy) {
        logger.warn(`⚠️ Strategy not found: ${strategyName}`);
        continue;
      }
      
      try {
        logger.info(`🔄 Generating signals for strategy: ${strategyName}`);
        const signals = await strategy.generateSignals(historicalData);
        allSignals.set(strategyName, signals);
        logger.info(`✅ Generated ${signals.length} signals for ${strategyName}`);
        
      } catch (error) {
        logger.error(`❌ Failed to generate signals for ${strategyName}:`, error);
        allSignals.set(strategyName, []);
      }
    }
    
    return allSignals;
  }

  /**
   * Run the main simulation loop
   */
  private async runSimulation(
    historicalData: HistoricalMarketData[],
    allSignals: Map<string, TradingSignal[]>,
    config: BacktestConfig
  ): Promise<BacktestPortfolio[]> {
    const portfolioHistory: BacktestPortfolio[] = [];
    const executionSim: ExecutionSimulation = {
      slippage: config.slippage,
      marketImpact: 0.001, // 0.1% additional impact
      latency: 100, // 100ms execution delay
      partialFills: true,
      rejectProbability: 0.01, // 1% rejection rate
    };
    
    // Combine and sort all signals by timestamp
    const allSignalsList: Array<{ signal: TradingSignal; strategy: string }> = [];
    for (const [strategy, signals] of allSignals) {
      for (const signal of signals) {
        allSignalsList.push({ signal, strategy });
      }
    }
    allSignalsList.sort((a, b) => a.signal.timestamp.getTime() - b.signal.timestamp.getTime());
    
    let signalIndex = 0;
    let maxEquity = config.initialBalance;
    
    // Process each data point
    for (let i = 0; i < historicalData.length; i++) {
      const marketData = historicalData[i];
      this.state.currentTime = marketData.timestamp;
      
      // Update portfolio with current market prices
      this.updatePortfolioValues(marketData);
      
      // Process signals at current timestamp
      while (signalIndex < allSignalsList.length && 
             allSignalsList[signalIndex].signal.timestamp <= marketData.timestamp) {
        
        const { signal, strategy } = allSignalsList[signalIndex];
        await this.processSignal(signal, strategy, marketData, config, executionSim);
        signalIndex++;
      }
      
      // Update stop losses and take profits
      await this.updateStopLossesAndTakeProfits(marketData, config);
      
      // Calculate current portfolio state
      const currentPortfolio = this.calculateCurrentPortfolio(marketData, maxEquity);
      portfolioHistory.push(currentPortfolio);
      
      // Update max equity for drawdown calculation
      if (currentPortfolio.equity > maxEquity) {
        maxEquity = currentPortfolio.equity;
      }
      
      // Update progress
      const progress = 20 + Math.floor((i / historicalData.length) * 60);
      if (i % Math.floor(historicalData.length / 20) === 0) {
        this.emit('progress', { 
          status: 'RUNNING', 
          progress, 
          message: `Processing ${marketData.timestamp.toISOString()}...` 
        });
      }
      
      // Risk management checks
      if (currentPortfolio.drawdownPercentage > config.riskManagement.maxDrawdown * 100) {
        logger.warn(`⚠️ Maximum drawdown exceeded: ${currentPortfolio.drawdownPercentage.toFixed(2)}%`);
        // Close all positions in emergency
        await this.closeAllPositions(marketData, 'EMERGENCY_STOP');
      }
    }
    
    // Close any remaining open positions at the end
    if (this.state.openPositions.size > 0) {
      const lastMarketData = historicalData[historicalData.length - 1];
      await this.closeAllPositions(lastMarketData, 'END_OF_PERIOD');
      
      // Add final portfolio state
      const finalPortfolio = this.calculateCurrentPortfolio(lastMarketData, maxEquity);
      portfolioHistory.push(finalPortfolio);
    }
    
    return portfolioHistory;
  }

  /**
   * Process a trading signal
   */
  private async processSignal(
    signal: TradingSignal,
    strategy: string,
    marketData: HistoricalMarketData,
    config: BacktestConfig,
    executionSim: ExecutionSimulation
  ): Promise<void> {
    try {
      // Skip HOLD signals
      if (signal.type === 'HOLD') return;
      
      // Validate signal
      if (!this.validateSignal(signal, config)) {
        logger.debug(`⚠️ Signal validation failed for ${signal.id}`);
        return;
      }
      
      // Calculate position size based on risk management
      const positionSize = this.calculatePositionSize(signal, config, marketData);
      if (positionSize <= 0) {
        logger.debug(`⚠️ Position size too small for signal ${signal.id}`);
        return;
      }
      
      // Simulate execution with realistic conditions
      const executedTrade = await this.simulateExecution(
        signal,
        strategy,
        positionSize,
        marketData,
        config,
        executionSim
      );
      
      if (executedTrade) {
        this.state.tradeHistory.push(executedTrade);
        
        if (signal.type === 'BUY') {
          // Open new position
          const position: BacktestPosition = {
            symbol: signal.symbol,
            quantity: executedTrade.quantity,
            averagePrice: executedTrade.entryPrice,
            currentPrice: marketData.close,
            unrealizedPnL: 0,
            unrealizedPnLPercentage: 0,
            stopLoss: executedTrade.stopLoss,
            takeProfit: executedTrade.takeProfit,
            entryTime: executedTrade.entryTime,
            strategy,
          };
          
          this.state.openPositions.set(executedTrade.id, position);
          
        } else if (signal.type === 'SELL') {
          // Close existing position
          const positionId = this.findPositionToClose(signal.symbol);
          if (positionId) {
            this.state.openPositions.delete(positionId);
            
            // Update trade with exit information
            const tradeIndex = this.state.tradeHistory.findIndex(t => t.id === positionId);
            if (tradeIndex >= 0) {
              const trade = this.state.tradeHistory[tradeIndex];
              trade.exitPrice = executedTrade.entryPrice; // Exit price is entry price of sell order
              trade.exitTime = executedTrade.entryTime;
              trade.status = 'CLOSED';
              trade.exitReason = 'STRATEGY_EXIT';
              trade.pnl = this.calculateTradePnL(trade);
              trade.pnlPercentage = trade.pnl / (trade.entryPrice * trade.quantity) * 100;
            }
          }
        }
        
        logger.debug(`✅ Executed ${signal.type} signal for ${signal.symbol}: ${positionSize} @ ${executedTrade.entryPrice}`);
      }
      
    } catch (error) {
      logger.error(`❌ Failed to process signal ${signal.id}:`, error);
    }
  }

  /**
   * Simulate realistic trade execution
   */
  private async simulateExecution(
    signal: TradingSignal,
    strategy: string,
    positionSize: number,
    marketData: HistoricalMarketData,
    config: BacktestConfig,
    executionSim: ExecutionSimulation
  ): Promise<BacktestTrade | null> {
    // Simulate order rejection
    if (Math.random() < executionSim.rejectProbability) {
      logger.debug(`❌ Order rejected for signal ${signal.id}`);
      return null;
    }
    
    // Calculate execution price with slippage
    const basePrice = signal.type === 'BUY' ? marketData.close : marketData.close;
    const slippageAmount = basePrice * executionSim.slippage;
    const marketImpactAmount = basePrice * executionSim.marketImpact * Math.min(positionSize / 1000, 1);
    
    const executionPrice = signal.type === 'BUY' 
      ? basePrice + slippageAmount + marketImpactAmount
      : basePrice - slippageAmount - marketImpactAmount;
    
    // Calculate fees
    const feeRate = signal.type === 'BUY' ? config.fees.taker : config.fees.maker;
    const fees = positionSize * executionPrice * feeRate;
    
    // Calculate stop loss and take profit levels
    const stopLoss = signal.type === 'BUY' 
      ? executionPrice * (1 - config.riskManagement.stopLossPercentage)
      : executionPrice * (1 + config.riskManagement.stopLossPercentage);
    
    const riskAmount = Math.abs(executionPrice - stopLoss) * positionSize;
    const rewardAmount = riskAmount * config.riskManagement.minRiskRewardRatio;
    const takeProfit = signal.type === 'BUY'
      ? executionPrice + (rewardAmount / positionSize)
      : executionPrice - (rewardAmount / positionSize);
    
    // Create trade record
    const trade: BacktestTrade = {
      id: uuidv4(),
      symbol: signal.symbol,
      type: signal.type,
      quantity: positionSize,
      entryPrice: executionPrice,
      entryTime: new Date(marketData.timestamp.getTime() + executionSim.latency),
      strategy,
      signal,
      stopLoss,
      takeProfit,
      fees,
      slippage: slippageAmount,
      status: 'OPEN',
    };
    
    return trade;
  }

  /**
   * Update stop losses and take profits
   */
  private async updateStopLossesAndTakeProfits(
    marketData: HistoricalMarketData,
    config: BacktestConfig
  ): Promise<void> {
    const positionsToClose: string[] = [];
    
    for (const [positionId, position] of this.state.openPositions) {
      const currentPrice = marketData.close;
      
      // Check stop loss
      if ((position.quantity > 0 && currentPrice <= position.stopLoss) ||
          (position.quantity < 0 && currentPrice >= position.stopLoss)) {
        positionsToClose.push(positionId);
        
        // Update trade record
        const tradeIndex = this.state.tradeHistory.findIndex(t => t.id === positionId);
        if (tradeIndex >= 0) {
          const trade = this.state.tradeHistory[tradeIndex];
          trade.exitPrice = position.stopLoss;
          trade.exitTime = marketData.timestamp;
          trade.status = 'STOPPED';
          trade.exitReason = 'STOP_LOSS';
          trade.pnl = this.calculateTradePnL(trade);
          trade.pnlPercentage = trade.pnl / (trade.entryPrice * trade.quantity) * 100;
        }
        
        continue;
      }
      
      // Check take profit
      if ((position.quantity > 0 && currentPrice >= position.takeProfit) ||
          (position.quantity < 0 && currentPrice <= position.takeProfit)) {
        positionsToClose.push(positionId);
        
        // Update trade record
        const tradeIndex = this.state.tradeHistory.findIndex(t => t.id === positionId);
        if (tradeIndex >= 0) {
          const trade = this.state.tradeHistory[tradeIndex];
          trade.exitPrice = position.takeProfit;
          trade.exitTime = marketData.timestamp;
          trade.status = 'CLOSED';
          trade.exitReason = 'TAKE_PROFIT';
          trade.pnl = this.calculateTradePnL(trade);
          trade.pnlPercentage = trade.pnl / (trade.entryPrice * trade.quantity) * 100;
        }
      }
    }
    
    // Remove closed positions
    for (const positionId of positionsToClose) {
      this.state.openPositions.delete(positionId);
    }
  }

  /**
   * Close all open positions
   */
  private async closeAllPositions(marketData: HistoricalMarketData, reason: string): Promise<void> {
    for (const [positionId, position] of this.state.openPositions) {
      // Update trade record
      const tradeIndex = this.state.tradeHistory.findIndex(t => t.id === positionId);
      if (tradeIndex >= 0) {
        const trade = this.state.tradeHistory[tradeIndex];
        trade.exitPrice = marketData.close;
        trade.exitTime = marketData.timestamp;
        trade.status = 'CLOSED';
        trade.exitReason = reason as any;
        trade.pnl = this.calculateTradePnL(trade);
        trade.pnlPercentage = trade.pnl / (trade.entryPrice * trade.quantity) * 100;
      }
    }
    
    this.state.openPositions.clear();
    logger.info(`🔒 Closed all positions due to: ${reason}`);
  }

  /**
   * Calculate comprehensive backtest results
   */
  private async calculateBacktestResults(
    config: BacktestConfig,
    portfolioHistory: BacktestPortfolio[],
    dataValidation: DataValidationResult
  ): Promise<BacktestResult> {
    const period = {
      start: config.startDate,
      end: config.endDate,
      durationDays: (config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24),
    };
    
    // Calculate performance metrics
    const performance = PerformanceCalculator.calculatePerformanceMetrics(
      this.state.tradeHistory,
      portfolioHistory,
      config.initialBalance
    );
    
    // Calculate risk metrics
    const returns = this.calculateReturns(portfolioHistory);
    const risk = PerformanceCalculator.calculateRiskMetrics(returns);
    
    // Calculate trade statistics
    const trades = PerformanceCalculator.calculateTradeStatistics(this.state.tradeHistory);
    
    // Generate strategy performance breakdown
    const strategyPerformance = this.calculateStrategyPerformance(config.strategies);
    
    // Generate time series data
    const equityCurve = PerformanceCalculator.generateEquityCurve(portfolioHistory);
    const drawdownCurve = PerformanceCalculator.generateDrawdownCurve(portfolioHistory);
    const monthlyReturns = PerformanceCalculator.generateMonthlyReturns(portfolioHistory, this.state.tradeHistory);
    
    const result: BacktestResult = {
      config,
      period,
      trades,
      performance,
      risk,
      strategyPerformance,
      equityCurve,
      drawdownCurve,
      monthlyReturns,
      dataQuality: {
        totalDataPoints: dataValidation.totalPoints,
        validDataPoints: dataValidation.validPoints,
        dataIntegrityScore: dataValidation.integrityScore,
        gapsDetected: dataValidation.gaps.length,
        averageGapMinutes: dataValidation.gaps.length > 0 
          ? dataValidation.gaps.reduce((sum, gap) => sum + gap.durationMinutes, 0) / dataValidation.gaps.length
          : 0,
        dataSource: 'GATE_IO_REAL_DATA',
      },
      executionDetails: this.state.tradeHistory,
      portfolioHistory,
    };
    
    return result;
  }

  /**
   * Helper methods
   */
  private validateBacktestConfig(config: BacktestConfig): void {
    if (!config.symbol || config.symbol.trim() === '') {
      throw new Error('Symbol is required');
    }
    
    if (config.startDate >= config.endDate) {
      throw new Error('Start date must be before end date');
    }
    
    if (config.initialBalance <= 0) {
      throw new Error('Initial balance must be positive');
    }
    
    if (config.strategies.length === 0) {
      throw new Error('At least one strategy must be specified');
    }
    
    // Validate strategies exist
    for (const strategyName of config.strategies) {
      if (!this.strategies.has(strategyName)) {
        throw new Error(`Strategy not found: ${strategyName}`);
      }
    }
  }

  private initializeBacktestState(config: BacktestConfig): void {
    this.state = {
      currentTime: config.startDate,
      portfolio: this.createInitialPortfolio(config.startDate, config.initialBalance),
      openPositions: new Map(),
      tradeHistory: [],
      signals: [],
      marketData: [],
      isRunning: true,
      progress: 0,
    };
  }

  private createInitialPortfolio(timestamp: Date, balance: number): BacktestPortfolio {
    return {
      timestamp,
      balance,
      equity: balance,
      positions: [],
      totalPnL: 0,
      unrealizedPnL: 0,
      realizedPnL: 0,
      drawdown: 0,
      drawdownPercentage: 0,
      maxDrawdown: 0,
      maxDrawdownPercentage: 0,
    };
  }

  private validateSignal(signal: TradingSignal, config: BacktestConfig): boolean {
    // Check signal strength and confidence
    if (signal.strength < 50 || signal.confidence < 60) {
      return false;
    }
    
    // Check risk-reward ratio
    if (signal.riskReward < config.riskManagement.minRiskRewardRatio) {
      return false;
    }
    
    return true;
  }

  private calculatePositionSize(
    signal: TradingSignal,
    config: BacktestConfig,
    marketData: HistoricalMarketData
  ): number {
    const availableBalance = this.state.portfolio.balance;
    const riskAmount = availableBalance * config.riskManagement.maxRiskPerTrade;
    
    // Calculate position size based on stop loss distance
    const stopLossDistance = config.riskManagement.stopLossPercentage;
    const positionValue = riskAmount / stopLossDistance;
    const positionSize = positionValue / marketData.close;
    
    // Apply confidence-based sizing
    const confidenceMultiplier = signal.confidence / 100;
    const adjustedSize = positionSize * confidenceMultiplier;
    
    // Ensure minimum trade amount
    const minSize = config.riskManagement.maxRiskPerTrade * availableBalance / marketData.close;
    
    return Math.max(adjustedSize, minSize);
  }

  private updatePortfolioValues(marketData: HistoricalMarketData): void {
    // Update position values
    for (const [positionId, position] of this.state.openPositions) {
      if (position.symbol === marketData.symbol) {
        position.currentPrice = marketData.close;
        position.unrealizedPnL = (marketData.close - position.averagePrice) * position.quantity;
        position.unrealizedPnLPercentage = (position.unrealizedPnL / (position.averagePrice * Math.abs(position.quantity))) * 100;
      }
    }
  }

  private calculateCurrentPortfolio(marketData: HistoricalMarketData, maxEquity: number): BacktestPortfolio {
    const positions: BacktestPosition[] = Array.from(this.state.openPositions.values());
    const unrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    const realizedPnL = this.state.tradeHistory
      .filter(t => t.status === 'CLOSED' && t.pnl !== undefined)
      .reduce((sum, t) => sum + t.pnl!, 0);
    
    const equity = this.state.portfolio.balance + unrealizedPnL + realizedPnL;
    const drawdown = Math.max(0, maxEquity - equity);
    const drawdownPercentage = maxEquity > 0 ? (drawdown / maxEquity) * 100 : 0;
    
    return {
      timestamp: marketData.timestamp,
      balance: this.state.portfolio.balance,
      equity,
      positions,
      totalPnL: unrealizedPnL + realizedPnL,
      unrealizedPnL,
      realizedPnL,
      drawdown,
      drawdownPercentage,
      maxDrawdown: Math.max(this.state.portfolio.maxDrawdown, drawdown),
      maxDrawdownPercentage: Math.max(this.state.portfolio.maxDrawdownPercentage, drawdownPercentage),
    };
  }

  private calculateTradePnL(trade: BacktestTrade): number {
    if (!trade.exitPrice) return 0;
    
    const pnl = trade.type === 'BUY'
      ? (trade.exitPrice - trade.entryPrice) * trade.quantity
      : (trade.entryPrice - trade.exitPrice) * trade.quantity;
    
    return pnl - trade.fees;
  }

  private findPositionToClose(symbol: string): string | null {
    for (const [positionId, position] of this.state.openPositions) {
      if (position.symbol === symbol) {
        return positionId;
      }
    }
    return null;
  }

  private calculateReturns(portfolioHistory: BacktestPortfolio[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < portfolioHistory.length; i++) {
      const prevEquity = portfolioHistory[i - 1].equity;
      const currEquity = portfolioHistory[i].equity;
      
      if (prevEquity > 0) {
        const returnRate = (currEquity - prevEquity) / prevEquity;
        returns.push(returnRate);
      }
    }
    
    return returns;
  }

  private calculateStrategyPerformance(strategyNames: string[]): Record<string, StrategyBacktestResult> {
    const strategyPerformance: Record<string, StrategyBacktestResult> = {};
    
    for (const strategyName of strategyNames) {
      const strategyTrades = this.state.tradeHistory.filter(t => t.strategy === strategyName);
      const closedTrades = strategyTrades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
      
      const winningTrades = closedTrades.filter(t => t.pnl! > 0);
      const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
      
      const totalReturn = closedTrades.reduce((sum, t) => sum + t.pnl!, 0);
      const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl!, 0);
      const grossLoss = Math.abs(closedTrades.filter(t => t.pnl! < 0).reduce((sum, t) => sum + t.pnl!, 0));
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
      
      // Calculate average holding period
      const holdingPeriods = closedTrades
        .filter(t => t.exitTime)
        .map(t => (t.exitTime!.getTime() - t.entryTime.getTime()) / (1000 * 60 * 60)); // in hours
      const averageHoldingPeriod = holdingPeriods.length > 0 
        ? holdingPeriods.reduce((sum, h) => sum + h, 0) / holdingPeriods.length 
        : 0;
      
      strategyPerformance[strategyName] = {
        strategyName,
        trades: closedTrades.length,
        winRate,
        totalReturn,
        sharpeRatio: 0, // Would need returns series for each strategy
        maxDrawdown: 0, // Would need to track per-strategy drawdown
        profitFactor,
        averageHoldingPeriod,
        signalAccuracy: winRate / 100,
        contribution: 0, // Would need to calculate contribution to overall performance
      };
    }
    
    return strategyPerformance;
  }

  /**
   * Get current backtesting state
   */
  public getState(): BacktestEngineState {
    return { ...this.state };
  }

  /**
   * Stop running backtest
   */
  public stop(): void {
    this.state.isRunning = false;
    this.emit('progress', { status: 'CANCELLED', progress: 0, message: 'Backtesting cancelled by user' });
    logger.info('🛑 Backtesting stopped by user');
  }

  /**
   * Validate that only real data is used (no mock data)
   */
  private validateRealDataOnly(data: HistoricalMarketData[]): void {
    for (const point of data) {
      if (point.source !== 'GATE_IO' || !point.validated) {
        throw new Error(`Mock or invalid data detected: ${point.symbol} at ${point.timestamp.toISOString()}`);
      }
    }
    
    logger.info('✅ Real data validation passed - no mock data detected');
  }

  /**
   * Enhanced strategy validation with real data requirements
   */
  private validateStrategyWithRealData(
    strategy: BacktestStrategy,
    historicalData: HistoricalMarketData[]
  ): void {
    // Ensure strategy can handle real data format
    if (!strategy.generateSignals) {
      throw new Error(`Strategy ${strategy.name} missing generateSignals method`);
    }
    
    // Validate data integrity for strategy
    this.validateRealDataOnly(historicalData);
    
    logger.info(`✅ Strategy ${strategy.name} validated with real data`);
  }

  /**
   * Stop running backtest
   */
  public stop(): void {
    this.state.isRunning = false;
    this.emit('progress', { status: 'CANCELLED', progress: 0, message: 'Backtesting stopped by user' });
    logger.info('🛑 Backtesting stopped by user');
  }
}