const express = require('express');
const router = express.Router();
const airtableService = require('../services/airtableService');
const logger = require('../utils/logger');

// Get dashboard statistics
router.get('/stats/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const days = parseInt(period) || 7;
    
    // Get test history for the period
    const history = await airtableService.getTestHistory(null, days * 50); // Approximate
    
    // Filter by date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const relevantTests = history.filter(test => 
      new Date(test.testDate) >= cutoffDate
    );
    
    // Calculate statistics
    const stats = {
      period: days,
      totalTests: relevantTests.length,
      successfulTests: relevantTests.filter(t => t.status === 'success').length,
      failedTests: relevantTests.filter(t => t.status !== 'success').length,
      criticalIssues: relevantTests.filter(t => t.status === 'critical').length,
      averagePerformance: 0,
      averageLoadTime: 0,
      testsByDay: {},
      errorTypes: {}
    };
    
    // Calculate averages
    let totalPerformance = 0;
    let totalLoadTime = 0;
    let performanceCount = 0;
    
    relevantTests.forEach(test => {
      // Performance average
      if (test.performanceScore !== null) {
        totalPerformance += test.performanceScore;
        performanceCount++;
      }
      
      // Load time average
      if (test.loadTime) {
        totalLoadTime += test.loadTime;
      }
      
      // Tests by day
      const day = new Date(test.testDate).toISOString().split('T')[0];
      stats.testsByDay[day] = (stats.testsByDay[day] || 0) + 1;
      
      // Error types
      if (test.errors) {
        try {
          const errors = JSON.parse(test.errors);
          errors.forEach(error => {
            stats.errorTypes[error.type] = (stats.errorTypes[error.type] || 0) + 1;
          });
        } catch (e) {
          // Invalid JSON
        }
      }
    });
    
    if (performanceCount > 0) {
      stats.averagePerformance = Math.round(totalPerformance / performanceCount);
    }
    
    if (relevantTests.length > 0) {
      stats.averageLoadTime = Math.round(totalLoadTime / relevantTests.length);
    }
    
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get current status of all tunnels
router.get('/current-status', async (req, res) => {
  try {
    const tunnels = await airtableService.getActiveTunnels();
    
    // Get latest test for each tunnel
    const statusList = await Promise.all(
      tunnels.map(async tunnel => {
        const history = await airtableService.getTestHistory(tunnel.id, 1);
        const latestTest = history[0];
        
        return {
          id: tunnel.id,
          name: tunnel.name,
          url: tunnel.url,
          type: tunnel.type,
          owner: tunnel.owner,
          lastCheck: tunnel.lastCheck,
          currentStatus: latestTest ? latestTest.status : 'unknown',
          performanceScore: latestTest ? latestTest.performanceScore : null,
          loadTime: latestTest ? latestTest.loadTime : null
        };
      })
    );
    
    res.json(statusList);
  } catch (error) {
    logger.error('Error fetching current status:', error);
    res.status(500).json({ error: 'Failed to fetch current status' });
  }
});

// Get alerts summary
router.get('/alerts', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const history = await airtableService.getTestHistory(null, days * 50);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const alerts = history
      .filter(test => 
        new Date(test.testDate) >= cutoffDate && 
        test.status !== 'success' &&
        test.alertSent
      )
      .map(test => ({
        id: test.id,
        tunnelId: test.tunnelId,
        date: test.testDate,
        status: test.status,
        errors: test.errors ? JSON.parse(test.errors) : []
      }));
    
    res.json(alerts);
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

module.exports = router;