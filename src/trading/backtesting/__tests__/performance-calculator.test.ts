/**
 * =============================================================================
 * PERFORMANCE CALCULATOR TESTS
 * =============================================================================
 * 
 * Comprehensive tests for the performance calculator module.
 * Tests all performance metrics calculations including Sharpe ratio,
 * drawdown analysis, and risk metrics.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { describe, test, expect } from '@jest/globals';
import { PerformanceCalculator } from '../performance-calculator';
import { BacktestTrade, BacktestPortfolio } from '../types';
import { TradingSignal } from '../../strategies/types';

// Sample data for testing
const sampleSignal: TradingSignal = {
  id: 'test_signal',
  symbol: 'BTC_USDT',
  type: 'BUY',
  strength: 75,
  confidence: 80,
  indicators: ['MA_CROSSOVER'],
  reasoning: 'Test signal',
  riskReward: 2.0,
  timestamp: new Date('2024-01-01T00:00:00Z'),
};

const sampleTrades: BacktestTrade[] = [
  {
    id: 'trade_1',
    symbol: 'BTC_USDT',
    type: 'BUY',
    quantity: 0.1,
    entryPrice: 42000,
    exitPrice: 43000,
    entryTime: new Date('2024-01-01T00:00:00Z'),
    exitTime: new Date('2024-01-01T01:00:00Z'),
    strategy: 'TestStrategy',
    signal: sampleSignal,
    stopLoss: 41580,
    takeProfit: 43050,
    fees: 8.4,
    slippage: 4.2,
    pnl: 91.6,
    pnlPercentage: 2.18,
    status: 'CLOSED',
    exitReason: 'TAKE_PROFIT',
  },
  {
    id: 'trade_2',
    symbol: 'BTC_USDT',
    type: 'BUY',
    quantity: 0.05,
    entryPrice: 43000,
    exitPrice: 42500,
    entryTime: new Date('2024-01-01T01:00:00Z'),
    exitTime: new Date('2024-01-01T02:00:00Z'),
    strategy: 'TestStrategy',
    signal: sampleSignal,
    stopLoss: 42570,
    takeProfit: 43645,
    fees: 4.25,
    slippage: 2.15,
    pnl: -29.25,
    pnlPercentage: -1.36,
    status: 'CLOSED',
    exitReason: 'STOP_LOSS',
  },
];

const samplePortfolioHistory: BacktestPortfolio[] = [
  {
    timestamp: new Date('2024-01-01T00:00:00Z'),
    balance: 10000,
    equity: 10000,
    positions: [],
    totalPnL: 0,
    unrealizedPnL: 0,
    realizedPnL: 0,
    drawdown: 0,
    drawdownPercentage: 0,
    maxDrawdown: 0,
    maxDrawdownPercentage: 0,
  },
  {
    timestamp: new Date('2024-01-01T01:00:00Z'),
    balance: 10000,
    equity: 10091.6,
    positions: [],
    totalPnL: 91.6,
    unrealizedPnL: 0,
    realizedPnL: 91.6,
    drawdown: 0,
    drawdownPercentage: 0,
    maxDrawdown: 0,
    maxDrawdownPercentage: 0,
  },
  {
    timestamp: new Date('2024-01-01T02:00:00Z'),
    balance: 10000,
    equity: 10062.35,
    positions: [],
    totalPnL: 62.35,
    unrealizedPnL: 0,
    realizedPnL: 62.35,
    drawdown: 29.25,
    drawdownPercentage: 0.29,
    maxDrawdown: 29.25,
    maxDrawdownPercentage: 0.29,
  },
];

describe('PerformanceCalculator', () => {
  describe('Performance Metrics Calculation', () => {
    test('should calculate basic performance metrics correctly', () => {
      const performance = PerformanceCalculator.calculatePerformanceMetrics(
        sampleTrades,
        samplePortfolioHistory,
        10000
      );

      expect(performance.totalReturn).toBeCloseTo(62.35, 2);
      expect(performance.totalReturnPercentage).toBeCloseTo(0.62, 2);
      expect(performance.maxDrawdown).toBeCloseTo(29.25, 2);
      expect(performance.maxDrawdownPercentage).toBeCloseTo(0.29, 2);
    });

    test('should calculate Sharpe ratio', () => {
      const performance = PerformanceCalculator.calculatePerformanceMetrics(
        sampleTrades,
        samplePortfolioHistory,
        10000
      );

      expect(performance.sharpeRatio).toBeDefined();
      expect(typeof performance.sharpeRatio).toBe('number');
    });

    test('should calculate profit factor correctly', () => {
      const performance = PerformanceCalculator.calculatePerformanceMetrics(
        sampleTrades,
        samplePortfolioHistory,
        10000
      );

      expect(performance.profitFactor).toBeCloseTo(3.13, 1);
    });
  });

  describe('Trade Statistics', () => {
    test('should calculate trade statistics correctly', () => {
      const tradeStats = PerformanceCalculator.calculateTradeStatistics(sampleTrades);

      expect(tradeStats.total).toBe(2);
      expect(tradeStats.winning).toBe(1);
      expect(tradeStats.losing).toBe(1);
      expect(tradeStats.winRate).toBe(50);
      expect(tradeStats.averageWin).toBeCloseTo(91.6, 2);
      expect(tradeStats.averageLoss).toBeCloseTo(29.25, 2);
    });
  });

  describe('Risk Metrics', () => {
    test('should calculate risk metrics correctly', () => {
      const returns = [0.00916, -0.0029];
      const riskMetrics = PerformanceCalculator.calculateRiskMetrics(returns);

      expect(riskMetrics.volatility).toBeGreaterThan(0);
      expect(riskMetrics.var95).toBeDefined();
      expect(riskMetrics.cvar95).toBeDefined();
    });
  });

  describe('Curve Generation', () => {
    test('should generate equity curve correctly', () => {
      const equityCurve = PerformanceCalculator.generateEquityCurve(samplePortfolioHistory);

      expect(equityCurve.length).toBe(samplePortfolioHistory.length);
      expect(equityCurve[0].equity).toBe(10000);
      expect(equityCurve[1].equity).toBeCloseTo(10091.6, 2);
    });

    test('should generate drawdown curve correctly', () => {
      const drawdownCurve = PerformanceCalculator.generateDrawdownCurve(samplePortfolioHistory);

      expect(drawdownCurve.length).toBe(samplePortfolioHistory.length);
      expect(drawdownCurve[0].drawdown).toBe(0);
      expect(drawdownCurve[2].drawdown).toBeCloseTo(29.25, 2);
    });
  });
});