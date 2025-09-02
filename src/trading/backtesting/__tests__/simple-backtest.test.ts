/**
 * =============================================================================
 * SIMPLE BACKTESTING TEST - NO DEPENDENCIES
 * =============================================================================
 * 
 * Simple test to verify the backtesting system works without external
 * dependencies like encryption services.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { describe, test, expect } from '@jest/globals';
import { PerformanceCalculator } from '../performance-calculator';
import { BacktestReportGenerator } from '../report-generator';
import { 
  BacktestTrade, 
  BacktestPortfolio,
  BacktestResult 
} from '../types';

describe('Simple Backtesting Tests', () => {
  describe('PerformanceCalculator', () => {
    test('should calculate basic performance metrics', () => {
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
          signal: {
            id: 'signal_1',
            symbol: 'BTC_USDT',
            type: 'BUY',
            strength: 75,
            confidence: 80,
            indicators: ['MA_CROSSOVER'],
            reasoning: 'Test signal',
            riskReward: 2.5,
            timestamp: new Date('2024-01-01T00:00:00Z'),
          },
          stopLoss: 41580,
          takeProfit: 43050,
          fees: 8.4,
          slippage: 4.2,
          pnl: 91.6,
          pnlPercentage: 2.18,
          status: 'CLOSED',
          exitReason: 'TAKE_PROFIT',
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
      ];

      const performance = PerformanceCalculator.calculatePerformanceMetrics(
        sampleTrades,
        samplePortfolioHistory,
        10000
      );

      expect(performance.totalReturn).toBeCloseTo(91.6, 2);
      expect(performance.totalReturnPercentage).toBeCloseTo(0.916, 2);
      expect(performance.sharpeRatio).toBeDefined();
      expect(performance.profitFactor).toBeGreaterThan(0);
    });

    test('should calculate trade statistics', () => {
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
          signal: {
            id: 'signal_1',
            symbol: 'BTC_USDT',
            type: 'BUY',
            strength: 75,
            confidence: 80,
            indicators: ['MA_CROSSOVER'],
            reasoning: 'Test signal',
            riskReward: 2.5,
            timestamp: new Date('2024-01-01T00:00:00Z'),
          },
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
          signal: {
            id: 'signal_2',
            symbol: 'BTC_USDT',
            type: 'SELL',
            strength: 70,
            confidence: 75,
            indicators: ['RSI_OVERBOUGHT'],
            reasoning: 'Test signal',
            riskReward: 2.0,
            timestamp: new Date('2024-01-01T01:00:00Z'),
          },
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

      const tradeStats = PerformanceCalculator.calculateTradeStatistics(sampleTrades);

      expect(tradeStats.total).toBe(2);
      expect(tradeStats.winning).toBe(1);
      expect(tradeStats.losing).toBe(1);
      expect(tradeStats.winRate).toBe(50);
      expect(tradeStats.averageWin).toBeCloseTo(91.6, 2);
      expect(tradeStats.averageLoss).toBeCloseTo(29.25, 2);
    });

    test('should generate equity curve', () => {
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
      ];

      const equityCurve = PerformanceCalculator.generateEquityCurve(samplePortfolioHistory);

      expect(equityCurve.length).toBe(2);
      expect(equityCurve[0].equity).toBe(10000);
      expect(equityCurve[1].equity).toBeCloseTo(10091.6, 2);
    });
  });

  describe('BacktestReportGenerator', () => {
    test('should generate JSON report', async () => {
      const sampleResult: BacktestResult = {
        config: {
          symbol: 'BTC_USDT',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-02'),
          initialBalance: 10000,
          strategies: ['TestStrategy'],
          riskManagement: {
            maxRiskPerTrade: 0.02,
            stopLossPercentage: 0.01,
            minRiskRewardRatio: 1.5,
            maxDrawdown: 0.15,
          },
          fees: { maker: 0.002, taker: 0.002 },
          slippage: 0.001,
          dataValidation: {
            requireRealData: true,
            minDataPoints: 100,
            maxGapMinutes: 60,
          },
        },
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02'),
          durationDays: 1,
        },
        trades: {
          total: 1,
          winning: 1,
          losing: 0,
          winRate: 100,
          averageWin: 100,
          averageLoss: 0,
          largestWin: 100,
          largestLoss: 0,
          consecutiveWins: 0,
          consecutiveLosses: 0,
          maxConsecutiveWins: 1,
          maxConsecutiveLosses: 0,
        },
        performance: {
          totalReturn: 100,
          totalReturnPercentage: 1.0,
          annualizedReturn: 365,
          sharpeRatio: 2.0,
          sortinoRatio: 2.5,
          calmarRatio: 36.5,
          maxDrawdown: 0,
          maxDrawdownPercentage: 0,
          averageDrawdown: 0,
          recoveryFactor: Infinity,
          profitFactor: Infinity,
          payoffRatio: Infinity,
          expectedValue: 100,
        },
        risk: {
          volatility: 5,
          downside_deviation: 2,
          var95: -1,
          cvar95: -1.5,
          beta: 1.0,
          alpha: 10,
          informationRatio: 1.0,
        },
        strategyPerformance: {
          TestStrategy: {
            strategyName: 'TestStrategy',
            trades: 1,
            winRate: 100,
            totalReturn: 100,
            sharpeRatio: 2.0,
            maxDrawdown: 0,
            profitFactor: Infinity,
            averageHoldingPeriod: 1,
            signalAccuracy: 1.0,
            contribution: 100,
          },
        },
        equityCurve: [],
        drawdownCurve: [],
        monthlyReturns: [],
        dataQuality: {
          totalDataPoints: 100,
          validDataPoints: 100,
          dataIntegrityScore: 100,
          gapsDetected: 0,
          averageGapMinutes: 0,
          dataSource: 'GATE_IO_REAL_DATA',
        },
        executionDetails: [],
        portfolioHistory: [],
      };

      const reportConfig = {
        includeCharts: false,
        includeTradeDetails: false,
        includeStrategyBreakdown: false,
        includeBenchmarkComparison: false,
        includeRiskMetrics: false,
        includeMonthlyReturns: false,
        format: 'JSON' as const,
      };

      const report = await BacktestReportGenerator.generateReport(sampleResult, reportConfig);
      
      expect(report).toBeDefined();
      expect(typeof report).toBe('string');
      
      // Should be valid JSON
      const parsed = JSON.parse(report);
      expect(parsed.config).toBeDefined();
      expect(parsed.performance).toBeDefined();
      expect(parsed.dataQuality.dataSource).toBe('GATE_IO_REAL_DATA');
    });

    test('should generate HTML report', async () => {
      const sampleResult: BacktestResult = {
        config: {
          symbol: 'BTC_USDT',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-02'),
          initialBalance: 10000,
          strategies: ['TestStrategy'],
          riskManagement: {
            maxRiskPerTrade: 0.02,
            stopLossPercentage: 0.01,
            minRiskRewardRatio: 1.5,
            maxDrawdown: 0.15,
          },
          fees: { maker: 0.002, taker: 0.002 },
          slippage: 0.001,
          dataValidation: {
            requireRealData: true,
            minDataPoints: 100,
            maxGapMinutes: 60,
          },
        },
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02'),
          durationDays: 1,
        },
        trades: {
          total: 1,
          winning: 1,
          losing: 0,
          winRate: 100,
          averageWin: 100,
          averageLoss: 0,
          largestWin: 100,
          largestLoss: 0,
          consecutiveWins: 0,
          consecutiveLosses: 0,
          maxConsecutiveWins: 1,
          maxConsecutiveLosses: 0,
        },
        performance: {
          totalReturn: 100,
          totalReturnPercentage: 1.0,
          annualizedReturn: 365,
          sharpeRatio: 2.0,
          sortinoRatio: 2.5,
          calmarRatio: 36.5,
          maxDrawdown: 0,
          maxDrawdownPercentage: 0,
          averageDrawdown: 0,
          recoveryFactor: Infinity,
          profitFactor: Infinity,
          payoffRatio: Infinity,
          expectedValue: 100,
        },
        risk: {
          volatility: 5,
          downside_deviation: 2,
          var95: -1,
          cvar95: -1.5,
          beta: 1.0,
          alpha: 10,
          informationRatio: 1.0,
        },
        strategyPerformance: {
          TestStrategy: {
            strategyName: 'TestStrategy',
            trades: 1,
            winRate: 100,
            totalReturn: 100,
            sharpeRatio: 2.0,
            maxDrawdown: 0,
            profitFactor: Infinity,
            averageHoldingPeriod: 1,
            signalAccuracy: 1.0,
            contribution: 100,
          },
        },
        equityCurve: [],
        drawdownCurve: [],
        monthlyReturns: [],
        dataQuality: {
          totalDataPoints: 100,
          validDataPoints: 100,
          dataIntegrityScore: 100,
          gapsDetected: 0,
          averageGapMinutes: 0,
          dataSource: 'GATE_IO_REAL_DATA',
        },
        executionDetails: [],
        portfolioHistory: [],
      };

      const reportConfig = {
        includeCharts: true,
        includeTradeDetails: true,
        includeStrategyBreakdown: true,
        includeBenchmarkComparison: false,
        includeRiskMetrics: true,
        includeMonthlyReturns: true,
        format: 'HTML' as const,
      };

      const report = await BacktestReportGenerator.generateReport(sampleResult, reportConfig);
      
      expect(report).toBeDefined();
      expect(typeof report).toBe('string');
      expect(report).toContain('<!DOCTYPE html>');
      expect(report).toContain('Backtesting Report');
      expect(report).toContain('BTC_USDT');
      expect(report).toContain('GATE_IO_REAL_DATA');
    });
  });
});
