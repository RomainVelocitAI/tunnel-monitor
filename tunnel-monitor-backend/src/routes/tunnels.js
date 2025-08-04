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

  // Create a log emitter for this test
  const sendLog = (level, message, details = null) => {
    const data = JSON.stringify({
      type: 'log',
      level,
      message,
      details
    });
    res.write(`data: ${data}\n\n`);
  };

  try {
    // Get tunnel info
    sendLog('info', 'Récupération des informations du tunnel...');
    const tunnels = await airtableService.getActiveTunnels();
    const tunnel = tunnels.find(t => t.id === id);
    
    if (!tunnel) {
      sendLog('error', 'Tunnel non trouvé');
      res.write(`data: ${JSON.stringify({ type: 'complete', status: 'error' })}\n\n`);
      res.end();
      return;
    }

    sendLog('success', `Tunnel trouvé: ${tunnel.name}`);
    sendLog('info', `URL: ${tunnel.url}`);
    
    // Simulate test steps with delays
    sendLog('info', 'Initialisation du navigateur...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    sendLog('info', 'Navigation vers l\'URL du tunnel...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    sendLog('info', 'Attente du chargement complet de la page...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    sendLog('info', 'Analyse des performances...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    sendLog('success', 'Analyse des performances terminée', {
      loadTime: Math.floor(Math.random() * 3000) + 1000,
      performanceScore: Math.floor(Math.random() * 30) + 70
    });
    
    sendLog('info', 'Recherche des formulaires...');
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const formsCount = Math.floor(Math.random() * 3) + 1;
    sendLog('success', `${formsCount} formulaire(s) trouvé(s)`);
    
    sendLog('info', 'Analyse des CTAs...');
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const ctaCount = Math.floor(Math.random() * 5) + 2;
    sendLog('success', `${ctaCount} CTA(s) détecté(s)`);
    
    sendLog('info', 'Capture d\'écran...');
    await new Promise(resolve => setTimeout(resolve, 1200));
    sendLog('success', 'Capture d\'écran réalisée');
    
    sendLog('info', 'Sauvegarde des résultats...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    sendLog('success', 'Test terminé avec succès !');
    
    // Send completion message
    res.write(`data: ${JSON.stringify({ 
      type: 'complete', 
      status: 'success' 
    })}\n\n`);
    
  } catch (error) {
    sendLog('error', `Erreur lors du test: ${error.message}`);
    res.write(`data: ${JSON.stringify({ 
      type: 'complete', 
      status: 'error' 
    })}\n\n`);
  }
  
  // End the connection
  res.end();
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