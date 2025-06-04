import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analysisAPI, handleApiError, handleApiSuccess } from '../utils/api';
import { FaHome, FaChartLine, FaDollarSign, FaMapMarkerAlt, FaClipboardList, FaHistory, FaUser, FaSignOutAlt } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [formData, setFormData] = useState({
    propertyAddress: '',
    acquisitionNotes: '',
    analysisType: 'standard'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);

  // Messages de progression pour informer l'utilisateur
  const loadingMessages = [
    "Initializing AI analysis...",
    "Gathering property data...", 
    "Analyzing comparable sales...",
    "Calculating ARV (After Repair Value)...",
    "Researching local market trends...",
    "Evaluating rental market...",
    "Assessing crime & safety data...",
    "Analyzing school ratings...",
    "Calculating investment metrics...",
    "Generating final recommendations..."
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.propertyAddress.trim()) {
      handleApiError({ response: { data: { error: 'Property address is required' } } });
      return;
    }

    setIsLoading(true);
    setLoadingMessage(loadingMessages[0]);
    setProgressPercent(0);
    setTimeRemaining(30);
    
    // Simuler la progression avec des messages informatifs
    let messageIndex = 0;
    let progress = 0;
    let timeLeft = 30;
    
    const progressInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      progress = Math.min(90, progress + (90 / loadingMessages.length)); // Max 90% pendant l'attente
      timeLeft = Math.max(0, timeLeft - 3);
      
      setLoadingMessage(loadingMessages[messageIndex]);
      setProgressPercent(progress);
      setTimeRemaining(timeLeft);
    }, 3000); // Changer le message toutes les 3 secondes
    
    try {
      const response = await analysisAPI.create(formData);
      
      if (response.data.success) {
        clearInterval(progressInterval);
        setProgressPercent(100);
        setLoadingMessage("Analysis complete!");
        setTimeRemaining(0);
        
        setTimeout(() => {
          setAnalysis(response.data.analysis);
          if (response.data.analysis.isAnonymous) {
            handleApiSuccess('Free US Real Estate Analysis completed! Sign up to save your analyses.');
          } else {
            handleApiSuccess('US Real Estate Analysis completed successfully!');
          }
          
          // Réinitialiser le formulaire
          setFormData({
            propertyAddress: '',
            acquisitionNotes: '',
            analysisType: 'standard'
          });
        }, 500);
      }
    } catch (error) {
      clearInterval(progressInterval);
      handleApiError(error, 'Error during real estate analysis');
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setLoadingMessage('');
        setProgressPercent(0);
        setTimeRemaining(30);
      }, 1000);
    }
  };

  // Composant pour afficher les résultats selon le Final Output Format
  const AnalysisResults = ({ analysis }) => {
    if (!analysis) return null;

    return (
      <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <FaChartLine />
            US Real Estate Analysis Results
          </h3>
          <p className="text-blue-100 mt-1">
            Property: {analysis.propertyAddress}
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <FaMapMarkerAlt className="text-blue-500" />
              {new Date(analysis.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
            <span>•</span>
            <span>{analysis.tokensUsed} tokens used</span>
            <span>•</span>
            <span>{analysis.processingTime}ms processing</span>
          </div>

          {analysis.acquisitionNotes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <FaClipboardList />
                Acquisition Agent's Notes
              </h4>
              <p className="text-amber-700">{analysis.acquisitionNotes}</p>
            </div>
          )}
          
          <div className="prose prose-lg max-w-none">
            <div className="markdown-content">
              <ReactMarkdown>{analysis.aiAnalysis}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-app py-4">
          <div className="flex items-center justify-between">
            {/* Logo et titre */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FaHome className="text-white text-xl" />
                </div>
                <span className="text-xl font-bold text-gray-900">US Real Estate Analyzer</span>
              </Link>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-6">
              {/* User menu simplifié */}
              {user ? (
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
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="btn btn-outline btn-md"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="btn btn-primary btn-md"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Welcome message */}
          {user && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 font-medium">
                🎉 Welcome back! Analyze properties with professional AI-powered insights.
              </p>
              <p className="text-blue-600 text-sm mt-1">
                Your analyses are automatically saved to your history.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container-app py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Analysis Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <FaHome className="text-blue-600" />
                Property Analysis
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="form-label">
                    Property Address *
                  </label>
                  <input
                    type="text"
                    name="propertyAddress"
                    value={formData.propertyAddress}
                    onChange={handleInputChange}
                    placeholder="e.g., 123 Main St, Austin, TX 78701"
                    className="form-input"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the complete property address in the United States
                  </p>
                </div>

                <div>
                  <label className="form-label">
                    Acquisition Agent's Notes
                  </label>
                  <textarea
                    name="acquisitionNotes"
                    value={formData.acquisitionNotes}
                    onChange={handleInputChange}
                    placeholder="Optional: Add any notes about property condition, repairs needed, seller motivation, etc."
                    rows={4}
                    className="form-textarea"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    These notes help determine repair level (Light/Medium/Heavy)
                  </p>
                </div>

                <div>
                  <label className="form-label">
                    Analysis Type
                  </label>
                  <select
                    name="analysisType"
                    value={formData.analysisType}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="standard">Standard Analysis</option>
                    <option value="detailed">Detailed Analysis</option>
                    <option value="investment">Investment Focus</option>
                  </select>
                </div>

                {/* Indication du temps d'attente */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-amber-400 flex-shrink-0 mt-0.5"></div>
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Analysis takes about 30 seconds</p>
                      <p className="text-amber-700 mt-1">
                        Our AI performs comprehensive market research including comparable sales, rental analysis, and investment calculations.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !formData.propertyAddress.trim()}
                  className={`w-full rounded-lg font-medium transition-all duration-300 ${
                    isLoading 
                      ? 'bg-blue-600 text-white py-6 px-6' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white py-4 px-4'
                  }`}
                >
                  {isLoading ? (
                    <div className="space-y-4">
                      {/* Message principal */}
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span className="font-medium text-white">{loadingMessage}</span>
                      </div>
                      
                      {/* Barre de progression */}
                      <div className="w-full bg-blue-400 rounded-full h-2.5 mx-2">
                        <div 
                          className="bg-white h-full rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                      
                      {/* Informations de progression */}
                      <div className="flex items-center justify-between text-sm text-blue-100 px-2">
                        <span>{Math.round(progressPercent)}% complete</span>
                        <span>~{timeRemaining}s remaining</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <FaChartLine />
                      <span>Analyze Property</span>
                    </div>
                  )}
                </button>
              </form>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Analysis Includes:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• ARV (After Repair Value) calculation</li>
                  <li>• Comparable sales analysis</li>
                  <li>• Local market trends & economy</li>
                  <li>• School ratings & crime data</li>
                  <li>• Rental market analysis</li>
                  <li>• Cash offer calculations (MAO)</li>
                  <li>• Investment rating (1-10)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {analysis ? (
              <AnalysisResults analysis={analysis} />
            ) : (
              <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaDollarSign className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ready to Analyze
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Enter a US property address to get started with your professional real estate analysis. 
                  Our AI will provide detailed insights following strict underwriting logic.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 