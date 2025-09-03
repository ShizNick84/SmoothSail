/**
 * =============================================================================
 * ENHANCED SENTIMENT ANALYSIS WITH MULTI-MODEL AI
 * =============================================================================
 * 
 * This module implements advanced sentiment analysis using multiple AI models
 * for comprehensive market sentiment evaluation. It combines traditional
 * sentiment analysis with AI-powered insights from multiple LLM models.
 * 
 * Model Integration:
 * - Mistral 7B: Fast real-time sentiment analysis
 * - Llama 3.1 8B: Deep market context understanding
 * - Traditional NLP: Baseline sentiment scoring
 * 
 * Features:
 * - Real-time news and social media sentiment processing
 * - AI model voting system for final sentiment scores
 * - Confluence scoring combining multiple AI outputs
 * - Market context-aware sentiment interpretation
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { OllamaManager, AIAnalysisRequest, AIAnalysisResponse } from './ollama-manager';
import Sentiment from 'sentiment';
import natural from 'natural';

/**
 * Interface for sentiment analysis input
 */
interface SentimentInput {
  text: string;
  source: 'news' | 'social' | 'forum' | 'official' | 'analyst';
  timestamp: Date;
  symbol?: string;
  weight?: number; // Importance weight (0-1)
  metadata?: {
    author?: string;
    platform?: string;
    engagement?: number;
    credibility?: number;
  };
}

/**
 * Interface for sentiment analysis result
 */
interface SentimentResult {
  overallScore: number; // -100 to 100 (negative to positive)
  confidence: number; // 0-100
  breakdown: {
    traditional: number; // Traditional NLP sentiment
    mistralScore: number; // Mistral 7B analysis
    llamaScore: number; // Llama 3.1 8B analysis
    weightedAverage: number; // Weighted combination
  };
  emotions: {
    fear: number;
    greed: number;
    uncertainty: number;
    optimism: number;
    panic: number;
  };
  keyPhrases: string[];
  marketImpact: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasoning: string[];
  timestamp: Date;
}

/**
 * Interface for aggregated sentiment analysis
 */
interface AggregatedSentiment {
  symbol: string;
  timeframe: string;
  overallSentiment: number; // -100 to 100
  confidence: number; // 0-100
  trendDirection: 'IMPROVING' | 'DECLINING' | 'STABLE';
  volatility: number; // 0-100 (sentiment volatility)
  sources: {
    news: SentimentResult[];
    social: SentimentResult[];
    analyst: SentimentResult[];
  };
  marketSignals: {
    buyPressure: number;
    sellPressure: number;
    fearLevel: number;
    greedLevel: number;
  };
  recommendations: string[];
  lastUpdated: Date;
}

/**
 * Interface for sentiment model performance
 */
interface SentimentModelPerformance {
  modelName: string;
  accuracy: number;
  responseTime: number;
  agreementRate: number; // How often it agrees with other models
  totalAnalyses: number;
  lastUsed: Date;
}

/**
 * Enhanced Sentiment Analyzer with Multi-Model AI
 */
export class EnhancedSentimentAnalyzer extends EventEmitter {
  private ollamaManager: OllamaManager;
  private traditionalSentiment: Sentiment;
  private tokenizer: any;
  private isInitialized: boolean = false;
  private modelPerformance: Map<string, SentimentModelPerformance> = new Map();
  private sentimentHistory: Map<string, SentimentResult[]> = new Map();
  private maxHistoryPerSymbol: number = 100;

  // Model weights for sentiment fusion
  private modelWeights = {
    traditional: 0.2,  // Traditional NLP baseline
    mistral: 0.4,      // Fast sentiment analysis
    llama: 0.4         // Deep context understanding
  };

  // Emotion keywords for enhanced analysis
  private emotionKeywords = {
    fear: ['crash', 'dump', 'panic', 'fear', 'worried', 'scared', 'risk', 'danger', 'collapse'],
    greed: ['moon', 'pump', 'rocket', 'lambo', 'rich', 'profit', 'gains', 'bull', 'surge'],
    uncertainty: ['maybe', 'uncertain', 'unclear', 'confused', 'mixed', 'volatile', 'unpredictable'],
    optimism: ['bullish', 'positive', 'growth', 'potential', 'opportunity', 'bright', 'promising'],
    panic: ['sell', 'exit', 'emergency', 'urgent', 'immediate', 'crisis', 'disaster', 'catastrophe']
  };

  constructor(ollamaManager: OllamaManager) {
    super();
    this.ollamaManager = ollamaManager;
    this.traditionalSentiment = new Sentiment();
    this.tokenizer = natural.WordTokenizer;

    // Initialize model performance tracking
    this.initializeModelPerformance();

    logger.info('💭 Enhanced Sentiment Analyzer initialized');
  }

  /**
   * Initialize the sentiment analyzer
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing Enhanced Sentiment Analyzer...');

      // Ensure Ollama manager is available
      if (!this.ollamaManager) {
        throw new Error('Ollama Manager is required');
      }

      // Test sentiment analysis models
      await this.testSentimentModels();

      // Load sentiment history if available
      await this.loadSentimentHistory();

      this.isInitialized = true;
      logger.info('✅ Enhanced Sentiment Analyzer initialized successfully');

      this.emit('initialized');

    } catch (error) {
      logger.error('❌ Failed to initialize Enhanced Sentiment Analyzer:', error);
      throw new Error(`Sentiment Analyzer initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize model performance tracking
   */
  private initializeModelPerformance(): void {
    const models = ['traditional', 'mistral:7b', 'llama3.1:8b'];
    
    models.forEach(modelName => {
      this.modelPerformance.set(modelName, {
        modelName,
        accuracy: 75,
        responseTime: modelName === 'traditional' ? 10 : 2000,
        agreementRate: 80,
        totalAnalyses: 0,
        lastUsed: new Date()
      });
    });
  }

  /**
   * Test sentiment analysis models
   */
  private async testSentimentModels(): Promise<void> {
    logger.info('🧪 Testing sentiment analysis models...');

    const testText = "Bitcoin is showing strong bullish momentum with increasing volume and positive market sentiment.";

    try {
      // Test traditional sentiment
      const traditionalResult = this.traditionalSentiment.analyze(testText);
      logger.info(`✅ Traditional sentiment test: ${traditionalResult.score}`);

      // Test AI models through Ollama
      const testRequest: AIAnalysisRequest = {
        prompt: `Analyze the sentiment of this text about cryptocurrency: "${testText}". Provide a sentiment score from -100 (very negative) to 100 (very positive).`,
        modelType: 'sentiment',
        priority: 'medium',
        maxTokens: 200
      };

      const aiResult = await this.ollamaManager.generateAnalysis(testRequest);
      logger.info(`✅ AI sentiment test completed: ${aiResult.modelUsed}`);

    } catch (error) {
      logger.warn('⚠️ Some sentiment models may not be available:', error);
    }
  }

