/**
 * MACD (Moving Average Convergence Divergence) Trend Following Strategy Implementation
 * 
 * This module implements MACD calculation with signal line crossovers, histogram analysis,
 * and divergence detection for trend following signals.
 * 
 * Requirements: 4.4, 4.8 - MACD trend following with 12/26/9 parameters and divergence detection
 */

import { MarketData, MACDSignal, TradingSignal, SignalConfidence } from './types';

export class MACDStrategy {
  private readonly fastPeriod = 12;
  private readonly slowPeriod = 26;
  private readonly signalPeriod = 9;

  /**
   * Constructor with configuration validation
   * @param config Configuration object
   */
  constructor(config?: { fastPeriod?: number; slowPeriod?: number; signalPeriod?: number; symbol?: string }) {
    if (config) {
      if (config.fastPeriod !== undefined) {
        if (config.fastPeriod <= 0) {
          throw new Error('Fast period must be greater than 0');
        }
        (this as any).fastPeriod = config.fastPeriod;
      }
      
      if (config.slowPeriod !== undefined) {
        if (config.slowPeriod <= 0) {
          throw new Error('Slow period must be greater than 0');
        }
        (this as any).slowPeriod = config.slowPeriod;
      }
      
      if (config.signalPeriod !== undefined) {
        if (config.signalPeriod <= 0) {
          throw new Error('Signal period must be greater than 0');
        }
        (this as any).signalPeriod = config.signalPeriod;
      }
      
      // Validate that fast period is less than slow period
      const fastPeriod = config.fastPeriod || this.fastPeriod;
      const slowPeriod = config.slowPeriod || this.slowPeriod;
      
      if (fastPeriod >= slowPeriod) {
        throw new Error('Fast period must be less than slow period');
      }
    }
  }

  /**
   * Calculate Exponential Moving Average
   * @param prices Array of prices
   * @param period EMA period
   * @returns EMA value or null if insufficient data
   */
  private calculateEMA(prices: number[], period: number): number | null {
    if (prices.length < period) {
      return null;
    }

    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  /**
   * Calculate MACD line, Signal line, and Histogram
   * @param marketData Array of market data
   * @param fastPeriod Fast EMA period (default: 12)
   * @param slowPeriod Slow EMA period (default: 26)
   * @param signalPeriod Signal line EMA period (default: 9)
   * @returns MACD components or null if insufficient data
   */
  public calculateMACD(
    marketData: MarketData[],
    fastPeriod: number = this.fastPeriod,
    slowPeriod: number = this.slowPeriod,
    signalPeriod: number = this.signalPeriod
  ): { macd: number; signal: number; histogram: number } | null {
    if (marketData.length < slowPeriod + signalPeriod) {
      return null;
    }

    const prices = marketData.map(data => data.close);
    
    // Calculate fast and slow EMAs
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);

    if (fastEMA === null || slowEMA === null) {
      return null;
    }

    // MACD line = Fast EMA - Slow EMA
    const macd = fastEMA - slowEMA;

    // Calculate signal line (EMA of MACD line)
    // We need to calculate MACD for all periods to get signal line
    const macdValues: number[] = [];
    
    for (let i = slowPeriod - 1; i < marketData.length; i++) {
      const periodPrices = prices.slice(0, i + 1);
      const periodFastEMA = this.calculateEMA(periodPrices, fastPeriod);
      const periodSlowEMA = this.calculateEMA(periodPrices, slowPeriod);
      
      if (periodFastEMA !== null && periodSlowEMA !== null) {
        macdValues.push(periodFastEMA - periodSlowEMA);
      }
    }

    if (macdValues.length < signalPeriod) {
      return null;
    }

    const signal = this.calculateEMA(macdValues, signalPeriod);
    
    if (signal === null) {
      return null;
    }

    // Histogram = MACD - Signal
    const histogram = macd - signal;

    return {
      macd: Math.round(macd * 10000) / 10000, // Round to 4 decimal places
      signal: Math.round(signal * 10000) / 10000,
      histogram: Math.round(histogram * 10000) / 10000
    };
  }

