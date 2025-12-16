const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { 
  addToShortlist, 
  getShortlist, 
  updateStatus, 
  removeFromShortlist,
  contactCandidate 
} = require('../controllers/shortlistController');

router.post('/add', auth, addToShortlist);
router.get('/', auth, getShortlist);
router.put('/:id', auth, updateStatus);
router.delete('/:id', auth, removeFromShortlist);
router.post('/contact', auth, contactCandidate);

module.exports = router;