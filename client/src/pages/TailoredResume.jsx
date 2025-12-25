import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import html2pdf from 'html2pdf.js';
import CandidateSidebar from '../components/CandidateSidebar'; // ✅ IMPORT
import '../styles/CandidateProfile.css'; 

const TailoredResume = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState({ name: 'Candidate', role: 'Candidate', avatar: 'C' });
    const [resumes, setResumes] = useState([]);
    
    // Resume States
    const [jdText, setJdText] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Preview & Edit
    const [generatedResume, setGeneratedResume] = useState(null);
    const [currentResumeMeta, setCurrentResumeMeta] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    
    // Renaming
    const [editingResumeId, setEditingResumeId] = useState(null);
    const [editedTitle, setEditedTitle] = useState('');

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (!token) return navigate('/');
        
        if (userStr) {
            const u = JSON.parse(userStr);
            setUser({ 
                name: u.fullName || 'Candidate', 
                role: 'Candidate',
                avatar: (u.fullName || 'C')[0].toUpperCase() 
            });
        }

        fetchHistory(token);
    }, []);

    const fetchHistory = async (token) => {
        try {
            const res = await fetch('/api/candidate/resumes', {
                headers: { 'x-auth-token': token }
            });
            const data = await res.json();
            if (res.ok) setResumes(data);
        } catch (err) { console.error(err); }
    };

    const handleGenerate = async () => {
        if (!jdText.trim()) return alert("Paste a Job Description first.");
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/candidate/generate-resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ jobDescriptionText: jdText })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            const htmlContent = marked.parse(data.resumeContent);
            setGeneratedResume(htmlContent);
            setCurrentResumeMeta({
                id: data.id, 
                title: data.jobTitle || 'Tailored_Resume',
                company: data.companyName || 'Target Company'
            });
            fetchHistory(token);
            setShowPreviewModal(true); // Auto-open preview
        } catch (err) { alert(err.message); } 
        finally { setLoading(false); }
    };

    const loadResume = (resume) => {
        setGeneratedResume(marked.parse(resume.content));
        setCurrentResumeMeta({
            id: resume._id,
            title: resume.jobTitle || 'Tailored_Resume',
            company: resume.companyName || 'Target Company'
        });
        setShowPreviewModal(true);
    };

    const handleDownload = () => {
        const element = document.getElementById('resume-print-area');
        if (!element) return;
        const filename = currentResumeMeta?.title.endsWith('.pdf') ? currentResumeMeta.title : `${currentResumeMeta?.title}.pdf`;
        const opt = {
            margin: [0.5, 0.5],
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        element.style.display = 'block';
        html2pdf().set(opt).from(element).save().then(() => { element.style.display = 'none'; });
    };

    // Rename
    const handleSaveResume = async (resumeId) => {
        if (!editedTitle.trim()) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/candidate/resumes/${resumeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ jobTitle: editedTitle })
            });
            setEditingResumeId(null);
            fetchHistory(token);
        } catch (err) { alert("Update failed"); }
    };

    // Delete
    const handleDeleteResume = async (resumeId) => {
        if (!confirm("Delete this resume?")) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/candidate/resumes/${resumeId}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            fetchHistory(token);
        } catch (err) { alert("Delete failed"); }
    };

    const handleLogout = () => { localStorage.clear(); navigate('/'); };

    return (
        <div>
            {/* ✅ REPLACED SIDEBAR */}
            <CandidateSidebar />

            {/* HEADER */}
            <header className="dashboard-header">
                <nav className="dashboard-nav">
                    <div className="user-menu">
                        <div className="user-profile">
                            <div className="avatar">{user.avatar}</div>
                            <div>
                                <div style={{ fontWeight: 600 }}>{user.name}</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--secondary)' }}>Candidate</div>
                            </div>
                        </div>
                        <button className="btn btn-primary" onClick={handleLogout} style={{ width: 'auto', display: 'inline-flex' }}>
                            <i className="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </nav>
            </header>

            {/* MAIN CONTENT */}
            <div className="dashboard-container" style={{ marginTop: 0 }}>
                
                {/* GENERATOR */}
                <div className="section-card">
                    <div className="section-header">
                        <h2><i className="fas fa-magic" style={{color:'var(--primary)', marginRight:'10px'}}></i>Create New Resume</h2>
                    </div>
                    <p className="section-subtitle">Paste a job description below to generate a resume tailored specifically for that role.</p>
                    
                    <div className="resume-tailor-input">
                        <textarea 
                            className="custom-textarea" 
                            placeholder="Paste Job Description here..."
                            value={jdText}
                            onChange={(e) => setJdText(e.target.value)}
                            style={{minHeight: '150px', width: '100%', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px'}}
                        />
                        <button 
                            className="btn btn-primary" 
                            style={{marginTop:'1rem'}}
                            onClick={handleGenerate} 
                            disabled={loading}
                        >
                            {loading ? <><i className="fas fa-spinner fa-spin"></i> Generating...</> : <><i className="fas fa-magic"></i> Generate New Resume</>}
                        </button>
                    </div>
                </div>

                {/* FULL HISTORY LIST */}
                <div className="section-card">
                    <div className="section-header">
                        <h2>My Tailored Resumes ({resumes.length})</h2>
                    </div>
                    
                    {resumes.length === 0 ? (
                        <p style={{color:'#666', textAlign:'center', padding:'2rem'}}>No resumes generated yet.</p>
                    ) : (
                        <div className="history-list" style={{display:'grid', gap:'1rem'}}>
                            {resumes.map(resume => (
                                <div key={resume._id} style={{
                                    display:'flex', justifyContent:'space-between', alignItems:'center',
                                    padding:'1.5rem', background:'white', border:'1px solid #eee', borderRadius:'12px',
                                    boxShadow:'0 2px 5px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{flex: 1}}>
                                        {editingResumeId === resume._id ? (
                                            <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                                                <input 
                                                    value={editedTitle} 
                                                    onChange={(e) => setEditedTitle(e.target.value)}
                                                    style={{padding:'5px', fontSize:'1rem', width:'300px'}}
                                                />
                                                <button onClick={() => handleSaveResume(resume._id)} className="btn btn-sm btn-success"><i className="fas fa-check"></i></button>
                                                <button onClick={() => setEditingResumeId(null)} className="btn btn-sm btn-danger"><i className="fas fa-times"></i></button>
                                            </div>
                                        ) : (
                                            <>
                                                <h4 style={{margin:0, fontSize:'1.1rem', cursor:'pointer', color:'var(--primary)'}} onClick={() => loadResume(resume)}>{resume.jobTitle}</h4>
                                                <div style={{color:'#666', fontSize:'0.9rem', marginTop:'0.3rem'}}>
                                                    <i className="fas fa-building"></i> {resume.companyName} • {new Date(resume.createdAt).toLocaleDateString()}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    
                                    <div style={{display:'flex', gap:'10px'}}>
                                        <button className="btn btn-secondary" onClick={() => loadResume(resume)}>
                                            <i className="fas fa-eye"></i> View
                                        </button>
                                        <button className="btn btn-outline" onClick={() => { setEditingResumeId(resume._id); setEditedTitle(resume.jobTitle); }}>
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        <button className="btn btn-danger" onClick={() => handleDeleteResume(resume._id)}>
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden Print Area */}
            <div id="resume-print-area" style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: generatedResume }} />

            {/* Modal */}
            {showPreviewModal && generatedResume && (
                <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                            <h3>Resume Preview</h3>
                            <button className="close-modal" onClick={() => setShowPreviewModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body" dangerouslySetInnerHTML={{ __html: generatedResume }} />
                        <div style={{ padding: '1.5rem', borderTop: '1px solid #eee', textAlign: 'right' }}>
                            <button className="btn btn-primary" onClick={handleDownload}>Download PDF</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TailoredResume;