// server/models/Job.js
const mongoose = require('mongoose');

const shortlistSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CandidateProfile',
      required: true,
    },
    tag: {
      type: String,
      enum: ['interview', 'maybe', 'hold'],
      default: 'maybe',
    },
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String },
    description: { type: String, required: true },
    skills: [String],              // skills extracted from JD
    createdAt: { type: Date, default: Date.now },
    shortlist: [shortlistSchema],  // recruiter’s shortlist per job
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', jobSchema);
