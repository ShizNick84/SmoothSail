/**
 * Fibonacci Retracement Analysis Implementation
 * 
 * This module implements Fibonacci retracement level calculations, support/resistance
 * identification, and Fibonacci-based entry/exit signals with dynamic level updates.
 * 
 * Requirements: 4.5, 4.8 - Fibonacci retracement with standard levels and dynamic updates
 */

import { MarketData, FibonacciLevels, TradingSignal, SignalConfidence } from './types';

export class FibonacciStrategy {
  private readonly fibonacciRatios = {
    '23.6': 0.236,
    '38.2': 0.382,
    '50.0': 0.500,
    '61.8': 0.618,
    '78.6': 0.786
  };

  private readonly supportResistanceThreshold = 0.002; // 0.2% threshold for level proximity
  private readonly minSwingSize = 0.05; // Minimum 5% swing to calculate Fibonacci

  /**
   * Calculate Fibonacci retracement levels
   * @param high Swing high price
   * @param low Swing low price
   * @returns Fibonacci levels object
   */
  public calculateFibonacciLevels(high: number, low: number): FibonacciLevels {
    const range = high - low;
    
    const levels = {
      '23.6': high - (range * this.fibonacciRatios['23.6']),
      '38.2': high - (range * this.fibonacciRatios['38.2']),
      '50.0': high - (range * this.fibonacciRatios['50.0']),
      '61.8': high - (range * this.fibonacciRatios['61.8']),
      '78.6': high - (range * this.fibonacciRatios['78.6'])
    };

    // Determine support and resistance levels based on current trend
    const support: number[] = [];
    const resistance: number[] = [];

    // In an uptrend (high > low), Fibonacci levels act as support
    // In a downtrend, they act as resistance
    const isUptrend = high > low;
    
    Object.values(levels).forEach(level => {
      if (isUptrend) {
        support.push(level);
      } else {
        resistance.push(level);
      }
    });

    return {
      high,
      low,
      levels,
      support: support.sort((a, b) => b - a), // Descending order for support
      resistance: resistance.sort((a, b) => a - b) // Ascending order for resistance
    };
  }

  /**
   * Find significant swing highs and lows in market data
   * @param marketData Array of market data
   * @param lookbackPeriod Period to look back for swings (default: 20)
   * @returns Object with swing high and low information
   */
  public findSwingPoints(
    marketData: MarketData[],
    lookbackPeriod: number = 20
  ): { swingHigh: { price: number; index: number } | null; swingLow: { price: number; index: number } | null } {
    if (marketData.length < lookbackPeriod * 2) {
      return { swingHigh: null, swingLow: null };
    }

    let swingHigh: { price: number; index: number } | null = null;
    let swingLow: { price: number; index: number } | null = null;

    // Look for swing highs and lows in the recent data
    for (let i = lookbackPeriod; i < marketData.length - lookbackPeriod; i++) {
      const current = marketData[i];
      let isSwingHigh = true;
      let isSwingLow = true;

      // Check if current point is a swing high or low
      for (let j = i - lookbackPeriod; j <= i + lookbackPeriod; j++) {
        if (j === i) continue;

        if (marketData[j].high >= current.high) {
          isSwingHigh = false;
        }
        if (marketData[j].low <= current.low) {
          isSwingLow = false;
        }
      }

      if (isSwingHigh && (!swingHigh || current.high > swingHigh.price)) {
        swingHigh = { price: current.high, index: i };
      }
      if (isSwingLow && (!swingLow || current.low < swingLow.price)) {
        swingLow = { price: current.low, index: i };
      }
    }

    return { swingHigh, swingLow };
  }

  /**
   * Get dynamic Fibonacci levels based on recent market structure
   * @param marketData Array of market data
   * @param lookbackPeriod Period to analyze for swing points
   * @returns Fibonacci levels or null if no significant swing found
   */
  public getDynamicFibonacciLevels(
    marketData: MarketData[],
    lookbackPeriod: number = 20
  ): FibonacciLevels | null {
    const swingPoints = this.findSwingPoints(marketData, lookbackPeriod);
    
    if (!swingPoints.swingHigh || !swingPoints.swingLow) {
      return null;
    }

    const high = swingPoints.swingHigh.price;
    const low = swingPoints.swingLow.price;

    // Check if swing is significant enough
    const swingSize = Math.abs(high - low) / Math.min(high, low);
    if (swingSize < this.minSwingSize) {
      return null;
    }

    return this.calculateFibonacciLevels(high, low);
  }

