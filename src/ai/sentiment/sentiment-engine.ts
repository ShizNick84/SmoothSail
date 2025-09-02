/**
 * Sentiment Analysis Engine
 * Main orchestrator for sentiment analysis across Twitter, Reddit, and News sources
 */

import { TwitterSentimentMonitor } from './twitter-monitor';
import { RedditSentimentMonitor } from './reddit-monitor';
import { NewsSentimentMonitor } from './news-monitor';
import { 
  SentimentScore, 
  WeightedSentiment, 
  SentimentTrend, 
  SentimentReport, 
  SentimentAlert,
  SentimentConfig 
} from './types';
import { logger } from '../../core/logging/logger';

export class SentimentAnalysisEngine {
  private twitterMonitor: TwitterSentimentMonitor;
  private redditMonitor: RedditSentimentMonitor;
  private newsMonitor: NewsSentimentMonitor;
  private logger = logger;
  private config: SentimentConfig;
  private isRunning: boolean = false;
  private analysisInterval?: NodeJS.Timeout;
  
  // Historical sentiment data for trend analysis
  private sentimentHistory: WeightedSentiment[] = [];
  private readonly maxHistorySize = 288; // 24 hours of 5-minute intervals
  
  // Default weights for sentiment sources
  private readonly defaultWeights = {
    twitter: 0.4,   // 40% - High volume, real-time sentiment
    reddit: 0.35,   // 35% - Community discussion, quality content
    news: 0.25      // 25% - Professional analysis, slower but authoritative
  };

  constructor(config: SentimentConfig) {
    this.config = config;
    // Logger is initialized as class property
    
    // Initialize monitors
    this.twitterMonitor = new TwitterSentimentMonitor(config.twitter);
    this.redditMonitor = new RedditSentimentMonitor(config.reddit);
    this.newsMonitor = new NewsSentimentMonitor(config.news);
  }

