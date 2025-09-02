/**
 * Twitter Sentiment Monitor
 * Implements Twitter API integration for crypto hashtags and influential account monitoring
 */

import { TwitterApi, TweetV2, UserV2 } from 'twitter-api-v2';
import Sentiment from 'sentiment';
import { 
  SentimentScore, 
  TweetData, 
  TwitterConfig, 
  InfluentialAccount,
  SentimentAlert 
} from './types';
import { logger } from '../../core/logging/logger';

export class TwitterSentimentMonitor {
  private client: TwitterApi;
  private sentiment: Sentiment;
  private logger = logger;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  
  // Crypto-related hashtags to monitor
  private readonly cryptoHashtags = [
    '#Bitcoin', '#BTC', '#Ethereum', '#ETH', '#crypto', '#cryptocurrency',
    '#blockchain', '#DeFi', '#NFT', '#altcoin', '#HODL', '#trading',
    '#cryptotrading', '#bullish', '#bearish', '#moon', '#diamond', '#hands'
  ];
  
  // Influential crypto accounts to monitor
  private influentialAccounts: InfluentialAccount[] = [
    { username: 'elonmusk', platform: 'twitter', followers: 150000000, influence: 95, reliability: 70, specialization: ['bitcoin', 'dogecoin'] },
    { username: 'VitalikButerin', platform: 'twitter', followers: 5000000, influence: 90, reliability: 95, specialization: ['ethereum', 'defi'] },
    { username: 'cz_binance', platform: 'twitter', followers: 8000000, influence: 85, reliability: 80, specialization: ['binance', 'trading'] },
    { username: 'saylor', platform: 'twitter', followers: 3000000, influence: 80, reliability: 85, specialization: ['bitcoin', 'microstrategy'] },
    { username: 'APompliano', platform: 'twitter', followers: 1500000, influence: 75, reliability: 80, specialization: ['bitcoin', 'investment'] }
  ];

  constructor(config: TwitterConfig) {
    this.client = new TwitterApi({
      appKey: config.apiKey,
      appSecret: config.apiSecret,
      accessToken: config.accessToken,
      accessSecret: config.accessTokenSecret,
    });
    
    this.sentiment = new Sentiment();
    // Logger is initialized as class property
  }

