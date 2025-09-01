/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - SECURITY HARDENING
 * =============================================================================
 * 
 * This module implements comprehensive security hardening for production
 * deployment including system security, network security, and application security.
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync, chmodSync, readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../core/logger';

interface SecurityCheck {
  name: string;
  description: string;
  check: () => Promise<boolean>;
  fix: () => Promise<void>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'SYSTEM' | 'NETWORK' | 'APPLICATION' | 'FILES';
}

export class SecurityHardening {
  private checks: SecurityCheck[] = [];

  constructor() {
    this.initializeSecurityChecks();
  }

  /**
   * Run all security hardening procedures
   */
  async hardenSystem(): Promise<{ success: boolean; results: any[] }> {
    logger.info('🔒 Starting security hardening...');

    const results: any[] = [];
    let allPassed = true;

    for (const check of this.checks) {
      logger.info(`🔍 Running security check: ${check.name}`);

      try {
        const passed = await check.check();
        
        if (!passed) {
          logger.warn(`⚠️ Security check failed: ${check.name}`);
          
          if (check.severity === 'CRITICAL' || check.severity === 'HIGH') {
            logger.info(`🔧 Applying security fix: ${check.name}`);
            await check.fix();
            
            // Re-check after fix
            const fixedPassed = await check.check();
            results.push({
              name: check.name,
              description: check.description,
              severity: check.severity,
              category: check.category,
              initialStatus: 'FAILED',
              fixApplied: true,
              finalStatus: fixedPassed ? 'PASSED' : 'FAILED'
            });
            
            if (!fixedPassed) {
              allPassed = false;
            }
          } else {
            results.push({
              name: check.name,
              description: check.description,
              severity: check.severity,
              category: check.category,
              initialStatus: 'FAILED',
              fixApplied: false,
              finalStatus: 'FAILED'
            });
            
            if (check.severity === 'HIGH') {
              allPassed = false;
            }
          }
        } else {
          logger.info(`✅ Security check passed: ${check.name}`);
          results.push({
            name: check.name,
            description: check.description,
            severity: check.severity,
            category: check.category,
            initialStatus: 'PASSED',
            fixApplied: false,
            finalStatus: 'PASSED'
          });
        }
      } catch (error) {
        logger.error(`❌ Security check error: ${check.name}`, error);
        results.push({
          name: check.name,
          description: check.description,
          severity: check.severity,
          category: check.category,
          initialStatus: 'ERROR',
          fixApplied: false,
          finalStatus: 'ERROR',
          error: error.message
        });
        allPassed = false;
      }
    }

    // Generate security report
    await this.generateSecurityReport(results);

    if (allPassed) {
      logger.info('✅ Security hardening completed successfully');
    } else {
      logger.warn('⚠️ Security hardening completed with issues');
    }

    return { success: allPassed, results };
  }

