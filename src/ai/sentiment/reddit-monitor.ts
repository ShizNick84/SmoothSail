/**
 * Reddit Sentiment Monitor
 * Implements Reddit API integration for crypto subreddits sentiment analysis
 */

import Snoowrap from 'snoowrap';
import Sentiment from 'sentiment';
import { 
  SentimentScore, 
  RedditPost, 
  RedditConfig, 
  SentimentAlert 
} from './types';
import { logger } from '../../core/logging/logger';

export class RedditSentimentMonitor {
  private client: Snoowrap;
  private sentiment: Sentiment;
  private logger = logger;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  
  // Crypto-related subreddits to monitor
  private readonly cryptoSubreddits = [
    'cryptocurrency',
    'Bitcoin',
    'ethereum',
    'CryptoCurrency',
    'btc',
    'ethtrader',
    'CryptoMarkets',
    'altcoin',
    'DeFi',
    'NFT',
    'CryptoMoonShots',
    'SatoshiStreetBets',
    'CryptoCurrencyTrading',
    'BitcoinMarkets',
    'ethfinance'
  ];

  constructor(config: RedditConfig) {
    this.client = new Snoowrap({
      userAgent: config.userAgent,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      username: config.username,
      password: config.password
    });
    
    this.sentiment = new Sentiment();
    // Logger is initialized as class property
  }

  /**
   * Start monitoring Reddit sentiment
   */
  async startMonitoring(intervalMinutes: number = 10): Promise<void> {
    if (this.isMonitoring) {
      this.logger.warn('Reddit monitoring is already running');
      return;
    }

    this.logger.info('Starting Reddit sentiment monitoring');
    this.isMonitoring = true;

    // Initial analysis
    await this.performSentimentAnalysis();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performSentimentAnalysis();
      } catch (error) {
        this.logger.error('Error during Reddit sentiment analysis:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop monitoring Reddit sentiment
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      this.logger.warn('Reddit monitoring is not running');
      return;
    }

    this.logger.info('Stopping Reddit sentiment monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Perform comprehensive Reddit sentiment analysis
   */
  private async performSentimentAnalysis(): Promise<SentimentScore> {
    try {
      this.logger.info('Performing Reddit sentiment analysis');

      // Gather posts and comments from crypto subreddits
      const [hotPosts, newPosts, topPosts] = await Promise.all([
        this.gatherHotPosts(),
        this.gatherNewPosts(),
        this.gatherTopPosts()
      ]);

      const allPosts = [...hotPosts, ...newPosts, ...topPosts];
      
      // Remove duplicates
      const uniquePosts = this.removeDuplicatePosts(allPosts);
      
      if (uniquePosts.length === 0) {
        this.logger.warn('No Reddit posts found for sentiment analysis');
        return this.createEmptySentimentScore();
      }

      // Analyze sentiment
      const sentimentScore = await this.analyzePostsSentiment(uniquePosts);
      
      // Detect trends and alerts
      await this.detectSentimentTrends(sentimentScore);
      
      this.logger.info(`Reddit sentiment analysis complete: ${sentimentScore.score.toFixed(2)}`);
      return sentimentScore;

    } catch (error) {
      this.logger.error('Error in Reddit sentiment analysis:', error);
      throw error;
    }
  }

  /**
   * Gather hot posts from crypto subreddits
   */
  private async gatherHotPosts(): Promise<RedditPost[]> {
    const posts: RedditPost[] = [];
    
    try {
      for (const subreddit of this.cryptoSubreddits) {
        try {
          const hotPosts = await this.client.getSubreddit(subreddit).getHot({ limit: 25 });
          
          for (const post of hotPosts) {
            posts.push({
              id: post.id,
              title: post.title,
              content: post.selftext || '',
              author: post.author.name,
              subreddit: subreddit,
              upvotes: post.ups,
              downvotes: post.downs,
              comments: post.num_comments,
              timestamp: new Date(post.created_utc * 1000)
            });
          }
        } catch (error) {
          this.logger.warn(`Error getting hot posts from r/${subreddit}:`, error);
        }
      }

      this.logger.info(`Gathered ${posts.length} hot posts`);
      return posts;

    } catch (error) {
      this.logger.error('Error gathering hot posts:', error);
      return [];
    }
  }

  /**
   * Gather new posts from crypto subreddits
   */
  private async gatherNewPosts(): Promise<RedditPost[]> {
    const posts: RedditPost[] = [];
    
    try {
      for (const subreddit of this.cryptoSubreddits) {
        try {
          const newPosts = await this.client.getSubreddit(subreddit).getNew({ limit: 15 });
          
          for (const post of newPosts) {
            posts.push({
              id: post.id,
              title: post.title,
              content: post.selftext || '',
              author: post.author.name,
              subreddit: subreddit,
              upvotes: post.ups,
              downvotes: post.downs,
              comments: post.num_comments,
              timestamp: new Date(post.created_utc * 1000)
            });
          }
        } catch (error) {
          this.logger.warn(`Error getting new posts from r/${subreddit}:`, error);
        }
      }

      this.logger.info(`Gathered ${posts.length} new posts`);
      return posts;

    } catch (error) {
      this.logger.error('Error gathering new posts:', error);
      return [];
    }
  }

  /**
   * Gather top posts from crypto subreddits
   */
  private async gatherTopPosts(): Promise<RedditPost[]> {
    const posts: RedditPost[] = [];
    
    try {
      for (const subreddit of this.cryptoSubreddits) {
        try {
          const topPosts = await this.client.getSubreddit(subreddit).getTop({ 
            time: 'day', 
            limit: 10 
          });
          
          for (const post of topPosts) {
            posts.push({
              id: post.id,
              title: post.title,
              content: post.selftext || '',
              author: post.author.name,
              subreddit: subreddit,
              upvotes: post.ups,
              downvotes: post.downs,
              comments: post.num_comments,
              timestamp: new Date(post.created_utc * 1000)
            });
          }
        } catch (error) {
          this.logger.warn(`Error getting top posts from r/${subreddit}:`, error);
        }
      }

      this.logger.info(`Gathered ${posts.length} top posts`);
      return posts;

    } catch (error) {
      this.logger.error('Error gathering top posts:', error);
      return [];
    }
  }

  /**
   * Remove duplicate posts based on ID
   */
  private removeDuplicatePosts(posts: RedditPost[]): RedditPost[] {
    const seen = new Set<string>();
    return posts.filter(post => {
      if (seen.has(post.id)) {
        return false;
      }
      seen.add(post.id);
      return true;
    });
  }

  /**
   * Analyze sentiment of collected posts and their comments
   */
  private async analyzePostsSentiment(posts: RedditPost[]): Promise<SentimentScore> {
    let totalScore = 0;
    let totalWeight = 0;
    const keyTopics: string[] = [];
    const topicCounts: Record<string, number> = {};
    const subredditScores: Record<string, number[]> = {};

    for (const post of posts) {
      try {
        // Analyze post title and content
        const postText = `${post.title} ${post.content}`;
        const postSentiment = this.sentiment.analyze(postText);
        let postScore = postSentiment.score;
        
        // Normalize to -100 to 100 scale
        postScore = Math.max(-100, Math.min(100, postScore * 5));
        
        // Calculate weight based on engagement
        const upvoteRatio = post.upvotes / (post.upvotes + post.downvotes + 1);
        const engagementWeight = Math.log10(post.upvotes + post.comments + 1);
        const qualityWeight = upvoteRatio * 2; // Higher weight for well-received posts
        const weight = engagementWeight + qualityWeight;
        
        totalScore += postScore * weight;
        totalWeight += weight;
        
        // Track subreddit performance
        if (!subredditScores[post.subreddit]) {
          subredditScores[post.subreddit] = [];
        }
        subredditScores[post.subreddit].push(postScore);
        
        // Extract topics from title
        const topics = this.extractTopicsFromText(post.title);
        topics.forEach(topic => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });

        // Analyze top comments for additional sentiment
        await this.analyzePostComments(post.id, post.subreddit);

      } catch (error) {
        this.logger.warn(`Error analyzing post ${post.id}:`, error);
      }
    }

    // Get top topics
    const sortedTopics = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([topic]) => topic);

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const confidence = Math.min(100, Math.log10(posts.length + 1) * 25);

    return {
      source: 'reddit',
      score: Math.round(finalScore * 100) / 100,
      confidence: Math.round(confidence),
      volume: posts.length,
      timestamp: new Date(),
      keyTopics: sortedTopics,
      rawData: {
        totalPosts: posts.length,
        totalWeight,
        subredditScores,
        topicCounts
      }
    };
  }

