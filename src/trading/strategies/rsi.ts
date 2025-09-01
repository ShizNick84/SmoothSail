/**
 * RSI (Relative Strength Index) Momentum Strategy Implementation
 * 
 * This module implements RSI calculation with overbought/oversold signal detection,
 * divergence analysis, and momentum-based entry/exit signals.
 * 
 * Requirements: 4.3, 4.8 - RSI momentum strategy with 14-period calculation and 70/30 thresholds
 */

import { MarketData, RSISignal, TradingSignal, SignalConfidence } from './types';

export class RSIStrategy {
  private readonly defaultPeriod = 14;
  private readonly overboughtThreshold = 70;
  private readonly oversoldThreshold = 30;
  private readonly extremeOverboughtThreshold = 80;
  private readonly extremeOversoldThreshold = 20;

  /**
   * Calculate RSI (Relative Strength Index)
   * @param marketData Array of market data
   * @param period RSI period (default: 14)
   * @returns RSI value or null if insufficient data
   */
  public calculateRSI(marketData: MarketData[], period: number = this.defaultPeriod): number | null {
    if (marketData.length < period + 1) {
      return null;
    }

    const prices = marketData.map(data => data.close);
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    if (gains.length < period) {
      return null;
    }

    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    // Calculate smoothed averages using Wilder's smoothing method
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    }