  /**
   * Analyze sentiment of a single text input
   */
  public async analyzeSentiment(input: SentimentInput): Promise<SentimentResult> {
    try {
      logger.debug(`💭 Analyzing sentiment for ${input.source} text...`);

      const startTime = Date.now();

      // Run all sentiment analyses in parallel
      const [traditionalResult, mistralResult, llamaResult] = await Promise.all([
        this.analyzeTraditionalSentiment(input.text),
        this.analyzeWithMistral(input),
        this.analyzeWithLlama(input)
      ]);

      // Calculate weighted sentiment score
      const weightedScore = this.calculateWeightedSentiment(
        traditionalResult,
        mistralResult,
        llamaResult
      );

      // Analyze emotions
      const emotions = this.analyzeEmotions(input.text);

      // Extract key phrases
      const keyPhrases = this.extractKeyPhrases(input.text);

      // Determine market impact
      const marketImpact = this.determineMarketImpact(weightedScore, emotions);

      // Determine urgency
      const urgency = this.determineUrgency(input, emotions);

      // Generate reasoning
      const reasoning = this.generateSentimentReasoning(
        traditionalResult,
        mistralResult,
        llamaResult,
        emotions
      );

      // Calculate confidence
      const confidence = this.calculateSentimentConfidence(
        traditionalResult,
        mistralResult,
        llamaResult
      );

      const result: SentimentResult = {
        overallScore: Math.round(weightedScore),
        confidence: Math.round(confidence),
        breakdown: {
          traditional: traditionalResult,
          mistralScore: mistralResult,
          llamaScore: llamaResult,
          weightedAverage: weightedScore
        },
        emotions,
        keyPhrases,
        marketImpact,
        urgency,
        reasoning,
        timestamp: new Date()
      };

      // Update performance metrics
      const processingTime = Date.now() - startTime;
      this.updateModelPerformance(processingTime);

      // Store in history
      this.addToSentimentHistory(input.symbol || 'GENERAL', result);

      logger.debug(`✅ Sentiment analysis completed: ${result.overallScore} (${result.confidence}% confidence)`);

      this.emit('sentimentAnalyzed', result);

      return result;

    } catch (error) {
      logger.error('❌ Error analyzing sentiment:', error);
      throw error;
    }
  }

  /**
   * Analyze sentiment using traditional NLP
   */
  private analyzeTraditionalSentiment(text: string): number {
    try {
      const result = this.traditionalSentiment.analyze(text);
      
      // Normalize score to -100 to 100 range
      const normalizedScore = Math.max(-100, Math.min(100, result.score * 20));
      
      return normalizedScore;

    } catch (error) {
      logger.error('❌ Traditional sentiment analysis failed:', error);
      return 0; // Neutral fallback
    }
  }

  /**
   * Analyze sentiment using Mistral 7B
   */
  private async analyzeWithMistral(input: SentimentInput): Promise<number> {
    try {
      const request: AIAnalysisRequest = {
        prompt: this.buildMistralSentimentPrompt(input),
        modelType: 'sentiment',
        priority: 'high',
        maxTokens: 300,
        temperature: 0.3
      };

      const response = await this.ollamaManager.generateAnalysis(request);
      return this.extractSentimentScore(response.content);

    } catch (error) {
      logger.error('❌ Mistral sentiment analysis failed:', error);
      return 0; // Neutral fallback
    }
  }

  /**
   * Analyze sentiment using Llama 3.1 8B
   */
  private async analyzeWithLlama(input: SentimentInput): Promise<number> {
    try {
      const request: AIAnalysisRequest = {
        prompt: this.buildLlamaSentimentPrompt(input),
        modelType: 'trading', // Use trading model for deeper context
        priority: 'medium',
        maxTokens: 500,
        temperature: 0.4
      };

      const response = await this.ollamaManager.generateAnalysis(request);
      return this.extractSentimentScore(response.content);

    } catch (error) {
      logger.error('❌ Llama sentiment analysis failed:', error);
      return 0; // Neutral fallback
    }
  }

  /**
   * Build sentiment prompt for Mistral 7B
   */
  private buildMistralSentimentPrompt(input: SentimentInput): string {
    return `
Analyze the sentiment of this ${input.source} content about cryptocurrency:

"${input.text}"

${input.symbol ? `This is specifically about ${input.symbol}.` : ''}

Provide:
1. Sentiment Score: A number from -100 (very negative) to 100 (very positive)
2. Key sentiment indicators you identified
3. Market impact assessment (bullish/bearish/neutral)

Be concise and focus on the financial/trading implications.
    `.trim();
  }

  /**
   * Build sentiment prompt for Llama 3.1 8B
   */
  private buildLlamaSentimentPrompt(input: SentimentInput): string {
    return `
Perform deep sentiment analysis on this ${input.source} content:

"${input.text}"

${input.symbol ? `Context: This relates to ${input.symbol} cryptocurrency.` : ''}
${input.metadata ? `Source metadata: ${JSON.stringify(input.metadata)}` : ''}

Provide comprehensive analysis including:
1. Sentiment Score (-100 to 100)
2. Emotional undertones (fear, greed, uncertainty, optimism)
3. Market psychology implications
4. Potential impact on trading behavior
5. Confidence in your assessment

Consider market context, timing, and source credibility in your analysis.
    `.trim();
  }

