import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { analysisAPI, handleApiError, handleApiSuccess } from '../utils/api';
import { FaHome, FaChartLine, FaDollarSign, FaMapMarkerAlt, FaClipboardList, FaUserPlus } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';

const FreeAnalysisPage = () => {
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

  // Exemples de données de test
  const testExamples = [
    {
      name: "Light Rehab Example",
      propertyAddress: "1247 Oak Street, Austin, TX 78701",
      acquisitionNotes: "Cosmetic updates needed, paint, carpet, minor kitchen refresh. Property is in good structural condition."
    },
    {
      name: "Medium Rehab Example", 
      propertyAddress: "892 Pine Avenue, Denver, CO 80205",
      acquisitionNotes: "Needs new flooring throughout, kitchen renovation, bathroom updates, HVAC repairs and some plumbing work."
    },
    {
      name: "Heavy Rehab Example",
      propertyAddress: "456 Elm Drive, Miami, FL 33101", 
      acquisitionNotes: "Major structural work needed, full kitchen and bathroom gutting, new roof, electrical update, foundation repairs required."
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const loadExample = (example) => {
    setFormData({
      propertyAddress: example.propertyAddress,
      acquisitionNotes: example.acquisitionNotes,
      analysisType: 'standard'
    });
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
          handleApiSuccess('Free US Real Estate Analysis completed! Sign up to save your analyses.');
          
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

  // Composant pour afficher les résultats
  const AnalysisResults = ({ analysis }) => {
    if (!analysis) return null;

    return (
      <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <FaChartLine />
            Free US Real Estate Analysis Results
          </h3>
          <p className="text-blue-100 mt-1">
            Property: {analysis.propertyAddress}
          </p>
          {analysis.isDemoMode && (
            <div className="bg-yellow-500 text-yellow-900 px-3 py-1 rounded-full text-xs font-medium mt-2 inline-block">
              DEMO MODE - Connect real OpenAI API for live analysis
            </div>
          )}
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

          {/* Call to action pour s'inscrire */}
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <h4 className="text-lg font-semibold text-blue-900 mb-2">
              Want to save your analyses?
            </h4>
            <p className="text-blue-700 mb-4">
              Create an account to save your property analyses, access your history, and get unlimited reports.
            </p>
            <div className="flex gap-3">
              <Link
                to="/register"
                className="btn btn-primary btn-md flex items-center gap-2"
              >
                <FaUserPlus />
                Create Free Account
              </Link>
              <Link
                to="/login"
                className="btn btn-outline btn-md"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-app py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FaHome className="text-white text-xl" />
                </div>
                <span className="text-xl font-bold text-gray-900">US Real Estate Analyzer</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm font-medium">
                Free Analysis
              </div>
              <Link
                to="/register"
                className="btn btn-primary btn-md"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-12">
        <div className="container-app text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            Try Our AI Real Estate Analysis
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Get a professional property analysis powered by GPT-4. No registration required for this demo.
          </p>
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
                Free Property Analysis
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section des exemples */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <FaHome className="text-blue-600" />
                    Try with Example Data
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {testExamples.map((example, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => loadExample(example)}
                        className="text-left p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                      >
                        <div className="font-medium text-blue-900">{example.name}</div>
                        <div className="text-blue-600 text-xs mt-1">{example.propertyAddress}</div>
                      </button>
                    ))}
                  </div>
                </div>

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
                    Enter any US property address
                  </p>
                </div>

                <div>
                  <label className="form-label">
                    Acquisition Notes (Optional)
                  </label>
                  <textarea
                    name="acquisitionNotes"
                    value={formData.acquisitionNotes}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Optional: Property condition, needed repairs, etc."
                    className="form-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Helps determine repair level (Light/Medium/Heavy rehab)
                  </p>
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
                  disabled={isLoading}
                  className={`btn btn-primary w-full flex flex-col items-center justify-center transition-all duration-300 ${
                    isLoading ? 'py-6 px-6 gap-4' : 'py-3 px-4 gap-2'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="flex items-center gap-2 w-full justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span className="font-medium">{loadingMessage}</span>
                      </div>
                      
                      {/* Barre de progression */}
                      <div className="w-full bg-blue-400 rounded-full h-2.5 mx-2">
                        <div 
                          className="bg-white h-full transition-all duration-300 ease-out"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex items-center justify-between w-full text-sm text-blue-100 px-2">
                        <span>{Math.round(progressPercent)}% complete</span>
                        <span>{timeRemaining > 0 ? `~${timeRemaining}s remaining` : 'Finalizing...'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <FaChartLine className="text-xl" />
                      <span className="font-semibold">Get Free Analysis</span>
                    </>
                  )}
                </button>
              </form>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">This free analysis includes:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• ARV calculation with comparable sales</li>
                  <li>• Local market & economic trends</li>
                  <li>• School ratings & crime statistics</li>
                  <li>• Rental market analysis</li>
                  <li>• Cash offer recommendations</li>
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
                  Enter a US property address to get started with your free professional real estate analysis.
                  Our AI follows strict underwriting logic based on 20+ years of market experience.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreeAnalysisPage; 