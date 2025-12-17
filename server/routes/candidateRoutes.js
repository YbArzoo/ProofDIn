// server/routes/candidateRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  getMyProfile,
  updateMyProfile,
} = require('../controllers/candidateController');

// 👇 1. IMPORT THE NEW CONTROLLER
const resumeController = require('../controllers/resumeController'); // <--- NEW

// All candidate routes require auth (JWT)
router.get('/me', auth, getMyProfile);
router.put('/me', auth, updateMyProfile);

// 👇 2. ADD THE NEW ROUTE
router.post('/generate-resume', auth, resumeController.generateTailoredResume); // <--- NEW

module.exports = router;
