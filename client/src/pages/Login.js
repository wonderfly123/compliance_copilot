import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const { login, isAuthenticated, error, clearErrors } = useContext(AuthContext);
  const navigate = useNavigate();
  const { email, password } = formData;

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if (isAuthenticated) {
      navigate('/');
    }
    // eslint-disable-next-line
  }, [isAuthenticated]);

  useEffect(() => {
    // Clear any previous errors when component mounts
    clearErrors();
    // eslint-disable-next-line
  }, []);

  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = e => {
    e.preventDefault();
    login(formData);
  };

  return (
    <div className="auth-container">
      <div className="auth-logo">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-color)' }}>Revali</h1>
      </div>
      
      <h2 className="auth-title">Log in to your account</h2>
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-4 rounded">{error}</div>}
      
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email Address</label>
          <input
            type="email"
            className="form-input"
            id="email"
            name="email"
            value={email}
            onChange={onChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            type="password"
            className="form-input"
            id="password"
            name="password"
            value={password}
            onChange={onChange}
            required
          />
        </div>
        
        <div className="form-group mt-4">
          <button 
            type="submit" 
            className="btn w-full"
          >
            Log In
          </button>
        </div>
      </form>
      
      <div className="auth-footer">
        Don't have an account? <Link to="/register" className="auth-link">Sign up</Link>
      </div>
    </div>
  );
};

export default Login;