  /**
   * Check if current price is near a Fibonacci level
   * @param currentPrice Current market price
   * @param fibonacciLevels Fibonacci levels object
   * @returns Information about nearby levels
   */
  public checkFibonacciProximity(
    currentPrice: number,
    fibonacciLevels: FibonacciLevels
  ): {
    nearLevel: string | null;
    levelPrice: number | null;
    distance: number;
    levelType: 'support' | 'resistance' | null;
  } {
    let nearestLevel: string | null = null;
    let nearestPrice: number | null = null;
    let minDistance = Infinity;
    let levelType: 'support' | 'resistance' | null = null;

    // Check each Fibonacci level
    Object.entries(fibonacciLevels.levels).forEach(([level, price]) => {
      const distance = Math.abs(currentPrice - price) / currentPrice;
      
      if (distance < minDistance && distance <= this.supportResistanceThreshold) {
        minDistance = distance;
        nearestLevel = level;
        nearestPrice = price;
        
        // Determine if it's acting as support or resistance
        if (fibonacciLevels.support.includes(price)) {
          levelType = 'support';
        } else if (fibonacciLevels.resistance.includes(price)) {
          levelType = 'resistance';
        }
      }
    });

    return {
      nearLevel: nearestLevel,
      levelPrice: nearestPrice,
      distance: minDistance,
      levelType
    };
  }

