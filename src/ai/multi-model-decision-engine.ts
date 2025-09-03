/**
 * =============================================================================
 * MULTI-MODEL AI TRADING DECISION ENGINE
 * =============================================================================
 * 
 * This module implements a sophisticated AI trading decision engine that
 * combines outputs from multiple LLM models to make informed trading decisions.
 * 
 * Model Architecture:
 * - Llama 3.1 8B: Primary market data interpretation and trading analysis
 * - Mistral 7B: Rapid sentiment analysis and news processing
 * - CodeLlama 7B: Dynamic strategy optimization and code generation
 * 
 * Decision Fusion:
 * - Weighted confidence scoring based on model agreement
 * - Multi-model reasoning and explanation generation
 * - Adaptive model selection based on market conditions
 * - Fallback mechanisms for model disagreements
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { OllamaManager, AIAnalysisRequest, AIAnalysisResponse, ConfluenceScore } from './ollama-manager';
import { SystemMonitor } from '@/infrastructure/system-monitor';

/**
 * Interface for market data input
 */
interface MarketDataInput {
  symbol: string;
  price: number;
  volume: number;
  change24h: number;
  high24h: number;
  low24h: number;
  marketCap?: number;
  timestamp: Date;
  technicalIndicators?: {
    rsi?: number;
    macd?: number;
    sma20?: number;
    sma50?: number;
    bollinger?: {
      upper: number;
      middle: number;
      lower: number;
    };
  };
}

/**
 * Interface for news and sentiment data
 */
interface SentimentDataInput {
  symbol: string;
  news: Array<{
    title: string;
    content: string;
    source: string;
    timestamp: Date;
    sentiment?: number;
  }>;
  socialMedia?: Array<{
    platform: string;
    content: string;
    engagement: number;
    timestamp: Date;
  }>;
  marketSentiment?: {
    fearGreedIndex?: number;
    volatilityIndex?: number;
    trendStrength?: number;
  };
}

/**
 * Interface for trading decision
 */
interface TradingDecision {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  reasoning: {
    primary: string[];
    supporting: string[];
    risks: string[];
  };
  modelConsensus: {
    agreement: number; // 0-100
    tradingModelScore: number;
    sentimentModelScore: number;
    technicalScore: number;
  };
  recommendations: {
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    positionSize?: number;
    timeframe: string;
  };
  metadata: {
    modelsUsed: string[];
    processingTime: number;
    timestamp: Date;
    marketConditions: string;
  };
}

/**
 * Interface for model performance tracking
 */
interface ModelPerformanceTracker {
  modelName: string;
  accuracy: number;
  responseTime: number;
  reliability: number;
  lastUsed: Date;
  totalDecisions: number;
  successfulDecisions: number;
}

/**
 * Multi-Model AI Trading Decision Engine
 * Combines multiple LLM models for comprehensive trading analysis
 */
export class MultiModelDecisionEngine extends EventEmitter {
  private ollamaManager: OllamaManager;
  private systemMonitor: SystemMonitor;
  private isInitialized: boolean = false;
  private modelPerformance: Map<string, ModelPerformanceTracker> = new Map();
  private decisionHistory: TradingDecision[] = [];
  private maxHistorySize: number = 1000;

  // Model weights for decision fusion (can be adjusted based on performance)
  private modelWeights = {
    trading: 0.4,    // Llama 3.1 8B - Primary trading analysis
    sentiment: 0.3,  // Mistral 7B - Sentiment and news analysis
    technical: 0.3   // CodeLlama 7B - Technical analysis and strategy
  };

  // Confidence thresholds for decision making
  private confidenceThresholds = {
    strong: 80,
    moderate: 60,
    weak: 40
  };

  constructor(ollamaManager: OllamaManager, systemMonitor: SystemMonitor) {
    super();
    this.ollamaManager = ollamaManager;
    this.systemMonitor = systemMonitor;

    // Initialize model performance tracking
    this.initializeModelPerformance();

    logger.info('🧠 Multi-Model Decision Engine initialized');
  }

