const express = require('express');
const database = require('../database/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Route pour récupérer l'historique des analyses de l'utilisateur
router.get('/analyses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Récupérer les analyses avec pagination
    const analyses = await database.all(
      `SELECT 
        id, 
        property_address, 
        acquisition_notes,
        analysis_type,
        tokens_used,
        created_at,
        SUBSTR(ai_analysis, 1, 200) as preview
       FROM analyses 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    // Compter le total pour la pagination
    const totalResult = await database.get(
      'SELECT COUNT(*) as total FROM analyses WHERE user_id = ?',
      [userId]
    );

    const total = totalResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      analyses: analyses.map(analysis => ({
        id: analysis.id,
        propertyAddress: analysis.property_address,
        acquisitionNotes: analysis.acquisition_notes,
        analysisType: analysis.analysis_type,
        tokensUsed: analysis.tokens_used,
        createdAt: analysis.created_at,
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
    console.error('Error retrieving history:', error);
    res.status(500).json({
      error: 'Error retrieving analysis history'
    });
  }
});

// Route pour récupérer les statistiques utilisateur
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Statistiques des analyses
    const analysisStats = await database.get(
      `SELECT 
        COUNT(*) as totalAnalyses,
        SUM(tokens_used) as totalTokens,
        MAX(created_at) as lastAnalysis,
        MIN(created_at) as firstAnalysis
       FROM analyses 
       WHERE user_id = ?`,
      [userId]
    );

    // Analyses par type
    const analysisByType = await database.all(
      `SELECT 
        analysis_type,
        COUNT(*) as count
       FROM analyses 
       WHERE user_id = ?
       GROUP BY analysis_type`,
      [userId]
    );

    // Analyses des 30 derniers jours
    const last30Days = await database.get(
      `SELECT COUNT(*) as count
       FROM analyses 
       WHERE user_id = ? 
       AND created_at >= datetime('now', '-30 days')`,
      [userId]
    );

    res.json({
      success: true,
      stats: {
        totalAnalyses: analysisStats.totalAnalyses || 0,
        totalTokens: analysisStats.totalTokens || 0,
        lastAnalysis: analysisStats.lastAnalysis,
        firstAnalysis: analysisStats.firstAnalysis,
        last30Days: last30Days.count || 0,
        analysisByType: analysisByType.reduce((acc, item) => {
          acc[item.analysis_type] = item.count;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Error retrieving stats:', error);
    res.status(500).json({
      error: 'Error retrieving user statistics'
    });
  }
});

// Route pour récupérer le profil utilisateur
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await database.get(
      `SELECT 
        id, 
        email, 
        first_name, 
        last_name, 
        created_at, 
        subscription_status,
        is_active
       FROM users 
       WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at,
        subscriptionStatus: user.subscription_status,
        isActive: user.is_active
      }
    });

  } catch (error) {
    console.error('Error retrieving profile:', error);
    res.status(500).json({
      error: 'Error retrieving user profile'
    });
  }
});

// Route pour supprimer une analyse
router.delete('/analyses/:id', authenticateToken, async (req, res) => {
  try {
    const analysisId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(analysisId)) {
      return res.status(400).json({
        error: 'Invalid analysis ID'
      });
    }

    // Vérifier que l'analyse appartient à l'utilisateur
    const analysis = await database.get(
      'SELECT id FROM analyses WHERE id = ? AND user_id = ?',
      [analysisId, userId]
    );

    if (!analysis) {
      return res.status(404).json({
        error: 'Analysis not found'
      });
    }

    // Supprimer l'analyse
    await database.run(
      'DELETE FROM analyses WHERE id = ? AND user_id = ?',
      [analysisId, userId]
    );

    // Logger la suppression
    await database.run(
      'INSERT INTO analytics (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'analysis_deleted', JSON.stringify({ analysisId })]
    );

    res.json({
      success: true,
      message: 'Analysis deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({
      error: 'Error deleting analysis'
    });
  }
});

// Route pour rechercher dans l'historique
router.get('/analyses/search', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!query || query.trim().length < 3) {
      return res.status(400).json({
        error: 'Search query must contain at least 3 characters'
      });
    }

    const searchTerm = `%${query.trim()}%`;

    // Rechercher dans les adresses et notes d'acquisition
    const analyses = await database.all(
      `SELECT 
        id, 
        property_address, 
        acquisition_notes,
        analysis_type,
        tokens_used,
        created_at,
        SUBSTR(ai_analysis, 1, 200) as preview
       FROM analyses 
       WHERE user_id = ? 
       AND (property_address LIKE ? OR acquisition_notes LIKE ?)
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, searchTerm, searchTerm, limit, offset]
    );

    // Compter le total pour la pagination
    const totalResult = await database.get(
      `SELECT COUNT(*) as total 
       FROM analyses 
       WHERE user_id = ? 
       AND (property_address LIKE ? OR acquisition_notes LIKE ?)`,
      [userId, searchTerm, searchTerm]
    );

    const total = totalResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      analyses: analyses.map(analysis => ({
        id: analysis.id,
        propertyAddress: analysis.property_address,
        acquisitionNotes: analysis.acquisition_notes,
        analysisType: analysis.analysis_type,
        tokensUsed: analysis.tokens_used,
        createdAt: analysis.created_at,
        preview: analysis.preview + (analysis.preview.length >= 200 ? '...' : '')
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      searchQuery: query
    });

  } catch (error) {
    console.error('Error searching analyses:', error);
    res.status(500).json({
      error: 'Error searching analyses'
    });
  }
});

module.exports = router; 