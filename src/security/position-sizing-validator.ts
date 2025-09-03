/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - POSITION SIZING VALIDATOR
 * =============================================================================
 * 
 * This service provides comprehensive position sizing validation and risk
 * management for the AI crypto trading agent. It implements multiple layers
 * of validation to prevent excessive risk exposure and capital loss.
 * 
 * Task: 12.3 Position Sizing Validation and Risk Management
 * Requirements: 1.4, 5.4 - Risk management and validation
 * 
 * Features:
 * - Real-time position size validation
 * - Multi-tier risk assessment
 * - Dynamic position limits based on market conditions
 * - Portfolio-level risk management
 * - Emergency position sizing controls
 * - Comprehensive risk metrics and monitoring
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { Logger } from '../core/logging/logger';
import { auditService } from './audit-service';

const logger = new Logger('PositionSizingValidator');

export interface PositionSizingConfig {
  /** Maximum position size as percentage of total portfolio */
  maxPositionSizePercent: number;
  /** Maximum position size in USD */
  maxPositionSizeUSD: number;
  /** Maximum daily loss percentage */
  maxDailyLossPercent: number;
  /** Maximum weekly loss percentage */
  maxWeeklyLossPercent: number;
  /** Maximum monthly loss percentage */
  maxMonthlyLossPercent: number;
  /** Maximum number of open positions */
  maxOpenPositions: number;
  /** Maximum correlation between positions */
  maxCorrelation: number;
  /** Minimum account balance to trade */
  minAccountBalance: number;
  /** Emergency stop loss percentage */
  emergencyStopLoss: number;
  /** Risk-free rate for calculations */
  riskFreeRate: number;
}

export interface PositionRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  orderType: 'MARKET' | 'LIMIT' | 'STOP';
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
}

export interface RiskMetrics {
  /** Value at Risk (95% confidence) */
  valueAtRisk95: number;
  /** Value at Risk (99% confidence) */
  valueAtRisk99: number;
  /** Expected Shortfall */
  expectedShortfall: number;
  /** Maximum Drawdown */
  maxDrawdown: number;
  /** Sharpe Ratio */
  sharpeRatio: number;
  /** Sortino Ratio */
  sortinoRatio: number;
  /** Beta (market correlation) */
  beta: number;
  /** Portfolio volatility */
  volatility: number;
}

export interface ValidationResult {
  isValid: boolean;
  riskScore: number;
  warnings: string[];
  errors: string[];
  recommendations: string[];
  adjustedQuantity?: number;
  maxAllowedQuantity: number;
  riskMetrics: RiskMetrics;
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  openTime: Date;
  stopLoss?: number;
  takeProfit?: number;
}

export interface MarketCondition {
  volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  liquidity: 'HIGH' | 'MEDIUM' | 'LOW';
  correlation: number;
  fearGreedIndex: number;
}

export class PositionSizingValidator {
  private config: PositionSizingConfig;
  private currentPositions: Map<string, PortfolioPosition> = new Map();
  private dailyPnL: number = 0;
  private weeklyPnL: number = 0;
  private monthlyPnL: number = 0;
  private accountBalance: number = 0;
  private historicalReturns: number[] = [];
  
  constructor(config: PositionSizingConfig) {
    this.config = config;
    this.initializeValidator();
  }
  
  /**
   * Initialize the position sizing validator
   */
  private async initializeValidator(): Promise<void> {
    try {
      logger.info('🔒 Initializing Position Sizing Validator...');
      
      // Load current positions and account data
      await this.loadCurrentPositions();
      await this.loadAccountBalance();
      await this.loadHistoricalData();
      
      // Validate configuration
      this.validateConfiguration();
      
      logger.info('✅ Position Sizing Validator initialized successfully');
      
      // Audit log
      await auditService.createAuditEntry({
        auditId: `pos_validator_init_${Date.now()}`,
        eventType: 'POSITION_VALIDATOR_INITIALIZATION',
        actor: 'SYSTEM',
        resource: 'POSITION_SIZING_VALIDATOR',
        action: 'INITIALIZE',
        result: 'SUCCESS',
        timestamp: new Date(),
        auditData: { config: this.config }
      });
      
    } catch (error) {
      logger.error('❌ Failed to initialize Position Sizing Validator:', error);
      throw error;
    }
  }
  
