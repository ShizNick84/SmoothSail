/**
 * Sentiment Analysis Engine Tests
 * Unit tests for the sentiment analysis engine
 */

import { SentimentAnalysisEngine } from '../../../ai/sentiment/sentiment-engine';
import { SentimentConfig, SentimentScore, WeightedSentiment } from '../../../ai/sentiment/types';

// Mock the individual monitors
jest.mock('../../../ai/sentiment/twitter-monitor');
jest.mock('../../../ai/sentiment/reddit-monitor');
jest.mock('../../../ai/sentiment/news-monitor');
jest.mock('../../../core/logging/logger');

describe('SentimentAnalysisEngine', () => {
  let engine: SentimentAnalysisEngine;
  let mockConfig: SentimentConfig;

  beforeEach(() => {
    mockConfig = {
      twitter: {
        apiKey: 'test_key',
        apiSecret: 'test_secret',
        accessToken: 'test_token',
        accessTokenSecret: 'test_token_secret',
        bearerToken: 'test_bearer'
      },
      reddit: {
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret',
        username: 'test_user',
        password: 'test_pass',
        userAgent: 'test_agent'
      },
      news: {
        sources: ['coindesk', 'cointelegraph'],
        apiKeys: {},
        updateInterval: 15
      },
      weights: {
        twitter: 0.4,
        reddit: 0.35,
        news: 0.25
      },
      thresholds: {
        extremePositive: 70,
        extremeNegative: -70,
        rapidChange: 15,
        volumeSpike: 500
      }
    };

    engine = new SentimentAnalysisEngine(mockConfig);
  });

  afterEach(() => {
    if (engine) {
      engine.stopEngine();
    }
    jest.clearAllMocks();
  });

  describe('Weighted Sentiment Calculation', () => {
    it('should calculate weighted sentiment correctly', async () => {
      // Mock sentiment scores from different sources
      const mockTwitterScore: SentimentScore = {
        source: 'twitter',
        score: 50,
        confidence: 80,
        volume: 100,
        timestamp: new Date(),
        keyTopics: ['bitcoin', 'bullish']
      };

      const mockRedditScore: SentimentScore = {
        source: 'reddit',
        score: 30,
        confidence: 70,
        volume: 50,
        timestamp: new Date(),
        keyTopics: ['ethereum', 'defi']
      };

      const mockNewsScore: SentimentScore = {
        source: 'news',
        score: 20,
        confidence: 90,
        volume: 25,
        timestamp: new Date(),
        keyTopics: ['regulation', 'adoption']
      };

      // Mock the monitor methods
      const mockTwitterMonitor = require('../../../ai/sentiment/twitter-monitor').TwitterSentimentMonitor;
      const mockRedditMonitor = require('../../../ai/sentiment/reddit-monitor').RedditSentimentMonitor;
      const mockNewsMonitor = require('../../../ai/sentiment/news-monitor').NewsSentimentMonitor;

      mockTwitterMonitor.prototype.getCurrentSentiment = jest.fn().mockResolvedValue(mockTwitterScore);
      mockRedditMonitor.prototype.getCurrentSentiment = jest.fn().mockResolvedValue(mockRedditScore);
      mockNewsMonitor.prototype.getCurrentSentiment = jest.fn().mockResolvedValue(mockNewsScore);

      const result = await engine.getCurrentSentiment();

      expect(result).toBeDefined();
      expect(result.aggregatedScore).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.sources).toHaveLength(3);
      expect(result.weights).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle failed source gracefully', async () => {
      const mockTwitterScore: SentimentScore = {
        source: 'twitter',
        score: 40,
        confidence: 75,
        volume: 80,
        timestamp: new Date(),
        keyTopics: ['bitcoin']
      };

      // Mock Twitter success, Reddit failure, News success
      const mockTwitterMonitor = require('../../../ai/sentiment/twitter-monitor').TwitterSentimentMonitor;
      const mockRedditMonitor = require('../../../ai/sentiment/reddit-monitor').RedditSentimentMonitor;
      const mockNewsMonitor = require('../../../ai/sentiment/news-monitor').NewsSentimentMonitor;

      mockTwitterMonitor.prototype.getCurrentSentiment = jest.fn().mockResolvedValue(mockTwitterScore);
      mockRedditMonitor.prototype.getCurrentSentiment = jest.fn().mockRejectedValue(new Error('Reddit API error'));
      mockNewsMonitor.prototype.getCurrentSentiment = jest.fn().mockResolvedValue({
        source: 'news',
        score: 25,
        confidence: 85,
        volume: 30,
        timestamp: new Date(),
        keyTopics: ['crypto']
      });

      const result = await engine.getCurrentSentiment();

      expect(result).toBeDefined();
      expect(result.sources).toHaveLength(3);
      expect(result.sources.find(s => s.source === 'reddit')?.score).toBe(0);
      expect(result.sources.find(s => s.source === 'reddit')?.confidence).toBe(0);
    });
  });

  describe('Position Sizing Adjustment', () => {
    it('should increase position size for positive sentiment', () => {
      // Create mock sentiment history
      const positiveSentiment: WeightedSentiment = {
        aggregatedScore: 60,
        confidence: 80,
        sources: [],
        weights: {},
        timestamp: new Date()
      };

      // Access private method through type assertion
      (engine as any).sentimentHistory = [positiveSentiment];

      const baseSizePercent = 2.0;
      const adjustedSize = engine.calculateSentimentPositionAdjustment(baseSizePercent);

      expect(adjustedSize).toBeGreaterThan(baseSizePercent);
      expect(adjustedSize).toBeLessThanOrEqual(baseSizePercent * 2.0); // Max 2x increase
    });

    it('should decrease position size for negative sentiment', () => {
      const negativeSentiment: WeightedSentiment = {
        aggregatedScore: -50,
        confidence: 75,
        sources: [],
        weights: {},
        timestamp: new Date()
      };

      (engine as any).sentimentHistory = [negativeSentiment];

      const baseSizePercent = 2.0;
      const adjustedSize = engine.calculateSentimentPositionAdjustment(baseSizePercent);

      expect(adjustedSize).toBeLessThan(baseSizePercent);
      expect(adjustedSize).toBeGreaterThanOrEqual(baseSizePercent * 0.5); // Min 0.5x decrease
    });

    it('should not adjust for neutral sentiment', () => {
      const neutralSentiment: WeightedSentiment = {
        aggregatedScore: 5,
        confidence: 60,
        sources: [],
        weights: {},
        timestamp: new Date()
      };

      (engine as any).sentimentHistory = [neutralSentiment];

      const baseSizePercent = 2.0;
      const adjustedSize = engine.calculateSentimentPositionAdjustment(baseSizePercent);

      expect(Math.abs(adjustedSize - baseSizePercent)).toBeLessThan(0.1);
    });

    it('should scale adjustment by confidence', () => {
      const lowConfidenceSentiment: WeightedSentiment = {
        aggregatedScore: 60,
        confidence: 30, // Low confidence
        sources: [],
        weights: {},
        timestamp: new Date()
      };

      const highConfidenceSentiment: WeightedSentiment = {
        aggregatedScore: 60,
        confidence: 90, // High confidence
        sources: [],
        weights: {},
        timestamp: new Date()
      };

      const baseSizePercent = 2.0;

      (engine as any).sentimentHistory = [lowConfidenceSentiment];
      const lowConfidenceAdjustment = engine.calculateSentimentPositionAdjustment(baseSizePercent);

      (engine as any).sentimentHistory = [highConfidenceSentiment];
      const highConfidenceAdjustment = engine.calculateSentimentPositionAdjustment(baseSizePercent);

      expect(highConfidenceAdjustment).toBeGreaterThan(lowConfidenceAdjustment);
    });
  });

  describe('Trend Analysis', () => {
    it('should detect bullish trend', () => {
      // Create ascending sentiment history
      const history: WeightedSentiment[] = [];
      for (let i = 0; i < 10; i++) {
        history.push({
          aggregatedScore: i * 5, // Increasing scores
          confidence: 70,
          sources: [],
          weights: {},
          timestamp: new Date(Date.now() - (10 - i) * 5 * 60 * 1000) // 5 minutes apart
        });
      }

      (engine as any).sentimentHistory = history;
      const trends = (engine as any).analyzeSentimentTrends();

      expect(trends).toHaveLength(1);
      expect(trends[0].direction).toBe('BULLISH');
      expect(trends[0].strength).toBeGreaterThan(0);
    });

    it('should detect bearish trend', () => {
      // Create descending sentiment history
      const history: WeightedSentiment[] = [];
      for (let i = 0; i < 10; i++) {
        history.push({
          aggregatedScore: 50 - i * 5, // Decreasing scores
          confidence: 70,
          sources: [],
          weights: {},
          timestamp: new Date(Date.now() - (10 - i) * 5 * 60 * 1000)
        });
      }

      (engine as any).sentimentHistory = history;
      const trends = (engine as any).analyzeSentimentTrends();

      expect(trends).toHaveLength(1);
      expect(trends[0].direction).toBe('BEARISH');
      expect(trends[0].strength).toBeGreaterThan(0);
    });

    it('should detect neutral trend for flat data', () => {
      // Create flat sentiment history
      const history: WeightedSentiment[] = [];
      for (let i = 0; i < 10; i++) {
        history.push({
          aggregatedScore: 25, // Constant score
          confidence: 70,
          sources: [],
          weights: {},
          timestamp: new Date(Date.now() - (10 - i) * 5 * 60 * 1000)
        });
      }

      (engine as any).sentimentHistory = history;
      const trends = (engine as any).analyzeSentimentTrends();

      expect(trends).toHaveLength(1);
      expect(trends[0].direction).toBe('NEUTRAL');
      expect(trends[0].strength).toBeLessThan(20);
    });
  });

  describe('Alert Generation', () => {
    it('should generate extreme positive alert', async () => {
      const extremePositiveSentiment: WeightedSentiment = {
        aggregatedScore: 85, // Above threshold
        confidence: 80,
        sources: [],
        weights: {},
        timestamp: new Date()
      };

      const alerts = await (engine as any).generateSentimentAlerts(extremePositiveSentiment);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('EXTREME_POSITIVE');
      expect(alerts[0].severity).toBe('HIGH');
    });

    it('should generate extreme negative alert', async () => {
      const extremeNegativeSentiment: WeightedSentiment = {
        aggregatedScore: -85, // Below threshold
        confidence: 80,
        sources: [],
        weights: {},
        timestamp: new Date()
      };

      const alerts = await (engine as any).generateSentimentAlerts(extremeNegativeSentiment);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('EXTREME_NEGATIVE');
      expect(alerts[0].severity).toBe('HIGH');
    });

    it('should generate rapid change alert', async () => {
      // Set up history with previous sentiment
      const previousSentiment: WeightedSentiment = {
        aggregatedScore: 10,
        confidence: 70,
        sources: [],
        weights: {},
        timestamp: new Date(Date.now() - 5 * 60 * 1000)
      };

      const currentSentiment: WeightedSentiment = {
        aggregatedScore: 30, // Change of 20, above rapid change threshold
        confidence: 70,
        sources: [],
        weights: {},
        timestamp: new Date()
      };

      (engine as any).sentimentHistory = [previousSentiment];

      const alerts = await (engine as any).generateSentimentAlerts(currentSentiment);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('RAPID_CHANGE');
      expect(alerts[0].severity).toBe('MEDIUM');
    });
  });

  describe('Engine Status', () => {
    it('should return correct status when stopped', () => {
      const status = engine.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.historySize).toBe(0);
      expect(status.lastUpdate).toBeNull();
      expect(status.sources.twitter).toBe(true);
      expect(status.sources.reddit).toBe(true);
      expect(status.sources.news).toBe(true);
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate bullish recommendations for high positive sentiment', () => {
      const positiveSentiment: WeightedSentiment = {
        aggregatedScore: 60,
        confidence: 80,
        sources: [],
        weights: {},
        timestamp: new Date()
      };

      const recommendations = (engine as any).generateRecommendations(positiveSentiment, []);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some((r: string) => r.includes('bullish'))).toBe(true);
    });

    it('should generate bearish recommendations for high negative sentiment', () => {
      const negativeSentiment: WeightedSentiment = {
        aggregatedScore: -60,
        confidence: 80,
        sources: [],
        weights: {},
        timestamp: new Date()
      };

      const recommendations = (engine as any).generateRecommendations(negativeSentiment, []);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some((r: string) => r.includes('bearish'))).toBe(true);
    });

    it('should warn about low confidence', () => {
      const lowConfidenceSentiment: WeightedSentiment = {
        aggregatedScore: 40,
        confidence: 25, // Low confidence
        sources: [],
        weights: {},
        timestamp: new Date()
      };

      const recommendations = (engine as any).generateRecommendations(lowConfidenceSentiment, []);

      expect(recommendations.some((r: string) => r.includes('Low sentiment confidence'))).toBe(true);
    });
  });
});