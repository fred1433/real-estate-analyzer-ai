const express = require('express');
const Stripe = require('stripe');
const database = require('../database/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configuration Stripe (sera activée plus tard)
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Plans disponibles (configuration pour le futur)
const SUBSCRIPTION_PLANS = {
  starter: {
    id: 'starter',
    name: 'Plan Starter',
    price: 9.99,
    currency: 'eur',
    interval: 'month',
    analysesPerMonth: 10,
    features: ['Analyses standard', 'Historique limité', 'Support email']
  },
  pro: {
    id: 'pro',
    name: 'Plan Pro',
    price: 29.99,
    currency: 'eur',
    interval: 'month',
    analysesPerMonth: 100,
    features: ['Analyses détaillées', 'Historique complet', 'Analyses d\'investissement', 'Support prioritaire']
  },
  enterprise: {
    id: 'enterprise',
    name: 'Plan Entreprise',
    price: 99.99,
    currency: 'eur',
    interval: 'month',
    analysesPerMonth: -1, // Illimité
    features: ['Analyses illimitées', 'API access', 'Support dédié', 'Rapports personnalisés']
  }
};

// Route pour récupérer les plans disponibles
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    plans: Object.values(SUBSCRIPTION_PLANS),
    stripeConfigured: !!stripe
  });
});

// Route pour créer une session de paiement Stripe (préparation future)
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        error: 'Service de paiement non configuré',
        message: 'Les paiements ne sont pas encore activés dans cette version du prototype'
      });
    }

    const { planId } = req.body;
    const userId = req.user.id;

    // Vérifier que le plan existe
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      return res.status(400).json({
        error: 'Plan invalide'
      });
    }

    // Créer ou récupérer le client Stripe
    let stripeCustomerId = null;
    const user = await database.get(
      'SELECT stripe_customer_id FROM users WHERE id = ?',
      [userId]
    );

    if (user.stripe_customer_id) {
      stripeCustomerId = user.stripe_customer_id;
    } else {
      // Créer un nouveau client Stripe
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          userId: userId.toString()
        }
      });

      stripeCustomerId = customer.id;

      // Sauvegarder l'ID client Stripe
      await database.run(
        'UPDATE users SET stripe_customer_id = ? WHERE id = ?',
        [stripeCustomerId, userId]
      );
    }

    // Créer la session de checkout
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            product_data: {
              name: plan.name,
              description: `${plan.analysesPerMonth === -1 ? 'Illimité' : plan.analysesPerMonth} analyses par mois`
            },
            unit_amount: Math.round(plan.price * 100), // Convertir en centimes
            recurring: {
              interval: plan.interval
            }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?payment=cancelled`,
      metadata: {
        userId: userId.toString(),
        planId: planId
      }
    });

    // Logger la tentative de paiement
    await database.run(
      'INSERT INTO analytics (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'payment_session_created', JSON.stringify({ 
        planId,
        sessionId: session.id,
        amount: plan.price
      })]
    );

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Erreur création session Stripe:', error);
    
    // Logger l'erreur
    try {
      await database.run(
        'INSERT INTO analytics (user_id, action, details) VALUES (?, ?, ?)',
        [req.user?.id || null, 'payment_error', JSON.stringify({ 
          error: error.message,
          planId: req.body?.planId
        })]
      );
    } catch (logError) {
      console.error('Erreur logging:', logError);
    }

    res.status(500).json({
      error: 'Erreur lors de la création de la session de paiement'
    });
  }
});

// Webhook Stripe pour traiter les événements de paiement (préparation future)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).send('Webhook non configuré');
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Erreur signature webhook:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Traiter les différents types d'événements
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleSuccessfulPayment(session);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        await handleSuccessfulSubscription(invoice);
        break;

      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        await handleCancelledSubscription(subscription);
        break;

      default:
        console.log(`Type d'événement non géré: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Erreur webhook Stripe:', error);
    res.status(500).json({ error: 'Erreur traitement webhook' });
  }
});

