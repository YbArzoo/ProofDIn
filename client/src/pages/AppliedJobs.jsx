import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../index.css'; 

const AppliedJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [user, setUser] = useState({ name: 'Candidate', role: 'Candidate', avatar: 'C' });

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!token) return navigate('/');
        
        if (userStr) {
            const u = JSON.parse(userStr);
            setUser({ ...u, avatar: (u.fullName || 'C')[0].toUpperCase() });
        }

        fetchAppliedJobs(token);
    }, []);

    const fetchAppliedJobs = async (token) => {
        try {
            const res = await axios.get('http://localhost:5000/api/jobs/applied', {
                headers: { 'x-auth-token': token }
            });
            setJobs(res.data);
        } catch (err) {
            console.error("Error fetching applied jobs", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => { localStorage.clear(); navigate('/'); };

    return (
        <div>
            {/* SIDEBAR (Same as Dashboard) */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon"></div>
                    <div className="sidebar-logo-text">ProofdIn</div>
                </div>
                <ul className="sidebar-menu">
                    <li><Link to="/candidate-dashboard"><i className="fas fa-tachometer-alt"></i> Dashboard</Link></li>
                    <li><Link to="/jobs"><i className="fas fa-briefcase"></i> Job Portal</Link></li>
                    
                    {/* ACTIVE TAB */}
                    <li className="active"><Link to="/applied-jobs" style={{color: 'var(--primary)'}}><i className="fas fa-check-circle"></i> Applied Jobs</Link></li>
                    
                    <li><a href="/candidate-dashboard#tailored-resume"><i className="fas fa-file-pdf"></i> Tailored Resumes</a></li>
                    <li><Link to="/skills"><i className="fas fa-th-large"></i> Skills Grid</Link></li>
                </ul>
            </aside>

            {/* HEADER */}
            <header className="dashboard-header">
                <nav className="dashboard-nav">
                    <div className="user-menu">
                        <div className="avatar">{user.avatar}</div>
                        <div className="user-info-text">
                            <div className="name">{user.fullName || user.name}</div>
                            <div className="role">Candidate</div>
                        </div>
                        <button onClick={handleLogout} className="btn btn-primary" style={{ marginLeft: '10px' }}>Logout</button>
                    </div>
                </nav>
            </header>

            {/* MAIN CONTENT */}
            <div className="dashboard-container" style={{ marginTop: 0 }}>
                <div className="section-card">
                    <div className="section-header">
                        <h2>My Applications</h2>
                    </div>
                    <p className="section-subtitle">Track the status of your job applications.</p>

                    {loading ? <p>Loading...</p> : (
                        <div className="jobs-list">
                            {jobs.length === 0 ? (
                                <div style={{textAlign:'center', padding:'3rem', color:'#666'}}>
                                    <i className="fas fa-folder-open" style={{fontSize:'3rem', marginBottom:'1rem', color:'#ddd'}}></i>
                                    <p>You haven't applied to any jobs yet.</p>
                                    <Link to="/jobs" className="btn btn-primary" style={{marginTop:'1rem'}}>Browse Jobs</Link>
                                </div>
                            ) : (
                                <table style={{width:'100%', borderCollapse:'collapse'}}>
                                    <thead>
                                        <tr style={{textAlign:'left', borderBottom:'2px solid #f0f0f0', color:'#666'}}>
                                            <th style={{padding:'1rem'}}>Job Title</th>
                                            <th style={{padding:'1rem'}}>Company</th>
                                            <th style={{padding:'1rem'}}>Location</th>
                                            <th style={{padding:'1rem'}}>Date Applied</th>
                                            <th style={{padding:'1rem'}}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jobs.map(job => (
                                            <tr key={job._id} style={{borderBottom:'1px solid #f0f0f0'}}>
                                                <td style={{padding:'1rem', fontWeight:'600'}}>{job.title}</td>
                                                <td style={{padding:'1rem'}}>{job.company}</td>
                                                <td style={{padding:'1rem'}}>{job.locationType}</td>
                                                <td style={{padding:'1rem'}}>
                                                    {new Date(job.myAppliedDate).toLocaleDateString()}
                                                </td>
                                                <td style={{padding:'1rem'}}>
                                                    {/* DYNAMIC STATUS BADGE */}
                                                    <span style={{
                                                        background: 
                                                            job.myStatus === 'Selected' ? '#d4edda' : 
                                                            job.myStatus === 'Rejected' ? '#f8d7da' : 
                                                            job.myStatus === 'Interviewing' ? '#fff3cd' : '#eef2ff',
                                                        color: 
                                                            job.myStatus === 'Selected' ? '#155724' : 
                                                            job.myStatus === 'Rejected' ? '#721c24' : 
                                                            job.myStatus === 'Interviewing' ? '#856404' : 'var(--primary)',
                                                        padding: '5px 12px', 
                                                        borderRadius: '15px', 
                                                        fontSize: '0.85rem', 
                                                        fontWeight: '600'
                                                    }}>
                                                        {job.myStatus || 'Applied'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppliedJobs;