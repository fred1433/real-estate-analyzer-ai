# 🏠 Real Estate Analyzer AI

Analyseur immobilier IA professionnel pour le marché américain avec analyse en 11 phases détaillées.

## 🚀 **Déploiement sur Render (Gratuit)**

### **Prérequis**
- Compte GitHub
- Compte Render (gratuit)
- Clé API OpenAI

### **Étapes de Déploiement**

1. **Push sur GitHub**
```bash
git init
git add .
git commit -m "Initial commit - Real Estate Analyzer AI"
git branch -M main
git remote add origin https://github.com/VOTRE-USERNAME/real-estate-analyzer-ai.git
git push -u origin main
```

2. **Déployer sur Render**
- Connecte-toi sur [render.com](https://render.com)
- Clique sur "New +" → "Blueprint"
- Connecte ton repo GitHub
- Le fichier `render.yaml` configurera automatiquement :
  - Backend sur `https://real-estate-analyzer-backend.onrender.com`
  - Frontend sur `https://real-estate-analyzer-frontend.onrender.com`

3. **Configurer les Variables d'Environnement**
Dans le dashboard Render (service backend) :
- `OPENAI_API_KEY` : Ta clé API OpenAI
- `JWT_SECRET` : Généré automatiquement
- `NODE_ENV` : production

## 🛠 **Développement Local**

### **Installation**
```bash
# Backend
cd backend && npm install

# Frontend  
cd frontend && npm install
```

### **Lancement**
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

- Backend : http://localhost:3001
- Frontend : http://localhost:5174 (ou 5175)

## 📋 **Fonctionnalités**

### **Analyse Immobilière Professionnelle**
- ✅ **11 Phases d'analyse** selon les standards US
- ✅ **Calculs ARV** avec comparables automatiques
- ✅ **Estimations de réparations** (Light/Medium/Heavy)
- ✅ **Offres Cash MAO et Novation** 
- ✅ **Analyse économique locale**
- ✅ **Scoring écoles et criminalité**
- ✅ **Potentiel investissement 1-10**

### **Accès Sans Inscription**
- ✅ **Mode anonyme** pour tests rapides
- ✅ **Mode démo** si API OpenAI indisponible
- ✅ **Authentification optionnelle**

### **Technologies**
- **Frontend** : React 18 + Vite + Tailwind CSS
- **Backend** : Node.js + Express + SQLite natif
- **IA** : OpenAI GPT-4o avec prompt expert 20+ ans
- **Déploiement** : Render (gratuit)

## 🔧 **Architecture**

```
├── backend/
│   ├── server.js           # Serveur Express
│   ├── routes/analysis.js  # API d'analyse avec prompt client
│   ├── database/           # SQLite natif Node.js
│   └── middleware/         # Auth JWT
├── frontend/
│   ├── src/components/     # Composants React
│   ├── src/pages/         # Pages de l'app
│   └── src/services/      # API calls
└── render.yaml            # Configuration déploiement
```

## 🎯 **Prompt Expert Intégré**

L'application utilise le prompt exact d'un expert immobilier avec 20+ ans d'expérience :
- **Phase 1** : Analyse propriété & ARV avec comps 6 mois
- **Phase 2** : Économie locale (emploi, population, infrastructure)  
- **Phase 3** : Marché locatif (loyers, cash flow, Airbnb)
- **Phase 4** : Tendances & % d'achat (pending listings)
- **Phase 5** : Criminalité & sécurité
- **Phase 6** : Notation écoles (primaire/collège/lycée)
- **Phase 7** : Activité acheteurs cash
- **Phase 8** : Rating investissement 1-10
- **Phase 9** : Notes acquisition agent
- **Phase 10** : Prix MLS as-is (acceptation 21 jours)
- **Phase 11** : Calculs offres (Cash MAO, Novation MAO)

## ⚡ **Performance**
- **Temps d'analyse** : 15-30 secondes
- **Tokens OpenAI** : ~2000 par analyse
- **Base de données** : SQLite natif (Node.js 22.5+)
- **Interface** : React moderne et responsive

## 🔐 **Sécurité**
- JWT pour authentification
- Validation Joi sur toutes les entrées
- CORS configuré pour production
- Variables d'environnement sécurisées
- Mode anonyme sécurisé

---

**🚀 Application prête pour déploiement professionnel !** 