// client/src/components/gapanalysis/SectionScores.js
import React from 'react';

const SectionScores = ({ sectionScores, onSectionClick }) => {
  // Convert section scores object to array for rendering
  const sectionScoresArray = Object.entries(sectionScores || {}).map(([section, data]) => ({
    id: section,
    name: section,
    ...data
  }));
  
  // Sort by compliance score (low to high)
  const sortedSections = [...sectionScoresArray].sort((a, b) => a.compliance - b.compliance);
  
  // Helper to get the color class based on score
  const getScoreColorClass = (score) => {
    if (score >= 71) return 'bg-green-500';
    if (score >= 41) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  // Helper to get the quality color class based on score
  const getQualityColorClass = (score) => {
    if (score >= 71) return 'bg-indigo-500';
    if (score >= 41) return 'bg-purple-500';
    return 'bg-pink-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Section Analysis</h3>
      
      {sortedSections.length > 0 ? (
        <div className="space-y-4">
          {sortedSections.map((section) => (
            <div 
              key={section.id}
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onSectionClick && onSectionClick(section.id)}
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">{section.name}</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-500">
                    {section.requirements_present} / {section.requirements_total} requirements
                  </span>
                </div>
              </div>
              
              {/* Compliance Score Bar */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-500">Compliance</span>
                  <span className="text-xs font-medium">{section.compliance}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getScoreColorClass(section.compliance)}`}
                    style={{ width: `${section.compliance}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Quality Score Bar */}
              {section.quality !== undefined && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-500">Quality</span>
                    <span className="text-xs font-medium">{section.quality}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getQualityColorClass(section.quality)}`}
                      style={{ width: `${section.quality}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium">No section data available</h3>
          <p className="mt-1 text-sm">Section scores will appear here after analysis.</p>
        </div>
      )}
    </div>
  );
};

export default SectionScores;