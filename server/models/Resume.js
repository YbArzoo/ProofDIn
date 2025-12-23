const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobTitle: {
    type: String,
    default: 'Tailored Resume'
  },
  companyName: {
    type: String,
    default: 'Target Company'
  },
  jobDescriptionText: {
    type: String,
    required: true
  },
  content: {
    type: String, // This stores the Markdown/HTML resume
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Resume', ResumeSchema);