  /**
   * Detect MACD crossover signals
   * @param marketData Array of market data (minimum 2 periods for crossover detection)
   * @param fastPeriod Fast EMA period
   * @param slowPeriod Slow EMA period
   * @param signalPeriod Signal line period
   * @returns Crossover information
   */
  public detectCrossover(
    marketData: MarketData[],
    fastPeriod: number = this.fastPeriod,
    slowPeriod: number = this.slowPeriod,
    signalPeriod: number = this.signalPeriod
  ): { type: 'BULLISH' | 'BEARISH' | 'NONE'; strength: number } {
    if (marketData.length < slowPeriod + signalPeriod + 1) {
      return { type: 'NONE', strength: 0 };
    }

    // Calculate current and previous MACD
    const current = this.calculateMACD(marketData, fastPeriod, slowPeriod, signalPeriod);
    const previous = this.calculateMACD(
      marketData.slice(0, -1),
      fastPeriod,
      slowPeriod,
      signalPeriod
    );

    if (!current || !previous) {
      return { type: 'NONE', strength: 0 };
    }

    let crossoverType: 'BULLISH' | 'BEARISH' | 'NONE' = 'NONE';
    let strength = 0;

    // Bullish crossover: MACD crosses above Signal line
    if (previous.macd <= previous.signal && current.macd > current.signal) {
      crossoverType = 'BULLISH';
      strength = this.calculateCrossoverStrength(current, 'bullish');
    }
    // Bearish crossover: MACD crosses below Signal line
    else if (previous.macd >= previous.signal && current.macd < current.signal) {
      crossoverType = 'BEARISH';
      strength = this.calculateCrossoverStrength(current, 'bearish');
    }

    return { type: crossoverType, strength };
  }

  /**
   * Calculate crossover strength based on MACD components
   * @param macdData Current MACD data
   * @param direction Crossover direction
   * @returns Strength score (0-100)
   */
  private calculateCrossoverStrength(
    macdData: { macd: number; signal: number; histogram: number },
    direction: 'bullish' | 'bearish'
  ): number {
    // Base strength on histogram magnitude
    const histogramMagnitude = Math.abs(macdData.histogram);
    
    // Base strength on MACD line position (above/below zero)
    let positionBonus = 0;
    if (direction === 'bullish' && macdData.macd > 0) {
      positionBonus = 20; // Bullish crossover above zero line is stronger
    } else if (direction === 'bearish' && macdData.macd < 0) {
      positionBonus = 20; // Bearish crossover below zero line is stronger
    }

    // Calculate strength (normalize histogram to 0-80 scale, add position bonus)
    const normalizedHistogram = Math.min(histogramMagnitude * 1000, 80);
    const strength = normalizedHistogram + positionBonus;

    return Math.min(Math.round(strength), 100);
  }

  /**
   * Detect MACD divergence patterns
   * @param marketData Array of market data
   * @param fastPeriod Fast EMA period
   * @param slowPeriod Slow EMA period
   * @param signalPeriod Signal line period
   * @returns Divergence information
   */
  public detectDivergence(
    marketData: MarketData[],
    fastPeriod: number = this.fastPeriod,
    slowPeriod: number = this.slowPeriod,
    signalPeriod: number = this.signalPeriod
  ): { type: 'BULLISH' | 'BEARISH' | 'NONE'; strength: number } {
    if (marketData.length < (slowPeriod + signalPeriod) * 2) {
      return { type: 'NONE', strength: 0 };
    }

    // Calculate MACD values for the entire dataset
    const macdValues: Array<{ macd: number; price: number; index: number }> = [];
    
    for (let i = slowPeriod + signalPeriod - 1; i < marketData.length; i++) {
      const macdData = this.calculateMACD(
        marketData.slice(0, i + 1),
        fastPeriod,
        slowPeriod,
        signalPeriod
      );
      
      if (macdData) {
        macdValues.push({
          macd: macdData.macd,
          price: marketData[i].close,
          index: i
        });
      }
    }

    if (macdValues.length < 20) {
      return { type: 'NONE', strength: 0 };
    }

    // Get recent data for divergence analysis
    const recentData = macdValues.slice(-20);
    
    // Find local highs and lows
    const priceHighs = this.findLocalExtremes(recentData.map(d => d.price), 'high');
    const priceLows = this.findLocalExtremes(recentData.map(d => d.price), 'low');
    const macdHighs = this.findLocalExtremes(recentData.map(d => d.macd), 'high');
    const macdLows = this.findLocalExtremes(recentData.map(d => d.macd), 'low');

    // Check for bullish divergence (price makes lower lows, MACD makes higher lows)
    if (priceLows.length >= 2 && macdLows.length >= 2) {
      const priceSlope = priceLows[priceLows.length - 1].value - priceLows[priceLows.length - 2].value;
      const macdSlope = macdLows[macdLows.length - 1].value - macdLows[macdLows.length - 2].value;

      if (priceSlope < 0 && macdSlope > 0) {
        const strength = this.calculateDivergenceStrength(Math.abs(priceSlope), Math.abs(macdSlope));
        return { type: 'BULLISH', strength };
      }
    }

    // Check for bearish divergence (price makes higher highs, MACD makes lower highs)
    if (priceHighs.length >= 2 && macdHighs.length >= 2) {
      const priceSlope = priceHighs[priceHighs.length - 1].value - priceHighs[priceHighs.length - 2].value;
      const macdSlope = macdHighs[macdHighs.length - 1].value - macdHighs[macdHighs.length - 2].value;

      if (priceSlope > 0 && macdSlope < 0) {
        const strength = this.calculateDivergenceStrength(Math.abs(priceSlope), Math.abs(macdSlope));
        return { type: 'BEARISH', strength };
      }
    }

    return { type: 'NONE', strength: 0 };
  }

