/**
 * Sentiment Analysis Module
 * Main exports for the sentiment analysis engine
 */

export { SentimentAnalysisEngine } from './sentiment-engine';
export { TwitterSentimentMonitor } from './twitter-monitor';
export { RedditSentimentMonitor } from './reddit-monitor';
export { NewsSentimentMonitor } from './news-monitor';

export * from './types';

// Re-export for convenience
export type {
  SentimentScore,
  WeightedSentiment,
  SentimentTrend,
  SentimentReport,
  SentimentAlert,
  SentimentConfig,
  TwitterConfig,
  RedditConfig,
  NewsConfig,
  TweetData,
  RedditPost,
  NewsArticle,
  InfluentialAccount
} from './types';
