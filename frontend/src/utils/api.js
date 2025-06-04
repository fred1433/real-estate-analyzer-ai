import axios from 'axios';
import toast from 'react-hot-toast';

// Configuration de base d'Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000, // 30 secondes pour les analyses IA
  headers: {
    'Content-Type': 'application/json',
  },
});

// URL de base pour l'API (utilisée pour fetch si nécessaire)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Intercepteur pour ajouter le token JWT automatiquement
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et erreurs
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    // Gestion des erreurs d'authentification
    if (response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expirée. Veuillez vous reconnecter.');
      return Promise.reject(error);
    }
    
    // Gestion des erreurs de serveur
    if (response?.status >= 500) {
      toast.error('Erreur serveur. Veuillez réessayer plus tard.');
    }
    
    // Gestion des erreurs de réseau
    if (!response) {
      toast.error('Erreur de connexion. Vérifiez votre connexion internet.');
    }
    
    return Promise.reject(error);
  }
);

// Fonctions d'authentification
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verify: () => api.get('/auth/verify'),
  logout: () => api.post('/auth/logout'),
};

// Fonctions d'analyse
export const analysisAPI = {
  create: async (data) => {
    try {
      // Utiliser axios de manière cohérente
      const response = await api.post('/analysis', data);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  get: (id) => api.get(`/analysis/${id}`), // Nécessite authentification
};

// Fonctions utilisateur
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  getAnalyses: (params = {}) => api.get('/user/analyses', { params }),
  getStats: () => api.get('/user/stats'),
  deleteAnalysis: (id) => api.delete(`/user/analyses/${id}`),
  searchAnalyses: (params = {}) => api.get('/user/analyses/search', { params }),
};

// Fonctions de paiement
export const paymentAPI = {
  getPlans: () => api.get('/payment/plans'),
  createCheckoutSession: (data) => api.post('/payment/create-checkout-session', data),
  getSubscriptionStatus: () => api.get('/payment/subscription-status'),
};

// Fonctions admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  updateUserStatus: (id, data) => api.patch(`/admin/users/${id}/status`, data),
  getAnalyses: (params = {}) => api.get('/admin/analyses', { params }),
  getLogs: (params = {}) => api.get('/admin/logs', { params }),
};

// Utilitaires
export const handleApiError = (error, defaultMessage = 'Une erreur est survenue') => {
  const message = error?.response?.data?.error || defaultMessage;
  toast.error(message);
  return message;
};

export const handleApiSuccess = (message) => {
  toast.success(message);
};

// Helper pour les uploads de fichiers (future feature)
export const createFormData = (data) => {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    if (data[key] !== null && data[key] !== undefined) {
      formData.append(key, data[key]);
    }
  });
  return formData;
};

// Helper pour télécharger des fichiers
export const downloadFile = async (url, filename) => {
  try {
    const response = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    handleApiError(error, 'Erreur lors du téléchargement');
  }
};

// Helper pour formater les prix
export const formatPrice = (price, currency = 'EUR') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
  }).format(price);
};

// Helper pour formater les dates
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  return new Date(date).toLocaleDateString('fr-FR', defaultOptions);
};

// Helper pour formater les dates relatives
export const formatRelativeDate = (date) => {
  const now = new Date();
  const target = new Date(date);
  const diffInSeconds = Math.floor((now - target) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Il y a quelques secondes';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  }
  
  return formatDate(date);
};

// Export par défaut de l'instance API
export default api; 