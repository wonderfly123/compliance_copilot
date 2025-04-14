// server/controllers/plansController.js
const multer = require('multer');
const path = require('path');
const { processDocument } = require('../services/documentProcessor');
const { gapAnalysisAI, copilotAI } = require('../services/gemini');
const supabase = require('../config/supabase');

// Set up file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'application/markdown',
      'application/json'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
});

/**
 * Get all plans
 * @route GET /api/plans
 */
exports.getPlans = async (req, res) => {
  try {
    console.log('Fetching plans...');
    console.log('User:', req.user);
    
    // Get plans from real Supabase client
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('document_type', 'plan')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log('Plans fetched successfully:', data ? data.length : 0, 'plans found');
    
    // Transform the data to match the expected format in the frontend
    const transformedData = data && data.length > 0 ? data.map(plan => ({
      id: plan.id,
      title: plan.title,
      type: plan.doc_subtype || 'EOP',
      status: plan.status || 'Draft',
      compliance_score: plan.compliance_score || 0,
      expiration_date: plan.metadata?.expiration_date || new Date(Date.now() + 90*24*60*60*1000).toISOString(),
      location: plan.location || ''
    })) : [];
    
    return res.status(200).json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Error getting plans:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve plans',
      error: error.message
    });
  }
};

/**
 * Get a specific plan
 * @route GET /api/plans/:id
 */
exports.getPlan = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('document_type', 'plan')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Plan not found'
        });
      }
      throw error;
    }
    
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error getting plan:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve plan',
      error: error.message
    });
  }
};

/**
 * Create a new plan (without file upload)
 * @route POST /api/plans
 */
exports.createPlan = async (req, res) => {
  try {
    const { title, description, type, status, location, tags, department, owner } = req.body;
    
    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title and type are required'
      });
    }
    
    const documentData = {
      document_type: 'plan',
      doc_subtype: type,
      title,
      description: description || '',
      status: status || 'Draft',
      user_id: req.user.id,
      tags: tags || [],
      department: department || '',
      owner: owner || req.user.name || '',
      metadata: {
        location: location || ''
      }
    };
    
    const { data, error } = await supabase
      .from('documents')
      .insert([documentData])
      .select()
      .single();
    
    if (error) throw error;
    
    return res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error creating plan:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create plan',
      error: error.message
    });
  }
};

/**
 * Upload a plan with file
 * @route POST /api/plans/upload
 */
exports.uploadPlan = async (req, res) => {
  try {
    // First handle the file upload with multer
    const uploadMiddleware = upload.single('file');
    
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
      
      // Now process the document with user ID instead of token
      try {
        console.log('Uploading plan with user:', req.user?.id);
        
        const result = await processDocument(
          req.file, 
          {
            documentType: 'plan',
            title: req.body.title,
            type: req.body.type,
            description: req.body.description,
            status: req.body.status || 'Draft',
            location: req.body.location,
            userId: req.user.id,
            tags: req.body.tags ? JSON.parse(req.body.tags) : [],
            department: req.body.department || '',
            owner: req.body.owner || req.user.name || ''
          }
        );
        
        return res.status(201).json({
          success: true,
          data: {
            id: result.documentId,
            title: req.body.title,
            type: req.body.type,
            status: req.body.status || 'Draft',
            location: req.body.location
          }
        });
      } catch (processError) {
        console.error('Error processing plan:', processError);
        return res.status(500).json({
          success: false,
          message: 'Failed to process plan',
          error: processError.message
        });
      }
    });
  } catch (error) {
    console.error('Error in plan upload controller:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during upload',
      error: error.message
    });
  }
};

/**
 * Update a plan
 * @route PUT /api/plans/:id
 */
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, type, location, tags, department, owner } = req.body;
    
    // Check if plan exists
    const { data: existingPlan, error: checkError } = await supabase
      .from('documents')
      .select('id, metadata')
      .eq('id', id)
      .eq('document_type', 'plan')
      .single();
    
    if (checkError || !existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    
    // Update the plan
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (status) updateData.status = status;
    if (type) updateData.doc_subtype = type;
    
    // Update metadata object if location provided
    if (location) {
      updateData.metadata = {
        ...(existingPlan.metadata || {}),
        location
      };
    }
    
    if (tags) updateData.tags = tags;
    if (department) updateData.department = department;
    if (owner) updateData.owner = owner;
    
    const { error: updateError } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', id);
    
    if (updateError) throw updateError;
    
    return res.status(200).json({
      success: true,
      message: 'Plan updated successfully'
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update plan',
      error: error.message
    });
  }
};

