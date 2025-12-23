import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/Recruiter.css'; // Reusing styles

const Shortlist = () => {
    const [user, setUser] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) setUser(storedUser);
        fetchShortlist();
    }, []);

    const fetchShortlist = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/shortlist', {
                headers: { 'x-auth-token': token }
            });
            setItems(res.data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    // --- 1. UPDATE STATUS (Move Card) ---
    const updateStatus = async (id, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            // Optimistic UI Update
            setItems(prev => prev.map(item => item._id === id ? { ...item, status: newStatus } : item));
            
            await axios.put(`http://localhost:5000/api/shortlist/${id}`, 
                { status: newStatus },
                { headers: { 'x-auth-token': token } }
            );
        } catch (err) {
            alert("Update failed");
            fetchShortlist(); // Revert
        }
    };

    // --- 2. DELETE ITEM ---
    const deleteItem = async (id) => {
        if(!confirm("Remove candidate from pipeline?")) return;
        try {
            const token = localStorage.getItem('token');
            setItems(prev => prev.filter(item => item._id !== id)); 
            
            await axios.delete(`http://localhost:5000/api/shortlist/${id}`, {
                headers: { 'x-auth-token': token }
            });
        } catch (err) {
            alert("Delete failed");
        }
    };

    // --- 3. CONTACT CANDIDATE (Restored Feature) ---
    // --- 3. CONTACT CANDIDATE (Fixed for Simulation) ---
    // --- 3. CONTACT CANDIDATE (Restored "Nice" Simulation) ---
    const contactCandidate = async (candidateId, shortlistId) => {
        const message = prompt("Enter message for candidate:", "We are interested in your profile.");
        if (!message) return;

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/shortlist/contact',
                { candidateId, message },
                { headers: { 'x-auth-token': token } }
            );

            // Move card to "Interviewing"
            if (res.status === 200) {
                updateStatus(shortlistId, 'interviewing');

                // 1. Check for Real Ethereal Link
                if (res.data.previewUrl) {
                    if(confirm("Email Sent! Status updated to 'Interviewing'.\n\nDo you want to view the simulated email in Ethereal?")) {
                        window.open(res.data.previewUrl, '_blank');
                    }
                } 
                // 2. Check for Offline HTML (The Fix!)
                else if (res.data.simulatedHtml) {
                    if(confirm("Email Simulated! Status updated to 'Interviewing'.\n(Network blocked real sending)\n\nDo you want to view the generated email preview?")) {
                        // Create a temporary page in the browser
                        const blob = new Blob([res.data.simulatedHtml], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                    }
                }
            }
        } catch (err) {
            alert("Failed to send email: " + (err.response?.data?.message || err.message));
        }
    };

    // Helper to filter items
    const getItemsByStatus = (status) => items.filter(i => (i.status || 'saved') === status);

    // In client/src/pages/Shortlist.jsx

    // In client/src/pages/Shortlist.jsx

    const KanbanColumn = ({ title, status, colorClass }) => (
        <div className={`kanban-column ${colorClass}`}>
            <div className="column-header">
                <span>{title}</span>
                <span className="count">{getItemsByStatus(status).length}</span>
            </div>
            
            <div className="cards-container">
                {getItemsByStatus(status).map(item => {
                    // SAFE DATA ACCESS
                    const candidateName = item.candidate?.user?.fullName || item.candidate?.user?.email || 'Candidate';
                    const headline = item.candidate?.headline || 'No headline';
                    const jobTitle = item.job?.title || 'General Shortlist';

                    return (
                        <div key={item._id} className="kanban-card">
                            <div style={{fontWeight:'bold', fontSize:'1rem', color: '#333'}}>
                                {candidateName}
                            </div>
                            <div style={{fontSize:'0.85rem', color:'gray', marginBottom:'0.5rem'}}>
                                {headline}
                            </div>
                            
                            <div style={{fontSize:'0.75rem', background:'#f0f0f0', padding:'2px 6px', borderRadius:'4px', display:'inline-block', marginBottom:'0.5rem'}}>
                                <i className="fas fa-briefcase"></i> {jobTitle}
                            </div>
                            
                            <div className="card-actions">
                                <select 
                                    value={item.status || 'saved'} 
                                    onChange={(e) => updateStatus(item._id, e.target.value)}
                                    style={{padding:'2px', fontSize:'0.85rem'}}
                                >
                                    <option value="saved">Saved</option>
                                    <option value="emailed">Emailed</option>
                                    <option value="interviewing">Interview</option>
                                    <option value="offer">Offer</option>
                                    <option value="rejected">Reject</option>
                                </select>
                                
                                <div style={{display:'flex', gap:'10px'}}>
                                    <button 
                                        className="move-btn" 
                                        title="Send Email"
                                        onClick={() => contactCandidate(item.candidate?._id, item._id)} // Safe access
                                    >
                                        <i className="fas fa-envelope"></i>
                                    </button>
                                    
                                    <button 
                                        className="delete-btn" 
                                        title="Remove"
                                        onClick={() => deleteItem(item._id)}
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <Layout title="Pipeline" user={user}>
            {loading && <div style={{textAlign:'center', marginTop:'1rem'}}>Loading pipeline...</div>}
            
            {/* Added overflowX to allow scrolling if columns get too wide */}
            <div className="kanban-board" style={{marginTop:'2rem', overflowX: 'auto'}}>
                
                {/* 1. Saved Column */}
                <KanbanColumn title="Saved" status="saved" colorClass="col-saved" />

                {/* 2. NEW Emailed Column */}
                <KanbanColumn title="Emailed" status="emailed" colorClass="col-emailed" />

                {/* 3. Interviewing Column */}
                <KanbanColumn title="Interviewing" status="interviewing" colorClass="col-interviewing" />

                {/* 4. Offer Column */}
                <KanbanColumn title="Offer Sent" status="offer" colorClass="col-offer" />

                {/* 5. Rejected Column */}
                <KanbanColumn title="Rejected" status="rejected" colorClass="col-rejected" />
            </div>
        </Layout>
    );
};

export default Shortlist;