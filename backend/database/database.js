const Database = require('better-sqlite3');
const path = require('path');

// Créer/connecter à la base de données
const dbPath = process.env.NODE_ENV === 'production' 
  ? ':memory:' // Base en mémoire pour Railway 
  : path.join(__dirname, 'database.sqlite');

const db = new Database(dbPath);

console.log(`✅ Base de données SQLite connectée (better-sqlite3)`);

// Configuration pour de meilleures performances
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

// Créer les tables
const createTables = () => {
  // Table des utilisateurs
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      role TEXT DEFAULT 'user',
      subscription_type TEXT DEFAULT 'free',
      credits_remaining INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table des analyses
  db.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      property_address TEXT NOT NULL,
      acquisition_notes TEXT,
      ai_analysis TEXT NOT NULL,
      analysis_type TEXT DEFAULT 'standard',
      tokens_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Table d'analytics
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log('✅ Tables de base de données créées/vérifiées');
};

// Initialiser les tables
createTables();

// Fonctions utilitaires avec better-sqlite3
const database = {
  // Préparer une requête pour de meilleures performances
  prepare: (sql) => db.prepare(sql),
  
  // Exécuter une requête simple
  run: (sql, params = []) => {
    const stmt = db.prepare(sql);
    return stmt.run(params);
  },
  
  // Récupérer une ligne
  get: (sql, params = []) => {
    const stmt = db.prepare(sql);
    return stmt.get(params);
  },
  
  // Récupérer toutes les lignes
  all: (sql, params = []) => {
    const stmt = db.prepare(sql);
    return stmt.all(params);
  },
  
  // Transaction
  transaction: (fn) => {
    return db.transaction(fn);
  },
  
  // Fermer la base
  close: () => db.close()
};

module.exports = database; 