/**
 * Trailing Stop Manager Tests
 * 
 * Comprehensive tests for trailing stop loss functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TrailingStopManager, MarketConditions } from '../trailing-stop-manager';
import { TrailingStopConfig, Position } from '../types';

describe('TrailingStopManager', () => {
  let manager: TrailingStopManager;
  let defaultConfig: TrailingStopConfig;
  let basePosition: Position;
  let marketConditions: MarketConditions;

  beforeEach(() => {
    manager = new TrailingStopManager();

    defaultConfig = {
      initialStopLoss: 1.0, // 1% initial stop loss
      trailingDistance: 1.5, // 1.5% trailing distance
      minProfitToTrail: 0.5, // Start trailing at 0.5% profit
      breakevenThreshold: 2.0, // Move to breakeven at 2% profit
      volatilityAdjustment: true
    };

    basePosition = {
      id: 'test-position-1',
      symbol: 'BTC',
      size: 0.1,
      entryPrice: 50000,
      currentPrice: 51000, // 2% profit
      type: 'LONG',
      unrealizedPnL: 100,
      stopLoss: 49500, // 1% below entry
      takeProfit: 53000,
      timestamp: new Date()
    };

    marketConditions = {
      volatility: 0.3,
      trend: 'BULLISH',
      atr: 1000, // $1000 ATR
      supportLevel: 50500,
      resistanceLevel: 52000
    };
  });

  describe('updateTrailingStop', () => {
    it('should not trail if profit is below minimum threshold', () => {
      const lowProfitPosition = {
        ...basePosition,
        currentPrice: 50200 // Only 0.4% profit
      };

      const result = manager.updateTrailingStop(lowProfitPosition, defaultConfig, marketConditions);

      expect(result.updated).toBe(false);
      expect(result.reason).toContain('below minimum');
      expect(result.newStopLoss).toBe(lowProfitPosition.stopLoss);
    });

    it('should update trailing stop when profit exceeds threshold', () => {
      const result = manager.updateTrailingStop(basePosition, defaultConfig, marketConditions);

      expect(result.updated).toBe(true);
      expect(result.newStopLoss).toBeGreaterThan(basePosition.stopLoss);
      expect(result.trailingDistance).toBeGreaterThan(0);
    });

    it('should activate breakeven stop at threshold', () => {
      const result = manager.updateTrailingStop(basePosition, defaultConfig, marketConditions);

      // Position has 2% profit, which equals breakeven threshold
      expect(result.breakevenActive).toBe(true);
      expect(result.reason).toContain('Breakeven');
      expect(result.newStopLoss).toBeGreaterThan(basePosition.entryPrice);
    });

    it('should adjust trailing distance for volatility', () => {
      const highVolatilityConditions = {
        ...marketConditions,
        volatility: 0.8 // High volatility
      };

      const result = manager.updateTrailingStop(basePosition, defaultConfig, highVolatilityConditions);

      // Should use wider trailing distance due to high volatility
      expect(result.trailingDistance).toBeGreaterThan(defaultConfig.trailingDistance);
    });

    it('should consider support levels for long positions', () => {
      const positionNearSupport = {
        ...basePosition,
        currentPrice: 50600 // Close to support at 50500
      };

      const result = manager.updateTrailingStop(positionNearSupport, defaultConfig, marketConditions);

      if (result.updated) {
        // Stop loss should be influenced by support level
        expect(result.newStopLoss).toBeGreaterThanOrEqual(marketConditions.supportLevel! * 0.99);
      }
    });

    it('should only move stop loss in favorable direction for long positions', () => {
      const currentStopLoss = basePosition.stopLoss;
      const result = manager.updateTrailingStop(basePosition, defaultConfig, marketConditions);

      if (result.updated) {
        expect(result.newStopLoss).toBeGreaterThan(currentStopLoss);
      }
    });

    it('should handle short positions correctly', () => {
      const shortPosition: Position = {
        ...basePosition,
        type: 'SHORT',
        entryPrice: 50000,
        currentPrice: 49000, // 2% profit for short
        stopLoss: 50500 // 1% above entry
      };

      const result = manager.updateTrailingStop(shortPosition, defaultConfig, marketConditions);

      if (result.updated) {
        // For short positions, stop loss should move down
        expect(result.newStopLoss).toBeLessThan(shortPosition.stopLoss);
      }
    });
  });

  describe('calculateInitialStopLoss', () => {
    it('should calculate correct initial stop loss for long position', () => {
      const initialStop = manager.calculateInitialStopLoss(
        50000,
        'LONG',
        defaultConfig,
        marketConditions
      );

      // Should be approximately 1% below entry (adjusted for volatility and ATR)
      expect(initialStop).toBeLessThan(50000);
      expect(initialStop).toBeGreaterThan(48000); // Reasonable range
    });

    it('should calculate correct initial stop loss for short position', () => {
      const initialStop = manager.calculateInitialStopLoss(
        50000,
        'SHORT',
        defaultConfig,
        marketConditions
      );

      // Should be above entry price for short position
      expect(initialStop).toBeGreaterThan(50000);
      expect(initialStop).toBeLessThan(52000); // Reasonable range
    });

    it('should adjust for high volatility', () => {
      const highVolatilityConditions = {
        ...marketConditions,
        volatility: 0.8,
        atr: 2000 // Higher ATR
      };

      const normalStop = manager.calculateInitialStopLoss(50000, 'LONG', defaultConfig, marketConditions);
      const volatilityAdjustedStop = manager.calculateInitialStopLoss(50000, 'LONG', defaultConfig, highVolatilityConditions);

      // High volatility should result in wider stop loss
      expect(volatilityAdjustedStop).toBeLessThan(normalStop);
    });
  });

  describe('optimizeStopLoss', () => {
    it('should widen stop loss in high volatility', () => {
      const highVolatilityConditions = {
        ...marketConditions,
        volatility: 0.8,
        atr: 2000
      };

      const tightStopPosition = {
        ...basePosition,
        stopLoss: 50800 // Very tight stop
      };

      const result = manager.optimizeStopLoss(tightStopPosition, defaultConfig, highVolatilityConditions);

      expect(result.optimizedStopLoss).toBeLessThan(tightStopPosition.stopLoss);
      expect(result.reason).toContain('volatility');
    });

    it('should optimize stop loss to support level', () => {
      const result = manager.optimizeStopLoss(basePosition, defaultConfig, marketConditions);

      if (marketConditions.supportLevel && result.optimizedStopLoss !== basePosition.stopLoss) {
        expect(result.reason).toContain('support');
      }
    });

    it('should return current stop if already optimal', () => {
      const optimalPosition = {
        ...basePosition,
        stopLoss: 50000 // Already at a good level
      };

      const result = manager.optimizeStopLoss(optimalPosition, defaultConfig, marketConditions);

      expect(result.optimizedStopLoss).toBe(optimalPosition.stopLoss);
      expect(result.reason).toContain('optimal');
    });
  });

  describe('trailing stop history and statistics', () => {
    it('should record trailing stop updates', () => {
      manager.updateTrailingStop(basePosition, defaultConfig, marketConditions);

      const history = manager.getTrailingStopHistory(basePosition.id);
      expect(history.length).toBeGreaterThan(0);

      const lastUpdate = history[history.length - 1];
      expect(lastUpdate.positionId).toBe(basePosition.id);
      expect(lastUpdate.previousStopLoss).toBe(basePosition.stopLoss);
    });

    it('should calculate trailing stop statistics', () => {
      // Generate multiple updates
      for (let i = 0; i < 5; i++) {
        const updatedPosition = {
          ...basePosition,
          currentPrice: 51000 + (i * 100)
        };
        manager.updateTrailingStop(updatedPosition, defaultConfig, marketConditions);
      }

      const stats = manager.getTrailingStopStatistics(basePosition.id);

      expect(stats.totalUpdates).toBeGreaterThan(0);
      expect(stats.averageTrailingDistance).toBeGreaterThan(0);
      expect(stats.breakevenActivations).toBeGreaterThanOrEqual(0);
    });

    it('should clear trailing stop history', () => {
      manager.updateTrailingStop(basePosition, defaultConfig, marketConditions);
      
      let history = manager.getTrailingStopHistory(basePosition.id);
      expect(history.length).toBeGreaterThan(0);

      manager.clearTrailingStopHistory(basePosition.id);
      
      history = manager.getTrailingStopHistory(basePosition.id);
      expect(history.length).toBe(0);
    });

    it('should limit history to 100 updates', () => {
      // Generate 150 updates
      for (let i = 0; i < 150; i++) {
        const updatedPosition = {
          ...basePosition,
          currentPrice: 51000 + i,
          stopLoss: 49500 + i
        };
        manager.updateTrailingStop(updatedPosition, defaultConfig, marketConditions);
      }

      const history = manager.getTrailingStopHistory(basePosition.id);
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('edge cases', () => {
    it('should handle zero ATR', () => {
      const zeroATRConditions = {
        ...marketConditions,
        atr: 0
      };

      const result = manager.updateTrailingStop(basePosition, defaultConfig, zeroATRConditions);
      expect(result).toBeDefined();
    });

    it('should handle position at breakeven', () => {
      const breakevenPosition = {
        ...basePosition,
        currentPrice: 50000 // Exactly at entry
      };

      const result = manager.updateTrailingStop(breakevenPosition, defaultConfig, marketConditions);
      expect(result.updated).toBe(false);
    });

    it('should handle very high profit position', () => {
      const highProfitPosition = {
        ...basePosition,
        currentPrice: 60000 // 20% profit
      };

      const result = manager.updateTrailingStop(highProfitPosition, defaultConfig, marketConditions);
      expect(result.breakevenActive).toBe(true);
      expect(result.newStopLoss).toBeGreaterThan(basePosition.entryPrice);
    });
  });
});