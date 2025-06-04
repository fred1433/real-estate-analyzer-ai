#!/bin/bash

echo "🚀 DÉPLOIEMENT NETLIFY - PUBLIC SANS LOGIN"
echo "=========================================="

# Build du frontend
echo "📦 Build du frontend..."
cd frontend && npm run build
cd ..

echo "✅ Build terminé"

# Copie du backend pour Netlify Functions
echo "📋 Préparation Netlify Functions..."
mkdir -p netlify/functions
cp -r backend/* netlify/functions/

# Configuration pour Netlify
echo "🔧 Configuration Netlify..."
cat > netlify.toml << EOF
[build]
  command = "cd frontend && npm run build"
  publish = "frontend/dist"

[functions]
  directory = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/server/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
EOF

# Déploiement Netlify
echo "🚀 Déploiement sur Netlify..."
netlify deploy --prod --dir=frontend/dist

echo ""
echo "🎉 DÉPLOIEMENT TERMINÉ !"
echo ""
echo "✅ Ton app est maintenant PUBLIC (pas de login requis)"
echo "🌐 URL disponible ci-dessus"
echo ""
echo "⚠️  Pour configurer OpenAI :"
echo "1. Va sur app.netlify.com"
echo "2. Site → Site settings → Environment variables"
echo "3. Ajoute: OPENAI_API_KEY = ta-clé-openai"
echo ""
echo "🎯 Parfait pour présenter à un client !" 