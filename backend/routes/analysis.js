const express = require('express');
const Joi = require('joi');
const OpenAI = require('openai');
const database = require('../database/database');
const { authenticateToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Configuration OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Clé API à configurer dans les variables d'environnement
});

// Schéma de validation pour l'analyse - adapté au prompt US
const analysisSchema = Joi.object({
  propertyAddress: Joi.string().min(10).max(500).required().messages({
    'string.min': 'The property address must contain at least 10 characters',
    'string.max': 'The property address cannot exceed 500 characters',
    'any.required': 'Property address is required'
  }),
  acquisitionNotes: Joi.string().max(2000).optional().allow('').messages({
    'string.max': 'Acquisition notes cannot exceed 2000 characters'
  }),
  analysisType: Joi.string().valid('standard', 'detailed', 'investment').default('standard')
});

// PROMPT CLIENT EXACT - Stocké côté serveur uniquement pour sécurité
const getUSRealEstatePrompt = (propertyAddress, acquisitionNotes) => {
  return `You are a professional real estate analyst with 20+ years of nationwide United States Real Estate Market experience. Please analyze the following property using the rules and structure below. Follow strict underwriting logic to estimate ARV, repair costs, and offers. Only use verified data. Do not consider the seller's asking price. Be concise, structured, and accurate.

Property Address: ${propertyAddress}

Phase 1: Core Property & Market Value Analysis
1. Confirm and list:
    * Beds, Baths, Sq Ft, Lot Size, Year Built, Property Type
    * Use Zillow, Redfin, Realtor.com, Homes.com, Propstream, Investorlift, and Investorbase. Cross-verify for accuracy.
2. Calculate ARV:
    * Use 3-5 sold comps from the last 6 months from the date the prompt was entered (12 months only if needed)
    * Match: ±500 sq ft, ±5 years built, ±0.25 acres, same property type, similar exterior (brick to brick, etc.)
    * ARV = Avg Price per Sq Ft * Subject Sq Ft (do not use outliers in your averages)
    * Favor comps that most resemble our subject property (exterior curb appeal etc.)
    * Use existing photos of the subject property (if available) to match layouts and floor plans with other comparable properties.
    * Do not use comps without verified sale dates
3. Estimate As-Is Value:
    * Use cosmetically outdated, distressed or investor-grade comps sold in last 12 months
    * Do not exceed ARV

Phase 2: Local Economy
    * Job growth (last 5 years)
    * Population trends
    * Unemployment rate
    * Infrastructure developments

Phase 3: Rental Market
    * Estimated Monthly Rent (As-is and Post-Repair)
    * Rent Demand Score (1-10)
    * Rent-to-Price Ratio & Cash Flow
    * Short-Term Rental Potential & Regulations

Phase 4: Market Trends & Buying Percentage
1. Determine base buying % from Pending Listings:
    * <15% Pending = 66%
    * 15-24% = 68%
    * 25-34% = 70%
    * 35-44% = 73%
    * >45% = 75%
2. Adjust up/down based on:
    * Poor schools (1-2 rating) = -5% to -10%
    * Strong buyer demand: +3% to +5%
3. Final cap = 75% unless pre-approved

Phase 5: Crime & Safety
    * Crime rating (1-10)
    * Safety Level: Low / Medium / High
    * Prevalent crime types
    * Comparison to city/county/state

Phase 6: School Ratings
    * Elementary, Middle, High School ratings (1-10)
    * Nearby Colleges are a strong indicator of Investment Buyers
    * Include graduation rates, test scores, dropout rates, and student-teacher ratios

Phase 7: Cash Buyer Activity
    * Investor strategy breakdown (Flip / Buy & Hold / Institutional)
    * Neighborhood investor demand
    * Cash sales price ranges based on real comps within the last 12 months of prompt entry
    * 6-month trend in investor closings

Phase 8: Investment Rating
    * Rate the investment opportunity as an expert real estate investing analyst 1-10 with justification

Phase 9: Acquisition Agent's Notes
    * ${acquisitionNotes || 'No acquisition notes provided'}
    * Based on notes, determine rehab level:
        * Light = $20/sq ft
        * Medium = $30/sq ft
        * Heavy = $40/sq ft
    * Include estimated dollar repair amount.
    * ${!acquisitionNotes ? 'Use light rehab level if no acquisition notes are present!' : ''}

Phase 10: As-Is MLS Sale Price
    * What would you list the home for on MLS in as-is condition to get an accepted offer at list price within 21 days?

Phase 11: Offer Calculations
1. Cash Offer (MAO):
    * MAO = Final Adjusted % * ARV - $30,000 - Repairs
    * Cap at 75% unless in high-demand market
    * MAO = (As-Is MLS Price * [variable]) - $30,000 - $5,000 cleaning fee
    * The Novation Offer must always be higher than the Cash MAO

Final Output Format:
* Confirmed Property Specs
* ARV with comps (address, condition, PPSF)
* As-Is Value with distressed comps
* Repair Level + Estimated $ Repairs
* Adjusted Buying % Explanation
* Rental Market Summary
* Crime & Safety Summary
* School Score Summary
* Cash Buyer Activity Summary
* Investment Rating (1-10)
* MLS As-Is Price Estimate
* Final Offers:
    * Cash MAO: $____
    * Novation MAO: $____ (using [variable]% based on [Pending %],[Pending Listings])`;
};

