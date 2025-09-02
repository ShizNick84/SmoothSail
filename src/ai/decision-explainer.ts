/**
 * =============================================================================
 * DECISION EXPLAINER - AI-POWERED TRADING DECISION EXPLANATION SYSTEM
 * =============================================================================
 * 
 * This module provides comprehensive explanations for trading decisions using
 * AI and natural language processing. It creates human-readable reasoning
 * chains, confidence scoring, and audit trails for all trading decisions
 * made by the system.
 * 
 * Key Features:
 * - Natural language explanations for trading decisions
 * - Reasoning chain construction and validation
 * - Confidence scoring and uncertainty quantification
 * - Decision audit trails and justifications
 * - Multi-factor analysis and weight attribution
 * - Risk-reward explanation and scenario analysis
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { LLMEngine } from './llm-engine';
import type { TradingDecisionExplanation } from './llm-engine';
import type { MarketAnalysis } from './llm-engine';
import type { ComprehensiveMarketAnalysis } from './market-analyzer';

/**
 * Interface for trading decision input
 */
interface TradingDecisionInput {
  symbol: string;
  decision: 'BUY' | 'SELL' | 'HOLD';
  quantity: number;
  price: number;
  timestamp: Date;
  
  // Strategy information
  strategy: string;
  strategyConfidence: number;
  
  // Market analysis
  marketAnalysis: ComprehensiveMarketAnalysis;
  
  // Technical factors
  technicalFactors: {
    indicators: Record<string, number>;
    signals: string[];
    strength: number;
  };
  
  // Risk management
  riskFactors: {
    stopLoss: number;
    takeProfit: number;
    riskReward: number;
    positionSize: number;
  };
  
  // External factors
  externalFactors?: {
    sentiment: number;
    news: string[];
    marketConditions: string;
  };
}

/**
 * Interface for reasoning chain step
 */
interface ReasoningStep {
  stepNumber: number;
  category: 'TECHNICAL' | 'FUNDAMENTAL' | 'SENTIMENT' | 'RISK' | 'MARKET_STRUCTURE' | 'TIMING';
  description: string;
  evidence: string[];
  weight: number; // 0-100, importance in final decision
  confidence: number; // 0-100, confidence in this step
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  quantification?: number; // Numerical impact if applicable
}

/**
 * Interface for decision confidence breakdown
 */
interface ConfidenceBreakdown {
  overall: number; // 0-100
  components: {
    technical: number;
    fundamental: number;
    sentiment: number;
    risk: number;
    timing: number;
  };
  uncertaintyFactors: string[];
  confidenceDrivers: string[];
  dataQuality: number; // 0-100
}

/**
 * Interface for scenario analysis
 */
interface ScenarioAnalysis {
  bullishScenario: {
    probability: number; // 0-100
    expectedReturn: number; // percentage
    description: string;
    keyFactors: string[];
  };
  bearishScenario: {
    probability: number; // 0-100
    expectedReturn: number; // percentage
    description: string;
    keyFactors: string[];
  };
  neutralScenario: {
    probability: number; // 0-100
    expectedReturn: number; // percentage
    description: string;
    keyFactors: string[];
  };
  mostLikelyOutcome: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

/**
 * Interface for risk-reward explanation
 */
interface RiskRewardExplanation {
  riskAmount: number; // Dollar amount at risk
  rewardPotential: number; // Dollar amount potential reward
  ratio: number; // Risk-reward ratio
  probability: number; // Probability of success (0-100)
  expectedValue: number; // Expected value of trade
  
  riskFactors: {
    factor: string;
    impact: number; // 0-100
    mitigation: string;
  }[];
  
  rewardDrivers: {
    driver: string;
    potential: number; // 0-100
    likelihood: number; // 0-100
  }[];
  
  breakEvenAnalysis: {
    breakEvenPrice: number;
    timeToBreakEven: string;
    probabilityOfBreakEven: number;
  };
}

/**
 * Interface for comprehensive decision explanation
 */
interface ComprehensiveDecisionExplanation {
  // Basic information
  decisionId: string;
  symbol: string;
  decision: 'BUY' | 'SELL' | 'HOLD';
  timestamp: Date;
  
  // Core explanation
  summary: string;
  reasoningChain: ReasoningStep[];
  confidenceBreakdown: ConfidenceBreakdown;
  
