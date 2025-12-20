import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home'; // NEW
import Sourcing from './pages/Sourcing';
import Recruiter from './pages/Recruiter';
import Shortlist from './pages/Shortlist';
import RecruiterProfile from './pages/RecruiterProfile';
import PostJob from './pages/PostJob';
import MyJobs from './pages/MyJobs';
import JobPortal from './pages/JobPortal';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Change "/" to point to Home instead of Login */}
        <Route path="/" element={<Home />} />
        
        {/* Move Login to its own route */}
        <Route path="/login" element={<Login />} />
        
        <Route path="/dashboard" element={<Recruiter />} />
        <Route path="/sourcing" element={<Sourcing />} />
        <Route path="/shortlist" element={<Shortlist />} />
        <Route path="/profile" element={<RecruiterProfile />} />
        <Route path="/post-job" element={<PostJob />} />
        <Route path="/my-jobs" element={<MyJobs />} />
        <Route path="/job-portal" element={<JobPortal />} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;