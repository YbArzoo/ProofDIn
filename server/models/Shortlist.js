const mongoose = require('mongoose');

const ShortlistSchema = new mongoose.Schema({
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CandidateProfile',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    default: null
  },
  // ✅ NEW FIELD: Stores your custom name for the card
  customLabel: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['saved', 'emailed', 'interviewing', 'offer', 'rejected'], 
    default: 'saved'
  },
  note: {
    type: String
  },
  dateAdded: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Shortlist', ShortlistSchema);