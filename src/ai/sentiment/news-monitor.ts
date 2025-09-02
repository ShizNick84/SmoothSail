/**
 * News Sentiment Monitor
 * Implements news source integration for crypto news sentiment analysis
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import Sentiment from 'sentiment';
import { 
  SentimentScore, 
  NewsArticle, 
  NewsConfig, 
  SentimentAlert 
} from './types';
import { logger } from '../../core/logging/logger';

export class NewsSentimentMonitor {
  private sentiment: Sentiment;
  private logger = logger;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private config: NewsConfig;
  
  // News sources configuration
  private readonly newsSources = {
    coindesk: {
      name: 'CoinDesk',
      baseUrl: 'https://www.coindesk.com',
      rssUrl: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
      reliability: 90,
      influence: 85
    },
    cointelegraph: {
      name: 'CoinTelegraph',
      baseUrl: 'https://cointelegraph.com',
      rssUrl: 'https://cointelegraph.com/rss',
      reliability: 85,
      influence: 80
    },
    decrypt: {
      name: 'Decrypt',
      baseUrl: 'https://decrypt.co',
      rssUrl: 'https://decrypt.co/feed',
      reliability: 80,
      influence: 75
    },
    theblock: {
      name: 'The Block',
      baseUrl: 'https://www.theblock.co',
      rssUrl: 'https://www.theblock.co/rss.xml',
      reliability: 88,
      influence: 82
    },
    bitcoinmagazine: {
      name: 'Bitcoin Magazine',
      baseUrl: 'https://bitcoinmagazine.com',
      rssUrl: 'https://bitcoinmagazine.com/feed',
      reliability: 85,
      influence: 78
    }
  };

  constructor(config: NewsConfig) {
    this.config = config;
    this.sentiment = new Sentiment();
    // Logger is initialized as class property
  }

  /**
   * Start monitoring news sentiment
   */
  async startMonitoring(intervalMinutes: number = 15): Promise<void> {
    if (this.isMonitoring) {
      this.logger.warn('News monitoring is already running');
      return;
    }

    this.logger.info('Starting news sentiment monitoring');
    this.isMonitoring = true;

    // Initial analysis
    await this.performSentimentAnalysis();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performSentimentAnalysis();
      } catch (error) {
        this.logger.error('Error during news sentiment analysis:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop monitoring news sentiment
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      this.logger.warn('News monitoring is not running');
      return;
    }

    this.logger.info('Stopping news sentiment monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Perform comprehensive news sentiment analysis
   */
  private async performSentimentAnalysis(): Promise<SentimentScore> {
    try {
      this.logger.info('Performing news sentiment analysis');

      // Gather articles from all news sources
      const allArticles = await this.gatherNewsArticles();
      
      if (allArticles.length === 0) {
        this.logger.warn('No news articles found for sentiment analysis');
        return this.createEmptySentimentScore();
      }

      // Analyze sentiment
      const sentimentScore = this.analyzeArticlesSentiment(allArticles);
      
      // Detect trends and alerts
      await this.detectSentimentTrends(sentimentScore);
      
      this.logger.info(`News sentiment analysis complete: ${sentimentScore.score.toFixed(2)}`);
      return sentimentScore;

    } catch (error) {
      this.logger.error('Error in news sentiment analysis:', error);
      throw error;
    }
  }

  /**
   * Gather articles from all configured news sources
   */
  private async gatherNewsArticles(): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    
    const sourcePromises = Object.entries(this.newsSources).map(async ([key, source]) => {
      try {
        const sourceArticles = await this.fetchArticlesFromSource(key, source);
        articles.push(...sourceArticles);
      } catch (error) {
        this.logger.warn(`Error fetching articles from ${source.name}:`, error);
      }
    });

    await Promise.all(sourcePromises);
    
    // Remove duplicates and sort by timestamp
    const uniqueArticles = this.removeDuplicateArticles(articles);
    const recentArticles = uniqueArticles
      .filter(article => this.isRecentArticle(article))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 100); // Limit to 100 most recent articles

    this.logger.info(`Gathered ${recentArticles.length} news articles`);
    return recentArticles;
  }

  /**
   * Fetch articles from a specific news source
   */
  private async fetchArticlesFromSource(sourceKey: string, source: any): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    
    try {
      // For this implementation, we'll use web scraping since RSS feeds might be limited
      // In production, you'd want to use proper APIs where available
      
      if (sourceKey === 'coindesk') {
        return await this.scrapeCoinDeskArticles();
      } else if (sourceKey === 'cointelegraph') {
        return await this.scrapeCoinTelegraphArticles();
      } else if (sourceKey === 'decrypt') {
        return await this.scrapeDecryptArticles();
      } else if (sourceKey === 'theblock') {
        return await this.scrapeTheBlockArticles();
      } else if (sourceKey === 'bitcoinmagazine') {
        return await this.scrapeBitcoinMagazineArticles();
      }
      
      return articles;
    } catch (error) {
      this.logger.error(`Error fetching from ${source.name}:`, error);
      return [];
    }
  }

  /**
   * Scrape CoinDesk articles
   */
  private async scrapeCoinDeskArticles(): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    
    try {
      const response = await axios.get('https://www.coindesk.com/livewire/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      $('.LivewireItem').each((index, element) => {
        if (index >= 20) return; // Limit to 20 articles
        
        const $element = $(element);
        const title = $element.find('.LivewireItem-title').text().trim();
        const content = $element.find('.LivewireItem-content').text().trim();
        const timeStr = $element.find('.LivewireItem-time').text().trim();
        
        if (title && this.isCryptoRelated(title + ' ' + content)) {
          articles.push({
            id: `coindesk_${Date.now()}_${index}`,
            title,
            content,
            source: 'CoinDesk',
            author: 'CoinDesk',
            timestamp: this.parseTimeString(timeStr) || new Date(),
            url: 'https://www.coindesk.com/livewire/',
            category: 'crypto'
          });
        }
      });
      
    } catch (error) {
      this.logger.warn('Error scraping CoinDesk:', error);
    }
    
    return articles;
  }

  /**
   * Scrape CoinTelegraph articles
   */
  private async scrapeCoinTelegraphArticles(): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    
    try {
      const response = await axios.get('https://cointelegraph.com/news', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      $('.post-card-inline').each((index, element) => {
        if (index >= 20) return; // Limit to 20 articles
        
        const $element = $(element);
        const title = $element.find('.post-card-inline__title').text().trim();
        const content = $element.find('.post-card-inline__text').text().trim();
        const author = $element.find('.post-card-inline__author').text().trim();
        
        if (title && this.isCryptoRelated(title + ' ' + content)) {
          articles.push({
            id: `cointelegraph_${Date.now()}_${index}`,
            title,
            content,
            source: 'CoinTelegraph',
            author: author || 'CoinTelegraph',
            timestamp: new Date(),
            url: 'https://cointelegraph.com/news',
            category: 'crypto'
          });
        }
      });
      
    } catch (error) {
      this.logger.warn('Error scraping CoinTelegraph:', error);
    }
    
    return articles;
  }

  /**
   * Scrape Decrypt articles
   */
  private async scrapeDecryptArticles(): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    
    try {
      const response = await axios.get('https://decrypt.co/news', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      $('.PostCard').each((index, element) => {
        if (index >= 15) return; // Limit to 15 articles
        
        const $element = $(element);
        const title = $element.find('.PostCard__title').text().trim();
        const content = $element.find('.PostCard__excerpt').text().trim();
        const author = $element.find('.PostCard__author').text().trim();
        
        if (title && this.isCryptoRelated(title + ' ' + content)) {
          articles.push({
            id: `decrypt_${Date.now()}_${index}`,
            title,
            content,
            source: 'Decrypt',
            author: author || 'Decrypt',
            timestamp: new Date(),
            url: 'https://decrypt.co/news',
            category: 'crypto'
          });
        }
      });
      
    } catch (error) {
      this.logger.warn('Error scraping Decrypt:', error);
    }
    
    return articles;
  }

  /**
   * Scrape The Block articles
   */
  private async scrapeTheBlockArticles(): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    
    try {
      const response = await axios.get('https://www.theblock.co/latest', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      $('.storyItem').each((index, element) => {
        if (index >= 15) return; // Limit to 15 articles
        
        const $element = $(element);
        const title = $element.find('.storyItem__headline').text().trim();
        const content = $element.find('.storyItem__summary').text().trim();
        
        if (title && this.isCryptoRelated(title + ' ' + content)) {
          articles.push({
            id: `theblock_${Date.now()}_${index}`,
            title,
            content,
            source: 'The Block',
            author: 'The Block',
            timestamp: new Date(),
            url: 'https://www.theblock.co/latest',
            category: 'crypto'
          });
        }
      });
      
    } catch (error) {
      this.logger.warn('Error scraping The Block:', error);
    }
    
    return articles;
  }

  /**
   * Scrape Bitcoin Magazine articles
   */
  private async scrapeBitcoinMagazineArticles(): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    
    try {
      const response = await axios.get('https://bitcoinmagazine.com/articles', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      $('.m-card').each((index, element) => {
        if (index >= 15) return; // Limit to 15 articles
        
        const $element = $(element);
        const title = $element.find('.m-card__title').text().trim();
        const content = $element.find('.m-card__excerpt').text().trim();
        const author = $element.find('.m-card__author').text().trim();
        
        if (title && this.isCryptoRelated(title + ' ' + content)) {
          articles.push({
            id: `bitcoinmagazine_${Date.now()}_${index}`,
            title,
            content,
            source: 'Bitcoin Magazine',
            author: author || 'Bitcoin Magazine',
            timestamp: new Date(),
            url: 'https://bitcoinmagazine.com/articles',
            category: 'crypto'
          });
        }
      });
      
    } catch (error) {
      this.logger.warn('Error scraping Bitcoin Magazine:', error);
    }
    
    return articles;
  }

  /**
   * Check if article content is crypto-related
   */
  private isCryptoRelated(text: string): boolean {
    const cryptoKeywords = [
      'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
      'blockchain', 'defi', 'nft', 'altcoin', 'trading', 'exchange',
      'wallet', 'mining', 'staking', 'yield', 'protocol', 'token',
      'coin', 'digital asset', 'web3', 'metaverse', 'dao'
    ];
    
    const lowerText = text.toLowerCase();
    return cryptoKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Check if article is recent (within last 24 hours)
   */
  private isRecentArticle(article: NewsArticle): boolean {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return article.timestamp > twentyFourHoursAgo;
  }

  /**
   * Parse time string to Date object
   */
  private parseTimeString(timeStr: string): Date | null {
    try {
      // Handle various time formats
      if (timeStr.includes('ago')) {
        const now = new Date();
        if (timeStr.includes('minute')) {
          const minutes = parseInt(timeStr.match(/\d+/)?.[0] || '0');
          return new Date(now.getTime() - minutes * 60 * 1000);
        } else if (timeStr.includes('hour')) {
          const hours = parseInt(timeStr.match(/\d+/)?.[0] || '0');
          return new Date(now.getTime() - hours * 60 * 60 * 1000);
        }
      }
      return new Date(timeStr);
    } catch {
      return null;
    }
  }

  /**
   * Remove duplicate articles based on title similarity
   */
  private removeDuplicateArticles(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    return articles.filter(article => {
      const normalizedTitle = article.title.toLowerCase().replace(/[^\w\s]/g, '');
      if (seen.has(normalizedTitle)) {
        return false;
      }
      seen.add(normalizedTitle);
      return true;
    });
  }

  /**
   * Analyze sentiment of collected articles
   */
  private analyzeArticlesSentiment(articles: NewsArticle[]): SentimentScore {
    let totalScore = 0;
    let totalWeight = 0;
    const keyTopics: string[] = [];
    const topicCounts: Record<string, number> = {};
    const sourceScores: Record<string, number[]> = {};

    for (const article of articles) {
      // Analyze article title and content
      const articleText = `${article.title} ${article.content}`;
      const sentimentResult = this.sentiment.analyze(articleText);
      let articleScore = sentimentResult.score;
      
      // Normalize to -100 to 100 scale
      articleScore = Math.max(-100, Math.min(100, articleScore * 8));
      
      // Calculate weight based on source reliability and content length
      const sourceInfo = Object.values(this.newsSources).find(s => s.name === article.source);
      const reliabilityWeight = (sourceInfo?.reliability || 70) / 100;
      const contentWeight = Math.min(2, Math.log10(articleText.length + 1));
      const weight = reliabilityWeight * contentWeight;
      
      totalScore += articleScore * weight;
      totalWeight += weight;
      
      // Track source performance
      if (!sourceScores[article.source]) {
        sourceScores[article.source] = [];
      }
      sourceScores[article.source].push(articleScore);
      
      // Extract topics from title and content
      const topics = this.extractTopicsFromText(articleText);
      topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    }

    // Get top topics
    const sortedTopics = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([topic]) => topic);

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const confidence = Math.min(100, Math.log10(articles.length + 1) * 35);

    return {
      source: 'news',
      score: Math.round(finalScore * 100) / 100,
      confidence: Math.round(confidence),
      volume: articles.length,
      timestamp: new Date(),
      keyTopics: sortedTopics,
      rawData: {
        totalArticles: articles.length,
        totalWeight,
        sourceScores,
        topicCounts
      }
    };
  }

  /**
   * Extract topics from text using keyword matching
   */
  private extractTopicsFromText(text: string): string[] {
    const cryptoKeywords = [
      'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
      'blockchain', 'defi', 'nft', 'altcoin', 'trading', 'exchange',
      'regulation', 'adoption', 'institutional', 'etf', 'mining',
      'staking', 'yield', 'protocol', 'token', 'bull', 'bear'
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
    if (currentScore.score > 50) {
      alerts.push({
        id: `news_extreme_positive_${Date.now()}`,
        type: 'EXTREME_POSITIVE',
        severity: 'HIGH',
        message: `Extremely positive news sentiment detected: ${currentScore.score}`,
        timestamp: new Date(),
        source: 'news',
        data: currentScore
      });
    } else if (currentScore.score < -50) {
      alerts.push({
        id: `news_extreme_negative_${Date.now()}`,
        type: 'EXTREME_NEGATIVE',
        severity: 'HIGH',
        message: `Extremely negative news sentiment detected: ${currentScore.score}`,
        timestamp: new Date(),
        source: 'news',
        data: currentScore
      });
    }

    // Volume spike alerts
    if (currentScore.volume > 50) {
      alerts.push({
        id: `news_volume_spike_${Date.now()}`,
        type: 'VOLUME_SPIKE',
        severity: 'MEDIUM',
        message: `High news volume detected: ${currentScore.volume} articles`,
        timestamp: new Date(),
        source: 'news',
        data: currentScore
      });
    }

    // Log alerts
    for (const alert of alerts) {
      this.logger.warn(`News Sentiment Alert: ${alert.message}`);
    }
  }

  /**
   * Create empty sentiment score for error cases
   */
  private createEmptySentimentScore(): SentimentScore {
    return {
      source: 'news',
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
   * Get monitored news sources
   */
  getMonitoredSources(): string[] {
    return Object.values(this.newsSources).map(source => source.name);
  }

  /**
   * Get sentiment breakdown by news source
   */
  async getSourceSentimentBreakdown(): Promise<Record<string, SentimentScore>> {
    const breakdown: Record<string, SentimentScore> = {};
    
    for (const [key, source] of Object.entries(this.newsSources)) {
      try {
        const articles = await this.fetchArticlesFromSource(key, source);
        if (articles.length > 0) {
          breakdown[source.name] = this.analyzeArticlesSentiment(articles);
        }
      } catch (error) {
        this.logger.warn(`Error getting sentiment for ${source.name}:`, error);
      }
    }
    
    return breakdown;
  }
}
