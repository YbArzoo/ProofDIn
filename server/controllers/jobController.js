const Job = require('../models/Job');
const CandidateProfile = require('../models/CandidateProfile');
const { GoogleGenerativeAI } = require("@google/generative-ai");

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
          niceToHaveSkills // <--- 1. ADD THIS HERE
      } = req.body;
  
      const recruiterId = req.user.userId || req.user.id || req.user._id;
      if (!recruiterId) return res.status(401).json({ message: 'Unauthorized' });
  
      // 1. AI Extraction (Hybrid)
      let aiSkills = await extractSkillsWithAI(description);
      if (!aiSkills || aiSkills.length === 0) {
          aiSkills = extractSkillsRegex(description);
      }
  
      // Combine AI skills with manually entered skills (if any)
      const finalSkills = Array.from(new Set([...aiSkills, ...(manualSkills || [])]));
  
      // 2. Create Job with ALL fields
      const job = await Job.create({
        recruiter: recruiterId,
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
        niceToHaveSkills: niceToHaveSkills, // <--- 2. ADD THIS HERE
        rawText: description,
        extractedSkills: finalSkills
      });
  
      res.json({
        message: 'Job posted successfully',
        skills: finalSkills,
        jobId: job._id
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
    const jobs = await Job.find().sort({ createdAt: -1 }).populate('recruiter', 'orgName'); 
    res.status(200).json(jobs);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

exports.getMyJobs = async (req, res) => {
    try {
      const recruiterId = req.user.userId || req.user.id || req.user._id;
      const jobs = await Job.find({ recruiter: recruiterId }).sort({ createdAt: -1 });
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