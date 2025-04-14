// server/routes/referenceRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth'); // Using your existing auth middleware
const referenceController = require('../controllers/referenceController');

// Apply authentication middleware to all routes
router.use(protect);

// Search route
router.post('/search', referenceController.searchReferences);

// Standard CRUD routes
router.route('/')
  .get(referenceController.getReferences)
  .post(authorize('admin'), referenceController.createReference);

router.route('/:id')
  .get(referenceController.getReference)
  .put(authorize('admin'), referenceController.updateReference)
  .delete(authorize('admin'), referenceController.deleteReference);

// New route for file upload
router.post('/upload', authorize('admin'), referenceController.uploadReference);

module.exports = router;