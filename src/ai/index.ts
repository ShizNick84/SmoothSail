/**
 * =============================================================================
 * AI MODULE INDEX - INTEL NUC OPTIMIZED AI INTEGRATION
 * =============================================================================
 * 
 * This module exports all AI-related components for the cryptocurrency trading
 * system. The AI integration is specifically optimized for Intel NUC hardware
 * constraints (i5 CPU, 12GB RAM) while providing comprehensive market analysis,
 * decision explanation, and adaptive learning capabilities.
 * 
 * Components:
 * - LLM Engine: Core language model integration with hardware optimization
 * - Model Manager: Model lifecycle and optimization management
 * - Resource Monitor: Hardware resource monitoring and optimization
 * - Fallback Manager: Failover and recovery mechanisms
 * - Market Analyzer: AI-powered market analysis and insights
 * - Anomaly Detector: Market irregularity and pattern detection
 * - Decision Explainer: Trading decision explanation and reasoning
 * - Adaptive Learner: Continuous learning and system optimization
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

// Core LLM Engine
export { LLMEngine } from './llm-engine';
export type { 
  LLMModelConfig, 
  MarketAnalysis, 
  TradingDecisionExplanation, 
  ModelMetrics, 
  LearningFeedback 
} from './llm-engine';

// Model Management
export { ModelManager } from './model-manager';
export type { 
  ModelDownloadConfig, 
  ModelPerformanceHistory, 
  ModelHealthStatus 
} from './model-manager';

// Resource Monitoring
export { LLMResourceMonitor } from './resource-monitor';
export type { 
  LLMResourceMetrics, 
  OptimizationRecommendation, 
  ResourceAllocationStrategy, 
  PerformancePrediction 
} from './resource-monitor';

// Fallback Management
export { LLMFallbackManager } from './fallback-manager';
export type { 
  FallbackStrategy, 
  FallbackCondition, 
  FallbackAction, 
  CircuitBreakerState, 
  FallbackResult, 
  EmergencyModeConfig 
} from './fallback-manager';

// Market Analysis
export { MarketAnalyzer } from './market-analyzer';
export type { 
  MarketDataInput, 
  SentimentDataInput, 
  MarketRegime, 
  VolatilityAnalysis, 
  TrendAnalysis, 
  MarketAnomaly, 
  ComprehensiveMarketAnalysis 
} from './market-analyzer';

// Anomaly Detection
export { AnomalyDetector } from './anomaly-detector';
export type { 
  AnomalyDetectionConfig, 
  StatisticalBaseline, 
  AnomalyDetectionResult, 
  PatternAnomaly, 
  OrderBookAnomaly 
} from './anomaly-detector';

// Decision Explanation
export { DecisionExplainer } from './decision-explainer';
export type { 
  TradingDecisionInput, 
  ReasoningStep, 
  ConfidenceBreakdown, 
  ScenarioAnalysis, 
  RiskRewardExplanation, 
  ComprehensiveDecisionExplanation, 
  ExplanationTemplate 
} from './decision-explainer';

// Adaptive Learning
export { AdaptiveLearner } from './adaptive-learner';
export type { 
  TradingOutcome, 
  StrategyPerformance, 
  LearningInsight 
} from './adaptive-learner';

/**
 * AI System Integration Class
 * Orchestrates all AI components for the trading system
 */
export class AISystem {
  private llmEngine: LLMEngine;
  private modelManager: ModelManager;
  private resourceMonitor: LLMResourceMonitor;
  private fallbackManager: LLMFallbackManager;
  private marketAnalyzer: MarketAnalyzer;
  private anomalyDetector: AnomalyDetector;
  private decisionExplainer: DecisionExplainer;
  private adaptiveLearner: AdaptiveLearner;

  constructor(systemMonitor: any, securityManager: any) {
    // Initialize core components
    this.llmEngine = new LLMEngine(systemMonitor, securityManager);
    this.modelManager = new ModelManager(systemMonitor, securityManager);
    this.resourceMonitor = new LLMResourceMonitor(systemMonitor);
    this.fallbackManager = new LLMFallbackManager(this.modelManager, this.resourceMonitor);
    
    // Initialize analysis components
    this.marketAnalyzer = new MarketAnalyzer(this.llmEngine);
    this.anomalyDetector = new AnomalyDetector(this.llmEngine);
    this.decisionExplainer = new DecisionExplainer(this.llmEngine);
    this.adaptiveLearner = new AdaptiveLearner(this.llmEngine);
  }

  /**
   * Initialize the entire AI system
   */
  public async initialize(): Promise<void> {
    // Initialize in dependency order
    await this.modelManager.initialize();
    await this.resourceMonitor.startMonitoring();
    await this.fallbackManager.initialize();
    await this.llmEngine.initialize();
    
    // Initialize analysis components
    await this.marketAnalyzer.initialize();
    await this.anomalyDetector.initialize();
    await this.decisionExplainer.initialize();
    await this.adaptiveLearner.initialize();
  }

  /**
   * Get all AI components
   */
  public getComponents() {
    return {
      llmEngine: this.llmEngine,
      modelManager: this.modelManager,
      resourceMonitor: this.resourceMonitor,
      fallbackManager: this.fallbackManager,
      marketAnalyzer: this.marketAnalyzer,
      anomalyDetector: this.anomalyDetector,
      decisionExplainer: this.decisionExplainer,
      adaptiveLearner: this.adaptiveLearner
    };
  }

  /**
   * Shutdown the entire AI system
   */
  public async shutdown(): Promise<void> {
    // Shutdown in reverse order
    await this.adaptiveLearner.shutdown();
    await this.decisionExplainer.shutdown();
    await this.anomalyDetector.shutdown();
    await this.marketAnalyzer.shutdown();
    
    await this.llmEngine.shutdown();
    await this.fallbackManager.shutdown();
    await this.resourceMonitor.shutdown();
    await this.modelManager.shutdown();
  }
}

// Export the integrated AI system
export default AISystem;
