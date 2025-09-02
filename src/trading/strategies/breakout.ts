/**
 * Breakout and Momentum Detection Strategy Implementation
 * 
 * This module implements volume-confirmed breakout detection, momentum oscillator calculations,
 * and false breakout filtering mechanisms for reliable breakout trading signals.
 * 
 * Requirements: 4.2, 4.8 - Breakout detection with volume confirmation and false breakout filtering
 */

import { MarketData, BreakoutSignal, TradingSignal, SignalConfidence } from './types';

export class BreakoutStrategy {
  private readonly volumeConfirmationThreshold = 1.5; // 50% above average volume
  private readonly minBreakoutPercentage = 0.02; // Minimum 2% breakout
  private readonly consolidationPeriod = 20; // Periods to analyze for consolidation
  private readonly momentumPeriod = 14; // Period for momentum calculation

  /**
   * Detect support and resistance levels
   * @param marketData Array of market data
   * @param lookbackPeriod Period to analyze for levels
   * @returns Support and resistance levels
   */
  public detectSupportResistance(
    marketData: MarketData[],
    lookbackPeriod: number = this.consolidationPeriod
  ): { support: number[]; resistance: number[]; consolidationRange: { high: number; low: number } | null } {
    if (marketData.length < lookbackPeriod) {
      return { support: [], resistance: [], consolidationRange: null };
    }

    const recentData = marketData.slice(-lookbackPeriod);
    const highs = recentData.map(d => d.high);
    const lows = recentData.map(d => d.low);

    // Find local highs and lows
    const localHighs = this.findLocalExtremes(highs, 'high', 3);
    const localLows = this.findLocalExtremes(lows, 'low', 3);

    // Group similar levels together (within 1% of each other)
    const resistanceLevels = this.groupSimilarLevels(localHighs.map(h => highs[h.index]));
    const supportLevels = this.groupSimilarLevels(localLows.map(l => lows[l.index]));

    // Determine consolidation range
    const consolidationHigh = Math.max(...highs);
    const consolidationLow = Math.min(...lows);
    const consolidationRange = (consolidationHigh - consolidationLow) / consolidationLow;

    // Only consider it consolidation if range is reasonable (not too wide)
    const consolidationRangeData = consolidationRange < 0.15 ? 
      { high: consolidationHigh, low: consolidationLow } : null;

    return {
      support: supportLevels.sort((a, b) => b - a), // Descending order
      resistance: resistanceLevels.sort((a, b) => a - b), // Ascending order
      consolidationRange: consolidationRangeData
    };
  }

  /**
   * Find local extremes in price data
   * @param data Price data array
   * @param type Type of extreme to find
   * @param lookback Lookback period for comparison
   * @returns Array of extreme points
   */
  private findLocalExtremes(
    data: number[],
    type: 'high' | 'low',
    lookback: number = 3
  ): Array<{ index: number; value: number }> {
    const extremes: Array<{ index: number; value: number }> = [];

    for (let i = lookback; i < data.length - lookback; i++) {
      let isExtreme = true;

      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j === i) continue;

        if (type === 'high' && data[j] >= data[i]) {
          isExtreme = false;
          break;
        }
        if (type === 'low' && data[j] <= data[i]) {
          isExtreme = false;
          break;
        }
      }

