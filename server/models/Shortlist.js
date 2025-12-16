const mongoose = require('mongoose');

const ShortlistSchema = new mongoose.Schema({
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CandidateProfile', // Links to the candidate's data
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job', // Optional: links the save to a specific job post
    required: false
  },
  status: {
    type: String,
    enum: ['saved', 'interviewing', 'offer', 'rejected'],
    default: 'saved'
  },
  note: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a recruiter can't save the same candidate twice for the same job
ShortlistSchema.index({ recruiter: 1, candidate: 1, job: 1 }, { unique: true });

module.exports = mongoose.model('Shortlist', ShortlistSchema);