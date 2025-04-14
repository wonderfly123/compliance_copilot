// server/routes/index.js
const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const plansRoutes = require('./plansRoutes');
const referenceRoutes = require('./referenceRoutes');
const aiRoutes = require('./aiRoutes');

router.use('/auth', authRoutes);
router.use('/plans', plansRoutes);
router.use('/references', referenceRoutes);
router.use('/ai', aiRoutes);

module.exports = router;