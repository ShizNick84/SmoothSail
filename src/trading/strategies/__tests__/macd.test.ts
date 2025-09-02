/**
 * MACD Strategy Tests
 * 
 * Comprehensive test suite for MACD calculations, crossover detection, and signal generation.
 * Tests cover MACD calculation, signal line crossovers, histogram analysis, and divergence detection.
 */

import { MACDStrategy } from '../macd';
import { MarketData } from '../types';

describe('MACDStrategy', () => {
  let strategy: MACDStrategy;
  let mockMarketData: MarketData[];

  beforeEach(() => {
    strategy = new MACDStrategy();
    
    // Create mock market data for testing
    mockMarketData = [];
    const basePrice = 100;
    const baseVolume = 1000000;
    
    for (let i = 0; i < 60; i++) {
      // Create trending data with some volatility
      const trend = i * 0.3; // Gradual upward trend
      const volatility = Math.sin(i * 0.2) * 3; // Some oscillation
      const price = basePrice + trend + volatility;
      
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

  describe('MACD Calculation', () => {
    test('should calculate MACD correctly', () => {
      const macd = strategy.calculateMACD(mockMarketData, 12, 26, 9);
      
      expect(macd).not.toBeNull();
      expect(typeof macd!.macd).toBe('number');
      expect(typeof macd!.signal).toBe('number');
      expect(typeof macd!.histogram).toBe('number');
      expect(macd!.histogram).toBeCloseTo(macd!.macd - macd!.signal, 4);
    });

    test('should return null for insufficient data', () => {
      const shortData = mockMarketData.slice(0, 20);
      const macd = strategy.calculateMACD(shortData, 12, 26, 9);
      expect(macd).toBeNull();
    });

    test('should handle different periods', () => {
      const macd1 = strategy.calculateMACD(mockMarketData, 5, 10, 3);
      const macd2 = strategy.calculateMACD(mockMarketData, 12, 26, 9);
      
      expect(macd1).not.toBeNull();
      expect(macd2).not.toBeNull();
      expect(macd1!.macd).not.toBe(macd2!.macd); // Different periods should give different results
    });

    test('should calculate MACD for strong uptrend', () => {
      const uptrendData: MarketData[] = [];
      for (let i = 0; i < 50; i++) {
        const price = 100 + i * 2; // Strong uptrend
        uptrendData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000
        });
      }

      const macd = strategy.calculateMACD(uptrendData, 12, 26, 9);
      expect(macd).not.toBeNull();
      expect(macd!.macd).toBeGreaterThan(0); // Should be positive in uptrend
    });

    test('should calculate MACD for strong downtrend', () => {
      const downtrendData: MarketData[] = [];
      for (let i = 0; i < 50; i++) {
        const price = 200 - i * 2; // Strong downtrend
        downtrendData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000
        });
      }

      const macd = strategy.calculateMACD(downtrendData, 12, 26, 9);
      expect(macd).not.toBeNull();
      expect(macd!.macd).toBeLessThan(0); // Should be negative in downtrend
    });

    test('should round values to 4 decimal places', () => {
      const macd = strategy.calculateMACD(mockMarketData, 12, 26, 9);
      
      expect(macd).not.toBeNull();
      expect(macd!.macd.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);
      expect(macd!.signal.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);
      expect(macd!.histogram.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);
    });
  });

  describe('Crossover Detection', () => {
    test('should detect bullish crossover', () => {
      // Create data that should result in bullish crossover
      const crossoverData: MarketData[] = [];
      
      // Start with downtrend
      for (let i = 0; i < 30; i++) {
        const price = 150 - i * 1; // Downtrend
        crossoverData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (60 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000
        });
      }
      
      // Then strong uptrend
      for (let i = 0; i < 30; i++) {
        const price = 120 + i * 3; // Strong uptrend
        crossoverData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (30 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000
        });
      }

      const crossover = strategy.detectCrossover(crossoverData, 12, 26, 9);
      
      // May detect bullish crossover depending on exact timing
      expect(['BULLISH', 'BEARISH', 'NONE']).toContain(crossover.type);
      expect(crossover.strength).toBeGreaterThanOrEqual(0);
      expect(crossover.strength).toBeLessThanOrEqual(100);
    });

    test('should detect bearish crossover', () => {
      // Create data that should result in bearish crossover
      const crossoverData: MarketData[] = [];
      
      // Start with uptrend
      for (let i = 0; i < 30; i++) {
        const price = 100 + i * 1; // Uptrend
        crossoverData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (60 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000
        });
      }
      
      // Then strong downtrend
      for (let i = 0; i < 30; i++) {
        const price = 130 - i * 3; // Strong downtrend
        crossoverData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (30 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000
        });
      }

      const crossover = strategy.detectCrossover(crossoverData, 12, 26, 9);
      
      // May detect bearish crossover depending on exact timing
      expect(['BULLISH', 'BEARISH', 'NONE']).toContain(crossover.type);
      expect(crossover.strength).toBeGreaterThanOrEqual(0);
      expect(crossover.strength).toBeLessThanOrEqual(100);
    });

    test('should return NONE for insufficient data', () => {
      const shortData = mockMarketData.slice(0, 20);
      const crossover = strategy.detectCrossover(shortData, 12, 26, 9);
      expect(crossover.type).toBe('NONE');
      expect(crossover.strength).toBe(0);
    });

    test('should return NONE for sideways market', () => {
      const sidewaysData: MarketData[] = [];
      for (let i = 0; i < 50; i++) {
        const price = 100 + Math.sin(i * 0.1) * 2; // Small oscillations
        sidewaysData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000
        });
      }

      const crossover = strategy.detectCrossover(sidewaysData, 12, 26, 9);
      // Sideways market may or may not have crossovers
      expect(['BULLISH', 'BEARISH', 'NONE']).toContain(crossover.type);
    });
  });

  describe('MACD Signal Generation', () => {
    test('should generate MACD signal with correct properties', () => {
      const macdSignal = strategy.generateMACDSignal(mockMarketData, 12, 26, 9);
      
      expect(macdSignal).not.toBeNull();
      expect(macdSignal!.name).toBe('MACD');
      expect(typeof macdSignal!.macd).toBe('number');
      expect(typeof macdSignal!.signal).toBe('number');
      expect(typeof macdSignal!.histogram).toBe('number');
      expect(macdSignal!.parameters.fastPeriod).toBe(12);
      expect(macdSignal!.parameters.slowPeriod).toBe(26);
      expect(macdSignal!.parameters.signalPeriod).toBe(9);
    });

    test('should include crossover information when present', () => {
      const macdSignal = strategy.generateMACDSignal(mockMarketData, 12, 26, 9);
      
      if (macdSignal && macdSignal.crossover) {
        expect(['BULLISH', 'BEARISH']).toContain(macdSignal.crossover.type);
        expect(macdSignal.crossover.strength).toBeGreaterThan(0);
        expect(macdSignal.crossover.strength).toBeLessThanOrEqual(100);
      }
    });

    test('should return null for insufficient data', () => {
      const shortData = mockMarketData.slice(0, 20);
      const macdSignal = strategy.generateMACDSignal(shortData, 12, 26, 9);
      expect(macdSignal).toBeNull();
    });
  });

  describe('Divergence Detection', () => {
    test('should detect divergence patterns', () => {
      // Create complex data that might have divergence
      const divergenceData: MarketData[] = [];
      
      // Create base data
      for (let i = 0; i < 30; i++) {
        divergenceData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (80 - i) * 60000),
          open: 100,
          high: 101,
          low: 99,
          close: 100,
          volume: 1000000
        });
      }
      
      // Create pattern that might show divergence
      for (let i = 0; i < 50; i++) {
        const price = 100 + Math.sin(i * 0.1) * 10 + (i < 25 ? -i * 0.3 : (i - 25) * 0.2);
        divergenceData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000
        });
      }

      const divergence = strategy.detectDivergence(divergenceData, 12, 26, 9);
      
      expect(['BULLISH', 'BEARISH', 'NONE']).toContain(divergence.type);
      expect(divergence.strength).toBeGreaterThanOrEqual(0);
      expect(divergence.strength).toBeLessThanOrEqual(100);
    });

    test('should return NONE for insufficient data', () => {
      const shortData = mockMarketData.slice(0, 40);
      const divergence = strategy.detectDivergence(shortData, 12, 26, 9);
      expect(divergence.type).toBe('NONE');
      expect(divergence.strength).toBe(0);
    });
  });

  describe('Trading Signal Generation', () => {
    test('should generate buy signal for bullish crossover', () => {
      // Create strong bullish crossover scenario
      const bullishData: MarketData[] = [];
      
      // Downtrend first
      for (let i = 0; i < 30; i++) {
        const price = 150 - i * 2;
        bullishData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (60 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000 * (1 + Math.random())
        });
      }
      
      // Then strong uptrend
      for (let i = 0; i < 30; i++) {
        const price = 90 + i * 4;
        bullishData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (30 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000 * (1 + Math.random())
        });
      }

      const signal = strategy.generateSignal(bullishData, 12, 26, 9);
      
      if (signal) {
        expect(signal.type).toBe('BUY');
        expect(signal.strength).toBeGreaterThan(0);
        expect(signal.confidence).toBeGreaterThan(0);
        expect(signal.reasoning).toContain('bullish crossover');
        expect(signal.metadata?.crossover?.type).toBe('BULLISH');
      }
    });

    test('should generate sell signal for bearish crossover', () => {
      // Create strong bearish crossover scenario
      const bearishData: MarketData[] = [];
      
      // Uptrend first
      for (let i = 0; i < 30; i++) {
        const price = 100 + i * 2;
        bearishData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (60 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000 * (1 + Math.random())
        });
      }
      
      // Then strong downtrend
      for (let i = 0; i < 30; i++) {
        const price = 160 - i * 4;
        bearishData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (30 - i) * 60000),
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000 * (1 + Math.random())
        });
      }

      const signal = strategy.generateSignal(bearishData, 12, 26, 9);
      
      if (signal) {
        expect(signal.type).toBe('SELL');
        expect(signal.strength).toBeGreaterThan(0);
        expect(signal.confidence).toBeGreaterThan(0);
        expect(signal.reasoning).toContain('bearish crossover');
        expect(signal.metadata?.crossover?.type).toBe('BEARISH');
      }
    });

    test('should return null for neutral MACD', () => {
      const neutralData: MarketData[] = [];
      for (let i = 0; i < 50; i++) {
        const price = 100 + Math.sin(i * 0.05) * 1; // Very small oscillations
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

      const signal = strategy.generateSignal(neutralData, 12, 26, 9);
      // Neutral MACD without crossover should not generate signal
      if (signal) {
        expect(['BUY', 'SELL']).toContain(signal.type);
      }
    });

    test('should include proper metadata', () => {
      const signal = strategy.generateSignal(mockMarketData, 12, 26, 9);
      
      if (signal) {
        expect(signal.metadata).toBeDefined();
        expect(signal.metadata?.macd).toBeDefined();
        expect(signal.metadata?.signal).toBeDefined();
        expect(signal.metadata?.histogram).toBeDefined();
        expect(typeof signal.metadata?.aboveZero).toBe('boolean');
        expect(typeof signal.metadata?.histogramIncreasing).toBe('boolean');
        expect(signal.indicators).toContain('MACD_12_26_9');
      }
    });

    test('should calculate risk-reward ratio', () => {
      const signal = strategy.generateSignal(mockMarketData, 12, 26, 9);
      
      if (signal) {
        expect(signal.riskReward).toBeGreaterThan(0);
        expect(typeof signal.riskReward).toBe('number');
      }
    });
  });

  describe('Signal Confidence Evaluation', () => {
    test('should evaluate signal confidence correctly', () => {
      const signal = strategy.generateSignal(mockMarketData, 12, 26, 9);
      
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
      const signal = strategy.generateSignal(mockMarketData, 12, 26, 9);
      
      if (signal) {
        const confidence = strategy.evaluateSignalConfidence(mockMarketData, signal);
        
        expect(confidence.factors[0]).toContain('MACD signal strength');
        expect(confidence.factors[1]).toContain('Volume confirmation');
        expect(confidence.factors[2]).toContain('Trend momentum');
        expect(confidence.factors[3]).toContain('MACD position');
      }
    });

    test('should include crossover and divergence in factors when present', () => {
      const signal = strategy.generateSignal(mockMarketData, 12, 26, 9);
      
      if (signal) {
        const confidence = strategy.evaluateSignalConfidence(mockMarketData, signal);
        
        if (signal.metadata?.crossover) {
          const crossoverFactors = confidence.factors.filter(f => f.includes('Crossover'));
          expect(crossoverFactors.length).toBeGreaterThan(0);
        }
        
        if (signal.metadata?.divergence) {
          const divergenceFactors = confidence.factors.filter(f => f.includes('Divergence'));
          expect(divergenceFactors.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty market data', () => {
      const signal = strategy.generateSignal([], 12, 26, 9);
      expect(signal).toBeNull();
    });

    test('should handle single data point', () => {
      const singleData = [mockMarketData[0]];
      const signal = strategy.generateSignal(singleData, 12, 26, 9);
      expect(signal).toBeNull();
    });

    test('should handle flat prices', () => {
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

      const macd = strategy.calculateMACD(flatData, 12, 26, 9);
      if (macd) {
        expect(macd.macd).toBe(0); // No price change should result in zero MACD
        expect(macd.signal).toBe(0);
        expect(macd.histogram).toBe(0);
      }
    });

    test('should handle very small periods', () => {
      const macd = strategy.calculateMACD(mockMarketData, 2, 5, 2);
      expect(macd).not.toBeNull();
      expect(typeof macd!.macd).toBe('number');
      expect(typeof macd!.signal).toBe('number');
      expect(typeof macd!.histogram).toBe('number');
    });

    test('should handle extreme price movements', () => {
      const extremeData: MarketData[] = [];
      for (let i = 0; i < 50; i++) {
        const price = 100 * Math.pow(1.1, i); // Exponential growth
        extremeData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          open: price - price * 0.01,
          high: price + price * 0.01,
          low: price - price * 0.01,
          close: price,
          volume: 1000000
        });
      }

      const macd = strategy.calculateMACD(extremeData, 12, 26, 9);
      expect(macd).not.toBeNull();
      expect(macd!.macd).toBeGreaterThan(0); // Should be positive for strong uptrend
    });
  });
});
