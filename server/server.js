// 1. IMPORTS & CONFIG
const path = require('path');
// Fix: Explicitly tell dotenv where to find the .env file (in the server folder)
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');

// 2. IMPORT CONTROLLERS
// (We import this AFTER dotenv config so it can find the API Key)
const resumeController = require('./controllers/resumeController');

// Debug Check
if (!process.env.GROQ_API_KEY) {
    console.error("FATAL ERROR: GROQ_API_KEY is not loaded! Check your server/.env file.");
    // We don't exit process here to allow other parts to work, but Resume Gen will fail.
} else {
    console.log("SUCCESS: GROQ_API_KEY loaded successfully.");
}

const app = express();

// 3. MIDDLEWARE
// Fix: Clean CORS setup for React (Vite)
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"], 
    credentials: true, 
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "x-auth-token"] 
}));

// Increase limit to 50mb to handle Base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 📂 SERVE UPLOADED IMAGES
// This lets http://localhost:5000/uploads/filename.jpg work
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 4. STATIC FILES (Frontend Integration)
// This serves the React build (if you build it) or static files
app.use(express.static(path.join(__dirname, '../client')));

// =========================================================
// 🔥 PRIORITY ROUTE (Resume Generation)
// =========================================================
app.post('/api/candidate/generate-resume', async (req, res) => {
    console.log("PRIORITY ROUTE HIT: /api/candidate/generate-resume");
    
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        console.log("User Authenticated ID:", req.user.userId || req.user.id);

        await resumeController.generateTailoredResume(req, res);
    } catch (err) {
        console.error("Auth Error:", err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
});
// =========================================================

// 5. CONNECT DB
connectDB();

// 6. ROUTES
// Define Route Imports
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const candidateRoutes = require('./routes/candidateRoutes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/recruiters', require('./routes/recruiterRoutes'));
app.use('/api/shortlist', require('./routes/shortlistRoutes'));

// Root Route
app.get('/', (req, res) => {
    res.send('ProofDIn API is running...');
});

// 7. START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));