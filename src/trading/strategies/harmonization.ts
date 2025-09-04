/**
 * Strategy Harmonization Engine Implementation
 * 
 * This module implements weighted signal scoring across all indicators, signal conflict
 * resolution, composite signal strength calculation, and strategy confidence validation.
 * 
 * Requirements: 4.8, 17.10 - Strategy harmonization with weighted scoring and conflict resolution
 */

import { MarketData, TradingSignal, HarmonizedSignal, StrategyConfig, SignalConfidence } from './types';
import { MovingAverageStrategy } from './moving-average';
import { RSIStrategy } from './rsi';
import { MACDStrategy } from './macd';
import { FibonacciStrategy } from './fibonacci';
import { BreakoutStrategy } from './breakout';

export class StrategyHarmonizationEngine {
  private readonly movingAverageStrategy: MovingAverageStrategy;
  private readonly rsiStrategy: RSIStrategy;
  private readonly macdStrategy: MACDStrategy;
  private readonly fibonacciStrategy: FibonacciStrategy;
  private readonly breakoutStrategy: BreakoutStrategy;

  private readonly defaultWeights = {
    movingAverage: 0.20,
    rsi: 0.20,
    macd: 0.25,
    fibonacci: 0.15,
    breakout: 0.20
  };

  constructor() {
    this.movingAverageStrategy = new MovingAverageStrategy();
    this.rsiStrategy = new RSIStrategy();
    this.macdStrategy = new MACDStrategy();
    this.fibonacciStrategy = new FibonacciStrategy();
    this.breakoutStrategy = new BreakoutStrategy();
  }

  /**
   * Generate signals from all strategies
   * @param marketData Array of market data
   * @param configs Strategy configurations
   * @returns Array of trading signals from all strategies
   */
  public generateAllSignals(
    marketData: MarketData[],
    configs?: Partial<Record<keyof typeof this.defaultWeights, StrategyConfig>>
  ): TradingSignal[] {
    const signals: TradingSignal[] = [];

    try {
      // Moving Average signals
      if (!configs?.movingAverage || configs.movingAverage.enabled !== false) {
        const maSignal = this.movingAverageStrategy.generateSignal(marketData);
        if (maSignal) signals.push(maSignal);
      }

      // RSI signals
      if (!configs?.rsi || configs.rsi.enabled !== false) {
        const rsiSignal = this.rsiStrategy.generateSignal(marketData);
        if (rsiSignal) signals.push(rsiSignal);
      }

      // MACD signals
      if (!configs?.macd || configs.macd.enabled !== false) {
        const macdSignal = this.macdStrategy.generateSignal(marketData);
        if (macdSignal) signals.push(macdSignal);
      }

      // Fibonacci signals
      if (!configs?.fibonacci || configs.fibonacci.enabled !== false) {
        const fibSignal = this.fibonacciStrategy.generateSignal(marketData);
        if (fibSignal) signals.push(fibSignal);
      }

      // Breakout signals
      if (!configs?.breakout || configs.breakout.enabled !== false) {
        const breakoutSignal = this.breakoutStrategy.generateSignal(marketData);
        if (breakoutSignal) signals.push(breakoutSignal);
      }
    } catch (error) {
      console.error('Error generating signals:', error);
    }

    return signals;
  }

  /**
   * Harmonize multiple trading signals into a single composite signal
   * @param marketData Array of market data
   * @param configs Strategy configurations with weights
   * @returns Harmonized signal or null if no consensus
   */
  public harmonizeSignals(
    marketData: MarketData[],
    configs?: Partial<Record<keyof typeof this.defaultWeights, StrategyConfig>>
  ): HarmonizedSignal | null {
    const signals = this.generateAllSignals(marketData, configs);
    
    if (signals.length === 0) {
      return null;
    }

    const latestData = marketData[marketData.length - 1];
    const weights = this.calculateWeights(configs);
    
    // Separate signals by type
    const buySignals = signals.filter(s => s.type === 'BUY');
    const sellSignals = signals.filter(s => s.type === 'SELL');
    const holdSignals = signals.filter(s => s.type === 'HOLD');

    // Calculate weighted scores
    const buyScore = this.calculateWeightedScore(buySignals, weights);
    const sellScore = this.calculateWeightedScore(sellSignals, weights);
    const holdScore = this.calculateWeightedScore(holdSignals, weights);

    // Determine overall signal
    let overallSignal: 'BUY' | 'SELL' | 'HOLD';
    let strength: number;
    let confidence: number;

    const scoreDifference = Math.abs(buyScore - sellScore);
    const minThreshold = 20; // Minimum score difference for a signal

    if (buyScore > sellScore && buyScore > holdScore && scoreDifference >= minThreshold) {
      overallSignal = 'BUY';
      strength = buyScore;
    } else if (sellScore > buyScore && sellScore > holdScore && scoreDifference >= minThreshold) {
      overallSignal = 'SELL';
      strength = sellScore;
    } else {
      overallSignal = 'HOLD';
      strength = Math.max(buyScore, sellScore, holdScore);
    }

    // Calculate confidence based on signal consensus and strength
    confidence = this.calculateSignalConfidence(signals, overallSignal, strength);

    // Detect conflicts between indicators
    const conflicts = this.detectSignalConflicts(signals);

    // Generate reasoning for the harmonized signal
    const reasoning = this.generateHarmonizedReasoning(signals, overallSignal, conflicts);

    // Extract technical indicators from signals
    const indicators = this.extractTechnicalIndicators(signals);

    return {
      symbol: latestData.symbol,
      timestamp: latestData.timestamp,
      overallSignal,
      strength,
      confidence,
      indicators,
      weights: {
        movingAverage: weights.movingAverage || 0,
        rsi: weights.rsi || 0,
        macd: weights.macd || 0,
        fibonacci: weights.fibonacci || 0,
        breakout: weights.breakout || 0
      },
      conflicts,
      reasoning
    };
  }

