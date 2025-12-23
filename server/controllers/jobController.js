const Job = require('../models/Job');
const CandidateProfile = require('../models/CandidateProfile');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const RecruiterProfile = require('../models/RecruiterProfile');

// --- 1. LOCAL DICTIONARY (THE SAFETY NET) ---
const SKILL_DICTIONARY = ['React', 'TypeScript', 'JavaScript', 'Redux', 'RTK', 'Jest', 'Cypress', 'GraphQL', 'Node.js', 'Web Performance', 'REST APIs', 'Next.js', 'AWS', 'Golang', 'Python', 'Java', 'SQL', 'MongoDB', 'Docker', 'Kubernetes', 'Git'];
const SYNONYM_MAP = {
    'react.js': 'React', 'reactjs': 'React', 'react native': 'React',
    'ts': 'TypeScript', 'js': 'JavaScript', 'es6': 'JavaScript',
    'redux toolkit': 'RTK', 'rest': 'REST APIs', 'rest api': 'REST APIs',
    'node': 'Node.js', 'nodejs': 'Node.js', 'express': 'Express',
    'go': 'Golang', 'py': 'Python', 'aws ec2': 'AWS', 'amazon web services': 'AWS'
};

function extractSkillsRegex(text) {
    const lower = text.toLowerCase();
    const found = new Set();
    SKILL_DICTIONARY.forEach(skill => {
        if (lower.includes(skill.toLowerCase())) found.add(skill);
    });
    Object.entries(SYNONYM_MAP).forEach(([variant, canonical]) => {
        if (lower.includes(variant.toLowerCase())) found.add(canonical);
    });
    return Array.from(found);
}

