const Shortlist = require('../models/Shortlist');
const CandidateProfile = require('../models/CandidateProfile');
const Job = require('../models/Job');
const nodemailer = require('nodemailer');

// --- Helper to Resolve Profile ID ---
async function resolveProfileId(idInput) {
    if (!idInput) return null;
    // Check if valid ObjectId
    const isValidId = idInput.match(/^[0-9a-fA-F]{24}$/);
    
    // 1. Try finding by User ID
    const profileByUser = await CandidateProfile.findOne({ user: idInput });
    if (profileByUser) return profileByUser._id;

    // 2. Try finding by Profile ID
    if (isValidId) {
        const profileById = await CandidateProfile.findById(idInput);
        if (profileById) return profileById._id;
    }
    return null;
}

// @desc    Add candidate to shortlist (With Cleanup)
exports.addToShortlist = async (req, res) => {
  try {
    const { candidateId, jobId, status } = req.body; 
    const recruiterId = req.user.userId || req.user.id || req.user._id;

    if (!recruiterId) return res.status(401).json({ message: "User not authenticated" });

    const correctProfileId = await resolveProfileId(candidateId);
    if (!correctProfileId) return res.status(404).json({ message: 'Candidate Profile not found' });

    // 1. Upsert the Target Entry (Specific Job or General)
    // This finds existing or creates new
    const targetEntry = await Shortlist.findOneAndUpdate(
        { 
            recruiter: recruiterId, 
            candidate: correctProfileId,
            job: jobId || null 
        },
        {
            status: status || 'saved',
            $setOnInsert: { dateAdded: new Date() }
        },
        { upsert: true, new: true }
    );

    // 2. CLEANUP: If we just saved a Specific Job entry, DELETE any "General" entry
    if (jobId) {
        await Shortlist.findOneAndDelete({
            recruiter: recruiterId,
            candidate: correctProfileId,
            job: null
        });
    }

    res.status(201).json(targetEntry);
  } catch (err) {
    console.error('Add Shortlist Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get recruiter's shortlist
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

    // Filter out corrupted entries
    const validList = list.filter(item => item.candidate && item.candidate.user);
    res.json(validList);
  } catch (err) {
    console.error("Get Shortlist Error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update status or Label
// @desc    Update status or Label (AND SYNC WITH JOB APPLICATION)
exports.updateStatus = async (req, res) => {
  try {
    const { status, note, customLabel } = req.body; 
    const recruiterId = req.user.userId || req.user.id || req.user._id;
    const shortlistId = req.params.id;
    
    const updateFields = {};
    if (status) updateFields.status = status;
    if (note !== undefined) updateFields.note = note;
    if (customLabel !== undefined) updateFields.customLabel = customLabel;

    // 1. Update the Shortlist (Kanban Card)
    const updatedShortlist = await Shortlist.findOneAndUpdate(
      { _id: shortlistId, recruiter: recruiterId },
      { $set: updateFields },
      { new: true }
    )
    .populate('candidate') // Need profile to get user ID
    .populate('job', 'title');

    if (!updatedShortlist) return res.status(404).json({ message: 'Entry not found' });

    // 🔥 2. NEW SYNC LOGIC: Update the Job's Applicant Status 🔥
    // Only sync if status changed AND it's linked to a specific job
    if (status && updatedShortlist.job && updatedShortlist.candidate) {
        const candidateUserId = updatedShortlist.candidate.user; // Get actual User ID
        
        // Map Shortlist Status -> Job Application Status
        // Shortlist: ['saved', 'emailed', 'interviewing', 'offer', 'rejected']
        // JobApp:    ['Applied', 'Under Review', 'Interviewing', 'Selected', 'Rejected']
        let mappedStatus = 'Under Review'; 
        if (status === 'interviewing') mappedStatus = 'Interviewing';
        if (status === 'offer') mappedStatus = 'Selected';
        if (status === 'rejected') mappedStatus = 'Rejected';

        // Use MongoDB positional operator ($) to update the specific array item
        await Job.findOneAndUpdate(
            { 
                _id: updatedShortlist.job._id,
                'applicants.candidate': candidateUserId 
            },
            { 
                $set: { 'applicants.$.status': mappedStatus } 
            }
        );
        console.log(`Synced status to ${mappedStatus} for Job ${updatedShortlist.job._id}`);
    }

    res.json(updatedShortlist);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove
exports.removeFromShortlist = async (req, res) => {
  try {
    const recruiterId = req.user.userId || req.user.id || req.user._id;
    await Shortlist.findOneAndDelete({ _id: req.params.id, recruiter: recruiterId });
    res.json({ message: 'Removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send email & Update Status (With Cleanup)
// @desc    Send email & Update Status (With Cleanup & SYNC)
exports.contactCandidate = async (req, res) => {
  try {
      const { candidateId, message, jobId, shortlistId } = req.body;
      const recruiterId = req.user.userId || req.user.id || req.user._id;

      const correctProfileId = await resolveProfileId(candidateId);
      if (!correctProfileId) return res.status(404).json({ message: "Candidate not found" });

      // 1. Email Simulation (No changes here)
      let previewUrl = null;
      try {
          // ... (your existing nodemailer code) ...
          const testAccount = await nodemailer.createTestAccount();
          const transporter = nodemailer.createTransport({
              host: 'smtp.ethereal.email', port: 587, secure: false,
              auth: { user: testAccount.user, pass: testAccount.pass }
          });
          const info = await transporter.sendMail({
              from: '"ProofdIn Recruiter" <recruiter@proofdin.com>',
              to: "candidate@demo.com", subject: "Message from Recruiter", html: `<p>${message}</p>`
          });
          previewUrl = nodemailer.getTestMessageUrl(info);
      } catch (e) { console.log("Email fallback"); }

      // 2. DATABASE LOGIC (Shortlist updates - No changes here)
      if (shortlistId) {
          await Shortlist.findByIdAndUpdate(shortlistId, { 
              status: 'emailed', note: `Emailed: ${new Date().toLocaleDateString()}`
          });
      } else {
          await Shortlist.findOneAndUpdate(
              { recruiter: recruiterId, candidate: correctProfileId, job: jobId || null },
              { status: 'emailed', $setOnInsert: { dateAdded: new Date() } },
              { upsert: true, new: true }
          );
          if (jobId) {
              await Shortlist.findOneAndDelete({ recruiter: recruiterId, candidate: correctProfileId, job: null });
          }
      }

      // 🔥 3. NEW SYNC LOGIC: Update Job Application Status 🔥
      // If this is related to a specific job, update the candidate's view to "Under Review"
      if (jobId) {
          // We need the Candidate's USER ID, not profile ID, to match in the Job array
          const profileDoc = await CandidateProfile.findById(correctProfileId);
          if (profileDoc) {
              await Job.findOneAndUpdate(
                  { 
                      _id: jobId,
                      'applicants.candidate': profileDoc.user 
                  },
                  { 
                      // Map 'emailed' in shortlist to 'Under Review' for candidate
                      $set: { 'applicants.$.status': 'Under Review' } 
                  }
              );
              console.log(`Synced status to Under Review for Job ${jobId}`);
          }
      }

      return res.json({ message: 'Email sent', previewUrl });

  } catch (err) {
      console.error("Contact Error:", err);
      res.status(500).json({ message: 'Server error' });
  }
};

// ... existing imports

// @desc    Get offers for the logged-in candidate
exports.getCandidateOffers = async (req, res) => {
  try {
      const userId = req.user.userId || req.user.id || req.user._id;

      // 1. Find the Candidate Profile for this User
      const profile = await CandidateProfile.findOne({ user: userId });
      if (!profile) return res.status(404).json({ message: "Candidate profile not found" });

      // 2. Find Shortlist entries targeting this profile
      // We filter for statuses where the recruiter has taken action (Emailed, Interviewing, Offer)
      // We usually hide 'saved' because that's the recruiter's private bookmark.
      const offers = await Shortlist.find({
          candidate: profile._id,
          status: { $in: ['emailed', 'interviewing', 'offer', 'rejected'] }
      })
      .populate('job', 'title company location salary jobType')
      .populate('recruiter', 'firstName lastName email')
      .sort({ dateAdded: -1 });

      res.json(offers);
  } catch (err) {
      console.error("Get Offers Error:", err);
      res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Candidate accepts or rejects an offer
exports.respondToOffer = async (req, res) => {
  try {
      const { status } = req.body; // 'interviewing' (Accept) or 'rejected' (Decline)
      const { id } = req.params;   // Shortlist ID
      
      // Security: Ensure this shortlist entry actually belongs to the logged-in user
      const userId = req.user.userId || req.user.id || req.user._id;
      const profile = await CandidateProfile.findOne({ user: userId });

      const offer = await Shortlist.findOne({ _id: id, candidate: profile._id });
      if (!offer) return res.status(404).json({ message: "Offer not found or unauthorized" });

      offer.status = status;
      await offer.save();

      res.json({ message: `Offer ${status}`, offer });
  } catch (err) {
      console.error("Respond Error:", err);
      res.status(500).json({ message: 'Server error' });
  }
};