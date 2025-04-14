// client/src/components/gapanalysis/ThinkingProcess.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ThinkingProcess = ({ planId, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('thinking');
  const [thinkingProcessData, setThinkingProcessData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && planId) {
      fetchThinkingProcess();
    }
  }, [isOpen, planId]);

  const fetchThinkingProcess = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the actual analysis data from the API
      const response = await axios.get(`/api/ai/analysis/${planId}/thinking`);
      
      if (response.data.success) {
        setThinkingProcessData(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch analysis process');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching thinking process:', error);
      setError(error.response?.data?.message || 'Failed to load analysis thinking process');
      setLoading(false);
    }
  };

  // Helper function to render the right icon based on step type
  const renderStepIcon = (type) => {
    switch (type) {
      case 'start':
        return (
          <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'reference':
        return (
          <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'missing':
        return (
          <svg className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'calculation':
        return (
          <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Get the border color based on step type
  const getStepBorderColor = (type) => {
    switch (type) {
      case 'start':
      case 'reference':
        return 'border-blue-500';
      case 'missing':
        return 'border-yellow-500';
      case 'calculation':
        return 'border-green-500';
      default:
        return 'border-gray-300';
    }
  };

  // Get the background color for the icon
  const getIconBgColor = (type) => {
    switch (type) {
      case 'start':
      case 'reference':
        return 'bg-blue-100';
      case 'missing':
        return 'bg-yellow-100';
      case 'calculation':
        return 'bg-green-100';
      default:
        return 'bg-gray-100';
    }
  };

  // Get the text color for the step title
  const getStepTextColor = (type) => {
    switch (type) {
      case 'start':
      case 'reference':
        return 'text-blue-800';
      case 'missing':
        return 'text-yellow-800';
      case 'calculation':
        return 'text-green-800';
      default:
        return 'text-gray-800';
    }
  };

  // Function to download JSON data
  const downloadJson = () => {
    if (!thinkingProcessData || !thinkingProcessData.rawData) return;
    
    const dataStr = JSON.stringify(thinkingProcessData.rawData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-data-${planId}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className={`fixed top-0 right-0 w-96 h-full bg-white shadow-lg z-10 flex flex-col transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out`}>
      {/* Panel header */}
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="font-semibold flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Analysis Process
        </h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Panel tabs */}
      <div className="flex border-b">
        <button 
          className={`flex-1 py-2 px-4 text-sm font-medium ${activeTab === 'thinking' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('thinking')}
        >
          Thinking Process
        </button>
        <button 
          className={`flex-1 py-2 px-4 text-sm font-medium ${activeTab === 'data' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('data')}
        >
          Full Analysis Data
        </button>
      </div>
      
      {/* Panel content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        ) : error ? (
          <div className="text-red-600 p-4 bg-red-50 rounded">
            {error}
          </div>
        ) : thinkingProcessData ? (
          activeTab === 'thinking' ? (
            <div className="space-y-4">
              {thinkingProcessData.steps.map((step, index) => (
                <div key={index} className={`flex items-start border-l-4 ${getStepBorderColor(step.type)} pl-3 pb-6`}>
                  <div className={`mr-3 mt-1 ${getIconBgColor(step.type)} rounded-full p-1`}>
                    {renderStepIcon(step.type)}
                  </div>
                  <div>
                    <h4 className={`font-medium ${getStepTextColor(step.type)}`}>{step.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    
                    {step.type === 'reference' && step.details?.referencesUsed && (
                      <div className="bg-gray-50 p-2 rounded mt-2 text-xs">
                        <p className="font-medium">Reference Documents:</p>
                        <ul className="list-disc pl-4 mt-1">
                          {step.details.referencesUsed.map((ref, idx) => (
                            <li key={idx}>
                              {ref.title}
                              {ref.sections && ref.sections.length > 0 && (
                                <span className="text-gray-500"> - {ref.sections.join(', ')}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {step.type === 'missing' && step.details?.missingElements && (
                      <div>
                        <ul className="list-disc pl-5 mt-1 text-sm text-gray-600">
                          {step.details.missingElements.map((elem, idx) => (
                            <li key={idx}>
                              {elem.element}
                              {elem.isCritical && <span className="text-red-600 text-xs ml-1">(Critical)</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {step.type === 'calculation' && step.details && (
                      <div className="bg-gray-50 p-2 rounded mt-2 text-xs">
                        <p>{step.details.formula}</p>
                        <p>{step.details.calculation}</p>
                        <p className="text-sm mt-2 text-gray-700">{step.details.classification}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Complete Analysis Data
                  </h4>
                  <button 
                    onClick={downloadJson}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    Download JSON
                  </button>
                </div>
                <div className="bg-gray-800 text-gray-200 p-3 rounded text-xs font-mono overflow-x-auto">
                  {JSON.stringify(thinkingProcessData.rawData, null, 2)}
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="text-center text-gray-500 p-4">
            No analysis data available
          </div>
        )}
      </div>
    </div>
  );
};

export default ThinkingProcess;