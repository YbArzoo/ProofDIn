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
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
    const { description, title } = req.body;
    const recruiterId = req.user.userId || req.user.id || req.user._id;

    if (!recruiterId) return res.status(401).json({ message: 'Unauthorized' });
    if (!description) return res.status(400).json({ message: 'Description required' });

    // --- HYBRID LOGIC START ---
    let skills = [];
    let method = "AI";

    // 1. Try AI first
    skills = await extractSkillsWithAI(description);

    // 2. If AI failed (empty array), use Regex Fallback
    if (!skills || skills.length === 0) {
        console.log("⚠️ AI failed or found nothing. Switching to Local Dictionary.");
        skills = extractSkillsRegex(description);
        method = "Local Regex";
    }
    // --- HYBRID LOGIC END ---

    console.log(`Extracted via ${method}:`, skills);

    const job = await Job.create({
      recruiter: recruiterId,
      title: title || 'Untitled Job',
      description: description,
      skills: skills,
      rawText: description,
      extractedSkills: skills 
    });

    // Return 200 OK even if AI failed (because we used Regex)
    res.json({
      message: `Job analyzed successfully (${method})`,
      skills,
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

exports.deleteJob = async (req, res) => {
    try {
        await Job.findByIdAndDelete(req.params.id);
        res.json({ message: 'Job deleted' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
};