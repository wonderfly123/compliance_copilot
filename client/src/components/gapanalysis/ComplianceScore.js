// client/src/components/gapanalysis/ComplianceScore.js
import React from 'react';

const ComplianceScore = ({ score, missingElements = [], criticalSections = 0 }) => {
  // Determine color based on score
  const getScoreColor = (score) => {
    if (score >= 71) return 'bg-green-100 text-green-800';
    if (score >= 41) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };
  
  // Format percentage
  const formatScore = (score) => {
    return `${Math.round(score)}%`;
  };
  
  // Get appropriate icon based on score
  const getScoreIcon = (score) => {
    if (score >= 71) {
      return (
        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (score >= 41) {
      return (
        <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Compliance Score</h3>
      
      {/* Overall Score */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          {getScoreIcon(score)}
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-500">Overall Score</div>
            <div className="text-3xl font-bold">{formatScore(score)}</div>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-full text-sm font-semibold ${getScoreColor(score)}`}>
          {score >= 71 ? 'Strong Compliance' : 
           score >= 41 ? 'Moderate Compliance' : 
           'Significant Improvements Needed'}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
        <div 
          className={`h-4 rounded-full ${
            score >= 71 ? 'bg-green-500' : 
            score >= 41 ? 'bg-yellow-500' : 
            'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">Missing Elements</div>
          <div className="text-xl font-semibold">{missingElements.length}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">Critical Sections</div>
          <div className="text-xl font-semibold">{criticalSections}</div>
        </div>
      </div>
      
      {/* Summary Text */}
      <div className="text-sm text-gray-600 mt-3">
        {score >= 71 ? (
          <p>This plan meets most compliance requirements. Focus on addressing any critical gaps to further improve compliance.</p>
        ) : score >= 41 ? (
          <p>Several required elements are missing from this plan. Review the gap analysis to identify important improvements.</p>
        ) : (
          <p>This plan has significant compliance issues. Immediate attention is needed to address the critical missing elements.</p>
        )}
      </div>
    </div>
  );
};

export default ComplianceScore;