  /**
   * Extract sentiment score from AI response
   */
  private extractSentimentScore(response: string): number {
    // Look for explicit sentiment scores
    const scorePatterns = [
      /sentiment\s*score[:\s]+(-?\d+)/i,
      /score[:\s]+(-?\d+)/i,
      /(-?\d+)\/100/,
      /(-?\d+)\s*out\s*of\s*100/i
    ];

    for (const pattern of scorePatterns) {
      const match = response.match(pattern);
      if (match) {
        const score = parseInt(match[1]);
        if (score >= -100 && score <= 100) {
          return score;
        }
      }
    }

    // Fallback: analyze response content for sentiment keywords
    const lowerResponse = response.toLowerCase();
    let score = 0;

    // Positive indicators
    if (lowerResponse.includes('bullish') || lowerResponse.includes('positive')) score += 30;
    if (lowerResponse.includes('very positive') || lowerResponse.includes('extremely bullish')) score += 50;
    if (lowerResponse.includes('optimistic') || lowerResponse.includes('confident')) score += 20;

    // Negative indicators
    if (lowerResponse.includes('bearish') || lowerResponse.includes('negative')) score -= 30;
    if (lowerResponse.includes('very negative') || lowerResponse.includes('extremely bearish')) score -= 50;
    if (lowerResponse.includes('pessimistic') || lowerResponse.includes('worried')) score -= 20;

    return Math.max(-100, Math.min(100, score));
  }

  /**
   * Calculate weighted sentiment from all models
   */
  private calculateWeightedSentiment(
    traditional: number,
    mistral: number,
    llama: number
  ): number {
    return (
      traditional * this.modelWeights.traditional +
      mistral * this.modelWeights.mistral +
      llama * this.modelWeights.llama
    );
  }

  /**
   * Analyze emotions in text
   */
  private analyzeEmotions(text: string): SentimentResult['emotions'] {
    const lowerText = text.toLowerCase();
    const emotions = {
      fear: 0,
      greed: 0,
      uncertainty: 0,
      optimism: 0,
      panic: 0
    };

    // Count emotion keywords
    for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
      const count = keywords.reduce((acc, keyword) => {
        return acc + (lowerText.split(keyword).length - 1);
      }, 0);
      
      emotions[emotion as keyof typeof emotions] = Math.min(100, count * 25);
    }

