'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Bell, 
  Shield, 
  Zap, 
  DollarSign,
  TrendingUp,
  Database,
  Wifi,
  Moon,
  Sun,
  Monitor,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  MessageSquare,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';
import { Button } from '@/components/ui/button';

interface SettingsConfig {
  trading: {
    enabled: boolean;
    maxPositions: number;
    riskPerTrade: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    tradingPairs: string[];
    paperTrading: boolean;
  };
  notifications: {
    telegram: {
      enabled: boolean;
      botToken: string;
      chatId: string;
      tradeAlerts: boolean;
      systemAlerts: boolean;
      errorAlerts: boolean;
    };
    email: {
      enabled: boolean;
      smtpHost: string;
      smtpPort: number;
      username: string;
      password: string;
      recipient: string;
      tradeAlerts: boolean;
      systemAlerts: boolean;
      errorAlerts: boolean;
    };
    sound: {
      enabled: boolean;
      volume: number;
      tradeSound: boolean;
      alertSound: boolean;
    };
  };
  dashboard: {
    theme: 'light' | 'dark' | 'system';
    autoRefresh: boolean;
    refreshInterval: number;
    showAnimations: boolean;
    compactMode: boolean;
    showEmojis: boolean;
  };
  security: {
    apiKeyEncryption: boolean;
    sessionTimeout: number;
    twoFactorAuth: boolean;
    ipWhitelist: string[];
    logRetentionDays: number;
  };
  system: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    maxLogFiles: number;
    backupEnabled: boolean;
    backupInterval: number;
    performanceMonitoring: boolean;
    healthCheckInterval: number;
  };
}

interface SettingsPanelProps {
  className?: string;
}

// Default settings
const defaultSettings: SettingsConfig = {
  trading: {
    enabled: true,
    maxPositions: 3,
    riskPerTrade: 2.0,
    stopLossPercent: 5.0,
    takeProfitPercent: 10.0,
    tradingPairs: ['BTC/USDT', 'ETH/USDT'],
    paperTrading: false,
  },
  notifications: {
    telegram: {
      enabled: true,
      botToken: '',
      chatId: '',
      tradeAlerts: true,
      systemAlerts: true,
      errorAlerts: true,
    },
    email: {
      enabled: false,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      username: '',
      password: '',
      recipient: '',
      tradeAlerts: true,
      systemAlerts: false,
      errorAlerts: true,
    },
    sound: {
      enabled: true,
      volume: 50,
      tradeSound: true,
      alertSound: true,
    },
  },
  dashboard: {
    theme: 'system',
    autoRefresh: true,
    refreshInterval: 5000,
    showAnimations: true,
    compactMode: false,
    showEmojis: true,
  },
  security: {
    apiKeyEncryption: true,
    sessionTimeout: 3600,
    twoFactorAuth: false,
    ipWhitelist: [],
    logRetentionDays: 30,
  },
  system: {
    logLevel: 'info',
    maxLogFiles: 10,
    backupEnabled: true,
    backupInterval: 24,
    performanceMonitoring: true,
    healthCheckInterval: 60,
  },
};

// Settings section component
function SettingsSection({ 
  title, 
  icon, 
  children, 
  className = '' 
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('trading-card p-6', className)}
    >
      <div className="flex items-center space-x-2 mb-4">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </motion.div>
  );
}

