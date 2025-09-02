/**
 * Sentiment Analysis Types
 * Defines interfaces and types for the sentiment analysis engine
 */

export interface SentimentScore {
  source: string;
  score: number; // -100 to 100
  confidence: number; // 0 to 100
  volume: number;
  timestamp: Date;
  keyTopics: string[];
  rawData?: any;
}

export interface WeightedSentiment {
  aggregatedScore: number; // -100 to 100
  confidence: number;
  sources: SentimentScore[];
  weights: Record<string, number>;
  timestamp: Date;
}

export interface SentimentTrend {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number; // 0 to 100
  duration: number; // minutes
  changeRate: number; // sentiment change per hour
  significantEvents: string[];
}

export interface SentimentReport {
  overall: WeightedSentiment;
  trends: SentimentTrend[];
  sources: {
    twitter: SentimentScore;
    reddit: SentimentScore;
    news: SentimentScore;
  };
  alerts: SentimentAlert[];
  recommendations: string[];
}

export interface SentimentAlert {
  id: string;
  type: 'EXTREME_POSITIVE' | 'EXTREME_NEGATIVE' | 'RAPID_CHANGE' | 'VOLUME_SPIKE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: Date;
  source: string;
  data: any;
}

export interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  bearerToken: string;
}

export interface RedditConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  userAgent: string;
}

export interface NewsConfig {
  sources: string[];
  apiKeys: Record<string, string>;
  updateInterval: number;
}

export interface SentimentConfig {
  twitter: TwitterConfig;
  reddit: RedditConfig;
  news: NewsConfig;
  weights: {
    twitter: number;
    reddit: number;
    news: number;
  };
  thresholds: {
    extremePositive: number;
    extremeNegative: number;
    rapidChange: number;
    volumeSpike: number;
  };
}

export interface TweetData {
  id: string;
  text: string;
  author: string;
  followers: number;
  retweets: number;
  likes: number;
  timestamp: Date;
  hashtags: string[];
  mentions: string[];
}

export interface RedditPost {
  id: string;
  title: string;
  content: string;
  author: string;
  subreddit: string;
  upvotes: number;
  downvotes: number;
  comments: number;
  timestamp: Date;
}

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  source: string;
  author: string;
  timestamp: Date;
  url: string;
  category: string;
}

export interface InfluentialAccount {
  username: string;
  platform: 'twitter' | 'reddit';
  followers: number;
  influence: number; // 0 to 100
  reliability: number; // 0 to 100
  specialization: string[];
}
