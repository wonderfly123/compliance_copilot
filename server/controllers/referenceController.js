const ReferenceDocument = require('../models/ReferenceDocument');

// @desc    Get all reference documents
// @route   GET /api/references
// @access  Private
exports.getReferences = async (req, res) => {
  try {
    // Query parameters for filtering
    const { type, category } = req.query;
    
    // Build filters
    const filters = {};
    if (type) {
      filters.type = type;
    }
    
    if (category) {
      filters.category = category;
    }
    
    const references = await ReferenceDocument.findAll(filters);
    
    res.json({
      success: true,
      count: references.length,
      data: references
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get a single reference document
// @route   GET /api/references/:id
// @access  Private
exports.getReference = async (req, res) => {
  try {
    const reference = await ReferenceDocument.findById(req.params.id);
    
    if (!reference) {
      return res.status(404).json({ success: false, error: 'Reference document not found' });
    }
    
    res.json({
      success: true,
      data: reference
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a reference document
// @route   POST /api/references
// @access  Private (Admin only)
exports.createReference = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only admins can create reference documents' 
      });
    }
    
    // Handle file upload if provided
    if (req.files && req.files.file) {
      const file = req.files.file;
      const filePath = `reference/${Date.now()}_${file.name}`;
      const fileUrl = await ReferenceDocument.uploadFile(file, filePath);
      req.body.file_url = fileUrl;
    }
    
    const reference = await ReferenceDocument.create(req.body);
    
    // If embeddings are provided (this would typically be done by a separate process)
    // but we include it here for completeness
    if (req.body.embeddings) {
      await ReferenceDocument.storeEmbeddings(reference.id, req.body.embeddings);
    }
    
    res.status(201).json({
      success: true,
      data: reference
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Update a reference document
// @route   PUT /api/references/:id
// @access  Private (Admin only)
exports.updateReference = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only admins can update reference documents' 
      });
    }
    
    let reference = await ReferenceDocument.findById(req.params.id);
    
    if (!reference) {
      return res.status(404).json({ success: false, error: 'Reference document not found' });
    }
    
    // Handle file upload if provided
    if (req.files && req.files.file) {
      const file = req.files.file;
      const filePath = `reference/${Date.now()}_${file.name}`;
      const fileUrl = await ReferenceDocument.uploadFile(file, filePath);
      req.body.file_url = fileUrl;
    }
    
    reference = await ReferenceDocument.update(req.params.id, req.body);
    
    res.json({
      success: true,
      data: reference
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Delete a reference document
// @route   DELETE /api/references/:id
// @access  Private (Admin only)
exports.deleteReference = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only admins can delete reference documents' 
      });
    }
    
    const reference = await ReferenceDocument.findById(req.params.id);
    
    if (!reference) {
      return res.status(404).json({ success: false, error: 'Reference document not found' });
    }
    
    await ReferenceDocument.delete(req.params.id);
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Search references
// @route   POST /api/references/search
// @access  Private
exports.searchReferences = async (req, res) => {
  try {
    const { query, filters = {}, limit = 10 } = req.body;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }
    
    const results = await ReferenceDocument.search(query, filters, limit);
    
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};