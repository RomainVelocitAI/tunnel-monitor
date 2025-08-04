// Debug script pour l'API
require('dotenv').config();
const express = require('express');
const Airtable = require('airtable');

const app = express();

// Configuration
console.log('=== Configuration ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('AIRTABLE_API_KEY:', process.env.AIRTABLE_API_KEY ? 'SET (length: ' + process.env.AIRTABLE_API_KEY.length + ')' : 'NOT SET');
console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID || 'NOT SET');
console.log('AIRTABLE_TABLE_NAME:', process.env.AIRTABLE_TABLE_NAME || 'NOT SET');

// Test endpoint
app.get('/test-airtable', async (req, res) => {
  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);
    
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'URL_A_SURVEILLER';
    console.log('Using table:', tableName);
    
    const records = await base(tableName)
      .select({
        filterByFormula: "{URL} != ''",
        maxRecords: 5
      })
      .all();
    
    const result = records.map(record => ({
      id: record.id,
      url: record.get('URL'),
      name: record.get('Nom') || 'Sans nom'
    }));
    
    res.json({
      success: true,
      count: result.length,
      tableName: tableName,
      data: result
    });
  } catch (error) {
    console.error('Error details:', error);
    res.status(500).json({
      error: 'Failed to fetch tunnels',
      details: error.message,
      statusCode: error.statusCode,
      tableName: process.env.AIRTABLE_TABLE_NAME
    });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
  console.log(`Test URL: http://localhost:${PORT}/test-airtable`);
});