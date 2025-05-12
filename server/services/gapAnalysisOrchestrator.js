/**
 * Gap Analysis Orchestrator
 * 
 * This module serves as the main controller for the multi-agent gap analysis system.
 * It coordinates the end-to-end workflow, handling document processing requests,
 * plan analysis, and report generation.
 */

const db = require('../config/supabase');
const RequirementsExtractor = require('./requirementsExtractor');
const ComplianceChecker = require('./complianceChecker');
const QualityEvaluator = require('./qualityEvaluator');
const { getGeminiResponse, getTextFromGeminiResponse } = require('./gemini');

class GapAnalysisOrchestrator {
  constructor() {
    this.requirementsExtractor = new RequirementsExtractor();
    this.complianceChecker = new ComplianceChecker();
    this.qualityEvaluator = new QualityEvaluator();
  }

  /**
   * Main orchestration method that routes to appropriate functions based on action
   * @param {string} action - The action to perform ('process_reference', 'analyze_plan', etc.)
   * @param {object} params - Parameters specific to the action
   * @returns {Promise<object>} - Results of the requested action
   */
  async orchestrateAnalysis(action, params) {
    console.log(`Orchestrating ${action} with params:`, JSON.stringify(params, null, 2));
    
    switch(action) {
      case "process_reference":
        return await this.extractRequirements(params);
        
      case "reconcile_requirements":
        return await this.reconcileRequirements(params);
        
      case "delete_reference":
        return await this.deleteReferenceRequirements(params);
        
      case "analyze_plan":
        return await this.analyzePlan(params);
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Extract requirements from a reference document
   * @param {object} params - Parameters containing document_id
   * @returns {Promise<object>} - Summary of extracted requirements
   */
  async extractRequirements(params) {
    const { document_id } = params;
    
    try {
      // Get the document metadata
      const document = await this.getDocumentById(document_id);
      if (!document) {
        throw new Error(`Document not found: ${document_id}`);
      }
      
      // Call the Requirements Extractor to process the document
      const result = await this.requirementsExtractor.extractRequirements(document_id);
      
      return {
        success: true,
        document_id,
        title: document.title,
        requirements_count: result.requirements_count,
        requirements_by_section: result.by_section
      };
    } catch (error) {
      console.error(`Error extracting requirements from document ${document_id}:`, error);
      throw error;
    }
  }

  /**
   * Reconcile requirements across multiple reference standards
   * @param {object} params - Parameters containing reference_ids to reconcile
   * @returns {Promise<object>} - Summary of reconciliation results
   */
  async reconcileRequirements(params) {
    const { reference_ids } = params;
    
    if (!reference_ids || !Array.isArray(reference_ids) || reference_ids.length < 2) {
      throw new Error('At least two reference documents must be provided for reconciliation');
    }
    
    try {
      // Get all requirements from the specified references
      const requirements = await this.getRequirementsForReferences(reference_ids);
      
      // Group requirements by section
      const requirementsBySection = this.groupRequirementsBySection(requirements);
      
      // Process each section to find equivalent requirements
      const results = {};
      
      for (const [section, sectionRequirements] of Object.entries(requirementsBySection)) {
        // Only process sections with multiple requirements
        if (sectionRequirements.length > 1) {
          // Use AI to find equivalent requirements
          const mappings = await this.findEquivalentRequirements(sectionRequirements);
          results[section] = mappings;
          
          // Store mappings in the database
          await this.storeRequirementMappings(mappings);
        }
      }
      
      return {
        success: true,
        reference_ids,
        sections_processed: Object.keys(results).length,
        mappings_found: Object.values(results).flat().length
      };
    } catch (error) {
      console.error(`Error reconciling requirements for references ${reference_ids.join(', ')}:`, error);
      throw error;
    }
  }

  /**
   * Delete requirements associated with a reference document
   * @param {object} params - Parameters containing document_id
   * @returns {Promise<object>} - Summary of deletion results
   */
  async deleteReferenceRequirements(params) {
    const { document_id } = params;
    
    try {
      // Get all requirements associated with this document
      const requirementIds = await db
        .from('requirement_sources')
        .select('requirement_id')
        .eq('document_id', document_id);
      
      if (requirementIds.error) throw requirementIds.error;
      
      const reqIds = requirementIds.data.map(row => row.requirement_id);
      
      // Delete the requirements (cascade will handle requirement_sources)
      if (reqIds.length > 0) {
        const deleteResult = await db
          .from('requirements')
          .delete()
          .in('id', reqIds);
        
        if (deleteResult.error) throw deleteResult.error;
        
        console.log(`Deleted ${reqIds.length} requirements associated with document ${document_id}`);
      }
      
      return {
        success: true,
        document_id,
        deleted_requirements_count: reqIds.length
      };
    } catch (error) {
      console.error(`Error deleting requirements for document ${document_id}:`, error);
      throw error;
    }
  }

  /**
   * Analyze a plan against selected reference standards
   * @param {object} params - Parameters containing plan_id and reference_ids
   * @returns {Promise<object>} - Analysis results and report
   */
  async analyzePlan(params) {
    const { plan_id, reference_ids } = params;
    
    if (!plan_id) {
      throw new Error('Plan ID is required');
    }
    
    if (!reference_ids || !Array.isArray(reference_ids) || reference_ids.length === 0) {
      throw new Error('At least one reference document must be provided');
    }
    
    try {
      // Get plan content
      const planContent = await this.getPlanContent(plan_id);
      if (!planContent) {
        throw new Error(`Could not retrieve content for plan ${plan_id}`);
      }
      
      // Get plan metadata
      const plan = await this.getDocumentById(plan_id);
      if (!plan) {
        throw new Error(`Plan not found: ${plan_id}`);
      }
      
      // Get requirements from the selected reference standards
      const requirements = await this.getRequirementsForReferences(reference_ids);
      
      // Group requirements by section for batch processing
      const batches = this.batchRequirementsBySection(requirements);
      
      const allResults = [];
      
      // Process each batch (section)
      for (const batch of batches) {
        // Check compliance
        const complianceResults = await this.complianceChecker.checkCompliance({
          plan_content: planContent,
          requirements: batch.requirements
        });
        
        // Get requirements found present
        const presentRequirements = complianceResults.filter(r => r.isPresent);
        
        // Evaluate quality of implementation for present requirements
        let qualityResults = [];
        if (presentRequirements.length > 0) {
          qualityResults = await this.qualityEvaluator.evaluateQuality({
            plan_content: planContent,
            requirements: presentRequirements
          });
        }
        
        // Compile batch results
        allResults.push({
          section: batch.section,
          compliance: complianceResults,
          quality: qualityResults
        });
      }
      
      // Generate the final analysis report
      const report = await this.generateAnalysisReport(allResults, requirements, plan);
      
      // Store the analysis results in the database
      const analysisId = await this.storeAnalysisResults(plan_id, report, reference_ids);
      
      return {
        success: true,
        analysis_id: analysisId,
        plan_id,
        reference_ids,
        report
      };
    } catch (error) {
      console.error(`Error analyzing plan ${plan_id}:`, error);
      throw error;
    }
  }

  /**
   * Generate the final analysis report
   * @param {Array} sectionResults - Results for each plan section
   * @param {Array} requirements - All requirements used in analysis
   * @param {object} plan - Plan metadata
   * @returns {Promise<object>} - Formatted analysis report
   */
  async generateAnalysisReport(sectionResults, requirements, plan) {
    // Calculate overall compliance metrics
    const totalRequirements = requirements.length;
    const presentRequirements = sectionResults
      .flatMap(section => section.compliance)
      .filter(result => result.isPresent)
      .length;
    
    const complianceScore = totalRequirements > 0 
      ? Math.round((presentRequirements / totalRequirements) * 100) 
      : 0;
    
    // Calculate quality metrics for present requirements
    const qualityRatings = sectionResults
      .flatMap(section => section.quality)
      .map(result => result?.quality_rating || null)
      .filter(rating => rating);
    
    // Calculate average quality score (poor=1, adequate=2, excellent=3)
    const qualityScore = qualityRatings.length > 0
      ? qualityRatings.reduce((sum, rating) => {
          return sum + (rating === 'poor' ? 1 : rating === 'adequate' ? 2 : 3);
        }, 0) / qualityRatings.length
      : 0;
    
    // Normalize to 0-100 scale
    const normalizedQualityScore = Math.round((qualityScore / 3) * 100);
    
    // Calculate section scores
    const sectionScores = {};
    for (const section of sectionResults) {
      const sectionRequirements = section.compliance.length;
      const sectionPresent = section.compliance.filter(r => r.isPresent).length;
      
      sectionScores[section.section] = {
        compliance: sectionRequirements > 0 
          ? Math.round((sectionPresent / sectionRequirements) * 100) 
          : 0,
        quality: section.quality.length > 0
          ? Math.round(
              section.quality.reduce((sum, result) => {
                return sum + (result.quality_rating === 'poor' ? 1 : result.quality_rating === 'adequate' ? 2 : 3);
              }, 0) / section.quality.length / 3 * 100
            )
          : 0,
        requirements_total: sectionRequirements,
        requirements_present: sectionPresent
      };
    }
    
    // Generate missing requirements list
    const missingRequirements = sectionResults
      .flatMap(section => section.compliance)
      .filter(result => !result.isPresent)
      .map(result => ({
        id: result.requirement_id,
        section: requirements.find(r => r.id === result.requirement_id)?.section || 'Unknown',
        text: requirements.find(r => r.id === result.requirement_id)?.text || 'Unknown requirement'
      }));
    
    // Generate improvement suggestions
    const improvementSuggestions = sectionResults
      .flatMap(section => section.quality)
      .filter(result => result && result.suggestions)
      .map(result => ({
        requirement_id: result.requirement_id,
        requirement_text: requirements.find(r => r.id === result.requirement_id)?.text || 'Unknown requirement',
        quality_rating: result.quality_rating,
        issues: result.issues || [],
        suggestions: result.suggestions
      }));
    
    // Return the formatted report
    return {
      plan_name: plan.title,
      plan_type: plan.doc_subtype,
      overall_compliance_score: complianceScore,
      overall_quality_score: normalizedQualityScore,
      section_scores: sectionScores,
      summary: {
        total_requirements: totalRequirements,
        requirements_present: presentRequirements,
        requirements_missing: totalRequirements - presentRequirements,
        sections_analyzed: Object.keys(sectionScores).length
      },
      missing_requirements: missingRequirements,
      improvement_suggestions: improvementSuggestions,
      analyzed_at: new Date().toISOString()
    };
  }

  /**
   * Store analysis results in the database
   * @param {string} planId - Plan ID
   * @param {object} report - Analysis report
   * @param {Array} referenceIds - IDs of reference standards used
   * @returns {Promise<string>} - ID of the stored analysis
   */
  async storeAnalysisResults(planId, report, referenceIds) {
    try {
      // Create the main analysis record
      const analysisResult = await db
        .from('plan_analysis')
        .insert({
          plan_id: planId,
          overall_score: report.overall_compliance_score,
          quality_score: report.overall_quality_score,
          missing_elements_count: report.summary.requirements_missing,
          section_scores: report.section_scores,
          standards_used: referenceIds,
          analysis_data: report
        })
        .select('id')
        .single();
      
      if (analysisResult.error) throw analysisResult.error;
      
      const analysisId = analysisResult.data.id;
      
      // Store individual findings for each requirement
      const findings = [];
      
      // Add findings for missing requirements
      for (const missing of report.missing_requirements) {
        findings.push({
          analysis_id: analysisId,
          requirement_id: missing.id,
          is_present: false,
          evidence: null,
          location: null,
          recommendations: `Add this requirement to the plan: ${missing.text}`
        });
      }
      
      // Add findings for present requirements with quality issues
      for (const improvement of report.improvement_suggestions) {
        findings.push({
          analysis_id: analysisId,
          requirement_id: improvement.requirement_id,
          is_present: true,
          quality_rating: improvement.quality_rating,
          evidence: null, // We would need to get this from the compliance results
          location: null, // We would need to get this from the compliance results
          recommendations: improvement.suggestions.join('; ')
        });
      }
      
      // Insert all findings
      if (findings.length > 0) {
        const findingsResult = await db
          .from('analysis_findings')
          .insert(findings);
        
        if (findingsResult.error) throw findingsResult.error;
      }
      
      return analysisId;
    } catch (error) {
      console.error(`Error storing analysis results for plan ${planId}:`, error);
      throw error;
    }
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
   * Helper: Get plan content from document chunks
   * @param {string} planId - Plan ID
   * @returns {Promise<string>} - Concatenated plan content
   */
  async getPlanContent(planId) {
    try {
      const { data, error } = await db
        .from('vector_embeddings')
        .select('content, chunk_index')
        .eq('document_id', planId)
        .order('chunk_index', { ascending: true });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error(`No content found for plan ${planId}`);
      }
      
      // Concatenate all chunks in order
      return data.map(chunk => chunk.content).join('\n\n');
    } catch (error) {
      console.error(`Error fetching content for plan ${planId}:`, error);
      throw error;
    }
  }

  /**
   * Helper: Get requirements for specified reference documents
   * @param {Array} referenceIds - Array of reference document IDs
   * @returns {Promise<Array>} - Requirements from these references
   */
  async getRequirementsForReferences(referenceIds) {
    try {
      // Get requirement IDs from the reference documents
      const { data: sourcesData, error: sourcesError } = await db
        .from('requirement_sources')
        .select('requirement_id')
        .in('document_id', referenceIds);
      
      if (sourcesError) throw sourcesError;
      
      if (!sourcesData || sourcesData.length === 0) {
        return [];
      }
      
      const requirementIds = sourcesData.map(source => source.requirement_id);
      
      // Get the actual requirement details
      const { data: requirementsData, error: requirementsError } = await db
        .from('requirements')
        .select('*')
        .in('id', requirementIds);
      
      if (requirementsError) throw requirementsError;
      
      return requirementsData || [];
    } catch (error) {
      console.error(`Error fetching requirements for references ${referenceIds.join(', ')}:`, error);
      throw error;
    }
  }

  /**
   * Helper: Group requirements by section
   * @param {Array} requirements - Array of requirements
   * @returns {object} - Requirements grouped by section
   */
  groupRequirementsBySection(requirements) {
    return requirements.reduce((groups, requirement) => {
      const section = requirement.section;
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(requirement);
      return groups;
    }, {});
  }

  /**
   * Helper: Batch requirements by section for processing
   * @param {Array} requirements - Array of requirements
   * @returns {Array} - Batches of requirements by section
   */
  batchRequirementsBySection(requirements) {
    const groupedBySection = this.groupRequirementsBySection(requirements);
    
    return Object.entries(groupedBySection).map(([section, sectionRequirements]) => ({
      section,
      requirements: sectionRequirements
    }));
  }

  /**
   * Helper: Find equivalent requirements across standards
   * @param {Array} requirements - Requirements to compare
   * @returns {Promise<Array>} - Mappings of equivalent requirements
   */
  async findEquivalentRequirements(requirements) {
    try {
      // Format requirements for AI processing
      const formattedRequirements = requirements.map(req => ({
        id: req.id,
        text: req.text,
        document_id: req.document_id, // We would need to get this from requirement_sources
        importance: req.importance
      }));
      
      // Call AI to find equivalent requirements
      const prompt = `
        Analyze these requirements from different standards and identify which ones are equivalent.
        Requirements: ${JSON.stringify(formattedRequirements)}
        
        Return a JSON array of equivalent requirement groups, where each group is an array of requirement IDs.
        Only include requirements that have clear equivalents across standards.
      `;
      
      // Call the AI service
      const response = await getGeminiResponse(prompt);
      
      // Parse AI response to get mappings
      const responseText = getTextFromGeminiResponse(response);
      const mappings = JSON.parse(responseText);
      
      return mappings;
    } catch (error) {
      console.error('Error finding equivalent requirements:', error);
      return []; // Return empty array as fallback
    }
  }

  /**
   * Helper: Store requirement mappings in the database
   * @param {Array} mappings - Mappings of equivalent requirements
   * @returns {Promise<void>}
   */
  async storeRequirementMappings(mappings) {
    try {
      // Format mappings for database insertion
      const dbMappings = [];
      
      for (const group of mappings) {
        // For each group of equivalent requirements, create pairwise mappings
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            dbMappings.push({
              requirement_id_1: group[i],
              requirement_id_2: group[j],
              relationship_type: 'equivalent'
            });
          }
        }
      }
      
      if (dbMappings.length > 0) {
        const { error } = await db
          .from('standard_mappings')
          .upsert(dbMappings, { onConflict: ['requirement_id_1', 'requirement_id_2'] });
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error storing requirement mappings:', error);
      throw error;
    }
  }
}

module.exports = GapAnalysisOrchestrator;