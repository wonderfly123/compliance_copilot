// client/src/context/CopilotContext.js
import React, { createContext, useEffect, useState, useCallback } from 'react';
import useCopilot from '../hooks/useCopilot';
import { useLocation } from 'react-router-dom';

const CopilotContext = createContext();

export const CopilotProvider = ({ children }) => {
  const {
    messages,
    loading,
    error,
    suggestions,
    sendMessage,
    getProactiveSuggestions,
    executeSuggestedAction,
    clearConversation,
    explainConcept
  } = useCopilot();
  
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [userContext, setUserContext] = useState({
    currentPage: 'dashboard'
  });
  const [proactiveMessage, setProactiveMessage] = useState(null);
  
  // Get current page from location
  const location = useLocation();
  
  // Update current page when location changes
  useEffect(() => {
    const path = location.pathname;
    let currentPage = 'dashboard';
    
    if (path.includes('/plans')) {
      currentPage = 'plans';
    } else if (path.includes('/plan/')) {
      currentPage = 'plan-details';
      // Extract plan ID from URL if available
      const planId = path.split('/plan/')[1];
      if (planId) {
        setUserContext(prev => ({ ...prev, planId, currentPage }));
        return;
      }
    } else if (path.includes('/references')) {
      currentPage = 'references';
    } else if (path.includes('/reference/')) {
      currentPage = 'reference-details';
      // Extract reference ID from URL if available
      const referenceId = path.split('/reference/')[1];
      if (referenceId) {
        setUserContext(prev => ({ ...prev, referenceId, currentPage }));
        return;
      }
    } else if (path.includes('/gap-analysis')) {
      currentPage = 'gap-analysis';
      // Extract plan ID from URL if available
      const planId = path.includes('/plan/') ? path.split('/plan/')[1] : null;
      if (planId) {
        setUserContext(prev => ({ ...prev, planId, currentPage }));
        return;
      }
    } else if (path === '/') {
      currentPage = 'dashboard';
    }
    
    setUserContext(prev => ({ ...prev, currentPage }));
  }, [location]);
  
  // Get proactive suggestions when user context changes
  // This effect is commented out to disable proactive messages
  /*
  useEffect(() => {
    if (!isCopilotOpen) {
      getProactiveSuggestions(userContext)
        .then(result => {
          if (result && result.text) {
            setProactiveMessage(result);
          }
        })
        .catch(err => {
          console.error('Error getting proactive suggestions:', err);
        });
    }
  }, [userContext, isCopilotOpen, getProactiveSuggestions]);
  */
  
  /**
   * Toggle the Copilot panel
   */
  const toggleCopilot = useCallback(() => {
    setIsCopilotOpen(prev => !prev);
    // Clear proactive message when opening
    if (!isCopilotOpen) {
      setProactiveMessage(null);
    }
  }, [isCopilotOpen]);
  
  /**
   * Update the user context with new information
   * @param {Object} contextUpdate - New context properties
   */
  const updateUserContext = useCallback((contextUpdate) => {
    setUserContext(prev => ({ ...prev, ...contextUpdate }));
  }, []);
  
  /**
   * Send a message with the current user context
   * @param {string} text - Message text
   */
  const sendMessageWithContext = useCallback((text) => {
    sendMessage(text, userContext);
    // Clear proactive message when sending a message
    setProactiveMessage(null);
  }, [sendMessage, userContext]);
  
  /**
   * Clear the proactive message
   */
  const clearProactiveMessage = useCallback(() => {
    setProactiveMessage(null);
  }, []);
  
  return (
    <CopilotContext.Provider
      value={{
        messages,
        loading,
        error,
        suggestions,
        isCopilotOpen,
        proactiveMessage,
        userContext,
        toggleCopilot,
        sendMessage: sendMessageWithContext,
        executeSuggestedAction,
        clearConversation,
        explainConcept,
        updateUserContext,
        clearProactiveMessage
      }}
    >
      {children}
    </CopilotContext.Provider>
  );
};

export default CopilotContext;