# Tunnel Monitor System

Système de surveillance automatisé des tunnels de vente avec tests Playwright et intégration Airtable.

## Architecture

- **Backend** (Node.js/Express) - Déployé sur Render
- **Frontend** (Next.js 14) - Déployé sur Vercel
- **Base de données** - Airtable
- **Tests automatisés** - Playwright
- **Alertes** - Webhooks n8n

## Structure du projet

```
tunnel-monitor-backend/     # API Backend pour Render
├── src/
│   ├── index.js           # Point d'entrée du serveur
│   ├── routes/            # Routes API
│   ├── services/          # Services métier
│   └── utils/             # Utilitaires
└── render.yaml            # Configuration Render

tunnel-monitor-frontend/    # Dashboard pour Vercel
├── src/
│   ├── app/              # App Router Next.js
│   ├── components/       # Composants React
│   └── lib/              # API client
└── vercel.json           # Configuration Vercel
```

## Fonctionnalités

### Backend API
- ✅ Tests automatisés des tunnels avec Playwright
- ✅ Intégration Airtable pour stockage des données
- ✅ Monitoring planifié (cron jobs)
- ✅ Webhooks pour alertes n8n
- ✅ API REST sécurisée
- ✅ Export des données (CSV/JSON)

### Frontend Dashboard
- ✅ Dashboard temps réel
- ✅ Visualisation des performances
- ✅ Historique des tests
- ✅ Système d'alertes
- ✅ Export des rapports
- ✅ Interface responsive

## Installation locale

### Backend
```bash
cd tunnel-monitor-backend
npm install
npx playwright install chromium
cp .env.example .env
# Configurer les variables d'environnement
npm run dev
```

### Frontend
```bash
cd tunnel-monitor-frontend
npm install
cp .env.example .env.local
# Configurer NEXT_PUBLIC_API_URL
npm run dev
```

## Déploiement

### Backend sur Render
1. Créer un nouveau Web Service sur Render
2. Connecter le repo GitHub
3. Utiliser le fichier `render.yaml` pour la configuration
4. Configurer les variables d'environnement dans Render Dashboard

### Frontend sur Vercel
1. Importer le projet sur Vercel
2. Définir le Root Directory : `tunnel-monitor-frontend`
3. Configurer la variable `NEXT_PUBLIC_API_URL` avec l'URL du backend Render
4. Déployer

## Variables d'environnement

### Backend (Render)
```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-app.vercel.app
AIRTABLE_API_KEY=pat_xxxxx
AIRTABLE_BASE_ID=appxxxxx
AIRTABLE_TABLE_NAME=URL_A_SURVEILLER
AIRTABLE_HISTORY_TABLE=Historique_Tests_Tunnels
N8N_WEBHOOK_URL=https://n8n.example.com/webhook/xxx
ENABLE_MONITORING=true
MONITORING_INTERVAL=0 8 * * *
```

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_URL=https://your-api.onrender.com/api
```

## API Endpoints

- `GET /api/tunnels` - Liste des tunnels
- `GET /api/tunnels/:id/history` - Historique d'un tunnel
- `POST /api/tunnels/:id/test` - Lancer un test manuel
- `GET /api/dashboard/stats/:period` - Statistiques
- `GET /api/dashboard/current-status` - Statut actuel
- `GET /api/export/csv` - Export CSV
- `GET /api/export/json` - Export JSON

## Tests Playwright

Le système effectue automatiquement :
- Tests de chargement des pages
- Vérification des formulaires et CTAs
- Tests de responsive mobile
- Détection des erreurs console
- Mesure des performances
- Capture d'écrans desktop/mobile

## Support

Pour toute question ou problème, créer une issue sur GitHub.