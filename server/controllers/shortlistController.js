const Shortlist = require('../models/Shortlist');
const CandidateProfile = require('../models/CandidateProfile');
const Job = require('../models/Job'); // <--- IMPORT JOB MODEL
const nodemailer = require('nodemailer');

// Helper to sync status back to the main Job Application
const syncJobApplicationStatus = async (jobId, candidateUserId, newStatus) => {
    if (!jobId || !candidateUserId) return;
    
    try {
        // Map Shortlist status to Candidate-facing status
        // shortlist status -> job application status
        const statusMap = {
            'saved': 'Shortlisted',
            'emailed': 'Contacted',
            'interviewing': 'Interviewing',
            'offer': 'Offer Received',
            'rejected': 'Rejected'
        };

        const publicStatus = statusMap[newStatus] || 'Applied';

        await Job.updateOne(
            { _id: jobId, "applicants.candidate": candidateUserId },
            { $set: { "applicants.$.status": publicStatus } }
        );
        console.log(`Synced Job Status for user ${candidateUserId} to ${publicStatus}`);
    } catch (err) {
        console.error("Failed to sync job status:", err);
    }
};

// @desc    Add candidate to shortlist
// @route   POST /api/shortlist/add
exports.addToShortlist = async (req, res) => {
  try {
    const { candidateId, jobId, status } = req.body; 
    // Note: 'candidateId' from frontend is the USER ID.
    
    const recruiterId = req.user.userId || req.user.id || req.user._id;
    if (!recruiterId) return res.status(401).json({ message: "User not authenticated" });

    // 1. Find Profile ID
    const profile = await CandidateProfile.findOne({ user: candidateId });
    if (!profile) return res.status(404).json({ message: 'Candidate Profile not found' });
    const correctProfileId = profile._id;

    // 2. Cleanup old/ghost entries
    await Shortlist.deleteOne({ recruiter: recruiterId, candidate: candidateId, job: jobId || null });

    // 3. Check existing
    const existingCorrect = await Shortlist.findOne({
      recruiter: recruiterId,
      candidate: correctProfileId,
      job: jobId || null
    });

    if (existingCorrect) return res.status(400).json({ message: 'Candidate already shortlisted' });

    // 4. Create Shortlist Entry
    const initialStatus = status || 'saved';
    const newShortlist = await Shortlist.create({
      recruiter: recruiterId,
      candidate: correctProfileId,
      job: jobId || null,
      status: initialStatus
    });

    // 5. ✅ SYNC: Update Candidate's Job Status immediately
    if (jobId) {
        await syncJobApplicationStatus(jobId, candidateId, initialStatus);
    }

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
    
    const list = await Shortlist.find({ recruiter: recruiterId })
      .populate({
        path: 'candidate',
        model: 'CandidateProfile',
        populate: { path: 'user', model: 'User', select: 'fullName email' }
      })
      .populate('job', 'title')
      .sort({ dateAdded: -1 });

    const validList = list.filter(item => item.candidate && item.candidate.user);
    res.json(validList);
  } catch (err) {
    console.error("Get Shortlist Error:", err);
    res.status(500).json({ message: 'Server error fetching shortlist' });
  }
};

// @desc    Update status (e.g., move to "Interviewing")
// @route   PUT /api/shortlist/:id
exports.updateStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const recruiterId = req.user.userId || req.user.id || req.user._id;
    
    // 1. Update Shortlist
    const updated = await Shortlist.findOneAndUpdate(
      { _id: req.params.id, recruiter: recruiterId },
      { $set: { status, note } },
      { new: true }
    ).populate({
        path: 'candidate',
        populate: { path: 'user', select: '_id' } // Need User ID for sync
    });

    if (!updated) return res.status(404).json({ message: 'Entry not found' });

    // 2. ✅ SYNC: Update Candidate's Job Status
    if (updated.job && updated.candidate && updated.candidate.user) {
        await syncJobApplicationStatus(updated.job, updated.candidate.user._id, status);
    }

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
    
    // 1. Find before deleting (to get IDs for sync)
    const item = await Shortlist.findOne({ _id: req.params.id, recruiter: recruiterId })
        .populate({ path: 'candidate', populate: { path: 'user' }});

    if (item) {
        await Shortlist.deleteOne({ _id: req.params.id });
        
        // 2. ✅ SYNC: Revert status to 'Applied' if removed from shortlist
        if (item.job && item.candidate?.user?._id) {
            await Job.updateOne(
                { _id: item.job, "applicants.candidate": item.candidate.user._id },
                { $set: { "applicants.$.status": "Applied" } }
            );
        }
    }
    
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
      const emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 40px; background-color: #f9f9f9; display: flex; justify-content: center;">
              <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; width: 100%;">
                  <div style="border-bottom: 2px solid #4a6cf7; padding-bottom: 10px; margin-bottom: 20px;">
                      <h2 style="color: #4a6cf7; margin: 0;">ProofdIn</h2>
                  </div>
                  <h3 style="color: #333;">Application Update</h3>
                  <p style="font-size: 16px; color: #555; line-height: 1.6;">${message}</p>
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
                      <p>This is a simulated email sent via ProofdIn Platform.</p>
                  </div>
              </div>
          </div>
      `;

      try {
          const testAccount = await nodemailer.createTestAccount();
          const transporter = nodemailer.createTransport({
              host: 'smtp.ethereal.email',
              port: 587,
              secure: false,
              auth: { user: testAccount.user, pass: testAccount.pass },
              connectionTimeout: 5000
          });

          const info = await transporter.sendMail({
              from: '"ProofdIn Recruiter" <recruiter@proofdin.com>',
              to: "candidate@demo.com",
              subject: "Update from ProofdIn",
              html: emailHtml
          });

          const previewUrl = nodemailer.getTestMessageUrl(info);
          return res.json({ message: 'Email sent successfully', previewUrl });

      } catch (emailErr) {
          return res.json({ 
              message: 'Email simulated (Offline Mode)', 
              previewUrl: null,
              simulatedHtml: emailHtml 
          });
      }

  } catch (err) {
      console.error("Server Error:", err);
      res.status(500).json({ message: 'Server error' });
  }
};