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
    cvUrl: String,     // URL to uploaded CV (for now we treat it as a link)
  },
  { timestamps: true }
);

module.exports = mongoose.model('CandidateProfile', candidateProfileSchema);