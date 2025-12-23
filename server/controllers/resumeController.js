// server/controllers/resumeController.js
const Groq = require('groq-sdk');
const CandidateProfile = require('../models/CandidateProfile');
const User = require('../models/User'); 
const Resume = require('../models/Resume'); 

// --- DEBUG BLOCK ---
console.log("------------------------------------------------");
console.log("--> DEBUG: Checking AI Key...");
if (!process.env.GROQ_API_KEY) {
    console.log("❌ ERROR: GROQ_API_KEY is missing from .env file!");
} else {
    const key = process.env.GROQ_API_KEY;
    console.log(`✅ Key Loaded. Length: ${key.length}`);
    // Show first 4 chars to verify it's the right key (gsk_...)
    console.log(`   Starts with: "${key.substring(0, 4)}..."`); 
    if (key.startsWith(' ')) console.log("⚠️ WARNING: Your key has a generic SPACE at the start! Remove it.");
    if (key.includes('"')) console.log("⚠️ WARNING: Your key includes QUOTES. Remove them.");
}
console.log("------------------------------------------------");

// 1. INITIALIZE GROQ (Only once!)
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
        
        // --- SELF-HEALING LOGIC START ---
        // 1. Fetch User Details
        const userDetails = await User.findById(userId).select('-password');
        if (!userDetails) return res.status(404).json({ message: 'User not found' });

        // 2. Try to fetch Profile, or CREATE IT if missing
        let candidateProfile = await CandidateProfile.findOne({ user: userId });
        
        if (!candidateProfile) {
            console.log("⚠️ Profile missing during Resume Gen. Creating default...");
            candidateProfile = await CandidateProfile.create({
                user: userId,
                headline: "Aspiring Professional",
                summary: `Motivated professional named ${userDetails.fullName} looking for new opportunities.`,
                skills: [], 
                experienceYears: 0,
                location: "Remote",
                phone: ""
            });
        }
        // --- SELF-HEALING LOGIC END ---

        const skillsList = candidateProfile.skills && candidateProfile.skills.length > 0 
            ? candidateProfile.skills.map(s => `${s.name} (${s.level})`).join(', ')
            : "General professional skills";

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

        // --- EXTRACT TITLE & COMPANY ---
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
        console.log(`✅ Resume saved: "${jobTitle}" for "${companyName}"`);

        res.json({ 
            resumeContent: generatedText,
            companyName,
            jobTitle,
            id: newResume._id 
        });

    } catch (err) {
        console.error('AI Resume Gen Error:', err.message);
        // Better error message for the frontend
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