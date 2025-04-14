// server/services/gapAnalysis.js
const { createEmbedding } = require('./embedding');
const { gapAnalysisAI } = require('./gemini');
const supabase = require('../config/supabase');

/**
 * Analyze a plan document against reference standards
 * @param {Object} plan - The plan document to analyze
 * @param {string} planType - Type of plan (EOP, HMP, COOP, etc.)
 * @param {Array} referenceStandards - Array of reference standard IDs to check against
 * @returns {Object} Analysis results with compliance score and recommendations
 */
const analyzePlan = async (plan, planType, referenceStandards) => {
  console.log('=== Starting Gap Analysis ===');
  console.log('Plan type:', planType);
  console.log('Reference standards count:', referenceStandards?.length || 0);
  
  try {
    // 1. Extract content from the plan document
    const planContent = plan.content;
    
    // 2. Chunk the plan content for analysis
    console.log('Chunking plan content...');
    const planChunks = chunkDocument(planContent);
    console.log(`Created ${planChunks.length} chunks from plan content`);
    
    // 3. Get relevant reference materials from the vector database
    console.log('Getting reference content...');
    const referenceContent = await getRelevantReferences(planType, referenceStandards);
    console.log(`Retrieved ${referenceContent.length} reference documents`);
    
    // 4. Compare plan against references to identify gaps
    console.log('Comparing plan against references...');
    const analysisResults = await compareWithReferences(planChunks, referenceContent, planType);
    console.log('Comparison complete');
    
    // 5. Calculate compliance score based on identified gaps
    console.log('Calculating compliance score...');
    const complianceScore = calculateComplianceScore(analysisResults);
    console.log(`Overall compliance score: ${complianceScore.overall}%`);
    
    // 6. Generate improvement recommendations
    console.log('Generating recommendations...');
    const recommendations = generateRecommendations(analysisResults, planType);
    console.log(`Generated ${recommendations.length} recommendations`);
    
    console.log('=== Gap Analysis Complete ===');
    
    return {
      overallScore: complianceScore.overall,
      sectionScores: complianceScore.sections,
      recommendations,
      missingElements: analysisResults.missingElements,
      criticalGaps: analysisResults.criticalGaps
    };
  } catch (error) {
    console.error('=== Gap Analysis Error ===');
    console.error('Error in gap analysis:', error);
    console.error('Stack trace:', error.stack);
    throw new Error(`Gap analysis failed: ${error.message}`);
  }
};

/**
 * Retrieve relevant reference content from the vector database
 */
const getRelevantReferences = async (planType, referenceIds) => {
  // Query the vector database for relevant reference documents
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, doc_subtype as type, description')
    .in('id', referenceIds)
    .eq('document_type', 'reference');
  
  if (error) throw error;
  
  // Get embeddings for each reference document
  const referenceContent = [];
  for (const ref of data) {
    const { data: embeddings, error: embeddingError } = await supabase
      .from('vector_embeddings')
      .select('content as chunk_text, chunk_index as chunk_id')
      .eq('document_id', ref.id);
    
    if (embeddingError) throw embeddingError;
    
    referenceContent.push({
      ...ref,
      chunks: embeddings
    });
  }
  
  return referenceContent;
};

/**
 * Compare plan chunks against reference standards using Gemini
 */
