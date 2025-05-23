// server/services/gemini.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Google Generative AI client
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Base function to get a response from Gemini
 * @param {string|array} prompt - The prompt or conversation to send to Gemini
 * @param {Object} options - Additional options for the model
 * @returns {Promise<Object>} - The generated response
 */
const getGeminiResponse = async (prompt, options = {}) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: options.modelName || "gemini-2.0-flash"
    });
    
    const generationConfig = {
      temperature: options.temperature || 0.7,
      topK: options.topK || 40,
      topP: options.topP || 0.95,
      maxOutputTokens: options.maxTokens || 8192,
    };
    
    // Handle both text-only prompts and conversation format
    let result;
    if (typeof prompt === 'string') {
      result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      });
    } else {
      result = await model.generateContent({
        contents: prompt,
        generationConfig,
      });
    }

    return result.response;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error('Failed to get response from AI service');
  }
};

/**
 * Helper function to get the text content from a Gemini response
 * @param {Object} response - The Gemini API response
 * @returns {string} - The extracted text
 */
const getTextFromGeminiResponse = (response) => {
  if (!response) return '';
  
  try {
    return response.text();
  } catch (error) {
    console.error('Error extracting text from Gemini response:', error);
    return '';
  }
};

// ===== GAP ANALYSIS AI FUNCTIONALITY =====

/**
 * GapAnalysisAI - Specialized class for analyzing emergency plans against standards
 * This AI performs compliance checking and produces metrics output
 */
class GapAnalysisAI {
  constructor() {
    // Initialize with null, will be set when needed
    this.orchestrator = null;
  }

  /**
   * Get the GapAnalysisOrchestrator instance
   * This is lazy-loaded to avoid circular dependencies
   * @returns {Object} - The orchestrator instance
   */
  getOrchestrator() {
    if (!this.orchestrator) {
      // Require here to avoid circular dependencies
      const GapAnalysisOrchestrator = require('./gapAnalysisOrchestrator');
      // Create a new instance of the orchestrator
      this.orchestrator = new GapAnalysisOrchestrator();
    }
    return this.orchestrator;
  }

  /**
   * Analyze a plan against reference standards
   * @param {string} planContent - The content of the plan to analyze
   * @param {Array} referenceStandards - Array of reference standard chunks to compare against
   * @param {string} planType - Type of plan (EOP, HMP, COOP, etc.)
   * @param {string} planId - ID of the plan being analyzed (optional)
   * @returns {Promise<Object>} - Analysis results with compliance findings
   */
  async analyzePlan(planContent, referenceStandards, planType, planId = null) {
    console.log('Using enhanced multi-agent analysis system');
    
    try {
      // Using the new multi-agent architecture through the orchestrator
      // First, we need to determine which reference IDs to use
      // For now, we have to extract them from the chunks
      const referenceIds = [...new Set(referenceStandards.map(ref => ref.reference_id))];
      
      // Use the provided plan ID or a temporary one
      const actualPlanId = planId || 'temporary-plan-id';
      
      // Call the orchestrator's analyze method
      const result = await this.getOrchestrator().orchestrateAnalysis(
        "analyze_plan", 
        {
          plan_content: planContent,
          reference_ids: referenceIds,
          plan_type: planType,
          plan_id: actualPlanId
        }
      );
      
      // Convert the result to match the expected format from the old implementation
      // This ensures backward compatibility with the rest of the application
      return this.convertToLegacyFormat(result.report);
    } catch (error) {
      console.error('Error in enhanced Gap Analysis:', error);
      
      // Fall back to the legacy method if the enhanced system fails
      console.log('Falling back to legacy analysis method');
      return this.legacyAnalyzePlan(planContent, referenceStandards, planType);
    }
  }
  
