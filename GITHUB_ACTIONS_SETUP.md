# Configuration GitHub Actions pour Tunnel Monitor

## Architecture

L'architecture découplée utilise :
- **Render (gratuit)** : Backend API léger sans navigateur
- **GitHub Actions (gratuit)** : Exécution des tests Puppeteer

## Configuration étape par étape

### 1. Créer un Personal Access Token GitHub

1. Allez sur GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Cliquez sur "Generate new token"
3. Nom : `tunnel-monitor-actions`
4. Permissions requises :
   - `repo` (accès complet au repo)
   - `workflow` (pour déclencher les workflows)
5. Copiez le token généré

### 2. Configurer les variables sur Render

Dans les settings de votre service Render :
- Ajoutez la variable d'environnement `GITHUB_TOKEN` avec le token créé

### 3. Pousser le code

```bash
git add -A
git commit -m "feat: Implement GitHub Actions architecture for free Render plan"
git push origin main
```

### 4. Vérifier le déploiement

1. Le build sur Render devrait être rapide (~1-2 minutes)
2. Aucun téléchargement de Chrome
3. L'API sera légère et stable dans les 512MB

## Fonctionnement

1. **Utilisateur** lance un test depuis le frontend
2. **Backend Render** reçoit la requête et déclenche GitHub Actions
3. **GitHub Actions** exécute le test avec Puppeteer (Chrome pré-installé)
4. **GitHub Actions** renvoie les résultats via webhook
5. **Backend Render** transmet les résultats en temps réel via SSE
6. **Frontend** affiche les logs dans le modal

## Limites

- **GitHub Actions** : 2000 minutes gratuites/mois
- **Render** : Spin down après 15 min d'inactivité
- **Tests** : ~2 min par test = ~1000 tests/mois possibles

## Avantages

- ✅ Totalement gratuit
- ✅ Tests complets avec navigation réelle
- ✅ Pas de timeout de build
- ✅ Backend léger et stable
- ✅ Scalable (peut ajouter plus de runners)