// --- 2. AI CONFIGURATION ---
let genAI = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// --- 3. AI EXTRACTION FUNCTION ---
async function extractSkillsWithAI(text) {
    if (!genAI) return []; 

    try {
        // Updated model to 1.5-flash (most stable for free tier)
        // Updated to your available model
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `
        You are a recruitment parser. Extract technical skills from this job description.
        Rules:
        1. Normalize names (e.g. "ReactJS" -> "React", "Go lang" -> "Golang").
        2. Return ONLY a valid JSON array of strings. No markdown formatting.
        3. Text: "${text.substring(0, 1000)}" 
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let textResponse = response.text().trim();

        // Clean up markdown
        textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(textResponse);
    } catch (error) {
        console.error("AI Extraction Failed (Handled):", error.message);
        return []; // Return empty so we can trigger fallback
    }
}

// --- CONTROLLERS ---

exports.analyzeJob = async (req, res) => {
    try {
      const { 
          description, title, jobType, experienceLevel, 
          locationType, location, salaryMin, salaryMax, 
          benefits, responsibilities, manualSkills,
          niceToHaveSkills,
          status 
      } = req.body;
  
      const recruiterId = req.user.userId || req.user.id || req.user._id;
      if (!recruiterId) return res.status(401).json({ message: 'Unauthorized' });

      // --- NEW FIX: Fetch Company Name ---
      const profile = await RecruiterProfile.findOne({ user: recruiterId });
      const companyName = profile ? profile.orgName : 'Hiring Company';
      // -----------------------------------
  
      // 1. AI Extraction (Keep your existing code)
      let aiSkills = await extractSkillsWithAI(description);
      if (!aiSkills || aiSkills.length === 0) {
          aiSkills = extractSkillsRegex(description);
      }
      const finalSkills = Array.from(new Set([...aiSkills, ...(manualSkills || [])]));
  
      // 2. Create Job (Now with Company Name)
      const job = await Job.create({
        recruiter: recruiterId,
        company: companyName, // <--- SAVING IT HERE
        title: title || 'Untitled Job',
        description,
        jobType,
        experienceLevel,
        locationType,
        location,
        salary: { min: salaryMin, max: salaryMax },
        benefits,
        responsibilities,
        skills: finalSkills,
        niceToHaveSkills: niceToHaveSkills,
        rawText: description,
        extractedSkills: finalSkills,
        status: status || 'draft'
      });
  
      res.json({
        message: 'Job processed successfully',
        skills: finalSkills,
        jobId: job._id,
        status: job.status
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server Error' });
    }
};

exports.matchCandidates = async (req, res) => {
    try {
        const { jobId, query } = req.body;
        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const jobSkillsSet = new Set(job.skills.map(s => s.toLowerCase()));
        
        let querySkillsSet = new Set();
        if (query) {
            let qSkills = await extractSkillsWithAI(query);
            if(qSkills.length === 0) qSkills = extractSkillsRegex(query);
            qSkills.forEach(s => querySkillsSet.add(s.toLowerCase()));
        }

        const candidates = await CandidateProfile.find().populate('user', 'fullName email');

        const results = candidates.map(candidate => {
            const candidateSkills = candidate.skills || [];
            
            const normalizedCandSkills = candidateSkills.map(cs => {
                return (typeof cs === 'string' ? cs : cs.name).toLowerCase();
            });

            const matchDetails = [];
            let matchCount = 0;

            job.skills.forEach(jobSkill => {
                const isMatch = normalizedCandSkills.some(cs => cs.includes(jobSkill.toLowerCase()) || jobSkill.toLowerCase().includes(cs));
                if (isMatch) {
                    matchDetails.push(jobSkill);
                    matchCount++;
                }
            });
            
            let score = 0;
            if (job.skills.length > 0) score = Math.round((matchCount / job.skills.length) * 100);

            if (score === 0 && !query) return null;
            if (query && querySkillsSet.size > 0) {
                const hasQueryMatch = normalizedCandSkills.some(s => querySkillsSet.has(s.toLowerCase()));
                if (!hasQueryMatch) return null;
            }

            return {
                id: candidate._id,
                name: candidate.user.fullName,
                title: candidate.headline || 'Candidate',
                experience: `${(candidate.experience || []).length * 2}+ years`,
                matchScore: score,
                skills: matchDetails, 
                whyMatched: matchDetails.length > 0 ? `Matched on: ${matchDetails.slice(0,3).join(', ')}` : "Low overlap",
                proofLinks: [], 
                location: candidate.location || 'Remote'
            };
        }).filter(Boolean); 

        results.sort((a, b) => b.matchScore - a.matchScore);
        res.json({ candidates: results });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error matching candidates' });
    }
};

// Keep CRUD functions
exports.getAllJobs = async (req, res) => {
    try {
        // 1. Find all published jobs
        const jobs = await Job.find({ status: 'published' })
            .sort({ createdAt: -1 })
            .lean(); // Use lean() for better performance

        // 2. Enhance jobs with Company Name from RecruiterProfile
        // We have to map over them because 'recruiter' field in Job points to User, 
        // but 'orgName' is in RecruiterProfile.
        const enhancedJobs = await Promise.all(jobs.map(async (job) => {
            const profile = await RecruiterProfile.findOne({ user: job.recruiter });
            return {
                ...job,
                // If profile exists, use its orgName. Otherwise fallback to User's name or Default.
                recruiter: {
                    ...job.recruiter,
                    orgName: profile ? profile.orgName : 'Hiring Company'
                }
            };
        }));

        res.status(200).json(enhancedJobs);
    } catch (err) {
        console.error("Get All Jobs Error:", err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get MY jobs (Recruiter Dashboard)
// @route   GET /api/jobs/my-jobs
exports.getMyJobs = async (req, res) => {
    try {
      const recruiterId = req.user.userId || req.user.id || req.user._id;
      
      // FIX: Filter out 'draft' status so "Analysis" files don't clutter the dashboard
      const jobs = await Job.find({ 
          recruiter: recruiterId, 
          status: { $ne: 'draft' } 
      }).sort({ createdAt: -1 });

      res.json(jobs);
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// @desc    Delete a specific job
// @route   DELETE /api/jobs/:id
exports.deleteJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const recruiterId = req.user.userId || req.user.id || req.user._id;

        // 1. Check if Job Exists AND belongs to this recruiter
        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId });

        if (!job) {
            return res.status(404).json({ message: 'Job not found or unauthorized' });
        }

        // 2. Delete
        await Job.findByIdAndDelete(jobId);
        
        res.json({ message: 'Job deleted successfully' });

    } catch (err) {
        console.error('Error deleting job:', err);
        res.status(500).json({ message: 'Server error deleting job' });
    }
};

// @desc    Parse JD Text into Structured Data (AI)
// @route   POST /api/jobs/parse-jd
exports.parseJobDescription = async (req, res) => {
    try {
        const { description } = req.body;
        if (!description) return res.status(400).json({ message: "Description required" });

        // Check if AI is initialized (from the top of your file)
        if (!genAI) {
            return res.status(503).json({ message: "AI service unavailable" });
        }

        // Use standard model
        // Updated to your available model
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const prompt = `
        Analyze this job description and extract structured data.
        Return ONLY a JSON object with these exact keys. If a field is not found, use null or empty string/array.
        
        Keys:
        - jobTitle (string)
        - jobType (string, enum: "Full-Time", "Part-Time", "Contract", "Freelance")
        - experienceLevel (string, enum: "entry-level", "mid-level", "senior", "lead")
        - locationType (string, enum: "On-Site", "Hybrid", "Remote")
        - city (string)
        - country (string)
        - salaryMin (number, no currency symbols)
        - salaryMax (number, no currency symbols)
        - skills (array of strings, technical skills only)
        - niceToHaveSkills (array of strings)
        - benefits (array of strings, e.g. "Health Insurance", "Paid Leave")
        - responsibilities (string, summary or bullet points)

        Job Description:
        "${description.substring(0, 3000)}"
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();
        
        // Cleanup Markdown
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const parsedData = JSON.parse(text);
        res.json(parsedData);

    } catch (err) {
        console.error("JD Parsing Error:", err);
        // Fallback: If AI fails, return empty object so frontend doesn't crash
        res.status(500).json({ message: "Failed to parse job description" });
    }
};

