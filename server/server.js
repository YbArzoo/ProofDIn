const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// connect DB
connectDB();

// routes
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const candidateRoutes = require('./routes/candidateRoutes');   // 👈 NEW



app.use('/api/recruiters', require('./routes/recruiterRoutes'));
app.use('/api/shortlist', require('./routes/shortlistRoutes'));


app.use('/api/auth', authRoutes);
// remove the duplicate /api/auth line
app.use('/api/jobs', jobRoutes);
app.use('/api/candidate', candidateRoutes);                    // 👈 NEW

app.get('/', (req, res) => {
  res.send('ProofDIn API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
