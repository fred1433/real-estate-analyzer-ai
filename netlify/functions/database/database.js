// Version simplifiée pour Netlify Functions - sans SQLite
// Utilise un stockage en mémoire temporaire pour les analyses anonymes

class DatabaseManager {
  constructor() {
    this.analyses = new Map(); // Stockage temporaire en mémoire
    this.analytics = [];
    this.nextId = 1;
    console.log('✅ Base de données en mémoire initialisée (Netlify Functions)');
  }

  // Méthodes utilitaires - compatibilité avec l'API précédente
  async run(sql, params = []) {
    try {
      // Simuler l'insertion d'une analyse
      if (sql.includes('INSERT INTO analyses')) {
        const id = this.nextId++;
        const analysis = {
          id,
          user_id: params[0],
          property_address: params[1],
          acquisition_notes: params[2],
          ai_analysis: params[3],
          analysis_type: params[4],
          tokens_used: params[5],
          created_at: new Date().toISOString()
        };
        this.analyses.set(id, analysis);
        return { id, changes: 1 };
      }
      
      // Simuler l'insertion d'analytics
      if (sql.includes('INSERT INTO analytics')) {
        this.analytics.push({
          user_id: params[0],
          action: params[1],
          details: params[2],
          created_at: new Date().toISOString()
        });
        return { id: this.analytics.length, changes: 1 };
      }
      
      return { id: null, changes: 0 };
    } catch (err) {
      throw err;
    }
  }

  async get(sql, params = []) {
    try {
      // Pour les requêtes utilisateur (non supportées en mode anonyme)
      if (sql.includes('SELECT') && sql.includes('users')) {
        return null;
      }
      
      // Pour récupérer une analyse spécifique
      if (sql.includes('SELECT') && sql.includes('analyses')) {
        const id = params[0];
        return this.analyses.get(id) || null;
      }
      
      return null;
    } catch (err) {
      throw err;
    }
  }

  async all(sql, params = []) {
    try {
      // Retourner toutes les analyses (limité en mémoire)
      if (sql.includes('SELECT') && sql.includes('analyses')) {
        return Array.from(this.analyses.values());
      }
      
      return [];
    } catch (err) {
      throw err;
    }
  }

  // Méthodes synchrones (pour compatibilité)
  runSync(sql, params = []) {
    return this.run(sql, params);
  }

  getSync(sql, params = []) {
    return this.get(sql, params);
  }

  allSync(sql, params = []) {
    return this.all(sql, params);
  }

  // Pas d'exécution SQL directe en mode mémoire
  exec(sql) {
    console.log('ℹ️  SQL exec ignoré en mode mémoire:', sql.substring(0, 50) + '...');
    return true;
  }

  close() {
    console.log('✅ Nettoyage base de données mémoire');
    this.analyses.clear();
    this.analytics = [];
  }
}

// Créer une instance unique (singleton)
const database = new DatabaseManager();

module.exports = database; 