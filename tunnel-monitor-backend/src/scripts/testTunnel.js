require('dotenv').config();
const tunnelTester = require('../services/tunnelTester');
const airtableService = require('../services/airtableService');

async function testSingleTunnel() {
  try {
    console.log('🚀 Démarrage du test d\'un tunnel...');
    console.log('📊 Configuration Airtable:');
    console.log('   Base ID:', process.env.AIRTABLE_BASE_ID);
    console.log('   Table:', process.env.AIRTABLE_TABLE_NAME);
    console.log('   Historique:', process.env.AIRTABLE_HISTORY_TABLE);
    console.log('');
    
    // Récupérer les tunnels actifs
    const tunnels = await airtableService.getActiveTunnels();
    console.log(`📋 ${tunnels.length} tunnel(s) trouvé(s)`);
    
    if (tunnels.length === 0) {
      console.log('❌ Aucun tunnel trouvé dans Airtable');
      process.exit(0);
    }
    
    // Afficher la liste des tunnels
    console.log('\n📝 Liste des tunnels:');
    tunnels.forEach((tunnel, index) => {
      console.log(`   ${index + 1}. ${tunnel.name} - ${tunnel.url}`);
    });
    
    // Prendre le premier tunnel ou celui spécifié
    const tunnelIndex = process.argv[2] ? parseInt(process.argv[2]) - 1 : 0;
    const tunnel = tunnels[tunnelIndex] || tunnels[0];
    
    console.log('\n🎯 Test du tunnel sélectionné:');
    console.log('   Nom:', tunnel.name);
    console.log('   URL:', tunnel.url);
    console.log('   ID:', tunnel.id);
    console.log('');
    
    // Lancer le test
    console.log('⏳ Test en cours...');
    const startTime = Date.now();
    const testResult = await tunnelTester.testTunnel(tunnel.url);
    const testDuration = Date.now() - startTime;
    
    console.log('\n✅ Test terminé en', (testDuration / 1000).toFixed(2), 'secondes');
    console.log('\n📊 Résultats du test:');
    console.log('   Statut:', testResult.status);
    console.log('   Performance Score:', testResult.performanceScore, '%');
    console.log('   Temps de chargement Desktop:', testResult.loadTime, 'ms');
    console.log('   Temps de chargement Mobile:', testResult.mobileLoadTime, 'ms');
    console.log('   Formulaires valides:', testResult.formsValid ? 'Oui' : 'Non');
    console.log('   CTAs valides:', testResult.ctasValid ? 'Oui' : 'Non');
    console.log('   Liens cassés:', testResult.brokenLinks);
    console.log('   Images manquantes:', testResult.missingImages);
    
    if (testResult.trackingPixels && testResult.trackingPixels.length > 0) {
      console.log('   Pixels de tracking:', testResult.trackingPixels.join(', '));
    } else {
      console.log('   Pixels de tracking: Aucun');
    }
    
    if (testResult.details.performance) {
      console.log('\n📈 Métriques de performance:');
      const perf = testResult.details.performance;
      console.log('   DOM Content Loaded:', perf.domContentLoaded, 'ms');
      console.log('   Load Complete:', perf.loadComplete, 'ms');
      console.log('   First Paint:', perf.firstPaint, 'ms');
      console.log('   First Contentful Paint:', perf.firstContentfulPaint, 'ms');
    }
    
    if (testResult.errors.length > 0) {
      console.log('\n❌ Erreurs détectées:');
      testResult.errors.forEach(error => {
        console.log(`   - [${error.type}] ${error.message}`);
      });
    }
    
    if (testResult.warnings.length > 0) {
      console.log('\n⚠️  Avertissements:');
      testResult.warnings.forEach(warning => {
        console.log(`   - [${warning.type}] ${warning.message}`);
      });
    }
    
    // Sauvegarder dans Airtable
    console.log('\n💾 Sauvegarde dans Airtable...');
    try {
      const recordId = await airtableService.saveTestResult(tunnel.id, testResult);
      console.log('✅ Données sauvegardées avec succès');
      console.log('   Record ID:', recordId);
      
      // Vérifier l'historique
      console.log('\n📜 Vérification de la sauvegarde...');
      const history = await airtableService.getTestHistory(tunnel.id, 1);
      if (history.length > 0) {
        const lastTest = history[0];
        console.log('✅ Données vérifiées dans Airtable:');
        console.log('   - Performance Score:', lastTest.performanceScore !== undefined ? lastTest.performanceScore : 'Non sauvegardé');
        console.log('   - Performance Metrics:', lastTest.performanceMetrics ? 'Sauvegardé' : 'Non sauvegardé');
        console.log('   - Tracking Pixels Details:', lastTest.trackingPixelsDetails ? 'Sauvegardé' : 'Non sauvegardé');
        
        // Vérifier les nouveaux champs
        const fieldsStatus = {
          'Performance_Score': lastTest.performanceScore !== undefined,
          'Performance_Metrics': !!lastTest.performanceMetrics,
          'Tracking_Pixels_Details': !!lastTest.trackingPixelsDetails
        };
        
        console.log('\n📋 État des nouveaux champs:');
        Object.entries(fieldsStatus).forEach(([field, status]) => {
          console.log(`   ${field}: ${status ? '✅ OK' : '❌ Manquant'}`);
        });
      }
    } catch (saveError) {
      console.error('❌ Erreur lors de la sauvegarde:', saveError.message);
      if (saveError.statusCode === 422) {
        console.error('   Détails:', saveError.message);
        console.error('   Vérifiez que tous les champs existent dans Airtable');
      }
    }
    
    console.log('\n✨ Test terminé avec succès!');
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Lancer le test
testSingleTunnel().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});