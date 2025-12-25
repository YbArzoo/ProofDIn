// server/models/CandidateProfile.js
const mongoose = require('mongoose');

// Each proof from candidate (GitHub, cert, demo, portfolio, etc.)
const proofSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['github', 'demo', 'certificate', 'portfolio', 'linkedin', 'other'],
      default: 'other',
    },
    label: String,   // e.g. "GitHub PR #245"
    url: String,     // e.g. "https://github.com/..."
    isPublic: { type: Boolean, default: true },
  },
  { _id: false }
);

// Per-skill structure
const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },      // "React", "TypeScript"
    lastUsedDaysAgo: { type: Number, default: 365 },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate',
    },
    proofs: [proofSchema],                       // proofs connected to this skill
  },
  { _id: false }
);

// Generic social / portfolio links
const socialLinkSchema = new mongoose.Schema(
  {
    label: String,   // "GitHub", "LinkedIn", "Portfolio"
    url: String,
  },
  { _id: false }
);

const candidateProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // Your original fields
    headline: String,
    summary: String,
    photoUrl: String,
    
    // ✅ ADD THIS NEW PORTFOLIO CONFIGURATION OBJECT:
    portfolio: { 
      theme: { type: String, default: 'modern' },
      showPhoto: { type: Boolean, default: true },
      showContact: { type: Boolean, default: true },
      showBio: { type: Boolean, default: true },
      showExperience: { type: Boolean, default: true },
      showEducation: { type: Boolean, default: true },
      showSkills: { type: Boolean, default: true },
      customTitle: { type: String, default: 'My Portfolio' }
    },

    // ✅ ADDED PHONE FIELD HERE
    phone: String, 

    // Extra fields useful for recruiters
    experienceYears: Number,
    location: String,
    education: String,

    // Skills & proofs
    skills: [skillSchema],

    // Global links / CV
    socialLinks: [socialLinkSchema],
    cvUrl: String,     // URL to uploaded CV
  },
  { timestamps: true }
);

module.exports = mongoose.model('CandidateProfile', candidateProfileSchema);