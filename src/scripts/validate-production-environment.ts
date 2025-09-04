#!/usr/bin/env tsx

/**
 * Production Environment Validation Script
 * Validates all environment variables and external service connections
 * for Intel NUC production deployment
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import axios from 'axios';
import nodemailer from 'nodemailer';

interface ValidationResult {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  required: boolean;
}

class ProductionEnvironmentValidator {
  private results: ValidationResult[] = [];
  private env: Record<string, string> = {};

  constructor() {
    // Load environment variables
    this.loadEnvironment();
  }

  private loadEnvironment(): void {
    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valueParts] = trimmed.split('=');
            const value = valueParts.join('=');
            this.env[key] = value;
          }
        }
      }
      
      // Also load from process.env
      Object.assign(this.env, process.env);
    } catch (error) {
      console.error('❌ Failed to load environment variables:', error);
    }
  }

  private addResult(category: string, name: string, status: 'pass' | 'fail' | 'warning', message: string, required: boolean = true): void {
    this.results.push({ category, name, status, message, required });
  }

  private checkRequired(category: string, name: string, envVar: string, description: string): boolean {
    const value = this.env[envVar];
    if (!value || value.startsWith('REPLACE_WITH_')) {
      this.addResult(category, name, 'fail', `${description} - Missing or placeholder value`, true);
      return false;
    }
    this.addResult(category, name, 'pass', `${description} - Configured`, true);
    return true;
  }

  private checkOptional(category: string, name: string, envVar: string, description: string): boolean {
    const value = this.env[envVar];
    if (!value || value.startsWith('REPLACE_WITH_')) {
      this.addResult(category, name, 'warning', `${description} - Not configured (optional)`, false);
      return false;
    }
    this.addResult(category, name, 'pass', `${description} - Configured`, false);
    return true;
  }

  async validateSystemConfiguration(): Promise<void> {
    console.log('🔍 Validating System Configuration...');

    // Node.js environment
    this.checkRequired('System', 'Node Environment', 'NODE_ENV', 'Node.js environment');
    this.checkRequired('System', 'Log Level', 'LOG_LEVEL', 'Logging level');
    this.checkRequired('System', 'API Port', 'PORT', 'API server port');
    this.checkRequired('System', 'Dashboard Port', 'DASHBOARD_PORT', 'Dashboard port');

    // Intel NUC optimization
    this.checkOptional('System', 'Memory Limit', 'MAX_MEMORY_USAGE_MB', 'Memory usage limit');
    this.checkOptional('System', 'CPU Cores', 'CPU_CORES', 'CPU core count');
  }

  async validateSecurityConfiguration(): Promise<void> {
    console.log('🔒 Validating Security Configuration...');

    // Critical security keys
    const masterKey = this.env['MASTER_ENCRYPTION_KEY'];
    if (!masterKey || masterKey.startsWith('REPLACE_WITH_') || masterKey.length < 64) {
      this.addResult('Security', 'Master Encryption Key', 'fail', 'Master encryption key missing or too short (min 64 chars)', true);
    } else {
      this.addResult('Security', 'Master Encryption Key', 'pass', 'Master encryption key configured', true);
    }

    const jwtSecret = this.env['JWT_SECRET'];
    if (!jwtSecret || jwtSecret.startsWith('REPLACE_WITH_') || jwtSecret.length < 64) {
      this.addResult('Security', 'JWT Secret', 'fail', 'JWT secret missing or too short (min 64 chars)', true);
    } else {
      this.addResult('Security', 'JWT Secret', 'pass', 'JWT secret configured', true);
    }

    this.checkRequired('Security', 'Session Secret', 'SESSION_SECRET', 'Session secret');
    this.checkOptional('Security', 'CORS Origins', 'CORS_ORIGINS', 'CORS allowed origins');
  }

  async validateGateIOConfiguration(): Promise<void> {
    console.log('💰 Validating Gate.io API Configuration...');

    const apiKey = this.checkRequired('Gate.io', 'API Key', 'GATE_IO_API_KEY', 'Gate.io API key');
    const apiSecret = this.checkRequired('Gate.io', 'API Secret', 'GATE_IO_API_SECRET', 'Gate.io API secret');
    const passphrase = this.checkRequired('Gate.io', 'Passphrase', 'GATE_IO_API_PASSPHRASE', 'Gate.io API passphrase');

    this.checkRequired('Gate.io', 'Base URL', 'GATE_IO_BASE_URL', 'Gate.io API base URL');
    this.checkOptional('Gate.io', 'Rate Limit', 'GATE_IO_RATE_LIMIT_MS', 'Gate.io rate limiting');

    // Test API connection if credentials are available
    if (apiKey && apiSecret && passphrase) {
      try {
        // Note: This would require actual API testing implementation
        this.addResult('Gate.io', 'API Connection', 'warning', 'API connection test not implemented', false);
      } catch (error) {
        this.addResult('Gate.io', 'API Connection', 'fail', `API connection failed: ${error}`, true);
      }
    }
  }

  async validateSSHTunnelConfiguration(): Promise<void> {
    console.log('🔗 Validating SSH Tunnel Configuration...');

    this.checkRequired('SSH Tunnel', 'Oracle Host', 'ORACLE_SSH_HOST', 'Oracle Cloud host');
    this.checkRequired('SSH Tunnel', 'SSH Username', 'ORACLE_SSH_USERNAME', 'SSH username');
    this.checkRequired('SSH Tunnel', 'Private Key Path', 'ORACLE_PRIVATE_KEY_PATH', 'SSH private key path');

    // Check if SSH key file exists
    const keyPath = this.env['ORACLE_PRIVATE_KEY_PATH'];
    if (keyPath && !keyPath.startsWith('REPLACE_WITH_')) {
      if (fs.existsSync(keyPath)) {
        // Check key file permissions
        try {
          const stats = fs.statSync(keyPath);
          const mode = stats.mode & parseInt('777', 8);
          if (mode === parseInt('600', 8)) {
            this.addResult('SSH Tunnel', 'Key Permissions', 'pass', 'SSH key has correct permissions (600)', true);
          } else {
            this.addResult('SSH Tunnel', 'Key Permissions', 'fail', `SSH key has incorrect permissions (${mode.toString(8)}), should be 600`, true);
          }
        } catch (error) {
          this.addResult('SSH Tunnel', 'Key Permissions', 'fail', `Failed to check key permissions: ${error}`, true);
        }
      } else {
        this.addResult('SSH Tunnel', 'Key File', 'fail', 'SSH private key file not found', true);
      }
    }

    this.checkOptional('SSH Tunnel', 'Local Port', 'SSH_TUNNEL_LOCAL_PORT', 'SSH tunnel local port');
    this.checkOptional('SSH Tunnel', 'Remote Port', 'SSH_TUNNEL_REMOTE_PORT', 'SSH tunnel remote port');
  }

  async validateDatabaseConfiguration(): Promise<void> {
    console.log('🗄️ Validating Database Configuration...');

    this.checkRequired('Database', 'Connection URL', 'DATABASE_URL', 'Database connection URL');
    this.checkRequired('Database', 'Host', 'DATABASE_HOST', 'Database host');
    this.checkRequired('Database', 'Name', 'DATABASE_NAME', 'Database name');
    this.checkRequired('Database', 'User', 'DATABASE_USER', 'Database user');
    this.checkRequired('Database', 'Password', 'DATABASE_PASSWORD', 'Database password');

    // Test database connection
    try {
      // Note: This would require actual database connection testing
      this.addResult('Database', 'Connection Test', 'warning', 'Database connection test not implemented', false);
    } catch (error) {
      this.addResult('Database', 'Connection Test', 'fail', `Database connection failed: ${error}`, true);
    }
  }

  async validateAIConfiguration(): Promise<void> {
    console.log('🤖 Validating AI Configuration...');

    // Google AI
    this.checkRequired('AI', 'Google AI API Key', 'GOOGLE_AI_API_KEY', 'Google AI API key');
    this.checkOptional('AI', 'Google AI Model', 'GOOGLE_AI_MODEL', 'Google AI model');

    // Ollama configuration
    this.checkOptional('AI', 'Ollama Host', 'OLLAMA_HOST', 'Ollama host URL');
    this.checkOptional('AI', 'Llama Model', 'OLLAMA_MODEL_LLAMA', 'Llama model name');
    this.checkOptional('AI', 'Mistral Model', 'OLLAMA_MODEL_MISTRAL', 'Mistral model name');

    // AI settings
    this.checkOptional('AI', 'Max Tokens', 'LLM_MAX_TOKENS', 'LLM max tokens');
    this.checkOptional('AI', 'Temperature', 'LLM_TEMPERATURE', 'LLM temperature');
  }

  async validateNotificationConfiguration(): Promise<void> {
    console.log('📢 Validating Notification Configuration...');

    // Telegram configuration
    const telegramToken = this.checkRequired('Notifications', 'Telegram Bot Token', 'TELEGRAM_BOT_TOKEN', 'Telegram bot token');
    const telegramChatId = this.checkRequired('Notifications', 'Telegram Chat ID', 'TELEGRAM_CHAT_ID', 'Telegram chat ID');

    // Email configuration
    const emailFrom = this.checkRequired('Notifications', 'Email From', 'EMAIL_FROM', 'Email sender address');
    const emailPassword = this.checkRequired('Notifications', 'Email Password', 'EMAIL_PASSWORD', 'Email password/app password');
    const emailTo = this.checkRequired('Notifications', 'Email To', 'EMAIL_TO', 'Email recipient address');

    this.checkOptional('Notifications', 'SMTP Host', 'EMAIL_SMTP_HOST', 'SMTP server host');
    this.checkOptional('Notifications', 'SMTP Port', 'EMAIL_SMTP_PORT', 'SMTP server port');

    // Test email configuration
    const emailFromValue = this.env['EMAIL_FROM'];
    const emailPasswordValue = this.env['EMAIL_PASSWORD'];
    if (emailFrom && emailPassword && emailFromValue && emailPasswordValue && !emailFromValue.startsWith('REPLACE_WITH_') && !emailPasswordValue.startsWith('REPLACE_WITH_')) {
      try {
        const transporter = nodemailer.createTransport({
          host: this.env['EMAIL_SMTP_HOST'] || 'smtp.gmail.com',
          port: parseInt(this.env['EMAIL_SMTP_PORT'] || '587'),
          secure: this.env['EMAIL_SMTP_SECURE'] === 'true',
          auth: {
            user: emailFrom,
            pass: emailPassword
          }
        });

        await transporter.verify();
        this.addResult('Notifications', 'Email Connection', 'pass', 'Email SMTP connection successful', true);
      } catch (error) {
        this.addResult('Notifications', 'Email Connection', 'fail', `Email SMTP connection failed: ${error}`, true);
      }
    }
  }

  async validateSentimentAnalysisConfiguration(): Promise<void> {
    console.log('📊 Validating Sentiment Analysis Configuration...');

    // Twitter API
    this.checkOptional('Sentiment', 'Twitter API Key', 'TWITTER_API_KEY', 'Twitter API key');
    this.checkOptional('Sentiment', 'Twitter API Secret', 'TWITTER_API_SECRET', 'Twitter API secret');
    this.checkOptional('Sentiment', 'Twitter Access Token', 'TWITTER_ACCESS_TOKEN', 'Twitter access token');

    // Reddit API
    this.checkOptional('Sentiment', 'Reddit Client ID', 'REDDIT_CLIENT_ID', 'Reddit client ID');
    this.checkOptional('Sentiment', 'Reddit Client Secret', 'REDDIT_CLIENT_SECRET', 'Reddit client secret');

    // News API
    this.checkOptional('Sentiment', 'News API Key', 'NEWS_API_KEY', 'News API key');
  }

  async validateTradingConfiguration(): Promise<void> {
    console.log('📈 Validating Trading Configuration...');

    this.checkOptional('Trading', 'Trading Pairs', 'DEFAULT_TRADING_PAIRS', 'Default trading pairs');
    this.checkOptional('Trading', 'Risk Percentage', 'RISK_PERCENTAGE_PER_TRADE', 'Risk percentage per trade');
    this.checkOptional('Trading', 'Max Daily Loss', 'MAX_DAILY_LOSS_PERCENTAGE', 'Maximum daily loss percentage');
    this.checkOptional('Trading', 'Stop Loss', 'STOP_LOSS_PERCENTAGE', 'Stop loss percentage');
    this.checkOptional('Trading', 'Take Profit', 'TAKE_PROFIT_PERCENTAGE', 'Take profit percentage');

    // Position sizing
    this.checkOptional('Trading', 'Max Position Size', 'MAX_POSITION_SIZE_USD', 'Maximum position size');
    this.checkOptional('Trading', 'Min Position Size', 'MIN_POSITION_SIZE_USD', 'Minimum position size');

    // Trading modes
    const paperTrading = this.env['ENABLE_PAPER_TRADING'];
    const liveTrading = this.env['ENABLE_LIVE_TRADING'];
    
    if (paperTrading === 'true' && liveTrading === 'true') {
      this.addResult('Trading', 'Trading Mode', 'warning', 'Both paper and live trading enabled - verify intended configuration', false);
    } else if (paperTrading === 'true') {
      this.addResult('Trading', 'Trading Mode', 'pass', 'Paper trading mode enabled', false);
    } else if (liveTrading === 'true') {
      this.addResult('Trading', 'Trading Mode', 'pass', 'Live trading mode enabled', false);
    } else {
      this.addResult('Trading', 'Trading Mode', 'warning', 'No trading mode explicitly enabled', false);
    }
  }

  async validateSystemRequirements(): Promise<void> {
    console.log('⚙️ Validating System Requirements...');

    // Check Node.js version
    try {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      if (majorVersion >= 18) {
        this.addResult('System Requirements', 'Node.js Version', 'pass', `Node.js ${nodeVersion} (>= 18.0.0)`, true);
      } else {
        this.addResult('System Requirements', 'Node.js Version', 'fail', `Node.js ${nodeVersion} (requires >= 18.0.0)`, true);
      }
    } catch (error) {
      this.addResult('System Requirements', 'Node.js Version', 'fail', `Failed to check Node.js version: ${error}`, true);
    }

    // Check npm version
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      const majorVersion = parseInt(npmVersion.split('.')[0]);
      if (majorVersion >= 9) {
        this.addResult('System Requirements', 'npm Version', 'pass', `npm ${npmVersion} (>= 9.0.0)`, true);
      } else {
        this.addResult('System Requirements', 'npm Version', 'fail', `npm ${npmVersion} (requires >= 9.0.0)`, true);
      }
    } catch (error) {
      this.addResult('System Requirements', 'npm Version', 'fail', `Failed to check npm version: ${error}`, true);
    }

    // Check PostgreSQL availability
    try {
      execSync('which psql', { encoding: 'utf8' });
      this.addResult('System Requirements', 'PostgreSQL', 'pass', 'PostgreSQL client available', true);
    } catch (error) {
      this.addResult('System Requirements', 'PostgreSQL', 'fail', 'PostgreSQL client not found', true);
    }

    // Check SSH availability
    try {
      execSync('which ssh', { encoding: 'utf8' });
      this.addResult('System Requirements', 'SSH Client', 'pass', 'SSH client available', true);
    } catch (error) {
      this.addResult('System Requirements', 'SSH Client', 'fail', 'SSH client not found', true);
    }
  }

  async validateFilePermissions(): Promise<void> {
    console.log('🔐 Validating File Permissions...');

    // Check .env file permissions
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      try {
        const stats = fs.statSync(envPath);
        const mode = stats.mode & parseInt('777', 8);
        if (mode === parseInt('600', 8)) {
          this.addResult('File Permissions', '.env File', 'pass', '.env file has correct permissions (600)', true);
        } else {
          this.addResult('File Permissions', '.env File', 'fail', `.env file has incorrect permissions (${mode.toString(8)}), should be 600`, true);
        }
      } catch (error) {
        this.addResult('File Permissions', '.env File', 'fail', `Failed to check .env permissions: ${error}`, true);
      }
    } else {
      this.addResult('File Permissions', '.env File', 'fail', '.env file not found', true);
    }

    // Check log directory permissions
    const logDir = this.env['LOG_DIR'] || '/var/log/trading-agent';
    if (fs.existsSync(logDir)) {
      try {
        fs.accessSync(logDir, fs.constants.W_OK);
        this.addResult('File Permissions', 'Log Directory', 'pass', 'Log directory is writable', true);
      } catch (error) {
        this.addResult('File Permissions', 'Log Directory', 'fail', `Log directory not writable: ${error}`, true);
      }
    } else {
      this.addResult('File Permissions', 'Log Directory', 'warning', 'Log directory does not exist (will be created)', false);
    }
  }

  async validateNetworkConnectivity(): Promise<void> {
    console.log('🌐 Validating Network Connectivity...');

    // Test Oracle Cloud connectivity
    const oracleHost = this.env['ORACLE_SSH_HOST'];
    if (oracleHost && !oracleHost.startsWith('REPLACE_WITH_')) {
      try {
        const response = await axios.get(`http://${oracleHost}`, { timeout: 10000 });
        this.addResult('Network', 'Oracle Cloud', 'pass', 'Oracle Cloud host reachable', false);
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          this.addResult('Network', 'Oracle Cloud', 'warning', 'Oracle Cloud host not responding (may be normal for SSH-only access)', false);
        } else {
          this.addResult('Network', 'Oracle Cloud', 'fail', `Oracle Cloud connectivity failed: ${error.message}`, false);
        }
      }
    }

    // Test internet connectivity
    try {
      await axios.get('https://www.google.com', { timeout: 10000 });
      this.addResult('Network', 'Internet', 'pass', 'Internet connectivity available', true);
    } catch (error) {
      this.addResult('Network', 'Internet', 'fail', `Internet connectivity failed: ${error.message}`, true);
    }
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📋 PRODUCTION ENVIRONMENT VALIDATION RESULTS');
    console.log('='.repeat(80));

    const categories = [...new Set(this.results.map(r => r.category))];
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let warningTests = 0;

    for (const category of categories) {
      console.log(`\n📂 ${category}:`);
      const categoryResults = this.results.filter(r => r.category === category);
      
      for (const result of categoryResults) {
        totalTests++;
        const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
        const required = result.required ? '[REQUIRED]' : '[OPTIONAL]';
        console.log(`  ${icon} ${result.name} ${required}: ${result.message}`);
        
        if (result.status === 'pass') passedTests++;
        else if (result.status === 'fail') failedTests++;
        else warningTests++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   ⚠️  Warnings: ${warningTests}`);

    const requiredFailed = this.results.filter(r => r.required && r.status === 'fail').length;
    if (requiredFailed > 0) {
      console.log(`\n❌ DEPLOYMENT BLOCKED: ${requiredFailed} required configuration(s) failed`);
      console.log('   Please fix all required configurations before deployment.');
    } else {
      console.log('\n✅ DEPLOYMENT READY: All required configurations passed');
      if (warningTests > 0) {
        console.log(`   Note: ${warningTests} optional configuration(s) have warnings`);
      }
    }
    console.log('='.repeat(80));
  }

  async runValidation(): Promise<boolean> {
    console.log('🚀 Starting Production Environment Validation...\n');

    try {
      await this.validateSystemRequirements();
      await this.validateSystemConfiguration();
      await this.validateSecurityConfiguration();
      await this.validateGateIOConfiguration();
      await this.validateSSHTunnelConfiguration();
      await this.validateDatabaseConfiguration();
      await this.validateAIConfiguration();
      await this.validateNotificationConfiguration();
      await this.validateSentimentAnalysisConfiguration();
      await this.validateTradingConfiguration();
      await this.validateFilePermissions();
      await this.validateNetworkConnectivity();

      this.printResults();

      const requiredFailed = this.results.filter(r => r.required && r.status === 'fail').length;
      return requiredFailed === 0;
    } catch (error) {
      console.error('❌ Validation failed with error:', error);
      return false;
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ProductionEnvironmentValidator();
  validator.runValidation().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Validation error:', error);
    process.exit(1);
  });
}

export { ProductionEnvironmentValidator };