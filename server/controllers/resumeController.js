// server/controllers/resumeController.js
const Groq = require('groq-sdk');
const CandidateProfile = require('../models/CandidateProfile');
const User = require('../models/User'); 
const Resume = require('../models/Resume'); 
const Skill = require('../models/Skill'); // <--- 1. NEW IMPORT

// --- DEBUG BLOCK ---
console.log("------------------------------------------------");
console.log("--> DEBUG: Checking AI Key...");
if (!process.env.GROQ_API_KEY) {
    console.log("❌ ERROR: GROQ_API_KEY is missing from .env file!");
} else {
    const key = process.env.GROQ_API_KEY;
    console.log(`✅ Key Loaded. Length: ${key.length}`);
}
console.log("------------------------------------------------");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY, 
});

// 2. GENERATE & SAVE RESUME
exports.generateTailoredResume = async (req, res) => {
    try {
        const { jobDescriptionText } = req.body;

        if (!jobDescriptionText) {
            return res.status(400).json({ message: 'Job Description text is required' });
        }

        const userId = req.user.userId || req.user.id || req.user._id;
        
        // --- 1. FETCH DATA SOURCES ---
        const userDetails = await User.findById(userId).select('-password');
        if (!userDetails) return res.status(404).json({ message: 'User not found' });

        let candidateProfile = await CandidateProfile.findOne({ user: userId });
        
        // Fallback if profile missing
        if (!candidateProfile) {
            console.log("⚠️ Profile missing during Resume Gen. Creating default...");
            candidateProfile = await CandidateProfile.create({
                user: userId,
                headline: "Aspiring Professional",
                summary: `Motivated professional named ${userDetails.fullName}.`,
                skills: [], 
                experienceYears: 0,
                location: "Remote"
            });
        }

        // --- 2. FETCH SKILL GRID (NEW) ---
        const verifiedSkills = await Skill.find({ user: userId });
        const skillGridString = verifiedSkills.map(s => `${s.name} (${s.level})`).join(', ');

        // --- 3. PREPARE CONTEXT FOR AI ---
        // Combine Profile Skills + Grid Skills
        const profileSkills = candidateProfile.skills ? candidateProfile.skills.map(s => typeof s === 'string' ? s : s.name).join(', ') : "";
        
        const candidateContext = `
            CONTACT INFO:
            Name: ${userDetails.fullName}
            Email: ${userDetails.email}
            Phone: ${candidateProfile.phone || "Not specified"}
            Location: ${candidateProfile.location || "Not specified"}
            Links: ${candidateProfile.socialLinks ? candidateProfile.socialLinks.join(', ') : ''}

            PROFESSIONAL PROFILE:
            Headline: ${candidateProfile.headline || "Not specified"}
            Summary: ${candidateProfile.summary || "Not specified"}
            Years Exp: ${candidateProfile.experienceYears || 0}
            
            WORK HISTORY (Database):
            ${candidateProfile.experience || "No structured experience found in DB."}

            EDUCATION:
            ${candidateProfile.education || "No education found in DB."}

            TECHNICAL SKILL GRID (Verified):
            ${skillGridString || profileSkills || "General professional skills"}
        `;

        console.log("Generating resume with Groq...");

        // --- 4. SEND TO GROQ ---
        const chatCompletion = await groq.chat.completions.create({
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert executive resume writer. Your goal is to write a highly tailored, ATS-friendly resume."
                },
                {
                    "role": "user",
                    "content": `
                    Please generate a tailored resume in Markdown format based on these three data sources:

                    SOURCE 1: CANDIDATE PROFILE (Static Data)
                    ${candidateContext}

                    SOURCE 2: VERIFIED SKILL GRID
                    ${skillGridString}

                    SOURCE 3: TARGET JOB DESCRIPTION / USER INPUT
                    "${jobDescriptionText}"

                    ---
                    INSTRUCTIONS:
                    1. **Header**: Use Name and Contact info from SOURCE 1.
                    2. **Summary**: Blend the candidate's base summary (Source 1) with keywords from the Target Job (Source 3).
                    3. **Skills**: List skills from SOURCE 2, prioritizing those that appear in SOURCE 3.
                    4. **Experience**: 
                       - If Source 3 contains a work history narrative (e.g., "I worked as a UI Designer..."), USE THAT as the primary role description.
                       - Combine it with any history found in Source 1.
                       - Use strong action verbs.
                    5. **Education**: Use data from Source 1.
                    
                    Output ONLY the Markdown text.
                    `
                }
            ],
            "model": "llama-3.3-70b-versatile",
            "temperature": 0.6,
            "max_completion_tokens": 3500
        });

        const generatedText = chatCompletion.choices[0]?.message?.content || "";

        // --- EXTRACT TITLE & COMPANY (Kept your existing logic) ---
        let jobTitle = "Tailored Role";
        let companyName = "Target Company";

        const companyMatch = jobDescriptionText.match(/(?:at|for|company)\s+([A-Z][a-z0-9]+(?:\s[A-Z][a-z0-9]+)*)/);
        if (companyMatch) companyName = companyMatch[1];

        const roleRegex = /(?:role|position|hiring|looking for)[:\s]+(.*?)(?:\n|$|\.|with|for)/i;
        const roleMatch = jobDescriptionText.match(roleRegex);

        if (roleMatch && roleMatch[1].length < 50) {
            jobTitle = roleMatch[1].trim();
        } else {
            const firstLine = jobDescriptionText.split('\n')[0];
            const cleanTitle = firstLine.split(/(?:with|at|for|\||,|\()/i)[0].trim();
            if (cleanTitle.length > 0 && cleanTitle.length < 50) {
                jobTitle = cleanTitle;
            } else {
                jobTitle = cleanTitle.split(' ').slice(0, 4).join(' ');
            }
        }
        
        jobTitle = jobTitle.replace(/[^\w\s\-\.]/g, '').trim();

        // --- SAVE TO DB ---
        const newResume = new Resume({
            user: userId,
            content: generatedText,
            companyName: companyName,
            jobTitle: jobTitle,
            jobDescriptionText: jobDescriptionText 
        });

        await newResume.save();
        console.log(`✅ Resume saved: "${jobTitle}"`);

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

// 3. FETCH RESUME HISTORY
exports.getResumeHistory = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id || req.user._id;
        const resumes = await Resume.find({ user: userId })
            .sort({ createdAt: -1 })
            .select('companyName jobTitle createdAt content'); 

        res.json(resumes);
    } catch (err) {
        console.error('Fetch History Error:', err);
        res.status(500).json({ message: 'Server Error fetching history' });
    }
};
// 4. UPDATE RESUME TITLE
exports.updateResume = async (req, res) => {
    try {
        const { id } = req.params;
        const { jobTitle } = req.body;
        const userId = req.user.userId || req.user.id || req.user._id;

        const resume = await Resume.findOneAndUpdate(
            { _id: id, user: userId },
            { jobTitle },
            { new: true }
        );

        if (!resume) return res.status(404).json({ message: 'Resume not found' });
        res.json(resume);
    } catch (err) {
        res.status(500).json({ message: 'Server error updating resume' });
    }
};

// 5. DELETE RESUME
exports.deleteResume = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId || req.user.id || req.user._id;

        const resume = await Resume.findOneAndDelete({ _id: id, user: userId });
        
        if (!resume) return res.status(404).json({ message: 'Resume not found' });
        res.json({ message: 'Resume deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error deleting resume' });
    }
};