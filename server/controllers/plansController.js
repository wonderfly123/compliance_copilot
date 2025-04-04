const Plan = require('../models/Plan');

// @desc    Get all plans
// @route   GET /api/plans
// @access  Private
exports.getPlans = async (req, res) => {
  try {
    // Query parameters for filtering
    const { type, status } = req.query;
    
    // Build filters
    const filters = {};
    if (type) {
      filters.type = type;
    }
    
    if (status) {
      filters.status = status;
    }
    
    const plans = await Plan.findByUser(req.user.id, filters);
    
    res.json({
      success: true,
      count: plans.length,
      data: plans
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get a single plan
// @route   GET /api/plans/:id
// @access  Private
exports.getPlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    
    // Make sure user owns plan
    if (plan.owner !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Not authorized to access this plan' });
    }
    
    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a plan
// @route   POST /api/plans
// @access  Private
exports.createPlan = async (req, res) => {
  try {
    // Add user to request body
    req.body.owner = req.user.id;
    
    // Handle file upload if provided
    if (req.files && req.files.file) {
      const file = req.files.file;
      const filePath = `${req.user.id}/${Date.now()}_${file.name}`;
      const fileUrl = await Plan.uploadFile(file, filePath);
      req.body.file_url = fileUrl;
    }
    
    const plan = await Plan.create(req.body);
    
    res.status(201).json({
      success: true,
      data: plan
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Update a plan
// @route   PUT /api/plans/:id
// @access  Private
exports.updatePlan = async (req, res) => {
  try {
    let plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    
    // Make sure user owns plan
    if (plan.owner !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Not authorized to update this plan' });
    }
    
    // Handle file upload if provided
    if (req.files && req.files.file) {
      const file = req.files.file;
      const filePath = `${req.user.id}/${Date.now()}_${file.name}`;
      const fileUrl = await Plan.uploadFile(file, filePath);
      req.body.file_url = fileUrl;
    }
    
    plan = await Plan.update(req.params.id, req.body);
    
    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Delete a plan
// @route   DELETE /api/plans/:id
// @access  Private
exports.deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    
    // Make sure user owns plan
    if (plan.owner !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Not authorized to delete this plan' });
    }
    
    await Plan.delete(req.params.id);
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get dashboard metrics
// @route   GET /api/plans/metrics
// @access  Private
exports.getMetrics = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all user's plans
    const allPlans = await Plan.findByUser(userId);
    
    // Calculate metrics
    const today = new Date();
    
    // Plans expiring soon (within 30 days)
    const expiringPlans = allPlans.filter(plan => {
      if (!plan.expiration_date) return false;
      const expiryDate = new Date(plan.expiration_date);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length;
    
    // Low compliance plans (below 75%)
    const lowCompliancePlans = allPlans.filter(plan => 
      plan.compliance_score < 75
    ).length;
    
    // Total critical sections
    const criticalSectionsCount = allPlans.reduce(
      (total, plan) => total + (plan.critical_sections || 0), 0
    );
    
    // Priority plans
    const priorityPlans = allPlans
      .filter(plan => plan.compliance_score < 85 || plan.critical_sections > 0)
      .sort((a, b) => a.compliance_score - b.compliance_score)
      .slice(0, 3)
      .map(plan => ({
        id: plan.id,
        title: plan.title,
        status: plan.status,
        compliance_score: plan.compliance_score,
        critical_sections: plan.critical_sections,
        expiration_date: plan.expiration_date
      }));
    
    res.json({
      success: true,
      data: {
        expiringPlans,
        lowCompliancePlans,
        criticalSectionsCount,
        priorityPlans,
        totalPlans: allPlans.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
