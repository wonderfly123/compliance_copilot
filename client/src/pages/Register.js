import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const { register, isAuthenticated, error, clearErrors } = useContext(AuthContext);
  const navigate = useNavigate();
  const { name, email, password, confirmPassword } = formData;

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
    // Clear password error if user is typing in password fields
    if (e.target.name === 'password' || e.target.name === 'confirmPassword') {
      setPasswordError('');
    }
  };

  const onSubmit = e => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    register({
      name,
      email,
      password
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-logo">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-color)' }}>Revali</h1>
      </div>
      
      <h2 className="auth-title">Create an account</h2>
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-4 rounded">{error}</div>}
      
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">Full Name</label>
          <input
            type="text"
            className="form-input"
            id="name"
            name="name"
            value={name}
            onChange={onChange}
            required
          />
        </div>
        
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
            minLength="6"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            className="form-input"
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={onChange}
            required
            minLength="6"
          />
          {passwordError && <p className="form-error">{passwordError}</p>}
        </div>
        
        <div className="form-group mt-4">
          <button 
            type="submit" 
            className="btn w-full"
          >
            Sign Up
          </button>
        </div>
      </form>
      
      <div className="auth-footer">
        Already have an account? <Link to="/login" className="auth-link">Log in</Link>
      </div>
    </div>
  );
};

export default Register;