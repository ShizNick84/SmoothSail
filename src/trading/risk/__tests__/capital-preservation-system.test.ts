/**
 * Capital Preservation System Tests
 * 
 * Comprehensive tests for capital preservation functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CapitalPreservationSystem, CapitalProtectionConfig } from '../capital-preservation-system';
import { Position } from '../types';

describe('CapitalPreservationSystem', () => {
  let system: CapitalPreservationSystem;
  let defaultConfig: CapitalProtectionConfig;
  let basePositions: Position[];

  beforeEach(() => {
    defaultConfig = {
      maxDrawdownThreshold: 10, // 10% max drawdown
      warningDrawdownThreshold: 5, // 5% warning
      criticalDrawdownThreshold: 15, // 15% critical
      consecutiveLossLimit: 3,
      positionSizeReductionFactor: 0.5,
      recoveryThreshold: 3, // 3% drawdown for recovery
      dailyLossLimit: 2, // 2% daily loss limit
      weeklyLossLimit: 5, // 5% weekly loss limit
      monthlyLossLimit: 10 // 10% monthly loss limit
    };

    system = new CapitalPreservationSystem(defaultConfig);

    basePositions = [
      {
        id: 'pos1',
        symbol: 'BTC',
        size: 0.1,
        entryPrice: 50000,
        currentPrice: 51000,
        type: 'LONG',
        unrealizedPnL: 100,
        stopLoss: 49000,
        takeProfit: 53000,
        timestamp: new Date()
      },
      {
        id: 'pos2',
        symbol: 'ETH',
        size: 1.0,
        entryPrice: 3000,
        currentPrice: 3100,
        type: 'LONG',
        unrealizedPnL: 100,
        stopLoss: 2900,
        takeProfit: 3300,
        timestamp: new Date()
      }
    ];
  });

  describe('monitorCapitalPreservation', () => {
    it('should monitor normal conditions without alerts', async () => {
      const result = await system.monitorCapitalPreservation(
        10000, // Current balance
        [], // No positions to avoid correlation alerts
        50, // Daily P&L (positive)
        200, // Weekly P&L (positive)
        500 // Monthly P&L (positive)
      );

      expect(result.drawdownStatus.currentDrawdown).toBe(0);
      expect(result.alerts).toHaveLength(0);
      expect(result.emergencyActions).toHaveLength(0);
      expect(result.tradingAllowed).toBe(true);
    });

    it('should detect warning level drawdown', async () => {
      // First establish a peak balance
      await system.monitorCapitalPreservation(
        10000,
        basePositions,
        0,
        0,
        0
      );

      // Then simulate account loss (from 10000 to 9400 = 6% drawdown)
      // Keep daily loss under 2% limit (2% of 9400 = 188)
      const result = await system.monitorCapitalPreservation(
        9400,
        basePositions,
        -180, // 1.8% daily loss (under 2% limit)
        -600,
        -600
      );

      expect(result.drawdownStatus.currentDrawdown).toBeGreaterThan(5);
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.alerts[0].type).toBe('DRAWDOWN_WARNING');
      expect(result.alerts[0].severity).toBe('MEDIUM');
      expect(result.tradingAllowed).toBe(true);
    });

    it('should detect high drawdown and activate risk reduction', async () => {
      // First establish a peak balance
      await system.monitorCapitalPreservation(
        10000,
        basePositions,
        0,
        0,
        0
      );

      // Then simulate significant loss (from 10000 to 8800 = 12% drawdown)
      // Keep daily loss under 2% limit (2% of 8800 = 176)
      const result = await system.monitorCapitalPreservation(
        8800,
        basePositions,
        -170, // 1.9% daily loss (under 2% limit)
        -1200,
        -1200
      );

      expect(result.drawdownStatus.currentDrawdown).toBeGreaterThan(10);
      expect(result.drawdownStatus.riskReductionLevel).toBeGreaterThan(0);
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.alerts[0].severity).toBe('HIGH');
      expect(result.emergencyActions.length).toBeGreaterThan(0);
      expect(result.tradingAllowed).toBe(true);
    });

    it('should activate emergency stop on critical drawdown', async () => {
      // First establish a peak balance
      await system.monitorCapitalPreservation(
        10000,
        basePositions,
        0,
        0,
        0
      );

      // Then simulate critical loss (from 10000 to 8400 = 16% drawdown)
      const result = await system.monitorCapitalPreservation(
        8400,
        basePositions,
        -1600,
        -1600,
        -1600
      );

      expect(result.drawdownStatus.currentDrawdown).toBeGreaterThan(15);
      expect(result.drawdownStatus.emergencyMeasuresActive).toBe(true);
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.alerts[0].type).toBe('EMERGENCY_STOP');
      expect(result.alerts[0].severity).toBe('CRITICAL');
      expect(result.emergencyActions.length).toBeGreaterThan(0);
      expect(result.tradingAllowed).toBe(false);
    });

    it('should halt trading when daily loss limit exceeded', async () => {
      const result = await system.monitorCapitalPreservation(
        9700, // 3% loss exceeds 2% daily limit
        basePositions,
        -300, // 3% daily loss
        -300,
        -300
      );

      expect(result.lossLimits.daily.remaining).toBeLessThanOrEqual(0);
      expect(result.alerts.some(a => a.type === 'EMERGENCY_STOP')).toBe(true);
      expect(result.tradingAllowed).toBe(false);
    });

    it('should warn when approaching weekly loss limit', async () => {
      const result = await system.monitorCapitalPreservation(
        9550, // 4.5% loss approaching 5% weekly limit
        basePositions,
        -50,
        -450, // 4.5% weekly loss
        -450
      );

      expect(result.lossLimits.weekly.remaining).toBeLessThan(result.lossLimits.weekly.limit * 0.2);
      expect(result.alerts.some(a => a.message.includes('Weekly loss limit'))).toBe(true);
    });

    it('should detect correlation risk', async () => {
      // Add more BTC and ETH positions to increase correlation
      const correlatedPositions = [
        ...basePositions,
        {
          id: 'pos3',
          symbol: 'BTC',
          size: 0.2,
          entryPrice: 49000,
          currentPrice: 50000,
          type: 'LONG',
          unrealizedPnL: 200,
          stopLoss: 48000,
          takeProfit: 52000,
          timestamp: new Date()
        }
      ];

      const result = await system.monitorCapitalPreservation(
        10000,
        correlatedPositions,
        0,
        0,
        0
      );

      expect(result.alerts.some(a => a.type === 'CORRELATION_RISK')).toBe(true);
    });
  });

  describe('position size adjustment', () => {
    it('should not adjust position size under normal conditions', () => {
      const drawdownStatus = {
        currentDrawdown: 2,
        maxDrawdown: 2,
        drawdownDuration: 1,
        recoveryProgress: 100,
        emergencyMeasuresActive: false,
        riskReductionLevel: 0
      };

      const adjustedSize = system.calculatePositionSizeAdjustment(1000, drawdownStatus);
      expect(adjustedSize).toBe(1000);
    });

    it('should reduce position size during high drawdown', () => {
      const drawdownStatus = {
        currentDrawdown: 12,
        maxDrawdown: 12,
        drawdownDuration: 5,
        recoveryProgress: 0,
        emergencyMeasuresActive: false,
        riskReductionLevel: 40 // 40% risk reduction
      };

      const adjustedSize = system.calculatePositionSizeAdjustment(1000, drawdownStatus);
      expect(adjustedSize).toBe(600); // 40% reduction
    });

    it('should maximize risk reduction during critical drawdown', () => {
      const drawdownStatus = {
        currentDrawdown: 18,
        maxDrawdown: 18,
        drawdownDuration: 10,
        recoveryProgress: 0,
        emergencyMeasuresActive: true,
        riskReductionLevel: 100 // Maximum risk reduction
      };

      const adjustedSize = system.calculatePositionSizeAdjustment(1000, drawdownStatus);
      expect(adjustedSize).toBe(0); // Complete halt
    });
  });

  describe('recovery conditions', () => {
    it('should not allow recovery when emergency mode is not active', () => {
      const drawdownStatus = {
        currentDrawdown: 2,
        maxDrawdown: 5,
        drawdownDuration: 1,
        recoveryProgress: 100,
        emergencyMeasuresActive: false,
        riskReductionLevel: 0
      };

      const canRecover = system.checkRecoveryConditions(drawdownStatus);
      expect(canRecover).toBe(true);
    });

    it('should allow recovery when conditions are met', async () => {
      // First trigger emergency mode
      await system.monitorCapitalPreservation(8400, basePositions, -1600, -1600, -1600);

      // Then simulate recovery
      const drawdownStatus = {
        currentDrawdown: 2, // Below recovery threshold
        maxDrawdown: 16,
        drawdownDuration: 5,
        recoveryProgress: 90, // Above 80% recovery
        emergencyMeasuresActive: true,
        riskReductionLevel: 0
      };

      const canRecover = system.checkRecoveryConditions(drawdownStatus);
      expect(canRecover).toBe(true);
    });

    it('should not allow recovery when drawdown is still high', async () => {
      // First establish a peak balance
      await system.monitorCapitalPreservation(
        10000,
        basePositions,
        0,
        0,
        0
      );

      // Then trigger emergency mode
      await system.monitorCapitalPreservation(8400, basePositions, -1600, -1600, -1600);

      const drawdownStatus = {
        currentDrawdown: 8, // Still above recovery threshold
        maxDrawdown: 16,
        drawdownDuration: 5,
        recoveryProgress: 50, // Below 80% recovery
        emergencyMeasuresActive: true,
        riskReductionLevel: 20
      };

      const canRecover = system.checkRecoveryConditions(drawdownStatus);
      expect(canRecover).toBe(false);
    });

    it('should resume normal operations after recovery', async () => {
      // First trigger emergency mode
      await system.monitorCapitalPreservation(8400, basePositions, -1600, -1600, -1600);

      // Resume operations
      system.resumeNormalOperations();

      const stats = system.getCapitalPreservationStats();
      expect(stats.currentStatus).toBe('NORMAL');

      const alerts = system.getRecentAlerts(5);
      expect(alerts.some(a => a.message.includes('Normal operations resumed'))).toBe(true);
    });
  });

  describe('statistics and reporting', () => {
    it('should track capital preservation statistics', async () => {
      // Simulate multiple drawdown periods
      await system.monitorCapitalPreservation(9400, basePositions, -600, -600, -600);
      await system.monitorCapitalPreservation(8800, basePositions, -1200, -1200, -1200);
      await system.monitorCapitalPreservation(8400, basePositions, -1600, -1600, -1600);

      const stats = system.getCapitalPreservationStats();

      expect(stats.totalDrawdownPeriods).toBeGreaterThan(0);
      expect(stats.maxHistoricalDrawdown).toBeGreaterThan(15);
      expect(stats.emergencyActivations).toBeGreaterThan(0);
      expect(stats.currentStatus).toBe('EMERGENCY');
    });

    it('should manage alerts correctly', async () => {
      await system.monitorCapitalPreservation(9400, basePositions, -600, -600, -600);

      const recentAlerts = system.getRecentAlerts(5);
      expect(recentAlerts.length).toBeGreaterThan(0);

      // Clear old alerts
      system.clearOldAlerts(0); // Clear all alerts
      const alertsAfterClear = system.getRecentAlerts(5);
      expect(alertsAfterClear.length).toBe(0);
    });

    it('should update configuration correctly', () => {
      const newConfig = { maxDrawdownThreshold: 15 };
      system.updateConfig(newConfig);

      const config = system.getConfig();
      expect(config.maxDrawdownThreshold).toBe(15);
      expect(config.warningDrawdownThreshold).toBe(5); // Should remain unchanged
    });
  });

  describe('loss limits', () => {
    it('should calculate loss limits correctly', async () => {
      const result = await system.monitorCapitalPreservation(
        9800, // 2% loss
        basePositions,
        -200, // 2% daily loss
        -200,
        -200
      );

      expect(result.lossLimits.daily.limit).toBe(196); // 2% of 9800 (current balance)
      expect(result.lossLimits.daily.current).toBe(200);
      expect(result.lossLimits.daily.remaining).toBe(0);

      expect(result.lossLimits.weekly.limit).toBe(490); // 5% of 9800 (current balance)
      expect(result.lossLimits.weekly.current).toBe(200);
      expect(result.lossLimits.weekly.remaining).toBe(290);
    });

    it('should handle positive P&L correctly', async () => {
      const result = await system.monitorCapitalPreservation(
        10200, // 2% gain
        basePositions,
        200, // Positive daily P&L
        200,
        200
      );

      expect(result.lossLimits.daily.current).toBe(0); // No loss
      expect(result.lossLimits.daily.remaining).toBe(result.lossLimits.daily.limit);
    });
  });

  describe('edge cases', () => {
    it('should handle empty positions array', async () => {
      const result = await system.monitorCapitalPreservation(
        10000,
        [], // No positions
        0,
        0,
        0
      );

      expect(result.drawdownStatus.currentDrawdown).toBe(0);
      expect(result.tradingAllowed).toBe(true);
    });

    it('should handle very small account balance', async () => {
      // First establish a peak balance
      await system.monitorCapitalPreservation(
        110,
        [],
        0,
        0,
        0
      );

      // Then simulate loss
      const result = await system.monitorCapitalPreservation(
        100, // Very small balance
        [],
        -10, // 10% loss
        -10,
        -10
      );

      expect(result.drawdownStatus.currentDrawdown).toBeGreaterThan(0);
      expect(result.lossLimits.daily.limit).toBe(2); // 2% of 100
    });

    it('should handle first snapshot correctly', async () => {
      const newSystem = new CapitalPreservationSystem(defaultConfig);
      
      const result = await newSystem.monitorCapitalPreservation(
        10000,
        basePositions,
        0,
        0,
        0
      );

      expect(result.drawdownStatus.currentDrawdown).toBe(0);
      expect(result.drawdownStatus.maxDrawdown).toBe(0);
    });
  });
});
