import React, { createContext, useReducer, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: action.payload
      };
    case 'REGISTER':
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: action.payload
      };
    case 'USER_LOADED':
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: action.payload
      };
    case 'AUTH_ERROR':
    case 'LOGIN_FAIL':
    case 'REGISTER_FAIL':
    case 'LOGOUT':
      localStorage.removeItem('token');
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        loading: false,
        user: null,
        error: action.payload
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const initialState = {
    token: localStorage.getItem('token'),
    isAuthenticated: null,
    loading: true,
    user: null,
    error: null
  };

  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set axios default headers for auth token
  useEffect(() => {
    if (localStorage.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [state.token]);

  // Load user
  const loadUser = async () => {
    try {
      if (localStorage.token) {
        // For development, simulate API response
        // In production, use: const res = await axios.get('/api/auth/me');
        // Development-only mock data
        setTimeout(() => {
          dispatch({
            type: 'USER_LOADED',
            payload: {
              _id: '123456',
              name: 'Jordan Millhausen',
              email: 'jordan@example.com',
              role: 'admin'
            }
          });
        }, 500);
      } else {
        dispatch({ type: 'AUTH_ERROR' });
      }
    } catch (err) {
      dispatch({ type: 'AUTH_ERROR' });
    }
  };

  // Register user
  const register = async formData => {
    try {
      // For development, simulate API response
      // In production, use: const res = await axios.post('/api/auth/register', formData);
      // Development-only mock response
      setTimeout(() => {
        localStorage.setItem('token', 'mock-jwt-token');
        dispatch({
          type: 'REGISTER',
          payload: {
            _id: '123456',
            name: formData.name,
            email: formData.email,
            role: 'user'
          }
        });
      }, 1000);
    } catch (err) {
      dispatch({
        type: 'REGISTER_FAIL',
        payload: err.response?.data?.error || 'Registration failed'
      });
    }
  };

  // Login user
  const login = async formData => {
    try {
      // For development, simulate API response
      // In production, use: const res = await axios.post('/api/auth/login', formData);
      // Development-only mock response
      setTimeout(() => {
        localStorage.setItem('token', 'mock-jwt-token');
        dispatch({
          type: 'LOGIN',
          payload: {
            _id: '123456',
            name: 'Jordan Millhausen',
            email: formData.email,
            role: 'admin'
          }
        });
      }, 1000);
    } catch (err) {
      dispatch({
        type: 'LOGIN_FAIL',
        payload: err.response?.data?.error || 'Invalid credentials'
      });
    }
  };

  // Logout
  const logout = () => dispatch({ type: 'LOGOUT' });

  // Clear errors
  const clearErrors = () => dispatch({ type: 'CLEAR_ERROR' });

  return (
    <AuthContext.Provider
      value={{
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        loading: state.loading,
        user: state.user,
        error: state.error,
        register,
        login,
        logout,
        loadUser,
        clearErrors
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;