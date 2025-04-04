const express = require('express');
const { 
  getReferences, 
  getReference, 
  createReference, 
  updateReference, 
  deleteReference,
  searchReferences
} = require('../controllers/referenceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Search route
router.post('/search', searchReferences);

// Standard CRUD routes
router.route('/')
  .get(getReferences)
  .post(authorize('admin'), createReference);

router.route('/:id')
  .get(getReference)
  .put(authorize('admin'), updateReference)
  .delete(authorize('admin'), deleteReference);

module.exports = router;