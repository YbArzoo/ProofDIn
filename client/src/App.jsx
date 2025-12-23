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
import CandidateDashboard from './pages/CandidateDashboard'; // ✅ Import is here

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        
        {/* ✅ ADDED MISSING ROUTE HERE: */}
        <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
        
        <Route path="/dashboard" element={<Recruiter />} />
        <Route path="/sourcing" element={<Sourcing />} />
        <Route path="/shortlist" element={<Shortlist />} />
        <Route path="/profile" element={<RecruiterProfile />} />
        <Route path="/post-job" element={<PostJob />} />
        <Route path="/my-jobs" element={<MyJobs />} />
        <Route path="/job-portal" element={<JobPortal />} />
        
        {/* Redirect unknown routes to Home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;