  // Analysis components
  scenarioAnalysis: ScenarioAnalysis;
  riskRewardExplanation: RiskRewardExplanation;
  
  // Alternative considerations
  alternativeDecisions: {
    decision: 'BUY' | 'SELL' | 'HOLD';
    reasoning: string;
    confidence: number;
    whyNotChosen: string;
  }[];
  
  // Monitoring and follow-up
  keyMetricsToWatch: string[];
  exitCriteria: string[];
  reviewSchedule: string;
  
  // Audit information
  dataSourcesUsed: string[];
  modelsUsed: string[];
  humanOverrideReason?: string;
  
  // Performance tracking
  expectedOutcome: string;
  actualOutcome?: string;
  outcomeAnalysis?: string;
}

/**
 * Interface for explanation template
 */
interface ExplanationTemplate {
  name: string;
  category: 'BUY' | 'SELL' | 'HOLD';
  template: string;
  requiredFields: string[];
  optionalFields: string[];
}

/**
 * Decision Explainer class for trading decision explanations
 */
export class DecisionExplainer extends EventEmitter {
  private llmEngine: LLMEngine;
  private isInitialized: boolean = false;
  private explanationHistory: ComprehensiveDecisionExplanation[] = [];
  private maxHistorySize: number = 1000;
  private explanationTemplates: Map<string, ExplanationTemplate> = new Map();

  // Explanation configuration
  private readonly EXPLANATION_CONFIG = {
    maxReasoningSteps: 10,
    minConfidenceForDecision: 60,
    maxAlternativeDecisions: 3,
    detailLevel: 'COMPREHENSIVE', // 'BASIC' | 'DETAILED' | 'COMPREHENSIVE'
    includeScenarios: true,
    includeRiskReward: true,
    includeAlternatives: true
  };

  constructor(llmEngine: LLMEngine) {
    super();
    this.llmEngine = llmEngine;
    
    this.initializeTemplates();
    
    logger.info('📝 Decision Explainer initialized');
  }

  /**
   * Initialize explanation templates
   */
  private initializeTemplates(): void {
    // Buy decision template
    this.explanationTemplates.set('BUY', {
      name: 'Buy Decision Template',
      category: 'BUY',
      template: `Based on comprehensive analysis, I recommend BUYING {symbol} at {price} for the following reasons:

PRIMARY FACTORS:
{primaryFactors}

TECHNICAL ANALYSIS:
{technicalAnalysis}

RISK MANAGEMENT:
- Stop Loss: {stopLoss}
- Take Profit: {takeProfit}
- Risk-Reward Ratio: {riskReward}
- Position Size: {positionSize}% of portfolio

CONFIDENCE: {confidence}% based on {confidenceFactors}

EXPECTED OUTCOME: {expectedOutcome}`,
      requiredFields: ['symbol', 'price', 'primaryFactors', 'technicalAnalysis', 'stopLoss', 'takeProfit', 'riskReward', 'positionSize', 'confidence', 'confidenceFactors', 'expectedOutcome'],
      optionalFields: ['sentiment', 'news', 'marketConditions']
    });

    // Sell decision template
    this.explanationTemplates.set('SELL', {
      name: 'Sell Decision Template',
      category: 'SELL',
      template: `Based on comprehensive analysis, I recommend SELLING {symbol} at {price} for the following reasons:

PRIMARY FACTORS:
{primaryFactors}

TECHNICAL ANALYSIS:
{technicalAnalysis}

RISK MANAGEMENT:
- Stop Loss: {stopLoss}
- Take Profit: {takeProfit}
- Risk-Reward Ratio: {riskReward}
- Position Size: {positionSize}% of portfolio

CONFIDENCE: {confidence}% based on {confidenceFactors}

EXPECTED OUTCOME: {expectedOutcome}`,
      requiredFields: ['symbol', 'price', 'primaryFactors', 'technicalAnalysis', 'stopLoss', 'takeProfit', 'riskReward', 'positionSize', 'confidence', 'confidenceFactors', 'expectedOutcome'],
      optionalFields: ['sentiment', 'news', 'marketConditions']
    });

    // Hold decision template
    this.explanationTemplates.set('HOLD', {
      name: 'Hold Decision Template',
      category: 'HOLD',
      template: `Based on comprehensive analysis, I recommend HOLDING current positions in {symbol} for the following reasons:

PRIMARY FACTORS:
{primaryFactors}

CURRENT ANALYSIS:
{currentAnalysis}

MONITORING CRITERIA:
{monitoringCriteria}

CONFIDENCE: {confidence}% based on {confidenceFactors}

NEXT REVIEW: {nextReview}`,
      requiredFields: ['symbol', 'primaryFactors', 'currentAnalysis', 'monitoringCriteria', 'confidence', 'confidenceFactors', 'nextReview'],
      optionalFields: ['sentiment', 'news', 'marketConditions']
    });

    logger.info(`📋 Initialized ${this.explanationTemplates.size} explanation templates`);
  }

