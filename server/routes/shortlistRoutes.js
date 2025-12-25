const express = require('express');
const router = express.Router();
const shortlistController = require('../controllers/shortlistController'); 
const auth = require('../middleware/authMiddleware');

// @route   POST /api/shortlist/add
// @desc    Add candidate to shortlist
router.post('/add', auth, shortlistController.addToShortlist);

// @route   GET /api/shortlist
// @desc    Get recruiter's shortlist
router.get('/', auth, shortlistController.getShortlist);

// @route   PUT /api/shortlist/:id
// @desc    Update status (e.g. to "Interviewing")
router.put('/:id', auth, shortlistController.updateStatus);

// @route   DELETE /api/shortlist/:id
// @desc    Remove from shortlist
router.delete('/:id', auth, shortlistController.removeFromShortlist);

// @route   POST /api/shortlist/contact
// @desc    Send email to candidate (Ethereal Simulation)
router.post('/contact', auth, shortlistController.contactCandidate);

// ✅ NEW: Candidate fetches their offers
router.get('/my-offers', auth, shortlistController.getCandidateOffers);

// ✅ NEW: Candidate accepts/rejects
router.put('/respond/:id', auth, shortlistController.respondToOffer);

module.exports = router;