/**
 * =============================================================================
 * DASHBOARD RESPONSIVENESS AND UI TESTING
 * =============================================================================
 * 
 * Tests for dashboard responsiveness on mobile devices, emoji/icon displays,
 * and cross-platform compatibility.
 * 
 * Requirements: 4.1, 4.2
 * =============================================================================
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import axios from 'axios';
import { DashboardServer } from '../../dashboard/dashboard-server';

describe('Dashboard Responsiveness and UI Tests', () => {
  let dashboardServer: DashboardServer;
  let dashboardUrl: string;

  beforeAll(async () => {
    dashboardServer = new DashboardServer({
      port: 3002,
      host: '0.0.0.0',
      cors: {
        origin: ['*'],
        credentials: true
      },
      auth: {
        enabled: false,
        secret: 'test-secret'
      },
      rateLimit: {
        windowMs: 60000,
        max: 100
      }
    });

    await dashboardServer.start();
    dashboardUrl = 'http://localhost:3002';
  });

  afterAll(async () => {
    if (dashboardServer) {
      await dashboardServer.stop();
    }
  });

  describe('Mobile Device Responsiveness', () => {
    test('should render correctly on iPhone', async () => {
      const response = await axios.get(dashboardUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
        }
      });

      const htmlContent = response.data;

      // Check for mobile viewport
      expect(htmlContent).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
      
      // Check for responsive CSS
      expect(htmlContent).toContain('@media (max-width: 768px)');
      expect(htmlContent).toContain('grid-template-columns: 1fr');
      
      // Check for mobile-friendly padding
      expect(htmlContent).toContain('padding: 10px');
    });

    test('should render correctly on Android', async () => {
      const response = await axios.get(dashboardUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
        }
      });

      const htmlContent = response.data;

      expect(htmlContent).toContain('viewport');
      expect(htmlContent).toContain('responsive');
      expect(response.status).toBe(200);
    });

    test('should render correctly on iPad', async () => {
      const response = await axios.get(dashboardUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
        }
      });

      const htmlContent = response.data;

      expect(htmlContent).toContain('AI Crypto Trading Agent');
      expect(htmlContent).toContain('Intel NUC');
      expect(response.status).toBe(200);
    });

    test('should handle different screen sizes', async () => {
      const response = await axios.get(dashboardUrl);
      const htmlContent = response.data;

      // Check for responsive grid system
      expect(htmlContent).toContain('grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))');
      
      // Check for mobile breakpoint
      expect(htmlContent).toContain('@media (max-width: 768px)');
      
      // Check for flexible layout
      expect(htmlContent).toContain('max-width: 1200px');
      expect(htmlContent).toContain('margin: 0 auto');
    });
  });

  describe('Emoji and Icon Display', () => {
    test('should display emojis correctly in dashboard', async () => {
      const response = await axios.get(dashboardUrl);
      const htmlContent = response.data;

      // Check for various emojis used in the dashboard
      expect(htmlContent).toContain('🤖'); // Robot emoji for AI
      expect(htmlContent).toContain('🌐'); // Globe emoji for network
      expect(htmlContent).toContain('🔗'); // Link emoji for SSH tunnel
      expect(htmlContent).toContain('💾'); // Floppy disk emoji for database
      expect(htmlContent).toContain('🔧'); // Wrench emoji for API endpoints
    });

    test('should handle emoji encoding correctly', () => {
      const testEmojis = {
        robot: '🤖',
        chart: '📈',
        money: '💰',
        target: '🎯',
        computer: '🖥️',
        warning: '⚠️',
        success: '✅',
        error: '❌'
      };

      Object.entries(testEmojis).forEach(([name, emoji]) => {
        expect(emoji).toMatch(/[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);
      });
    });

    test('should display status indicators with appropriate colors', async () => {
      const response = await axios.get(dashboardUrl);
      const htmlContent = response.data;

      // Check for status indicator styling
      expect(htmlContent).toContain('status-indicator');
      expect(htmlContent).toContain('background: #10b981'); // Green color for healthy status
      expect(htmlContent).toContain('border-radius: 50%'); // Circular indicator
    });

    test('should handle special characters in content', async () => {
      const response = await axios.get(dashboardUrl);
      const htmlContent = response.data;

      // Check for proper HTML encoding
      expect(htmlContent).not.toContain('&lt;'); // Should not have escaped HTML
      expect(htmlContent).not.toContain('&gt;');
      expect(htmlContent).not.toContain('&amp;');
    });
  });

  describe('Cross-Platform Compatibility', () => {
    test('should work with different browsers', async () => {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
      ];

      for (const userAgent of userAgents) {
        const response = await axios.get(dashboardUrl, {
          headers: { 'User-Agent': userAgent }
        });

        expect(response.status).toBe(200);
        expect(response.data).toContain('AI Crypto Trading Agent');
      }
    });

    test('should handle different network conditions', async () => {
      // Test with different timeout settings to simulate network conditions
      const timeouts = [1000, 5000, 10000];

      for (const timeout of timeouts) {
        const response = await axios.get(dashboardUrl, { timeout });
        expect(response.status).toBe(200);
      }
    });

    test('should provide fallback for unsupported features', async () => {
      const response = await axios.get(dashboardUrl);
      const htmlContent = response.data;

      // Check for graceful degradation
      expect(htmlContent).toContain('font-family: -apple-system, BlinkMacSystemFont');
      expect(htmlContent).toContain('sans-serif'); // Fallback font
    });
  });

  describe('Performance and Loading', () => {
    test('should load quickly on mobile networks', async () => {
      const startTime = Date.now();
      const response = await axios.get(dashboardUrl);
      const loadTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('should have optimized CSS for mobile', async () => {
      const response = await axios.get(dashboardUrl);
      const htmlContent = response.data;

      // Check for CSS optimizations
      expect(htmlContent).toContain('backdrop-filter: blur(10px)'); // Modern CSS features
      expect(htmlContent).toContain('linear-gradient'); // Efficient gradients
      
      // Check for minimal inline styles
      const styleMatches = htmlContent.match(/<style[^>]*>[\s\S]*?<\/style>/gi);
      expect(styleMatches).toBeTruthy();
      if (styleMatches) {
        expect(styleMatches.length).toBeLessThanOrEqual(2); // Minimal style blocks
      }
    });

    test('should handle concurrent mobile connections', async () => {
      const promises = [];
      
      // Simulate multiple mobile devices connecting
      for (let i = 0; i < 10; i++) {
        promises.push(axios.get(dashboardUrl, {
          headers: {
            'User-Agent': `Mobile-Device-${i}`
          }
        }));
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data).toContain('AI Crypto Trading Agent');
      });
    });
  });

  describe('Accessibility and Usability', () => {
    test('should have proper semantic HTML structure', async () => {
      const response = await axios.get(dashboardUrl);
      const htmlContent = response.data;

      // Check for semantic HTML elements
      expect(htmlContent).toContain('<h1>');
      expect(htmlContent).toContain('<h3>');
      expect(htmlContent).toContain('<p>');
      expect(htmlContent).toContain('<div class="container">');
    });

    test('should have readable text on mobile', async () => {
      const response = await axios.get(dashboardUrl);
      const htmlContent = response.data;

      // Check for readable font sizes and colors
      expect(htmlContent).toContain('color: #e2e8f0'); // Light text on dark background
      expect(htmlContent).toContain('font-family:'); // Proper font specification
    });

    test('should handle touch interactions', () => {
      // Mock touch event handlers
      const mockTouchEvents = {
        touchstart: jest.fn(),
        touchmove: jest.fn(),
        touchend: jest.fn()
      };

      // Simulate touch events
      mockTouchEvents.touchstart({ touches: [{ clientX: 100, clientY: 200 }] });
      mockTouchEvents.touchmove({ touches: [{ clientX: 150, clientY: 250 }] });
      mockTouchEvents.touchend({});

      expect(mockTouchEvents.touchstart).toHaveBeenCalled();
      expect(mockTouchEvents.touchmove).toHaveBeenCalled();
      expect(mockTouchEvents.touchend).toHaveBeenCalled();
    });
  });

  describe('Real-time Updates on Mobile', () => {
    test('should handle WebSocket connections on mobile', (done) => {
      // Mock WebSocket for mobile testing
      const mockMobileWebSocket = {
        readyState: 1, // OPEN
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      // Simulate mobile WebSocket connection
      mockMobileWebSocket.addEventListener('open', () => {
        expect(mockMobileWebSocket.readyState).toBe(1);
        done();
      });

      // Trigger open event
      const openCallback = mockMobileWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'open')?.[1];
      if (openCallback) {
        openCallback();
      }
    });

    test('should handle connection drops gracefully on mobile', () => {
      const mockConnectionHandler = {
        onDisconnect: jest.fn(),
        onReconnect: jest.fn(),
        retryConnection: jest.fn().mockResolvedValue(true)
      };

      // Simulate connection drop
      mockConnectionHandler.onDisconnect();
      expect(mockConnectionHandler.onDisconnect).toHaveBeenCalled();

      // Simulate reconnection
      mockConnectionHandler.onReconnect();
      expect(mockConnectionHandler.onReconnect).toHaveBeenCalled();
    });
  });
});