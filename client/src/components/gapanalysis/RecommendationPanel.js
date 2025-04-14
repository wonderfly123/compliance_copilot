// client/src/components/gapanalysis/RecommendationPanel.js
import React, { useState } from 'react';

const RecommendationPanel = ({ recommendations, activeSection }) => {
  const [filter, setFilter] = useState('all');
  
  // Filter recommendations based on selected filter and active section
  const filteredRecommendations = recommendations?.filter(rec => {
    if (activeSection && rec.section !== activeSection) {
      return false;
    }
    
    if (filter === 'high') {
      return rec.importance === 'high';
    } else if (filter === 'medium') {
      return rec.importance === 'medium';
    } else if (filter === 'low') {
      return rec.importance === 'low';
    }
    
    return true;
  });
  
  // Get section name for the title
  const sectionName = activeSection 
    ? recommendations?.find(r => r.section === activeSection)?.section 
    : null;
  
  return (
    <div className="bg-white rounded-lg shadow-md mt-6">
      <div className="p-4 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <h3 className="text-lg font-semibold mb-2 sm:mb-0">
          Recommendations
        </h3>
        <div className="flex items-center flex-wrap">
          <div className="flex flex-wrap gap-1">
            <button 
              className={`px-3 py-1 text-sm rounded-md ${
                filter === 'all' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`px-3 py-1 text-sm rounded-md ${
                filter === 'high' 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => setFilter('high')}
            >
              High Priority
            </button>
            <button 
              className={`px-3 py-1 text-sm rounded-md ${
                filter === 'medium' 
                  ? 'bg-yellow-100 text-yellow-700' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => setFilter('medium')}
            >
              Medium
            </button>
            <button 
              className={`px-3 py-1 text-sm rounded-md ${
                filter === 'low' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => setFilter('low')}
            >
              Low
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {filteredRecommendations && filteredRecommendations.length > 0 ? (
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredRecommendations.map(rec => (
              <div 
                key={rec.id} 
                className="border rounded-md p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start">
                  <div className={`rounded-full p-2 mr-3 ${
                    rec.importance === 'high' ? 'bg-red-100 text-red-500' : 
                    rec.importance === 'medium' ? 'bg-yellow-100 text-yellow-600' : 
                    'bg-green-100 text-green-500'
                  }`}>
                    {rec.importance === 'high' ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ) : rec.importance === 'medium' ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-medium">{rec.text}</p>
                      <span className="text-sm text-gray-500 ml-2">{rec.section}</span>
                    </div>
                    {rec.description && (
                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                    )}
                    {rec.currentText && (
                      <div className="mt-2 p-2 bg-red-50 text-sm rounded border-l-2 border-red-300">
                        <p className="text-gray-700 font-medium">Current text:</p>
                        <p className="text-gray-600 italic">{rec.currentText}</p>
                      </div>
                    )}
                    {rec.recommendedChange && (
                      <div className="mt-2 p-2 bg-green-50 text-sm rounded border-l-2 border-green-300">
                        <p className="text-gray-700 font-medium">Recommended change:</p>
                        <p className="text-gray-600">{rec.recommendedChange}</p>
                      </div>
                    )}
                    {rec.referenceSource && (
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Reference:</span> {rec.referenceSource}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium">No recommendations found</h3>
            <p className="mt-1 text-sm">
              {activeSection 
                ? `This section has no ${filter !== 'all' ? filter + ' priority ' : ''}recommendations.`
                : `No ${filter !== 'all' ? filter + ' priority ' : ''}recommendations found.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationPanel;