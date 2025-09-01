/**
 * Trailing Stop Loss Manager
 * 
 * Implements sophisticated trailing stop loss system with:
 * - -1% initial stop loss with trailing functionality
 * - Dynamic trailing stop adjustment based on volatility
 * - Breakeven stop loss automation
 * - Stop loss optimization based on market conditions
 */

import { 
  TrailingStopConfig, 
  TrailingStopResult, 
  Position 
} from './types.js';

export interface MarketConditions {
  /** Current volatility level */
  volatility: number;
  /** Market trend direction */
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  /** Support/resistance levels */
  supportLevel?: number;
  resistanceLevel?: number;
  /** Average true range for volatility measurement */
  atr: number;
}

export interface TrailingStopUpdate {
  /** Position ID */
  positionId: string;
  /** Previous stop loss */
  previousStopLoss: number;
  /** New stop loss */
  newStopLoss: number;
  /** Update reason */
  reason: string;
  /** Timestamp */
  timestamp: Date;
}

export class TrailingStopManager {
  private trailingStopUpdates: Map<string, TrailingStopUpdate[]> = new Map();

  /**
   * Update trailing stop loss for a position
   */
  updateTrailingStop(
    position: Position,
    config: TrailingStopConfig,
    marketConditions: MarketConditions
  ): TrailingStopResult {
    const currentPrice = position.currentPrice;
    const entryPrice = position.entryPrice;
    const currentStopLoss = position.stopLoss;

    // Calculate profit percentage
    const profitPercentage = this.calculateProfitPercentage(position);

    // Check if we should start trailing
    if (profitPercentage < config.minProfitToTrail) {
      return {
        newStopLoss: currentStopLoss,
        updated: false,
        trailingDistance: config.trailingDistance,
        breakevenActive: false,
        reason: `Profit ${profitPercentage.toFixed(2)}% below minimum ${config.minProfitToTrail}% to start trailing`
      };
    }

    // Calculate new trailing stop loss
    let newStopLoss = this.calculateTrailingStopLoss(
      position,
      config,
      marketConditions
    );

    // Apply breakeven logic
    const breakevenResult = this.applyBreakevenLogic(
      position,
      newStopLoss,
      config,
      profitPercentage
    );

    newStopLoss = breakevenResult.stopLoss;

    // Ensure stop loss only moves in favorable direction
    const shouldUpdate = this.shouldUpdateStopLoss(
      position,
      currentStopLoss,
      newStopLoss
    );

    if (shouldUpdate) {
      // Record the update
      this.recordStopLossUpdate(position.id, currentStopLoss, newStopLoss, breakevenResult.reason);

      return {
        newStopLoss,
        updated: true,
        trailingDistance: this.calculateActualTrailingDistance(currentPrice, newStopLoss),
        breakevenActive: breakevenResult.breakevenActive,
        reason: breakevenResult.reason
      };
    }

    return {
      newStopLoss: currentStopLoss,
      updated: false,
      trailingDistance: config.trailingDistance,
      breakevenActive: breakevenResult.breakevenActive,
      reason: 'Stop loss would move in unfavorable direction'
    };
  }

  /**
   * Calculate trailing stop loss based on market conditions
   */
  private calculateTrailingStopLoss(
    position: Position,
    config: TrailingStopConfig,
    marketConditions: MarketConditions
  ): number {
    const currentPrice = position.currentPrice;
    let trailingDistance = config.trailingDistance;

    // Adjust trailing distance based on volatility
    if (config.volatilityAdjustment) {
      trailingDistance = this.adjustTrailingDistanceForVolatility(
        trailingDistance,
        marketConditions.volatility,
        marketConditions.atr
      );
    }

    // Calculate base trailing stop
    let trailingStop: number;
    
    if (position.type === 'LONG') {
      trailingStop = currentPrice * (1 - trailingDistance / 100);
      
      // Consider support levels for long positions
      if (marketConditions.supportLevel && marketConditions.supportLevel > trailingStop) {
        trailingStop = Math.max(trailingStop, marketConditions.supportLevel * 0.995); // 0.5% below support
      }
    } else {
      trailingStop = currentPrice * (1 + trailingDistance / 100);
      
      // Consider resistance levels for short positions
      if (marketConditions.resistanceLevel && marketConditions.resistanceLevel < trailingStop) {
        trailingStop = Math.min(trailingStop, marketConditions.resistanceLevel * 1.005); // 0.5% above resistance
      }
    }

    return trailingStop;
  }

