require('dotenv').config(); 
const express = require('express');
const cors = require('cors'); 
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const path = require('path'); // <--- THIS WAS MISSING

// Import Controllers
const resumeController = require('./controllers/resumeController'); 

const app = express();

// 1. STRICT CORS SETUP
app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true,               
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// 2. MAKE UPLOADS FOLDER PUBLIC (Fixes the broken image links)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. CONNECT DB
connectDB();

// 4. PRIORITY ROUTE
app.post('/api/candidate/generate-resume', async (req, res) => {
    console.log("PRIORITY ROUTE: Generate Resume");
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        await resumeController.generateTailoredResume(req, res);
    } catch (err) {
        console.error("Auth Error:", err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
});

// 5. ROUTES
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/candidate', require('./routes/candidateRoutes')); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));