  /**
   * Initialize the decision engine
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing Multi-Model Decision Engine...');

      // Ensure Ollama manager is initialized
      if (!this.ollamaManager) {
        throw new Error('Ollama Manager is required');
      }

      // Test all models
      await this.testModelAvailability();

      // Load decision history if available
      await this.loadDecisionHistory();

      this.isInitialized = true;
      logger.info('✅ Multi-Model Decision Engine initialized successfully');

      this.emit('initialized');

    } catch (error) {
      logger.error('❌ Failed to initialize Multi-Model Decision Engine:', error);
      throw new Error(`Decision Engine initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize model performance tracking
   */
  private initializeModelPerformance(): void {
    const models = ['llama3.1:8b', 'mistral:7b', 'codellama:7b'];
    
    models.forEach(modelName => {
      this.modelPerformance.set(modelName, {
        modelName,
        accuracy: 75, // Start with baseline accuracy
        responseTime: 0,
        reliability: 100,
        lastUsed: new Date(),
        totalDecisions: 0,
        successfulDecisions: 0
      });
    });
  }

  /**
   * Test availability of all required models
   */
  private async testModelAvailability(): Promise<void> {
    logger.info('🧪 Testing model availability...');

    const testResults = await this.ollamaManager.testAllModels();
    
    for (const [modelName, isAvailable] of Object.entries(testResults)) {
      if (isAvailable) {
        logger.info(`✅ Model available: ${modelName}`);
      } else {
        logger.warn(`⚠️ Model not available: ${modelName}`);
      }
    }

    // Check if at least one model is available
    const availableModels = Object.values(testResults).filter(Boolean).length;
    if (availableModels === 0) {
      throw new Error('No models are available for decision making');
    }

    logger.info(`✅ ${availableModels} models available for decision making`);
  }

  /**
   * Generate comprehensive trading decision using multiple models
   */
  public async generateTradingDecision(
    marketData: MarketDataInput,
    sentimentData?: SentimentDataInput,
    additionalContext?: Record<string, any>
  ): Promise<TradingDecision> {
    try {
      logger.info(`🧠 Generating trading decision for ${marketData.symbol}...`);

      const startTime = Date.now();

      // Prepare analysis requests for different models
      const analysisRequests = await this.prepareAnalysisRequests(
        marketData,
        sentimentData,
        additionalContext
      );

      // Execute analyses in parallel
      const analyses = await this.executeParallelAnalyses(analysisRequests);

      // Generate confluence score
      const confluenceScore = await this.ollamaManager.generateConfluenceScore(
        marketData,
        { sentimentData, additionalContext }
      );

      // Fuse decisions from all models
      const fusedDecision = await this.fuseModelDecisions(
        analyses,
        confluenceScore,
        marketData
      );

      // Calculate processing time
      const processingTime = Date.now() - startTime;
      fusedDecision.metadata.processingTime = processingTime;

      // Update model performance
      this.updateModelPerformance(analyses);

      // Store decision in history
      this.addToDecisionHistory(fusedDecision);

      logger.info(`✅ Trading decision generated: ${fusedDecision.action} (${fusedDecision.confidence}% confidence)`);

      this.emit('decisionGenerated', fusedDecision);

      return fusedDecision;

    } catch (error) {
      logger.error('❌ Error generating trading decision:', error);
      throw error;
    }
  }

  /**
   * Prepare analysis requests for different models
   */
  private async prepareAnalysisRequests(
    marketData: MarketDataInput,
    sentimentData?: SentimentDataInput,
    additionalContext?: Record<string, any>
  ): Promise<AIAnalysisRequest[]> {
    const requests: AIAnalysisRequest[] = [];

    // Trading analysis request (Llama 3.1 8B)
    requests.push({
      prompt: this.buildTradingAnalysisPrompt(marketData, additionalContext),
      modelType: 'trading',
      priority: 'high',
      maxTokens: 2048,
      temperature: 0.7,
      context: { marketData, additionalContext }
    });

    // Sentiment analysis request (Mistral 7B)
    if (sentimentData) {
      requests.push({
        prompt: this.buildSentimentAnalysisPrompt(marketData, sentimentData),
        modelType: 'sentiment',
        priority: 'high',
        maxTokens: 1024,
        temperature: 0.8,
        context: { marketData, sentimentData }
      });
    }

    // Technical analysis request (CodeLlama 7B)
    requests.push({
      prompt: this.buildTechnicalAnalysisPrompt(marketData),
      modelType: 'code',
      priority: 'medium',
      maxTokens: 1024,
      temperature: 0.3,
      context: { marketData }
    });

    return requests;
  }

