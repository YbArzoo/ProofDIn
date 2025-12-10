// server/routes/jobRoutes.js
const express = require('express');
const router = express.Router();
const { analyzeJob, matchCandidates } = require('../controllers/jobController');
const auth = require('../middleware/authMiddleware');

// POST /api/jobs/analyze
router.post('/analyze', auth, analyzeJob);

// POST /api/jobs/match
router.post('/match', auth, matchCandidates);

module.exports = router;
