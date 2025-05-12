// server/routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const aiController = require('../controllers/aiController');

// Gap Analysis AI routes
router.post('/analyze', protect, aiController.analyzePlan);
router.get('/analysis/:planId', protect, aiController.getAnalysisResults);
router.get('/analysis/:planId/thinking', protect, aiController.getAnalysisThinkingProcess);

// New Multi-Agent System routes
router.post('/reference/process', protect, aiController.processReferenceDocument);
router.delete('/reference/:documentId', protect, aiController.deleteReferenceDocument);
router.get('/reference/:documentId/requirements', protect, aiController.getDocumentRequirements);
router.post('/requirements/reconcile', protect, aiController.reconcileRequirements);
router.get('/findings/:analysisId', protect, aiController.getAnalysisFindings);

// Copilot AI routes
router.post('/answer', protect, aiController.answerQuestion);
router.post('/explain', protect, aiController.explainConcept);

module.exports = router;