// Fonctions utilitaires pour traiter les événements Stripe
async function handleSuccessfulPayment(session) {
  try {
    const userId = parseInt(session.metadata.userId);
    const planId = session.metadata.planId;
    const plan = SUBSCRIPTION_PLANS[planId];

    if (!plan) {
      console.error('Plan introuvable:', planId);
      return;
    }

    // Mettre à jour le statut de l'abonnement utilisateur
    await database.run(
      'UPDATE users SET subscription_status = ? WHERE id = ?',
      [planId, userId]
    );

    // Logger le paiement réussi
    await database.run(
      'INSERT INTO analytics (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'payment_successful', JSON.stringify({ 
        planId,
        sessionId: session.id,
        amount: plan.price
      })]
    );

    console.log(`✅ Paiement réussi pour l'utilisateur ${userId}, plan ${planId}`);

  } catch (error) {
    console.error('Erreur traitement paiement réussi:', error);
  }
}

async function handleSuccessfulSubscription(invoice) {
  try {
    const customerId = invoice.customer;
    
    // Trouver l'utilisateur par son ID client Stripe
    const user = await database.get(
      'SELECT id FROM users WHERE stripe_customer_id = ?',
      [customerId]
    );

    if (user) {
      // Logger le renouvellement d'abonnement
      await database.run(
        'INSERT INTO analytics (user_id, action, details) VALUES (?, ?, ?)',
        [user.id, 'subscription_renewed', JSON.stringify({ 
          invoiceId: invoice.id,
          amount: invoice.amount_paid / 100
        })]
      );

      console.log(`✅ Abonnement renouvelé pour l'utilisateur ${user.id}`);
    }

  } catch (error) {
    console.error('Erreur traitement renouvellement:', error);
  }
}

async function handleCancelledSubscription(subscription) {
  try {
    const customerId = subscription.customer;
    
    // Trouver l'utilisateur par son ID client Stripe
    const user = await database.get(
      'SELECT id FROM users WHERE stripe_customer_id = ?',
      [customerId]
    );

    if (user) {
      // Remettre l'utilisateur en plan gratuit
      await database.run(
        'UPDATE users SET subscription_status = ? WHERE id = ?',
        ['free', user.id]
      );

      // Logger l'annulation
      await database.run(
        'INSERT INTO analytics (user_id, action, details) VALUES (?, ?, ?)',
        [user.id, 'subscription_cancelled', JSON.stringify({ 
          subscriptionId: subscription.id
        })]
      );

      console.log(`❌ Abonnement annulé pour l'utilisateur ${user.id}`);
    }

  } catch (error) {
    console.error('Erreur traitement annulation:', error);
  }
}

// Route pour récupérer le statut de l'abonnement utilisateur
router.get('/subscription-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await database.get(
      'SELECT subscription_status, stripe_customer_id FROM users WHERE id = ?',
      [userId]
    );

    const currentPlan = SUBSCRIPTION_PLANS[user.subscription_status] || {
      id: 'free',
      name: 'Plan Gratuit',
      price: 0,
      analysesPerMonth: 3,
      features: ['3 analyses par mois', 'Support communautaire']
    };

    // Compter les analyses du mois en cours
    const currentMonthAnalyses = await database.get(
      `SELECT COUNT(*) as count 
       FROM analyses 
       WHERE user_id = ? 
       AND created_at >= date('now', 'start of month')`,
      [userId]
    );

    res.json({
      success: true,
      subscription: {
        status: user.subscription_status || 'free',
        plan: currentPlan,
        analysesUsedThisMonth: currentMonthAnalyses.count || 0,
        analysesRemaining: currentPlan.analysesPerMonth === -1 
          ? -1 
          : Math.max(0, currentPlan.analysesPerMonth - (currentMonthAnalyses.count || 0)),
        hasStripeCustomer: !!user.stripe_customer_id
      }
    });

  } catch (error) {
    console.error('Erreur récupération statut abonnement:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du statut d\'abonnement'
    });
  }
});

module.exports = router; 