      if (isExtreme) {
        extremes.push({ index: i, value: data[i] });
      }
    }

    return extremes;
  }

  /**
   * Group similar price levels together
   * @param levels Array of price levels
   * @param threshold Similarity threshold (default: 1%)
   * @returns Grouped levels
   */
  private groupSimilarLevels(levels: number[], threshold: number = 0.01): number[] {
    if (levels.length === 0) return [];

    const sortedLevels = [...levels].sort((a, b) => a - b);
    const groupedLevels: number[] = [];
    let currentGroup = [sortedLevels[0]];

    for (let i = 1; i < sortedLevels.length; i++) {
      const currentLevel = sortedLevels[i];
      const groupAverage = currentGroup.reduce((sum, level) => sum + level, 0) / currentGroup.length;

      if (Math.abs(currentLevel - groupAverage) / groupAverage <= threshold) {
        currentGroup.push(currentLevel);
      } else {
        // Finalize current group and start new one
        groupedLevels.push(groupAverage);
        currentGroup = [currentLevel];
      }
    }

    // Add the last group
    if (currentGroup.length > 0) {
      const groupAverage = currentGroup.reduce((sum, level) => sum + level, 0) / currentGroup.length;
      groupedLevels.push(groupAverage);
    }

    return groupedLevels;
  }

  /**
   * Calculate momentum oscillator
   * @param marketData Array of market data
   * @param period Period for momentum calculation
   * @returns Momentum value (-100 to +100)
   */
  public calculateMomentum(
    marketData: MarketData[],
    period: number = this.momentumPeriod
  ): number | null {
    if (marketData.length < period + 1) {
      return null;
    }

    const currentPrice = marketData[marketData.length - 1].close;
    const pastPrice = marketData[marketData.length - 1 - period].close;

    const momentum = ((currentPrice - pastPrice) / pastPrice) * 100;
    return Math.round(momentum * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Detect breakout signals with volume confirmation
   * @param marketData Array of market data
   * @param lookbackPeriod Period for support/resistance analysis
   * @returns Breakout signal or null
   */
  public detectBreakout(
    marketData: MarketData[],
    lookbackPeriod: number = this.consolidationPeriod
  ): BreakoutSignal | null {
    if (marketData.length < lookbackPeriod + 5) {
      return null;
    }

    const levels = this.detectSupportResistance(marketData, lookbackPeriod);
    const currentData = marketData[marketData.length - 1];
    const currentPrice = currentData.close;

    // Check for breakout above resistance
    const nearestResistance = levels.resistance.find(r => r > currentPrice * 0.98);
    if (nearestResistance && currentPrice > nearestResistance) {
      const breakoutPercentage = (currentPrice - nearestResistance) / nearestResistance;
      
      if (breakoutPercentage >= this.minBreakoutPercentage) {
        const volumeConfirmed = this.isVolumeConfirmed(marketData);
        const falseBreakoutProbability = this.calculateFalseBreakoutProbability(
          marketData, nearestResistance, 'UP'
        );

        return {
          name: 'BREAKOUT',
          value: currentPrice,
          timestamp: currentData.timestamp,
          parameters: {
            breakoutLevel: nearestResistance,
            breakoutPercentage,
            lookbackPeriod
          },
          direction: 'UP',
          volumeConfirmed,
          strength: this.calculateBreakoutStrength(breakoutPercentage, volumeConfirmed, falseBreakoutProbability),
          falseBreakoutProbability
        };
      }
    }

    // Check for breakout below support
    const nearestSupport = levels.support.find(s => s < currentPrice * 1.02);
    if (nearestSupport && currentPrice < nearestSupport) {
      const breakoutPercentage = (nearestSupport - currentPrice) / nearestSupport;
      
      if (breakoutPercentage >= this.minBreakoutPercentage) {
        const volumeConfirmed = this.isVolumeConfirmed(marketData);
        const falseBreakoutProbability = this.calculateFalseBreakoutProbability(
          marketData, nearestSupport, 'DOWN'
        );

        return {
          name: 'BREAKOUT',
          value: currentPrice,
          timestamp: currentData.timestamp,
          parameters: {
            breakoutLevel: nearestSupport,
            breakoutPercentage,
            lookbackPeriod
          },
          direction: 'DOWN',
          volumeConfirmed,
          strength: this.calculateBreakoutStrength(breakoutPercentage, volumeConfirmed, falseBreakoutProbability),
          falseBreakoutProbability
        };
      }
    }

    return null;
  }

  /**
   * Check if current volume confirms the breakout
   * @param marketData Array of market data
   * @returns True if volume is above threshold
   */
  private isVolumeConfirmed(marketData: MarketData[]): boolean {
    if (marketData.length < 20) {
      return false;
    }

    const currentVolume = marketData[marketData.length - 1].volume;
    const averageVolume = marketData.slice(-20)
      .reduce((sum, data) => sum + data.volume, 0) / 20;

    return currentVolume >= (averageVolume * this.volumeConfirmationThreshold);
  }

  /**
   * Calculate false breakout probability
   * @param marketData Market data
   * @param breakoutLevel The level being broken
   * @param direction Breakout direction
   * @returns Probability (0-100)
   */
  private calculateFalseBreakoutProbability(
    marketData: MarketData[],
    breakoutLevel: number,
    direction: 'UP' | 'DOWN'
  ): number {
    let probability = 50; // Base probability

    // Check how many times this level has been tested recently
    const recentData = marketData.slice(-50);
    let levelTests = 0;

    recentData.forEach(data => {
      const testThreshold = breakoutLevel * 0.005; // 0.5% threshold
      if (direction === 'UP') {
        if (data.high >= breakoutLevel - testThreshold && data.close < breakoutLevel) {
          levelTests++;
        }
      } else {
        if (data.low <= breakoutLevel + testThreshold && data.close > breakoutLevel) {
          levelTests++;
        }
      }
    });

    // More tests = lower false breakout probability
    probability -= Math.min(levelTests * 5, 30);

    // Volume confirmation reduces false breakout probability
    if (this.isVolumeConfirmed(marketData)) {
      probability -= 20;
    }

    // Momentum alignment reduces false breakout probability
    const momentum = this.calculateMomentum(marketData);
    if (momentum !== null) {
      if ((direction === 'UP' && momentum > 5) || (direction === 'DOWN' && momentum < -5)) {
        probability -= 15;
      }
    }

    return Math.max(0, Math.min(100, Math.round(probability)));
  }

  /**
   * Calculate breakout strength
   * @param breakoutPercentage Percentage of breakout
   * @param volumeConfirmed Whether volume confirms
   * @param falseBreakoutProbability Probability of false breakout
   * @returns Strength score (0-100)
   */
  private calculateBreakoutStrength(
    breakoutPercentage: number,
    volumeConfirmed: boolean,
    falseBreakoutProbability: number
  ): number {
    let strength = 50; // Base strength

    // Breakout magnitude
    strength += Math.min(breakoutPercentage * 1000, 30); // Up to 30 points for 3%+ breakout

    // Volume confirmation
    if (volumeConfirmed) {
      strength += 25;
    } else {
      strength -= 15;
    }

    // False breakout probability (inverse relationship)
    strength += (100 - falseBreakoutProbability) * 0.2;

    return Math.max(0, Math.min(100, Math.round(strength)));
  }

  /**
   * Generate trading signal based on breakout analysis
   * @param marketData Array of market data
   * @param lookbackPeriod Period for analysis
   * @returns Trading signal or null
   */
  public generateSignal(
    marketData: MarketData[],
    lookbackPeriod: number = this.consolidationPeriod
  ): TradingSignal | null {
    const breakout = this.detectBreakout(marketData, lookbackPeriod);
    if (!breakout) {
      return null;
    }

    // Filter out high probability false breakouts
    if (breakout.falseBreakoutProbability > 70) {
      return null;
    }

    const latestData = marketData[marketData.length - 1];
    const signalType = breakout.direction === 'UP' ? 'BUY' : 'SELL';
    
    // Calculate momentum for additional confirmation
    const momentum = this.calculateMomentum(marketData);
    let adjustedStrength = breakout.strength;

    // Adjust strength based on momentum alignment
    if (momentum !== null) {
      if ((signalType === 'BUY' && momentum > 0) || (signalType === 'SELL' && momentum < 0)) {
        adjustedStrength = Math.min(adjustedStrength + 10, 100);
      } else if ((signalType === 'BUY' && momentum < -10) || (signalType === 'SELL' && momentum > 10)) {
        adjustedStrength = Math.max(adjustedStrength - 15, 0);
      }
    }

    // Calculate confidence
    const confidence = this.calculateSignalConfidence(breakout, momentum, marketData);

    // Calculate risk-reward ratio
    const riskReward = this.calculateRiskReward(marketData, signalType, breakout);

    const reasoning = this.generateReasoning(breakout, momentum);

    return {
      id: `breakout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: latestData.symbol,
      type: signalType,
      strength: Math.round(adjustedStrength),
      confidence: Math.round(confidence),
      indicators: [`BREAKOUT_${breakout.direction}`],
      reasoning,
      riskReward,
      timestamp: latestData.timestamp,
      metadata: {
        breakoutLevel: breakout.parameters.breakoutLevel,
        breakoutPercentage: breakout.parameters.breakoutPercentage,
        direction: breakout.direction,
        volumeConfirmed: breakout.volumeConfirmed,
        falseBreakoutProbability: breakout.falseBreakoutProbability,
        momentum: momentum,
        levelTests: this.countLevelTests(marketData, breakout.parameters.breakoutLevel, breakout.direction)
      }
    };
  }

  /**
   * Count how many times a level has been tested
   * @param marketData Market data
   * @param level Price level
   * @param direction Breakout direction
   * @returns Number of tests
   */
  private countLevelTests(marketData: MarketData[], level: number, direction: 'UP' | 'DOWN'): number {
    const recentData = marketData.slice(-50);
    let tests = 0;
    const threshold = level * 0.005; // 0.5% threshold

    recentData.forEach(data => {
      if (direction === 'UP') {
        if (data.high >= level - threshold && data.close < level) {
          tests++;
        }
      } else {
        if (data.low <= level + threshold && data.close > level) {
          tests++;
        }
      }
    });

    return tests;
  }

  /**
   * Calculate signal confidence
   * @param breakout Breakout signal data
   * @param momentum Momentum value
   * @param marketData Market data
   * @returns Confidence score (0-100)
   */
  private calculateSignalConfidence(
    breakout: BreakoutSignal,
    momentum: number | null,
    marketData: MarketData[]
  ): number {
    let confidence = 50; // Base confidence

    // Breakout strength contributes to confidence
    confidence += breakout.strength * 0.3;

    // Volume confirmation
    if (breakout.volumeConfirmed) {
      confidence += 20;
    } else {
      confidence -= 10;
    }

    // False breakout probability (inverse)
    confidence += (100 - breakout.falseBreakoutProbability) * 0.2;

    // Momentum alignment
    if (momentum !== null) {
      const momentumAlignment = (breakout.direction === 'UP' && momentum > 0) || 
                               (breakout.direction === 'DOWN' && momentum < 0);
      if (momentumAlignment) {
        confidence += Math.min(Math.abs(momentum), 15);
      } else {
        confidence -= 10;
      }
    }

    // Level significance (more tests = more significant level)
    const levelTests = this.countLevelTests(marketData, breakout.parameters.breakoutLevel, breakout.direction);
    confidence += Math.min(levelTests * 2, 10);

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Calculate risk-reward ratio for breakout trades
   * @param marketData Market data
   * @param signalType Signal type
   * @param breakout Breakout data
   * @returns Risk-reward ratio
   */
  private calculateRiskReward(
    marketData: MarketData[],
    signalType: 'BUY' | 'SELL',
    breakout: BreakoutSignal
  ): number {
    const currentPrice = marketData[marketData.length - 1].close;
    const breakoutLevel = breakout.parameters.breakoutLevel;

    if (signalType === 'BUY') {
      // For upward breakouts, target is based on breakout magnitude
      const breakoutMagnitude = currentPrice - breakoutLevel;
      const target = currentPrice + (breakoutMagnitude * 2); // 2:1 projection
      const stop = breakoutLevel * 0.99; // Stop just below breakout level
      
      const reward = target - currentPrice;
      const risk = currentPrice - stop;
      
      return risk > 0 ? reward / risk : 1.0;
    } else {
      // For downward breakouts
      const breakoutMagnitude = breakoutLevel - currentPrice;
      const target = currentPrice - (breakoutMagnitude * 2); // 2:1 projection
      const stop = breakoutLevel * 1.01; // Stop just above breakout level
      
      const reward = currentPrice - target;
      const risk = stop - currentPrice;
      
      return risk > 0 ? reward / risk : 1.0;
    }
  }

  /**
   * Generate human-readable reasoning for the signal
   * @param breakout Breakout data
   * @param momentum Momentum value
   * @returns Reasoning string
   */
  private generateReasoning(breakout: BreakoutSignal, momentum: number | null): string {
    const direction = breakout.direction === 'UP' ? 'upward' : 'downward';
    const levelType = breakout.direction === 'UP' ? 'resistance' : 'support';
    const volumeText = breakout.volumeConfirmed ? ' with strong volume confirmation' : ' with weak volume';
    const momentumText = momentum !== null ? 
      ` and ${momentum > 0 ? 'positive' : 'negative'} momentum (${momentum.toFixed(1)}%)` : '';

    return `${direction.charAt(0).toUpperCase() + direction.slice(1)} breakout detected above ${levelType} level at ${breakout.parameters.breakoutLevel.toFixed(4)}${volumeText}${momentumText}. Breakout magnitude: ${(breakout.parameters.breakoutPercentage * 100).toFixed(2)}%. False breakout probability: ${breakout.falseBreakoutProbability}%.`;
  }

  /**
   * Evaluate signal confidence with detailed breakdown
   * @param marketData Market data
   * @param signal Trading signal
   * @returns Detailed confidence analysis
   */
  public evaluateSignalConfidence(marketData: MarketData[], signal: TradingSignal): SignalConfidence {
    const technical = signal.strength;
    
    // Volume analysis
    const volumeConfirmed = signal.metadata?.volumeConfirmed as boolean;
    const volume = volumeConfirmed ? 80 : 40;

    // Momentum analysis
    const momentum = signal.metadata?.momentum as number | null;
    let momentumScore = 50;
    if (momentum !== null) {
      const alignment = (signal.type === 'BUY' && momentum > 0) || (signal.type === 'SELL' && momentum < 0);
      momentumScore = alignment ? 70 + Math.min(Math.abs(momentum), 20) : 30;
    }

    const overall = Math.round((technical * 0.4 + volume * 0.3 + momentumScore * 0.3));

    const factors = [
      `Breakout signal strength: ${technical}/100`,
      `Volume confirmation: ${volume}/100`,
      `Momentum alignment: ${momentumScore}/100`,
      `Breakout level: ${signal.metadata?.breakoutLevel} (${signal.metadata?.direction})`
    ];

    if (signal.metadata?.falseBreakoutProbability !== undefined) {
      factors.push(`False breakout probability: ${signal.metadata.falseBreakoutProbability}%`);
    }

    if (signal.metadata?.levelTests !== undefined) {
      factors.push(`Level tested ${signal.metadata.levelTests} times previously`);
    }

    if (signal.metadata?.breakoutPercentage !== undefined) {
      factors.push(`Breakout magnitude: ${(signal.metadata.breakoutPercentage * 100).toFixed(2)}%`);
    }

    return {
      overall,
      technical,
      volume,
      momentum: momentumScore,
      factors
    };
  }
}
