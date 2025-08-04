#!/bin/bash

echo "🚀 Démarrage du système de monitoring de tunnels..."
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Démarrer le backend
echo -e "${BLUE}📦 Démarrage du backend sur le port 3001...${NC}"
cd /var/www/Analyseur_de_site/tunnel-monitor-backend
npm run dev &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend démarré (PID: $BACKEND_PID)${NC}"
echo ""

# Attendre un peu avant de démarrer le frontend
sleep 3

# Démarrer le frontend
echo -e "${BLUE}🎨 Démarrage du frontend sur le port 3000...${NC}"
cd /var/www/Analyseur_de_site/tunnel-monitor-frontend
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend démarré (PID: $FRONTEND_PID)${NC}"
echo ""

echo "======================================"
echo -e "${GREEN}✨ Système démarré avec succès !${NC}"
echo "======================================"
echo ""
echo "📍 URLs d'accès :"
echo "   - Frontend (Dashboard) : http://localhost:3000"
echo "   - Backend (API)       : http://localhost:3001"
echo ""
echo "📊 Endpoints API disponibles :"
echo "   - GET  /api/tunnels"
echo "   - POST /api/tunnels/:id/test"
echo "   - GET  /api/dashboard/stats/:period"
echo "   - GET  /api/history"
echo ""
echo "⚠️  Pour arrêter les serveurs, utilisez : ./stop.sh"
echo ""

# Garder le script en cours d'exécution
wait