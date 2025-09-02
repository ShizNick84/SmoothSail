/**
 * =============================================================================
 * REAL DATA VALIDATION TESTS
 * =============================================================================
 * 
 * Comprehensive tests to ensure the backtesting system only uses real
 * historical market data and never mock data. These tests validate the
 * data integrity and authenticity requirements.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { HistoricalDataFetcher } from '../historical-data-fetcher';
import { BacktestingEngine } from '../backtesting-engine';
import { GateIOClient } from '../../api/gate-io-client';
import { 
  HistoricalMarketData, 
  BacktestConfig,
  DataValidationResult 
} from '../types';

// Mock GateIOClient for testing
const mockGateIOClient = {
  makeRequest: jest.fn(),
} as unknown as GateIOClient;

describe('Real Data Validation', () => {
  let dataFetcher: HistoricalDataFetcher;
  let backtestingEngine: BacktestingEngine;

  beforeEach(() => {
    dataFetcher = new HistoricalDataFetcher(mockGateIOClient);
    backtestingEngine = new BacktestingEngine(mockGateIOClient);
  });

  describe('Data Source Validation', () => {
    test('should reject mock data', async () => {
      const mockData: HistoricalMarketData[] = [
        {
          symbol: 'BTC_USDT',
          timestamp: new Date(),
          open: 42000,
          high: 42500,
          low: 41800,
          close: 42200,
          volume: 1000,
          validated: false, // Mock data flag
          source: 'MOCK', // Not from Gate.io
          integrity: 'mock_hash',
          fetchedAt: new Date(),
        },
      ];

      const config: BacktestConfig = {
        symbol: 'BTC_USDT',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        initialBalance: 10000,
        strategies: [],
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
          minDataPoints: 1,
          maxGapMinutes: 60,
        },
      };

      const validation = await dataFetcher.validateForBacktesting(mockData, config);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('Mock data detected'))).toBe(true);
    });

    test('should accept real Gate.io data', async () => {
      const realData: HistoricalMarketData[] = [
        {
          symbol: 'BTC_USDT',
          timestamp: new Date(),
          open: 42000,
          high: 42500,
          low: 41800,
          close: 42200,
          volume: 1000,
          validated: true, // Real data flag
          source: 'GATE_IO', // From Gate.io
          integrity: 'real_hash_12345',
          fetchedAt: new Date(),
        },
      ];

      const config: BacktestConfig = {
        symbol: 'BTC_USDT',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        initialBalance: 10000,
        strategies: [],
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
          minDataPoints: 1,
          maxGapMinutes: 60,
        },
      };

      const validation = await dataFetcher.validateForBacktesting(realData, config);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should validate data integrity hashes', async () => {
      const dataWithBadHash: HistoricalMarketData[] = [
        {
          symbol: 'BTC_USDT',
          timestamp: new Date(),
          open: 42000,
          high: 42500,
          low: 41800,
          close: 42200,
          volume: 1000,
          validated: true,
          source: 'GATE_IO',
          integrity: 'invalid_hash', // Bad integrity hash
          fetchedAt: new Date(),
        },
      ];

      const config: BacktestConfig = {
        symbol: 'BTC_USDT',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        initialBalance: 10000,
        strategies: [],
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
          minDataPoints: 1,
          maxGapMinutes: 60,
        },
      };

      const validation = await dataFetcher.validateForBacktesting(dataWithBadHash, config);
      
      // Should still be valid but with warnings about integrity
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Data Quality Validation', () => {
    test('should detect unrealistic price movements', async () => {
      const unrealisticData: HistoricalMarketData[] = [
        {
          symbol: 'BTC_USDT',
          timestamp: new Date(),
          open: 42000,
          high: 84000, // 100% price jump - unrealistic
          low: 21000,  // 50% price drop - unrealistic
          close: 42200,
          volume: 1000,
          validated: true,
          source: 'GATE_IO',
          integrity: 'test_hash',
          fetchedAt: new Date(),
        },
      ];

      const config: BacktestConfig = {
        symbol: 'BTC_USDT',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        initialBalance: 10000,
        strategies: [],
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
          minDataPoints: 1,
          maxGapMinutes: 60,
        },
      };

      const validation = await dataFetcher.validateForBacktesting(unrealisticData, config);
      
      expect(validation.invalidPoints).toBeGreaterThan(0);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    test('should validate OHLC relationships', async () => {
      const invalidOHLCData: HistoricalMarketData[] = [
        {
          symbol: 'BTC_USDT',
          timestamp: new Date(),
          open: 42000,
          high: 41000, // High less than open - invalid
          low: 43000,  // Low greater than open - invalid
          close: 42200,
          volume: 1000,
          validated: true,
          source: 'GATE_IO',
          integrity: 'test_hash',
          fetchedAt: new Date(),
        },
      ];

      const config: BacktestConfig = {
        symbol: 'BTC_USDT',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        initialBalance: 10000,
        strategies: [],
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
          minDataPoints: 1,
          maxGapMinutes: 60,
        },
      };

      const validation = await dataFetcher.validateForBacktesting(invalidOHLCData, config);
      
      expect(validation.invalidPoints).toBeGreaterThan(0);
    });

    test('should detect data gaps', async () => {
      const dataWithGaps: HistoricalMarketData[] = [
        {
          symbol: 'BTC_USDT',
          timestamp: new Date('2024-01-01T00:00:00Z'),
          open: 42000,
          high: 42500,
          low: 41800,
          close: 42200,
          volume: 1000,
          validated: true,
          source: 'GATE_IO',
          integrity: 'test_hash_1',
          fetchedAt: new Date(),
        },
        {
          symbol: 'BTC_USDT',
          timestamp: new Date('2024-01-01T05:00:00Z'), // 5 hour gap
          open: 42200,
          high: 42800,
          low: 42000,
          close: 42600,
          volume: 1200,
          validated: true,
          source: 'GATE_IO',
          integrity: 'test_hash_2',
          fetchedAt: new Date(),
        },
      ];

      const config: BacktestConfig = {
        symbol: 'BTC_USDT',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        initialBalance: 10000,
        strategies: [],
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
          minDataPoints: 2,
          maxGapMinutes: 60, // 1 hour max gap
        },
      };

      const validation = await dataFetcher.validateForBacktesting(dataWithGaps, config);
      
      expect(validation.gaps.length).toBeGreaterThan(0);
      expect(validation.gaps[0].durationMinutes).toBeGreaterThan(60);
    });
  });

  describe('Security Validation', () => {
    test('should enforce minimum data points requirement', async () => {
      const insufficientData: HistoricalMarketData[] = [
        {
          symbol: 'BTC_USDT',
          timestamp: new Date(),
          open: 42000,
          high: 42500,
          low: 41800,
          close: 42200,
          volume: 1000,
          validated: true,
          source: 'GATE_IO',
          integrity: 'test_hash',
          fetchedAt: new Date(),
        },
      ];

      const config: BacktestConfig = {
        symbol: 'BTC_USDT',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        initialBalance: 10000,
        strategies: [],
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
          minDataPoints: 100, // Require 100 points
          maxGapMinutes: 60,
        },
      };

      const validation = await dataFetcher.validateForBacktesting(insufficientData, config);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual(expect.stringContaining('Insufficient data points'));
    });

    test('should calculate data integrity score', async () => {
      const mixedQualityData: HistoricalMarketData[] = [
        // Good data point
        {
          symbol: 'BTC_USDT',
          timestamp: new Date('2024-01-01T00:00:00Z'),
          open: 42000,
          high: 42500,
          low: 41800,
          close: 42200,
          volume: 1000,
          validated: true,
          source: 'GATE_IO',
          integrity: 'good_hash_1',
          fetchedAt: new Date(),
        },
        // Bad data point
        {
          symbol: 'BTC_USDT',
          timestamp: new Date('2024-01-01T01:00:00Z'),
          open: 0, // Invalid price
          high: 0,
          low: 0,
          close: 0,
          volume: -100, // Invalid volume
          validated: false,
          source: 'GATE_IO',
          integrity: 'bad_hash',
          fetchedAt: new Date(),
        },
      ];

      const config: BacktestConfig = {
        symbol: 'BTC_USDT',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        initialBalance: 10000,
        strategies: [],
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
          minDataPoints: 2,
          maxGapMinutes: 120,
        },
      };

      const validation = await dataFetcher.validateForBacktesting(mixedQualityData, config);
      
      expect(validation.integrityScore).toBeLessThan(100);
      expect(validation.validPoints).toBe(1);
      expect(validation.invalidPoints).toBe(1);
    });
  });
});
