/**
 * Advanced Risk Management System
 * 
 * Comprehensive risk management system with:
 * - Dynamic position sizing engine
 * - Trailing stop loss system
 * - Risk-reward ratio enforcement
 * - Capital preservation system
 * - Portfolio risk management
 */

// Core types
export * from './types.js';

// Position sizing
export { PositionSizingEngine } from './position-sizing-engine.js';

// Trailing stops
export { 
  TrailingStopManager,
  type MarketConditions,
  type TrailingStopUpdate
} from './trailing-stop-manager.js';

// Risk-reward enforcement
export { 
  RiskRewardEnforcer,
  type TradeProposal,
  type RiskRewardAnalysis,
  type RREnforcementConfig,
  type RROptimization,
  type RRPerformanceMetrics
} from './risk-reward-enforcer.js';

// Capital preservation
export { 
  CapitalPreservationSystem,
  type CapitalProtectionConfig,
  type AccountSnapshot,
  type DrawdownPeriod,
  type EmergencyAction,
  type LossLimits
} from './capital-preservation-system.js';

// Portfolio risk management
export { 
  PortfolioRiskManager,
  type PortfolioRiskConfig,
  type PortfolioMetrics,
  type AssetExposure,
  type SectorExposure,
  type RebalancingRecommendation,
  type PortfolioRiskReport
} from './portfolio-risk-manager.js';

/**
 * Default risk management configurations
 */
export const DEFAULT_RISK_PARAMETERS = {
  maxRiskPerTrade: 2.5, // 2.5% max risk per trade
  minRiskRewardRatio: 1.3,
  maxDrawdownThreshold: 15,
  maxCorrelationExposure: 0.7,
  volatilityAdjustmentFactor: 0.3
};

export const DEFAULT_TRAILING_STOP_CONFIG = {
  initialStopLoss: 1.0, // 1% initial stop loss
  trailingDistance: 1.5, // 1.5% trailing distance
  minProfitToTrail: 0.5, // Start trailing at 0.5% profit
  breakevenThreshold: 2.0, // Move to breakeven at 2% profit
  volatilityAdjustment: true
};

export const DEFAULT_RR_ENFORCEMENT_CONFIG = {
  minRiskRewardRatio: 1.3,
  preferredRiskRewardRatio: 2.0,
  maxRiskPercentage: 3.0,
  enableDynamicAdjustment: true,
  marketConditionAdjustments: {
    bullish: 0.9,
    bearish: 1.2,
    sideways: 1.1,
    highVolatility: 1.3,
    lowVolatility: 0.8
  }
};

export const DEFAULT_CAPITAL_PROTECTION_CONFIG = {
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

export const DEFAULT_PORTFOLIO_RISK_CONFIG = {
  maxPortfolioCorrelation: 0.7,
  maxSingleAssetExposure: 40, // 40% max single asset
  maxSectorExposure: 60, // 60% max sector
  minDiversificationScore: 50,
  maxPortfolioBeta: 1.5,
  rebalancingThreshold: 5, // 5% deviation threshold
  targetAllocation: new Map([
    ['BTC', 30],
    ['ETH', 25],
    ['ADA', 20],
    ['DOT', 15],
    ['LINK', 10]
  ])
};

/**
 * Integrated Risk Management System
 * 
 * Combines all risk management components into a unified system
 */
export class IntegratedRiskManager {
  private positionSizingEngine: PositionSizingEngine;
  private trailingStopManager: TrailingStopManager;
  private riskRewardEnforcer: RiskRewardEnforcer;
  private capitalPreservationSystem: CapitalPreservationSystem;
  private portfolioRiskManager: PortfolioRiskManager;

  constructor(
    riskParameters = DEFAULT_RISK_PARAMETERS,
    trailingStopConfig = DEFAULT_TRAILING_STOP_CONFIG,
    rrEnforcementConfig = DEFAULT_RR_ENFORCEMENT_CONFIG,
    capitalProtectionConfig = DEFAULT_CAPITAL_PROTECTION_CONFIG,
    portfolioRiskConfig = DEFAULT_PORTFOLIO_RISK_CONFIG
  ) {
    this.positionSizingEngine = new PositionSizingEngine(riskParameters);
    this.trailingStopManager = new TrailingStopManager();
    this.riskRewardEnforcer = new RiskRewardEnforcer(rrEnforcementConfig);
    this.capitalPreservationSystem = new CapitalPreservationSystem(capitalProtectionConfig);
    this.portfolioRiskManager = new PortfolioRiskManager(portfolioRiskConfig);
  }

  /**
   * Get all risk management components
   */
  getComponents() {
    return {
      positionSizing: this.positionSizingEngine,
      trailingStops: this.trailingStopManager,
      riskReward: this.riskRewardEnforcer,
      capitalPreservation: this.capitalPreservationSystem,
      portfolioRisk: this.portfolioRiskManager
    };
  }

  /**
   * Perform comprehensive risk analysis
   */
  async performComprehensiveRiskAnalysis(
    positions: any[],
    accountBalance: number,
    dailyPnL: number,
    weeklyPnL: number,
    monthlyPnL: number
  ) {
    // Capital preservation monitoring
    const capitalPreservationResult = await this.capitalPreservationSystem.monitorCapitalPreservation(
      accountBalance,
      positions,
      dailyPnL,
      weeklyPnL,
      monthlyPnL
    );

    // Portfolio risk analysis
    const portfolioRiskReport = await this.portfolioRiskManager.analyzePortfolioRisk(positions);

    // Get portfolio risk summary
    const portfolioRiskSummary = this.portfolioRiskManager.getPortfolioRiskSummary(portfolioRiskReport);

    // Get capital preservation stats
    const capitalPreservationStats = this.capitalPreservationSystem.getCapitalPreservationStats();

    // Get risk-reward performance metrics
    const rrPerformanceMetrics = this.riskRewardEnforcer.getPerformanceMetrics();

    return {
      capitalPreservation: {
        status: capitalPreservationResult,
        stats: capitalPreservationStats
      },
      portfolioRisk: {
        report: portfolioRiskReport,
        summary: portfolioRiskSummary
      },
      riskRewardPerformance: rrPerformanceMetrics,
      overallRiskAssessment: {
        tradingAllowed: capitalPreservationResult.tradingAllowed,
        riskLevel: portfolioRiskSummary.riskLevel,
        keyRisks: [
          ...capitalPreservationResult.alerts.map(a => a.message),
          ...portfolioRiskSummary.keyRisks
        ],
        recommendations: [
          ...portfolioRiskSummary.topRecommendations.map(r => r.action),
          ...capitalPreservationResult.alerts.flatMap(a => a.recommendedActions)
        ]
      }
    };
  }
}