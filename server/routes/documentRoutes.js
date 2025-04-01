const express = require('express');
const { 
  getDocuments, 
  getDocument, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  getMetrics
} = require('../controllers/documentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Get metrics route
router.get('/metrics', getMetrics);

// Standard CRUD routes
router.route('/')
  .get(getDocuments)
  .post(createDocument);

router.route('/:id')
  .get(getDocument)
  .put(updateDocument)
  .delete(deleteDocument);

module.exports = router;
