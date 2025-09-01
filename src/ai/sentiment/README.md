# Sentiment Analysis Engine

## Overview

The Sentiment Analysis Engine is a comprehensive system for analyzing cryptocurrency market sentiment from multiple sources including Twitter, Reddit, and news outlets. It provides real-time sentiment scoring, trend analysis, and trading recommendations based on social media and news sentiment.

## Features

### 🐦 Twitter Sentiment Monitoring
- Real-time monitoring of crypto-related hashtags
- Influential account tracking (Elon Musk, Vitalik Buterin, CZ Binance, etc.)
- Volume-weighted sentiment scoring
- Engagement-based signal strength calculation

### 📱 Reddit Sentiment Analysis
- Multi-subreddit monitoring (r/cryptocurrency, r/Bitcoin, r/ethereum, etc.)
- Post and comment sentiment analysis
- Upvote/downvote ratio consideration
- Community discussion quality assessment

### 📰 News Sentiment Processing
- Multiple news source integration (CoinDesk, CoinTelegraph, Decrypt, etc.)
- NLP-based article sentiment analysis
- Source reliability weighting
- Breaking news impact assessment

### 📊 Aggregated Sentiment Scoring
- Weighted sentiment aggregation (-100 to +100 scale)
- Multi-source confidence scoring
- Historical trend analysis
- Position sizing recommendations

## Architecture

```
SentimentAnalysisEngine
├── TwitterSentimentMonitor
├── RedditSentimentMonitor
├── NewsSentimentMonitor
└── Aggregation & Analysis
    ├── Weighted Scoring
    ├── Trend Detection
    ├── Alert Generation
    └── Trading Recommendations
```

## Usage

### Basic Setup

```typescript
import { SentimentAnalysisEngine } from './ai/sentiment';
import { createSentimentConfig } from './config/sentiment-config';

// Create configuration
const config = createSentimentConfig();

// Initialize engine
const sentimentEngine = new SentimentAnalysisEngine(config);

// Start monitoring (5-minute intervals)
await sentimentEngine.startEngine(5);
```

### Getting Current Sentiment

```typescript
// Get aggregated sentiment
const sentiment = await sentimentEngine.getCurrentSentiment();
console.log(`Sentiment: ${sentiment.aggregatedScore} (${sentiment.confidence}% confidence)`);

// Generate comprehensive report
const report = await sentimentEngine.generateSentimentReport();
console.log('Trends:', report.trends);
console.log('Alerts:', report.alerts);
console.log('Recommendations:', report.recommendations);
```

### Position Sizing Integration

```typescript
// Adjust position size based on sentiment
const baseSize = 2.0; // 2% risk per trade
const adjustedSize = sentimentEngine.calculateSentimentPositionAdjustment(baseSize);
console.log(`Adjusted position size: ${adjustedSize}%`);
```

### Trading Decision Integration

```typescript
import { integrateSentimentWithTrading } from './ai/sentiment/example-usage';

const decision = integrateSentimentWithTrading(
  sentiment.aggregatedScore,
  sentiment.confidence,
  'BUY' // Technical signal
);

console.log(`Final decision: ${decision.finalDecision}`);
console.log(`Reasoning: ${decision.reasoning}`);
console.log(`Position multiplier: ${decision.positionSizeMultiplier}`);
```

## Configuration

### Environment Variables

```bash
# Twitter API
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
TWITTER_BEARER_TOKEN=your_bearer_token

# Reddit API
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password

# News APIs (optional)
NEWS_API_KEY=your_news_api_key
CRYPTOPANIC_API_KEY=your_cryptopanic_key

# Sentiment Weights
SENTIMENT_TWITTER_WEIGHT=0.4
SENTIMENT_REDDIT_WEIGHT=0.35
SENTIMENT_NEWS_WEIGHT=0.25

# Alert Thresholds
SENTIMENT_EXTREME_POSITIVE=70
SENTIMENT_EXTREME_NEGATIVE=-70
SENTIMENT_RAPID_CHANGE=15
SENTIMENT_VOLUME_SPIKE=500
```

### Monitored Sources

#### Twitter
- Crypto hashtags: #Bitcoin, #BTC, #Ethereum, #ETH, #crypto, etc.
- Influential accounts: @elonmusk, @VitalikButerin, @cz_binance, @saylor, @APompliano

#### Reddit
- Subreddits: r/cryptocurrency, r/Bitcoin, r/ethereum, r/CryptoCurrency, r/ethtrader, etc.

#### News Sources
- CoinDesk
- CoinTelegraph
- Decrypt
- The Block
- Bitcoin Magazine

## Sentiment Scoring

### Scale: -100 to +100
- **+70 to +100**: Extremely Positive (Strong Buy Signal)
- **+30 to +69**: Positive (Bullish Sentiment)
- **-29 to +29**: Neutral (No Clear Direction)
- **-30 to -69**: Negative (Bearish Sentiment)
- **-70 to -100**: Extremely Negative (Strong Sell Signal)

### Confidence Levels
- **80-100%**: High Confidence (Act on sentiment)
- **60-79%**: Medium Confidence (Consider sentiment)
- **40-59%**: Low Confidence (Monitor only)
- **0-39%**: Very Low Confidence (Ignore sentiment)

## Alert Types

### Extreme Sentiment Alerts
- Triggered when sentiment exceeds ±70
- High severity for trading decisions
- Potential reversal indicators

### Rapid Change Alerts
- Triggered when sentiment changes >15 points quickly
- Medium severity for trend shifts
- Market momentum indicators

### Volume Spike Alerts
- Triggered when activity volume exceeds thresholds
- Medium severity for attention spikes
- Breaking news or viral content indicators

## Trading Integration

### Position Sizing Adjustments
- **Positive Sentiment**: Increase position size up to 50%
- **Negative Sentiment**: Decrease position size up to 30%
- **Confidence Scaling**: Adjustments scaled by confidence level
- **Safety Bounds**: 0.5x to 2.0x multiplier limits

### Signal Reinforcement
- **Aligned Signals**: Sentiment reinforces technical analysis
- **Conflicting Signals**: Sentiment may override weak technical signals
- **Extreme Sentiment**: Can override neutral technical signals

## Performance Monitoring

### Metrics Tracked
- Sentiment accuracy vs. price movements
- Source reliability scores
- Alert effectiveness
- Position sizing impact

### Historical Analysis
- 24-hour sentiment history
- Trend pattern recognition
- Correlation with price movements
- Predictive accuracy assessment

## Security & Privacy

### Data Protection
- No storage of personal social media data
- Aggregated sentiment only
- Secure API credential handling
- Rate limiting compliance

### API Security
- Encrypted credential storage
- Secure tunnel routing
- Request authentication
- Error handling without data exposure

## Testing

### Unit Tests
```bash
npm test -- --testPathPattern=sentiment
```

### Integration Tests
```bash
npx tsx src/tests/ai/sentiment/simple-test.ts
```

### Manual Testing
```bash
npx tsx src/ai/sentiment/example-usage.ts
```

## Troubleshooting

### Common Issues

1. **API Rate Limits**
   - Reduce monitoring frequency
   - Check API quotas
   - Implement exponential backoff

2. **Low Confidence Scores**
   - Verify API credentials
   - Check data source availability
   - Review weight configurations

3. **Missing Sentiment Data**
   - Confirm internet connectivity
   - Validate API endpoints
   - Check service status

### Debug Mode
```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';
```

## Future Enhancements

### Planned Features
- Machine learning sentiment models
- Additional social media sources (Discord, Telegram)
- Real-time news feed integration
- Sentiment-based automated trading
- Advanced NLP processing
- Multi-language sentiment analysis

### Performance Optimizations
- Caching mechanisms
- Parallel processing
- Database storage
- Real-time streaming
- Edge computing deployment

## Contributing

### Development Setup
1. Install dependencies: `npm install`
2. Configure environment variables
3. Run tests: `npm test`
4. Start development: `npm run dev`

### Code Standards
- TypeScript strict mode
- Comprehensive error handling
- Security-first approach
- Performance optimization
- Extensive testing coverage

## License

Proprietary - AI Crypto Trading System