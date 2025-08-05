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
    status: 'error',
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
    
    // Navigation
    const startTime = Date.now();
    const response = await page.goto(tunnelUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    const loadTime = Date.now() - startTime;
    results.loadTime = loadTime;
    results.performanceScore = Math.floor(100 - (loadTime / 100));
    
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
    
    // Check forms
    await page.waitForTimeout(2000);
    const formData = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      const emailInputs = document.querySelectorAll('input[type="email"]');
      const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
      
      return {
        formsCount: forms.length,
        emailInputsCount: emailInputs.length,
        submitButtonsCount: submitButtons.length
      };
    });
    
    results.formsValid = formData.formsCount > 0;
    results.details.formsCount = formData.formsCount;
    
    // Test form functionality
    if (formData.formsCount > 0) {
      const formTest = await page.evaluate(() => {
        const emailInput = document.querySelector('input[type="email"]');
        const nameInput = document.querySelector('input[type="text"], input[name*="name"]');
        const results = [];
        
        if (emailInput) {
          emailInput.value = 'test@tunnelmonitor.com';
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          results.push('Email filled');
        }
        
        if (nameInput) {
          nameInput.value = 'Test Tunnel Monitor';
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          results.push('Name filled');
        }
        
        return results;
      });
      
      results.details.formTests = formTest;
    }
    
    // Check CTAs
    const ctaButtons = await page.$$('button, a.btn, a.button, [class*="cta"]');
    results.ctasValid = ctaButtons.length > 0;
    results.details.ctaCount = ctaButtons.length;
    
    // Check tracking
    const hasTracking = await page.evaluate(() => {
      return {
        facebook: typeof window.fbq !== 'undefined',
        googleAnalytics: typeof window.ga !== 'undefined' || typeof window.gtag !== 'undefined',
        googleTagManager: typeof window.dataLayer !== 'undefined'
      };
    });
    
    if (hasTracking.facebook) results.trackingPixels.push('Facebook Pixel');
    if (hasTracking.googleAnalytics) results.trackingPixels.push('Google Analytics');
    if (hasTracking.googleTagManager) results.trackingPixels.push('Google Tag Manager');
    
    // Screenshot
    await page.screenshot({ path: `screenshot-${tunnelId}.png` });
    
    results.details.performance = metrics;
    
  } catch (error) {
    console.error('Test error:', error);
    results.error = error.message;
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