const User = require('../models/User');
const RecruiterProfile = require('../models/RecruiterProfile');

// @desc    Get current recruiter profile
// @route   GET /api/recruiters/me
exports.getRecruiterProfile = async (req, res) => {
  try {
    // 1. Get the User ID from the token
    const userId = req.user.userId || req.user.id || req.user._id;

    // 2. Fetch User Details
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 3. Fetch Recruiter Profile
    let profile = await RecruiterProfile.findOne({ user: userId });

    // --- SELF-HEAL LOGIC ---
    // If profile is missing (e.g. from a failed signup), create a default one now.
    if (!profile) {
        console.log("Profile missing for user, creating default...");
        profile = await RecruiterProfile.create({
            user: userId,
            orgName: "My Organization", // Default placeholder
            orgRole: "Recruiter",       // Default placeholder
            orgWebsite: "",
            orgLocation: "",
            industry: "",
            orgSize: "",
            department: "",
            phone: "",
            bio: ""
        });
    }
    // -----------------------

    // 4. Combine User and Profile data for the frontend
    const userData = user.toObject ? user.toObject() : user;
    const profileData = profile.toObject ? profile.toObject() : profile;

    res.json({
      ...userData,
      ...profileData
    });

  } catch (err) {
    console.error("getRecruiterProfile Error:", err);
    res.status(500).json({ message: 'Server Error loading profile' });
  }
};

// @desc    Update personal info
// @route   PUT /api/recruiters/me/personal
exports.updatePersonalInfo = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const { firstName, lastName, phone, bio } = req.body;
    const fullName = `${firstName} ${lastName}`.trim();

    // Update User Name
    await User.findByIdAndUpdate(userId, { fullName });

    // Update Profile Fields
    const profile = await RecruiterProfile.findOneAndUpdate(
      { user: userId },
      { $set: { phone, bio } },
      { new: true, upsert: true } // Create if doesn't exist
    );

    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error updating personal info' });
  }
};

// @desc    Update organization details
// @route   PUT /api/recruiters/me/organization
exports.updateOrgInfo = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const { companyName, industry, companySize, companyWebsite, companyLocation, department, jobTitle } = req.body;

    const profile = await RecruiterProfile.findOneAndUpdate(
      { user: userId },
      { 
        $set: { 
          orgName: companyName,
          industry,
          orgSize: companySize,
          orgWebsite: companyWebsite,
          orgLocation: companyLocation,
          department,
          orgRole: jobTitle 
        } 
      },
      { new: true, upsert: true }
    );

    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error updating org info' });
  }
};

// ... existing imports
// Note: You don't need new imports here, just add the function below

// @desc    Upload profile picture
// @route   POST /api/recruiters/me/avatar
exports.uploadProfilePicture = async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).json({ message: 'No file uploaded' });
      }

      const userId = req.user.userId || req.user.id || req.user._id;
      
      // Construct the URL (Assuming server runs on localhost:5000)
      // We will serve the 'uploads' folder statically
      const imageUrl = `/uploads/${req.file.filename}`;

      // Update the Profile with the new image URL
      // Note: Ensure your RecruiterProfile Schema has a 'profilePicture' field!
      const profile = await RecruiterProfile.findOneAndUpdate(
          { user: userId },
          { $set: { profilePicture: imageUrl } },
          { new: true, upsert: true }
      );

      res.json({ message: 'Upload successful', profilePicture: imageUrl });

  } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server Error uploading image' });
  }
};