  /**
   * Initialize all security checks
   */
  private initializeSecurityChecks(): void {
    this.checks = [
      // System Security Checks
      {
        name: 'UFW Firewall Configuration',
        description: 'Ensure UFW firewall is properly configured',
        severity: 'CRITICAL',
        category: 'SYSTEM',
        check: async () => {
          try {
            const status = execSync('sudo ufw status', { encoding: 'utf-8' });
            return status.includes('Status: active');
          } catch {
            return false;
          }
        },
        fix: async () => {
          execSync('sudo ufw --force reset');
          execSync('sudo ufw default deny incoming');
          execSync('sudo ufw default allow outgoing');
          execSync('sudo ufw allow ssh');
          execSync('sudo ufw allow 3001/tcp comment "AI Trading API"');
          execSync('sudo ufw allow 3002/tcp comment "AI Trading Dashboard"');
          execSync('sudo ufw --force enable');
        }
      },

      {
        name: 'Fail2Ban Installation',
        description: 'Ensure Fail2Ban is installed and configured',
        severity: 'HIGH',
        category: 'SYSTEM',
        check: async () => {
          try {
            execSync('which fail2ban-client', { stdio: 'pipe' });
            const status = execSync('sudo systemctl is-active fail2ban', { encoding: 'utf-8' });
            return status.trim() === 'active';
          } catch {
            return false;
          }
        },
        fix: async () => {
          execSync('sudo apt update');
          execSync('sudo apt install -y fail2ban');
          
          // Configure fail2ban
          const jailConfig = `[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[ai-crypto-trading]
enabled = true
port = 3001,3002
logpath = /opt/ai-crypto-trading/logs/security.log
maxretry = 5
bantime = 1800
`;
          
          writeFileSync('/tmp/jail.local', jailConfig);
          execSync('sudo cp /tmp/jail.local /etc/fail2ban/jail.local');
          execSync('sudo systemctl restart fail2ban');
          execSync('sudo systemctl enable fail2ban');
        }
      },

      {
        name: 'SSH Security Configuration',
        description: 'Ensure SSH is securely configured',
        severity: 'HIGH',
        category: 'NETWORK',
        check: async () => {
          try {
            if (!existsSync('/etc/ssh/sshd_config')) {
              return false;
            }
            
            const config = readFileSync('/etc/ssh/sshd_config', 'utf-8');
            return config.includes('PasswordAuthentication no') &&
                   config.includes('PermitRootLogin no') &&
                   config.includes('Protocol 2');
          } catch {
            return false;
          }
        },
        fix: async () => {
          const sshConfig = `# AI Crypto Trading Agent - Secure SSH Configuration
Port 22
Protocol 2
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_dsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

# Authentication
LoginGraceTime 60
PermitRootLogin no
StrictModes yes
MaxAuthTries 3
MaxSessions 2
PubkeyAuthentication yes
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# Security settings
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server

# Additional security
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers ubuntu
DenyUsers root
`;
          
          writeFileSync('/tmp/sshd_config', sshConfig);
          execSync('sudo cp /tmp/sshd_config /etc/ssh/sshd_config');
          execSync('sudo systemctl restart ssh');
        }
      },

      {
        name: 'File Permissions Security',
        description: 'Ensure critical files have secure permissions',
        severity: 'HIGH',
        category: 'FILES',
        check: async () => {
          const criticalFiles = [
            { path: '.env', expectedPerms: '600' },
            { path: 'logs', expectedPerms: '755' },
            { path: 'data', expectedPerms: '755' },
            { path: 'backups', expectedPerms: '700' }
          ];

          for (const file of criticalFiles) {
            if (existsSync(file.path)) {
              try {
                const stats = require('fs').statSync(file.path);
                const perms = (stats.mode & parseInt('777', 8)).toString(8);
                if (perms !== file.expectedPerms) {
                  return false;
                }
              } catch {
                return false;
              }
            }
          }
          return true;
        },
        fix: async () => {
          if (existsSync('.env')) {
            chmodSync('.env', 0o600);
          }
          if (existsSync('logs')) {
            chmodSync('logs', 0o755);
          }
          if (existsSync('data')) {
            chmodSync('data', 0o755);
          }
          if (existsSync('backups')) {
            chmodSync('backups', 0o700);
          }
        }
      },

      {
        name: 'System Updates',
        description: 'Ensure system packages are up to date',
        severity: 'MEDIUM',
        category: 'SYSTEM',
        check: async () => {
          try {
            const updates = execSync('apt list --upgradable 2>/dev/null | wc -l', { encoding: 'utf-8' });
            return parseInt(updates.trim()) <= 1; // Only header line
          } catch {
            return false;
          }
        },
        fix: async () => {
          execSync('sudo apt update');
          execSync('sudo apt upgrade -y');
          execSync('sudo apt autoremove -y');
        }
      },

      {
        name: 'Automatic Security Updates',
        description: 'Ensure automatic security updates are enabled',
        severity: 'MEDIUM',
        category: 'SYSTEM',
        check: async () => {
          try {
            execSync('which unattended-upgrades', { stdio: 'pipe' });
            return existsSync('/etc/apt/apt.conf.d/20auto-upgrades');
          } catch {
            return false;
          }
        },
        fix: async () => {
          execSync('sudo apt install -y unattended-upgrades');
          execSync('echo "unattended-upgrades unattended-upgrades/enable_auto_updates boolean true" | sudo debconf-set-selections');
          execSync('sudo dpkg-reconfigure -f noninteractive unattended-upgrades');
        }
      },

      {
        name: 'Network Time Synchronization',
        description: 'Ensure system time is synchronized',
        severity: 'MEDIUM',
        category: 'SYSTEM',
        check: async () => {
          try {
            const status = execSync('timedatectl status', { encoding: 'utf-8' });
            return status.includes('NTP service: active');
          } catch {
            return false;
          }
        },
        fix: async () => {
          execSync('sudo timedatectl set-ntp true');
          execSync('sudo systemctl restart systemd-timesyncd');
        }
      },

      {
        name: 'Log File Security',
        description: 'Ensure log files are properly secured',
        severity: 'MEDIUM',
        category: 'FILES',
        check: async () => {
          if (!existsSync('logs')) {
            return true; // Will be created with correct permissions
          }
          
          try {
            const stats = require('fs').statSync('logs');
            const perms = (stats.mode & parseInt('777', 8)).toString(8);
            return perms === '755';
          } catch {
            return false;
          }
        },
        fix: async () => {
          if (existsSync('logs')) {
            chmodSync('logs', 0o755);
          }
          
          // Set up log rotation
          const logrotateConfig = `/opt/ai-crypto-trading/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 ${process.env.USER} ${process.env.USER}
    postrotate
        pm2 reloadLogs
    endscript
}`;
          
          writeFileSync('/tmp/ai-crypto-trading-logrotate', logrotateConfig);
          execSync('sudo cp /tmp/ai-crypto-trading-logrotate /etc/logrotate.d/ai-crypto-trading');
        }
      },

      {
        name: 'Process Limits',
        description: 'Ensure proper process limits are configured',
        severity: 'LOW',
        category: 'SYSTEM',
        check: async () => {
          try {
            const limits = execSync('ulimit -n', { encoding: 'utf-8' });
            return parseInt(limits.trim()) >= 65536;
          } catch {
            return false;
          }
        },
        fix: async () => {
          const limitsConfig = `# AI Crypto Trading Agent - Process Limits
${process.env.USER} soft nofile 65536
${process.env.USER} hard nofile 65536
${process.env.USER} soft nproc 32768
${process.env.USER} hard nproc 32768
`;
          
          writeFileSync('/tmp/ai-crypto-trading-limits.conf', limitsConfig);
          execSync('sudo cp /tmp/ai-crypto-trading-limits.conf /etc/security/limits.d/ai-crypto-trading.conf');
        }
      },

      {
        name: 'Kernel Security Parameters',
        description: 'Ensure kernel security parameters are optimized',
        severity: 'MEDIUM',
        category: 'SYSTEM',
        check: async () => {
          try {
            const params = [
              'net.ipv4.conf.default.rp_filter=1',
              'net.ipv4.conf.all.rp_filter=1',
              'net.ipv4.tcp_syncookies=1',
              'net.ipv4.conf.all.accept_redirects=0',
              'net.ipv6.conf.all.accept_redirects=0',
              'net.ipv4.conf.all.send_redirects=0',
              'net.ipv4.conf.all.accept_source_route=0',
              'net.ipv6.conf.all.accept_source_route=0'
            ];

            for (const param of params) {
              const [key, expectedValue] = param.split('=');
              const actualValue = execSync(`sysctl -n ${key}`, { encoding: 'utf-8' }).trim();
              if (actualValue !== expectedValue) {
                return false;
              }
            }
            return true;
          } catch {
            return false;
          }
        },
        fix: async () => {
          const sysctlConfig = `# AI Crypto Trading Agent - Kernel Security Parameters
# IP Spoofing protection
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.rp_filter = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0

# Ignore source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Log Martians
net.ipv4.conf.all.log_martians = 1

# Ignore ping requests
net.ipv4.icmp_echo_ignore_all = 0

# Ignore Directed pings
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# TCP SYN cookie protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Disable IPv6 if not needed
net.ipv6.conf.all.disable_ipv6 = 0
net.ipv6.conf.default.disable_ipv6 = 0
net.ipv6.conf.lo.disable_ipv6 = 0
`;
          
          writeFileSync('/tmp/99-ai-crypto-trading-security.conf', sysctlConfig);
          execSync('sudo cp /tmp/99-ai-crypto-trading-security.conf /etc/sysctl.d/99-ai-crypto-trading-security.conf');
          execSync('sudo sysctl -p /etc/sysctl.d/99-ai-crypto-trading-security.conf');
        }
      }
    ];
  }

