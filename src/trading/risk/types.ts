/**
 * Risk Management Types
 * 
 * Defines interfaces and types for the advanced risk management system
 * including position sizing, risk assessment, and capital protection.
 */

export interface RiskParameters {
  /** Maximum risk per trade as percentage of account balance (2-3%) */
  maxRiskPerTrade: number;
  /** Minimum risk-reward ratio (1.3:1 minimum) */
  minRiskRewardRatio: number;
  /** Maximum drawdown threshold before emergency measures */
  maxDrawdownThreshold: number;
  /** Maximum correlation exposure limit */
  maxCorrelationExposure: number;
  /** Volatility adjustment factor */
  volatilityAdjustmentFactor: number;
}

export interface PositionSizeRequest {
  /** Trading symbol (BTC, ETH) */
  symbol: string;
  /** Current account balance */
  accountBalance: number;
  /** Entry price for the position */
  entryPrice: number;
  /** Stop loss price */
  stopLossPrice: number;
  /** Take profit price */
  takeProfitPrice: number;
  /** Signal confidence score (0-100) */
  confidence: number;
  /** Current market volatility */
  volatility: number;
  /** Existing positions for correlation analysis */
  existingPositions: Position[];
}

export interface PositionSizeResult {
  /** Recommended position size in base currency */
  positionSize: number;
  /** Risk amount in account currency */
  riskAmount: number;
  /** Risk percentage of account balance */
  riskPercentage: number;
  /** Risk-reward ratio */
  riskRewardRatio: number;
  /** Confidence-adjusted size */
  confidenceAdjustedSize: number;
  /** Correlation adjustment factor */
  correlationAdjustment: number;
  /** Approval status */
  approved: boolean;
  /** Rejection reasons if not approved */
  rejectionReasons: string[];
}

export interface Position {
  /** Position ID */
  id: string;
  /** Trading symbol */
  symbol: string;
  /** Position size */
  size: number;
  /** Entry price */
  entryPrice: number;
  /** Current price */
  currentPrice: number;
  /** Position type */
  type: 'LONG' | 'SHORT';
  /** Unrealized P&L */
  unrealizedPnL: number;
  /** Stop loss price */
  stopLoss: number;
  /** Take profit price */
  takeProfit: number;
  /** Position timestamp */
  timestamp: Date;
}

export interface TrailingStopConfig {
  /** Initial stop loss percentage */
  initialStopLoss: number;
  /** Trailing distance percentage */
  trailingDistance: number;
  /** Minimum profit before trailing starts */
  minProfitToTrail: number;
  /** Breakeven activation threshold */
  breakevenThreshold: number;
  /** Volatility-based adjustment */
  volatilityAdjustment: boolean;
}

export interface TrailingStopResult {
  /** New stop loss price */
  newStopLoss: number;
  /** Whether stop was updated */
  updated: boolean;
  /** Current trailing distance */
  trailingDistance: number;
  /** Breakeven status */
  breakevenActive: boolean;
  /** Reason for update or no update */
  reason: string;
}

export interface RiskAssessment {
  /** Overall risk score (0-100) */
  riskScore: number;
  /** Risk-reward ratio */
  riskRewardRatio: number;
  /** Maximum potential loss */
  maxLoss: number;
  /** Probability of success */
  probabilityOfSuccess: number;
  /** Recommendation */
  recommendation: 'APPROVE' | 'REJECT' | 'MODIFY';
  /** Suggested modifications */
  modifications: string[];
  /** Risk factors identified */
  riskFactors: string[];
}

export interface DrawdownStatus {
  /** Current drawdown percentage */
  currentDrawdown: number;
  /** Maximum historical drawdown */
  maxDrawdown: number;
  /** Drawdown duration in days */
  drawdownDuration: number;
  /** Recovery progress percentage */
  recoveryProgress: number;
  /** Emergency measures active */
  emergencyMeasuresActive: boolean;
  /** Risk reduction level (0-100) */
  riskReductionLevel: number;
}

export interface CorrelationMatrix {
  /** Symbol pairs and their correlation coefficients */
  correlations: Map<string, number>;
  /** Overall portfolio correlation risk */
  portfolioCorrelationRisk: number;
  /** Diversification score */
  diversificationScore: number;
  /** Recommended position adjustments */
  recommendations: PositionAdjustment[];
}

export interface PositionAdjustment {
  /** Symbol to adjust */
  symbol: string;
  /** Current position size */
  currentSize: number;
  /** Recommended new size */
  recommendedSize: number;
  /** Adjustment reason */
  reason: string;
  /** Priority level */
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface CapitalProtectionAlert {
  /** Alert ID */
  id: string;
  /** Alert type */
  type: 'DRAWDOWN_WARNING' | 'EMERGENCY_STOP' | 'CORRELATION_RISK' | 'VOLATILITY_SPIKE';
  /** Alert severity */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Alert message */
  message: string;
  /** Recommended actions */
  recommendedActions: string[];
  /** Timestamp */
  timestamp: Date;
  /** Auto-executed actions */
  autoExecutedActions: string[];
}

export interface RiskMetrics {
  /** Sharpe ratio */
  sharpeRatio: number;
  /** Sortino ratio */
  sortinoRatio: number;
  /** Maximum drawdown */
  maxDrawdown: number;
  /** Value at Risk (VaR) */
  valueAtRisk: number;
  /** Expected shortfall */
  expectedShortfall: number;
  /** Win rate percentage */
  winRate: number;
  /** Average risk-reward ratio */
  avgRiskRewardRatio: number;
  /** Volatility */
  volatility: number;
}
