'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Shield, Target, TrendingDown, AlertTriangle } from 'lucide-react';
import { cn, formatCurrency, formatPercentage } from '@/lib/utils';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';

interface RiskData {
  currentDrawdown: number;
  maxDrawdown: number;
  riskPerTrade: number;
  sharpeRatio: number;
  winRate: number;
  avgRiskReward: number;
  portfolioRisk: 'low' | 'medium' | 'high';
  stopLossActive: boolean;
}

interface RiskMetricsProps {
  data?: RiskData;
  className?: string;
}

// Risk level indicator
function RiskLevelIndicator({ level }: { level: 'low' | 'medium' | 'high' }) {
  const config = {
    low: {
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      emoji: TradingEmojis.shield,
      label: 'Low Risk'
    },
    medium: {
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      emoji: TradingEmojis.warning,
      label: 'Medium Risk'
    },
    high: {
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      emoji: TradingEmojis.danger,
      label: 'High Risk'
    }
  };

  const { color, bg, emoji, label } = config[level];

  return (
    <div className={cn('flex items-center space-x-2 px-3 py-2 rounded-full', bg)}>
      <AnimatedEmoji emoji={emoji} animation="pulse" size="sm" />
      <span className={cn('text-sm font-medium', color)}>{label}</span>
    </div>
  );
}

// Metric card component
function RiskMetricCard({
  title,
  value,
  format = 'number',
  status = 'normal',
  icon,
  description
}: {
  title: string;
  value: number;
  format?: 'currency' | 'percentage' | 'number' | 'ratio';
  status?: 'normal' | 'warning' | 'good';
  icon: React.ReactNode;
  description?: string;
}) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
        return formatPercentage(val);
      case 'ratio':
        return `${val.toFixed(2)}:1`;
      default:
        return val.toFixed(2);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-foreground';
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'good':
        return 'bg-green-500/5';
      case 'warning':
        return 'bg-yellow-500/5';
      default:
        return 'bg-muted/5';
    }
  };

  return (
    <div className={cn('p-4 rounded-lg border', getStatusBg())}>
      <div className="flex items-center space-x-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
      </div>
      <div className={cn('text-xl font-bold mb-1', getStatusColor())}>
        {formatValue(value)}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

// Drawdown visualization
function DrawdownChart({ current, max }: { current: number; max: number }) {
  const currentPercent = Math.abs(current);
  const maxPercent = Math.abs(max);
  const currentWidth = (currentPercent / 20) * 100; // Assuming 20% max for visualization
  const maxWidth = (maxPercent / 20) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Current Drawdown</span>
        <span className="font-medium text-red-500">{formatPercentage(current)}</span>
      </div>
      <div className="relative h-2 bg-muted/20 rounded-full">
        <motion.div
          className="absolute left-0 top-0 h-full bg-red-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(currentWidth, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Max Drawdown</span>
        <span className="font-medium text-red-400">{formatPercentage(max)}</span>
      </div>
      <div className="relative h-2 bg-muted/20 rounded-full">
        <motion.div
          className="absolute left-0 top-0 h-full bg-red-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(maxWidth, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </div>
  );
}

export function RiskMetrics({ data, className = '' }: RiskMetricsProps) {
  // Default data for demo
  const riskData = data || {
    currentDrawdown: -2.5,
    maxDrawdown: -8.2,
    riskPerTrade: 2.0,
    sharpeRatio: 1.85,
    winRate: 68.5,
    avgRiskReward: 1.45,
    portfolioRisk: 'low' as const,
    stopLossActive: true,
  };

  const getRiskStatus = (metric: string, value: number) => {
    switch (metric) {
      case 'sharpe':
        return value > 1.5 ? 'good' : value > 1.0 ? 'normal' : 'warning';
      case 'winRate':
        return value > 60 ? 'good' : value > 50 ? 'normal' : 'warning';
      case 'riskReward':
        return value > 1.3 ? 'good' : value > 1.0 ? 'normal' : 'warning';
      default:
        return 'normal';
    }
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
            <AnimatedEmoji emoji={TradingEmojis.shield} animation="float" />
            <span>Risk Management</span>
          </h3>
          <p className="text-sm text-muted-foreground">Portfolio risk assessment</p>
        </div>
        <RiskLevelIndicator level={riskData.portfolioRisk} />
      </div>

      {/* Risk Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <RiskMetricCard
          title="Risk per Trade"
          value={riskData.riskPerTrade}
          format="percentage"
          icon={<Target className="h-4 w-4 text-blue-500" />}
          description="Capital at risk per position"
        />
        
        <RiskMetricCard
          title="Sharpe Ratio"
          value={riskData.sharpeRatio}
          format="ratio"
          status={getRiskStatus('sharpe', riskData.sharpeRatio)}
          icon={<TrendingDown className="h-4 w-4 text-purple-500" />}
          description="Risk-adjusted returns"
        />
        
        <RiskMetricCard
          title="Win Rate"
          value={riskData.winRate}
          format="percentage"
          status={getRiskStatus('winRate', riskData.winRate)}
          icon={<Shield className="h-4 w-4 text-green-500" />}
          description="Percentage of profitable trades"
        />
        
        <RiskMetricCard
          title="Avg Risk:Reward"
          value={riskData.avgRiskReward}
          format="ratio"
          status={getRiskStatus('riskReward', riskData.avgRiskReward)}
          icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
          description="Average risk to reward ratio"
        />
      </div>

      {/* Drawdown Section */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Drawdown Analysis</h4>
        <DrawdownChart 
          current={riskData.currentDrawdown} 
          max={riskData.maxDrawdown} 
        />
      </div>

      {/* Risk Controls Status */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Risk Controls</h4>
        
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-green-500" />
            <span className="text-sm">Stop Loss Protection</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className={cn(
              'h-2 w-2 rounded-full',
              riskData.stopLossActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            )} />
            <span className="text-xs">
              {riskData.stopLossActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Position Sizing</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs">Optimized</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Risk Assessment</span>
          <div className="flex items-center space-x-2">
            <AnimatedEmoji 
              emoji={riskData.portfolioRisk === 'low' ? TradingEmojis.success : 
                     riskData.portfolioRisk === 'medium' ? TradingEmojis.warning : 
                     TradingEmojis.danger} 
              size="sm" 
            />
            <span className="font-medium capitalize">{riskData.portfolioRisk} Risk Portfolio</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}