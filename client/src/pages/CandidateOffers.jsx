import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import CandidateSidebar from '../components/CandidateSidebar'; // ✅ IMPORT
import '../styles/CandidateProfile.css';

const CandidateOffers = () => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/shortlist/my-offers', {
                headers: { 'x-auth-token': token }
            });
            setOffers(res.data);
        } catch (err) {
            console.error("Error fetching offers", err);
        }
        setLoading(false);
    };

    const handleResponse = async (id, newStatus) => {
        const action = newStatus === 'interviewing' ? 'Accept' : 'Decline';
        if(!confirm(`Are you sure you want to ${action} this invitation?`)) return;
        
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/shortlist/respond/${id}`, 
                { status: newStatus },
                { headers: { 'x-auth-token': token } }
            );
            
            // Optimistic Update
            setOffers(prev => prev.map(offer => 
                offer._id === id ? { ...offer, status: newStatus } : offer
            ));
            
            alert(newStatus === 'interviewing' ? "Response sent! The recruiter has been notified." : "Offer declined.");
        } catch (err) {
            alert("Action failed. Please try again.");
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            emailed: { background: '#e3f2fd', color: '#1976d2', border: '1px solid #bbdefb' },
            interviewing: { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9' },
            offer: { background: '#fff3e0', color: '#ef6c00', border: '1px solid #ffe0b2' },
            rejected: { background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2' }
        };
        const labels = {
            emailed: 'New Inquiry',
            interviewing: 'Interviewing',
            offer: 'Official Offer',
            rejected: 'Declined'
        };
        return (
            <span style={{ 
                padding: '5px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600',
                ...styles[status] 
            }}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div style={{ display: 'flex', background: '#f8f9fa', minHeight: '100vh' }}>
            
            {/* ✅ REPLACED SIDEBAR */}
            <CandidateSidebar />

            {/* --- MAIN CONTENT --- */}
            {/* Use dashboard-container class or manual styles to push content right */}
            <div className="dashboard-container" style={{ marginTop: 0, padding: '2rem', flex: 1 }}>
                <header style={{ marginBottom: '2rem', background:'white', padding:'1.5rem', borderRadius:'10px', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ margin: 0, color: '#333' }}>Recruiter Inquiries & Offers</h2>
                    <p style={{ color: '#666', marginTop: '5px' }}>
                        Direct invitations from recruiters who found your profile via AI matching.
                    </p>
                </header>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Loading invitations...</div>
                ) : (
                    <div className="offers-grid" style={{ display: 'grid', gap: '1.5rem' }}>
                        {offers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '10px' }}>
                                <i className="fas fa-inbox" style={{ fontSize: '3rem', color: '#ddd', marginBottom: '1rem' }}></i>
                                <p>No new inquiries yet.</p>
                                <Link to="/jobs" className="btn btn-primary" style={{marginTop:'1rem', display:'inline-block'}}>Browse Jobs</Link>
                            </div>
                        ) : (
                            offers.map(offer => {
                                const displayTitle = (!offer.job?.title || offer.job?.title === 'Untitled Job') 
                                    ? 'Private Invitation' 
                                    : offer.job.title;

                                return (
                                    <div key={offer._id} style={{ 
                                        background: 'white', borderRadius: '12px', padding: '1.5rem',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: `5px solid ${offer.status === 'emailed' ? '#2196f3' : '#ddd'}`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                            
                                            {/* Left: Info */}
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.25rem', color: '#2c3e50' }}>
                                                    {displayTitle}
                                                </h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#7f8c8d', fontSize: '0.95rem' }}>
                                                    <span><i className="fas fa-building"></i> {offer.job?.company || 'Confidential'}</span>
                                                    <span><i className="fas fa-map-marker-alt"></i> {offer.job?.location || 'Remote'}</span>
                                                </div>
                                                
                                                <div style={{ marginTop: '1rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    {getStatusBadge(offer.status)}
                                                    <span style={{ fontSize: '0.85rem', color: '#aaa' }}>
                                                        From: {offer.recruiter?.firstName} {offer.recruiter?.lastName}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right: Actions */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '150px' }}>
                                                {offer.status === 'emailed' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleResponse(offer._id, 'interviewing')}
                                                            style={{
                                                                background: '#10b981', color: 'white', border: 'none', padding: '10px',
                                                                borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
                                                            }}
                                                        >
                                                            <i className="fas fa-check"></i> I'm Interested
                                                        </button>
                                                        <button 
                                                            onClick={() => handleResponse(offer._id, 'rejected')}
                                                            style={{
                                                                background: 'white', color: '#ef4444', border: '1px solid #ef4444', padding: '10px',
                                                                borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                                                            }}
                                                        >
                                                            Decline
                                                        </button>
                                                    </>
                                                )}
                                                
                                                {offer.status === 'interviewing' && (
                                                    <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                        <i className="fas fa-check-circle"></i> You accepted
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CandidateOffers;