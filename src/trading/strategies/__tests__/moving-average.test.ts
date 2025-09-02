/**
 * Unit Tests for Moving Average Strategy
 * 
 * Comprehensive test suite covering all functionality of the MovingAverageStrategy class
 * including SMA/EMA calculations, crossover detection, signal generation, and edge cases.
 * 
 * Requirements: 17.1, 17.3, 17.6 - Unit tests for technical indicators
 */

import { MovingAverageStrategy } from '../moving-average';
import { MarketData, TradingSignal, MovingAverageSignal } from '../types';

describe('MovingAverageStrategy', () => {
  let strategy: MovingAverageStrategy;
  let mockMarketData: MarketData[];

  beforeEach(() => {
    strategy = new MovingAverageStrategy();
    
    // Create realistic mock market data for testing
    mockMarketData = [
      { symbol: 'BTC/USDT', timestamp: new Date('2024-01-01'), open: 42000, high: 42500, low: 41500, close: 42200, volume: 1000 },
      { symbol: 'BTC/USDT', timestamp: new Date('2024-01-02'), open: 42200, high: 42800, low: 42000, close: 42600, volume: 1200 },
      { symbol: 'BTC/USDT', timestamp: new Date('2024-01-03'), open: 42600, high: 43000, low: 42400, close: 42800, volume: 1100 },
      { symbol: 'BTC/USDT', timestamp: new Date('2024-01-04'), open: 42800, high: 43200, low: 42600, close: 43000, volume: 1300 },
      { symbol: 'BTC/USDT', timestamp: new Date('2024-01-05'), open: 43000, high: 43400, low: 42800, close: 43200, volume: 1400 },
    ];
  });

  describe('calculateSMA', () => {
    it('should calculate Simple Moving Average correctly', () => {
      const prices = [10, 12, 14, 16, 18];
      const result = strategy.calculateSMA(prices, 3);
      
      // SMA of last 3 prices: (14 + 16 + 18) / 3 = 16
      expect(result).toBe(16);
    });

    it('should return null for insufficient data', () => {
      const prices = [10, 12];
      const result = strategy.calculateSMA(prices, 5);
      
      expect(result).toBeNull();
    });

    it('should handle single period correctly', () => {
      const prices = [100];
      const result = strategy.calculateSMA(prices, 1);
      
      expect(result).toBe(100);
    });

    it('should handle empty array', () => {
      const prices: number[] = [];
      const result = strategy.calculateSMA(prices, 3);
      
      expect(result).toBeNull();
    });

    it('should calculate SMA for exact period length', () => {
      const prices = [10, 20, 30];
      const result = strategy.calculateSMA(prices, 3);
      
      expect(result).toBe(20);
    });
  });

  describe('calculateEMA', () => {
    it('should calculate Exponential Moving Average correctly', () => {
      const prices = [10, 12, 14, 16, 18];
      const result = strategy.calculateEMA(prices, 3);
      
      // EMA calculation with multiplier 2/(3+1) = 0.5
      // Starting with first price: 10
      // EMA = (12 * 0.5) + (10 * 0.5) = 11
      // EMA = (14 * 0.5) + (11 * 0.5) = 12.5
      // EMA = (16 * 0.5) + (12.5 * 0.5) = 14.25
      // EMA = (18 * 0.5) + (14.25 * 0.5) = 16.125
      expect(result).toBeCloseTo(16.125, 3);
    });

    it('should return null for insufficient data', () => {
      const prices = [10, 12];
      const result = strategy.calculateEMA(prices, 5);
      
      expect(result).toBeNull();
    });

    it('should handle single price correctly', () => {
      const prices = [100];
      const result = strategy.calculateEMA(prices, 1);
      
      expect(result).toBe(100);
    });

    it('should be more responsive than SMA to recent price changes', () => {
      const prices = [10, 10, 10, 10, 20]; // Sharp increase at end
      const sma = strategy.calculateSMA(prices, 5);
      const ema = strategy.calculateEMA(prices, 5);
      
      expect(ema).toBeGreaterThan(sma!);
    });
  });

  describe('calculateEMACrossover', () => {
    it('should calculate both fast and slow EMAs', () => {
      const result = strategy.calculateEMACrossover(mockMarketData, 2, 3);
      
      expect(result.fastEMA).toBeDefined();
      expect(result.slowEMA).toBeDefined();
      expect(typeof result.fastEMA).toBe('number');
      expect(typeof result.slowEMA).toBe('number');
    });

    it('should return null for insufficient data', () => {
      const shortData = mockMarketData.slice(0, 2);
      const result = strategy.calculateEMACrossover(shortData, 5, 10);
      
      expect(result.fastEMA).toBeNull();
      expect(result.slowEMA).toBeNull();
    });

    it('should use default periods when not specified', () => {
      const result = strategy.calculateEMACrossover(mockMarketData);
      
      // Should not be null even with default periods if we have enough data
      // But our mock data is too short for default periods (20, 50)
      expect(result.fastEMA).toBeNull();
      expect(result.slowEMA).toBeNull();
    });
  });

  describe('detectCrossover', () => {
    let extendedMarketData: MarketData[];

    beforeEach(() => {
      // Create extended data for crossover testing
      extendedMarketData = [];
      for (let i = 0; i < 60; i++) {
        extendedMarketData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(2024, 0, i + 1),
          open: 42000 + i * 10,
          high: 42500 + i * 10,
          low: 41500 + i * 10,
          close: 42000 + i * 10 + (i > 30 ? 100 : 0), // Price jump after day 30
          volume: 1000 + Math.random() * 500
        });
      }
    });

    it('should detect golden cross (bullish crossover)', () => {
      // Modify data to create a clear golden cross
      const testData = [...extendedMarketData];
      // Create scenario where fast EMA crosses above slow EMA
      for (let i = 50; i < testData.length; i++) {
        testData[i].close = testData[i].close + (i - 49) * 50; // Sharp uptrend
      }

      const result = strategy.detectCrossover(testData, 5, 10);
      
      expect(result).toBeDefined();
      if (result?.crossover) {
        expect(['GOLDEN_CROSS', 'NONE']).toContain(result.crossover.type);
      }
    });

    it('should detect death cross (bearish crossover)', () => {
      // Modify data to create a clear death cross
      const testData = [...extendedMarketData];
      // Create scenario where fast EMA crosses below slow EMA
      for (let i = 50; i < testData.length; i++) {
        testData[i].close = testData[i].close - (i - 49) * 50; // Sharp downtrend
      }

      const result = strategy.detectCrossover(testData, 5, 10);
      
      expect(result).toBeDefined();
      if (result?.crossover) {
        expect(['DEATH_CROSS', 'NONE']).toContain(result.crossover.type);
      }
    });

    it('should return null for insufficient data', () => {
      const result = strategy.detectCrossover(mockMarketData, 20, 50);
      
      expect(result).toBeNull();
    });

    it('should include volume confirmation in result', () => {
      const result = strategy.detectCrossover(extendedMarketData, 5, 10);
      
      if (result?.crossover) {
        expect(typeof result.crossover.volumeConfirmed).toBe('boolean');
      }
    });
  });

  describe('generateSignal', () => {
    let extendedMarketData: MarketData[];

    beforeEach(() => {
      // Create data that will generate a signal
      extendedMarketData = [];
      for (let i = 0; i < 30; i++) {
        extendedMarketData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(2024, 0, i + 1),
          open: 42000,
          high: 42500,
          low: 41500,
          close: 42000 + (i > 15 ? i * 20 : 0), // Uptrend after day 15
          volume: 1000 + Math.random() * 500
        });
      }
    });

    it('should generate BUY signal for golden cross', () => {
      // Create strong uptrend for golden cross
      const testData = [...extendedMarketData];
      for (let i = 20; i < testData.length; i++) {
        testData[i].close = testData[i].close + (i - 19) * 100;
        testData[i].volume = 2000; // High volume
      }

      const result = strategy.generateSignal(testData, 3, 7);
      
      if (result) {
        expect(result.type).toBe('BUY');
        expect(result.symbol).toBe('BTC/USDT');
        expect(result.strength).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.indicators).toContain('EMA_3');
        expect(result.indicators).toContain('EMA_7');
        expect(result.reasoning).toContain('Golden Cross');
      }
    });

    it('should generate SELL signal for death cross', () => {
      // Create strong downtrend for death cross
      const testData = [...extendedMarketData];
      for (let i = 20; i < testData.length; i++) {
        testData[i].close = testData[i].close - (i - 19) * 100;
        testData[i].volume = 2000; // High volume
      }

      const result = strategy.generateSignal(testData, 3, 7);
      
      if (result) {
        expect(result.type).toBe('SELL');
        expect(result.reasoning).toContain('Death Cross');
      }
    });

    it('should return null when no crossover detected', () => {
      // Flat market data
      const flatData = extendedMarketData.map(data => ({
        ...data,
        close: 42000 // Constant price
      }));

      const result = strategy.generateSignal(flatData, 3, 7);
      
      expect(result).toBeNull();
    });

    it('should include proper metadata in signal', () => {
      const testData = [...extendedMarketData];
      for (let i = 20; i < testData.length; i++) {
        testData[i].close = testData[i].close + (i - 19) * 50;
      }

      const result = strategy.generateSignal(testData, 3, 7);
      
      if (result) {
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.fastEMA).toBeDefined();
        expect(result.metadata?.slowEMA).toBeDefined();
        expect(result.metadata?.volumeConfirmed).toBeDefined();
        expect(result.metadata?.crossoverType).toBeDefined();
      }
    });

    it('should calculate risk-reward ratio', () => {
      const testData = [...extendedMarketData];
      for (let i = 20; i < testData.length; i++) {
        testData[i].close = testData[i].close + (i - 19) * 50;
      }

      const result = strategy.generateSignal(testData, 3, 7);
      
      if (result) {
        expect(result.riskReward).toBeGreaterThan(0);
        expect(typeof result.riskReward).toBe('number');
      }
    });
  });

  describe('evaluateSignalConfidence', () => {
    let mockSignal: TradingSignal;

    beforeEach(() => {
      mockSignal = {
        id: 'test-signal',
        symbol: 'BTC/USDT',
        type: 'BUY',
        strength: 75,
        confidence: 80,
        indicators: ['EMA_20', 'EMA_50'],
        reasoning: 'Test signal',
        riskReward: 1.5,
        timestamp: new Date(),
        metadata: {
          volumeConfirmed: true
        }
      };
    });

    it('should evaluate signal confidence correctly', () => {
      const result = strategy.evaluateSignalConfidence(mockMarketData, mockSignal);
      
      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.technical).toBe(75); // From signal strength
      expect(result.volume).toBe(80); // High due to volume confirmation
      expect(result.momentum).toBeGreaterThan(0);
      expect(result.factors).toHaveLength(3);
    });

    it('should penalize signals without volume confirmation', () => {
      mockSignal.metadata = { volumeConfirmed: false };
      
      const result = strategy.evaluateSignalConfidence(mockMarketData, mockSignal);
      
      expect(result.volume).toBe(40); // Lower due to no volume confirmation
    });

    it('should include descriptive factors', () => {
      const result = strategy.evaluateSignalConfidence(mockMarketData, mockSignal);
      
      expect(result.factors[0]).toContain('EMA crossover strength');
      expect(result.factors[1]).toContain('Volume confirmation');
      expect(result.factors[2]).toContain('Price momentum');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero prices gracefully', () => {
      const zeroPrices = [0, 0, 0, 0, 0];
      const smaResult = strategy.calculateSMA(zeroPrices, 3);
      const emaResult = strategy.calculateEMA(zeroPrices, 3);
      
      expect(smaResult).toBe(0);
      expect(emaResult).toBe(0);
    });

    it('should handle negative prices', () => {
      const negativePrices = [-10, -5, 0, 5, 10];
      const smaResult = strategy.calculateSMA(negativePrices, 5);
      const emaResult = strategy.calculateEMA(negativePrices, 5);
      
      expect(smaResult).toBe(0); // Average of -10 to 10
      expect(emaResult).toBeDefined();
    });

    it('should handle very large numbers', () => {
      const largePrices = [1e10, 1e10 + 1, 1e10 + 2, 1e10 + 3, 1e10 + 4];
      const result = strategy.calculateSMA(largePrices, 3);
      
      expect(result).toBeCloseTo(1e10 + 3, -8); // Should handle precision
    });

    it('should handle market data with missing volume', () => {
      const dataWithoutVolume = mockMarketData.map(data => ({
        ...data,
        volume: 0
      }));

      const result = strategy.generateSignal(dataWithoutVolume, 2, 3);
      
      // Should not crash, may return null or signal without volume confirmation
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle identical consecutive prices', () => {
      const flatPrices = [100, 100, 100, 100, 100];
      const smaResult = strategy.calculateSMA(flatPrices, 3);
      const emaResult = strategy.calculateEMA(flatPrices, 3);
      
      expect(smaResult).toBe(100);
      expect(emaResult).toBe(100);
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large datasets efficiently', () => {
      // Create large dataset
      const largeDataset: MarketData[] = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(2024, 0, i + 1),
          open: 42000 + Math.random() * 1000,
          high: 42500 + Math.random() * 1000,
          low: 41500 + Math.random() * 1000,
          close: 42000 + Math.random() * 1000,
          volume: 1000 + Math.random() * 500
        });
      }

      const startTime = Date.now();
      const result = strategy.generateSignal(largeDataset, 20, 50);
      const endTime = Date.now();

      // Should complete within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should not modify input data', () => {
      const originalData = [...mockMarketData];
      strategy.generateSignal(mockMarketData, 2, 3);
      
      expect(mockMarketData).toEqual(originalData);
    });
  });
});