  /**
   * Generate Fibonacci-based trading signals
   * @param marketData Array of market data
   * @param lookbackPeriod Period for swing analysis
   * @returns Trading signal or null if no signal
   */
  public generateSignal(
    marketData: MarketData[],
    lookbackPeriod: number = 20
  ): TradingSignal | null {
    const fibonacciLevels = this.getDynamicFibonacciLevels(marketData, lookbackPeriod);
    if (!fibonacciLevels) {
      return null;
    }

    const latestData = marketData[marketData.length - 1];
    const currentPrice = latestData.close;
    
    const proximity = this.checkFibonacciProximity(currentPrice, fibonacciLevels);
    
    if (!proximity.nearLevel || !proximity.levelPrice || !proximity.levelType) {
      return null; // Not near any significant level
    }

    // Determine signal direction based on level type and price action
    const priceAction = this.analyzePriceAction(marketData, proximity.levelPrice);
    let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;
    let reasoning = '';

    if (proximity.levelType === 'support' && priceAction.bouncing) {
      // Price bouncing off support level
      signalType = 'BUY';
      strength = this.calculateSignalStrength(proximity, priceAction, fibonacciLevels);
      reasoning = `Price bouncing off Fibonacci ${proximity.nearLevel}% support level at ${proximity.levelPrice?.toFixed(4)}`;
    } else if (proximity.levelType === 'resistance' && priceAction.rejecting) {
      // Price being rejected at resistance level
      signalType = 'SELL';
      strength = this.calculateSignalStrength(proximity, priceAction, fibonacciLevels);
      reasoning = `Price rejected at Fibonacci ${proximity.nearLevel}% resistance level at ${proximity.levelPrice?.toFixed(4)}`;
    } else if (proximity.levelType === 'support' && priceAction.breaking) {
      // Support level breaking down
      signalType = 'SELL';
      strength = this.calculateSignalStrength(proximity, priceAction, fibonacciLevels) * 0.8; // Slightly lower strength for breakouts
      reasoning = `Fibonacci ${proximity.nearLevel}% support level breaking down at ${proximity.levelPrice?.toFixed(4)}`;
    } else if (proximity.levelType === 'resistance' && priceAction.breaking) {
      // Resistance level breaking up
      signalType = 'BUY';
      strength = this.calculateSignalStrength(proximity, priceAction, fibonacciLevels) * 0.8;
      reasoning = `Fibonacci ${proximity.nearLevel}% resistance level breaking up at ${proximity.levelPrice?.toFixed(4)}`;
    }

    if (signalType === 'HOLD') {
      return null;
    }

    // Calculate confidence and risk-reward
    const confidence = this.calculateSignalConfidence(proximity, priceAction, marketData);
    const riskReward = this.calculateRiskReward(marketData, signalType, fibonacciLevels, proximity);

    return {
      id: `fib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: latestData.symbol,
      type: signalType,
      strength: Math.round(strength),
      confidence: Math.round(confidence),
      indicators: [`FIB_${proximity.nearLevel}`],
      reasoning,
      riskReward,
      timestamp: latestData.timestamp,
      metadata: {
        fibonacciLevel: proximity.nearLevel,
        levelPrice: proximity.levelPrice,
        levelType: proximity.levelType,
        distance: proximity.distance,
        swingHigh: fibonacciLevels.high,
        swingLow: fibonacciLevels.low,
        priceAction: priceAction,
        allLevels: fibonacciLevels.levels
      }
    };
  }

  /**
   * Analyze price action around a Fibonacci level
   * @param marketData Market data
   * @param levelPrice Fibonacci level price
   * @returns Price action analysis
   */
  private analyzePriceAction(
    marketData: MarketData[],
    levelPrice: number
  ): {
    bouncing: boolean;
    rejecting: boolean;
    breaking: boolean;
    volume: 'high' | 'normal' | 'low';
  } {
    if (marketData.length < 5) {
      return { bouncing: false, rejecting: false, breaking: false, volume: 'normal' };
    }

    const recentData = marketData.slice(-5);
    const currentPrice = recentData[recentData.length - 1].close;
    const previousPrice = recentData[recentData.length - 2].close;

    // Check for bouncing (price was below level, now above)
    const bouncing = previousPrice < levelPrice && currentPrice > levelPrice;

    // Check for rejection (price was above level, now below)
    const rejecting = previousPrice > levelPrice && currentPrice < levelPrice;

    // Check for breaking (sustained move through level)
    let breaking = false;
    if (recentData.length >= 3) {
      const twoPeriodsAgo = recentData[recentData.length - 3].close;
      breaking = (
        (twoPeriodsAgo < levelPrice && previousPrice < levelPrice && currentPrice > levelPrice) || // Breaking up
        (twoPeriodsAgo > levelPrice && previousPrice > levelPrice && currentPrice < levelPrice)    // Breaking down
      );
    }

    // Analyze volume
    let volume: 'high' | 'normal' | 'low' = 'normal';
    if (marketData.length >= 20) {
      const currentVolume = recentData[recentData.length - 1].volume;
      const avgVolume = marketData.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
      
      if (currentVolume > avgVolume * 1.5) {
        volume = 'high';
      } else if (currentVolume < avgVolume * 0.7) {
        volume = 'low';
      }
    }

    return { bouncing, rejecting, breaking, volume };
  }

  /**
   * Calculate signal strength based on Fibonacci analysis
   * @param proximity Level proximity data
   * @param priceAction Price action analysis
   * @param fibonacciLevels Fibonacci levels
   * @returns Strength score (0-100)
   */
  private calculateSignalStrength(
    proximity: any,
    priceAction: any,
    fibonacciLevels: FibonacciLevels
  ): number {
    let strength = 50; // Base strength

    // Level significance (61.8% and 50% are stronger)
    if (proximity.nearLevel === '61.8' || proximity.nearLevel === '50.0') {
      strength += 20;
    } else if (proximity.nearLevel === '38.2') {
      strength += 15;
    } else {
      strength += 10;
    }

    // Price action strength
    if (priceAction.bouncing || priceAction.rejecting) {
      strength += 15;
    }
    if (priceAction.breaking) {
      strength += 10;
    }

    // Volume confirmation
    if (priceAction.volume === 'high') {
      strength += 15;
    } else if (priceAction.volume === 'low') {
      strength -= 10;
    }

    // Proximity to level (closer = stronger)
    const proximityBonus = (1 - proximity.distance / this.supportResistanceThreshold) * 10;
    strength += proximityBonus;

    return Math.min(Math.max(strength, 0), 100);
  }

  /**
   * Calculate signal confidence
   * @param proximity Level proximity data
   * @param priceAction Price action analysis
   * @param marketData Market data
   * @returns Confidence score (0-100)
   */
  private calculateSignalConfidence(
    proximity: any,
    priceAction: any,
    marketData: MarketData[]
  ): number {
    let confidence = 50;

    // Level reliability (major levels are more reliable)
    if (proximity.nearLevel === '61.8') {
      confidence += 20;
    } else if (proximity.nearLevel === '50.0') {
      confidence += 15;
    } else if (proximity.nearLevel === '38.2') {
      confidence += 10;
    }

    // Price action confirmation
    if (priceAction.bouncing || priceAction.rejecting) {
      confidence += 15;
    }

    // Volume confirmation
    if (priceAction.volume === 'high') {
      confidence += 15;
    }

    // Market trend alignment
    if (marketData.length >= 10) {
      const trendAlignment = this.calculateTrendAlignment(marketData, proximity.levelType);
      confidence += trendAlignment;
    }

    return Math.min(confidence, 100);
  }

  /**
   * Calculate trend alignment bonus
   * @param marketData Market data
   * @param levelType Level type (support/resistance)
   * @returns Alignment bonus (-10 to +10)
   */
  private calculateTrendAlignment(
    marketData: MarketData[],
    levelType: 'support' | 'resistance' | null
  ): number {
    if (!levelType) return 0;

    const recentPrices = marketData.slice(-10).map(d => d.close);
    const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];

    // Uptrend + support level = good alignment
    if (priceChange > 0.02 && levelType === 'support') {
      return 10;
    }
    // Downtrend + resistance level = good alignment
    if (priceChange < -0.02 && levelType === 'resistance') {
      return 10;
    }
    // Conflicting signals
    if (priceChange > 0.02 && levelType === 'resistance') {
      return -5;
    }
    if (priceChange < -0.02 && levelType === 'support') {
      return -5;
    }

    return 0;
  }

  /**
   * Calculate risk-reward ratio for Fibonacci-based trades
   * @param marketData Market data
   * @param signalType Signal type
   * @param fibonacciLevels Fibonacci levels
   * @param proximity Level proximity data
   * @returns Risk-reward ratio
   */
  private calculateRiskReward(
    marketData: MarketData[],
    signalType: 'BUY' | 'SELL',
    fibonacciLevels: FibonacciLevels,
    proximity: any
  ): number {
    const currentPrice = marketData[marketData.length - 1].close;
    
    if (signalType === 'BUY') {
      // For buy signals, target next resistance level, stop below support
      const targetLevel = this.getNextLevel(fibonacciLevels, proximity.levelPrice, 'up');
      const stopLevel = this.getNextLevel(fibonacciLevels, proximity.levelPrice, 'down');
      
      const target = targetLevel || fibonacciLevels.high;
      const stop = stopLevel || fibonacciLevels.low;
      
      const reward = target - currentPrice;
      const risk = currentPrice - stop;
      
      return risk > 0 ? reward / risk : 1.0;
    } else {
      // For sell signals, target next support level, stop above resistance
      const targetLevel = this.getNextLevel(fibonacciLevels, proximity.levelPrice, 'down');
      const stopLevel = this.getNextLevel(fibonacciLevels, proximity.levelPrice, 'up');
      
      const target = targetLevel || fibonacciLevels.low;
      const stop = stopLevel || fibonacciLevels.high;
      
      const reward = currentPrice - target;
      const risk = stop - currentPrice;
      
      return risk > 0 ? reward / risk : 1.0;
    }
  }

  /**
   * Get next Fibonacci level in specified direction
   * @param fibonacciLevels Fibonacci levels
   * @param currentLevel Current level price
   * @param direction Direction to look
   * @returns Next level price or null
   */
  private getNextLevel(
    fibonacciLevels: FibonacciLevels,
    currentLevel: number,
    direction: 'up' | 'down'
  ): number | null {
    const levels = Object.values(fibonacciLevels.levels).sort((a, b) => a - b);
    const currentIndex = levels.findIndex(level => Math.abs(level - currentLevel) < 0.01);
    
    if (currentIndex === -1) return null;
    
    if (direction === 'up' && currentIndex < levels.length - 1) {
      return levels[currentIndex + 1];
    } else if (direction === 'down' && currentIndex > 0) {
      return levels[currentIndex - 1];
    }
    
    return null;
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
    let volume = 50;
    if (marketData.length >= 20) {
      const currentVolume = marketData[marketData.length - 1].volume;
      const avgVolume = marketData.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
      volume = currentVolume > avgVolume * 1.5 ? 80 : (currentVolume > avgVolume ? 60 : 40);
    }

    // Momentum analysis based on Fibonacci level significance
    const momentum = this.calculateFibonacciMomentum(signal);
    
    const overall = Math.round((technical * 0.4 + volume * 0.2 + momentum * 0.4));
    
    const factors = [
      `Fibonacci signal strength: ${technical}/100`,
      `Volume confirmation: ${volume}/100`,
      `Level significance: ${momentum}/100`,
      `Fibonacci level: ${signal.metadata?.fibonacciLevel}% at ${signal.metadata?.levelPrice}`
    ];

    if (signal.metadata?.levelType) {
      factors.push(`Level type: ${signal.metadata.levelType}`);
    }

    if (signal.metadata?.priceAction) {
      const action = signal.metadata.priceAction;
      if (action.bouncing) factors.push('Price bouncing off level');
      if (action.rejecting) factors.push('Price rejected at level');
      if (action.breaking) factors.push('Price breaking through level');
      factors.push(`Volume: ${action.volume}`);
    }

    return {
      overall,
      technical,
      volume,
      momentum,
      factors
    };
  }

  /**
   * Calculate momentum score for Fibonacci signals
   * @param signal Trading signal
   * @returns Momentum score (0-100)
   */
  private calculateFibonacciMomentum(signal: TradingSignal): number {
    let momentum = 50;

    // Level significance
    const level = signal.metadata?.fibonacciLevel as string;
    if (level === '61.8') {
      momentum += 25; // Golden ratio - most significant
    } else if (level === '50.0') {
      momentum += 20; // Psychological level
    } else if (level === '38.2') {
      momentum += 15; // Common retracement
    } else {
      momentum += 10; // Other levels
    }

    // Price action momentum
    const priceAction = signal.metadata?.priceAction;
    if (priceAction?.bouncing || priceAction?.rejecting) {
      momentum += 15; // Strong reversal signal
    }
    if (priceAction?.breaking) {
      momentum += 10; // Breakout signal
    }

    // Volume momentum
    if (priceAction?.volume === 'high') {
      momentum += 10;
    }

    return Math.min(momentum, 100);
  }
}
