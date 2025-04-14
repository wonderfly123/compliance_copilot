// client/src/hooks/useGapAnalysis.js
import { useState, useCallback } from 'react';
import axios from 'axios';

const useGapAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  
  /**
   * Analyze a plan using the Gap Analysis AI
   * @param {string} planId - ID of the plan to analyze
   * @param {Array} referenceIds - Optional array of reference document IDs to use for analysis
   */
  const analyzePlan = useCallback(async (planId, referenceIds = []) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/ai/analyze', {
        planId,
        referenceIds
      });
      
      setAnalysisResults(response.data.data);
      setLoading(false);
      
    } catch (error) {
      console.error('Error analyzing plan:', error);
      setError(error.response?.data?.message || 'An error occurred during plan analysis');
      setLoading(false);
      
      // Fallback to mock data if API fails in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Using mock data for development');
        setAnalysisResults({
          overallScore: 67,
          planTitle: "County Emergency Operations Plan 2025",
          planType: "EOP",
          lastAnalyzed: new Date().toISOString(),
          sectionScores: [
            { id: "s1", name: "Introduction", score: 95 },
            { id: "s2", name: "Emergency Support Functions", score: 72 },
            { id: "s3", name: "Evacuation Procedures", score: 45 },
            { id: "s4", name: "Resource Management", score: 61 },
            { id: "s5", name: "Communications Plan", score: 38 }
          ],
          criticalGaps: [
            { 
              id: "g1", 
              section: "Communications Plan", 
              description: "No backup communication protocols defined",
              referenceSource: "FEMA CPG 101, Section 3.2.1"
            },
            { 
              id: "g2", 
              section: "Evacuation Procedures", 
              description: "Missing evacuation routes for northern district",
              referenceSource: "State Emergency Guidance, Section 4.5"
            }
          ],
          recommendations: [
            {
              id: "r1",
              section: "Communications Plan",
              text: "Add specific procedures for alternative communication methods if primary systems fail",
              importance: "high",
              referenceSource: "FEMA CPG 101, Section 3.2.1"
            },
            {
              id: "r2",
              section: "Evacuation Procedures",
              text: "Include evacuation routes and assembly points for northern district",
              importance: "high",
              referenceSource: "State Emergency Guidance, Section 4.5"
            },
            {
              id: "r3",
              section: "Resource Management",
              text: "Specify resource request procedures and forms",
              importance: "medium",
              referenceSource: "NIMS 2025 Edition, Chapter 4"
            }
          ]
        });
      }
    }
  }, []);
  
  /**
   * Get improvement recommendations for a specific section
   * @param {string} planId - ID of the plan
   * @param {string} sectionId - ID of the section to get recommendations for
   */
  const getSectionRecommendations = useCallback(async (planId, sectionId) => {
    try {
      setLoading(true);
      setError(null);
      
      // In a production application, this would be a real API call
      // const response = await axios.post('/api/ai/recommendations', {
      //   planId,
      //   sectionId
      // });
      // return response.data.data;
      
      // For development, simulate API call with mock data
      return new Promise((resolve) => {
        setTimeout(() => {
          const recommendations = [
            {
              id: 1,
              text: "Add specific evacuation routes for people with disabilities",
              importance: "high",
              referenceSource: "FEMA CPG 101, Section 4.3.2"
            },
            {
              id: 2,
              text: "Include contact information for all emergency response agencies",
              importance: "medium",
              referenceSource: "NFPA 1600, Chapter 5"
            },
            {
              id: 3,
              text: "Add procedures for notifying nearby facilities in case of emergency",
              importance: "medium",
              referenceSource: "FEMA ESF 8 Guidance"
            }
          ];
          setLoading(false);
          resolve(recommendations);
        }, 1000);
      });
      
    } catch (error) {
      console.error('Error getting section recommendations:', error);
      setError(error.response?.data?.message || 'An error occurred while getting recommendations');
      setLoading(false);
      return [];
    }
  }, []);
  
  /**
   * Reset the analysis results
   */
  const resetAnalysis = useCallback(() => {
    setAnalysisResults(null);
    setError(null);
  }, []);
  
  return {
    loading,
    error,
    analysisResults,
    analyzePlan,
    getSectionRecommendations,
    resetAnalysis
  };
};

export default useGapAnalysis;