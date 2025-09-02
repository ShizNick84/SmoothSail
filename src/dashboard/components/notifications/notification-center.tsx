'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  BellRing, 
  X, 
  Check, 
  Archive, 
  Filter, 
  Search,
  Settings,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  type: 'trade' | 'system' | 'security' | 'alert' | 'info';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  isArchived: boolean;
  emoji?: string;
  metadata?: {
    tradeId?: string;
    amount?: number;
    symbol?: string;
    profit?: number;
    component?: string;
  };
}

interface NotificationCenterProps {
  className?: string;
  maxNotifications?: number;
}

// Generate sample notifications
function generateNotifications(count: number): Notification[] {
  const types: Notification['type'][] = ['trade', 'system', 'security', 'alert', 'info'];
  const priorities: Notification['priority'][] = ['low', 'medium', 'high', 'critical'];
  
  const templates = {
    trade: [
      { title: 'Trade Executed', message: 'Successfully bought {amount} {symbol} at ${price}', emoji: '💰' },
      { title: 'Profitable Trade', message: 'Trade closed with ${profit} profit on {symbol}', emoji: '🚀' },
      { title: 'Stop Loss Triggered', message: 'Position closed due to stop loss on {symbol}', emoji: '🛑' },
      { title: 'Take Profit Hit', message: 'Take profit target reached for {symbol}', emoji: '🎯' },
    ],
    system: [
      { title: 'System Health Check', message: 'All systems operating normally', emoji: '✅' },
      { title: 'High CPU Usage', message: 'CPU usage at {usage}% - monitoring closely', emoji: '⚠️' },
      { title: 'Database Backup', message: 'Daily backup completed successfully', emoji: '💾' },
      { title: 'Service Restart', message: '{component} service restarted automatically', emoji: '🔄' },
    ],
    security: [
      { title: 'Login Attempt', message: 'New login from IP {ip}', emoji: '🔐' },
      { title: 'Security Scan', message: 'Weekly security scan completed - no threats found', emoji: '🛡️' },
      { title: 'SSL Certificate', message: 'SSL certificate renewed successfully', emoji: '🔒' },
      { title: 'Firewall Alert', message: 'Blocked {count} suspicious connection attempts', emoji: '🚫' },
    ],
    alert: [
      { title: 'Market Volatility', message: 'High volatility detected in {symbol}', emoji: '📈' },
      { title: 'API Rate Limit', message: 'Approaching API rate limit - throttling requests', emoji: '⏱️' },
      { title: 'Low Balance', message: 'Account balance below minimum threshold', emoji: '💸' },
      { title: 'Connection Issue', message: 'Intermittent connection issues with {exchange}', emoji: '🌐' },
    ],
    info: [
      { title: 'Market Analysis', message: 'Daily market analysis report generated', emoji: 'ℹ️' },
      { title: 'Strategy Update', message: 'Trading strategy parameters updated', emoji: '⚙️' },
      { title: 'Performance Report', message: 'Weekly performance report available', emoji: '📊' },
      { title: 'News Alert', message: 'Important crypto news detected', emoji: '📰' },
    ],
  };

  const notifications: Notification[] = [];
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const template = templates[type][Math.floor(Math.random() * templates[type].length)];
    
    const timestamp = new Date(Date.now() - i * Math.random() * 86400000).toISOString();
    const isRead = Math.random() > 0.3;
    const isArchived = Math.random() > 0.8;
    
    notifications.push({
      id: `notification-${i}`,
      type,
      priority,
      title: template.title,
      message: template.message
        .replace('{amount}', (Math.random() * 10).toFixed(4))
        .replace('{symbol}', 'BTC/USDT')
        .replace('{price}', (45000 + Math.random() * 5000).toFixed(2))
        .replace('{profit}', (Math.random() * 500).toFixed(2))
        .replace('{usage}', (Math.random() * 40 + 60).toFixed(0))
        .replace('{component}', 'TradingEngine')
        .replace('{ip}', '192.168.1.' + Math.floor(Math.random() * 255))
        .replace('{count}', Math.floor(Math.random() * 50).toString())
        .replace('{exchange}', 'Gate.io'),
      timestamp,
      isRead,
      isArchived,
      emoji: template.emoji,
      metadata: type === 'trade' ? {
        tradeId: `trade-${Math.floor(Math.random() * 1000)}`,
        amount: Math.random() * 10,
        symbol: 'BTC/USDT',
        profit: Math.random() * 500 - 100,
      } : undefined,
    });
  }
  
  return notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Get notification type styling
function getNotificationStyle(type: Notification['type'], priority: Notification['priority']) {
  const baseStyle = 'border-l-4 hover:bg-muted/20 transition-colors';
  
  const typeStyles = {
    trade: 'border-l-green-500 bg-green-500/5',
    system: 'border-l-blue-500 bg-blue-500/5',
    security: 'border-l-purple-500 bg-purple-500/5',
    alert: 'border-l-yellow-500 bg-yellow-500/5',
    info: 'border-l-gray-500 bg-gray-500/5',
  };
  
  const priorityStyles = {
    critical: 'ring-2 ring-red-500/50',
    high: 'ring-1 ring-orange-500/50',
    medium: '',
    low: 'opacity-75',
  };
  
  return cn(baseStyle, typeStyles[type], priorityStyles[priority]);
}

