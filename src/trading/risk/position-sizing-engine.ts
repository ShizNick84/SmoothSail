/**
 * Dynamic Position Sizing Engine
 * 
 * Implements sophisticated position sizing based on:
 * - 2-3% risk per trade calculation
 * - Account balance and volatility considerations
 * - Confidence-based position size adjustment
 * - Correlation-based exposure limits
 */

import { 
  PositionSizeRequest, 
  PositionSizeResult, 
  RiskParameters, 
  Position,
  CorrelationMatrix 
} from './types.js';

export class PositionSizingEngine {
  private riskParameters: RiskParameters;

  constructor(riskParameters: RiskParameters) {
    this.riskParameters = riskParameters;
  }

  /**
   * Calculate optimal position size based on multiple risk factors
   */
  async calculatePositionSize(request: PositionSizeRequest): Promise<PositionSizeResult> {
    // Calculate base position size using risk percentage
    const basePositionSize = this.calculateBasePositionSize(
      request.accountBalance,
      request.entryPrice,
      request.stopLossPrice
    );

    // Apply confidence adjustment
    const confidenceAdjustedSize = this.applyConfidenceAdjustment(
      basePositionSize,
      request.confidence
    );

    // Apply volatility adjustment
    const volatilityAdjustedSize = this.applyVolatilityAdjustment(
      confidenceAdjustedSize,
      request.volatility
    );

    // Calculate correlation adjustment
    const correlationAdjustment = await this.calculateCorrelationAdjustment(
      request.symbol,
      request.existingPositions
    );

    const finalPositionSize = volatilityAdjustedSize * correlationAdjustment;

    // Calculate risk metrics
    const riskAmount = Math.abs(request.entryPrice - request.stopLossPrice) * finalPositionSize;
    const riskPercentage = (riskAmount / request.accountBalance) * 100;
    const riskRewardRatio = this.calculateRiskRewardRatio(
      request.entryPrice,
      request.stopLossPrice,
      request.takeProfitPrice
    );

    // Validate position size
    const validation = this.validatePositionSize(
      finalPositionSize,
      riskPercentage,
      riskRewardRatio,
      request
    );

    return {
      positionSize: validation.approved ? finalPositionSize : 0,
      riskAmount,
      riskPercentage,
      riskRewardRatio,
      confidenceAdjustedSize,
      correlationAdjustment,
      approved: validation.approved,
      rejectionReasons: validation.rejectionReasons
    };
  }

  /**
   * Calculate base position size using 2-3% risk rule
   */
  private calculateBasePositionSize(
    accountBalance: number,
    entryPrice: number,
    stopLossPrice: number
  ): number {
    const riskAmount = accountBalance * (this.riskParameters.maxRiskPerTrade / 100);
    const priceRisk = Math.abs(entryPrice - stopLossPrice);
    
    if (priceRisk === 0) {
      throw new Error('Stop loss price cannot equal entry price');
    }

    return riskAmount / priceRisk;
  }

  /**
   * Apply confidence-based position size adjustment
   * Higher confidence = larger position (up to 150% of base)
   * Lower confidence = smaller position (down to 50% of base)
   */
  private applyConfidenceAdjustment(baseSize: number, confidence: number): number {
    // Normalize confidence to 0-1 range
    const normalizedConfidence = Math.max(0, Math.min(100, confidence)) / 100;
    
    // Apply confidence multiplier (0.5x to 1.5x)
    const confidenceMultiplier = 0.5 + (normalizedConfidence * 1.0);
    
    return baseSize * confidenceMultiplier;
  }

  /**
   * Apply volatility-based position size adjustment
   * Higher volatility = smaller position
   * Lower volatility = larger position
   */
  private applyVolatilityAdjustment(baseSize: number, volatility: number): number {
    // Volatility adjustment factor (higher volatility reduces position size)
    const volatilityMultiplier = Math.max(0.3, 1 - (volatility * this.riskParameters.volatilityAdjustmentFactor));
    
    return baseSize * volatilityMultiplier;
  }

  /**
   * Calculate correlation-based position adjustment
   * Reduces position size if high correlation with existing positions
   */
  private async calculateCorrelationAdjustment(
    symbol: string,
    existingPositions: Position[]
  ): Promise<number> {
    if (existingPositions.length === 0) {
      return 1.0; // No adjustment needed
    }

    // Calculate correlation with existing positions
    const correlationMatrix = await this.calculateCorrelationMatrix(symbol, existingPositions);
    
    // Reduce position size based on correlation exposure
    const maxCorrelation = Math.max(...Array.from(correlationMatrix.correlations.values()));
    
    if (maxCorrelation > this.riskParameters.maxCorrelationExposure) {
      // Reduce position size proportionally to correlation excess
      const correlationExcess = maxCorrelation - this.riskParameters.maxCorrelationExposure;
      return Math.max(0.2, 1 - correlationExcess);
    }

    return 1.0;
  }

