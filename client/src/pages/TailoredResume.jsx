import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../index.css'; 

const TailoredResume = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState({ name: 'Candidate', avatar: 'C' });
    
    // Resume States
    const [jobDescription, setJobDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [resumeHistory, setResumeHistory] = useState([]);
    const [generatedResume, setGeneratedResume] = useState(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (!token) return navigate('/');
        
        if (userStr) {
            const u = JSON.parse(userStr);
            setUser({ ...u, avatar: (u.fullName || 'C')[0].toUpperCase() });
        }

        fetchHistory(token);
    }, []);

    const fetchHistory = async (token) => {
        try {
            const res = await axios.get('http://localhost:5000/api/candidate/resumes', {
                headers: { 'x-auth-token': token }
            });
            setResumeHistory(res.data);
        } catch (err) {
            console.error("Error fetching history", err);
        }
    };

    const handleGenerate = async () => {
        if (!jobDescription.trim()) return alert("Please paste a Job Description first.");
        
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/candidate/generate-resume', 
                { jobDescriptionText: jobDescription },
                { headers: { 'x-auth-token': token } }
            );

            setGeneratedResume(res.data);
            setResumeHistory([res.data, ...resumeHistory]); // Add new resume to top of list
            setJobDescription(''); // Clear input
            alert("Resume Generated Successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to generate resume. Check API Key or Server.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => { localStorage.clear(); navigate('/'); };

    return (
        <div>
            {/* SIDEBAR */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon"><i className="fas fa-search-check"></i></div>
                    <div className="sidebar-logo-text">ProofdIn</div>
                </div>
                <ul className="sidebar-menu">
                    <li><Link to="/candidate-dashboard"><i className="fas fa-tachometer-alt"></i> Dashboard</Link></li>
                    <li><Link to="/jobs"><i className="fas fa-briefcase"></i> Job Portal</Link></li>
                    <li><Link to="/applied-jobs"><i className="fas fa-check-circle"></i> Applied Jobs</Link></li>
                    
                    {/* ACTIVE TAB */}
                    <li className="active"><Link to="/tailored-resumes" style={{color: 'var(--primary)'}}><i className="fas fa-file-pdf"></i> Tailored Resumes</Link></li>
                    
                    <li><Link to="/skills"><i className="fas fa-th-large"></i> Skills Grid</Link></li>
                    <li><Link to="/candidate-profile"><i className="fas fa-user-circle"></i> My Profile</Link></li>
                </ul>
            </aside>

            {/* HEADER */}
            <header className="dashboard-header">
                <nav className="dashboard-nav">
                    <div className="user-menu">
                        <div className="avatar" style={{ flexShrink: 0 }}>{user.avatar}</div>
                        <div className="user-info-text" style={{ whiteSpace: 'nowrap' }}>
                            <div className="name">{user.fullName || user.name}</div>
                            <div className="role">Candidate</div>
                        </div>
                        <button onClick={handleLogout} className="btn btn-primary" style={{ marginLeft: '10px' }}>Logout</button>
                    </div>
                </nav>
            </header>

            {/* MAIN CONTENT */}
            <div className="dashboard-container" style={{ marginTop: 0 }}>
                
                {/* 1. GENERATOR SECTION */}
                <div className="section-card">
                    <div className="section-header">
                        <h2><i className="fas fa-magic" style={{color:'var(--primary)', marginRight:'10px'}}></i>AI Resume Tailor</h2>
                    </div>
                    <p className="section-subtitle">Paste a Job Description below, and our AI will rewrite your resume to match it perfectly.</p>

                    <div className="resume-tailor-input">
                        <textarea 
                            className="custom-textarea" 
                            placeholder="Paste the target Job Description here (e.g. 'We are looking for a React Developer...')"
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                        />
                        <button 
                            className="btn-generate-full" 
                            onClick={handleGenerate} 
                            disabled={loading}
                        >
                            {loading ? (
                                <span><i className="fas fa-spinner fa-spin"></i> Generating...</span>
                            ) : (
                                <span><i className="fas fa-wand-magic-sparkles"></i> Generate Tailored Resume</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* 2. RECENTLY GENERATED (Preview) */}
                {generatedResume && (
                    <div className="section-card" style={{background:'#f0f4ff', border:'1px solid #d0d7ff'}}>
                        <div className="section-header">
                            <h3 style={{color:'var(--primary)'}}>🎉 New Resume Ready!</h3>
                            <button className="btn" style={{background:'white', color:'var(--primary)'}} onClick={() => setGeneratedResume(null)}>Close</button>
                        </div>
                        <div style={{background:'white', padding:'2rem', borderRadius:'8px', maxHeight:'400px', overflowY:'auto', border:'1px solid #eee', whiteSpace:'pre-wrap'}}>
                            {generatedResume.resumeContent}
                        </div>
                        <div style={{marginTop:'1rem', textAlign:'right'}}>
                            <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(generatedResume.resumeContent)}>
                                <i className="fas fa-copy"></i> Copy Text
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. HISTORY SECTION */}
                <div className="section-card">
                    <div className="section-header">
                        <h2>Resume History</h2>
                    </div>
                    
                    {resumeHistory.length === 0 ? (
                        <p style={{color:'#666', textAlign:'center', padding:'2rem'}}>No resumes generated yet.</p>
                    ) : (
                        <div className="history-list" style={{display:'grid', gap:'1rem'}}>
                            {resumeHistory.map(resume => (
                                <div key={resume._id || resume.id} style={{
                                    display:'flex', justifyContent:'space-between', alignItems:'center',
                                    padding:'1.5rem', background:'white', border:'1px solid #eee', borderRadius:'12px',
                                    boxShadow:'0 2px 5px rgba(0,0,0,0.02)'
                                }}>
                                    <div>
                                        <h4 style={{margin:0, fontSize:'1.1rem'}}>{resume.jobTitle || 'Tailored Resume'}</h4>
                                        <div style={{color:'#666', fontSize:'0.9rem', marginTop:'0.3rem'}}>
                                            <i className="fas fa-building"></i> {resume.companyName || 'Target Company'} • {new Date(resume.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <button 
                                        className="btn btn-secondary" 
                                        onClick={() => setGeneratedResume(resume)} // Reuse the preview window
                                    >
                                        <i className="fas fa-eye"></i> View
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default TailoredResume;