// Get notification icon
function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'trade':
      return <DollarSign className="h-5 w-5 text-green-500" />;
    case 'system':
      return <Zap className="h-5 w-5 text-blue-500" />;
    case 'security':
      return <Shield className="h-5 w-5 text-purple-500" />;
    case 'alert':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'info':
      return <Info className="h-5 w-5 text-gray-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
}

// Individual notification component
function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onArchive, 
  onDelete 
}: { 
  notification: Notification; 
  onMarkAsRead: (id: string) => void; 
  onArchive: (id: string) => void; 
  onDelete: (id: string) => void; 
}) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'p-4 rounded-r-lg cursor-pointer group',
        getNotificationStyle(notification.type, notification.priority),
        !notification.isRead && 'bg-primary/5'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-1">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className={cn(
                'text-sm font-medium',
                !notification.isRead && 'font-semibold'
              )}>
                {notification.title}
              </h4>
              {!notification.isRead && (
                <div className="h-2 w-2 bg-primary rounded-full" />
              )}
              <span className={cn(
                'text-xs px-2 py-0.5 rounded',
                notification.priority === 'critical' ? 'bg-red-500/10 text-red-500' :
                notification.priority === 'high' ? 'bg-orange-500/10 text-orange-500' :
                notification.priority === 'medium' ? 'bg-blue-500/10 text-blue-500' :
                'bg-gray-500/10 text-gray-500'
              )}>
                {notification.priority.toUpperCase()}
              </span>
            </div>
            <div className="flex items-start space-x-2">
              {notification.emoji && (
                <span className="text-sm mt-0.5">{notification.emoji}</span>
              )}
              <p className="text-sm text-muted-foreground flex-1">
                {notification.message}
              </p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(notification.timestamp)}
              </span>
              {notification.metadata && (
                <div className="text-xs text-muted-foreground">
                  {notification.metadata.tradeId && (
                    <span>Trade: {notification.metadata.tradeId}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              title="Mark as read"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onArchive(notification.id);
            }}
            title="Archive"
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationCenter({ className = '', maxNotifications = 100 }: NotificationCenterProps) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = React.useState<Notification[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<Notification['type'] | 'all'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = React.useState(false);
  const [showArchived, setShowArchived] = React.useState(false);

  // Load notifications
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(generateNotifications(maxNotifications));
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [maxNotifications]);

  // Filter notifications
  React.useEffect(() => {
    let filtered = notifications;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(notification => notification.type === selectedType);
    }

    // Filter by read status
    if (showUnreadOnly) {
      filtered = filtered.filter(notification => !notification.isRead);
    }

    // Filter by archived status
    if (!showArchived) {
      filtered = filtered.filter(notification => !notification.isArchived);
    }

    setFilteredNotifications(filtered);
  }, [notifications, searchTerm, selectedType, showUnreadOnly, showArchived]);

  // Actions
  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(notification =>
      notification.id === id ? { ...notification, isRead: true } : notification
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })));
  };

  const archiveNotification = (id: string) => {
    setNotifications(prev => prev.map(notification =>
      notification.id === id ? { ...notification, isArchived: true } : notification
    ));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Get counts
  const unreadCount = notifications.filter(n => !n.isRead && !n.isArchived).length;
  const typeCounts = React.useMemo(() => {
    const counts = { trade: 0, system: 0, security: 0, alert: 0, info: 0 };
    filteredNotifications.forEach(notification => {
      counts[notification.type]++;
    });
    return counts;
  }, [filteredNotifications]);

  if (isLoading) {
    return (
      <div className={cn('glass-card p-6 rounded-xl', className)}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AnimatedEmoji emoji={TradingEmojis.loading} animation="spin" size="xl" />
            <p className="mt-4 text-muted-foreground">Loading notifications...</p>
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
            <div className="relative">
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.div>
              )}
            </div>
            <span>Notification Center</span>
          </h2>
          <p className="text-muted-foreground">Trading alerts and system notifications</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <CheckCircle className="h-4 w-4 mr-1" />
            Mark All Read
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
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
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as Notification['type'] | 'all')}
            className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Types</option>
            <option value="trade">Trade ({typeCounts.trade})</option>
            <option value="system">System ({typeCounts.system})</option>
            <option value="security">Security ({typeCounts.security})</option>
            <option value="alert">Alert ({typeCounts.alert})</option>
            <option value="info">Info ({typeCounts.info})</option>
          </select>

          {/* Toggle Filters */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Unread only</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Show archived</span>
            </label>
          </div>

          {/* Stats */}
          <div className="text-sm text-muted-foreground">
            {filteredNotifications.length} notifications
            {unreadCount > 0 && ` • ${unreadCount} unread`}
          </div>
        </div>
      </motion.div>

      {/* Notifications List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="trading-card"
      >
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold flex items-center space-x-2">
            <BellRing className="h-4 w-4" />
            <span>Recent Notifications</span>
          </h3>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          <AnimatePresence>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onArchive={archiveNotification}
                  onDelete={deleteNotification}
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground"
              >
                <AnimatedEmoji emoji={TradingEmojis.search} size="lg" />
                <p className="mt-2">No notifications match your current filters</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}