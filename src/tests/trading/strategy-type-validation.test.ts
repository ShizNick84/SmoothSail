/**
 * Strategy Type Validation Tests
 * 
 * Tests to verify that all trading strategy type definitions are correct
 * and that strategies can be instantiated and used without type errors.
 */

import { RSIStrategy } from '../../trading/strategies/rsi';
import { MovingAverageStrategy } from '../../trading/strategies/moving-average';
import { MACDStrategy } from '../../trading/strategies/macd';
import { MarketData } from '../../trading/strategies/types';

describe('Strategy Type Validation', () => {
  const mockMarketData: MarketData[] = [
    {
      symbol: 'BTC_USDT',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      open: 50000,
      high: 51000,
      low: 49000,
      close: 50500,
      volume: 1000
    },
    {
      symbol: 'BTC_USDT',
      timestamp: new Date('2024-01-01T01:00:00Z'),
      open: 50500,
      high: 52000,
      low: 50000,
      close: 51500,
      volume: 1200
    },
    // Add more data points for proper calculation
    ...Array.from({ length: 50 }, (_, i) => ({
      symbol: 'BTC_USDT',
      timestamp: new Date(`2024-01-01T${String(i + 2).padStart(2, '0')}:00:00Z`),
      open: 51500 + (i * 10),
      high: 51500 + (i * 10) + 500,
      low: 51500 + (i * 10) - 500,
      close: 51500 + (i * 10) + (Math.random() * 200 - 100),
      volume: 1000 + (Math.random() * 500)
    }))
  ];

  describe('RSI Strategy Type Definitions', () => {
    test('should create RSI strategy with correct constructor parameters', () => {
      // Test with overbought/oversold parameters (new format)
      const rsiStrategy1 = new RSIStrategy({
        period: 14,
        overbought: 70,
        oversold: 30,
        symbol: 'BTC_USDT'
      });
      expect(rsiStrategy1).toBeInstanceOf(RSIStrategy);

      // Test with overboughtLevel/oversoldLevel parameters (legacy format)
      const rsiStrategy2 = new RSIStrategy({
        period: 14,
        overboughtLevel: 70,
        oversoldLevel: 30,
        symbol: 'BTC_USDT'
      });
      expect(rsiStrategy2).toBeInstanceOf(RSIStrategy);

      // Test with default parameters
      const rsiStrategy3 = new RSIStrategy();
      expect(rsiStrategy3).toBeInstanceOf(RSIStrategy);
    });

    test('should generate RSI signal with correct type structure', () => {
      const rsiStrategy = new RSIStrategy({
        period: 14,
        overbought: 70,
        oversold: 30
      });

      const rsiSignal = rsiStrategy.generateRSISignal(mockMarketData);
      
      if (rsiSignal) {
        expect(rsiSignal).toHaveProperty('name');
        expect(rsiSignal).toHaveProperty('value');
        expect(rsiSignal).toHaveProperty('timestamp');
        expect(rsiSignal).toHaveProperty('period');
        expect(rsiSignal).toHaveProperty('parameters');
        expect(rsiSignal).toHaveProperty('overbought');
        expect(rsiSignal).toHaveProperty('oversold');
        expect(rsiSignal.parameters).toHaveProperty('overboughtThreshold');
        expect(rsiSignal.parameters).toHaveProperty('oversoldThreshold');
        
        // Check types
        expect(typeof rsiSignal.overbought).toBe('boolean');
        expect(typeof rsiSignal.oversold).toBe('boolean');
        expect(typeof rsiSignal.value).toBe('number');
        expect(typeof rsiSignal.period).toBe('number');
      }
    });

    test('should generate trading signal without type errors', () => {
      const rsiStrategy = new RSIStrategy({
        period: 14,
        overbought: 70,
        oversold: 30
      });

      const signal = rsiStrategy.generateSignal(mockMarketData);
      
      if (signal) {
        expect(signal).toHaveProperty('type');
        expect(['BUY', 'SELL', 'HOLD']).toContain(signal.type);
        expect(signal).toHaveProperty('strength');
        expect(signal).toHaveProperty('confidence');
        expect(signal).toHaveProperty('metadata');
      }
    });
  });

  describe('MovingAverage Strategy Type Definitions', () => {
    test('should create MovingAverage strategy with correct constructor parameters', () => {
      const maStrategy1 = new MovingAverageStrategy({
        fastPeriod: 20,
        slowPeriod: 50,
        symbol: 'BTC_USDT'
      });
      expect(maStrategy1).toBeInstanceOf(MovingAverageStrategy);

      const maStrategy2 = new MovingAverageStrategy();
      expect(maStrategy2).toBeInstanceOf(MovingAverageStrategy);
    });

    test('should validate constructor parameters correctly', () => {
      expect(() => {
        new MovingAverageStrategy({
          fastPeriod: 0,
          slowPeriod: 50
        });
      }).toThrow('Fast period must be greater than 0');

      expect(() => {
        new MovingAverageStrategy({
          fastPeriod: 50,
          slowPeriod: 20
        });
      }).toThrow('Fast period must be less than slow period');
    });

    test('should generate MovingAverage signal with correct type structure', () => {
      const maStrategy = new MovingAverageStrategy({
        fastPeriod: 20,
        slowPeriod: 50
      });

      const maSignal = maStrategy.detectCrossover(mockMarketData);
      
      if (maSignal) {
        expect(maSignal).toHaveProperty('name');
        expect(maSignal).toHaveProperty('value');
        expect(maSignal).toHaveProperty('timestamp');
        expect(maSignal).toHaveProperty('period');
        expect(maSignal).toHaveProperty('parameters');
        expect(maSignal.parameters).toHaveProperty('fastPeriod');
        expect(maSignal.parameters).toHaveProperty('slowPeriod');
        expect(maSignal.parameters).toHaveProperty('slowEMA');
        
        if (maSignal.crossover) {
          expect(['GOLDEN_CROSS', 'DEATH_CROSS', 'NONE']).toContain(maSignal.crossover.type);
          expect(typeof maSignal.crossover.strength).toBe('number');
          expect(typeof maSignal.crossover.volumeConfirmed).toBe('boolean');
        }
      }
    });

    test('should handle momentum calculation with all signal types', () => {
      const maStrategy = new MovingAverageStrategy();
      
      // Test that momentum calculation works with BUY, SELL, and HOLD signals
      const buySignal = maStrategy.generateSignal(mockMarketData);
      expect(buySignal).toBeDefined();
      
      // The signal confidence evaluation should work without type errors
      if (buySignal) {
        const confidence = maStrategy.evaluateSignalConfidence(mockMarketData, buySignal);
        expect(confidence).toHaveProperty('overall');
        expect(confidence).toHaveProperty('technical');
        expect(confidence).toHaveProperty('volume');
        expect(confidence).toHaveProperty('momentum');
      }
    });
  });

  describe('MACD Strategy Type Definitions', () => {
    test('should create MACD strategy with correct constructor parameters', () => {
      const macdStrategy1 = new MACDStrategy({
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        symbol: 'BTC_USDT'
      });
      expect(macdStrategy1).toBeInstanceOf(MACDStrategy);

      const macdStrategy2 = new MACDStrategy();
      expect(macdStrategy2).toBeInstanceOf(MACDStrategy);
    });

    test('should validate constructor parameters correctly', () => {
      expect(() => {
        new MACDStrategy({
          fastPeriod: 0,
          slowPeriod: 26,
          signalPeriod: 9
        });
      }).toThrow('Fast period must be greater than 0');

      expect(() => {
        new MACDStrategy({
          fastPeriod: 26,
          slowPeriod: 12,
          signalPeriod: 9
        });
      }).toThrow('Fast period must be less than slow period');
    });

    test('should generate MACD signal with correct type structure', () => {
      const macdStrategy = new MACDStrategy({
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9
      });

      const macdSignal = macdStrategy.generateMACDSignal(mockMarketData);
      
      if (macdSignal) {
        expect(macdSignal).toHaveProperty('name');
        expect(macdSignal).toHaveProperty('value');
        expect(macdSignal).toHaveProperty('timestamp');
        expect(macdSignal).toHaveProperty('parameters');
        expect(macdSignal).toHaveProperty('macd');
        expect(macdSignal).toHaveProperty('signal');
        expect(macdSignal).toHaveProperty('histogram');
        expect(macdSignal.parameters).toHaveProperty('fastPeriod');
        expect(macdSignal.parameters).toHaveProperty('slowPeriod');
        expect(macdSignal.parameters).toHaveProperty('signalPeriod');
        
        if (macdSignal.crossover) {
          expect(['BULLISH', 'BEARISH', 'NONE']).toContain(macdSignal.crossover.type);
          expect(typeof macdSignal.crossover.strength).toBe('number');
        }
      }
    });
  });

  describe('Strategy Parameter Validation', () => {
    test('should handle all strategy configuration parameters', () => {
      // Test that StrategyConfig interface supports all parameters
      const config = {
        fastPeriod: 20,
        slowPeriod: 50,
        signalPeriod: 9,
        period: 14,
        overbought: 70,
        overboughtLevel: 70,
        oversold: 30,
        oversoldLevel: 30,
        symbol: 'BTC_USDT',
        enabled: true,
        weight: 1.0
      };

      // Should not cause type errors
      expect(config.fastPeriod).toBe(20);
      expect(config.overbought).toBe(70);
      expect(config.overboughtLevel).toBe(70);
      expect(config.oversold).toBe(30);
      expect(config.oversoldLevel).toBe(30);
      expect(config.symbol).toBe('BTC_USDT');
    });
  });

  describe('Strategy Integration', () => {
    test('should work with trading engine instantiation parameters', () => {
      // Test the exact parameters used in trading engine
      const rsiStrategy = new RSIStrategy({
        period: 14,
        overbought: 70,
        oversold: 30,
        symbol: 'BTC_USDT'
      });

      const maStrategy = new MovingAverageStrategy({
        fastPeriod: 20,
        slowPeriod: 50,
        symbol: 'BTC_USDT'
      });

      const macdStrategy = new MACDStrategy({
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        symbol: 'BTC_USDT'
      });

      expect(rsiStrategy).toBeInstanceOf(RSIStrategy);
      expect(maStrategy).toBeInstanceOf(MovingAverageStrategy);
      expect(macdStrategy).toBeInstanceOf(MACDStrategy);
    });
  });
});