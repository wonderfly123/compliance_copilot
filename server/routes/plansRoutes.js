const express = require('express');
const { 
  getPlans, 
  getPlan, 
  createPlan, 
  updatePlan, 
  deletePlan,
  getMetrics
} = require('../controllers/plansController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Get metrics route
router.get('/metrics', getMetrics);

// Standard CRUD routes
router.route('/')
  .get(getPlans)
  .post(createPlan);

router.route('/:id')
  .get(getPlan)
  .put(updatePlan)
  .delete(deletePlan);

module.exports = router;
