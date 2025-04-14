import React, { useState, useContext, useEffect, useRef } from 'react';
import CopilotContext from '../../context/CopilotContext';
import ReactMarkdown from 'react-markdown';

const Copilot = () => {
  const {
    messages,
    loading,
    suggestions,
    isCopilotOpen,
    toggleCopilot,
    sendMessage,
    executeSuggestedAction,
    clearConversation
  } = useContext(CopilotContext);
  
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Scroll to the bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Simulate typing effect for new messages
  useEffect(() => {
    if (loading) {
      setIsTyping(true);
    } else {
      // Keep typing indicator for a brief period after loading ends
      const timer = setTimeout(() => {
        setIsTyping(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading]);
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (userInput.trim() === '') return;
    
    sendMessage(userInput);
    setUserInput('');
  };
  
  // Format the timestamp for display
  const formatTimestamp = (timestamp) => {
    return timestamp || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };
  
  // Execute a suggested action
  const handleActionClick = (action) => {
    executeSuggestedAction(action);
  };
  
  // Render message content with markdown support
  const renderMessageContent = (message) => {
    return (
      <div className="message-content">
        <ReactMarkdown>
          {message.text}
        </ReactMarkdown>
        
        {/* Render references if available */}
        {message.references && message.references.length > 0 && (
          <div className="message-references">
            <div className="text-xs font-medium text-gray-500 mt-2">References:</div>
            <ul className="text-xs text-gray-500 mt-1 pl-4">
              {message.references.map((ref, index) => (
                <li key={index}>
                  {ref.title}
                  {ref.section && ` - ${ref.section}`}
                  {ref.type && ref.type !== 'Document' && ` (${ref.type})`}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Render suggested actions if available */}
        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="message-actions mt-2">
            {message.suggestedActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleActionClick(action)}
                className="text-xs mr-2 mb-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <>
      {/* Copilot button with notification badge */}
      <div className="copilot-button-container">
        <button 
          className="copilot-button"
          onClick={toggleCopilot}
          aria-label="Open Revali Assistant"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 18C7.5 16.5 9 13.5 12 13C12 13 15 14 17.5 11.5C20 9 21 6 21 6C21 6 19.5 8 17 9C17 9 19 7 19 4C19 4 16.5 6.5 14 7C14 7 15 4 13 3C13 3 12 6 9 7C9 7 10 9 8 11C6 13 5 16 6 18Z" stroke="white" strokeWidth="1.5" fill="white"/>
            <circle cx="9" cy="8.5" r="0.5" fill="black" stroke="none"/>
          </svg>
        </button>
      </div>
      
      {/* Copilot chat panel */}
      {isCopilotOpen && (
        <div className="copilot-panel">
          <div className="copilot-header">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 18C7.5 16.5 9 13.5 12 13C12 13 15 14 17.5 11.5C20 9 21 6 21 6C21 6 19.5 8 17 9C17 9 19 7 19 4C19 4 16.5 6.5 14 7C14 7 15 4 13 3C13 3 12 6 9 7C9 7 10 9 8 11C6 13 5 16 6 18Z" stroke="white" strokeWidth="1.5" fill="white"/>
                  <circle cx="9" cy="8.5" r="0.5" fill="black" stroke="none"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Revali Assistant</h3>
              </div>
            </div>
            <div className="flex">
              <button 
                onClick={clearConversation} 
                className="text-white hover:text-gray-200 mr-2"
                title="Clear conversation"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button 
                onClick={toggleCopilot} 
                className="text-white hover:text-gray-200"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="copilot-messages">
            {messages.map((message, index) => (
              <div 
                key={message.id || index} 
                className={`message ${message.sender === 'user' ? 'message-user' : 'message-assistant'} ${message.isError ? 'message-error' : ''}`}
              >
                {renderMessageContent(message)}
                <div className="message-timestamp">{formatTimestamp(message.timestamp)}</div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="message message-assistant">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Suggestions row */}
          {suggestions && suggestions.length > 0 && (
            <div className="copilot-suggestions">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleActionClick(suggestion)}
                  className="suggestion-button"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          )}
          
          <form onSubmit={handleSendMessage} className="copilot-input">
            <div className="flex border overflow-hidden">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 focus:outline-none"
                disabled={loading}
              />
              <button 
                type="submit"
                className="px-4 py-2 text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
                disabled={!userInput.trim() || loading}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1 px-2">
              Ask about plan compliance, section updates, or recommendations
            </div>
          </form>
        </div>
      )}
      
      {/* Proactive message bubble - removed */}
    </>
  );
};

export default Copilot;