  /**
   * Start monitoring Twitter sentiment
   */
  async startMonitoring(intervalMinutes: number = 5): Promise<void> {
    if (this.isMonitoring) {
      this.logger.warn('Twitter monitoring is already running');
      return;
    }

    this.logger.info('Starting Twitter sentiment monitoring');
    this.isMonitoring = true;

    // Initial analysis
    await this.performSentimentAnalysis();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performSentimentAnalysis();
      } catch (error) {
        this.logger.error('Error during Twitter sentiment analysis:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop monitoring Twitter sentiment
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      this.logger.warn('Twitter monitoring is not running');
      return;
    }

    this.logger.info('Stopping Twitter sentiment monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Perform comprehensive sentiment analysis
   */
  private async performSentimentAnalysis(): Promise<SentimentScore> {
    try {
      this.logger.info('Performing Twitter sentiment analysis');

      // Gather tweets from hashtags and influential accounts
      const [hashtagTweets, influencerTweets] = await Promise.all([
        this.gatherHashtagTweets(),
        this.gatherInfluencerTweets()
      ]);

      const allTweets = [...hashtagTweets, ...influencerTweets];
      
      if (allTweets.length === 0) {
        this.logger.warn('No tweets found for sentiment analysis');
        return this.createEmptySentimentScore();
      }

      // Analyze sentiment
      const sentimentScore = this.analyzeTweetsSentiment(allTweets);
      
      // Detect trends and alerts
      await this.detectSentimentTrends(sentimentScore);
      
      this.logger.info(`Twitter sentiment analysis complete: ${sentimentScore.score.toFixed(2)}`);
      return sentimentScore;

    } catch (error) {
      this.logger.error('Error in Twitter sentiment analysis:', error);
      throw error;
    }
  }

  /**
   * Gather tweets from crypto hashtags
   */
  private async gatherHashtagTweets(): Promise<TweetData[]> {
    const tweets: TweetData[] = [];
    
    try {
      // Search for recent tweets with crypto hashtags
      const hashtagQuery = this.cryptoHashtags.join(' OR ');
      const searchResults = await this.client.v2.search(hashtagQuery, {
        max_results: 100,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'entities'],
        'user.fields': ['public_metrics'],
        expansions: ['author_id']
      });

      for (const tweet of searchResults.data || []) {
        const author = searchResults.includes?.users?.find(u => u.id === tweet.author_id);
        
        tweets.push({
          id: tweet.id,
          text: tweet.text,
          author: author?.username || 'unknown',
          followers: author?.public_metrics?.followers_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          likes: tweet.public_metrics?.like_count || 0,
          timestamp: new Date(tweet.created_at || Date.now()),
          hashtags: tweet.entities?.hashtags?.map(h => h.tag) || [],
          mentions: tweet.entities?.mentions?.map(m => m.username) || []
        });
      }

      this.logger.info(`Gathered ${tweets.length} hashtag tweets`);
      return tweets;

    } catch (error) {
      this.logger.error('Error gathering hashtag tweets:', error);
      return [];
    }
  }

  /**
   * Gather tweets from influential accounts
   */
  private async gatherInfluencerTweets(): Promise<TweetData[]> {
    const tweets: TweetData[] = [];
    
    try {
      for (const account of this.influentialAccounts) {
        try {
          // Get user timeline
          const userTweets = await this.client.v2.userTimelineByUsername(account.username, {
            max_results: 20,
            'tweet.fields': ['created_at', 'public_metrics', 'entities'],
            exclude: ['retweets', 'replies']
          });

          for (const tweet of userTweets.data || []) {
            // Only include crypto-related tweets
            if (this.isCryptoRelated(tweet.text)) {
              tweets.push({
                id: tweet.id,
                text: tweet.text,
                author: account.username,
                followers: account.followers,
                retweets: tweet.public_metrics?.retweet_count || 0,
                likes: tweet.public_metrics?.like_count || 0,
                timestamp: new Date(tweet.created_at || Date.now()),
                hashtags: tweet.entities?.hashtags?.map(h => h.tag) || [],
                mentions: tweet.entities?.mentions?.map(m => m.username) || []
              });
            }
          }
        } catch (error) {
          this.logger.warn(`Error getting tweets from ${account.username}:`, error);
        }
      }

      this.logger.info(`Gathered ${tweets.length} influencer tweets`);
      return tweets;

    } catch (error) {
      this.logger.error('Error gathering influencer tweets:', error);
      return [];
    }
  }

  /**
   * Check if tweet text is crypto-related
   */
  private isCryptoRelated(text: string): boolean {
    const cryptoKeywords = [
      'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
      'blockchain', 'defi', 'nft', 'altcoin', 'hodl', 'trading',
      'bull', 'bear', 'moon', 'diamond', 'hands', 'satoshi'
    ];
    
    const lowerText = text.toLowerCase();
    return cryptoKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Analyze sentiment of collected tweets
   */
  private analyzeTweetsSentiment(tweets: TweetData[]): SentimentScore {
    let totalScore = 0;
    let totalWeight = 0;
    const keyTopics: string[] = [];
    const topicCounts: Record<string, number> = {};

    for (const tweet of tweets) {
      // Calculate base sentiment
      const sentimentResult = this.sentiment.analyze(tweet.text);
      let tweetScore = sentimentResult.score;
      
      // Normalize to -100 to 100 scale
      tweetScore = Math.max(-100, Math.min(100, tweetScore * 10));
      
      // Calculate weight based on engagement and follower count
      const engagementWeight = Math.log10(tweet.likes + tweet.retweets + 1);
      const followerWeight = Math.log10(tweet.followers + 1);
      const weight = engagementWeight + followerWeight;
      
      totalScore += tweetScore * weight;
      totalWeight += weight;
      
      // Track topics
      tweet.hashtags.forEach(hashtag => {
        const topic = hashtag.toLowerCase();
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    }

    // Get top topics
    const sortedTopics = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([topic]) => topic);

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const confidence = Math.min(100, Math.log10(tweets.length + 1) * 30);

    return {
      source: 'twitter',
      score: Math.round(finalScore * 100) / 100,
      confidence: Math.round(confidence),
      volume: tweets.length,
      timestamp: new Date(),
      keyTopics: sortedTopics,
      rawData: {
        totalTweets: tweets.length,
        totalWeight,
        topicCounts
      }
    };
  }

  /**
   * Detect sentiment trends and generate alerts
   */
  private async detectSentimentTrends(currentScore: SentimentScore): Promise<void> {
    // This would typically compare with historical data
    // For now, we'll implement basic threshold-based alerts
    
    const alerts: SentimentAlert[] = [];

    // Extreme sentiment alerts
    if (currentScore.score > 70) {
      alerts.push({
        id: `twitter_extreme_positive_${Date.now()}`,
        type: 'EXTREME_POSITIVE',
        severity: 'HIGH',
        message: `Extremely positive Twitter sentiment detected: ${currentScore.score}`,
        timestamp: new Date(),
        source: 'twitter',
        data: currentScore
      });
    } else if (currentScore.score < -70) {
      alerts.push({
        id: `twitter_extreme_negative_${Date.now()}`,
        type: 'EXTREME_NEGATIVE',
        severity: 'HIGH',
        message: `Extremely negative Twitter sentiment detected: ${currentScore.score}`,
        timestamp: new Date(),
        source: 'twitter',
        data: currentScore
      });
    }

    // Volume spike alerts
    if (currentScore.volume > 500) {
      alerts.push({
        id: `twitter_volume_spike_${Date.now()}`,
        type: 'VOLUME_SPIKE',
        severity: 'MEDIUM',
        message: `High Twitter activity detected: ${currentScore.volume} tweets`,
        timestamp: new Date(),
        source: 'twitter',
        data: currentScore
      });
    }

    // Log alerts
    for (const alert of alerts) {
      this.logger.warn(`Twitter Sentiment Alert: ${alert.message}`);
    }
  }

  /**
   * Create empty sentiment score for error cases
   */
  private createEmptySentimentScore(): SentimentScore {
    return {
      source: 'twitter',
      score: 0,
      confidence: 0,
      volume: 0,
      timestamp: new Date(),
      keyTopics: []
    };
  }

  /**
   * Get current sentiment score
   */
  async getCurrentSentiment(): Promise<SentimentScore> {
    return await this.performSentimentAnalysis();
  }

  /**
   * Get influential accounts being monitored
   */
  getInfluentialAccounts(): InfluentialAccount[] {
    return [...this.influentialAccounts];
  }

  /**
   * Add influential account to monitoring list
   */
  addInfluentialAccount(account: InfluentialAccount): void {
    this.influentialAccounts.push(account);
    this.logger.info(`Added influential account: ${account.username}`);
  }

  /**
   * Remove influential account from monitoring list
   */
  removeInfluentialAccount(username: string): void {
    const index = this.influentialAccounts.findIndex(acc => acc.username === username);
    if (index !== -1) {
      this.influentialAccounts.splice(index, 1);
      this.logger.info(`Removed influential account: ${username}`);
    }
  }
}
