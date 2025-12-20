const express = require('express');
const router = express.Router();

// FIX: Use the correct filename 'authMiddleware' instead of 'auth'
const auth = require('../middleware/authMiddleware'); 
const upload = require('../middleware/upload'); 
const recruiterController = require('../controllers/recruiterController');

// Existing Routes
router.get('/me', auth, recruiterController.getRecruiterProfile);
router.put('/me/personal', auth, recruiterController.updatePersonalInfo);
router.put('/me/organization', auth, recruiterController.updateOrgInfo);

// Upload Route
router.post('/me/avatar', auth, upload.single('image'), recruiterController.uploadProfilePicture);

module.exports = router;