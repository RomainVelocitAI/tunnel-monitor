const express = require('express');
const router = express.Router();
const airtableService = require('../services/airtableService');
const logger = require('../utils/logger');

// Store SSE connections for real-time updates
const sseConnections = new Map();

// Register SSE connection
router.registerSSE = function(tunnelId, res) {
  sseConnections.set(tunnelId, res);
  res.on('close', () => {
    sseConnections.delete(tunnelId);
  });
};

// GitHub Actions test result webhook
router.post('/github-test-result', async (req, res) => {
  try {
    const results = req.body;
    const { tunnelId } = results;
    
    logger.info(`Received test results for tunnel ${tunnelId}`);
    
    // Send to SSE if connection exists
    const sseRes = sseConnections.get(tunnelId);
    if (sseRes && !sseRes.writableEnded) {
      // Send logs from test results
      sseRes.write(`data: ${JSON.stringify({
        type: 'log',
        level: 'info',
        message: 'Test terminé sur GitHub Actions'
      })}\n\n`);
      
      sseRes.write(`data: ${JSON.stringify({
        type: 'log',
        level: results.status === 'success' ? 'success' : 'error',
        message: `Statut: ${results.status}`,
        details: {
          performanceScore: results.performanceScore,
          loadTime: results.loadTime,
          formsValid: results.formsValid,
          ctasValid: results.ctasValid
        }
      })}\n\n`);
      
      if (results.details.formsCount > 0) {
        sseRes.write(`data: ${JSON.stringify({
          type: 'log',
          level: 'success',
          message: `${results.details.formsCount} formulaire(s) trouvé(s)`
        })}\n\n`);
      }
      
      if (results.details.ctaCount > 0) {
        sseRes.write(`data: ${JSON.stringify({
          type: 'log',
          level: 'success',
          message: `${results.details.ctaCount} CTA(s) détecté(s)`
        })}\n\n`);
      }
      
      if (results.trackingPixels.length > 0) {
        sseRes.write(`data: ${JSON.stringify({
          type: 'log',
          level: 'success',
          message: `Tracking détecté: ${results.trackingPixels.join(', ')}`
        })}\n\n`);
      }
      
      // Send completion
      sseRes.write(`data: ${JSON.stringify({
        type: 'complete',
        status: results.status
      })}\n\n`);
      
      sseRes.end();
      sseConnections.delete(tunnelId);
    }
    
    // Save to Airtable
    await airtableService.saveTestResult(tunnelId, results);
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;