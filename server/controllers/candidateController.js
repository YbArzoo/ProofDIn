// server/controllers/candidateController.js
const CandidateProfile = require('../models/CandidateProfile');

// Make sure only candidates can use these endpoints
function ensureCandidateRole(req, res) {
  if (!req.user || req.user.role !== 'candidate') {
    res.status(403).json({ message: 'Only candidates can access this resource' });
    return false;
  }
  return true;
}

// GET /api/candidate/me
// Returns the current candidate's profile
exports.getMyProfile = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;

    const userId = req.user.userId; // from JWT payload
    const profile = await CandidateProfile.findOne({ user: userId }).lean();

    if (!profile) {
      return res.status(404).json({ message: 'Candidate profile not found' });
    }

    res.json({ profile });
  } catch (err) {
    console.error('getMyProfile error:', err);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

// PUT /api/candidate/me
// Update headline, summary, skills, proofs, links, cvUrl, etc.
exports.updateMyProfile = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;

    const userId = req.user.userId;

    // We accept these fields from the frontend
    const {
      headline,
      summary,
      photoUrl,
      experienceYears,
      location,
      education,
      skills,
      socialLinks,
      cvUrl,
    } = req.body;

    const update = {};

    if (headline !== undefined) update.headline = headline;
    if (summary !== undefined) update.summary = summary;
    if (photoUrl !== undefined) update.photoUrl = photoUrl;
    if (experienceYears !== undefined) update.experienceYears = experienceYears;
    if (location !== undefined) update.location = location;
    if (education !== undefined) update.education = education;
    if (cvUrl !== undefined) update.cvUrl = cvUrl;

    // skills & socialLinks are full arrays – easiest is overwrite
    if (Array.isArray(skills)) {
      update.skills = skills;
    }
    if (Array.isArray(socialLinks)) {
      update.socialLinks = socialLinks;
    }

    const profile = await CandidateProfile.findOneAndUpdate(
      { user: userId },
      { $set: update },
      { new: true, upsert: true }
    ).lean();

    res.json({ message: 'Profile updated', profile });
  } catch (err) {
    console.error('updateMyProfile error:', err);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};
