/**
 * Risk-Reward Ratio Enforcer
 * 
 * Implements sophisticated risk-reward ratio enforcement with:
 * - Minimum 1.3:1 risk-reward ratio validation
 * - Dynamic RR adjustment based on market conditions
 * - Trade rejection for insufficient risk-reward
 * - RR optimization recommendations
 */

import { MarketConditions } from './trailing-stop-manager.js';

export interface TradeProposal {
  /** Trading symbol */
  symbol: string;
  /** Position type */
  type: 'LONG' | 'SHORT';
  /** Entry price */
  entryPrice: number;
  /** Stop loss price */
  stopLossPrice: number;
  /** Take profit price */
  takeProfitPrice: number;
  /** Position size */
  positionSize: number;
  /** Signal confidence (0-100) */
  confidence: number;
  /** Strategy that generated the signal */
  strategy: string;
}

export interface RiskRewardAnalysis {
  /** Calculated risk-reward ratio */
  riskRewardRatio: number;
  /** Risk amount in currency */
  riskAmount: number;
  /** Reward amount in currency */
  rewardAmount: number;
  /** Risk percentage of position value */
  riskPercentage: number;
  /** Reward percentage of position value */
  rewardPercentage: number;
  /** Whether trade meets minimum RR requirements */
  meetsMinimumRR: boolean;
  /** Approval status */
  approved: boolean;
  /** Rejection reasons */
  rejectionReasons: string[];
  /** Optimization recommendations */
  optimizationRecommendations: RROptimization[];
}

export interface RROptimization {
  /** Type of optimization */
  type: 'ADJUST_STOP_LOSS' | 'ADJUST_TAKE_PROFIT' | 'REDUCE_POSITION_SIZE' | 'WAIT_FOR_BETTER_ENTRY';
  /** Current value */
  currentValue: number;
  /** Recommended value */
  recommendedValue: number;
  /** Expected improvement in RR ratio */
  rrImprovement: number;
  /** Description of the optimization */
  description: string;
  /** Priority level */
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RREnforcementConfig {
  /** Minimum risk-reward ratio */
  minRiskRewardRatio: number;
  /** Preferred risk-reward ratio */
  preferredRiskRewardRatio: number;
  /** Maximum acceptable risk percentage */
  maxRiskPercentage: number;
  /** Enable dynamic RR adjustment */
  enableDynamicAdjustment: boolean;
  /** Market condition adjustment factors */
  marketConditionAdjustments: {
    bullish: number;
    bearish: number;
    sideways: number;
    highVolatility: number;
    lowVolatility: number;
  };
}

export interface RRPerformanceMetrics {
  /** Average risk-reward ratio of executed trades */
  averageRR: number;
  /** Percentage of trades meeting minimum RR */
  rrComplianceRate: number;
  /** Number of trades rejected for poor RR */
  rejectedTradesCount: number;
  /** Total trades analyzed */
  totalTradesAnalyzed: number;
  /** Best RR ratio achieved */
  bestRR: number;
  /** Worst RR ratio executed */
  worstRR: number;
  /** RR distribution by strategy */
  rrByStrategy: Map<string, number>;
}

export class RiskRewardEnforcer {
  private config: RREnforcementConfig;
  private performanceMetrics: RRPerformanceMetrics;
  private tradeHistory: RiskRewardAnalysis[] = [];

  constructor(config: RREnforcementConfig) {
    this.config = config;
    this.performanceMetrics = {
      averageRR: 0,
      rrComplianceRate: 0,
      rejectedTradesCount: 0,
      totalTradesAnalyzed: 0,
      bestRR: 0,
      worstRR: Infinity,
      rrByStrategy: new Map()
    };
  }

  /**
   * Analyze and enforce risk-reward ratio for a trade proposal
   */
  analyzeRiskReward(
    proposal: TradeProposal,
    marketConditions: MarketConditions
  ): RiskRewardAnalysis {
    // Calculate base risk-reward metrics
    const baseAnalysis = this.calculateBaseRiskReward(proposal);

    // Apply dynamic adjustments based on market conditions
    const adjustedAnalysis = this.applyDynamicAdjustments(baseAnalysis, proposal, marketConditions);

    // Generate optimization recommendations
    const optimizations = this.generateOptimizationRecommendations(proposal, adjustedAnalysis, marketConditions);

    // Final validation
    const finalAnalysis: RiskRewardAnalysis = {
      ...adjustedAnalysis,
      optimizationRecommendations: optimizations,
      approved: this.validateTradeApproval(adjustedAnalysis, proposal),
      rejectionReasons: this.generateRejectionReasons(adjustedAnalysis, proposal)
    };

    // Update performance metrics
    this.updatePerformanceMetrics(finalAnalysis, proposal);

    // Store in history
    this.tradeHistory.push(finalAnalysis);

    return finalAnalysis;
  }

