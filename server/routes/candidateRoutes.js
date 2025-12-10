// server/routes/candidateRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  getMyProfile,
  updateMyProfile,
} = require('../controllers/candidateController');

// All candidate routes require auth (JWT)
router.get('/me', auth, getMyProfile);
router.put('/me', auth, updateMyProfile);

module.exports = router;
