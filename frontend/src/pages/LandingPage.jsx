import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaChartLine, FaDollarSign, FaMapMarkerAlt, FaShieldAlt, FaUserTie, FaHistory, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const LandingPage = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container-app">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FaHome className="text-white text-xl" />
                </div>
                <span className="text-xl font-bold text-gray-900">US Real Estate Analyzer</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-6">
              {user ? (
                // Navigation pour utilisateurs connectés - simplifiée
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">
                    Welcome, {user.firstName || user.email.split('@')[0]}
                  </span>
                  <button
                    onClick={logout}
                    className="btn btn-outline btn-md flex items-center gap-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                  >
                    <FaSignOutAlt />
                    Logout
                  </button>
                </div>
              ) : (
                // Navigation pour utilisateurs non connectés
                <div className="flex items-center gap-4">
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="btn btn-primary btn-md"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container-app">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Professional Real Estate Analysis
              <span className="text-blue-600"> Powered by AI</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Get detailed property analysis with ARV calculations, comparable sales, market trends, 
              and cash offer recommendations. Built for real estate professionals and investors.
            </p>
            <div className="flex items-center justify-center gap-4">
              {user ? (
                // CTAs pour utilisateurs connectés
                <>
                  <Link
                    to="/dashboard"
                    className="btn btn-primary btn-xl"
                  >
                    Start New Analysis
                  </Link>
                  <Link
                    to="/history"
                    className="btn btn-outline btn-xl"
                  >
                    View History
                  </Link>
                </>
              ) : (
                // CTAs pour utilisateurs non connectés
                <>
                  <Link
                    to="/free-analysis"
                    className="btn btn-primary btn-xl"
                  >
                    Try Free Analysis
                  </Link>
                  <Link
                    to="/register"
                    className="btn btn-outline btn-xl"
                  >
                    Create Account
                  </Link>
                </>
              )}
            </div>
            <p className="text-gray-500 mt-4">
              {user ? (
                `Welcome back! Your analyses are automatically saved to your account.`
              ) : (
                `No registration required for demo • 20+ years of US real estate market experience built into our AI`
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container-app">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Comprehensive Property Analysis
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our AI follows strict underwriting logic to provide accurate, 
              professional real estate analysis based on verified market data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-soft border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FaChartLine className="text-blue-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                ARV Calculation
              </h3>
              <p className="text-gray-600">
                Accurate After Repair Value using 3-5 comparable sales from the last 6 months, 
                matching square footage, year built, and property type.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-soft border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <FaDollarSign className="text-green-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Cash Offer Calculations
              </h3>
              <p className="text-gray-600">
                Get precise MAO (Maximum Allowable Offer) calculations for both cash 
                and novation offers based on market conditions.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-soft border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <FaMapMarkerAlt className="text-purple-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Market Analysis
              </h3>
              <p className="text-gray-600">
                Local economy trends, job growth, population data, school ratings, 
                crime statistics, and rental market analysis.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-soft border border-gray-100">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <FaShieldAlt className="text-red-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Risk Assessment
              </h3>
              <p className="text-gray-600">
                Investment rating (1-10), crime & safety analysis, and detailed 
                risk factors for informed decision making.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-soft border border-gray-100">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <FaUserTie className="text-orange-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Professional Reports
              </h3>
              <p className="text-gray-600">
                Structured analysis following industry standards with property specs, 
                repair estimates, and actionable recommendations.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-soft border border-gray-100">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <FaHome className="text-indigo-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Rental Analysis
              </h3>
              <p className="text-gray-600">
                Monthly rent estimates, rent demand scoring, cash flow projections, 
                and short-term rental potential assessment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="container-app">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Get professional real estate analysis in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Enter Property Address
              </h3>
              <p className="text-gray-600">
                Input any US property address and optional acquisition notes about condition or repairs.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                AI Analysis
              </h3>
              <p className="text-gray-600">
                Our AI analyzes market data, comparables, trends, and generates detailed insights.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Get Professional Report
              </h3>
              <p className="text-gray-600">
                Receive structured analysis with ARV, repair costs, offers, and investment rating.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="container-app">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Analyze Your Next Property?
            </h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              Join real estate professionals who use our AI-powered analysis for smarter investment decisions.
            </p>
            <Link
              to="/free-analysis"
              className="btn btn-secondary btn-xl"
            >
              Start Free Analysis Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="container-app">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FaHome className="text-white text-sm" />
              </div>
              <span className="text-lg font-bold text-white">US Real Estate Analyzer</span>
            </div>
            <p className="text-gray-400">
              Professional real estate analysis powered by AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 