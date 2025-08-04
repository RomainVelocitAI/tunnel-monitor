const { chromium } = require('playwright');
const airtableService = require('./airtableService');
const logger = require('../utils/logger');

class TestStreamService {
  async streamTest(tunnelId, res) {
    let browser = null;
    
    const sendLog = (level, message, details = null) => {
      const data = JSON.stringify({
        type: 'log',
        level,
        message,
        details
      });
      res.write(`data: ${data}\n\n`);
    };

    const sendComplete = (status) => {
      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        status 
      })}\n\n`);
    };

    try {
      // Get tunnel info
      sendLog('info', 'Récupération des informations du tunnel...');
      const tunnels = await airtableService.getActiveTunnels();
      const tunnel = tunnels.find(t => t.id === tunnelId);
      
      if (!tunnel) {
        sendLog('error', 'Tunnel non trouvé');
        sendComplete('error');
        return;
      }

      sendLog('success', `Tunnel trouvé: ${tunnel.name}`);
      sendLog('info', `URL: ${tunnel.url}`);
      
      // Initialize browser
      sendLog('info', 'Initialisation du navigateur Chromium...');
      
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
          sendLog('info', `Utilisation de Chrome depuis CHROME_PATH: ${process.env.CHROME_PATH}`);
        } else {
          try {
            // Try to find Chrome executable
            const { execSync } = require('child_process');
            const chromePath = execSync('which chromium-browser || which chromium || which google-chrome-stable || which google-chrome || which chrome', { encoding: 'utf8' }).trim();
            if (chromePath) {
              launchOptions.executablePath = chromePath;
              sendLog('info', `Utilisation de Chrome système: ${chromePath}`);
            }
          } catch (e) {
            sendLog('warning', 'Chrome système non trouvé, utilisation de Playwright Chrome');
          }
        }
      }
      
      browser = await chromium.launch(launchOptions);

      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      const page = await context.newPage();
      sendLog('success', 'Navigateur initialisé');

      // Navigate to URL
      sendLog('info', `Navigation vers ${tunnel.url}...`);
      const startTime = Date.now();
      
      const response = await page.goto(tunnel.url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      const loadTime = Date.now() - startTime;
      sendLog('success', `Page chargée en ${loadTime}ms`);

      // Check HTTP status
      if (!response.ok()) {
        sendLog('warning', `Statut HTTP: ${response.status()} - ${response.statusText()}`);
      }

      // Performance analysis
      sendLog('info', 'Analyse des performances...');
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
      
      sendLog('success', 'Analyse des performances terminée', {
        loadTime: loadTime,
        performanceScore: Math.floor(100 - (loadTime / 100))
      });

      // Check forms
      sendLog('info', 'Recherche des formulaires...');
      await page.waitForTimeout(2000);
      
      const formData = await page.evaluate(() => {
        const forms = document.querySelectorAll('form');
        const emailInputs = document.querySelectorAll('input[type="email"]');
        const textInputs = document.querySelectorAll('input[type="text"], input[name*="name"]');
        const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
        
        return {
          formsCount: forms.length,
          emailInputsCount: emailInputs.length,
          textInputsCount: textInputs.length,
          submitButtonsCount: submitButtons.length
        };
      });
      
      if (formData.formsCount > 0) {
        sendLog('success', `${formData.formsCount} formulaire(s) trouvé(s)`);
        
        // Test form functionality
        sendLog('info', 'Test du formulaire...');
        
        const formTest = await page.evaluate(() => {
          const emailInput = document.querySelector('input[type="email"]');
          const nameInput = document.querySelector('input[type="text"], input[name*="name"]');
          const messageInput = document.querySelector('textarea');
          
          const results = [];
          
          if (emailInput) {
            emailInput.value = 'test@tunnelmonitor.com';
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            results.push('Email rempli');
          }
          
          if (nameInput) {
            nameInput.value = 'Test Tunnel Monitor';
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
            results.push('Nom rempli');
          }
          
          if (messageInput) {
            messageInput.value = 'Test automatique';
            messageInput.dispatchEvent(new Event('input', { bubbles: true }));
            results.push('Message rempli');
          }
          
          return results;
        });
        
        if (formTest.length > 0) {
          sendLog('success', `Formulaire testé: ${formTest.join(', ')}`);
        }
      } else {
        sendLog('warning', 'Aucun formulaire trouvé');
      }

      // Check CTAs
      sendLog('info', 'Analyse des CTAs...');
      const ctaButtons = await page.$$('button, a.btn, a.button, [class*="cta"]');
      
      if (ctaButtons.length > 0) {
        sendLog('success', `${ctaButtons.length} CTA(s) détecté(s)`);
        
        // Test first CTA
        sendLog('info', 'Test de cliquabilité des CTAs...');
        let clickableCount = 0;
        
        for (let i = 0; i < Math.min(3, ctaButtons.length); i++) {
          const isClickable = await ctaButtons[i].isEnabled();
          if (isClickable) clickableCount++;
        }
        
        sendLog('success', `${clickableCount}/${Math.min(3, ctaButtons.length)} CTAs cliquables`);
      } else {
        sendLog('warning', 'Aucun CTA trouvé');
      }

      // Check tracking
      sendLog('info', 'Vérification des pixels de tracking...');
      const hasTracking = await page.evaluate(() => {
        return {
          facebook: typeof window.fbq !== 'undefined',
          googleAnalytics: typeof window.ga !== 'undefined' || typeof window.gtag !== 'undefined',
          googleTagManager: typeof window.dataLayer !== 'undefined'
        };
      });
      
      const trackingList = [];
      if (hasTracking.facebook) trackingList.push('Facebook Pixel');
      if (hasTracking.googleAnalytics) trackingList.push('Google Analytics');
      if (hasTracking.googleTagManager) trackingList.push('Google Tag Manager');
      
      if (trackingList.length > 0) {
        sendLog('success', `Tracking détecté: ${trackingList.join(', ')}`);
      } else {
        sendLog('info', 'Aucun pixel de tracking détecté');
      }

      // Screenshot
      sendLog('info', 'Capture d\'écran...');
      await page.screenshot({ path: `/tmp/screenshot-${tunnelId}.png` });
      sendLog('success', 'Capture d\'écran réalisée');

      // Save results
      sendLog('info', 'Sauvegarde des résultats...');
      const results = {
        url: tunnel.url,
        status: 'success',
        timestamp: new Date().toISOString(),
        performanceScore: Math.floor(100 - (loadTime / 100)),
        loadTime: loadTime,
        formsValid: formData.formsCount > 0,
        ctasValid: ctaButtons.length > 0,
        trackingPixels: trackingList,
        details: {
          formsCount: formData.formsCount,
          ctaCount: ctaButtons.length,
          performance: metrics
        }
      };
      
      await airtableService.saveTestResult(tunnelId, results);
      sendLog('success', 'Résultats sauvegardés');
      
      sendLog('success', 'Test terminé avec succès !');
      sendComplete('success');
      
    } catch (error) {
      logger.error(`Error during streamed test: ${error.message}`);
      sendLog('error', `Erreur lors du test: ${error.message}`);
      sendComplete('error');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = new TestStreamService();