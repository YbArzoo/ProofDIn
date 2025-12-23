// server/controllers/resumeController.js
const Groq = require('groq-sdk');
const CandidateProfile = require('../models/CandidateProfile');
const User = require('../models/User'); 
const Resume = require('../models/Resume'); 

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY, 
});

// 1. GENERATE & SAVE RESUME
exports.generateTailoredResume = async (req, res) => {
    try {
        const { jobDescriptionText } = req.body;

        if (!jobDescriptionText) {
            return res.status(400).json({ message: 'Job Description text is required' });
        }

        const userId = req.user.userId || req.user.id;
        const candidateProfile = await CandidateProfile.findOne({ user: userId });
        const userDetails = await User.findById(userId).select('-password');

        if (!candidateProfile) {
            return res.status(404).json({ message: 'Candidate profile not found' });
        }

        const skillsList = candidateProfile.skills && candidateProfile.skills.length > 0 
            ? candidateProfile.skills.map(s => `${s.name} (${s.level})`).join(', ')
            : "No specific skills listed";

        const candidateContext = `
            Name: ${userDetails.fullName}
            Email: ${userDetails.email}
            Headline: ${candidateProfile.headline || "Not specified"}
            Skills: ${skillsList}
            Bio: ${candidateProfile.summary || "Not specified"}
        `;

        console.log("Generating resume with Groq...");

        const chatCompletion = await groq.chat.completions.create({
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert professional resume writer. Your task is to take raw candidate information and rewrite it into a highly tailored, professional resume that perfectly aligns with a target Job Description. Use professional action verbs. Do not invent experiences, but emphasize the matching skills. Output ONLY the resume content in clean Markdown format."
                },
                {
                    "role": "user",
                    "content": `CANDIDATE INFO:\n${candidateContext}\n\nTARGET JOB DESCRIPTION:\n${jobDescriptionText}\n\nWrite the tailored resume now.`
                }
            ],
            "model": "llama-3.3-70b-versatile",
            "temperature": 0.6,
            "max_completion_tokens": 3000
        });

        const generatedText = chatCompletion.choices[0]?.message?.content || "";

        // --- IMPROVED TITLE EXTRACTION ---
        let jobTitle = "Tailored Role";
        let companyName = "Target Company";

        // 1. Extract Company (looks for "at Company", "for Company")
        const companyMatch = jobDescriptionText.match(/(?:at|for|company)\s+([A-Z][a-z0-9]+(?:\s[A-Z][a-z0-9]+)*)/);
        if (companyMatch) companyName = companyMatch[1];

        // 2. Extract Job Title (Smarter Logic)
        // First, check for explicit labels like "Role:" or "Hiring"
        const roleRegex = /(?:role|position|hiring|looking for)[:\s]+(.*?)(?:\n|$|\.|with|for)/i;
        const roleMatch = jobDescriptionText.match(roleRegex);

        if (roleMatch && roleMatch[1].length < 50) {
            jobTitle = roleMatch[1].trim();
        } else {
            // Fallback: Take the first line, but stop at common separators ("with", "at", "for", ",")
            // Example: "Senior Dev with 5 years..." -> "Senior Dev"
            const firstLine = jobDescriptionText.split('\n')[0];
            const cleanTitle = firstLine.split(/(?:with|at|for|\||,|\()/i)[0].trim();
            
            if (cleanTitle.length > 0 && cleanTitle.length < 50) {
                jobTitle = cleanTitle;
            } else {
                // If still too long, just take the first 4 words
                jobTitle = cleanTitle.split(' ').slice(0, 4).join(' ');
            }
        }
        
        // Remove any special characters from the title to make it clean
        jobTitle = jobTitle.replace(/[^\w\s\-\.]/g, '').trim();

        // --- SAVE TO DB ---
        const newResume = new Resume({
            user: userId,
            content: generatedText,
            companyName: companyName,
            jobTitle: jobTitle,
            // ADD THIS LINE BELOW:
            jobDescriptionText: jobDescriptionText 
        });

        await newResume.save();
        console.log(`✅ Resume saved: "${jobTitle}" for "${companyName}"`);

        res.json({ 
            resumeContent: generatedText,
            companyName,
            jobTitle,
            id: newResume._id 
        });

    } catch (err) {
        console.error('AI Resume Gen Error:', err.message);
        res.status(500).json({ message: 'Server Error during AI generation', error: err.message });
    }
};

// 2. FETCH RESUME HISTORY
exports.getResumeHistory = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const resumes = await Resume.find({ user: userId })
            .sort({ createdAt: -1 })
            .select('companyName jobTitle createdAt content'); 

        res.json(resumes);
    } catch (err) {
        console.error('Fetch History Error:', err);
        res.status(500).json({ message: 'Server Error fetching history' });
    }
};