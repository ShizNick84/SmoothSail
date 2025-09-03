/**
 * =============================================================================
 * AI MODEL CONFLUENCE AND DECISION FUSION ENGINE
 * =============================================================================
 * 
 * This module implements a sophisticated decision fusion system that combines
 * outputs from all three AI models (Llama 3.1 8B, Mistral 7B, CodeLlama 7B)
 * with weighted voting mechanisms, performance tracking, and fallback systems.
 * 
 * Features:
 * - Decision fusion system combining all three AI models
 * - Weighted voting mechanism based on model confidence scores
 * - Model performance tracking and dynamic weight adjustment
 * - Fallback mechanisms when models disagree
 * - AI decision explanation system showing reasoning from each model
 * - OpenAI API integration as backup for complex analysis scenarios
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { OllamaManager, AIAnalysisRequest, AIAnalysisResponse, ConfluenceScore } from './ollama-manager';
import { MultiModelDecisionEngine, TradingDecision, MarketDataInput } from './multi-model-decision-engine';
import { EnhancedSentimentAnalyzer, SentimentResult } from './enhanced-sentiment-analyzer';
import { AIStrategyOptimizer, GeneratedStrategy } from './ai-strategy-optimizer';
import { SystemMonitor } from '@/infrastructure/system-monitor';
import axios from 'axios';

/**
 * Interface for model voting result
 */
interface ModelVotingResult {
  modelName: string;
  vote: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  weight: number;
  reasoning: string[];
  responseTime: number;
  timestamp: Date;
}

/**
 * Interface for confluence decision
 */
interface ConfluenceDecision {
  finalDecision: 'BUY' | 'SELL' | 'HOLD';
  overallConfidence: number;
  consensusLevel: number; // 0-100 (how much models agree)
  modelVotes: ModelVotingResult[];
  fusionMethod: 'UNANIMOUS' | 'MAJORITY' | 'WEIGHTED' | 'FALLBACK';
  explanation: {
    summary: string;
    modelReasonings: Record<string, string[]>;
    conflictResolution?: string;
    fallbackReason?: string;
  };
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    factors: string[];
    mitigations: string[];
  };
  metadata: {
    processingTime: number;
    modelsUsed: string[];
    fallbackUsed: boolean;
    timestamp: Date;
  };
}

/**
 * Interface for model performance tracking
 */
interface ModelPerformanceMetrics {
  modelName: string;
  accuracy: number;
  reliability: number;
  averageConfidence: number;
  responseTime: number;
  agreementRate: number;
  totalDecisions: number;
  successfulDecisions: number;
  lastUpdated: Date;
  performanceTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

/**
 * Interface for fallback configuration
 */
interface FallbackConfig {
  enableOpenAI: boolean;
  openAIApiKey?: string;
  openAIModel: string;
  fallbackThreshold: number; // Confidence threshold below which to use fallback
  maxRetries: number;
  timeoutMs: number;
}

/**
 * AI Confluence Engine for Decision Fusion
 */
export class AIConfluenceEngine extends EventEmitter {
  private ollamaManager: OllamaManager;
  private decisionEngine: MultiModelDecisionEngine;
  private sentimentAnalyzer: EnhancedSentimentAnalyzer;
  private strategyOptimizer: AIStrategyOptimizer;
  private systemMonitor: SystemMonitor;
  private isInitialized: boolean = false;

  // Model performance tracking
  private modelPerformance: Map<string, ModelPerformanceMetrics> = new Map();
  
  // Dynamic model weights (adjusted based on performance)
  private modelWeights = {
    'llama3.1:8b': 0.4,    // Primary trading analysis
    'mistral:7b': 0.35,    // Sentiment and news analysis
    'codellama:7b': 0.25   // Technical and strategy analysis
  };

  // Decision history for learning
  private decisionHistory: ConfluenceDecision[] = [];
  private maxHistorySize: number = 1000;

  // Fallback configuration
  private fallbackConfig: FallbackConfig = {
    enableOpenAI: false,
    openAIModel: 'gpt-4',
    fallbackThreshold: 60,
    maxRetries: 3,
    timeoutMs: 30000
  };

  // Consensus thresholds
  private consensusThresholds = {
    unanimous: 95,    // All models strongly agree
    majority: 70,     // Clear majority agreement
    weighted: 50,     // Weighted decision acceptable
    fallback: 30      // Use fallback if below this
  };

