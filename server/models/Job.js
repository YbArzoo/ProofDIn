const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  
  // New Fields matching your HTML form
  jobType: { type: String, default: 'Full-Time' }, // Full-Time, Contract, etc.
  experienceLevel: { type: String, default: 'Mid Level' },
  locationType: { type: String, default: 'Remote' }, // On-Site, Hybrid, Remote
  location: { type: String }, // "City, Country"
  salary: {
    min: { type: Number },
    max: { type: Number }
  },
  benefits: [{ type: String }], // Array of strings
  responsibilities: { type: String },
  
  // Skills
  skills: [{ type: String }],
  niceToHaveSkills: [{ type: String }], 
  
  // Legacy/Backup fields
  rawText: { type: String },
  extractedSkills: [{ type: String }],

  // --- ADD THIS SECTION HERE ---
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