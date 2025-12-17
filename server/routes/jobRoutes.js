// server/routes/jobRoutes.js
const express = require('express');
const router = express.Router();

// 1. UPDATE IMPORTS: Add parseJobDescription to this list
const { 
    analyzeJob, 
    matchCandidates, 
    getAllJobs, 
    getMyJobs, 
    deleteJob,
    getJob,
    updateJob,
    parseJobDescription // <--- THIS WAS MISSING
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
// IMPORTANT: This must remain ABOVE the /:id routes
router.get('/myjobs', auth, getMyJobs);

// --- AI PARSING ROUTE ---
// POST /api/jobs/parse-jd (Parse raw text into form fields)
router.post('/parse-jd', auth, parseJobDescription); // <--- New Route

// --- SINGLE JOB OPERATIONS (ID BASED) ---

// GET /api/jobs/:id (Get single job details for editing)
router.get('/:id', auth, getJob);

// PUT /api/jobs/:id (Update job details)
router.put('/:id', auth, updateJob);

// DELETE /api/jobs/:id (Delete a specific job)
router.delete('/:id', auth, deleteJob);

module.exports = router;