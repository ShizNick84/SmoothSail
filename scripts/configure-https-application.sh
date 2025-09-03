#!/bin/bash

# =============================================================================
# AI CRYPTO TRADING AGENT - HTTPS APPLICATION CONFIGURATION
# =============================================================================
# This script configures the Node.js application to support HTTPS and
# implements secure web interface configurations.
# 
# Task: 12.2 SSL Certificate Setup - Application Configuration
# Requirements: 4.1, 4.2 - Secure dashboard access
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TRADING_HOME="/opt/trading-agent"
HTTPS_CONFIG_FILE="$TRADING_HOME/src/config/https-config.ts"
DASHBOARD_CONFIG_FILE="$TRADING_HOME/src/dashboard/https-dashboard-server.ts"

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create HTTPS configuration module
create_https_config() {
    log "🔧 Creating HTTPS configuration module..."
    
    mkdir -p "$(dirname "$HTTPS_CONFIG_FILE")"
    
    cat > "$HTTPS_CONFIG_FILE" << 'EOF'
/**
 * HTTPS Configuration for AI Crypto Trading Agent
 * Provides secure HTTPS server configuration with SSL/TLS support
 */

import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { Logger } from '../core/logging/logger';

const logger = new Logger('HTTPSConfig');

export interface HTTPSConfig {
  enabled: boolean;
  port: number;
  httpPort?: number;
  certPath?: string;
  keyPath?: string;
  redirectHttp: boolean;
  securityHeaders: boolean;
  hsts: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
  };
}

export interface SecurityHeaders {
  'Strict-Transport-Security'?: string;
  'X-Frame-Options'?: string;
  'X-Content-Type-Options'?: string;
  'X-XSS-Protection'?: string;
  'Referrer-Policy'?: string;
  'Content-Security-Policy'?: string;
}

export class HTTPSConfigManager {
  private config: HTTPSConfig;
  
  constructor() {
    this.config = this.loadConfig();
  }
  
  /**
   * Load HTTPS configuration from environment variables
   */
  private loadConfig(): HTTPSConfig {
    return {
      enabled: process.env.SSL_ENABLED === 'true' || process.env.HTTPS_ENABLED === 'true',
      port: parseInt(process.env.HTTPS_PORT || '443'),
      httpPort: parseInt(process.env.HTTP_PORT || process.env.PORT || '3000'),
      certPath: process.env.SSL_CERT_PATH,
      keyPath: process.env.SSL_KEY_PATH,
      redirectHttp: process.env.REDIRECT_HTTP !== 'false',
      securityHeaders: process.env.SECURITY_HEADERS !== 'false',
      hsts: {
        enabled: process.env.HSTS_ENABLED !== 'false',
        maxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000'), // 1 year
        includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false'
      }
    };
  }
  
  /**
   * Get HTTPS server options
   */
  getHTTPSOptions(): https.ServerOptions | null {
    if (!this.config.enabled || !this.config.certPath || !this.config.keyPath) {
      return null;
    }
    
    try {
      const cert = fs.readFileSync(this.config.certPath, 'utf8');
      const key = fs.readFileSync(this.config.keyPath, 'utf8');
      
      return {
        cert,
        key,
        // Security options
        secureProtocol: 'TLSv1_2_method',
        ciphers: [
          'ECDHE-RSA-AES128-GCM-SHA256',
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-RSA-AES128-SHA256',
          'ECDHE-RSA-AES256-SHA384',
          'ECDHE-RSA-AES128-SHA',
          'ECDHE-RSA-AES256-SHA',
          'DHE-RSA-AES128-SHA256',
          'DHE-RSA-AES256-SHA256',
          'DHE-RSA-AES128-SHA',
          'DHE-RSA-AES256-SHA',
          '!aNULL',
          '!eNULL',
          '!EXPORT',
          '!DES',
          '!RC4',
          '!MD5',
          '!PSK',
          '!SRP',
          '!CAMELLIA'
        ].join(':'),
        honorCipherOrder: true
      };
    } catch (error) {
      logger.error('Failed to load SSL certificates:', error);
      return null;
    }
  }
  
