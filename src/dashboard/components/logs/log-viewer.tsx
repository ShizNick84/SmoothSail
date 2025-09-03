'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Calendar,
  Clock,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';
import { Button } from '@/components/ui/button';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'success';
  component: string;
  message: string;
  metadata?: Record<string, any>;
  emoji?: string;
}

interface LogViewerProps {
  className?: string;
  maxEntries?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Generate sample log entries
function generateLogEntries(count: number): LogEntry[] {
  const components = ['TradingEngine', 'APIClient', 'Database', 'SSHTunnel', 'Dashboard', 'NotificationService'];
  const levels: LogEntry['level'][] = ['debug', 'info', 'warn', 'error', 'success'];
  const messages = {
    debug: [
      'Processing market data update',
      'Calculating technical indicators',
      'Validating trade parameters',
      'Checking account balance',
    ],
    info: [
      'Trade executed successfully',
      'Market analysis completed',
      'Connection established',
      'Configuration updated',
    ],
    warn: [
      'High volatility detected',
      'API rate limit approaching',
      'Low account balance warning',
      'Network latency increased',
    ],
    error: [
      'Failed to execute trade',
      'API connection timeout',
      'Database query failed',
      'Authentication error',
    ],
    success: [
      'Profitable trade completed',
      'System health check passed',
      'Backup completed successfully',
      'Security scan completed',
    ],
  };

  const emojis = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    success: '✅',
  };

  const entries: LogEntry[] = [];
  
