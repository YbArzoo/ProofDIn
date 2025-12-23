const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const multer = require('multer'); // Import multer
const path = require('path');

// --- MULTER SETUP (File Upload Config) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save to 'server/uploads'
  },
  filename: (req, file, cb) => {
    // Rename file to avoid duplicates (e.g., file-123456.pdf)
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });
// -----------------------------------------

const {
  getMyProfile,
  updateMyProfile,
  getSkills,
  addSkill,
  deleteSkill,
  addProof,
  updateSkill,
  deleteProof
} = require('../controllers/candidateController');

const Resume = require('../models/Resume'); 
const resumeController = require('../controllers/resumeController');

// Debugger Middleware (Keep this!)
router.use((req, res, next) => {
    console.log("------------------------------------------------");
    console.log(`--> [ROUTE DEBUG] Incoming Request: ${req.method} ${req.originalUrl}`);
    const token = req.header('x-auth-token');
    console.log(`--> [ROUTE DEBUG] Token Status: ${token ? '✅ Present' : '❌ MISSING'}`);
    next();
});

// Profile Routes
router.get('/me', auth, getMyProfile);
router.put('/me', auth, updateMyProfile);

// Skills Routes
router.get('/skills', auth, getSkills);
router.post('/skills', auth, addSkill);
router.put('/skills/:id', auth, updateSkill);
router.delete('/skills/:id', auth, deleteSkill);

// --- UPDATE: Add 'upload.single' middleware here ---
router.post('/skills/:id/proof', auth, upload.single('file'), addProof);

// --- NEW ROUTE ---
router.delete('/skills/:skillId/proof/:proofId', auth, deleteProof);
// ---------------------------------------------------

// Resume Routes
router.post('/generate-resume', auth, resumeController.generateTailoredResume); 
router.get('/resumes', auth, resumeController.getResumeHistory);                

// Manual Resume Routes (Keep existing)
// 1. Update Resume Title
router.put('/resumes/:id', auth, async (req, res) => {
    try {
        // req.user.userId comes from your auth middleware decoding the token
        // We handle both .userId and .id to be safe
        const userId = req.user.userId || req.user.id; 

        // Find the resume ensuring it belongs to the logged-in user
        const resume = await Resume.findOne({ _id: req.params.id, user: userId });

        if (!resume) {
            return res.status(404).json({ msg: 'Resume not found or unauthorized' });
        }

        // Update the title
        resume.jobTitle = req.body.jobTitle;
        await resume.save();

        res.json(resume);
    } catch (err) {
        console.error("Update Resume Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// 2. Delete Resume
router.delete('/resumes/:id', auth, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;

        // Find and Delete in one step
        const resume = await Resume.findOneAndDelete({ _id: req.params.id, user: userId });

        if (!resume) {
            return res.status(404).json({ msg: 'Resume not found or unauthorized' });
        }

        res.json({ msg: 'Resume removed' });
    } catch (err) {
        console.error("Delete Resume Error:", err.message);
        res.status(500).send('Server Error');
    }
});
module.exports = router;