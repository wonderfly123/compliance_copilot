import React, { useState } from 'react';

const Copilot = () => {
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { 
      sender: 'copilot', 
      text: 'Hello Jordan! I see you have 2 plans expiring soon and 7 critical sections that need attention across your plans. Would you like me to suggest updates for the San Mateo County Evacuation Plan, which has the lowest compliance score?',
      timestamp: '9:30 AM'
    }
  ]);
  const [userInput, setUserInput] = useState('');
  
  const toggleCopilot = () => {
    setIsCopilotOpen(!isCopilotOpen);
  };
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (userInput.trim() === '') return;
    
    // Add user message
    const newUserMessage = {
      sender: 'user',
      text: userInput,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    setChatMessages([...chatMessages, newUserMessage]);
    setUserInput('');
    
    // Simulate copilot response after a short delay
    setTimeout(() => {
      const responses = [
        "I can help you analyze that document. Would you like me to check for compliance with FEMA guidelines?",
        "Based on your documents, I recommend updating your evacuation plan to include the latest CDC guidelines.",
        "I've analyzed your EOP and found 3 sections that need attention. Would you like a detailed report?",
        "I can see your HMP was updated recently. Is there anything specific you'd like me to explain?"
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const newCopilotMessage = {
        sender: 'copilot',
        text: randomResponse,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      
      setChatMessages(prevMessages => [...prevMessages, newCopilotMessage]);
    }, 1000);
  };
  
  return (
    <>
      {/* Copilot button */}
      <button 
        className="copilot-button"
        onClick={toggleCopilot}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 18C7.5 16.5 9 13.5 12 13C12 13 15 14 17.5 11.5C20 9 21 6 21 6C21 6 19.5 8 17 9C17 9 19 7 19 4C19 4 16.5 6.5 14 7C14 7 15 4 13 3C13 3 12 6 9 7C9 7 10 9 8 11C6 13 5 16 6 18Z" stroke="white" strokeWidth="1.5" fill="white"/>
          <circle cx="9" cy="8.5" r="0.5" fill="black" stroke="none"/>
        </svg>
      </button>
      
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
            <button onClick={toggleCopilot} className="text-white hover:text-gray-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="copilot-messages">
            {chatMessages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.sender === 'user' ? 'message-user' : 'message-assistant'}`}
              >
                <div className="message-content">{message.text}</div>
                <div className="message-timestamp">{message.timestamp}</div>
              </div>
            ))}
          </div>
          
          <form onSubmit={handleSendMessage} className="copilot-input">
            <div className="flex border overflow-hidden">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 focus:outline-none"
              />
              <button 
                type="submit"
                className="px-4 py-2 text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
                disabled={!userInput.trim()}
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
    </>
  );
};

export default Copilot;
