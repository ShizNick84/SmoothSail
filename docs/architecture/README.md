# System Architecture

## Overview

The AI Crypto Trading Agent follows a layered, security-first architecture designed for 24/7 operation on Intel NUC hardware.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Crypto Trading Agent                      │
├─────────────────────────────────────────────────────────────────┤
│  Security Layer (Military-Grade Protection)                    │
│  ├── Threat Detection Engine                                   │
│  ├── Intrusion Prevention System                               │
│  ├── Encryption & Key Management                               │
│  └── Incident Response System                                  │
├─────────────────────────────────────────────────────────────────┤
│  Trading Engine Core                                           │
│  ├── Strategy Engine (MA, RSI, MACD, Fibonacci)               │
│  ├── Risk Management System                                    │
│  ├── Position Manager                                          │
│  └── Order Execution Engine                                    │
├─────────────────────────────────────────────────────────────────┤
│  AI & Analytics Layer                                          │
│  ├── LLM Integration (Optimized for i5/12GB)                  │
│  ├── Sentiment Analysis Engine                                 │
│  ├── Market Data Processor                                     │
│  └── Performance Analytics                                     │
├─────────────────────────────────────────────────────────────────┤
│  Communication Layer                                           │
│  ├── SSH Tunnel Manager (Oracle Free Tier)                    │
│  ├── Gate.io API Client                                        │
│  ├── Notification System (Email/Telegram)                      │
│  └── Dashboard API                                             │
├─────────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                          │
│  ├── System Monitor (Intel NUC)                               │
│  ├── Database Layer                                            │
│  ├── Logging & Audit System                                    │
│  └── Backup & Recovery                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Security Layer
- **Threat Detection Engine**: Real-time monitoring and anomaly detection
- **Encryption Service**: AES-256 encryption for sensitive data
- **Key Management**: Secure key storage and rotation
- **Incident Response**: Automated threat containment

### 2. Trading Engine
- **Strategy Engine**: Multi-indicator trading strategies
- **Risk Manager**: Dynamic position sizing and stop losses
- **Order Manager**: Execution and monitoring
- **Portfolio Manager**: Position tracking and P&L calculation

### 3. AI & Analytics
- **LLM Engine**: Market analysis and decision explanation
- **Sentiment Analyzer**: Social media and news sentiment
- **Market Analyzer**: Pattern recognition and trend analysis
- **Performance Analytics**: Strategy optimization

### 4. Infrastructure
- **System Monitor**: Hardware monitoring and optimization
- **SSH Tunnel Manager**: Secure connection to Oracle Free Tier
- **Database**: SQLite for local data storage
- **Logging System**: Comprehensive audit trails

## Data Flow

1. **Market Data Ingestion**: Real-time data from Gate.io API
2. **Strategy Processing**: Technical indicators and AI analysis
3. **Risk Assessment**: Position sizing and risk validation
4. **Order Execution**: Secure order placement through SSH tunnel
5. **Monitoring**: Real-time position and system monitoring
6. **Notifications**: Alerts via email and Telegram

## Security Architecture

The system implements defense-in-depth security:

1. **Perimeter Security**: SSH tunnel encryption
2. **Application Security**: Input validation and secure coding
3. **Data Security**: Encryption at rest and in transit
4. **Access Security**: JWT authentication and authorization
5. **Monitoring Security**: Continuous threat detection