// server/controllers/aiController.js
const supabase = require('../config/supabase');
const { createEmbedding } = require('../services/embedding');
const { gapAnalysisAI, copilotAI } = require('../services/gemini');

/**
 * Analyze a plan and generate compliance score
 */
exports.analyzePlan = async (req, res) => {
  try {
    const { planId, referenceIds } = req.body;
    
    if (!planId) {
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }
    
    // Get the plan from the database
    const { data: plan, error: planError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', planId)
      .eq('document_type', 'plan')
      .single();
    
    if (planError || !plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    
    // If no reference IDs are provided, get relevant references - don't filter by doc_subtype
    let referencesToUse = referenceIds;
    if (!referencesToUse || referencesToUse.length === 0) {
      // Instead of filtering by doc_subtype, just get all active reference documents
      const { data: defaultRefs, error: refsError } = await supabase
        .from('documents')
        .select('id')
        .eq('document_type', 'reference')
        .eq('status', 'active');
      
      if (refsError) {
        return res.status(500).json({ success: false, message: 'Error retrieving default references' });
      }
      
      referencesToUse = defaultRefs.map(ref => ref.id);
    }
    
    // If still no references found, return error
    if (!referencesToUse || referencesToUse.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No reference documents found. Please upload reference documents first.' 
      });
    }
    
    // Get reference content chunks
    const referenceChunks = [];
    for (const refId of referencesToUse) {
      const { data: chunks, error: chunksError } = await supabase
        .from('vector_embeddings')
        .select('content, metadata, chunk_index')
        .eq('document_id', refId);
      
      if (!chunksError && chunks) {
        referenceChunks.push(...chunks.map(chunk => ({
          reference_id: refId,
          chunk_text: chunk.content,
          chunk_id: chunk.chunk_index,
          reference_title: chunk.metadata?.document_title || 'Reference Document',
          reference_type: chunk.metadata?.document_type || 'Standard'
        })));
      }
    }
    
    if (referenceChunks.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No reference content found. Please ensure reference documents have been properly processed.' 
      });
    }
    
    // Try to use vector embeddings first, and only fall back to raw file content if embeddings aren't available
    let planText = "";
    const { data: planChunks, error: planChunksError } = await supabase
      .from('vector_embeddings')
      .select('content, metadata, chunk_index')
      .eq('document_id', planId);

    if (planChunksError || !planChunks || planChunks.length === 0) {
      console.log('No vector embeddings found for plan. Falling back to raw content...');
      
      // Only fall back to raw content if no embeddings exist
      const { data: planContent, error: contentError } = await supabase
        .storage
        .from('plans')
        .download(plan.file_url);
      
      if (contentError) {
        return res.status(500).json({ success: false, message: 'Error retrieving plan content' });
      }
      
      // Convert the plan content to text
      if (Buffer.isBuffer(planContent)) {
        planText = planContent.toString('utf-8');
      } else if (planContent instanceof Uint8Array) {
        planText = new TextDecoder().decode(planContent);
      } else if (typeof planContent.text === 'function') {
        planText = await planContent.text();
      } else {
        planText = String(planContent);
      }
    } else {
      // Use the vector embeddings for analysis
      planText = planChunks.map(chunk => chunk.content).join("\n\n");
      console.log(`Using ${planChunks.length} text chunks from vector embeddings`);
    }

    // Add debug logging to help troubleshoot
    console.log(`Extracted plan text length: ${planText.length} characters`);
    console.log(`First 100 characters: ${planText.substring(0, 100)}...`);
    
    // Perform the analysis using the Gap Analysis AI
    console.log('Starting gap analysis for plan:', planId);
    console.log('Using reference chunks:', referenceChunks.length);
    
    try {
      const analysisResults = await gapAnalysisAI.analyzePlan(
        planText,
        referenceChunks,
        plan.doc_subtype
      );
      
      // Ensure we have valid analysis results
      if (!analysisResults || typeof analysisResults !== 'object') {
        throw new Error('Invalid analysis results from AI');
      }
      
      // Make sure critical values exist to prevent later errors
      const processedResults = {
        ...analysisResults,
        overallScore: analysisResults.overallScore || 0,
        missingElements: analysisResults.missingElements || 0
      };
      
      console.log('Analysis completed successfully. Overall score:', processedResults.overallScore);
      
      // Update the plan with the new compliance score
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          compliance_score: processedResults.overallScore,
          metadata: {
            ...plan.metadata,
            missing_elements_count: processedResults.missingElements,
            last_analyzed: new Date().toISOString()
          }
        })
        .eq('id', planId);
      
      if (updateError) {
        console.error('Error updating plan with analysis results:', updateError);
        // Continue execution and just report the warning
      }
      
      // Store the analysis results in the new plan_analysis table
      const analysisData = {
        plan_id: planId,
        overall_score: processedResults.overallScore,
        missing_elements_count: processedResults.missingElements || processedResults.missingElementsList?.length || 0,
        analysis_data: processedResults,
        created_by: req.user?.id || null
      };

      console.log('Attempting to insert analysis results into plan_analysis table:', analysisData);
      
      // Store the analysis results in the new plan_analysis table
      const { data: insertedAnalysis, error: analysisError } = await supabase
        .from('plan_analysis')
        .insert(analysisData)
        .select(); // Add .select() to return the inserted record

      if (analysisError) {
        console.error('Error storing analysis results:', analysisError);
        console.error('Error details:', analysisError.details, analysisError.hint, analysisError.message);
        // Continue execution, as this is not a critical error
      } else {
        console.log('Analysis results successfully stored in plan_analysis table:', insertedAnalysis);
      }
      
      return res.status(200).json({
        success: true,
        data: processedResults
      });
    } catch (aiError) {
      console.error('AI Analysis Error:', aiError);
      console.error('Error stack:', aiError.stack);
      
      // Return a helpful error message with fallback data
      return res.status(500).json({
        success: false,
        message: 'AI analysis failed: ' + aiError.message,
        error: aiError.message,
        fallbackData: {
          overallScore: 0,
          missingElements: 0,
          missingElementsList: [],
          improvementRecommendations: []
        }
      });
    }
  } catch (error) {
    console.error('Detailed error in Gap Analysis:', error);
    console.error('Error stack:', error.stack);
    
    // Try to provide more specific error information
    let errorMessage = 'An error occurred while analyzing the plan';
    if (error.message.includes('embedding')) {
      errorMessage = 'Error generating embeddings for analysis';
    } else if (error.message.includes('parse')) {
      errorMessage = 'Error parsing AI response';
    } else if (error.message.includes('Gemini API')) {
      errorMessage = 'Error communicating with AI service';
    } else if (error.message.includes('storage')) {
      errorMessage = 'Error retrieving plan content from storage';
    }
    
    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      fallbackData: {
        overallScore: 0,
        missingElements: 0,
        missingElementsList: [],
        improvementRecommendations: []
      }
    });
  }
};

