const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testFullSystem() {
  console.log('=== Test complet du système de monitoring ===\n');
  
  try {
    // 1. Vérifier le statut actuel
    console.log('1. Récupération du statut actuel...');
    const statusResponse = await axios.get(`${API_URL}/dashboard/current-status`);
    console.log(`   ✅ ${statusResponse.data.length} tunnels trouvés`);
    
    if (statusResponse.data.length === 0) {
      console.log('   ⚠️ Aucun tunnel trouvé dans Airtable');
      return;
    }
    
    // 2. Afficher les tunnels
    console.log('\n2. Tunnels disponibles:');
    statusResponse.data.forEach((tunnel, index) => {
      console.log(`   ${index + 1}. ${tunnel.name} (${tunnel.url})`);
      console.log(`      - ID: ${tunnel.id}`);
      console.log(`      - Statut: ${tunnel.currentStatus}`);
    });
    
    // 3. Tester le premier tunnel
    const firstTunnel = statusResponse.data[0];
    console.log(`\n3. Lancement d'un test sur "${firstTunnel.name}"...`);
    
    const testResponse = await axios.post(`${API_URL}/tunnels/${firstTunnel.id}/test`);
    console.log(`   ✅ ${testResponse.data.message}`);
    
    // 4. Attendre que le test se termine
    console.log('\n4. Attente de la fin du test (30 secondes)...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // 5. Vérifier l'historique
    console.log('\n5. Récupération de l\'historique...');
    const historyResponse = await axios.get(`${API_URL}/tunnels/${firstTunnel.id}/history?limit=1`);
    
    if (historyResponse.data.length > 0) {
      const latestTest = historyResponse.data[0];
      console.log('   ✅ Test enregistré dans Airtable:');
      console.log(`      - Date: ${latestTest.testDate}`);
      console.log(`      - Statut: ${latestTest.status}`);
      console.log(`      - Temps de chargement (Desktop): ${latestTest.loadTimeDesktop}ms`);
      console.log(`      - Temps de chargement (Mobile): ${latestTest.loadTimeMobile}ms`);
      console.log(`      - Formulaires OK: ${latestTest.formsOk ? 'Oui' : 'Non'}`);
      console.log(`      - CTA OK: ${latestTest.ctaOk ? 'Oui' : 'Non'}`);
    } else {
      console.log('   ⚠️ Aucun historique trouvé');
    }
    
    // 6. Vérifier les statistiques
    console.log('\n6. Récupération des statistiques (7 derniers jours)...');
    const statsResponse = await axios.get(`${API_URL}/dashboard/stats/7`);
    console.log(`   ✅ Statistiques:`);
    console.log(`      - Tests totaux: ${statsResponse.data.totalTests}`);
    console.log(`      - Tests réussis: ${statsResponse.data.successfulTests}`);
    console.log(`      - Tests échoués: ${statsResponse.data.failedTests}`);
    console.log(`      - Performance moyenne: ${statsResponse.data.averagePerformance}%`);
    
    console.log('\n✅ Tous les tests ont réussi ! Le système fonctionne correctement.');
    console.log('\n📝 Notes:');
    console.log('   - Les données sont bien récupérées depuis Airtable');
    console.log('   - Les tests sont lancés et enregistrés correctement');
    console.log('   - Le dashboard peut afficher les données');
    console.log('\n🌐 Accédez au dashboard sur: http://localhost:3000');
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.error || error.response.data}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   ➡️ Le serveur backend n\'est pas démarré sur le port 3001');
      console.error('   ➡️ Démarrez-le avec: npm start');
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

// Vérifier que le serveur backend est accessible
axios.get(`${API_URL}/dashboard/current-status`)
  .then(() => {
    console.log('🔌 Serveur backend accessible sur le port 3001\n');
    testFullSystem();
  })
  .catch(() => {
    console.error('❌ Le serveur backend n\'est pas accessible sur le port 3001');
    console.error('➡️ Démarrez-le avec la commande suivante:');
    console.error('   cd /var/www/Analyseur_de_site/tunnel-monitor-backend && npm start\n');
    process.exit(1);
  });