// Settings field component
function SettingsField({ 
  label, 
  description, 
  children, 
  className = '' 
}: { 
  label: string; 
  description?: string; 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div>
        <label className="text-sm font-medium">{label}</label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export function SettingsPanel({ className = '' }: SettingsPanelProps) {
  const [settings, setSettings] = React.useState<SettingsConfig>(defaultSettings);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showPasswords, setShowPasswords] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<keyof SettingsConfig>('trading');

  // Load settings from localStorage
  React.useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('trading-agent-settings');
      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  // Update settings
  const updateSettings = (section: keyof SettingsConfig, updates: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates,
      },
    }));
    setHasChanges(true);
  };

  // Save settings
  const saveSettings = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('trading-agent-settings', JSON.stringify(settings));
      // In a real implementation, this would also send to the backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset settings
  const resetSettings = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const tabs = [
    { key: 'trading' as const, label: 'Trading', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'notifications' as const, label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { key: 'dashboard' as const, label: 'Dashboard', icon: <Monitor className="h-4 w-4" /> },
    { key: 'security' as const, label: 'Security', icon: <Shield className="h-4 w-4" /> },
    { key: 'system' as const, label: 'System', icon: <Database className="h-4 w-4" /> },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <AnimatedEmoji emoji={TradingEmojis.gear} animation="spin" />
            <span>Settings Panel</span>
          </h2>
          <p className="text-muted-foreground">Configure trading bot and system preferences</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetSettings}
            disabled={isSaving}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={saveSettings}
            disabled={!hasChanges || isSaving}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Changes indicator */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="trading-card p-3 border-yellow-500/20 bg-yellow-500/5"
        >
          <div className="flex items-center space-x-2 text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">You have unsaved changes</span>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="trading-card">
        <div className="border-b border-border">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center space-x-2 py-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Trading Settings */}
          {activeTab === 'trading' && (
            <div className="space-y-6">
              <SettingsField
                label="Trading Enabled"
                description="Enable or disable automated trading"
              >
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.trading.enabled}
                    onChange={(e) => updateSettings('trading', { enabled: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Enable automated trading</span>
                </label>
              </SettingsField>

              <SettingsField
                label="Paper Trading"
                description="Use paper trading mode for testing strategies"
              >
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.trading.paperTrading}
                    onChange={(e) => updateSettings('trading', { paperTrading: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Enable paper trading mode</span>
                </label>
              </SettingsField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SettingsField
                  label="Max Positions"
                  description="Maximum number of concurrent positions"
                >
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.trading.maxPositions}
                    onChange={(e) => updateSettings('trading', { maxPositions: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </SettingsField>

                <SettingsField
                  label="Risk Per Trade (%)"
                  description="Percentage of account to risk per trade"
                >
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={settings.trading.riskPerTrade}
                    onChange={(e) => updateSettings('trading', { riskPerTrade: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </SettingsField>

                <SettingsField
                  label="Stop Loss (%)"
                  description="Default stop loss percentage"
                >
                  <input
                    type="number"
                    min="1"
                    max="20"
                    step="0.1"
                    value={settings.trading.stopLossPercent}
                    onChange={(e) => updateSettings('trading', { stopLossPercent: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </SettingsField>

                <SettingsField
                  label="Take Profit (%)"
                  description="Default take profit percentage"
                >
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="0.1"
                    value={settings.trading.takeProfitPercent}
                    onChange={(e) => updateSettings('trading', { takeProfitPercent: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </SettingsField>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Telegram Settings */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span>Telegram Notifications</span>
                </h4>
                
                <SettingsField label="Enable Telegram">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.telegram.enabled}
                      onChange={(e) => updateSettings('notifications', { 
                        telegram: { ...settings.notifications.telegram, enabled: e.target.checked }
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">Send notifications via Telegram</span>
                  </label>
                </SettingsField>

                {settings.notifications.telegram.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingsField label="Bot Token">
                      <div className="relative">
                        <input
                          type={showPasswords ? 'text' : 'password'}
                          value={settings.notifications.telegram.botToken}
                          onChange={(e) => updateSettings('notifications', { 
                            telegram: { ...settings.notifications.telegram, botToken: e.target.value }
                          })}
                          className="w-full px-3 py-2 pr-10 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Enter bot token"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                          {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </SettingsField>

                    <SettingsField label="Chat ID">
                      <input
                        type="text"
                        value={settings.notifications.telegram.chatId}
                        onChange={(e) => updateSettings('notifications', { 
                          telegram: { ...settings.notifications.telegram, chatId: e.target.value }
                        })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter chat ID"
                      />
                    </SettingsField>
                  </div>
                )}
              </div>

              {/* Email Settings */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-green-500" />
                  <span>Email Notifications</span>
                </h4>
                
                <SettingsField label="Enable Email">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.email.enabled}
                      onChange={(e) => updateSettings('notifications', { 
                        email: { ...settings.notifications.email, enabled: e.target.checked }
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">Send notifications via email</span>
                  </label>
                </SettingsField>

                {settings.notifications.email.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingsField label="SMTP Host">
                      <input
                        type="text"
                        value={settings.notifications.email.smtpHost}
                        onChange={(e) => updateSettings('notifications', { 
                          email: { ...settings.notifications.email, smtpHost: e.target.value }
                        })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </SettingsField>

                    <SettingsField label="SMTP Port">
                      <input
                        type="number"
                        value={settings.notifications.email.smtpPort}
                        onChange={(e) => updateSettings('notifications', { 
                          email: { ...settings.notifications.email, smtpPort: parseInt(e.target.value) }
                        })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </SettingsField>

                    <SettingsField label="Username">
                      <input
                        type="text"
                        value={settings.notifications.email.username}
                        onChange={(e) => updateSettings('notifications', { 
                          email: { ...settings.notifications.email, username: e.target.value }
                        })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </SettingsField>

                    <SettingsField label="Password">
                      <div className="relative">
                        <input
                          type={showPasswords ? 'text' : 'password'}
                          value={settings.notifications.email.password}
                          onChange={(e) => updateSettings('notifications', { 
                            email: { ...settings.notifications.email, password: e.target.value }
                          })}
                          className="w-full px-3 py-2 pr-10 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                          {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </SettingsField>
                  </div>
                )}
              </div>

              {/* Sound Settings */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center space-x-2">
                  <Volume2 className="h-4 w-4 text-purple-500" />
                  <span>Sound Notifications</span>
                </h4>
                
                <SettingsField label="Enable Sound">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sound.enabled}
                      onChange={(e) => updateSettings('notifications', { 
                        sound: { ...settings.notifications.sound, enabled: e.target.checked }
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">Play sound notifications</span>
                  </label>
                </SettingsField>

                {settings.notifications.sound.enabled && (
                  <SettingsField label="Volume">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.notifications.sound.volume}
                      onChange={(e) => updateSettings('notifications', { 
                        sound: { ...settings.notifications.sound, volume: parseInt(e.target.value) }
                      })}
                      className="w-full"
                    />
                    <div className="text-sm text-muted-foreground">
                      Volume: {settings.notifications.sound.volume}%
                    </div>
                  </SettingsField>
                )}
              </div>
            </div>
          )}

          {/* Dashboard Settings */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SettingsField
                  label="Theme"
                  description="Choose your preferred theme"
                >
                  <select
                    value={settings.dashboard.theme}
                    onChange={(e) => updateSettings('dashboard', { theme: e.target.value as 'light' | 'dark' | 'system' })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </SettingsField>

                <SettingsField
                  label="Refresh Interval (ms)"
                  description="How often to refresh dashboard data"
                >
                  <input
                    type="number"
                    min="1000"
                    max="60000"
                    step="1000"
                    value={settings.dashboard.refreshInterval}
                    onChange={(e) => updateSettings('dashboard', { refreshInterval: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </SettingsField>
              </div>

              <div className="space-y-4">
                <SettingsField label="Auto Refresh">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.dashboard.autoRefresh}
                      onChange={(e) => updateSettings('dashboard', { autoRefresh: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Automatically refresh dashboard data</span>
                  </label>
                </SettingsField>

                <SettingsField label="Show Animations">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.dashboard.showAnimations}
                      onChange={(e) => updateSettings('dashboard', { showAnimations: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Enable dashboard animations</span>
                  </label>
                </SettingsField>

                <SettingsField label="Show Emojis">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.dashboard.showEmojis}
                      onChange={(e) => updateSettings('dashboard', { showEmojis: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Show emojis in dashboard</span>
                  </label>
                </SettingsField>

                <SettingsField label="Compact Mode">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.dashboard.compactMode}
                      onChange={(e) => updateSettings('dashboard', { compactMode: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Use compact dashboard layout</span>
                  </label>
                </SettingsField>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SettingsField
                  label="Session Timeout (seconds)"
                  description="Automatic logout after inactivity"
                >
                  <input
                    type="number"
                    min="300"
                    max="86400"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => updateSettings('security', { sessionTimeout: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </SettingsField>

                <SettingsField
                  label="Log Retention (days)"
                  description="How long to keep log files"
                >
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.security.logRetentionDays}
                    onChange={(e) => updateSettings('security', { logRetentionDays: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </SettingsField>
              </div>

              <div className="space-y-4">
                <SettingsField label="API Key Encryption">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.security.apiKeyEncryption}
                      onChange={(e) => updateSettings('security', { apiKeyEncryption: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Encrypt API keys in storage</span>
                  </label>
                </SettingsField>

                <SettingsField label="Two-Factor Authentication">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.security.twoFactorAuth}
                      onChange={(e) => updateSettings('security', { twoFactorAuth: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Enable 2FA for dashboard access</span>
                  </label>
                </SettingsField>
              </div>
            </div>
          )}

          {/* System Settings */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SettingsField
                  label="Log Level"
                  description="Minimum log level to record"
                >
                  <select
                    value={settings.system.logLevel}
                    onChange={(e) => updateSettings('system', { logLevel: e.target.value as 'debug' | 'info' | 'warn' | 'error' })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </SettingsField>

                <SettingsField
                  label="Max Log Files"
                  description="Maximum number of log files to keep"
                >
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.system.maxLogFiles}
                    onChange={(e) => updateSettings('system', { maxLogFiles: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </SettingsField>

                <SettingsField
                  label="Backup Interval (hours)"
                  description="How often to create backups"
                >
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={settings.system.backupInterval}
                    onChange={(e) => updateSettings('system', { backupInterval: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </SettingsField>

                <SettingsField
                  label="Health Check Interval (seconds)"
                  description="How often to check system health"
                >
                  <input
                    type="number"
                    min="10"
                    max="3600"
                    value={settings.system.healthCheckInterval}
                    onChange={(e) => updateSettings('system', { healthCheckInterval: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </SettingsField>
              </div>

              <div className="space-y-4">
                <SettingsField label="Backup Enabled">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.system.backupEnabled}
                      onChange={(e) => updateSettings('system', { backupEnabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Enable automatic backups</span>
                  </label>
                </SettingsField>

                <SettingsField label="Performance Monitoring">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.system.performanceMonitoring}
                      onChange={(e) => updateSettings('system', { performanceMonitoring: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Enable performance monitoring</span>
                  </label>
                </SettingsField>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save confirmation */}
      {!hasChanges && !isSaving && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="trading-card p-3 border-green-500/20 bg-green-500/5"
        >
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">All settings saved successfully</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}