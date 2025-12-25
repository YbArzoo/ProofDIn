import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/Recruiter.css'; 

const Shortlist = () => {
    const [user, setUser] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Editing State
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');

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

    const updateStatus = async (id, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            setItems(prev => prev.map(item => item._id === id ? { ...item, status: newStatus } : item));
            
            await axios.put(`http://localhost:5000/api/shortlist/${id}`, 
                { status: newStatus },
                { headers: { 'x-auth-token': token } }
            );
        } catch (err) {
            alert("Update failed");
            fetchShortlist(); 
        }
    };

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

    // ✅ FIX: Pass shortlistId to prevent duplicates
    const contactCandidate = async (candidateId, shortlistId, currentJobId) => {
        const message = prompt("Enter message for candidate:", "We are interested in your profile.");
        if (!message) return;

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/shortlist/contact',
                { 
                    candidateId, 
                    message, 
                    jobId: currentJobId, // Send Job ID
                    shortlistId: shortlistId // ✅ Send Shortlist ID (Key fix!)
                },
                { headers: { 'x-auth-token': token } }
            );

            if (res.status === 200) {
                updateStatus(shortlistId, 'emailed');
                
                if (res.data.previewUrl) {
                    if(confirm("Email Sent! View simulated email?")) window.open(res.data.previewUrl, '_blank');
                }
            }
        } catch (err) {
            alert("Failed to send email: " + (err.response?.data?.message || err.message));
        }
    };

    // --- Label Editing Functions ---
    const startEditing = (item) => {
        setEditingId(item._id);
        setEditValue(item.customLabel || item.job?.title || 'General Shortlist');
    };

    const saveLabel = async (id) => {
        if (!editValue.trim()) return;
        try {
            const token = localStorage.getItem('token');
            // Optimistic UI update
            setItems(prev => prev.map(item => item._id === id ? { ...item, customLabel: editValue } : item));
            setEditingId(null);

            await axios.put(`http://localhost:5000/api/shortlist/${id}`, 
                { customLabel: editValue },
                { headers: { 'x-auth-token': token } }
            );
        } catch (err) {
            alert("Failed to rename");
        }
    };

    const getItemsByStatus = (status) => items.filter(i => (i.status || 'saved') === status);

    const KanbanColumn = ({ title, status, colorClass }) => (
        <div className={`kanban-column ${colorClass}`}>
            <div className="column-header">
                <span>{title}</span>
                <span className="count">{getItemsByStatus(status).length}</span>
            </div>
            
            <div className="cards-container">
                {getItemsByStatus(status).map(item => {
                    const candidateName = item.candidate?.user?.fullName || 'Candidate';
                    const headline = item.candidate?.headline || 'No headline';
                    // Display Priority: Custom Label > Job Title > Default
                    const displayLabel = item.customLabel || item.job?.title || 'General Shortlist';

                    return (
                        <div key={item._id} className="kanban-card">
                            <div style={{fontWeight:'bold', fontSize:'1rem', color: '#333'}}>
                                {candidateName}
                            </div>
                            <div style={{fontSize:'0.85rem', color:'gray', marginBottom:'0.5rem'}}>
                                {headline}
                            </div>
                            
                            {/* ✅ EDITABLE LABEL SECTION */}
                            <div style={{marginBottom:'0.5rem'}}>
                                {editingId === item._id ? (
                                    <div style={{display:'flex', gap:'5px'}}>
                                        <input 
                                            type="text" 
                                            value={editValue} 
                                            onChange={(e) => setEditValue(e.target.value)}
                                            style={{fontSize:'0.75rem', padding:'2px', width:'100%'}}
                                            autoFocus
                                        />
                                        <button onClick={() => saveLabel(item._id)} style={{border:'none', background:'none', color:'green', cursor:'pointer'}}><i className="fas fa-check"></i></button>
                                        <button onClick={() => setEditingId(null)} style={{border:'none', background:'none', color:'red', cursor:'pointer'}}><i className="fas fa-times"></i></button>
                                    </div>
                                ) : (
                                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                        <div style={{fontSize:'0.75rem', background:'#f0f0f0', padding:'2px 6px', borderRadius:'4px', display:'inline-block'}}>
                                            <i className="fas fa-briefcase"></i> {displayLabel}
                                        </div>
                                        <i 
                                            className="fas fa-pencil-alt" 
                                            style={{fontSize:'0.7rem', color:'#aaa', cursor:'pointer'}} 
                                            onClick={() => startEditing(item)}
                                            title="Rename Label"
                                        ></i>
                                    </div>
                                )}
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
                                    {/* ✅ FIX: Pass all required IDs */}
                                    <button 
                                        className="move-btn" 
                                        title="Send Email"
                                        onClick={() => contactCandidate(item.candidate?._id, item._id, item.job?._id)} 
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
            
            <div className="kanban-board" style={{marginTop:'2rem', overflowX: 'auto'}}>
                <KanbanColumn title="Saved" status="saved" colorClass="col-saved" />
                <KanbanColumn title="Emailed" status="emailed" colorClass="col-emailed" />
                <KanbanColumn title="Interviewing" status="interviewing" colorClass="col-interviewing" />
                <KanbanColumn title="Offer Sent" status="offer" colorClass="col-offer" />
                <KanbanColumn title="Rejected" status="rejected" colorClass="col-rejected" />
            </div>
        </Layout>
    );
};

export default Shortlist;