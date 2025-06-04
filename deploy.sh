#!/bin/bash

echo "🚀 Déploiement Real Estate Analyzer AI"
echo "======================================"

# Vérifications préalables
if ! command -v git &> /dev/null; then
    echo "❌ Git n'est pas installé"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

# Build de l'application
echo "📦 Build du frontend..."
cd frontend && npm run build
cd ..

echo "✅ Build terminé"

# Git setup (si pas déjà fait)
if [ ! -d ".git" ]; then
    echo "🔧 Initialisation Git..."
    git init
    git branch -M main
fi

# Commit et push
echo "📤 Commit et push..."
git add .
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"

if git remote | grep -q origin; then
    git push origin main
else
    echo "⚠️  Ajoutez votre remote GitHub:"
    echo "git remote add origin https://github.com/VOTRE-USERNAME/real-estate-analyzer-ai.git"
    echo "git push -u origin main"
fi

echo ""
echo "🎉 Prêt pour le déploiement !"
echo ""
echo "Prochaines étapes :"
echo "1. Connecte-toi sur render.com"
echo "2. Clique 'New +' → 'Blueprint'"
echo "3. Sélectionne ton repo GitHub"
echo "4. Configure OPENAI_API_KEY dans les variables d'environnement"
echo ""
echo "Ton app sera disponible sur :"
echo "- Frontend: https://real-estate-analyzer-frontend.onrender.com"
echo "- Backend: https://real-estate-analyzer-backend.onrender.com" 