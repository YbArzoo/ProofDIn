const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const CandidateProfile = require("../models/CandidateProfile");
const RecruiterProfile = require("../models/RecruiterProfile");

// Helper function to create JWT
const createToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// @desc    Register new user
// @route   POST /api/auth/signup
exports.signup = async (req, res) => {
  const { fullName, email, password, role, orgName, orgRole } = req.body;

  // 1. Basic Validation
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ message: 'Please fill in all required fields.' });
  }

  // 2. Recruiter Validation
  if (role === 'recruiter') {
    if (!orgName || !orgRole) {
        return res.status(400).json({ message: 'Recruiters must provide Organization Name and Title.' });
    }
  }

  try {
    // 3. Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    // 4. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Create Base User
    const user = await User.create({
      fullName,
      email,
      passwordHash: hashedPassword, 
      role
    });

    // 6. Create Profiles (CRITICAL STEP)
    if (role === 'recruiter') {
      await RecruiterProfile.create({
        user: user._id,
        orgName: orgName,
        orgRole: orgRole,
        orgWebsite: '', orgLocation: '', industry: '', orgSize: '', department: '', phone: '', bio: ''
      });
    } else if (role === 'candidate') {
      // Create empty Candidate Profile to prevent 404s later
      await CandidateProfile.create({
        user: user._id,
        headline: 'Aspiring Professional',
        location: '',
        
        // --- FIXED SECTIONS ---
        education: '',   // Fixed: Must be a String, not []
        skills: [],      // This is correct (Schema says [skillSchema])
        socialLinks: []  // Fixed: Must be an Array, not {}
        // experience: [] // Removed: This field does not exist in your Schema
      });
    }

    // 7. Send Success Response (FIXED STRUCTURE)
    if (user) {
      res.status(201).json({
        message: 'Signup successful',
        token: createToken(user),
        user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role
        }
      });
    } else {
      res.status(400).json({ message: 'Invalid user data received.' });
    }

  } catch (error) {
    console.error('Signup Error Details:', error);
    
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ message: 'Database Error: ' + messages.join(', ') });
    }
    
    res.status(500).json({ message: 'Server error during signup.' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare password using passwordHash
    const valid = await bcrypt.compare(password, user.passwordHash);
    
    if (!valid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.lastLoginAt) {
        user.lastLoginAt = new Date();
        await user.save();
    }

    // Get extra info for recruiters
    let extra = {};
    if (user.role === "recruiter") {
      const profile = await RecruiterProfile.findOne({ user: user._id }).lean();
      if (profile) {
        extra.orgName = profile.orgName;
        extra.orgRole = profile.orgRole;
      }
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        ...extra,
      },
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};