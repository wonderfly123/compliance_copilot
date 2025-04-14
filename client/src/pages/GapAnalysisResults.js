// client/src/pages/GapAnalysisResults.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ComplianceScore from '../components/gapanalysis/ComplianceScore';
// AnnotatedDocument component removed
import RecommendationPanel from '../components/gapanalysis/RecommendationPanel';
import GapSummary from '../components/gapanalysis/GapSummary';
import Copilot from '../components/copilot/Copilot';
import ThinkingProcess from '../components/gapanalysis/ThinkingProcess';

const GapAnalysisResults = () => {
  const { planId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [showAnalyzeOption, setShowAnalyzeOption] = useState(false);
  const [showThinkingProcess, setShowThinkingProcess] = useState(false);
  
  useEffect(() => {
    const fetchAnalysisResults = async () => {
      try {
        setLoading(true);
        console.log('Fetching analysis results for plan:', planId);
        
        // Make a real API call to get analysis results
        const response = await axios.get(`/api/ai/analysis/${planId}`);
        // If this endpoint doesn't exist yet in your backend, 
        // uncomment the next line to directly analyze the plan instead
        // const response = await axios.post('/api/ai/analyze', { planId })
        
        if (response.data.success && response.data.data) {
          console.log('Successfully fetched analysis results:', response.data.data);
          setAnalysisResults(response.data.data);
        } else {
          console.error('Failed to fetch analysis results:', response.data);
          throw new Error(response.data.message || 'Failed to fetch analysis results');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching analysis results:', error);
        
        // Check if it's a 404 (no analysis exists yet)
        if (error.response && error.response.status === 404) {
          // If no analysis exists, offer to run one
          setError('No analysis exists for this plan yet. Would you like to run one?');
          setShowAnalyzeOption(true);
        } else {
          setError(error.message || 'Failed to load analysis results. Please try again.');
        }
        
        setLoading(false);
        
        // For development fallback, use mock data
        if (process.env.NODE_ENV === 'development') {
          console.log('Using mock data for development');
          setAnalysisResults({
            overallScore: 67,
            totalElements: 42,
            presentElements: 28,
            missingElements: 14,
            criticalSections: 3,
            planTitle: "County Emergency Operations Plan 2025",
            planType: "EOP",
            lastAnalyzed: "2025-04-01T14:30:00Z",
            missingElementsList: [
              { 
                element: "Backup Communications Protocol", 
                description: "No backup communication protocols defined for when primary systems fail",
                isCritical: true,
                referenceSource: "FEMA CPG 101, Section 3.2.1"
              },
              { 
                element: "Northern District Evacuation Routes", 
                description: "Missing evacuation routes for northern district communities",
                isCritical: true,
                referenceSource: "State Emergency Guidance, Section 4.5"
              },
              { 
                element: "Resource Request Procedures", 
                description: "No standardized resource request procedures or forms included",
                isCritical: false,
                referenceSource: "NIMS 2025 Edition, Chapter 4"
              }
            ],
            improvementRecommendations: [
              {
                id: "r1",
                section: "Communications Plan",
                text: "Add specific procedures for alternative communication methods if primary systems fail",
                currentText: "The county will utilize primary communication channels...",
                recommendedChange: "Add specific procedures for backup communication methods such as satellite phones, amateur radio, and emergency notification systems.",
                importance: "high",
                referenceSource: "FEMA CPG 101, Section 3.2.1"
              },
              {
                id: "r2",
                section: "Evacuation Procedures",
                text: "Include evacuation routes and assembly points for northern district",
                currentText: "Evacuation routes are established for central and southern districts...",
                recommendedChange: "Add detailed evacuation routes for the northern district communities, including primary and secondary routes, assembly points, and transportation resources.",
                importance: "high",
                referenceSource: "State Emergency Guidance, Section 4.5"
              },
              {
                id: "r3",
                section: "Resource Management",
                text: "Specify resource request procedures and forms",
                currentText: "Resources will be requested through the EOC...",
                recommendedChange: "Include standardized resource request procedures and forms in accordance with NIMS requirements. Add a section detailing the process for requesting, tracking, and demobilizing resources.",
                importance: "medium",
                referenceSource: "NIMS 2025 Edition, Chapter 4"
              }
            ],
            referencesUsed: [
              {
                id: "ref1",
                title: "FEMA CPG 101",
                type: "Federal Guide",
                sections: ["Section 3.2.1 - Communications", "Section 5.1 - Plan Implementation"]
              },
              {
                id: "ref2",
                title: "State Emergency Guidance",
                type: "State Guide",
                sections: ["Section 4.5 - Evacuation Planning", "Section 6.2 - Resource Management"]
              },
              {
                id: "ref3",
                title: "NIMS 2025 Edition",
                type: "Federal Doc", 
                sections: ["Chapter 4 - Resource Management"]
              }
            ]
          });
        }
      }
    };
    
    if (planId) {
      fetchAnalysisResults();
    }
  }, [planId]);
  
  const handleSectionClick = (sectionId) => {
    setActiveSectionId(sectionId);
  };
  
  const handleRunAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/ai/analyze', {
        planId
      });
      
      if (response.data.success) {
        console.log('Analysis completed successfully');
        // Refresh the page to show new results
        window.location.reload();
      } else {
        console.error('Analysis failed:', response.data.message);
        setError(response.data.message || 'Analysis failed. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error analyzing plan:', error);
      setError(error.response?.data?.message || 'Failed to analyze plan. Please try again.');
      setLoading(false);
    }
  };
  
  const handleReAnalyzePlan = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/ai/analyze', {
        planId
      });
      
      if (response.data.success) {
        console.log('Re-analysis completed successfully');
        // Refresh the page to show new results
        window.location.reload();
      } else {
        console.error('Re-analysis failed:', response.data.message);
        setError(response.data.message || 'Re-analysis failed. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error re-analyzing plan:', error);
      setError(error.response?.data?.message || 'Failed to re-analyze plan. Please try again.');
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="content-area flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <p className="mt-3 text-lg">Analyzing plan...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="content-area">
        <div className="text-red-600 mb-4">{error}</div>
        {showAnalyzeOption && (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h3 className="text-lg font-medium mb-4">Would you like to analyze this plan now?</h3>
            <button 
              className="btn"
              onClick={handleRunAnalysis}
              disabled={loading}
            >
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        )}
      </div>
    );
  }
  
  // Prepare recommendations data for RecommendationPanel, including missing elements as high priority recommendations
  const missingElementsAsRecommendations = analysisResults?.missingElementsList?.map(item => ({
    id: `missing-${Math.random().toString(36).substr(2, 9)}`,
    text: item.element,
    description: item.description,
    section: 'Missing Element',
    importance: item.isCritical ? "high" : "medium",
    referenceSource: item.referenceSource
  })) || [];

  const recommendations = [
    ...missingElementsAsRecommendations,
    ...(analysisResults?.improvementRecommendations?.map(rec => ({
      id: rec.id || `rec-${Math.random().toString(36).substr(2, 9)}`,
      text: rec.text,
      section: rec.section,
      currentText: rec.currentText,
      recommendedChange: rec.recommendedChange,
      importance: rec.importance || "medium",
      referenceSource: rec.referenceSource
    })) || [])
  ];
  
  return (
    <div className="content-area">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold">{analysisResults?.planTitle}</h2>
          <p className="text-sm text-gray-500">
            {analysisResults?.planType} · Last analyzed: {new Date(analysisResults?.lastAnalyzed).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button className="btn-secondary">Export Results</button>
          <button 
            className={`px-4 py-2 border ${showThinkingProcess ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'} rounded-md text-sm font-medium`}
            onClick={() => setShowThinkingProcess(!showThinkingProcess)}
          >
            {showThinkingProcess ? 'Hide AI Process' : 'Show AI Process'}
          </button>
          <button 
            className="btn"
            onClick={handleReAnalyzePlan}
            disabled={loading}
          >
            {loading ? 'Analyzing...' : 'Re-analyze Plan'}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Compliance score and recommendations */}
        <div className="md:col-span-1">
          <ComplianceScore 
            score={analysisResults?.overallScore} 
            missingElements={analysisResults?.missingElementsList || []} 
            criticalSections={analysisResults?.criticalSections || 0}
          />
          
          {/* Moved Recommendations panel here */}
          <RecommendationPanel 
            recommendations={recommendations}
            activeSection={activeSectionId}
          />
        </div>
        
        {/* Right columns - Document with annotations */}
        <div className="md:col-span-2">
          {/* Document viewing functionality to be implemented differently */}
          <div className="bg-white rounded-lg shadow-md mb-6 p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium">Document content view coming soon</h3>
            <p className="mt-1 text-gray-600">
              A new document viewing interface is being developed. Please check recommendations below.
            </p>
          </div>
        </div>
      </div>
      
      {/* ThinkingProcess slide-in panel */}
      <ThinkingProcess 
        planId={planId}
        isOpen={showThinkingProcess}
        onClose={() => setShowThinkingProcess(false)}
      />
      
      {/* Copilot component */}
      <Copilot />
    </div>
  );
};

export default GapAnalysisResults;