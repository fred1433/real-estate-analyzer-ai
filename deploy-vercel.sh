#!/bin/bash

echo "🚀 DÉPLOIEMENT AUTOMATIQUE VERCEL"
echo "=================================="

# Build du frontend
echo "📦 Build du frontend..."
cd frontend && npm run build
cd ..

echo "✅ Build terminé"

# Déploiement Vercel
echo "🚀 Déploiement sur Vercel..."
vercel --prod --yes

echo ""
echo "🎉 DÉPLOIEMENT TERMINÉ !"
echo ""
echo "Ton app sera disponible sur l'URL affichée ci-dessus"
echo ""
echo "⚠️  N'oublie pas d'ajouter ta clé OpenAI dans Vercel Dashboard :"
echo "1. Va sur vercel.com"
echo "2. Projet → Settings → Environment Variables"
echo "3. Ajoute: OPENAI_API_KEY = ta-clé-openai"
echo ""
echo "🎯 Test avec une adresse US : '1247 Oak Street, Austin, TX 78701'" 