  /**
   * Generate comprehensive security report
   */
  private async generateSecurityReport(results: any[]): Promise<void> {
    const timestamp = new Date().toISOString();
    const reportPath = join(process.cwd(), 'logs', `security-report-${timestamp.replace(/[:.]/g, '-')}.json`);

    const report = {
      timestamp,
      summary: {
        total: results.length,
        passed: results.filter(r => r.finalStatus === 'PASSED').length,
        failed: results.filter(r => r.finalStatus === 'FAILED').length,
        errors: results.filter(r => r.finalStatus === 'ERROR').length,
        fixesApplied: results.filter(r => r.fixApplied).length
      },
      results,
      recommendations: this.generateRecommendations(results)
    };

    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logger.info(`📊 Security report generated: ${reportPath}`);
  }

  /**
   * Generate security recommendations based on results
   */
  private generateRecommendations(results: any[]): string[] {
    const recommendations: string[] = [];
    
    const failedCritical = results.filter(r => r.severity === 'CRITICAL' && r.finalStatus === 'FAILED');
    const failedHigh = results.filter(r => r.severity === 'HIGH' && r.finalStatus === 'FAILED');
    
    if (failedCritical.length > 0) {
      recommendations.push('URGENT: Address all CRITICAL security issues immediately before deploying to production');
    }
    
    if (failedHigh.length > 0) {
      recommendations.push('HIGH PRIORITY: Resolve HIGH severity security issues as soon as possible');
    }
    
    const systemIssues = results.filter(r => r.category === 'SYSTEM' && r.finalStatus === 'FAILED');
    if (systemIssues.length > 0) {
      recommendations.push('Review system-level security configurations and apply necessary updates');
    }
    
    const networkIssues = results.filter(r => r.category === 'NETWORK' && r.finalStatus === 'FAILED');
    if (networkIssues.length > 0) {
      recommendations.push('Review network security settings including firewall and SSH configuration');
    }
    
    const fileIssues = results.filter(r => r.category === 'FILES' && r.finalStatus === 'FAILED');
    if (fileIssues.length > 0) {
      recommendations.push('Review file permissions and ensure sensitive files are properly secured');
    }
    
    recommendations.push('Regularly run security audits and keep the system updated');
    recommendations.push('Monitor security logs for suspicious activities');
    recommendations.push('Consider implementing additional security measures like intrusion detection');
    
    return recommendations;
  }

  /**
   * Quick security validation for deployment
   */
  async validateSecurityForDeployment(): Promise<{ ready: boolean; criticalIssues: string[] }> {
    logger.info('🔍 Running quick security validation for deployment...');

    const criticalIssues: string[] = [];
    
    // Check critical security requirements
    const criticalChecks = this.checks.filter(check => check.severity === 'CRITICAL');
    
    for (const check of criticalChecks) {
      try {
        const passed = await check.check();
        if (!passed) {
          criticalIssues.push(`${check.name}: ${check.description}`);
        }
      } catch (error) {
        criticalIssues.push(`${check.name}: Check failed - ${error.message}`);
      }
    }

    const ready = criticalIssues.length === 0;
    
    if (ready) {
      logger.info('✅ Security validation passed - system ready for deployment');
    } else {
      logger.error(`❌ Security validation failed - ${criticalIssues.length} critical issues found`);
    }

    return { ready, criticalIssues };
  }
}

// Export singleton instance
export const securityHardening = new SecurityHardening();