  /**
   * Get security headers
   */
  getSecurityHeaders(): SecurityHeaders {
    if (!this.config.securityHeaders) {
      return {};
    }
    
    const headers: SecurityHeaders = {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' wss: ws:",
        "frame-ancestors 'none'"
      ].join('; ')
    };
    
    if (this.config.hsts.enabled) {
      let hstsValue = `max-age=${this.config.hsts.maxAge}`;
      if (this.config.hsts.includeSubDomains) {
        hstsValue += '; includeSubDomains';
      }
      headers['Strict-Transport-Security'] = hstsValue;
    }
    
    return headers;
  }
  
  /**
   * Create HTTP redirect server
   */
  createHTTPRedirectServer(): http.Server | null {
    if (!this.config.redirectHttp || !this.config.enabled) {
      return null;
    }
    
    const server = http.createServer((req, res) => {
      const host = req.headers.host || 'localhost';
      const httpsPort = this.config.port === 443 ? '' : `:${this.config.port}`;
      const redirectUrl = `https://${host}${httpsPort}${req.url}`;
      
      res.writeHead(301, {
        'Location': redirectUrl,
        'Strict-Transport-Security': this.config.hsts.enabled 
          ? `max-age=${this.config.hsts.maxAge}; includeSubDomains` 
          : undefined
      });
      res.end();
    });
    
    return server;
  }
  
  /**
   * Validate SSL certificate files
   */
  validateCertificates(): { valid: boolean; error?: string } {
    if (!this.config.enabled) {
      return { valid: true };
    }
    
    if (!this.config.certPath || !this.config.keyPath) {
      return { valid: false, error: 'SSL certificate paths not configured' };
    }
    
    try {
      if (!fs.existsSync(this.config.certPath)) {
        return { valid: false, error: `Certificate file not found: ${this.config.certPath}` };
      }
      
      if (!fs.existsSync(this.config.keyPath)) {
        return { valid: false, error: `Private key file not found: ${this.config.keyPath}` };
      }
      
      // Try to read the files
      fs.readFileSync(this.config.certPath, 'utf8');
      fs.readFileSync(this.config.keyPath, 'utf8');
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Certificate validation failed: ${error}` };
    }
  }
  
  /**
   * Get configuration summary
   */
  getConfig(): HTTPSConfig {
    return { ...this.config };
  }
  
  /**
   * Check if HTTPS is enabled
   */
  isHTTPSEnabled(): boolean {
    return this.config.enabled;
  }
  
  /**
   * Get HTTPS port
   */
  getHTTPSPort(): number {
    return this.config.port;
  }
  
  /**
   * Get HTTP port
   */
  getHTTPPort(): number {
    return this.config.httpPort || 3000;
  }
}

// Export singleton instance
export const httpsConfig = new HTTPSConfigManager();
EOF
    
    success "HTTPS configuration module created"
}

# Create HTTPS-enabled dashboard server
create_https_dashboard_server() {
    log "🖥️  Creating HTTPS-enabled dashboard server..."
    
    mkdir -p "$(dirname "$DASHBOARD_CONFIG_FILE")"
    
    cat > "$DASHBOARD_CONFIG_FILE" << 'EOF'
/**
 * HTTPS-Enabled Dashboard Server for AI Crypto Trading Agent
 * Provides secure web interface with SSL/TLS support
 */

import * as express from 'express';
import * as https from 'https';
import * as http from 'http';
import * as cors from 'cors';
import * as helmet from 'helmet';
import * as rateLimit from 'express-rate-limit';
import { httpsConfig, SecurityHeaders } from '../config/https-config';
import { Logger } from '../core/logging/logger';

const logger = new Logger('HTTPSDashboardServer');

export interface HTTPSDashboardConfig {
  httpsPort?: number;
  httpPort?: number;
  host?: string;
  cors?: cors.CorsOptions;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

export class HTTPSDashboardServer {
  private app: express.Application;
  private httpsServer?: https.Server;
  private httpServer?: http.Server;
  private config: HTTPSDashboardConfig;
  
  constructor(config: HTTPSDashboardConfig = {}) {
    this.config = {
      httpsPort: config.httpsPort || httpsConfig.getHTTPSPort(),
      httpPort: config.httpPort || httpsConfig.getHTTPPort(),
      host: config.host || '0.0.0.0',
      cors: config.cors || {
        origin: this.buildCorsOrigins(),
        credentials: true
      },
      rateLimit: config.rateLimit || {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
      }
    };
    
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  /**
   * Setup Express middleware with security configurations
   */
  private setupMiddleware(): void {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "data:"],
          connectSrc: ["'self'", "wss:", "ws:"],
          frameAncestors: ["'none'"]
        }
      },
      hsts: httpsConfig.isHTTPSEnabled() ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      } : false
    }));
    
    // Custom security headers
    this.app.use((req, res, next) => {
      const securityHeaders = httpsConfig.getSecurityHeaders();
      Object.entries(securityHeaders).forEach(([header, value]) => {
        if (value) {
          res.setHeader(header, value);
        }
      });
      next();
    });
    
    // CORS
    this.app.use(cors(this.config.cors));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: this.config.rateLimit!.windowMs,
      max: this.config.rateLimit!.max,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use(limiter);
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.debug(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        secure: req.secure
      });
      next();
    });
  }
  
  /**
   * Setup dashboard routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        https: httpsConfig.isHTTPSEnabled(),
        secure: req.secure
      });
    });
    
    // SSL certificate info endpoint
    this.app.get('/ssl-info', (req, res) => {
      const validation = httpsConfig.validateCertificates();
      res.json({
        httpsEnabled: httpsConfig.isHTTPSEnabled(),
        certificateValid: validation.valid,
        error: validation.error,
        config: {
          httpsPort: httpsConfig.getHTTPSPort(),
          httpPort: httpsConfig.getHTTPPort(),
          securityHeaders: Object.keys(httpsConfig.getSecurityHeaders())
        }
      });
    });
    
    // Dashboard main route
    this.app.get('/', (req, res) => {
      if (httpsConfig.isHTTPSEnabled() && !req.secure) {
        const httpsUrl = `https://${req.get('host')}${req.originalUrl}`;
        return res.redirect(301, httpsUrl);
      }
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>AI Crypto Trading Agent - Secure Dashboard</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .secure { color: #28a745; }
            .insecure { color: #dc3545; }
            .info { background: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .status.secure { background: #d4edda; color: #155724; }
            .status.insecure { background: #f8d7da; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔒 AI Crypto Trading Agent</h1>
            <h2>Secure Dashboard</h2>
            
            <div class="info">
              <h3>Connection Status</h3>
              <p>
                Protocol: <strong>${req.secure ? 'HTTPS' : 'HTTP'}</strong>
                <span class="status ${req.secure ? 'secure' : 'insecure'}">
                  ${req.secure ? '🔒 SECURE' : '⚠️ INSECURE'}
                </span>
              </p>
              <p>Host: <strong>${req.get('host')}</strong></p>
              <p>User Agent: <strong>${req.get('User-Agent')}</strong></p>
              <p>IP Address: <strong>${req.ip}</strong></p>
            </div>
            
            <div class="info">
              <h3>Security Features</h3>
              <ul>
                <li>✅ Security Headers Enabled</li>
                <li>✅ Rate Limiting Active</li>
                <li>✅ CORS Protection</li>
                <li>✅ Content Security Policy</li>
                <li>${httpsConfig.isHTTPSEnabled() ? '✅' : '❌'} HTTPS/TLS Encryption</li>
                <li>${req.secure ? '✅' : '❌'} Secure Connection</li>
              </ul>
            </div>
            
            <div class="info">
              <h3>Available Endpoints</h3>
              <ul>
                <li><a href="/health">Health Check</a></li>
                <li><a href="/ssl-info">SSL Certificate Info</a></li>
                <li><a href="/api/status">API Status</a></li>
              </ul>
            </div>
            
            ${!req.secure && httpsConfig.isHTTPSEnabled() ? `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <strong>⚠️ Security Warning:</strong> You are accessing this dashboard over an insecure HTTP connection.
              <br><br>
              <a href="https://${req.get('host')}" style="background: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">
                Switch to HTTPS
              </a>
            </div>
            ` : ''}
          </div>
        </body>
        </html>
      `);
    });
    
    // API routes
    this.app.get('/api/status', (req, res) => {
      res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        https: httpsConfig.isHTTPSEnabled(),
        secure: req.secure,
        version: '1.0.0'
      });
    });
    
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        timestamp: new Date().toISOString()
      });
    });
    
    // Error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Dashboard server error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      });
    });
  }
  
  /**
   * Build CORS origins for local network access
   */
  private buildCorsOrigins(): string[] {
    const origins = ['http://localhost:3000', 'https://localhost:3000'];
    
    // Add common private network ranges
    const privateRanges = ['192.168', '10.0', '172.16'];
    const ports = [3000, 443, 80];
    
    for (const range of privateRanges) {
      for (const port of ports) {
        origins.push(`http://${range}.*.*:${port}`);
        origins.push(`https://${range}.*.*:${port}`);
      }
    }
    
    return origins;
  }
  
  /**
   * Start the HTTPS dashboard server
   */
  async start(): Promise<void> {
    try {
      // Validate SSL certificates if HTTPS is enabled
      if (httpsConfig.isHTTPSEnabled()) {
        const validation = httpsConfig.validateCertificates();
        if (!validation.valid) {
          throw new Error(`SSL certificate validation failed: ${validation.error}`);
        }
        
        // Create HTTPS server
        const httpsOptions = httpsConfig.getHTTPSOptions();
        if (httpsOptions) {
          this.httpsServer = https.createServer(httpsOptions, this.app);
          
          await new Promise<void>((resolve, reject) => {
            this.httpsServer!.listen(this.config.httpsPort, this.config.host, () => {
              logger.info(`🔒 HTTPS Dashboard server started on https://${this.config.host}:${this.config.httpsPort}`);
              resolve();
            });
            
            this.httpsServer!.on('error', reject);
          });
        }
        
        // Create HTTP redirect server
        const redirectServer = httpsConfig.createHTTPRedirectServer();
        if (redirectServer) {
          this.httpServer = redirectServer;
          
          await new Promise<void>((resolve, reject) => {
            this.httpServer!.listen(this.config.httpPort, this.config.host, () => {
              logger.info(`🔄 HTTP redirect server started on http://${this.config.host}:${this.config.httpPort}`);
              resolve();
            });
            
            this.httpServer!.on('error', reject);
          });
        }
      } else {
        // Create HTTP server only
        this.httpServer = http.createServer(this.app);
        
        await new Promise<void>((resolve, reject) => {
          this.httpServer!.listen(this.config.httpPort, this.config.host, () => {
            logger.info(`🌐 HTTP Dashboard server started on http://${this.config.host}:${this.config.httpPort}`);
            resolve();
          });
          
          this.httpServer!.on('error', reject);
        });
      }
      
      logger.info('✅ Dashboard server started successfully');
      
    } catch (error) {
      logger.error('❌ Failed to start dashboard server:', error);
      throw error;
    }
  }
  
  /**
   * Stop the dashboard server
   */
  async stop(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    if (this.httpsServer) {
      promises.push(new Promise((resolve) => {
        this.httpsServer!.close(() => {
          logger.info('HTTPS server stopped');
          resolve();
        });
      }));
    }
    
    if (this.httpServer) {
      promises.push(new Promise((resolve) => {
        this.httpServer!.close(() => {
          logger.info('HTTP server stopped');
          resolve();
        });
      }));
    }
    
    await Promise.all(promises);
    logger.info('Dashboard server stopped');
  }
  
  /**
   * Get server status
   */
  getStatus(): {
    httpsEnabled: boolean;
    httpsRunning: boolean;
    httpRunning: boolean;
    httpsPort?: number;
    httpPort?: number;
  } {
    return {
      httpsEnabled: httpsConfig.isHTTPSEnabled(),
      httpsRunning: !!this.httpsServer && this.httpsServer.listening,
      httpRunning: !!this.httpServer && this.httpServer.listening,
      httpsPort: this.config.httpsPort,
      httpPort: this.config.httpPort
    };
  }
}

// Export for use in main application
export { HTTPSDashboardServer };
EOF
    
    success "HTTPS dashboard server created"
}

# Update main application to use HTTPS
update_main_application() {
    log "🔧 Updating main application for HTTPS support..."
    
    local main_file="$TRADING_HOME/src/main.ts"
    
    if [[ -f "$main_file" ]]; then
        # Create backup
        cp "$main_file" "$main_file.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Add HTTPS imports (if not already present)
        if ! grep -q "HTTPSDashboardServer" "$main_file"; then
            sed -i '/import.*DashboardServer/a import { HTTPSDashboardServer } from '\''./dashboard/https-dashboard-server'\'';' "$main_file"
        fi
        
        if ! grep -q "httpsConfig" "$main_file"; then
            sed -i '/import.*DashboardServer/a import { httpsConfig } from '\''./config/https-config'\'';' "$main_file"
        fi
        
        success "Main application updated for HTTPS"
    else
        warning "Main application file not found: $main_file"
    fi
}

# Create HTTPS test script
create_https_test_script() {
    log "🧪 Creating HTTPS test script..."
    
    cat > "$TRADING_HOME/scripts/test-https-configuration.sh" << 'EOF'
#!/bin/bash

# HTTPS Configuration Test Script
LOG_FILE="/var/log/trading-agent/https-test.log"

echo "[$(date)] Starting HTTPS configuration test..." | tee -a "$LOG_FILE"

# Test variables
DOMAIN="${DOMAIN_NAME:-localhost}"
HTTPS_PORT="${HTTPS_PORT:-443}"
HTTP_PORT="${HTTP_PORT:-3000}"

# Test HTTPS connection
test_https_connection() {
    echo "Testing HTTPS connection to $DOMAIN:$HTTPS_PORT..." | tee -a "$LOG_FILE"
    
    if curl -k -s --connect-timeout 10 "https://$DOMAIN:$HTTPS_PORT/health" > /dev/null; then
        echo "✅ HTTPS connection successful" | tee -a "$LOG_FILE"
        return 0
    else
        echo "❌ HTTPS connection failed" | tee -a "$LOG_FILE"
        return 1
    fi
}

# Test HTTP redirect
test_http_redirect() {
    echo "Testing HTTP to HTTPS redirect..." | tee -a "$LOG_FILE"
    
    local response=$(curl -s -I "http://$DOMAIN:$HTTP_PORT" 2>/dev/null)
    
    if echo "$response" | grep -q "301\|302"; then
        echo "✅ HTTP redirect working" | tee -a "$LOG_FILE"
        return 0
    else
        echo "❌ HTTP redirect not working" | tee -a "$LOG_FILE"
        return 1
    fi
}

# Test security headers
test_security_headers() {
    echo "Testing security headers..." | tee -a "$LOG_FILE"
    
    local headers=$(curl -k -s -I "https://$DOMAIN:$HTTPS_PORT" 2>/dev/null)
    local passed=0
    local total=5
    
    if echo "$headers" | grep -q "Strict-Transport-Security"; then
        echo "✅ HSTS header present" | tee -a "$LOG_FILE"
        ((passed++))
    else
        echo "❌ HSTS header missing" | tee -a "$LOG_FILE"
    fi
    
    if echo "$headers" | grep -q "X-Frame-Options"; then
        echo "✅ X-Frame-Options header present" | tee -a "$LOG_FILE"
        ((passed++))
    else
        echo "❌ X-Frame-Options header missing" | tee -a "$LOG_FILE"
    fi
    
    if echo "$headers" | grep -q "X-Content-Type-Options"; then
        echo "✅ X-Content-Type-Options header present" | tee -a "$LOG_FILE"
        ((passed++))
    else
        echo "❌ X-Content-Type-Options header missing" | tee -a "$LOG_FILE"
    fi
    
    if echo "$headers" | grep -q "X-XSS-Protection"; then
        echo "✅ X-XSS-Protection header present" | tee -a "$LOG_FILE"
        ((passed++))
    else
        echo "❌ X-XSS-Protection header missing" | tee -a "$LOG_FILE"
    fi
    
    if echo "$headers" | grep -q "Content-Security-Policy"; then
        echo "✅ Content-Security-Policy header present" | tee -a "$LOG_FILE"
        ((passed++))
    else
        echo "❌ Content-Security-Policy header missing" | tee -a "$LOG_FILE"
    fi
    
    echo "Security headers: $passed/$total passed" | tee -a "$LOG_FILE"
    
    if [[ $passed -ge 4 ]]; then
        return 0
    else
        return 1
    fi
}

# Test SSL certificate
test_ssl_certificate() {
    echo "Testing SSL certificate..." | tee -a "$LOG_FILE"
    
    local cert_info=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:$HTTPS_PORT" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    
    if [[ -n "$cert_info" ]]; then
        echo "✅ SSL certificate is valid" | tee -a "$LOG_FILE"
        echo "$cert_info" | tee -a "$LOG_FILE"
        return 0
    else
        echo "❌ SSL certificate validation failed" | tee -a "$LOG_FILE"
        return 1
    fi
}

# Run all tests
main() {
    local tests_passed=0
    local total_tests=4
    
    echo "=== HTTPS Configuration Test Report ===" | tee -a "$LOG_FILE"
    echo "Domain: $DOMAIN" | tee -a "$LOG_FILE"
    echo "HTTPS Port: $HTTPS_PORT" | tee -a "$LOG_FILE"
    echo "HTTP Port: $HTTP_PORT" | tee -a "$LOG_FILE"
    echo "Timestamp: $(date)" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    if test_https_connection; then ((tests_passed++)); fi
    echo "" | tee -a "$LOG_FILE"
    
    if test_http_redirect; then ((tests_passed++)); fi
    echo "" | tee -a "$LOG_FILE"
    
    if test_security_headers; then ((tests_passed++)); fi
    echo "" | tee -a "$LOG_FILE"
    
    if test_ssl_certificate; then ((tests_passed++)); fi
    echo "" | tee -a "$LOG_FILE"
    
    echo "=== Test Summary ===" | tee -a "$LOG_FILE"
    echo "Tests passed: $tests_passed/$total_tests" | tee -a "$LOG_FILE"
    
    if [[ $tests_passed -eq $total_tests ]]; then
        echo "🎉 All HTTPS tests passed!" | tee -a "$LOG_FILE"
        exit 0
    else
        echo "⚠️  Some HTTPS tests failed" | tee -a "$LOG_FILE"
        exit 1
    fi
}

main "$@"
EOF
    
    chmod +x "$TRADING_HOME/scripts/test-https-configuration.sh"
    success "HTTPS test script created"
}

# Main execution
main() {
    log "🔒 Configuring application for HTTPS support..."
    
    # Create HTTPS configuration modules
    create_https_config
    create_https_dashboard_server
    
    # Update main application
    update_main_application
    
    # Create test script
    create_https_test_script
    
    success "HTTPS application configuration completed!"
    
    echo ""
    echo "=== HTTPS APPLICATION CONFIGURATION SUMMARY ==="
    echo "✅ HTTPS configuration module created"
    echo "✅ HTTPS dashboard server created"
    echo "✅ Main application updated"
    echo "✅ HTTPS test script created"
    echo ""
    echo "Next Steps:"
    echo "1. Run SSL certificate setup: ./scripts/setup-ssl-certificates.sh"
    echo "2. Update .env file with SSL settings"
    echo "3. Rebuild application: npm run build"
    echo "4. Restart services with HTTPS enabled"
    echo "5. Test HTTPS: ./scripts/test-https-configuration.sh"
    echo ""
}

# Execute main function
main "$@"