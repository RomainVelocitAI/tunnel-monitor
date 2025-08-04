const Airtable = require('airtable');
const logger = require('../utils/logger');

class AirtableService {
  constructor() {
    this.base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);
    
    this.urlTable = process.env.AIRTABLE_TABLE_NAME || 'URL_A_SURVEILLER';
    this.historyTable = process.env.AIRTABLE_HISTORY_TABLE || 'Historique_Tests_Tunnels';
  }

  async getActiveTunnels() {
    try {
      const records = await this.base(this.urlTable)
        .select({
          filterByFormula: "{URL} != ''",
          maxRecords: 100
        })
        .all();

      return records.map(record => ({
        id: record.id,
        url: record.get('URL'),
        name: record.get('Nom') || 'Sans nom',
        type: 'Sales Funnel',
        owner: 'Admin',
        alertEmail: null,
        checkFrequency: 'daily',
        lastCheck: null,
        priority: 'medium'
      })).filter(record => record.url); // Filtrer les enregistrements sans URL
    } catch (error) {
      logger.error('Error fetching active tunnels:', error);
      throw error;
    }
  }

  async saveTestResult(tunnelId, testResult) {
    try {
      // Récupérer les informations du tunnel pour avoir l'URL
      const tunnels = await this.getActiveTunnels();
      const tunnel = tunnels.find(t => t.id === tunnelId);
      const tunnelUrl = tunnel ? tunnel.url : testResult.url;
      const tunnelName = tunnel ? tunnel.name : testResult.name;
      
      // Préparer les erreurs et warnings comme texte
      const errorsText = testResult.errors ? 
        (typeof testResult.errors === 'object' ? JSON.stringify(testResult.errors) : String(testResult.errors)) : '';
      const warningsText = testResult.warnings ? 
        (typeof testResult.warnings === 'object' ? JSON.stringify(testResult.warnings) : String(testResult.warnings)) : '';

      // Convertir le statut en valeur compatible avec Airtable
      let airtableStatus = 'OK'; // Valeur par défaut
      switch(testResult.status) {
        case 'success':
          airtableStatus = 'OK';
          break;
        case 'warning':
          airtableStatus = 'Warning';
          break;
        case 'error':
        case 'critical':
          airtableStatus = 'Erreur';
          break;
        default:
          airtableStatus = 'OK';
      }
      
      // Préparer les données complètes à sauvegarder
      const createData = {
        fields: {
          'URL': tunnelUrl,
          'Nom_Tunnel': tunnelName,
          'Date_Test': new Date().toISOString(),
          'Statut': airtableStatus,
          'Temps_Chargement_Desktop': Math.round(testResult.loadTime || 0),
          'Temps_Chargement_Mobile': Math.round(testResult.mobileLoadTime || 0),
          'Formulaires_OK': testResult.formsValid ? 1 : 0,
          'CTA_OK': testResult.ctasValid ? 1 : 0,
          'Erreurs': errorsText,
          'Warnings': warningsText,
          'Elements_Detectes': JSON.stringify(testResult.elements || {}),
          'Tracking_Pixels': testResult.trackingPixels && testResult.trackingPixels.length > 0,
          'Liens_Casses': testResult.brokenLinks || 0,
          'Images_Manquantes': testResult.missingImages || 0,
          // NOUVELLES DONNÉES CRITIQUES
          'Performance_Score': testResult.performanceScore || 0,
          'Performance_Metrics': JSON.stringify(testResult.details?.performance || testResult.details?.performanceMetrics || {}),
          'Tracking_Pixels_Details': JSON.stringify(testResult.trackingPixels || [])
        }
      };

      // Screenshots retirés - pas nécessaire de les sauvegarder

      // Ajouter les détails si disponibles
      if (testResult.details?.brokenLinks) {
        createData.fields['Details_Liens_Casses'] = JSON.stringify(testResult.details.brokenLinks);
      }
      if (testResult.details?.missingImages) {
        createData.fields['Details_Images_Manquantes'] = JSON.stringify(testResult.details.missingImages);
      }

      const record = await this.base(this.historyTable).create([createData]);

      return record[0].id;
    } catch (error) {
      logger.error('Error saving test result:', error);
      throw error;
    }
  }

  async getTestHistory(tunnelId, limit = 30) {
    try {
      let formula = '';
      
      // Si tunnelId est fourni, on récupère d'abord l'URL du tunnel
      if (tunnelId) {
        const tunnels = await this.getActiveTunnels();
        const tunnel = tunnels.find(t => t.id === tunnelId);
        if (tunnel) {
          formula = `{URL} = '${tunnel.url}'`;
        }
      }

      const records = await this.base(this.historyTable)
        .select({
          filterByFormula: formula,
          sort: [{ field: 'Date_Test', direction: 'desc' }],
          maxRecords: limit
        })
        .all();

      return records.map(record => {
        // Convertir le statut Airtable en statut système
        let systemStatus = 'unknown';
        const airtableStatus = record.get('Statut');
        if (airtableStatus === 'OK') systemStatus = 'success';
        else if (airtableStatus === 'Warning') systemStatus = 'warning';
        else if (airtableStatus === 'Erreur') systemStatus = 'error';
        
        return {
        id: record.id,
        url: record.get('URL'),
        tunnelName: record.get('Nom_Tunnel'),
        testDate: record.get('Date_Test'),
        status: systemStatus,
        loadTimeDesktop: record.get('Temps_Chargement_Desktop'),
        loadTimeMobile: record.get('Temps_Chargement_Mobile'),
        formsOk: record.get('Formulaires_OK'),
        ctaOk: record.get('CTA_OK'),
        errors: record.get('Erreurs'),
        warnings: record.get('Warnings'),
        elementsDetected: record.get('Elements_Detectes'),
        trackingPixels: record.get('Tracking_Pixels'),
        brokenLinks: record.get('Liens_Casses'),
        missingImages: record.get('Images_Manquantes'),
        // NOUVELLES DONNÉES
        performanceScore: record.get('Performance_Score'),
        performanceMetrics: record.get('Performance_Metrics'),
        trackingPixelsDetails: record.get('Tracking_Pixels_Details'),
        brokenLinksDetails: record.get('Details_Liens_Casses'),
        missingImagesDetails: record.get('Details_Images_Manquantes')
      };
      });
    } catch (error) {
      logger.error('Error fetching test history:', error);
      throw error;
    }
  }

  async updateTunnel(tunnelId, updates) {
    try {
      const record = await this.base(this.urlTable).update(tunnelId, updates);
      return record;
    } catch (error) {
      logger.error('Error updating tunnel:', error);
      throw error;
    }
  }
}

module.exports = new AirtableService();