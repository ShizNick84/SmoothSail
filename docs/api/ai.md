# AI and LLM Integration API

## Overview

The AI API provides endpoints for managing LLM integration, market analysis, decision explanation, and adaptive learning optimized for Intel NUC hardware.

## Endpoints

### Get AI Status

```http
GET /api/v1/ai/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ACTIVE",
    "modelLoaded": true,
    "modelName": "llama-3.2-3b-instruct",
    "hardwareOptimization": "INTEL_NUC_I5_12GB",
    "resourceUsage": {
      "cpu": 45.2,
      "memory": 8192,
      "inference_time": 150
    },
    "performanceMetrics": {
      "accuracy": 0.87,
      "confidence": 0.92,
      "adaptationScore": 0.78
    }
  }
}
```

### Analyze Market Conditions

```http
POST /api/v1/ai/analyze/market
```

**Request Body:**
```json
{
  "symbol": "BTC/USDT",
  "timeframe": "1h",
  "includeNews": true,
  "includeSentiment": true,
  "analysisDepth": "COMPREHENSIVE"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "sentiment": 75,
      "volatility": "MEDIUM",
      "trend": "BULLISH",
      "confidence": 0.85,
      "keyFactors": [
        "Strong institutional buying pressure",
        "Positive regulatory developments",
        "Technical breakout above resistance"
      ],
      "recommendations": [
        "Consider long positions with tight risk management",
        "Monitor for volume confirmation",
        "Watch for potential pullback to support levels"
      ],
      "riskFactors": [
        "High correlation with traditional markets",
        "Upcoming economic data releases"
      ]
    },
    "technicalIndicators": {
      "rsi": 68.5,
      "macd": "BULLISH_CROSSOVER",
      "movingAverages": "ABOVE_20_50_EMA",
      "support": 44500,
      "resistance": 47200
    },
    "timestamp": "2025-01-01T12:00:00Z"
  }
}
```

### Explain Trading Decision

```http
POST /api/v1/ai/explain/decision
```

**Request Body:**
```json
{
  "tradeId": "trade_001",
  "symbol": "BTC/USDT",
  "action": "BUY",
  "quantity": 0.1,
  "price": 45000,
  "strategy": "harmonized",
  "signals": [
    {
      "indicator": "RSI",
      "value": 35,
      "signal": "OVERSOLD"
    },
    {
      "indicator": "MACD",
      "signal": "BULLISH_CROSSOVER"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "explanation": {
      "summary": "BUY signal generated based on oversold RSI conditions and bullish MACD crossover with strong volume confirmation.",
      "reasoning": [
        "RSI at 35 indicates oversold conditions, suggesting potential reversal",
        "MACD bullish crossover confirms upward momentum",
        "Volume spike of 150% above average validates the breakout",
        "Risk-reward ratio of 2.5:1 meets minimum threshold"
      ],
      "confidence": 0.82,
      "riskAssessment": "MODERATE",
      "alternativeScenarios": [
        "If volume fails to sustain, consider reducing position size",
        "Watch for false breakout below 44,800 support"
      ]
    },
    "strategyContribution": {
      "movingAverage": 0.3,
      "rsi": 0.4,
      "macd": 0.2,
      "fibonacci": 0.1
    }
  }
}
```

### Get AI Insights

```http
GET /api/v1/ai/insights
```

**Query Parameters:**
- `symbol` (optional): Filter insights by symbol
- `timeframe` (optional): Time range for insights (1h, 4h, 1d)
- `type` (optional): Type of insights (MARKET, STRATEGY, RISK)

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "id": "insight_001",
        "type": "MARKET_OPPORTUNITY",
        "symbol": "BTC/USDT",
        "title": "Potential Breakout Setup",
        "description": "BTC is forming a bullish flag pattern with decreasing volume, suggesting a potential breakout above 46,000 resistance.",
        "confidence": 0.78,
        "timeframe": "4h",
        "actionable": true,
        "recommendations": [
          "Set buy orders above 46,100 with stop at 45,200",
          "Target first resistance at 47,500"
        ],
        "timestamp": "2025-01-01T12:00:00Z"
      }
    ],
    "marketSummary": {
      "overallSentiment": "BULLISH",
      "volatilityOutlook": "INCREASING",
      "keyEvents": [
        "Federal Reserve meeting next week",
        "Bitcoin ETF approval pending"
      ]
    }
  }
}
```

### Optimize Strategy Parameters

```http
POST /api/v1/ai/optimize/strategy
```

**Request Body:**
```json
{
  "strategy": "moving-average",
  "symbol": "BTC/USDT",
  "timeframe": "1h",
  "optimizationPeriod": "30D",
  "targetMetric": "SHARPE_RATIO",
  "constraints": {
    "maxDrawdown": 0.15,
    "minWinRate": 0.55
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "optimizedParameters": {
      "fastPeriod": 18,
      "slowPeriod": 47,
      "signalPeriod": 9,
      "volumeThreshold": 1.2
    },
    "expectedPerformance": {
      "sharpeRatio": 1.85,
      "winRate": 0.62,
      "maxDrawdown": 0.12,
      "annualizedReturn": 0.28
    },
    "backtestResults": {
      "totalTrades": 156,
      "winningTrades": 97,
      "totalReturn": 0.24,
      "volatility": 0.18
    },
    "confidence": 0.89
  }
}
```

### Get Model Performance

```http
GET /api/v1/ai/performance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "modelMetrics": {
      "accuracy": 0.87,
      "precision": 0.84,
      "recall": 0.89,
      "f1Score": 0.86
    },
    "resourceUtilization": {
      "cpuUsage": 45.2,
      "memoryUsage": 8192,
      "averageInferenceTime": 150,
      "throughput": 6.7
    },
    "adaptationMetrics": {
      "learningRate": 0.001,
      "adaptationScore": 0.78,
      "lastAdaptation": "2025-01-01T10:00:00Z",
      "improvementTrend": "POSITIVE"
    },
    "predictionAccuracy": {
      "shortTerm": 0.82,
      "mediumTerm": 0.76,
      "longTerm": 0.69
    }
  }
}
```

### Update Model Configuration

```http
PUT /api/v1/ai/config
```

**Request Body:**
```json
{
  "modelParameters": {
    "temperature": 0.7,
    "maxTokens": 512,
    "topP": 0.9
  },
  "hardwareOptimization": {
    "enableQuantization": true,
    "batchSize": 4,
    "numThreads": 4
  },
  "adaptationSettings": {
    "learningRate": 0.001,
    "adaptationFrequency": "DAILY",
    "enableContinuousLearning": true
  }
}
```

### Trigger Model Adaptation

```http
POST /api/v1/ai/adapt
```

**Request Body:**
```json
{
  "adaptationType": "PERFORMANCE_BASED",
  "marketConditions": "VOLATILE",
  "performanceThreshold": 0.75,
  "includeRecentTrades": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "adaptationId": "adapt_001",
    "status": "INITIATED",
    "estimatedDuration": 300,
    "adaptationType": "PERFORMANCE_BASED",
    "expectedImprovement": 0.05
  }
}
```

## WebSocket Events

### AI Insights

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/ai-insights');

ws.onmessage = (event) => {
  const insight = JSON.parse(event.data);
  console.log('AI insight:', insight);
  // Handle AI insight
};
```

### Model Performance Updates

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/ai-performance');

ws.onmessage = (event) => {
  const performance = JSON.parse(event.data);
  console.log('Model performance:', performance);
  // Handle performance update
};
```

## Hardware Optimization

### Intel NUC Specific Optimizations

The AI system is specifically optimized for Intel NUC hardware:

- **CPU Optimization**: Utilizes Intel i5 CPU with optimized thread allocation
- **Memory Management**: Efficient memory usage within 12GB RAM constraints
- **Model Selection**: Lightweight models optimized for edge deployment
- **Quantization**: 8-bit quantization for improved performance
- **Batch Processing**: Optimized batch sizes for hardware constraints

### Performance Benchmarks

| Model | Inference Time | Memory Usage | Accuracy |
|-------|---------------|--------------|----------|
| Llama-3.2-3B | 150ms | 6.5GB | 87% |
| Phi-3-Mini | 95ms | 4.2GB | 82% |
| Mistral-7B-Q4 | 280ms | 8.1GB | 91% |

## Error Codes

| Code | Description |
|------|-------------|
| `AI_001` | Model not loaded |
| `AI_002` | Insufficient hardware resources |
| `AI_003` | Analysis request failed |
| `AI_004` | Model adaptation error |
| `AI_005` | Invalid optimization parameters |
| `AI_006` | Performance threshold not met |
| `AI_007` | Hardware optimization failed |