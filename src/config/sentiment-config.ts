/**
 * Sentiment Analysis Configuration
 * Configuration settings for sentiment analysis engine
 */

import { SentimentConfig } from '../ai/sentiment/types';

export const createSentimentConfig = (): SentimentConfig => {
  // Validate required environment variables
  const requiredTwitterVars = [
    'TWITTER_API_KEY',
    'TWITTER_API_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_TOKEN_SECRET',
    'TWITTER_BEARER_TOKEN'
  ];

  const requiredRedditVars = [
    'REDDIT_CLIENT_ID',
    'REDDIT_CLIENT_SECRET',
    'REDDIT_USERNAME',
    'REDDIT_PASSWORD'
  ];

  // Check Twitter credentials
  const missingTwitterVars = requiredTwitterVars.filter(varName => !process.env[varName]);
  if (missingTwitterVars.length > 0) {
    console.warn(`Missing Twitter environment variables: ${missingTwitterVars.join(', ')}`);
  }

  // Check Reddit credentials
  const missingRedditVars = requiredRedditVars.filter(varName => !process.env[varName]);
  if (missingRedditVars.length > 0) {
    console.warn(`Missing Reddit environment variables: ${missingRedditVars.join(', ')}`);
  }

  return {
    twitter: {
      apiKey: process.env.TWITTER_API_KEY || '',
      apiSecret: process.env.TWITTER_API_SECRET || '',
      accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
      accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
      bearerToken: process.env.TWITTER_BEARER_TOKEN || ''
    },
    reddit: {
      clientId: process.env.REDDIT_CLIENT_ID || '',
      clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
      username: process.env.REDDIT_USERNAME || '',
      password: process.env.REDDIT_PASSWORD || '',
      userAgent: process.env.REDDIT_USER_AGENT || 'AI-Crypto-Trading-Agent/1.0.0'
    },
    news: {
      sources: [
        'coindesk',
        'cointelegraph',
        'decrypt',
        'theblock',
        'bitcoinmagazine'
      ],
      apiKeys: {
        newsapi: process.env.NEWS_API_KEY || '',
        cryptopanic: process.env.CRYPTOPANIC_API_KEY || ''
      },
      updateInterval: parseInt(process.env.NEWS_UPDATE_INTERVAL || '15') // minutes
    },
    weights: {
      twitter: parseFloat(process.env.SENTIMENT_TWITTER_WEIGHT || '0.4'),
      reddit: parseFloat(process.env.SENTIMENT_REDDIT_WEIGHT || '0.35'),
      news: parseFloat(process.env.SENTIMENT_NEWS_WEIGHT || '0.25')
    },
    thresholds: {
      extremePositive: parseFloat(process.env.SENTIMENT_EXTREME_POSITIVE || '70'),
      extremeNegative: parseFloat(process.env.SENTIMENT_EXTREME_NEGATIVE || '-70'),
      rapidChange: parseFloat(process.env.SENTIMENT_RAPID_CHANGE || '15'),
      volumeSpike: parseInt(process.env.SENTIMENT_VOLUME_SPIKE || '500')
    }
  };
};

export const validateSentimentConfig = (config: SentimentConfig): boolean => {
  // Validate Twitter config
  if (!config.twitter.apiKey || !config.twitter.apiSecret) {
    console.error('Twitter API credentials are required for sentiment analysis');
    return false;
  }

  // Validate Reddit config
  if (!config.reddit.clientId || !config.reddit.clientSecret) {
    console.error('Reddit API credentials are required for sentiment analysis');
    return false;
  }

  // Validate weights sum to approximately 1
  const totalWeight = config.weights.twitter + config.weights.reddit + config.weights.news;
  if (Math.abs(totalWeight - 1.0) > 0.1) {
    console.warn(`Sentiment weights sum to ${totalWeight}, should be close to 1.0`);
  }

  // Validate thresholds
  if (config.thresholds.extremePositive <= config.thresholds.extremeNegative) {
    console.error('Extreme positive threshold must be greater than extreme negative threshold');
    return false;
  }

  return true;
};