/**
 * Get the most recent analysis results for a plan
 */
exports.getAnalysisResults = async (req, res) => {
  try {
    const { planId } = req.params;
    
    if (!planId) {
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }
    
    console.log(`Fetching analysis results for plan: ${planId}`);
    
    // Get the latest analysis results from the plan_analysis table
    const { data: analysisData, error: analysisError } = await supabase
      .from('plan_analysis')
      .select('*')
      .eq('plan_id', planId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .single();
    
    if (analysisError) {
      console.error('Error fetching analysis results:', analysisError);
      
      // If no analysis found, check if the plan exists but hasn't been analyzed
      const { data: plan, error: planError } = await supabase
        .from('documents')
        .select('id, title, doc_subtype')
        .eq('id', planId)
        .eq('document_type', 'plan')
        .single();
      
      if (planError) {
        return res.status(404).json({ 
          success: false, 
          message: 'Plan not found or has not been analyzed yet' 
        });
      }
      
      // Plan exists but no analysis
      return res.status(404).json({ 
        success: false, 
        message: 'This plan has not been analyzed yet',
        plan: plan
      });
    }
    
    if (!analysisData) {
      return res.status(404).json({ 
        success: false, 
        message: 'No analysis results found for this plan' 
      });
    }
    
    // Get the plan details
    const { data: plan, error: planError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', planId)
      .single();
    
    if (planError) {
      console.error('Error fetching plan details:', planError);
      // Continue with just the analysis data
    }
    
    // Get reference documents used in the analysis
    const referencesUsed = [];
    
    if (analysisData.analysis_data && analysisData.analysis_data.referencesUsed) {
      // If references are already in the analysis data, use them
      referencesUsed.push(...analysisData.analysis_data.referencesUsed);
    } else {
      // Otherwise, try to extract references from the analysis data
      const referenceSet = new Set();
      
      // Extract references from missing elements
      if (analysisData.analysis_data.missingElementsList) {
        analysisData.analysis_data.missingElementsList.forEach(item => {
          if (item.referenceSource) {
            const refParts = item.referenceSource.split(',')[0].split(' - ')[0].trim();
            referenceSet.add(refParts);
          }
        });
      }
      
      // Extract references from recommendations
      if (analysisData.analysis_data.improvementRecommendations) {
        analysisData.analysis_data.improvementRecommendations.forEach(rec => {
          if (rec.referenceSource) {
            const refParts = rec.referenceSource.split(',')[0].split(' - ')[0].trim();
            referenceSet.add(refParts);
          }
        });
      }
      
      // Convert to array
      referenceSet.forEach(refTitle => {
        referencesUsed.push({
          title: refTitle,
          type: 'Reference Document'
        });
      });
    }
    
    // Combine plan details with analysis data
    const combinedData = {
      ...analysisData.analysis_data,
      planTitle: plan?.title || analysisData.analysis_data.planTitle || 'Untitled Plan',
      planType: plan?.doc_subtype || analysisData.analysis_data.planType || 'Unknown',
      lastAnalyzed: analysisData.analyzed_at,
      referencesUsed: referencesUsed
    };
    
    return res.status(200).json({
      success: true,
      data: combinedData
    });
  } catch (error) {
    console.error('Error in getAnalysisResults:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving analysis results',
      error: error.message
    });
  }
};

/**
 * Get the AI thinking process for an analysis
 */
exports.getAnalysisThinkingProcess = async (req, res) => {
  try {
    const { planId } = req.params;
    
    if (!planId) {
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }
    
    console.log(`Fetching thinking process for plan: ${planId}`);
    
    // Get the latest analysis results from the plan_analysis table
    const { data: analysisData, error: analysisError } = await supabase
      .from('plan_analysis')
      .select('*')
      .eq('plan_id', planId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .single();
    
    if (analysisError) {
      console.error('Error fetching analysis for thinking process:', analysisError);
      return res.status(404).json({ 
        success: false, 
        message: 'Analysis not found for this plan'
      });
    }
    
    if (!analysisData || !analysisData.analysis_data) {
      return res.status(404).json({
        success: false,
        message: 'No analysis data found for this plan'
      });
    }
    
    const analysis = analysisData.analysis_data;
    
    // Extract references used from analysis data
    const referencesUsed = analysis.referencesUsed || [];
    
    // If referencesUsed is empty, extract from references in elements
    if (referencesUsed.length === 0 && (analysis.missingElementsList || analysis.improvementRecommendations)) {
      const referenceMap = new Map();
      
      // Process missing elements
      if (analysis.missingElementsList) {
        analysis.missingElementsList.forEach(item => {
          if (item.referenceSource) {
            const parts = item.referenceSource.split(',')[0].trim();
            if (!referenceMap.has(parts)) {
              referenceMap.set(parts, { title: parts, sections: [] });
            }
          }
        });
      }
      
      // Process recommendations
      if (analysis.improvementRecommendations) {
        analysis.improvementRecommendations.forEach(rec => {
          if (rec.referenceSource) {
            const parts = rec.referenceSource.split(',')[0].trim();
            if (!referenceMap.has(parts)) {
              referenceMap.set(parts, { title: parts, sections: [] });
            }
          }
        });
      }
      
      referencesUsed.push(...referenceMap.values());
    }
    
    // Extract or calculate elements from the analysis
    const totalElements = analysis.totalElements || 0;
    const presentElements = analysis.presentElements || (totalElements - (analysis.missingElements || 0));
    const missingElements = analysis.missingElementsList || [];
    
    // Create the thinking process steps
    const thinkingProcessData = {
      steps: [
        {
          type: 'start',
          title: 'Analysis Started',
          description: `Analyzing ${analysis.planTitle || 'plan'} against reference standards`,
          timestamp: analysisData.analyzed_at
        },
        {
          type: 'reference',
          title: 'Reference Analysis',
          description: `Extracted ${totalElements} required elements from reference standards`,
          details: {
            referencesUsed: referencesUsed,
            elementCount: totalElements
          }
        },
        {
          type: 'missing',
          title: 'Missing Elements Identified',
          description: `Found ${missingElements.length} required elements missing from the plan`,
          details: {
            missingElements: missingElements.map(elem => ({
              element: elem.element,
              isCritical: elem.isCritical || false
            }))
          }
        },
        {
          type: 'calculation',
          title: 'Compliance Calculation',
          description: 'Calculated compliance score based on present and missing elements',
          details: {
            formula: '(Elements Present / Total Required Elements) × 100',
            calculation: `(${presentElements} / ${totalElements}) × 100 = ${analysis.overallScore}%`,
            classification: getComplianceClassification(analysis.overallScore)
          }
        }
      ],
      rawData: analysis
    };
    
    return res.status(200).json({
      success: true,
      data: thinkingProcessData
    });
  } catch (error) {
    console.error('Error in getAnalysisThinkingProcess:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving thinking process data',
      error: error.message
    });
  }
};

/**
 * Answer a question using the Copilot AI
 */
exports.answerQuestion = async (req, res) => {
  try {
    const { question, conversationHistory, planId } = req.body;
    
    if (!question) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }
    
    // Get relevant context from vector database based on the question
    const queryEmbedding = await createEmbedding(question);
    
    // Search for relevant reference documents
    const { data: referenceResults, error: refError } = await supabase.rpc('match_references', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5
    });
    
    if (refError) {
      console.error('Error searching reference documents:', refError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error searching knowledge base' 
      });
    }
    
    // If a specific plan was mentioned, also search that plan's content
    let planChunks = [];
    let analysisChunks = [];
    
    if (planId) {
      // Get plan content
      const { data: planResults, error: planError } = await supabase
        .from('vector_embeddings')
        .select('content, metadata')
        .eq('document_id', planId)
        .order('1 - (embedding <=> ${queryEmbedding::vector})', { ascending: true })
        .limit(3);
        
      if (!planError && planResults) {
        planChunks = planResults.map(result => ({
          content: result.content,
          title: result.metadata?.document_title || 'Current Plan',
          section: result.metadata?.section_title || '',
          type: 'Plan'
        }));
      }
      
      // Get the latest Gap Analysis results for this plan
      const { data: analysisData, error: analysisError } = await supabase
        .from('plan_analysis')
        .select('*')
        .eq('plan_id', planId)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .single();
        
      if (!analysisError && analysisData && analysisData.analysis_data) {
        // Create chunks from analysis data
        const analysis = analysisData.analysis_data;
        
        // Add overall score information
        analysisChunks.push({
          content: `This plan has an overall compliance score of ${analysis.overallScore}%. This score was calculated on ${new Date(analysisData.analyzed_at).toLocaleDateString()}.`,
          title: 'Compliance Analysis',
          section: 'Overall Score',
          type: 'Analysis'
        });
        
        // Add critical gaps information if available
        if (analysis.missingElementsList && analysis.missingElementsList.length > 0) {
          const criticalGaps = analysis.missingElementsList
            .filter(item => item.isCritical)
            .map(item => `- ${item.element || item.description}: ${item.description || ''} (Source: ${item.referenceSource || 'Reference Standards'})`)
            .join('\n');
            
          if (criticalGaps) {
            analysisChunks.push({
              content: `Critical gaps identified in the plan:\n${criticalGaps}`,
              title: 'Compliance Analysis',
              section: 'Critical Gaps',
              type: 'Analysis'
            });
          }
        }
        
        // Add recommendations information if available
        if (analysis.improvementRecommendations && analysis.improvementRecommendations.length > 0) {
          const recommendations = analysis.improvementRecommendations
            .slice(0, 5) // Limit to top 5 recommendations
            .map(rec => `- ${rec.text || rec.recommendedChange}: ${rec.section ? `[${rec.section}] ` : ''}(Importance: ${rec.importance || 'medium'})`)
            .join('\n');
            
          analysisChunks.push({
            content: `Top recommendations for improving the plan:\n${recommendations}`,
            title: 'Compliance Analysis',
            section: 'Recommendations',
            type: 'Analysis'
          });
        }
      }
    }
    
    // Combine reference, plan and analysis chunks for context
    const contextChunks = [
      ...referenceResults.map(result => ({
        content: result.content,
        title: result.metadata?.document_title || '',
        section: result.metadata?.section_title || '',
        type: 'Reference'
      })),
      ...planChunks,
      ...analysisChunks
    ];
    
    // Prepare user context with plan information
    const userContext = {
      planId,
      hasGapAnalysis: analysisChunks.length > 0
    };
    
    // Get response from Copilot AI
    const answer = await copilotAI.answerQuestion(
      question, 
      contextChunks, 
      conversationHistory,
      userContext
    );
    
    return res.status(200).json({
      success: true,
      data: answer
    });
  } catch (error) {
    console.error('Error in Copilot AI controller:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing your question',
      error: error.message
    });
  }
};

/**
 * Explain a concept or section from a reference document
 */
exports.explainConcept = async (req, res) => {
  try {
    const { concept, referenceId } = req.body;
    
    if (!concept) {
      return res.status(400).json({ 
        success: false, 
        message: 'Concept is required' 
      });
    }
    
    // Get reference document if ID is provided
    let reference = null;
    if (referenceId) {
      const { data: refData, error: refError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', referenceId)
        .eq('document_type', 'reference')
        .single();
        
      if (!refError && refData) {
        reference = refData;
      }
    }
    
    // Get explanation from Copilot AI
    const explanation = await copilotAI.explainConcept(reference, concept);
    
    return res.status(200).json({
      success: true,
      data: explanation
    });
  } catch (error) {
    console.error('Error explaining concept:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while explaining the concept',
      error: error.message
    });
  }
};

// Helper function to get compliance classification based on score
function getComplianceClassification(score) {
  if (score >= 71) return 'Strong Compliance (71-100% range)';
  if (score >= 41) return 'Moderate Compliance (41-70% range)';
  return 'Significant Improvements Needed (0-40% range)';
}

module.exports = exports;