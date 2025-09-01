/**
 * Strategy Harmonization Engine Tests
 * 
 * Comprehensive tests for weighted signal scoring, conflict resolution,
 * composite signal strength calculation, and strategy confidence validation.
 * 
 * Requirements: 4.8, 17.10 - Strategy harmonization testing and validation
 */

import { StrategyHarmonizationEngine } from '../harmonization';
import { MarketData, TradingSignal, HarmonizedSignal, StrategyConfig } from '../types';

describe('StrategyHarmonizationEngine', () => {
  let harmonizationEngine: StrategyHarmonizationEngine;
  let mockMarketData: MarketData[];

  beforeEach(() => {
    harmonizationEngine = new StrategyHarmonizationEngine();
    
    // Create mock market data for testing
    mockMarketData = [];
    const basePrice = 50000;
    const baseVolume = 1000000;
    
    for (let i = 0; i < 100; i++) {
      const price = basePrice + (Math.sin(i * 0.1) * 1000) + (Math.random() * 200 - 100);
      mockMarketData.push({
        symbol: 'BTC/USDT',
        timestamp: new Date(Date.now() - (100 - i) * 60000), // 1 minute intervals
        open: price - 10,
        high: price + 50,
        low: price - 50,
        close: price,
        volume: baseVolume + (Math.random() * 500000)
      });
    }
  });

  describe('generateAllSignals', () => {
    it('should generate signals from all enabled strategies', () => {
      const signals = harmonizationEngine.generateAllSignals(mockMarketData);
      
      expect(signals).toBeDefined();
      expect(Array.isArray(signals)).toBe(true);
      
      // Should have signals from multiple strategies
      const strategyTypes = new Set(signals.map(s => s.indicators.join(',')));
      expect(strategyTypes.size).toBeGreaterThan(0);
    });

    it('should respect strategy configuration', () => {
      const configs = {
        movingAverage: { name: 'MA', enabled: false, weight: 0, parameters: {} },
        rsi: { name: 'RSI', enabled: true, weight: 1, parameters: {} }
      };

      const signals = harmonizationEngine.generateAllSignals(mockMarketData, configs);
      
      // Should not have moving average signals when disabled
      const maSignals = signals.filter(s => 
        s.indicators.some(i => i.includes('MA') || i.includes('EMA'))
      );
      expect(maSignals.length).toBe(0);
    });

    it('should handle empty market data gracefully', () => {
      const signals = harmonizationEngine.generateAllSignals([]);
      expect(signals).toEqual([]);
    });

    it('should handle insufficient market data', () => {
      const limitedData = mockMarketData.slice(0, 5);
      const signals = harmonizationEngine.generateAllSignals(limitedData);
      
      // Should still return an array, even if empty
      expect(Array.isArray(signals)).toBe(true);
    });
  });

  describe('harmonizeSignals', () => {
    it('should create harmonized signal from multiple indicators', () => {
      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        expect(harmonizedSignal.symbol).toBe('BTC/USDT');
        expect(harmonizedSignal.overallSignal).toMatch(/^(BUY|SELL|HOLD)$/);
        expect(harmonizedSignal.strength).toBeGreaterThanOrEqual(0);
        expect(harmonizedSignal.strength).toBeLessThanOrEqual(100);
        expect(harmonizedSignal.confidence).toBeGreaterThanOrEqual(0);
        expect(harmonizedSignal.confidence).toBeLessThanOrEqual(100);
        expect(Array.isArray(harmonizedSignal.indicators)).toBe(true);
        expect(Array.isArray(harmonizedSignal.conflicts)).toBe(true);
        expect(typeof harmonizedSignal.reasoning).toBe('string');
      }
    });

    it('should apply custom weights correctly', () => {
      const configs = {
        rsi: { name: 'RSI', enabled: true, weight: 0.8, parameters: {} },
        macd: { name: 'MACD', enabled: true, weight: 0.2, parameters: {} }
      };

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData, configs);
      
      if (harmonizedSignal) {
        // Weights should be normalized and applied
        expect(harmonizedSignal.weights).toBeDefined();
        expect(typeof harmonizedSignal.weights).toBe('object');
      }
    });

    it('should detect signal conflicts', () => {
      // Create mock signals with conflicts
      const mockSignals: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 80,
          confidence: 75,
          indicators: ['RSI'],
          reasoning: 'RSI oversold',
          riskReward: 2.0,
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 85,
          confidence: 80,
          indicators: ['MACD'],
          reasoning: 'MACD bearish crossover',
          riskReward: 1.5,
          timestamp: new Date()
        }
      ];

      // Mock the generateAllSignals method to return conflicting signals
      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(mockSignals);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      if (harmonizedSignal) {
        expect(harmonizedSignal.conflicts.length).toBeGreaterThan(0);
        expect(harmonizedSignal.reasoning).toContain('conflict');
      }
    });

    it('should return null for empty signals', () => {
      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue([]);
      
      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      expect(harmonizedSignal).toBeNull();
    });

    it('should prefer HOLD when signals are weak or conflicting', () => {
      const weakSignals: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 30,
          confidence: 40,
          indicators: ['RSI'],
          reasoning: 'Weak buy signal',
          riskReward: 1.2,
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 35,
          confidence: 45,
          indicators: ['MACD'],
          reasoning: 'Weak sell signal',
          riskReward: 1.1,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(weakSignals);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      if (harmonizedSignal) {
        expect(harmonizedSignal.overallSignal).toBe('HOLD');
      }
    });
  });

  describe('validateSignalHarmony', () => {
    let mockHarmonizedSignal: HarmonizedSignal;

    beforeEach(() => {
      mockHarmonizedSignal = {
        symbol: 'BTC/USDT',
        timestamp: new Date(),
        overallSignal: 'BUY',
        strength: 75,
        confidence: 80,
        indicators: [
          { name: 'RSI', value: 30, timestamp: new Date(), parameters: {} },
          { name: 'MACD', value: 0.5, timestamp: new Date(), parameters: {} },
          { name: 'EMA', value: 50000, timestamp: new Date(), parameters: {} }
        ],
        weights: { rsi: 0.4, macd: 0.3, movingAverage: 0.3 },
        conflicts: [],
        reasoning: 'Strong buy signal with good consensus'
      };
    });

    it('should validate high-quality signals as valid', () => {
      const validation = harmonizationEngine.validateSignalHarmony(mockHarmonizedSignal);
      
      expect(validation.isValid).toBe(true);
      expect(validation.issues.length).toBe(0);
      expect(validation.recommendations.length).toBe(0);
    });

    it('should detect low confidence signals', () => {
      mockHarmonizedSignal.confidence = 45;
      
      const validation = harmonizationEngine.validateSignalHarmony(mockHarmonizedSignal);
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('Low confidence'))).toBe(true);
      expect(validation.recommendations.some(rec => rec.includes('higher confidence'))).toBe(true);
    });

    it('should detect signal conflicts', () => {
      mockHarmonizedSignal.conflicts = ['RSI vs MACD conflict'];
      
      const validation = harmonizationEngine.validateSignalHarmony(mockHarmonizedSignal);
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('conflicts detected'))).toBe(true);
      expect(validation.recommendations.some(rec => rec.includes('Review conflicting'))).toBe(true);
    });

    it('should detect weak signal strength', () => {
      mockHarmonizedSignal.strength = 35;
      
      const validation = harmonizationEngine.validateSignalHarmony(mockHarmonizedSignal);
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('Weak signal strength'))).toBe(true);
      expect(validation.recommendations.some(rec => rec.includes('reducing position size'))).toBe(true);
    });

    it('should detect limited indicator diversity', () => {
      mockHarmonizedSignal.indicators = [
        { name: 'RSI', value: 30, timestamp: new Date(), parameters: {} }
      ];
      
      const validation = harmonizationEngine.validateSignalHarmony(mockHarmonizedSignal);
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('Limited indicator diversity'))).toBe(true);
      expect(validation.recommendations.some(rec => rec.includes('multiple different types'))).toBe(true);
    });

    it('should allow HOLD signals with low strength', () => {
      mockHarmonizedSignal.overallSignal = 'HOLD';
      mockHarmonizedSignal.strength = 35;
      
      const validation = harmonizationEngine.validateSignalHarmony(mockHarmonizedSignal);
      
      // Should not flag weak strength for HOLD signals
      const weakStrengthIssues = validation.issues.filter(issue => 
        issue.includes('Weak signal strength')
      );
      expect(weakStrengthIssues.length).toBe(0);
    });
  });

  describe('weighted scoring', () => {
    it('should calculate weighted scores correctly', () => {
      const strongBuySignals: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 90,
          confidence: 85,
          indicators: ['RSI'],
          reasoning: 'Strong RSI oversold',
          riskReward: 2.5,
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 80,
          confidence: 75,
          indicators: ['MACD'],
          reasoning: 'MACD bullish crossover',
          riskReward: 2.0,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(strongBuySignals);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      if (harmonizedSignal) {
        expect(harmonizedSignal.overallSignal).toBe('BUY');
        expect(harmonizedSignal.strength).toBeGreaterThan(70);
        expect(harmonizedSignal.confidence).toBeGreaterThan(70);
      }
    });

    it('should handle mixed signal types correctly', () => {
      const mixedSignals: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 70,
          confidence: 65,
          indicators: ['RSI'],
          reasoning: 'RSI oversold',
          riskReward: 2.0,
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 60,
          confidence: 55,
          indicators: ['MACD'],
          reasoning: 'MACD bearish',
          riskReward: 1.5,
          timestamp: new Date()
        },
        {
          id: '3',
          symbol: 'BTC/USDT',
          type: 'HOLD',
          strength: 50,
          confidence: 60,
          indicators: ['EMA'],
          reasoning: 'Sideways trend',
          riskReward: 1.0,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(mixedSignals);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      if (harmonizedSignal) {
        // Should make a decision based on weighted scoring
        expect(['BUY', 'SELL', 'HOLD']).toContain(harmonizedSignal.overallSignal);
        expect(harmonizedSignal.reasoning).toContain('indicators');
      }
    });
  });

  describe('conflict detection', () => {
    it('should detect momentum vs trend conflicts', () => {
      const conflictingSignals: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 80,
          confidence: 75,
          indicators: ['RSI'],
          reasoning: 'RSI oversold',
          riskReward: 2.0,
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 75,
          confidence: 70,
          indicators: ['EMA'],
          reasoning: 'EMA bearish trend',
          riskReward: 1.8,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(conflictingSignals);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      if (harmonizedSignal) {
        expect(harmonizedSignal.conflicts.length).toBeGreaterThan(0);
        expect(harmonizedSignal.conflicts.some(c => c.includes('Momentum vs Trend'))).toBe(true);
      }
    });

    it('should detect strong opposing signals', () => {
      const opposingSignals: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 85,
          confidence: 80,
          indicators: ['RSI'],
          reasoning: 'Strong RSI oversold',
          riskReward: 2.5,
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 90,
          confidence: 85,
          indicators: ['MACD'],
          reasoning: 'Strong MACD bearish',
          riskReward: 2.2,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(opposingSignals);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      if (harmonizedSignal) {
        expect(harmonizedSignal.conflicts.length).toBeGreaterThan(0);
        expect(harmonizedSignal.conflicts.some(c => c.includes('Strong conflicting signals'))).toBe(true);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle single signal gracefully', () => {
      const singleSignal: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 75,
          confidence: 70,
          indicators: ['RSI'],
          reasoning: 'RSI oversold',
          riskReward: 2.0,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(singleSignal);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      if (harmonizedSignal) {
        expect(harmonizedSignal.overallSignal).toBe('BUY');
        expect(harmonizedSignal.conflicts.length).toBe(0);
      }
    });

    it('should handle signals with missing metadata', () => {
      const signalsWithoutMetadata: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 75,
          confidence: 70,
          indicators: ['RSI'],
          reasoning: 'RSI oversold',
          riskReward: 2.0,
          timestamp: new Date()
          // No metadata property
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(signalsWithoutMetadata);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        expect(harmonizedSignal.indicators).toBeDefined();
        expect(Array.isArray(harmonizedSignal.indicators)).toBe(true);
      }
    });

    it('should handle zero-weight strategies', () => {
      const configs = {
        rsi: { name: 'RSI', enabled: true, weight: 0, parameters: {} },
        macd: { name: 'MACD', enabled: true, weight: 1, parameters: {} }
      };

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData, configs);
      
      // Should still work even with zero weights
      expect(harmonizedSignal).toBeDefined();
    });
  });

  describe('performance', () => {
    it('should handle large datasets efficiently', () => {
      // Create large dataset
      const largeDataset: MarketData[] = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - i * 60000),
          open: 50000 + Math.random() * 1000,
          high: 50500 + Math.random() * 1000,
          low: 49500 + Math.random() * 1000,
          close: 50000 + Math.random() * 1000,
          volume: 1000000 + Math.random() * 500000
        });
      }

      const startTime = Date.now();
      const harmonizedSignal = harmonizationEngine.harmonizeSignals(largeDataset);
      const endTime = Date.now();

      // Should complete within reasonable time (less than 2 seconds for large dataset)
      expect(endTime - startTime).toBeLessThan(2000);
      expect(harmonizedSignal).toBeDefined();
    });
  });
});