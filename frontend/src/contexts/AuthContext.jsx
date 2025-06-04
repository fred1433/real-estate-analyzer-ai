import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI, handleApiError } from '../utils/api';
import toast from 'react-hot-toast';

// État initial
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Actions
const authActions = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case authActions.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case authActions.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    
    case authActions.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    
    case authActions.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    
    case authActions.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    
    case authActions.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    
    default:
      return state;
  }
};

// Création du contexte
const AuthContext = createContext();

// Hook personnalisé pour utiliser le contexte
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

// Provider du contexte
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Fonction pour vérifier le token au chargement
  const checkAuth = async () => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      dispatch({ type: authActions.SET_LOADING, payload: false });
      return;
    }

    try {
      // Vérifier la validité du token avec le serveur
      const response = await authAPI.verify();
      
      dispatch({
        type: authActions.LOGIN_SUCCESS,
        payload: {
          user: response.data.user,
        },
      });
    } catch (error) {
      // Token invalide ou expiré
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      dispatch({ type: authActions.LOGOUT });
    }
  };

  // Fonction de connexion
  const login = async (credentials) => {
    try {
      dispatch({ type: authActions.SET_LOADING, payload: true });
      dispatch({ type: authActions.CLEAR_ERROR });

      const response = await authAPI.login(credentials);
      const { user, token } = response.data;

      // Sauvegarder dans localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({
        type: authActions.LOGIN_SUCCESS,
        payload: { user },
      });

      toast.success('Connexion réussie !');
      return { success: true, user };

    } catch (error) {
      const message = handleApiError(error, 'Erreur de connexion');
      dispatch({
        type: authActions.SET_ERROR,
        payload: message,
      });
      return { success: false, error: message };
    }
  };

  // Fonction d'inscription
  const register = async (userData) => {
    try {
      dispatch({ type: authActions.SET_LOADING, payload: true });
      dispatch({ type: authActions.CLEAR_ERROR });

      const response = await authAPI.register(userData);
      const { user, token } = response.data;

      // Sauvegarder dans localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({
        type: authActions.LOGIN_SUCCESS,
        payload: { user },
      });

      toast.success('Compte créé avec succès !');
      return { success: true, user };

    } catch (error) {
      const message = handleApiError(error, 'Erreur lors de la création du compte');
      dispatch({
        type: authActions.SET_ERROR,
        payload: message,
      });
      return { success: false, error: message };
    }
  };

  // Fonction de déconnexion
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Même si l'appel API échoue, on déconnecte quand même l'utilisateur
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      // Nettoyer localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      dispatch({ type: authActions.LOGOUT });
      toast.success('Déconnexion réussie');
    }
  };

  // Fonction pour mettre à jour les informations utilisateur
  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    dispatch({
      type: authActions.UPDATE_USER,
      payload: userData,
    });
  };

  // Fonction pour effacer les erreurs
  const clearError = () => {
    dispatch({ type: authActions.CLEAR_ERROR });
  };

  // Vérifier l'authentification au montage du composant
  useEffect(() => {
    checkAuth();
  }, []);

  // Valeurs exposées par le contexte
  const value = {
    // État
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    login,
    register,
    logout,
    updateUser,
    clearError,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook pour vérifier si l'utilisateur est admin (basé sur l'ID pour le prototype)
export const useIsAdmin = () => {
  const { user } = useAuth();
  return user?.id === 1; // Dans une vraie app, utiliser un champ "role"
};

// Hook pour vérifier les permissions
export const usePermissions = () => {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  
  return {
    canViewAdmin: isAdmin,
    canManageUsers: isAdmin,
    canAccessAnalytics: isAdmin,
    canDeleteAnyAnalysis: isAdmin,
    isAdmin,
  };
};

export default AuthContext; 