# Configuration du Backend sur Render

## Variables d'environnement requises

Le backend sur Render nécessite les variables d'environnement suivantes pour fonctionner correctement :

### 1. Variables essentielles

```bash
# Frontend URL pour CORS (TRÈS IMPORTANT!)
FRONTEND_URL=https://tunnel-monitor.vercel.app

# Configuration Airtable
AIRTABLE_API_KEY=pat5s4q20X9EDIyrQ.a749b77356e8f6d5d799051b708d0c55923dbc4ce9d06e8cc93ea01a3e4a447f
AIRTABLE_BASE_ID=appwwQ9gntk3uxRlD
AIRTABLE_TABLE_NAME=URL A SURVEILLER
AIRTABLE_HISTORY_TABLE=Historique_Tests_Tunnels

# Token GitHub pour déclencher les Actions
GITHUB_TOKEN=ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 2. Variables optionnelles

```bash
# Configuration du monitoring
ENABLE_MONITORING=true
MONITORING_INTERVAL=0 8 * * *
TEST_TIMEOUT=30000

# Niveau de log
LOG_LEVEL=info
```

## Comment configurer sur Render

1. Allez sur le [Dashboard Render](https://dashboard.render.com)
2. Sélectionnez le service `tunnel-monitor-api`
3. Allez dans l'onglet "Environment"
4. Ajoutez chaque variable d'environnement listée ci-dessus
5. Cliquez sur "Save Changes"
6. Le service redémarrera automatiquement

## Vérification

Après configuration, vérifiez que le backend répond :

```bash
curl https://tunnel-monitor-api.onrender.com/health
```

Réponse attendue :
```json
{
  "status": "healthy",
  "timestamp": "2025-02-05T...",
  "environment": "production"
}
```

## Problèmes courants

### Le frontend reste bloqué sur "Chargement..."
- Vérifiez que `FRONTEND_URL` est bien configuré sur Render
- Vérifiez que le backend est en ligne avec la commande curl ci-dessus

### Erreurs CORS
- Assurez-vous que `FRONTEND_URL=https://tunnel-monitor.vercel.app` (sans slash à la fin)
- Redémarrez le service après avoir modifié cette variable

### Erreurs Airtable
- Vérifiez que toutes les variables Airtable sont correctement configurées
- Vérifiez que le token Airtable est valide et a les bonnes permissions

### GitHub Actions ne se déclenchent pas
- Vérifiez que `GITHUB_TOKEN` est configuré avec un token valide
- Le token doit avoir les permissions `repo` et `workflow`