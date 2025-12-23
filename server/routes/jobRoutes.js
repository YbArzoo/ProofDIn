const express = require('express');
const router = express.Router();

const { 
    analyzeJob, 
    matchCandidates, 
    getAllJobs, 
    getMyJobs, 
    deleteJob,
    getJob,
    updateJob,
    parseJobDescription,
    applyForJob,
    getAppliedJobs
} = require('../controllers/jobController');

const auth = require('../middleware/authMiddleware');

// --- EXISTING ROUTES ---
router.post('/analyze', auth, analyzeJob);
router.post('/match', auth, matchCandidates);
router.get('/', getAllJobs);
router.get('/myjobs', auth, getMyJobs);
router.post('/parse-jd', auth, parseJobDescription);

// --- NEW ROUTES (ORDER MATTERS!) ---

// 1. GET APPLIED JOBS (MUST BE ABOVE /:id) <--- MOVED THIS UP
router.get('/applied', auth, getAppliedJobs); 

// 2. APPLY TO JOB
router.post('/:id/apply', auth, applyForJob);

// 3. SINGLE JOB ROUTES (Dynamic IDs must be last)
router.get('/:id', auth, getJob); // <--- This catches everything else
router.put('/:id', auth, updateJob);
router.delete('/:id', auth, deleteJob);

module.exports = router;