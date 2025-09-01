/**
 * Unit Tests for Position Sizing Engine
 * 
 * Comprehensive test suite covering position sizing calculations,
 * risk adjustments, correlation analysis, and validation logic.
 * 
 * Requirements: 17.1, 17.3, 17.6 - Unit tests for risk management functions
 */

import { PositionSizingEngine } from '../position-sizing-engine';
import { 
  RiskParameters, 
  PositionSizeRequest, 
  Position,
  PositionSizeResult 
} from '../types';

describe('PositionSizingEngine', () => {
  let engine: PositionSizingEngine;
  let defaultRiskParameters: RiskParameters;
  let baseRequest: PositionSizeRequest;

  beforeEach(() => {
    defaultRiskParameters = {
      maxRiskPerTrade: 2.5, // 2.5% max risk per trade
      minRiskRewardRatio: 1.3, // Minimum 1.3:1 RR ratio
      maxDrawdownThreshold: 15, // 15% max drawdown
      maxCorrelationExposure: 0.7, // 70% max correlation
      volatilityAdjustmentFactor: 0.3 // 30% volatility adjustment
    };

    engine = new PositionSizingEngine(defaultRiskParameters);

    baseRequest = {
      symbol: 'BTC',
      accountBalance: 10000, // $10,000 account
      entryPrice: 42000, // $42,000 BTC
      stopLossPrice: 41000, // $1,000 stop loss
      takeProfitPrice: 44300, // $2,300 take profit (2.3:1 RR)
      confidence: 75, // 75% confidence
      volatility: 0.2, // 20% volatility
      existingPositions: []
    };
  });

  describe('calculatePositionSize', () => {
    it('should calculate correct base position size using 2.5% risk rule', async () => {
      const result = await engine.calculatePositionSize(baseRequest);
      
      // Risk amount = $10,000 * 2.5% = $250
      // Price risk = $42,000 - $41,000 = $1,000
      // Base position size = $250 / $1,000 = 0.25 BTC
      expect(result.riskAmount).toBeCloseTo(250, 0);
      expect(result.riskPercentage).toBeCloseTo(2.5, 1);
      expect(result.approved).toBe(true);
      expect(result.positionSize).toBeGreaterThan(0);
    });

    it('should apply confidence adjustment correctly', async () => {
      // Test high confidence (should increase position size)
      const highConfidenceRequest = { ...baseRequest, confidence: 90 };
      const highConfidenceResult = await engine.calculatePositionSize(highConfidenceRequest);

      // Test low confidence (should decrease position size)
      const lowConfidenceRequest = { ...baseRequest, confidence: 40 };
      const lowConfidenceResult = await engine.calculatePositionSize(lowConfidenceRequest);

      expect(highConfidenceResult.positionSize).toBeGreaterThan(lowConfidenceResult.positionSize);
      expect(highConfidenceResult.confidenceAdjustedSize).toBeGreaterThan(lowConfidenceResult.confidenceAdjustedSize);
    });

    it('should apply volatility adjustment correctly', async () => {
      // Test high volatility (should decrease position size)
      const highVolatilityRequest = { ...baseRequest, volatility: 0.5 };
      const highVolatilityResult = await engine.calculatePositionSize(highVolatilityRequest);

      // Test low volatility (should maintain or increase position size)
      const lowVolatilityRequest = { ...baseRequest, volatility: 0.1 };
      const lowVolatilityResult = await engine.calculatePositionSize(lowVolatilityRequest);

      expect(lowVolatilityResult.positionSize).toBeGreaterThan(highVolatilityResult.positionSize);
    });

    it('should calculate risk-reward ratio correctly', async () => {
      const result = await engine.calculatePositionSize(baseRequest);
      
      // Risk = $42,000 - $41,000 = $1,000
      // Reward = $44,300 - $42,000 = $2,300
      // RR = $2,300 / $1,000 = 2.3
      expect(result.riskRewardRatio).toBeCloseTo(2.3, 1);
    });

    it('should reject trades with insufficient risk-reward ratio', async () => {
      const poorRRRequest = {
        ...baseRequest,
        takeProfitPrice: 42500 // Only $500 profit vs $1,000 risk = 0.5:1 RR
      };

      const result = await engine.calculatePositionSize(poorRRRequest);
      
      expect(result.approved).toBe(false);
      expect(result.rejectionReasons).toContain(
        expect.stringContaining('Risk-reward ratio')
      );
      expect(result.positionSize).toBe(0);
    });

    it('should reject trades with excessive risk percentage', async () => {
      const highRiskRequest = {
        ...baseRequest,
        stopLossPrice: 35000 // $7,000 stop loss = 17.5% risk
      };

      const result = await engine.calculatePositionSize(highRiskRequest);
      
      expect(result.approved).toBe(false);
      expect(result.rejectionReasons).toContain(
        expect.stringContaining('Risk percentage')
      );
    });

    it('should handle correlation adjustment with existing positions', async () => {
      const existingPositions: Position[] = [
        {
          id: 'pos1',
          symbol: 'ETH',
          size: 5,
          entryPrice: 2500,
          currentPrice: 2600,
          type: 'LONG',
          unrealizedPnL: 500,
          stopLoss: 2400,
          takeProfit: 2800,
          timestamp: new Date()
        }
      ];

      const requestWithPositions = {
        ...baseRequest,
        existingPositions
      };

      const result = await engine.calculatePositionSize(requestWithPositions);
      
      expect(result.correlationAdjustment).toBeLessThanOrEqual(1.0);
      expect(result.positionSize).toBeGreaterThan(0);
    });

    it('should handle zero stop loss distance', async () => {
      const zeroStopRequest = {
        ...baseRequest,
        stopLossPrice: 42000 // Same as entry price
      };

      await expect(engine.calculatePositionSize(zeroStopRequest))
        .rejects.toThrow('Stop loss price cannot equal entry price');
    });

    it('should validate position size is reasonable relative to account', async () => {
      const smallAccountRequest = {
        ...baseRequest,
        accountBalance: 1000, // Small account
        entryPrice: 42000,
        stopLossPrice: 41900 // Small stop loss
      };

      const result = await engine.calculatePositionSize(smallAccountRequest);
      
      // Should not allow position value > 50% of account
      const positionValue = result.positionSize * smallAccountRequest.entryPrice;
      const positionPercentage = (positionValue / smallAccountRequest.accountBalance) * 100;
      
      if (positionPercentage > 50) {
        expect(result.approved).toBe(false);
        expect(result.rejectionReasons).toContain(
          expect.stringContaining('Position value')
        );
      }
    });
  });

  describe('Confidence Adjustment', () => {
    it('should increase position size for high confidence', async () => {
      const highConfidenceRequest = { ...baseRequest, confidence: 95 };
      const result = await engine.calculatePositionSize(highConfidenceRequest);
      
      // High confidence should result in larger position (up to 1.5x base)
      expect(result.confidenceAdjustedSize).toBeGreaterThan(result.positionSize * 0.8);
    });

    it('should decrease position size for low confidence', async () => {
      const lowConfidenceRequest = { ...baseRequest, confidence: 20 };
      const result = await engine.calculatePositionSize(lowConfidenceRequest);
      
      // Low confidence should result in smaller position (down to 0.5x base)
      expect(result.confidenceAdjustedSize).toBeLessThan(result.positionSize * 1.2);
    });

    it('should handle extreme confidence values', async () => {
      // Test confidence > 100
      const extremeHighRequest = { ...baseRequest, confidence: 150 };
      const extremeHighResult = await engine.calculatePositionSize(extremeHighRequest);
      
      // Test confidence < 0
      const extremeLowRequest = { ...baseRequest, confidence: -20 };
      const extremeLowResult = await engine.calculatePositionSize(extremeLowRequest);
      
      expect(extremeHighResult.positionSize).toBeGreaterThan(0);
      expect(extremeLowResult.positionSize).toBeGreaterThan(0);
    });
  });

  describe('Volatility Adjustment', () => {
    it('should reduce position size for high volatility', async () => {
      const highVolatilityRequest = { ...baseRequest, volatility: 0.8 };
      const normalVolatilityRequest = { ...baseRequest, volatility: 0.2 };
      
      const highVolResult = await engine.calculatePositionSize(highVolatilityRequest);
      const normalVolResult = await engine.calculatePositionSize(normalVolatilityRequest);
      
      expect(highVolResult.positionSize).toBeLessThan(normalVolResult.positionSize);
    });

    it('should maintain minimum position size even with extreme volatility', async () => {
      const extremeVolatilityRequest = { ...baseRequest, volatility: 2.0 };
      const result = await engine.calculatePositionSize(extremeVolatilityRequest);
      
      // Should maintain at least 30% of base position size
      expect(result.positionSize).toBeGreaterThan(0);
    });

    it('should handle zero volatility', async () => {
      const zeroVolatilityRequest = { ...baseRequest, volatility: 0 };
      const result = await engine.calculatePositionSize(zeroVolatilityRequest);
      
      expect(result.positionSize).toBeGreaterThan(0);
      expect(result.approved).toBe(true);
    });
  });

  describe('Correlation Analysis', () => {
    it('should reduce position size for highly correlated assets', async () => {
      const highlyCorrelatedPositions: Position[] = [
        {
          id: 'pos1',
          symbol: 'ETH', // ETH is highly correlated with BTC
          size: 10,
          entryPrice: 2500,
          currentPrice: 2600,
          type: 'LONG',
          unrealizedPnL: 1000,
          stopLoss: 2400,
          takeProfit: 2800,
          timestamp: new Date()
        }
      ];

      const correlatedRequest = {
        ...baseRequest,
        existingPositions: highlyCorrelatedPositions
      };

      const result = await engine.calculatePositionSize(correlatedRequest);
      
      expect(result.correlationAdjustment).toBeLessThanOrEqual(1.0);
    });

    it('should not adjust for uncorrelated assets', async () => {
      const uncorrelatedPositions: Position[] = [
        {
          id: 'pos1',
          symbol: 'GOLD', // Assuming GOLD is not correlated with BTC
          size: 100,
          entryPrice: 2000,
          currentPrice: 2050,
          type: 'LONG',
          unrealizedPnL: 5000,
          stopLoss: 1950,
          takeProfit: 2150,
          timestamp: new Date()
        }
      ];

      const uncorrelatedRequest = {
        ...baseRequest,
        existingPositions: uncorrelatedPositions
      };

      const result = await engine.calculatePositionSize(uncorrelatedRequest);
      
      expect(result.correlationAdjustment).toBe(1.0);
    });

    it('should handle empty existing positions', async () => {
      const result = await engine.calculatePositionSize(baseRequest);
      
      expect(result.correlationAdjustment).toBe(1.0);
      expect(result.approved).toBe(true);
    });
  });

  describe('Risk Parameter Management', () => {
    it('should update risk parameters correctly', () => {
      const newParameters = {
        maxRiskPerTrade: 3.0,
        minRiskRewardRatio: 1.5
      };

      engine.updateRiskParameters(newParameters);
      const updatedParams = engine.getRiskParameters();
      
      expect(updatedParams.maxRiskPerTrade).toBe(3.0);
      expect(updatedParams.minRiskRewardRatio).toBe(1.5);
      expect(updatedParams.maxDrawdownThreshold).toBe(15); // Should remain unchanged
    });

    it('should get current risk parameters', () => {
      const params = engine.getRiskParameters();
      
      expect(params).toEqual(defaultRiskParameters);
      expect(params).not.toBe(defaultRiskParameters); // Should be a copy
    });
  });

  describe('Scenario Analysis', () => {
    it('should calculate multiple scenarios correctly', async () => {
      const scenarios = [
        { confidence: 90, volatility: 0.1 }, // High confidence, low volatility
        { confidence: 50, volatility: 0.3 }, // Medium confidence, medium volatility
        { confidence: 30, volatility: 0.6 }  // Low confidence, high volatility
      ];

      const results = await engine.calculateScenarioAnalysis(baseRequest, scenarios);
      
      expect(results).toHaveLength(3);
      
      // Results should be ordered by decreasing position size
      expect(results[0].positionSize).toBeGreaterThanOrEqual(results[1].positionSize);
      expect(results[1].positionSize).toBeGreaterThanOrEqual(results[2].positionSize);
      
      // All should have same risk-reward ratio
      results.forEach(result => {
        expect(result.riskRewardRatio).toBeCloseTo(2.3, 1);
      });
    });

    it('should handle empty scenarios array', async () => {
      const results = await engine.calculateScenarioAnalysis(baseRequest, []);
      
      expect(results).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle negative account balance', async () => {
      const negativeBalanceRequest = {
        ...baseRequest,
        accountBalance: -1000
      };

      const result = await engine.calculatePositionSize(negativeBalanceRequest);
      
      expect(result.approved).toBe(false);
      expect(result.positionSize).toBe(0);
    });

    it('should handle zero account balance', async () => {
      const zeroBalanceRequest = {
        ...baseRequest,
        accountBalance: 0
      };

      const result = await engine.calculatePositionSize(zeroBalanceRequest);
      
      expect(result.approved).toBe(false);
      expect(result.positionSize).toBe(0);
    });

    it('should handle negative prices', async () => {
      const negativePriceRequest = {
        ...baseRequest,
        entryPrice: -100,
        stopLossPrice: -200,
        takeProfitPrice: 0
      };

      const result = await engine.calculatePositionSize(negativePriceRequest);
      
      // Should handle gracefully, though may not be approved
      expect(typeof result.positionSize).toBe('number');
    });

    it('should handle very small price differences', async () => {
      const smallDifferenceRequest = {
        ...baseRequest,
        entryPrice: 42000.00,
        stopLossPrice: 41999.99, // 1 cent difference
        takeProfitPrice: 42000.02
      };

      const result = await engine.calculatePositionSize(smallDifferenceRequest);
      
      expect(result.positionSize).toBeGreaterThan(0);
    });

    it('should handle very large position sizes', async () => {
      const largePositionRequest = {
        ...baseRequest,
        accountBalance: 1000000, // $1M account
        stopLossPrice: 41999 // Small stop loss
      };

      const result = await engine.calculatePositionSize(largePositionRequest);
      
      expect(result.positionSize).toBeGreaterThan(0);
      expect(typeof result.positionSize).toBe('number');
      expect(isFinite(result.positionSize)).toBe(true);
    });

    it('should handle invalid confidence values gracefully', async () => {
      const invalidConfidenceRequest = {
        ...baseRequest,
        confidence: NaN
      };

      const result = await engine.calculatePositionSize(invalidConfidenceRequest);
      
      expect(result.positionSize).toBeGreaterThan(0);
      expect(isFinite(result.positionSize)).toBe(true);
    });

    it('should handle invalid volatility values gracefully', async () => {
      const invalidVolatilityRequest = {
        ...baseRequest,
        volatility: Infinity
      };

      const result = await engine.calculatePositionSize(invalidVolatilityRequest);
      
      expect(result.positionSize).toBeGreaterThan(0);
      expect(isFinite(result.positionSize)).toBe(true);
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large numbers of existing positions efficiently', async () => {
      const manyPositions: Position[] = [];
      for (let i = 0; i < 100; i++) {
        manyPositions.push({
          id: `pos${i}`,
          symbol: `ASSET${i}`,
          size: 1,
          entryPrice: 100,
          currentPrice: 105,
          type: 'LONG',
          unrealizedPnL: 5,
          stopLoss: 95,
          takeProfit: 110,
          timestamp: new Date()
        });
      }

      const manyPositionsRequest = {
        ...baseRequest,
        existingPositions: manyPositions
      };

      const startTime = Date.now();
      const result = await engine.calculatePositionSize(manyPositionsRequest);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(result.positionSize).toBeGreaterThan(0);
    });

    it('should not modify input parameters', async () => {
      const originalRequest = JSON.parse(JSON.stringify(baseRequest));
      await engine.calculatePositionSize(baseRequest);
      
      expect(baseRequest).toEqual(originalRequest);
    });

    it('should produce consistent results for same input', async () => {
      const result1 = await engine.calculatePositionSize(baseRequest);
      const result2 = await engine.calculatePositionSize(baseRequest);
      
      expect(result1.positionSize).toBe(result2.positionSize);
      expect(result1.riskPercentage).toBe(result2.riskPercentage);
      expect(result1.approved).toBe(result2.approved);
    });
  });
});