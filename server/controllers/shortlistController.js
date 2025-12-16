const Shortlist = require('../models/Shortlist');
const CandidateProfile = require('../models/CandidateProfile');
const User = require('../models/User'); 
const sendEmail = require('../utils/emailService'); // Import only once at the top

// @desc    Add candidate to shortlist
// @route   POST /api/shortlist/add
exports.addToShortlist = async (req, res) => {
  try {
    const { candidateId, jobId, status } = req.body;
    
    // Robust User ID Extraction
    const recruiterId = req.user.userId || req.user.id || req.user._id;

    if (!recruiterId) {
        return res.status(401).json({ message: "User not authenticated properly" });
    }

    // Check if already saved
    const existing = await Shortlist.findOne({
      recruiter: recruiterId,
      candidate: candidateId,
      job: jobId || null
    });

    if (existing) {
      return res.status(400).json({ message: 'Candidate already shortlisted' });
    }

    const newShortlist = await Shortlist.create({
      recruiter: recruiterId,
      candidate: candidateId,
      job: jobId || null,
      status: status || 'saved'
    });

    res.status(201).json(newShortlist);
  } catch (err) {
    console.error('Add to Shortlist Error:', err);
    res.status(500).json({ message: 'Server error adding to shortlist' });
  }
};

// @desc    Get recruiter's shortlist
// @route   GET /api/shortlist
exports.getShortlist = async (req, res) => {
  try {
    const recruiterId = req.user.userId || req.user.id || req.user._id;
    
    // Fetch shortlist and populate candidate details (Name, Skills, etc.)
    const list = await Shortlist.find({ recruiter: recruiterId })
      .populate({
        path: 'candidate',
        populate: { path: 'user', select: 'fullName email' }
      })
      .populate('job', 'title');

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching shortlist' });
  }
};

// @desc    Update status (e.g., move to "Interviewing")
// @route   PUT /api/shortlist/:id
exports.updateStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const recruiterId = req.user.userId || req.user.id || req.user._id;
    
    const updated = await Shortlist.findOneAndUpdate(
      { _id: req.params.id, recruiter: recruiterId },
      { $set: { status, note } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Entry not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating status' });
  }
};

// @desc    Remove from shortlist
// @route   DELETE /api/shortlist/:id
exports.removeFromShortlist = async (req, res) => {
  try {
    const recruiterId = req.user.userId || req.user.id || req.user._id;
    await Shortlist.findOneAndDelete({ _id: req.params.id, recruiter: recruiterId });
    res.json({ message: 'Removed from shortlist' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting' });
  }
};

// @desc    Send email to candidate
// @route   POST /api/shortlist/contact
exports.contactCandidate = async (req, res) => {
  try {
    const { candidateId, message } = req.body;
    const recruiterId = req.user.userId || req.user.id || req.user._id;

    // 1. Find the Candidate's User Info (to get email)
    const candidateProfile = await CandidateProfile.findById(candidateId).populate('user');
    
    if (!candidateProfile || !candidateProfile.user) {
        return res.status(404).json({ message: "Candidate email not found." });
    }

    const candidateEmail = candidateProfile.user.email;
    const candidateName = candidateProfile.user.fullName;

    // 2. Send the Email
    const subject = `Interview Interest from ProofDIn`;
    const fullMessage = `Hi ${candidateName},\n\n${message}\n\nBest,\nRecruiter Team`;
    
    const previewUrl = await sendEmail(candidateEmail, subject, fullMessage);

    if (previewUrl) {
        // 3. Auto-save to shortlist if not already there
        const existing = await Shortlist.findOne({ recruiter: recruiterId, candidate: candidateId });
        if (!existing) {
            await Shortlist.create({
                recruiter: recruiterId,
                candidate: candidateId,
                status: 'interviewing', // Auto-move to interviewing
                note: 'Contacted via email'
            });
        } else {
            // Update status if they were just "saved"
            if (existing.status === 'saved') {
                existing.status = 'interviewing';
                await existing.save();
            }
        }

        res.json({ success: true, message: "Email sent successfully!", previewUrl });
    } else {
        res.status(500).json({ message: "Failed to send email." });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error sending email' });
  }
};