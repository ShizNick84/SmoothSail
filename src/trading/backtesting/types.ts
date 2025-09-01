/**
 * =============================================================================
 * BACKTESTING SYSTEM TYPES AND INTERFACES
 * =============================================================================
 * 
 * This module defines all TypeScript types and interfaces for the backtesting
 * system, ensuring type safety and proper data validation throughout the
 * backtesting process. NO MOCK DATA - only real historical market data.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { MarketData, TradingSignal, HarmonizedSignal } from '../strategies/types';

/**
 * Historical market data with validation metadata
 */
export interface HistoricalMarketData extends MarketData {
  validated: boolean;
  source: 'GATE_IO' | 'EXTERNAL';
  integrity: string; // Hash for data integrity verification
  fetchedAt: Date;
}

/**
 * Backtesting configuration parameters
 */
export interface BacktestConfig {
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialBalance: number;
  strategies: string[];
  riskManagement: {
    maxRiskPerTrade: number; // Percentage (2-3%)
    stopLossPercentage: number; // -1%
    minRiskRewardRatio: number; // 1.3:1
    maxDrawdown: number; // Maximum allowed drawdown
  };
  fees: {
    maker: number; // Gate.io maker fee
    taker: number; // Gate.io taker fee
  };
  slippage: number; // Expected slippage percentage
  dataValidation: {
    requireRealData: boolean; // Must be true - no mock data
    minDataPoints: number;
    maxGapMinutes: number; // Maximum gap between data points
  };
}

/**
 * Simulated trade execution for backtesting
 */
export interface BacktestTrade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  entryTime: Date;
  exitTime?: Date;
  strategy: string;
  signal: TradingSignal;
  stopLoss: number;
  takeProfit: number;
  fees: number;
  slippage: number;
  pnl?: number;
  pnlPercentage?: number;
  status: 'OPEN' | 'CLOSED' | 'STOPPED';
  exitReason?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'STRATEGY_EXIT' | 'END_OF_PERIOD';
}

/**
 * Portfolio state during backtesting
 */
export interface BacktestPortfolio {
  timestamp: Date;
  balance: number;
  equity: number; // Balance + unrealized PnL
  positions: BacktestPosition[];
  totalPnL: number;
  unrealizedPnL: number;
  realizedPnL: number;
  drawdown: number;
  drawdownPercentage: number;
  maxDrawdown: number;
  maxDrawdownPercentage: number;
}

/**
 * Position during backtesting
 */
export interface BacktestPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercentage: number;
  stopLoss: number;
  takeProfit: number;
  entryTime: Date;
  strategy: string;
}

/**
 * Comprehensive backtesting results
 */
export interface BacktestResult {
  config: BacktestConfig;
  period: {
    start: Date;
    end: Date;
    durationDays: number;
  };
  
  // Trade statistics
  trades: {
    total: number;
    winning: number;
    losing: number;
    winRate: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    consecutiveWins: number;
    consecutiveLosses: number;
    maxConsecutiveWins: number;
    maxConsecutiveLosses: number;
  };
  
  // Performance metrics
  performance: {
    totalReturn: number;
    totalReturnPercentage: number;
    annualizedReturn: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    maxDrawdown: number;
    maxDrawdownPercentage: number;
    averageDrawdown: number;
    recoveryFactor: number;
    profitFactor: number;
    payoffRatio: number;
    expectedValue: number;
  };
  
  // Risk metrics
  risk: {
    volatility: number;
    downside_deviation: number;
    var95: number; // Value at Risk 95%
    cvar95: number; // Conditional Value at Risk 95%
    beta: number;
    alpha: number;
    informationRatio: number;
  };
  
  // Strategy breakdown
  strategyPerformance: Record<string, StrategyBacktestResult>;
  
  // Time series data
  equityCurve: EquityPoint[];
  drawdownCurve: DrawdownPoint[];
  monthlyReturns: MonthlyReturn[];
  
  // Data quality metrics
  dataQuality: {
    totalDataPoints: number;
    validDataPoints: number;
    dataIntegrityScore: number;
    gapsDetected: number;
    averageGapMinutes: number;
    dataSource: string;
  };
  
  // Execution details
  executionDetails: BacktestTrade[];
  portfolioHistory: BacktestPortfolio[];
}

/**
 * Strategy-specific backtesting results
 */
export interface StrategyBacktestResult {
  strategyName: string;
  trades: number;
  winRate: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  averageHoldingPeriod: number; // in hours
  signalAccuracy: number;
  contribution: number; // Contribution to overall performance
}

/**
 * Equity curve data point
 */
export interface EquityPoint {
  timestamp: Date;
  equity: number;
  balance: number;
  unrealizedPnL: number;
  drawdown: number;
  drawdownPercentage: number;
}

/**
 * Drawdown curve data point
 */
export interface DrawdownPoint {
  timestamp: Date;
  drawdown: number;
  drawdownPercentage: number;
  underwater: boolean; // True if in drawdown
  recoveryTime?: number; // Time to recover from this drawdown
}

/**
 * Monthly return data
 */
export interface MonthlyReturn {
  year: number;
  month: number;
  return: number;
  returnPercentage: number;
  trades: number;
  winRate: number;
  maxDrawdown: number;
}

/**
 * Data validation result
 */
export interface DataValidationResult {
  isValid: boolean;
  totalPoints: number;
  validPoints: number;
  invalidPoints: number;
  gaps: DataGap[];
  integrityScore: number;
  errors: string[];
  warnings: string[];
}

/**
 * Data gap information
 */
export interface DataGap {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: string;
}

/**
 * Backtesting engine state
 */
export interface BacktestEngineState {
  currentTime: Date;
  portfolio: BacktestPortfolio;
  openPositions: Map<string, BacktestPosition>;
  tradeHistory: BacktestTrade[];
  signals: TradingSignal[];
  marketData: HistoricalMarketData[];
  isRunning: boolean;
  progress: number; // 0-100
}

/**
 * Performance benchmark comparison
 */
export interface BenchmarkComparison {
  strategy: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    volatility: number;
  };
  benchmark: {
    name: string; // e.g., "BTC Buy & Hold"
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    volatility: number;
  };
  outperformance: {
    totalReturn: number;
    sharpeRatio: number;
    riskAdjustedReturn: number;
    informationRatio: number;
  };
}

/**
 * Backtesting report configuration
 */
export interface BacktestReportConfig {
  includeCharts: boolean;
  includeTradeDetails: boolean;
  includeStrategyBreakdown: boolean;
  includeBenchmarkComparison: boolean;
  includeRiskMetrics: boolean;
  includeMonthlyReturns: boolean;
  format: 'JSON' | 'HTML' | 'PDF';
  outputPath?: string;
}

/**
 * Real-time backtesting progress
 */
export interface BacktestProgress {
  currentDate: Date;
  progress: number; // 0-100
  tradesExecuted: number;
  currentEquity: number;
  currentDrawdown: number;
  estimatedTimeRemaining: number; // in milliseconds
  status: 'INITIALIZING' | 'RUNNING' | 'COMPLETED' | 'ERROR' | 'CANCELLED';
  message?: string;
}

/**
 * Backtesting validation rules
 */
export interface ValidationRules {
  // Data validation
  minDataPoints: number;
  maxGapMinutes: number;
  requireRealData: boolean;
  
  // Trade validation
  minTradeAmount: number;
  maxPositionSize: number;
  maxOpenPositions: number;
  
  // Risk validation
  maxRiskPerTrade: number;
  maxTotalRisk: number;
  maxDrawdown: number;
  
  // Performance validation
  minSharpeRatio: number;
  minWinRate: number;
  minProfitFactor: number;
}

/**
 * Strategy harmonization for backtesting
 */
export interface BacktestHarmonization {
  signals: TradingSignal[];
  harmonizedSignal: HarmonizedSignal;
  confidence: number;
  conflicts: string[];
  resolution: 'BUY' | 'SELL' | 'HOLD';
  reasoning: string;
}