    // Avoid division by zero
    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return Math.round(rsi * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Detect RSI divergence patterns
   * @param marketData Array of market data (minimum 28 periods for reliable divergence)
   * @param period RSI period
   * @returns Divergence information or null
   */
  public detectDivergence(
    marketData: MarketData[],
    period: number = this.defaultPeriod
  ): { type: 'BULLISH' | 'BEARISH' | 'NONE'; strength: number } {
    if (marketData.length < period * 2) {
      return { type: 'NONE', strength: 0 };
    }

    // Calculate RSI values for the entire dataset
    const rsiValues: number[] = [];
    for (let i = period; i < marketData.length; i++) {
      const rsi = this.calculateRSI(marketData.slice(0, i + 1), period);
      if (rsi !== null) {
        rsiValues.push(rsi);
      }
    }

    if (rsiValues.length < period) {
      return { type: 'NONE', strength: 0 };
    }

    // Get recent price and RSI data for divergence analysis
    const recentPrices = marketData.slice(-period).map(d => d.close);
    const recentRSI = rsiValues.slice(-period);

    // Find local highs and lows
    const priceHighs = this.findLocalExtremes(recentPrices, 'high');
    const priceLows = this.findLocalExtremes(recentPrices, 'low');
    const rsiHighs = this.findLocalExtremes(recentRSI, 'high');
    const rsiLows = this.findLocalExtremes(recentRSI, 'low');

    // Check for bullish divergence (price makes lower lows, RSI makes higher lows)
    if (priceLows.length >= 2 && rsiLows.length >= 2) {
      const priceSlope = priceLows[priceLows.length - 1].value - priceLows[priceLows.length - 2].value;
      const rsiSlope = rsiLows[rsiLows.length - 1].value - rsiLows[rsiLows.length - 2].value;

      if (priceSlope < 0 && rsiSlope > 0) {
        const strength = this.calculateDivergenceStrength(Math.abs(priceSlope), Math.abs(rsiSlope));
        return { type: 'BULLISH', strength };
      }
    }

    // Check for bearish divergence (price makes higher highs, RSI makes lower highs)
    if (priceHighs.length >= 2 && rsiHighs.length >= 2) {
      const priceSlope = priceHighs[priceHighs.length - 1].value - priceHighs[priceHighs.length - 2].value;
      const rsiSlope = rsiHighs[rsiHighs.length - 1].value - rsiHighs[rsiHighs.length - 2].value;

      if (priceSlope > 0 && rsiSlope < 0) {
        const strength = this.calculateDivergenceStrength(Math.abs(priceSlope), Math.abs(rsiSlope));
        return { type: 'BEARISH', strength };
      }
    }

    return { type: 'NONE', strength: 0 };
  }

  /**
   * Find local extremes (highs or lows) in a data series
   * @param data Array of values
   * @param type Type of extreme to find
   * @returns Array of extreme points with index and value
   */
  private findLocalExtremes(
    data: number[],
    type: 'high' | 'low'
  ): Array<{ index: number; value: number }> {
    const extremes: Array<{ index: number; value: number }> = [];
    const lookback = 3; // Look 3 periods back and forward

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
   * Calculate divergence strength based on price and RSI slopes
   * @param priceSlope Absolute price slope
   * @param rsiSlope Absolute RSI slope
   * @returns Strength score (0-100)
   */
  private calculateDivergenceStrength(priceSlope: number, rsiSlope: number): number {
    // Normalize slopes and calculate strength
    const normalizedPriceSlope = Math.min(priceSlope * 100, 10); // Cap at 10%
    const normalizedRsiSlope = Math.min(rsiSlope, 20); // Cap at 20 RSI points

    const strength = (normalizedPriceSlope + normalizedRsiSlope) * 2.5;
    return Math.min(Math.round(strength), 100);
  }

  /**
   * Generate RSI signal with overbought/oversold and divergence analysis
   * @param marketData Array of market data
   * @param period RSI period
   * @returns RSISignal or null if insufficient data
   */
  public generateRSISignal(
    marketData: MarketData[],
    period: number = this.defaultPeriod
  ): RSISignal | null {
    const rsi = this.calculateRSI(marketData, period);
    if (rsi === null) {
      return null;
    }

    const divergence = this.detectDivergence(marketData, period);
    const latestData = marketData[marketData.length - 1];

    return {
      name: 'RSI',
      value: rsi,
      timestamp: latestData.timestamp,
      period,
      parameters: {
        overboughtThreshold: this.overboughtThreshold,
        oversoldThreshold: this.oversoldThreshold
      },
      overbought: rsi >= this.overboughtThreshold,
      oversold: rsi <= this.oversoldThreshold,
      divergence: divergence.type !== 'NONE' ? divergence : undefined
    };
  }

  /**
   * Generate trading signal based on RSI analysis
   * @param marketData Array of market data
   * @param period RSI period
   * @returns TradingSignal or null if no signal
   */
  public generateSignal(
    marketData: MarketData[],
    period: number = this.defaultPeriod
  ): TradingSignal | null {
    const rsiSignal = this.generateRSISignal(marketData, period);
    if (!rsiSignal) {
      return null;
    }

    const latestData = marketData[marketData.length - 1];
    let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;
    let reasoning = '';

    // Determine signal based on RSI levels and divergence
    if (rsiSignal.oversold) {
      // Oversold condition - potential buy signal
      signalType = 'BUY';
      strength = this.calculateOversoldStrength(rsiSignal.value);
      reasoning = `RSI oversold at ${rsiSignal.value} (below ${this.oversoldThreshold})`;

      // Boost signal if bullish divergence is present
      if (rsiSignal.divergence?.type === 'BULLISH') {
        strength = Math.min(strength + rsiSignal.divergence.strength * 0.3, 100);
        reasoning += ` with bullish divergence (strength: ${rsiSignal.divergence.strength})`;
      }
    } else if (rsiSignal.overbought) {
      // Overbought condition - potential sell signal
      signalType = 'SELL';
      strength = this.calculateOverboughtStrength(rsiSignal.value);
      reasoning = `RSI overbought at ${rsiSignal.value} (above ${this.overboughtThreshold})`;

      // Boost signal if bearish divergence is present
      if (rsiSignal.divergence?.type === 'BEARISH') {
        strength = Math.min(strength + rsiSignal.divergence.strength * 0.3, 100);
        reasoning += ` with bearish divergence (strength: ${rsiSignal.divergence.strength})`;
      }
    } else if (rsiSignal.divergence && rsiSignal.divergence.type !== 'NONE') {
      // Divergence-only signal (RSI in neutral zone)
      if (rsiSignal.divergence.type === 'BULLISH') {
        signalType = 'BUY';
        strength = rsiSignal.divergence.strength * 0.7; // Reduce strength for divergence-only signals
        reasoning = `Bullish RSI divergence detected (strength: ${rsiSignal.divergence.strength})`;
      } else {
        signalType = 'SELL';
        strength = rsiSignal.divergence.strength * 0.7;
        reasoning = `Bearish RSI divergence detected (strength: ${rsiSignal.divergence.strength})`;
      }
    }

    if (signalType === 'HOLD') {
      return null; // No actionable signal
    }

    // Calculate confidence based on RSI position and market context
    const confidence = this.calculateSignalConfidence(rsiSignal, marketData);

    // Calculate risk-reward ratio
    const riskReward = this.calculateRiskReward(marketData, signalType, rsiSignal.value);

    return {
      id: `rsi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: latestData.symbol,
      type: signalType,
      strength: Math.round(strength),
      confidence: Math.round(confidence),
      indicators: [`RSI_${period}`],
      reasoning,
      riskReward,
      timestamp: latestData.timestamp,
      metadata: {
        rsi: rsiSignal.value,
        overbought: rsiSignal.overbought,
        oversold: rsiSignal.oversold,
        divergence: rsiSignal.divergence,
        extremeLevel: rsiSignal.value >= this.extremeOverboughtThreshold || 
                     rsiSignal.value <= this.extremeOversoldThreshold
      }
    };
  }

  /**
   * Calculate strength for oversold conditions
   * @param rsi Current RSI value
   * @returns Strength score (0-100)
   */
  private calculateOversoldStrength(rsi: number): number {
    if (rsi > this.oversoldThreshold) return 0;

    // More oversold = stronger signal
    const oversoldDepth = this.oversoldThreshold - rsi;
    let strength = (oversoldDepth / this.oversoldThreshold) * 100;

    // Extreme oversold gets bonus strength
    if (rsi <= this.extremeOversoldThreshold) {
      strength += 20;
    }

    return Math.min(Math.round(strength), 100);
  }

  /**
   * Calculate strength for overbought conditions
   * @param rsi Current RSI value
   * @returns Strength score (0-100)
   */
  private calculateOverboughtStrength(rsi: number): number {
    if (rsi < this.overboughtThreshold) return 0;

    // More overbought = stronger signal
    const overboughtDepth = rsi - this.overboughtThreshold;
    let strength = (overboughtDepth / (100 - this.overboughtThreshold)) * 100;

    // Extreme overbought gets bonus strength
    if (rsi >= this.extremeOverboughtThreshold) {
      strength += 20;
    }

    return Math.min(Math.round(strength), 100);
  }

  /**
   * Calculate signal confidence based on multiple factors
   * @param rsiSignal RSI signal data
   * @param marketData Market data for context
   * @returns Confidence score (0-100)
   */
  private calculateSignalConfidence(rsiSignal: RSISignal, marketData: MarketData[]): number {
    let confidence = 50; // Base confidence

    // RSI level confidence
    if (rsiSignal.value <= this.extremeOversoldThreshold || rsiSignal.value >= this.extremeOverboughtThreshold) {
      confidence += 25; // Extreme levels are more reliable
    } else if (rsiSignal.oversold || rsiSignal.overbought) {
      confidence += 15; // Regular overbought/oversold
    }

    // Divergence confidence
    if (rsiSignal.divergence && rsiSignal.divergence.type !== 'NONE') {
      confidence += rsiSignal.divergence.strength * 0.2;
    }

    // Volume confirmation
    if (marketData.length >= 20) {
      const currentVolume = marketData[marketData.length - 1].volume;
      const avgVolume = marketData.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
      
      if (currentVolume > avgVolume * 1.2) {
        confidence += 10; // Volume confirmation
      }
    }

    // Trend alignment
    const trendAlignment = this.calculateTrendAlignment(marketData, rsiSignal);
    confidence += trendAlignment;

    return Math.min(Math.round(confidence), 100);
  }

  /**
   * Calculate trend alignment bonus
   * @param marketData Market data
   * @param rsiSignal RSI signal
   * @returns Alignment bonus (-10 to +10)
   */
  private calculateTrendAlignment(marketData: MarketData[], rsiSignal: RSISignal): number {
    if (marketData.length < 10) return 0;

    const recentPrices = marketData.slice(-10).map(d => d.close);
    const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];

    // Check if RSI signal aligns with recent price trend
    if (priceChange > 0.02 && rsiSignal.overbought) {
      return 10; // Uptrend + overbought = good sell signal
    }
    if (priceChange < -0.02 && rsiSignal.oversold) {
      return 10; // Downtrend + oversold = good buy signal
    }
    if (priceChange > 0.02 && rsiSignal.oversold) {
      return -5; // Conflicting signals
    }
    if (priceChange < -0.02 && rsiSignal.overbought) {
      return -5; // Conflicting signals
    }

    return 0;
  }

  /**
   * Calculate risk-reward ratio for RSI-based trades
   * @param marketData Market data
   * @param signalType Signal type
   * @param rsi Current RSI value
   * @returns Risk-reward ratio
   */
  private calculateRiskReward(marketData: MarketData[], signalType: 'BUY' | 'SELL', rsi: number): number {
    const currentPrice = marketData[marketData.length - 1].close;
    const recentHigh = Math.max(...marketData.slice(-20).map(d => d.high));
    const recentLow = Math.min(...marketData.slice(-20).map(d => d.low));

    if (signalType === 'BUY') {
      // For buy signals, target is recent high, stop is recent low
      const target = recentHigh;
      const stopLoss = recentLow;
      
      // Adjust based on RSI extremity
      const rsiAdjustment = rsi <= this.extremeOversoldThreshold ? 1.2 : 1.0;
      
      const reward = (target - currentPrice) * rsiAdjustment;
      const risk = currentPrice - stopLoss;
      
      return risk > 0 ? reward / risk : 1.0;
    } else {
      // For sell signals, target is recent low, stop is recent high
      const target = recentLow;
      const stopLoss = recentHigh;
      
      // Adjust based on RSI extremity
      const rsiAdjustment = rsi >= this.extremeOverboughtThreshold ? 1.2 : 1.0;
      
      const reward = (currentPrice - target) * rsiAdjustment;
      const risk = stopLoss - currentPrice;
      
      return risk > 0 ? reward / risk : 1.0;
    }
  }

  /**
   * Evaluate overall signal confidence with detailed breakdown
   * @param marketData Market data
   * @param signal Trading signal
   * @returns Detailed confidence analysis
   */
  public evaluateSignalConfidence(marketData: MarketData[], signal: TradingSignal): SignalConfidence {
    const technical = signal.strength;
    const rsi = signal.metadata?.rsi as number;
    
    // Volume analysis
    let volume = 50;
    if (marketData.length >= 20) {
      const currentVolume = marketData[marketData.length - 1].volume;
      const avgVolume = marketData.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
      volume = currentVolume > avgVolume * 1.5 ? 80 : (currentVolume > avgVolume ? 60 : 40);
    }

    // Momentum analysis
    const momentum = this.calculateMomentumScore(marketData, signal.type, rsi);
    
    const overall = Math.round((technical * 0.4 + volume * 0.2 + momentum * 0.4));
    
    const factors = [
      `RSI signal strength: ${technical}/100`,
      `Volume confirmation: ${volume}/100`,
      `Price momentum alignment: ${momentum}/100`,
      `RSI level: ${rsi} (${rsi <= 30 ? 'oversold' : rsi >= 70 ? 'overbought' : 'neutral'})`
    ];

    if (signal.metadata?.divergence) {
      factors.push(`Divergence: ${signal.metadata.divergence.type} (${signal.metadata.divergence.strength})`);
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
   * Calculate momentum score for RSI signals
   * @param marketData Market data
   * @param signalType Signal type
   * @param rsi Current RSI value
   * @returns Momentum score (0-100)
   */
  private calculateMomentumScore(marketData: MarketData[], signalType: 'BUY' | 'SELL', rsi: number): number {
    if (marketData.length < 5) return 50;

    const recentPrices = marketData.slice(-5).map(d => d.close);
    const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];

    let momentum = 50;

    // RSI momentum alignment
    if (signalType === 'BUY' && rsi <= this.oversoldThreshold) {
      momentum += 20; // Oversold buy signal
      if (priceChange < 0) momentum += 10; // Price declining into oversold
    } else if (signalType === 'SELL' && rsi >= this.overboughtThreshold) {
      momentum += 20; // Overbought sell signal
      if (priceChange > 0) momentum += 10; // Price rising into overbought
    }

    // Extreme RSI levels get bonus
    if (rsi <= this.extremeOversoldThreshold || rsi >= this.extremeOverboughtThreshold) {
      momentum += 15;
    }

    return Math.min(momentum, 100);
  }
}