  /**
   * Build trading analysis prompt for Llama 3.1 8B
   */
  private buildTradingAnalysisPrompt(
    marketData: MarketDataInput,
    additionalContext?: Record<string, any>
  ): string {
    return `
Analyze the trading opportunity for ${marketData.symbol} with the following data:

Current Price: $${marketData.price}
24h Change: ${marketData.change24h}%
24h High: $${marketData.high24h}
24h Low: $${marketData.low24h}
Volume: ${marketData.volume}
${marketData.technicalIndicators ? `
Technical Indicators:
- RSI: ${marketData.technicalIndicators.rsi || 'N/A'}
- MACD: ${marketData.technicalIndicators.macd || 'N/A'}
- SMA20: $${marketData.technicalIndicators.sma20 || 'N/A'}
- SMA50: $${marketData.technicalIndicators.sma50 || 'N/A'}
` : ''}

${additionalContext ? `Additional Context: ${JSON.stringify(additionalContext, null, 2)}` : ''}

Provide a comprehensive trading analysis including:
1. Market Assessment (BULLISH/BEARISH/NEUTRAL)
2. Key factors supporting your assessment
3. Risk factors to consider
4. Trading recommendation (BUY/SELL/HOLD)
5. Confidence score (0-100)
6. Suggested entry price, stop loss, and take profit levels
7. Recommended position size as percentage of portfolio

Format your response clearly with each section labeled.
    `.trim();
  }

  /**
   * Build sentiment analysis prompt for Mistral 7B
   */
  private buildSentimentAnalysisPrompt(
    marketData: MarketDataInput,
    sentimentData: SentimentDataInput
  ): string {
    const newsText = sentimentData.news.map(n => `${n.title}: ${n.content.substring(0, 200)}...`).join('\n');
    const socialText = sentimentData.socialMedia?.map(s => s.content.substring(0, 100)).join('\n') || '';

    return `
Analyze market sentiment for ${marketData.symbol} based on the following information:

Recent News:
${newsText}

${socialText ? `Social Media Sentiment:\n${socialText}` : ''}

${sentimentData.marketSentiment ? `
Market Indicators:
- Fear & Greed Index: ${sentimentData.marketSentiment.fearGreedIndex || 'N/A'}
- Volatility Index: ${sentimentData.marketSentiment.volatilityIndex || 'N/A'}
- Trend Strength: ${sentimentData.marketSentiment.trendStrength || 'N/A'}
` : ''}

Provide sentiment analysis including:
1. Overall sentiment score (0-100, where 0=very bearish, 50=neutral, 100=very bullish)
2. Key sentiment drivers (positive and negative)
3. Market mood assessment
4. Sentiment trend (improving/declining/stable)
5. Confidence in sentiment analysis (0-100)
6. Impact on trading decision

Be concise and focus on actionable sentiment insights.
    `.trim();
  }

  /**
   * Build technical analysis prompt for CodeLlama 7B
   */
  private buildTechnicalAnalysisPrompt(marketData: MarketDataInput): string {
    return `
Perform technical analysis for ${marketData.symbol} with the following data:

Price: $${marketData.price}
24h Change: ${marketData.change24h}%
High: $${marketData.high24h}
Low: $${marketData.low24h}
Volume: ${marketData.volume}

${marketData.technicalIndicators ? `
Technical Indicators:
${JSON.stringify(marketData.technicalIndicators, null, 2)}
` : ''}

Provide technical analysis including:
1. Technical score (0-100)
2. Key technical patterns identified
3. Support and resistance levels
4. Volume analysis
5. Momentum indicators assessment
6. Technical recommendation (BUY/SELL/HOLD)
7. Risk/reward ratio

Focus on quantitative technical analysis and specific price levels.
    `.trim();
  }

