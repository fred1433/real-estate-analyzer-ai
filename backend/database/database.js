const { DatabaseSync } = require('node:sqlite');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database.sqlite');
    
    try {
      this.db = new DatabaseSync(dbPath);
      console.log('✅ Base de données SQLite connectée (module natif Node.js)');
      
      // Activer les foreign keys et optimisations
      this.db.exec('PRAGMA foreign_keys = ON');
      this.db.exec('PRAGMA journal_mode = WAL');
      this.db.exec('PRAGMA synchronous = NORMAL');
      this.db.exec('PRAGMA cache_size = 1000');
      
      this.createTables();
    } catch (err) {
      console.error('❌ Erreur connexion base de données:', err.message);
      process.exit(1);
    }
  }

  createTables() {
    try {
      // Table des utilisateurs
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          first_name TEXT,
          last_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1,
          stripe_customer_id TEXT,
          subscription_status TEXT DEFAULT 'free'
        )
      `);

      // Table des analyses - adaptée pour le prompt US
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS analyses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NULL,
          property_address TEXT NOT NULL,
          acquisition_notes TEXT,
          ai_analysis TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          analysis_type TEXT DEFAULT 'standard',
          tokens_used INTEGER DEFAULT 0,
          
          -- Champs structurés pour le parsing (optionnel pour MVP+)
          arv_value REAL,
          repair_estimate REAL,
          investment_rating INTEGER,
          cash_mao_offer REAL,
          novation_mao_offer REAL,
          
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        )
      `);

      // Migration pour permettre user_id NULL (pour analyses anonymes)
      try {
        // Vérifier si la contrainte existe
        const tableInfo = this.db.prepare("PRAGMA table_info(analyses)").all();
        const userIdColumn = tableInfo.find(col => col.name === 'user_id');
        
        if (userIdColumn && userIdColumn.notnull === 1) {
          console.log('🔄 Migration: Permettre user_id NULL pour analyses anonymes...');
          
          // Créer une nouvelle table temporaire
          this.db.exec(`
            CREATE TABLE analyses_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NULL,
              property_address TEXT NOT NULL,
              acquisition_notes TEXT,
              ai_analysis TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              analysis_type TEXT DEFAULT 'standard',
              tokens_used INTEGER DEFAULT 0,
              arv_value REAL,
              repair_estimate REAL,
              investment_rating INTEGER,
              cash_mao_offer REAL,
              novation_mao_offer REAL,
              FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
            )
          `);
          
          // Copier les données existantes
          this.db.exec(`
            INSERT INTO analyses_new SELECT * FROM analyses
          `);
          
          // Remplacer l'ancienne table
          this.db.exec(`DROP TABLE analyses`);
          this.db.exec(`ALTER TABLE analyses_new RENAME TO analyses`);
          
          console.log('✅ Migration terminée: user_id peut maintenant être NULL');
        }
      } catch (migrationErr) {
        console.log('ℹ️  Migration non nécessaire ou déjà appliquée');
      }

      // Table des sessions utilisateur (optionnel, pour tracking)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          session_token TEXT UNIQUE NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Table pour les métriques admin
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        )
      `);

      console.log('✅ Tables de base de données créées/vérifiées');
    } catch (err) {
      console.error('❌ Erreur création tables:', err.message);
    }
  }

  // Méthodes utilitaires - garde compatibilité avec l'API précédente
  run(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...params);
      return Promise.resolve({ 
        id: result.lastInsertRowid, 
        changes: result.changes 
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  get(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params);
      return Promise.resolve(result);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  all(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.all(...params);
      return Promise.resolve(result);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // Méthodes synchrones optimisées (pour de meilleures performances)
  runSync(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  getSync(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params);
  }

  allSync(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  // Exécuter du SQL direct (pour les migrations)
  exec(sql) {
    return this.db.exec(sql);
  }

  close() {
    try {
      this.db.close();
      console.log('🔒 Connexion base de données fermée');
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }
}

// Singleton
const database = new DatabaseManager();

module.exports = database; 