# Enhanced Plan Analysis System: Implementation Plan

## System Overview

This document outlines the implementation plan for enhancing the current Plan Analysis System with a multi-agent approach to improve consistency, quality, and depth of analysis.

### Current System Limitations
- Inconsistent identification of requirements in standards
- Variable compliance scores for identical plans
- Limited evaluation of language quality
- Challenges with large document processing

### Enhanced System Benefits
- Consistent requirement identification
- Structured quality assessment
- Detailed improvement suggestions
- Support for multiple reference standards

## Database Schema Updates

```sql
-- Requirements Table - Stores structured requirements extracted from reference documents
CREATE TABLE IF NOT EXISTS requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,                    -- The actual requirement text
  section VARCHAR(100) NOT NULL,         -- Which section of a plan this applies to
  importance VARCHAR(20) NOT NULL,       -- critical, important, or recommended
  source_section VARCHAR(255),           -- Section in the reference document
  keywords TEXT[],                       -- Keywords for searching
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Requirement Sources Table - Maps requirements to source documents
-- Using ON DELETE CASCADE to ensure when a document is deleted, all its requirements are also deleted
CREATE TABLE IF NOT EXISTS requirement_sources (
  requirement_id UUID REFERENCES requirements(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  PRIMARY KEY (requirement_id, document_id)
);

-- Standard Mappings Table - Maps equivalent requirements across standards
CREATE TABLE IF NOT EXISTS standard_mappings (
  requirement_id_1 UUID REFERENCES requirements(id) ON DELETE CASCADE,
  requirement_id_2 UUID REFERENCES requirements(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL, -- equivalent, related, etc.
  PRIMARY KEY (requirement_id_1, requirement_id_2)
);

-- Analysis Findings Table - Stores detailed findings for each requirement
CREATE TABLE IF NOT EXISTS analysis_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES plan_analysis(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES requirements(id) ON DELETE CASCADE,
  is_present BOOLEAN NOT NULL,
  quality_rating VARCHAR(20),            -- poor, adequate, excellent
  evidence TEXT,                         -- Text evidence from the plan
  location VARCHAR(255),                 -- Where in the plan it was found
  recommendations TEXT,                  -- Improvement recommendations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update Existing Plan_Analysis Table
ALTER TABLE plan_analysis 
ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS section_scores JSONB,
ADD COLUMN IF NOT EXISTS standards_used UUID[];
```

## Multi-Agent System Architecture

The enhanced system uses a multi-agent approach with four specialized components:

### 1. Gap Analysis Orchestrator
**Purpose**: Serves as the main controller for the entire process
**Responsibilities**:
- Coordinates the end-to-end analysis workflow
- Handles document processing requests
- Manages reference standard reconciliation
- Orchestrates plan analysis
- Compiles results and generates reports

### 2. Requirements Extraction Tool
**Purpose**: Extracts structured requirements from reference documents
**Responsibilities**:
- Processes reference document chunks
- Identifies specific, actionable requirements
- Classifies requirements by importance and section
- Deduplicates and validates requirements
- Structures requirements for database storage

### 3. Compliance Checker Tool
**Purpose**: Determines if requirements are present in plans
**Responsibilities**:
- Analyzes plans against specific requirements
- Identifies evidence of requirement implementation
- Determines presence/absence of each requirement
- Records location and evidence in the plan
- Returns structured compliance findings

### 4. Quality Evaluation Tool
**Purpose**: Analyzes the quality of language used in plans
**Responsibilities**:
- Evaluates only requirements found to be present
- Assesses clarity, specificity, and actionability
- Identifies issues in language or implementation
- Generates specific wording improvements
- Provides quality ratings for each requirement

## Multi-Agent Tool Calling Flow

### Reference Document Processing Flow

When a new reference document is uploaded:

1. Upload handler saves document and calls **Gap Analysis Orchestrator** with `action="process_reference"`
2. Orchestrator:
   - Retrieves document metadata and content
   - Calls **Requirements Extraction Tool** with document chunks
   - Stores extracted requirements in database
   - Calls itself with `action="reconcile_requirements"` if needed

When a reference document is deleted:

1. Document deletion handler calls **Gap Analysis Orchestrator** with `action="delete_reference"`
2. Orchestrator:
   - Retrieves all requirements associated with the document from requirement_sources
   - Deletes these requirements (cascade delete will remove entries in requirement_sources)
   - Logs the deletion of requirements for audit purposes

