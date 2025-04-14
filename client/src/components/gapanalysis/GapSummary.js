// client/src/components/gapanalysis/GapSummary.js
import React from 'react';

const GapSummary = ({ criticalGaps, onSectionClick }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Critical Gaps</h3>
      
      {criticalGaps && criticalGaps.length > 0 ? (
        <div className="space-y-4">
          {criticalGaps.map((gap, index) => (
            <div key={gap.id} className="border-l-4 border-red-500 bg-red-50 pl-4 py-3 rounded-r-md">
              <div className="flex items-start">
                <div className="text-red-500 mr-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-red-800">{gap.description}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    <button 
                      className="font-medium hover:underline"
                      onClick={() => onSectionClick && onSectionClick(gap.section)}
                    >
                      {gap.section}
                    </button>
                  </p>
                  {gap.referenceSource && (
                    <p className="text-xs text-gray-500 mt-1">
                      Reference: {gap.referenceSource}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-6 text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium">No critical gaps found</h3>
          <p className="mt-1 text-sm">This plan addresses all critical requirements.</p>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">Summary</h4>
          <span className="text-sm text-gray-500">
            {criticalGaps ? criticalGaps.length : 0} critical issues
          </span>
        </div>
        <p className="text-sm mt-2 text-gray-600">
          {criticalGaps && criticalGaps.length > 0
            ? "Address these critical gaps to improve compliance with requirements and standards."
            : "This plan meets all critical requirements from the reference standards."
          }
        </p>
        <button className="mt-3 w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
          View Detailed Analysis
        </button>
      </div>
    </div>
  );
};

export default GapSummary;