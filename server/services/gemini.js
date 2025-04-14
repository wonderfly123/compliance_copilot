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

// ===== GAP ANALYSIS AI FUNCTIONALITY =====

/**
 * GapAnalysisAI - Specialized class for analyzing emergency plans against standards
 * This AI performs compliance checking and produces metrics output
 */
class GapAnalysisAI {
  /**
   * Analyze a plan against reference standards
   * @param {string} planContent - The content of the plan to analyze
   * @param {Array} referenceStandards - Array of reference standard chunks to compare against
   * @param {string} planType - Type of plan (EOP, HMP, COOP, etc.)
   * @returns {Promise<Object>} - Analysis results with compliance findings
   */
  async analyzePlan(planContent, referenceStandards, planType) {
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
      const responseText = response.text();
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
    
    // Group chunks by source document for better context
    const documentGroups = {};
    
    contextChunks.forEach(chunk => {
      const docTitle = chunk.title || 'Unknown Document';
      if (!documentGroups[docTitle]) {
        documentGroups[docTitle] = [];
      }
      documentGroups[docTitle].push({
        content: chunk.content,
        section: chunk.section || 'General',
        type: chunk.type || 'Document'
      });
    });
    
    // Format each document group
    const formattedGroups = Object.entries(documentGroups).map(([title, chunks]) => {
      const chunksText = chunks.map(chunk => 
        `Section: ${chunk.section}\nContent: ${chunk.content.trim()}`
      ).join('\n\n');
      
      return `DOCUMENT: ${title} (${chunks[0].type})\n${chunksText}`;
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
    try {
      // Format the conversation history - limit to last 10 messages for context window management
      const recentHistory = conversationHistory.slice(-10);
      const formattedHistory = recentHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      
      // Format the context chunks with enhanced metadata
      const contextText = this.formatContextChunks(contextChunks);
      
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
          2. If you don't know the answer, admit that you don't know rather than making something up.
          3. Keep responses concise and directly answer the user's question.
          4. When referencing plan sections, be specific about which section you're referring to.
          5. If the user is asking about compliance, reference the specific standard.
          6. Use formatting (bold, bullet points) to highlight key information.
          
          ## Response Format:
          - Be concise but thorough
          - Start with a direct answer to the question
          - Back up your answer with specific references when possible
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
      
      // Generate the response
      const response = await getGeminiResponse(chatHistory, {
        temperature: 0.4, // Lower temperature for more factual responses
        maxTokens: 2048,
      });
      
      const responseText = response.text();
      
      // Extract references from the response
      const references = this.extractReferences(responseText, contextChunks);
      
      return {
        text: responseText,
        references
      };
    } catch (error) {
      console.error('Error in Copilot AI:', error);
      throw new Error('Failed to generate response from Copilot AI');
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
    
    // Match mentioned sources to context chunks
    mentionedSources.forEach(source => {
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
  getGeminiResponse,  // Base function
  gapAnalysisAI,      // Gap Analysis AI instance
  copilotAI,          // Copilot AI instance
};