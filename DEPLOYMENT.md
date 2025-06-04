# 🚀 Guide de Déploiement - Render.com

## 🎯 Étapes de Déploiement

### 1. Préparation du Repository

1. **Commit tout le code** sur GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Déploiement sur Render.com

1. **Aller sur [render.com](https://render.com)**
2. **Créer un compte** (gratuit)
3. **Cliquer sur "New +"** → **"Web Service"**
4. **Connecter votre repository GitHub**
5. **Configurer le service :**

**Configuration Render :**
- **Name :** `real-estate-analyzer-ai`
- **Environment :** `Node`
- **Build Command :** `npm run install:all && npm run build && npm run deploy:prepare`
- **Start Command :** `npm start`
- **Instance Type :** `Free`

### 3. Variables d'Environnement

**Ajouter ces variables dans Render Dashboard :**

```
NODE_ENV=production
PORT=10000
OPENAI_API_KEY=votre_clé_openai_ici
JWT_SECRET=votre_secret_jwt_ici
```

### 4. URL de l'Application

Une fois déployé, votre app sera disponible sur :
```
https://real-estate-analyzer-ai.onrender.com
```

## 🔧 Configuration OpenAI

**Important :** Pour que l'analyse fonctionne, vous devez :

1. **Obtenir une clé OpenAI API :**
   - Aller sur [platform.openai.com](https://platform.openai.com)
   - Créer un compte et obtenir une API key
   - Ajouter du crédit (minimum $5)

2. **Ajouter la clé dans Render :**
   - Dashboard Render → Environment Variables
   - `OPENAI_API_KEY=sk-votre-cle-ici`

## 🎉 Test Final

1. **Vérifier le déploiement :**
   - Aller sur votre URL Render
   - Tester l'analyse gratuite : `/free-analysis`
   - Créer un compte et tester l'analyse connectée

2. **URL à partager avec le client :**
```
https://real-estate-analyzer-ai.onrender.com/free-analysis
```

## 🛠️ Dépannage

### Si l'app ne démarre pas :
- Vérifier les logs dans Render Dashboard
- S'assurer que toutes les variables d'env sont définies

### Si l'analyse ne fonctionne pas :
- Vérifier que `OPENAI_API_KEY` est correctement définie
- Vérifier que la clé OpenAI a du crédit

### Si les fichiers statiques ne se chargent pas :
- S'assurer que `npm run deploy:prepare` s'est bien exécuté
- Vérifier que le dossier `backend/public` contient les fichiers frontend

## 💰 Coûts

- **Render.com :** Gratuit pour les prototypes
- **OpenAI API :** ~$0.002 par analyse (très peu cher)

Pour un prototype avec 100 tests → ~$0.20 de coût OpenAI

## 🔄 Mises à Jour

Pour déployer une nouvelle version :
```bash
git add .
git commit -m "Update: description des changements"
git push origin main
```

Render redéploiera automatiquement ! 