  /**
   * Adjust trailing distance based on market volatility
   */
  private adjustTrailingDistanceForVolatility(
    baseDistance: number,
    volatility: number,
    atr: number
  ): number {
    // Increase trailing distance in high volatility to avoid premature stops
    const volatilityMultiplier = 1 + (volatility * 0.5);
    
    // Use ATR to determine minimum trailing distance
    const atrBasedDistance = (atr / 100) * 2; // 2x ATR as minimum distance
    
    const adjustedDistance = Math.max(
      baseDistance * volatilityMultiplier,
      atrBasedDistance
    );

    // Cap maximum trailing distance at 5%
    return Math.min(adjustedDistance, 5.0);
  }

  /**
   * Apply breakeven stop loss logic
   */
  private applyBreakevenLogic(
    position: Position,
    calculatedStopLoss: number,
    config: TrailingStopConfig,
    profitPercentage: number
  ): { stopLoss: number; breakevenActive: boolean; reason: string } {
    const entryPrice = position.entryPrice;

    // Check if we should move to breakeven
    if (profitPercentage >= config.breakevenThreshold) {
      let breakevenStop: number;
      
      if (position.type === 'LONG') {
        // For long positions, breakeven is slightly above entry
        breakevenStop = entryPrice * 1.001; // 0.1% above entry to cover fees
        
        // Use the higher of calculated trailing stop or breakeven
        const finalStop = Math.max(calculatedStopLoss, breakevenStop);
        
        return {
          stopLoss: finalStop,
          breakevenActive: true,
          reason: finalStop === breakevenStop 
            ? `Breakeven stop activated at ${profitPercentage.toFixed(2)}% profit`
            : `Trailing stop above breakeven at ${profitPercentage.toFixed(2)}% profit`
        };
      } else {
        // For short positions, breakeven is slightly below entry
        breakevenStop = entryPrice * 0.999; // 0.1% below entry to cover fees
        
        // Use the lower of calculated trailing stop or breakeven
        const finalStop = Math.min(calculatedStopLoss, breakevenStop);
        
        return {
          stopLoss: finalStop,
          breakevenActive: true,
          reason: finalStop === breakevenStop 
            ? `Breakeven stop activated at ${profitPercentage.toFixed(2)}% profit`
            : `Trailing stop below breakeven at ${profitPercentage.toFixed(2)}% profit`
        };
      }
    }

    return {
      stopLoss: calculatedStopLoss,
      breakevenActive: false,
      reason: `Trailing stop updated, ${profitPercentage.toFixed(2)}% profit`
    };
  }

  /**
   * Calculate current profit percentage
   */
  private calculateProfitPercentage(position: Position): number {
    const entryPrice = position.entryPrice;
    const currentPrice = position.currentPrice;

    if (position.type === 'LONG') {
      return ((currentPrice - entryPrice) / entryPrice) * 100;
    } else {
      return ((entryPrice - currentPrice) / entryPrice) * 100;
    }
  }

  /**
   * Determine if stop loss should be updated
   */
  private shouldUpdateStopLoss(
    position: Position,
    currentStopLoss: number,
    newStopLoss: number
  ): boolean {
    if (position.type === 'LONG') {
      // For long positions, only move stop loss up
      return newStopLoss > currentStopLoss;
    } else {
      // For short positions, only move stop loss down
      return newStopLoss < currentStopLoss;
    }
  }

  /**
   * Calculate actual trailing distance percentage
   */
  private calculateActualTrailingDistance(currentPrice: number, stopLoss: number): number {
    return Math.abs((currentPrice - stopLoss) / currentPrice) * 100;
  }

  /**
   * Record stop loss update for audit trail
   */
  private recordStopLossUpdate(
    positionId: string,
    previousStopLoss: number,
    newStopLoss: number,
    reason: string
  ): void {
    const update: TrailingStopUpdate = {
      positionId,
      previousStopLoss,
      newStopLoss,
      reason,
      timestamp: new Date()
    };

    if (!this.trailingStopUpdates.has(positionId)) {
      this.trailingStopUpdates.set(positionId, []);
    }

    this.trailingStopUpdates.get(positionId)!.push(update);

    // Keep only last 100 updates per position
    const updates = this.trailingStopUpdates.get(positionId)!;
    if (updates.length > 100) {
      updates.splice(0, updates.length - 100);
    }
  }

