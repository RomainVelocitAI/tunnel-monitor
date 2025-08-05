#!/bin/bash

echo "🔍 Vérification de la santé du backend Tunnel Monitor..."
echo ""

# URL du backend
BACKEND_URL="https://tunnel-monitor-api.onrender.com"

# Test du endpoint /health
echo "📡 Test du endpoint /health..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" $BACKEND_URL/health 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Backend en ligne!"
    echo "Response: $BODY"
else
    echo "❌ Backend hors ligne (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
fi

echo ""

# Test du endpoint API stats
echo "📊 Test du endpoint /api/dashboard/stats/7..."
STATS_RESPONSE=$(curl -s -w "\n%{http_code}" $BACKEND_URL/api/dashboard/stats/7 2>/dev/null)
HTTP_CODE=$(echo "$STATS_RESPONSE" | tail -n1)
BODY=$(echo "$STATS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API fonctionnelle!"
    echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo "❌ API non disponible (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
fi

echo ""
echo "💡 Si le backend est hors ligne:"
echo "   1. Vérifiez les logs sur Render Dashboard"
echo "   2. Assurez-vous que les variables d'environnement sont configurées"
echo "   3. Vérifiez que FRONTEND_URL=https://tunnel-monitor.vercel.app"
echo "   4. Redéployez si nécessaire"