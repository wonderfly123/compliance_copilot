const Document = require('../models/Document');

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private
exports.getDocuments = async (req, res) => {
  try {
    // Query parameters for filtering
    const { type, status } = req.query;
    
    // Build query
    let query = { owner: req.user.id };
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }
    
    const documents = await Document.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get a single document
// @route   GET /api/documents/:id
// @access  Private
exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    
    // Make sure user owns document
    if (document.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Not authorized to access this document' });
    }
    
    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a document
// @route   POST /api/documents
// @access  Private
exports.createDocument = async (req, res) => {
  try {
    // Add user to request body
    req.body.owner = req.user.id;
    
    const document = await Document.create(req.body);
    
    res.status(201).json({
      success: true,
      data: document
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Update a document
// @route   PUT /api/documents/:id
// @access  Private
exports.updateDocument = async (req, res) => {
  try {
    let document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    
    // Make sure user owns document
    if (document.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Not authorized to update this document' });
    }
    
    document = await Document.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Delete a document
// @route   DELETE /api/documents/:id
// @access  Private
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    
    // Make sure user owns document
    if (document.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Not authorized to delete this document' });
    }
    
    await document.deleteOne();
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get dashboard metrics
// @route   GET /api/documents/metrics
// @access  Private
exports.getMetrics = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all user's documents
    const allDocuments = await Document.find({ owner: userId });
    
    // Calculate metrics
    const today = new Date();
    
    // Plans expiring soon (within 30 days)
    const expiringPlans = allDocuments.filter(doc => {
      if (!doc.expirationDate) return false;
      const expiryDate = new Date(doc.expirationDate);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length;
    
    // Low compliance plans (below 75%)
    const lowCompliancePlans = allDocuments.filter(doc => 
      doc.complianceScore < 75
    ).length;
    
    // Total critical sections
    const criticalSectionsCount = allDocuments.reduce(
      (total, doc) => total + (doc.criticalSections || 0), 0
    );
    
    // Priority plans
    const priorityPlans = allDocuments
      .filter(doc => doc.complianceScore < 85 || doc.criticalSections > 0)
      .sort((a, b) => a.complianceScore - b.complianceScore)
      .slice(0, 3)
      .map(doc => ({
        id: doc._id,
        title: doc.title,
        status: doc.status,
        complianceScore: doc.complianceScore,
        criticalSections: doc.criticalSections,
        expirationDate: doc.expirationDate
      }));
    
    res.json({
      success: true,
      data: {
        expiringPlans,
        lowCompliancePlans,
        criticalSectionsCount,
        priorityPlans,
        totalDocuments: allDocuments.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
