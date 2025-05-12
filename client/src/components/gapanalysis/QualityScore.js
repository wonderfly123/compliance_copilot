// client/src/components/gapanalysis/QualityScore.js
import React from 'react';

const QualityScore = ({ score, qualityFindings = [] }) => {
  // Determine color based on score
  const getScoreColor = (score) => {
    if (score >= 71) return 'bg-indigo-100 text-indigo-800';
    if (score >= 41) return 'bg-purple-100 text-purple-800';
    return 'bg-pink-100 text-pink-800';
  };
  
  // Format percentage
  const formatScore = (score) => {
    return `${Math.round(score)}%`;
  };
  
  // Get appropriate icon based on score
  const getScoreIcon = (score) => {
    if (score >= 71) {
      return (
        <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (score >= 41) {
      return (
        <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-8 h-8 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  // Count quality findings by rating
  const poorCount = qualityFindings.filter(finding => finding.quality_rating === 'poor').length;
  const adequateCount = qualityFindings.filter(finding => finding.quality_rating === 'adequate').length;
  const excellentCount = qualityFindings.filter(finding => finding.quality_rating === 'excellent').length;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Quality Score</h3>
      
      {/* Overall Score */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          {getScoreIcon(score)}
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-500">Quality Rating</div>
            <div className="text-3xl font-bold">{formatScore(score)}</div>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-full text-sm font-semibold ${getScoreColor(score)}`}>
          {score >= 71 ? 'Excellent Quality' : 
           score >= 41 ? 'Adequate Quality' : 
           'Needs Improvement'}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
        <div 
          className={`h-4 rounded-full ${
            score >= 71 ? 'bg-indigo-500' : 
            score >= 41 ? 'bg-purple-500' : 
            'bg-pink-500'
          }`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">Excellent</div>
          <div className="text-xl font-semibold text-indigo-600">{excellentCount}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">Adequate</div>
          <div className="text-xl font-semibold text-purple-600">{adequateCount}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">Poor</div>
          <div className="text-xl font-semibold text-pink-600">{poorCount}</div>
        </div>
      </div>
      
      {/* Summary Text */}
      <div className="text-sm text-gray-600 mt-3">
        {score >= 71 ? (
          <p>This plan has excellent language quality. Only minor improvements to wording can enhance clarity further.</p>
        ) : score >= 41 ? (
          <p>Language quality is adequate. Consider revisions to improve clarity, specificity, and actionability.</p>
        ) : (
          <p>The language quality needs significant improvement. Focus on making text clearer, more specific, and actionable.</p>
        )}
      </div>
    </div>
  );
};

export default QualityScore;