// =============================================================================
// AI CRYPTO TRADING AGENT - RSI STRATEGY UNIT TESTS
// =============================================================================
// Comprehensive unit tests for RSI momentum strategy
// Tests overbought/oversold conditions, divergence detection, and signal generation
// =============================================================================

import { RSIStrategy } from '@/trading/strategies/rsi';
import { RSISignal, TradingSignal } from '@/trading/strategies/types';

describe('RSIStrategy', () => {
  let strategy: RSIStrategy;

  beforeEach(() => {
    strategy = new RSIStrategy();
  });

  describe('calculateRSI', () => {
    it('should calculate RSI correctly for trending up market', () => {
      // Prices trending upward should result in RSI > 50
      const prices = [100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 128];
      
      const rsi = strategy.calculateRSI(prices, 14);
      
      expect(rsi).toHaveLength(prices.length);
      expect(rsi.slice(0, 14).every(val => val === null)).toBe(true); // First 14 values null
      expect(rsi[14]).toBeGreaterThan(50); // RSI should be > 50 for uptrend
      expect(rsi[14]).toBeLessThan(100); // RSI should be < 100
    });

    it('should calculate RSI correctly for trending down market', () => {
      // Prices trending downward should result in RSI < 50
      const prices = [128, 126, 124, 122, 120, 118, 116, 114, 112, 110, 108, 106, 104, 102, 100];
      
      const rsi = strategy.calculateRSI(prices, 14);
      
      expect(rsi[14]).toBeLessThan(50); // RSI should be < 50 for downtrend
      expect(rsi[14]).toBeGreaterThan(0); // RSI should be > 0
    });

    it('should handle sideways market correctly', () => {
      const prices = [100, 101, 99, 100, 102, 98, 100, 101, 99, 100, 102, 98, 100, 101, 99];
      
      const rsi = strategy.calculateRSI(prices, 14);
      
      expect(rsi[14]).toBeGreaterThan(40);
      expect(rsi[14]).toBeLessThan(60); // RSI should be around 50 for sideways
    });

    it('should handle insufficient data', () => {
      const prices = [100, 102, 104, 106, 108];
      
      const rsi = strategy.calculateRSI(prices, 14);
      
      expect(rsi.every(val => val === null)).toBe(true);
    });

    it('should handle edge case with identical prices', () => {
      const prices = Array(20).fill(100); // All prices the same
      
      const rsi = strategy.calculateRSI(prices, 14);
      
      expect(rsi[14]).toBe(50); // RSI should be 50 when no price movement
    });
  });

  describe('detectOverboughtOversold', () => {
    it('should detect overbought condition', () => {
      const rsiValues = [null, null, 65, 70, 75, 80, 85];
      
      const conditions = strategy.detectOverboughtOversold(rsiValues, 70, 30);
      
      expect(conditions).toHaveLength(7);
      expect(conditions[3]).toBe('OVERBOUGHT');
      expect(conditions[4]).toBe('OVERBOUGHT');
      expect(conditions[5]).toBe('OVERBOUGHT');
      expect(conditions[6]).toBe('OVERBOUGHT');
    });

    it('should detect oversold condition', () => {
      const rsiValues = [null, null, 35, 30, 25, 20, 15];
      
      const conditions = strategy.detectOverboughtOversold(rsiValues, 70, 30);
      
      expect(conditions[3]).toBe('OVERSOLD');
      expect(conditions[4]).toBe('OVERSOLD');
      expect(conditions[5]).toBe('OVERSOLD');
      expect(conditions[6]).toBe('OVERSOLD');
    });

    it('should detect neutral condition', () => {
      const rsiValues = [null, null, 45, 50, 55, 60, 65];
      
      const conditions = strategy.detectOverboughtOversold(rsiValues, 70, 30);
      
      expect(conditions[2]).toBe('NEUTRAL');
      expect(conditions[3]).toBe('NEUTRAL');
      expect(conditions[4]).toBe('NEUTRAL');
      expect(conditions[5]).toBe('NEUTRAL');
      expect(conditions[6]).toBe('NEUTRAL');
    });

    it('should handle null RSI values', () => {
      const rsiValues = [null, null, null, null];
      
      const conditions = strategy.detectOverboughtOversold(rsiValues, 70, 30);
      
      expect(conditions.every(val => val === null)).toBe(true);
    });
  });

  describe('detectDivergence', () => {
    it('should detect bullish divergence', () => {
      const prices = [100, 95, 90, 85, 80, 85, 90, 95, 100];
      const rsiValues = [null, null, null, null, 25, 30, 35, 40, 45];
      
      const divergence = strategy.detectDivergence(prices, rsiValues);
      
      expect(divergence).toBe('BULLISH'); // Price makes lower low, RSI makes higher low
    });

    it('should detect bearish divergence', () => {
      const prices = [100, 105, 110, 115, 120, 115, 110, 105, 100];
      const rsiValues = [null, null, null, null, 75, 70, 65, 60, 55];
      
      const divergence = strategy.detectDivergence(prices, rsiValues);
      
      expect(divergence).toBe('BEARISH'); // Price makes higher high, RSI makes lower high
    });

    it('should return null when no divergence', () => {
      const prices = [100, 105, 110, 115, 120];
      const rsiValues = [null, null, null, 60, 65];
      
      const divergence = strategy.detectDivergence(prices, rsiValues);
      
      expect(divergence).toBeNull();
    });

    it('should handle insufficient data', () => {
      const prices = [100, 105];
      const rsiValues = [null, 60];
      
      const divergence = strategy.detectDivergence(prices, rsiValues);
      
      expect(divergence).toBeNull();
    });
  });

  describe('generateSignal', () => {
    it('should generate SELL signal for overbought condition', () => {
      // Create data that will result in overbought RSI
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 2); // Strong uptrend
      const volumes = Array.from({ length: 20 }, () => 1000);
      
      const marketData = {
        symbol: 'BTC/USDT',
        prices,
        volumes,
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      
      expect(signal).toBeDefined();
      expect(signal.type).toBe('SELL');
      expect(signal.symbol).toBe('BTC/USDT');
      expect(signal.indicators).toContain('RSI');
      expect(signal.strength).toBeGreaterThan(0);
    });

    it('should generate BUY signal for oversold condition', () => {
      // Create data that will result in oversold RSI
      const prices = Array.from({ length: 20 }, (_, i) => 100 - i * 2); // Strong downtrend
      const volumes = Array.from({ length: 20 }, () => 1000);
      
      const marketData = {
        symbol: 'ETH/USDT',
        prices,
        volumes,
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      
      expect(signal).toBeDefined();
      expect(signal.type).toBe('BUY');
      expect(signal.symbol).toBe('ETH/USDT');
      expect(signal.indicators).toContain('RSI');
    });

    it('should generate HOLD signal for neutral RSI', () => {
      // Create sideways market data
      const prices = Array.from({ length: 20 }, (_, i) => 100 + Math.sin(i) * 2);
      const volumes = Array.from({ length: 20 }, () => 1000);
      
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
        prices: [100, 102, 104],
        volumes: [1000, 1100, 1200],
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      
      expect(signal.type).toBe('HOLD');
      expect(signal.strength).toBe(0);
      expect(signal.confidence).toBe(0);
    });

    it('should increase confidence with divergence confirmation', () => {
      // Create bullish divergence scenario
      const prices = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 32, 34, 36, 38, 40];
      const volumes = Array.from({ length: 20 }, () => 1000);
      
      const marketData = {
        symbol: 'BTC/USDT',
        prices,
        volumes,
        timestamp: new Date()
      };
      
      const signal = strategy.generateSignal(marketData);
      
      expect(signal.confidence).toBeGreaterThan(60); // Higher confidence with divergence
    });
  });

  describe('calculateSignalStrength', () => {
    it('should calculate higher strength for extreme RSI values', () => {
      const rsiValue = 85; // Very overbought
      const condition = 'OVERBOUGHT';
      
      const strength = strategy.calculateSignalStrength(rsiValue, condition);
      
      expect(strength).toBeGreaterThan(70);
      expect(strength).toBeLessThanOrEqual(100);
    });

    it('should calculate lower strength for moderate RSI values', () => {
      const rsiValue = 72; // Slightly overbought
      const condition = 'OVERBOUGHT';
      
      const strength = strategy.calculateSignalStrength(rsiValue, condition);
      
      expect(strength).toBeLessThan(70);
      expect(strength).toBeGreaterThan(0);
    });

    it('should return 0 for neutral condition', () => {
      const rsiValue = 50;
      const condition = 'NEUTRAL';
      
      const strength = strategy.calculateSignalStrength(rsiValue, condition);
      
      expect(strength).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle NaN values in prices', () => {
      const marketData = {
        symbol: 'BTC/USDT',
        prices: [100, NaN, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 128, 130],
        volumes: Array.from({ length: 17 }, () => 1000),
        timestamp: new Date()
      };
      
      expect(() => strategy.generateSignal(marketData)).not.toThrow();
    });

    it('should handle extreme price movements', () => {
      const prices = [100, 200, 50, 300, 25, 400, 10]; // Extreme volatility
      const volumes = Array.from({ length: 7 }, () => 1000);
      
      const marketData = {
        symbol: 'BTC/USDT',
        prices,
        volumes,
        timestamp: new Date()
      };
      
      expect(() => strategy.generateSignal(marketData)).not.toThrow();
    });

    it('should validate configuration parameters', () => {
      expect(() => new RSIStrategy({ period: 0 })).toThrow();
      expect(() => new RSIStrategy({ period: -1 })).toThrow();
      expect(() => new RSIStrategy({ overboughtThreshold: 50 })).toThrow(); // Should be > 50
      expect(() => new RSIStrategy({ oversoldThreshold: 60 })).toThrow(); // Should be < 50
    });

    it('should handle configuration with invalid thresholds', () => {
      expect(() => new RSIStrategy({ 
        overboughtThreshold: 30, 
        oversoldThreshold: 70 
      })).toThrow(); // Overbought should be > oversold
    });
  });

  describe('Performance and Accuracy Tests', () => {
    it('should maintain accuracy with large datasets', () => {
      const prices = Array.from({ length: 1000 }, (_, i) => 100 + Math.sin(i / 10) * 20);
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
      
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
      expect(signal).toBeDefined();
      expect(signal.strength).toBeGreaterThanOrEqual(0);
      expect(signal.strength).toBeLessThanOrEqual(100);
    });

    it('should produce consistent results for same input', () => {
      const marketData = {
        symbol: 'BTC/USDT',
        prices: Array.from({ length: 20 }, (_, i) => 100 + i),
        volumes: Array.from({ length: 20 }, () => 1000),
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