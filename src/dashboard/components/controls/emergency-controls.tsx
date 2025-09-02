'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Power, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  AlertTriangle, 
  Shield, 
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Database,
  Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';
import { Button } from '@/components/ui/button';

interface SystemStatus {
  tradingEngine: 'running' | 'stopped' | 'paused' | 'error';
  sshTunnel: 'connected' | 'disconnected' | 'reconnecting';
  database: 'connected' | 'disconnected' | 'error';
  dashboard: 'running' | 'stopped';
  notifications: 'enabled' | 'disabled';
  lastUpdate: string;
}

interface EmergencyControlsProps {
  className?: string;
}

// Confirmation dialog component
function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'destructive' as const,
  icon
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: 'default' | 'destructive';
  icon?: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-background border border-border rounded-lg p-6 max-w-md mx-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center space-x-3 mb-4">
            {icon}
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <p className="text-muted-foreground mb-6">{message}</p>
          <div className="flex items-center justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant={confirmVariant} onClick={onConfirm}>
              {confirmText}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Status indicator component
function StatusIndicator({ 
  status, 
  label 
}: { 
  status: 'running' | 'stopped' | 'paused' | 'error' | 'connected' | 'disconnected' | 'reconnecting' | 'enabled' | 'disabled'; 
  label: string; 
}) {
  const getStatusStyle = () => {
    switch (status) {
      case 'running':
      case 'connected':
      case 'enabled':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'paused':
      case 'reconnecting':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'stopped':
      case 'disconnected':
      case 'disabled':
        return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
      case 'error':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
      case 'connected':
      case 'enabled':
        return <CheckCircle className="h-4 w-4" />;
      case 'paused':
        return <Pause className="h-4 w-4" />;
      case 'reconnecting':
        return <RotateCcw className="h-4 w-4 animate-spin" />;
      case 'stopped':
      case 'disconnected':
      case 'disabled':
        return <XCircle className="h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusDot = () => {
    switch (status) {
      case 'running':
      case 'connected':
      case 'enabled':
        return 'bg-green-500 animate-pulse';
      case 'paused':
      case 'reconnecting':
        return 'bg-yellow-500 animate-pulse';
      case 'stopped':
      case 'disconnected':
      case 'disabled':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500 animate-pulse';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className={cn('flex items-center justify-between p-3 rounded-lg border', getStatusStyle())}>
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className={cn('h-2 w-2 rounded-full', getStatusDot())} />
        <span className="text-sm capitalize">{status.replace(/([A-Z])/g, ' $1').trim()}</span>
      </div>
    </div>
  );
}

export function EmergencyControls({ className = '' }: EmergencyControlsProps) {
  const [systemStatus, setSystemStatus] = React.useState<SystemStatus>({
    tradingEngine: 'running',
    sshTunnel: 'connected',
    database: 'connected',
    dashboard: 'running',
    notifications: 'enabled',
    lastUpdate: new Date().toISOString(),
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    confirmText: string;
    variant: 'default' | 'destructive';
    icon: React.ReactNode;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
    confirmText: 'Confirm',
    variant: 'default',
    icon: null,
  });

  // Simulate system status updates
  React.useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus(prev => ({
        ...prev,
        lastUpdate: new Date().toISOString(),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Control actions
  const showConfirmDialog = (
    title: string,
    message: string,
    action: () => void,
    confirmText: string = 'Confirm',
    variant: 'default' | 'destructive' = 'default',
    icon: React.ReactNode = <AlertTriangle className="h-5 w-5 text-yellow-500" />
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      action,
      confirmText,
      variant,
      icon,
    });
  };

  const executeAction = async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
      setSystemStatus(prev => ({ ...prev, lastUpdate: new Date().toISOString() }));
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsLoading(false);
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    }
  };

  const emergencyStop = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSystemStatus(prev => ({
      ...prev,
      tradingEngine: 'stopped',
      notifications: 'disabled',
    }));
  };

  const startTrading = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSystemStatus(prev => ({
      ...prev,
      tradingEngine: 'running',
      notifications: 'enabled',
    }));
  };

  const pauseTrading = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSystemStatus(prev => ({
      ...prev,
      tradingEngine: 'paused',
    }));
  };

  const restartSystem = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSystemStatus({
      tradingEngine: 'running',
      sshTunnel: 'connected',
      database: 'connected',
      dashboard: 'running',
      notifications: 'enabled',
      lastUpdate: new Date().toISOString(),
    });
  };

  const reconnectTunnel = async () => {
    setSystemStatus(prev => ({ ...prev, sshTunnel: 'reconnecting' }));
    await new Promise(resolve => setTimeout(resolve, 3000));
    setSystemStatus(prev => ({ ...prev, sshTunnel: 'connected' }));
  };

  const restartDatabase = async () => {
    setSystemStatus(prev => ({ ...prev, database: 'disconnected' }));
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSystemStatus(prev => ({ ...prev, database: 'connected' }));
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <AnimatedEmoji emoji={TradingEmojis.shield} animation="pulse" />
            <span>Emergency Controls</span>
          </h2>
          <p className="text-muted-foreground">System control and emergency stop functions</p>
        </div>
        <div className="text-xs text-muted-foreground">
          Last update: {new Date(systemStatus.lastUpdate).toLocaleTimeString()}
        </div>
      </div>

      {/* System Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="trading-card p-6"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Activity className="h-5 w-5 text-blue-500" />
          <span>System Status</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatusIndicator status={systemStatus.tradingEngine} label="Trading Engine" />
          <StatusIndicator status={systemStatus.sshTunnel} label="SSH Tunnel" />
          <StatusIndicator status={systemStatus.database} label="Database" />
          <StatusIndicator status={systemStatus.dashboard} label="Dashboard" />
          <StatusIndicator status={systemStatus.notifications} label="Notifications" />
        </div>
      </motion.div>

      {/* Emergency Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="trading-card p-6"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Shield className="h-5 w-5 text-red-500" />
          <span>Emergency Controls</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Emergency Stop */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="destructive"
              size="lg"
              className="w-full h-20 flex flex-col items-center justify-center space-y-2"
              disabled={isLoading || systemStatus.tradingEngine === 'stopped'}
              onClick={() => showConfirmDialog(
                'Emergency Stop',
                'This will immediately stop all trading activities and disable notifications. Are you sure?',
                () => executeAction(emergencyStop),
                'Emergency Stop',
                'destructive',
                <Square className="h-5 w-5 text-red-500" />
              )}
            >
              <Square className="h-6 w-6" />
              <span className="text-sm font-medium">Emergency Stop</span>
            </Button>
          </motion.div>

          {/* Start Trading */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="default"
              size="lg"
              className="w-full h-20 flex flex-col items-center justify-center space-y-2 bg-green-600 hover:bg-green-700"
              disabled={isLoading || systemStatus.tradingEngine === 'running'}
              onClick={() => showConfirmDialog(
                'Start Trading',
                'This will start the trading engine and enable all trading activities.',
                () => executeAction(startTrading),
                'Start Trading',
                'default',
                <Play className="h-5 w-5 text-green-500" />
              )}
            >
              <Play className="h-6 w-6" />
              <span className="text-sm font-medium">Start Trading</span>
            </Button>
          </motion.div>

          {/* Pause Trading */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-20 flex flex-col items-center justify-center space-y-2"
              disabled={isLoading || systemStatus.tradingEngine !== 'running'}
              onClick={() => showConfirmDialog(
                'Pause Trading',
                'This will pause all trading activities but keep the system running.',
                () => executeAction(pauseTrading),
                'Pause Trading',
                'default',
                <Pause className="h-5 w-5 text-yellow-500" />
              )}
            >
              <Pause className="h-6 w-6" />
              <span className="text-sm font-medium">Pause Trading</span>
            </Button>
          </motion.div>

          {/* Restart System */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-20 flex flex-col items-center justify-center space-y-2"
              disabled={isLoading}
              onClick={() => showConfirmDialog(
                'Restart System',
                'This will restart all system components. The system will be unavailable for a few moments.',
                () => executeAction(restartSystem),
                'Restart System',
                'destructive',
                <RotateCcw className="h-5 w-5 text-blue-500" />
              )}
            >
              <RotateCcw className="h-6 w-6" />
              <span className="text-sm font-medium">Restart System</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Service Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="trading-card p-6"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <span>Service Controls</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Reconnect SSH Tunnel */}
          <Button
            variant="outline"
            className="flex items-center justify-center space-x-2 h-12"
            disabled={isLoading || systemStatus.sshTunnel === 'reconnecting'}
            onClick={() => showConfirmDialog(
              'Reconnect SSH Tunnel',
              'This will reconnect the SSH tunnel to Oracle Cloud.',
              () => executeAction(reconnectTunnel),
              'Reconnect',
              'default',
              <Wifi className="h-5 w-5 text-blue-500" />
            )}
          >
            <Wifi className="h-4 w-4" />
            <span>Reconnect Tunnel</span>
          </Button>

          {/* Restart Database */}
          <Button
            variant="outline"
            className="flex items-center justify-center space-x-2 h-12"
            disabled={isLoading}
            onClick={() => showConfirmDialog(
              'Restart Database',
              'This will restart the PostgreSQL database service.',
              () => executeAction(restartDatabase),
              'Restart DB',
              'default',
              <Database className="h-5 w-5 text-purple-500" />
            )}
          >
            <Database className="h-4 w-4" />
            <span>Restart Database</span>
          </Button>

          {/* Force Refresh */}
          <Button
            variant="outline"
            className="flex items-center justify-center space-x-2 h-12"
            disabled={isLoading}
            onClick={() => {
              setSystemStatus(prev => ({ ...prev, lastUpdate: new Date().toISOString() }));
            }}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Force Refresh</span>
          </Button>
        </div>
      </motion.div>

      {/* Current Status Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="trading-card p-6"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Clock className="h-5 w-5 text-gray-500" />
          <span>System Summary</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trading Status:</span>
            <span className={cn(
              'font-medium capitalize',
              systemStatus.tradingEngine === 'running' ? 'text-green-500' :
              systemStatus.tradingEngine === 'paused' ? 'text-yellow-500' :
              systemStatus.tradingEngine === 'error' ? 'text-red-500' :
              'text-gray-500'
            )}>
              {systemStatus.tradingEngine}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Connection:</span>
            <span className={cn(
              'font-medium capitalize',
              systemStatus.sshTunnel === 'connected' ? 'text-green-500' :
              systemStatus.sshTunnel === 'reconnecting' ? 'text-yellow-500' :
              'text-red-500'
            )}>
              {systemStatus.sshTunnel}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Database:</span>
            <span className={cn(
              'font-medium capitalize',
              systemStatus.database === 'connected' ? 'text-green-500' :
              systemStatus.database === 'error' ? 'text-red-500' :
              'text-gray-500'
            )}>
              {systemStatus.database}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        confirmVariant={confirmDialog.variant}
        icon={confirmDialog.icon}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-40"
        >
          <div className="trading-card p-6 flex items-center space-x-3">
            <AnimatedEmoji emoji={TradingEmojis.loading} animation="spin" size="lg" />
            <span className="text-lg font-medium">Processing...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}