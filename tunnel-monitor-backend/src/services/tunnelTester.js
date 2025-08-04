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
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins',
          '--disable-site-isolation-trials'
        ]
      };
      
      // Try to use system Chrome if available on Render
      if (process.env.NODE_ENV === 'production') {
        // Check for Chrome path from environment variable first
        if (process.env.CHROME_PATH) {
          launchOptions.executablePath = process.env.CHROME_PATH;
          logger.info(`Using Chrome from CHROME_PATH: ${process.env.CHROME_PATH}`);
        } else {
          try {
            // Try to find Chrome executable
            const { execSync } = require('child_process');
            const chromePath = execSync('which chromium-browser || which chromium || which google-chrome-stable || which google-chrome || which chrome', { encoding: 'utf8' }).trim();
            if (chromePath) {
              launchOptions.executablePath = chromePath;
              logger.info(`Using system Chrome: ${chromePath}`);
            }
          } catch (e) {
            logger.warn('System Chrome not found, using Playwright Chrome');
          }
        }
      }
      
      browser = await chromium.launch(launchOptions);

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

      // Test forms functionality
      if (results.formsValid) {
        try {
          logger.info('Testing form functionality...');
          
          // Trouver un formulaire de contact ou le premier formulaire disponible
          const formTest = await page.evaluate(() => {
            const forms = document.querySelectorAll('form');
            const emailInputs = document.querySelectorAll('input[type="email"]');
            const textInputs = document.querySelectorAll('input[type="text"], input[name*="name"], input[placeholder*="nom"]');
            const messageInputs = document.querySelectorAll('textarea, input[name*="message"]');
            
            const testData = {
              tested: false,
              submitted: false,
              fields: []
            };
            
            // Remplir les champs trouvés
            if (emailInputs.length > 0) {
              emailInputs[0].value = 'test@tunnelmonitor.com';
              emailInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
              testData.fields.push('email');
              testData.tested = true;
            }
            
            if (textInputs.length > 0) {
              textInputs[0].value = 'Test Tunnel Monitor';
              textInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
              testData.fields.push('name');
              testData.tested = true;
            }
            
            if (messageInputs.length > 0) {
              messageInputs[0].value = 'Ceci est un test automatique du système Tunnel Monitor. Veuillez ignorer ce message.';
              messageInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
              testData.fields.push('message');
              testData.tested = true;
            }
            
            return testData;
          });
          
          results.details.formTest = formTest;
          
          // Tenter de soumettre le formulaire (mais l'intercepter)
          if (formTest.tested) {
            // Intercepter la soumission pour ne pas vraiment envoyer
            await page.evaluate(() => {
              const forms = document.querySelectorAll('form');
              if (forms.length > 0) {
                forms[0].addEventListener('submit', (e) => {
                  e.preventDefault();
                  window.__formSubmitIntercepted = true;
                });
              }
            });
            
            // Chercher et cliquer sur le bouton submit
            const submitButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("Envoyer"), button:has-text("Submit"), button:has-text("Soumettre")');
            if (submitButton) {
              await submitButton.click();
              await page.waitForTimeout(1000);
              
              // Vérifier si le formulaire a tenté de se soumettre
              const wasIntercepted = await page.evaluate(() => window.__formSubmitIntercepted);
              results.details.formSubmitAttempted = wasIntercepted || false;
            }
          }
          
          results.details.formFunctional = formTest.tested;
          if (!formTest.tested) {
            results.warnings.push({
              type: 'form',
              message: 'Impossible de tester le formulaire automatiquement'
            });
          }
          
        } catch (error) {
          logger.error('Error testing form:', error);
          results.warnings.push({
            type: 'form',
            message: 'Erreur lors du test du formulaire'
          });
        }
      }

      // Check and test CTAs
      const ctaButtons = await page.$$('button, a.btn, a.button, [class*="cta"], a[href*="contact"], a[href*="devis"], a[href*="demo"]');
      results.details.ctaCount = ctaButtons.length;
      results.ctasValid = ctaButtons.length > 0;
      results.elements.ctas = ctaButtons.length;
      
      // Test CTA functionality
      if (results.ctasValid && ctaButtons.length > 0) {
        try {
          logger.info('Testing CTA functionality...');
          
          const ctaTest = {
            tested: 0,
            clickable: 0,
            destinations: []
          };
          
          // Tester les 3 premiers CTAs maximum
          const ctasToTest = Math.min(3, ctaButtons.length);
          
          for (let i = 0; i < ctasToTest; i++) {
            try {
              const cta = ctaButtons[i];
              
              // Obtenir les infos du CTA
              const ctaInfo = await cta.evaluate(el => ({
                text: el.textContent?.trim(),
                href: el.href || null,
                type: el.tagName.toLowerCase(),
                isButton: el.tagName === 'BUTTON',
                hasOnClick: !!el.onclick || el.hasAttribute('onclick')
              }));
              
              ctaTest.tested++;
              
              // Vérifier si le CTA est cliquable
              const isClickable = await cta.isEnabled();
              if (isClickable) {
                ctaTest.clickable++;
                
                // Pour les liens, vérifier la destination
                if (ctaInfo.href && !ctaInfo.href.startsWith('javascript:')) {
                  ctaTest.destinations.push({
                    text: ctaInfo.text,
                    url: ctaInfo.href,
                    valid: true
                  });
                }
              }
              
            } catch (error) {
              logger.warn('Error testing individual CTA:', error);
            }
          }
          
          results.details.ctaTest = ctaTest;
          results.details.ctaFunctional = ctaTest.clickable > 0;
          
          if (ctaTest.clickable === 0) {
            results.warnings.push({
              type: 'cta',
              message: 'Aucun CTA cliquable trouvé'
            });
          }
          
        } catch (error) {
          logger.error('Error testing CTAs:', error);
          results.warnings.push({
            type: 'cta',
            message: 'Erreur lors du test des CTAs'
          });
        }
      }

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