3. Requirements Extraction Tool:
   ```javascript
   async function extractRequirements(params) {
     const { document_id } = params;
     
     // Get document chunks
     const document = await getDocumentById(document_id);
     const chunks = await getDocumentChunks(document_id);
     
     const allRequirements = [];
     
     // Process each chunk
     for (const chunk of chunks) {
       // Call AI to extract requirements
       const extractionPrompt = `
         Extract specific requirements from this reference document section.
         Document section: ${chunk.content}
         Return JSON array of requirements with: text, section, importance, source_section
       `;
       
       const aiResponse = await callAI(extractionPrompt);
       const chunkRequirements = parseAIResponse(aiResponse);
       
       allRequirements.push(...chunkRequirements);
     }
     
     // Deduplicate requirements
     const uniqueRequirements = deduplicateRequirements(allRequirements);
     
     // Store in database
     await storeRequirements(document_id, uniqueRequirements);
     
     return {
       requirements_count: uniqueRequirements.length,
       by_section: countRequirementsBySection(uniqueRequirements)
     };
   }
   ```

### Plan Analysis Flow

When a user requests plan analysis:

1. Analysis endpoint calls **Gap Analysis Orchestrator** with `action="analyze_plan"`
2. Orchestrator:
   - Retrieves plan content
   - Gets requirements from selected reference documents
   - Reconciles requirements if multiple standards selected
   - Batches requirements by section
   - For each batch:
     - Calls **Compliance Checker Tool**
     - For present requirements, calls **Quality Evaluation Tool**
   - Compiles results and generates report

3. Compliance Checker Tool:
   ```javascript
   async function checkCompliance(params) {
     const { plan_content, requirements } = params;
     
     // Call AI to check compliance
     const compliancePrompt = `
       Check if these specific requirements are present in the plan.
       Plan content: ${plan_content}
       Requirements: ${JSON.stringify(requirements)}
       
       For each requirement, determine:
       1. If it is present in the plan (yes/no)
       2. Where in the plan it's found (section/paragraph)
       3. The exact text evidence
       
       Return as JSON array with: requirement_id, isPresent, location, evidence
     `;
     
     const aiResponse = await callAI(compliancePrompt);
     const complianceResults = parseAIResponse(aiResponse);
     
     return complianceResults;
   }
   ```

4. Quality Evaluation Tool:
   ```javascript
   async function evaluateQuality(params) {
     const { plan_content, requirements } = params;
     
     // Call AI to evaluate quality
     const qualityPrompt = `
       Evaluate the quality of implementation for these requirements.
       Plan content: ${plan_content}
       Requirements found present: ${JSON.stringify(requirements)}
       
       For each requirement, evaluate:
       1. Clarity of language (clear/unclear)
       2. Specificity (specific/vague)
       3. Actionability (actionable/non-actionable)
       4. Overall quality (poor/adequate/excellent)
       5. Suggested improvements
       
       Return as JSON array with: requirement_id, quality_rating, issues, suggestions
     `;
     
     const aiResponse = await callAI(qualityPrompt);
     const qualityResults = parseAIResponse(aiResponse);
     
     return qualityResults;
   }
   ```

5. Gap Analysis Orchestrator (Main Controller):
   ```javascript
   async function orchestrateAnalysis(action, params) {
     switch(action) {
       case "process_reference":
         return await extractRequirements(params);
         
       case "reconcile_requirements":
         return await reconcileRequirements(params);
         
       case "delete_reference":
         return await deleteReferenceRequirements(params);
         
       case "analyze_plan":
         // Get plan content
         const planContent = await getPlanContent(params.plan_id);
         
         // Get requirements from selected references
         const requirements = await getRequirementsForReferences(params.reference_ids);
         
         // Batch requirements by section
         const batches = batchRequirementsBySection(requirements);
         
         const allResults = [];
         
         // Process each batch
         for (const batch of batches) {
           // Check compliance
           const complianceResults = await checkCompliance({
             plan_content: planContent,
             requirements: batch.requirements
           });
           
           // Get present requirements
           const presentRequirements = complianceResults.filter(r => r.isPresent);
           
           // Evaluate quality
           let qualityResults = [];
           if (presentRequirements.length > 0) {
             qualityResults = await evaluateQuality({
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
         
         // Generate final report
         return generateAnalysisReport(allResults, requirements, params.plan_id);
     }
   }
   
   // Function to handle reference document deletion
   async function deleteReferenceRequirements(params) {
     const { document_id } = params;
     
     // Get all requirements associated with this document
     const requirementIdsResult = await database.query(`
       SELECT requirement_id 
       FROM requirement_sources 
       WHERE document_id = $1
     `, [document_id]);
     
     const requirementIds = requirementIdsResult.map(row => row.requirement_id);
     
     // Delete the requirements (cascade will handle requirement_sources)
     if (requirementIds.length > 0) {
       await database.query(`
         DELETE FROM requirements 
         WHERE id IN (${requirementIds.map(id => `'${id}'`).join(',')})
       `);
       
       console.log(`Deleted ${requirementIds.length} requirements associated with document ${document_id}`);
     }
     
     return {
       success: true,
       deleted_requirements_count: requirementIds.length
     };
   }
   ```

## Integration with Existing Code

To integrate the new multi-agent system with your existing code structure, we'll take the following approach:

### Updating gemini.js

Instead of removing the existing `GapAnalysisAI` class in your `gemini.js` file, we'll modify it to serve as a wrapper that calls the new orchestrator:

```javascript
// In gemini.js
const GapAnalysisOrchestrator = require('./gapAnalysisOrchestrator');

/**
 * GapAnalysisAI - Specialized class for analyzing emergency plans against standards
 * This AI performs compliance checking and produces metrics output
 */
class GapAnalysisAI {
  constructor() {
    this.orchestrator = new GapAnalysisOrchestrator();
  }

  /**
   * Analyze a plan against reference standards
   * @param {string} planContent - The content of the plan to analyze
   * @param {Array} referenceStandards - Array of reference standard chunks to compare against
   * @param {string} planType - Type of plan (EOP, HMP, COOP, etc.)
   * @returns {Promise<Object>} - Analysis results with compliance findings
   */
  async analyzePlan(planContent, referenceStandards, planType) {
    console.log('Using enhanced multi-agent analysis system');
    
    // Convert to the format expected by the orchestrator
    const params = {
      plan_content: planContent,
      reference_standards: referenceStandards,
      plan_type: planType
    };
    
    // Call the orchestrator's analyze method
    return await this.orchestrator.orchestrateAnalysis("analyze_plan", params);
  }
}
```

### New Files to Create

1. **services/gapAnalysisOrchestrator.js**
   - Main orchestrator that coordinates the entire analysis process
   - Implements the `orchestrateAnalysis` method with different actions
   - Handles workflow management and results compilation

2. **services/requirementsExtractor.js**
   - Specialized agent for extracting requirements from reference documents
   - Implements chunking, AI processing, and requirement storage

3. **services/complianceChecker.js**
   - Specialized agent for checking requirement presence in plans
   - Implements plan analysis and evidence extraction

4. **services/qualityEvaluator.js**
   - Specialized agent for evaluating language quality
   - Implements quality assessment and wording improvement generation

### Existing Files to Modify

1. **controllers/aiController.js**
   - Update to expose new endpoints for requirements management
   - Modify existing analysis endpoint to support multiple reference standards

2. **services/embedding.js**
   - Keep existing embedding functionality
   - Add methods to support the new requirements database

3. **utils/chunking.js**
   - Keep existing chunking functionality
   - No changes needed unless optimizations are desired

## Implementation Phases

### Phase 1: Requirements Infrastructure (Weeks 1-2)
- Set up new database tables
- Implement Requirements Extraction Tool
- Create basic requirements management UI
- Process CPG 101 document to build requirements database
- Implement reference document deletion handler to remove associated requirements

### Phase 2: Basic Analysis Pipeline (Weeks 3-4)
- Implement Compliance Checker Tool
- Build basic Orchestrator functionality
- Create API endpoints for analysis
- Implement basic reporting

### Phase 3: Enhanced Analysis (Weeks 5-6)
- Implement Quality Evaluation Tool
- Enhance scoring algorithm
- Update results UI
- Add wording suggestions

### Phase 4: Multi-Standard Support (Weeks 7-8)
- Implement standard selection
- Build reconciliation logic
- Create cross-standard reporting
- Add comparison features

## Expected Benefits

1. **Consistency**: Fixed set of requirements for each standard
2. **Quality Assessment**: Beyond binary presence/absence
3. **Actionable Improvements**: Specific wording suggestions
4. **Multiple Standards**: Support for checking against multiple references
5. **Performance**: Efficient processing of large documents
6. **Transparency**: Clear evidence for findings

This implementation builds on your existing infrastructure while adding the multi-agent approach to provide more consistent and detailed analysis.
