// 1. LOAD ENV VARIABLES FIRST
require('dotenv').config(); 

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // <--- Added JWT
const connectDB = require('./config/db');

// 2. IMPORT CONTROLLER
const resumeController = require('./controllers/resumeController'); 

// Debug Check
if (!process.env.GROQ_API_KEY) {
    console.error("FATAL ERROR: GROQ_API_KEY is not loaded! Check .env");
} else {
    console.log("SUCCESS: GROQ_API_KEY loaded successfully.");
}

const app = express();

app.use(cors());
app.use(express.json());

// =========================================================
// 🔥 PRIORITY ROUTE (Now with Authentication!)
// =========================================================
app.post('/api/candidate/generate-resume', async (req, res) => {
    console.log("PRIORITY ROUTE HIT: /api/candidate/generate-resume");
    
    // 1. MANUALLY CHECK TOKEN
    const token = req.header('x-auth-token');
    if (!token) {
        console.log("No token provided in request");
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // 2. DECODE TOKEN
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // <--- This fixes the 'userId' error!
        console.log("User Authenticated ID:", req.user.userId || req.user.id);

        // 3. CALL CONTROLLER
        await resumeController.generateTailoredResume(req, res);

    } catch (err) {
        console.error("Auth/Route Error:", err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
});
// =========================================================

// connect DB
connectDB();

// routes
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const candidateRoutes = require('./routes/candidateRoutes');



app.use('/api/recruiters', require('./routes/recruiterRoutes'));
app.use('/api/shortlist', require('./routes/shortlistRoutes'));


app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/candidate', candidateRoutes);

app.get('/', (req, res) => {
  res.send('ProofDIn API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));