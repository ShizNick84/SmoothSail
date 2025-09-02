/**
 * Moving Average Strategy Implementation
 * 
 * This module implements Simple Moving Average (SMA) and Exponential Moving Average (EMA)
 * calculations with crossover signal detection and volume confirmation.
 * 
 * Requirements: 4.1, 4.8 - Moving average crossover with configurable periods and signal strength
 */

import { MarketData, MovingAverageSignal, TradingSignal, SignalConfidence } from './types';

export class MovingAverageStrategy {
  private readonly defaultFastPeriod = 20;
  private readonly defaultSlowPeriod = 50;
  private readonly volumeConfirmationThreshold = 1.5; // 50% above average volume

  /**
   * Calculate Simple Moving Average (SMA)
   * @param prices Array of price values
   * @param period Number of periods for calculation
   * @returns Array of SMA values or null if insufficient data
   */
  public calculateSMA(prices: number[], period: number): (number | null)[] | null {
    if (prices.length === 0) {
      return [];
    }

    if (prices.length < period) {
      return null;
    }

    if (prices.length === 1) {
      return [prices[0]];
    }

    const result: (number | null)[] = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((acc, price) => acc + price, 0);
        result.push(sum / period);
      }
    }

    return result;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   * @param prices Array of price values
   * @param period Number of periods for calculation
   * @returns Array of EMA values or null if insufficient data
   */
  public calculateEMA(prices: number[], period: number): (number | null)[] | null {
    if (prices.length === 0) {
      return [];
    }

    if (prices.length < period) {
      return null;
    }

    if (prices.length === 1) {
      return [prices[0]];
    }

    const result: (number | null)[] = [];
    const multiplier = 2 / (period + 1);
    
    // Fill initial values with null
    for (let i = 0; i < period - 1; i++) {
      result.push(null);
    }
    
    // Calculate first EMA as SMA
    const firstSMA = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    result.push(firstSMA);
    
    // Calculate subsequent EMAs
    let ema = firstSMA;
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
      result.push(ema);
    }

    return result;
  }

  /**
   * Calculate multiple EMAs for crossover analysis
   * @param marketData Array of market data
   * @param fastPeriod Fast EMA period (default: 20)
   * @param slowPeriod Slow EMA period (default: 50)
   * @returns Object containing fast and slow EMA values
   */
  public calculateEMACrossover(
    marketData: MarketData[],
    fastPeriod: number = this.defaultFastPeriod,
    slowPeriod: number = this.defaultSlowPeriod
  ): { fastEMA: number | null; slowEMA: number | null } {
    const prices = marketData.map(data => data.close);
    
    const fastEMAArray = this.calculateEMA(prices, fastPeriod);
    const slowEMAArray = this.calculateEMA(prices, slowPeriod);
    
    return {
      fastEMA: fastEMAArray && fastEMAArray.length > 0 ? fastEMAArray[fastEMAArray.length - 1] : null,
      slowEMA: slowEMAArray && slowEMAArray.length > 0 ? slowEMAArray[slowEMAArray.length - 1] : null
    };
  }

  /**
   * Detect moving average crossover signals
   * @param marketData Array of market data (minimum 2 periods for crossover detection)
   * @param fastPeriod Fast EMA period
   * @param slowPeriod Slow EMA period
   * @returns MovingAverageSignal with crossover information
   */
  public detectCrossover(
    marketData: MarketData[],
    fastPeriod: number = this.defaultFastPeriod,
    slowPeriod: number = this.defaultSlowPeriod
  ): MovingAverageSignal | null {
    if (!Array.isArray(marketData) || marketData.length < Math.max(fastPeriod, slowPeriod) + 1) {
      return null;
    }

    // Calculate current EMAs
    const currentData = marketData.slice(0, marketData.length);
    const previousData = marketData.slice(0, marketData.length - 1);

    const current = this.calculateEMACrossover(currentData, fastPeriod, slowPeriod);
    const previous = this.calculateEMACrossover(previousData, fastPeriod, slowPeriod);

    if (!current.fastEMA || !current.slowEMA || !previous.fastEMA || !previous.slowEMA) {
      return null;
    }

    // Determine crossover type
    let crossoverType: 'GOLDEN_CROSS' | 'DEATH_CROSS' | 'NONE' = 'NONE';
    let strength = 0;

    // Golden Cross: Fast EMA crosses above Slow EMA (bullish)
    if (previous.fastEMA <= previous.slowEMA && current.fastEMA > current.slowEMA) {
      crossoverType = 'GOLDEN_CROSS';
      strength = this.calculateCrossoverStrength(current.fastEMA, current.slowEMA, 'bullish');
    }
    // Death Cross: Fast EMA crosses below Slow EMA (bearish)
    else if (previous.fastEMA >= previous.slowEMA && current.fastEMA < current.slowEMA) {
      crossoverType = 'DEATH_CROSS';
      strength = this.calculateCrossoverStrength(current.fastEMA, current.slowEMA, 'bearish');
    }

    // Check volume confirmation
    const volumeConfirmed = this.isVolumeConfirmed(marketData);

    const latestData = marketData[marketData.length - 1];

    return {
      name: 'EMA',
      value: current.fastEMA,
      timestamp: latestData.timestamp,
      period: fastPeriod,
      parameters: {
        fastPeriod,
        slowPeriod,
        slowEMA: current.slowEMA
      },
      crossover: {
        type: crossoverType,
        strength,
        volumeConfirmed
      }
    };
  }

  /**
   * Calculate crossover strength based on EMA separation
   * @param fastEMA Fast EMA value
   * @param slowEMA Slow EMA value
   * @param direction Crossover direction
   * @returns Strength score (0-100)
   */
  private calculateCrossoverStrength(
    fastEMA: number,
    slowEMA: number,
    direction: 'bullish' | 'bearish'
  ): number {
    const separation = Math.abs(fastEMA - slowEMA);
    const averagePrice = (fastEMA + slowEMA) / 2;
    const separationPercentage = (separation / averagePrice) * 100;

    // Normalize to 0-100 scale (higher separation = stronger signal)
    // Typical separation ranges from 0.1% to 5% for most assets
    const strength = Math.min(separationPercentage * 20, 100);
    
    return Math.round(strength);
  }

  /**
   * Check if current volume confirms the crossover signal
   * @param marketData Array of market data
   * @returns True if volume is above average threshold
   */
  private isVolumeConfirmed(marketData: MarketData[]): boolean {
    if (marketData.length < 20) {
      return false; // Need at least 20 periods for volume analysis
    }

    const currentVolume = marketData[marketData.length - 1].volume;
    const averageVolume = marketData.slice(-20)
      .reduce((sum, data) => sum + data.volume, 0) / 20;

    return currentVolume >= (averageVolume * this.volumeConfirmationThreshold);
  }

  /**
   * Generate trading signal based on moving average crossover
   * @param marketData Array of market data
   * @param fastPeriod Fast EMA period
   * @param slowPeriod Slow EMA period
   * @returns TradingSignal or null if no signal
   */
  public generateSignal(
    marketData: MarketData[],
    fastPeriod: number = this.defaultFastPeriod,
    slowPeriod: number = this.defaultSlowPeriod
  ): TradingSignal | null {
    if (!Array.isArray(marketData) || marketData.length === 0) {
      return null;
    }

    const crossover = this.detectCrossover(marketData, fastPeriod, slowPeriod);
    
    if (!crossover || !crossover.crossover || crossover.crossover.type === 'NONE') {
      return {
        id: `ma_hold_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol: marketData[marketData.length - 1].symbol,
        type: 'HOLD',
        strength: 0,
        confidence: 50,
        indicators: [`EMA_${fastPeriod}`, `EMA_${slowPeriod}`],
        reasoning: 'No clear crossover signal detected',
        riskReward: 1.0,
        timestamp: marketData[marketData.length - 1].timestamp,
        metadata: {}
      };
    }

    const latestData = marketData[marketData.length - 1];
    const signalType = crossover.crossover.type === 'GOLDEN_CROSS' ? 'BUY' : 'SELL';
    
    // Calculate confidence based on strength and volume confirmation
    let confidence = crossover.crossover.strength;
    if (crossover.crossover.volumeConfirmed) {
      confidence = Math.min(confidence + 20, 100); // Boost confidence with volume
    }

    // Calculate risk-reward ratio (simplified for MA strategy)
    const riskReward = this.calculateRiskReward(marketData, signalType);

    return {
      id: `ma_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: latestData.symbol,
      type: signalType,
      strength: crossover.crossover.strength,
      confidence,
      indicators: [`EMA_${fastPeriod}`, `EMA_${slowPeriod}`],
      reasoning: this.generateReasoning(crossover, fastPeriod, slowPeriod),
      riskReward,
      timestamp: latestData.timestamp,
      metadata: {
        fastEMA: crossover.value,
        slowEMA: crossover.parameters.slowEMA,
        volumeConfirmed: crossover.crossover.volumeConfirmed,
        crossoverType: crossover.crossover.type
      }
    };
  }

  /**
   * Calculate risk-reward ratio for MA strategy
   * @param marketData Array of market data
   * @param signalType Signal type (BUY/SELL)
   * @returns Risk-reward ratio
   */
  private calculateRiskReward(marketData: MarketData[], signalType: 'BUY' | 'SELL'): number {
    const currentPrice = marketData[marketData.length - 1].close;
    const recentHigh = Math.max(...marketData.slice(-20).map(d => d.high));
    const recentLow = Math.min(...marketData.slice(-20).map(d => d.low));

    if (signalType === 'BUY') {
      const target = recentHigh;
      const stopLoss = recentLow;
      const reward = target - currentPrice;
      const risk = currentPrice - stopLoss;
      return risk > 0 ? reward / risk : 1.0;
    } else {
      const target = recentLow;
      const stopLoss = recentHigh;
      const reward = currentPrice - target;
      const risk = stopLoss - currentPrice;
      return risk > 0 ? reward / risk : 1.0;
    }
  }

  /**
   * Generate human-readable reasoning for the signal
   * @param crossover MovingAverageSignal data
   * @param fastPeriod Fast EMA period
   * @param slowPeriod Slow EMA period
   * @returns Reasoning string
   */
  private generateReasoning(
    crossover: MovingAverageSignal,
    fastPeriod: number,
    slowPeriod: number
  ): string {
    const { type, strength, volumeConfirmed } = crossover.crossover!;
    const volumeText = volumeConfirmed ? ' with strong volume confirmation' : ' with weak volume';
    
    if (type === 'GOLDEN_CROSS') {
      return `Golden Cross detected: ${fastPeriod}-period EMA crossed above ${slowPeriod}-period EMA${volumeText}. Signal strength: ${strength}/100. This indicates potential bullish momentum.`;
    } else {
      return `Death Cross detected: ${fastPeriod}-period EMA crossed below ${slowPeriod}-period EMA${volumeText}. Signal strength: ${strength}/100. This indicates potential bearish momentum.`;
    }
  }

  /**
   * Evaluate signal confidence based on multiple factors
   * @param marketData Array of market data
   * @param signal Generated trading signal
   * @returns SignalConfidence object
   */
  public evaluateSignalConfidence(marketData: MarketData[], signal: TradingSignal): SignalConfidence {
    const technical = signal.strength;
    const volume = signal.metadata?.volumeConfirmed ? 80 : 40;
    
    // Calculate momentum based on recent price action
    const recentPrices = marketData.slice(-5).map(d => d.close);
    const momentum = this.calculateMomentumScore(recentPrices, signal.type);
    
    const overall = Math.round((technical * 0.4 + volume * 0.3 + momentum * 0.3));
    
    const factors = [
      `EMA crossover strength: ${technical}/100`,
      `Volume confirmation: ${volume}/100`,
      `Price momentum: ${momentum}/100`
    ];

    return {
      overall,
      technical,
      volume,
      momentum,
      factors
    };
  }

  /**
   * Calculate momentum score based on recent price action
   * @param prices Recent price array
   * @param signalType Signal direction
   * @returns Momentum score (0-100)
   */
  private calculateMomentumScore(prices: number[], signalType: 'BUY' | 'SELL'): number {
    if (prices.length < 3) return 50;

    const priceChange = (prices[prices.length - 1] - prices[0]) / prices[0];
    const expectedDirection = signalType === 'BUY' ? 1 : -1;
    const alignment = priceChange * expectedDirection;

    // Convert to 0-100 scale
    return Math.max(0, Math.min(100, 50 + (alignment * 1000)));
  }

  /**
   * Confirm signal with volume analysis
   * @param volumes Array of volume data
   * @param currentIndex Current index to analyze
   * @returns True if volume confirms the signal
   */
  public confirmWithVolume(volumes: number[], currentIndex: number): boolean {
    if (volumes.length < 5 || currentIndex < 4) {
      return false;
    }

    const currentVolume = volumes[currentIndex];
    const averageVolume = volumes.slice(currentIndex - 4, currentIndex)
      .reduce((sum, vol) => sum + vol, 0) / 4;

    return currentVolume >= (averageVolume * this.volumeConfirmationThreshold);
  }

  /**
   * Calculate signal strength based on price movements and crossover type
   * @param prices Array of price data
   * @param crossoverType Type of crossover detected
   * @returns Signal strength (0-100)
   */
  public calculateSignalStrength(prices: number[], crossoverType: string): number {
    if (crossoverType === 'INVALID' || prices.length < 5) {
      return 0;
    }

    const recentPrices = prices.slice(-5);
    const priceRange = Math.max(...recentPrices) - Math.min(...recentPrices);
    const averagePrice = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    
    // Calculate volatility as a percentage
    const volatility = (priceRange / averagePrice) * 100;
    
    // Higher volatility generally means stronger signals
    // Scale to 0-100 range
    const strength = Math.min(volatility * 10, 100);
    
    return Math.round(strength);
  }

  /**
   * Constructor with configuration validation
   * @param config Configuration object
   */
  constructor(config?: { fastPeriod?: number; slowPeriod?: number }) {
    if (config) {
      if (config.fastPeriod !== undefined) {
        if (config.fastPeriod <= 0) {
          throw new Error('Fast period must be greater than 0');
        }
        // Override default if provided
        (this as any).defaultFastPeriod = config.fastPeriod;
      }
      
      if (config.slowPeriod !== undefined) {
        if (config.slowPeriod <= 0) {
          throw new Error('Slow period must be greater than 0');
        }
        // Override default if provided
        (this as any).defaultSlowPeriod = config.slowPeriod;
      }
      
      // Validate that fast period is less than slow period
      const fastPeriod = config.fastPeriod || this.defaultFastPeriod;
      const slowPeriod = config.slowPeriod || this.defaultSlowPeriod;
      
      if (fastPeriod >= slowPeriod) {
        throw new Error('Fast period must be less than slow period');
      }
    }
  }
}
