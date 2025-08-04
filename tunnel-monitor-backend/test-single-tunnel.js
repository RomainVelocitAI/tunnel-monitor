require('dotenv').config();
const airtableService = require('./src/services/airtableService');
const monitoringService = require('./src/services/monitoringService');

async function testSingleTunnelWithDetails() {
  console.log('=== Test détaillé d\'un tunnel avec enregistrement Airtable ===\n');
  
  try {
    // 1. Récupérer les tunnels
    console.log('1. Récupération des tunnels depuis Airtable...');
    const tunnels = await airtableService.getActiveTunnels();
    console.log(`   ✅ ${tunnels.length} tunnels trouvés`);
    
    if (tunnels.length === 0) {
      console.log('   ❌ Aucun tunnel dans Airtable');
      return;
    }
    
    const tunnel = tunnels[0];
    console.log(`\n2. Test du tunnel: ${tunnel.name}`);
    console.log(`   - ID: ${tunnel.id}`);
    console.log(`   - URL: ${tunnel.url}`);
    
    // 2. Lancer le test
    console.log('\n3. Lancement du test (cela peut prendre 30-60 secondes)...');
    const testResult = await monitoringService.testSingleTunnel(tunnel.id);
    
    console.log('\n4. Résultat du test:');
    console.log(`   - Statut: ${testResult.status}`);
    console.log(`   - Temps de chargement: ${testResult.loadTime}ms`);
    console.log(`   - Score de performance: ${testResult.performanceScore}%`);
    console.log(`   - Nombre d'erreurs: ${testResult.errors.length}`);
    console.log(`   - Nombre de warnings: ${testResult.warnings.length}`);
    
    if (testResult.details) {
      console.log(`   - Formulaires détectés: ${testResult.details.formsCount || 0}`);
      console.log(`   - CTAs détectés: ${testResult.details.ctaCount || 0}`);
      if (testResult.details.tracking) {
        console.log(`   - Tracking Facebook: ${testResult.details.tracking.facebook ? 'Oui' : 'Non'}`);
        console.log(`   - Tracking Google: ${testResult.details.tracking.googleAnalytics ? 'Oui' : 'Non'}`);
      }
    }
    
    // 3. Vérifier l'enregistrement dans Airtable
    console.log('\n5. Vérification de l\'enregistrement dans Airtable...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2 secondes
    
    const history = await airtableService.getTestHistory(tunnel.id, 1);
    
    if (history.length > 0) {
      const latestTest = history[0];
      console.log('   ✅ Test enregistré avec succès dans Airtable !');
      console.log('\n   Détails de l\'enregistrement:');
      console.log(`   - ID Airtable: ${latestTest.id}`);
      console.log(`   - URL: ${latestTest.url}`);
      console.log(`   - Nom du tunnel: ${latestTest.tunnelName}`);
      console.log(`   - Date du test: ${latestTest.testDate}`);
      console.log(`   - Statut: ${latestTest.status}`);
      console.log(`   - Temps de chargement Desktop: ${latestTest.loadTimeDesktop}ms`);
      console.log(`   - Temps de chargement Mobile: ${latestTest.loadTimeMobile}ms`);
      console.log(`   - Formulaires OK: ${latestTest.formsOk ? 'Oui' : 'Non'}`);
      console.log(`   - CTA OK: ${latestTest.ctaOk ? 'Oui' : 'Non'}`);
      console.log(`   - Tracking Pixels: ${latestTest.trackingPixels ? 'Oui' : 'Non'}`);
      console.log(`   - Liens cassés: ${latestTest.brokenLinks || 0}`);
      console.log(`   - Images manquantes: ${latestTest.missingImages || 0}`);
      
      if (latestTest.errors) {
        console.log(`   - Erreurs: ${latestTest.errors}`);
      }
      if (latestTest.warnings) {
        console.log(`   - Warnings: ${latestTest.warnings}`);
      }
    } else {
      console.log('   ❌ Aucun enregistrement trouvé dans l\'historique Airtable');
      console.log('   ➡️ Vérifiez les logs pour des erreurs');
    }
    
    console.log('\n✅ Test terminé avec succès!');
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testSingleTunnelWithDetails();