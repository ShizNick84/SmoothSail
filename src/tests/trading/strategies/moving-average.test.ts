// =============================================================================
// AI CRYPTO TRADING AGENT - MOVING AVERAGE STRATEGY UNIT TESTS
// =============================================================================
// Comprehensive unit tests for moving average crossover strategy
// Tests all edge cases, boundary conditions, and signal generation
// =============================================================================

import { MovingAverageStrategy } from '@/trading/strategies/moving-average';
import { MovingAverageSignal, TradingSignal } from '@/trading/strategies/types';

describe('MovingAverageStrategy', () => {
  let strategy: MovingAverageStrategy;

  beforeEach(() => {
    strategy = new MovingAverageStrategy();
  });

  describe('calculateEMA', () => {
    it('should calculate EMA correctly for valid data', () => {
      const prices = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28];
      const period = 5;
      
      const ema = strategy.calculateEMA(prices, period);
      
      expect(ema).toHaveLength(prices.length);
      expect(ema[0]).toBeNull(); // First values should be null
      expect(ema[4]).toBeCloseTo(14, 2); // First EMA value
      expect(ema[ema.length - 1]).toBeGreaterThan(prices[prices.length - 1] * 0.8);
    });

    it('should handle insufficient data gracefully', () => {
      const prices = [10, 12, 14];
      const period = 5;
      
      const ema = strategy.calculateEMA(prices, period);
      
      expect(ema).toHaveLength(3);
      expect(ema.every(val => val === null)).toBe(true);
    });

    it('should handle empty array', () => {
      const prices: number[] = [];
      const period = 5;
      
      const ema = strategy.calculateEMA(prices, period);
      
      expect(ema).toHaveLength(0);
    });

    it('should handle single price point', () => {
      const prices = [100];
      const period = 1;
      
      const ema = strategy.calculateEMA(prices, period);
      
      expect(ema).toHaveLength(1);
      expect(ema[0]).toBe(100);
    });
  });

  describe('calculateSMA', () => {
    it('should calculate SMA correctly for valid data', () => {
      const prices = [10, 20, 30, 40, 50];
      const period = 3;
      
      const sma = strategy.calculateSMA(prices, period);
      
      expect(sma).toHaveLength(5);
      expect(sma[0]).toBeNull();
      expect(sma[1]).toBeNull();
      expect(sma[2]).toBe(20); // (10+20+30)/3
      expect(sma[3]).toBe(30); // (20+30+40)/3
      expect(sma[4]).toBe(40); // (30+40+50)/3
    });

    it('should handle period larger than data length', () => {
      const prices = [10, 20, 30];
      const period = 5;
      
      const sma = strategy.calculateSMA(prices, period);
      
      expect(sma.every(val => val === null)).toBe(true);
    });
  });

  describe('detectCrossover', () => {
    it('should detect bullish crossover', () => {
      const fastMA = [null, null, 10, 12, 15, 18, 22];
      const slowMA = [null, null, null, null, 14, 16, 20];
      
      const crossovers = strategy.detectCrossover(fastMA, slowMA);
      
      expect(crossovers).toHaveLength(7);
      expect(crossovers[4]).toBe('BULLISH'); // Fast crosses above slow
      expect(crossovers[5]).toBe('BULLISH');
      expect(crossovers[6]).toBe('BULLISH');
    });

    it('should detect bearish crossover', () => {
      const fastMA = [null, null, 20, 18, 15, 12, 10];
      const slowMA = [null, null, null, null, 16, 14, 12];
      
      const crossovers = strategy.detectCrossover(fastMA, slowMA);
      
      expect(crossovers).toHaveLength(7);
      expect(crossovers[4]).toBe('BEARISH'); // Fast crosses below slow
    });

    it('should handle null values correctly', () => {
      const fastMA = [null, null, 10, 12];
      const slowMA = [null, null, null, 11];
      
      const crossovers = strategy.detectCrossover(fastMA, slowMA);
      
      expect(crossovers[0]).toBeNull();
      expect(crossovers[1]).toBeNull();
      expect(crossovers[2]).toBeNull();
      expect(crossovers[3]).toBe('BULLISH');
    });
  });

  describe('confirmWithVolume', () => {
    it('should confirm signal with high volume', () => {
      const volumes = [1000, 1200, 1500, 2000, 2500];
      const currentIndex = 4;
      
      const confirmed = strategy.confirmWithVolume(volumes, currentIndex);
      
      expect(confirmed).toBe(true);
    });

    it('should reject signal with low volume', () => {
      const volumes = [2000, 1800, 1500, 1200, 800];
      const currentIndex = 4;
      
      const confirmed = strategy.confirmWithVolume(volumes, currentIndex);
      
      expect(confirmed).toBe(false);
    });

    it('should handle insufficient volume data', () => {
      const volumes = [1000, 1200];
      const currentIndex = 1;
      
      const confirmed = strategy.confirmWithVolume(volumes, currentIndex);
      
      expect(confirmed).toBe(false);
    });
  });

  describe('generateSignal', () => {
    it('should generate BUY signal for bullish crossover with volume confirmation', () => {
      const marketData = {
        symbol: 'BTC/USDT',
        prices: [45000, 46000, 47000, 48000, 49000, 50000, 51000, 52000],
        volumes: [100, 120, 150, 180, 200, 250, 300, 350],
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      
      expect(signal).toBeDefined();
      expect(signal.type).toBe('BUY');
      expect(signal.symbol).toBe('BTC/USDT');
      expect(signal.strength).toBeGreaterThan(0);
      expect(signal.confidence).toBeGreaterThan(0);
      expect(signal.indicators).toContain('MA_CROSSOVER');
    });

    it('should generate SELL signal for bearish crossover', () => {
      const marketData = {
        symbol: 'ETH/USDT',
        prices: [3000, 2950, 2900, 2850, 2800, 2750, 2700, 2650],
        volumes: [100, 120, 150, 180, 200, 250, 300, 350],
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      
      expect(signal).toBeDefined();
      expect(signal.type).toBe('SELL');
      expect(signal.symbol).toBe('ETH/USDT');
      expect(signal.strength).toBeGreaterThan(0);
    });

    it('should return HOLD signal when no clear crossover', () => {
      const marketData = {
        symbol: 'BTC/USDT',
        prices: [50000, 50100, 49900, 50050, 49950, 50025, 49975, 50000],
        volumes: [100, 100, 100, 100, 100, 100, 100, 100],
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      
      expect(signal.type).toBe('HOLD');
      expect(signal.strength).toBeLessThan(50);
    });

    it('should handle insufficient data gracefully', () => {
      const marketData = {
        symbol: 'BTC/USDT',
        prices: [50000, 51000],
        volumes: [100, 120],
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      
      expect(signal.type).toBe('HOLD');
      expect(signal.strength).toBe(0);
      expect(signal.confidence).toBe(0);
    });
  });

  describe('calculateSignalStrength', () => {
    it('should calculate higher strength for larger price movements', () => {
      const prices = [100, 105, 110, 115, 120];
      const crossoverType = 'BULLISH';
      
      const strength = strategy.calculateSignalStrength(prices, crossoverType);
      
      expect(strength).toBeGreaterThan(50);
      expect(strength).toBeLessThanOrEqual(100);
    });

    it('should calculate lower strength for smaller movements', () => {
      const prices = [100, 100.5, 101, 101.5, 102];
      const crossoverType = 'BULLISH';
      
      const strength = strategy.calculateSignalStrength(prices, crossoverType);
      
      expect(strength).toBeLessThan(50);
      expect(strength).toBeGreaterThan(0);
    });

    it('should return 0 for invalid crossover type', () => {
      const prices = [100, 105, 110];
      const crossoverType = 'INVALID' as any;
      
      const strength = strategy.calculateSignalStrength(prices, crossoverType);
      
      expect(strength).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle NaN values in prices', () => {
      const marketData = {
        symbol: 'BTC/USDT',
        prices: [50000, NaN, 51000, 52000],
        volumes: [100, 120, 150, 180],
        timestamp: new Date()
      };
      
      expect(() => strategy.generateSignal(marketData)).not.toThrow();
    });

    it('should handle negative prices', () => {
      const marketData = {
        symbol: 'BTC/USDT',
        prices: [50000, -1000, 51000, 52000],
        volumes: [100, 120, 150, 180],
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      expect(signal.type).toBe('HOLD');
    });

    it('should handle zero volumes', () => {
      const marketData = {
        symbol: 'BTC/USDT',
        prices: [50000, 51000, 52000, 53000],
        volumes: [0, 0, 0, 0],
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      expect(signal.confidence).toBeLessThan(50);
    });

    it('should validate configuration parameters', () => {
      expect(() => new MovingAverageStrategy({ fastPeriod: 0 })).toThrow();
      expect(() => new MovingAverageStrategy({ slowPeriod: 0 })).toThrow();
      expect(() => new MovingAverageStrategy({ fastPeriod: 50, slowPeriod: 20 })).toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => 50000 + Math.random() * 1000);
      const volumes = Array.from({ length: 10000 }, () => 100 + Math.random() * 200);
      
      const marketData = {
        symbol: 'BTC/USDT',
        prices: largeDataset,
        volumes: volumes,
        timestamp: new Date()
      };
      
      const startTime = Date.now();
      const signal = strategy.generateSignal(marketData);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(signal).toBeDefined();
    });
  });
});