  /**
   * Start the sentiment analysis engine
   */
  async startEngine(intervalMinutes: number = 5): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Sentiment analysis engine is already running');
      return;
    }

    this.logger.info('Starting sentiment analysis engine');
    this.isRunning = true;

    // Start individual monitors
    await Promise.all([
      this.twitterMonitor.startMonitoring(intervalMinutes),
      this.redditMonitor.startMonitoring(intervalMinutes * 2), // Reddit less frequent
      this.newsMonitor.startMonitoring(intervalMinutes * 3)    // News least frequent
    ]);

    // Start aggregation analysis
    this.analysisInterval = setInterval(async () => {
      try {
        await this.performAggregatedAnalysis();
      } catch (error) {
        this.logger.error('Error during aggregated sentiment analysis:', error);
      }
    }, intervalMinutes * 60 * 1000);

    // Initial analysis
    await this.performAggregatedAnalysis();
  }

  /**
   * Stop the sentiment analysis engine
   */
  stopEngine(): void {
    if (!this.isRunning) {
      this.logger.warn('Sentiment analysis engine is not running');
      return;
    }

    this.logger.info('Stopping sentiment analysis engine');
    this.isRunning = false;

    // Stop individual monitors
    this.twitterMonitor.stopMonitoring();
    this.redditMonitor.stopMonitoring();
    this.newsMonitor.stopMonitoring();

    // Stop aggregation analysis
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = undefined;
    }
  }

  /**
   * Perform aggregated sentiment analysis across all sources
   */
  private async performAggregatedAnalysis(): Promise<WeightedSentiment> {
    try {
      this.logger.info('Performing aggregated sentiment analysis');

      // Get sentiment scores from all sources
      const [twitterScore, redditScore, newsScore] = await Promise.allSettled([
        this.twitterMonitor.getCurrentSentiment(),
        this.redditMonitor.getCurrentSentiment(),
        this.newsMonitor.getCurrentSentiment()
      ]);

      const sources: SentimentScore[] = [];
      
      // Process Twitter results
      if (twitterScore.status === 'fulfilled') {
        sources.push(twitterScore.value);
      } else {
        this.logger.warn('Twitter sentiment analysis failed:', twitterScore.reason);
        sources.push(this.createEmptySentimentScore('twitter'));
      }

      // Process Reddit results
      if (redditScore.status === 'fulfilled') {
        sources.push(redditScore.value);
      } else {
        this.logger.warn('Reddit sentiment analysis failed:', redditScore.reason);
        sources.push(this.createEmptySentimentScore('reddit'));
      }

      // Process News results
      if (newsScore.status === 'fulfilled') {
        sources.push(newsScore.value);
      } else {
        this.logger.warn('News sentiment analysis failed:', newsScore.reason);
        sources.push(this.createEmptySentimentScore('news'));
      }

      // Calculate weighted sentiment
      const weightedSentiment = this.calculateWeightedSentiment(sources);
      
      // Store in history for trend analysis
      this.addToHistory(weightedSentiment);
      
      // Log results
      this.logger.info(`Aggregated sentiment: ${weightedSentiment.aggregatedScore.toFixed(2)} (confidence: ${weightedSentiment.confidence}%)`);
      
      return weightedSentiment;

    } catch (error) {
      this.logger.error('Error in aggregated sentiment analysis:', error);
      throw error;
    }
  }

  /**
   * Calculate weighted sentiment score from multiple sources
   */
  private calculateWeightedSentiment(sources: SentimentScore[]): WeightedSentiment {
    const weights = this.config.weights || this.defaultWeights;
    let totalScore = 0;
    let totalWeight = 0;
    let totalConfidence = 0;
    let validSources = 0;

    const sourceWeights: Record<string, number> = {};

    for (const source of sources) {
      const baseWeight = weights[source.source as keyof typeof weights] || 0.1;
      
      // Adjust weight based on confidence and volume
      const confidenceMultiplier = source.confidence / 100;
      const volumeMultiplier = Math.min(1, Math.log10(source.volume + 1) / 2);
      const adjustedWeight = baseWeight * confidenceMultiplier * volumeMultiplier;
      
      if (adjustedWeight > 0) {
        totalScore += source.score * adjustedWeight;
        totalWeight += adjustedWeight;
        totalConfidence += source.confidence;
        validSources++;
        
        sourceWeights[source.source] = adjustedWeight;
      }
    }

    const aggregatedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const averageConfidence = validSources > 0 ? totalConfidence / validSources : 0;

    return {
      aggregatedScore: Math.round(aggregatedScore * 100) / 100,
      confidence: Math.round(averageConfidence),
      sources,
      weights: sourceWeights,
      timestamp: new Date()
    };
  }

  /**
   * Add weighted sentiment to history for trend analysis
   */
  private addToHistory(sentiment: WeightedSentiment): void {
    this.sentimentHistory.push(sentiment);
    
    // Maintain maximum history size
    if (this.sentimentHistory.length > this.maxHistorySize) {
      this.sentimentHistory.shift();
    }
  }

  /**
   * Analyze sentiment trends from historical data
   */
  private analyzeSentimentTrends(): SentimentTrend[] {
    if (this.sentimentHistory.length < 3) {
      return [];
    }

    const trends: SentimentTrend[] = [];
    const recentHistory = this.sentimentHistory.slice(-12); // Last hour (12 * 5-minute intervals)
    
    if (recentHistory.length < 3) {
      return trends;
    }

    // Calculate trend direction and strength
    const scores = recentHistory.map(h => h.aggregatedScore);
    const timeSpan = recentHistory.length * 5; // minutes
    
    // Linear regression for trend direction
    const { slope, correlation } = this.calculateTrendSlope(scores);
    
    let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (slope > 1 && correlation > 0.5) {
      direction = 'BULLISH';
    } else if (slope < -1 && correlation > 0.5) {
      direction = 'BEARISH';
    }

    const strength = Math.min(100, Math.abs(slope) * Math.abs(correlation) * 10);
    const changeRate = slope * 12; // Change per hour

    // Detect significant events
    const significantEvents = this.detectSignificantEvents(recentHistory);

    trends.push({
      direction,
      strength: Math.round(strength),
      duration: timeSpan,
      changeRate: Math.round(changeRate * 100) / 100,
      significantEvents
    });

    return trends;
  }

  /**
   * Calculate trend slope using linear regression
   */
  private calculateTrendSlope(scores: number[]): { slope: number; correlation: number } {
    const n = scores.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * scores[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = scores.reduce((sum, yi) => sum + yi * yi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Calculate correlation coefficient
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const correlation = denominator !== 0 ? numerator / denominator : 0;
    
    return { slope: slope || 0, correlation: correlation || 0 };
  }

  /**
   * Detect significant sentiment events
   */
  private detectSignificantEvents(history: WeightedSentiment[]): string[] {
    const events: string[] = [];
    const thresholds = this.config.thresholds;
    
    for (let i = 1; i < history.length; i++) {
      const current = history[i];
      const previous = history[i - 1];
      const change = current.aggregatedScore - previous.aggregatedScore;
      
      // Rapid change detection
      if (Math.abs(change) > thresholds.rapidChange) {
        events.push(`Rapid sentiment ${change > 0 ? 'increase' : 'decrease'}: ${change.toFixed(1)} points`);
      }
      
      // Extreme sentiment detection
      if (current.aggregatedScore > thresholds.extremePositive) {
        events.push(`Extreme positive sentiment: ${current.aggregatedScore.toFixed(1)}`);
      } else if (current.aggregatedScore < thresholds.extremeNegative) {
        events.push(`Extreme negative sentiment: ${current.aggregatedScore.toFixed(1)}`);
      }
      
      // Volume spike detection
      const totalVolume = current.sources.reduce((sum, source) => sum + source.volume, 0);
      if (totalVolume > thresholds.volumeSpike) {
        events.push(`High activity volume: ${totalVolume} total items`);
      }
    }
    
    return events;
  }

  /**
   * Generate comprehensive sentiment report
   */
  async generateSentimentReport(): Promise<SentimentReport> {
    const weightedSentiment = await this.performAggregatedAnalysis();
    const trends = this.analyzeSentimentTrends();
    const alerts = await this.generateSentimentAlerts(weightedSentiment);
    const recommendations = this.generateRecommendations(weightedSentiment, trends);

    return {
      overall: weightedSentiment,
      trends,
      sources: {
        twitter: weightedSentiment.sources.find(s => s.source === 'twitter') || this.createEmptySentimentScore('twitter'),
        reddit: weightedSentiment.sources.find(s => s.source === 'reddit') || this.createEmptySentimentScore('reddit'),
        news: weightedSentiment.sources.find(s => s.source === 'news') || this.createEmptySentimentScore('news')
      },
      alerts,
      recommendations
    };
  }

  /**
   * Generate sentiment-based alerts
   */
  private async generateSentimentAlerts(sentiment: WeightedSentiment): Promise<SentimentAlert[]> {
    const alerts: SentimentAlert[] = [];
    const thresholds = this.config.thresholds;

    // Extreme sentiment alerts
    if (sentiment.aggregatedScore > thresholds.extremePositive) {
      alerts.push({
        id: `extreme_positive_${Date.now()}`,
        type: 'EXTREME_POSITIVE',
        severity: 'HIGH',
        message: `Extremely positive market sentiment: ${sentiment.aggregatedScore.toFixed(1)}`,
        timestamp: new Date(),
        source: 'aggregated',
        data: sentiment
      });
    } else if (sentiment.aggregatedScore < thresholds.extremeNegative) {
      alerts.push({
        id: `extreme_negative_${Date.now()}`,
        type: 'EXTREME_NEGATIVE',
        severity: 'HIGH',
        message: `Extremely negative market sentiment: ${sentiment.aggregatedScore.toFixed(1)}`,
        timestamp: new Date(),
        source: 'aggregated',
        data: sentiment
      });
    }

    // Rapid change alerts
    if (this.sentimentHistory.length >= 2) {
      const previous = this.sentimentHistory[this.sentimentHistory.length - 2];
      const change = sentiment.aggregatedScore - previous.aggregatedScore;
      
      if (Math.abs(change) > thresholds.rapidChange) {
        alerts.push({
          id: `rapid_change_${Date.now()}`,
          type: 'RAPID_CHANGE',
          severity: 'MEDIUM',
          message: `Rapid sentiment change: ${change > 0 ? '+' : ''}${change.toFixed(1)} points`,
          timestamp: new Date(),
          source: 'aggregated',
          data: { current: sentiment, previous, change }
        });
      }
    }

    return alerts;
  }

  /**
   * Generate trading recommendations based on sentiment
   */
  private generateRecommendations(sentiment: WeightedSentiment, trends: SentimentTrend[]): string[] {
    const recommendations: string[] = [];
    const score = sentiment.aggregatedScore;
    const confidence = sentiment.confidence;

    // High confidence recommendations
    if (confidence > 70) {
      if (score > 50) {
        recommendations.push('Strong bullish sentiment detected - Consider increasing position sizes');
        recommendations.push('High positive sentiment may indicate good entry opportunities');
      } else if (score < -50) {
        recommendations.push('Strong bearish sentiment detected - Consider reducing position sizes');
        recommendations.push('High negative sentiment may indicate oversold conditions');
      }
    }

    // Trend-based recommendations
    for (const trend of trends) {
      if (trend.strength > 60) {
        if (trend.direction === 'BULLISH') {
          recommendations.push(`Strong bullish trend detected - Momentum may continue`);
        } else if (trend.direction === 'BEARISH') {
          recommendations.push(`Strong bearish trend detected - Consider defensive positioning`);
        }
      }
    }

    // Contrarian recommendations for extreme sentiment
    if (Math.abs(score) > 80) {
      recommendations.push('Extreme sentiment levels may indicate potential reversal opportunities');
    }

    // Low confidence warnings
    if (confidence < 30) {
      recommendations.push('Low sentiment confidence - Rely more on technical analysis');
    }

    return recommendations;
  }

  /**
   * Get current aggregated sentiment
   */
  async getCurrentSentiment(): Promise<WeightedSentiment> {
    return await this.performAggregatedAnalysis();
  }

  /**
   * Get sentiment history
   */
  getSentimentHistory(hours: number = 24): WeightedSentiment[] {
    const intervals = Math.min(hours * 12, this.sentimentHistory.length); // 12 intervals per hour
    return this.sentimentHistory.slice(-intervals);
  }

  /**
   * Calculate position sizing adjustment based on sentiment
   */
  calculateSentimentPositionAdjustment(baseSizePercent: number): number {
    if (this.sentimentHistory.length === 0) {
      return baseSizePercent;
    }

    const currentSentiment = this.sentimentHistory[this.sentimentHistory.length - 1];
    const score = currentSentiment.aggregatedScore;
    const confidence = currentSentiment.confidence;

    // Base adjustment on sentiment score and confidence
    let adjustment = 1.0;

    if (confidence > 60) {
      if (score > 30) {
        // Positive sentiment - increase position size
        adjustment = 1 + (score / 100) * 0.5; // Up to 50% increase
      } else if (score < -30) {
        // Negative sentiment - decrease position size
        adjustment = 1 + (score / 100) * 0.3; // Up to 30% decrease
      }
    }

    // Apply confidence scaling
    const confidenceScale = confidence / 100;
    adjustment = 1 + (adjustment - 1) * confidenceScale;

    // Ensure reasonable bounds
    adjustment = Math.max(0.5, Math.min(2.0, adjustment));

    return baseSizePercent * adjustment;
  }

  /**
   * Create empty sentiment score for error cases
   */
  private createEmptySentimentScore(source: string): SentimentScore {
    return {
      source,
      score: 0,
      confidence: 0,
      volume: 0,
      timestamp: new Date(),
      keyTopics: []
    };
  }

  /**
   * Get engine status
   */
  getStatus(): {
    isRunning: boolean;
    historySize: number;
    lastUpdate: Date | null;
    sources: {
      twitter: boolean;
      reddit: boolean;
      news: boolean;
    };
  } {
    return {
      isRunning: this.isRunning,
      historySize: this.sentimentHistory.length,
      lastUpdate: this.sentimentHistory.length > 0 
        ? this.sentimentHistory[this.sentimentHistory.length - 1].timestamp 
        : null,
      sources: {
        twitter: true, // Would check actual monitor status
        reddit: true,
        news: true
      }
    };
  }
}
