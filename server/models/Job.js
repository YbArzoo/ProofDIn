const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: { type: String, default: 'Confidential' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  
  // --- NEW STATUS FIELD ---
  status: {
    type: String,
    enum: ['draft', 'published', 'closed'],
    default: 'draft' // <--- Key Fix: All jobs start as Drafts (Hidden)
  },

  // Existing fields...
  jobType: { type: String, default: 'Full-Time' },
  experienceLevel: { type: String, default: 'Mid Level' },
  locationType: { type: String, default: 'Remote' },
  location: { type: String },
  salary: {
    min: { type: Number },
    max: { type: Number }
  },
  benefits: [{ type: String }],
  responsibilities: { type: String },
  
  skills: [{ type: String }],
  niceToHaveSkills: [{ type: String }], 
  
  rawText: { type: String },
  extractedSkills: [{ type: String }],

  applicants: [{
      candidate: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: 'User',
          required: true
      },
      status: { 
          type: String, 
          enum: ['Applied', 'Under Review', 'Interviewing', 'Selected', 'Rejected'], 
          default: 'Applied' 
      },
      appliedAt: { 
          type: Date, 
          default: Date.now 
      }
  }],
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', JobSchema);