const express = require('express');
const router = express.Router();
const airtableService = require('../services/airtableService');
const logger = require('../utils/logger');

// Export data as CSV
router.get('/csv', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const tunnelId = req.query.tunnelId;
    
    const history = await airtableService.getTestHistory(tunnelId, days * 100);
    
    // Convert to CSV
    const headers = [
      'Date',
      'Tunnel ID',
      'Status',
      'Performance Score',
      'Load Time (ms)',
      'Errors Count',
      'Warnings Count',
      'Alert Sent'
    ];
    
    const rows = history.map(test => {
      const errors = test.errors ? JSON.parse(test.errors) : [];
      const warnings = test.warnings ? JSON.parse(test.warnings) : [];
      
      return [
        test.testDate,
        test.tunnelId,
        test.status,
        test.performanceScore,
        test.loadTime,
        errors.length,
        warnings.length,
        test.alertSent ? 'Yes' : 'No'
      ];
    });
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=tunnel-monitoring-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
    
  } catch (error) {
    logger.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Export data as JSON
router.get('/json', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const tunnelId = req.query.tunnelId;
    
    const history = await airtableService.getTestHistory(tunnelId, days * 100);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=tunnel-monitoring-${new Date().toISOString().split('T')[0]}.json`);
    res.json({
      exportDate: new Date().toISOString(),
      period: `${days} days`,
      tunnelId: tunnelId || 'all',
      totalRecords: history.length,
      data: history
    });
    
  } catch (error) {
    logger.error('Error exporting JSON:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

module.exports = router;