  /**
   * Execute analyses in parallel
   */
  private async executeParallelAnalyses(requests: AIAnalysisRequest[]): Promise<AIAnalysisResponse[]> {
    try {
      logger.info(`🔄 Executing ${requests.length} parallel analyses...`);

      const analyses = await Promise.all(
        requests.map(request => this.ollamaManager.generateAnalysis(request))
      );

      logger.info(`✅ Completed ${analyses.length} analyses`);
      return analyses;

    } catch (error) {
      logger.error('❌ Error executing parallel analyses:', error);
      throw error;
    }
  }

  /**
   * Fuse decisions from multiple models
   */
  private async fuseModelDecisions(
    analyses: AIAnalysisResponse[],
    confluenceScore: ConfluenceScore,
    marketData: MarketDataInput
  ): Promise<TradingDecision> {
    // Extract decisions from each analysis
    const decisions = analyses.map(analysis => this.extractDecisionFromAnalysis(analysis));

    // Calculate weighted scores
    const weightedScores = this.calculateWeightedScores(decisions, analyses);

    // Determine final action based on weighted scores and confluence
    const finalAction = this.determineFinalAction(weightedScores, confluenceScore);

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(
      weightedScores,
      confluenceScore,
      analyses
    );

    // Determine strength
    const strength = this.determineDecisionStrength(overallConfidence, confluenceScore.modelAgreement);

    // Generate comprehensive reasoning
    const reasoning = this.generateComprehensiveReasoning(analyses, confluenceScore);

    // Generate recommendations
    const recommendations = this.generateTradingRecommendations(
      finalAction,
      analyses,
      marketData,
      overallConfidence
    );

    const tradingDecision: TradingDecision = {
      symbol: marketData.symbol,
      action: finalAction,
      confidence: Math.round(overallConfidence),
      strength,
      reasoning,
      modelConsensus: {
        agreement: confluenceScore.modelAgreement,
        tradingModelScore: confluenceScore.individualScores.trading,
        sentimentModelScore: confluenceScore.individualScores.sentiment,
        technicalScore: confluenceScore.individualScores.technical
      },
      recommendations,
      metadata: {
        modelsUsed: analyses.map(a => a.modelUsed),
        processingTime: 0, // Will be set by caller
        timestamp: new Date(),
        marketConditions: this.assessMarketConditions(marketData)
      }
    };

    return tradingDecision;
  }