  /**
   * Find local extremes in data series
   * @param data Array of values
   * @param type Type of extreme to find
   * @returns Array of extreme points
   */
  private findLocalExtremes(
    data: number[],
    type: 'high' | 'low'
  ): Array<{ index: number; value: number }> {
    const extremes: Array<{ index: number; value: number }> = [];
    const lookback = 3;

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
   * Calculate divergence strength
   * @param priceSlope Price slope magnitude
   * @param macdSlope MACD slope magnitude
   * @returns Strength score (0-100)
   */
  private calculateDivergenceStrength(priceSlope: number, macdSlope: number): number {
    const normalizedPriceSlope = Math.min(priceSlope * 100, 10);
    const normalizedMacdSlope = Math.min(macdSlope * 1000, 20);
    
    const strength = (normalizedPriceSlope + normalizedMacdSlope) * 2.5;
    return Math.min(Math.round(strength), 100);
  }

  /**
   * Generate MACD signal with crossover and divergence analysis
   * @param marketData Array of market data
   * @param fastPeriod Fast EMA period
   * @param slowPeriod Slow EMA period
   * @param signalPeriod Signal line period
   * @returns MACDSignal or null if insufficient data
   */
  public generateMACDSignal(
    marketData: MarketData[],
    fastPeriod: number = this.fastPeriod,
    slowPeriod: number = this.slowPeriod,
    signalPeriod: number = this.signalPeriod
  ): MACDSignal | null {
    const macdData = this.calculateMACD(marketData, fastPeriod, slowPeriod, signalPeriod);
    if (!macdData) {
      return null;
    }

    const crossover = this.detectCrossover(marketData, fastPeriod, slowPeriod, signalPeriod);
    const latestData = marketData[marketData.length - 1];

    return {
      name: 'MACD',
      value: macdData.macd,
      timestamp: latestData.timestamp,
      parameters: {
        fastPeriod,
        slowPeriod,
        signalPeriod
      },
      macd: macdData.macd,
      signal: macdData.signal,
      histogram: macdData.histogram,
      crossover: crossover.type !== 'NONE' ? crossover : undefined
    };
  }

  /**
   * Generate trading signal based on MACD analysis
   * @param marketData Array of market data
   * @param fastPeriod Fast EMA period
   * @param slowPeriod Slow EMA period
   * @param signalPeriod Signal line period
   * @returns TradingSignal or null if no signal
   */
  public generateSignal(
    marketData: MarketData[],
    fastPeriod: number = this.fastPeriod,
    slowPeriod: number = this.slowPeriod,
    signalPeriod: number = this.signalPeriod
  ): TradingSignal | null {
    const macdSignal = this.generateMACDSignal(marketData, fastPeriod, slowPeriod, signalPeriod);
    if (!macdSignal) {
      return null;
    }

    const divergence = this.detectDivergence(marketData, fastPeriod, slowPeriod, signalPeriod);
    const latestData = marketData[marketData.length - 1];
    
    let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;
    let reasoning = '';

    // Primary signal from crossover
    if (macdSignal.crossover) {
      if (macdSignal.crossover.type === 'BULLISH') {
        signalType = 'BUY';
        strength = macdSignal.crossover.strength;
        reasoning = `MACD bullish crossover: MACD (${macdSignal.macd.toFixed(4)}) crossed above Signal (${macdSignal.signal.toFixed(4)})`;
        
        // Boost strength if MACD is above zero line
        if (macdSignal.macd > 0) {
          strength = Math.min(strength + 15, 100);
          reasoning += ' above zero line';
        }
      } else if (macdSignal.crossover.type === 'BEARISH') {
        signalType = 'SELL';
        strength = macdSignal.crossover.strength;
        reasoning = `MACD bearish crossover: MACD (${macdSignal.macd.toFixed(4)}) crossed below Signal (${macdSignal.signal.toFixed(4)})`;
        
        // Boost strength if MACD is below zero line
        if (macdSignal.macd < 0) {
          strength = Math.min(strength + 15, 100);
          reasoning += ' below zero line';
        }
      }
    }

    // Secondary signal from divergence (if no crossover)
    if (signalType === 'HOLD' && divergence.type !== 'NONE') {
      if (divergence.type === 'BULLISH') {
        signalType = 'BUY';
        strength = divergence.strength * 0.8; // Reduce strength for divergence-only signals
        reasoning = `MACD bullish divergence detected (strength: ${divergence.strength})`;
      } else {
        signalType = 'SELL';
        strength = divergence.strength * 0.8;
        reasoning = `MACD bearish divergence detected (strength: ${divergence.strength})`;
      }
    }

    // Enhance signal with divergence confirmation
    if (signalType !== 'HOLD' && macdSignal.crossover && divergence.type !== 'NONE') {
      if ((signalType === 'BUY' && divergence.type === 'BULLISH') ||
          (signalType === 'SELL' && divergence.type === 'BEARISH')) {
        strength = Math.min(strength + divergence.strength * 0.2, 100);
        reasoning += ` with ${divergence.type.toLowerCase()} divergence confirmation`;
      }
    }

    if (signalType === 'HOLD') {
      return null; // No actionable signal
    }

    // Calculate confidence
    const confidence = this.calculateSignalConfidence(macdSignal, marketData, divergence);

    // Calculate risk-reward ratio
    const riskReward = this.calculateRiskReward(marketData, signalType, macdSignal);

    return {
      id: `macd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: latestData.symbol,
      type: signalType,
      strength: Math.round(strength),
      confidence: Math.round(confidence),
      indicators: [`MACD_${fastPeriod}_${slowPeriod}_${signalPeriod}`],
      reasoning,
      riskReward,
      timestamp: latestData.timestamp,
      metadata: {
        macd: macdSignal.macd,
        signal: macdSignal.signal,
        histogram: macdSignal.histogram,
        crossover: macdSignal.crossover,
        divergence: divergence.type !== 'NONE' ? divergence : undefined,
        aboveZero: macdSignal.macd > 0,
        histogramIncreasing: this.isHistogramIncreasing(marketData, fastPeriod, slowPeriod, signalPeriod)
      }
    };
  }

  /**
   * Check if histogram is increasing (momentum building)
   * @param marketData Market data
   * @param fastPeriod Fast period
   * @param slowPeriod Slow period
   * @param signalPeriod Signal period
   * @returns True if histogram is increasing
   */
  private isHistogramIncreasing(
    marketData: MarketData[],
    fastPeriod: number,
    slowPeriod: number,
    signalPeriod: number
  ): boolean {
    if (marketData.length < slowPeriod + signalPeriod + 3) {
      return false;
    }

    const current = this.calculateMACD(marketData, fastPeriod, slowPeriod, signalPeriod);
    const previous = this.calculateMACD(
      marketData.slice(0, -1),
      fastPeriod,
      slowPeriod,
      signalPeriod
    );
    const beforePrevious = this.calculateMACD(
      marketData.slice(0, -2),
      fastPeriod,
      slowPeriod,
      signalPeriod
    );

    if (!current || !previous || !beforePrevious) {
      return false;
    }

    return current.histogram > previous.histogram && previous.histogram > beforePrevious.histogram;
  }

  /**
   * Calculate signal confidence
   * @param macdSignal MACD signal data
   * @param marketData Market data
   * @param divergence Divergence data
   * @returns Confidence score (0-100)
   */
  private calculateSignalConfidence(
    macdSignal: MACDSignal,
    marketData: MarketData[],
    divergence: { type: 'BULLISH' | 'BEARISH' | 'NONE'; strength: number }
  ): number {
    let confidence = 50; // Base confidence

    // Crossover confidence
    if (macdSignal.crossover) {
      confidence += macdSignal.crossover.strength * 0.3;
      
      // Zero line position bonus
      if ((macdSignal.crossover.type === 'BULLISH' && macdSignal.macd > 0) ||
          (macdSignal.crossover.type === 'BEARISH' && macdSignal.macd < 0)) {
        confidence += 15;
      }
    }

    // Divergence confidence
    if (divergence.type !== 'NONE') {
      confidence += divergence.strength * 0.2;
    }

    // Histogram momentum
    if (this.isHistogramIncreasing(marketData, this.fastPeriod, this.slowPeriod, this.signalPeriod)) {
      confidence += 10;
    }

    // Volume confirmation
    if (marketData.length >= 20) {
      const currentVolume = marketData[marketData.length - 1].volume;
      const avgVolume = marketData.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
      
      if (currentVolume > avgVolume * 1.2) {
        confidence += 10;
      }
    }

    return Math.min(Math.round(confidence), 100);
  }

  /**
   * Calculate risk-reward ratio for MACD-based trades
   * @param marketData Market data
   * @param signalType Signal type
   * @param macdSignal MACD signal data
   * @returns Risk-reward ratio
   */
  private calculateRiskReward(
    marketData: MarketData[],
    signalType: 'BUY' | 'SELL',
    macdSignal: MACDSignal
  ): number {
    const currentPrice = marketData[marketData.length - 1].close;
    const recentHigh = Math.max(...marketData.slice(-20).map(d => d.high));
    const recentLow = Math.min(...marketData.slice(-20).map(d => d.low));

    if (signalType === 'BUY') {
      const target = recentHigh;
      const stopLoss = recentLow;
      
      // Adjust based on MACD position
      const macdAdjustment = macdSignal.macd > 0 ? 1.1 : 1.0;
      
      const reward = (target - currentPrice) * macdAdjustment;
      const risk = currentPrice - stopLoss;
      
      return risk > 0 ? reward / risk : 1.0;
    } else {
      const target = recentLow;
      const stopLoss = recentHigh;
      
      // Adjust based on MACD position
      const macdAdjustment = macdSignal.macd < 0 ? 1.1 : 1.0;
      
      const reward = (currentPrice - target) * macdAdjustment;
      const risk = stopLoss - currentPrice;
      
      return risk > 0 ? reward / risk : 1.0;
    }
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

    // Momentum analysis
    const momentum = this.calculateMomentumScore(marketData, signal);
    
    const overall = Math.round((technical * 0.4 + volume * 0.2 + momentum * 0.4));
    
    const factors = [
      `MACD signal strength: ${technical}/100`,
      `Volume confirmation: ${volume}/100`,
      `Trend momentum: ${momentum}/100`,
      `MACD position: ${signal.metadata?.aboveZero ? 'above' : 'below'} zero line`
    ];

    if (signal.metadata?.crossover) {
      factors.push(`Crossover: ${signal.metadata.crossover.type} (${signal.metadata.crossover.strength})`);
    }

    if (signal.metadata?.divergence) {
      factors.push(`Divergence: ${signal.metadata.divergence.type} (${signal.metadata.divergence.strength})`);
    }

    if (signal.metadata?.histogramIncreasing) {
      factors.push('Histogram increasing (momentum building)');
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
   * Calculate momentum score for MACD signals
   * @param marketData Market data
   * @param signal Trading signal
   * @returns Momentum score (0-100)
   */
  private calculateMomentumScore(marketData: MarketData[], signal: TradingSignal): number {
    let momentum = 50;

    // MACD position relative to zero
    const macd = signal.metadata?.macd as number;
    if ((signal.type === 'BUY' && macd > 0) || (signal.type === 'SELL' && macd < 0)) {
      momentum += 20; // Signal in favorable zone
    }

    // Histogram momentum
    if (signal.metadata?.histogramIncreasing) {
      momentum += 15;
    }

    // Crossover strength
    if (signal.metadata?.crossover) {
      momentum += (signal.metadata.crossover.strength as number) * 0.15;
    }

    // Price trend alignment
    if (marketData.length >= 10) {
      const recentPrices = marketData.slice(-10).map(d => d.close);
      const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];
      
      if ((signal.type === 'BUY' && priceChange > 0) || (signal.type === 'SELL' && priceChange < 0)) {
        momentum += 10; // Price trend aligns with signal
      }
    }

    return Math.min(momentum, 100);
  }
}
