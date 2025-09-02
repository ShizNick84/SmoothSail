'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Target, Activity } from 'lucide-react';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';
import { DynamicIcon } from '@/components/icons/icon-registry';

interface PortfolioData {
  totalBalance: number;
  dailyPnL: number;
  totalPnL: number;
  positions: number;
  availableBalance?: number;
  totalInvested?: number;
  winRate?: number;
  sharpeRatio?: number;
}

interface PortfolioOverviewProps {
  data?: PortfolioData;
  className?: string;
}

// Animated counter component
function AnimatedCounter({ 
  value, 
  format = 'currency',
  duration = 1000,
  className = ''
}: {
  value: number;
  format?: 'currency' | 'percentage' | 'number';
  duration?: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const [isAnimating, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    setIsAnimating(true);
    const startTime = Date.now();
    const startValue = displayValue;
    const difference = value - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (difference * easeOutCubic);
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
        return formatPercentage(val);
      case 'number':
        return Math.round(val).toLocaleString();
      default:
        return val.toString();
    }
  };

  return (
    <span className={cn('font-mono font-bold', className)}>
      {formatValue(displayValue)}
    </span>
  );
}

// Portfolio metric card component
function MetricCard({
  title,
  value,
  change,
  format = 'currency',
  icon,
  emoji,
  trend,
  className = ''
}: {
  title: string;
  value: number;
  change?: number;
  format?: 'currency' | 'percentage' | 'number';
  icon?: string;
  emoji?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
  const trendBg = trend === 'up' ? 'bg-green-500/10' : trend === 'down' ? 'bg-red-500/10' : 'bg-muted/10';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.02 }}
      className={cn('glass-card p-6 rounded-xl', className)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {icon && <DynamicIcon name={icon} size="sm" />}
          {emoji && <AnimatedEmoji emoji={emoji} size="sm" animation="pulse" />}
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        </div>
        {trend && (
          <div className={cn('p-1 rounded-full', trendBg)}>
            {trend === 'up' ? (
              <TrendingUp className={cn('h-4 w-4', trendColor)} />
            ) : trend === 'down' ? (
              <TrendingDown className={cn('h-4 w-4', trendColor)} />
            ) : (
              <Activity className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className={cn('text-2xl font-bold', trendColor)}>
          <AnimatedCounter value={value} format={format} />
        </div>
        
        {change !== undefined && (
          <div className="flex items-center space-x-1">
            <span className={cn('text-sm font-medium', trendColor)}>
              <AnimatedCounter value={change} format="percentage" />
            </span>
            <span className="text-xs text-muted-foreground">24h</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function PortfolioOverview({ data, className = '' }: PortfolioOverviewProps) {
  // Default data for demo purposes
  const portfolioData = data || {
    totalBalance: 125000.50,
    dailyPnL: 2450.75,
    totalPnL: 25000.00,
    positions: 3,
    availableBalance: 15000.00,
    totalInvested: 100000.00,
    winRate: 68.5,
    sharpeRatio: 1.85,
  };

  const dailyPnLPercentage = (portfolioData.dailyPnL / portfolioData.totalBalance) * 100;
  const totalPnLPercentage = (portfolioData.totalPnL / (portfolioData.totalInvested || portfolioData.totalBalance)) * 100;

  const getTrend = (value: number) => {
    if (value > 0) return 'up';
    if (value < 0) return 'down';
    return 'neutral';
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <AnimatedEmoji emoji={TradingEmojis.money} animation="bounce" />
            <span>Portfolio Overview</span>
          </h2>
          <p className="text-muted-foreground">Real-time portfolio performance and metrics</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Balance"
          value={portfolioData.totalBalance}
          format="currency"
          emoji={TradingEmojis.money}
          trend="up"
          className="md:col-span-2 lg:col-span-1"
        />
        
        <MetricCard
          title="Daily P&L"
          value={portfolioData.dailyPnL}
          change={dailyPnLPercentage}
          format="currency"
          emoji={portfolioData.dailyPnL > 0 ? TradingEmojis.rocket : TradingEmojis.bearish}
          trend={getTrend(portfolioData.dailyPnL)}
        />
        
        <MetricCard
          title="Total P&L"
          value={portfolioData.totalPnL}
          change={totalPnLPercentage}
          format="currency"
          emoji={portfolioData.totalPnL > 0 ? TradingEmojis.trophy : TradingEmojis.loss}
          trend={getTrend(portfolioData.totalPnL)}
        />
        
        <MetricCard
          title="Active Positions"
          value={portfolioData.positions}
          format="number"
          emoji={TradingEmojis.target}
          trend="neutral"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Available Balance"
          value={portfolioData.availableBalance || 0}
          format="currency"
          emoji={TradingEmojis.dollar}
          trend="neutral"
        />
        
        <MetricCard
          title="Win Rate"
          value={portfolioData.winRate || 0}
          format="percentage"
          emoji={TradingEmojis.star}
          trend={portfolioData.winRate && portfolioData.winRate > 60 ? 'up' : 'neutral'}
        />
        
        <MetricCard
          title="Sharpe Ratio"
          value={portfolioData.sharpeRatio || 0}
          format="number"
          emoji={TradingEmojis.crown}
          trend={portfolioData.sharpeRatio && portfolioData.sharpeRatio > 1.5 ? 'up' : 'neutral'}
        />
        
        <MetricCard
          title="Total Invested"
          value={portfolioData.totalInvested || 0}
          format="currency"
          emoji={TradingEmojis.coins}
          trend="neutral"
        />
      </div>

      {/* Performance Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6 rounded-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <AnimatedEmoji emoji={TradingEmojis.chart} animation="pulse" />
            <span>Performance Summary</span>
          </h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <AnimatedEmoji emoji={TradingEmojis.bullish} size="sm" />
              <span className="text-green-500 font-medium">
                {portfolioData.dailyPnL > 0 ? 'Profitable Day' : 'Recovery Mode'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ROI:</span>
            <span className={cn('font-medium', getTrend(totalPnLPercentage) === 'up' ? 'text-green-500' : 'text-red-500')}>
              {formatPercentage(totalPnLPercentage)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Daily Change:</span>
            <span className={cn('font-medium', getTrend(dailyPnLPercentage) === 'up' ? 'text-green-500' : 'text-red-500')}>
              {formatPercentage(dailyPnLPercentage)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Utilization:</span>
            <span className="font-medium">
              {formatPercentage(((portfolioData.totalBalance - (portfolioData.availableBalance || 0)) / portfolioData.totalBalance) * 100)}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}