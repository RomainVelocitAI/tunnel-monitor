const axios = require('axios');
const logger = require('../utils/logger');

class WebhookService {
  constructor() {
    this.webhookUrl = process.env.N8N_WEBHOOK_URL;
    this.webhookKey = process.env.N8N_WEBHOOK_KEY;
  }

  async sendAlert(data) {
    if (!this.webhookUrl) {
      logger.warn('Webhook URL not configured, skipping alert');
      return false;
    }

    try {
      const payload = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        ...data
      };

      if (this.webhookKey) {
        payload.key = this.webhookKey;
      }

      const response = await axios.post(this.webhookUrl, payload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logger.info('Alert sent successfully:', response.status);
      return true;
    } catch (error) {
      logger.error('Failed to send webhook alert:', error.message);
      return false;
    }
  }

  async sendTestFailure(tunnel, testResult) {
    return this.sendAlert({
      type: 'test_failure',
      severity: testResult.status === 'critical' ? 'high' : 'medium',
      tunnel: {
        id: tunnel.id,
        name: tunnel.name,
        url: tunnel.url
      },
      test: {
        status: testResult.status,
        performanceScore: testResult.performanceScore,
        loadTime: testResult.loadTime,
        errors: testResult.errors,
        warnings: testResult.warnings
      }
    });
  }

  async sendDailySummary(summary) {
    return this.sendAlert({
      type: 'daily_summary',
      severity: 'info',
      summary: {
        totalTests: summary.totalTests,
        successfulTests: summary.successfulTests,
        failedTests: summary.failedTests,
        criticalIssues: summary.criticalIssues,
        averagePerformance: summary.averagePerformance,
        tunnelsWithIssues: summary.tunnelsWithIssues
      }
    });
  }
}

module.exports = new WebhookService();