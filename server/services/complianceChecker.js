/**
 * Compliance Checker
 * 
 * This module checks if specific requirements are present in emergency plans.
 * It analyzes plan content against requirements and identifies evidence.
 */

const { getGeminiResponse, getTextFromGeminiResponse } = require('./gemini');

class ComplianceChecker {
  constructor() {
    // No need to instantiate anything since we'll use the functions directly
  }

  /**
   * Check if requirements are present in a plan
   * @param {object} params - Parameters containing plan_content and requirements
   * @returns {Promise<Array>} - Array of compliance results
   */
  async checkCompliance(params) {
    const { plan_content, requirements } = params;
    
    if (!plan_content) {
      throw new Error('Plan content is required');
    }
    
    if (!requirements || !Array.isArray(requirements) || requirements.length === 0) {
      return [];
    }
    
    try {
      console.log(`Checking compliance for ${requirements.length} requirements`);
      
      // Format requirements for the AI prompt
      const formattedRequirements = requirements.map((req, index) => {
        return `Requirement ${index + 1}: ${req.text} [ID: ${req.id}]`;
      }).join('\n\n');
      
      // Build the compliance check prompt
      const compliancePrompt = `
        You are an expert in emergency management and compliance assessment.
        Your task is to determine whether specific requirements are present in an emergency plan.
        
        Plan content:
        ${plan_content}
        
        Requirements to check:
        ${formattedRequirements}
        
        For each requirement, determine:
        1. Whether it is present in the plan (yes/no)
        2. If present, where in the plan it's found (section/paragraph)
        3. The exact text evidence from the plan that satisfies the requirement
        
        When evaluating presence:
        - The plan must explicitly address the requirement (not just mention related topics)
        - Partial implementation still counts as present, but note this in your evaluation
        - Be thorough - search the entire document for evidence
        
        Return your assessment as a JSON array with the following structure:
        [
          {
            "requirement_id": "The ID of the requirement",
            "isPresent": true/false,
            "location": "Where in the plan it's found (if present)",
            "evidence": "The exact text evidence from the plan (if present)"
          }
        ]
      `;
      
      // Call the AI to check compliance
      const aiResponse = await getGeminiResponse(compliancePrompt);
      
      // Parse the AI response
      const complianceResults = this.parseAIResponse(aiResponse);
      
      // Ensure results for all requirements
      const completeResults = this.ensureCompleteResults(complianceResults, requirements);
      
      console.log(`Completed compliance check for ${requirements.length} requirements`);
      
      return completeResults;
    } catch (error) {
      console.error('Error checking compliance:', error);
      throw error;
    }
  }

  /**
   * Parse the AI response to extract compliance results
   * @param {string} aiResponse - Response from the AI
   * @returns {Array} - Parsed compliance results
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
      console.error('Error parsing compliance check response:', error);
      return [];
    }
  }

  /**
   * Ensure we have results for all requirements
   * @param {Array} results - Compliance results from AI
   * @param {Array} requirements - Original requirements
   * @returns {Array} - Complete results for all requirements
   */
  ensureCompleteResults(results, requirements) {
    const completeResults = [];
    const resultMap = new Map(results.map(r => [r.requirement_id, r]));
    
    // Ensure we have a result for each requirement
    for (const req of requirements) {
      if (resultMap.has(req.id)) {
        completeResults.push(resultMap.get(req.id));
      } else {
        // Add default result if missing
        completeResults.push({
          requirement_id: req.id,
          isPresent: false,
          location: null,
          evidence: null
        });
      }
    }
    
    return completeResults;
  }
}

module.exports = ComplianceChecker;