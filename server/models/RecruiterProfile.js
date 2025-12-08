const mongoose = require('mongoose');

const recruiterProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    orgName: { type: String, required: true },
    orgRole: { type: String, required: true },
    orgWebsite: String,
    orgLocation: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("RecruiterProfile", recruiterProfileSchema);
