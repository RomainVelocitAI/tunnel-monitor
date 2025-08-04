const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to frontend...');
  await page.goto('https://tunnel-monitor.vercel.app', { waitUntil: 'networkidle' });
  
  // Attendre un peu pour que les données se chargent
  await page.waitForTimeout(3000);
  
  // Récupérer le contenu de la page
  const content = await page.content();
  
  // Chercher des éléments spécifiques
  const hasVelocit = content.includes('VelocitAI');
  const hasLagence = content.includes('Lagence');
  const hasDigiqo = content.includes('Digiqo');
  const hasNoTunnels = content.includes('No tunnels');
  const hasError = content.includes('Failed to');
  
  console.log('\nResults:');
  console.log('- VelocitAI found:', hasVelocit);
  console.log('- Lagence found:', hasLagence);
  console.log('- Digiqo found:', hasDigiqo);
  console.log('- "No tunnels" message:', hasNoTunnels);
  console.log('- Error message:', hasError);
  
  // Chercher le nombre de tunnels affichés
  const tunnelCards = await page.$$('[class*="card"], [class*="tunnel"], [class*="item"]');
  console.log('\nNumber of card-like elements:', tunnelCards.length);
  
  await browser.close();
})();
