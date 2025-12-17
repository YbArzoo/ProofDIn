// server/controllers/resumeController.js
const Groq = require('groq-sdk');
const CandidateProfile = require('../models/CandidateProfile');
const User = require('../models/User'); 

// Initialize Groq Client
// Ensure GROQ_API_KEY is in your .env file
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY, 
});

exports.generateTailoredResume = async (req, res) => {
    try {
        const { jobDescriptionText } = req.body;

        if (!jobDescriptionText) {
            return res.status(400).json({ message: 'Job Description text is required' });
        }

        // 1. Fetch Candidate Data
        // req.user.userId comes from your authMiddleware
        const userId = req.user.userId || req.user.id;
        
        const candidateProfile = await CandidateProfile.findOne({ user: userId });
        const userDetails = await User.findById(userId).select('-password');

        if (!candidateProfile) {
            return res.status(404).json({ message: 'Candidate profile not found' });
        }

        // 2. Format Data for AI
        // Handle cases where skills might be empty
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

        console.log("Generating resume with Groq (Llama 3)...");

        // 3. Call Groq API (Llama 3 model)
        const chatCompletion = await groq.chat.completions.create({
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert professional resume writer. Your task is to take raw candidate information and rewrite it into a highly tailored, professional resume that perfectly aligns with a target Job Description. Use professional action verbs. Do not invent experiences, but emphasize the matching skills. Output ONLY the resume content in clean Markdown format."
                },
                {
                    "role": "user",
                    "content": `
                    CANDIDATE INFO:
                    ${candidateContext}

                    TARGET JOB DESCRIPTION:
                    ${jobDescriptionText}

                    Write the tailored resume now.`
                }
            ],
            "model": "llama-3.3-70b-versatile",
            "temperature": 0.6,
            "max_completion_tokens": 3000,
            "top_p": 1,
            "stream": false,
            "stop": null
        });

        // 4. Send Response
        const generatedText = chatCompletion.choices[0]?.message?.content || "";
        res.json({ resumeContent: generatedText });

    } catch (err) {
        console.error('AI Resume Gen Error:', err.message);
        // If API key is missing or invalid, sending a clear error helps debugging
        res.status(500).json({ message: 'Server Error during AI generation', error: err.message });
    }
};