  /**
   * Initialize the decision explainer
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing Decision Explainer...');

      // Verify LLM engine is ready
      if (!this.llmEngine.isReady()) {
        throw new Error('LLM Engine is not ready');
      }

      this.isInitialized = true;
      logger.info('✅ Decision Explainer initialized successfully');

      this.emit('initialized');

    } catch (error) {
      logger.error('❌ Failed to initialize Decision Explainer:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive explanation for a trading decision
   */
  public async explainDecision(decisionInput: TradingDecisionInput): Promise<ComprehensiveDecisionExplanation> {
    try {
      if (!this.isInitialized) {
        throw new Error('Decision Explainer not initialized');
      }

      logger.info(`📝 Generating explanation for ${decisionInput.decision} decision on ${decisionInput.symbol}...`);

      const decisionId = this.generateDecisionId(decisionInput);

      // Build reasoning chain
      const reasoningChain = await this.buildReasoningChain(decisionInput);

      // Calculate confidence breakdown
      const confidenceBreakdown = this.calculateConfidenceBreakdown(decisionInput, reasoningChain);

      // Generate scenario analysis
      const scenarioAnalysis = await this.generateScenarioAnalysis(decisionInput);

      // Create risk-reward explanation
      const riskRewardExplanation = this.createRiskRewardExplanation(decisionInput);

      // Generate alternative decisions
      const alternativeDecisions = await this.generateAlternativeDecisions(decisionInput);

      // Create summary using LLM
      const summary = await this.generateDecisionSummary(decisionInput, reasoningChain);

      // Compile comprehensive explanation
      const explanation: ComprehensiveDecisionExplanation = {
        decisionId,
        symbol: decisionInput.symbol,
        decision: decisionInput.decision,
        timestamp: new Date(),
        
        summary,
        reasoningChain,
        confidenceBreakdown,
        
        scenarioAnalysis,
        riskRewardExplanation,
        
        alternativeDecisions,
        
        keyMetricsToWatch: this.identifyKeyMetrics(decisionInput),
        exitCriteria: this.defineExitCriteria(decisionInput),
        reviewSchedule: this.determineReviewSchedule(decisionInput),
        
        dataSourcesUsed: this.getDataSources(decisionInput),
        modelsUsed: ['LLM', 'Technical Analysis', 'Risk Management', 'Market Analysis'],
        
        expectedOutcome: this.generateExpectedOutcome(decisionInput, scenarioAnalysis)
      };

      // Add to history
      this.addToHistory(explanation);

      logger.info(`✅ Decision explanation generated for ${decisionInput.symbol} (ID: ${decisionId})`);
      
      this.emit('explanationGenerated', explanation);

      return explanation;

    } catch (error) {
      logger.error('❌ Error generating decision explanation:', error);
      throw error;
    }
  }

  /**
   * Generate unique decision ID
   */
  private generateDecisionId(decisionInput: TradingDecisionInput): string {
    const timestamp = decisionInput.timestamp.getTime();
    const hash = this.simpleHash(`${decisionInput.symbol}_${decisionInput.decision}_${timestamp}`);
    return `DEC_${hash.substring(0, 8).toUpperCase()}`;
  }

