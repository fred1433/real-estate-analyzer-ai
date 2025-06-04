const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const database = require('../database/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Schémas de validation Joi
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Adresse email invalide',
    'any.required': 'L\'email est requis'
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
    'any.required': 'Le mot de passe est requis'
  }),
  firstName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Le prénom doit contenir au moins 2 caractères',
    'string.max': 'Le prénom ne peut pas dépasser 50 caractères'
  }),
  lastName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Le nom doit contenir au moins 2 caractères',
    'string.max': 'Le nom ne peut pas dépasser 50 caractères'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Adresse email invalide',
    'any.required': 'L\'email est requis'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Le mot de passe est requis'
  })
});

// Route d'inscription
router.post('/register', async (req, res) => {
  try {
    // Validation des données
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.details.map(detail => detail.message)
      });
    }

    const { email, password, firstName, lastName } = value;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await database.get(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existingUser) {
      return res.status(409).json({
        error: 'Un compte avec cette adresse email existe déjà'
      });
    }

    // Hasher le mot de passe
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur
    const result = await database.run(
      `INSERT INTO users (email, password_hash, first_name, last_name) 
       VALUES (?, ?, ?, ?)`,
      [email.toLowerCase(), passwordHash, firstName || null, lastName || null]
    );

    // Générer le token JWT
    const token = generateToken(result.id);

    // Logger l'inscription
    await database.run(
      'INSERT INTO analytics (user_id, action, details) VALUES (?, ?, ?)',
      [result.id, 'user_registered', JSON.stringify({ email, firstName, lastName })]
    );

    res.status(201).json({
      message: 'Compte créé avec succès',
      user: {
        id: result.id,
        email: email.toLowerCase(),
        firstName: firstName || null,
        lastName: lastName || null
      },
      token
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du compte'
    });
  }
});

// Route de connexion
router.post('/login', async (req, res) => {
  try {
    // Validation des données
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.details.map(detail => detail.message)
      });
    }

    const { email, password } = value;

    // Chercher l'utilisateur
    const user = await database.get(
      'SELECT id, email, password_hash, first_name, last_name, is_active FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({
        error: 'Email ou mot de passe incorrect'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Compte désactivé. Contactez le support.'
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Générer le token JWT
    const token = generateToken(user.id);

    // Logger la connexion
    await database.run(
      'INSERT INTO analytics (user_id, action, details) VALUES (?, ?, ?)',
      [user.id, 'user_login', JSON.stringify({ email: user.email })]
    );

    res.json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      token
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      error: 'Erreur lors de la connexion'
    });
  }
});

// Route pour vérifier le token (middleware protégé)
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    message: 'Token valide',
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.first_name,
      lastName: req.user.last_name
    }
  });
});

// Route de déconnexion (côté client principalement)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Logger la déconnexion
    await database.run(
      'INSERT INTO analytics (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'user_logout', JSON.stringify({ email: req.user.email })]
    );

    res.json({
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    res.json({
      message: 'Déconnexion réussie'
    });
  }
});

module.exports = router; 