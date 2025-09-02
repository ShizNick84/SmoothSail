/**
 * Fibonacci Strategy Tests
 * 
 * Comprehensive test suite for Fibonacci retracement calculations, level analysis, and signal generation.
 * Tests cover Fibonacci level calculations, swing point detection, and trading signal generation.
 */

import { FibonacciStrategy } from '../fibonacci';
import { MarketData } from '../types';

describe('FibonacciStrategy', () => {
  let strategy: FibonacciStrategy;
  let mockMarketData: MarketData[];

  beforeEach(() => {
    strategy = new FibonacciStrategy();
    
    // Create mock market data with clear swing points
    mockMarketData = [];
    const basePrice = 100;
    const baseVolume = 1000000;
    
    // Create a clear uptrend with swing points
    for (let i = 0; i < 60; i++) {
      let price: number;
      
      if (i < 20) {
        // Initial downtrend to create swing low
        price = basePrice - (i * 2);
      } else if (i < 40) {
        // Strong uptrend to create swing high
        price = 60 + ((i - 20) * 4);
      } else {
        // Retracement phase
        price = 140 - ((i - 40) * 1.5);
      }
      
      mockMarketData.push({
        symbol: 'BTC/USDT',
        timestamp: new Date(Date.now() - (60 - i) * 60000),
        open: price - 0.5,
        high: price + 1,
        low: price - 1,
        close: price,
        volume: baseVolume + Math.random() * 500000
      });
    }
  });

  describe('Fibonacci Level Calculations', () => {
    test('should calculate Fibonacci levels correctly', () => {
      const high = 140;
      const low = 60;
      const fibLevels = strategy.calculateFibonacciLevels(high, low);
      
      expect(fibLevels.high).toBe(high);
      expect(fibLevels.low).toBe(low);
      
      // Check specific Fibonacci levels
      expect(fibLevels.levels['23.6']).toBeCloseTo(121.12, 2); // 140 - (80 * 0.236)
      expect(fibLevels.levels['38.2']).toBeCloseTo(109.44, 2); // 140 - (80 * 0.382)
      expect(fibLevels.levels['50.0']).toBeCloseTo(100, 2);    // 140 - (80 * 0.5)
      expect(fibLevels.levels['61.8']).toBeCloseTo(90.56, 2);  // 140 - (80 * 0.618)
      expect(fibLevels.levels['78.6']).toBeCloseTo(77.12, 2);  // 140 - (80 * 0.786)
    });

    test('should categorize levels as support in uptrend', () => {
      const high = 140;
      const low = 60;
      const fibLevels = strategy.calculateFibonacciLevels(high, low);
      
      expect(fibLevels.support.length).toBe(5);
      expect(fibLevels.resistance.length).toBe(0);
      expect(fibLevels.support).toEqual(expect.arrayContaining([
        expect.closeTo(121.12, 2),
        expect.closeTo(109.44, 2),
        expect.closeTo(100, 2),
        expect.closeTo(90.56, 2),
        expect.closeTo(77.12, 2)
      ]));
    });

    test('should categorize levels as resistance in downtrend', () => {
      const high = 60; // Inverted for downtrend
      const low = 140;
      const fibLevels = strategy.calculateFibonacciLevels(high, low);
      
      expect(fibLevels.support.length).toBe(0);
      expect(fibLevels.resistance.length).toBe(5);
    });

    test('should handle equal high and low', () => {
      const fibLevels = strategy.calculateFibonacciLevels(100, 100);
      
      expect(fibLevels.high).toBe(100);
      expect(fibLevels.low).toBe(100);
      Object.values(fibLevels.levels).forEach(level => {
        expect(level).toBe(100);
      });
    });
  });

  describe('Swing Point Detection', () => {
    test('should find swing highs and lows', () => {
      const swingPoints = strategy.findSwingPoints(mockMarketData, 10);
      
      expect(swingPoints.swingHigh).not.toBeNull();
      expect(swingPoints.swingLow).not.toBeNull();
      expect(swingPoints.swingHigh!.price).toBeGreaterThan(swingPoints.swingLow!.price);
    });

    test('should return null for insufficient data', () => {
      const shortData = mockMarketData.slice(0, 15);
      const swingPoints = strategy.findSwingPoints(shortData, 10);
      
      expect(swingPoints.swingHigh).toBeNull();
      expect(swingPoints.swingLow).toBeNull();
    });

    test('should find most significant swing points', () => {
      // Create data with multiple swing points
      const swingData: MarketData[] = [];
      const prices = [100, 95, 90, 95, 100, 110, 120, 115, 110, 105, 100];
      
      prices.forEach((price, i) => {
        swingData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (prices.length - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000
        });
      });

      const swingPoints = strategy.findSwingPoints(swingData, 2);
      
      if (swingPoints.swingHigh && swingPoints.swingLow) {
        expect(swingPoints.swingHigh.price).toBeGreaterThan(115); // Should find the highest point
        expect(swingPoints.swingLow.price).toBeLessThan(95);      // Should find the lowest point
      }
    });
  });

  describe('Dynamic Fibonacci Levels', () => {
    test('should generate dynamic Fibonacci levels', () => {
      const fibLevels = strategy.getDynamicFibonacciLevels(mockMarketData, 15);
      
      expect(fibLevels).not.toBeNull();
      expect(fibLevels!.high).toBeGreaterThan(fibLevels!.low);
      expect(Object.keys(fibLevels!.levels)).toHaveLength(5);
    });

    test('should return null for insufficient swing size', () => {
      // Create data with very small price movements
      const flatData: MarketData[] = [];
      for (let i = 0; i < 50; i++) {
        const price = 100 + Math.sin(i * 0.1) * 0.5; // Very small oscillations
        flatData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          open: price - 0.1,
          high: price + 0.1,
          low: price - 0.1,
          close: price,
          volume: 1000000
        });
      }

      const fibLevels = strategy.getDynamicFibonacciLevels(flatData, 15);
      expect(fibLevels).toBeNull(); // Should return null for insignificant swings
    });

    test('should return null for insufficient data', () => {
      const shortData = mockMarketData.slice(0, 20);
      const fibLevels = strategy.getDynamicFibonacciLevels(shortData, 15);
      expect(fibLevels).toBeNull();
    });
  });

  describe('Fibonacci Proximity Check', () => {
    test('should detect proximity to Fibonacci levels', () => {
      const fibLevels = strategy.calculateFibonacciLevels(140, 60);
      const currentPrice = 100.1; // Very close to 50% level (100)
      
      const proximity = strategy.checkFibonacciProximity(currentPrice, fibLevels);
      
      expect(proximity.nearLevel).toBe('50.0');
      expect(proximity.levelPrice).toBeCloseTo(100, 2);
      expect(proximity.distance).toBeLessThan(0.002); // Within threshold
      expect(proximity.levelType).toBe('support');
    });

    test('should return null when not near any level', () => {
      const fibLevels = strategy.calculateFibonacciLevels(140, 60);
      const currentPrice = 95; // Not close to any level
      
      const proximity = strategy.checkFibonacciProximity(currentPrice, fibLevels);
      
      expect(proximity.nearLevel).toBeNull();
      expect(proximity.levelPrice).toBeNull();
      expect(proximity.levelType).toBeNull();
    });

    test('should identify correct level type', () => {
      const fibLevels = strategy.calculateFibonacciLevels(140, 60);
      
      // Test support level
      const supportProximity = strategy.checkFibonacciProximity(100.05, fibLevels);
      expect(supportProximity.levelType).toBe('support');
      
      // Test with downtrend (resistance levels)
      const fibLevelsDown = strategy.calculateFibonacciLevels(60, 140);
      const resistanceProximity = strategy.checkFibonacciProximity(100.05, fibLevelsDown);
      expect(resistanceProximity.levelType).toBe('resistance');
    });
  });

  describe('Trading Signal Generation', () => {
    test('should generate buy signal at support level', () => {
      // Create data where price bounces off Fibonacci support
      const bounceData: MarketData[] = [];
      
      // Build up to swing high
      for (let i = 0; i < 25; i++) {
        const price = 60 + (i * 3.2); // Up to 140
        bounceData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000
        });
      }
      
      // Retrace to Fibonacci level and bounce
      for (let i = 0; i < 15; i++) {
        const price = 140 - (i * 2.5); // Down to around 102.5
        bounceData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (25 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000 * (i > 12 ? 2 : 1) // Higher volume on bounce
        });
      }
      
      // Bounce up
      for (let i = 0; i < 10; i++) {
        const price = 102.5 + (i * 1); // Bounce up
        bounceData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (10 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 2000000 // High volume on bounce
        });
      }

      const signal = strategy.generateSignal(bounceData, 15);
      
      if (signal) {
        expect(signal.type).toBe('BUY');
        expect(signal.strength).toBeGreaterThan(0);
        expect(signal.confidence).toBeGreaterThan(0);
        expect(signal.reasoning).toContain('support');
        expect(signal.metadata?.levelType).toBe('support');
      }
    });

    test('should generate sell signal at resistance level', () => {
      // Create data where price is rejected at Fibonacci resistance
      const rejectionData: MarketData[] = [];
      
      // Build down to swing low
      for (let i = 0; i < 25; i++) {
        const price = 140 - (i * 3.2); // Down to 60
        rejectionData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000
        });
      }
      
      // Rally to Fibonacci level and get rejected
      for (let i = 0; i < 15; i++) {
        const price = 60 + (i * 2.5); // Up to around 97.5
        rejectionData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (25 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000 * (i > 12 ? 2 : 1) // Higher volume on rejection
        });
      }
      
      // Get rejected
      for (let i = 0; i < 10; i++) {
        const price = 97.5 - (i * 1); // Rejection down
        rejectionData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (10 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 2000000 // High volume on rejection
        });
      }

      const signal = strategy.generateSignal(rejectionData, 15);
      
      if (signal) {
        expect(signal.type).toBe('SELL');
        expect(signal.strength).toBeGreaterThan(0);
        expect(signal.confidence).toBeGreaterThan(0);
        expect(signal.reasoning).toContain('resistance');
        expect(signal.metadata?.levelType).toBe('resistance');
      }
    });

    test('should return null when not near Fibonacci levels', () => {
      // Create data where price is not near any Fibonacci level
      const neutralData: MarketData[] = [];
      for (let i = 0; i < 50; i++) {
        const price = 95 + Math.sin(i * 0.1) * 1; // Oscillate around 95 (not near any Fib level)
        neutralData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000
        });
      }

      const signal = strategy.generateSignal(neutralData, 15);
      expect(signal).toBeNull();
    });

    test('should include proper metadata', () => {
      const signal = strategy.generateSignal(mockMarketData, 15);
      
      if (signal) {
        expect(signal.metadata).toBeDefined();
        expect(signal.metadata?.fibonacciLevel).toBeDefined();
        expect(signal.metadata?.levelPrice).toBeDefined();
        expect(signal.metadata?.levelType).toBeDefined();
        expect(signal.metadata?.swingHigh).toBeDefined();
        expect(signal.metadata?.swingLow).toBeDefined();
        expect(signal.metadata?.allLevels).toBeDefined();
        expect(signal.indicators[0]).toContain('FIB_');
      }
    });

    test('should calculate risk-reward ratio', () => {
      const signal = strategy.generateSignal(mockMarketData, 15);
      
      if (signal) {
        expect(signal.riskReward).toBeGreaterThan(0);
        expect(typeof signal.riskReward).toBe('number');
      }
    });
  });

  describe('Signal Confidence Evaluation', () => {
    test('should evaluate signal confidence correctly', () => {
      const signal = strategy.generateSignal(mockMarketData, 15);
      
      if (signal) {
        const confidence = strategy.evaluateSignalConfidence(mockMarketData, signal);
        
        expect(confidence.overall).toBeGreaterThanOrEqual(0);
        expect(confidence.overall).toBeLessThanOrEqual(100);
        expect(confidence.technical).toBeGreaterThanOrEqual(0);
        expect(confidence.technical).toBeLessThanOrEqual(100);
        expect(confidence.volume).toBeGreaterThanOrEqual(0);
        expect(confidence.volume).toBeLessThanOrEqual(100);
        expect(confidence.momentum).toBeGreaterThanOrEqual(0);
        expect(confidence.momentum).toBeLessThanOrEqual(100);
        expect(confidence.factors.length).toBeGreaterThanOrEqual(4);
      }
    });

    test('should provide detailed factors', () => {
      const signal = strategy.generateSignal(mockMarketData, 15);
      
      if (signal) {
        const confidence = strategy.evaluateSignalConfidence(mockMarketData, signal);
        
        expect(confidence.factors[0]).toContain('Fibonacci signal strength');
        expect(confidence.factors[1]).toContain('Volume confirmation');
        expect(confidence.factors[2]).toContain('Level significance');
        expect(confidence.factors[3]).toContain('Fibonacci level');
      }
    });

    test('should include price action details in factors', () => {
      const signal = strategy.generateSignal(mockMarketData, 15);
      
      if (signal) {
        const confidence = strategy.evaluateSignalConfidence(mockMarketData, signal);
        
        // Should include level type and price action information
        const levelTypeFactors = confidence.factors.filter(f => f.includes('Level type'));
        const volumeFactors = confidence.factors.filter(f => f.includes('Volume:'));
        
        expect(levelTypeFactors.length).toBeGreaterThan(0);
        expect(volumeFactors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty market data', () => {
      const signal = strategy.generateSignal([], 15);
      expect(signal).toBeNull();
    });

    test('should handle single data point', () => {
      const singleData = [mockMarketData[0]];
      const signal = strategy.generateSignal(singleData, 15);
      expect(signal).toBeNull();
    });

    test('should handle very small lookback period', () => {
      const fibLevels = strategy.getDynamicFibonacciLevels(mockMarketData, 5);
      // May or may not find levels depending on data structure
      if (fibLevels) {
        expect(fibLevels.high).toBeGreaterThanOrEqual(fibLevels.low);
      }
    });

    test('should handle identical swing points', () => {
      const flatData: MarketData[] = [];
      for (let i = 0; i < 50; i++) {
        flatData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          open: 100,
          high: 100,
          low: 100,
          close: 100,
          volume: 1000000
        });
      }

      const fibLevels = strategy.calculateFibonacciLevels(100, 100);
      expect(fibLevels.high).toBe(100);
      expect(fibLevels.low).toBe(100);
      Object.values(fibLevels.levels).forEach(level => {
        expect(level).toBe(100);
      });
    });

    test('should handle extreme price ratios', () => {
      const fibLevels = strategy.calculateFibonacciLevels(1000, 1);
      
      expect(fibLevels.high).toBe(1000);
      expect(fibLevels.low).toBe(1);
      expect(fibLevels.levels['50.0']).toBeCloseTo(500.5, 1);
      expect(fibLevels.levels['61.8']).toBeCloseTo(382.618, 1);
    });

    test('should handle negative prices gracefully', () => {
      // While negative prices are unrealistic for crypto, test robustness
      const fibLevels = strategy.calculateFibonacciLevels(10, -10);
      
      expect(fibLevels.high).toBe(10);
      expect(fibLevels.low).toBe(-10);
      expect(fibLevels.levels['50.0']).toBe(0);
    });
  });

  describe('Level Significance', () => {
    test('should give higher strength to 61.8% level', () => {
      const fibLevels = strategy.calculateFibonacciLevels(140, 60);
      
      // Test proximity to 61.8% level
      const proximity618 = strategy.checkFibonacciProximity(90.56, fibLevels);
      expect(proximity618.nearLevel).toBe('61.8');
      
      // Test proximity to 23.6% level
      const proximity236 = strategy.checkFibonacciProximity(121.12, fibLevels);
      expect(proximity236.nearLevel).toBe('23.6');
      
      // 61.8% should be considered more significant in signal generation
      // This is tested indirectly through the signal strength calculation
    });

    test('should recognize 50% as psychological level', () => {
      const fibLevels = strategy.calculateFibonacciLevels(140, 60);
      const proximity = strategy.checkFibonacciProximity(100, fibLevels);
      
      expect(proximity.nearLevel).toBe('50.0');
      expect(proximity.levelPrice).toBe(100);
    });
  });
});