  constructor(
    ollamaManager: OllamaManager,
    decisionEngine: MultiModelDecisionEngine,
    sentimentAnalyzer: EnhancedSentimentAnalyzer,
    strategyOptimizer: AIStrategyOptimizer,
    systemMonitor: SystemMonitor,
    fallbackConfig?: Partial<FallbackConfig>
  ) {
    super();
    this.ollamaManager = ollamaManager;
    this.decisionEngine = decisionEngine;
    this.sentimentAnalyzer = sentimentAnalyzer;
    this.strategyOptimizer = strategyOptimizer;
    this.systemMonitor = systemMonitor;

    if (fallbackConfig) {
      this.fallbackConfig = { ...this.fallbackConfig, ...fallbackConfig };
    }

    // Initialize model performance tracking
    this.initializeModelPerformance();

    logger.info('🧠 AI Confluence Engine initialized');
  }

  /**
   * Initialize the confluence engine
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing AI Confluence Engine...');

      // Ensure all components are initialized
      if (!this.ollamaManager || !this.decisionEngine) {
        throw new Error('Required AI components are not available');
      }

      // Test model availability and performance
      await this.testModelAvailability();

      // Load historical performance data
      await this.loadPerformanceHistory();

      // Test fallback system if enabled
      if (this.fallbackConfig.enableOpenAI) {
        await this.testFallbackSystem();
      }

      this.isInitialized = true;
      logger.info('✅ AI Confluence Engine initialized successfully');

      this.emit('initialized');

    } catch (error) {
      logger.error('❌ Failed to initialize AI Confluence Engine:', error);
      throw new Error(`Confluence Engine initialization failed: ${error.message}`);
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
        accuracy: 75,
        reliability: 90,
        averageConfidence: 70,
        responseTime: 2000,
        agreementRate: 80,
        totalDecisions: 0,
        successfulDecisions: 0,
        lastUpdated: new Date(),
        performanceTrend: 'STABLE'
      });
    });
  }

  /**
   * Test model availability and basic functionality
   */
  private async testModelAvailability(): Promise<void> {
    logger.info('🧪 Testing AI model availability...');

    try {
      const testResults = await this.ollamaManager.testAllModels();
      
      let availableModels = 0;
      for (const [modelName, isAvailable] of Object.entries(testResults)) {
        if (isAvailable) {
          availableModels++;
          logger.info(`✅ Model available: ${modelName}`);
        } else {
          logger.warn(`⚠️ Model not available: ${modelName}`);
          // Reduce weight for unavailable models
          if (this.modelWeights[modelName as keyof typeof this.modelWeights]) {
            this.modelWeights[modelName as keyof typeof this.modelWeights] *= 0.1;
          }
        }
      }

      if (availableModels === 0) {
        throw new Error('No AI models are available for confluence analysis');
      }

      // Normalize weights after adjusting for unavailable models
      this.normalizeModelWeights();

      logger.info(`✅ ${availableModels} models available for confluence analysis`);

    } catch (error) {
      logger.error('❌ Model availability test failed:', error);
      throw error;
    }
  }

  /**
   * Test fallback system (OpenAI API)
   */
  private async testFallbackSystem(): Promise<void> {
    if (!this.fallbackConfig.enableOpenAI || !this.fallbackConfig.openAIApiKey) {
      logger.info('📡 OpenAI fallback not configured, skipping test');
      return;
    }

    try {
      logger.info('🧪 Testing OpenAI fallback system...');

      const testResponse = await this.queryOpenAI(
        'Test message: Respond with "OK" if you are working correctly.',
        { maxTokens: 10, temperature: 0 }
      );

      if (testResponse.toLowerCase().includes('ok')) {
        logger.info('✅ OpenAI fallback system is working');
      } else {
        logger.warn('⚠️ OpenAI fallback test inconclusive');
      }

    } catch (error) {
      logger.error('❌ OpenAI fallback test failed:', error);
      this.fallbackConfig.enableOpenAI = false;
    }
  }

