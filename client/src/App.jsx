import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Correct imports based on your screenshot
import Login from './pages/Login';
import CandidateDashboard from './pages/CandidateDashboard';
import Skills from './pages/Skills';
import CandidateProfile from './pages/CandidateProfile'; 
import JobPortal from './pages/JobPortal';
import AppliedJobs from './pages/AppliedJobs';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
        <Route path="/jobs" element={<JobPortal />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/candidate-profile" element={<CandidateProfile />} />
        <Route path="/applied-jobs" element={<AppliedJobs />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;