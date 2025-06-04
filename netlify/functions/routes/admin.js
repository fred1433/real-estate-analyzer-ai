const express = require('express');
const database = require('../database/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware pour vérifier les droits admin (simplifié pour le prototype)
const requireAdmin = async (req, res, next) => {
  try {
    // Pour le prototype, on considère que l'utilisateur avec l'ID 1 est admin
    // Dans une vraie application, il faudrait un champ "role" dans la table users
    if (req.user.id !== 1) {
      return res.status(403).json({
        error: 'Accès refusé - Droits administrateur requis'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Erreur vérification droits admin'
    });
  }
};

// Statistiques générales de l'application
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Statistiques utilisateurs
    const userStats = await database.get(
      `SELECT 
        COUNT(*) as totalUsers,
        COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as newUsersLast30Days,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as activeUsers
       FROM users`
    );

    // Statistiques analyses
    const analysisStats = await database.get(
      `SELECT 
        COUNT(*) as totalAnalyses,
        COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as analysesLast30Days,
        SUM(tokens_used) as totalTokensUsed,
        AVG(tokens_used) as avgTokensPerAnalysis
       FROM analyses`
    );

    // Analyses par type
    const analysisByType = await database.all(
      `SELECT 
        analysis_type,
        COUNT(*) as count,
        SUM(tokens_used) as tokens
       FROM analyses 
       GROUP BY analysis_type`
    );

    // Top 10 utilisateurs les plus actifs
    const topUsers = await database.all(
      `SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        COUNT(a.id) as totalAnalyses,
        SUM(a.tokens_used) as totalTokens
       FROM users u
       LEFT JOIN analyses a ON u.id = a.user_id
       GROUP BY u.id
       ORDER BY totalAnalyses DESC
       LIMIT 10`
    );

    // Utilisation par jour (7 derniers jours)
    const dailyUsage = await database.all(
      `SELECT 
        date(created_at) as date,
        COUNT(*) as analyses
       FROM analyses
       WHERE created_at >= datetime('now', '-7 days')
       GROUP BY date(created_at)
       ORDER BY date DESC`
    );

    res.json({
      success: true,
      stats: {
        users: {
          total: userStats.totalUsers || 0,
          newLast30Days: userStats.newUsersLast30Days || 0,
          active: userStats.activeUsers || 0
        },
        analyses: {
          total: analysisStats.totalAnalyses || 0,
          last30Days: analysisStats.analysesLast30Days || 0,
          totalTokens: analysisStats.totalTokensUsed || 0,
          avgTokens: Math.round(analysisStats.avgTokensPerAnalysis || 0)
        },
        analysisByType: analysisByType.reduce((acc, item) => {
          acc[item.analysis_type] = {
            count: item.count,
            tokens: item.tokens || 0
          };
          return acc;
        }, {}),
        topUsers: topUsers.map(user => ({
          id: user.id,
          email: user.email,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Utilisateur',
          totalAnalyses: user.totalAnalyses || 0,
          totalTokens: user.totalTokens || 0
        })),
        dailyUsage
      }
    });

  } catch (error) {
    console.error('Erreur récupération statistiques admin:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// Liste des utilisateurs avec pagination
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search;

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = 'WHERE u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?';
      const searchTerm = `%${search}%`;
      params = [searchTerm, searchTerm, searchTerm];
    }

    // Récupérer les utilisateurs avec leurs statistiques
    const users = await database.all(
      `SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.created_at,
        u.is_active,
        u.subscription_status,
        COUNT(a.id) as totalAnalyses,
        SUM(a.tokens_used) as totalTokens,
        MAX(a.created_at) as lastAnalysis
       FROM users u
       LEFT JOIN analyses a ON u.id = a.user_id
       ${whereClause}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Compter le total pour la pagination
    const totalResult = await database.get(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );

    const total = totalResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at,
        isActive: user.is_active,
        subscriptionStatus: user.subscription_status,
        totalAnalyses: user.totalAnalyses || 0,
        totalTokens: user.totalTokens || 0,
        lastAnalysis: user.lastAnalysis
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Erreur récupération utilisateurs admin:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des utilisateurs'
    });
  }
});

// Désactiver/Activer un utilisateur
router.patch('/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { isActive } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'ID utilisateur invalide'
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        error: 'Le statut doit être un boolean'
      });
    }

    // Ne pas permettre de se désactiver soi-même
    if (userId === req.user.id) {
      return res.status(400).json({
        error: 'Vous ne pouvez pas modifier votre propre statut'
      });
    }

    // Mettre à jour le statut
    const result = await database.run(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [isActive ? 1 : 0, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Logger l'action
    await database.run(
      'INSERT INTO analytics (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'admin_user_status_changed', JSON.stringify({ 
        targetUserId: userId, 
        newStatus: isActive 
      })]
    );

    res.json({
      success: true,
      message: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès`
    });

  } catch (error) {
    console.error('Erreur modification statut utilisateur:', error);
    res.status(500).json({
      error: 'Erreur lors de la modification du statut'
    });
  }
});

// Récupérer toutes les analyses (avec pagination et filtres)
router.get('/analyses', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const type = req.query.type;
    const userId = req.query.userId;

    let whereClause = '';
    let params = [];

    if (type) {
      whereClause += 'WHERE a.analysis_type = ?';
      params.push(type);
    }

    if (userId) {
      whereClause += (whereClause ? ' AND' : 'WHERE') + ' a.user_id = ?';
      params.push(parseInt(userId));
    }

    // Récupérer les analyses avec les infos utilisateur
    const analyses = await database.all(
      `SELECT 
        a.id,
        a.property_address,
        a.analysis_type,
        a.tokens_used,
        a.created_at,
        u.email as user_email,
        u.first_name,
        u.last_name,
        SUBSTR(a.ai_analysis, 1, 200) as preview
       FROM analyses a
       JOIN users u ON a.user_id = u.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Compter le total pour la pagination
    const totalResult = await database.get(
      `SELECT COUNT(*) as total FROM analyses a ${whereClause}`,
      params
    );

    const total = totalResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      analyses: analyses.map(analysis => ({
        id: analysis.id,
        propertyAddress: analysis.property_address,
        analysisType: analysis.analysis_type,
        tokensUsed: analysis.tokens_used,
        createdAt: analysis.created_at,
        user: {
          email: analysis.user_email,
          name: `${analysis.first_name || ''} ${analysis.last_name || ''}`.trim() || 'Utilisateur'
        },
        preview: analysis.preview + (analysis.preview.length >= 200 ? '...' : '')
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Erreur récupération analyses admin:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des analyses'
    });
  }
});

// Logs d'activité système
router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const action = req.query.action;

    let whereClause = '';
    let params = [];

    if (action) {
      whereClause = 'WHERE an.action = ?';
      params.push(action);
    }

    const logs = await database.all(
      `SELECT 
        an.id,
        an.action,
        an.details,
        an.created_at,
        u.email as user_email,
        u.first_name,
        u.last_name
       FROM analytics an
       LEFT JOIN users u ON an.user_id = u.id
       ${whereClause}
       ORDER BY an.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Compter le total pour la pagination
    const totalResult = await database.get(
      `SELECT COUNT(*) as total FROM analytics an ${whereClause}`,
      params
    );

    const total = totalResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        details: log.details ? JSON.parse(log.details) : null,
        createdAt: log.created_at,
        user: log.user_email ? {
          email: log.user_email,
          name: `${log.first_name || ''} ${log.last_name || ''}`.trim() || 'Utilisateur'
        } : null
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Erreur récupération logs admin:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des logs'
    });
  }
});

module.exports = router; 