// @desc    Get single job by ID
// @route   GET /api/jobs/:id
exports.getJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });
        res.json(job);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update job details
// @route   PUT /api/jobs/:id
exports.updateJob = async (req, res) => {
    try {
        const updates = req.body; // Capture all sent fields
        
        // Map flat salary fields to object structure if present
        if (updates.salaryMin || updates.salaryMax) {
            updates.salary = { 
                min: updates.salaryMin, 
                max: updates.salaryMax 
            };
        }

        const job = await Job.findOneAndUpdate(
            { _id: req.params.id, recruiter: req.user.userId || req.user.id || req.user._id },
            { $set: updates },
            { new: true }
        );

        if (!job) return res.status(404).json({ message: 'Job not found or unauthorized' });
        
        res.json({ message: 'Job updated successfully', job });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- ADD THIS TO THE BOTTOM OF jobController.js ---

// @desc    Candidate applies for a job
// @route   POST /api/jobs/:id/apply
// --- ADD THIS TO THE BOTTOM OF jobController.js ---

// @desc    Candidate applies for a job
// @route   POST /api/jobs/:id/apply
exports.applyForJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const userId = req.user?.userId || req.user?.id || req.user?._id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: User ID missing' });
        }

        // --- SELF-HEALING FIX ---
        // Filter out any "bad" applicants from previous errors (entries with no candidate ID)
        if (job.applicants && job.applicants.length > 0) {
            job.applicants = job.applicants.filter(app => app.candidate);
        }

        // Check if already applied
        const isAlreadyApplied = job.applicants.some(
            (app) => app.candidate.toString() === userId.toString()
        );

        if (isAlreadyApplied) {
            return res.status(400).json({ message: 'You have already applied to this job' });
        }

        // Add the new valid application
        job.applicants.push({
            candidate: userId,
            status: 'Applied', 
            appliedAt: new Date()
        });

        await job.save();

        res.status(200).json({ message: 'Applied successfully', applicants: job.applicants });

    } catch (err) {
        console.error("Apply Job Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get jobs the candidate has applied to
// @route   GET /api/jobs/applied
exports.getAppliedJobs = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id || req.user._id;

        // 1. Find jobs where 'applicants.candidate' matches the user ID
        const jobs = await Job.find({ 'applicants.candidate': userId })
            .populate('recruiter', 'orgName')
            .sort({ 'applicants.appliedAt': -1 });

        // 2. Format the data so the frontend can easily read "myStatus"
        // The frontend expects { myStatus, myAppliedDate }, but the DB has them nested in the array.
        const formattedJobs = jobs.map(job => {
            // Find the specific application object for this user within the job
            const myApp = job.applicants.find(app => app.candidate.toString() === userId.toString());
            
            return {
                _id: job._id,
                title: job.title,
                company: job.recruiter?.orgName || 'Confidential',
                locationType: job.locationType,
                // Send the specific status and date for this user
                myStatus: myApp ? myApp.status : 'Applied',
                myAppliedDate: myApp ? myApp.appliedAt : job.createdAt
            };
        });

        res.json(formattedJobs);
    } catch (err) {
        console.error("Get Applied Jobs Error:", err);
        res.status(500).json({ message: 'Server Error fetching applied jobs' });
    }
};