  /**
   * Analyze comments for additional sentiment data
   */
  private async analyzePostComments(postId: string, subreddit: string): Promise<void> {
    try {
      // Get top comments for the post
      const submission = await this.client.getSubmission(postId);
      await submission.expandReplies({ limit: 5, depth: 1 });
      
      const comments = submission.comments.slice(0, 10); // Analyze top 10 comments
      
      for (const comment of comments) {
        if (comment.body && comment.body !== '[deleted]' && comment.body !== '[removed]') {
          const commentSentiment = this.sentiment.analyze(comment.body);
          // Comment sentiment could be weighted and added to overall analysis
          // For now, we're just collecting the data
        }
      }
    } catch (error) {
      this.logger.warn(`Error analyzing comments for post ${postId}:`, error);
    }
  }

  /**
   * Extract topics from text using simple keyword matching
   */
  private extractTopicsFromText(text: string): string[] {
    const cryptoKeywords = [
      'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
      'blockchain', 'defi', 'nft', 'altcoin', 'hodl', 'trading',
      'bull', 'bear', 'moon', 'diamond', 'hands', 'satoshi',
      'pump', 'dump', 'dip', 'ath', 'fomo', 'fud'
    ];
    
    const lowerText = text.toLowerCase();
    return cryptoKeywords.filter(keyword => lowerText.includes(keyword));
  }

  /**
   * Detect sentiment trends and generate alerts
   */
  private async detectSentimentTrends(currentScore: SentimentScore): Promise<void> {
    const alerts: SentimentAlert[] = [];

    // Extreme sentiment alerts
    if (currentScore.score > 60) {
      alerts.push({
        id: `reddit_extreme_positive_${Date.now()}`,
        type: 'EXTREME_POSITIVE',
        severity: 'HIGH',
        message: `Extremely positive Reddit sentiment detected: ${currentScore.score}`,
        timestamp: new Date(),
        source: 'reddit',
        data: currentScore
      });
    } else if (currentScore.score < -60) {
      alerts.push({
        id: `reddit_extreme_negative_${Date.now()}`,
        type: 'EXTREME_NEGATIVE',
        severity: 'HIGH',
        message: `Extremely negative Reddit sentiment detected: ${currentScore.score}`,
        timestamp: new Date(),
        source: 'reddit',
        data: currentScore
      });
    }

    // Volume spike alerts
    if (currentScore.volume > 200) {
      alerts.push({
        id: `reddit_volume_spike_${Date.now()}`,
        type: 'VOLUME_SPIKE',
        severity: 'MEDIUM',
        message: `High Reddit activity detected: ${currentScore.volume} posts`,
        timestamp: new Date(),
        source: 'reddit',
        data: currentScore
      });
    }

    // Log alerts
    for (const alert of alerts) {
      this.logger.warn(`Reddit Sentiment Alert: ${alert.message}`);
    }
  }

  /**
   * Create empty sentiment score for error cases
   */
  private createEmptySentimentScore(): SentimentScore {
    return {
      source: 'reddit',
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
   * Get monitored subreddits
   */
  getMonitoredSubreddits(): string[] {
    return [...this.cryptoSubreddits];
  }

  /**
   * Add subreddit to monitoring list
   */
  addSubreddit(subreddit: string): void {
    if (!this.cryptoSubreddits.includes(subreddit)) {
      this.cryptoSubreddits.push(subreddit);
      this.logger.info(`Added subreddit to monitoring: r/${subreddit}`);
    }
  }

  /**
   * Remove subreddit from monitoring list
   */
  removeSubreddit(subreddit: string): void {
    const index = this.cryptoSubreddits.indexOf(subreddit);
    if (index !== -1) {
      this.cryptoSubreddits.splice(index, 1);
      this.logger.info(`Removed subreddit from monitoring: r/${subreddit}`);
    }
  }

  /**
   * Get sentiment breakdown by subreddit
   */
  async getSubredditSentimentBreakdown(): Promise<Record<string, SentimentScore>> {
    const breakdown: Record<string, SentimentScore> = {};
    
    for (const subreddit of this.cryptoSubreddits.slice(0, 5)) { // Limit to top 5 for performance
      try {
        const posts = await this.client.getSubreddit(subreddit).getHot({ limit: 20 });
        const redditPosts: RedditPost[] = posts.map(post => ({
          id: post.id,
          title: post.title,
          content: post.selftext || '',
          author: post.author.name,
          subreddit: subreddit,
          upvotes: post.ups,
          downvotes: post.downs,
          comments: post.num_comments,
          timestamp: new Date(post.created_utc * 1000)
        }));
        
        breakdown[subreddit] = await this.analyzePostsSentiment(redditPosts);
      } catch (error) {
        this.logger.warn(`Error getting sentiment for r/${subreddit}:`, error);
      }
    }
    
    return breakdown;
  }
}