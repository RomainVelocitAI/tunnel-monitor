const airtableService = require('./airtableService');
const tunnelTester = require('./tunnelTester');
const webhookService = require('./webhookService');
const logger = require('../utils/logger');

class MonitoringService {
  constructor() {
    this.testQueue = [];
    this.isTestRunning = false;
    this.processQueue();
  }

  async processQueue() {
    setInterval(async () => {
      if (this.testQueue.length > 0 && !this.isTestRunning) {
        const { tunnelId, resolve, reject } = this.testQueue.shift();
        try {
          this.isTestRunning = true;
          logger.info(`Processing test from queue for tunnel: ${tunnelId}`);
          const result = await this.executeTest(tunnelId);
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.isTestRunning = false;
        }
      }
    }, 1000); // Check queue every second
  }

  async runScheduledMonitoring() {
    logger.info('Starting scheduled monitoring run');
    
    const summary = {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      criticalIssues: 0,
      tunnelsWithIssues: [],
      averagePerformance: 0
    };

    try {
      // Get all active tunnels
      const tunnels = await airtableService.getActiveTunnels();
      logger.info(`Found ${tunnels.length} active tunnels to monitor`);

      let totalPerformance = 0;

      // Test each tunnel
      for (const tunnel of tunnels) {
        try {
          logger.info(`Testing tunnel: ${tunnel.name} (${tunnel.url})`);
          
          const testResult = await tunnelTester.testTunnel(tunnel.url);
          summary.totalTests++;
          
          // Ajouter les infos du tunnel au résultat
          testResult.name = tunnel.name;
          testResult.url = tunnel.url;
          
          // Save result to Airtable
          await airtableService.saveTestResult(tunnel.id, testResult);
          
          // Update summary
          totalPerformance += testResult.performanceScore;
          
          if (testResult.status === 'success') {
            summary.successfulTests++;
          } else {
            summary.failedTests++;
            summary.tunnelsWithIssues.push({
              name: tunnel.name,
              url: tunnel.url,
              status: testResult.status
            });
            
            if (testResult.status === 'critical') {
              summary.criticalIssues++;
            }
            
            // Send alert for failures
            await webhookService.sendTestFailure(tunnel, testResult);
          }
          
          // Rate limiting
          await this.delay(2000);
          
        } catch (error) {
          logger.error(`Failed to test tunnel ${tunnel.name}:`, error);
          summary.failedTests++;
        }
      }
      
      // Calculate average performance
      if (summary.totalTests > 0) {
        summary.averagePerformance = Math.round(totalPerformance / summary.totalTests);
      }
      
      // Send daily summary
      await webhookService.sendDailySummary(summary);
      
      logger.info('Monitoring run completed:', summary);
      return summary;
      
    } catch (error) {
      logger.error('Monitoring run failed:', error);
      throw error;
    }
  }

  async testSingleTunnel(tunnelId) {
    return new Promise((resolve, reject) => {
      logger.info(`Adding tunnel ${tunnelId} to test queue`);
      this.testQueue.push({ tunnelId, resolve, reject });
      logger.info(`Queue size: ${this.testQueue.length}, Running: ${this.isTestRunning}`);
    });
  }

  async executeTest(tunnelId) {
    try {
      const tunnels = await airtableService.getActiveTunnels();
      const tunnel = tunnels.find(t => t.id === tunnelId);
      
      if (!tunnel) {
        throw new Error('Tunnel not found');
      }
      
      logger.info(`Testing single tunnel: ${tunnel.name}`);
      const testResult = await tunnelTester.testTunnel(tunnel.url);
      
      // Ajouter les infos du tunnel au résultat
      testResult.name = tunnel.name;
      testResult.url = tunnel.url;
      
      await airtableService.saveTestResult(tunnel.id, testResult);
      
      if (testResult.status !== 'success') {
        await webhookService.sendTestFailure(tunnel, testResult);
      }
      
      return testResult;
    } catch (error) {
      logger.error(`Failed to test tunnel ${tunnelId}:`, error);
      throw error;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new MonitoringService();