  /**
   * Calculate weights for each strategy based on configuration
   * @param configs Strategy configurations
   * @returns Normalized weights for each strategy
   */
  private calculateWeights(
    configs?: Partial<Record<keyof typeof this.defaultWeights, StrategyConfig>>
  ): Record<string, number> {
    const weights = { ...this.defaultWeights };

    if (configs) {
      // Apply custom weights from configuration
      Object.entries(configs).forEach(([strategy, config]) => {
        if (config && typeof config.weight === 'number') {
          weights[strategy as keyof typeof weights] = config.weight;
        }
      });
    }

    // Normalize weights to sum to 1.0
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (totalWeight > 0) {
      Object.keys(weights).forEach(key => {
        weights[key as keyof typeof weights] /= totalWeight;
      });
    }

    return weights;
  }

  /**
   * Calculate weighted score for a set of signals
   * @param signals Array of trading signals
   * @param weights Strategy weights
   * @returns Weighted score (0-100)
   */
  private calculateWeightedScore(
    signals: TradingSignal[],
    weights: Record<string, number>
  ): number {
    if (signals.length === 0) {
      return 0;
    }

    let totalScore = 0;
    let totalWeight = 0;

    signals.forEach(signal => {
      const strategyName = this.getStrategyNameFromSignal(signal);
      const weight = weights[strategyName] || 0;
      
      // Combine signal strength and confidence for composite score
      const compositeScore = (signal.strength * 0.7) + (signal.confidence * 0.3);
      
      totalScore += compositeScore * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? (totalScore / totalWeight) : 0;
  }

  /**
   * Calculate confidence score for harmonized signal
   * @param signals All trading signals
   * @param overallSignal The determined overall signal
   * @param strength Signal strength
   * @returns Confidence score (0-100)
   */
  private calculateSignalConfidence(
    signals: TradingSignal[],
    overallSignal: 'BUY' | 'SELL' | 'HOLD',
    strength: number
  ): number {
    if (signals.length === 0) {
      return 0;
    }

    // Count signals that agree with overall signal
    const agreeingSignals = signals.filter(s => s.type === overallSignal);
    const consensusRatio = agreeingSignals.length / signals.length;

    // Calculate average confidence of agreeing signals
    const avgConfidence = agreeingSignals.length > 0 
      ? agreeingSignals.reduce((sum, s) => sum + s.confidence, 0) / agreeingSignals.length
      : 0;

    // Combine consensus ratio, average confidence, and signal strength
    const confidence = (consensusRatio * 40) + (avgConfidence * 0.4) + (strength * 0.2);

    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Detect conflicts between different indicator signals
   * @param signals Array of trading signals
   * @returns Array of conflict descriptions
   */
  private detectSignalConflicts(signals: TradingSignal[]): string[] {
    const conflicts: string[] = [];

    if (signals.length < 2) {
      return conflicts;
    }

    // Group signals by type
    const buySignals = signals.filter(s => s.type === 'BUY');
    const sellSignals = signals.filter(s => s.type === 'SELL');
    const holdSignals = signals.filter(s => s.type === 'HOLD');

    // Check for major conflicts (strong opposing signals)
    if (buySignals.length > 0 && sellSignals.length > 0) {
      const strongBuySignals = buySignals.filter(s => s.strength > 70);
      const strongSellSignals = sellSignals.filter(s => s.strength > 70);

      if (strongBuySignals.length > 0 && strongSellSignals.length > 0) {
        conflicts.push(`Strong conflicting signals: ${strongBuySignals.map(s => s.indicators.join(',')).join(' vs ')} ${strongSellSignals.map(s => s.indicators.join(',')).join(' vs ')}`);
      }
    }

    // Check for momentum vs trend conflicts
    const momentumSignals = signals.filter(s => s.indicators.some(i => i.includes('RSI') || i.includes('MACD')));
    const trendSignals = signals.filter(s => s.indicators.some(i => i.includes('MA') || i.includes('EMA')));

    if (momentumSignals.length > 0 && trendSignals.length > 0) {
      const momentumTypes = [...new Set(momentumSignals.map(s => s.type))];
      const trendTypes = [...new Set(trendSignals.map(s => s.type))];

      if (momentumTypes.length === 1 && trendTypes.length === 1 && momentumTypes[0] !== trendTypes[0]) {
        conflicts.push(`Momentum vs Trend conflict: Momentum indicates ${momentumTypes[0]}, Trend indicates ${trendTypes[0]}`);
      }
    }

    return conflicts;
  }

  /**
   * Generate reasoning text for harmonized signal
   * @param signals All trading signals
   * @param overallSignal The determined overall signal
   * @param conflicts Array of detected conflicts
   * @returns Human-readable reasoning
   */
  private generateHarmonizedReasoning(
    signals: TradingSignal[],
    overallSignal: 'BUY' | 'SELL' | 'HOLD',
    conflicts: string[]
  ): string {
    const signalsByType = {
      BUY: signals.filter(s => s.type === 'BUY'),
      SELL: signals.filter(s => s.type === 'SELL'),
      HOLD: signals.filter(s => s.type === 'HOLD')
    };

    let reasoning = `Harmonized ${overallSignal} signal based on ${signals.length} indicators. `;

    // Add consensus information
    const agreeingCount = signalsByType[overallSignal].length;
    reasoning += `${agreeingCount}/${signals.length} indicators agree. `;

    // Add strongest supporting indicators
    const strongestSignals = signalsByType[overallSignal]
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 2);

    if (strongestSignals.length > 0) {
      reasoning += `Strongest signals: ${strongestSignals.map(s => `${s.indicators.join(',')} (${s.strength.toFixed(0)}%)`).join(', ')}. `;
    }

    // Add conflict information
    if (conflicts.length > 0) {
      reasoning += `Conflicts detected: ${conflicts.join('; ')}. `;
    }

    return reasoning.trim();
  }

  /**
   * Extract technical indicators from signals
   * @param signals Array of trading signals
   * @returns Array of technical indicators
   */
  private extractTechnicalIndicators(signals: TradingSignal[]): any[] {
    // This would need to be implemented based on the actual signal metadata
    // For now, return a simplified representation
    return signals.map(signal => ({
      name: signal.indicators.join(','),
      value: signal.strength,
      timestamp: signal.timestamp,
      parameters: signal.metadata || {}
    }));
  }

  /**
   * Get strategy name from signal indicators
   * @param signal Trading signal
   * @returns Strategy name
   */
  private getStrategyNameFromSignal(signal: TradingSignal): string {
    const indicators = signal.indicators.join(',').toLowerCase();
    
    if (indicators.includes('ma') || indicators.includes('ema') || indicators.includes('sma')) {
      return 'movingAverage';
    } else if (indicators.includes('rsi')) {
      return 'rsi';
    } else if (indicators.includes('macd')) {
      return 'macd';
    } else if (indicators.includes('fibonacci') || indicators.includes('fib')) {
      return 'fibonacci';
    } else if (indicators.includes('breakout')) {
      return 'breakout';
    }
    
    return 'unknown';
  }

  /**
   * Validate signal harmony and detect potential issues
   * @param harmonizedSignal The harmonized signal to validate
   * @returns Validation result with issues and recommendations
   */
  public validateSignalHarmony(harmonizedSignal: HarmonizedSignal): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check confidence threshold
    if (harmonizedSignal.confidence < 60) {
      issues.push(`Low confidence signal (${harmonizedSignal.confidence.toFixed(1)}%)`);
      recommendations.push('Consider waiting for higher confidence signals or reducing position size');
    }

    // Check for conflicts
    if (harmonizedSignal.consensus.conflicting) {
      issues.push(`Signal conflicts detected: conflicting strategies`);
      recommendations.push('Review conflicting indicators and consider market context');
    }

    // Check signal strength
    if (harmonizedSignal.strength < 50 && harmonizedSignal.type !== 'HOLD') {
      issues.push(`Weak signal strength (${harmonizedSignal.strength.toFixed(1)}%)`);
      recommendations.push('Consider reducing position size or waiting for stronger signals');
    }

    // Check indicator diversity
    const uniqueIndicators = new Set(harmonizedSignal.indicators.map(i => i.name));
    if (uniqueIndicators.size < 3) {
      issues.push('Limited indicator diversity');
      recommendations.push('Ensure multiple different types of indicators are active');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }}