// ... existing code ...

// @desc    Get all applicants for a specific job (Recruiter Only)
// @route   GET /api/jobs/:id/applicants
exports.getJobApplicants = async (req, res) => {
    try {
        const jobId = req.params.id;
        const recruiterId = req.user.userId || req.user.id || req.user._id;

        // 1. Find Job & Verify Ownership
        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId });
        if (!job) {
            return res.status(404).json({ message: 'Job not found or unauthorized' });
        }

        // 2. Get list of applicant User IDs
        // Filter out any corrupt data where candidate ID might be missing
        const validApps = job.applicants.filter(app => app.candidate);
        const candidateIds = validApps.map(app => app.candidate);

        // 3. Fetch Profiles for these Candidates
        const profiles = await CandidateProfile.find({ user: { $in: candidateIds } })
            .populate('user', 'fullName email');

        // 4. Merge Data (Profile + Application Status)
        const results = validApps.map(app => {
            // Find the profile matching this applicant's User ID
            const profile = profiles.find(p => p.user._id.toString() === app.candidate.toString());
            
            if (!profile) return null; // Skip if profile deleted/not found

            // Calculate a basic Match Score (Simple overlap of skills)
            // Job Skills are Strings ["React", "Node"], Profile Skills are Objects [{name:"React"}, ...]
            const jobSkillsLower = job.skills.map(s => s.toLowerCase());
            const candSkillsLower = (profile.skills || []).map(s => (s.name || s).toLowerCase());
            
            const matchCount = jobSkillsLower.filter(s => 
                candSkillsLower.some(cs => cs.includes(s) || s.includes(cs))
            ).length;
            
            const matchScore = job.skills.length > 0 
                ? Math.round((matchCount / job.skills.length) * 100) 
                : 0;

            return {
                _id: app._id, // Application ID
                candidateId: profile.user._id,
                name: profile.user.fullName,
                email: profile.user.email,
                headline: profile.headline || 'Candidate',
                location: profile.location || 'Remote',
                experience: `${profile.experienceYears || 0} Years`,
                skills: profile.skills.map(s => s.name || s).slice(0, 5), // Top 5 skills
                status: app.status, // 'Applied', 'Interviewing', etc.
                appliedAt: app.appliedAt,
                matchScore: matchScore,
                photoUrl: profile.photoUrl
            };
        }).filter(Boolean); // Remove nulls

        // Sort by Match Score (Highest first)
        results.sort((a, b) => b.matchScore - a.matchScore);

        res.json(results);

    } catch (err) {
        console.error("Get Applicants Error:", err);
        res.status(500).json({ message: 'Server Error fetching applicants' });
    }
};