  /**
   * Extract decision from analysis response
   */
  private extractDecisionFromAnalysis(analysis: AIAnalysisResponse): {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    score: number;
  } {
    const content = analysis.content.toLowerCase();
    
    // Extract action
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (content.includes('buy') && !content.includes('don\'t buy')) {
      action = 'BUY';
    } else if (content.includes('sell') && !content.includes('don\'t sell')) {
      action = 'SELL';
    }

    // Extract confidence score
    const confidenceMatch = content.match(/confidence[:\s]+(\d+)/i);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : analysis.confidence;

    // Extract or calculate score
    const scoreMatch = content.match(/score[:\s]+(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : this.calculateScoreFromAction(action, confidence);

    return { action, confidence, score };
  }

  /**
   * Calculate score from action and confidence
   */
  private calculateScoreFromAction(action: 'BUY' | 'SELL' | 'HOLD', confidence: number): number {
    switch (action) {
      case 'BUY':
        return 50 + (confidence / 2); // 50-100 range
      case 'SELL':
        return 50 - (confidence / 2); // 0-50 range
      case 'HOLD':
      default:
        return 50; // Neutral
    }
  }

  /**
   * Calculate weighted scores from all models
   */
  private calculateWeightedScores(
    decisions: Array<{ action: string; confidence: number; score: number }>,
    analyses: AIAnalysisResponse[]
  ): { trading: number; sentiment: number; technical: number } {
    const scores = { trading: 50, sentiment: 50, technical: 50 };

    analyses.forEach((analysis, index) => {
      const decision = decisions[index];
      const modelType = analysis.modelUsed.includes('llama') ? 'trading' :
                       analysis.modelUsed.includes('mistral') ? 'sentiment' : 'technical';
      
      scores[modelType] = decision.score;
    });

    return scores;
  }

  /**
   * Determine final action based on weighted scores
   */
  private determineFinalAction(
    scores: { trading: number; sentiment: number; technical: number },
    confluenceScore: ConfluenceScore
  ): 'BUY' | 'SELL' | 'HOLD' {
    // Calculate weighted average
    const weightedAverage = 
      (scores.trading * this.modelWeights.trading) +
      (scores.sentiment * this.modelWeights.sentiment) +
      (scores.technical * this.modelWeights.technical);

    // Use confluence score as additional factor
    const finalScore = (weightedAverage + confluenceScore.overallScore) / 2;

    // Determine action based on final score
    if (finalScore > 65) {
      return 'BUY';
    } else if (finalScore < 35) {
      return 'SELL';
    } else {
      return 'HOLD';
    }
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(
    scores: { trading: number; sentiment: number; technical: number },
    confluenceScore: ConfluenceScore,
    analyses: AIAnalysisResponse[]
  ): number {
    // Base confidence from model agreement
    let confidence = confluenceScore.modelAgreement;

    // Adjust based on individual model confidences
    const avgModelConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;
    confidence = (confidence + avgModelConfidence) / 2;

    // Adjust based on score extremity (more extreme scores = higher confidence)
    const scoreVariance = Math.abs(scores.trading - 50) + Math.abs(scores.sentiment - 50) + Math.abs(scores.technical - 50);
    const extremityBonus = Math.min(20, scoreVariance / 3);
    confidence += extremityBonus;

    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Determine decision strength
   */
  private determineDecisionStrength(confidence: number, modelAgreement: number): 'WEAK' | 'MODERATE' | 'STRONG' {
    const combinedScore = (confidence + modelAgreement) / 2;

    if (combinedScore >= this.confidenceThresholds.strong) {
      return 'STRONG';
    } else if (combinedScore >= this.confidenceThresholds.moderate) {
      return 'MODERATE';
    } else {
      return 'WEAK';
    }
  }

  /**
   * Generate comprehensive reasoning
   */
  private generateComprehensiveReasoning(
    analyses: AIAnalysisResponse[],
    confluenceScore: ConfluenceScore
  ): { primary: string[]; supporting: string[]; risks: string[] } {
    const primary: string[] = [];
    const supporting: string[] = [];
    const risks: string[] = [];

    // Extract key points from each analysis
    analyses.forEach(analysis => {
      const content = analysis.content;
      
      // Extract primary reasoning (look for key phrases)
      if (content.includes('bullish') || content.includes('positive')) {
        primary.push(`${analysis.modelUsed}: Bullish sentiment detected`);
      } else if (content.includes('bearish') || content.includes('negative')) {
        primary.push(`${analysis.modelUsed}: Bearish sentiment detected`);
      }

      // Extract supporting points
      const supportingMatch = content.match(/support[ing]*[:\s]+([^.]+)/i);
      if (supportingMatch) {
        supporting.push(`${analysis.modelUsed}: ${supportingMatch[1].trim()}`);
      }

      // Extract risks
      const riskMatch = content.match(/risk[s]*[:\s]+([^.]+)/i);
      if (riskMatch) {
        risks.push(`${analysis.modelUsed}: ${riskMatch[1].trim()}`);
      }
    });

    // Add confluence reasoning
    primary.push(...confluenceScore.reasoning);
    supporting.push(`Model agreement: ${confluenceScore.modelAgreement}%`);

    return { primary, supporting, risks };
  }

  /**
   * Generate trading recommendations
   */
  private generateTradingRecommendations(
    action: 'BUY' | 'SELL' | 'HOLD',
    analyses: AIAnalysisResponse[],
    marketData: MarketDataInput,
    confidence: number
  ): TradingDecision['recommendations'] {
    const currentPrice = marketData.price;
    
    let entryPrice: number | undefined;
    let stopLoss: number | undefined;
    let takeProfit: number | undefined;
    let positionSize: number | undefined;

    if (action === 'BUY') {
      entryPrice = currentPrice * 0.998; // Slightly below current price
      stopLoss = currentPrice * 0.98; // 2% stop loss
      takeProfit = currentPrice * 1.06; // 6% take profit
      positionSize = Math.min(5, confidence / 20); // Max 5% position, scaled by confidence
    } else if (action === 'SELL') {
      entryPrice = currentPrice * 1.002; // Slightly above current price
      stopLoss = currentPrice * 1.02; // 2% stop loss
      takeProfit = currentPrice * 0.94; // 6% take profit
      positionSize = Math.min(5, confidence / 20); // Max 5% position, scaled by confidence
    }

    return {
      entryPrice,
      stopLoss,
      takeProfit,
      positionSize,
      timeframe: this.determineTimeframe(confidence, action)
    };
  }

  /**
   * Determine appropriate timeframe based on confidence and action
   */
  private determineTimeframe(confidence: number, action: 'BUY' | 'SELL' | 'HOLD'): string {
    if (action === 'HOLD') return '1d';
    
    if (confidence > 80) {
      return '4h'; // High confidence = shorter timeframe
    } else if (confidence > 60) {
      return '1d'; // Medium confidence = daily timeframe
    } else {
      return '3d'; // Low confidence = longer timeframe
    }
  }

  /**
   * Assess current market conditions
   */
  private assessMarketConditions(marketData: MarketDataInput): string {
    const change = marketData.change24h;
    const volume = marketData.volume;
    
    if (Math.abs(change) > 10) {
      return 'HIGH_VOLATILITY';
    } else if (Math.abs(change) > 5) {
      return 'MODERATE_VOLATILITY';
    } else if (Math.abs(change) < 1) {
      return 'LOW_VOLATILITY';
    } else {
      return 'NORMAL';
    }
  }

  /**
   * Update model performance metrics
   */
  private updateModelPerformance(analyses: AIAnalysisResponse[]): void {
    analyses.forEach(analysis => {
      const performance = this.modelPerformance.get(analysis.modelUsed);
      if (performance) {
        performance.totalDecisions++;
        performance.responseTime = (performance.responseTime + analysis.responseTime) / 2;
        performance.lastUsed = new Date();
      }
    });
  }

  /**
   * Add decision to history
   */
  private addToDecisionHistory(decision: TradingDecision): void {
    this.decisionHistory.push(decision);
    
    // Keep history within limits
    if (this.decisionHistory.length > this.maxHistorySize) {
      this.decisionHistory = this.decisionHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Load decision history from storage
   */
  private async loadDecisionHistory(): Promise<void> {
    try {
      // In production, this would load from persistent storage
      logger.info('📊 Decision history loaded (placeholder)');
    } catch (error) {
      logger.warn('⚠️ Could not load decision history:', error);
    }
  }

  /**
   * Get decision history
   */
  public getDecisionHistory(symbol?: string, limit?: number): TradingDecision[] {
    let history = this.decisionHistory;
    
    if (symbol) {
      history = history.filter(d => d.symbol === symbol);
    }
    
    if (limit) {
      history = history.slice(-limit);
    }
    
    return history;
  }

  /**
   * Get model performance metrics
   */
  public getModelPerformance(): ModelPerformanceTracker[] {
    return Array.from(this.modelPerformance.values());
  }

  /**
   * Update model weights based on performance
   */
  public updateModelWeights(newWeights: Partial<typeof this.modelWeights>): void {
    this.modelWeights = { ...this.modelWeights, ...newWeights };
    logger.info('⚖️ Model weights updated:', this.modelWeights);
  }

  /**
   * Shutdown the decision engine
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('🛑 Shutting down Multi-Model Decision Engine...');
      
      // Save decision history if needed
      // await this.saveDecisionHistory();
      
      this.isInitialized = false;
      
      logger.info('✅ Multi-Model Decision Engine shutdown completed');
      
    } catch (error) {
      logger.error('❌ Error during Decision Engine shutdown:', error);
      throw error;
    }
  }
}

// Export types
export type {
  MarketDataInput,
  SentimentDataInput,
  TradingDecision,
  ModelPerformanceTracker
};