  /**
   * Generate confluence decision by combining all AI models
   */
  public async generateConfluenceDecision(
    marketData: MarketDataInput,
    additionalContext?: Record<string, any>
  ): Promise<ConfluenceDecision> {
    try {
      logger.info(`🧠 Generating confluence decision for ${marketData.symbol}...`);

      const startTime = Date.now();

      // Collect votes from all available models
      const modelVotes = await this.collectModelVotes(marketData, additionalContext);

      // Calculate consensus level
      const consensusLevel = this.calculateConsensusLevel(modelVotes);

      // Determine fusion method based on consensus
      const fusionMethod = this.determineFusionMethod(consensusLevel);

      // Generate final decision based on fusion method
      const finalDecision = await this.fuseDecisions(modelVotes, fusionMethod, marketData);

      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(modelVotes, consensusLevel);

      // Generate comprehensive explanation
      const explanation = this.generateDecisionExplanation(modelVotes, fusionMethod, finalDecision);

      // Assess risk
      const riskAssessment = this.assessDecisionRisk(modelVotes, finalDecision, consensusLevel);

      // Check if fallback is needed
      let fallbackUsed = false;
      if (overallConfidence < this.fallbackConfig.fallbackThreshold && this.fallbackConfig.enableOpenAI) {
        const fallbackResult = await this.useFallbackAnalysis(marketData, modelVotes);
        if (fallbackResult) {
          fallbackUsed = true;
          explanation.fallbackReason = 'Low confidence triggered OpenAI fallback analysis';
        }
      }

      const confluenceDecision: ConfluenceDecision = {
        finalDecision: finalDecision.decision,
        overallConfidence: Math.round(overallConfidence),
        consensusLevel: Math.round(consensusLevel),
        modelVotes,
        fusionMethod,
        explanation,
        riskAssessment,
        metadata: {
          processingTime: Date.now() - startTime,
          modelsUsed: modelVotes.map(v => v.modelName),
          fallbackUsed,
          timestamp: new Date()
        }
      };

      // Update model performance
      this.updateModelPerformance(modelVotes);

      // Store in decision history
      this.addToDecisionHistory(confluenceDecision);

      // Adjust model weights based on performance
      this.adjustModelWeights();

      logger.info(`✅ Confluence decision: ${confluenceDecision.finalDecision} (${confluenceDecision.overallConfidence}% confidence, ${confluenceDecision.consensusLevel}% consensus)`);

      this.emit('confluenceDecisionGenerated', confluenceDecision);

      return confluenceDecision;

    } catch (error) {
      logger.error('❌ Error generating confluence decision:', error);
      throw error;
    }
  }

  /**
   * Collect votes from all available AI models
   */
  private async collectModelVotes(
    marketData: MarketDataInput,
    additionalContext?: Record<string, any>
  ): Promise<ModelVotingResult[]> {
    const votes: ModelVotingResult[] = [];

    try {
      // Prepare analysis requests for each model
      const requests = [
        {
          modelName: 'llama3.1:8b',
          prompt: this.buildTradingAnalysisPrompt(marketData, additionalContext),
          modelType: 'trading' as const,
          weight: this.modelWeights['llama3.1:8b']
        },
        {
          modelName: 'mistral:7b',
          prompt: this.buildSentimentAnalysisPrompt(marketData),
          modelType: 'sentiment' as const,
          weight: this.modelWeights['mistral:7b']
        },
        {
          modelName: 'codellama:7b',
          prompt: this.buildTechnicalAnalysisPrompt(marketData),
          modelType: 'code' as const,
          weight: this.modelWeights['codellama:7b']
        }
      ];

      // Execute requests in parallel with timeout
      const responses = await Promise.allSettled(
        requests.map(async (req) => {
          const startTime = Date.now();
          
          const analysisRequest: AIAnalysisRequest = {
            prompt: req.prompt,
            modelType: req.modelType,
            priority: 'high',
            maxTokens: 1024,
            temperature: 0.7
          };

          const response = await this.ollamaManager.generateAnalysis(analysisRequest);
          const responseTime = Date.now() - startTime;

          return {
            ...req,
            response,
            responseTime
          };
        })
      );

      // Process responses and extract votes
      responses.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { modelName, weight, response, responseTime } = result.value;
          
          const vote = this.extractVoteFromResponse(response);
          
          votes.push({
            modelName,
            vote: vote.decision,
            confidence: vote.confidence,
            weight,
            reasoning: vote.reasoning,
            responseTime,
            timestamp: new Date()
          });
        } else {
          logger.warn(`⚠️ Model ${requests[index].modelName} failed to respond:`, result.reason);
        }
      });

