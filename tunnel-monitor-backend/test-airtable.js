const Airtable = require('airtable');

// Configuration directe pour le test
const config = {
  apiKey: process.env.AIRTABLE_API_KEY || 'pat5s4q20X9EDIyrQ.a749b77356e8f6d5d799051b708d0c55923dbc4ce9d06e8cc93ea01a3e4a447f',
  baseId: process.env.AIRTABLE_BASE_ID || 'appwwQ9gntk3uxRlD',
  tableName: process.env.AIRTABLE_TABLE_NAME || 'URL A SURVEILLER'
};

console.log('Configuration:');
console.log('- API Key:', config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'NOT SET');
console.log('- Base ID:', config.baseId || 'NOT SET');
console.log('- Table Name:', config.tableName || 'NOT SET');

if (\!config.apiKey || \!config.baseId) {
  console.error('Missing required configuration\!');
  process.exit(1);
}

const base = new Airtable({ apiKey: config.apiKey }).base(config.baseId);

console.log('\nTesting Airtable connection...');

base(config.tableName)
  .select({
    maxRecords: 3,
    filterByFormula: "{URL} \!= ''"
  })
  .firstPage()
  .then(records => {
    console.log('✅ Success\! Found', records.length, 'records:');
    records.forEach(record => {
      console.log('  -', record.get('Nom'), ':', record.get('URL'));
    });
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    if (err.statusCode) {
      console.error('   Status code:', err.statusCode);
    }
    if (err.error) {
      console.error('   Error details:', err.error);
    }
    process.exit(1);
  });
