const Shortlist = require('../models/Shortlist');
const CandidateProfile = require('../models/CandidateProfile');
const nodemailer = require('nodemailer');

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

// @desc    Send email to candidate (Ethereal Simulation)
// @route   POST /api/shortlist/contact
// @desc    Send email to candidate (Safe Mode)
// @route   POST /api/shortlist/contact
// @desc    Send email to candidate (Smart Simulation)
// @route   POST /api/shortlist/contact
exports.contactCandidate = async (req, res) => {
  try {
      const { candidateId, message } = req.body;

      // 1. Prepare the Email HTML Design
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

      // 2. Try to send real email via Ethereal
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
          console.log("✅ Email sent! Preview URL:", previewUrl);
          
          return res.json({ message: 'Email sent successfully', previewUrl });

      } catch (emailErr) {
          // 3. FALLBACK: Network Blocked? Send HTML to frontend to display manually!
          console.log("⚠️ Network blocked email. Sending Offline Simulation.");
          
          return res.json({ 
              message: 'Email simulated (Offline Mode)', 
              previewUrl: null,
              simulatedHtml: emailHtml // <--- THIS is the magic key
          });
      }

  } catch (err) {
      console.error("Server Error:", err);
      res.status(500).json({ message: 'Server error' });
  }
};