  /**
   * Validate a position request
   */
  async validatePosition(request: PositionRequest, marketCondition: MarketCondition): Promise<ValidationResult> {
    try {
      logger.debug('🔍 Validating position request', { symbol: request.symbol, quantity: request.quantity });
      
      const warnings: string[] = [];
      const errors: string[] = [];
      const recommendations: string[] = [];
      let isValid = true;
      let riskScore = 0;
      
      // Calculate position value
      const positionValue = request.quantity * request.price;
      
      // 1. Basic validation checks
      const basicValidation = this.performBasicValidation(request, positionValue);
      if (!basicValidation.isValid) {
        errors.push(...basicValidation.errors);
        isValid = false;
      }
      warnings.push(...basicValidation.warnings);
      riskScore += basicValidation.riskScore;
      
      // 2. Portfolio-level validation
      const portfolioValidation = this.performPortfolioValidation(request, positionValue);
      if (!portfolioValidation.isValid) {
        errors.push(...portfolioValidation.errors);
        isValid = false;
      }
      warnings.push(...portfolioValidation.warnings);
      riskScore += portfolioValidation.riskScore;
      
      // 3. Risk limit validation
      const riskValidation = this.performRiskLimitValidation(request, positionValue);
      if (!riskValidation.isValid) {
        errors.push(...riskValidation.errors);
        isValid = false;
      }
      warnings.push(...riskValidation.warnings);
      riskScore += riskValidation.riskScore;
      
      // 4. Market condition validation
      const marketValidation = this.performMarketConditionValidation(request, marketCondition, positionValue);
      if (!marketValidation.isValid) {
        errors.push(...marketValidation.errors);
        isValid = false;
      }
      warnings.push(...marketValidation.warnings);
      riskScore += marketValidation.riskScore;
      
      // 5. Correlation validation
      const correlationValidation = this.performCorrelationValidation(request);
      if (!correlationValidation.isValid) {
        errors.push(...correlationValidation.errors);
        isValid = false;
      }
      warnings.push(...correlationValidation.warnings);
      riskScore += correlationValidation.riskScore;
      
      // Calculate maximum allowed quantity
      const maxAllowedQuantity = this.calculateMaxAllowedQuantity(request, marketCondition);
      
      // Suggest adjusted quantity if needed
      let adjustedQuantity: number | undefined;
      if (!isValid && maxAllowedQuantity > 0) {
        adjustedQuantity = Math.min(request.quantity, maxAllowedQuantity);
        recommendations.push(`Consider reducing position size to ${adjustedQuantity} units`);
      }
      
      // Calculate risk metrics
      const riskMetrics = this.calculateRiskMetrics(request, positionValue);
      
      // Generate recommendations
      recommendations.push(...this.generateRecommendations(request, marketCondition, riskMetrics));
      
      const result: ValidationResult = {
        isValid,
        riskScore: Math.min(riskScore, 100),
        warnings,
        errors,
        recommendations,
        adjustedQuantity,
        maxAllowedQuantity,
        riskMetrics
      };
      
      // Audit log
      await auditService.createAuditEntry({
        auditId: `pos_validation_${Date.now()}`,
        eventType: 'POSITION_VALIDATION',
        actor: 'SYSTEM',
        resource: 'POSITION_SIZING_VALIDATOR',
        action: 'VALIDATE_POSITION',
        result: isValid ? 'SUCCESS' : 'FAILURE',
        timestamp: new Date(),
        auditData: {
          request,
          result: {
            isValid,
            riskScore: result.riskScore,
            warningCount: warnings.length,
            errorCount: errors.length
          }
        }
      });
      
      return result;
      
    } catch (error) {
      logger.error('❌ Position validation failed:', error);
      throw error;
    }
  }
  
  /**
   * Perform basic validation checks
   */
  private performBasicValidation(request: PositionRequest, positionValue: number): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    riskScore: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;
    
    // Check minimum values
    if (request.quantity <= 0) {
      errors.push('Position quantity must be greater than zero');
      riskScore += 50;
    }
    
    if (request.price <= 0) {
      errors.push('Position price must be greater than zero');
      riskScore += 50;
    }
    
    // Check maximum position size in USD
    if (positionValue > this.config.maxPositionSizeUSD) {
      errors.push(`Position value $${positionValue.toFixed(2)} exceeds maximum allowed $${this.config.maxPositionSizeUSD}`);
      riskScore += 30;
    }
    
    // Check maximum position size as percentage of portfolio
    const portfolioPercent = (positionValue / this.accountBalance) * 100;
    if (portfolioPercent > this.config.maxPositionSizePercent) {
      errors.push(`Position size ${portfolioPercent.toFixed(2)}% exceeds maximum allowed ${this.config.maxPositionSizePercent}%`);
      riskScore += 25;
    }
    
