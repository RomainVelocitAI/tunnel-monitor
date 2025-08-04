require('dotenv').config();
const airtableService = require('./src/services/airtableService');

async function testAirtableConnection() {
  console.log('=== Test de connexion Airtable ===');
  console.log('API Key:', process.env.AIRTABLE_API_KEY ? 'Configurée' : 'MANQUANTE');
  console.log('Base ID:', process.env.AIRTABLE_BASE_ID || 'MANQUANT');
  console.log('Table Name:', process.env.AIRTABLE_TABLE_NAME || 'MANQUANT');
  console.log('History Table:', process.env.AIRTABLE_HISTORY_TABLE || 'MANQUANT');
  
  try {
    console.log('\n=== Récupération des tunnels actifs ===');
    const tunnels = await airtableService.getActiveTunnels();
    console.log(`Nombre de tunnels trouvés: ${tunnels.length}`);
    
    if (tunnels.length > 0) {
      console.log('\nPremier tunnel:');
      console.log(JSON.stringify(tunnels[0], null, 2));
      
      console.log('\n=== Test de récupération de l\'historique ===');
      const history = await airtableService.getTestHistory(tunnels[0].id, 5);
      console.log(`Nombre d'entrées dans l'historique: ${history.length}`);
      
      if (history.length > 0) {
        console.log('\nPremière entrée de l\'historique:');
        console.log(JSON.stringify(history[0], null, 2));
      }
    }
    
    console.log('\n✅ Connexion Airtable réussie!');
  } catch (error) {
    console.error('\n❌ Erreur de connexion Airtable:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.statusCode) {
      console.error('Status Code:', error.statusCode);
      if (error.statusCode === 401) {
        console.error('➡️ Vérifiez votre clé API Airtable');
      } else if (error.statusCode === 404) {
        console.error('➡️ Vérifiez l\'ID de votre base ou le nom de la table');
      }
    }
  }
  
  process.exit(0);
}

testAirtableConnection();