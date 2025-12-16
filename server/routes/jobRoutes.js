// server/routes/jobRoutes.js
const express = require('express');
const router = express.Router();

// 1. UPDATE IMPORTS: Add getMyJobs and deleteJob to this list
const { 
    analyzeJob, 
    matchCandidates, 
    getAllJobs, 
    getMyJobs, 
    deleteJob 
} = require('../controllers/jobController');

const auth = require('../middleware/authMiddleware');

// --- EXISTING ROUTES ---

// POST /api/jobs/analyze (Protected)
router.post('/analyze', auth, analyzeJob);

// POST /api/jobs/match (Protected)
router.post('/match', auth, matchCandidates);

// GET /api/jobs (Public - Get all jobs for portal)
router.get('/', getAllJobs);


// --- NEW ROUTES FOR RECRUITER DASHBOARD ---

// GET /api/jobs/myjobs (Protected - Get only logged-in recruiter's jobs)
router.get('/myjobs', auth, getMyJobs);

// DELETE /api/jobs/:id (Protected - Delete a specific job)
router.delete('/:id', auth, deleteJob);

module.exports = router;