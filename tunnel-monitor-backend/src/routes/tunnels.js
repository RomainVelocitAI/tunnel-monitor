const express = require('express');
const router = express.Router();
const airtableService = require('../services/airtableService');
const monitoringService = require('../services/monitoringService');
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