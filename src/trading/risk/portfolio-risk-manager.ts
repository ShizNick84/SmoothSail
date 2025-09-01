/**
 * Portfolio Risk Manager
 * 
 * Implements sophisticated portfolio-level risk management with:
 * - Correlation analysis between positions
 * - Portfolio-level risk exposure monitoring
 * - Diversification requirements and enforcement
 * - Portfolio rebalancing recommendations
 */

import { 
  Position, 
  CorrelationMatrix, 
  PositionAdjustment, 
  RiskMetrics 
} from './types.js';

export interface PortfolioRiskConfig {
  /** Maximum portfolio correlation threshold */
  maxPortfolioCorrelation: number;
  /** Maximum single asset exposure (% of portfolio) */
  maxSingleAssetExposure: number;
  /** Maximum sector exposure (% of portfolio) */
  maxSectorExposure: number;
  /** Minimum diversification score required */
  minDiversificationScore: number;
  /** Maximum portfolio beta */
  maxPortfolioBeta: number;
  /** Rebalancing threshold (% deviation) */
  rebalancingThreshold: number;
  /** Target portfolio allocation */
  targetAllocation: Map<string, number>;
}

export interface PortfolioMetrics {
  /** Total portfolio value */
  totalValue: number;
  /** Portfolio beta */
  beta: number;
  /** Portfolio volatility */
  volatility: number;
  /** Sharpe ratio */
  sharpeRatio: number;
  /** Maximum drawdown */
  maxDrawdown: number;
  /** Value at Risk (95% confidence) */
  valueAtRisk: number;
  /** Expected shortfall */
  expectedShortfall: number;
  /** Diversification ratio */
  diversificationRatio: number;
  /** Concentration risk score */
  concentrationRisk: number;
}

export interface AssetExposure {
  /** Asset symbol */
  symbol: string;
  /** Position value */
  value: number;
  /** Percentage of portfolio */
  percentage: number;
  /** Number of positions */
  positionCount: number;
  /** Average entry price */
  averageEntryPrice: number;
  /** Current price */
  currentPrice: number;
  /** Unrealized P&L */
  unrealizedPnL: number;
  /** Risk contribution to portfolio */
  riskContribution: number;
}

export interface SectorExposure {
  /** Sector name */
  sector: string;
  /** Total exposure value */
  value: number;
  /** Percentage of portfolio */
  percentage: number;
  /** Assets in sector */
  assets: string[];
  /** Sector beta */
  beta: number;
  /** Sector correlation with market */
  marketCorrelation: number;
}

export interface RebalancingRecommendation {
  /** Recommendation ID */
  id: string;
  /** Recommendation type */
  type: 'REDUCE_EXPOSURE' | 'INCREASE_EXPOSURE' | 'CLOSE_POSITION' | 'DIVERSIFY';
  /** Asset symbol */
  symbol: string;
  /** Current allocation percentage */
  currentAllocation: number;
  /** Target allocation percentage */
  targetAllocation: number;
  /** Recommended action */
  action: string;
  /** Expected risk reduction */
  riskReduction: number;
  /** Priority level */
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Reasoning */
  reasoning: string;
  /** Estimated impact */
  estimatedImpact: {
    portfolioRisk: number;
    diversificationImprovement: number;
    correlationReduction: number;
  };
}

export interface PortfolioRiskReport {
  /** Report timestamp */
  timestamp: Date;
  /** Portfolio metrics */
  metrics: PortfolioMetrics;
  /** Asset exposures */
  assetExposures: AssetExposure[];
  /** Sector exposures */
  sectorExposures: SectorExposure[];
  /** Correlation matrix */
  correlationMatrix: CorrelationMatrix;
  /** Risk violations */
  riskViolations: string[];
  /** Rebalancing recommendations */
  rebalancingRecommendations: RebalancingRecommendation[];
  /** Overall risk score (0-100) */
  overallRiskScore: number;
}

export class PortfolioRiskManager {
  private config: PortfolioRiskConfig;
  private historicalPrices: Map<string, number[]> = new Map();
  private correlationCache: Map<string, number> = new Map();

  constructor(config: PortfolioRiskConfig) {
    this.config = config;
  }

