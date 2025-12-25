import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import Sourcing from './pages/Sourcing';
import Recruiter from './pages/Recruiter';
import Shortlist from './pages/Shortlist';
import RecruiterProfile from './pages/RecruiterProfile';
import PostJob from './pages/PostJob';
import MyJobs from './pages/MyJobs';
import JobPortal from './pages/JobPortal';
import CandidateDashboard from './pages/CandidateDashboard';
import TailoredResume from './pages/TailoredResume';

// ✅ NEW IMPORTS (Merged)
import AppliedJobs from './pages/AppliedJobs';
import Skills from './pages/Skills';
import CandidateProfile from './pages/CandidateProfile'; 
import JobApplicants from './pages/JobApplicants'; 
import CandidateOffers from './pages/CandidateOffers'; 
import CandidatePortfolio from './pages/CandidatePortfolio'; // <--- ✅ ADDED THIS
import CandidatePortfolioView from './pages/CandidatePortfolioView'; // <--- Import new page


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        
        {/* CANDIDATE ROUTES */}
        <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
        <Route path="/candidate-profile" element={<CandidateProfile />} />
        <Route path="/applied-jobs" element={<AppliedJobs />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/jobs" element={<JobPortal />} />
        <Route path="/tailored-resumes" element={<TailoredResume />} />
        <Route path="/my-offers" element={<CandidateOffers />} />
        
        {/* ✅ ADDED PORTFOLIO ROUTE */}
        <Route path="/portfolio" element={<CandidatePortfolio />} />

        {/* RECRUITER ROUTES */}
        <Route path="/dashboard" element={<Recruiter />} />
        <Route path="/sourcing" element={<Sourcing />} />
        <Route path="/shortlist" element={<Shortlist />} />
        <Route path="/profile" element={<RecruiterProfile />} />
        <Route path="/post-job" element={<PostJob />} />
        <Route path="/my-jobs" element={<MyJobs />} />
        <Route path="/dashboard" element={<Recruiter />} />
        <Route path="/candidate-view/:id" element={<CandidatePortfolioView />} /> {/* ✅ Recruiter View Route */}
        
        {/* Redirect unknown routes to Home */}
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/jobs/:id/applicants" element={<JobApplicants />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;