const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware'); // Ensure this matches your actual middleware filename
const { 
    getRecruiterProfile, 
    updatePersonalInfo, 
    updateOrgInfo 
} = require('../controllers/recruiterController');

// All routes are protected by JWT auth
router.get('/me', auth, getRecruiterProfile);
router.put('/me/personal', auth, updatePersonalInfo);
router.put('/me/organization', auth, updateOrgInfo);

module.exports = router;