  /**
   * Analyze portfolio risk and generate comprehensive report
   */
  async analyzePortfolioRisk(positions: Position[]): Promise<PortfolioRiskReport> {
    // Calculate portfolio metrics
    const metrics = this.calculatePortfolioMetrics(positions);
    
    // Calculate asset exposures
    const assetExposures = this.calculateAssetExposures(positions);
    
    // Calculate sector exposures
    const sectorExposures = this.calculateSectorExposures(assetExposures);
    
    // Calculate correlation matrix
    const correlationMatrix = await this.calculateCorrelationMatrix(positions);
    
    // Identify risk violations
    const riskViolations = this.identifyRiskViolations(assetExposures, sectorExposures, correlationMatrix);
    
    // Generate rebalancing recommendations
    const rebalancingRecommendations = this.generateRebalancingRecommendations(
      assetExposures, 
      sectorExposures, 
      correlationMatrix
    );
    
    // Calculate overall risk score
    const overallRiskScore = this.calculateOverallRiskScore(
      metrics, 
      riskViolations.length, 
      correlationMatrix
    );

    return {
      timestamp: new Date(),
      metrics,
      assetExposures,
      sectorExposures,
      correlationMatrix,
      riskViolations,
      rebalancingRecommendations,
      overallRiskScore
    };
  }

  /**
   * Calculate comprehensive portfolio metrics
   */
  private calculatePortfolioMetrics(positions: Position[]): PortfolioMetrics {
    const totalValue = positions.reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0);
    
    if (totalValue === 0) {
      return {
        totalValue: 0,
        beta: 0,
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        valueAtRisk: 0,
        expectedShortfall: 0,
        diversificationRatio: 0,
        concentrationRisk: 0
      };
    }

    // Calculate portfolio beta (weighted average of asset betas)
    const beta = this.calculatePortfolioBeta(positions, totalValue);
    
    // Calculate portfolio volatility
    const volatility = this.calculatePortfolioVolatility(positions);
    
    // Calculate Sharpe ratio (assuming risk-free rate of 2%)
    const riskFreeRate = 0.02;
    const portfolioReturn = this.calculatePortfolioReturn(positions);
    const sharpeRatio = volatility > 0 ? (portfolioReturn - riskFreeRate) / volatility : 0;
    
    // Calculate maximum drawdown
    const maxDrawdown = this.calculateMaxDrawdown(positions);
    
    // Calculate Value at Risk (95% confidence)
    const valueAtRisk = this.calculateValueAtRisk(positions, totalValue, 0.95);
    
    // Calculate Expected Shortfall
    const expectedShortfall = this.calculateExpectedShortfall(positions, totalValue, 0.95);
    
    // Calculate diversification ratio
    const diversificationRatio = this.calculateDiversificationRatio(positions);
    
    // Calculate concentration risk
    const concentrationRisk = this.calculateConcentrationRisk(positions, totalValue);

