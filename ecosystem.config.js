/**
 * PM2 Ecosystem Configuration for AI Crypto Trading Agent
 * 
 * This configuration file defines the PM2 process management setup
 * for production deployment of the AI crypto trading agent.
 */

module.exports = {
  apps: [
    {
      name: 'ai-crypto-trading-api',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        LOG_LEVEL: 'debug'
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
        LOG_LEVEL: 'info'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        LOG_LEVEL: 'info'
      },
      // Logging
      error_file: './logs/pm2-api-error.log',
      out_file: './logs/pm2-api-out.log',
      log_file: './logs/pm2-api-combined.log',
      time: true,
      
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'data', 'backups'],
      max_memory_restart: '1G',
      
      // Advanced options
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Auto restart on file changes (development only)
      watch_options: {
        followSymlinks: false,
        usePolling: false
      }
    },
    {
      name: 'ai-crypto-trading-dashboard',
      script: 'npm',
      args: 'run dashboard:start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3002
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3002
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      // Logging
      error_file: './logs/pm2-dashboard-error.log',
      out_file: './logs/pm2-dashboard-out.log',
      log_file: './logs/pm2-dashboard-combined.log',
      time: true,
      
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      
      // Monitoring
      watch: false,
      max_memory_restart: '512M',
      
      // Advanced options
      kill_timeout: 5000,
      listen_timeout: 3000
    },
    {
      name: 'ai-crypto-trading-tunnel',
      script: 'dist/scripts/tunnel-manager.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      // Logging
      error_file: './logs/pm2-tunnel-error.log',
      out_file: './logs/pm2-tunnel-out.log',
      log_file: './logs/pm2-tunnel-combined.log',
      time: true,
      
      // Restart policy - more aggressive for tunnel
      max_restarts: 50,
      min_uptime: '5s',
      restart_delay: 2000,
      
      // Monitoring
      watch: false,
      max_memory_restart: '256M',
      
      // Advanced options
      kill_timeout: 3000,
      listen_timeout: 2000,
      
      // Auto restart on crash
      autorestart: true
    }
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/ai-crypto-trading-agent.git',
      path: '/opt/ai-crypto-trading',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    staging: {
      user: 'ubuntu',
      host: 'localhost',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/ai-crypto-trading-agent.git',
      path: '/opt/ai-crypto-trading-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': ''
    }
  }
};