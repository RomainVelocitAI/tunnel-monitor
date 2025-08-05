const puppeteer = require('puppeteer');
const https = require('https');

async function sendWebhook(url, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    };
    
    const req = https.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve());
    });
    
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTest() {
  const tunnelId = process.env.TUNNEL_ID;
  const tunnelName = process.env.TUNNEL_NAME;
  const tunnelUrl = process.env.TUNNEL_URL;
  const callbackUrl = process.env.CALLBACK_URL;
  
  console.log(`Testing tunnel: ${tunnelName} (${tunnelUrl})`);
  
  let browser = null;
  const results = {
    tunnelId,
    tunnelName,
    url: tunnelUrl,
    timestamp: new Date().toISOString(),
    status: 'pending',
    performanceScore: 0,
    loadTime: 0,
    formsValid: false,
    ctasValid: false,
    trackingPixels: [],
    details: {}
  };
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Navigation avec retry et timeout augmenté
    const startTime = Date.now();
    let response;
    let lastError;
    
    // Essayer jusqu'à 3 fois avec des timeouts progressifs
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Tentative ${attempt}/3 de chargement de ${tunnelUrl}`);
        
        // Pour les dernières tentatives, utiliser un mode moins strict
        const waitUntilOption = attempt === 3 ? 'domcontentloaded' : 'networkidle0';
        
        response = await page.goto(tunnelUrl, {
          waitUntil: waitUntilOption,
          timeout: 60000 * attempt // 60s, 120s, 180s
        });
        console.log(`Page chargée avec succès en ${Date.now() - startTime}ms (mode: ${waitUntilOption})`);
        
        // Si on a utilisé domcontentloaded, attendre un peu plus pour le contenu dynamique
        if (waitUntilOption === 'domcontentloaded') {
          console.log('Attente supplémentaire pour le contenu dynamique...');
          await page.waitForTimeout(5000);
        }
        
        break; // Succès, sortir de la boucle
      } catch (error) {
        lastError = error;
        console.error(`Tentative ${attempt} échouée:`, error.message);
        
        if (attempt < 3) {
          console.log(`Attente de 5 secondes avant la prochaine tentative...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    if (!response) {
      throw lastError; // Si toutes les tentatives ont échoué
    }
    
    const loadTime = Date.now() - startTime;
    results.loadTime = loadTime;
    
    // Calculate performance score (better formula)
    if (loadTime < 1000) {
      results.performanceScore = 100;
    } else if (loadTime < 3000) {
      results.performanceScore = 90;
    } else if (loadTime < 5000) {
      results.performanceScore = 70;
    } else if (loadTime < 8000) {
      results.performanceScore = 50;
    } else {
      results.performanceScore = Math.max(0, 30 - Math.floor((loadTime - 8000) / 1000));
    }
    
    if (response.ok()) {
      results.status = 'success';
    }
    
    // Performance metrics
    const metrics = await page.evaluate(() => {
      const perf = window.performance;
      const navigation = perf.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: perf.getEntriesByName('first-paint')[0]?.startTime,
        firstContentfulPaint: perf.getEntriesByName('first-contentful-paint')[0]?.startTime
      };
    });
    
    // Wait for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check forms with better selectors
    const formData = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      const emailInputs = document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"]');
      const textInputs = document.querySelectorAll('input[type="text"], input[name*="name"], input[name*="nom"], input[placeholder*="nom"]');
      const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], button[class*="submit"], button[class*="send"]');
      
      // Look for contact forms specifically
      const contactForms = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        const className = el.className || '';
        return (text.toLowerCase().includes('contact') || className.toLowerCase().includes('contact')) && 
               el.querySelector('input, textarea');
      });
      
      return {
        formsCount: forms.length,
        emailInputsCount: emailInputs.length,
        textInputsCount: textInputs.length,
        submitButtonsCount: submitButtons.length,
        contactFormsCount: contactForms.length,
        hasInputFields: emailInputs.length > 0 || textInputs.length > 0
      };
    });
    
    results.formsValid = formData.formsCount > 0 || formData.hasInputFields;
    results.details.forms = formData;
    
    // Test form functionality if forms exist
    if (formData.hasInputFields) {
      const formTest = await page.evaluate(() => {
        const results = [];
        
        // Try to fill email inputs
        const emailInputs = document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"]');
        emailInputs.forEach((input, index) => {
          input.value = 'test@tunnelmonitor.com';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          results.push(`Email field ${index + 1} filled`);
        });
        
        // Try to fill name inputs
        const nameInputs = document.querySelectorAll('input[type="text"], input[name*="name"], input[name*="nom"], input[placeholder*="nom"]');
        nameInputs.forEach((input, index) => {
          if (!input.value) { // Don't overwrite if already has value
            input.value = 'Test Tunnel Monitor';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            results.push(`Name field ${index + 1} filled`);
          }
        });
        
        // Try to fill message/textarea
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach((textarea, index) => {
          textarea.value = 'Test message from Tunnel Monitor';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          results.push(`Message field ${index + 1} filled`);
        });
        
        return results;
      });
      
      results.details.formTests = formTest;
    }
    
    // Check CTAs with improved selectors
    const ctaData = await page.evaluate(() => {
      // Look for buttons and links that look like CTAs
      const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
      const ctaLinks = document.querySelectorAll('a[class*="btn"], a[class*="button"], a[class*="cta"], a[href*="contact"], a[href*="devis"]');
      
      // Find clickable elements with CTA-like text
      const ctaTexts = ['contact', 'devis', 'appel', 'rdv', 'essai', 'demo', 'commencer', 'inscription'];
      const textCTAs = Array.from(document.querySelectorAll('a, button')).filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return ctaTexts.some(cta => text.includes(cta));
      });
      
      return {
        buttonsCount: buttons.length,
        ctaLinksCount: ctaLinks.length,
        textCTAsCount: textCTAs.length,
        total: buttons.length + ctaLinks.length
      };
    });
    
    results.ctasValid = ctaData.total > 0;
    results.details.ctas = ctaData;
    
    // Check tracking pixels
    const hasTracking = await page.evaluate(() => {
      return {
        facebook: typeof window.fbq !== 'undefined',
        googleAnalytics: typeof window.ga !== 'undefined' || typeof window.gtag !== 'undefined',
        googleTagManager: typeof window.dataLayer !== 'undefined' && Array.isArray(window.dataLayer),
        googleAds: typeof window.google_trackConversion !== 'undefined',
        linkedIn: typeof window._linkedin_data_partner_ids !== 'undefined'
      };
    });
    
    if (hasTracking.facebook) results.trackingPixels.push('Facebook Pixel');
    if (hasTracking.googleAnalytics) results.trackingPixels.push('Google Analytics');
    if (hasTracking.googleTagManager) results.trackingPixels.push('Google Tag Manager');
    if (hasTracking.googleAds) results.trackingPixels.push('Google Ads');
    if (hasTracking.linkedIn) results.trackingPixels.push('LinkedIn Insight');
    
    // Take screenshot
    await page.screenshot({ path: `screenshot-${tunnelId}.png`, fullPage: false });
    
    results.details.performance = metrics;
    results.details.tracking = hasTracking;
    
    // Test completed successfully (page loaded and analyzed)
    // Set status to success if not already set by response.ok()
    if (results.status === 'pending') {
      results.status = 'success';
    }
    
  } catch (error) {
    console.error('Test error:', error);
    results.error = error.message;
    
    // Déterminer le type d'erreur
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      results.status = 'error';
      results.details.errorType = 'timeout';
      results.details.errorDetails = `Le site a mis trop de temps à répondre (${error.message})`;
      
      // Essayer quand même de prendre un screenshot si la page est partiellement chargée
      try {
        if (browser && page) {
          await page.screenshot({ path: `screenshot-error-${tunnelId}.png` });
          console.log('Screenshot d\'erreur capturé');
        }
      } catch (screenshotError) {
        console.error('Impossible de capturer le screenshot:', screenshotError.message);
      }
    } else {
      results.status = 'error';
      results.details.errorType = 'other';
      results.details.errorDetails = error.message;
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Send results back to webhook
  console.log('Sending results to webhook...');
  try {
    await sendWebhook(callbackUrl, results);
    console.log('Results sent successfully');
  } catch (error) {
    console.error('Failed to send webhook:', error);
    process.exit(1);
  }
}

runTest().catch(console.error);