  /**
   * Legacy implementation for backward compatibility
   * @param {string} planContent - The content of the plan to analyze
   * @param {Array} referenceStandards - Array of reference standard chunks to compare against
   * @param {string} planType - Type of plan (EOP, HMP, COOP, etc.)
   * @returns {Promise<Object>} - Analysis results with compliance findings
   */
  async legacyAnalyzePlan(planContent, referenceStandards, planType) {
    const referencesText = referenceStandards.map(ref => 
      `Reference ID: ${ref.reference_id}\nSection: ${ref.chunk_text}`
    ).join('\n\n');
    
    const systemPrompt = `
      You are an AI expert in emergency management plans analysis.
      Your task is to analyze an emergency plan against reference standards for compliance.
      
      The plan type is: ${planType}
      
      Follow this analysis process:
      1. Extract the required elements for this plan type from the reference standards
      2. Check if each required element is present in the plan
      3. Count how many required elements are present vs. missing
      4. Calculate a compliance score: (Number of items present / Total required items) × 100
      
      Format your response as JSON with the following structure:
      {
        "overallScore": number,                  // Overall compliance score (0-100)
        "totalElements": number,                 // Total elements checked
        "presentElements": number,               // Elements found in the plan
        "missingElements": number,               // Elements missing from the plan
        "missingElementsList": [                 // List of missing elements
          {
            "element": "Element name",
            "description": "What is missing and what needs to be added",
            "isCritical": boolean,               // Whether this is a critical missing element
            "referenceSource": "Reference document and section"
          }
        ],
        "improvementRecommendations": [          // Recommendations for existing text
          {
            "section": "Section name",
            "text": "Brief recommendation summary",
            "currentText": "The current text in the plan (brief excerpt)",
            "recommendedChange": "Detailed recommendation on how to improve this text",
            "importance": "high|medium|low",     // Priority level of this recommendation
            "referenceSource": "Reference document and section"
          }
        ],
        "referencesUsed": [                     // List of references used in the analysis
          {
            "title": "Title of reference document",
            "type": "Type of reference (standard, guideline, etc.)",
            "sections": ["Specific sections of the reference used"]
          }
        ],
        "analysisReasoning": {                 // Document your thinking process
          "referencesAnalysis": "How you analyzed and extracted requirements from references",
          "planEvaluation": "How you evaluated the plan against these requirements",
          "prioritization": "How you determined the importance of recommendations",
          "scoringMethod": "Details on how you calculated the compliance score"
        }
      }

      Important:
      - Make sure all required JSON fields are included
      - Identify the most critical missing elements and mark them as isCritical: true
      - Extract specific text from the plan for each recommendation
      - Explicitly include which reference documents were used in the analysis in the referencesUsed section
      - Provide detailed, actionable recommendations
      
      Importance Level Criteria:
      - HIGH: Elements directly related to life safety, critical functionality, regulatory compliance, 
        or essential requirements without which the plan would fail in an emergency. All missing elements 
        that are marked as isCritical: true must be assigned high importance.
      - MEDIUM: Important elements that should be addressed to improve the plan but aren't immediately critical
        to operations. These are standard requirements that would enhance the plan's effectiveness.
      - LOW: Minor improvements, optimizations, best practices that exceed minimum requirements, or 
        enhancements that would be beneficial but aren't strictly required.
    `;
    
    const fullPrompt = `${systemPrompt}\n\nREFERENCE STANDARDS:\n${referencesText}\n\nPLAN CONTENT TO ANALYZE:\n${planContent}`;
    
    try {
      const response = await getGeminiResponse(fullPrompt, { 
        temperature: 0.2,
        maxTokens: 8192
      });
      
      // Extract the JSON part from the response
      const responseText = getTextFromGeminiResponse(response);
      console.log('Raw AI response:', responseText);
      
      // Try multiple approaches to extract JSON
      let analysisData;
      try {
        // Method 1: Look for JSON code block
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          analysisData = JSON.parse(jsonMatch[1]);
        } 
        // Method 2: Look for any JSON object in the response
        else if (responseText.includes('{') && responseText.includes('}')) {
          const jsonPart = responseText.substring(
            responseText.indexOf('{'),
            responseText.lastIndexOf('}') + 1
          );
          analysisData = JSON.parse(jsonPart);
        }
        // Method 3: If the whole response is JSON
        else {
          analysisData = JSON.parse(responseText);
        }
        
        // Ensure all required properties exist for the UI
        if (!analysisData.missingElementsList) analysisData.missingElementsList = [];
        if (!analysisData.improvementRecommendations) analysisData.improvementRecommendations = [];
        
        // Add referencesUsed if not present
        if (!analysisData.referencesUsed) {
          // Extract references from missing elements and recommendations
          const referenceSet = new Map();
          
          // Process missing elements
          analysisData.missingElementsList.forEach(item => {
            if (item.referenceSource) {
              const parts = item.referenceSource.split(',')[0].trim().split(' - ');
              const title = parts[0].trim();
              const section = parts.length > 1 ? parts[1].trim() : '';
              
              if (!referenceSet.has(title)) {
                referenceSet.set(title, { title, type: 'Reference', sections: [] });
              }
              
              if (section && !referenceSet.get(title).sections.includes(section)) {
                referenceSet.get(title).sections.push(section);
              }
            }
          });
          
          // Process recommendations
          if (analysisData.improvementRecommendations) {
            analysisData.improvementRecommendations.forEach(rec => {
              if (rec.referenceSource) {
                const parts = rec.referenceSource.split(',')[0].trim().split(' - ');
                const title = parts[0].trim();
                const section = parts.length > 1 ? parts[1].trim() : '';
                
                if (!referenceSet.has(title)) {
                  referenceSet.set(title, { title, type: 'Reference', sections: [] });
                }
                
                if (section && !referenceSet.get(title).sections.includes(section)) {
                  referenceSet.get(title).sections.push(section);
                }
              }
            });
          }
          
          analysisData.referencesUsed = Array.from(referenceSet.values());
        }
        
        // Count critical sections
        analysisData.criticalSections = analysisData.missingElementsList.filter(item => item.isCritical).length;
        
        // Set the missing elements count
        analysisData.missing_elements_count = analysisData.missingElements || analysisData.missingElementsList.length;
        
        // Support legacy fields for backward compatibility
        if (!analysisData.criticalGaps) analysisData.criticalGaps = [];
        if (!analysisData.recommendations) analysisData.recommendations = [];
        if (!analysisData.sectionScores) analysisData.sectionScores = [];
        if (!analysisData.criticalGaps_count) {
          analysisData.criticalGaps_count = analysisData.criticalGaps.length;
        }
        analysisData.criticalSections = analysisData.criticalSections || analysisData.criticalGaps_count;
        
        console.log('Processed analysis data with references:', analysisData.referencesUsed);
        return analysisData;
      } catch (parseError) {
        console.error('Error parsing AI response as JSON:', parseError);
        console.error('Response text:', responseText);
        throw new Error('Failed to parse AI analysis results');
      }
    } catch (error) {
      console.error('Error in Gap Analysis AI:', error);
      throw new Error('Failed to analyze plan with Gap Analysis AI');
    }
  }
  
  /**
   * Convert the multi-agent report to the legacy format
   * @param {Object} report - The report from the orchestrator
   * @returns {Object} - Analysis data in the legacy format
   */
  convertToLegacyFormat(report) {
    // Create a structure that matches the expected format from the old implementation
    try {
      const legacyFormat = {
        overallScore: report.overall_compliance_score,
        totalElements: report.summary.total_requirements,
        presentElements: report.summary.requirements_present,
        missingElements: report.summary.requirements_missing,
        missing_elements_count: report.summary.requirements_missing,
        
        // Convert missing requirements to the expected format
        missingElementsList: report.missing_requirements.map(item => ({
          element: item.text.substring(0, 50) + (item.text.length > 50 ? '...' : ''),
          description: item.text,
          isCritical: item.importance === 'critical',
          referenceSource: `Reference Document - ${item.section}`
        })),
        
        // Convert improvement suggestions to the expected format
        improvementRecommendations: report.improvement_suggestions.map(item => ({
          section: item.requirement_text.substring(0, 30) + (item.requirement_text.length > 30 ? '...' : ''),
          text: item.suggestions[0] || 'Improve language quality',
          currentText: item.requirement_text,
          recommendedChange: item.suggestions.join('; '),
          importance: item.quality_rating === 'poor' ? 'high' : item.quality_rating === 'adequate' ? 'medium' : 'low',
          referenceSource: `Quality Evaluation - ${item.requirement_id}`
        })),
        
        // Create references used section
        referencesUsed: [
          {
            title: "Enhanced Requirements Analysis",
            type: "Multi-agent compliance analysis",
            sections: Object.keys(report.section_scores || {})
          }
        ],
        
        // Add thinking process explanation
        analysisReasoning: {
          referencesAnalysis: "Requirements were extracted from reference documents and structured by section and importance.",
          planEvaluation: "Each requirement was individually checked for presence and quality of implementation.",
          prioritization: "Requirements were prioritized based on their importance classification (critical, important, recommended).",
          scoringMethod: "Compliance score calculated as percentage of requirements present. Quality score calculated based on language clarity, specificity, and actionability."
        },
        
        // Support for UI elements
        sectionScores: Object.entries(report.section_scores || {}).map(([section, scores]) => ({
          section: section,
          score: scores.compliance,
          items: scores.requirements_total,
          missing: scores.requirements_total - scores.requirements_present
        })),
        
        // Legacy fields
        criticalGaps: [],
        criticalGaps_count: report.missing_requirements.filter(item => item.importance === 'critical').length,
        criticalSections: report.missing_requirements.filter(item => item.importance === 'critical').length,
        recommendations: []
      };
      
      return legacyFormat;
    } catch (error) {
      console.error('Error converting to legacy format:', error);
      throw new Error('Failed to convert multi-agent analysis to legacy format');
    }
  }
}

