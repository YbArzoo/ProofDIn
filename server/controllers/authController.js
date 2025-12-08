const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const CandidateProfile = require("../models/CandidateProfile");
const RecruiterProfile = require("../models/RecruiterProfile");

const createToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { fullName, email, password, role, orgName, orgRole } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!["candidate", "recruiter"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = new User({
      fullName,
      email,
      role,
      isEmailVerified: false,
    });

    // hash password
    await user.setPassword(password);

    // email verification token (we'll use later)
    user.emailVerificationToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    await user.save();

    // create related profile
    if (role === "candidate") {
      await CandidateProfile.create({ user: user._id });
    } else if (role === "recruiter") {
      if (!orgName || !orgRole) {
        return res.status(400).json({
          message: "Recruiter must provide organization name and job title",
        });
      }

      await RecruiterProfile.create({
        user: user._id,
        orgName,
        orgRole,
      });
    }

    const token = createToken(user);

    // extra data for recruiter response
    let extra = {};
    if (role === "recruiter") {
      extra.orgName = orgName;
      extra.orgRole = orgRole;
    }

    return res.status(201).json({
      message: "Signup successful",
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
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/login
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

    const valid = await user.validatePassword(password);
    if (!valid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    user.lastLoginAt = new Date();
    await user.save();

        // extra info for recruiters
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
