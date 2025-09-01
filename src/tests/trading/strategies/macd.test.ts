// =============================================================================
// AI CRYPTO TRADING AGENT - MACD STRATEGY UNIT TESTS
// =============================================================================
// Comprehensive unit tests for MACD trend following strategy
// Tests signal line crossovers, histogram analysis, and divergence detection
// =============================================================================

import { MACDStrategy } from '@/trading/strategies/macd';
import { MACDSignal, TradingSignal } from '@/trading/strategies/types';

describe('MACDStrategy', () => {
  let strategy: MACDStrategy;

  beforeEach(() => {
    strategy = new MACDStrategy();
  });

  describe('calculateMACD', () => {
    it('should calculate MACD correctly for trending market', () => {
      // Create uptrending prices
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5);
      
      const macd = strategy.calculateMACD(prices);
      
      expect(macd.macdLine).toHaveLength(prices.length);
      expect(macd.signalLine).toHaveLength(prices.length);
      expect(macd.histogram).toHaveLength(prices.length);
      
      // First 26 values should be null (need 26 periods for slow EMA)
      expect(macd.macdLine.slice(0, 26).every(val => val === null)).toBe(true);
      
      // MACD line should be positive in uptrend
      const lastMacd = macd.macdLine[macd.macdLine.length - 1];
      expect(lastMacd).toBeGreaterThan(0);
    });

    it('should calculate MACD correctly for downtrending market', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 150 - i * 0.5);
      
      const macd = strategy.calculateMACD(prices);
      
      // MACD line should be negative in downtrend
      const lastMacd = macd.macdLine[macd.macdLine.length - 1];
      expect(lastMacd).toBeLessThan(0);
    });

    it('should handle insufficient data', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      
      const macd = strategy.calculateMACD(prices);
      
      expect(macd.macdLine.slice(0, 26).every(val => val === null)).toBe(true);
    });

    it('should calculate histogram correctly', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 10);
      
      const macd = strategy.calculateMACD(prices);
      
      // Histogram should be MACD line minus signal line
      for (let i = 35; i < macd.histogram.length; i++) { // Start after signal line is available
        if (macd.macdLine[i] !== null && macd.signalLine[i] !== null) {
          expect(macd.histogram[i]).toBeCloseTo(
            macd.macdLine[i]! - macd.signalLine[i]!, 
            6
          );
        }
      }
    });
  });

  describe('detectSignalCrossover', () => {
    it('should detect bullish crossover', () => {
      const macdLine = [null, null, -2, -1, 0, 1, 2];
      const signalLine = [null, null, -1, -0.5, 0.5, 0.8, 1.5];
      
      const crossovers = strategy.detectSignalCrossover(macdLine, signalLine);
      
      expect(crossovers).toHaveLength(7);
      expect(crossovers[4]).toBe('BULLISH'); // MACD crosses above signal
    });

    it('should detect bearish crossover', () => {
      const macdLine = [null, null, 2, 1, 0, -1, -2];
      const signalLine = [null, null, 1.5, 0.8, 0.5, -0.5, -1];
      
      const crossovers = strategy.detectSignalCrossover(macdLine, signalLine);
      
      expect(crossovers[4]).toBe('BEARISH'); // MACD crosses below signal
    });

    it('should handle null values correctly', () => {
      const macdLine = [null, null, null, 1, 2];
      const signalLine = [null, null, null, null, 1.5];
      
      const crossovers = strategy.detectSignalCrossover(macdLine, signalLine);
      
      expect(crossovers[0]).toBeNull();
      expect(crossovers[1]).toBeNull();
      expect(crossovers[2]).toBeNull();
      expect(crossovers[3]).toBeNull();
      expect(crossovers[4]).toBe('BULLISH');
    });

    it('should detect no crossover when lines move parallel', () => {
      const macdLine = [null, null, 1, 2, 3, 4, 5];
      const signalLine = [null, null, 0.5, 1.5, 2.5, 3.5, 4.5];
      
      const crossovers = strategy.detectSignalCrossover(macdLine, signalLine);
      
      expect(crossovers.slice(2).every(val => val === null)).toBe(true);
    });
  });

  describe('analyzeHistogram', () => {
    it('should detect increasing momentum', () => {
      const histogram = [null, null, -2, -1, 0, 1, 2];
      
      const momentum = strategy.analyzeHistogram(histogram);
      
      expect(momentum).toBe('INCREASING');
    });

    it('should detect decreasing momentum', () => {
      const histogram = [null, null, 2, 1, 0, -1, -2];
      
      const momentum = strategy.analyzeHistogram(histogram);
      
      expect(momentum).toBe('DECREASING');
    });

    it('should detect neutral momentum', () => {
      const histogram = [null, null, 1, 1, 1, 1, 1];
      
      const momentum = strategy.analyzeHistogram(histogram);
      
      expect(momentum).toBe('NEUTRAL');
    });

    it('should handle insufficient data', () => {
      const histogram = [null, null, 1];
      
      const momentum = strategy.analyzeHistogram(histogram);
      
      expect(momentum).toBe('NEUTRAL');
    });
  });

  describe('detectMACDDivergence', () => {
    it('should detect bullish divergence', () => {
      const prices = [100, 95, 90, 85, 80, 85, 90, 95, 100];
      const macdLine = [null, null, null, -2, -3, -2.5, -2, -1.5, -1];
      
      const divergence = strategy.detectMACDDivergence(prices, macdLine);
      
      expect(divergence).toBe('BULLISH'); // Price lower low, MACD higher low
    });

    it('should detect bearish divergence', () => {
      const prices = [100, 105, 110, 115, 120, 115, 110, 105, 100];
      const macdLine = [null, null, null, 2, 3, 2.5, 2, 1.5, 1];
      
      const divergence = strategy.detectMACDDivergence(prices, macdLine);
      
      expect(divergence).toBe('BEARISH'); // Price higher high, MACD lower high
    });

    it('should return null when no divergence', () => {
      const prices = [100, 105, 110, 115, 120];
      const macdLine = [null, null, null, 1, 2];
      
      const divergence = strategy.detectMACDDivergence(prices, macdLine);
      
      expect(divergence).toBeNull();
    });
  });

  describe('generateSignal', () => {
    it('should generate BUY signal for bullish crossover with increasing momentum', () => {
      // Create data that results in bullish MACD crossover
      const prices = Array.from({ length: 50 }, (_, i) => {
        if (i < 25) return 100 - i * 0.5; // Downtrend first
        return 87.5 + (i - 25) * 1; // Then uptrend
      });
      const volumes = Array.from({ length: 50 }, () => 1000);
      
      const marketData = {
        symbol: 'BTC/USDT',
        prices,
        volumes,
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      
      expect(signal).toBeDefined();
      expect(signal.type).toBe('BUY');
      expect(signal.symbol).toBe('BTC/USDT');
      expect(signal.indicators).toContain('MACD');
      expect(signal.strength).toBeGreaterThan(0);
    });

    it('should generate SELL signal for bearish crossover', () => {
      // Create data that results in bearish MACD crossover
      const prices = Array.from({ length: 50 }, (_, i) => {
        if (i < 25) return 100 + i * 0.5; // Uptrend first
        return 112.5 - (i - 25) * 1; // Then downtrend
      });
      const volumes = Array.from({ length: 50 }, () => 1000);
      
      const marketData = {
        symbol: 'ETH/USDT',
        prices,
        volumes,
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      
      expect(signal).toBeDefined();
      expect(signal.type).toBe('SELL');
      expect(signal.symbol).toBe('ETH/USDT');
      expect(signal.indicators).toContain('MACD');
    });

    it('should generate HOLD signal when no clear crossover', () => {
      // Create sideways market
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 10) * 2);
      const volumes = Array.from({ length: 50 }, () => 1000);
      
      const marketData = {
        symbol: 'BTC/USDT',
        prices,
        volumes,
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      
      expect(signal.type).toBe('HOLD');
      expect(signal.strength).toBeLessThan(70);
    });

    it('should handle insufficient data gracefully', () => {
      const marketData = {
        symbol: 'BTC/USDT',
        prices: Array.from({ length: 20 }, (_, i) => 100 + i),
        volumes: Array.from({ length: 20 }, () => 1000),
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      
      expect(signal.type).toBe('HOLD');
      expect(signal.strength).toBe(0);
      expect(signal.confidence).toBe(0);
    });

    it('should increase confidence with divergence confirmation', () => {
      // Create bullish divergence scenario with sufficient data
      const prices = Array.from({ length: 50 }, (_, i) => {
        if (i < 25) return 100 - i * 2; // Strong downtrend
        return 50 + (i - 25) * 0.5; // Weak recovery
      });
      const volumes = Array.from({ length: 50 }, () => 1000);
      
      const marketData = {
        symbol: 'BTC/USDT',
        prices,
        volumes,
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      
      if (signal.type !== 'HOLD') {
        expect(signal.confidence).toBeGreaterThan(50);
      }
    });
  });

  describe('calculateSignalStrength', () => {
    it('should calculate higher strength for strong crossovers', () => {
      const macdValue = 2.5;
      const signalValue = 1.0;
      const crossoverType = 'BULLISH';
      const momentum = 'INCREASING';
      
      const strength = strategy.calculateSignalStrength(
        macdValue, 
        signalValue, 
        crossoverType, 
        momentum
      );
      
      expect(strength).toBeGreaterThan(70);
      expect(strength).toBeLessThanOrEqual(100);
    });

    it('should calculate lower strength for weak crossovers', () => {
      const macdValue = 0.1;
      const signalValue = 0.05;
      const crossoverType = 'BULLISH';
      const momentum = 'NEUTRAL';
      
      const strength = strategy.calculateSignalStrength(
        macdValue, 
        signalValue, 
        crossoverType, 
        momentum
      );
      
      expect(strength).toBeLessThan(50);
      expect(strength).toBeGreaterThan(0);
    });

    it('should return 0 for invalid crossover type', () => {
      const strength = strategy.calculateSignalStrength(1, 0.5, 'INVALID' as any, 'INCREASING');
      
      expect(strength).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle NaN values in prices', () => {
      const prices = Array.from({ length: 50 }, (_, i) => {
        if (i === 25) return NaN;
        return 100 + i * 0.5;
      });
      const volumes = Array.from({ length: 50 }, () => 1000);
      
      const marketData = {
        symbol: 'BTC/USDT',
        prices,
        volumes,
        timestamp: new Date()
      };
      
      expect(() => strategy.generateSignal(marketData)).not.toThrow();
    });

    it('should handle extreme price volatility', () => {
      const prices = Array.from({ length: 50 }, (_, i) => {
        return 100 + (Math.random() - 0.5) * 200; // Very volatile
      });
      const volumes = Array.from({ length: 50 }, () => 1000);
      
      const marketData = {
        symbol: 'BTC/USDT',
        prices,
        volumes,
        timestamp: new Date()
      };
      
      expect(() => strategy.generateSignal(marketData)).not.toThrow();
    });

    it('should validate configuration parameters', () => {
      expect(() => new MACDStrategy({ fastPeriod: 0 })).toThrow();
      expect(() => new MACDStrategy({ slowPeriod: 0 })).toThrow();
      expect(() => new MACDStrategy({ signalPeriod: 0 })).toThrow();
      expect(() => new MACDStrategy({ fastPeriod: 26, slowPeriod: 12 })).toThrow(); // Fast > slow
    });

    it('should handle identical prices', () => {
      const prices = Array.from({ length: 50 }, () => 100); // No price movement
      const volumes = Array.from({ length: 50 }, () => 1000);
      
      const marketData = {
        symbol: 'BTC/USDT',
        prices,
        volumes,
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      
      expect(signal.type).toBe('HOLD');
      expect(signal.strength).toBe(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', () => {
      const prices = Array.from({ length: 1000 }, (_, i) => 100 + Math.sin(i / 20) * 50);
      const volumes = Array.from({ length: 1000 }, () => 1000);
      
      const marketData = {
        symbol: 'BTC/USDT',
        prices,
        volumes,
        timestamp: new Date()
      };
      
      const startTime = Date.now();
      const signal = strategy.generateSignal(marketData);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(signal).toBeDefined();
    });

    it('should produce consistent results for same input', () => {
      const marketData = {
        symbol: 'BTC/USDT',
        prices: Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 10),
        volumes: Array.from({ length: 50 }, () => 1000),
        timestamp: new Date()
      };
      
      const signal1 = strategy.generateSignal(marketData);
      const signal2 = strategy.generateSignal(marketData);
      
      expect(signal1.type).toBe(signal2.type);
      expect(signal1.strength).toBe(signal2.strength);
      expect(signal1.confidence).toBe(signal2.confidence);
    });
  });
});