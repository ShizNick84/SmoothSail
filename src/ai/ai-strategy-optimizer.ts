/**
 * =============================================================================
 * AI STRATEGY OPTIMIZATION WITH CODELLAMA
 * =============================================================================
 * 
 * This module implements AI-driven trading strategy optimization using
 * CodeLlama 7B for automated strategy code generation, parameter optimization,
 * and dynamic strategy modification based on market conditions.
 * 
 * Features:
 * - Automated trading strategy code generation
 * - AI-driven parameter optimization
 * - Dynamic strategy modification based on market conditions
 * - AI code review and optimization suggestions
 * - Automated backtesting with AI-generated strategies
 * - AI-powered risk management code generation
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { OllamaManager, AIAnalysisRequest, AIAnalysisResponse } from './ollama-manager';
import { SystemMonitor } from '@/infrastructure/system-monitor';

/**
 * Interface for strategy generation request
 */
interface StrategyGenerationRequest {
  strategyType: 'momentum' | 'mean_reversion' | 'breakout' | 'scalping' | 'swing' | 'arbitrage';
  marketConditions: {
    volatility: 'LOW' | 'MEDIUM' | 'HIGH';
    trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    volume: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  riskProfile: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  symbols: string[];
  constraints: {
    maxDrawdown: number;
    maxPositionSize: number;
    minWinRate: number;
    maxTrades: number;
  };
  customRequirements?: string[];
}

/**
 * Interface for generated strategy
 */
interface GeneratedStrategy {
  id: string;
  name: string;
  description: string;
  code: string;
  parameters: Record<string, any>;
  riskManagement: {
    stopLoss: number;
    takeProfit: number;
    positionSizing: string;
    maxDrawdown: number;
  };
  backtestResults?: {
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalTrades: number;
  };
  metadata: {
    generatedAt: Date;
    modelUsed: string;
    optimizationScore: number;
    complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

/**
 * Interface for strategy optimization request
 */
interface StrategyOptimizationRequest {
  strategyId: string;
  currentCode: string;
  performanceMetrics: {
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  marketData: any[];
  optimizationGoals: {
    improveWinRate?: boolean;
    reduceDraw down?: boolean;
    increaseProfit?: boolean;
    reduceRisk?: boolean;
  };
}

/**
 * Interface for code review result
 */
interface CodeReviewResult {
  overallScore: number; // 0-100
  issues: Array<{
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    type: 'PERFORMANCE' | 'SECURITY' | 'LOGIC' | 'STYLE';
    description: string;
    suggestion: string;
    lineNumber?: number;
  }>;
  optimizations: Array<{
    type: 'PERFORMANCE' | 'READABILITY' | 'MAINTAINABILITY';
    description: string;
    suggestedCode: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    factors: string[];
    mitigations: string[];
  };
}

/**
 * AI Strategy Optimizer using CodeLlama 7B
 */
export class AIStrategyOptimizer extends EventEmitter {
  private ollamaManager: OllamaManager;
  private systemMonitor: SystemMonitor;
  private isInitialized: boolean = false;
  private generatedStrategies: Map<string, GeneratedStrategy> = new Map();
  private optimizationHistory: Map<string, any[]> = new Map();

  // Strategy templates for different types
  private strategyTemplates = {
    momentum: {
      description: 'Momentum-based strategy that follows strong price movements',
      baseCode: `
class MomentumStrategy:
    def __init__(self, lookback_period=14, momentum_threshold=0.02):
        self.lookback_period = lookback_period
        self.momentum_threshold = momentum_threshold
        
    def calculate_momentum(self, prices):
        if len(prices) < self.lookback_period:
            return 0
        return (prices[-1] - prices[-self.lookback_period]) / prices[-self.lookback_period]
    
    def generate_signal(self, market_data):
        momentum = self.calculate_momentum(market_data['close'])
        if momentum > self.momentum_threshold:
            return 'BUY'
        elif momentum < -self.momentum_threshold:
            return 'SELL'
        return 'HOLD'
      `
    },
    mean_reversion: {
      description: 'Mean reversion strategy that trades against extreme price movements',
      baseCode: `
class MeanReversionStrategy:
    def __init__(self, lookback_period=20, std_dev_threshold=2.0):
        self.lookback_period = lookback_period
        self.std_dev_threshold = std_dev_threshold
        
    def calculate_z_score(self, prices):
        if len(prices) < self.lookback_period:
            return 0
        mean = sum(prices[-self.lookback_period:]) / self.lookback_period
        variance = sum([(p - mean) ** 2 for p in prices[-self.lookback_period:]]) / self.lookback_period
        std_dev = variance ** 0.5
        return (prices[-1] - mean) / std_dev if std_dev > 0 else 0
    
    def generate_signal(self, market_data):
        z_score = self.calculate_z_score(market_data['close'])
        if z_score > self.std_dev_threshold:
            return 'SELL'
        elif z_score < -self.std_dev_threshold:
            return 'BUY'
        return 'HOLD'
      `
    }
  };

  constructor(ollamaManager: OllamaManager, systemMonitor: SystemMonitor) {
    super();
    this.ollamaManager = ollamaManager;
    this.systemMonitor = systemMonitor;

    logger.info('🤖 AI Strategy Optimizer initialized');
  }

  /**
   * Initialize the strategy optimizer
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing AI Strategy Optimizer...');

      // Ensure Ollama manager is available
      if (!this.ollamaManager) {
        throw new Error('Ollama Manager is required');
      }

      // Test CodeLlama availability
      await this.testCodeLlamaAvailability();

      // Load existing strategies if available
      await this.loadExistingStrategies();

      this.isInitialized = true;
      logger.info('✅ AI Strategy Optimizer initialized successfully');

      this.emit('initialized');

    } catch (error) {
      logger.error('❌ Failed to initialize AI Strategy Optimizer:', error);
      throw new Error(`Strategy Optimizer initialization failed: ${error.message}`);
    }
  }

  /**
   * Test CodeLlama model availability
   */
  private async testCodeLlamaAvailability(): Promise<void> {
    try {
      logger.info('🧪 Testing CodeLlama availability...');

      const testRequest: AIAnalysisRequest = {
        prompt: 'Generate a simple Python function that calculates moving average. Respond with just the code.',
        modelType: 'code',
        priority: 'medium',
        maxTokens: 200
      };

      const response = await this.ollamaManager.generateAnalysis(testRequest);
      
      if (response.content.includes('def') || response.content.includes('function')) {
        logger.info('✅ CodeLlama is available and responding');
      } else {
        logger.warn('⚠️ CodeLlama response may be limited');
      }

    } catch (error) {
      logger.error('❌ CodeLlama test failed:', error);
      throw new Error('CodeLlama model is not available for strategy optimization');
    }
  }

  /**
   * Generate a new trading strategy using AI
   */
  public async generateStrategy(request: StrategyGenerationRequest): Promise<GeneratedStrategy> {
    try {
      logger.info(`🤖 Generating ${request.strategyType} strategy...`);

      const startTime = Date.now();

      // Build strategy generation prompt
      const prompt = this.buildStrategyGenerationPrompt(request);

      // Generate strategy code using CodeLlama
      const codeResponse = await this.ollamaManager.generateAnalysis({
        prompt,
        modelType: 'code',
        priority: 'high',
        maxTokens: 2048,
        temperature: 0.3
      });

      // Extract and clean the generated code
      const generatedCode = this.extractAndCleanCode(codeResponse.content);

      // Generate strategy parameters
      const parameters = await this.generateStrategyParameters(request, generatedCode);

      // Generate risk management rules
      const riskManagement = await this.generateRiskManagement(request);

      // Create strategy object
      const strategy: GeneratedStrategy = {
        id: this.generateStrategyId(),
        name: this.generateStrategyName(request),
        description: this.generateStrategyDescription(request),
        code: generatedCode,
        parameters,
        riskManagement,
        metadata: {
          generatedAt: new Date(),
          modelUsed: codeResponse.modelUsed,
          optimizationScore: 0, // Will be calculated after backtesting
          complexity: this.assessCodeComplexity(generatedCode)
        }
      };

      // Store the generated strategy
      this.generatedStrategies.set(strategy.id, strategy);

      const processingTime = Date.now() - startTime;
      logger.info(`✅ Strategy generated: ${strategy.name} (${processingTime}ms)`);

      this.emit('strategyGenerated', strategy);

      return strategy;

    } catch (error) {
      logger.error('❌ Error generating strategy:', error);
      throw error;
    }
  }

  /**
   * Build strategy generation prompt for CodeLlama
   */
  private buildStrategyGenerationPrompt(request: StrategyGenerationRequest): string {
    const template = this.strategyTemplates[request.strategyType];
    
    return `
Generate a complete Python trading strategy class for ${request.strategyType} trading with the following requirements:

Strategy Type: ${request.strategyType}
Market Conditions: ${JSON.stringify(request.marketConditions)}
Risk Profile: ${request.riskProfile}
Timeframe: ${request.timeframe}
Symbols: ${request.symbols.join(', ')}

Constraints:
- Maximum drawdown: ${request.constraints.maxDrawdown}%
- Maximum position size: ${request.constraints.maxPositionSize}%
- Minimum win rate: ${request.constraints.minWinRate}%
- Maximum trades per day: ${request.constraints.maxTrades}

${request.customRequirements ? `Custom Requirements:\n${request.customRequirements.join('\n')}` : ''}

Base Template:
${template?.baseCode || ''}

Generate a complete, production-ready strategy class that includes:
1. Proper initialization with configurable parameters
2. Signal generation logic optimized for the specified market conditions
3. Position sizing calculations
4. Risk management integration
5. Performance tracking methods
6. Error handling and validation
7. Clear documentation and comments

The code should be efficient, readable, and follow Python best practices.
Focus on the specific strategy type and market conditions provided.

Respond with only the Python code, properly formatted and commented.
    `.trim();
  }

  /**
   * Extract and clean generated code
   */
  private extractAndCleanCode(response: string): string {
    // Remove markdown code blocks if present
    let code = response.replace(/```python\n?/g, '').replace(/```\n?/g, '');
    
    // Remove any explanatory text before or after code
    const lines = code.split('\n');
    let startIndex = 0;
    let endIndex = lines.length - 1;
    
    // Find the start of the class definition
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('class ') || lines[i].trim().startsWith('import ')) {
        startIndex = i;
        break;
      }
    }
    
    // Find the end of the code (last non-empty line with proper indentation)
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim() && (lines[i].startsWith('    ') || lines[i].startsWith('class ') || lines[i].startsWith('def '))) {
        endIndex = i;
        break;
      }
    }
    
    return lines.slice(startIndex, endIndex + 1).join('\n');
  }

  /**
   * Generate strategy parameters using AI
   */
  private async generateStrategyParameters(
    request: StrategyGenerationRequest,
    code: string
  ): Promise<Record<string, any>> {
    try {
      const prompt = `
Analyze this trading strategy code and suggest optimal parameters for ${request.strategyType} trading:

${code}

Market Conditions: ${JSON.stringify(request.marketConditions)}
Risk Profile: ${request.riskProfile}
Timeframe: ${request.timeframe}

Provide optimal parameter values in JSON format. Consider:
1. Market volatility and trend
2. Risk profile requirements
3. Timeframe characteristics
4. Historical performance patterns

Respond with only a JSON object containing parameter names and values.
      `.trim();

      const response = await this.ollamaManager.generateAnalysis({
        prompt,
        modelType: 'code',
        priority: 'medium',
        maxTokens: 500,
        temperature: 0.2
      });

      // Try to parse JSON from response
      try {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        logger.warn('⚠️ Could not parse AI-generated parameters, using defaults');
      }

      // Fallback to default parameters
      return this.getDefaultParameters(request.strategyType);

    } catch (error) {
      logger.error('❌ Error generating parameters:', error);
      return this.getDefaultParameters(request.strategyType);
    }
  }

  /**
   * Generate risk management rules
   */
  private async generateRiskManagement(request: StrategyGenerationRequest): Promise<GeneratedStrategy['riskManagement']> {
    const baseRisk = {
      stopLoss: 0.02, // 2%
      takeProfit: 0.06, // 6%
      positionSizing: 'fixed_percentage',
      maxDrawdown: request.constraints.maxDrawdown / 100
    };

    // Adjust based on risk profile
    switch (request.riskProfile) {
      case 'CONSERVATIVE':
        return {
          ...baseRisk,
          stopLoss: 0.015, // 1.5%
          takeProfit: 0.03, // 3%
          maxDrawdown: Math.min(baseRisk.maxDrawdown, 0.05) // Max 5%
        };
      case 'AGGRESSIVE':
        return {
          ...baseRisk,
          stopLoss: 0.03, // 3%
          takeProfit: 0.09, // 9%
          maxDrawdown: Math.min(baseRisk.maxDrawdown, 0.15) // Max 15%
        };
      default:
        return baseRisk;
    }
  }

  /**
   * Optimize existing strategy using AI
   */
  public async optimizeStrategy(request: StrategyOptimizationRequest): Promise<GeneratedStrategy> {
    try {
      logger.info(`🔧 Optimizing strategy ${request.strategyId}...`);

      const existingStrategy = this.generatedStrategies.get(request.strategyId);
      if (!existingStrategy) {
        throw new Error(`Strategy ${request.strategyId} not found`);
      }

      // Build optimization prompt
      const prompt = this.buildOptimizationPrompt(request);

      // Generate optimized code
      const optimizedResponse = await this.ollamaManager.generateAnalysis({
        prompt,
        modelType: 'code',
        priority: 'high',
        maxTokens: 2048,
        temperature: 0.2
      });

      // Extract optimized code
      const optimizedCode = this.extractAndCleanCode(optimizedResponse.content);

      // Create optimized strategy
      const optimizedStrategy: GeneratedStrategy = {
        ...existingStrategy,
        id: this.generateStrategyId(),
        name: `${existingStrategy.name} (Optimized)`,
        code: optimizedCode,
        metadata: {
          ...existingStrategy.metadata,
          generatedAt: new Date(),
          modelUsed: optimizedResponse.modelUsed,
          complexity: this.assessCodeComplexity(optimizedCode)
        }
      };

      // Store optimized strategy
      this.generatedStrategies.set(optimizedStrategy.id, optimizedStrategy);

      // Record optimization history
      this.recordOptimization(request.strategyId, optimizedStrategy.id, request.performanceMetrics);

      logger.info(`✅ Strategy optimized: ${optimizedStrategy.name}`);

      this.emit('strategyOptimized', optimizedStrategy);

      return optimizedStrategy;

    } catch (error) {
      logger.error('❌ Error optimizing strategy:', error);
      throw error;
    }
  }

  /**
   * Build optimization prompt
   */
  private buildOptimizationPrompt(request: StrategyOptimizationRequest): string {
    return `
Optimize this trading strategy code to improve performance:

Current Code:
${request.currentCode}

Current Performance Metrics:
- Win Rate: ${request.performanceMetrics.winRate}%
- Profit Factor: ${request.performanceMetrics.profitFactor}
- Sharpe Ratio: ${request.performanceMetrics.sharpeRatio}
- Max Drawdown: ${request.performanceMetrics.maxDrawdown}%

Optimization Goals:
${Object.entries(request.optimizationGoals).filter(([_, enabled]) => enabled).map(([goal, _]) => `- ${goal}`).join('\n')}

Provide an optimized version of the code that:
1. Addresses the performance issues identified
2. Implements improvements for the specified goals
3. Maintains code readability and maintainability
4. Adds better error handling and validation
5. Includes performance optimizations
6. Adds adaptive parameters based on market conditions

Respond with only the optimized Python code, properly formatted and commented.
    `.trim();
  }

  /**
   * Perform AI code review
   */
  public async reviewStrategyCode(strategyId: string): Promise<CodeReviewResult> {
    try {
      logger.info(`🔍 Reviewing strategy code: ${strategyId}...`);

      const strategy = this.generatedStrategies.get(strategyId);
      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }

      // Build code review prompt
      const prompt = `
Perform a comprehensive code review of this trading strategy:

${strategy.code}

Analyze the code for:
1. Performance issues and optimizations
2. Security vulnerabilities
3. Logic errors or edge cases
4. Code style and readability
5. Risk management implementation
6. Error handling completeness

Provide detailed feedback in the following format:
OVERALL_SCORE: [0-100]

ISSUES:
- SEVERITY: [LOW/MEDIUM/HIGH/CRITICAL]
- TYPE: [PERFORMANCE/SECURITY/LOGIC/STYLE]
- DESCRIPTION: [Issue description]
- SUGGESTION: [How to fix]
- LINE: [Line number if applicable]

OPTIMIZATIONS:
- TYPE: [PERFORMANCE/READABILITY/MAINTAINABILITY]
- DESCRIPTION: [Optimization description]
- IMPACT: [LOW/MEDIUM/HIGH]
- CODE: [Suggested code improvement]

RISK_ASSESSMENT:
- LEVEL: [LOW/MEDIUM/HIGH/CRITICAL]
- FACTORS: [Risk factors identified]
- MITIGATIONS: [Suggested mitigations]
      `.trim();

      const response = await this.ollamaManager.generateAnalysis({
        prompt,
        modelType: 'code',
        priority: 'medium',
        maxTokens: 1500,
        temperature: 0.1
      });

      // Parse the review response
      const reviewResult = this.parseCodeReviewResponse(response.content);

      logger.info(`✅ Code review completed: ${reviewResult.overallScore}/100`);

      this.emit('codeReviewed', { strategyId, review: reviewResult });

      return reviewResult;

    } catch (error) {
      logger.error('❌ Error reviewing strategy code:', error);
      throw error;
    }
  }

  /**
   * Parse code review response from AI
   */
  private parseCodeReviewResponse(response: string): CodeReviewResult {
    // Default result structure
    const result: CodeReviewResult = {
      overallScore: 75,
      issues: [],
      optimizations: [],
      riskAssessment: {
        level: 'MEDIUM',
        factors: [],
        mitigations: []
      }
    };

    try {
      // Extract overall score
      const scoreMatch = response.match(/OVERALL_SCORE:\s*(\d+)/i);
      if (scoreMatch) {
        result.overallScore = parseInt(scoreMatch[1]);
      }

      // Extract issues (simplified parsing)
      const issuesSection = response.match(/ISSUES:([\s\S]*?)(?:OPTIMIZATIONS:|RISK_ASSESSMENT:|$)/i);
      if (issuesSection) {
        const issueLines = issuesSection[1].split('\n').filter(line => line.trim());
        // Parse individual issues (simplified)
        result.issues = issueLines.slice(0, 5).map((line, index) => ({
          severity: 'MEDIUM' as const,
          type: 'LOGIC' as const,
          description: line.trim(),
          suggestion: 'Review and improve this aspect',
          lineNumber: index + 1
        }));
      }

      // Extract risk assessment level
      const riskMatch = response.match(/LEVEL:\s*(\w+)/i);
      if (riskMatch) {
        result.riskAssessment.level = riskMatch[1].toUpperCase() as any;
      }

    } catch (parseError) {
      logger.warn('⚠️ Could not fully parse code review response');
    }

    return result;
  }

  /**
   * Generate strategy backtesting code
   */
  public async generateBacktestCode(strategyId: string): Promise<string> {
    try {
      logger.info(`📊 Generating backtest code for strategy: ${strategyId}...`);

      const strategy = this.generatedStrategies.get(strategyId);
      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }

      const prompt = `
Generate a comprehensive backtesting framework for this trading strategy:

${strategy.code}

The backtesting code should include:
1. Data loading and preprocessing
2. Strategy execution simulation
3. Performance metrics calculation (win rate, profit factor, Sharpe ratio, max drawdown)
4. Trade logging and analysis
5. Visualization of results
6. Risk metrics calculation
7. Statistical significance testing

Provide complete Python code that can be run independently to backtest the strategy.
Include proper error handling and data validation.

Respond with only the Python backtesting code.
      `.trim();

      const response = await this.ollamaManager.generateAnalysis({
        prompt,
        modelType: 'code',
        priority: 'medium',
        maxTokens: 2048,
        temperature: 0.2
      });

      const backtestCode = this.extractAndCleanCode(response.content);

      logger.info(`✅ Backtest code generated for strategy: ${strategyId}`);

      this.emit('backtestCodeGenerated', { strategyId, code: backtestCode });

      return backtestCode;

    } catch (error) {
      logger.error('❌ Error generating backtest code:', error);
      throw error;
    }
  }

  /**
   * Generate utility functions and helpers
   */
  private generateStrategyId(): string {
    return `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateStrategyName(request: StrategyGenerationRequest): string {
    const typeNames = {
      momentum: 'Momentum Trader',
      mean_reversion: 'Mean Reversion',
      breakout: 'Breakout Hunter',
      scalping: 'Scalping Bot',
      swing: 'Swing Trader',
      arbitrage: 'Arbitrage Finder'
    };
    
    return `${typeNames[request.strategyType]} (${request.riskProfile})`;
  }

  private generateStrategyDescription(request: StrategyGenerationRequest): string {
    return `AI-generated ${request.strategyType} strategy optimized for ${request.riskProfile.toLowerCase()} risk profile and ${request.timeframe} timeframe trading.`;
  }

  private assessCodeComplexity(code: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const lines = code.split('\n').filter(line => line.trim());
    const methods = (code.match(/def /g) || []).length;
    const conditions = (code.match(/if |elif |while |for /g) || []).length;
    
    const complexityScore = lines.length + (methods * 5) + (conditions * 2);
    
    if (complexityScore < 50) return 'LOW';
    if (complexityScore < 150) return 'MEDIUM';
    return 'HIGH';
  }

  private getDefaultParameters(strategyType: string): Record<string, any> {
    const defaults = {
      momentum: {
        lookback_period: 14,
        momentum_threshold: 0.02,
        volume_threshold: 1.5
      },
      mean_reversion: {
        lookback_period: 20,
        std_dev_threshold: 2.0,
        mean_reversion_period: 5
      },
      breakout: {
        lookback_period: 20,
        breakout_threshold: 0.03,
        volume_confirmation: true
      }
    };
    
    return defaults[strategyType] || { period: 14, threshold: 0.02 };
  }

  private recordOptimization(originalId: string, optimizedId: string, metrics: any): void {
    if (!this.optimizationHistory.has(originalId)) {
      this.optimizationHistory.set(originalId, []);
    }
    
    this.optimizationHistory.get(originalId)!.push({
      optimizedId,
      timestamp: new Date(),
      originalMetrics: metrics
    });
  }

  /**
   * Load existing strategies from storage
   */
  private async loadExistingStrategies(): Promise<void> {
    try {
      // In production, this would load from persistent storage
      logger.info('📂 Existing strategies loaded (placeholder)');
    } catch (error) {
      logger.warn('⚠️ Could not load existing strategies:', error);
    }
  }

  /**
   * Get all generated strategies
   */
  public getGeneratedStrategies(): GeneratedStrategy[] {
    return Array.from(this.generatedStrategies.values());
  }

  /**
   * Get strategy by ID
   */
  public getStrategy(strategyId: string): GeneratedStrategy | undefined {
    return this.generatedStrategies.get(strategyId);
  }

  /**
   * Get optimization history for a strategy
   */
  public getOptimizationHistory(strategyId: string): any[] {
    return this.optimizationHistory.get(strategyId) || [];
  }

  /**
   * Delete a strategy
   */
  public deleteStrategy(strategyId: string): boolean {
    const deleted = this.generatedStrategies.delete(strategyId);
    if (deleted) {
      this.optimizationHistory.delete(strategyId);
      this.emit('strategyDeleted', { strategyId });
    }
    return deleted;
  }

  /**
   * Shutdown the strategy optimizer
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('🛑 Shutting down AI Strategy Optimizer...');
      
      // Save strategies if needed
      // await this.saveStrategies();
      
      this.isInitialized = false;
      
      logger.info('✅ AI Strategy Optimizer shutdown completed');
      
    } catch (error) {
      logger.error('❌ Error during Strategy Optimizer shutdown:', error);
      throw error;
    }
  }
}

// Export types
export type {
  StrategyGenerationRequest,
  GeneratedStrategy,
  StrategyOptimizationRequest,
  CodeReviewResult
};