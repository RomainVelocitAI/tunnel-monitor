#!/usr/bin/env node

/**
 * Script de diagnostic pour comprendre pourquoi seul 1 test fonctionne depuis le frontend
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const airtableService = require('../services/airtableService');
const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function debugFrontendTests() {
  console.log('🔍 Diagnostic des tests déclenchés depuis le frontend\n');
  
  try {
    // 1. Récupérer la liste des tunnels
    console.log('1️⃣ Récupération de la liste des tunnels...');
    const tunnelsResponse = await axios.get(`${API_URL}/tunnels`);
    const tunnels = tunnelsResponse.data;
    console.log(`   ✅ ${tunnels.length} tunnels trouvés:`);
    tunnels.forEach(t => {
      console.log(`   - ${t.name} (ID: ${t.id})`);
    });
    
    // 2. Tester le déclenchement de chaque tunnel
    console.log('\n2️⃣ Test du déclenchement pour chaque tunnel:');
    
    for (const tunnel of tunnels) {
      console.log(`\n   🚀 Test de ${tunnel.name} (ID: ${tunnel.id})...`);
      
      try {
        // Déclencher le test
        const testResponse = await axios.post(`${API_URL}/tunnels/${tunnel.id}/test`);
        console.log(`   ✅ Réponse API:`, testResponse.data);
        
        // Attendre un peu pour voir si le test démarre
        console.log(`   ⏳ Attente de 5 secondes...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Vérifier si des résultats récents existent
        const history = await airtableService.getTestHistory(tunnel.id, 1);
        if (history && history.length > 0) {
          const lastTest = history[0];
          const testDate = new Date(lastTest.createdTime);
          const now = new Date();
          const diffSeconds = (now - testDate) / 1000;
          
          if (diffSeconds < 60) {
            console.log(`   ✅ Test récent trouvé (il y a ${Math.round(diffSeconds)}s)`);
            console.log(`      Status: ${lastTest.status}`);
            console.log(`      Performance: ${lastTest.performanceScore}%`);
          } else {
            console.log(`   ⚠️ Pas de test récent (dernier il y a ${Math.round(diffSeconds / 60)} minutes)`);
          }
        } else {
          console.log(`   ❌ Aucun test trouvé dans l'historique`);
        }
        
      } catch (error) {
        console.log(`   ❌ Erreur lors du test:`, error.message);
        if (error.response) {
          console.log(`      Status HTTP: ${error.response.status}`);
          console.log(`      Données:`, error.response.data);
        }
      }
    }
    
    // 3. Vérifier les processus en arrière-plan
    console.log('\n3️⃣ Vérification des processus en cours:');
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    try {
      const { stdout } = await execPromise('ps aux | grep -E "node|playwright" | grep -v grep | head -10');
      console.log('   Processus Node/Playwright actifs:');
      console.log(stdout);
    } catch (error) {
      console.log('   Pas de processus Playwright actifs détectés');
    }
    
    // 4. Vérifier la mémoire et les ressources
    console.log('\n4️⃣ Vérification des ressources système:');
    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem * 100).toFixed(1);
    
    console.log(`   💾 Mémoire: ${memUsagePercent}% utilisée`);
    console.log(`      Total: ${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`      Libre: ${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`);
    
    if (memUsagePercent > 80) {
      console.log(`   ⚠️ Attention: Utilisation mémoire élevée!`);
    }
    
  } catch (error) {
    console.error('❌ Erreur globale:', error.message);
  }
}

// Exécuter le diagnostic
debugFrontendTests()
  .then(() => {
    console.log('\n✅ Diagnostic terminé');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });