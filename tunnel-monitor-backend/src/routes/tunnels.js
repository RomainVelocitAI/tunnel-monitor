const express = require('express');
const router = express.Router();
const airtableService = require('../services/airtableService');
const monitoringService = require('../services/monitoringService');
const testStreamService = require('../services/testStreamService');
const logger = require('../utils/logger');

// Get all tunnels
router.get('/', async (req, res) => {
  try {
    const tunnels = await airtableService.getActiveTunnels();
    res.json(tunnels);
  } catch (error) {
    logger.error('Error fetching tunnels:', error);
    res.status(500).json({ error: 'Failed to fetch tunnels' });
  }
});

// Get tunnel history
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 30;
    const history = await airtableService.getTestHistory(id, limit);
    res.json(history);
  } catch (error) {
    logger.error('Error fetching tunnel history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Trigger manual test
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Return immediately and run test in background
    res.json({ 
      message: 'Test started',
      tunnelId: id 
    });
    
    // Run test asynchronously
    monitoringService.testSingleTunnel(id).catch(error => {
      logger.error('Background test failed:', error);
    });
    
  } catch (error) {
    logger.error('Error starting test:', error);
    res.status(500).json({ error: 'Failed to start test' });
  }
});

// SSE endpoint for real-time test logs
router.get('/:id/test-stream', async (req, res) => {
  const { id } = req.params;
  
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ 
    type: 'log', 
    level: 'info', 
    message: 'Connexion établie avec le serveur' 
  })}\n\n`);

  // Use the test stream service to run the real test with Playwright
  try {
    await testStreamService.streamTest(id, res);
  } catch (error) {
    logger.error('SSE test stream error:', error);
    res.write(`data: ${JSON.stringify({ 
      type: 'log',
      level: 'error',
      message: `Erreur: ${error.message}`
    })}\n\n`);
    res.write(`data: ${JSON.stringify({ 
      type: 'complete', 
      status: 'error' 
    })}\n\n`);
  } finally {
    res.end();
  }
});

// Update tunnel configuration
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Validate updates
    const allowedFields = ['Status', 'Check_Frequency', 'Alert_Email', 'Priority'];
    const filteredUpdates = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }
    
    const updated = await airtableService.updateTunnel(id, filteredUpdates);
    res.json({ 
      message: 'Tunnel updated successfully',
      id: updated.id 
    });
  } catch (error) {
    logger.error('Error updating tunnel:', error);
    res.status(500).json({ error: 'Failed to update tunnel' });
  }
});

module.exports = router;