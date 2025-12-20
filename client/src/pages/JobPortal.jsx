import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/JobPortal.css'; 

const JobPortal = () => {
    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedJob, setSelectedJob] = useState(null);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) setUser(storedUser);
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            // Note: Ensure your backend allows public access to this route
            const res = await axios.get('http://localhost:5000/api/jobs'); 
            setJobs(res.data);
            setFilteredJobs(res.data);
        } catch (err) {
            console.error("Error loading jobs", err);
        }
    };

    const handleSearch = () => {
        const term = search.toLowerCase();
        const results = jobs.filter(job => 
            (job.title?.toLowerCase() || '').includes(term) || 
            (job.skills || []).some(s => s.toLowerCase().includes(term))
        );
        setFilteredJobs(results);
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <div style={{minHeight:'100vh', background:'#f5f7fb'}}>
            
            {/* --- HEADER (Restored to match HTML) --- */}
            <header className="dashboard-header" style={{
                background: '#fff', 
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)', 
                position: 'sticky', top: 0, zIndex: 100
            }}>
                <nav style={{
                    maxWidth: '1200px', margin: '0 auto', padding: '1rem 2rem', 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    {/* Logo */}
                    <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} style={{display:'flex', alignItems:'center', gap:'10px', textDecoration:'none'}}>
                        <div style={{
                            width: '42px', height: '42px', borderRadius: '8px', 
                            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', 
                            display: 'grid', placeItems: 'center', color: '#fff', fontSize: '1.2rem'
                        }}>
                            <i className="fas fa-bolt"></i>
                        </div>
                        <span style={{fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)'}}>ProofdIn</span>
                    </a>

                    {/* Nav Actions */}
                    <div style={{display:'flex', gap:'0.8rem', alignItems:'center'}}>
                        {user ? (
                            <>
                                {user.role === 'recruiter' && (
                                    <button 
                                        className="btn" 
                                        style={{background:'var(--primary-light)', color:'var(--primary)', border:'1px solid var(--primary)'}}
                                        onClick={() => navigate('/dashboard')}
                                    >
                                        Dashboard
                                    </button>
                                )}
                                <div style={{width:40, height:40, borderRadius:'50%', background:'var(--primary)', color:'white', display:'grid', placeItems:'center', fontWeight:'bold'}}>
                                    {user.fullName[0].toUpperCase()}
                                </div>
                                <button className="btn" style={{border:'1px solid #ddd'}} onClick={handleLogout}>Logout</button>
                            </>
                        ) : (
                            <button className="btn" style={{background:'var(--primary)', color:'white'}} onClick={() => navigate('/')}>Login</button>
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

                            <div className="job-actions">
                                <button className="btn" style={{background:'var(--primary)', color:'white', padding:'0.8rem 2rem', fontSize:'1.1rem'}}>
                                    Apply Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobPortal;