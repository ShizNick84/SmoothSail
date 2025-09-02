/**
 * =============================================================================
 * LOG MONITOR DASHBOARD COMPONENT
 * =============================================================================
 * 
 * Real-time log monitoring component with visual indicators and emoji status.
 * Provides live updates of system health, trading activity, and error tracking.
 * 
 * Features:
 * - Real-time log streaming
 * - Visual status indicators with emojis
 * - Error pattern detection
 * - Performance metrics display
 * - Alert notifications
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * =============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Wifi, 
  Database, 
  Shield, 
  TrendingUp,
  Eye,
  Bell
} from 'lucide-react';

// Log entry interface
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  component?: string;
  emoji?: string;
  metadata?: Record<string, any>;
}

// System status interface
interface SystemStatus {
  overall: 'healthy' | 'warning' | 'critical';
  services: {
    tradingAgent: boolean;
    sshTunnel: boolean;
    dashboard: boolean;
    database: boolean;
  };
  performance: {
    cpu: number;
    memory: number;
    disk: number;
  };
  network: {
    apiConnected: boolean;
    tunnelActive: boolean;
    latency?: number;
  };
  alerts: number;
  lastUpdate: string;
}

// Trading metrics interface
interface TradingMetrics {
  tradesTotal: number;
  tradesSuccess: number;
  tradesFailed: number;
  profitLoss: number;
  lastTradeTime?: string;
}

const LogMonitor: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [tradingMetrics, setTradingMetrics] = useState<TradingMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(`ws://${window.location.host}/api/logs/stream`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('📡 Connected to log stream');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'log') {
            setLogs(prev => [...prev.slice(-999), data.entry]); // Keep last 1000 logs
          } else if (data.type === 'status') {
            setSystemStatus(data.status);
          } else if (data.type === 'trading') {
            setTradingMetrics(data.metrics);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('📡 Disconnected from log stream');
        // Reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [statusRes, metricsRes, logsRes] = await Promise.all([
          fetch('/api/system/status'),
          fetch('/api/trading/metrics'),
          fetch('/api/logs/recent?limit=100')
        ]);

        if (statusRes.ok) {
          const status = await statusRes.json();
          setSystemStatus(status);
        }

        if (metricsRes.ok) {
          const metrics = await metricsRes.json();
          setTradingMetrics(metrics);
        }

        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData.logs || []);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();
  }, []);

  // Get status color and icon
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'healthy':
        return { color: 'text-green-500', icon: CheckCircle, emoji: '✅' };
      case 'warning':
        return { color: 'text-yellow-500', icon: AlertTriangle, emoji: '⚠️' };
      case 'critical':
        return { color: 'text-red-500', icon: XCircle, emoji: '❌' };
      default:
        return { color: 'text-gray-500', icon: Activity, emoji: 'ℹ️' };
    }
  };

  // Get log level styling
  const getLogLevelStyle = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'debug':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Filter logs by level
  const filterLogsByLevel = (level?: string) => {
    if (!level) return logs;
    return logs.filter(log => log.level === level);
  };

  return (
    <div className="space-y-6">
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Eye className="h-6 w-6" />
          Log Monitor
        </h2>
        <div className="flex items-center gap-4">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? '🔗 Connected' : '🔌 Disconnected'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
          >
            {autoScroll ? '📌 Auto-scroll ON' : '📌 Auto-scroll OFF'}
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      {systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overall Status</p>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    {getStatusIndicator(systemStatus.overall).emoji}
                    {systemStatus.overall.toUpperCase()}
                  </p>
                </div>
                <Activity className={`h-8 w-8 ${getStatusIndicator(systemStatus.overall).color}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Services</p>
                  <p className="text-lg font-semibold">
                    {Object.values(systemStatus.services).filter(Boolean).length}/
                    {Object.keys(systemStatus.services).length} Running
                  </p>
                </div>
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Performance</p>
                  <p className="text-lg font-semibold">
                    🧠 {systemStatus.performance.memory.toFixed(1)}% RAM
                  </p>
                  <p className="text-sm text-gray-500">
                    ⚡ {systemStatus.performance.cpu.toFixed(1)}% CPU
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Alerts</p>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    {systemStatus.alerts > 0 ? '🚨' : '✅'}
                    {systemStatus.alerts} Active
                  </p>
                </div>
                <Bell className={`h-8 w-8 ${systemStatus.alerts > 0 ? 'text-red-500' : 'text-green-500'}`} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trading Metrics */}
      {tradingMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Trading Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{tradingMetrics.tradesTotal}</p>
                <p className="text-sm text-gray-600">Total Trades</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{tradingMetrics.tradesSuccess}</p>
                <p className="text-sm text-gray-600">✅ Successful</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{tradingMetrics.tradesFailed}</p>
                <p className="text-sm text-gray-600">❌ Failed</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${tradingMetrics.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tradingMetrics.profitLoss >= 0 ? '💰' : '💸'} ${tradingMetrics.profitLoss.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">P&L</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Viewer */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">All Logs</TabsTrigger>
              <TabsTrigger value="error">❌ Errors</TabsTrigger>
              <TabsTrigger value="warn">⚠️ Warnings</TabsTrigger>
              <TabsTrigger value="info">ℹ️ Info</TabsTrigger>
              <TabsTrigger value="debug">🔍 Debug</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <ScrollArea className="h-96 w-full border rounded-md p-4" ref={scrollAreaRef}>
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded border-l-4 ${getLogLevelStyle(log.level)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-500">
                              {formatTimestamp(log.timestamp)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {log.level.toUpperCase()}
                            </Badge>
                            {log.component && (
                              <Badge variant="secondary" className="text-xs">
                                {log.component}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm">
                            {log.emoji && <span className="mr-2">{log.emoji}</span>}
                            {log.message}
                          </p>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-500 cursor-pointer">
                                Show metadata
                              </summary>
                              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No logs available
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {['error', 'warn', 'info', 'debug'].map(level => (
              <TabsContent key={level} value={level} className="mt-4">
                <ScrollArea className="h-96 w-full border rounded-md p-4">
                  <div className="space-y-2">
                    {filterLogsByLevel(level).map((log, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded border-l-4 ${getLogLevelStyle(log.level)}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500">
                            {formatTimestamp(log.timestamp)}
                          </span>
                          {log.component && (
                            <Badge variant="secondary" className="text-xs">
                              {log.component}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm">
                          {log.emoji && <span className="mr-2">{log.emoji}</span>}
                          {log.message}
                        </p>
                      </div>
                    ))}
                    {filterLogsByLevel(level).length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        No {level} logs available
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {systemStatus && systemStatus.alerts > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            🚨 {systemStatus.alerts} active alert{systemStatus.alerts > 1 ? 's' : ''} detected. 
            Check the error logs and system status for details.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default LogMonitor;