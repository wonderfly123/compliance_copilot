// client/src/App.js
import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ReferenceDocuments from './pages/ReferenceDocuments';
import Plans from './pages/Plans';
import GapAnalysisResults from './pages/GapAnalysisResults';
import Login from './pages/Login';
import Register from './pages/Register';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import PrivateRoute from './components/layout/PrivateRoute';
import { AuthProvider } from './context/AuthContext';
import AuthContext from './context/AuthContext';
import { CopilotProvider } from './context/CopilotContext'; // Import CopilotProvider
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
      {/* Wrap with CopilotProvider so all components have access */}
      <CopilotProvider>
        <div className="app-container">
          {isAuthenticated && !loading && (
            <Sidebar 
              expanded={sidebarExpanded} 
              toggleSidebar={() => setSidebarExpanded(!sidebarExpanded)} 
            />
          )}
          <div className="flex flex-col w-full flex-grow">
            {isAuthenticated && !loading && (
              <Header />
            )}
            <main className="main-content bg-gray-100 min-h-screen p-4 flex-grow">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route element={<PrivateRoute />}>
                  <Route path="/" element={<Plans />} />
                  <Route path="/references" element={<ReferenceDocuments />} />
                  <Route path="/plans" element={<Plans />} />
                  <Route path="/gap-analysis-results/:planId" element={<GapAnalysisResults />} />
                  {/* Add other routes as needed */}
                </Route>
              </Routes>
            </main>
          </div>
        </div>
      </CopilotProvider>
    </Router>
  );
};

export default App;