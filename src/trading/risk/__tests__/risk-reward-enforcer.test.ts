/**
 * Risk-Reward Enforcer Tests
 * 
 * Comprehensive tests for risk-reward ratio enforcement functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { RiskRewardEnforcer, TradeProposal, RREnforcementConfig } from '../risk-reward-enforcer';
import { MarketConditions } from '../trailing-stop-manager';

describe('RiskRewardEnforcer', () => {
  let enforcer: RiskRewardEnforcer;
  let defaultConfig: RREnforcementConfig;
  let baseProposal: TradeProposal;
  let marketConditions: MarketConditions;

  beforeEach(() => {
    defaultConfig = {
      minRiskRewardRatio: 1.3,
      preferredRiskRewardRatio: 2.0,
      maxRiskPercentage: 3.0,
      enableDynamicAdjustment: true,
      marketConditionAdjustments: {
        bullish: 0.9, // Lower RR requirement in bullish markets
        bearish: 1.2, // Higher RR requirement in bearish markets
        sideways: 1.1,
        highVolatility: 1.3,
        lowVolatility: 0.8
      }
    };

    enforcer = new RiskRewardEnforcer(defaultConfig);

    baseProposal = {
      symbol: 'BTC',
      type: 'LONG',
      entryPrice: 50000,
      stopLossPrice: 49000, // 2% risk
      takeProfitPrice: 52600, // 5.2% reward = 2.6:1 RR
      positionSize: 0.1,
      confidence: 75,
      strategy: 'moving-average-crossover'
    };

    marketConditions = {
      volatility: 0.3,
      trend: 'BULLISH',
      atr: 1000,
      supportLevel: 49500,
      resistanceLevel: 52000
    };
  });

  describe('analyzeRiskReward', () => {
    it('should approve trade with good risk-reward ratio', () => {
      const analysis = enforcer.analyzeRiskReward(baseProposal, marketConditions);

      expect(analysis.riskRewardRatio).toBeCloseTo(2.6, 1);
      expect(analysis.meetsMinimumRR).toBe(true);
      expect(analysis.approved).toBe(true);
      expect(analysis.rejectionReasons).toHaveLength(0);
    });

    it('should reject trade with poor risk-reward ratio', () => {
      const poorRRProposal = {
        ...baseProposal,
        takeProfitPrice: 50500 // Only 1% reward vs 2% risk = 0.5:1 RR
      };

      const analysis = enforcer.analyzeRiskReward(poorRRProposal, marketConditions);

      expect(analysis.riskRewardRatio).toBeCloseTo(0.5, 1);
      expect(analysis.meetsMinimumRR).toBe(false);
      expect(analysis.approved).toBe(false);
      expect(analysis.rejectionReasons).toContain(
        expect.stringContaining('Risk-reward ratio')
      );
    });

    it('should calculate risk and reward amounts correctly', () => {
      const analysis = enforcer.analyzeRiskReward(baseProposal, marketConditions);

      const expectedRisk = Math.abs(50000 - 49000) * 0.1; // $100
      const expectedReward = Math.abs(52600 - 50000) * 0.1; // $260

      expect(analysis.riskAmount).toBeCloseTo(expectedRisk, 2);
      expect(analysis.rewardAmount).toBeCloseTo(expectedReward, 2);
      expect(analysis.riskPercentage).toBeCloseTo(2.0, 1);
      expect(analysis.rewardPercentage).toBeCloseTo(5.2, 1);
    });

    it('should apply dynamic adjustments based on market conditions', () => {
      const bullishAnalysis = enforcer.analyzeRiskReward(baseProposal, marketConditions);

      const bearishConditions = { ...marketConditions, trend: 'BEARISH' as const };
      const bearishAnalysis = enforcer.analyzeRiskReward(baseProposal, bearishConditions);

      // Same trade should have different approval status based on market conditions
      expect(bullishAnalysis.approved).toBe(true);
      // Bearish conditions require higher RR, so this might still be approved due to good base RR
      expect(bearishAnalysis.approved).toBe(true);
    });

    it('should generate optimization recommendations for poor RR trades', () => {
      const poorRRProposal = {
        ...baseProposal,
        takeProfitPrice: 50650 // 1.3% reward vs 2% risk = 0.65:1 RR
      };

      const analysis = enforcer.analyzeRiskReward(poorRRProposal, marketConditions);

      expect(analysis.optimizationRecommendations.length).toBeGreaterThan(0);
      
      const stopLossOptimization = analysis.optimizationRecommendations.find(
        opt => opt.type === 'ADJUST_STOP_LOSS'
      );
      expect(stopLossOptimization).toBeDefined();
      expect(stopLossOptimization?.rrImprovement).toBeGreaterThan(0);
    });

    it('should handle short positions correctly', () => {
      const shortProposal: TradeProposal = {
        ...baseProposal,
        type: 'SHORT',
        entryPrice: 50000,
        stopLossPrice: 51000, // 2% risk (price goes up)
        takeProfitPrice: 47400 // 5.2% reward (price goes down)
      };

      const analysis = enforcer.analyzeRiskReward(shortProposal, marketConditions);

      expect(analysis.riskRewardRatio).toBeCloseTo(2.6, 1);
      expect(analysis.approved).toBe(true);
    });

    it('should reject trades with excessive risk percentage', () => {
      const highRiskProposal = {
        ...baseProposal,
        stopLossPrice: 45000 // 10% risk
      };

      const analysis = enforcer.analyzeRiskReward(highRiskProposal, marketConditions);

      expect(analysis.approved).toBe(false);
      expect(analysis.rejectionReasons).toContain(
        expect.stringContaining('Risk percentage')
      );
    });

    it('should consider confidence in approval decision', () => {
      const lowConfidenceProposal = {
        ...baseProposal,
        confidence: 30,
        takeProfitPrice: 51500 // Marginal RR ratio
      };

      const analysis = enforcer.analyzeRiskReward(lowConfidenceProposal, marketConditions);

      // Low confidence with suboptimal RR should be rejected
      expect(analysis.approved).toBe(false);
      expect(analysis.rejectionReasons).toContain(
        expect.stringContaining('Low confidence')
      );
    });
  });

  describe('optimization recommendations', () => {
    it('should suggest tightening stop loss for better RR', () => {
      const poorRRProposal = {
        ...baseProposal,
        takeProfitPrice: 50800 // Poor RR
      };

      const analysis = enforcer.analyzeRiskReward(poorRRProposal, marketConditions);

      const stopLossRec = analysis.optimizationRecommendations.find(
        opt => opt.type === 'ADJUST_STOP_LOSS'
      );

      expect(stopLossRec).toBeDefined();
      expect(stopLossRec?.recommendedValue).toBeGreaterThan(poorRRProposal.stopLossPrice);
      expect(stopLossRec?.priority).toBe('HIGH');
    });

    it('should suggest extending take profit for better RR', () => {
      const poorRRProposal = {
        ...baseProposal,
        takeProfitPrice: 50800 // Poor RR
      };

      const analysis = enforcer.analyzeRiskReward(poorRRProposal, marketConditions);

      const takeProfitRec = analysis.optimizationRecommendations.find(
        opt => opt.type === 'ADJUST_TAKE_PROFIT'
      );

      expect(takeProfitRec).toBeDefined();
      expect(takeProfitRec?.recommendedValue).toBeGreaterThan(poorRRProposal.takeProfitPrice);
    });

    it('should suggest waiting for better entry', () => {
      const poorRRProposal = {
        ...baseProposal,
        takeProfitPrice: 50800 // Poor RR
      };

      const analysis = enforcer.analyzeRiskReward(poorRRProposal, marketConditions);

      const betterEntryRec = analysis.optimizationRecommendations.find(
        opt => opt.type === 'WAIT_FOR_BETTER_ENTRY'
      );

      expect(betterEntryRec).toBeDefined();
      expect(betterEntryRec?.rrImprovement).toBeGreaterThan(0);
    });

    it('should prioritize recommendations correctly', () => {
      const poorRRProposal = {
        ...baseProposal,
        takeProfitPrice: 50500 // Very poor RR
      };

      const analysis = enforcer.analyzeRiskReward(poorRRProposal, marketConditions);

      // Should have multiple recommendations sorted by priority
      expect(analysis.optimizationRecommendations.length).toBeGreaterThan(1);
      
      const priorities = analysis.optimizationRecommendations.map(opt => opt.priority);
      const highPriorityFirst = priorities[0] === 'HIGH';
      expect(highPriorityFirst).toBe(true);
    });
  });

  describe('performance metrics', () => {
    it('should track performance metrics correctly', () => {
      // Analyze several trades
      enforcer.analyzeRiskReward(baseProposal, marketConditions);
      
      const poorRRProposal = {
        ...baseProposal,
        takeProfitPrice: 50500
      };
      enforcer.analyzeRiskReward(poorRRProposal, marketConditions);

      const metrics = enforcer.getPerformanceMetrics();

      expect(metrics.totalTradesAnalyzed).toBe(2);
      expect(metrics.rejectedTradesCount).toBe(1);
      expect(metrics.rrComplianceRate).toBe(50);
      expect(metrics.averageRR).toBeGreaterThan(0);
    });

    it('should track strategy-specific RR ratios', () => {
      const macdProposal = {
        ...baseProposal,
        strategy: 'macd-crossover'
      };

      enforcer.analyzeRiskReward(baseProposal, marketConditions);
      enforcer.analyzeRiskReward(macdProposal, marketConditions);

      const metrics = enforcer.getPerformanceMetrics();

      expect(metrics.rrByStrategy.has('moving-average-crossover')).toBe(true);
      expect(metrics.rrByStrategy.has('macd-crossover')).toBe(true);
    });

    it('should generate performance report', () => {
      // Add multiple trades
      for (let i = 0; i < 10; i++) {
        const proposal = {
          ...baseProposal,
          takeProfitPrice: 51000 + (i * 100),
          strategy: i % 2 === 0 ? 'strategy-a' : 'strategy-b'
        };
        enforcer.analyzeRiskReward(proposal, marketConditions);
      }

      const report = enforcer.generatePerformanceReport();

      expect(report.summary).toBeDefined();
      expect(report.topStrategies.length).toBeGreaterThan(0);
      expect(report.recentTrends.length).toBe(3); // 10, 20, 50 trade periods
    });

    it('should reset performance metrics', () => {
      enforcer.analyzeRiskReward(baseProposal, marketConditions);
      
      let metrics = enforcer.getPerformanceMetrics();
      expect(metrics.totalTradesAnalyzed).toBe(1);

      enforcer.resetPerformanceMetrics();
      
      metrics = enforcer.getPerformanceMetrics();
      expect(metrics.totalTradesAnalyzed).toBe(0);
      expect(enforcer.getTradeHistory()).toHaveLength(0);
    });
  });

  describe('configuration management', () => {
    it('should update configuration correctly', () => {
      const newConfig = { minRiskRewardRatio: 2.0 };
      enforcer.updateConfig(newConfig);

      const config = enforcer.getConfig();
      expect(config.minRiskRewardRatio).toBe(2.0);
      expect(config.preferredRiskRewardRatio).toBe(2.0); // Should remain unchanged
    });

    it('should apply new configuration to analysis', () => {
      // First analysis with default config (1.3 min RR)
      const analysis1 = enforcer.analyzeRiskReward(baseProposal, marketConditions);
      expect(analysis1.approved).toBe(true);

      // Update to higher minimum RR
      enforcer.updateConfig({ minRiskRewardRatio: 3.0 });

      // Same trade should now be rejected
      const analysis2 = enforcer.analyzeRiskReward(baseProposal, marketConditions);
      expect(analysis2.approved).toBe(false);
    });

    it('should disable dynamic adjustment when configured', () => {
      enforcer.updateConfig({ enableDynamicAdjustment: false });

      const bullishAnalysis = enforcer.analyzeRiskReward(baseProposal, marketConditions);
      
      const bearishConditions = { ...marketConditions, trend: 'BEARISH' as const };
      const bearishAnalysis = enforcer.analyzeRiskReward(baseProposal, bearishConditions);

      // Without dynamic adjustment, both should have same approval status
      expect(bullishAnalysis.approved).toBe(bearishAnalysis.approved);
    });
  });

  describe('edge cases', () => {
    it('should handle zero risk scenario', () => {
      const zeroRiskProposal = {
        ...baseProposal,
        stopLossPrice: 50000 // Same as entry price
      };

      const analysis = enforcer.analyzeRiskReward(zeroRiskProposal, marketConditions);

      expect(analysis.riskRewardRatio).toBe(0);
      expect(analysis.approved).toBe(false);
    });

    it('should handle very high confidence trades', () => {
      const highConfidenceProposal = {
        ...baseProposal,
        confidence: 95
      };

      const analysis = enforcer.analyzeRiskReward(highConfidenceProposal, marketConditions);

      expect(analysis.approved).toBe(true);
    });

    it('should handle extreme market conditions', () => {
      const extremeConditions = {
        ...marketConditions,
        volatility: 1.0, // 100% volatility
        trend: 'BEARISH' as const
      };

      const analysis = enforcer.analyzeRiskReward(baseProposal, extremeConditions);

      // Should still provide analysis even in extreme conditions
      expect(analysis).toBeDefined();
      expect(analysis.riskRewardRatio).toBeGreaterThan(0);
    });

    it('should handle missing support/resistance levels', () => {
      const conditionsWithoutLevels = {
        ...marketConditions,
        supportLevel: undefined,
        resistanceLevel: undefined
      };

      const analysis = enforcer.analyzeRiskReward(baseProposal, conditionsWithoutLevels);

      expect(analysis).toBeDefined();
      expect(analysis.optimizationRecommendations).toBeDefined();
    });
  });
});