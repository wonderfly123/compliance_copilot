// server/controllers/referenceController.js
const multer = require('multer');
const path = require('path');
const { processDocument, createEmbedding } = require('../services/documentProcessor');
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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for larger reference docs
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
 * Get all reference documents
 * @route GET /api/references
 */
exports.getReferences = async (req, res) => {
  try {
    console.log('Fetching reference documents...');
    
    // Get references from Supabase
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('document_type', 'reference')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log('References fetched successfully:', data ? data.length : 0, 'references found');
    
    // Transform the data to match the expected format in the frontend
    const transformedData = data ? data.map(ref => ({
      id: ref.id,
      title: ref.title,
      type: ref.doc_subtype || 'Federal Guide',
      uploadDate: ref.created_at ? new Date(ref.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: ref.status || 'Active',
      description: ref.description || '',
      sourceOrg: ref.source_org || 'FEMA'
    })) : [];
    
    return res.status(200).json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Error getting reference documents:', error);
    
    // In development mode, return mock data instead of error
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode - returning mock reference data on error');
      const mockReferences = [
        {
          id: "ref-1",
          title: "FEMA CPG 101",
          type: "Federal Guide",
          uploadDate: "2025-03-15",
          status: "Active",
          description: "Comprehensive Preparedness Guide",
          sourceOrg: "FEMA"
        },
        {
          id: "ref-2",
          title: "NFPA 1600",
          type: "Standard",
          uploadDate: "2025-02-28",
          status: "Active",
          description: "Standard on Continuity, Emergency, and Crisis Management",
          sourceOrg: "NFPA"
        },
        {
          id: "ref-3",
          title: "Cal OES Planning Guide",
          type: "State Guide",
          uploadDate: "2025-03-10",
          status: "Active",
          description: "California Emergency Planning Guide",
          sourceOrg: "Cal OES"
        }
      ];
      
      return res.status(200).json({
        success: true,
        data: mockReferences
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve reference documents',
      error: error.message
    });
  }
};

/**
 * Get a specific reference document
 * @route GET /api/references/:id
 */
exports.getReference = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('document_type', 'reference')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Reference document not found'
        });
      }
      throw error;
    }
    
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error getting reference document:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve reference document',
      error: error.message
    });
  }
};

/**
 * Create a reference document without file
 * @route POST /api/references
 */
exports.createReference = async (req, res) => {
  try {
    const { title, description, type, sourceOrg, authorityLevel, tags } = req.body;
    
    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title and type are required'
      });
    }
    
    const documentData = {
      document_type: 'reference',
      doc_subtype: type,
      title,
      description: description || '',
      user_id: req.user.id,
      tags: tags || [],
      source_org: sourceOrg || '',
      authority_level: authorityLevel || 'guideline',
      metadata: {}
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
    console.error('Error creating reference document:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create reference document',
      error: error.message
    });
  }
};

/**
 * Upload a reference document with file
 * @route POST /api/references/upload
 */
exports.uploadReference = async (req, res) => {
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
      
      // Now process the document with user ID
      try {
        console.log('Uploading reference document with user:', req.user?.id);
        
        const result = await processDocument(
          req.file, 
          {
            documentType: 'reference',
            title: req.body.title,
            type: req.body.type,
            description: req.body.description,
            userId: req.user.id,
            tags: req.body.tags ? JSON.parse(req.body.tags) : [],
            sourceOrg: req.body.sourceOrg || '',
            authorityLevel: req.body.authorityLevel || 'guideline',
            publicationDate: req.body.publicationDate || null
          }
        );
        
        return res.status(201).json({
          success: true,
          data: {
            id: result.documentId,
            title: req.body.title,
            type: req.body.type
          }
        });
      } catch (processError) {
        console.error('Error processing reference document:', processError);
        return res.status(500).json({
          success: false,
          message: 'Failed to process reference document',
          error: processError.message
        });
      }
    });
  } catch (error) {
    console.error('Error in reference upload controller:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during upload',
      error: error.message
    });
  }
};

/**
 * Update a reference document
 * @route PUT /api/references/:id
 */
exports.updateReference = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, sourceOrg, authorityLevel, tags } = req.body;
    
    // Check if reference document exists
    const { data: existingDoc, error: checkError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', id)
      .eq('document_type', 'reference')
      .single();
    
    if (checkError || !existingDoc) {
      return res.status(404).json({
        success: false,
        message: 'Reference document not found'
      });
    }
    
    // Update the reference document
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (type) updateData.doc_subtype = type;
    if (sourceOrg) updateData.source_org = sourceOrg;
    if (authorityLevel) updateData.authority_level = authorityLevel;
    if (tags) updateData.tags = tags;
    
    const { error: updateError } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', id);
    
    if (updateError) throw updateError;
    
    return res.status(200).json({
      success: true,
      message: 'Reference document updated successfully'
    });
  } catch (error) {
    console.error('Error updating reference document:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update reference document',
      error: error.message
    });
  }
};

/**
 * Delete a reference document
 * @route DELETE /api/references/:id
 */
exports.deleteReference = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if reference document exists and get file_url
    const { data: refDoc, error: checkError } = await supabase
      .from('documents')
      .select('file_url')
      .eq('id', id)
      .eq('document_type', 'reference')
      .single();
    
    if (checkError || !refDoc) {
      return res.status(404).json({
        success: false,
        message: 'Reference document not found'
      });
    }
    
    // Delete the reference document from the database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    // Delete the file from storage
    if (refDoc.file_url) {
      const { error: storageError } = await supabase
        .storage
        .from('reference-documents')
        .remove([refDoc.file_url]);
      
      if (storageError) {
        console.error('Error removing file from storage:', storageError);
        // Continue with the response even if storage delete fails
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Reference document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reference document:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete reference document',
      error: error.message
    });
  }
};

/**
 * Search reference documents by content
 * @route POST /api/references/search
 */
exports.searchReferences = async (req, res) => {
  try {
    const { query, type } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    // Generate embedding for the query
    const embedding = await createEmbedding(query);
    
    // Search in vector database
    const { data: searchResults, error: searchError } = await supabase.rpc('match_references', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 10
    });
    
    if (searchError) throw searchError;
    
    // Filter by type if provided
    let filteredResults = searchResults;
    if (type) {
      // Get document IDs to filter by type
      const docIds = [...new Set(searchResults.map(result => result.document_id))];
      
      // Get document metadata
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('id, title, doc_subtype')
        .in('id', docIds)
        .eq('document_type', 'reference');
      
      if (docError) throw docError;
      
      // Create a mapping of document IDs to types
      const docTypeMap = {};
      documents.forEach(doc => {
        docTypeMap[doc.id] = doc.doc_subtype;
      });
      
      // Filter results by document type
      filteredResults = searchResults.filter(result => 
        docTypeMap[result.document_id] === type
      );
    }
    
    // Format results
    const formattedResults = await Promise.all(filteredResults.map(async result => {
      // Get document metadata
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('title, doc_subtype, description')
        .eq('id', result.document_id)
        .single();
      
      if (docError) {
        console.error('Error getting document metadata:', docError);
        return null;
      }
      
      return {
        id: result.document_id,
        title: document.title,
        type: document.doc_subtype,
        description: document.description,
        content: result.content,
        relevance: Math.round(result.similarity * 100),
        metadata: result.metadata
      };
    }));
    
    // Filter out null results
    const validResults = formattedResults.filter(result => result !== null);
    
    return res.status(200).json({
      success: true,
      data: validResults
    });
  } catch (error) {
    console.error('Error searching reference documents:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search reference documents',
      error: error.message
    });
  }
};

module.exports = exports;