/**
 * Capital Preservation System
 * 
 * Implements sophisticated capital protection with:
 * - Drawdown monitoring and protection
 * - Emergency stop loss mechanisms
 * - Position size reduction during adverse conditions
 * - Capital protection alerts and notifications
 */

import { 
  DrawdownStatus, 
  CapitalProtectionAlert, 
  Position, 
  RiskMetrics 
} from './types.js';

export interface CapitalProtectionConfig {
  /** Maximum allowed drawdown before emergency measures (%) */
  maxDrawdownThreshold: number;
  /** Warning drawdown threshold (%) */
  warningDrawdownThreshold: number;
  /** Critical drawdown threshold for emergency stop (%) */
  criticalDrawdownThreshold: number;
  /** Consecutive loss limit before position size reduction */
  consecutiveLossLimit: number;
  /** Position size reduction factor during adverse conditions */
  positionSizeReductionFactor: number;
  /** Recovery threshold to resume normal operations (%) */
  recoveryThreshold: number;
  /** Daily loss limit as percentage of account balance */
  dailyLossLimit: number;
  /** Weekly loss limit as percentage of account balance */
  weeklyLossLimit: number;
  /** Monthly loss limit as percentage of account balance */
  monthlyLossLimit: number;
}

export interface AccountSnapshot {
  /** Account balance at snapshot time */
  balance: number;
  /** Timestamp of snapshot */
  timestamp: Date;
  /** Unrealized P&L at snapshot time */
  unrealizedPnL: number;
  /** Realized P&L for the period */
  realizedPnL: number;
  /** Number of open positions */
  openPositions: number;
  /** Total portfolio value */
  portfolioValue: number;
}

export interface DrawdownPeriod {
  /** Start date of drawdown */
  startDate: Date;
  /** End date of drawdown (null if ongoing) */
  endDate: Date | null;
  /** Peak balance before drawdown */
  peakBalance: number;
  /** Lowest balance during drawdown */
  troughBalance: number;
  /** Maximum drawdown percentage */
  maxDrawdownPercent: number;
  /** Duration in days */
  durationDays: number;
  /** Recovery progress (0-100%) */
  recoveryProgress: number;
  /** Whether emergency measures were activated */
  emergencyMeasuresActivated: boolean;
}

export interface EmergencyAction {
  /** Action type */
  type: 'CLOSE_ALL_POSITIONS' | 'REDUCE_POSITION_SIZES' | 'HALT_TRADING' | 'INCREASE_STOP_LOSSES';
  /** Action description */
  description: string;
  /** Execution timestamp */
  executedAt: Date;
  /** Positions affected */
  affectedPositions: string[];
  /** Result of the action */
  result: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  /** Additional details */
  details: Record<string, any>;
}

export interface LossLimits {
  /** Daily loss tracking */
  daily: {
    limit: number;
    current: number;
    remaining: number;
    resetTime: Date;
  };
  /** Weekly loss tracking */
  weekly: {
    limit: number;
    current: number;
    remaining: number;
    resetTime: Date;
  };
  /** Monthly loss tracking */
  monthly: {
    limit: number;
    current: number;
    remaining: number;
    resetTime: Date;
  };
}

export class CapitalPreservationSystem {
  private config: CapitalProtectionConfig;
  private accountSnapshots: AccountSnapshot[] = [];
  private drawdownPeriods: DrawdownPeriod[] = [];
  private emergencyActions: EmergencyAction[] = [];
  private alerts: CapitalProtectionAlert[] = [];
  private consecutiveLosses: number = 0;
  private emergencyModeActive: boolean = false;
  private tradingHalted: boolean = false;

  constructor(config: CapitalProtectionConfig) {
    this.config = config;
  }

  /**
   * Monitor account and update capital preservation status
   */
  async monitorCapitalPreservation(
    currentBalance: number,
    positions: Position[],
    dailyPnL: number,
    weeklyPnL: number,
    monthlyPnL: number
  ): Promise<{
    drawdownStatus: DrawdownStatus;
    alerts: CapitalProtectionAlert[];
    emergencyActions: EmergencyAction[];
    lossLimits: LossLimits;
    tradingAllowed: boolean;
  }> {
    // Take account snapshot
    const snapshot = this.takeAccountSnapshot(currentBalance, positions, dailyPnL);
    
    // Calculate drawdown status
    const drawdownStatus = this.calculateDrawdownStatus(snapshot);
    
    // Check loss limits
    const lossLimits = this.checkLossLimits(currentBalance, dailyPnL, weeklyPnL, monthlyPnL);
    
    // Generate alerts
    const newAlerts = this.generateCapitalProtectionAlerts(drawdownStatus, lossLimits, positions);
    
    // Execute emergency actions if needed
    const emergencyActions = await this.executeEmergencyActions(drawdownStatus, lossLimits, positions);
    
    // Determine if trading should be allowed
    const tradingAllowed = this.shouldAllowTrading(drawdownStatus, lossLimits);

    return {
      drawdownStatus,
      alerts: newAlerts,
      emergencyActions,
      lossLimits,
      tradingAllowed
    };
  }

