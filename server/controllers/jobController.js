const Job = require('../models/Job');
const CandidateProfile = require('../models/CandidateProfile');
const RecruiterProfile = require('../models/RecruiterProfile');
const Skill = require('../models/Skill'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 1. LOCAL DICTIONARY ---
const SKILL_DICTIONARY = ['React', 'TypeScript', 'JavaScript', 'Redux', 'RTK', 'Jest', 'Cypress', 'GraphQL', 'Node.js', 'Web Performance', 'REST APIs', 'Next.js', 'AWS', 'Golang', 'Python', 'Java', 'SQL', 'MongoDB', 'Docker', 'Kubernetes', 'Git', 'Linux', 'UI Design', 'UX Design'];
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

// ✅ HELPER: Wait function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- 3. DASHBOARD SKILL EXTRACTION ---
async function extractSkillsWithAI(text) {
    if (!genAI) return []; 

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            // ✅ FIX: Use the EXACT model name from your dashboard
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" }); 
            
            const prompt = `
            Extract technical skills from this text.
            Rules:
            1. Return ONLY a JSON array of strings.
            2. Extract ONLY specific technologies (e.g., "React", "Python", "AWS").
            3. Do NOT include phrases like "Understanding of", "Proficient in", or "Experience with".
            4. Normalize names (e.g., "React.js" -> "React").
            Text: "${text.substring(0, 1000)}" 
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let textResponse = response.text().trim();

            textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            
            return JSON.parse(textResponse);

        } catch (error) {
            if (error.message.includes('429') && attempt < 3) {
                console.log(`⚠️ AI Rate Limit hit. Retrying in 5s... (Attempt ${attempt}/3)`);
                await delay(5000); 
                continue;
            }
            console.error(`AI Extraction Failed (Attempt ${attempt}):`, error.message);
            if (attempt === 3) return [];
        }
    }
}

// --- CONTROLLERS ---

exports.analyzeJob = async (req, res) => {
    try {
      const { 
          description, title, jobType, experienceLevel, 
          locationType, location, salaryMin, salaryMax, 
          benefits, responsibilities, manualSkills,
          niceToHaveSkills, status 
      } = req.body;
  
      const recruiterId = req.user.userId || req.user.id || req.user._id;
      if (!recruiterId) return res.status(401).json({ message: 'Unauthorized' });

      const profile = await RecruiterProfile.findOne({ user: recruiterId });
      const companyName = profile ? profile.orgName : 'Hiring Company';
  
      let aiSkills = await extractSkillsWithAI(description);
      
      if (!aiSkills || aiSkills.length === 0) {
          aiSkills = extractSkillsRegex(description);
      }
      const finalSkills = Array.from(new Set([...aiSkills, ...(manualSkills || [])]));
  
      const job = await Job.create({
        recruiter: recruiterId,
        company: companyName,
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
        const allGridSkills = await Skill.find({});

        const results = candidates.map(candidate => {
            const profileSkills = (candidate.skills || []).map(s => (typeof s === 'string' ? s : s.name));
            const gridSkills = allGridSkills
                .filter(s => s.user.toString() === candidate.user._id.toString())
                .map(s => s.name);

            const combinedSkills = [...new Set([...profileSkills, ...gridSkills])];
            const normalizedCandSkills = combinedSkills.map(s => s.toLowerCase());

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
                id: candidate.user._id, 
                name: candidate.user.fullName,
                title: candidate.headline || 'Candidate',
                experience: `${candidate.experienceYears || 0} years`,
                matchScore: score,
                skills: matchDetails, 
                whyMatched: matchDetails.length > 0 ? `Matched: ${matchDetails.slice(0,3).join(', ')}` : "Low overlap",
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

exports.getAllJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ status: 'published' }).sort({ createdAt: -1 }).lean();
        const enhancedJobs = await Promise.all(jobs.map(async (job) => {
            const profile = await RecruiterProfile.findOne({ user: job.recruiter });
            return {
                ...job,
                recruiter: {
                    ...job.recruiter,
                    orgName: profile ? profile.orgName : 'Hiring Company'
                }
            };
        }));
        res.status(200).json(enhancedJobs);
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

exports.getMyJobs = async (req, res) => {
    try {
      const recruiterId = req.user.userId || req.user.id || req.user._id;
      const jobs = await Job.find({ 
          recruiter: recruiterId, 
          status: { $ne: 'draft' } 
      }).sort({ createdAt: -1 });
      res.json(jobs);
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

exports.deleteJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const recruiterId = req.user.userId || req.user.id || req.user._id;
        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId });
        if (!job) return res.status(404).json({ message: 'Job not found or unauthorized' });
        await Job.findByIdAndDelete(jobId);
        res.json({ message: 'Job deleted successfully' });
    } catch (err) { res.status(500).json({ message: 'Server error deleting job' }); }
};

// ✅ AUTO-FILL FORM (Using gemini-2.5-flash-lite)
exports.parseJobDescription = async (req, res) => {
    try {
        const { description } = req.body;
        if (!description) return res.status(400).json({ message: "Description required" });
        if (!genAI) return res.status(503).json({ message: "AI service unavailable" });

        let parsedData = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                // ✅ FIX: Using the EXACT model name from your dashboard (0/20 used)
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
                
                const prompt = `
                Analyze this job description and extract structured data.
                
                CRITICAL RULES:
                1. Return ONLY valid JSON.
                2. For 'skills' and 'niceToHaveSkills', extract ONLY the technology name (e.g., "React", "AWS"). 
                3. DO NOT include phrases like "Experience with", "Understanding of", "Proficiency in".
                4. If a field is not found, use empty string or empty array.

                Keys to extract:
                - jobTitle (string)
                - jobType (enum: "Full-Time", "Part-Time", "Contract", "Freelance")
                - experienceLevel (enum: "entry-level", "mid-level", "senior", "lead")
                - locationType (enum: "On-Site", "Hybrid", "Remote")
                - city (string)
                - country (string)
                - salaryMin (number)
                - salaryMax (number)
                - skills (array of strings, CLEAN KEYWORDS ONLY)
                - niceToHaveSkills (array of strings, CLEAN KEYWORDS ONLY)
                - benefits (array of strings)
                - responsibilities (string)

                Job Description:
                "${description.substring(0, 3000)}"
                `;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                let text = response.text().trim();
                text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                
                parsedData = JSON.parse(text);
                break; 

            } catch (err) {
                if (err.message.includes('429') && attempt < 3) {
                    console.log(`⚠️ AI Busy. Retrying in 10s... (Attempt ${attempt}/3)`);
                    await delay(10000);
                    continue;
                }
                console.error(`AI Error (Attempt ${attempt}):`, err.message);
                if (attempt === 3) throw err;
            }
        }
        
        if (parsedData) {
            res.json(parsedData);
        } else {
            throw new Error("Failed to generate data");
        }

    } catch (err) {
        console.error("JD Parsing Error:", err.message);
        res.status(500).json({ message: "AI parsing failed. Please fill manually." });
    }
};

exports.getJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });
        res.json(job);
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

exports.updateJob = async (req, res) => {
    try {
        const updates = req.body;
        if (updates.salaryMin || updates.salaryMax) {
            updates.salary = { min: updates.salaryMin, max: updates.salaryMax };
        }
        const job = await Job.findOneAndUpdate(
            { _id: req.params.id, recruiter: req.user.userId || req.user.id || req.user._id },
            { $set: updates },
            { new: true }
        );
        if (!job) return res.status(404).json({ message: 'Job not found or unauthorized' });
        res.json({ message: 'Job updated successfully', job });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

exports.applyForJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const userId = req.user?.userId || req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized: User ID missing' });

        if (job.applicants && job.applicants.length > 0) {
            job.applicants = job.applicants.filter(app => app.candidate);
        }

        const isAlreadyApplied = job.applicants.some(
            (app) => app.candidate.toString() === userId.toString()
        );

        if (isAlreadyApplied) return res.status(400).json({ message: 'You have already applied to this job' });

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

exports.getAppliedJobs = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id || req.user._id;
        const jobs = await Job.find({ 'applicants.candidate': userId })
            .sort({ 'applicants.appliedAt': -1 })
            .lean();

        const formattedJobs = jobs.map(job => {
            const myApp = job.applicants && job.applicants.find(app => app.candidate.toString() === userId.toString());
            return {
                _id: job._id,
                title: job.title,
                company: job.company || 'Confidential Company', 
                locationType: job.locationType,
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

exports.getJobApplicants = async (req, res) => {
    try {
        const jobId = req.params.id;
        const recruiterId = req.user.userId || req.user.id || req.user._id;

        const job = await Job.findOne({ _id: jobId, recruiter: recruiterId });
        if (!job) return res.status(404).json({ message: 'Job not found or unauthorized' });

        const validApps = job.applicants.filter(app => app.candidate);
        const candidateIds = validApps.map(app => app.candidate);

        const profiles = await CandidateProfile.find({ user: { $in: candidateIds } })
            .populate('user', 'fullName email');

        const skillGrids = await Skill.find({ user: { $in: candidateIds } });

        const results = validApps.map(app => {
            const profile = profiles.find(p => p.user._id.toString() === app.candidate.toString());
            if (!profile) return null; 

            const profileSkills = (profile.skills || []).map(s => (s.name || s).toString());
            const userGridSkills = skillGrids
                .filter(s => s.user.toString() === app.candidate.toString())
                .map(s => s.name);

            const allCandidateSkills = [...new Set([...profileSkills, ...userGridSkills])];

            const jobSkillsLower = job.skills.map(s => s.toLowerCase());
            const candSkillsLower = allCandidateSkills.map(s => s.toLowerCase());
            
            const matchedSkills = jobSkillsLower.filter(s => 
                candSkillsLower.some(cs => cs === s || cs.includes(s) || s.includes(cs))
            );
            
            const matchScore = job.skills.length > 0 
                ? Math.round((matchedSkills.length / job.skills.length) * 100) 
                : 0;

            return {
                _id: app._id, 
                candidateId: profile.user._id,
                name: profile.user.fullName,
                email: profile.user.email,
                headline: profile.headline || 'Candidate',
                location: profile.location || 'Remote',
                experience: `${profile.experienceYears || 0} Years`,
                skills: allCandidateSkills.slice(0, 5), 
                status: app.status,
                appliedAt: app.appliedAt,
                matchScore: matchScore,
                photoUrl: profile.photoUrl
            };
        }).filter(Boolean);

        results.sort((a, b) => b.matchScore - a.matchScore);

        res.json(results);

    } catch (err) {
        console.error("Get Applicants Error:", err);
        res.status(500).json({ message: 'Server Error fetching applicants' });
    }
};