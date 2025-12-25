// server/controllers/candidateController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const CandidateProfile = require('../models/CandidateProfile');
const Skill = require('../models/Skill'); 
const User = require('../models/User'); 
const Resume = require('../models/Resume'); 

// Initialize AI
// ✅ FIX: Use 'gemini-2.0-flash' to avoid 404 errors
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to get User ID safely
function getSafeUserId(req) {
  if (!req.user) return null;
  return req.user.userId || req.user.id || req.user._id;
}

function ensureCandidateRole(req, res) {
  if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return false;
  }
  if (req.user.role !== 'candidate') {
    res.status(403).json({ message: 'Only candidates can access this resource' });
    return false;
  }
  return true;
}

// ==========================================
// RESUME GENERATION (Restored)
// ==========================================

exports.generateTailoredResume = async (req, res) => {
    try {
        const { jobDescriptionText } = req.body;
        const userId = getSafeUserId(req);

        if (!jobDescriptionText) {
            return res.status(400).json({ message: "Job Description is required." });
        }

        // 1. Fetch Data
        const profile = await CandidateProfile.findOne({ user: userId });
        const user = await User.findById(userId);
        const skills = await Skill.find({ user: userId });

        if (!profile || !user) {
            return res.status(400).json({ message: "Complete your profile first." });
        }

        // 2. Prepare Context
        const skillList = skills.map(s => s.name).join(', ');
        
        const candidateInfo = `
            Name: ${user.fullName}
            Email: ${user.email}
            Phone: ${profile.phone || ''}
            Location: ${profile.location || ''}
            Links: ${profile.socialLinks ? profile.socialLinks.join(', ') : ''}
            Summary: ${profile.summary || ''}
            Experience: ${profile.experienceYears || 0} years
            Work History: ${profile.headline || 'Not specified'}
            Education: ${profile.education || 'Not specified'}
        `;

        // 3. Generate with AI
        // ✅ FIX: Using gemini-2.0-flash
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const prompt = `
            You are an expert Resume Writer. Write a tailored resume in Markdown format.
            
            SOURCE 1 (Candidate):
            ${candidateInfo}

            SOURCE 2 (Verified Skills):
            ${skillList}

            SOURCE 3 (Target Job):
            "${jobDescriptionText}"

            INSTRUCTIONS:
            - Blend the candidate's summary with keywords from the Target Job.
            - Prioritize verified skills that match the job.
            - Output ONLY Markdown text.
        `;

        const result = await model.generateContent(prompt);
        const resumeMarkdown = result.response.text();

        // 4. Generate Title
        let jobTitle = "Tailored Resume";
        if (jobDescriptionText.length < 50) {
             jobTitle = jobDescriptionText;
        } else {
             jobTitle = "Tailored Role"; 
        }

        // 5. Save to 'Resume' model
        const newResume = await Resume.create({
            user: userId,
            jobTitle: jobTitle,
            companyName: "Target Company", 
            content: resumeMarkdown, 
            jobDescriptionText: jobDescriptionText
        });

        res.json({
            id: newResume._id,
            jobTitle: newResume.jobTitle,
            companyName: newResume.companyName,
            resumeContent: newResume.content, 
            createdAt: newResume.createdAt
        });

    } catch (err) {
        console.error("Resume Gen Error:", err);
        res.status(500).json({ message: "Failed to generate resume" });
    }
};

exports.getResumes = async (req, res) => {
    try {
        const userId = getSafeUserId(req);
        const resumes = await Resume.find({ user: userId }).sort({ createdAt: -1 });
        
        const formatted = resumes.map(r => ({
            _id: r._id,
            jobTitle: r.jobTitle,
            companyName: r.companyName,
            content: r.content,
            createdAt: r.createdAt
        }));

        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching history" });
    }
};

exports.updateResume = async (req, res) => {
    try {
        const userId = getSafeUserId(req);
        const { jobTitle } = req.body;
        
        const updated = await Resume.findOneAndUpdate(
            { _id: req.params.id, user: userId },
            { jobTitle },
            { new: true }
        );
        
        if (!updated) return res.status(404).json({ message: "Resume not found" });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: "Update failed" });
    }
};

exports.deleteResume = async (req, res) => {
    try {
        const userId = getSafeUserId(req);
        const deleted = await Resume.findOneAndDelete({ _id: req.params.id, user: userId });
        
        if (!deleted) return res.status(404).json({ message: "Resume not found" });
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Delete failed" });
    }
};

// ==========================================
// PROFILE FUNCTIONS
// ==========================================

exports.getMyProfile = async (req, res) => {
  try {
    if (!ensureCandidateRole(req, res)) return;
    const userId = getSafeUserId(req); 
    const profile = await CandidateProfile.findOne({ user: userId }).lean();
    const user = await User.findById(userId).select('fullName email');

    if (!profile) return res.status(404).json({ message: 'Candidate profile not found' });
    
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
    
    const { 
        firstName, lastName, 
        headline, summary, phone, photoUrl, experienceYears, industry, location, education, skills, socialLinks, cvUrl,
        portfolio 
    } = req.body;

    if (firstName || lastName) {
        const currentUser = await User.findById(userId);
        if (currentUser) {
            let newFirst = firstName || currentUser.fullName.split(' ')[0];
            let newLast = lastName || currentUser.fullName.split(' ').slice(1).join(' ');
            const newFullName = `${newFirst} ${newLast}`.trim();
            await User.findByIdAndUpdate(userId, { fullName: newFullName });
        }
    }

    const update = {};
    if (headline !== undefined) update.headline = headline;
    if (summary !== undefined) update.summary = summary;
    if (phone !== undefined) update.phone = phone;
    if (photoUrl !== undefined) update.photoUrl = photoUrl;
    if (experienceYears !== undefined) update.experienceYears = experienceYears;
    if (industry !== undefined) update.industry = industry;
    if (location !== undefined) update.location = location;
    if (education !== undefined) update.education = education;
    if (cvUrl !== undefined) update.cvUrl = cvUrl;
    
    if (portfolio !== undefined) update.portfolio = portfolio;

    if (skills) {
        if (Array.isArray(skills)) {
            update.skills = skills.map(s => typeof s === 'string' ? { name: s } : s);
        } else {
            update.skills = [{ name: skills }];
        }
    }

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
// SKILLS FUNCTIONS
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
      proofData.url = `/uploads/${req.file.filename}`;
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

// ==========================================
// 🔥 NEW: PUBLIC PORTFOLIO VIEW (For Recruiters)
// ==========================================
exports.getCandidatePublicPortfolio = async (req, res) => {
  try {
      const { id } = req.params; // This is the User ID passed in the URL
      
      // 1. Find profile by User ID
      const profile = await CandidateProfile.findOne({ user: id }).lean();
      const user = await User.findById(id).select('fullName email');
      
      if (!profile || !user) {
          return res.status(404).json({ message: 'Candidate not found' });
      }

      // 2. Fetch their skills
      const skills = await Skill.find({ user: id });

      // 3. Return combined data
      res.json({
          profile: {
              ...profile,
              firstName: user.fullName ? user.fullName.split(' ')[0] : 'Candidate',
              lastName: user.fullName ? user.fullName.split(' ').slice(1).join(' ') : '',
              email: user.email
          },
          skills
      });
  } catch (err) {
      console.error("Public Portfolio Error:", err);
      res.status(500).json({ message: 'Server error' });
  }
};