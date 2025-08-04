// Script de test pour vérifier que le serveur démarre
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'Backend is running!',
    timestamp: new Date().toISOString()
  });
});

// Mock API pour les tests sans Airtable
app.get('/api/tunnels', (req, res) => {
  res.json([
    {
      id: '1',
      name: 'Tunnel de test',
      url: 'https://example.com',
      type: 'Sales Funnel',
      lastCheck: new Date().toISOString(),
      currentStatus: 'success',
      performanceScore: 95,
      loadTime: 1200
    }
  ]);
});

app.get('/api/dashboard/stats/7', (req, res) => {
  res.json({
    period: 7,
    totalTests: 42,
    successfulTests: 38,
    failedTests: 4,
    criticalIssues: 1,
    averagePerformance: 85,
    averageLoadTime: 2500,
    testsByDay: {
      '2024-08-01': 6,
      '2024-08-02': 7,
      '2024-08-03': 5,
      '2024-08-04': 8
    },
    errorTypes: {}
  });
});

app.get('/api/dashboard/current-status', (req, res) => {
  res.json([
    {
      id: '1',
      name: 'Tunnel de test',
      url: 'https://example.com',
      type: 'Sales Funnel',
      lastCheck: new Date().toISOString(),
      currentStatus: 'success',
      performanceScore: 95,
      loadTime: 1200
    }
  ]);
});

app.get('/api/dashboard/alerts', (req, res) => {
  res.json([]);
});

app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`📝 Test the health endpoint: http://localhost:${PORT}/health`);
  console.log(`🎯 Frontend should connect to: http://localhost:${PORT}/api`);
});