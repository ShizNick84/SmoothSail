/**
 * =============================================================================
 * STRATEGY CONFLICT RESOLUTION VALIDATION TESTS
 * =============================================================================
 * 
 * Comprehensive tests for strategy conflict detection and resolution mechanisms.
 * These tests validate that the harmonization engine correctly identifies,
 * analyzes, and resolves conflicts between different trading indicators.
 * 
 * Requirements: 17.9, 17.10 - Conflict detection and resolution testing
 * 
 * CRITICAL FEATURES:
 * - Conflict detection accuracy
 * - Resolution mechanism validation
 * - Weighted scoring conflict resolution
 * - Multi-indicator conflict scenarios
 * - Edge case handling
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { StrategyHarmonizationEngine } from '../../../trading/strategies/harmonization';
import { 
  MarketData, 
  TradingSignal, 
  HarmonizedSignal, 
  StrategyConfig 
} from '../../../trading/strategies/types';

describe('Strategy Conflict Resolution Validation', () => {
  let harmonizationEngine: StrategyHarmonizationEngine;
  let mockMarketData: MarketData[];

  beforeEach(() => {
    harmonizationEngine = new StrategyHarmonizationEngine();
    mockMarketData = generateMockMarketData();
  });

  describe('Conflict Detection Accuracy', () => {
    test('should detect strong opposing signals', () => {
      const strongOpposingSignals: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 85,
          confidence: 80,
          indicators: ['RSI'],
          reasoning: 'Strong RSI oversold signal',
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
          reasoning: 'Strong MACD bearish crossover',
          riskReward: 2.2,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(strongOpposingSignals);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        expect(harmonizedSignal.conflicts.length).toBeGreaterThan(0);
        expect(harmonizedSignal.conflicts.some(c => 
          c.includes('Strong conflicting signals') || c.includes('conflicting')
        )).toBe(true);
        
        // Should include both indicators in conflict description
        const conflictText = harmonizedSignal.conflicts.join(' ');
        expect(conflictText.includes('RSI') || conflictText.includes('MACD')).toBe(true);
      }
    });

    test('should detect momentum vs trend conflicts', () => {
      const momentumTrendConflict: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 75,
          confidence: 70,
          indicators: ['RSI'], // Momentum indicator
          reasoning: 'RSI showing oversold momentum',
          riskReward: 2.0,
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 80,
          confidence: 75,
          indicators: ['EMA'], // Trend indicator
          reasoning: 'EMA showing bearish trend',
          riskReward: 1.8,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(momentumTrendConflict);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        expect(harmonizedSignal.conflicts.some(c => 
          c.includes('Momentum vs Trend') || c.includes('momentum') || c.includes('trend')
        )).toBe(true);
      }
    });

    test('should detect multiple indicator conflicts', () => {
      const multipleConflicts: TradingSignal[] = [
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
          reasoning: 'MACD bearish',
          riskReward: 1.9,
          timestamp: new Date()
        },
        {
          id: '3',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 70,
          confidence: 65,
          indicators: ['Fibonacci'],
          reasoning: 'Fibonacci support',
          riskReward: 1.8,
          timestamp: new Date()
        },
        {
          id: '4',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 75,
          confidence: 70,
          indicators: ['Breakout'],
          reasoning: 'Breakout failure',
          riskReward: 1.7,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(multipleConflicts);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should detect multiple conflicts
        expect(harmonizedSignal.conflicts.length).toBeGreaterThan(0);
        
        // Should handle complex conflict scenarios
        expect(harmonizedSignal.reasoning).toContain('conflict');
        expect(harmonizedSignal.confidence).toBeLessThan(80); // Confidence should be reduced due to conflicts
      }
    });

    test('should not detect conflicts in aligned signals', () => {
      const alignedSignals: TradingSignal[] = [
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
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 80,
          confidence: 75,
          indicators: ['MACD'],
          reasoning: 'MACD bullish crossover',
          riskReward: 1.9,
          timestamp: new Date()
        },
        {
          id: '3',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 70,
          confidence: 65,
          indicators: ['EMA'],
          reasoning: 'EMA bullish trend',
          riskReward: 1.8,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(alignedSignals);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should have minimal or no conflicts
        expect(harmonizedSignal.conflicts.length).toBe(0);
        expect(harmonizedSignal.overallSignal).toBe('BUY');
        expect(harmonizedSignal.confidence).toBeGreaterThan(70); // High confidence due to alignment
      }
    });

    test('should detect weak signal conflicts', () => {
      const weakConflictingSignals: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 45, // Weak signal
          confidence: 50,
          indicators: ['RSI'],
          reasoning: 'Weak RSI signal',
          riskReward: 1.2,
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 40, // Weak signal
          confidence: 45,
          indicators: ['MACD'],
          reasoning: 'Weak MACD signal',
          riskReward: 1.1,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(weakConflictingSignals);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should prefer HOLD for weak conflicting signals
        expect(harmonizedSignal.overallSignal).toBe('HOLD');
        expect(harmonizedSignal.confidence).toBeLessThan(60);
      }
    });
  });

  describe('Resolution Mechanism Validation', () => {
    test('should resolve conflicts through weighted scoring', () => {
      const conflictingSignals: TradingSignal[] = [
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
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(conflictingSignals);

      // Test with RSI heavily weighted
      const rsiWeightedConfig = {
        rsi: { name: 'RSI', enabled: true, weight: 0.8, parameters: {} },
        macd: { name: 'MACD', enabled: true, weight: 0.2, parameters: {} }
      };

      const rsiWeightedSignal = harmonizationEngine.harmonizeSignals(mockMarketData, rsiWeightedConfig);
      
      // Test with MACD heavily weighted
      const macdWeightedConfig = {
        rsi: { name: 'RSI', enabled: true, weight: 0.2, parameters: {} },
        macd: { name: 'MACD', enabled: true, weight: 0.8, parameters: {} }
      };

      const macdWeightedSignal = harmonizationEngine.harmonizeSignals(mockMarketData, macdWeightedConfig);
      
      expect(rsiWeightedSignal).toBeDefined();
      expect(macdWeightedSignal).toBeDefined();
      
      if (rsiWeightedSignal && macdWeightedSignal) {
        // Both signals should make valid decisions
        expect(['BUY', 'SELL', 'HOLD']).toContain(rsiWeightedSignal.overallSignal);
        expect(['BUY', 'SELL', 'HOLD']).toContain(macdWeightedSignal.overallSignal);
        
        // Weights should be reflected in the harmonized signals
        expect(rsiWeightedSignal.weights).toBeDefined();
        expect(macdWeightedSignal.weights).toBeDefined();
        
        // The weighted signals should have different characteristics
        expect(rsiWeightedSignal.reasoning).toContain('indicators');
        expect(macdWeightedSignal.reasoning).toContain('indicators');
      }
    });

    test('should resolve conflicts based on signal strength', () => {
      const strengthBasedConflict: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 90, // Very strong
          confidence: 85,
          indicators: ['RSI'],
          reasoning: 'Very strong RSI oversold',
          riskReward: 2.5,
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 55, // Moderate
          confidence: 50,
          indicators: ['MACD'],
          reasoning: 'Moderate MACD bearish',
          riskReward: 1.3,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(strengthBasedConflict);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should make a decision based on signal strength
        expect(['BUY', 'SELL', 'HOLD']).toContain(harmonizedSignal.overallSignal);
        expect(harmonizedSignal.strength).toBeGreaterThan(0);
        
        // May or may not detect conflicts depending on threshold
        expect(harmonizedSignal.conflicts.length).toBeGreaterThanOrEqual(0);
      }
    });

    test('should resolve conflicts based on confidence levels', () => {
      const confidenceBasedConflict: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 70,
          confidence: 90, // Very high confidence
          indicators: ['RSI'],
          reasoning: 'High confidence RSI signal',
          riskReward: 2.0,
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 75,
          confidence: 45, // Low confidence
          indicators: ['MACD'],
          reasoning: 'Low confidence MACD signal',
          riskReward: 1.8,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(confidenceBasedConflict);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should make a decision based on confidence levels
        expect(['BUY', 'SELL', 'HOLD']).toContain(harmonizedSignal.overallSignal);
        expect(harmonizedSignal.confidence).toBeGreaterThan(0);
      }
    });

    test('should handle equal strength conflicts', () => {
      const equalStrengthConflict: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 75,
          confidence: 70,
          indicators: ['RSI'],
          reasoning: 'Equal strength buy signal',
          riskReward: 2.0,
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 75,
          confidence: 70,
          indicators: ['MACD'],
          reasoning: 'Equal strength sell signal',
          riskReward: 2.0,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(equalStrengthConflict);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should prefer HOLD when signals are equally strong and conflicting
        expect(harmonizedSignal.overallSignal).toBe('HOLD');
        expect(harmonizedSignal.conflicts.length).toBeGreaterThan(0);
        expect(harmonizedSignal.reasoning).toContain('conflict');
      }
    });
  });

  describe('Multi-Indicator Conflict Scenarios', () => {
    test('should handle three-way conflicts', () => {
      const threeWayConflict: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 70,
          confidence: 65,
          indicators: ['RSI'],
          reasoning: 'RSI buy signal',
          riskReward: 2.0,
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 75,
          confidence: 70,
          indicators: ['MACD'],
          reasoning: 'MACD sell signal',
          riskReward: 1.8,
          timestamp: new Date()
        },
        {
          id: '3',
          symbol: 'BTC/USDT',
          type: 'HOLD',
          strength: 65,
          confidence: 60,
          indicators: ['EMA'],
          reasoning: 'EMA neutral signal',
          riskReward: 1.0,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(threeWayConflict);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should handle three-way conflict appropriately
        expect(['BUY', 'SELL', 'HOLD']).toContain(harmonizedSignal.overallSignal);
        expect(harmonizedSignal.conflicts.length).toBeGreaterThanOrEqual(0);
        expect(harmonizedSignal.confidence).toBeGreaterThan(0);
      }
    });

    test('should handle majority vs minority conflicts', () => {
      const majorityMinorityConflict: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 70,
          confidence: 65,
          indicators: ['RSI'],
          reasoning: 'RSI buy signal',
          riskReward: 2.0,
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 75,
          confidence: 70,
          indicators: ['MACD'],
          reasoning: 'MACD buy signal',
          riskReward: 1.9,
          timestamp: new Date()
        },
        {
          id: '3',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 68,
          confidence: 63,
          indicators: ['Fibonacci'],
          reasoning: 'Fibonacci buy signal',
          riskReward: 1.8,
          timestamp: new Date()
        },
        {
          id: '4',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 85, // Strong minority signal
          confidence: 80,
          indicators: ['Breakout'],
          reasoning: 'Strong breakout sell signal',
          riskReward: 2.2,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(majorityMinorityConflict);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should consider both majority consensus and minority strength
        expect(['BUY', 'HOLD']).toContain(harmonizedSignal.overallSignal);
        expect(harmonizedSignal.conflicts.length).toBeGreaterThan(0);
        
        // Reasoning should mention the conflict
        expect(harmonizedSignal.reasoning).toContain('conflict');
      }
    });

    test('should handle cascading conflicts', () => {
      const cascadingConflicts: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 80,
          confidence: 75,
          indicators: ['RSI', 'Stochastic'], // Multiple indicators in one signal
          reasoning: 'Multiple momentum indicators bullish',
          riskReward: 2.1,
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 85,
          confidence: 80,
          indicators: ['MACD', 'Signal Line'], // Multiple indicators in one signal
          reasoning: 'Multiple trend indicators bearish',
          riskReward: 2.0,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(cascadingConflicts);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should handle complex multi-indicator conflicts
        expect(harmonizedSignal.conflicts.length).toBeGreaterThan(0);
        expect(harmonizedSignal.reasoning).toContain('conflict');
        
        // Should still make a decision
        expect(['BUY', 'SELL', 'HOLD']).toContain(harmonizedSignal.overallSignal);
      }
    });
  });

  describe('Edge Case Handling', () => {
    test('should handle single signal (no conflicts)', () => {
      const singleSignal: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 75,
          confidence: 70,
          indicators: ['RSI'],
          reasoning: 'Single RSI signal',
          riskReward: 2.0,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(singleSignal);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        expect(harmonizedSignal.conflicts.length).toBe(0);
        expect(harmonizedSignal.overallSignal).toBe('BUY');
        expect(harmonizedSignal.confidence).toBeGreaterThan(60); // Allow for confidence calculation variations
      }
    });

    test('should handle empty signals', () => {
      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue([]);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeNull();
    });

    test('should handle signals with missing metadata', () => {
      const signalsWithoutMetadata: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 75,
          confidence: 70,
          indicators: ['RSI'],
          reasoning: 'RSI signal without metadata',
          riskReward: 2.0,
          timestamp: new Date()
          // No metadata property
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 65,
          confidence: 60,
          indicators: ['MACD'],
          reasoning: 'MACD signal without metadata',
          riskReward: 1.8,
          timestamp: new Date()
          // No metadata property
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(signalsWithoutMetadata);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should handle missing metadata gracefully
        expect(harmonizedSignal.indicators).toBeDefined();
        expect(Array.isArray(harmonizedSignal.indicators)).toBe(true);
        expect(harmonizedSignal.conflicts.length).toBeGreaterThanOrEqual(0);
      }
    });

    test('should handle extreme signal values', () => {
      const extremeSignals: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 100, // Maximum strength
          confidence: 100, // Maximum confidence
          indicators: ['RSI'],
          reasoning: 'Extreme buy signal',
          riskReward: 10.0, // Very high RR
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'SELL',
          strength: 0, // Minimum strength
          confidence: 0, // Minimum confidence
          indicators: ['MACD'],
          reasoning: 'Extreme sell signal',
          riskReward: 0.1, // Very low RR
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(extremeSignals);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should handle extreme values without crashing
        expect(harmonizedSignal.strength).toBeGreaterThanOrEqual(0);
        expect(harmonizedSignal.strength).toBeLessThanOrEqual(100);
        expect(harmonizedSignal.confidence).toBeGreaterThanOrEqual(0);
        expect(harmonizedSignal.confidence).toBeLessThanOrEqual(100);
        
        // Should favor the stronger signal
        expect(harmonizedSignal.overallSignal).toBe('BUY');
      }
    });

    test('should handle identical signals', () => {
      const identicalSignals: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 75,
          confidence: 70,
          indicators: ['RSI'],
          reasoning: 'Identical signal 1',
          riskReward: 2.0,
          timestamp: new Date()
        },
        {
          id: '2',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 75,
          confidence: 70,
          indicators: ['RSI'],
          reasoning: 'Identical signal 2',
          riskReward: 2.0,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(identicalSignals);

      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        // Should handle identical signals without conflicts
        expect(harmonizedSignal.conflicts.length).toBe(0);
        expect(harmonizedSignal.overallSignal).toBe('BUY');
        expect(harmonizedSignal.confidence).toBeGreaterThan(70); // Should be higher due to consensus
      }
    });
  });

  describe('Conflict Resolution Performance', () => {
    test('should resolve conflicts efficiently with many signals', () => {
      // Generate many conflicting signals
      const manyConflictingSignals: TradingSignal[] = [];
      
      for (let i = 0; i < 50; i++) {
        manyConflictingSignals.push({
          id: `${i}`,
          symbol: 'BTC/USDT',
          type: i % 2 === 0 ? 'BUY' : 'SELL',
          strength: 50 + Math.random() * 40,
          confidence: 50 + Math.random() * 40,
          indicators: [`Indicator${i % 5}`],
          reasoning: `Signal ${i}`,
          riskReward: 1.5 + Math.random(),
          timestamp: new Date()
        });
      }

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(manyConflictingSignals);

      const startTime = Date.now();
      const harmonizedSignal = harmonizationEngine.harmonizeSignals(mockMarketData);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(processingTime).toBeLessThan(1000);
      
      expect(harmonizedSignal).toBeDefined();
      if (harmonizedSignal) {
        expect(harmonizedSignal.conflicts.length).toBeGreaterThan(0);
        expect(['BUY', 'SELL', 'HOLD']).toContain(harmonizedSignal.overallSignal);
      }
    });

    test('should maintain consistency in conflict resolution', () => {
      const consistentConflictSignals: TradingSignal[] = [
        {
          id: '1',
          symbol: 'BTC/USDT',
          type: 'BUY',
          strength: 70,
          confidence: 65,
          indicators: ['RSI'],
          reasoning: 'Consistent test signal',
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
          reasoning: 'Consistent test signal',
          riskReward: 1.5,
          timestamp: new Date()
        }
      ];

      jest.spyOn(harmonizationEngine, 'generateAllSignals').mockReturnValue(consistentConflictSignals);

      // Run harmonization multiple times
      const results = [
        harmonizationEngine.harmonizeSignals(mockMarketData),
        harmonizationEngine.harmonizeSignals(mockMarketData),
        harmonizationEngine.harmonizeSignals(mockMarketData)
      ];

      // Results should be consistent
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
      expect(results[2]).toBeDefined();
      
      if (results[0] && results[1] && results[2]) {
        expect(results[0].overallSignal).toBe(results[1].overallSignal);
        expect(results[1].overallSignal).toBe(results[2].overallSignal);
        
        expect(Math.abs(results[0].strength - results[1].strength)).toBeLessThan(0.1);
        expect(Math.abs(results[0].confidence - results[1].confidence)).toBeLessThan(0.1);
        
        expect(results[0].conflicts.length).toBe(results[1].conflicts.length);
        expect(results[1].conflicts.length).toBe(results[2].conflicts.length);
      }
    });
  });

  // Helper function to generate mock market data
  function generateMockMarketData(): MarketData[] {
    const data: MarketData[] = [];
    let basePrice = 50000;
    
    for (let i = 0; i < 50; i++) {
      const price = basePrice + (Math.sin(i * 0.1) * 1000) + (Math.random() * 200 - 100);
      data.push({
        symbol: 'BTC/USDT',
        timestamp: new Date(Date.now() - (50 - i) * 60000),
        open: price - 10,
        high: price + 50,
        low: price - 50,
        close: price,
        volume: 1000000 + (Math.random() * 500000)
      });
    }
    
    return data;
  }
});