// Middleware optionnel pour l'authentification
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Si un token est fourni, on l'utilise
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.userId };
    } catch (error) {
      // Token invalide, mais on continue sans authentification
      req.user = null;
    }
  } else {
    // Pas de token, utilisateur anonyme
    req.user = null;
  }
  
  next();
};

// Route principale d'analyse - SANS authentification obligatoire
router.post('/', optionalAuth, async (req, res) => {
  try {
    // Validation des données
    const { error, value } = analysisSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Invalid data',
        details: error.details.map(detail => detail.message)
      });
    }

    const { propertyAddress, acquisitionNotes, analysisType } = value;
    const userId = req.user?.id || null;

    // Vérifier que l'utilisateur a une clé OpenAI configurée (côté admin)
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-test-key') || process.env.OPENAI_API_KEY.startsWith('sk-votre-cle')) {
      // Mode DEMO - Retourner une analyse factice pour les tests
      const demoAnalysis = `# US Real Estate Analysis - DEMO MODE

**Property Address:** ${propertyAddress}
${acquisitionNotes ? `**Acquisition Notes:** ${acquisitionNotes}` : ''}

## Phase 1: Core Property & Market Value Analysis
- **Property Specs:** 3 bed, 2 bath, 1,850 sq ft, built 2005
- **ARV (After Repair Value):** $485,000
- **Comparable Sales (Last 6 months):**
  - 127 Oak Street: $475,000 - $257/sq ft
  - 89 Pine Avenue: $492,000 - $266/sq ft  
  - 156 Elm Drive: $478,000 - $259/sq ft
- **As-Is Value:** $420,000

## Phase 2: Local Economy
- **Job Growth:** +3.2% over last 5 years
- **Population Trends:** Growing by 1.8% annually
- **Unemployment Rate:** 3.1% (below state average)
- **Infrastructure:** New tech corridor development planned

## Phase 3: Rental Market
- **Estimated Monthly Rent (As-is):** $2,100
- **Estimated Monthly Rent (Post-repair):** $2,400
- **Rent Demand Score:** 8/10
- **Cash Flow:** +$425/month (post-repair)
- **Short-Term Rental Potential:** High demand, city allows STR

## Phase 4: Market Trends & Buying Percentage
- **Pending Listings:** 28% (Base: 70%)
- **School Rating Adjustment:** +3% (strong schools)
- **Final Buying Percentage:** 73%

## Phase 5: Crime & Safety
- **Crime Rating:** 7/10 (Good)
- **Safety Level:** Medium-High
- **Prevalent Crimes:** Property crime below average
- **Comparison:** 15% below county average

## Phase 6: School Ratings
- **Elementary:** 9/10
- **Middle School:** 8/10  
- **High School:** 9/10
- **College Proximity:** University of Texas 8 miles

## Phase 7: Cash Buyer Activity
- **Investor Strategy:** 60% Buy & Hold, 30% Flip, 10% Institutional
- **Neighborhood Demand:** High
- **Cash Sales Range:** $380,000 - $450,000
- **6-Month Trend:** Increasing investor activity

## Phase 8: Investment Rating
**Rating: 8.5/10**
Strong investment opportunity with excellent schools, growing job market, and positive cash flow potential.

## Phase 9: Acquisition Agent's Notes
${acquisitionNotes || 'No specific notes provided - using light rehab assumption'}
**Rehab Level:** ${acquisitionNotes && acquisitionNotes.toLowerCase().includes('heavy') ? 'Heavy' : acquisitionNotes && acquisitionNotes.toLowerCase().includes('medium') ? 'Medium' : 'Light'}
**Repair Estimate:** $${acquisitionNotes && acquisitionNotes.toLowerCase().includes('heavy') ? '74,000' : acquisitionNotes && acquisitionNotes.toLowerCase().includes('medium') ? '55,500' : '37,000'} (${acquisitionNotes && acquisitionNotes.toLowerCase().includes('heavy') ? '$40' : acquisitionNotes && acquisitionNotes.toLowerCase().includes('medium') ? '$30' : '$20'}/sq ft)

## Phase 10: As-Is MLS Sale Price
**Recommended List Price:** $435,000 (for 21-day acceptance)

## Phase 11: Offer Calculations
**Cash MAO:** $316,550
- Formula: (73% × $485,000) - $30,000 - $37,000
**Novation MAO:** $342,000
- Based on 75% ARV with market adjustments

---
*This is a DEMO analysis. Connect a real OpenAI API key for live analysis.*`;

      // Sauvegarder l'analyse de démo
      const analysisResult = await database.run(
        `INSERT INTO analyses (user_id, property_address, acquisition_notes, ai_analysis, analysis_type, tokens_used) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          propertyAddress,
          acquisitionNotes || null,
          demoAnalysis,
          analysisType,
          0 // Pas de tokens utilisés en mode démo
        ]
      );

      console.log(`🎭 DEMO Analysis completed for ${userId ? `user ${userId}` : 'anonymous user'}: ${propertyAddress}`);

      return res.json({
        success: true,
        analysis: {
          id: analysisResult.id,
          propertyAddress,
          acquisitionNotes: acquisitionNotes || null,
          aiAnalysis: demoAnalysis,
          analysisType,
          createdAt: new Date().toISOString(),
          processingTime: 1500, // Simuler un temps de traitement
          tokensUsed: 0,
          isAnonymous: !userId,
          isDemoMode: true
        }
      });
    }

    // Logger le début de l'analyse
    await database.run(
      'INSERT INTO analytics (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'analysis_started', JSON.stringify({ propertyAddress, analysisType, isAnonymous: !userId })]
    );

    console.log(`🔍 US Real Estate Analysis started for ${userId ? `user ${userId}` : 'anonymous user'}: ${propertyAddress}`);

    // Préparer le prompt exact du client
    const prompt = getUSRealEstatePrompt(propertyAddress, acquisitionNotes);

    // Appel à l'API OpenAI
    const startTime = Date.now();
    let completion;
    let isDemoMode = false;
    
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o", // Modèle le plus récent et performant
        messages: [
          {
            role: "system",
            content: "You are an expert real estate analyst with 20+ years of experience in the United States real estate market. You provide accurate, detailed, and actionable analyses to help investors make informed decisions. Always follow the exact structure and phases provided in the prompt."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 3500, // Augmenté pour le prompt plus long
        temperature: 0.2, // Plus déterministe pour des analyses cohérentes
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });
    } catch (openaiError) {
      // Si erreur OpenAI (clé API invalide, etc.), basculer en mode démo
      if (openaiError.status === 401 || openaiError.code === 'invalid_api_key' || !process.env.OPENAI_API_KEY) {
        console.log(`🎭 OpenAI API unavailable (${openaiError.message}), switching to DEMO mode`);
        isDemoMode = true;
      } else {
        throw openaiError; // Re-lancer pour les autres erreurs
      }
    }

    let aiAnalysis;
    let tokensUsed = 0;
    const analysisTime = Date.now() - startTime;

    if (isDemoMode) {
      // Mode démo : générer une analyse factice
      aiAnalysis = `# Professional US Real Estate Analysis Report
**Property Address:** ${propertyAddress}
**Analysis Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
**Analysis Type:** Comprehensive Investment Analysis

---

## Phase 1: Core Property & Market Value Analysis
**Property Specifications:**
- **Square Footage:** 1,850 sq ft
- **Year Built:** 2015
- **Bedrooms:** 3
- **Bathrooms:** 2.5
- **Property Type:** Single Family Residence
- **Lot Size:** 0.25 acres

**ARV (After Repair Value):** $485,000
**Comparable Sales (Last 6 months):**
- 142 Oak Street: $472,000 - $255/sq ft
- 89 Pine Avenue: $492,000 - $266/sq ft  
- 156 Elm Drive: $478,000 - $259/sq ft
**As-Is Value:** $420,000

## Phase 2: Local Economy
- **Job Growth:** +3.2% over last 5 years
- **Population Trends:** Growing by 1.8% annually
- **Unemployment Rate:** 3.1% (below state average)
- **Infrastructure:** New tech corridor development planned

## Phase 3: Rental Market
- **Estimated Monthly Rent (As-is):** $2,100
- **Estimated Monthly Rent (Post-repair):** $2,400
- **Rent Demand Score:** 8/10
- **Cash Flow:** +$425/month (post-repair)
- **Short-Term Rental Potential:** High demand, city allows STR

## Phase 4: Market Trends & Buying Percentage
- **Pending Listings:** 28% (Base: 70%)
- **School Rating Adjustment:** +3% (strong schools)
- **Final Buying Percentage:** 73%

## Phase 5: Crime & Safety
- **Crime Rating:** 7/10 (Good)
- **Safety Level:** Medium-High
- **Prevalent Crimes:** Property crime below average
- **Comparison:** 15% below county average

## Phase 6: School Ratings
- **Elementary:** 9/10
- **Middle School:** 8/10  
- **High School:** 9/10
- **College Proximity:** University of Texas 8 miles

## Phase 7: Cash Buyer Activity
- **Investor Strategy:** 60% Buy & Hold, 30% Flip, 10% Institutional
- **Neighborhood Demand:** High
- **Cash Sales Range:** $380,000 - $450,000
- **6-Month Trend:** Increasing investor activity

## Phase 8: Investment Rating
**Rating: 8.5/10**
Strong investment opportunity with excellent schools, growing job market, and positive cash flow potential.

## Phase 9: Acquisition Agent's Notes
${acquisitionNotes || 'No specific notes provided - using light rehab assumption'}
**Rehab Level:** ${acquisitionNotes && acquisitionNotes.toLowerCase().includes('heavy') ? 'Heavy' : acquisitionNotes && acquisitionNotes.toLowerCase().includes('medium') ? 'Medium' : 'Light'}
**Repair Estimate:** $${acquisitionNotes && acquisitionNotes.toLowerCase().includes('heavy') ? '74,000' : acquisitionNotes && acquisitionNotes.toLowerCase().includes('medium') ? '55,500' : '37,000'} (${acquisitionNotes && acquisitionNotes.toLowerCase().includes('heavy') ? '$40' : acquisitionNotes && acquisitionNotes.toLowerCase().includes('medium') ? '$30' : '$20'}/sq ft)

## Phase 10: As-Is MLS Sale Price
**Recommended List Price:** $435,000 (for 21-day acceptance)

## Phase 11: Offer Calculations
**Cash MAO:** $316,550
- Formula: (73% × $485,000) - $30,000 - $37,000
**Novation MAO:** $342,000
- Based on 75% ARV with market adjustments

---
*This is a DEMO analysis. Connect a real OpenAI API key for live analysis.*`;
      tokensUsed = 0;
    } else {
      aiAnalysis = completion.choices[0]?.message?.content;
      tokensUsed = completion.usage?.total_tokens || 0;
      
      if (!aiAnalysis) {
        throw new Error('No response received from OpenAI API');
      }
    }

    // Sauvegarder l'analyse en base (même pour les utilisateurs anonymes)
    const analysisResult = await database.run(
      `INSERT INTO analyses (user_id, property_address, acquisition_notes, ai_analysis, analysis_type, tokens_used) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId, // null pour les utilisateurs anonymes
        propertyAddress,
        acquisitionNotes || null,
        aiAnalysis,
        analysisType,
        tokensUsed
      ]
    );

    // Logger la fin de l'analyse
    await database.run(
      'INSERT INTO analytics (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'analysis_completed', JSON.stringify({ 
        analysisId: analysisResult.id,
        tokensUsed,
        processingTime: analysisTime,
        isAnonymous: !userId
      })]
    );

    console.log(`✅ US Real Estate Analysis completed for ${userId ? `user ${userId}` : 'anonymous user'} (${analysisTime}ms, ${tokensUsed} tokens)`);

    // Réponse au client
    res.json({
      success: true,
      analysis: {
        id: analysisResult.id,
        propertyAddress,
        acquisitionNotes: acquisitionNotes || null,
        aiAnalysis,
        analysisType,
        createdAt: new Date().toISOString(),
        processingTime: analysisTime,
        tokensUsed,
        isAnonymous: !userId,
        isDemoMode
      }
    });

  } catch (error) {
    console.error('Error in US Real Estate analysis:', error);

    // Logger l'erreur
    try {
      await database.run(
        'INSERT INTO analytics (user_id, action, details) VALUES (?, ?, ?)',
        [req.user?.id || null, 'analysis_error', JSON.stringify({ 
          error: error.message,
          propertyAddress: req.body?.propertyAddress,
          isAnonymous: !req.user?.id
        })]
      );
    } catch (logError) {
      console.error('Error logging:', logError);
    }

    // Gestion des erreurs spécifiques OpenAI
    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit reached. Please try again in a few minutes.'
      });
    }

    if (error.status === 401) {
      return res.status(503).json({
        error: 'Invalid API configuration. Contact support.'
      });
    }

    if (error.status === 402) {
      return res.status(503).json({
        error: 'API quota exceeded. Contact support.'
      });
    }

    res.status(500).json({
      error: 'Error during property analysis',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Route pour récupérer une analyse spécifique
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const analysisId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(analysisId)) {
      return res.status(400).json({
        error: 'Invalid analysis ID'
      });
    }

    const analysis = await database.get(
      `SELECT id, property_address, acquisition_notes, ai_analysis, analysis_type, tokens_used, created_at
       FROM analyses 
       WHERE id = ? AND user_id = ?`,
      [analysisId, userId]
    );

    if (!analysis) {
      return res.status(404).json({
        error: 'Analysis not found'
      });
    }

    res.json({
      success: true,
      analysis: {
        id: analysis.id,
        propertyAddress: analysis.property_address,
        acquisitionNotes: analysis.acquisition_notes,
        aiAnalysis: analysis.ai_analysis,
        analysisType: analysis.analysis_type,
        tokensUsed: analysis.tokens_used,
        createdAt: analysis.created_at
      }
    });

  } catch (error) {
    console.error('Error retrieving analysis:', error);
    res.status(500).json({
      error: 'Error retrieving analysis'
    });
  }
});

module.exports = router; 