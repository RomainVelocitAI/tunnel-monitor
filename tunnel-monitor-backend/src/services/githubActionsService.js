const axios = require('axios');
const logger = require('../utils/logger');

class GitHubActionsService {
  constructor() {
    this.owner = process.env.GITHUB_OWNER || 'RomainVelocitAI';
    this.repo = process.env.GITHUB_REPO || 'tunnel-monitor';
    this.token = process.env.GITHUB_TOKEN;
    this.workflowId = 'tunnel-test.yml';
  }

  async triggerTest(tunnelId, tunnelName, tunnelUrl) {
    if (!this.token) {
      throw new Error('GitHub token not configured');
    }

    const callbackUrl = `${process.env.BACKEND_URL || 'https://tunnel-monitor-api.onrender.com'}/api/webhooks/github-test-result`;
    
    try {
      const response = await axios.post(
        `https://api.github.com/repos/${this.owner}/${this.repo}/actions/workflows/${this.workflowId}/dispatches`,
        {
          ref: 'main',
          inputs: {
            tunnel_id: tunnelId,
            tunnel_name: tunnelName,
            tunnel_url: tunnelUrl,
            callback_url: callbackUrl
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`GitHub Actions workflow triggered for tunnel ${tunnelId}`);
      return true;
    } catch (error) {
      logger.error('Failed to trigger GitHub Actions:', error.response?.data || error.message);
      throw new Error(`Failed to trigger test: ${error.message}`);
    }
  }
}

module.exports = new GitHubActionsService();