      return votes;

    } catch (error) {
      logger.error('❌ Error collecting model votes:', error);
      return votes; // Return partial results
    }
  }

  /**
   * Extract vote from AI model response
   */
  private extractVoteFromResponse(response: AIAnalysisResponse): {
    decision: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string[];
  } {
    const content = response.content.toLowerCase();
    
    // Extract decision
    let decision: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (content.includes('buy') && !content.includes('don\'t buy')) {
      decision = 'BUY';
    } else if (content.includes('sell') && !content.includes('don\'t sell')) {
      decision = 'SELL';
    }

    // Extract confidence
    const confidenceMatch = content.match(/confidence[:\s]+(\d+)/i);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : response.confidence;

    // Extract reasoning (split by sentences)
    const reasoning = response.content
      .split(/[.!?]+/)
      .filter(sentence => sentence.trim().length > 10)
      .slice(0, 3)
      .map(sentence => sentence.trim());

    return { decision, confidence, reasoning };
  }

  /**
   * Calculate consensus level among models
   */
  private calculateConsensusLevel(votes: ModelVotingResult[]): number {
    if (votes.length === 0) return 0;

    // Count votes for each decision
    const voteCounts = { BUY: 0, SELL: 0, HOLD: 0 };
    let totalWeight = 0;

    votes.forEach(vote => {
      voteCounts[vote.vote] += vote.weight;
      totalWeight += vote.weight;
    });

    // Calculate the percentage of the winning decision
    const maxVotes = Math.max(...Object.values(voteCounts));
    const consensusLevel = totalWeight > 0 ? (maxVotes / totalWeight) * 100 : 0;

    return consensusLevel;
  }

  /**
   * Determine fusion method based on consensus level
   */
  private determineFusionMethod(consensusLevel: number): ConfluenceDecision['fusionMethod'] {
    if (consensusLevel >= this.consensusThresholds.unanimous) {
      return 'UNANIMOUS';
    } else if (consensusLevel >= this.consensusThresholds.majority) {
      return 'MAJORITY';
    } else if (consensusLevel >= this.consensusThresholds.weighted) {
      return 'WEIGHTED';
    } else {
      return 'FALLBACK';
    }
  }

  /**
   * Fuse decisions based on the determined method
   */
  private async fuseDecisions(
    votes: ModelVotingResult[],
    fusionMethod: ConfluenceDecision['fusionMethod'],
    marketData: MarketDataInput
  ): Promise<{ decision: 'BUY' | 'SELL' | 'HOLD'; reasoning: string }> {
    switch (fusionMethod) {
      case 'UNANIMOUS':
        return this.unanimousDecision(votes);
      
      case 'MAJORITY':
        return this.majorityDecision(votes);
      
      case 'WEIGHTED':
        return this.weightedDecision(votes);
      
      case 'FALLBACK':
        return await this.fallbackDecision(votes, marketData);
      
      default:
        return { decision: 'HOLD', reasoning: 'Unable to determine decision method' };
    }
  }

  /**
   * Unanimous decision (all models agree)
   */
  private unanimousDecision(votes: ModelVotingResult[]): { decision: 'BUY' | 'SELL' | 'HOLD'; reasoning: string } {
    const firstVote = votes[0];
    return {
      decision: firstVote.vote,
      reasoning: `All models unanimously agree on ${firstVote.vote} with high confidence`
    };
  }

  /**
   * Majority decision (most models agree)
   */
  private majorityDecision(votes: ModelVotingResult[]): { decision: 'BUY' | 'SELL' | 'HOLD'; reasoning: string } {
    const voteCounts = { BUY: 0, SELL: 0, HOLD: 0 };
    
    votes.forEach(vote => {
      voteCounts[vote.vote]++;
    });

    const winningDecision = Object.entries(voteCounts).reduce((a, b) => 
      voteCounts[a[0] as keyof typeof voteCounts] > voteCounts[b[0] as keyof typeof voteCounts] ? a : b
    )[0] as 'BUY' | 'SELL' | 'HOLD';

    return {
      decision: winningDecision,
      reasoning: `Majority of models (${voteCounts[winningDecision]}/${votes.length}) recommend ${winningDecision}`
    };
  }

  /**
   * Weighted decision (based on model weights and confidence)
   */
  private weightedDecision(votes: ModelVotingResult[]): { decision: 'BUY' | 'SELL' | 'HOLD'; reasoning: string } {
    const weightedScores = { BUY: 0, SELL: 0, HOLD: 0 };
    let totalWeight = 0;

    votes.forEach(vote => {
      const adjustedWeight = vote.weight * (vote.confidence / 100);
      weightedScores[vote.vote] += adjustedWeight;
      totalWeight += adjustedWeight;
    });

    const winningDecision = Object.entries(weightedScores).reduce((a, b) => 
      weightedScores[a[0] as keyof typeof weightedScores] > weightedScores[b[0] as keyof typeof weightedScores] ? a : b
    )[0] as 'BUY' | 'SELL' | 'HOLD';

    const winningScore = weightedScores[winningDecision];
    const confidence = totalWeight > 0 ? Math.round((winningScore / totalWeight) * 100) : 0;

    return {
      decision: winningDecision,
      reasoning: `Weighted analysis favors ${winningDecision} with ${confidence}% confidence`
    };
  }

  /**
   * Fallback decision (use external AI or conservative approach)
   */
  private async fallbackDecision(
    votes: ModelVotingResult[],
    marketData: MarketDataInput
  ): Promise<{ decision: 'BUY' | 'SELL' | 'HOLD'; reasoning: string }> {
    // Try OpenAI fallback if enabled
    if (this.fallbackConfig.enableOpenAI) {
      try {
        const fallbackResult = await this.useFallbackAnalysis(marketData, votes);
        if (fallbackResult) {
          return fallbackResult;
        }
      } catch (error) {
        logger.warn('⚠️ Fallback analysis failed:', error);
      }
    }

    // Conservative fallback - default to HOLD
    return {
      decision: 'HOLD',
      reasoning: 'Models disagree and fallback analysis unavailable - taking conservative HOLD position'
    };
  }

  /**
   * Use OpenAI as fallback analysis
   */
  private async useFallbackAnalysis(
    marketData: MarketDataInput,
    votes: ModelVotingResult[]
  ): Promise<{ decision: 'BUY' | 'SELL' | 'HOLD'; reasoning: string } | null> {
    try {
      const prompt = `
Analyze this cryptocurrency trading situation where local AI models disagree:

Market Data:
- Symbol: ${marketData.symbol}
- Price: $${marketData.price}
- 24h Change: ${marketData.change24h}%
- Volume: ${marketData.volume}

Model Votes:
${votes.map(v => `- ${v.modelName}: ${v.vote} (${v.confidence}% confidence)`).join('\n')}

Provide a final trading recommendation (BUY/SELL/HOLD) with reasoning.
Consider the disagreement among models and provide a balanced analysis.

Respond in format:
DECISION: [BUY/SELL/HOLD]
REASONING: [Your analysis]
      `.trim();

      const response = await this.queryOpenAI(prompt, {
        maxTokens: 300,
        temperature: 0.3
      });

      // Parse response
      const decisionMatch = response.match(/DECISION:\s*(BUY|SELL|HOLD)/i);
      const reasoningMatch = response.match(/REASONING:\s*(.+)/i);

      if (decisionMatch && reasoningMatch) {
        return {
          decision: decisionMatch[1].toUpperCase() as 'BUY' | 'SELL' | 'HOLD',
          reasoning: `OpenAI fallback analysis: ${reasoningMatch[1].trim()}`
        };
      }

      return null;

    } catch (error) {
      logger.error('❌ OpenAI fallback analysis failed:', error);
      return null;
    }
  }

  /**
   * Query OpenAI API
   */
  private async queryOpenAI(
    prompt: string,
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<string> {
    if (!this.fallbackConfig.openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.fallbackConfig.openAIModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${this.fallbackConfig.openAIApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.fallbackConfig.timeoutMs
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Calculate overall confidence from model votes
   */
  private calculateOverallConfidence(votes: ModelVotingResult[], consensusLevel: number): number {
    if (votes.length === 0) return 0;

    // Base confidence from average model confidence
    const avgConfidence = votes.reduce((sum, vote) => sum + vote.confidence, 0) / votes.length;

    // Adjust based on consensus level
    const consensusBonus = consensusLevel / 5; // Up to 20% bonus for high consensus

    // Adjust based on model performance
    const performanceBonus = this.calculatePerformanceBonus(votes);

    const overallConfidence = Math.min(100, avgConfidence + consensusBonus + performanceBonus);

    return overallConfidence;
  }

  /**
   * Calculate performance bonus based on model track record
   */
  private calculatePerformanceBonus(votes: ModelVotingResult[]): number {
    let totalBonus = 0;
    let totalWeight = 0;

    votes.forEach(vote => {
      const performance = this.modelPerformance.get(vote.modelName);
      if (performance) {
        const modelBonus = (performance.accuracy - 75) / 5; // Bonus/penalty based on accuracy above/below 75%
        totalBonus += modelBonus * vote.weight;
        totalWeight += vote.weight;
      }
    });

    return totalWeight > 0 ? totalBonus / totalWeight : 0;
  }

  /**
   * Generate comprehensive decision explanation
   */
  private generateDecisionExplanation(
    votes: ModelVotingResult[],
    fusionMethod: ConfluenceDecision['fusionMethod'],
    finalDecision: { decision: 'BUY' | 'SELL' | 'HOLD'; reasoning: string }
  ): ConfluenceDecision['explanation'] {
    const modelReasonings: Record<string, string[]> = {};
    
    votes.forEach(vote => {
      modelReasonings[vote.modelName] = vote.reasoning;
    });

    let summary = `Decision: ${finalDecision.decision} using ${fusionMethod} fusion method. `;
    summary += finalDecision.reasoning;

    let conflictResolution: string | undefined;
    if (fusionMethod === 'WEIGHTED' || fusionMethod === 'FALLBACK') {
      const decisions = votes.map(v => v.vote);
      const uniqueDecisions = [...new Set(decisions)];
      
      if (uniqueDecisions.length > 1) {
        conflictResolution = `Models disagreed: ${uniqueDecisions.join(', ')}. Resolved using ${fusionMethod.toLowerCase()} approach.`;
      }
    }

    return {
      summary,
      modelReasonings,
      conflictResolution
    };
  }

  /**
   * Assess decision risk
   */
  private assessDecisionRisk(
    votes: ModelVotingResult[],
    finalDecision: 'BUY' | 'SELL' | 'HOLD',
    consensusLevel: number
  ): ConfluenceDecision['riskAssessment'] {
    const factors: string[] = [];
    const mitigations: string[] = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

    // Assess consensus risk
    if (consensusLevel < 50) {
      factors.push('Low model consensus indicates uncertainty');
      mitigations.push('Consider reducing position size or waiting for clearer signals');
      riskLevel = 'HIGH';
    } else if (consensusLevel < 70) {
      factors.push('Moderate model disagreement');
      mitigations.push('Monitor position closely and be ready to adjust');
      riskLevel = 'MEDIUM';
    }

    // Assess confidence risk
    const avgConfidence = votes.reduce((sum, vote) => sum + vote.confidence, 0) / votes.length;
    if (avgConfidence < 60) {
      factors.push('Low average model confidence');
      mitigations.push('Use smaller position sizes and tighter stop losses');
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
    }

    // Assess model performance risk
    const lowPerformanceModels = votes.filter(vote => {
      const performance = this.modelPerformance.get(vote.modelName);
      return performance && performance.accuracy < 70;
    });

    if (lowPerformanceModels.length > 0) {
      factors.push(`${lowPerformanceModels.length} models have recent poor performance`);
      mitigations.push('Consider model retraining or weight adjustment');
    }

    // Assess decision type risk
    if (finalDecision !== 'HOLD') {
      factors.push(`Active ${finalDecision} decision carries execution risk`);
      mitigations.push('Implement proper risk management and position sizing');
    }

    return {
      level: riskLevel,
      factors,
      mitigations
    };
  }

  /**
   * Build prompts for different models
   */
  private buildTradingAnalysisPrompt(marketData: MarketDataInput, context?: Record<string, any>): string {
    return `
Analyze ${marketData.symbol} for trading decision:

Price: $${marketData.price}
24h Change: ${marketData.change24h}%
Volume: ${marketData.volume}
${context ? `Context: ${JSON.stringify(context)}` : ''}

Provide: BUY/SELL/HOLD recommendation with confidence (0-100) and reasoning.
    `.trim();
  }

  private buildSentimentAnalysisPrompt(marketData: MarketDataInput): string {
    return `
Analyze market sentiment for ${marketData.symbol}:

Current price movement: ${marketData.change24h}%
Volume: ${marketData.volume}

Provide sentiment-based trading recommendation (BUY/SELL/HOLD) with confidence and reasoning.
    `.trim();
  }

  private buildTechnicalAnalysisPrompt(marketData: MarketDataInput): string {
    return `
Perform technical analysis for ${marketData.symbol}:

Price: $${marketData.price}
24h Change: ${marketData.change24h}%
High: $${marketData.high24h}
Low: $${marketData.low24h}

Provide technical trading recommendation (BUY/SELL/HOLD) with confidence and reasoning.
    `.trim();
  }

  /**
   * Update model performance metrics
   */
  private updateModelPerformance(votes: ModelVotingResult[]): void {
    votes.forEach(vote => {
      const performance = this.modelPerformance.get(vote.modelName);
      if (performance) {
        performance.totalDecisions++;
        performance.averageConfidence = (performance.averageConfidence + vote.confidence) / 2;
        performance.responseTime = (performance.responseTime + vote.responseTime) / 2;
        performance.lastUpdated = new Date();
      }
    });
  }

  /**
   * Adjust model weights based on performance
   */
  private adjustModelWeights(): void {
    const totalPerformance = Array.from(this.modelPerformance.values())
      .reduce((sum, perf) => sum + perf.accuracy, 0);

    if (totalPerformance > 0) {
      this.modelPerformance.forEach((performance, modelName) => {
        const newWeight = (performance.accuracy / totalPerformance) * 3; // Distribute across 3 models
        if (this.modelWeights[modelName as keyof typeof this.modelWeights]) {
          this.modelWeights[modelName as keyof typeof this.modelWeights] = 
            (this.modelWeights[modelName as keyof typeof this.modelWeights] + newWeight) / 2;
        }
      });

      this.normalizeModelWeights();
    }
  }

  /**
   * Normalize model weights to sum to 1
   */
  private normalizeModelWeights(): void {
    const totalWeight = Object.values(this.modelWeights).reduce((sum, weight) => sum + weight, 0);
    
    if (totalWeight > 0) {
      Object.keys(this.modelWeights).forEach(modelName => {
        this.modelWeights[modelName as keyof typeof this.modelWeights] /= totalWeight;
      });
    }
  }

  /**
   * Add decision to history
   */
  private addToDecisionHistory(decision: ConfluenceDecision): void {
    this.decisionHistory.push(decision);
    
    if (this.decisionHistory.length > this.maxHistorySize) {
      this.decisionHistory = this.decisionHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Load performance history from storage
   */
  private async loadPerformanceHistory(): Promise<void> {
    try {
      // In production, this would load from persistent storage
      logger.info('📊 Performance history loaded (placeholder)');
    } catch (error) {
      logger.warn('⚠️ Could not load performance history:', error);
    }
  }

  /**
   * Get decision history
   */
  public getDecisionHistory(limit?: number): ConfluenceDecision[] {
    return limit ? this.decisionHistory.slice(-limit) : this.decisionHistory;
  }

  /**
   * Get model performance metrics
   */
  public getModelPerformance(): ModelPerformanceMetrics[] {
    return Array.from(this.modelPerformance.values());
  }

  /**
   * Get current model weights
   */
  public getModelWeights(): typeof this.modelWeights {
    return { ...this.modelWeights };
  }

  /**
   * Update model weights manually
   */
  public updateModelWeights(newWeights: Partial<typeof this.modelWeights>): void {
    this.modelWeights = { ...this.modelWeights, ...newWeights };
    this.normalizeModelWeights();
    logger.info('⚖️ Model weights updated:', this.modelWeights);
  }

  /**
   * Update fallback configuration
   */
  public updateFallbackConfig(config: Partial<FallbackConfig>): void {
    this.fallbackConfig = { ...this.fallbackConfig, ...config };
    logger.info('🔧 Fallback configuration updated');
  }

  /**
   * Shutdown the confluence engine
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('🛑 Shutting down AI Confluence Engine...');
      
      // Save performance data and decision history if needed
      // await this.savePerformanceData();
      
      this.isInitialized = false;
      
      logger.info('✅ AI Confluence Engine shutdown completed');
      
    } catch (error) {
      logger.error('❌ Error during Confluence Engine shutdown:', error);
      throw error;
    }
  }
}

// Export types
export type {
  ModelVotingResult,
  ConfluenceDecision,
  ModelPerformanceMetrics,
  FallbackConfig
};