// ===== COPILOT AI FUNCTIONALITY =====

/**
 * CopilotAI - Specialized class for interactive assistance
 * This AI provides conversational responses to user queries about emergency management
 */
class CopilotAI {
  /**
   * Format the context chunks for better reference handling
   * @param {Array} contextChunks - Array of relevant document chunks
   * @returns {string} - Formatted context text
   */
  formatContextChunks(contextChunks = []) {
    if (!contextChunks || contextChunks.length === 0) {
      return "No specific reference documents available.";
    }
    
    // Group chunks by source document and type for better context
    const documentGroups = {};
    
    contextChunks.forEach(chunk => {
      const docTitle = chunk.title || 'Unknown Document';
      const docType = chunk.type || 'Document';
      
      // Create a unique key that includes both title and type
      const groupKey = `${docTitle}__${docType}`;
      
      if (!documentGroups[groupKey]) {
        documentGroups[groupKey] = [];
      }
      
      documentGroups[groupKey].push({
        content: chunk.content,
        section: chunk.section || 'General',
        type: docType
      });
    });
    
    // Format each document group based on type
    const formattedGroups = Object.entries(documentGroups).map(([groupKey, chunks]) => {
      const [title, type] = groupKey.split('__');
      
      // Handle different types of content differently
      if (type === 'Analysis') {
        // For analysis data, format differently
        const chunksText = chunks.map(chunk => 
          `${chunk.section}:\n${chunk.content.trim()}`
        ).join('\n\n');
        
        return `COMPLIANCE ANALYSIS: ${title}\n${chunksText}`;
      } else {
        // For regular documents and references
        const chunksText = chunks.map(chunk => 
          `Section: ${chunk.section}\nContent: ${chunk.content.trim()}`
        ).join('\n\n');
        
        return `DOCUMENT: ${title} (${type})\n${chunksText}`;
      }
    });
    
    return formattedGroups.join('\n\n---\n\n');
  }

