/**
 * Sentiment Analysis Engine Usage Example
 * Demonstrates how to integrate and use the sentiment analysis engine
 */

import { SentimentAnalysisEngine } from './sentiment-engine';
import { createSentimentConfig } from '../../config/sentiment-config';
import { logger } from '../../core/logging/logger';

/**
 * Example usage of the sentiment analysis engine
 */
export async function exampleSentimentAnalysis(): Promise<void> {
  try {
    logger.info('Starting sentiment analysis example');

    // Create configuration
    const config = createSentimentConfig();
    
    // Initialize sentiment engine
    const sentimentEngine = new SentimentAnalysisEngine(config);
    
    // Start the engine (this would run continuously in production)
    await sentimentEngine.startEngine(5); // 5-minute intervals
    
    // Wait a bit for initial data collection
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Get current sentiment
    const currentSentiment = await sentimentEngine.getCurrentSentiment();
    logger.info('Current sentiment:', {
      score: currentSentiment.aggregatedScore,
      confidence: currentSentiment.confidence,
      sources: currentSentiment.sources.map(s => ({
        source: s.source,
        score: s.score,
        confidence: s.confidence,
        volume: s.volume
      }))
    });
    
    // Generate comprehensive report
    const report = await sentimentEngine.generateSentimentReport();
    logger.info('Sentiment report generated:', {
      overallScore: report.overall.aggregatedScore,
      trendsCount: report.trends.length,
      alertsCount: report.alerts.length,
      recommendationsCount: report.recommendations.length
    });
    
    // Example of position sizing adjustment based on sentiment
    const baseSizePercent = 2.0; // 2% risk per trade
    const adjustedSize = sentimentEngine.calculateSentimentPositionAdjustment(baseSizePercent);
    logger.info('Position sizing adjustment:', {
      baseSize: baseSizePercent,
      adjustedSize: adjustedSize,
      adjustment: ((adjustedSize / baseSizePercent - 1) * 100).toFixed(2) + '%'
    });
    
    // Get sentiment history
    const history = sentimentEngine.getSentimentHistory(1); // Last 1 hour
    logger.info('Sentiment history:', {
      dataPoints: history.length,
      timeSpan: '1 hour',
      latestScore: history.length > 0 ? history[history.length - 1].aggregatedScore : 'N/A'
    });
    
    // Get engine status
    const status = sentimentEngine.getStatus();
    logger.info('Engine status:', status);
    
    // Stop the engine
    sentimentEngine.stopEngine();
    logger.info('Sentiment analysis example completed');
    
  } catch (error) {
    logger.error('Error in sentiment analysis example:', error);
    throw error;
  }
}

/**
 * Example of integrating sentiment analysis with trading decisions
 */
export function integrateSentimentWithTrading(
  sentimentScore: number,
  confidence: number,
  technicalSignal: 'BUY' | 'SELL' | 'HOLD'
): {
  finalDecision: 'BUY' | 'SELL' | 'HOLD';
  reasoning: string;
  positionSizeMultiplier: number;
} {
  let finalDecision = technicalSignal;
  let reasoning = `Technical signal: ${technicalSignal}`;
  let positionSizeMultiplier = 1.0;
  
  // Only consider sentiment if confidence is high enough
  if (confidence > 60) {
    if (sentimentScore > 50 && technicalSignal === 'BUY') {
      // Strong positive sentiment reinforces buy signal
      positionSizeMultiplier = 1.3;
      reasoning += `, Strong positive sentiment (${sentimentScore}) reinforces buy signal`;
    } else if (sentimentScore < -50 && technicalSignal === 'SELL') {
      // Strong negative sentiment reinforces sell signal
      positionSizeMultiplier = 1.3;
      reasoning += `, Strong negative sentiment (${sentimentScore}) reinforces sell signal`;
    } else if (sentimentScore > 70 && technicalSignal === 'HOLD') {
      // Extremely positive sentiment might override hold
      finalDecision = 'BUY';
      positionSizeMultiplier = 1.2;
      reasoning += `, Extremely positive sentiment (${sentimentScore}) overrides hold signal`;
    } else if (sentimentScore < -70 && technicalSignal === 'HOLD') {
      // Extremely negative sentiment might override hold
      finalDecision = 'SELL';
      positionSizeMultiplier = 1.2;
      reasoning += `, Extremely negative sentiment (${sentimentScore}) overrides hold signal`;
    } else if (Math.abs(sentimentScore) > 30) {
      // Moderate sentiment affects position size
      const sentimentMultiplier = 1 + (sentimentScore / 100) * 0.2;
      positionSizeMultiplier = Math.max(0.5, Math.min(1.5, sentimentMultiplier));
      reasoning += `, Sentiment (${sentimentScore}) adjusts position size`;
    }
  } else {
    reasoning += `, Low sentiment confidence (${confidence}%) - relying on technical analysis`;
  }
  
  return {
    finalDecision,
    reasoning,
    positionSizeMultiplier
  };
}

// Export for use in other modules
export { SentimentAnalysisEngine } from './sentiment-engine';
export { createSentimentConfig } from '../../config/sentiment-config';