// Base de données en mémoire pour Railway (évite les problèmes de compilation)
class InMemoryDatabase {
  constructor() {
    this.users = new Map();
    this.analyses = new Map();
    this.analytics = new Map();
    this.counters = { users: 0, analyses: 0, analytics: 0 };
    console.log('✅ Base de données en mémoire initialisée pour Railway');
  }

  run(sql, params = []) {
    // Simulation des opérations SQL courantes
    const sqlLower = sql.toLowerCase().trim();
    
    if (sqlLower.startsWith('insert into analyses')) {
      const id = ++this.counters.analyses;
      const analysis = {
        id,
        user_id: params[0] || null,
        property_address: params[1],
        acquisition_notes: params[2] || null,
        ai_analysis: params[3],
        analysis_type: params[4] || 'standard',
        tokens_used: params[5] || 0,
        created_at: new Date().toISOString()
      };
      this.analyses.set(id, analysis);
      return { id, changes: 1 };
    }
    
    if (sqlLower.startsWith('insert into analytics')) {
      const id = ++this.counters.analytics;
      const analytic = {
        id,
        user_id: params[0] || null,
        action: params[1],
        details: params[2] || null,
        created_at: new Date().toISOString()
      };
      this.analytics.set(id, analytic);
      return { id, changes: 1 };
    }
    
    if (sqlLower.startsWith('insert into users')) {
      const id = ++this.counters.users;
      const user = {
        id,
        email: params[0],
        password: params[1],
        first_name: params[2] || null,
        last_name: params[3] || null,
        created_at: new Date().toISOString()
      };
      this.users.set(id, user);
      return { id, changes: 1 };
    }
    
    return { changes: 0 };
  }

  get(sql, params = []) {
    const sqlLower = sql.toLowerCase().trim();
    
    if (sqlLower.includes('select') && sqlLower.includes('analyses')) {
      if (sqlLower.includes('where id = ?')) {
        return this.analyses.get(params[0]) || null;
      }
    }
    
    if (sqlLower.includes('select') && sqlLower.includes('users')) {
      if (sqlLower.includes('where email = ?')) {
        for (const user of this.users.values()) {
          if (user.email === params[0]) return user;
        }
      }
      if (sqlLower.includes('where id = ?')) {
        return this.users.get(params[0]) || null;
      }
    }
    
    return null;
  }

  all(sql, params = []) {
    const sqlLower = sql.toLowerCase().trim();
    
    if (sqlLower.includes('select') && sqlLower.includes('analyses')) {
      if (sqlLower.includes('where user_id = ?')) {
        return Array.from(this.analyses.values()).filter(a => a.user_id === params[0]);
      }
      return Array.from(this.analyses.values());
    }
    
    if (sqlLower.includes('select') && sqlLower.includes('users')) {
      return Array.from(this.users.values());
    }
    
    return [];
  }

  prepare(sql) {
    // Retourner un objet simulé pour la compatibilité
    return {
      run: (...params) => this.run(sql, params),
      get: (...params) => this.get(sql, params),
      all: (...params) => this.all(sql, params)
    };
  }

  transaction(fn) {
    // Simulation simple de transaction
    try {
      return fn();
    } catch (err) {
      throw err;
    }
  }

  close() {
    console.log('🔒 Base de données en mémoire fermée');
  }
}

const database = new InMemoryDatabase();

module.exports = database; 