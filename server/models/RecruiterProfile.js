const mongoose = require('mongoose');

const recruiterProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    // Organization Details
    orgName: { type: String, required: true },
    orgRole: { type: String, required: true }, // Job Title
    orgWebsite: { type: String },
    orgLocation: { type: String },
    industry: { type: String },
    orgSize: { type: String },
    department: { type: String },
    
    // Personal Details (Stored here for simplicity, extending User)
    phone: { type: String },
    bio: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("RecruiterProfile", recruiterProfileSchema);