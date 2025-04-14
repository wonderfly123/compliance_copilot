// client/src/hooks/useCopilot.js
import { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

/**
 * Custom hook for interacting with the Copilot AI
 * @returns {Object} - Copilot functions and state
 */
const useCopilot = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const { user } = useContext(AuthContext);
  
  // Initialize with welcome message
  useEffect(() => {
    // Only initialize if messages is empty
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome-message',
        sender: 'copilot',
        text: 'Hello! I\'m Revali Assistant. I can help you with emergency management plans, compliance standards, and recommendations. How can I assist you today?',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }]);
    }
  }, [messages]);
  
  /**
   * Send a message to the Copilot AI
   * @param {string} text - Message text
   * @param {Object} context - Additional context (current page, plan ID, etc.)
   */
  const sendMessage = useCallback(async (text, context = {}) => {
    if (!text.trim()) return;
    
    // Add user message to state
    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setLoading(true);
    setError(null);
    
    try {
      // Convert messages to format expected by API
      const conversationHistory = messages.map(msg => ({
        sender: msg.sender,
        text: msg.text
      }));
      
      // Use a timeout to cancel request if it takes too long
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      // Call the Copilot API
      const response = await axios.post('/api/ai/answer', {
        question: text,
        conversationHistory,
        planId: context.planId,
        userContext: {
          currentPage: context.currentPage,
          planId: context.planId,
          referenceId: context.referenceId,
          ...context
        }
      }, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const { data } = response.data;
      
      // Add the AI response to state
      const copilotMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        text: data.text,
        references: data.references || [],
        suggestedActions: data.suggestedActions || [],
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      
      setMessages(prevMessages => [...prevMessages, copilotMessage]);
      
      // Update suggested actions
      if (data.suggestedActions && data.suggestedActions.length > 0) {
        setSuggestions(data.suggestedActions);
      }
      
    } catch (err) {
      console.error('Error sending message to Copilot:', err);
      
      let errorMessage = 'Something went wrong while getting a response';
      
      if (err.response) {
        errorMessage = err.response.data?.message || errorMessage;
      } else if (err.name === 'AbortError') {
        errorMessage = 'Request took too long, please try again';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // Add error message to chat
      const errorResponseMessage = {
        id: `error-${Date.now()}`,
        sender: 'copilot',
        text: `I'm sorry, I encountered an error: ${errorMessage}. Please try again or rephrase your question.`,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      
      setMessages(prevMessages => [...prevMessages, errorResponseMessage]);
    } finally {
      setLoading(false);
    }
  }, [messages]);
  
  /**
   * Get proactive suggestions based on user context
   * @param {Object} context - User context (current page, plan ID, etc.)
   * @returns {Promise<Object>} - Proactive message and suggestions
   */
  const getProactiveSuggestions = useCallback(async (context = {}) => {
    try {
      if (!context.currentPage) return null;
      
      const response = await axios.post('/api/ai/suggestions', {
        userContext: context
      });
      
      const { data } = response.data;
      
      if (data.text) {
        // Update suggestions
        setSuggestions(data.suggestions || []);
        
        return {
          text: data.text,
          suggestions: data.suggestions || []
        };
      }
      
      return null;
    } catch (err) {
      console.error('Error getting proactive suggestions:', err);
      return null;
    }
  }, []);
  
  /**
   * Execute a suggested action
   * @param {Object} action - Suggested action object
   */
  const executeSuggestedAction = useCallback((action) => {
    if (!action || !action.type) return;
    
    switch (action.type) {
      case 'ask_question':
        if (action.data && action.data.question) {
          sendMessage(action.data.question);
        }
        break;
        
      // Other action types can be handled here
      default:
        console.log('Unhandled action type:', action.type);
    }
  }, [sendMessage]);
  
  /**
   * Clear conversation history
   */
  const clearConversation = useCallback(() => {
    setMessages([{
      id: 'welcome-message',
      sender: 'copilot',
      text: 'Hello! I\'m Revali Assistant. How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }]);
    setSuggestions([]);
  }, []);
  
  /**
   * Explain a concept or term
   * @param {string} concept - Concept to explain
   * @param {string} referenceId - Optional reference document ID
   */
  const explainConcept = useCallback(async (concept, referenceId = null) => {
    if (!concept.trim()) return;
    
    // Add user query to state
    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: `Can you explain "${concept}"?`,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/ai/explain', {
        concept,
        referenceId
      });
      
      const { data } = response.data;
      
      // Add the explanation to the chat
      const copilotMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      
      setMessages(prevMessages => [...prevMessages, copilotMessage]);
      
    } catch (err) {
      console.error('Error explaining concept:', err);
      
      const errorMessage = err.response?.data?.message || 'Something went wrong while explaining the concept';
      setError(errorMessage);
      
      // Add error message to chat
      const errorResponseMessage = {
        id: `error-${Date.now()}`,
        sender: 'copilot',
        text: `I'm sorry, I encountered an error while explaining "${concept}": ${errorMessage}. Please try again or rephrase your question.`,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      
      setMessages(prevMessages => [...prevMessages, errorResponseMessage]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    messages,
    loading,
    error,
    suggestions,
    sendMessage,
    getProactiveSuggestions,
    executeSuggestedAction,
    clearConversation,
    explainConcept
  };
};

export default useCopilot;