  /**
   * Get trailing stop update history for a position
   */
  getTrailingStopHistory(positionId: string): TrailingStopUpdate[] {
    return this.trailingStopUpdates.get(positionId) || [];
  }

  /**
   * Calculate optimal initial stop loss
   */
  calculateInitialStopLoss(
    entryPrice: number,
    positionType: 'LONG' | 'SHORT',
    config: TrailingStopConfig,
    marketConditions: MarketConditions
  ): number {
    let initialStopDistance = config.initialStopLoss;

    // Adjust for volatility
    if (config.volatilityAdjustment) {
      const volatilityAdjustment = marketConditions.volatility * 0.5;
      initialStopDistance = Math.max(
        initialStopDistance,
        initialStopDistance * (1 + volatilityAdjustment)
      );
    }

    // Use ATR for minimum stop distance
    const atrBasedStop = (marketConditions.atr / entryPrice) * 100 * 1.5; // 1.5x ATR
    initialStopDistance = Math.max(initialStopDistance, atrBasedStop);

    if (positionType === 'LONG') {
      return entryPrice * (1 - initialStopDistance / 100);
    } else {
      return entryPrice * (1 + initialStopDistance / 100);
    }
  }

  /**
   * Optimize stop loss based on current market conditions
   */
  optimizeStopLoss(
    position: Position,
    config: TrailingStopConfig,
    marketConditions: MarketConditions
  ): { optimizedStopLoss: number; reason: string } {
    const currentStopLoss = position.stopLoss;
    const currentPrice = position.currentPrice;

    // Check if current stop is too tight in high volatility
    if (marketConditions.volatility > 0.5) {
      const minDistance = (marketConditions.atr / currentPrice) * 100 * 2;
      const currentDistance = this.calculateActualTrailingDistance(currentPrice, currentStopLoss);

      if (currentDistance < minDistance) {
        const optimizedStop = position.type === 'LONG'
          ? currentPrice * (1 - minDistance / 100)
          : currentPrice * (1 + minDistance / 100);

        return {
          optimizedStopLoss: optimizedStop,
          reason: `Stop loss widened due to high volatility (${(marketConditions.volatility * 100).toFixed(1)}%)`
        };
      }
    }

    // Check for support/resistance optimization
    if (position.type === 'LONG' && marketConditions.supportLevel) {
      const supportBasedStop = marketConditions.supportLevel * 0.995;
      if (supportBasedStop > currentStopLoss) {
        return {
          optimizedStopLoss: supportBasedStop,
          reason: `Stop loss moved to support level at ${marketConditions.supportLevel}`
        };
      }
    }

    if (position.type === 'SHORT' && marketConditions.resistanceLevel) {
      const resistanceBasedStop = marketConditions.resistanceLevel * 1.005;
      if (resistanceBasedStop < currentStopLoss) {
        return {
          optimizedStopLoss: resistanceBasedStop,
          reason: `Stop loss moved to resistance level at ${marketConditions.resistanceLevel}`
        };
      }
    }

    return {
      optimizedStopLoss: currentStopLoss,
      reason: 'Current stop loss is optimal for market conditions'
    };
  }

  /**
   * Clear trailing stop history for a position
   */
  clearTrailingStopHistory(positionId: string): void {
    this.trailingStopUpdates.delete(positionId);
  }

  /**
   * Get statistics for trailing stop performance
   */
  getTrailingStopStatistics(positionId: string): {
    totalUpdates: number;
    averageTrailingDistance: number;
    maxTrailingDistance: number;
    minTrailingDistance: number;
    breakevenActivations: number;
  } {
    const updates = this.getTrailingStopHistory(positionId);
    
    if (updates.length === 0) {
      return {
        totalUpdates: 0,
        averageTrailingDistance: 0,
        maxTrailingDistance: 0,
        minTrailingDistance: 0,
        breakevenActivations: 0
      };
    }

    const distances = updates.map(update => 
      Math.abs((update.newStopLoss - update.previousStopLoss) / update.previousStopLoss) * 100
    );

    const breakevenActivations = updates.filter(update => 
      update.reason.includes('Breakeven')
    ).length;

    return {
      totalUpdates: updates.length,
      averageTrailingDistance: distances.reduce((sum, d) => sum + d, 0) / distances.length,
      maxTrailingDistance: Math.max(...distances),
      minTrailingDistance: Math.min(...distances),
      breakevenActivations
    };
  }
}