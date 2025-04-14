// server/routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const aiController = require('../controllers/aiController');

// Gap Analysis AI routes
router.post('/analyze', protect, aiController.analyzePlan);
router.get('/analysis/:planId', protect, aiController.getAnalysisResults);
router.get('/analysis/:planId/thinking', protect, aiController.getAnalysisThinkingProcess);

// Copilot AI routes
router.post('/answer', protect, aiController.answerQuestion);
router.post('/explain', protect, aiController.explainConcept);

module.exports = router;