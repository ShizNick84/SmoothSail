/**
 * =============================================================================
 * ANOMALY DETECTOR - AI-POWERED MARKET ANOMALY DETECTION
 * =============================================================================
 * 
 * This module implements sophisticated anomaly detection for cryptocurrency
 * markets using AI and statistical methods. It identifies unusual patterns,
 * market irregularities, and potential trading opportunities or risks.
 * 
 * Key Features:
 * - Real-time anomaly detection using multiple algorithms
 * - Pattern recognition for unusual market behavior
 * - Volume and price anomaly identification
 * - Sentiment-price divergence detection
 * - Liquidity and order book anomalies
 * - Alert generation and risk assessment
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { LLMEngine } from './llm-engine';
import type { MarketDataInput, SentimentDataInput, MarketAnomaly } from './market-analyzer';

/**
 * Interface for anomaly detection configuration
 */
interface AnomalyDetectionConfig {
  // Sensitivity settings (0-100)
  volumeAnomalySensitivity: number;
  priceAnomalySensitivity: number;
  sentimentAnomalySensitivity: number;
  patternAnomalySensitivity: number;
  
  // Thresholds
  volumeSpikeThreshold: number; // Multiple of average volume
  priceGapThreshold: number; // Percentage gap
  sentimentDivergenceThreshold: number; // Sentiment vs price divergence
  
  // Time windows
  shortTermWindow: number; // Minutes
  mediumTermWindow: number; // Hours
  longTermWindow: number; // Days
  
  // Alert settings
  enableRealTimeAlerts: boolean;
  alertCooldownPeriod: number; // Milliseconds
  maxAlertsPerHour: number;
}

/**
 * Interface for statistical baseline data
 */
interface StatisticalBaseline {
  symbol: string;
  timeframe: string;
  
  // Price statistics
  averagePrice: number;
  priceStdDev: number;
  priceRange: { min: number; max: number };
  
  // Volume statistics
  averageVolume: number;
  volumeStdDev: number;
  volumeRange: { min: number; max: number };
  
  // Volatility statistics
  averageVolatility: number;
  volatilityStdDev: number;
  
  // Pattern frequencies
  patternFrequencies: Map<string, number>;
  
  lastUpdated: Date;
  sampleSize: number;
}

/**
 * Interface for anomaly detection result
 */
interface AnomalyDetectionResult {
  anomalies: MarketAnomaly[];
  overallRiskScore: number; // 0-100
  confidenceScore: number; // 0-100
  detectionTime: number; // milliseconds
  algorithmsUsed: string[];
  baseline: StatisticalBaseline;
}

/**
 * Interface for pattern anomaly
 */
interface PatternAnomaly {
  patternType: string;
  description: string;
  frequency: number; // How often this pattern typically occurs
  currentOccurrence: number; // Current frequency
  deviationScore: number; // How much it deviates from normal
  significance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Interface for order book anomaly (for future implementation)
 */
interface OrderBookAnomaly {
  type: 'BID_ASK_SPREAD' | 'DEPTH_IMBALANCE' | 'LARGE_ORDER' | 'SPOOFING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impact: string;
  timestamp: Date;
}

/**
 * Anomaly Detector class for market irregularity detection
 */
export class AnomalyDetector extends EventEmitter {
  private llmEngine: LLMEngine;
  private config: AnomalyDetectionConfig;
  private baselines: Map<string, StatisticalBaseline> = new Map();
  private detectionHistory: AnomalyDetectionResult[] = [];
  private alertHistory: Map<string, Date> = new Map(); // For cooldown tracking
  private isInitialized: boolean = false;
  private maxHistorySize: number = 1000;

  // Statistical constants
  private readonly STATISTICAL_CONSTANTS = {
    zScoreThreshold: 2.5, // 2.5 standard deviations
    outlierThreshold: 3.0, // 3 standard deviations for outliers
    minSampleSize: 100, // Minimum samples for reliable statistics
    baselineUpdateFrequency: 3600000 // 1 hour in milliseconds
  };

