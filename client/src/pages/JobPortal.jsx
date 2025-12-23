import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/JobPortal.css';

const JobPortal = () => {
    // 1. STATE
    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedJob, setSelectedJob] = useState(null);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    // 2. LOAD DATA
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) setUser(storedUser);
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/jobs');
            setJobs(res.data);
            setFilteredJobs(res.data);
        } catch (err) {
            console.error("Error loading jobs", err);
        }
    };

    // 3. ACTIONS
    const handleSearch = () => {
        const term = search.toLowerCase();
        const results = jobs.filter(job => 
            (job.title?.toLowerCase() || '').includes(term) || 
            (job.skills || []).some(s => s.toLowerCase().includes(term))
        );
        setFilteredJobs(results);
    };

    const handleApply = async (jobId) => {
        if (!user) return navigate('/'); // Force login if not authenticated

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`http://localhost:5000/api/jobs/${jobId}/apply`, {}, {
                headers: { 'x-auth-token': token }
            });

            if (res.status === 200) {
                alert("✅ Application Successful!");

                // Update local state instantly
                const updatedJobs = jobs.map(job => {
                    if (job._id === jobId) {
                        // Add current user ID to applicants array
                        return { ...job, applicants: [...(job.applicants || []), user._id || user.id] };
                    }
                    return job;
                });
                
                setJobs(updatedJobs);
                setFilteredJobs(updatedJobs);
                
                // Update Modal if open
                if (selectedJob && selectedJob._id === jobId) {
                    setSelectedJob({ 
                        ...selectedJob, 
                        applicants: [...(selectedJob.applicants || []), user._id || user.id] 
                    });
                }
            }
        } catch (err) {
            alert(err.response?.data?.message || "Error applying to job");
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const hasApplied = (job) => {
        if (!user || !job.applicants) return false;
        const userId = user._id || user.id;
        return job.applicants.some(app => {
            if (typeof app === 'string') return app === userId;
            return app.candidate === userId;
        });
    };

    // 4. RENDER
    return (
        <div style={{minHeight:'100vh', background:'#f5f7fb'}}>
            
            {/* HEADER */}
            {/* HEADER (Fixed: Blue Gradient) */}
            <header className="public-header" style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', 
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)', 
                position: 'sticky', top: 0, zIndex: 100,
                color: 'white'
            }}>
                <nav style={{
                    maxWidth: '1200px', margin: '0 auto', padding: '1rem 2rem', 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    {/* Logo (White Text) */}
                    <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} style={{display:'flex', alignItems:'center', gap:'10px', textDecoration:'none', color:'white'}}>
                        <div style={{
                            width: '42px', height: '42px', borderRadius: '8px', 
                            background: 'rgba(255,255,255,0.2)', // Glass effect
                            display: 'grid', placeItems: 'center', color: '#fff', fontSize: '1.2rem'
                        }}>
                            <i className="fas fa-bolt"></i>
                        </div>
                        <span style={{fontSize: '1.6rem', fontWeight: 800}}>ProofdIn</span>
                    </a>

                    {/* Nav Actions */}
                    <div style={{display:'flex', gap:'0.8rem', alignItems:'center'}}>
                        {user ? (
                            <>
                                {user.role === 'recruiter' && (
                                    <button 
                                        className="btn" 
                                        style={{background:'rgba(255,255,255,0.2)', color:'white', border:'none'}}
                                        onClick={() => navigate('/dashboard')}
                                    >
                                        Dashboard
                                    </button>
                                )}
                                <div 
                                    style={{
                                        width: '40px', 
                                        height: '40px', 
                                        minWidth: '40px',  /* 🔥 Fixes Squashing */
                                        borderRadius: '50%', 
                                        background: 'white', 
                                        color: 'var(--primary)', 
                                        display: 'grid', 
                                        placeItems: 'center', 
                                        fontWeight: 'bold',
                                        cursor: 'pointer', /* 🔥 Makes it look clickable */
                                        flexShrink: 0      /* 🔥 Prevents shrinking */
                                    }}
                                    /* 🔥 Adds Navigation */
                                    onClick={() => navigate(user.role === 'recruiter' ? '/dashboard' : '/candidate-dashboard')}
                                >
                                    {(user.fullName || 'U')[0].toUpperCase()}
                                </div>
                                <button className="btn" style={{border:'1px solid rgba(255,255,255,0.5)', color:'white', background:'transparent'}} onClick={handleLogout}>Logout</button>
                            </>
                        ) : (
                            <button className="btn" style={{background:'white', color:'var(--primary)'}} onClick={() => navigate('/')}>Login</button>
                        )}
                    </div>
                </nav>
            </header>

            <main className="page">
                {/* Hero */}
                <section className="hero">
                    <h1>Find your next role</h1>
                    <p>Browse verified roles posted by recruiters. Filter by title, location, work style, and compensation to uncover the opportunities that fit you best.</p>
                </section>

                <div className="filters-shell">
                    {/* Filters Sidebar */}
                    <aside className="panel">
                        <h3><i className="fas fa-filter"></i> Filters</h3>
                        <div className="field">
                            <label>Search by Title or Skill</label>
                            <input 
                                className="input" 
                                placeholder="e.g. React, Product Manager" 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <button className="btn" style={{background:'var(--primary)', color:'white', width:'100%'}} onClick={handleSearch}>
                            Apply Filters
                        </button>
                    </aside>

                    {/* Job List */}
                    <section>
                        <h3 style={{marginBottom:'1rem', fontSize:'1.2rem'}}><i className="fas fa-briefcase"></i> Open Roles ({filteredJobs.length})</h3>
                        
                        <div className="jobs">
                            {filteredJobs.length === 0 ? (
                                <div className="empty panel">
                                    <i className="fas fa-search" style={{fontSize:'2rem', marginBottom:'1rem', color:'#ccc'}}></i>
                                    <p>No jobs found matching your criteria.</p>
                                </div>
                            ) : (
                                filteredJobs.map(job => (
                                    <div key={job._id} className="job-card" onClick={() => setSelectedJob(job)}>
                                        <div className="job-top">
                                            <div className="company">
                                                <div className="avatar">
                                                    {(job.recruiter?.orgName || 'C')[0].toUpperCase()}
                                                </div>
                                                <div className="meta">
                                                    <h4>{job.title}</h4>
                                                    <div className="subtitle">
                                                        {job.recruiter?.orgName || 'Hiring Company'} • 
                                                        <span style={{background:'#f0f0f0', padding:'2px 6px', borderRadius:'4px', marginLeft:'5px', fontSize:'0.8rem'}}>
                                                            {job.locationType}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Applied Badge */}
                                            {hasApplied(job) && (
                                                <span style={{background:'#d4edda', color:'#155724', padding:'4px 8px', borderRadius:'12px', fontSize:'0.75rem', fontWeight:'bold'}}>
                                                    <i className="fas fa-check"></i> Applied
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="short-desc">
                                            {(job.description || '').substring(0, 140)}...
                                        </div>
                                        
                                        <div className="tags">
                                            {(job.skills || []).slice(0, 4).map((s, i) => (
                                                <span key={i} className="tag">{s}</span>
                                            ))}
                                            {(job.skills || []).length > 4 && (
                                                <span className="tag" style={{background:'transparent', border:'none'}}>+{(job.skills.length - 4)} more</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </main>

            {/* Job Modal */}
            {selectedJob && (
                <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="company">
                                <div className="avatar" style={{width:60, height:60, fontSize:'1.5rem'}}>
                                    {(selectedJob.recruiter?.orgName || 'C')[0].toUpperCase()}
                                </div>
                                <div className="meta">
                                    <h2 style={{fontSize:'1.5rem', margin:0}}>{selectedJob.title}</h2>
                                    <div className="subtitle" style={{fontSize:'1rem'}}>{selectedJob.recruiter?.orgName || 'Hiring Company'}</div>
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setSelectedJob(null)}><i className="fas fa-times"></i></button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="info-grid">
                                <div className="info-item">
                                    <div className="info-label">Job Type</div>
                                    <div className="info-value">{selectedJob.jobType}</div>
                                </div>
                                <div className="info-item">
                                    <div className="info-label">Location</div>
                                    <div className="info-value">{selectedJob.location}</div>
                                </div>
                                <div className="info-item">
                                    <div className="info-label">Salary</div>
                                    <div className="info-value">
                                        {selectedJob.salary?.min ? `$${selectedJob.salary.min.toLocaleString()} - $${selectedJob.salary.max.toLocaleString()}` : 'Not Disclosed'}
                                    </div>
                                </div>
                                <div className="info-item">
                                    <div className="info-label">Experience</div>
                                    <div className="info-value">{selectedJob.experienceLevel}</div>
                                </div>
                            </div>

                            <h3 style={{marginBottom:'0.5rem', display:'flex', alignItems:'center', gap:'8px'}}>
                                <i className="fas fa-align-left" style={{color:'var(--primary)'}}></i> Description
                            </h3>
                            <div style={{whiteSpace:'pre-wrap', color:'#555', marginBottom:'2rem', lineHeight:'1.6'}}>
                                {selectedJob.description}
                            </div>

                            {selectedJob.responsibilities && (
                                <>
                                    <h3 style={{marginBottom:'0.5rem', display:'flex', alignItems:'center', gap:'8px'}}>
                                        <i className="fas fa-list-check" style={{color:'var(--primary)'}}></i> Responsibilities
                                    </h3>
                                    <div style={{whiteSpace:'pre-wrap', color:'#555', marginBottom:'2rem', lineHeight:'1.6'}}>
                                        {selectedJob.responsibilities}
                                    </div>
                                </>
                            )}

                            <h3 style={{marginBottom:'0.5rem', display:'flex', alignItems:'center', gap:'8px'}}>
                                <i className="fas fa-tools" style={{color:'var(--primary)'}}></i> Skills
                            </h3>
                            <div className="tags" style={{marginBottom:'2rem'}}>
                                {(selectedJob.skills || []).map((s, i) => <span key={i} className="tag">{s}</span>)}
                            </div>

                            {/* DYNAMIC ACTION BUTTON */}
                            <div className="job-actions">
                                {hasApplied(selectedJob) ? (
                                    <button className="btn" style={{background:'#28a745', color:'white', padding:'0.8rem 2rem', fontSize:'1.1rem', cursor:'default'}} disabled>
                                        <i className="fas fa-check"></i> Application Sent
                                    </button>
                                ) : (
                                    <button 
                                        className="btn" 
                                        style={{background:'var(--primary)', color:'white', padding:'0.8rem 2rem', fontSize:'1.1rem'}}
                                        onClick={() => handleApply(selectedJob._id)}
                                    >
                                        Apply Now
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobPortal;