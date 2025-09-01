# Sentiment Analysis API

## Overview

The Sentiment Analysis API provides endpoints for monitoring and analyzing cryptocurrency sentiment from Twitter, Reddit, news sources, and other social media platforms.

## Endpoints

### Get Sentiment Overview

```http
GET /api/v1/sentiment/overview
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overallSentiment": 72,
    "trend": "BULLISH",
    "confidence": 0.85,
    "sources": {
      "twitter": {
        "sentiment": 75,
        "volume": 15420,
        "influence": 0.4
      },
      "reddit": {
        "sentiment": 68,
        "volume": 8930,
        "influence": 0.3
      },
      "news": {
        "sentiment": 78,
        "volume": 156,
        "influence": 0.3
      }
    },
    "lastUpdated": "2025-01-01T12:00:00Z"
  }
}
```

### Get Twitter Sentiment

```http
GET /api/v1/sentiment/twitter
```

**Query Parameters:**
- `symbol` (optional): Filter by cryptocurrency symbol
- `hashtags` (optional): Comma-separated list of hashtags
- `timeframe` (optional): Time range (1h, 4h, 1d, 7d)

**Response:**
```json
{
  "success": true,
  "data": {
    "sentiment": {
      "score": 75,
      "trend": "INCREASING",
      "confidence": 0.82
    },
    "metrics": {
      "totalTweets": 15420,
      "positiveTweets": 9250,
      "negativeTweets": 3080,
      "neutralTweets": 3090,
      "retweetVolume": 45600,
      "influencerMentions": 23
    },
    "topHashtags": [
      "#Bitcoin",
      "#BTC",
      "#Crypto",
      "#HODL",
      "#ToTheMoon"
    ],
    "influentialAccounts": [
      {
        "username": "@crypto_analyst",
        "followers": 250000,
        "sentiment": 85,
        "influence": 0.15
      }
    ],
    "sentimentHistory": [
      {
        "timestamp": "2025-01-01T11:00:00Z",
        "score": 72
      },
      {
        "timestamp": "2025-01-01T12:00:00Z",
        "score": 75
      }
    ]
  }
}
```

### Get Reddit Sentiment

```http
GET /api/v1/sentiment/reddit
```

**Query Parameters:**
- `subreddits` (optional): Comma-separated list of subreddits
- `timeframe` (optional): Time range (1h, 4h, 1d, 7d)
- `minScore` (optional): Minimum post score threshold

**Response:**
```json
{
  "success": true,
  "data": {
    "sentiment": {
      "score": 68,
      "trend": "STABLE",
      "confidence": 0.78
    },
    "subredditBreakdown": {
      "r/cryptocurrency": {
        "sentiment": 70,
        "posts": 156,
        "comments": 2340,
        "avgScore": 45
      },
      "r/bitcoin": {
        "sentiment": 72,
        "posts": 89,
        "comments": 1560,
        "avgScore": 52
      },
      "r/ethereum": {
        "sentiment": 65,
        "posts": 67,
        "comments": 980,
        "avgScore": 38
      }
    },
    "topPosts": [
      {
        "title": "Bitcoin breaks $45k resistance",
        "subreddit": "r/cryptocurrency",
        "score": 1250,
        "sentiment": 85,
        "comments": 234
      }
    ],
    "keyTopics": [
      "price_movement",
      "institutional_adoption",
      "regulatory_news",
      "technical_analysis"
    ]
  }
}
```

### Get News Sentiment

```http
GET /api/v1/sentiment/news
```

**Query Parameters:**
- `sources` (optional): Comma-separated list of news sources
- `category` (optional): News category (market, regulatory, technology)
- `timeframe` (optional): Time range (1h, 4h, 1d, 7d)

**Response:**
```json
{
  "success": true,
  "data": {
    "sentiment": {
      "score": 78,
      "trend": "BULLISH",
      "confidence": 0.91
    },
    "sourceBreakdown": {
      "coindesk": {
        "sentiment": 80,
        "articles": 12,
        "influence": 0.35
      },
      "cointelegraph": {
        "sentiment": 75,
        "articles": 8,
        "influence": 0.25
      },
      "decrypt": {
        "sentiment": 82,
        "articles": 6,
        "influence": 0.20
      }
    },
    "topArticles": [
      {
        "title": "Major Bank Announces Bitcoin Treasury Strategy",
        "source": "coindesk",
        "sentiment": 92,
        "impact": "HIGH",
        "publishedAt": "2025-01-01T10:30:00Z"
      }
    ],
    "categories": {
      "market": 75,
      "regulatory": 82,
      "technology": 73,
      "adoption": 85
    }
  }
}
```

### Get Sentiment Alerts

```http
GET /api/v1/sentiment/alerts
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeAlerts": [
      {
        "id": "alert_001",
        "type": "SENTIMENT_SPIKE",
        "symbol": "BTC",
        "message": "Bitcoin sentiment increased by 15 points in the last hour",
        "severity": "MEDIUM",
        "timestamp": "2025-01-01T12:00:00Z",
        "source": "twitter",
        "currentSentiment": 85,
        "previousSentiment": 70
      }
    ],
    "alertHistory": [
      {
        "id": "alert_002",
        "type": "NEGATIVE_NEWS",
        "symbol": "ETH",
        "message": "Negative regulatory news affecting Ethereum sentiment",
        "severity": "HIGH",
        "timestamp": "2025-01-01T09:00:00Z",
        "resolved": true
      }
    ]
  }
}
```

### Create Sentiment Alert

```http
POST /api/v1/sentiment/alerts
```

**Request Body:**
```json
{
  "type": "SENTIMENT_THRESHOLD",
  "symbol": "BTC",
  "threshold": 80,
  "direction": "ABOVE",
  "sources": ["twitter", "reddit", "news"],
  "notificationChannels": ["email", "telegram"]
}
```

### Get Sentiment Correlation

```http
GET /api/v1/sentiment/correlation
```

**Query Parameters:**
- `symbol` (required): Cryptocurrency symbol
- `timeframe` (optional): Time range for correlation analysis

**Response:**
```json
{
  "success": true,
  "data": {
    "priceCorrelation": {
      "twitter": 0.72,
      "reddit": 0.65,
      "news": 0.81,
      "overall": 0.74
    },
    "volumeCorrelation": {
      "twitter": 0.58,
      "reddit": 0.43,
      "news": 0.67,
      "overall": 0.56
    },
    "leadingIndicators": [
      {
        "source": "news",
        "leadTime": 120,
        "correlation": 0.81
      },
      {
        "source": "twitter",
        "leadTime": 45,
        "correlation": 0.72
      }
    ]
  }
}
```

### Get Sentiment Trends

```http
GET /api/v1/sentiment/trends
```

**Query Parameters:**
- `timeframe` (optional): Time range (1d, 7d, 30d)
- `granularity` (optional): Data granularity (1h, 4h, 1d)

**Response:**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "timestamp": "2025-01-01T00:00:00Z",
        "overall": 65,
        "twitter": 68,
        "reddit": 62,
        "news": 70
      },
      {
        "timestamp": "2025-01-01T04:00:00Z",
        "overall": 72,
        "twitter": 75,
        "reddit": 68,
        "news": 78
      }
    ],
    "statistics": {
      "average": 68.5,
      "volatility": 8.2,
      "trend": "INCREASING",
      "momentum": 0.15
    }
  }
}
```

## Sentiment Scoring

### Scoring Scale

Sentiment scores range from -100 to +100:
- **-100 to -50**: Extremely Bearish
- **-49 to -20**: Bearish
- **-19 to +19**: Neutral
- **+20 to +49**: Bullish
- **+50 to +100**: Extremely Bullish

### Weighting Factors

Different sources have different influence weights:
- **News Sources**: 40% (highest credibility)
- **Twitter**: 35% (real-time sentiment)
- **Reddit**: 25% (community discussion)

### Confidence Calculation

Confidence is calculated based on:
- Volume of data points
- Source reliability
- Sentiment consistency
- Historical accuracy

## WebSocket Events

### Real-time Sentiment Updates

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/sentiment');

ws.onmessage = (event) => {
  const sentiment = JSON.parse(event.data);
  console.log('Sentiment update:', sentiment);
  // Handle sentiment update
};
```

### Sentiment Alerts

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/sentiment-alerts');

ws.onmessage = (event) => {
  const alert = JSON.parse(event.data);
  console.log('Sentiment alert:', alert);
  // Handle sentiment alert
};
```

## Data Sources

### Twitter Integration
- Real-time tweet monitoring
- Hashtag tracking
- Influencer account monitoring
- Retweet and engagement analysis

### Reddit Integration
- Subreddit monitoring (r/cryptocurrency, r/bitcoin, r/ethereum)
- Post and comment sentiment analysis
- Score-weighted sentiment calculation
- Topic trend identification

### News Sources
- CoinDesk, CoinTelegraph, Decrypt
- Real-time article processing
- NLP-based sentiment extraction
- Impact scoring based on source credibility

## Error Codes

| Code | Description |
|------|-------------|
| `SENT_001` | Invalid sentiment source |
| `SENT_002` | API rate limit exceeded |
| `SENT_003` | Sentiment calculation failed |
| `SENT_004` | Data source unavailable |
| `SENT_005` | Invalid alert configuration |
| `SENT_006` | Correlation analysis failed |
| `SENT_007` | Insufficient data for analysis |