  constructor(llmEngine: LLMEngine, config?: Partial<AnomalyDetectionConfig>) {
    super();
    this.llmEngine = llmEngine;
    
    // Default configuration
    this.config = {
      volumeAnomalySensitivity: 75,
      priceAnomalySensitivity: 80,
      sentimentAnomalySensitivity: 70,
      patternAnomalySensitivity: 65,
      
      volumeSpikeThreshold: 3.0,
      priceGapThreshold: 5.0,
      sentimentDivergenceThreshold: 50,
      
      shortTermWindow: 15,
      mediumTermWindow: 4,
      longTermWindow: 1,
      
      enableRealTimeAlerts: true,
      alertCooldownPeriod: 300000, // 5 minutes
      maxAlertsPerHour: 10,
      
      ...config
    };

    logger.info('🔍 Anomaly Detector initialized');
  }

  /**
   * Initialize the anomaly detector
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing Anomaly Detector...');

      // Verify LLM engine is ready
      if (!this.llmEngine.isReady()) {
        throw new Error('LLM Engine is not ready');
      }

      // Initialize baselines for common symbols
      await this.initializeBaselines(['BTC', 'ETH']);

      this.isInitialized = true;
      logger.info('✅ Anomaly Detector initialized successfully');

      this.emit('initialized');

    } catch (error) {
      logger.error('❌ Failed to initialize Anomaly Detector:', error);
      throw error;
    }
  }

  /**
   * Initialize statistical baselines for symbols
   */
  private async initializeBaselines(symbols: string[]): Promise<void> {
    for (const symbol of symbols) {
      const baseline: StatisticalBaseline = {
        symbol,
        timeframe: '1h',
        averagePrice: 0,
        priceStdDev: 0,
        priceRange: { min: 0, max: 0 },
        averageVolume: 0,
        volumeStdDev: 0,
        volumeRange: { min: 0, max: 0 },
        averageVolatility: 0,
        volatilityStdDev: 0,
        patternFrequencies: new Map(),
        lastUpdated: new Date(),
        sampleSize: 0
      };

      this.baselines.set(symbol, baseline);
      logger.info(`📊 Initialized baseline for ${symbol}`);
    }
  }

  /**
   * Detect anomalies in market data
   */
  public async detectAnomalies(
    marketData: MarketDataInput,
    sentimentData?: SentimentDataInput
  ): Promise<AnomalyDetectionResult> {
    try {
      if (!this.isInitialized) {
        throw new Error('Anomaly Detector not initialized');
      }

      const startTime = Date.now();
      logger.info(`🔍 Detecting anomalies for ${marketData.symbol}...`);

      // Get or create baseline for symbol
      let baseline = this.baselines.get(marketData.symbol);
      if (!baseline) {
        await this.initializeBaselines([marketData.symbol]);
        baseline = this.baselines.get(marketData.symbol)!;
      }

      // Update baseline with new data
      await this.updateBaseline(baseline, marketData);

      // Run different anomaly detection algorithms
      const [
        volumeAnomalies,
        priceAnomalies,
        patternAnomalies,
        sentimentAnomalies,
        volatilityAnomalies
      ] = await Promise.all([
        this.detectVolumeAnomalies(marketData, baseline),
        this.detectPriceAnomalies(marketData, baseline),
        this.detectPatternAnomalies(marketData, baseline),
        this.detectSentimentAnomalies(marketData, sentimentData, baseline),
        this.detectVolatilityAnomalies(marketData, baseline)
      ]);

      // Combine all anomalies
      const allAnomalies = [
        ...volumeAnomalies,
        ...priceAnomalies,
        ...patternAnomalies,
        ...sentimentAnomalies,
        ...volatilityAnomalies
      ];

      // Use LLM for additional analysis if anomalies found
      if (allAnomalies.length > 0) {
        const llmAnomalies = await this.getLLMAnomalyAnalysis(marketData, allAnomalies, sentimentData);
        allAnomalies.push(...llmAnomalies);
      }

      // Calculate overall risk and confidence scores
      const overallRiskScore = this.calculateOverallRiskScore(allAnomalies);
      const confidenceScore = this.calculateConfidenceScore(baseline, allAnomalies);

      const result: AnomalyDetectionResult = {
        anomalies: allAnomalies,
        overallRiskScore,
        confidenceScore,
        detectionTime: Date.now() - startTime,
        algorithmsUsed: ['volume', 'price', 'pattern', 'sentiment', 'volatility', 'llm'],
        baseline
      };

      // Add to history
      this.addToHistory(result);

      // Generate alerts if enabled
      if (this.config.enableRealTimeAlerts && allAnomalies.length > 0) {
        await this.generateAlerts(allAnomalies, marketData.symbol);
      }

      logger.info(`✅ Anomaly detection completed for ${marketData.symbol} - Found ${allAnomalies.length} anomalies`);
      
      this.emit('anomaliesDetected', result);

      return result;

    } catch (error) {
      logger.error('❌ Error in anomaly detection:', error);
      throw error;
    }
  }