  /**
   * Calculate base risk-reward metrics
   */
  private calculateBaseRiskReward(proposal: TradeProposal): Omit<RiskRewardAnalysis, 'optimizationRecommendations' | 'approved' | 'rejectionReasons'> {
    const { entryPrice, stopLossPrice, takeProfitPrice, positionSize } = proposal;

    // Calculate risk and reward amounts
    const riskAmount = Math.abs(entryPrice - stopLossPrice) * positionSize;
    const rewardAmount = Math.abs(takeProfitPrice - entryPrice) * positionSize;

    // Calculate percentages
    const riskPercentage = Math.abs((entryPrice - stopLossPrice) / entryPrice) * 100;
    const rewardPercentage = Math.abs((takeProfitPrice - entryPrice) / entryPrice) * 100;

    // Calculate risk-reward ratio
    const riskRewardRatio = riskAmount > 0 ? rewardAmount / riskAmount : 0;

    // Check if meets minimum requirements
    const meetsMinimumRR = riskRewardRatio >= this.config.minRiskRewardRatio;

    return {
      riskRewardRatio,
      riskAmount,
      rewardAmount,
      riskPercentage,
      rewardPercentage,
      meetsMinimumRR
    };
  }

  /**
   * Apply dynamic adjustments based on market conditions
   */
  private applyDynamicAdjustments(
    baseAnalysis: Omit<RiskRewardAnalysis, 'optimizationRecommendations' | 'approved' | 'rejectionReasons'>,
    proposal: TradeProposal,
    marketConditions: MarketConditions
  ): Omit<RiskRewardAnalysis, 'optimizationRecommendations' | 'approved' | 'rejectionReasons'> {
    if (!this.config.enableDynamicAdjustment) {
      return baseAnalysis;
    }

    let adjustmentFactor = 1.0;

    // Adjust based on market trend
    switch (marketConditions.trend) {
      case 'BULLISH':
        adjustmentFactor *= this.config.marketConditionAdjustments.bullish;
        break;
      case 'BEARISH':
        adjustmentFactor *= this.config.marketConditionAdjustments.bearish;
        break;
      case 'SIDEWAYS':
        adjustmentFactor *= this.config.marketConditionAdjustments.sideways;
        break;
    }

    // Adjust based on volatility
    if (marketConditions.volatility > 0.5) {
      adjustmentFactor *= this.config.marketConditionAdjustments.highVolatility;
    } else if (marketConditions.volatility < 0.2) {
      adjustmentFactor *= this.config.marketConditionAdjustments.lowVolatility;
    }

    // Adjust based on signal confidence
    const confidenceAdjustment = 0.8 + (proposal.confidence / 100) * 0.4; // 0.8 to 1.2 range
    adjustmentFactor *= confidenceAdjustment;

    // Apply adjustment to minimum RR requirement
    const adjustedMinRR = this.config.minRiskRewardRatio * adjustmentFactor;

    return {
      ...baseAnalysis,
      meetsMinimumRR: baseAnalysis.riskRewardRatio >= adjustedMinRR
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    proposal: TradeProposal,
    analysis: Omit<RiskRewardAnalysis, 'optimizationRecommendations' | 'approved' | 'rejectionReasons'>,
    marketConditions: MarketConditions
  ): RROptimization[] {
    const recommendations: RROptimization[] = [];

    // If RR is below minimum, suggest improvements
    if (!analysis.meetsMinimumRR) {
      // Suggest tightening stop loss
      const tighterStopLoss = this.calculateOptimalStopLoss(proposal, marketConditions);
      if (tighterStopLoss !== proposal.stopLossPrice) {
        const newRisk = Math.abs(proposal.entryPrice - tighterStopLoss) * proposal.positionSize;
        const newRR = analysis.rewardAmount / newRisk;

        recommendations.push({
          type: 'ADJUST_STOP_LOSS',
          currentValue: proposal.stopLossPrice,
          recommendedValue: tighterStopLoss,
          rrImprovement: newRR - analysis.riskRewardRatio,
          description: `Tighten stop loss to ${tighterStopLoss.toFixed(2)} to improve RR ratio`,
          priority: 'HIGH'
        });
      }

      // Suggest extending take profit
      const extendedTakeProfit = this.calculateOptimalTakeProfit(proposal, marketConditions);
      if (extendedTakeProfit !== proposal.takeProfitPrice) {
        const newReward = Math.abs(extendedTakeProfit - proposal.entryPrice) * proposal.positionSize;
        const newRR = newReward / analysis.riskAmount;

        recommendations.push({
          type: 'ADJUST_TAKE_PROFIT',
          currentValue: proposal.takeProfitPrice,
          recommendedValue: extendedTakeProfit,
          rrImprovement: newRR - analysis.riskRewardRatio,
          description: `Extend take profit to ${extendedTakeProfit.toFixed(2)} to improve RR ratio`,
          priority: 'MEDIUM'
        });
      }

      // Suggest waiting for better entry
      const betterEntry = this.calculateBetterEntryPrice(proposal, marketConditions);
      if (betterEntry !== proposal.entryPrice) {
        const newRisk = Math.abs(betterEntry - proposal.stopLossPrice) * proposal.positionSize;
        const newReward = Math.abs(proposal.takeProfitPrice - betterEntry) * proposal.positionSize;
        const newRR = newReward / newRisk;

        recommendations.push({
          type: 'WAIT_FOR_BETTER_ENTRY',
          currentValue: proposal.entryPrice,
          recommendedValue: betterEntry,
          rrImprovement: newRR - analysis.riskRewardRatio,
          description: `Wait for better entry at ${betterEntry.toFixed(2)} to improve RR ratio`,
          priority: 'LOW'
        });
      }
    }

    // If RR is acceptable but could be better
    if (analysis.riskRewardRatio < this.config.preferredRiskRewardRatio) {
      recommendations.push({
        type: 'REDUCE_POSITION_SIZE',
        currentValue: proposal.positionSize,
        recommendedValue: proposal.positionSize * 0.8,
        rrImprovement: 0,
        description: 'Consider reducing position size to maintain capital preservation',
        priority: 'LOW'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate optimal stop loss based on market conditions
   */
  private calculateOptimalStopLoss(proposal: TradeProposal, marketConditions: MarketConditions): number {
    const { entryPrice, type } = proposal;
    
    // Use ATR to determine optimal stop distance
    const atrBasedDistance = (marketConditions.atr / entryPrice) * 100;
    const minStopDistance = Math.max(0.5, atrBasedDistance * 1.5); // 1.5x ATR minimum

    if (type === 'LONG') {
      const optimalStop = entryPrice * (1 - minStopDistance / 100);
      
      // Consider support levels
      if (marketConditions.supportLevel && marketConditions.supportLevel < entryPrice) {
        return Math.max(optimalStop, marketConditions.supportLevel * 0.995);
      }
      
      return optimalStop;
    } else {
      const optimalStop = entryPrice * (1 + minStopDistance / 100);
      
      // Consider resistance levels
      if (marketConditions.resistanceLevel && marketConditions.resistanceLevel > entryPrice) {
        return Math.min(optimalStop, marketConditions.resistanceLevel * 1.005);
      }
      
      return optimalStop;
    }
  }

  /**
   * Calculate optimal take profit based on market conditions
   */
  private calculateOptimalTakeProfit(proposal: TradeProposal, marketConditions: MarketConditions): number {
    const { entryPrice, stopLossPrice, type } = proposal;
    
    const riskDistance = Math.abs(entryPrice - stopLossPrice);
    const targetRR = this.config.preferredRiskRewardRatio;
    
    if (type === 'LONG') {
      const optimalTarget = entryPrice + (riskDistance * targetRR);
      
      // Consider resistance levels as potential targets
      if (marketConditions.resistanceLevel && marketConditions.resistanceLevel > entryPrice) {
        return Math.min(optimalTarget, marketConditions.resistanceLevel * 0.995);
      }
      
      return optimalTarget;
    } else {
      const optimalTarget = entryPrice - (riskDistance * targetRR);
      
      // Consider support levels as potential targets
      if (marketConditions.supportLevel && marketConditions.supportLevel < entryPrice) {
        return Math.max(optimalTarget, marketConditions.supportLevel * 1.005);
      }
      
      return optimalTarget;
    }
  }

  /**
   * Calculate better entry price for improved RR
   */
  private calculateBetterEntryPrice(proposal: TradeProposal, marketConditions: MarketConditions): number {
    const { entryPrice, stopLossPrice, takeProfitPrice, type } = proposal;
    
    // Calculate what entry price would give us the preferred RR
    const currentReward = Math.abs(takeProfitPrice - entryPrice);
    const currentRisk = Math.abs(entryPrice - stopLossPrice);
    
    if (type === 'LONG') {
      // For long positions, lower entry improves RR
      const targetRisk = currentReward / this.config.preferredRiskRewardRatio;
      return stopLossPrice + targetRisk;
    } else {
      // For short positions, higher entry improves RR
      const targetRisk = currentReward / this.config.preferredRiskRewardRatio;
      return stopLossPrice - targetRisk;
    }
  }

  /**
   * Validate if trade should be approved
   */
  private validateTradeApproval(
    analysis: Omit<RiskRewardAnalysis, 'optimizationRecommendations' | 'approved' | 'rejectionReasons'>,
    proposal: TradeProposal
  ): boolean {
    // Must meet minimum RR ratio
    if (!analysis.meetsMinimumRR) {
      return false;
    }

    // Must not exceed maximum risk percentage
    if (analysis.riskPercentage > this.config.maxRiskPercentage) {
      return false;
    }

    // Additional validation based on confidence
    if (proposal.confidence < 50 && analysis.riskRewardRatio < this.config.preferredRiskRewardRatio) {
      return false;
    }

    return true;
  }

  /**
   * Generate rejection reasons
   */
  private generateRejectionReasons(
    analysis: Omit<RiskRewardAnalysis, 'optimizationRecommendations' | 'approved' | 'rejectionReasons'>,
    proposal: TradeProposal
  ): string[] {
    const reasons: string[] = [];

    if (!analysis.meetsMinimumRR) {
      reasons.push(`Risk-reward ratio ${analysis.riskRewardRatio.toFixed(2)} below minimum ${this.config.minRiskRewardRatio}`);
    }

    if (analysis.riskPercentage > this.config.maxRiskPercentage) {
      reasons.push(`Risk percentage ${analysis.riskPercentage.toFixed(2)}% exceeds maximum ${this.config.maxRiskPercentage}%`);
    }

    if (proposal.confidence < 50 && analysis.riskRewardRatio < this.config.preferredRiskRewardRatio) {
      reasons.push(`Low confidence ${proposal.confidence}% with suboptimal RR ratio ${analysis.riskRewardRatio.toFixed(2)}`);
    }

    return reasons;
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(analysis: RiskRewardAnalysis, proposal: TradeProposal): void {
    this.performanceMetrics.totalTradesAnalyzed++;

    if (analysis.approved) {
      // Update average RR
      const currentSum = this.performanceMetrics.averageRR * (this.performanceMetrics.totalTradesAnalyzed - this.performanceMetrics.rejectedTradesCount - 1);
      const executedTrades = this.performanceMetrics.totalTradesAnalyzed - this.performanceMetrics.rejectedTradesCount;
      this.performanceMetrics.averageRR = (currentSum + analysis.riskRewardRatio) / executedTrades;

      // Update best/worst RR
      this.performanceMetrics.bestRR = Math.max(this.performanceMetrics.bestRR, analysis.riskRewardRatio);
      this.performanceMetrics.worstRR = Math.min(this.performanceMetrics.worstRR, analysis.riskRewardRatio);

      // Update strategy-specific RR
      const strategyRR = this.performanceMetrics.rrByStrategy.get(proposal.strategy) || 0;
      this.performanceMetrics.rrByStrategy.set(proposal.strategy, 
        (strategyRR + analysis.riskRewardRatio) / 2
      );
    } else {
      this.performanceMetrics.rejectedTradesCount++;
    }

    // Update compliance rate
    const approvedTrades = this.performanceMetrics.totalTradesAnalyzed - this.performanceMetrics.rejectedTradesCount;
    this.performanceMetrics.rrComplianceRate = (approvedTrades / this.performanceMetrics.totalTradesAnalyzed) * 100;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): RRPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get trade history
   */
  getTradeHistory(limit?: number): RiskRewardAnalysis[] {
    if (limit) {
      return this.tradeHistory.slice(-limit);
    }
    return [...this.tradeHistory];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RREnforcementConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): RREnforcementConfig {
    return { ...this.config };
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      averageRR: 0,
      rrComplianceRate: 0,
      rejectedTradesCount: 0,
      totalTradesAnalyzed: 0,
      bestRR: 0,
      worstRR: Infinity,
      rrByStrategy: new Map()
    };
    this.tradeHistory = [];
  }

  /**
   * Generate RR performance report
   */
  generatePerformanceReport(): {
    summary: RRPerformanceMetrics;
    topStrategies: Array<{ strategy: string; avgRR: number }>;
    recentTrends: Array<{ period: string; avgRR: number; approvalRate: number }>;
  } {
    const topStrategies = Array.from(this.performanceMetrics.rrByStrategy.entries())
      .map(([strategy, avgRR]) => ({ strategy, avgRR }))
      .sort((a, b) => b.avgRR - a.avgRR)
      .slice(0, 5);

    // Calculate recent trends (last 10, 20, 50 trades)
    const recentTrends = [10, 20, 50].map(period => {
      const recentTrades = this.tradeHistory.slice(-period);
      const approvedTrades = recentTrades.filter(t => t.approved);
      const avgRR = approvedTrades.length > 0 
        ? approvedTrades.reduce((sum, t) => sum + t.riskRewardRatio, 0) / approvedTrades.length
        : 0;
      const approvalRate = recentTrades.length > 0 
        ? (approvedTrades.length / recentTrades.length) * 100
        : 0;

      return {
        period: `Last ${period} trades`,
        avgRR,
        approvalRate
      };
    });

    return {
      summary: this.getPerformanceMetrics(),
      topStrategies,
      recentTrends
    };
  }
}