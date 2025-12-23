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
  status: {
    type: String,
    enum: ['saved', 'emailed', 'interviewing', 'offer', 'rejected'], // <--- ADD 'emailed' HERE
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