/**
 * Quality Evaluator
 * 
 * This module evaluates the quality of requirement implementation in plans.
 * It analyzes language clarity, specificity, and actionability, and suggests improvements.
 */

const { getGeminiResponse, getTextFromGeminiResponse } = require('./gemini');

class QualityEvaluator {
  constructor() {
    // No need to instantiate anything since we'll use the functions directly
  }

  /**
   * Evaluate the quality of requirement implementation
   * @param {object} params - Parameters containing plan_content and requirements
   * @returns {Promise<Array>} - Array of quality evaluation results
   */
  async evaluateQuality(params) {
    const { plan_content, requirements } = params;
    
    if (!plan_content) {
      throw new Error('Plan content is required');
    }
    
    if (!requirements || !Array.isArray(requirements) || requirements.length === 0) {
      return [];
    }
    
    try {
      console.log(`Evaluating quality for ${requirements.length} requirements`);
      
      // Format requirements for the AI prompt
      const formattedRequirements = requirements.map((req, index) => {
        return `Requirement ${index + 1}: ${req.requirement_id}
        Text: ${req.requirement_text || 'Unknown requirement'}
        Evidence: ${req.evidence || 'No evidence provided'}
        Location: ${req.location || 'Unknown location'}`;
      }).join('\n\n');
      
      // Build the quality evaluation prompt
      const qualityPrompt = `
        You are an expert in emergency management planning and regulatory writing.
        Your task is to evaluate the quality of implementation for requirements found in an emergency plan.
        
        Plan content:
        ${plan_content}
        
        Requirements found present in the plan:
        ${formattedRequirements}
        
        For each requirement, evaluate:
        1. Clarity of language (clear/unclear)
        2. Specificity (specific/vague)
        3. Actionability (actionable/non-actionable)
        4. Overall quality rating (poor/adequate/excellent)
        5. Specific issues with the implementation
        6. Suggested improvements to the wording
        
        Focus on how well the plan implements each requirement, not just whether it's present.
        
        Return your evaluation as a JSON array with the following structure:
        [
          {
            "requirement_id": "The ID of the requirement",
            "quality_rating": "poor/adequate/excellent",
            "issues": ["Issue 1", "Issue 2", ...],
            "suggestions": ["Suggested improvement 1", "Suggested improvement 2", ...]
          }
        ]
      `;
      
      // Call the AI to evaluate quality
      const aiResponse = await getGeminiResponse(qualityPrompt);
      
      // Parse the AI response
      const qualityResults = this.parseAIResponse(aiResponse);
      
      // Ensure results for all requirements
      const completeResults = this.ensureCompleteResults(qualityResults, requirements);
      
      console.log(`Completed quality evaluation for ${requirements.length} requirements`);
      
      return completeResults;
    } catch (error) {
      console.error('Error evaluating quality:', error);
      throw error;
    }
  }

  /**
   * Parse the AI response to extract quality evaluation results
   * @param {string} aiResponse - Response from the AI
   * @returns {Array} - Parsed quality results
   */
  parseAIResponse(aiResponse) {
    try {
      // Get the text content from the Gemini response
      const responseText = getTextFromGeminiResponse(aiResponse);
      
      // First, try to parse as JSON directly
      try {
        return JSON.parse(responseText);
      } catch (e) {
        // If direct parsing fails, try to extract JSON from text
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        
        // If all parsing attempts fail, return empty array
        console.warn('Could not parse AI response as JSON:', responseText);
        return [];
      }
    } catch (error) {
      console.error('Error parsing quality evaluation response:', error);
      return [];
    }
  }

  /**
   * Ensure we have results for all requirements
   * @param {Array} results - Quality results from AI
   * @param {Array} requirements - Original requirements
   * @returns {Array} - Complete results for all requirements
   */
  ensureCompleteResults(results, requirements) {
    const completeResults = [];
    const resultMap = new Map(results.map(r => [r.requirement_id, r]));
    
    // Ensure we have a result for each requirement
    for (const req of requirements) {
      const reqId = req.requirement_id;
      
      if (resultMap.has(reqId)) {
        completeResults.push(resultMap.get(reqId));
      } else {
        // Add default result if missing
        completeResults.push({
          requirement_id: reqId,
          quality_rating: "adequate", // Default rating
          issues: ["No specific issues identified"],
          suggestions: ["No specific improvements suggested"]
        });
      }
    }
    
    return completeResults;
  }
}

module.exports = QualityEvaluator;