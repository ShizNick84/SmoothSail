'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Cpu, HardDrive, MemoryStick, Wifi, Thermometer, Activity } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';
import { DynamicIcon } from '@/components/icons/icon-registry';

interface SystemHealthData {
  status: 'healthy' | 'warning' | 'critical';
  uptime: string;
  cpu: number;
  memory: number;
  storage: number;
  temperature: number;
  network: 'connected' | 'disconnected' | 'slow';
  tunnelStatus: 'connected' | 'disconnected' | 'reconnecting';
}

interface SystemHealthProps {
  data?: SystemHealthData;
  className?: string;
}

// Progress ring component
function ProgressRing({ 
  value, 
  size = 60, 
  strokeWidth = 4, 
  color = '#3b82f6',
  backgroundColor = 'rgba(255,255,255,0.1)'
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold">{value}%</span>
      </div>
    </div>
  );
}

// Metric component
function SystemMetric({
  label,
  value,
  unit = '%',
  icon,
  status = 'normal',
  showProgress = true
}: {
  label: string;
  value: number;
  unit?: string;
  icon: React.ReactNode;
  status?: 'normal' | 'warning' | 'critical';
  showProgress?: boolean;
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'warning':
        return '#f59e0b';
      case 'critical':
        return '#ef4444';
      default:
        return '#3b82f6';
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'warning':
        return 'bg-yellow-500/10';
      case 'critical':
        return 'bg-red-500/10';
      default:
        return 'bg-blue-500/10';
    }
  };

  return (
    <div className={cn('p-4 rounded-lg border', getStatusBg())}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        {showProgress && (
          <ProgressRing 
            value={value} 
            size={40} 
            strokeWidth={3}
            color={getStatusColor()}
          />
        )}
      </div>
      {!showProgress && (
        <div className="text-lg font-bold">
          {value}{unit}
        </div>
      )}
    </div>
  );
}

export function SystemHealth({ data, className = '' }: SystemHealthProps) {
  // Default data for demo
  const systemData = data || {
    status: 'healthy' as const,
    uptime: '7d 14h 32m',
    cpu: 45,
    memory: 68,
    storage: 32,
    temperature: 65,
    network: 'connected' as const,
    tunnelStatus: 'connected' as const,
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'healthy':
        return TradingEmojis.success;
      case 'warning':
        return TradingEmojis.warning;
      case 'critical':
        return TradingEmojis.error;
      default:
        return TradingEmojis.info;
    }
  };

  const getMetricStatus = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'normal';
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
              emoji={getStatusEmoji(systemData.status)} 
              animation="pulse" 
            />
            <span>System Health</span>
          </h3>
          <p className="text-sm text-muted-foreground">Intel NUC Performance Monitor</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={cn(
            'px-3 py-1 rounded-full text-xs font-medium',
            systemData.status === 'healthy' ? 'bg-green-500/10 text-green-500' :
            systemData.status === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
            'bg-red-500/10 text-red-500'
          )}>
            {systemData.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* System Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SystemMetric
          label="CPU Usage"
          value={systemData.cpu}
          icon={<Cpu className="h-4 w-4 text-blue-500" />}
          status={getMetricStatus(systemData.cpu, { warning: 70, critical: 90 })}
        />
        
        <SystemMetric
          label="Memory"
          value={systemData.memory}
          icon={<MemoryStick className="h-4 w-4 text-green-500" />}
          status={getMetricStatus(systemData.memory, { warning: 80, critical: 95 })}
        />
        
        <SystemMetric
          label="Storage"
          value={systemData.storage}
          icon={<HardDrive className="h-4 w-4 text-purple-500" />}
          status={getMetricStatus(systemData.storage, { warning: 80, critical: 95 })}
        />
        
        <SystemMetric
          label="Temperature"
          value={systemData.temperature}
          unit="°C"
          icon={<Thermometer className="h-4 w-4 text-red-500" />}
          status={getMetricStatus(systemData.temperature, { warning: 70, critical: 85 })}
          showProgress={false}
        />
      </div>

      {/* Connection Status */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Connection Status</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
            <div className="flex items-center space-x-2">
              <Wifi className="h-4 w-4" />
              <span className="text-sm">Network</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className={cn(
                'h-2 w-2 rounded-full',
                systemData.network === 'connected' ? 'bg-green-500 animate-pulse' :
                systemData.network === 'slow' ? 'bg-yellow-500' :
                'bg-red-500'
              )} />
              <span className="text-xs capitalize">{systemData.network}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span className="text-sm">SSH Tunnel</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className={cn(
                'h-2 w-2 rounded-full',
                systemData.tunnelStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                systemData.tunnelStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              )} />
              <span className="text-xs capitalize">{systemData.tunnelStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Uptime */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">System Uptime</span>
          <span className="font-mono font-medium">{systemData.uptime}</span>
        </div>
      </div>
    </motion.div>
  );
}