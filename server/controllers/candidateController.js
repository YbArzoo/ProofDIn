// server/controllers/candidateController.js
const CandidateProfile = require('../models/CandidateProfile');
const Skill = require('../models/Skill'); 
const User = require('../models/User'); // <--- CRITICAL IMPORT

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
    const userId = getSafeUserId(req); 
    const profile = await CandidateProfile.findOne({ user: userId }).lean();
    
    // ✅ FIX: Fetch User Data to return Name & Email
    const user = await User.findById(userId).select('fullName email');

    if (!profile) return res.status(404).json({ message: 'Candidate profile not found' });
    
    // Merge them so frontend gets names too
    res.json({ 
        profile: {
            ...profile,
            firstName: user?.fullName ? user.fullName.split(' ')[0] : '',
            lastName: user?.fullName ? user.fullName.split(' ').slice(1).join(' ') : '',
            email: user?.email
        }
    });
  } catch (err) {
    console.error('getMyProfile error:', err);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;
    const userId = getSafeUserId(req);
    
    // 1. Extract Data (Added 'phone')
    const { 
        firstName, lastName, // User fields
        headline, summary, phone, photoUrl, experienceYears, location, education, skills, socialLinks, cvUrl // Profile fields
    } = req.body;

    // 2. Update USER Model (Name changes)
    if (firstName || lastName) {
        const currentUser = await User.findById(userId);
        if (currentUser) {
            let newFirst = firstName || currentUser.fullName.split(' ')[0];
            let newLast = lastName || currentUser.fullName.split(' ').slice(1).join(' ');
            const newFullName = `${newFirst} ${newLast}`.trim();
            
            await User.findByIdAndUpdate(userId, { fullName: newFullName });
        }
    }

    // 3. Update CANDIDATE PROFILE Model
    const update = {};
    if (headline !== undefined) update.headline = headline;
    if (summary !== undefined) update.summary = summary;
    if (phone !== undefined) update.phone = phone; // <--- Saving Phone
    if (photoUrl !== undefined) update.photoUrl = photoUrl;
    if (experienceYears !== undefined) update.experienceYears = experienceYears;
    if (location !== undefined) update.location = location;
    if (education !== undefined) update.education = education;
    if (cvUrl !== undefined) update.cvUrl = cvUrl;
    
    if (skills) update.skills = skills; 
    if (socialLinks) update.socialLinks = socialLinks;

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
// SKILLS FUNCTIONS (Kept as is)
// ==========================================

exports.getSkills = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;
    const currentUserId = getSafeUserId(req);
    const skills = await Skill.find({ user: currentUserId }).sort({ createdAt: -1 });
    res.json(skills);
  } catch (err) {
    console.error('getSkills error:', err);
    res.status(500).json({ message: 'Server Error fetching skills' });
  }
};

exports.addSkill = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;
    const { name, level, category, lastUsed } = req.body;
    const userId = getSafeUserId(req);
    const newSkill = new Skill({ user: userId, name, level, category, lastUsed, proofs: [] });
    const savedSkill = await newSkill.save();
    res.json(savedSkill);
  } catch (err) {
    console.error('addSkill error:', err);
    res.status(500).json({ message: 'Server Error adding skill' });
  }
};

exports.deleteSkill = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;
    const userId = getSafeUserId(req);
    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ msg: 'Skill not found' });
    if (skill.user.toString() !== userId) return res.status(401).json({ msg: 'User not authorized' });
    await skill.deleteOne();
    res.json({ msg: 'Skill removed' });
  } catch (err) {
    console.error('deleteSkill error:', err);
    res.status(500).json({ message: 'Server Error deleting skill' });
  }
};

exports.updateSkill = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;
    const userId = getSafeUserId(req);
    let skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ msg: 'Skill not found' });
    if (skill.user.toString() !== userId.toString()) return res.status(401).json({ msg: 'User not authorized' });
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

exports.addProof = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;
    const userId = getSafeUserId(req);
    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ msg: 'Skill not found' });
    if (skill.user.toString() !== userId.toString()) return res.status(401).json({ msg: 'User not authorized' });
    let proofData = { text: req.body.text, type: req.body.type };
    if (req.file) {
      proofData.url = `http://localhost:5000/uploads/${req.file.filename}`;
      proofData.type = 'file'; 
    } else {
      proofData.url = req.body.url;
    }
    skill.proofs.push(proofData); 
    await skill.save();
    res.json(skill);
  } catch (err) {
    console.error('addProof error:', err);
    res.status(500).json({ message: 'Server Error adding proof' });
  }
};

exports.deleteProof = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;
    const userId = getSafeUserId(req);
    const skill = await Skill.findById(req.params.skillId);
    if (!skill) return res.status(404).json({ msg: 'Skill not found' });
    if (skill.user.toString() !== userId.toString()) return res.status(401).json({ msg: 'User not authorized' });
    skill.proofs = skill.proofs.filter((proof) => proof._id.toString() !== req.params.proofId);
    await skill.save();
    res.json(skill);
  } catch (err) {
    console.error('deleteProof error:', err);
    res.status(500).json({ message: 'Server Error deleting proof' });
  }
};