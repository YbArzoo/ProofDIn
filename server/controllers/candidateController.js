// server/controllers/candidateController.js
const CandidateProfile = require('../models/CandidateProfile');
const Skill = require('../models/Skill'); 

// Helper to get User ID safely (handles .id, .userId, or ._id)
function getSafeUserId(req) {
    if (!req.user) return null;
    return req.user.userId || req.user.id || req.user._id;
}

// Make sure only candidates can use these endpoints
function ensureCandidateRole(req, res) {
  // Debugging: See what the token actually decoded to
  console.log("--> DEBUG: req.user content:", req.user);

  if (!req.user) {
      console.log("--> DEBUG: No req.user found (Auth Middleware failed?)");
      res.status(401).json({ message: 'Not authorized' });
      return false;
  }
  
  // Note: Adjust 'candidate' to match your exact role string in DB
  if (req.user.role !== 'candidate') {
    console.log(`--> DEBUG: Role Mismatch. Expected 'candidate', got '${req.user.role}'`);
    res.status(403).json({ message: 'Only candidates can access this resource' });
    return false;
  }
  return true;
}

// ==========================================
// PROFILE FUNCTIONS
// ==========================================

exports.getMyProfile = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;
    const userId = getSafeUserId(req); // Use safe getter
    const profile = await CandidateProfile.findOne({ user: userId }).lean();
    if (!profile) return res.status(404).json({ message: 'Candidate profile not found' });
    res.json({ profile });
  } catch (err) {
    console.error('getMyProfile error:', err);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;
    const userId = getSafeUserId(req);
    
    // ... (Your existing update logic) ...
    const { headline, summary, photoUrl, experienceYears, location, education, skills, socialLinks, cvUrl } = req.body;
    const update = {};
    if (headline !== undefined) update.headline = headline;
    if (summary !== undefined) update.summary = summary;
    if (photoUrl !== undefined) update.photoUrl = photoUrl;
    if (experienceYears !== undefined) update.experienceYears = experienceYears;
    if (location !== undefined) update.location = location;
    if (education !== undefined) update.education = education;
    if (cvUrl !== undefined) update.cvUrl = cvUrl;
    if (Array.isArray(skills)) update.skills = skills;
    if (Array.isArray(socialLinks)) update.socialLinks = socialLinks;

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

// ==========================================
// SKILLS FUNCTIONS
// ==========================================

// GET /api/candidate/skills
exports.getSkills = async (req, res) => {
  try {
    console.log("---------------------------------------");
    console.log("--> DEBUG: GET /skills endpoint hit");
    
    if (!ensureCandidateRole(req, res)) return;
    
    const currentUserId = getSafeUserId(req);
    console.log("--> DEBUG: Querying DB for User ID:", currentUserId);
    
    const skills = await Skill.find({ user: currentUserId }).sort({ createdAt: -1 });
    console.log(`--> DEBUG: Found ${skills.length} skills`);
    
    res.json(skills);
  } catch (err) {
    console.error('getSkills error:', err);
    res.status(500).json({ message: 'Server Error fetching skills' });
  }
};

// POST /api/candidate/skills
exports.addSkill = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;

    const { name, level, category, lastUsed } = req.body;
    const userId = getSafeUserId(req);

    const newSkill = new Skill({
      user: userId, // Use the safe ID
      name,
      level,
      category,
      lastUsed,
      proofs: []
    });

    const savedSkill = await newSkill.save();
    console.log("--> DEBUG: Skill saved successfully:", savedSkill._id);
    res.json(savedSkill);
  } catch (err) {
    console.error('addSkill error:', err);
    res.status(500).json({ message: 'Server Error adding skill' });
  }
};

// DELETE /api/candidate/skills/:id
exports.deleteSkill = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;
    const userId = getSafeUserId(req);

    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ msg: 'Skill not found' });

    if (skill.user.toString() !== userId) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await skill.deleteOne();
    res.json({ msg: 'Skill removed' });
  } catch (err) {
    console.error('deleteSkill error:', err);
    res.status(500).json({ message: 'Server Error deleting skill' });
  }
};

// PUT /api/candidate/skills/:id
exports.updateSkill = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;
    const userId = getSafeUserId(req);

    let skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ msg: 'Skill not found' });

    // Verify ownership
    if (skill.user.toString() !== userId.toString()) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Update fields
    const { name, level, category, lastUsed } = req.body;
    skill.name = name || skill.name;
    skill.level = level || skill.level;
    skill.category = category || skill.category;
    skill.lastUsed = lastUsed || skill.lastUsed;

    const updatedSkill = await skill.save();
    res.json(updatedSkill);
  } catch (err) {
    console.error('updateSkill error:', err);
    res.status(500).json({ message: 'Server Error updating skill' });
  }
};

// POST /api/candidate/skills/:id/proof

exports.addProof = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;
    const userId = getSafeUserId(req);

    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ msg: 'Skill not found' });

    if (skill.user.toString() !== userId.toString()) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // --- NEW LOGIC ---
    let proofData = {
      text: req.body.text,
      type: req.body.type
    };

    if (req.file) {
      // If a file was uploaded, create the permanent URL
      // NOTE: Replace 'http://localhost:5000' with your actual production URL later
      proofData.url = `http://localhost:5000/uploads/${req.file.filename}`;
      proofData.type = 'file'; // Ensure type is file
    } else {
      // If it's just a text link
      proofData.url = req.body.url;
    }
    // -----------------

    skill.proofs.push(proofData); 
    await skill.save();
    res.json(skill);
  } catch (err) {
    console.error('addProof error:', err);
    res.status(500).json({ message: 'Server Error adding proof' });
  }
};

// DELETE /api/candidate/skills/:skillId/proof/:proofId
exports.deleteProof = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;
    const userId = getSafeUserId(req);

    const skill = await Skill.findById(req.params.skillId);
    if (!skill) return res.status(404).json({ msg: 'Skill not found' });

    // Verify ownership
    if (skill.user.toString() !== userId.toString()) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Filter out the proof with the matching _id
    // Mongoose automatically adds _id to subdocuments in an array
    skill.proofs = skill.proofs.filter(
      (proof) => proof._id.toString() !== req.params.proofId
    );

    await skill.save();
    res.json(skill);
  } catch (err) {
    console.error('deleteProof error:', err);
    res.status(500).json({ message: 'Server Error deleting proof' });
  }
};