  /**
   * Calculate correlation matrix between symbols
   */
  private async calculateCorrelationMatrix(
    newSymbol: string,
    existingPositions: Position[]
  ): Promise<CorrelationMatrix> {
    const correlations = new Map<string, number>();
    
    // For crypto pairs, use predefined correlation coefficients
    // In production, this would use historical price data
    const cryptoCorrelations: Record<string, Record<string, number>> = {
      'BTC': { 'ETH': 0.75, 'BTC': 1.0 },
      'ETH': { 'BTC': 0.75, 'ETH': 1.0 }
    };

    for (const position of existingPositions) {
      const correlation = cryptoCorrelations[newSymbol]?.[position.symbol] || 0;
      correlations.set(`${newSymbol}-${position.symbol}`, correlation);
    }

    const portfolioCorrelationRisk = this.calculatePortfolioCorrelationRisk(correlations);
    const diversificationScore = this.calculateDiversificationScore(correlations);

    return {
      correlations,
      portfolioCorrelationRisk,
      diversificationScore,
      recommendations: []
    };
  }

  /**
   * Calculate overall portfolio correlation risk
   */
  private calculatePortfolioCorrelationRisk(correlations: Map<string, number>): number {
    if (correlations.size === 0) return 0;
    
    const correlationValues = Array.from(correlations.values());
    const avgCorrelation = correlationValues.reduce((sum, corr) => sum + Math.abs(corr), 0) / correlationValues.length;
    
    return avgCorrelation;
  }

  /**
   * Calculate portfolio diversification score
   */
  private calculateDiversificationScore(correlations: Map<string, number>): number {
    const portfolioRisk = this.calculatePortfolioCorrelationRisk(correlations);
    return Math.max(0, 100 - (portfolioRisk * 100));
  }

  /**
   * Calculate risk-reward ratio
   */
  private calculateRiskRewardRatio(
    entryPrice: number,
    stopLossPrice: number,
    takeProfitPrice: number
  ): number {
    const risk = Math.abs(entryPrice - stopLossPrice);
    const reward = Math.abs(takeProfitPrice - entryPrice);
    
    if (risk === 0) return 0;
    return reward / risk;
  }

  /**
   * Validate position size against risk parameters
   */
  private validatePositionSize(
    positionSize: number,
    riskPercentage: number,
    riskRewardRatio: number,
    request: PositionSizeRequest
  ): { approved: boolean; rejectionReasons: string[] } {
    const rejectionReasons: string[] = [];

    // Check maximum risk per trade
    if (riskPercentage > this.riskParameters.maxRiskPerTrade) {
      rejectionReasons.push(`Risk percentage ${riskPercentage.toFixed(2)}% exceeds maximum ${this.riskParameters.maxRiskPerTrade}%`);
    }

    // Check minimum risk-reward ratio
    if (riskRewardRatio < this.riskParameters.minRiskRewardRatio) {
      rejectionReasons.push(`Risk-reward ratio ${riskRewardRatio.toFixed(2)} below minimum ${this.riskParameters.minRiskRewardRatio}`);
    }

    // Check position size is positive and reasonable
    if (positionSize <= 0) {
      rejectionReasons.push('Position size must be positive');
    }

    // Check if position size is too large relative to account
    const positionValue = positionSize * request.entryPrice;
    const positionPercentage = (positionValue / request.accountBalance) * 100;
    if (positionPercentage > 50) {
      rejectionReasons.push(`Position value ${positionPercentage.toFixed(2)}% of account is too large`);
    }

    return {
      approved: rejectionReasons.length === 0,
      rejectionReasons
    };
  }

  /**
   * Update risk parameters
   */
  updateRiskParameters(newParameters: Partial<RiskParameters>): void {
    this.riskParameters = { ...this.riskParameters, ...newParameters };
  }

  /**
   * Get current risk parameters
   */
  getRiskParameters(): RiskParameters {
    return { ...this.riskParameters };
  }

  /**
   * Calculate recommended position size for multiple scenarios
   */
  async calculateScenarioAnalysis(
    baseRequest: PositionSizeRequest,
    scenarios: { confidence: number; volatility: number }[]
  ): Promise<PositionSizeResult[]> {
    const results: PositionSizeResult[] = [];

    for (const scenario of scenarios) {
      const scenarioRequest = {
        ...baseRequest,
        confidence: scenario.confidence,
        volatility: scenario.volatility
      };

      const result = await this.calculatePositionSize(scenarioRequest);
      results.push(result);
    }

    return results;
  }
}