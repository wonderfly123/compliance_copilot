// server/routes/plansRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth'); // Using your existing auth middleware name
const plansController = require('../controllers/plansController');

// Apply authentication middleware to all routes
router.use(protect);

// Get metrics route (keeping your existing endpoint)
router.get('/metrics', plansController.getMetrics);

// Standard CRUD routes
router.route('/')
  .get(plansController.getPlans) // Using the existing controller function name
  .post(plansController.createPlan); // Keeping your existing createPlan endpoint

router.route('/:id')
  .get(plansController.getPlan)
  .put(plansController.updatePlan)
  .delete(plansController.deletePlan);

// New routes for plan upload, analysis and suggestions
router.post('/upload', plansController.uploadPlan);
router.get('/:planId/analysis', plansController.getPlanAnalysis);
router.get('/:planId/suggestions', plansController.getPlanSuggestions);

module.exports = router;