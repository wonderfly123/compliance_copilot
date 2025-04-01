import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Login from './pages/Login';
import Register from './pages/Register';
import Sidebar from './components/layout/Sidebar';
import PrivateRoute from './components/layout/PrivateRoute';
import { AuthProvider } from './context/AuthContext';
import AuthContext from './context/AuthContext';
import './App.css';

// Main app component with auth provider wrapper
const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

// Inner app content that has access to auth context
const AppContent = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const { isAuthenticated, loading, loadUser } = useContext(AuthContext);

  // Load user on initial render
  useEffect(() => {
    loadUser();
    // eslint-disable-next-line
  }, []);

  return (
    <Router>
      <div className="app-container">
        {isAuthenticated && !loading && (
          <Sidebar 
            expanded={sidebarExpanded} 
            toggleSidebar={() => setSidebarExpanded(!sidebarExpanded)} 
          />
        )}
        <main className={`main-content ${!isAuthenticated || loading ? 'w-full' : ''}`}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/documents" element={<Documents />} />
            </Route>
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;