  /**
   * Answer a question with contextual information
   * @param {string} question - The user's question
   * @param {Array} contextChunks - Relevant document chunks from vector search
   * @param {Array} conversationHistory - Previous messages in the conversation
   * @param {Object} userContext - Information about user's current context (page, selected plan, etc.)
   * @returns {Promise<Object>} - The assistant's response with references and suggested actions
   */
  async answerQuestion(question, contextChunks = [], conversationHistory = [], userContext = {}) {
    const startTime = Date.now();
    console.log(`[COPILOT] Processing question: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`);
    console.log(`[COPILOT] Context chunks: ${contextChunks.length} chunks provided`);
    console.log(`[COPILOT] Conversation history: ${conversationHistory.length} previous messages`);
    
    try {
      // Format the conversation history - limit to last 10 messages for context window management
      const recentHistory = conversationHistory.slice(-10);
      const formattedHistory = recentHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      
      console.log(`[COPILOT] Formatted ${recentHistory.length} recent conversation messages`);
      
      // Format the context chunks with enhanced metadata
      const contextText = this.formatContextChunks(contextChunks);
      console.log(`[COPILOT] Formatted context text (${contextText.length} characters)`);
      
      if (contextChunks.length > 0) {
        // Log the titles of the reference chunks being used
        const contextSources = contextChunks.map(chunk => 
          `${chunk.type || 'Unknown'}: ${chunk.title || 'Untitled'}${chunk.section ? ` - ${chunk.section}` : ''}`
        );
        console.log(`[COPILOT] Using the following sources:\n- ${contextSources.join('\n- ')}`);
      } else {
        console.log(`[COPILOT] No specific context chunks available for this question`);
      }
      
      // Create the system prompt with enhanced instructions
      const systemPrompt = {
        role: "model",
        parts: [{
          text: `You are Revali Assistant, an AI copilot for emergency management professionals. 
          You help users understand compliance requirements, analyze emergency plans, and provide guidance 
          on emergency management best practices.
          
          ## Knowledge Base:
          Use the following reference information to answer the user's questions.
          If the reference information doesn't cover the question, you can provide general emergency management
          guidance based on common standards like FEMA CPG 101, NFPA 1600, and NIMS.
          
          ${contextText}
          
          ## Guidelines for Response:
          1. Always cite your sources when using information from the references using [Source Name] format.
          2. If there is compliance analysis information available, prioritize including that in your response.
          3. If you don't know the answer, admit that you don't know rather than making something up.
          4. Keep responses concise and directly answer the user's question.
          5. When referencing plan sections, be specific about which section you're referring to.
          6. If the user is asking about compliance, reference both the specific standard and the compliance analysis if available.
          7. Use formatting (bold, bullet points) to highlight key information.
          8. When discussing compliance scores or critical gaps, always mention the source as [Compliance Analysis].
          
          ## Response Format:
          - Be concise but thorough
          - Start with a direct answer to the question
          - Back up your answer with specific references when possible
          - If analysis data is available and the question is about plan quality, compliance, or recommendations, 
            prioritize sharing that information
          `
        }]
      };
      
      // Build the complete chat history including system prompt
      const chatHistory = [systemPrompt, ...formattedHistory];
      
      // Add the user's current question
      chatHistory.push({
        role: "user",
        parts: [{ text: question }]
      });
      
      console.log(`[COPILOT] Sending request to Gemini API with ${chatHistory.length} messages`);
      console.log(`[COPILOT] Question tokens (approximate): ${question.length / 4} tokens`);
      console.log(`[COPILOT] Context tokens (approximate): ${contextText.length / 4} tokens`);
      
      try {
        // Generate the response
        const response = await getGeminiResponse(chatHistory, {
          temperature: 0.4, // Lower temperature for more factual responses
          maxTokens: 2048,
        });
        
        const responseText = response.text();
        console.log(`[COPILOT] Response received from Gemini API (${responseText.length} characters)`);
        console.log(`[COPILOT] Response text sample: "${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}"`);
        
        // Extract references from the response
        const references = this.extractReferences(responseText, contextChunks);
        console.log(`[COPILOT] Extracted ${references.length} references from response`);
        
        const elapsedTime = Date.now() - startTime;
        console.log(`[COPILOT] Total processing time: ${elapsedTime}ms`);
        
        return {
          text: responseText,
          references,
          processingTimeMs: elapsedTime
        };
      } catch (geminiError) {
        console.error(`[COPILOT] Gemini API Error: ${geminiError.message}`, geminiError);
        
        if (geminiError.message.includes('quota')) {
          console.error('[COPILOT] API quota exceeded');
          throw new Error('AI service quota exceeded. Please try again later.');
        }
        
        if (geminiError.message.includes('content filtered') || geminiError.message.includes('blocked')) {
          console.error('[COPILOT] Content filtering triggered');
          throw new Error('Your question was flagged by our content filter. Please rephrase and try again.');
        }
        
        throw geminiError;
      }
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      console.error(`[COPILOT] Error after ${elapsedTime}ms:`, error);
      console.error(`[COPILOT] Error stack:`, error.stack);
      
      // Create a more informative error message based on the error type
      let errorMessage = 'Failed to generate response from Copilot AI';
      
      if (error.message.includes('network') || error.message.includes('connection')) {
        errorMessage = 'Network error connecting to AI service. Please check your connection and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'AI service request timed out. Please try a simpler question or try again later.';
      } else if (error.message.includes('quota')) {
        errorMessage = 'AI service quota exceeded. Please try again later.';
      } else if (error.message.includes('content filtered') || error.message.includes('blocked')) {
        errorMessage = 'Your question was flagged by our content filter. Please rephrase and try again.';
      }
      
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Extract reference sources mentioned in the response
   * @param {string} text - The response text
   * @param {Array} contextChunks - The context chunks used for the response
   * @returns {Array} - Extracted references
   */
  extractReferences(text, contextChunks) {
    const references = [];
    const mentionedSources = new Set();
    
    // Look for citations in the text like "[Source]" format
    const citationBracketPattern = /\[([\w\s\d-]+)\]/g;
    let match;
    while ((match = citationBracketPattern.exec(text)) !== null) {
      const source = match[1].trim();
      mentionedSources.add(source);
    }
    
    // Also look for other citation patterns
    const citationPatterns = [
      /according to ([\w\s\d-]+)/gi,
      /as stated in ([\w\s\d-]+)/gi,
      /from ([\w\s\d-]+) guideline/gi,
      /in ([\w\s\d-]+), it states/gi,
      /based on ([\w\s\d-]+)/gi,
      /reference: ([\w\s\d-]+)/gi
    ];
    
    citationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const source = match[1].trim();
        mentionedSources.add(source);
      }
    });
    
