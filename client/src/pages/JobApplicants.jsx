import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/JobPortal.css'; // Import JobPortal styles for consistency
import { Link } from 'react-router-dom';


const JobApplicants = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [applicants, setApplicants] = useState([]);
    const [jobTitle, setJobTitle] = useState('Job');
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        const fetchApplicants = async () => {
            try {
                const token = localStorage.getItem('token');
                // Get Job Title
                const jobRes = await axios.get(`/api/jobs/${id}`, { headers: { 'x-auth-token': token } });
                setJobTitle(jobRes.data.title);

                // Get Applicants
                const res = await axios.get(`/api/jobs/${id}/applicants`, { headers: { 'x-auth-token': token } });
                
                // Add an 'isShortlisted' flag (optional, if you want to check backend status later)
                // For now, we default to false unless we fetch that status separately
                setApplicants(res.data.map(app => ({...app, isShortlisted: false})));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchApplicants();
    }, [id]);

    // --- NEW SHORTLIST FUNCTION ---
    const handleShortlist = async (candidateId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/shortlist/add', 
                { 
                    candidateId: candidateId, 
                    jobId: id, // The current job ID
                    status: 'saved' 
                },
                { headers: { 'x-auth-token': token } }
            );

            alert("Candidate Shortlisted!");
            
            // Update UI to show "Shortlisted" state
            setApplicants(prev => prev.map(app => 
                app.candidateId === candidateId ? { ...app, isShortlisted: true } : app
            ));

        } catch (err) {
            alert(err.response?.data?.message || "Failed to shortlist");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Selected': return { bg: '#d4edda', color: '#155724' };
            case 'Rejected': return { bg: '#f8d7da', color: '#721c24' };
            case 'Interviewing': return { bg: '#fff3cd', color: '#856404' };
            default: return { bg: '#eef2ff', color: 'var(--primary)' };
        }
    };

    const getMatchColor = (score) => {
        if (score >= 80) return { bg: '#d4edda', color: '#155724' };
        if (score >= 50) return { bg: '#fff3cd', color: '#856404' };
        return { bg: '#f8d7da', color: '#721c24' };
    };

    return (
        <Layout title="Review Applicants" user={user}>
            <main className="page-content" style={{ marginTop: '2rem' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <button onClick={() => navigate('/my-jobs')} className="btn btn-soft" style={{ color: 'var(--secondary)', paddingLeft: '1rem', paddingRight: '1rem' }}>
                        <i className="fas fa-arrow-left"></i> Back to Jobs
                    </button>
                    <h2 style={{ marginTop: '1rem', fontSize: '1.8rem', color: 'var(--dark)' }}>
                        Applicants for: <span style={{ color: 'var(--primary)' }}>{jobTitle}</span>
                    </h2>
                    <p style={{ color: 'var(--secondary)', fontSize: '1rem' }}>
                        {applicants.length} {applicants.length === 1 ? 'candidate' : 'candidates'} found
                    </p>
                </div>

                {loading ? <p>Loading...</p> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                        {applicants.length === 0 && (
                            <div className="empty-state panel">
                                <i className="fas fa-users-slash"></i>
                                <h3>No applicants yet.</h3>
                                <p>Candidates who apply will appear here.</p>
                            </div>
                        )}
                        {applicants.map(app => {
                            const statusStyle = getStatusColor(app.status);
                            const matchStyle = getMatchColor(app.matchScore);
                            return (
                                <div key={app._id} className="panel job-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <div className="avatar" style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                                                {app.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--dark)' }}>{app.name}</h3>
                                                <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', margin: '0.2rem 0' }}>{app.headline}</p>
                                            </div>
                                        </div>
                                        <span style={{
                                            background: matchStyle.bg, color: matchStyle.color,
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600'
                                        }}>
                                            {app.matchScore}% Match
                                        </span>
                                    </div>

                                    {/* Details */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--secondary)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <i className="fas fa-briefcase"></i>
                                            <span>Experience: <strong>{app.experience}</strong></span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <i className="fas fa-map-marker-alt"></i>
                                            <span>Location: <strong>{app.location}</strong></span>
                                        </div>
                                    </div>

                                    {/* Skills */}
                                    <div className="tags" style={{ margin: '0.5rem 0' }}>
                                        {app.skills.slice(0, 5).map((s, i) => (
                                            <span key={i} className="tag">{s}</span>
                                        ))}
                                    </div>

                                    {/* Footer */}
                                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{
                                            background: statusStyle.bg, color: statusStyle.color,
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600'
                                        }}>
                                            {app.status}
                                        </span>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            
                                            {/* ✅ THE SHORTLIST BUTTON */}
                                            {app.isShortlisted ? (
                                                <button className="btn" style={{background:'#d4edda', color:'#155724', cursor:'default'}} disabled>
                                                    <i className="fas fa-check"></i> Shortlisted
                                                </button>
                                            ) : (
                                                <button 
                                                    className="btn btn-soft" 
                                                    onClick={() => handleShortlist(app.candidateId)}
                                                >
                                                    Shortlist
                                                </button>
                                            )}

                                            <Link 
                                                to={`/candidate-view/${app.candidateId}`} // ✅ FIXED: Use 'app'
                                                target="_blank" 
                                                className="btn btn-primary"
                                                style={{ textDecoration: 'none' }} 
                                            >
                                                View Profile
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </Layout>
    );
};

export default JobApplicants;