  /**
   * Update statistical baseline with new market data
   */
  private async updateBaseline(baseline: StatisticalBaseline, marketData: MarketDataInput): Promise<void> {
    const { price, volume, high, low } = marketData;
    const volatility = ((high - low) / price) * 100;

    // Update sample size
    baseline.sampleSize++;

    // Update price statistics (running average and std dev)
    if (baseline.sampleSize === 1) {
      baseline.averagePrice = price;
      baseline.priceRange = { min: price, max: price };
    } else {
      // Running average
      const oldAvg = baseline.averagePrice;
      baseline.averagePrice = oldAvg + (price - oldAvg) / baseline.sampleSize;
      
      // Running standard deviation (Welford's algorithm)
      baseline.priceStdDev = Math.sqrt(
        ((baseline.sampleSize - 2) * Math.pow(baseline.priceStdDev, 2) + 
         (price - oldAvg) * (price - baseline.averagePrice)) / (baseline.sampleSize - 1)
      );
      
      // Update range
      baseline.priceRange.min = Math.min(baseline.priceRange.min, price);
      baseline.priceRange.max = Math.max(baseline.priceRange.max, price);
    }

    // Update volume statistics
    if (baseline.sampleSize === 1) {
      baseline.averageVolume = volume;
      baseline.volumeRange = { min: volume, max: volume };
    } else {
      const oldVolumeAvg = baseline.averageVolume;
      baseline.averageVolume = oldVolumeAvg + (volume - oldVolumeAvg) / baseline.sampleSize;
      
      baseline.volumeStdDev = Math.sqrt(
        ((baseline.sampleSize - 2) * Math.pow(baseline.volumeStdDev, 2) + 
         (volume - oldVolumeAvg) * (volume - baseline.averageVolume)) / (baseline.sampleSize - 1)
      );
      
      baseline.volumeRange.min = Math.min(baseline.volumeRange.min, volume);
      baseline.volumeRange.max = Math.max(baseline.volumeRange.max, volume);
    }

    // Update volatility statistics
    if (baseline.sampleSize === 1) {
      baseline.averageVolatility = volatility;
    } else {
      const oldVolatilityAvg = baseline.averageVolatility;
      baseline.averageVolatility = oldVolatilityAvg + (volatility - oldVolatilityAvg) / baseline.sampleSize;
      
      baseline.volatilityStdDev = Math.sqrt(
        ((baseline.sampleSize - 2) * Math.pow(baseline.volatilityStdDev, 2) + 
         (volatility - oldVolatilityAvg) * (volatility - baseline.averageVolatility)) / (baseline.sampleSize - 1)
      );
    }

    baseline.lastUpdated = new Date();
  }