  /**
   * Simple hash function for ID generation
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Build reasoning chain for the decision
   */
  private async buildReasoningChain(decisionInput: TradingDecisionInput): Promise<ReasoningStep[]> {
    const steps: ReasoningStep[] = [];
    let stepNumber = 1;

    // Technical analysis step
    if (decisionInput.technicalFactors.signals.length > 0) {
      steps.push({
        stepNumber: stepNumber++,
        category: 'TECHNICAL',
        description: 'Technical indicators analysis',
        evidence: decisionInput.technicalFactors.signals,
        weight: 30,
        confidence: decisionInput.technicalFactors.strength,
        impact: this.determineImpact(decisionInput.decision, decisionInput.technicalFactors.strength),
        quantification: decisionInput.technicalFactors.strength
      });
    }

    // Market analysis step
    const marketAnalysis = decisionInput.marketAnalysis;
    steps.push({
      stepNumber: stepNumber++,
      category: 'FUNDAMENTAL',
      description: 'Market conditions and trend analysis',
      evidence: [
        `Market sentiment: ${marketAnalysis.marketAnalysis.sentiment}`,
        `Trend: ${marketAnalysis.trendAnalysis.overall}`,
        `Volatility: ${marketAnalysis.volatilityAnalysis.classification}`
      ],
      weight: 25,
      confidence: marketAnalysis.overallConfidence,
      impact: this.determineImpact(decisionInput.decision, marketAnalysis.overallConfidence),
      quantification: marketAnalysis.marketAnalysis.sentiment
    });

    // Risk management step
    steps.push({
      stepNumber: stepNumber++,
      category: 'RISK',
      description: 'Risk-reward assessment',
      evidence: [
        `Risk-reward ratio: ${decisionInput.riskFactors.riskReward}:1`,
        `Stop loss: ${decisionInput.riskFactors.stopLoss}`,
        `Position size: ${decisionInput.riskFactors.positionSize}%`
      ],
      weight: 20,
      confidence: decisionInput.riskFactors.riskReward >= 1.3 ? 85 : 60,
      impact: decisionInput.riskFactors.riskReward >= 1.3 ? 'POSITIVE' : 'NEGATIVE',
      quantification: decisionInput.riskFactors.riskReward
    });

    // Sentiment analysis step (if available)
    if (decisionInput.externalFactors?.sentiment !== undefined) {
      steps.push({
        stepNumber: stepNumber++,
        category: 'SENTIMENT',
        description: 'Market sentiment analysis',
        evidence: [
          `Overall sentiment: ${decisionInput.externalFactors.sentiment}`,
          ...(decisionInput.externalFactors.news || [])
        ],
        weight: 15,
        confidence: Math.abs(decisionInput.externalFactors.sentiment) > 50 ? 80 : 60,
        impact: this.determineSentimentImpact(decisionInput.decision, decisionInput.externalFactors.sentiment),
        quantification: decisionInput.externalFactors.sentiment
      });
    }

    // Timing analysis step
    steps.push({
      stepNumber: stepNumber++,
      category: 'TIMING',
      description: 'Market timing and entry/exit optimization',
      evidence: [
        `Strategy confidence: ${decisionInput.strategyConfidence}%`,
        `Market regime: ${marketAnalysis.marketRegime.regime}`,
        `Volatility level: ${marketAnalysis.volatilityAnalysis.classification}`
      ],
      weight: 10,
      confidence: decisionInput.strategyConfidence,
      impact: this.determineImpact(decisionInput.decision, decisionInput.strategyConfidence),
      quantification: decisionInput.strategyConfidence
    });

    return steps;
  }

  /**
   * Determine impact based on decision and strength
   */
  private determineImpact(decision: 'BUY' | 'SELL' | 'HOLD', strength: number): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
    if (decision === 'HOLD') return 'NEUTRAL';
    
    if (strength > 70) return 'POSITIVE';
    if (strength < 40) return 'NEGATIVE';
    return 'NEUTRAL';
  }

  /**
   * Determine sentiment impact on decision
   */
  private determineSentimentImpact(decision: 'BUY' | 'SELL' | 'HOLD', sentiment: number): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
    if (decision === 'HOLD') return 'NEUTRAL';
    
    if (decision === 'BUY' && sentiment > 20) return 'POSITIVE';
    if (decision === 'BUY' && sentiment < -20) return 'NEGATIVE';
    if (decision === 'SELL' && sentiment < -20) return 'POSITIVE';
    if (decision === 'SELL' && sentiment > 20) return 'NEGATIVE';
    