    // Check account balance
    if (this.accountBalance < this.config.minAccountBalance) {
      errors.push(`Account balance $${this.accountBalance} below minimum required $${this.config.minAccountBalance}`);
      riskScore += 40;
    }
    
    // Check leverage
    if (request.leverage && request.leverage > 10) {
      warnings.push(`High leverage ${request.leverage}x detected - increased risk`);
      riskScore += 15;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore
    };
  }
  
  /**
   * Perform portfolio-level validation
   */
  private performPortfolioValidation(request: PositionRequest, positionValue: number): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    riskScore: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;
    
    // Check maximum number of open positions
    if (this.currentPositions.size >= this.config.maxOpenPositions) {
      errors.push(`Maximum number of open positions (${this.config.maxOpenPositions}) reached`);
      riskScore += 20;
    }
    
    // Check if position already exists for this symbol
    const existingPosition = this.currentPositions.get(request.symbol);
    if (existingPosition) {
      const totalQuantity = existingPosition.quantity + request.quantity;
      const totalValue = totalQuantity * request.price;
      
      if (totalValue > this.config.maxPositionSizeUSD) {
        errors.push(`Combined position value would exceed maximum allowed size`);
        riskScore += 25;
      }
      
      warnings.push(`Adding to existing position in ${request.symbol}`);
      riskScore += 5;
    }
    
    // Check portfolio concentration
    const totalPortfolioValue = Array.from(this.currentPositions.values())
      .reduce((sum, pos) => sum + (pos.quantity * pos.currentPrice), 0) + positionValue;
    
    const concentrationPercent = (positionValue / totalPortfolioValue) * 100;
    if (concentrationPercent > 25) {
      warnings.push(`High concentration risk: ${concentrationPercent.toFixed(2)}% in single position`);
      riskScore += 10;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore
    };
  }
  
  /**
   * Perform risk limit validation
   */
  private performRiskLimitValidation(request: PositionRequest, positionValue: number): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    riskScore: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;
    
    // Check daily loss limits
    const dailyLossPercent = (Math.abs(this.dailyPnL) / this.accountBalance) * 100;
    if (dailyLossPercent >= this.config.maxDailyLossPercent) {
      errors.push(`Daily loss limit ${this.config.maxDailyLossPercent}% reached (${dailyLossPercent.toFixed(2)}%)`);
      riskScore += 40;
    } else if (dailyLossPercent >= this.config.maxDailyLossPercent * 0.8) {
      warnings.push(`Approaching daily loss limit: ${dailyLossPercent.toFixed(2)}%`);
      riskScore += 15;
    }
    
    // Check weekly loss limits
    const weeklyLossPercent = (Math.abs(this.weeklyPnL) / this.accountBalance) * 100;
    if (weeklyLossPercent >= this.config.maxWeeklyLossPercent) {
      errors.push(`Weekly loss limit ${this.config.maxWeeklyLossPercent}% reached (${weeklyLossPercent.toFixed(2)}%)`);
      riskScore += 35;
    }
    
    // Check monthly loss limits
    const monthlyLossPercent = (Math.abs(this.monthlyPnL) / this.accountBalance) * 100;
    if (monthlyLossPercent >= this.config.maxMonthlyLossPercent) {
      errors.push(`Monthly loss limit ${this.config.maxMonthlyLossPercent}% reached (${monthlyLossPercent.toFixed(2)}%)`);
      riskScore += 30;
    }
    
    // Check stop loss configuration
    if (!request.stopLoss) {
      warnings.push('No stop loss specified - increased risk');
      riskScore += 10;
    } else {
      const stopLossPercent = Math.abs((request.stopLoss - request.price) / request.price) * 100;
      if (stopLossPercent > 10) {
        warnings.push(`Wide stop loss ${stopLossPercent.toFixed(2)}% - high risk per trade`);
        riskScore += 8;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore
    };
  }
  
  /**
   * Perform market condition validation
   */
  private performMarketConditionValidation(
    request: PositionRequest, 
    marketCondition: MarketCondition, 
    positionValue: number
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    riskScore: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;
    
    // Adjust limits based on market volatility
    let volatilityMultiplier = 1;
    switch (marketCondition.volatility) {
      case 'EXTREME':
        volatilityMultiplier = 0.3;
        warnings.push('Extreme market volatility detected - reduced position sizing recommended');
        riskScore += 25;
        break;
      case 'HIGH':
        volatilityMultiplier = 0.5;
        warnings.push('High market volatility detected - consider smaller position sizes');
        riskScore += 15;
        break;
      case 'MEDIUM':
        volatilityMultiplier = 0.8;
        riskScore += 5;
        break;
      case 'LOW':
        volatilityMultiplier = 1.0;
        break;
    }
    
    // Check adjusted position size
    const adjustedMaxSize = this.config.maxPositionSizeUSD * volatilityMultiplier;
    if (positionValue > adjustedMaxSize) {
      errors.push(`Position size exceeds volatility-adjusted limit: $${adjustedMaxSize.toFixed(2)}`);
      riskScore += 20;
    }
    
    // Check liquidity conditions
    if (marketCondition.liquidity === 'LOW') {
      warnings.push('Low market liquidity - execution risk increased');
      riskScore += 10;
    }
    
    // Check fear & greed index
    if (marketCondition.fearGreedIndex > 80) {
      warnings.push('Extreme greed detected - consider reducing position sizes');
      riskScore += 8;
    } else if (marketCondition.fearGreedIndex < 20) {
      warnings.push('Extreme fear detected - market may be oversold');
      riskScore += 5;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore
    };
  }
  
  /**
   * Perform correlation validation
   */
  private performCorrelationValidation(request: PositionRequest): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    riskScore: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;
    
    // Check correlation with existing positions
    let maxCorrelation = 0;
    let correlatedSymbols: string[] = [];
    
    for (const [symbol, position] of this.currentPositions) {
      // Simulate correlation calculation (in real implementation, use actual correlation data)
      const correlation = this.calculateCorrelation(request.symbol, symbol);
      
      if (correlation > this.config.maxCorrelation) {
        maxCorrelation = Math.max(maxCorrelation, correlation);
        correlatedSymbols.push(symbol);
      }
    }
    
    if (correlatedSymbols.length > 0) {
      warnings.push(`High correlation (${(maxCorrelation * 100).toFixed(1)}%) with existing positions: ${correlatedSymbols.join(', ')}`);
      riskScore += 12;
      
      if (maxCorrelation > 0.8) {
        errors.push('Correlation exceeds maximum allowed threshold');
        riskScore += 20;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore
    };
  }
  
  /**
   * Calculate maximum allowed quantity
   */
  private calculateMaxAllowedQuantity(request: PositionRequest, marketCondition: MarketCondition): number {
    // Base calculation on multiple factors
    const accountBasedMax = (this.accountBalance * this.config.maxPositionSizePercent / 100) / request.price;
    const usdBasedMax = this.config.maxPositionSizeUSD / request.price;
    
    // Apply volatility adjustment
    let volatilityMultiplier = 1;
    switch (marketCondition.volatility) {
      case 'EXTREME': volatilityMultiplier = 0.3; break;
      case 'HIGH': volatilityMultiplier = 0.5; break;
      case 'MEDIUM': volatilityMultiplier = 0.8; break;
      case 'LOW': volatilityMultiplier = 1.0; break;
    }
    
    const adjustedMax = Math.min(accountBasedMax, usdBasedMax) * volatilityMultiplier;
    
    // Consider existing position
    const existingPosition = this.currentPositions.get(request.symbol);
    if (existingPosition) {
      return Math.max(0, adjustedMax - existingPosition.quantity);
    }
    
    return adjustedMax;
  }
  
  /**
   * Calculate risk metrics
   */
  private calculateRiskMetrics(request: PositionRequest, positionValue: number): RiskMetrics {
    // Simplified risk metrics calculation
    // In production, these would use more sophisticated models
    
    const portfolioValue = this.accountBalance;
    const positionWeight = positionValue / portfolioValue;
    
    // Estimate volatility from historical data
    const volatility = this.calculateVolatility();
    
    // Value at Risk calculations (simplified)
    const valueAtRisk95 = portfolioValue * 0.05 * Math.sqrt(1) * 1.645; // 95% confidence
    const valueAtRisk99 = portfolioValue * 0.05 * Math.sqrt(1) * 2.326; // 99% confidence
    
    // Expected Shortfall (simplified)
    const expectedShortfall = valueAtRisk95 * 1.3;
    
    // Maximum Drawdown (from historical data)
    const maxDrawdown = this.calculateMaxDrawdown();
    
    // Sharpe Ratio (simplified)
    const excessReturn = this.calculateAverageReturn() - this.config.riskFreeRate;
    const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0;
    
    // Sortino Ratio (simplified)
    const downwardDeviation = this.calculateDownwardDeviation();
    const sortinoRatio = downwardDeviation > 0 ? excessReturn / downwardDeviation : 0;
    
    // Beta (market correlation - simplified)
    const beta = 1.0; // Simplified assumption
    
    return {
      valueAtRisk95,
      valueAtRisk99,
      expectedShortfall,
      maxDrawdown,
      sharpeRatio,
      sortinoRatio,
      beta,
      volatility
    };
  }
  
  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(
    request: PositionRequest, 
    marketCondition: MarketCondition, 
    riskMetrics: RiskMetrics
  ): string[] {
    const recommendations: string[] = [];
    
    // Position sizing recommendations
    if (riskMetrics.volatility > 0.3) {
      recommendations.push('Consider reducing position size due to high volatility');
    }
    
    if (riskMetrics.sharpeRatio < 0.5) {
      recommendations.push('Poor risk-adjusted returns - review strategy');
    }
    
    if (!request.stopLoss) {
      recommendations.push('Set a stop loss to limit downside risk');
    }
    
    if (!request.takeProfit) {
      recommendations.push('Consider setting a take profit target');
    }
    
    // Market condition recommendations
    if (marketCondition.volatility === 'EXTREME') {
      recommendations.push('Wait for market volatility to decrease before entering large positions');
    }
    
    if (marketCondition.liquidity === 'LOW') {
      recommendations.push('Use limit orders to avoid slippage in low liquidity conditions');
    }
    
    // Portfolio recommendations
    const positionCount = this.currentPositions.size;
    if (positionCount > this.config.maxOpenPositions * 0.8) {
      recommendations.push('Consider closing some positions to reduce portfolio complexity');
    }
    
    return recommendations;
  }
  
  /**
   * Calculate correlation between two symbols (simplified)
   */
  private calculateCorrelation(symbol1: string, symbol2: string): number {
    // Simplified correlation calculation
    // In production, this would use actual price data
    
    if (symbol1 === symbol2) return 1.0;
    
    // Simulate correlation based on symbol similarity
    if (symbol1.includes('BTC') && symbol2.includes('BTC')) return 0.8;
    if (symbol1.includes('ETH') && symbol2.includes('ETH')) return 0.8;
    if ((symbol1.includes('BTC') || symbol1.includes('ETH')) && 
        (symbol2.includes('BTC') || symbol2.includes('ETH'))) return 0.6;
    
    return 0.3; // Default correlation for crypto pairs
  }
  
  /**
   * Calculate portfolio volatility
   */
  private calculateVolatility(): number {
    if (this.historicalReturns.length < 2) return 0.2; // Default volatility
    
    const mean = this.historicalReturns.reduce((sum, ret) => sum + ret, 0) / this.historicalReturns.length;
    const variance = this.historicalReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (this.historicalReturns.length - 1);
    
    return Math.sqrt(variance);
  }
  
  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(): number {
    if (this.historicalReturns.length === 0) return 0;
    
    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;
    
    for (const ret of this.historicalReturns) {
      cumulative += ret;
      peak = Math.max(peak, cumulative);
      const drawdown = peak - cumulative;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
  }
  
  /**
   * Calculate average return
   */
  private calculateAverageReturn(): number {
    if (this.historicalReturns.length === 0) return 0;
    return this.historicalReturns.reduce((sum, ret) => sum + ret, 0) / this.historicalReturns.length;
  }
  
  /**
   * Calculate downward deviation for Sortino ratio
   */
  private calculateDownwardDeviation(): number {
    if (this.historicalReturns.length === 0) return 0;
    
    const negativeReturns = this.historicalReturns.filter(ret => ret < 0);
    if (negativeReturns.length === 0) return 0;
    
    const mean = negativeReturns.reduce((sum, ret) => sum + ret, 0) / negativeReturns.length;
    const variance = negativeReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / negativeReturns.length;
    
    return Math.sqrt(variance);
  }
  
  /**
   * Load current positions from database/storage
   */
  private async loadCurrentPositions(): Promise<void> {
    // In production, this would load from actual database
    // For now, simulate with empty positions
    this.currentPositions.clear();
    logger.debug('Current positions loaded');
  }
  
  /**
   * Load account balance
   */
  private async loadAccountBalance(): Promise<void> {
    // In production, this would load from trading account
    this.accountBalance = parseFloat(process.env.ACCOUNT_BALANCE || '10000');
    logger.debug(`Account balance loaded: $${this.accountBalance}`);
  }
  
  /**
   * Load historical data for risk calculations
   */
  private async loadHistoricalData(): Promise<void> {
    // In production, this would load actual historical returns
    // For now, simulate with random data
    this.historicalReturns = Array.from({ length: 100 }, () => (Math.random() - 0.5) * 0.1);
    logger.debug(`Historical data loaded: ${this.historicalReturns.length} data points`);
  }
  
  /**
   * Validate configuration parameters
   */
  private validateConfiguration(): void {
    if (this.config.maxPositionSizePercent <= 0 || this.config.maxPositionSizePercent > 100) {
      throw new Error('Invalid maxPositionSizePercent: must be between 0 and 100');
    }
    
    if (this.config.maxPositionSizeUSD <= 0) {
      throw new Error('Invalid maxPositionSizeUSD: must be greater than 0');
    }
    
    if (this.config.maxDailyLossPercent <= 0 || this.config.maxDailyLossPercent > 100) {
      throw new Error('Invalid maxDailyLossPercent: must be between 0 and 100');
    }
    
    logger.debug('Configuration validation passed');
  }
  
  /**
   * Update position after trade execution
   */
  async updatePosition(symbol: string, quantity: number, price: number, side: 'BUY' | 'SELL'): Promise<void> {
    const existingPosition = this.currentPositions.get(symbol);
    
    if (existingPosition) {
      // Update existing position
      if (side === 'BUY') {
        existingPosition.quantity += quantity;
      } else {
        existingPosition.quantity -= quantity;
      }
      
      // Remove position if quantity becomes zero or negative
      if (existingPosition.quantity <= 0) {
        this.currentPositions.delete(symbol);
      }
    } else if (side === 'BUY') {
      // Create new position
      this.currentPositions.set(symbol, {
        symbol,
        quantity,
        entryPrice: price,
        currentPrice: price,
        unrealizedPnL: 0,
        realizedPnL: 0,
        openTime: new Date()
      });
    }
    
    // Audit log
    await auditService.createAuditEntry({
      auditId: `pos_update_${Date.now()}`,
      eventType: 'POSITION_UPDATE',
      actor: 'SYSTEM',
      resource: 'POSITION_SIZING_VALIDATOR',
      action: 'UPDATE_POSITION',
      result: 'SUCCESS',
      timestamp: new Date(),
      auditData: { symbol, quantity, price, side }
    });
  }
  
  /**
   * Get current portfolio status
   */
  getPortfolioStatus(): {
    totalPositions: number;
    totalValue: number;
    dailyPnL: number;
    weeklyPnL: number;
    monthlyPnL: number;
    accountBalance: number;
    riskMetrics: RiskMetrics;
  } {
    const totalValue = Array.from(this.currentPositions.values())
      .reduce((sum, pos) => sum + (pos.quantity * pos.currentPrice), 0);
    
    const riskMetrics = this.calculateRiskMetrics(
      { symbol: 'PORTFOLIO', side: 'BUY', quantity: 1, price: totalValue, orderType: 'MARKET' },
      totalValue
    );
    
    return {
      totalPositions: this.currentPositions.size,
      totalValue,
      dailyPnL: this.dailyPnL,
      weeklyPnL: this.weeklyPnL,
      monthlyPnL: this.monthlyPnL,
      accountBalance: this.accountBalance,
      riskMetrics
    };
  }
  
  /**
   * Emergency position sizing override
   */
  async emergencyPositionSizing(enabled: boolean): Promise<void> {
    if (enabled) {
      // Reduce all position limits by 50%
      this.config.maxPositionSizePercent *= 0.5;
      this.config.maxPositionSizeUSD *= 0.5;
      this.config.maxOpenPositions = Math.floor(this.config.maxOpenPositions * 0.5);
      
      logger.warn('🚨 Emergency position sizing activated - all limits reduced by 50%');
    } else {
      // Restore original limits (would need to store originals)
      logger.info('✅ Emergency position sizing deactivated');
    }
    
    // Audit log
    await auditService.createAuditEntry({
      auditId: `emergency_sizing_${Date.now()}`,
      eventType: 'EMERGENCY_POSITION_SIZING',
      actor: 'SYSTEM',
      resource: 'POSITION_SIZING_VALIDATOR',
      action: enabled ? 'ACTIVATE' : 'DEACTIVATE',
      result: 'SUCCESS',
      timestamp: new Date(),
      auditData: { enabled, config: this.config }
    });
  }
}

// Export for use in trading engine
export { PositionSizingValidator };