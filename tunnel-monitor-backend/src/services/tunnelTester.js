const logger = require('../utils/logger');

class TunnelTester {
  constructor() {
    this.timeout = parseInt(process.env.TEST_TIMEOUT) || 30000;
  }

  // This service is now just a placeholder as tests are run via GitHub Actions
  async testTunnel(url) {
    logger.info(`Test requested for ${url} - delegating to GitHub Actions`);
    
    // Return a simple response indicating that tests should be triggered via GitHub Actions
    return {
      url,
      status: 'delegated',
      timestamp: new Date().toISOString(),
      message: 'Tests are now run via GitHub Actions. Use the /api/tunnels/:id/test-stream endpoint.'
    };
  }
}

module.exports = TunnelTester;