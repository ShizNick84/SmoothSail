'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, MessageSquare, Twitter, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';

interface SentimentData {
  overall: number; // -100 to 100
  twitter: number;
  reddit: number;
  news: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

interface SentimentAnalysisProps {
  data?: SentimentData;
  className?: string;
}

// Sentiment gauge component
function SentimentGauge({ value, size = 120 }: { value: number; size?: number }) {
  const normalizedValue = (value + 100) / 200; // Convert -100/100 to 0/1
  const angle = normalizedValue * 180 - 90; // Convert to -90 to 90 degrees
  
  const getColor = (val: number) => {
    if (val > 20) return '#10b981'; // Green
    if (val > -20) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const radius = size / 2 - 10;
  const circumference = Math.PI * radius; // Half circle
  const offset = circumference - (normalizedValue * circumference);

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
      <svg width={size} height={size / 2 + 20} className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        {/* Progress arc */}
        <motion.path
          d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none"
          stroke={getColor(value)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
        {/* Needle */}
        <motion.line
          x1={size / 2}
          y1={size / 2}
          x2={size / 2 + Math.cos((angle * Math.PI) / 180) * (radius - 15)}
          y2={size / 2 + Math.sin((angle * Math.PI) / 180) * (radius - 15)}
          stroke={getColor(value)}
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ rotate: -90 }}
          animate={{ rotate: angle }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}
        />
        {/* Center dot */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r="4"
          fill={getColor(value)}
        />
      </svg>
      
      {/* Value display */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
        <div className="text-2xl font-bold" style={{ color: getColor(value) }}>
          {value > 0 ? '+' : ''}{value}
        </div>
        <div className="text-xs text-muted-foreground">Sentiment Score</div>
      </div>
    </div>
  );
}

// Source sentiment component
function SourceSentiment({ 
  label, 
  value, 
  icon, 
  color = '#3b82f6' 
}: { 
  label: string; 
  value: number; 
  icon: React.ReactNode; 
  color?: string;
}) {
  const barWidth = Math.abs(value);
  const isPositive = value > 0;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className={cn(
          'text-sm font-bold',
          isPositive ? 'text-green-500' : value < 0 ? 'text-red-500' : 'text-muted-foreground'
        )}>
          {value > 0 ? '+' : ''}{value}
        </span>
      </div>
      
      <div className="relative h-2 bg-muted/20 rounded-full overflow-hidden">
        <motion.div
          className={cn(
            'absolute h-full rounded-full',
            isPositive ? 'bg-green-500' : 'bg-red-500'
          )}
          style={{
            width: `${barWidth}%`,
            left: isPositive ? '50%' : `${50 - barWidth}%`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${barWidth}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        <div className="absolute left-1/2 top-0 w-px h-full bg-border" />
      </div>
    </div>
  );
}

export function SentimentAnalysis({ data, className = '' }: SentimentAnalysisProps) {
  // Default data for demo
  const sentimentData = data || {
    overall: 35,
    twitter: 42,
    reddit: 28,
    news: 35,
    trend: 'bullish' as const,
    confidence: 78,
  };

  const getSentimentEmoji = (value: number) => {
    if (value > 30) return TradingEmojis.bullish;
    if (value > 10) return TradingEmojis.happy;
    if (value > -10) return TradingEmojis.sideways;
    if (value > -30) return TradingEmojis.worried;
    return TradingEmojis.bearish;
  };

  const getTrendDescription = (trend: string, value: number) => {
    if (trend === 'bullish') return 'Market sentiment is positive';
    if (trend === 'bearish') return 'Market sentiment is negative';
    return 'Market sentiment is neutral';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('glass-card p-6 rounded-xl', className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <AnimatedEmoji 
              emoji={getSentimentEmoji(sentimentData.overall)} 
              animation="pulse" 
            />
            <span>Market Sentiment</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            {getTrendDescription(sentimentData.trend, sentimentData.overall)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-muted-foreground">Confidence</div>
          <div className="text-lg font-bold">{sentimentData.confidence}%</div>
        </div>
      </div>

      {/* Sentiment Gauge */}
      <div className="flex justify-center mb-6">
        <SentimentGauge value={sentimentData.overall} />
      </div>

      {/* Source Breakdown */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Source Breakdown</h4>
        
        <SourceSentiment
          label="Twitter"
          value={sentimentData.twitter}
          icon={<Twitter className="h-4 w-4 text-blue-400" />}
        />
        
        <SourceSentiment
          label="Reddit"
          value={sentimentData.reddit}
          icon={<MessageSquare className="h-4 w-4 text-orange-500" />}
        />
        
        <SourceSentiment
          label="News"
          value={sentimentData.news}
          icon={<Globe className="h-4 w-4 text-green-500" />}
        />
      </div>

      {/* Trend Indicator */}
      <div className="mt-6 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={cn(
              'p-2 rounded-full',
              sentimentData.trend === 'bullish' ? 'bg-green-500/10' :
              sentimentData.trend === 'bearish' ? 'bg-red-500/10' :
              'bg-yellow-500/10'
            )}>
              {sentimentData.trend === 'bullish' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : sentimentData.trend === 'bearish' ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <div className="h-4 w-4 bg-yellow-500 rounded-full" />
              )}
            </div>
            <span className="text-sm font-medium capitalize">{sentimentData.trend} Trend</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Updated 2 min ago
          </div>
        </div>
      </div>
    </motion.div>
  );
}