    return emotions;
  }

  /**
   * Extract key phrases from text
   */
  private extractKeyPhrases(text: string): string[] {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const phrases: string[] = [];

    // Look for important crypto-related phrases
    const importantPatterns = [
      /bull\s+market/g,
      /bear\s+market/g,
      /price\s+action/g,
      /market\s+sentiment/g,
      /buying\s+pressure/g,
      /selling\s+pressure/g,
      /technical\s+analysis/g,
      /fundamental\s+analysis/g
    ];

    importantPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        phrases.push(...matches);
      }
    });

    // Add high-impact individual words
    const highImpactWords = tokens.filter(token => 
      ['bullish', 'bearish', 'pump', 'dump', 'moon', 'crash', 'surge', 'plummet'].includes(token)
    );

    phrases.push(...highImpactWords);

    return [...new Set(phrases)].slice(0, 10); // Remove duplicates and limit
  }

  /**
   * Determine market impact from sentiment and emotions
   */
  private determineMarketImpact(
    sentiment: number,
    emotions: SentimentResult['emotions']
  ): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    // Strong positive sentiment
    if (sentiment > 40 && emotions.optimism > emotions.fear) {
      return 'BULLISH';
    }
    
    // Strong negative sentiment
    if (sentiment < -40 && emotions.fear > emotions.optimism) {
      return 'BEARISH';
    }
    
    // High panic or fear regardless of sentiment
    if (emotions.panic > 60 || emotions.fear > 70) {
      return 'BEARISH';
    }
    
    // High greed
    if (emotions.greed > 60) {
      return 'BULLISH';
    }
    
    return 'NEUTRAL';
  }

  /**
   * Determine urgency level
   */
  private determineUrgency(
    input: SentimentInput,
    emotions: SentimentResult['emotions']
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    let urgencyScore = 0;

    // High emotions increase urgency
    if (emotions.panic > 70) urgencyScore += 40;
    if (emotions.fear > 60) urgencyScore += 30;
    if (emotions.greed > 70) urgencyScore += 25;

    // Source credibility affects urgency
    if (input.source === 'official' || input.source === 'analyst') urgencyScore += 20;
    if (input.metadata?.credibility && input.metadata.credibility > 0.8) urgencyScore += 15;

    // Recent content is more urgent
    const hoursOld = (Date.now() - input.timestamp.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 1) urgencyScore += 20;
    else if (hoursOld < 6) urgencyScore += 10;

    if (urgencyScore > 70) return 'CRITICAL';
    if (urgencyScore > 50) return 'HIGH';
    if (urgencyScore > 30) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate sentiment reasoning
   */
  private generateSentimentReasoning(
    traditional: number,
    mistral: number,
    llama: number,
    emotions: SentimentResult['emotions']
  ): string[] {
    const reasoning: string[] = [];

    // Model agreement analysis
    const scores = [traditional, mistral, llama];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const agreement = scores.every(score => Math.abs(score - avgScore) < 20);

    if (agreement) {
      reasoning.push(`High model agreement (avg: ${Math.round(avgScore)})`);
    } else {
      reasoning.push(`Mixed model signals - traditional: ${Math.round(traditional)}, AI models: ${Math.round((mistral + llama) / 2)}`);
    }

    // Emotion analysis
    const dominantEmotion = Object.entries(emotions).reduce((a, b) => emotions[a[0] as keyof typeof emotions] > emotions[b[0] as keyof typeof emotions] ? a : b);
    if (dominantEmotion[1] > 30) {
      reasoning.push(`Dominant emotion: ${dominantEmotion[0]} (${dominantEmotion[1]}%)`);
    }

    // Sentiment strength
    if (Math.abs(avgScore) > 60) {
      reasoning.push(`Strong sentiment signal (${Math.round(avgScore)})`);
    } else if (Math.abs(avgScore) < 20) {
      reasoning.push(`Weak sentiment signal - market indecision`);
    }

    return reasoning;
  }

  /**
   * Calculate sentiment confidence
   */
  private calculateSentimentConfidence(
    traditional: number,
    mistral: number,
    llama: number
  ): number {
    const scores = [traditional, mistral, llama];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    // Calculate variance (lower variance = higher confidence)
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - avgScore, 2), 0) / scores.length;
    
    // Convert variance to confidence (0-100)
    const confidence = Math.max(0, 100 - (variance / 10));
    
    // Boost confidence for extreme sentiments
    const extremityBonus = Math.abs(avgScore) / 5;
    
    return Math.min(100, confidence + extremityBonus);
  }

  /**
   * Aggregate sentiment from multiple inputs
   */
  public async aggregateSentiment(
    inputs: SentimentInput[],
    symbol: string,
    timeframe: string = '1h'
  ): Promise<AggregatedSentiment> {
    try {
      logger.info(`📊 Aggregating sentiment for ${symbol} (${inputs.length} inputs)...`);

      // Analyze all inputs
      const results = await Promise.all(
        inputs.map(input => this.analyzeSentiment(input))
      );

      // Group by source
      const sources = {
        news: results.filter((_, i) => inputs[i].source === 'news'),
        social: results.filter((_, i) => inputs[i].source === 'social'),
        analyst: results.filter((_, i) => inputs[i].source === 'analyst')
      };

      // Calculate weighted overall sentiment
      const weightedSentiment = this.calculateAggregatedSentiment(results, inputs);

      // Calculate confidence
      const confidence = this.calculateAggregatedConfidence(results);

      // Determine trend direction
      const trendDirection = this.determineTrendDirection(symbol, weightedSentiment);

      // Calculate sentiment volatility
      const volatility = this.calculateSentimentVolatility(results);

      // Calculate market signals
      const marketSignals = this.calculateMarketSignals(results);

      // Generate recommendations
      const recommendations = this.generateSentimentRecommendations(
        weightedSentiment,
        confidence,
        marketSignals
      );

      const aggregated: AggregatedSentiment = {
        symbol,
        timeframe,
        overallSentiment: Math.round(weightedSentiment),
        confidence: Math.round(confidence),
        trendDirection,
        volatility: Math.round(volatility),
        sources,
        marketSignals,
        recommendations,
        lastUpdated: new Date()
      };

      logger.info(`✅ Sentiment aggregated for ${symbol}: ${aggregated.overallSentiment} (${aggregated.confidence}% confidence)`);

      this.emit('sentimentAggregated', aggregated);

      return aggregated;

    } catch (error) {
      logger.error('❌ Error aggregating sentiment:', error);
      throw error;
    }
  }

  /**
   * Calculate aggregated sentiment with source weighting
   */
  private calculateAggregatedSentiment(results: SentimentResult[], inputs: SentimentInput[]): number {
    let totalWeight = 0;
    let weightedSum = 0;

    results.forEach((result, index) => {
      const input = inputs[index];
      
      // Base weight from input
      let weight = input.weight || 1;
      
      // Adjust weight based on source credibility
      switch (input.source) {
        case 'official':
          weight *= 2.0;
          break;
        case 'analyst':
          weight *= 1.5;
          break;
        case 'news':
          weight *= 1.2;
          break;
        case 'social':
          weight *= 0.8;
          break;
        case 'forum':
          weight *= 0.6;
          break;
      }
      
      // Adjust weight based on confidence
      weight *= (result.confidence / 100);
      
      // Adjust weight based on metadata
      if (input.metadata?.credibility) {
        weight *= input.metadata.credibility;
      }
      
      weightedSum += result.overallScore * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Calculate aggregated confidence
   */
  private calculateAggregatedConfidence(results: SentimentResult[]): number {
    if (results.length === 0) return 0;
    
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    
    // Boost confidence with more data points
    const dataBonus = Math.min(20, results.length * 2);
    
    return Math.min(100, avgConfidence + dataBonus);
  }

  /**
   * Determine sentiment trend direction
   */
  private determineTrendDirection(symbol: string, currentSentiment: number): 'IMPROVING' | 'DECLINING' | 'STABLE' {
    const history = this.sentimentHistory.get(symbol) || [];
    
    if (history.length < 3) return 'STABLE';
    
    const recentScores = history.slice(-3).map(h => h.overallScore);
    const trend = recentScores[2] - recentScores[0];
    
    if (trend > 10) return 'IMPROVING';
    if (trend < -10) return 'DECLINING';
    return 'STABLE';
  }

  /**
   * Calculate sentiment volatility
   */
  private calculateSentimentVolatility(results: SentimentResult[]): number {
    if (results.length < 2) return 0;
    
    const scores = results.map(r => r.overallScore);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - avg, 2), 0) / scores.length;
    
    return Math.min(100, Math.sqrt(variance));
  }

  /**
   * Calculate market signals from sentiment
   */
  private calculateMarketSignals(results: SentimentResult[]): AggregatedSentiment['marketSignals'] {
    const emotions = results.map(r => r.emotions);
    
    const avgFear = emotions.reduce((sum, e) => sum + e.fear, 0) / emotions.length;
    const avgGreed = emotions.reduce((sum, e) => sum + e.greed, 0) / emotions.length;
    
    const buyPressure = Math.max(0, results.reduce((sum, r) => sum + Math.max(0, r.overallScore), 0) / results.length);
    const sellPressure = Math.max(0, results.reduce((sum, r) => sum + Math.max(0, -r.overallScore), 0) / results.length);
    
    return {
      buyPressure: Math.round(buyPressure),
      sellPressure: Math.round(sellPressure),
      fearLevel: Math.round(avgFear),
      greedLevel: Math.round(avgGreed)
    };
  }

  /**
   * Generate sentiment-based recommendations
   */
  private generateSentimentRecommendations(
    sentiment: number,
    confidence: number,
    signals: AggregatedSentiment['marketSignals']
  ): string[] {
    const recommendations: string[] = [];
    
    if (sentiment > 60 && confidence > 70) {
      recommendations.push('Strong positive sentiment - consider increasing long positions');
    } else if (sentiment < -60 && confidence > 70) {
      recommendations.push('Strong negative sentiment - consider reducing exposure or shorting');
    }
    
    if (signals.fearLevel > 70) {
      recommendations.push('High fear detected - potential buying opportunity for contrarians');
    }
    
    if (signals.greedLevel > 70) {
      recommendations.push('High greed detected - consider taking profits or reducing positions');
    }
    
    if (confidence < 50) {
      recommendations.push('Low confidence in sentiment signals - wait for clearer market direction');
    }
    
    return recommendations;
  }

  /**
   * Update model performance metrics
   */
  private updateModelPerformance(processingTime: number): void {
    // Update traditional model
    const traditional = this.modelPerformance.get('traditional')!;
    traditional.totalAnalyses++;
    traditional.responseTime = (traditional.responseTime + 10) / 2; // Mock 10ms for traditional
    traditional.lastUsed = new Date();
    
    // Update AI models (would be updated by actual usage)
    ['mistral:7b', 'llama3.1:8b'].forEach(modelName => {
      const performance = this.modelPerformance.get(modelName)!;
      performance.totalAnalyses++;
      performance.responseTime = (performance.responseTime + processingTime / 2) / 2;
      performance.lastUsed = new Date();
    });
  }

  /**
   * Add sentiment result to history
   */
  private addToSentimentHistory(symbol: string, result: SentimentResult): void {
    if (!this.sentimentHistory.has(symbol)) {
      this.sentimentHistory.set(symbol, []);
    }
    
    const history = this.sentimentHistory.get(symbol)!;
    history.push(result);
    
    // Keep history within limits
    if (history.length > this.maxHistoryPerSymbol) {
      history.splice(0, history.length - this.maxHistoryPerSymbol);
    }
  }

  /**
   * Load sentiment history from storage
   */
  private async loadSentimentHistory(): Promise<void> {
    try {
      // In production, this would load from persistent storage
      logger.info('📊 Sentiment history loaded (placeholder)');
    } catch (error) {
      logger.warn('⚠️ Could not load sentiment history:', error);
    }
  }

  /**
   * Get sentiment history for a symbol
   */
  public getSentimentHistory(symbol: string, limit?: number): SentimentResult[] {
    const history = this.sentimentHistory.get(symbol) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get model performance metrics
   */
  public getModelPerformance(): SentimentModelPerformance[] {
    return Array.from(this.modelPerformance.values());
  }

  /**
   * Update model weights
   */
  public updateModelWeights(newWeights: Partial<typeof this.modelWeights>): void {
    this.modelWeights = { ...this.modelWeights, ...newWeights };
    logger.info('⚖️ Sentiment model weights updated:', this.modelWeights);
  }

  /**
   * Shutdown the sentiment analyzer
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('🛑 Shutting down Enhanced Sentiment Analyzer...');
      
      this.isInitialized = false;
      
      logger.info('✅ Enhanced Sentiment Analyzer shutdown completed');
      
    } catch (error) {
      logger.error('❌ Error during Sentiment Analyzer shutdown:', error);
      throw error;
    }
  }
}

// Export types
export type {
  SentimentInput,
  SentimentResult,
  AggregatedSentiment,
  SentimentModelPerformance
};