  for (let i = 0; i < count; i++) {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const component = components[Math.floor(Math.random() * components.length)];
    const message = messages[level][Math.floor(Math.random() * messages[level].length)];
    const timestamp = new Date(Date.now() - i * Math.random() * 60000).toISOString();
    
    entries.push({
      id: `log-${i}`,
      timestamp,
      level,
      component,
      message,
      emoji: emojis[level],
      metadata: Math.random() > 0.7 ? {
        tradeId: `trade-${Math.floor(Math.random() * 1000)}`,
        amount: Math.random() * 1000,
        symbol: 'BTC/USDT',
      } : undefined,
    });
  }
  
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Log level styling
function getLogLevelStyle(level: LogEntry['level']) {
  switch (level) {
    case 'error':
      return 'border-l-red-500 bg-red-500/5 text-red-700 dark:text-red-300';
    case 'warn':
      return 'border-l-yellow-500 bg-yellow-500/5 text-yellow-700 dark:text-yellow-300';
    case 'success':
      return 'border-l-green-500 bg-green-500/5 text-green-700 dark:text-green-300';
    case 'info':
      return 'border-l-blue-500 bg-blue-500/5 text-blue-700 dark:text-blue-300';
    case 'debug':
      return 'border-l-gray-500 bg-gray-500/5 text-gray-700 dark:text-gray-300';
    default:
      return 'border-l-gray-500 bg-gray-500/5 text-gray-700 dark:text-gray-300';
  }
}

// Log level icon
function getLogLevelIcon(level: LogEntry['level']) {
  switch (level) {
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'warn':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'debug':
      return <Search className="h-4 w-4 text-gray-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
}

// Individual log entry component
function LogEntryComponent({ 
  entry, 
  index, 
  isExpanded, 
  onToggleExpand 
}: { 
  entry: LogEntry; 
  index: number; 
  isExpanded: boolean; 
  onToggleExpand: () => void; 
}) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      time: date.toLocaleTimeString(),
      date: date.toLocaleDateString(),
    };
  };

  const { time, date } = formatTimestamp(entry.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className={cn(
        'border-l-4 p-3 rounded-r-lg hover:bg-muted/20 transition-colors cursor-pointer',
        getLogLevelStyle(entry.level)
      )}
      onClick={onToggleExpand}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            {getLogLevelIcon(entry.level)}
            <span className="text-xs font-mono text-muted-foreground">{time}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-muted/50 font-medium">
              {entry.level.toUpperCase()}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
              {entry.component}
            </span>
          </div>
          <div className="flex items-start space-x-2">
            {entry.emoji && (
              <span className="text-sm mt-0.5">{entry.emoji}</span>
            )}
            <p className="text-sm font-medium flex-1">{entry.message}</p>
          </div>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2"
            >
              <div className="text-xs text-muted-foreground">
                <div className="flex items-center space-x-4">
                  <span>📅 {date}</span>
                  <span>🕐 {time}</span>
                  <span>🏷️ {entry.id}</span>
                </div>
              </div>
              {entry.metadata && (
                <div className="bg-muted/30 p-2 rounded text-xs">
                  <p className="font-medium mb-1">Metadata:</p>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </motion.div>
          )}
        </div>
        <div className="flex items-center space-x-2 ml-2">
          {entry.metadata && (
            <div className="h-2 w-2 bg-primary rounded-full" title="Has metadata" />
          )}
          {isExpanded ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function LogViewer({ 
  className = '', 
  maxEntries = 500, 
  autoRefresh = true, 
  refreshInterval = 5000 
}: LogViewerProps) {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = React.useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedLevel, setSelectedLevel] = React.useState<LogEntry['level'] | 'all'>('all');
  const [selectedComponent, setSelectedComponent] = React.useState<string>('all');
  const [expandedEntries, setExpandedEntries] = React.useState<Set<string>>(new Set());
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = React.useState(true);
  const [lastUpdate, setLastUpdate] = React.useState<Date>(new Date());
  
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  // Fetch logs
  const fetchLogs = React.useCallback(async () => {
    try {
      // In a real implementation, this would fetch from an API
      const newLogs = generateLogEntries(maxEntries);
      setLogs(newLogs);
      setLastUpdate(new Date());
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, [maxEntries]);

  // Initial load and auto-refresh
  React.useEffect(() => {
    fetchLogs();
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchLogs, autoRefresh, refreshInterval]);

  // Filter logs
  React.useEffect(() => {
    let filtered = logs;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.component.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    // Filter by component
    if (selectedComponent !== 'all') {
      filtered = filtered.filter(log => log.component === selectedComponent);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, selectedLevel, selectedComponent]);

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (isAutoScrollEnabled && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [filteredLogs, isAutoScrollEnabled]);

  // Get unique components
  const components = React.useMemo(() => {
    const uniqueComponents = Array.from(new Set(logs.map(log => log.component)));
    return uniqueComponents.sort();
  }, [logs]);

  // Get log level counts
  const levelCounts = React.useMemo(() => {
    const counts = { debug: 0, info: 0, warn: 0, error: 0, success: 0 };
    filteredLogs.forEach(log => {
      counts[log.level]++;
    });
    return counts;
  }, [filteredLogs]);

  // Toggle entry expansion
  const toggleEntryExpansion = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  // Export logs
  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trading-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className={cn('glass-card p-6 rounded-xl', className)}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AnimatedEmoji emoji={TradingEmojis.loading} animation="spin" size="xl" />
            <p className="mt-4 text-muted-foreground">Loading trading logs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <AnimatedEmoji emoji={TradingEmojis.data} animation="pulse" />
            <span>Real-time Log Viewer</span>
          </h2>
          <p className="text-muted-foreground">Live system and trading activity logs</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
          >
            {isAutoScrollEnabled ? (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                Disable Auto-scroll
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-1" />
                Enable Auto-scroll
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="trading-card p-4"
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as LogEntry['level'] | 'all')}
            className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Levels</option>
            <option value="debug">Debug ({levelCounts.debug})</option>
            <option value="info">Info ({levelCounts.info})</option>
            <option value="warn">Warn ({levelCounts.warn})</option>
            <option value="error">Error ({levelCounts.error})</option>
            <option value="success">Success ({levelCounts.success})</option>
          </select>

          {/* Component Filter */}
          <select
            value={selectedComponent}
            onChange={(e) => setSelectedComponent(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Components</option>
            {components.map(component => (
              <option key={component} value={component}>{component}</option>
            ))}
          </select>

          {/* Stats */}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>{filteredLogs.length} entries</span>
            <span>•</span>
            <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
      </motion.div>

      {/* Log Entries */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="trading-card"
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Log Entries</span>
            </h3>
            <div className="flex items-center space-x-2">
              {autoRefresh && (
                <div className="flex items-center space-x-1 text-xs text-green-500">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Live</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div 
          ref={scrollAreaRef}
          className="max-h-96 overflow-y-auto p-4 space-y-2"
        >
          {filteredLogs.length > 0 ? (
            filteredLogs.map((entry, index) => (
              <LogEntryComponent
                key={entry.id}
                entry={entry}
                index={index}
                isExpanded={expandedEntries.has(entry.id)}
                onToggleExpand={() => toggleEntryExpansion(entry.id)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AnimatedEmoji emoji={TradingEmojis.question} size="lg" />
              <p className="mt-2">No logs match your current filters</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}