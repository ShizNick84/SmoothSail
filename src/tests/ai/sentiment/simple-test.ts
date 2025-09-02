/**
 * Simple Sentiment Analysis Test
 * Basic test to verify sentiment analysis components work
 */

import { SentimentAnalysisEngine } from '../../../ai/sentiment/sentiment-engine';
import { SentimentConfig } from '../../../ai/sentiment/types';

// Simple test without external dependencies
async function testSentimentEngine() {
  console.log('Testing Sentiment Analysis Engine...');
  
  // Mock configuration
  const mockConfig: SentimentConfig = {
    twitter: {
      apiKey: 'test_key',
      apiSecret: 'test_secret',
      accessToken: 'test_token',
      accessTokenSecret: 'test_token_secret',
      bearerToken: 'test_bearer'
    },
    reddit: {
      clientId: 'test_client_id',
      clientSecret: 'test_client_secret',
      username: 'test_user',
      password: 'test_pass',
      userAgent: 'test_agent'
    },
    news: {
      sources: ['coindesk'],
      apiKeys: {},
      updateInterval: 15
    },
    weights: {
      twitter: 0.4,
      reddit: 0.35,
      news: 0.25
    },
    thresholds: {
      extremePositive: 70,
      extremeNegative: -70,
      rapidChange: 15,
      volumeSpike: 500
    }
  };

  try {
    // Create engine instance
    const engine = new SentimentAnalysisEngine(mockConfig);
    console.log('✓ Sentiment engine created successfully');

    // Test position sizing adjustment
    const baseSize = 2.0;
    const adjustedSize = engine.calculateSentimentPositionAdjustment(baseSize);
    console.log(`✓ Position sizing adjustment: ${baseSize}% -> ${adjustedSize}%`);

    // Test engine status
    const status = engine.getStatus();
    console.log('✓ Engine status retrieved:', {
      isRunning: status.isRunning,
      historySize: status.historySize
    });

    console.log('✓ All sentiment analysis tests passed!');
    return true;
  } catch (error) {
    console.error('✗ Sentiment analysis test failed:', error);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testSentimentEngine()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testSentimentEngine };
