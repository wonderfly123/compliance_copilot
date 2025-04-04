import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ReferenceDocuments from './pages/ReferenceDocuments';
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
        <main className={`main-content ${!isAuthenticated || loading ? 'w-full' : ''} bg-gray-100 min-h-screen p-4`}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/references" element={<ReferenceDocuments />} />
            </Route>
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;