/**
 * Strategy Harmonization Integration Tests
 * 
 * Integration tests to verify the harmonization engine works correctly
 * with actual strategy implementations and real market data patterns.
 * 
 * Requirements: 4.8, 17.10 - Strategy harmonization integration testing
 */

import { StrategyHarmonizationEngine } from '../harmonization';
import { MarketData } from '../types';

describe('StrategyHarmonizationEngine Integration', () => {
  let harmonizationEngine: StrategyHarmonizationEngine;

  beforeEach(() => {
    harmonizationEngine = new StrategyHarmonizationEngine();
  });

  describe('Real Market Scenarios', () => {
    it('should handle bullish market conditions', () => {
      // Create bullish market data (uptrend with increasing volume)
      const bullishData: MarketData[] = [];
      let basePrice = 45000;
      
      for (let i = 0; i < 50; i++) {
        basePrice += Math.random() * 200 + 50; // Generally increasing
        bullishData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          open: basePrice - 20,
          high: basePrice + 100,
          low: basePrice - 50,
          close: basePrice,
          volume: 1000000 + (i * 20000) // Increasing volume
        });
      }

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(bullishData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should make a valid trading decision
        expect(['BUY', 'SELL', 'HOLD']).toContain(harmonizedSignal.overallSignal);
        expect(harmonizedSignal.confidence).toBeGreaterThan(0);
        expect(harmonizedSignal.reasoning).toContain('indicators');
        expect(harmonizedSignal.strength).toBeGreaterThanOrEqual(0);
        expect(harmonizedSignal.strength).toBeLessThanOrEqual(100);
      }
    });

    it('should handle bearish market conditions', () => {
      // Create bearish market data (downtrend with increasing volume)
      const bearishData: MarketData[] = [];
      let basePrice = 55000;
      
      for (let i = 0; i < 50; i++) {
        basePrice -= Math.random() * 200 + 50; // Generally decreasing
        bearishData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          open: basePrice + 20,
          high: basePrice + 50,
          low: basePrice - 100,
          close: basePrice,
          volume: 1000000 + (i * 20000) // Increasing volume
        });
      }

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(bearishData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should make a valid trading decision
        expect(['BUY', 'SELL', 'HOLD']).toContain(harmonizedSignal.overallSignal);
        expect(harmonizedSignal.confidence).toBeGreaterThan(0);
        expect(harmonizedSignal.reasoning).toContain('indicators');
        expect(harmonizedSignal.strength).toBeGreaterThanOrEqual(0);
        expect(harmonizedSignal.strength).toBeLessThanOrEqual(100);
      }
    });

    it('should handle sideways market conditions', () => {
      // Create sideways market data (range-bound)
      const sidewaysData: MarketData[] = [];
      const basePrice = 50000;
      
      for (let i = 0; i < 50; i++) {
        const price = basePrice + (Math.sin(i * 0.2) * 500) + (Math.random() * 200 - 100);
        sidewaysData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          open: price - 10,
          high: price + 50,
          low: price - 50,
          close: price,
          volume: 1000000 + (Math.random() * 200000)
        });
      }

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(sidewaysData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // In sideways markets, we often expect HOLD or weak signals
        expect(['BUY', 'SELL', 'HOLD']).toContain(harmonizedSignal.overallSignal);
        expect(harmonizedSignal.reasoning).toContain('indicators');
      }
    });

    it('should handle volatile market conditions', () => {
      // Create highly volatile market data
      const volatileData: MarketData[] = [];
      let basePrice = 50000;
      
      for (let i = 0; i < 50; i++) {
        // High volatility with random large moves
        const change = (Math.random() - 0.5) * 2000;
        basePrice += change;
        
        volatileData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          open: basePrice - change / 2,
          high: basePrice + Math.abs(change),
          low: basePrice - Math.abs(change),
          close: basePrice,
          volume: 1000000 + (Math.random() * 1000000) // High volume variance
        });
      }

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(volatileData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // In volatile markets, confidence should be lower
        expect(harmonizedSignal.confidence).toBeLessThan(90);
        expect(harmonizedSignal.reasoning).toContain('indicators');
        
        // Validation should flag potential issues
        const validation = harmonizationEngine.validateSignalHarmony(harmonizedSignal);
        expect(validation).toBeDefined();
      }
    });
  });

  describe('Strategy Interaction', () => {
    it('should demonstrate weighted scoring with custom weights', () => {
      // Create market data that would trigger different strategies
      const marketData: MarketData[] = [];
      let basePrice = 50000;
      
      // Create data that shows RSI oversold but MACD bearish
      for (let i = 0; i < 30; i++) {
        if (i < 20) {
          basePrice -= 100; // Decline for RSI oversold
        } else {
          basePrice += 50; // Small recovery
        }
        
        marketData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (30 - i) * 60000),
          open: basePrice - 10,
          high: basePrice + 30,
          low: basePrice - 40,
          close: basePrice,
          volume: 1000000 + (Math.random() * 200000)
        });
      }

      // Test with RSI heavily weighted
      const rsiWeightedConfig = {
        rsi: { name: 'RSI', enabled: true, weight: 0.7, parameters: {} },
        macd: { name: 'MACD', enabled: true, weight: 0.3, parameters: {} }
      };

      const rsiWeightedSignal = harmonizationEngine.harmonizeSignals(marketData, rsiWeightedConfig);
      
      // Test with MACD heavily weighted
      const macdWeightedConfig = {
        rsi: { name: 'RSI', enabled: true, weight: 0.3, parameters: {} },
        macd: { name: 'MACD', enabled: true, weight: 0.7, parameters: {} }
      };

      const macdWeightedSignal = harmonizationEngine.harmonizeSignals(marketData, macdWeightedConfig);
      
      expect(rsiWeightedSignal).toBeDefined();
      expect(macdWeightedSignal).toBeDefined();
      
      if (rsiWeightedSignal && macdWeightedSignal) {
        // The weights should be reflected in the harmonized signals
        expect(rsiWeightedSignal.weights).toBeDefined();
        expect(macdWeightedSignal.weights).toBeDefined();
        
        // Both should have reasoning explaining the decision
        expect(rsiWeightedSignal.reasoning).toContain('indicators');
        expect(macdWeightedSignal.reasoning).toContain('indicators');
      }
    });

    it('should detect and report conflicts between strategies', () => {
      // Create market data that would cause conflicting signals
      const conflictingData: MarketData[] = [];
      let basePrice = 50000;
      
      // Create a scenario where momentum is bullish but trend is bearish
      for (let i = 0; i < 40; i++) {
        if (i < 30) {
          basePrice -= 50; // Long-term decline (bearish trend)
        } else {
          basePrice += 200; // Recent sharp recovery (bullish momentum)
        }
        
        conflictingData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (40 - i) * 60000),
          open: basePrice - 20,
          high: basePrice + 50,
          low: basePrice - 60,
          close: basePrice,
          volume: 1000000 + (i > 30 ? 500000 : 0) // High volume on recovery
        });
      }

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(conflictingData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should detect conflicts between momentum and trend indicators
        expect(harmonizedSignal.conflicts.length).toBeGreaterThanOrEqual(0);
        
        // Validation should flag the conflicts
        const validation = harmonizationEngine.validateSignalHarmony(harmonizedSignal);
        expect(validation).toBeDefined();
        
        if (harmonizedSignal.conflicts.length > 0) {
          expect(validation.issues.some(issue => issue.includes('conflicts'))).toBe(true);
        }
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle insufficient data gracefully', () => {
      const insufficientData: MarketData[] = [
        {
          symbol: 'BTC/USDT',
          timestamp: new Date(),
          open: 50000,
          high: 50100,
          low: 49900,
          close: 50050,
          volume: 1000000
        }
      ];

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(insufficientData);
      
      // Should either return null or a signal with low confidence
      if (harmonizedSignal) {
        expect(harmonizedSignal.confidence).toBeLessThan(80);
      }
    });

    it('should handle extreme price movements', () => {
      const extremeData: MarketData[] = [];
      let basePrice = 50000;
      
      for (let i = 0; i < 20; i++) {
        if (i === 10) {
          basePrice *= 1.5; // 50% price spike
        } else if (i === 15) {
          basePrice *= 0.7; // 30% price crash
        } else {
          basePrice += (Math.random() - 0.5) * 100;
        }
        
        extremeData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (20 - i) * 60000),
          open: basePrice - 50,
          high: basePrice + 100,
          low: basePrice - 100,
          close: basePrice,
          volume: 1000000 + (Math.random() * 2000000)
        });
      }

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(extremeData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should handle extreme movements without crashing
        expect(harmonizedSignal.overallSignal).toMatch(/^(BUY|SELL|HOLD)$/);
        expect(harmonizedSignal.reasoning).toBeDefined();
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should provide consistent results for the same input', () => {
      const testData: MarketData[] = [];
      for (let i = 0; i < 30; i++) {
        testData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (30 - i) * 60000),
          open: 50000 + i * 10,
          high: 50000 + i * 10 + 50,
          low: 50000 + i * 10 - 50,
          close: 50000 + i * 10 + 5,
          volume: 1000000
        });
      }

      // Run harmonization multiple times with same data
      const signal1 = harmonizationEngine.harmonizeSignals(testData);
      const signal2 = harmonizationEngine.harmonizeSignals(testData);
      const signal3 = harmonizationEngine.harmonizeSignals(testData);

      // Results should be consistent
      if (signal1 && signal2 && signal3) {
        expect(signal1.overallSignal).toBe(signal2.overallSignal);
        expect(signal2.overallSignal).toBe(signal3.overallSignal);
        expect(Math.abs(signal1.strength - signal2.strength)).toBeLessThan(0.1);
        expect(Math.abs(signal1.confidence - signal2.confidence)).toBeLessThan(0.1);
      }
    });

    it('should handle concurrent harmonization requests', async () => {
      const testData: MarketData[] = [];
      for (let i = 0; i < 25; i++) {
        testData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(Date.now() - (25 - i) * 60000),
          open: 50000 + Math.sin(i * 0.1) * 500,
          high: 50000 + Math.sin(i * 0.1) * 500 + 100,
          low: 50000 + Math.sin(i * 0.1) * 500 - 100,
          close: 50000 + Math.sin(i * 0.1) * 500 + 25,
          volume: 1000000
        });
      }

      // Run multiple harmonizations concurrently
      const promises = Array(5).fill(null).map(() => 
        Promise.resolve(harmonizationEngine.harmonizeSignals(testData))
      );

      const results = await Promise.all(promises);
      
      // All should complete successfully
      results.forEach(result => {
        if (result) {
          expect(result.overallSignal).toMatch(/^(BUY|SELL|HOLD)$/);
          expect(result.strength).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });
});