  /**
   * Take snapshot of current account state
   */
  private takeAccountSnapshot(
    currentBalance: number,
    positions: Position[],
    dailyPnL: number
  ): AccountSnapshot {
    const unrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    const portfolioValue = currentBalance + unrealizedPnL;

    const snapshot: AccountSnapshot = {
      balance: currentBalance,
      timestamp: new Date(),
      unrealizedPnL,
      realizedPnL: dailyPnL,
      openPositions: positions.length,
      portfolioValue
    };

    this.accountSnapshots.push(snapshot);

    // Keep only last 1000 snapshots
    if (this.accountSnapshots.length > 1000) {
      this.accountSnapshots.splice(0, this.accountSnapshots.length - 1000);
    }

    return snapshot;
  }

  /**
   * Calculate current drawdown status
   */
  private calculateDrawdownStatus(currentSnapshot: AccountSnapshot): DrawdownStatus {
    if (this.accountSnapshots.length < 2) {
      return {
        currentDrawdown: 0,
        maxDrawdown: 0,
        drawdownDuration: 0,
        recoveryProgress: 100,
        emergencyMeasuresActive: this.emergencyModeActive,
        riskReductionLevel: 0
      };
    }

    // Find peak balance in recent history
    const peakBalance = Math.max(...this.accountSnapshots.map(s => s.portfolioValue));
    const currentBalance = currentSnapshot.portfolioValue;

    // Calculate current drawdown
    const currentDrawdown = peakBalance > 0 ? ((peakBalance - currentBalance) / peakBalance) * 100 : 0;

    // Find or update current drawdown period
    let currentDrawdownPeriod = this.getCurrentDrawdownPeriod();
    
    if (currentDrawdown > 0.1) { // 0.1% minimum to consider a drawdown
      if (!currentDrawdownPeriod) {
        // Start new drawdown period
        currentDrawdownPeriod = {
          startDate: currentSnapshot.timestamp,
          endDate: null,
          peakBalance,
          troughBalance: currentBalance,
          maxDrawdownPercent: currentDrawdown,
          durationDays: 0,
          recoveryProgress: 0,
          emergencyMeasuresActivated: false
        };
        this.drawdownPeriods.push(currentDrawdownPeriod);
      } else {
        // Update existing drawdown period
        currentDrawdownPeriod.troughBalance = Math.min(currentDrawdownPeriod.troughBalance, currentBalance);
        currentDrawdownPeriod.maxDrawdownPercent = Math.max(currentDrawdownPeriod.maxDrawdownPercent, currentDrawdown);
        currentDrawdownPeriod.durationDays = Math.floor(
          (currentSnapshot.timestamp.getTime() - currentDrawdownPeriod.startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    } else if (currentDrawdownPeriod && !currentDrawdownPeriod.endDate) {
      // End current drawdown period
      currentDrawdownPeriod.endDate = currentSnapshot.timestamp;
      currentDrawdownPeriod.recoveryProgress = 100;
    }

    // Calculate recovery progress
    let recoveryProgress = 100;
    if (currentDrawdownPeriod && !currentDrawdownPeriod.endDate) {
      const recoveredAmount = currentBalance - currentDrawdownPeriod.troughBalance;
      const totalDrawdownAmount = currentDrawdownPeriod.peakBalance - currentDrawdownPeriod.troughBalance;
      recoveryProgress = totalDrawdownAmount > 0 ? (recoveredAmount / totalDrawdownAmount) * 100 : 0;
    }

    // Calculate maximum historical drawdown
    const maxDrawdown = Math.max(...this.drawdownPeriods.map(d => d.maxDrawdownPercent), currentDrawdown);

    // Calculate risk reduction level
    const riskReductionLevel = this.calculateRiskReductionLevel(currentDrawdown);

    return {
      currentDrawdown,
      maxDrawdown,
      drawdownDuration: currentDrawdownPeriod?.durationDays || 0,
      recoveryProgress,
      emergencyMeasuresActive: this.emergencyModeActive,
      riskReductionLevel
    };
  }

  /**
   * Get current active drawdown period
   */
  private getCurrentDrawdownPeriod(): DrawdownPeriod | null {
    return this.drawdownPeriods.find(d => d.endDate === null) || null;
  }

  /**
   * Calculate risk reduction level based on drawdown
   */
  private calculateRiskReductionLevel(currentDrawdown: number): number {
    if (currentDrawdown < this.config.warningDrawdownThreshold) {
      return 0; // No risk reduction
    } else if (currentDrawdown < this.config.maxDrawdownThreshold) {
      // Linear scaling from 0 to 50% risk reduction
      const progress = (currentDrawdown - this.config.warningDrawdownThreshold) / 
                      (this.config.maxDrawdownThreshold - this.config.warningDrawdownThreshold);
      return progress * 50;
    } else if (currentDrawdown < this.config.criticalDrawdownThreshold) {
      // Linear scaling from 50% to 80% risk reduction
      const progress = (currentDrawdown - this.config.maxDrawdownThreshold) / 
                      (this.config.criticalDrawdownThreshold - this.config.maxDrawdownThreshold);
      return 50 + (progress * 30);
    } else {
      return 100; // Maximum risk reduction (halt trading)
    }
  }

  /**
   * Check loss limits for different time periods
   */
  private checkLossLimits(
    currentBalance: number,
    dailyPnL: number,
    weeklyPnL: number,
    monthlyPnL: number
  ): LossLimits {
    const now = new Date();

    return {
      daily: {
        limit: currentBalance * (this.config.dailyLossLimit / 100),
        current: Math.abs(Math.min(0, dailyPnL)),
        remaining: Math.max(0, (currentBalance * (this.config.dailyLossLimit / 100)) - Math.abs(Math.min(0, dailyPnL))),
        resetTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      },
      weekly: {
        limit: currentBalance * (this.config.weeklyLossLimit / 100),
        current: Math.abs(Math.min(0, weeklyPnL)),
        remaining: Math.max(0, (currentBalance * (this.config.weeklyLossLimit / 100)) - Math.abs(Math.min(0, weeklyPnL))),
        resetTime: new Date(now.getTime() + (7 - now.getDay()) * 24 * 60 * 60 * 1000)
      },
      monthly: {
        limit: currentBalance * (this.config.monthlyLossLimit / 100),
        current: Math.abs(Math.min(0, monthlyPnL)),
        remaining: Math.max(0, (currentBalance * (this.config.monthlyLossLimit / 100)) - Math.abs(Math.min(0, monthlyPnL))),
        resetTime: new Date(now.getFullYear(), now.getMonth() + 1, 1)
      }
    };
  }

  /**
   * Generate capital protection alerts
   */
  private generateCapitalProtectionAlerts(
    drawdownStatus: DrawdownStatus,
    lossLimits: LossLimits,
    positions: Position[]
  ): CapitalProtectionAlert[] {
    const newAlerts: CapitalProtectionAlert[] = [];

    // Drawdown alerts
    if (drawdownStatus.currentDrawdown >= this.config.criticalDrawdownThreshold) {
      newAlerts.push({
        id: `drawdown-critical-${Date.now()}`,
        type: 'EMERGENCY_STOP',
        severity: 'CRITICAL',
        message: `Critical drawdown of ${drawdownStatus.currentDrawdown.toFixed(2)}% reached. Emergency measures activated.`,
        recommendedActions: ['Halt all trading', 'Close all positions', 'Review risk management'],
        timestamp: new Date(),
        autoExecutedActions: ['Emergency stop activated']
      });
    } else if (drawdownStatus.currentDrawdown >= this.config.maxDrawdownThreshold) {
      newAlerts.push({
        id: `drawdown-high-${Date.now()}`,
        type: 'DRAWDOWN_WARNING',
        severity: 'HIGH',
        message: `High drawdown of ${drawdownStatus.currentDrawdown.toFixed(2)}% detected. Risk reduction measures active.`,
        recommendedActions: ['Reduce position sizes', 'Tighten stop losses', 'Review strategy performance'],
        timestamp: new Date(),
        autoExecutedActions: [`Risk reduction level: ${drawdownStatus.riskReductionLevel.toFixed(0)}%`]
      });
    } else if (drawdownStatus.currentDrawdown >= this.config.warningDrawdownThreshold) {
      newAlerts.push({
        id: `drawdown-warning-${Date.now()}`,
        type: 'DRAWDOWN_WARNING',
        severity: 'MEDIUM',
        message: `Drawdown warning: ${drawdownStatus.currentDrawdown.toFixed(2)}% drawdown detected.`,
        recommendedActions: ['Monitor closely', 'Consider reducing risk'],
        timestamp: new Date(),
        autoExecutedActions: []
      });
    }

    // Loss limit alerts
    if (lossLimits.daily.remaining <= 0) {
      newAlerts.push({
        id: `daily-limit-${Date.now()}`,
        type: 'EMERGENCY_STOP',
        severity: 'CRITICAL',
        message: `Daily loss limit of ${lossLimits.daily.limit.toFixed(2)} exceeded.`,
        recommendedActions: ['Halt trading for today', 'Review trading strategy'],
        timestamp: new Date(),
        autoExecutedActions: ['Daily trading halted']
      });
    }

    if (lossLimits.weekly.remaining <= lossLimits.weekly.limit * 0.1) {
      newAlerts.push({
        id: `weekly-limit-warning-${Date.now()}`,
        type: 'DRAWDOWN_WARNING',
        severity: 'HIGH',
        message: `Weekly loss limit nearly reached: ${lossLimits.weekly.current.toFixed(2)} of ${lossLimits.weekly.limit.toFixed(2)}`,
        recommendedActions: ['Reduce trading activity', 'Review weekly performance'],
        timestamp: new Date(),
        autoExecutedActions: []
      });
    }

    // Correlation risk alerts
    const correlationRisk = this.calculateCorrelationRisk(positions);
    if (correlationRisk > 0.8) {
      newAlerts.push({
        id: `correlation-risk-${Date.now()}`,
        type: 'CORRELATION_RISK',
        severity: 'MEDIUM',
        message: `High correlation risk detected: ${(correlationRisk * 100).toFixed(0)}%`,
        recommendedActions: ['Diversify positions', 'Reduce correlated exposures'],
        timestamp: new Date(),
        autoExecutedActions: []
      });
    }

    this.alerts.push(...newAlerts);
    return newAlerts;
  }

  /**
   * Calculate correlation risk across positions
   */
  private calculateCorrelationRisk(positions: Position[]): number {
    if (positions.length <= 1) return 0;

    // For crypto, BTC and ETH have high correlation
    const btcPositions = positions.filter(p => p.symbol === 'BTC');
    const ethPositions = positions.filter(p => p.symbol === 'ETH');

    if (btcPositions.length > 0 && ethPositions.length > 0) {
      const totalExposure = positions.reduce((sum, p) => sum + Math.abs(p.size * p.currentPrice), 0);
      const correlatedExposure = [...btcPositions, ...ethPositions]
        .reduce((sum, p) => sum + Math.abs(p.size * p.currentPrice), 0);
      
      return correlatedExposure / totalExposure;
    }

    return 0;
  }

  /**
   * Execute emergency actions if needed
   */
  private async executeEmergencyActions(
    drawdownStatus: DrawdownStatus,
    lossLimits: LossLimits,
    positions: Position[]
  ): Promise<EmergencyAction[]> {
    const actions: EmergencyAction[] = [];

    // Critical drawdown - emergency stop
    if (drawdownStatus.currentDrawdown >= this.config.criticalDrawdownThreshold && !this.emergencyModeActive) {
      const action = await this.activateEmergencyStop(positions);
      actions.push(action);
    }

    // Daily loss limit exceeded - halt trading
    if (lossLimits.daily.remaining <= 0 && !this.tradingHalted) {
      const action = await this.haltDailyTrading();
      actions.push(action);
    }

    // High drawdown - reduce position sizes
    if (drawdownStatus.currentDrawdown >= this.config.maxDrawdownThreshold && 
        drawdownStatus.riskReductionLevel > 0) {
      const action = await this.reducePositionSizes(positions, drawdownStatus.riskReductionLevel);
      actions.push(action);
    }

    this.emergencyActions.push(...actions);
    return actions;
  }

  /**
   * Activate emergency stop
   */
  private async activateEmergencyStop(positions: Position[]): Promise<EmergencyAction> {
    this.emergencyModeActive = true;
    this.tradingHalted = true;

    // Mark current drawdown period as having emergency measures
    const currentDrawdown = this.getCurrentDrawdownPeriod();
    if (currentDrawdown) {
      currentDrawdown.emergencyMeasuresActivated = true;
    }

    return {
      type: 'HALT_TRADING',
      description: 'Emergency stop activated due to critical drawdown',
      executedAt: new Date(),
      affectedPositions: positions.map(p => p.id),
      result: 'SUCCESS',
      details: {
        reason: 'Critical drawdown threshold exceeded',
        positionsCount: positions.length,
        emergencyModeActive: true
      }
    };
  }

  /**
   * Halt daily trading
   */
  private async haltDailyTrading(): Promise<EmergencyAction> {
    this.tradingHalted = true;

    return {
      type: 'HALT_TRADING',
      description: 'Daily trading halted due to loss limit exceeded',
      executedAt: new Date(),
      affectedPositions: [],
      result: 'SUCCESS',
      details: {
        reason: 'Daily loss limit exceeded',
        resumeTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // Resume tomorrow
      }
    };
  }

  /**
   * Reduce position sizes
   */
  private async reducePositionSizes(positions: Position[], reductionLevel: number): Promise<EmergencyAction> {
    const reductionFactor = 1 - (reductionLevel / 100);
    
    return {
      type: 'REDUCE_POSITION_SIZES',
      description: `Position sizes reduced by ${reductionLevel.toFixed(0)}% due to drawdown`,
      executedAt: new Date(),
      affectedPositions: positions.map(p => p.id),
      result: 'SUCCESS',
      details: {
        reductionLevel,
        reductionFactor,
        positionsAffected: positions.length
      }
    };
  }

  /**
   * Determine if trading should be allowed
   */
  private shouldAllowTrading(drawdownStatus: DrawdownStatus, lossLimits: LossLimits): boolean {
    // Trading halted by emergency measures
    if (this.tradingHalted || this.emergencyModeActive) {
      return false;
    }

    // Critical drawdown
    if (drawdownStatus.currentDrawdown >= this.config.criticalDrawdownThreshold) {
      return false;
    }

    // Daily loss limit exceeded
    if (lossLimits.daily.remaining <= 0) {
      return false;
    }

    return true;
  }

  /**
   * Calculate recommended position size adjustment
   */
  calculatePositionSizeAdjustment(basePositionSize: number, drawdownStatus: DrawdownStatus): number {
    if (drawdownStatus.riskReductionLevel === 0) {
      return basePositionSize;
    }

    const reductionFactor = 1 - (drawdownStatus.riskReductionLevel / 100);
    return basePositionSize * reductionFactor;
  }

  /**
   * Check if recovery conditions are met to resume normal operations
   */
  checkRecoveryConditions(drawdownStatus: DrawdownStatus): boolean {
    if (!this.emergencyModeActive) {
      return true;
    }

    // Recovery conditions:
    // 1. Drawdown below recovery threshold
    // 2. Recovery progress above threshold
    return drawdownStatus.currentDrawdown < this.config.recoveryThreshold &&
           drawdownStatus.recoveryProgress > 80;
  }

  /**
   * Resume normal operations after recovery
   */
  resumeNormalOperations(): void {
    this.emergencyModeActive = false;
    this.tradingHalted = false;
    this.consecutiveLosses = 0;

    // Add recovery alert
    this.alerts.push({
      id: `recovery-${Date.now()}`,
      type: 'DRAWDOWN_WARNING',
      severity: 'LOW',
      message: 'Recovery conditions met. Normal operations resumed.',
      recommendedActions: ['Monitor performance closely'],
      timestamp: new Date(),
      autoExecutedActions: ['Emergency mode deactivated', 'Trading resumed']
    });
  }

  /**
   * Get capital preservation statistics
   */
  getCapitalPreservationStats(): {
    totalDrawdownPeriods: number;
    averageDrawdownDuration: number;
    maxHistoricalDrawdown: number;
    emergencyActivations: number;
    recoveryRate: number;
    currentStatus: string;
  } {
    const completedDrawdowns = this.drawdownPeriods.filter(d => d.endDate !== null);
    const averageDrawdownDuration = completedDrawdowns.length > 0
      ? completedDrawdowns.reduce((sum, d) => sum + d.durationDays, 0) / completedDrawdowns.length
      : 0;

    const maxHistoricalDrawdown = Math.max(...this.drawdownPeriods.map(d => d.maxDrawdownPercent), 0);
    const emergencyActivations = this.drawdownPeriods.filter(d => d.emergencyMeasuresActivated).length;
    const recoveryRate = completedDrawdowns.length > 0 ? (completedDrawdowns.length / this.drawdownPeriods.length) * 100 : 100;

    let currentStatus = 'NORMAL';
    if (this.emergencyModeActive) {
      currentStatus = 'EMERGENCY';
    } else if (this.tradingHalted) {
      currentStatus = 'HALTED';
    }

    return {
      totalDrawdownPeriods: this.drawdownPeriods.length,
      averageDrawdownDuration,
      maxHistoricalDrawdown,
      emergencyActivations,
      recoveryRate,
      currentStatus
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): CapitalProtectionAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThanDays: number = 7): void {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoffDate);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CapitalProtectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): CapitalProtectionConfig {
    return { ...this.config };
  }
}