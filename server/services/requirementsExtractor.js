/**
 * Requirements Extractor
 * 
 * This module extracts structured requirements from reference documents.
 * It processes document chunks, identifies requirements, and stores them in the database.
 */

const db = require('../config/supabase');
const { getGeminiResponse, getTextFromGeminiResponse } = require('./gemini');

class RequirementsExtractor {
  constructor() {
    // No need to instantiate anything since we'll use the functions directly
  }

  /**
   * Extract requirements from a reference document
   * @param {string} documentId - ID of the reference document
   * @returns {Promise<object>} - Summary of extraction results
   */
  async extractRequirements(documentId) {
    console.log(`Extracting requirements from document ${documentId}`);
    
    try {
      // Get document metadata
      const document = await this.getDocumentById(documentId);
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }
      
      // Verify this is a reference document
      if (document.document_type !== 'reference') {
        throw new Error(`Document ${documentId} is not a reference document`);
      }
      
      // Get document chunks
      const chunks = await this.getDocumentChunks(documentId);
      if (!chunks || chunks.length === 0) {
        throw new Error(`No content chunks found for document ${documentId}`);
      }
      
      console.log(`Processing ${chunks.length} chunks from document ${documentId}`);
      
      const allRequirements = [];
      
      // Process each chunk to extract requirements
      for (const chunk of chunks) {
        // Extract requirements from this chunk
        const chunkRequirements = await this.extractRequirementsFromChunk(chunk, document);
        allRequirements.push(...chunkRequirements);
      }
      
      // Deduplicate requirements
      const uniqueRequirements = this.deduplicateRequirements(allRequirements);
      
      console.log(`Extracted ${uniqueRequirements.length} unique requirements from document ${documentId}`);
      
      // Store requirements in the database
      await this.storeRequirements(documentId, uniqueRequirements);
      
      // Count requirements by section
      const bySection = this.countRequirementsBySection(uniqueRequirements);
      
      return {
        requirements_count: uniqueRequirements.length,
        by_section: bySection
      };
    } catch (error) {
      console.error(`Error extracting requirements from document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Extract requirements from a single document chunk
   * @param {object} chunk - Content chunk from the document
   * @param {object} document - Document metadata
   * @returns {Promise<Array>} - Array of extracted requirements
   */
  async extractRequirementsFromChunk(chunk, document) {
    try {
      const chunkMetadata = chunk.metadata || {};
      const sourceSection = chunkMetadata.section || '';
      
      // Build the extraction prompt
      const extractionPrompt = `
        You are an expert in emergency management and regulatory compliance. 
        Extract specific, actionable requirements from this reference document section.
        
        Document: ${document.title} (${document.doc_subtype})
        Section: ${sourceSection}
        
        Content:
        ${chunk.content}
        
        For each requirement you identify:
        1. Extract the exact requirement text
        2. Determine which section of an emergency plan it would apply to (e.g., "Basic Plan", "Hazard Identification", "Resource Management", "Training", etc.)
        3. Classify the importance as: "critical" (must have), "important" (should have), or "recommended" (nice to have)
        4. Note the source section within the reference document
        5. Identify 3-5 keywords that could help with searching for this requirement
        
        Only extract clear, specific requirements. Do not include background information, explanations, or non-mandatory suggestions.
        
        Return a JSON array of requirements with the following structure:
        [
          {
            "text": "The exact requirement text",
            "section": "Which section of a plan this applies to",
            "importance": "critical/important/recommended",
            "source_section": "Section in the reference document",
            "keywords": ["keyword1", "keyword2", "keyword3"]
          }
        ]
        
        If no clear requirements are found in this section, return an empty array.
      `;
      
      // Call the AI to extract requirements
      const aiResponse = await getGeminiResponse(extractionPrompt);
      
      // Parse the AI response
      const requirements = this.parseAIResponse(aiResponse);
      
      console.log(`Extracted ${requirements.length} requirements from chunk ${chunk.id}`);
      
      return requirements;
    } catch (error) {
      console.error(`Error extracting requirements from chunk ${chunk.id}:`, error);
      // Return empty array instead of failing the whole process
      return [];
    }
  }

  /**
   * Parse the AI response to extract requirements
   * @param {Object} aiResponse - Response object from the AI
   * @returns {Array} - Parsed requirements
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
        
        // If no JSON array is found, check if it's a single object
        const objectMatch = responseText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          const obj = JSON.parse(objectMatch[0]);
          return [obj];
        }
        
        // If all parsing attempts fail, return empty array
        console.warn('Could not parse AI response as JSON:', responseText);
        return [];
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return [];
    }
  }

  /**
   * Deduplicate requirements based on text similarity
   * @param {Array} requirements - Array of extracted requirements
   * @returns {Array} - Deduplicated requirements
   */
  deduplicateRequirements(requirements) {
    // Simple deduplication by exact text match
    const uniqueTexts = new Set();
    const uniqueRequirements = [];
    
    for (const req of requirements) {
      // Normalize the text for comparison
      const normalizedText = req.text.trim().toLowerCase();
      
      if (!uniqueTexts.has(normalizedText)) {
        uniqueTexts.add(normalizedText);
        uniqueRequirements.push(req);
      }
    }
    
    return uniqueRequirements;
  }

  /**
   * Store requirements in the database
   * @param {string} documentId - ID of the source document
   * @param {Array} requirements - Array of requirements to store
   * @returns {Promise<void>}
   */
  async storeRequirements(documentId, requirements) {
    if (!requirements || requirements.length === 0) {
      console.log(`No requirements to store for document ${documentId}`);
      return;
    }
    
    try {
      // Insert requirements and get their IDs
      for (const requirement of requirements) {
        // Insert the requirement
        const { data: reqData, error: reqError } = await db
          .from('requirements')
          .insert({
            text: requirement.text,
            section: requirement.section,
            importance: requirement.importance,
            source_section: requirement.source_section,
            keywords: requirement.keywords || []
          })
          .select('id')
          .single();
        
        if (reqError) throw reqError;
        
        // Link the requirement to the source document
        const { error: sourceError } = await db
          .from('requirement_sources')
          .insert({
            requirement_id: reqData.id,
            document_id: documentId
          });
        
        if (sourceError) throw sourceError;
      }
      
      console.log(`Stored ${requirements.length} requirements for document ${documentId}`);
    } catch (error) {
      console.error(`Error storing requirements for document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Count requirements by section
   * @param {Array} requirements - Array of requirements
   * @returns {object} - Count of requirements by section
   */
  countRequirementsBySection(requirements) {
    return requirements.reduce((counts, req) => {
      const section = req.section;
      if (!counts[section]) {
        counts[section] = 0;
      }
      counts[section]++;
      return counts;
    }, {});
  }

  /**
   * Helper: Get document by ID
   * @param {string} documentId - Document ID
   * @returns {Promise<object>} - Document metadata
   */
  async getDocumentById(documentId) {
    try {
      const { data, error } = await db
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Helper: Get document chunks
   * @param {string} documentId - Document ID
   * @returns {Promise<Array>} - Document content chunks
   */
  async getDocumentChunks(documentId) {
    try {
      const { data, error } = await db
        .from('vector_embeddings')
        .select('id, content, metadata, chunk_index')
        .eq('document_id', documentId)
        .order('chunk_index', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching chunks for document ${documentId}:`, error);
      throw error;
    }
  }
}

module.exports = RequirementsExtractor;