/**
 * Delete a plan
 * @route DELETE /api/plans/:id
 */
exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if plan exists and get file_url
    const { data: plan, error: checkError } = await supabase
      .from('documents')
      .select('file_url')
      .eq('id', id)
      .eq('document_type', 'plan')
      .single();
    
    if (checkError || !plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    
    // Delete the plan from the database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    // Delete the file from storage
    if (plan.file_url) {
      const { error: storageError } = await supabase
        .storage
        .from('plans')
        .remove([plan.file_url]);
      
      if (storageError) {
        console.error('Error removing file from storage:', storageError);
        // Continue with the response even if storage delete fails
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting plan:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete plan',
      error: error.message
    });
  }
};

/**
 * Get analysis results for a plan
 * @route GET /api/plans/:planId/analysis
 */
exports.getPlanAnalysis = async (req, res) => {
  try {
    const { planId } = req.params;
    
    // Get the latest analysis for this plan
    const { data: analysis, error: analysisError } = await supabase
      .from('plan_analysis')
      .select('*')
      .eq('plan_id', planId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .single();
    
    if (analysisError) {
      // If no analysis exists, return empty data
      if (analysisError.code === 'PGRST116') {
        return res.status(200).json({
          success: true,
          data: null,
          message: 'No analysis found for this plan'
        });
      }
      throw analysisError;
    }
    
    return res.status(200).json({
      success: true,
      data: analysis.analysis_data
    });
  } catch (error) {
    console.error('Error getting plan analysis:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve plan analysis',
      error: error.message
    });
  }
};

/**
 * Get suggestions for plan improvement from Copilot
 * @route GET /api/plans/:planId/suggestions
 */
exports.getPlanSuggestions = async (req, res) => {
  try {
    const { planId } = req.params;
    
    if (!planId) {
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }
    
    // Get the plan details
    const { data: plan, error: planError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', planId)
      .eq('document_type', 'plan')
      .single();
    
    if (planError || !plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    
    // Get suggestions from Copilot AI
    const suggestions = await copilotAI.suggestPlanImprovements(
      plan,
      plan.compliance_score || 0
    );
    
    return res.status(200).json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Error getting plan suggestions:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while getting plan suggestions',
      error: error.message
    });
  }
};

/**
 * Get metrics
 * @route GET /api/plans/metrics
 */
exports.getMetrics = async (req, res) => {
  try {
    // Get plan counts by type
    const { data: planTypes, error: planTypesError } = await supabase
      .from('documents')
      .select('doc_subtype, count')
      .eq('document_type', 'plan')
      .group('doc_subtype');
    
    if (planTypesError) throw planTypesError;
    
    // Get plans with low compliance scores
    const { data: lowCompliancePlans, error: complianceError } = await supabase
      .from('documents')
      .select('id, title, doc_subtype, compliance_score')
      .eq('document_type', 'plan')
      .lt('compliance_score', 60)
      .order('compliance_score', { ascending: true })
      .limit(5);
    
    if (complianceError) throw complianceError;
    
    // Get plans expiring soon
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    
    const { data: expiringPlans, error: expiringError } = await supabase
      .from('documents')
      .select('id, title, doc_subtype, metadata')
      .eq('document_type', 'plan')
      .lte('metadata->expiration_date', threeMonthsFromNow.toISOString())
      .order('metadata->expiration_date', { ascending: true })
      .limit(5);
    
    if (expiringError) throw expiringError;
    
    // Calculate average compliance score
    const { data: avgCompliance, error: avgError } = await supabase
      .from('documents')
      .select('compliance_score')
      .eq('document_type', 'plan')
      .not('compliance_score', 'is', null);
    
    if (avgError) throw avgError;
    
    const averageScore = avgCompliance.length > 0 
      ? avgCompliance.reduce((sum, plan) => sum + (plan.compliance_score || 0), 0) / avgCompliance.length 
      : 0;
    
    return res.status(200).json({
      success: true,
      data: {
        planCounts: planTypes,
        lowCompliancePlans,
        expiringPlans,
        averageComplianceScore: Math.round(averageScore)
      }
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve metrics',
      error: error.message
    });
  }
};

module.exports = exports;