    return 'NEUTRAL';
  }

  /**
   * Calculate confidence breakdown
   */
  private calculateConfidenceBreakdown(
    decisionInput: TradingDecisionInput,
    reasoningChain: ReasoningStep[]
  ): ConfidenceBreakdown {
    const components = {
      technical: 0,
      fundamental: 0,
      sentiment: 0,
      risk: 0,
      timing: 0
    };

    // Calculate component confidences from reasoning chain
    for (const step of reasoningChain) {
      switch (step.category) {
        case 'TECHNICAL':
          components.technical = step.confidence;
          break;
        case 'FUNDAMENTAL':
          components.fundamental = step.confidence;
          break;
        case 'SENTIMENT':
          components.sentiment = step.confidence;
          break;
        case 'RISK':
          components.risk = step.confidence;
          break;
        case 'TIMING':
          components.timing = step.confidence;
          break;
      }
    }

    // Calculate weighted overall confidence
    const totalWeight = reasoningChain.reduce((sum, step) => sum + step.weight, 0);
    const weightedConfidence = reasoningChain.reduce((sum, step) => 
      sum + (step.confidence * step.weight), 0) / totalWeight;

    // Identify uncertainty factors
    const uncertaintyFactors: string[] = [];
    const confidenceDrivers: string[] = [];

    for (const step of reasoningChain) {
      if (step.confidence < 60) {
        uncertaintyFactors.push(`Low confidence in ${step.category.toLowerCase()} analysis`);
      } else if (step.confidence > 80) {
        confidenceDrivers.push(`Strong ${step.category.toLowerCase()} signals`);
      }
    }

    return {
      overall: Math.round(weightedConfidence),
      components,
      uncertaintyFactors,
      confidenceDrivers,
      dataQuality: decisionInput.marketAnalysis.dataQuality
    };
  }

  /**
   * Generate scenario analysis
   */
  private async generateScenarioAnalysis(decisionInput: TradingDecisionInput): Promise<ScenarioAnalysis> {
    const marketAnalysis = decisionInput.marketAnalysis;
    const currentPrice = decisionInput.price;

    // Bullish scenario
    const bullishScenario = {
      probability: marketAnalysis.trendAnalysis.overall === 'BULLISH' ? 60 : 30,
      expectedReturn: 15, // Mock 15% return
      description: 'Technical breakout with strong volume confirmation and positive sentiment',
      keyFactors: [
        'Technical indicators align bullishly',
        'Volume confirms price movement',
        'Market sentiment improves',
        'Risk-reward ratio favorable'
      ]
    };

    // Bearish scenario
    const bearishScenario = {
      probability: marketAnalysis.trendAnalysis.overall === 'BEARISH' ? 60 : 25,
      expectedReturn: -10, // Mock -10% return
      description: 'Technical breakdown with selling pressure and negative sentiment',
      keyFactors: [
        'Technical indicators turn bearish',
        'Volume on declines increases',
        'Market sentiment deteriorates',
        'Support levels break'
      ]
    };

    // Neutral scenario
    const neutralScenario = {
      probability: 100 - bullishScenario.probability - bearishScenario.probability,
      expectedReturn: 2, // Mock 2% return
      description: 'Sideways trading within established range',
      keyFactors: [
        'Mixed technical signals',
        'Low volatility environment',
        'Neutral market sentiment',
        'Range-bound trading'
      ]
    };

    // Determine most likely outcome
    let mostLikelyOutcome: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    const maxProbability = Math.max(bullishScenario.probability, bearishScenario.probability, neutralScenario.probability);
    
    if (maxProbability === bullishScenario.probability) mostLikelyOutcome = 'BULLISH';
    else if (maxProbability === bearishScenario.probability) mostLikelyOutcome = 'BEARISH';

    return {
      bullishScenario,
      bearishScenario,
      neutralScenario,
      mostLikelyOutcome
    };
  }

  /**
   * Create risk-reward explanation
   */
  private createRiskRewardExplanation(decisionInput: TradingDecisionInput): RiskRewardExplanation {
    const { riskFactors, quantity, price } = decisionInput;
    const positionValue = quantity * price;
    
    const riskAmount = positionValue * (Math.abs(price - riskFactors.stopLoss) / price);
    const rewardPotential = positionValue * (Math.abs(riskFactors.takeProfit - price) / price);
    
    return {
      riskAmount,
      rewardPotential,
      ratio: riskFactors.riskReward,
      probability: 65, // Mock probability
      expectedValue: (rewardPotential * 0.65) - (riskAmount * 0.35),
      
      riskFactors: [
        {
          factor: 'Market volatility',
          impact: 70,
          mitigation: 'Appropriate position sizing and stop loss'
        },
        {
          factor: 'Adverse price movement',
          impact: 85,
          mitigation: 'Technical stop loss at key support/resistance'
        },
        {
          factor: 'Liquidity risk',
          impact: 30,
          mitigation: 'Trading liquid markets with tight spreads'
        }
      ],
      
      rewardDrivers: [
        {
          driver: 'Technical breakout',
          potential: 80,
          likelihood: 70
        },
        {
          driver: 'Positive sentiment shift',
          potential: 60,
          likelihood: 50
        },
        {
          driver: 'Volume confirmation',
          potential: 70,
          likelihood: 65
        }
      ],
      
      breakEvenAnalysis: {
        breakEvenPrice: price + (price * 0.001), // Mock 0.1% for fees
        timeToBreakEven: '1-3 days',
        probabilityOfBreakEven: 75
      }
    };
  }

  /**
   * Generate alternative decisions
   */
  private async generateAlternativeDecisions(decisionInput: TradingDecisionInput): Promise<{
    decision: 'BUY' | 'SELL' | 'HOLD';
    reasoning: string;
    confidence: number;
    whyNotChosen: string;
  }[]> {
    const alternatives: any[] = [];
    const currentDecision = decisionInput.decision;

    // Generate alternatives based on current decision
    if (currentDecision !== 'HOLD') {
      alternatives.push({
        decision: 'HOLD',
        reasoning: 'Wait for clearer signals and better risk-reward setup',
        confidence: 60,
        whyNotChosen: 'Current setup provides acceptable risk-reward with sufficient confidence'
      });
    }

    if (currentDecision !== 'BUY') {
      alternatives.push({
        decision: 'BUY',
        reasoning: 'Technical indicators show potential upside with improving sentiment',
        confidence: currentDecision === 'SELL' ? 40 : 70,
        whyNotChosen: currentDecision === 'SELL' ? 
          'Bearish signals outweigh bullish factors' : 
          'Risk management suggests waiting for better entry'
      });
    }

    if (currentDecision !== 'SELL') {
      alternatives.push({
        decision: 'SELL',
        reasoning: 'Risk factors suggest potential downside with deteriorating conditions',
        confidence: currentDecision === 'BUY' ? 35 : 65,
        whyNotChosen: currentDecision === 'BUY' ? 
          'Bullish signals outweigh bearish factors' : 
          'No immediate selling pressure detected'
      });
    }

    return alternatives.slice(0, this.EXPLANATION_CONFIG.maxAlternativeDecisions);
  }

  /**
   * Generate decision summary using LLM
   */
  private async generateDecisionSummary(
    decisionInput: TradingDecisionInput,
    reasoningChain: ReasoningStep[]
  ): Promise<string> {
    try {
      // Build prompt for LLM
      const prompt = this.buildSummaryPrompt(decisionInput, reasoningChain);
      
      // Get LLM response (mock implementation)
      const llmResponse = await this.getLLMSummary(prompt);
      
      return llmResponse;
      
    } catch (error) {
      logger.error('❌ Error generating LLM summary:', error);
      
      // Fallback to template-based summary
      return this.generateTemplateSummary(decisionInput, reasoningChain);
    }
  }

  /**
   * Build prompt for LLM summary generation
   */
  private buildSummaryPrompt(
    decisionInput: TradingDecisionInput,
    reasoningChain: ReasoningStep[]
  ): string {
    const { symbol, decision, price, strategy } = decisionInput;
    
    let prompt = `Generate a clear, concise summary for the following trading decision:

DECISION: ${decision} ${symbol} at $${price.toFixed(2)}
STRATEGY: ${strategy}

REASONING CHAIN:
${reasoningChain.map((step, index) => 
  `${index + 1}. ${step.category}: ${step.description} (Confidence: ${step.confidence}%, Weight: ${step.weight}%)`
).join('\n')}

RISK MANAGEMENT:
- Stop Loss: $${decisionInput.riskFactors.stopLoss.toFixed(2)}
- Take Profit: $${decisionInput.riskFactors.takeProfit.toFixed(2)}
- Risk-Reward: ${decisionInput.riskFactors.riskReward}:1
- Position Size: ${decisionInput.riskFactors.positionSize}%

Please provide a professional, clear explanation that:
1. Summarizes the key reasons for this decision
2. Highlights the most important factors
3. Explains the risk management approach
4. Sets appropriate expectations

Keep it concise but comprehensive, suitable for both technical and non-technical audiences.`;

    return prompt;
  }

  /**
   * Get LLM summary (mock implementation)
   */
  private async getLLMSummary(prompt: string): Promise<string> {
    // Mock LLM response
    return `Based on comprehensive technical and fundamental analysis, I recommend this trading decision with high confidence. The primary drivers include strong technical alignment, favorable risk-reward ratio, and supportive market conditions. Risk management is appropriately structured with defined stop loss and take profit levels. This decision aligns with our capital preservation strategy while maximizing profit potential through systematic analysis.`;
  }

  /**
   * Generate template-based summary as fallback
   */
  private generateTemplateSummary(
    decisionInput: TradingDecisionInput,
    reasoningChain: ReasoningStep[]
  ): string {
    const template = this.explanationTemplates.get(decisionInput.decision);
    if (!template) {
      return `${decisionInput.decision} decision for ${decisionInput.symbol} based on systematic analysis.`;
    }

    // Simple template substitution (in production, this would be more sophisticated)
    let summary = template.template;
    
    summary = summary.replace('{symbol}', decisionInput.symbol);
    summary = summary.replace('{price}', decisionInput.price.toFixed(2));
    summary = summary.replace('{stopLoss}', decisionInput.riskFactors.stopLoss.toFixed(2));
    summary = summary.replace('{takeProfit}', decisionInput.riskFactors.takeProfit.toFixed(2));
    summary = summary.replace('{riskReward}', decisionInput.riskFactors.riskReward.toString());
    summary = summary.replace('{positionSize}', decisionInput.riskFactors.positionSize.toString());
    
    return summary;
  }

  /**
   * Identify key metrics to monitor
   */
  private identifyKeyMetrics(decisionInput: TradingDecisionInput): string[] {
    const metrics = [
      'Price action relative to entry point',
      'Volume confirmation of price movements',
      'Technical indicator alignment',
      'Risk-reward ratio maintenance'
    ];

    // Add decision-specific metrics
    if (decisionInput.decision === 'BUY') {
      metrics.push('Support level holding', 'Bullish momentum continuation');
    } else if (decisionInput.decision === 'SELL') {
      metrics.push('Resistance level rejection', 'Bearish momentum continuation');
    }

    // Add market-specific metrics
    if (decisionInput.marketAnalysis.volatilityAnalysis.classification === 'HIGH') {
      metrics.push('Volatility normalization', 'Risk management effectiveness');
    }

    return metrics;
  }

  /**
   * Define exit criteria
   */
  private defineExitCriteria(decisionInput: TradingDecisionInput): string[] {
    const criteria = [
      `Stop loss triggered at $${decisionInput.riskFactors.stopLoss.toFixed(2)}`,
      `Take profit reached at $${decisionInput.riskFactors.takeProfit.toFixed(2)}`,
      'Technical setup invalidation',
      'Risk-reward ratio deterioration'
    ];

    // Add decision-specific criteria
    if (decisionInput.decision === 'BUY') {
      criteria.push('Break below key support levels', 'Bearish divergence in indicators');
    } else if (decisionInput.decision === 'SELL') {
      criteria.push('Break above key resistance levels', 'Bullish divergence in indicators');
    }

    return criteria;
  }

  /**
   * Determine review schedule
   */
  private determineReviewSchedule(decisionInput: TradingDecisionInput): string {
    const volatility = decisionInput.marketAnalysis.volatilityAnalysis.classification;
    
    if (volatility === 'HIGH' || volatility === 'EXTREMELY_HIGH') {
      return 'Every 4 hours during market hours';
    } else if (volatility === 'MEDIUM') {
      return 'Twice daily (morning and evening)';
    } else {
      return 'Daily review with weekly comprehensive analysis';
    }
  }

  /**
   * Get data sources used
   */
  private getDataSources(decisionInput: TradingDecisionInput): string[] {
    const sources = [
      'Gate.io market data',
      'Technical indicators',
      'Risk management system',
      'Market analysis engine'
    ];

    if (decisionInput.externalFactors?.sentiment !== undefined) {
      sources.push('Sentiment analysis', 'Social media monitoring');
    }

    if (decisionInput.externalFactors?.news?.length) {
      sources.push('News analysis', 'Fundamental data');
    }

    return sources;
  }

  /**
   * Generate expected outcome
   */
  private generateExpectedOutcome(
    decisionInput: TradingDecisionInput,
    scenarioAnalysis: ScenarioAnalysis
  ): string {
    const mostLikely = scenarioAnalysis.mostLikelyOutcome;
    const scenario = scenarioAnalysis[`${mostLikely.toLowerCase()}Scenario` as keyof ScenarioAnalysis] as any;
    
    return `Most likely outcome (${scenario.probability}% probability): ${scenario.description} with expected return of ${scenario.expectedReturn > 0 ? '+' : ''}${scenario.expectedReturn}%`;
  }

  /**
   * Add explanation to history
   */
  private addToHistory(explanation: ComprehensiveDecisionExplanation): void {
    this.explanationHistory.push(explanation);
    
    if (this.explanationHistory.length > this.maxHistorySize) {
      this.explanationHistory = this.explanationHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get explanation history
   */
  public getExplanationHistory(symbol?: string, limit?: number): ComprehensiveDecisionExplanation[] {
    let history = this.explanationHistory;
    
    if (symbol) {
      history = history.filter(explanation => explanation.symbol === symbol);
    }
    
    if (limit) {
      history = history.slice(-limit);
    }
    
    return history;
  }

  /**
   * Get explanation by ID
   */
  public getExplanationById(decisionId: string): ComprehensiveDecisionExplanation | null {
    return this.explanationHistory.find(explanation => explanation.decisionId === decisionId) || null;
  }

  /**
   * Update explanation with actual outcome
   */
  public async updateExplanationOutcome(
    decisionId: string,
    actualOutcome: string,
    outcomeAnalysis?: string
  ): Promise<void> {
    const explanation = this.getExplanationById(decisionId);
    
    if (explanation) {
      explanation.actualOutcome = actualOutcome;
      explanation.outcomeAnalysis = outcomeAnalysis;
      
      logger.info(`📊 Updated outcome for decision ${decisionId}: ${actualOutcome}`);
      
      this.emit('outcomeUpdated', { decisionId, actualOutcome, outcomeAnalysis });
    }
  }

  /**
   * Generate simple explanation (for quick decisions)
   */
  public async generateSimpleExplanation(decisionInput: TradingDecisionInput): Promise<TradingDecisionExplanation> {
    const reasoningChain = await this.buildReasoningChain(decisionInput);
    const confidenceBreakdown = this.calculateConfidenceBreakdown(decisionInput, reasoningChain);
    
    return {
      decision: decisionInput.decision,
      reasoning: reasoningChain.map(step => step.description),
      confidence: confidenceBreakdown.overall,
      riskFactors: reasoningChain
        .filter(step => step.impact === 'NEGATIVE')
        .map(step => step.description),
      expectedOutcome: this.generateExpectedOutcome(
        decisionInput,
        await this.generateScenarioAnalysis(decisionInput)
      ),
      alternativeScenarios: [
        'Market conditions could change rapidly',
        'Technical levels may not hold as expected',
        'External factors could impact sentiment'
      ],
      timestamp: new Date()
    };
  }

  /**
   * Shutdown the decision explainer
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('🛑 Shutting down Decision Explainer...');
      
      // Clear history
      this.explanationHistory = [];
      
      this.isInitialized = false;
      
      logger.info('✅ Decision Explainer shutdown completed');
      
    } catch (error) {
      logger.error('❌ Error during Decision Explainer shutdown:', error);
      throw error;
    }
  }
}

// Export types
export type {
  TradingDecisionInput,
  ReasoningStep,
  ConfidenceBreakdown,
  ScenarioAnalysis,
  RiskRewardExplanation,
  ComprehensiveDecisionExplanation,
  ExplanationTemplate
};
