import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// Removed the bad "../styles/JobPortal.css" import

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
            // Get jobs (public route)
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

    // --- NEW APPLY FUNCTION ---
    const handleApply = async (jobId) => {
        if (!user) return navigate('/'); // Force login

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`http://localhost:5000/api/jobs/${jobId}/apply`, {}, {
                headers: { 'x-auth-token': token }
            });

            if (res.status === 200) {
                alert("✅ Application Successful!");

                // Update UI instantly
                const updatedJobs = jobs.map(job => {
                    if (job._id === jobId) {
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

    // Helper to check status
    const hasApplied = (job) => {
    if (!user || !job.applicants) return false;
    const userId = user._id || user.id;
    
    // Check if ANY applicant in the array matches the current user
    // We handle both old schema (array of IDs) and new schema (array of objects) just in case
    return job.applicants.some(app => {
        if (typeof app === 'string') return app === userId; // Old schema fallback
        return app.candidate === userId; // New schema
    });
};

    return (
        <div style={{minHeight:'100vh', background:'#f5f7fb'}}>
            <header className="dashboard-header" style={{
                background: '#fff', boxShadow: '0 1px 0px rgba(0, 0, 0, 0.05)', position: 'sticky', top: 0, zIndex: 100
            }}>
                <nav style={{maxWidth: '1200px', margin: '0 auto', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} style={{display:'flex', alignItems:'center', gap:'10px', textDecoration:'none'}}>
                        <div style={{width: '42px', height: '42px', borderRadius: '8px', background: 'var(--primary)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '1.2rem'}}>
                            <i className="fas fa-bolt"></i>
                        </div>
                        <span style={{fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)'}}>ProofdIn</span>
                    </a>
                    <div style={{display:'flex', gap:'0.8rem', alignItems:'center'}}>
                        {user ? (
                            <>
                                <button className="btn" style={{background:'var(--primary-light)', color:'var(--primary)'}} onClick={() => navigate('/candidate-dashboard')}>Dashboard</button>
                                <div style={{width:40, height:40, borderRadius:'50%', background:'var(--primary)', color:'white', display:'grid', placeItems:'center', fontWeight:'bold'}}>{(user.fullName || 'C')[0].toUpperCase()}</div>
                                <button className="btn" style={{border:'1px solid #ddd'}} onClick={handleLogout}>Logout</button>
                            </>
                        ) : (
                            <button className="btn" style={{background:'var(--primary)', color:'white'}} onClick={() => navigate('/')}>Login</button>
                        )}
                    </div>
                </nav>
            </header>

            <main className="page" style={{padding:'2rem', maxWidth:'1200px', margin:'0 auto'}}>
                <section className="hero" style={{marginBottom:'2rem', textAlign:'center'}}>
                    <h1 style={{fontSize:'2.5rem', color:'#333'}}>Find your next role</h1>
                    <p style={{color:'#666'}}>Browse verified roles posted by recruiters.</p>
                </section>

                <div className="filters-shell" style={{display:'grid', gridTemplateColumns:'250px 1fr', gap:'2rem'}}>
                    <aside className="panel" style={{background:'white', padding:'1.5rem', borderRadius:'12px', height:'fit-content'}}>
                        <h3 style={{marginBottom:'1rem'}}><i className="fas fa-filter"></i> Filters</h3>
                        <div className="field" style={{marginBottom:'1rem'}}>
                            <input className="input" placeholder="e.g. React, Manager" value={search} onChange={(e) => setSearch(e.target.value)} style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'6px'}}/>
                        </div>
                        <button className="btn" style={{background:'var(--primary)', color:'white', width:'100%', padding:'10px', border:'none', borderRadius:'6px'}} onClick={handleSearch}>Apply Filters</button>
                    </aside>

                    <section>
                        <h3 style={{marginBottom:'1rem', fontSize:'1.2rem'}}><i className="fas fa-briefcase"></i> Open Roles ({filteredJobs.length})</h3>
                        <div className="jobs" style={{display:'grid', gap:'1.5rem'}}>
                            {filteredJobs.length === 0 ? (
                                <div className="empty panel" style={{textAlign:'center', padding:'2rem', background:'white', borderRadius:'12px'}}><p>No jobs found.</p></div>
                            ) : (
                                filteredJobs.map(job => (
                                    <div key={job._id} className="job-card" onClick={() => setSelectedJob(job)} style={{background:'white', padding:'1.5rem', borderRadius:'12px', cursor:'pointer', border:'1px solid #eee', transition:'transform 0.2s'}}>
                                        <div className="job-top" style={{display:'flex', justifyContent:'space-between'}}>
                                            <div>
                                                <h4 style={{fontSize:'1.2rem', margin:0}}>{job.title}</h4>
                                                <div style={{color:'#666', fontSize:'0.9rem', marginTop:'5px'}}>{job.recruiter?.orgName || 'Company'} • {job.locationType}</div>
                                            </div>
                                            {hasApplied(job) && <span style={{background:'#d4edda', color:'#155724', padding:'5px 10px', borderRadius:'20px', fontSize:'0.8rem', height:'fit-content'}}>Applied</span>}
                                        </div>
                                        <div className="tags" style={{marginTop:'1rem', display:'flex', gap:'8px', flexWrap:'wrap'}}>
                                            {(job.skills || []).slice(0, 4).map((s, i) => <span key={i} className="tag" style={{background:'#f0f2f5', padding:'4px 8px', borderRadius:'4px', fontSize:'0.8rem'}}>{s}</span>)}
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
                <div className="modal-overlay" onClick={() => setSelectedJob(null)} style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:2000}}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{background:'white', width:'90%', maxWidth:'700px', borderRadius:'12px', overflow:'hidden', maxHeight:'90vh', display:'flex', flexDirection:'column'}}>
                        <div className="modal-header" style={{padding:'1.5rem', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <div><h2 style={{fontSize:'1.5rem', margin:0}}>{selectedJob.title}</h2><div style={{color:'#666'}}>{selectedJob.recruiter?.orgName}</div></div>
                            <button onClick={() => setSelectedJob(null)} style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer'}}>&times;</button>
                        </div>
                        <div className="modal-body" style={{padding:'2rem', overflowY:'auto'}}>
                            <div className="info-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'2rem', background:'#f9f9f9', padding:'1rem', borderRadius:'8px'}}>
                                <div><strong>Job Type:</strong> {selectedJob.jobType}</div>
                                <div><strong>Location:</strong> {selectedJob.location}</div>
                                <div><strong>Salary:</strong> {selectedJob.salary?.min ? `$${selectedJob.salary.min} - $${selectedJob.salary.max}` : 'Not Disclosed'}</div>
                            </div>
                            <h3>Description</h3><p style={{whiteSpace:'pre-wrap', color:'#555', marginBottom:'2rem'}}>{selectedJob.description}</p>
                            <h3>Skills</h3><div style={{display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'2rem'}}>{(selectedJob.skills || []).map((s, i) => <span key={i} style={{background:'#eef2ff', color:'var(--primary)', padding:'5px 10px', borderRadius:'4px'}}>{s}</span>)}</div>
                            <div className="job-actions" style={{textAlign:'right'}}>
                                {hasApplied(selectedJob) ? (
                                    <button className="btn" style={{background:'#28a745', color:'white', padding:'12px 24px', border:'none', borderRadius:'6px', fontSize:'1rem', cursor:'default'}} disabled><i className="fas fa-check"></i> Applied</button>
                                ) : (
                                    <button className="btn" style={{background:'var(--primary)', color:'white', padding:'12px 24px', border:'none', borderRadius:'6px', fontSize:'1rem', cursor:'pointer'}} onClick={() => handleApply(selectedJob._id)}>Apply Now</button>
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