    // Look for explicit references at the end of the message
    const referencesSection = text.match(/references?:?\s*([\s\S]+)$/i);
    if (referencesSection) {
      const refText = referencesSection[1];
      const refLines = refText.split('\n');
      
      refLines.forEach(line => {
        if (line.trim()) {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const source = parts[0].trim();
            mentionedSources.add(source);
          }
        }
      });
    }
    
    // Check for compliance analysis mentions
    if (text.toLowerCase().includes('compliance analysis') || 
        text.toLowerCase().includes('analysis shows') ||
        text.toLowerCase().includes('according to the analysis') ||
        text.toLowerCase().includes('compliance score')) {
      mentionedSources.add('Compliance Analysis');
    }
    
    // Match mentioned sources to context chunks
    mentionedSources.forEach(source => {
      // Special handling for Compliance Analysis
      if (source === 'Compliance Analysis') {
        const analysisChunks = contextChunks.filter(chunk => 
          chunk.type && chunk.type.toLowerCase() === 'analysis'
        );
        
        if (analysisChunks.length > 0) {
          // Add unique analysis references
          references.push({
            title: 'Compliance Analysis',
            section: 'Gap Analysis Results',
            type: 'Analysis'
          });
        }
        return;
      }
      
      const matchingChunks = contextChunks.filter(chunk => {
        // Check if source name appears in chunk title or type
        return (chunk.title && chunk.title.toLowerCase().includes(source.toLowerCase())) ||
               (chunk.type && chunk.type.toLowerCase().includes(source.toLowerCase()));
      });
      
      if (matchingChunks.length > 0) {
        // Add unique references
        matchingChunks.forEach(chunk => {
          if (!references.some(ref => ref.title === chunk.title && ref.section === chunk.section)) {
            references.push({
              title: chunk.title || 'Reference Document',
              section: chunk.section || '',
              type: chunk.type || 'Document'
            });
          }
        });
      } else {
        // If no exact match, add as generic reference
        if (!references.some(ref => ref.title === source)) {
          references.push({
            title: source,
            section: '',
            type: 'Referenced Source'
          });
        }
      }
    });
    
    return references;
  }
  
  /**
   * Explain a concept or section from a reference document
   * @param {Object} reference - Reference document information  
   * @param {string} concept - Concept or section to explain
   * @returns {Promise<Object>} - Detailed explanation
   */
  async explainConcept(reference, concept) {
    // Create a prompt that asks for an explanation of the concept
    const prompt = `
      You are Revali Assistant, an AI expert in emergency management.
      Explain the following concept as it relates to emergency management:
      
      Concept: ${concept}
      ${reference ? `Reference Document: ${reference.title}` : ''}
      ${reference ? `Reference Type: ${reference.doc_subtype}` : ''}
      
      Provide a clear, concise explanation that would be helpful for an emergency management professional.
      Include specific information from the reference document if available.
      Limit your explanation to around 200 words.
    `;
    
    try {
      const response = await getGeminiResponse(prompt, { 
        temperature: 0.3, // Lower temperature for more factual responses
        maxTokens: 1024
      });
      
      return {
        text: response.text(),
        concept: concept,
        reference: reference ? reference.title : null
      };
    } catch (error) {
      console.error('Error explaining concept:', error);
      throw new Error('Failed to generate concept explanation');
    }
  }
}

// Create instances of the specialized AI classes
const gapAnalysisAI = new GapAnalysisAI();
const copilotAI = new CopilotAI();

module.exports = {
  getGeminiResponse,          // Base function
  getTextFromGeminiResponse,  // Helper function
  gapAnalysisAI,              // Gap Analysis AI instance
  copilotAI,                  // Copilot AI instance
};