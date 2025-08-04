const { chromium } = require('playwright');
const logger = require('../utils/logger');

class TunnelTester {
  constructor() {
    this.timeout = parseInt(process.env.TEST_TIMEOUT) || 30000;
  }

  async testTunnel(url) {
    let browser = null;
    const results = {
      url,
      status: 'success',
      timestamp: new Date().toISOString(),
      performanceScore: 100,
      loadTime: 0,
      mobileLoadTime: 0,
      formsValid: false,
      ctasValid: false,
      trackingPixels: [],
      brokenLinks: 0,
      missingImages: 0,
      errors: [],
      warnings: [],
      details: {},
      elements: {}
    };

    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      const page = await context.newPage();

      // Collect console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          results.errors.push({
            type: 'console',
            message: msg.text()
          });
        }
      });

      // Collect page errors
      page.on('pageerror', error => {
        results.errors.push({
          type: 'page',
          message: error.message
        });
      });

      // Start performance timer
      const startTime = Date.now();

      // Navigate to page
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.timeout
      });

      results.loadTime = Date.now() - startTime;

      // Check HTTP status
      if (!response.ok()) {
        results.status = 'error';
        results.errors.push({
          type: 'http',
          message: `HTTP ${response.status()} - ${response.statusText()}`
        });
        results.performanceScore -= 30;
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

      results.details.performance = metrics;

      // Check for forms (attendre que le contenu soit chargé)
      await page.waitForTimeout(2000); // Attendre 2s pour le chargement JS
      
      // Recherche plus complète des formulaires
      const formData = await page.evaluate(() => {
        // Chercher les vrais formulaires
        const forms = document.querySelectorAll('form');
        
        // Chercher aussi les éléments qui ressemblent à des formulaires
        const inputs = document.querySelectorAll('input[type="email"], input[type="text"], input[type="tel"], textarea');
        
        // Chercher les boutons submit de manière plus complète
        const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
        const allButtons = document.querySelectorAll('button');
        let submitCount = submitButtons.length;
        
        // Chercher les boutons qui contiennent des mots-clés de soumission
        allButtons.forEach(button => {
          const text = button.textContent?.toLowerCase() || '';
          if ((text.includes('envoyer') || text.includes('submit') || text.includes('contact') || 
               text.includes('send') || text.includes('soumettre')) && 
              !button.hasAttribute('type')) {
            submitCount++;
          }
        });
        
        // Chercher les formulaires de contact spécifiquement
        const contactForms = document.querySelectorAll('[class*="contact"], [id*="contact"], [class*="form"], [id*="form"]');
        
        // Vérifier les iframes (certains formulaires sont dans des iframes)
        const iframes = document.querySelectorAll('iframe');
        
        return {
          formsCount: forms.length,
          inputsCount: inputs.length,
          submitButtonsCount: submitCount,
          contactSectionsCount: contactForms.length,
          iframesCount: iframes.length,
          formDetails: Array.from(forms).map(form => ({
            id: form.id,
            action: form.action,
            method: form.method,
            fields: form.querySelectorAll('input, textarea, select').length
          }))
        };
      });
      
      results.details.formsCount = formData.formsCount;
      results.details.formInputs = formData.inputsCount;
      results.details.formSubmitButtons = formData.submitButtonsCount;
      results.details.formDetails = formData.formDetails;
      
      // Un formulaire est valide s'il y a soit un vrai form, soit des inputs avec un bouton submit
      results.formsValid = formData.formsCount > 0 || 
                          (formData.inputsCount > 0 && formData.submitButtonsCount > 0);
      results.elements.forms = formData.formsCount;

      // Check for CTAs
      const ctaButtons = await page.$$('button, a.btn, a.button, [class*="cta"]');
      results.details.ctaCount = ctaButtons.length;
      results.ctasValid = ctaButtons.length > 0;
      results.elements.ctas = ctaButtons.length;

      // Check tracking pixels
      const hasTracking = await page.evaluate(() => {
        return {
          facebook: typeof window.fbq !== 'undefined',
          googleAnalytics: typeof window.ga !== 'undefined' || typeof window.gtag !== 'undefined',
          googleTagManager: typeof window.dataLayer !== 'undefined'
        };
      });
      results.details.tracking = hasTracking;
      
      // Set trackingPixels array based on what was found
      const trackingPixelsList = [];
      if (hasTracking.facebook) trackingPixelsList.push('Facebook Pixel');
      if (hasTracking.googleAnalytics) trackingPixelsList.push('Google Analytics');
      if (hasTracking.googleTagManager) trackingPixelsList.push('Google Tag Manager');
      results.trackingPixels = trackingPixelsList;

      // Check for broken links
      const links = await page.$$eval('a[href]', links => 
        links.map(link => link.href).filter(href => href && !href.startsWith('javascript:'))
      );
      
      let brokenLinksCount = 0;
      for (const link of links.slice(0, 10)) { // Check first 10 links only
        try {
          const linkResponse = await page.request.head(link).catch(() => null);
          if (!linkResponse || !linkResponse.ok()) {
            brokenLinksCount++;
            results.warnings.push({
              type: 'broken_link',
              message: `Broken link: ${link}`
            });
          }
        } catch (error) {
          // Skip external links that block HEAD requests
        }
      }
      results.brokenLinks = brokenLinksCount;

      // Mobile test
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
      });
      
      const mobilePage = await mobileContext.newPage();
      const mobileStartTime = Date.now();
      await mobilePage.goto(url, { waitUntil: 'networkidle', timeout: this.timeout });
      results.mobileLoadTime = Date.now() - mobileStartTime;
      
      // Check mobile responsiveness
      const mobileViewport = await mobilePage.evaluate(() => {
        const viewport = document.querySelector('meta[name="viewport"]');
        return viewport ? viewport.content : null;
      });
      
      if (!mobileViewport || !mobileViewport.includes('width=device-width')) {
        results.warnings.push({
          type: 'mobile',
          message: 'Missing or incorrect viewport meta tag for mobile'
        });
        results.performanceScore -= 10;
      }

      // Check for missing images
      const images = await page.$$eval('img', imgs => 
        imgs.map(img => ({
          src: img.src,
          complete: img.complete,
          naturalWidth: img.naturalWidth
        }))
      );
      
      let missingImagesCount = 0;
      for (const img of images) {
        if (!img.complete || img.naturalWidth === 0) {
          missingImagesCount++;
        }
      }
      results.missingImages = missingImagesCount;

      // Screenshots retirés - pas nécessaire

      await mobileContext.close();

      // Calculate final score
      if (results.loadTime > 5000) results.performanceScore -= 20;
      if (results.loadTime > 10000) results.performanceScore -= 20;
      if (results.errors.length > 0) results.performanceScore -= 10 * results.errors.length;
      if (results.warnings.length > 0) results.performanceScore -= 5 * results.warnings.length;
      
      results.performanceScore = Math.max(0, results.performanceScore);

      // Set final status
      if (results.performanceScore < 50 || results.errors.length > 5) {
        results.status = 'critical';
      } else if (results.performanceScore < 70 || results.errors.length > 2) {
        results.status = 'warning';
      }

    } catch (error) {
      logger.error(`Error testing tunnel ${url}:`, error);
      results.status = 'error';
      results.errors.push({
        type: 'test',
        message: error.message
      });
      results.performanceScore = 0;
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return results;
  }
}

module.exports = new TunnelTester();