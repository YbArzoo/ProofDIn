import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import '../styles/JobPortal.css'; // Reusing styles

const MyJobs = () => {
    const [user, setUser] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) setUser(storedUser);
        fetchMyJobs();
    }, []);

    const fetchMyJobs = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/jobs/myjobs', {
                headers: { 'x-auth-token': token }
            });
            setJobs(res.data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleDelete = async (e, jobId) => {
        e.stopPropagation(); // Prevent modal opening
        if(!confirm("Delete this job?")) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/jobs/${jobId}`, {
                headers: { 'x-auth-token': token }
            });
            setJobs(jobs.filter(j => j._id !== jobId)); // Remove from UI
        } catch (err) {
            alert("Failed to delete job.");
        }
    };

    const handleEdit = (e, jobId) => {
        e.stopPropagation();
        navigate(`/post-job?id=${jobId}`);
    };

    return (
        <Layout title="My Posted Jobs" user={user}>
            <div className="panel" style={{marginTop:'2rem'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
                    <h3>Manage Jobs</h3>
                    <button className="btn btn-primary" onClick={() => navigate('/post-job')}>
                        <i className="fas fa-plus"></i> Post New Job
                    </button>
                </div>

                {loading ? <p>Loading...</p> : (
                    <div className="jobs">
                        {jobs.length === 0 ? (
                            <div className="empty">You haven't posted any jobs yet.</div>
                        ) : (
                            jobs.map(job => (
                                <div key={job._id} className="job-card">
                                    <div className="job-top">
                                        <div className="company">
                                            <div className="avatar">
                                                {(user?.orgName || 'MY')[0].toUpperCase()}
                                            </div>
                                            <div className="meta">
                                                <h4>{job.title}</h4>
                                                <div className="subtitle">{user?.orgName || 'My Organization'} • {job.locationType}</div>
                                            </div>
                                        </div>
                                        <div style={{color:'#888', fontSize:'0.9rem'}}>
                                            {new Date(job.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    
                                    <div className="short-desc">{(job.description || '').substring(0, 120)}...</div>
                                    
                                    <div className="tags">
                                        {(job.skills || []).slice(0, 4).map((s, i) => <span key={i} className="tag">{s}</span>)}
                                    </div>

                                    <div className="job-actions">
                                        <button className="btn btn-soft" onClick={(e) => handleEdit(e, job._id)}>
                                            <i className="fas fa-edit"></i> Edit
                                        </button>
                                        <button className="btn btn-outline" style={{color:'var(--danger)', borderColor:'var(--danger)'}} onClick={(e) => handleDelete(e, job._id)}>
                                            <i className="fas fa-trash"></i> Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default MyJobs;