  /**
   * Detect volume anomalies
   */
  private async detectVolumeAnomalies(
    marketData: MarketDataInput,
    baseline: StatisticalBaseline
  ): Promise<MarketAnomaly[]> {
    const anomalies: MarketAnomaly[] = [];
    
    if (baseline.sampleSize < this.STATISTICAL_CONSTANTS.minSampleSize) {
      return anomalies; // Not enough data for reliable detection
    }

    const { volume } = marketData;
    const { averageVolume, volumeStdDev } = baseline;

    // Z-score calculation
    const zScore = volumeStdDev > 0 ? (volume - averageVolume) / volumeStdDev : 0;

    // Volume spike detection
    if (Math.abs(zScore) > this.STATISTICAL_CONSTANTS.zScoreThreshold) {
      const severity = Math.abs(zScore) > this.STATISTICAL_CONSTANTS.outlierThreshold ? 'HIGH' : 'MEDIUM';
      
      anomalies.push({
        type: 'VOLUME_SPIKE',
        severity: severity as MarketAnomaly['severity'],
        description: `Volume ${zScore > 0 ? 'spike' : 'drop'} detected: ${(volume / averageVolume).toFixed(2)}x average`,
        impact: zScore > 0 ? 'Potential breakout or significant news' : 'Potential lack of interest or liquidity issues',
        recommendation: zScore > 0 ? 'Monitor for price movement confirmation' : 'Check for market conditions or news',
        confidence: Math.min(95, 60 + Math.abs(zScore) * 10),
        timestamp: new Date(),
        affectedSymbols: [marketData.symbol]
      });
    }

    // Volume pattern anomalies
    const volumeRatio = volume / averageVolume;
    if (volumeRatio > this.config.volumeSpikeThreshold) {
      anomalies.push({
        type: 'VOLUME_SPIKE',
        severity: volumeRatio > 5 ? 'CRITICAL' : 'HIGH',
        description: `Extreme volume spike: ${volumeRatio.toFixed(1)}x normal volume`,
        impact: 'Major market event or institutional activity',
        recommendation: 'Immediate attention required - check news and order books',
        confidence: 90,
        timestamp: new Date(),
        affectedSymbols: [marketData.symbol]
      });
    }

    return anomalies;
  }

  /**
   * Detect price anomalies
   */
  private async detectPriceAnomalies(
    marketData: MarketDataInput,
    baseline: StatisticalBaseline
  ): Promise<MarketAnomaly[]> {
    const anomalies: MarketAnomaly[] = [];
    
    if (baseline.sampleSize < this.STATISTICAL_CONSTANTS.minSampleSize) {
      return anomalies;
    }

    const { price, open, high, low } = marketData;
    const { averagePrice, priceStdDev } = baseline;

    // Price gap detection
    const gapPercentage = Math.abs((open - price) / price) * 100;
    if (gapPercentage > this.config.priceGapThreshold) {
      anomalies.push({
        type: 'PRICE_GAP',
        severity: gapPercentage > 10 ? 'HIGH' : 'MEDIUM',
        description: `Price gap of ${gapPercentage.toFixed(2)}% detected`,
        impact: 'Potential sentiment shift or news impact',
        recommendation: 'Assess gap fill probability and market sentiment',
        confidence: 80,
        timestamp: new Date(),
        affectedSymbols: [marketData.symbol]
      });
    }

    // Price deviation from baseline
    if (priceStdDev > 0) {
      const zScore = (price - averagePrice) / priceStdDev;
      
      if (Math.abs(zScore) > this.STATISTICAL_CONSTANTS.outlierThreshold) {
        anomalies.push({
          type: 'UNUSUAL_PATTERN',
          severity: Math.abs(zScore) > 4 ? 'CRITICAL' : 'HIGH',
          description: `Price deviation: ${Math.abs(zScore).toFixed(2)} standard deviations from average`,
          impact: 'Significant price movement outside normal range',
          recommendation: 'Investigate underlying causes and market conditions',
          confidence: 85,
          timestamp: new Date(),
          affectedSymbols: [marketData.symbol]
        });
      }
    }

    // Intraday volatility anomaly
    const intradayVolatility = ((high - low) / open) * 100;
    if (intradayVolatility > baseline.averageVolatility * 2) {
      anomalies.push({
        type: 'UNUSUAL_PATTERN',
        severity: intradayVolatility > baseline.averageVolatility * 3 ? 'HIGH' : 'MEDIUM',
        description: `Unusual intraday volatility: ${intradayVolatility.toFixed(2)}%`,
        impact: 'Increased trading risk and potential opportunities',
        recommendation: 'Adjust position sizes and risk management',
        confidence: 75,
        timestamp: new Date(),
        affectedSymbols: [marketData.symbol]
      });
    }

    return anomalies;
  }

  /**
   * Detect pattern anomalies using statistical analysis
   */
  private async detectPatternAnomalies(
    marketData: MarketDataInput,
    baseline: StatisticalBaseline
  ): Promise<MarketAnomaly[]> {
    const anomalies: MarketAnomaly[] = [];
    
    // Technical indicator anomalies
    const { technicalIndicators } = marketData;
    
    // RSI extreme values
    if (technicalIndicators.rsi > 90 || technicalIndicators.rsi < 10) {
      anomalies.push({
        type: 'UNUSUAL_PATTERN',
        severity: 'HIGH',
        description: `Extreme RSI value: ${technicalIndicators.rsi.toFixed(2)}`,
        impact: technicalIndicators.rsi > 90 ? 'Severely overbought conditions' : 'Severely oversold conditions',
        recommendation: technicalIndicators.rsi > 90 ? 'Consider taking profits or shorting' : 'Consider buying opportunity',
        confidence: 85,
        timestamp: new Date(),
        affectedSymbols: [marketData.symbol]
      });
    }

    // MACD divergence anomaly
    const macdDivergence = Math.abs(technicalIndicators.macd.macd - technicalIndicators.macd.signal);
    if (macdDivergence > 0.01) { // Threshold for significant divergence
      anomalies.push({
        type: 'UNUSUAL_PATTERN',
        severity: 'MEDIUM',
        description: `Significant MACD divergence detected: ${macdDivergence.toFixed(4)}`,
        impact: 'Potential trend change or momentum shift',
        recommendation: 'Monitor for trend confirmation or reversal',
        confidence: 70,
        timestamp: new Date(),
        affectedSymbols: [marketData.symbol]
      });
    }

    // Bollinger Band squeeze/expansion
    const bbWidth = (technicalIndicators.bollinger.upper - technicalIndicators.bollinger.lower) / technicalIndicators.bollinger.middle;
    if (bbWidth < 0.02) { // Very tight bands
      anomalies.push({
        type: 'UNUSUAL_PATTERN',
        severity: 'MEDIUM',
        description: 'Bollinger Band squeeze detected - low volatility',
        impact: 'Potential for significant price movement',
        recommendation: 'Prepare for volatility expansion and breakout',
        confidence: 75,
        timestamp: new Date(),
        affectedSymbols: [marketData.symbol]
      });
    } else if (bbWidth > 0.15) { // Very wide bands
      anomalies.push({
        type: 'UNUSUAL_PATTERN',
        severity: 'MEDIUM',
        description: 'Bollinger Band expansion detected - high volatility',
        impact: 'Increased trading risk and opportunities',
        recommendation: 'Use appropriate position sizing for high volatility',
        confidence: 75,
        timestamp: new Date(),
        affectedSymbols: [marketData.symbol]
      });
    }

    return anomalies;
  }

  /**
   * Detect sentiment anomalies and divergences
   */
  private async detectSentimentAnomalies(
    marketData: MarketDataInput,
    sentimentData: SentimentDataInput | undefined,
    baseline: StatisticalBaseline
  ): Promise<MarketAnomaly[]> {
    const anomalies: MarketAnomaly[] = [];
    
    if (!sentimentData) {
      return anomalies;
    }

    // Price-sentiment divergence
    const priceChange = ((marketData.close - marketData.open) / marketData.open) * 100;
    const sentimentScore = sentimentData.overall;
    
    // Check for divergence
    const priceDirection = priceChange > 0 ? 1 : -1;
    const sentimentDirection = sentimentScore > 0 ? 1 : -1;
    
    if (priceDirection !== sentimentDirection && Math.abs(sentimentScore) > this.config.sentimentDivergenceThreshold) {
      anomalies.push({
        type: 'SENTIMENT_DIVERGENCE',
        severity: Math.abs(sentimentScore) > 70 ? 'HIGH' : 'MEDIUM',
        description: `Price-sentiment divergence: Price ${priceChange > 0 ? 'up' : 'down'} ${Math.abs(priceChange).toFixed(2)}%, sentiment ${sentimentScore.toFixed(0)}`,
        impact: 'Potential reversal or sentiment correction incoming',
        recommendation: 'Monitor for trend continuation or reversal signals',
        confidence: Math.min(90, 50 + Math.abs(sentimentScore) * 0.5),
        timestamp: new Date(),
        affectedSymbols: [marketData.symbol]
      });
    }

    // Extreme sentiment levels
    if (Math.abs(sentimentScore) > 80) {
      anomalies.push({
        type: 'SENTIMENT_DIVERGENCE',
        severity: Math.abs(sentimentScore) > 90 ? 'HIGH' : 'MEDIUM',
        description: `Extreme sentiment detected: ${sentimentScore.toFixed(0)}`,
        impact: sentimentScore > 0 ? 'Potential euphoria and reversal risk' : 'Potential capitulation and bounce opportunity',
        recommendation: sentimentScore > 0 ? 'Consider contrarian positioning' : 'Look for oversold bounce opportunities',
        confidence: 80,
        timestamp: new Date(),
        affectedSymbols: [marketData.symbol]
      });
    }

    // Sentiment confidence anomaly
    if (sentimentData.confidence < 30) {
      anomalies.push({
        type: 'SENTIMENT_DIVERGENCE',
        severity: 'LOW',
        description: `Low sentiment confidence: ${sentimentData.confidence}%`,
        impact: 'Unreliable sentiment data may affect analysis quality',
        recommendation: 'Rely more on technical analysis until sentiment clarity improves',
        confidence: 60,
        timestamp: new Date(),
        affectedSymbols: [marketData.symbol]
      });
    }

    return anomalies;
  }

  /**
   * Detect volatility anomalies
   */
  private async detectVolatilityAnomalies(
    marketData: MarketDataInput,
    baseline: StatisticalBaseline
  ): Promise<MarketAnomaly[]> {
    const anomalies: MarketAnomaly[] = [];
    
    if (baseline.sampleSize < this.STATISTICAL_CONSTANTS.minSampleSize) {
      return anomalies;
    }

    const currentVolatility = ((marketData.high - marketData.low) / marketData.close) * 100;
    const { averageVolatility, volatilityStdDev } = baseline;

    if (volatilityStdDev > 0) {
      const zScore = (currentVolatility - averageVolatility) / volatilityStdDev;
      
      if (Math.abs(zScore) > this.STATISTICAL_CONSTANTS.zScoreThreshold) {
        const severity = Math.abs(zScore) > this.STATISTICAL_CONSTANTS.outlierThreshold ? 'HIGH' : 'MEDIUM';
        
        anomalies.push({
          type: 'UNUSUAL_PATTERN',
          severity: severity as MarketAnomaly['severity'],
          description: `Volatility anomaly: ${currentVolatility.toFixed(2)}% (${Math.abs(zScore).toFixed(2)} std dev from average)`,
          impact: zScore > 0 ? 'Increased risk and trading opportunities' : 'Unusually low volatility may precede major moves',
          recommendation: zScore > 0 ? 'Reduce position sizes and tighten stops' : 'Prepare for potential volatility expansion',
          confidence: Math.min(90, 60 + Math.abs(zScore) * 10),
          timestamp: new Date(),
          affectedSymbols: [marketData.symbol]
        });
      }
    }

    return anomalies;
  }

  /**
   * Get LLM analysis of detected anomalies
   */
  private async getLLMAnomalyAnalysis(
    marketData: MarketDataInput,
    anomalies: MarketAnomaly[],
    sentimentData?: SentimentDataInput
  ): Promise<MarketAnomaly[]> {
    try {
      // Build prompt for LLM analysis
      const prompt = this.buildAnomalyAnalysisPrompt(marketData, anomalies, sentimentData);
      
      // Get LLM analysis (mock implementation)
      const llmResponse = await this.getLLMAnomalyResponse(prompt);
      
      // Parse LLM response for additional anomalies
      const llmAnomalies = this.parseLLMAnomalyResponse(llmResponse, marketData.symbol);
      
      return llmAnomalies;
      
    } catch (error) {
      logger.error('❌ Error in LLM anomaly analysis:', error);
      return [];
    }
  }

  /**
   * Build prompt for LLM anomaly analysis
   */
  private buildAnomalyAnalysisPrompt(
    marketData: MarketDataInput,
    anomalies: MarketAnomaly[],
    sentimentData?: SentimentDataInput
  ): string {
    let prompt = `Analyze the following market anomalies for ${marketData.symbol}:

DETECTED ANOMALIES:
${anomalies.map((anomaly, index) => 
  `${index + 1}. ${anomaly.type}: ${anomaly.description} (${anomaly.severity} severity)`
).join('\n')}

MARKET DATA:
- Price: $${marketData.price.toFixed(2)}
- Volume: ${marketData.volume.toLocaleString()}
- RSI: ${marketData.technicalIndicators.rsi.toFixed(2)}
- MACD: ${marketData.technicalIndicators.macd.macd.toFixed(4)}`;

    if (sentimentData) {
      prompt += `\n\nSENTIMENT DATA:
- Overall Sentiment: ${sentimentData.overall}
- Twitter: ${sentimentData.twitter.score}
- Reddit: ${sentimentData.reddit.score}
- News: ${sentimentData.news.score}`;
    }

    prompt += `\n\nPlease identify any additional anomalies or patterns that might have been missed, and provide insights on:
1. Potential market implications
2. Risk assessment
3. Trading recommendations
4. Any interconnected anomalies that might amplify risks`;

    return prompt;
  }

  /**
   * Get LLM response for anomaly analysis (mock implementation)
   */
  private async getLLMAnomalyResponse(prompt: string): Promise<string> {
    // Mock LLM response
    return `Additional analysis reveals:

1. The combination of volume spike and sentiment divergence suggests institutional activity that may not be reflected in public sentiment yet.

2. The RSI extreme reading combined with price gap indicates potential exhaustion move that could lead to reversal.

3. Cross-market correlation anomaly detected - this asset is moving independently of broader market trends, suggesting asset-specific news or events.

Risk Assessment: ELEVATED - Multiple anomalies occurring simultaneously increases the probability of significant price movement.

Recommendation: Reduce position sizes and implement tighter risk management until anomalies resolve.`;
  }

  /**
   * Parse LLM response for additional anomalies
   */
  private parseLLMAnomalyResponse(llmResponse: string, symbol: string): MarketAnomaly[] {
    const anomalies: MarketAnomaly[] = [];
    
    // In production, this would use sophisticated NLP parsing
    // For now, create structured anomalies based on mock response
    
    if (llmResponse.includes('institutional activity')) {
      anomalies.push({
        type: 'UNUSUAL_PATTERN',
        severity: 'MEDIUM',
        description: 'Potential institutional activity detected by AI analysis',
        impact: 'Large player involvement may drive significant price movements',
        recommendation: 'Monitor order flow and volume patterns closely',
        confidence: 75,
        timestamp: new Date(),
        affectedSymbols: [symbol]
      });
    }
    
    if (llmResponse.includes('Cross-market correlation anomaly')) {
      anomalies.push({
        type: 'UNUSUAL_PATTERN',
        severity: 'MEDIUM',
        description: 'Asset moving independently of broader market trends',
        impact: 'Asset-specific factors may be driving price action',
        recommendation: 'Research asset-specific news and developments',
        confidence: 70,
        timestamp: new Date(),
        affectedSymbols: [symbol]
      });
    }
    
    return anomalies;
  }

  /**
   * Calculate overall risk score from anomalies
   */
  private calculateOverallRiskScore(anomalies: MarketAnomaly[]): number {
    if (anomalies.length === 0) return 0;
    
    let totalRisk = 0;
    const severityWeights = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    
    for (const anomaly of anomalies) {
      const weight = severityWeights[anomaly.severity];
      const confidenceMultiplier = anomaly.confidence / 100;
      totalRisk += weight * confidenceMultiplier;
    }
    
    // Normalize to 0-100 scale
    const maxPossibleRisk = anomalies.length * 4; // All critical with 100% confidence
    return Math.min(100, (totalRisk / maxPossibleRisk) * 100);
  }

  /**
   * Calculate confidence score for detection
   */
  private calculateConfidenceScore(baseline: StatisticalBaseline, anomalies: MarketAnomaly[]): number {
    let confidence = 100;
    
    // Reduce confidence if baseline has insufficient data
    if (baseline.sampleSize < this.STATISTICAL_CONSTANTS.minSampleSize) {
      confidence -= 30;
    }
    
    // Reduce confidence if data is stale
    const dataAge = Date.now() - baseline.lastUpdated.getTime();
    if (dataAge > this.STATISTICAL_CONSTANTS.baselineUpdateFrequency) {
      confidence -= 20;
    }
    
    // Average confidence of individual anomalies
    if (anomalies.length > 0) {
      const avgAnomalyConfidence = anomalies.reduce((sum, a) => sum + a.confidence, 0) / anomalies.length;
      confidence = (confidence + avgAnomalyConfidence) / 2;
    }
    
    return Math.max(0, Math.round(confidence));
  }

  /**
   * Generate alerts for detected anomalies
   */
  private async generateAlerts(anomalies: MarketAnomaly[], symbol: string): Promise<void> {
    const now = new Date();
    const alertKey = `${symbol}_${now.getHours()}`;
    
    // Check cooldown period
    const lastAlert = this.alertHistory.get(alertKey);
    if (lastAlert && (now.getTime() - lastAlert.getTime()) < this.config.alertCooldownPeriod) {
      return; // Still in cooldown
    }
    
    // Check hourly alert limit
    const hourlyAlerts = Array.from(this.alertHistory.entries())
      .filter(([key, time]) => key.startsWith(symbol) && (now.getTime() - time.getTime()) < 3600000)
      .length;
    
    if (hourlyAlerts >= this.config.maxAlertsPerHour) {
      return; // Exceeded hourly limit
    }
    
    // Generate alerts for high and critical severity anomalies
    const criticalAnomalies = anomalies.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL');
    
    if (criticalAnomalies.length > 0) {
      this.emit('criticalAnomalies', {
        symbol,
        anomalies: criticalAnomalies,
        timestamp: now
      });
      
      this.alertHistory.set(alertKey, now);
      
      logger.warn(`🚨 Critical anomalies detected for ${symbol}:`, criticalAnomalies.map(a => a.description));
    }
  }

  /**
   * Add detection result to history
   */
  private addToHistory(result: AnomalyDetectionResult): void {
    this.detectionHistory.push(result);
    
    if (this.detectionHistory.length > this.maxHistorySize) {
      this.detectionHistory = this.detectionHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get detection history
   */
  public getDetectionHistory(symbol?: string, limit?: number): AnomalyDetectionResult[] {
    let history = this.detectionHistory;
    
    if (symbol) {
      history = history.filter(result => 
        result.anomalies.some(anomaly => anomaly.affectedSymbols.includes(symbol))
      );
    }
    
    if (limit) {
      history = history.slice(-limit);
    }
    
    return history;
  }

  /**
   * Get current baselines
   */
  public getBaselines(): Map<string, StatisticalBaseline> {
    return new Map(this.baselines);
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AnomalyDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('🔧 Anomaly detection configuration updated');
  }

  /**
   * Get current configuration
   */
  public getConfig(): AnomalyDetectionConfig {
    return { ...this.config };
  }

  /**
   * Reset baseline for a symbol
   */
  public async resetBaseline(symbol: string): Promise<void> {
    this.baselines.delete(symbol);
    await this.initializeBaselines([symbol]);
    logger.info(`🔄 Baseline reset for ${symbol}`);
  }

  /**
   * Shutdown the anomaly detector
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('🛑 Shutting down Anomaly Detector...');
      
      // Clear all data
      this.baselines.clear();
      this.detectionHistory = [];
      this.alertHistory.clear();
      
      this.isInitialized = false;
      
      logger.info('✅ Anomaly Detector shutdown completed');
      
    } catch (error) {
      logger.error('❌ Error during Anomaly Detector shutdown:', error);
      throw error;
    }
  }
}

// Export types
export type {
  AnomalyDetectionConfig,
  StatisticalBaseline,
  AnomalyDetectionResult,
  PatternAnomaly,
  OrderBookAnomaly
};