const compareWithReferences = async (planChunks, referenceContent, planType) => {
  // Combine plan chunks into full text for analysis
  const planText = planChunks.map(chunk => chunk.text).join('\n\n');
  
  // Get relevant reference standards for this plan type
  const relevantReferences = referenceContent.filter(ref => {
    // Filter logic based on plan type and reference type
    return true; // Replace with actual filtering logic
  });
  
  // Flatten reference chunks for analysis
  const referenceChunks = [];
  relevantReferences.forEach(ref => {
    ref.chunks.forEach(chunk => {
      referenceChunks.push({
        reference_id: ref.id,
        reference_title: ref.title,
        reference_type: ref.type,
        chunk_text: chunk.chunk_text,
        chunk_id: chunk.chunk_id
      });
    });
  });
  
  // Use Gemini to analyze the plan against references
  const analysisResults = await gapAnalysisAI.analyzePlan(planText, referenceChunks, planType);
  
  // Ensure all expected properties exist to prevent errors
  if (!analysisResults) {
    throw new Error('Failed to get analysis results from AI');
  }
  
  // Add default values for all required properties
  const processedResults = {
    overallScore: analysisResults.overallScore || 0,
    totalElements: analysisResults.totalElements || 0,
    presentElements: analysisResults.presentElements || 0,
    missingElements: analysisResults.missingElements || 0,
    criticalSections: analysisResults.criticalSections || analysisResults.criticalGaps_count || 0,
    criticalGaps: Array.isArray(analysisResults.criticalGaps) ? analysisResults.criticalGaps : [],
    recommendations: Array.isArray(analysisResults.recommendations) ? analysisResults.recommendations : [],
    sectionScores: Array.isArray(analysisResults.sectionScores) ? analysisResults.sectionScores : [],
    // Removed annotated sections
  };
  
  return {
    presentElements: processedResults.presentElements || [],
    missingElements: processedResults.criticalGaps.map(gap => ({
      id: gap.id || `gap-${Math.random().toString(36).substr(2, 9)}`,
      name: gap.element || gap.description || '',
      description: gap.description || '',
      critical: true,
      referenceLink: gap.referenceSource || ''
    })),
    criticalGaps: processedResults.criticalGaps.map(gap => ({
      id: gap.id || `gap-${Math.random().toString(36).substr(2, 9)}`,
      description: gap.description || '',
      section: gap.section || 'General',
      referenceSource: gap.referenceSource || ''
    })),
    recommendations: processedResults.recommendations,
    sectionScores: processedResults.sectionScores,
    overallScore: processedResults.overallScore
  };
};

/**
 * Calculate compliance score based on analysis results
 */
const calculateComplianceScore = (analysisResults) => {
  const { presentElements, missingElements, criticalGaps, sectionScores } = analysisResults;
  
  // Get section scores from AI if available, otherwise calculate basic score
  if (Array.isArray(sectionScores) && sectionScores.length > 0) {
    return {
      overall: analysisResults.overallScore || Math.round((presentElements.length / (presentElements.length + missingElements.length)) * 100) || 0,
      sections: sectionScores
    };
  }
  
  // Calculate overall compliance score if not provided by AI
  const totalElements = (Array.isArray(presentElements) ? presentElements.length : 0) + 
                        (Array.isArray(missingElements) ? missingElements.length : 0);
  const overallScore = totalElements > 0 
    ? Math.round(((Array.isArray(presentElements) ? presentElements.length : 0) / totalElements) * 100)
    : 0;
  
  // Default empty section scores
  const sections = {};
  
  return {
    overall: analysisResults.overallScore || overallScore,
    sections: sections,
    totalElements,
    presentElements: Array.isArray(presentElements) ? presentElements.length : 0,
    missingElements: Array.isArray(missingElements) ? missingElements.length : 0,
    criticalGaps: Array.isArray(criticalGaps) ? criticalGaps.length : 0
  };
};

/**
 * Generate improvement recommendations based on analysis
 */
const generateRecommendations = (analysisResults, planType) => {
  // If the AI already provided recommendations, use those
  if (Array.isArray(analysisResults.recommendations) && analysisResults.recommendations.length > 0) {
    return analysisResults.recommendations;
  }
  
  // Otherwise, generate recommendations from missing elements
  const { missingElements, criticalGaps } = analysisResults;
  
  // Generate recommendations for missing elements
  const recommendations = missingElements.map(element => ({
    id: `rec-${Math.random().toString(36).substr(2, 9)}`,
    elementId: element.id,
    text: `Add a section addressing ${element.name}`,
    section: element.section || 'General',
    importance: element.critical ? 'high' : 'medium',
    referenceSource: element.referenceLink || null
  }));
  
  return recommendations;
};

// Annotation functionality removed

/**
 * Split document into logical chunks for analysis
 */
const chunkDocument = (content) => {
  // In a real implementation, this would use more sophisticated chunking
  // For now, split by paragraphs for simplicity
  const paragraphs = content.split(/\n\s*\n/);
  
  return paragraphs.map((text, i) => ({
    id: i,
    text: text.trim(),
    type: 'paragraph'
  }));
};

module.exports = {
  analyzePlan
};