    return {
      totalValue,
      beta,
      volatility,
      sharpeRatio,
      maxDrawdown,
      valueAtRisk,
      expectedShortfall,
      diversificationRatio,
      concentrationRisk
    };
  }

  /**
   * Calculate asset exposures
   */
  private calculateAssetExposures(positions: Position[]): AssetExposure[] {
    const totalValue = positions.reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0);
    const assetMap = new Map<string, Position[]>();

    // Group positions by asset
    positions.forEach(pos => {
      if (!assetMap.has(pos.symbol)) {
        assetMap.set(pos.symbol, []);
      }
      assetMap.get(pos.symbol)!.push(pos);
    });

    return Array.from(assetMap.entries()).map(([symbol, assetPositions]) => {
      const value = assetPositions.reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0);
      const totalSize = assetPositions.reduce((sum, pos) => sum + pos.size, 0);
      const averageEntryPrice = assetPositions.reduce((sum, pos) => sum + (pos.entryPrice * pos.size), 0) / totalSize;
      const currentPrice = assetPositions[0].currentPrice;
      const unrealizedPnL = assetPositions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
      const riskContribution = this.calculateAssetRiskContribution(symbol, assetPositions, totalValue);

      return {
        symbol,
        value,
        percentage: (value / totalValue) * 100,
        positionCount: assetPositions.length,
        averageEntryPrice,
        currentPrice,
        unrealizedPnL,
        riskContribution
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }

  /**
   * Calculate sector exposures
   */
  private calculateSectorExposures(assetExposures: AssetExposure[]): SectorExposure[] {
    // Define crypto sectors
    const sectorMap: Record<string, string> = {
      'BTC': 'Digital Gold',
      'ETH': 'Smart Contracts',
      'ADA': 'Smart Contracts',
      'DOT': 'Interoperability',
      'LINK': 'Oracle',
      'UNI': 'DeFi',
      'AAVE': 'DeFi'
    };

    const sectors = new Map<string, AssetExposure[]>();
    const totalValue = assetExposures.reduce((sum, asset) => sum + asset.value, 0);

    assetExposures.forEach(asset => {
      const sector = sectorMap[asset.symbol] || 'Other';
      if (!sectors.has(sector)) {
        sectors.set(sector, []);
      }
      sectors.get(sector)!.push(asset);
    });

    return Array.from(sectors.entries()).map(([sector, assets]) => {
      const value = assets.reduce((sum, asset) => sum + asset.value, 0);
      const beta = this.calculateSectorBeta(assets);
      const marketCorrelation = this.calculateSectorMarketCorrelation(assets);

      return {
        sector,
        value,
        percentage: (value / totalValue) * 100,
        assets: assets.map(a => a.symbol),
        beta,
        marketCorrelation
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }

  /**
   * Calculate correlation matrix between assets
   */
  private async calculateCorrelationMatrix(positions: Position[]): Promise<CorrelationMatrix> {
    const symbols = [...new Set(positions.map(p => p.symbol))];
    const correlations = new Map<string, number>();

    // Predefined correlation coefficients for crypto assets
    const cryptoCorrelations: Record<string, Record<string, number>> = {
      'BTC': { 'ETH': 0.75, 'BTC': 1.0 },
      'ETH': { 'BTC': 0.75, 'ETH': 1.0 }
    };

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const symbol1 = symbols[i];
        const symbol2 = symbols[j];
        const correlation = cryptoCorrelations[symbol1]?.[symbol2] || 
                          cryptoCorrelations[symbol2]?.[symbol1] || 
                          0.3; // Default moderate correlation for crypto

        correlations.set(`${symbol1}-${symbol2}`, correlation);
      }
    }

    const portfolioCorrelationRisk = this.calculatePortfolioCorrelationRisk(correlations, positions);
    const diversificationScore = Math.max(0, 100 - (portfolioCorrelationRisk * 100));

    return {
      correlations,
      portfolioCorrelationRisk,
      diversificationScore,
      recommendations: []
    };
  }

  /**
   * Calculate portfolio correlation risk
   */
  private calculatePortfolioCorrelationRisk(
    correlations: Map<string, number>, 
    positions: Position[]
  ): number {
    if (correlations.size === 0) return 0;

    const totalValue = positions.reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0);
    let weightedCorrelation = 0;
    let totalWeight = 0;

    correlations.forEach((correlation, pair) => {
      const [symbol1, symbol2] = pair.split('-');
      const pos1Value = positions
        .filter(p => p.symbol === symbol1)
        .reduce((sum, p) => sum + (p.size * p.currentPrice), 0);
      const pos2Value = positions
        .filter(p => p.symbol === symbol2)
        .reduce((sum, p) => sum + (p.size * p.currentPrice), 0);

      const weight = (pos1Value * pos2Value) / (totalValue * totalValue);
      weightedCorrelation += Math.abs(correlation) * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedCorrelation / totalWeight : 0;
  }

  /**
   * Identify risk violations
   */
  private identifyRiskViolations(
    assetExposures: AssetExposure[],
    sectorExposures: SectorExposure[],
    correlationMatrix: CorrelationMatrix
  ): string[] {
    const violations: string[] = [];

    // Check single asset exposure limits
    assetExposures.forEach(asset => {
      if (asset.percentage > this.config.maxSingleAssetExposure) {
        violations.push(
          `${asset.symbol} exposure ${asset.percentage.toFixed(1)}% exceeds limit ${this.config.maxSingleAssetExposure}%`
        );
      }
    });

    // Check sector exposure limits
    sectorExposures.forEach(sector => {
      if (sector.percentage > this.config.maxSectorExposure) {
        violations.push(
          `${sector.sector} sector exposure ${sector.percentage.toFixed(1)}% exceeds limit ${this.config.maxSectorExposure}%`
        );
      }
    });

    // Check portfolio correlation
    if (correlationMatrix.portfolioCorrelationRisk > this.config.maxPortfolioCorrelation) {
      violations.push(
        `Portfolio correlation risk ${(correlationMatrix.portfolioCorrelationRisk * 100).toFixed(1)}% exceeds limit ${(this.config.maxPortfolioCorrelation * 100).toFixed(1)}%`
      );
    }

    // Check diversification score
    if (correlationMatrix.diversificationScore < this.config.minDiversificationScore) {
      violations.push(
        `Diversification score ${correlationMatrix.diversificationScore.toFixed(1)} below minimum ${this.config.minDiversificationScore}`
      );
    }

    return violations;
  }

  /**
   * Generate rebalancing recommendations
   */
  private generateRebalancingRecommendations(
    assetExposures: AssetExposure[],
    sectorExposures: SectorExposure[],
    correlationMatrix: CorrelationMatrix
  ): RebalancingRecommendation[] {
    const recommendations: RebalancingRecommendation[] = [];

    // Recommendations for overexposed assets
    assetExposures.forEach(asset => {
      const targetAllocation = this.config.targetAllocation.get(asset.symbol) || 0;
      const deviation = Math.abs(asset.percentage - targetAllocation);

      if (deviation > this.config.rebalancingThreshold) {
        const priority = asset.percentage > this.config.maxSingleAssetExposure ? 'CRITICAL' : 
                        deviation > this.config.rebalancingThreshold * 2 ? 'HIGH' : 'MEDIUM';

        recommendations.push({
          id: `rebalance-${asset.symbol}-${Date.now()}`,
          type: asset.percentage > targetAllocation ? 'REDUCE_EXPOSURE' : 'INCREASE_EXPOSURE',
          symbol: asset.symbol,
          currentAllocation: asset.percentage,
          targetAllocation,
          action: asset.percentage > targetAllocation 
            ? `Reduce ${asset.symbol} position by ${(asset.percentage - targetAllocation).toFixed(1)}%`
            : `Increase ${asset.symbol} position by ${(targetAllocation - asset.percentage).toFixed(1)}%`,
          riskReduction: this.calculateRiskReduction(asset, targetAllocation),
          priority,
          reasoning: `Current allocation ${asset.percentage.toFixed(1)}% deviates from target ${targetAllocation.toFixed(1)}%`,
          estimatedImpact: {
            portfolioRisk: deviation * -0.1, // Estimated risk reduction
            diversificationImprovement: deviation * 0.05,
            correlationReduction: asset.riskContribution * 0.1
          }
        });
      }
    });

    // Recommendations for high correlation
    if (correlationMatrix.portfolioCorrelationRisk > this.config.maxPortfolioCorrelation) {
      const highestCorrelationPair = this.findHighestCorrelationPair(correlationMatrix.correlations);
      if (highestCorrelationPair) {
        const [symbol1, symbol2] = highestCorrelationPair.pair.split('-');
        const asset1 = assetExposures.find(a => a.symbol === symbol1);
        const asset2 = assetExposures.find(a => a.symbol === symbol2);

        if (asset1 && asset2) {
          const symbolToReduce = asset1.percentage > asset2.percentage ? symbol1 : symbol2;
          
          recommendations.push({
            id: `diversify-${symbolToReduce}-${Date.now()}`,
            type: 'DIVERSIFY',
            symbol: symbolToReduce,
            currentAllocation: (asset1.percentage + asset2.percentage),
            targetAllocation: Math.max(asset1.percentage, asset2.percentage) * 0.7,
            action: `Reduce ${symbolToReduce} to improve diversification`,
            riskReduction: highestCorrelationPair.correlation * 10,
            priority: 'HIGH',
            reasoning: `High correlation ${(highestCorrelationPair.correlation * 100).toFixed(0)}% between ${symbol1} and ${symbol2}`,
            estimatedImpact: {
              portfolioRisk: -5,
              diversificationImprovement: 10,
              correlationReduction: highestCorrelationPair.correlation * 20
            }
          });
        }
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Find highest correlation pair
   */
  private findHighestCorrelationPair(correlations: Map<string, number>): { pair: string; correlation: number } | null {
    let maxCorrelation = 0;
    let maxPair = '';

    correlations.forEach((correlation, pair) => {
      if (Math.abs(correlation) > Math.abs(maxCorrelation)) {
        maxCorrelation = correlation;
        maxPair = pair;
      }
    });

    return maxPair ? { pair: maxPair, correlation: maxCorrelation } : null;
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallRiskScore(
    metrics: PortfolioMetrics,
    violationCount: number,
    correlationMatrix: CorrelationMatrix
  ): number {
    let riskScore = 0;

    // Base risk from concentration
    riskScore += metrics.concentrationRisk * 30;

    // Risk from correlation
    riskScore += correlationMatrix.portfolioCorrelationRisk * 25;

    // Risk from violations
    riskScore += violationCount * 10;

    // Risk from volatility
    riskScore += Math.min(metrics.volatility * 100, 20);

    // Risk from drawdown
    riskScore += Math.min(metrics.maxDrawdown, 15);

    return Math.min(100, Math.max(0, riskScore));
  }

  // Helper methods for calculations
  private calculatePortfolioBeta(positions: Position[], totalValue: number): number {
    // Simplified beta calculation - in production would use historical data
    const cryptoBetas: Record<string, number> = {
      'BTC': 1.0,
      'ETH': 1.2,
      'ADA': 1.5,
      'DOT': 1.3
    };

    let weightedBeta = 0;
    positions.forEach(pos => {
      const weight = (pos.size * pos.currentPrice) / totalValue;
      const beta = cryptoBetas[pos.symbol] || 1.0;
      weightedBeta += weight * beta;
    });

    return weightedBeta;
  }

  private calculatePortfolioVolatility(positions: Position[]): number {
    // Simplified volatility calculation
    return 0.4; // 40% annual volatility for crypto portfolio
  }

  private calculatePortfolioReturn(positions: Position[]): number {
    const totalValue = positions.reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0);
    const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    return totalValue > 0 ? totalPnL / totalValue : 0;
  }

  private calculateMaxDrawdown(positions: Position[]): number {
    // Simplified max drawdown calculation
    return 15; // 15% max drawdown
  }

  private calculateValueAtRisk(positions: Position[], totalValue: number, confidence: number): number {
    const volatility = this.calculatePortfolioVolatility(positions);
    const zScore = confidence === 0.95 ? 1.645 : 2.33; // 95% or 99% confidence
    return totalValue * volatility * zScore / Math.sqrt(252); // Daily VaR
  }

  private calculateExpectedShortfall(positions: Position[], totalValue: number, confidence: number): number {
    const var95 = this.calculateValueAtRisk(positions, totalValue, confidence);
    return var95 * 1.3; // ES is typically 1.3x VaR for normal distribution
  }

  private calculateDiversificationRatio(positions: Position[]): number {
    const uniqueAssets = new Set(positions.map(p => p.symbol)).size;
    const totalPositions = positions.length;
    return uniqueAssets / Math.max(1, totalPositions);
  }

  private calculateConcentrationRisk(positions: Position[], totalValue: number): number {
    const assetValues = new Map<string, number>();
    positions.forEach(pos => {
      const value = pos.size * pos.currentPrice;
      assetValues.set(pos.symbol, (assetValues.get(pos.symbol) || 0) + value);
    });

    const percentages = Array.from(assetValues.values()).map(v => v / totalValue);
    const herfindahlIndex = percentages.reduce((sum, p) => sum + p * p, 0);
    
    return herfindahlIndex; // 0 = perfectly diversified, 1 = concentrated in one asset
  }

  private calculateAssetRiskContribution(symbol: string, positions: Position[], totalValue: number): number {
    const assetValue = positions.reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0);
    const weight = assetValue / totalValue;
    const volatility = 0.5; // Simplified asset volatility
    
    return weight * volatility * 100; // Risk contribution as percentage
  }

  private calculateSectorBeta(assets: AssetExposure[]): number {
    const cryptoBetas: Record<string, number> = {
      'BTC': 1.0, 'ETH': 1.2, 'ADA': 1.5, 'DOT': 1.3
    };

    const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
    let weightedBeta = 0;

    assets.forEach(asset => {
      const weight = asset.value / totalValue;
      const beta = cryptoBetas[asset.symbol] || 1.0;
      weightedBeta += weight * beta;
    });

    return weightedBeta;
  }

  private calculateSectorMarketCorrelation(assets: AssetExposure[]): number {
    // Simplified sector correlation with overall crypto market
    return 0.8; // High correlation with crypto market
  }

  private calculateRiskReduction(asset: AssetExposure, targetAllocation: number): number {
    const currentRisk = asset.riskContribution;
    const targetRisk = currentRisk * (targetAllocation / asset.percentage);
    return currentRisk - targetRisk;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PortfolioRiskConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): PortfolioRiskConfig {
    return { ...this.config };
  }

  /**
   * Get portfolio risk summary
   */
  getPortfolioRiskSummary(report: PortfolioRiskReport): {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    keyRisks: string[];
    topRecommendations: RebalancingRecommendation[];
    diversificationStatus: 'GOOD' | 'FAIR' | 'POOR';
  } {
    const riskLevel = report.overallRiskScore < 25 ? 'LOW' :
                     report.overallRiskScore < 50 ? 'MEDIUM' :
                     report.overallRiskScore < 75 ? 'HIGH' : 'CRITICAL';

    const keyRisks = report.riskViolations.slice(0, 3);
    const topRecommendations = report.rebalancingRecommendations.slice(0, 3);
    
    const diversificationStatus = report.correlationMatrix.diversificationScore > 70 ? 'GOOD' :
                                 report.correlationMatrix.diversificationScore > 40 ? 'FAIR' : 'POOR';

    return {
      riskLevel,
      keyRisks,
      topRecommendations,
      diversificationStatus
    };
  }
}