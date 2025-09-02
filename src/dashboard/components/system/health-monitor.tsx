'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Wifi, 
  Thermometer, 
  Activity, 
  Server, 
  Database,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';

interface SystemMetrics {
  cpu: {
    usage: number;
    temperature: number;
    cores: number;
    frequency: number;
  };
  memory: {
    used: number;
    total: number;
    available: number;
    usage: number;
  };
  storage: {
    used: number;
    total: number;
    usage: number;
    iops: number;
  };
  network: {
    status: 'connected' | 'disconnected' | 'slow';
    latency: number;
    downloadSpeed: number;
    uploadSpeed: number;
  };
  services: {
    tradingAgent: boolean;
    sshTunnel: boolean;
    database: boolean;
    dashboard: boolean;
    notifications: boolean;
  };
  security: {
    firewallActive: boolean;
    sslCertValid: boolean;
    lastSecurityScan: string;
    threatLevel: 'low' | 'medium' | 'high';
  };
}

interface HealthMonitorProps {
  className?: string;
  refreshInterval?: number;
}

// Generate sample system metrics
function generateSystemMetrics(): SystemMetrics {
  return {
    cpu: {
      usage: Math.random() * 80 + 10,
      temperature: Math.random() * 30 + 45,
      cores: 8,
      frequency: 2.4 + Math.random() * 1.6,
    },
    memory: {
      used: Math.random() * 12 + 4,
      total: 16,
      available: 16 - (Math.random() * 12 + 4),
      usage: (Math.random() * 12 + 4) / 16 * 100,
    },
    storage: {
      used: Math.random() * 400 + 100,
      total: 1000,
      usage: (Math.random() * 400 + 100) / 1000 * 100,
      iops: Math.random() * 5000 + 1000,
    },
    network: {
      status: Math.random() > 0.1 ? 'connected' : 'slow',
      latency: Math.random() * 50 + 10,
      downloadSpeed: Math.random() * 900 + 100,
      uploadSpeed: Math.random() * 100 + 50,
    },
    services: {
      tradingAgent: Math.random() > 0.05,
      sshTunnel: Math.random() > 0.05,
      database: Math.random() > 0.02,
      dashboard: Math.random() > 0.02,
      notifications: Math.random() > 0.1,
    },
    security: {
      firewallActive: Math.random() > 0.02,
      sslCertValid: Math.random() > 0.05,
      lastSecurityScan: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      threatLevel: Math.random() > 0.8 ? 'medium' : 'low',
    },
  };
}

// Progress ring component
function ProgressRing({ 
  value, 
  size = 80, 
  strokeWidth = 6, 
  color = '#3b82f6',
  backgroundColor = 'rgba(255,255,255,0.1)',
  showValue = true
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showValue?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getStatusColor = () => {
    if (value >= 90) return '#ef4444'; // red
    if (value >= 70) return '#f59e0b'; // yellow
    return color; // default
  };

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
          stroke={getStatusColor()}
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
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold">{value.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}

// System metric card
function MetricCard({
  title,
  value,
  unit = '',
  icon,
  status = 'normal',
  details,
  showProgress = false,
  progressValue = 0
}: {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  status?: 'normal' | 'warning' | 'critical' | 'good';
  details?: string;
  showProgress?: boolean;
  progressValue?: number;
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return 'text-green-500 border-green-500/20 bg-green-500/5';
      case 'warning':
        return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5';
      case 'critical':
        return 'text-red-500 border-red-500/20 bg-red-500/5';
      default:
        return 'text-blue-500 border-blue-500/20 bg-blue-500/5';
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'good':
        return '#22c55e';
      case 'warning':
        return '#f59e0b';
      case 'critical':
        return '#ef4444';
      default:
        return '#3b82f6';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={cn('trading-card p-4 border', getStatusColor())}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {showProgress && (
          <ProgressRing 
            value={progressValue} 
            size={50} 
            strokeWidth={4}
            color={getProgressColor()}
          />
        )}
      </div>
      
      <div className="space-y-2">
        <div className="text-2xl font-bold font-mono">
          {typeof value === 'number' ? value.toFixed(1) : value}{unit}
        </div>
        {details && (
          <p className="text-xs text-muted-foreground">{details}</p>
        )}
      </div>
    </motion.div>
  );
}

// Service status component
function ServiceStatus({ 
  name, 
  isActive, 
  icon, 
  description 
}: { 
  name: string; 
  isActive: boolean; 
  icon: React.ReactNode; 
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        isActive 
          ? 'bg-green-500/5 border-green-500/20' 
          : 'bg-red-500/5 border-red-500/20'
      )}
    >
      <div className="flex items-center space-x-3">
        {icon}
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {isActive ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
        <div className={cn(
          'h-2 w-2 rounded-full',
          isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        )} />
      </div>
    </motion.div>
  );
}

export function HealthMonitor({ className = '', refreshInterval = 5000 }: HealthMonitorProps) {
  const [metrics, setMetrics] = React.useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [lastUpdate, setLastUpdate] = React.useState<Date>(new Date());

  // Fetch system metrics
  const fetchMetrics = React.useCallback(async () => {
    try {
      // In a real implementation, this would fetch from an API
      const newMetrics = generateSystemMetrics();
      setMetrics(newMetrics);
      setLastUpdate(new Date());
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
    }
  }, []);

  // Initial load and periodic refresh
  React.useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval]);

  if (isLoading || !metrics) {
    return (
      <div className={cn('glass-card p-6 rounded-xl', className)}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AnimatedEmoji emoji={TradingEmojis.loading} animation="spin" size="xl" />
            <p className="mt-4 text-muted-foreground">Loading system metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate overall system health
  const getOverallStatus = () => {
    const criticalIssues = [
      metrics.cpu.usage > 90,
      metrics.memory.usage > 95,
      metrics.storage.usage > 95,
      !metrics.services.tradingAgent,
      !metrics.services.database,
      metrics.network.status === 'disconnected'
    ].filter(Boolean).length;

    const warningIssues = [
      metrics.cpu.usage > 70,
      metrics.memory.usage > 80,
      metrics.storage.usage > 80,
      metrics.network.status === 'slow',
      !metrics.services.notifications
    ].filter(Boolean).length;

    if (criticalIssues > 0) return 'critical';
    if (warningIssues > 0) return 'warning';
    return 'healthy';
  };

  const overallStatus = getOverallStatus();
  const activeServices = Object.values(metrics.services).filter(Boolean).length;
  const totalServices = Object.keys(metrics.services).length;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <AnimatedEmoji 
              emoji={
                overallStatus === 'healthy' ? TradingEmojis.success :
                overallStatus === 'warning' ? TradingEmojis.warning :
                TradingEmojis.error
              } 
              animation="pulse" 
            />
            <span>System Health Monitor</span>
          </h2>
          <p className="text-muted-foreground">Intel NUC performance and service status</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            overallStatus === 'healthy' ? 'bg-green-500/10 text-green-500' :
            overallStatus === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
            'bg-red-500/10 text-red-500'
          )}>
            {overallStatus.toUpperCase()}
          </div>
          <div className="text-xs text-muted-foreground">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="CPU Usage"
          value={metrics.cpu.usage}
          unit="%"
          icon={<Cpu className="h-5 w-5 text-blue-500" />}
          status={metrics.cpu.usage > 90 ? 'critical' : metrics.cpu.usage > 70 ? 'warning' : 'good'}
          details={`${metrics.cpu.cores} cores @ ${metrics.cpu.frequency.toFixed(1)}GHz`}
          showProgress
          progressValue={metrics.cpu.usage}
        />
        
        <MetricCard
          title="Memory"
          value={metrics.memory.usage}
          unit="%"
          icon={<MemoryStick className="h-5 w-5 text-green-500" />}
          status={metrics.memory.usage > 95 ? 'critical' : metrics.memory.usage > 80 ? 'warning' : 'good'}
          details={`${metrics.memory.used.toFixed(1)}GB / ${metrics.memory.total}GB`}
          showProgress
          progressValue={metrics.memory.usage}
        />
        
        <MetricCard
          title="Storage"
          value={metrics.storage.usage}
          unit="%"
          icon={<HardDrive className="h-5 w-5 text-purple-500" />}
          status={metrics.storage.usage > 95 ? 'critical' : metrics.storage.usage > 80 ? 'warning' : 'good'}
          details={`${metrics.storage.used.toFixed(0)}GB / ${metrics.storage.total}GB`}
          showProgress
          progressValue={metrics.storage.usage}
        />
        
        <MetricCard
          title="Temperature"
          value={metrics.cpu.temperature}
          unit="°C"
          icon={<Thermometer className="h-5 w-5 text-red-500" />}
          status={metrics.cpu.temperature > 80 ? 'critical' : metrics.cpu.temperature > 70 ? 'warning' : 'good'}
          details="CPU temperature"
        />
      </div>

      {/* Network & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="trading-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Wifi className="h-5 w-5 text-blue-500" />
            <span>Network Performance</span>
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="flex items-center space-x-2">
                <div className={cn(
                  'h-2 w-2 rounded-full',
                  metrics.network.status === 'connected' ? 'bg-green-500 animate-pulse' :
                  metrics.network.status === 'slow' ? 'bg-yellow-500' :
                  'bg-red-500'
                )} />
                <span className="text-sm capitalize">{metrics.network.status}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Latency</span>
              <span className="text-sm font-mono">{metrics.network.latency.toFixed(0)}ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Download</span>
              <span className="text-sm font-mono">{metrics.network.downloadSpeed.toFixed(0)} Mbps</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Upload</span>
              <span className="text-sm font-mono">{metrics.network.uploadSpeed.toFixed(0)} Mbps</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="trading-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-500" />
            <span>Security Status</span>
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Firewall</span>
              <div className="flex items-center space-x-2">
                {metrics.security.firewallActive ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">{metrics.security.firewallActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">SSL Certificate</span>
              <div className="flex items-center space-x-2">
                {metrics.security.sslCertValid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">{metrics.security.sslCertValid ? 'Valid' : 'Invalid'}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Threat Level</span>
              <span className={cn(
                'text-sm px-2 py-1 rounded',
                metrics.security.threatLevel === 'low' ? 'bg-green-500/10 text-green-500' :
                metrics.security.threatLevel === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                'bg-red-500/10 text-red-500'
              )}>
                {metrics.security.threatLevel.toUpperCase()}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Services Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="trading-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Server className="h-5 w-5 text-blue-500" />
            <span>System Services</span>
          </h3>
          <div className="text-sm text-muted-foreground">
            {activeServices}/{totalServices} services running
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ServiceStatus
            name="Trading Agent"
            isActive={metrics.services.tradingAgent}
            icon={<Activity className="h-5 w-5 text-blue-500" />}
            description="Main trading bot service"
          />
          <ServiceStatus
            name="SSH Tunnel"
            isActive={metrics.services.sshTunnel}
            icon={<Shield className="h-5 w-5 text-green-500" />}
            description="Secure connection to Oracle Cloud"
          />
          <ServiceStatus
            name="Database"
            isActive={metrics.services.database}
            icon={<Database className="h-5 w-5 text-purple-500" />}
            description="PostgreSQL database service"
          />
          <ServiceStatus
            name="Dashboard"
            isActive={metrics.services.dashboard}
            icon={<Zap className="h-5 w-5 text-yellow-500" />}
            description="Web dashboard interface"
          />
          <ServiceStatus
            name="Notifications"
            isActive={metrics.services.notifications}
            icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
            description="Telegram & email alerts"
          />
        </div>
      </motion.div>
    </div>
  );
}