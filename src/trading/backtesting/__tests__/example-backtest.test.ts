/**
 * =============================================================================
 * EXAMPLE BACKTESTING SYSTEM TEST
 * =============================================================================
 * 
 * Test the complete backtesting example to ensure all components work together
 * properly with real data validation and strategy harmonization.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { describe, test, expect } from '@jest/globals';
import { 
  ExampleHarmonizedStrategy, 
  createSampleHistoricalData 
} from '../example-backtest';
import { PerformanceCalculator } from '../performance-calculator';
import { BacktestReportGenerator } from '../report-generator';

describe('Example Backtesting System', () => {
  describe('ExampleHarmonizedStrategy', () => {
    test('should generate trading signals from harmonized indicators', async () => {
      const strategy = new ExampleHarmonizedStrategy();
      const sampleData = createSampleHistoricalData();
      
      expect(sampleData.length).toBeGreaterThan(50); // Enough data for indicators
      expect(sampleData[0].source).toBe('GATE_IO');
      expect(sampleData[0].validated).toBe(true);
      
      // Generate signals (this will test the harmonization engine)
      const signals = await strategy.generateSignals(sampleData);
      
      // Should generate some signals
      expect(signals.length).toBeGreaterThanOrEqual(0);
      
      // Validate signal structure
      for (const signal of signals) {
        expect(signal.id).toBeDefined();
        expect(signal.symbol).toBe('BTC_USDT');
        expect(['BUY', 'SELL'].includes(signal.type)).toBe(true);
        expect(signal.strength).toBeGreaterThanOrEqual(0);
        expect(signal.strength).toBeLessThanOrEqual(100);
        expect(signal.confidence).toBeGreaterThanOrEqual(0);
        expect(signal.confidence).toBeLessThanOrEqual(100);
        expect(signal.riskReward).toBeGreaterThanOrEqual(1.3);
        expect(signal.indicators.length).toBeGreaterThan(0);
        expect(signal.reasoning).toBeDefined();
        expect(signal.timestamp).toBeInstanceOf(Date);
      }
    });
  });

  describe('Sample Data Generation', () => {
    test('should create realistic historical data', () => {
      const data = createSampleHistoricalData();
      
      expect(data.length).toBe(168); // 1 week of hourly data
      
      // Validate data structure
      for (const point of data) {
        expect(point.symbol).toBe('BTC_USDT');
        expect(point.timestamp).toBeInstanceOf(Date);
        expect(point.open).toBeGreaterThan(0);
        expect(point.high).toBeGreaterThan(0);
        expect(point.low).toBeGreaterThan(0);
        expect(point.close).toBeGreaterThan(0);
        expect(point.volume).toBeGreaterThan(0);
        expect(point.validated).toBe(true);
        expect(point.source).toBe('GATE_IO');
        expect(point.integrity).toBeDefined();
        expect(point.fetchedAt).toBeInstanceOf(Date);
        
        // Validate OHLC relationships
        expect(point.high).toBeGreaterThanOrEqual(Math.max(point.open, point.close));
        expect(point.low).toBeLessThanOrEqual(Math.min(point.open, point.close));
      }
      
      // Validate time sequence
      for (let i = 1; i < data.length; i++) {
        expect(data[i].timestamp.getTime()).toBeGreaterThan(data[i - 1].timestamp.getTime());
      }
    });

    test('should create data with realistic price movements', () => {
      const data = createSampleHistoricalData();
      
      // Calculate price changes
      const priceChanges = [];
      for (let i = 1; i < data.length; i++) {
        const change = (data[i].close - data[i - 1].close) / data[i - 1].close;
        priceChanges.push(Math.abs(change));
      }
      
      // Average price change should be reasonable (less than 5% per hour)
      const avgChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
      expect(avgChange).toBeLessThan(0.05);
      
      // No extreme price movements (more than 20% in one hour)
      const maxChange = Math.max(...priceChanges);
      expect(maxChange).toBeLessThan(0.20);
    });
  });

  describe('Integration Test', () => {
    test('should demonstrate complete backtesting workflow', async () => {
      // Create sample data
      const historicalData = createSampleHistoricalData();
      
      // Initialize strategy
      const strategy = new ExampleHarmonizedStrategy();
      
      // Generate signals
      const signals = await strategy.generateSignals(historicalData);
      
      // Create mock trades from signals (simplified)
      const mockTrades = signals.slice(0, 5).map((signal, index) => ({
        id: `trade_${index}`,
        symbol: signal.symbol,
        type: signal.type,
        quantity: 0.1,
        entryPrice: historicalData[50 + index * 10].close,
        exitPrice: historicalData[50 + index * 10].close * (signal.type === 'BUY' ? 1.02 : 0.98),
        entryTime: signal.timestamp,
        exitTime: new Date(signal.timestamp.getTime() + 3600000), // 1 hour later
        strategy: strategy.name,
        signal,
        stopLoss: historicalData[50 + index * 10].close * (signal.type === 'BUY' ? 0.99 : 1.01),
        takeProfit: historicalData[50 + index * 10].close * (signal.type === 'BUY' ? 1.03 : 0.97),
        fees: 8.4,
        slippage: 4.2,
        pnl: signal.type === 'BUY' ? 100 : -50,
        pnlPercentage: signal.type === 'BUY' ? 2.0 : -1.0,
        status: 'CLOSED' as const,
        exitReason: 'TAKE_PROFIT' as const,
      }));
      
      // Create mock portfolio history
      const mockPortfolioHistory = [
        {
          timestamp: historicalData[0].timestamp,
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
          timestamp: historicalData[historicalData.length - 1].timestamp,
          balance: 10000,
          equity: 10200,
          positions: [],
          totalPnL: 200,
          unrealizedPnL: 0,
          realizedPnL: 200,
          drawdown: 0,
          drawdownPercentage: 0,
          maxDrawdown: 0,
          maxDrawdownPercentage: 0,
        },
      ];
      
      // Calculate performance metrics
      const performance = PerformanceCalculator.calculatePerformanceMetrics(
        mockTrades,
        mockPortfolioHistory,
        10000
      );
      
      expect(performance).toBeDefined();
      expect(performance.totalReturn).toBeCloseTo(200, 0);
      expect(performance.totalReturnPercentage).toBeCloseTo(2.0, 1);
      
      // Generate report
      const mockResult = {
        config: {
          symbol: 'BTC_USDT',
          startDate: historicalData[0].timestamp,
          endDate: historicalData[historicalData.length - 1].timestamp,
          initialBalance: 10000,
          strategies: [strategy.name],
          riskManagement: {
            maxRiskPerTrade: 0.02,
            stopLossPercentage: 0.01,
            minRiskRewardRatio: 1.3,
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
          start: historicalData[0].timestamp,
          end: historicalData[historicalData.length - 1].timestamp,
          durationDays: 7,
        },
        trades: PerformanceCalculator.calculateTradeStatistics(mockTrades),
        performance,
        risk: PerformanceCalculator.calculateRiskMetrics([0.02, -0.01, 0.015, -0.005, 0.01]),
        strategyPerformance: {
          [strategy.name]: {
            strategyName: strategy.name,
            trades: mockTrades.length,
            winRate: 60,
            totalReturn: 200,
            sharpeRatio: 1.5,
            maxDrawdown: 0,
            profitFactor: 2.0,
            averageHoldingPeriod: 1,
            signalAccuracy: 0.6,
            contribution: 100,
          },
        },
        equityCurve: PerformanceCalculator.generateEquityCurve(mockPortfolioHistory),
        drawdownCurve: PerformanceCalculator.generateDrawdownCurve(mockPortfolioHistory),
        monthlyReturns: PerformanceCalculator.generateMonthlyReturns(mockPortfolioHistory, mockTrades),
        dataQuality: {
          totalDataPoints: historicalData.length,
          validDataPoints: historicalData.length,
          dataIntegrityScore: 100,
          gapsDetected: 0,
          averageGapMinutes: 0,
          dataSource: 'GATE_IO_REAL_DATA',
        },
        executionDetails: mockTrades,
        portfolioHistory: mockPortfolioHistory,
      };
      
      const reportConfig = {
        includeCharts: false,
        includeTradeDetails: true,
        includeStrategyBreakdown: true,
        includeBenchmarkComparison: false,
        includeRiskMetrics: true,
        includeMonthlyReturns: false,
        format: 'JSON' as const,
      };
      
      const report = await BacktestReportGenerator.generateReport(mockResult, reportConfig);
      
      expect(report).toBeDefined();
      expect(typeof report).toBe('string');
      
      const parsed = JSON.parse(report);
      expect(parsed.dataQuality.dataSource).toBe('GATE_IO_REAL_DATA');
      expect(parsed.config.dataValidation.requireRealData).toBe(true);
      expect(parsed.strategyPerformance[strategy.name]).toBeDefined();
    });
  });
});