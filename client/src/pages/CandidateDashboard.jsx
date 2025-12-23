import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // 1. Import Link
import { marked } from 'marked';
import html2pdf from 'html2pdf.js';

const CandidateDashboard = () => {
    // 1. STATE
    const [user, setUser] = useState({ name: 'Candidate', role: 'Candidate', avatar: 'C' });
    const [resumes, setResumes] = useState([]);
    const [jdText, setJdText] = useState('');
    const [loading, setLoading] = useState(false);

    // Resume Generation State
    const [generatedResume, setGeneratedResume] = useState(null);
    const [currentResumeMeta, setCurrentResumeMeta] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // State for renaming/deleting resumes in history list
    const [editingResumeId, setEditingResumeId] = useState(null);
    const [editedTitle, setEditedTitle] = useState('');

    // 2. LOAD DATA ON STARTUP
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!token || !userStr) { window.location.href = '/'; return; }

        const userData = JSON.parse(userStr);
        setUser({
            name: userData.fullName || 'Candidate',
            role: 'Candidate',
            avatar: (userData.fullName || 'C').charAt(0).toUpperCase()
        });

        fetchResumeHistory(token);
    }, []);

    const fetchResumeHistory = async (token) => {
        try {
            const res = await fetch('http://localhost:5000/api/candidate/resumes', {
                headers: { 'x-auth-token': token }
            });
            const data = await res.json();
            if (res.ok) setResumes(data);
        } catch (err) { console.error(err); }
    };

    // 3. ACTIONS
    const handleGenerate = async () => {
        if (!jdText || jdText.length < 10) return alert("Please enter a valid Job Description.");
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/candidate/generate-resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ jobDescriptionText: jdText })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Generation failed');

            const htmlContent = marked.parse(data.resumeContent);
            setGeneratedResume(htmlContent);
            
            // STORE METADATA
            setCurrentResumeMeta({
                id: data.id, 
                title: data.jobTitle || 'Tailored_Resume',
                company: data.companyName || 'Target Company',
                date: 'Just now'
            });
            
            fetchResumeHistory(token);
            alert("✅ Resume Generated Successfully!");
        } catch (err) { alert(err.message); } finally { setLoading(false); }
    };

    const loadResume = (resume) => {
        setGeneratedResume(marked.parse(resume.content));
        // STORE METADATA
        setCurrentResumeMeta({
            id: resume._id,
            title: resume.jobTitle || 'Tailored_Resume',
            company: resume.companyName || 'Target Company',
            date: new Date(resume.createdAt).toLocaleDateString()
        });
        setShowPreviewModal(true);
        setShowHistoryModal(false);
    };

    const handleDownload = () => {
        const element = document.getElementById('resume-print-area');
        if (!element) return;
        
        const filename = currentResumeMeta?.title.endsWith('.pdf') 
            ? currentResumeMeta.title 
            : `${currentResumeMeta?.title}.pdf`;

        const opt = {
            margin: [0.5, 0.5],
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, scrollY: 0, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        element.style.display = 'block';
        html2pdf().set(opt).from(element).save().then(() => { element.style.display = 'none'; });
    };

    const handleSaveCurrentTitle = async () => {
        if (!currentResumeMeta?.id || !currentResumeMeta?.title.trim()) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/candidate/resumes/${currentResumeMeta.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ jobTitle: currentResumeMeta.title })
            });
            
            if (!res.ok) throw new Error('Failed to save filename');
            
            alert("✅ Filename saved!");
            fetchResumeHistory(token);
        } catch (err) {
            alert(err.message);
        }
    };

    const handleLogout = () => { localStorage.clear(); window.location.href = '/'; };

    const handleEditResume = (resume) => {
        setEditingResumeId(resume._id);
        setEditedTitle(resume.jobTitle);
    };

    const handleCancelEdit = () => {
        setEditingResumeId(null);
        setEditedTitle('');
    };

    const handleSaveResume = async (resumeId) => {
        if (!editedTitle.trim()) return alert("Title cannot be empty.");
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/candidate/resumes/${resumeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ jobTitle: editedTitle })
            });

            // FIX: Check if the response is actually OK before trying to parse JSON
            if (!res.ok) {
                const text = await res.text(); // Read raw text in case it's not JSON
                throw new Error(`Server Error (${res.status}): ${text.substring(0, 100) || res.statusText}`);
            }

            // Only parse JSON if request was successful
            const data = await res.json();

            alert("✅ Resume title updated successfully!");
            setEditingResumeId(null);
            setEditedTitle('');
            fetchResumeHistory(token);
        } catch (err) {
            console.error("Save Resume Error:", err);
            // This will now show the actual network/server error
            alert(err.message); 
        }
    };

    const handleDeleteResume = async (resumeId) => {
        if (!window.confirm("Are you sure you want to delete this resume? This action cannot be undone.")) return;
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/candidate/resumes/${resumeId}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });

            // FIX: Check if response is OK first
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Server Error (${res.status}): ${text.substring(0, 100) || res.statusText}`);
            }
            
            // Note: Some DELETE endpoints don't return JSON. We handle that safely here.
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                await res.json();
            }

            alert("✅ Resume deleted successfully!");
            fetchResumeHistory(token);
            
            // Clear preview if the deleted resume was the one currently shown
            if (currentResumeMeta && currentResumeMeta.id === resumeId) {
                setGeneratedResume(null);
                setCurrentResumeMeta(null);
            }
        } catch (err) {
            console.error("Delete Resume Error:", err);
            alert(err.message);
        }
    };

    // 4. RENDER
    return (
        <div>
            {/* SIDEBAR */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon"><i className="fas fa-search-check"></i></div>
                    <div className="sidebar-logo-text">ProofdIn</div>
                </div>
                <ul className="sidebar-menu">
                    <li><Link to="/candidate-dashboard"><i className="fas fa-tachometer-alt"></i> Dashboard</Link></li>

                    {/* --- PASTE THIS HERE --- */}
                    <li><Link to="/jobs"><i className="fas fa-briefcase"></i> Job Portal</Link></li>
                    <li><Link to="/applied-jobs"><i className="fas fa-check-circle"></i> Applied Jobs</Link></li>
                    {/* ----------------------- */}

                    <li><a href="#tailored-resume"><i className="fas fa-file-pdf"></i> Tailored Resumes</a></li>
                    <li><Link to="/skills"><i className="fas fa-th-large"></i> Skills Grid</Link></li>
                    <li><a href="#skill-gaps"><i className="fas fa-chart-line"></i> Skill Gaps</a></li>
                    <li><a href="#portfolio"><i className="fas fa-globe"></i> Portfolio</a></li>
                    <li><Link to="/candidate-profile"><i className="fas fa-user-circle"></i> My Profile</Link></li>
                </ul>
            </aside>

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
                        <button
                            className="btn btn-primary"
                            onClick={handleLogout}
                            style={{ width: 'auto', display: 'inline-flex' }}
                        >
                            <i className="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </nav>
            </header>

            {/* MAIN CONTENT */}
            <div className="dashboard-container" style={{ marginTop: 0 }}>
                {/* Welcome Card */}
                <section className="welcome-card">
                    <h1>Welcome back, {user.name.split(' ')[0]}!</h1>
                    <p>Your resume is 85% optimized. Continue improving to increase your interview chances.</p>
                    <div className="welcome-stats">
                        <div className="stat"><div className="stat-value">{resumes.length}</div><div className="stat-label">Tailored Resumes</div></div>
                        <div className="stat"><div className="stat-value">24</div><div className="stat-label">Skills Tracked</div></div>
                        <div className="stat"><div className="stat-value">8</div><div className="stat-label">Projects Linked</div></div>
                    </div>
                </section>

                {/* Tailored Resume Section */}
                <section id="tailored-resume" className="section-card">
                    <div className="section-header">
                        <h2>Tailored Resumes</h2>
                    </div>
                    <p className="section-subtitle">One resume, many versions: Paste a job post to get a tailored PDF in 1 click.</p>
                    <div className="resume-tailor">
                        <div className="job-input">
                            <textarea
                                value={jdText} onChange={(e) => setJdText(e.target.value)}
                                placeholder="Paste the job description here..."
                                style={{ minHeight: '200px', width: '100%', padding: '1rem', marginBottom: '1rem' }}
                            />
                            <button
                                className="btn btn-primary"
                                style={{ marginTop: '1rem', width: 'auto', display: 'inline-flex' }}
                                onClick={handleGenerate}
                                disabled={loading}
                            >
                                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                                {loading ? ' Generating...' : ' Generate Tailored Resume'}
                            </button>
                        </div>

                        {generatedResume ? (
                            <div className="tailored-resume-preview" style={{ border: '2px solid #eef2ff', background: 'white' }}>
                                <i className="fas fa-file-pdf" style={{ fontSize: '3rem', color: '#dc3545', marginBottom: '1rem' }}></i>
                                
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '0.5rem', width: '100%' }}>
                                     <input
                                         type="text"
                                         value={currentResumeMeta?.title || ''}
                                         onChange={(e) => setCurrentResumeMeta({ ...currentResumeMeta, title: e.target.value })}
                                         placeholder="Filename"
                                         style={{
                                             fontSize: '1.2rem',
                                             fontWeight: 'bold',
                                             textAlign: 'center',
                                             border: '2px solid #4a6cf7',
                                             borderRadius: '4px',
                                             padding: '8px',
                                             width: '70%',
                                             color: '#333'
                                         }}
                                     />
                                     <button 
                                        onClick={handleSaveCurrentTitle} 
                                        className="btn" 
                                        style={{ padding: '8px 12px', background: '#eef2ff', color: 'var(--primary)', border: '1px solid #e0e0e0' }} 
                                        title="Save Filename"
                                     >
                                         <i className="fas fa-save"></i>
                                     </button>
                                </div>

                                <p style={{ color: '#666', marginBottom: '0.5rem' }}>{currentResumeMeta?.company}</p>
                                <p style={{ fontSize: '0.8rem', color: '#999', marginBottom: '1.5rem' }}>Generated: Just now</p>

                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                    <button
                                        className="btn btn-primary"
                                        style={{ width: 'auto', display: 'inline-flex' }}
                                        onClick={() => setShowPreviewModal(true)}
                                    >
                                        <i className="fas fa-eye"></i> Preview
                                    </button>
                                    <button
                                        className="btn"
                                        style={{ backgroundColor: '#f0f0f0', width: 'auto', display: 'inline-flex' }}
                                        onClick={handleDownload}
                                    >
                                        <i className="fas fa-download"></i> PDF
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="tailored-resume-preview">
                                <i className="fas fa-file-pdf" style={{ color: '#ccc', fontSize: '3rem', marginBottom: '1rem' }}></i>
                                <h3>No Resume Generated</h3>
                                <p>Paste a JD to start.</p>
                            </div>
                        )}
                    </div>

                    {/* Recent Resumes List */}
                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Recent Tailored Resumes</h3>
                        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '0.5rem 0' }}>
                            {resumes.length === 0 ? <p style={{ color: '#888' }}>No resumes yet.</p> : resumes.slice(0, 3).map(r => (
                                <div key={r._id} className="tailored-resume-preview" style={{ minWidth: '200px', cursor: 'pointer', border: '1px solid #eee', position: 'relative' }}>
                                    <i className="fas fa-file-pdf" style={{ fontSize: '2rem', color: '#dc3545', marginBottom: '0.5rem' }} onClick={() => loadResume(r)}></i>
                                    
                                    {editingResumeId === r._id ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="text"
                                                value={editedTitle}
                                                onChange={(e) => setEditedTitle(e.target.value)}
                                                style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px', width: '90%' }}
                                                onClick={(e) => e.stopPropagation()} 
                                            />
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={(e) => { e.stopPropagation(); handleSaveResume(r._id); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--success)' }}>
                                                    <i className="fas fa-check"></i>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }} onClick={() => loadResume(r)}>{r.jobTitle}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#666' }} onClick={() => loadResume(r)}>{r.companyName}</div>
                                            <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={(e) => { e.stopPropagation(); handleEditResume(r); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--secondary)' }}>
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteResume(r._id); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                {/* Other sections omitted for brevity but remain unchanged */}
            </div>

            {/* Hidden Print Area */}
            <div id="resume-print-area" style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: generatedResume }} />
            
            {/* Modal Logic Remains Same */}
            {showPreviewModal && generatedResume && (
                <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                            <h3>Resume Preview</h3>
                            <button className="close-modal" onClick={() => setShowPreviewModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body" dangerouslySetInnerHTML={{ __html: generatedResume }} />
                        <div style={{ padding: '1.5rem', borderTop: '1px solid #eee', textAlign: 'right' }}>
                            <button className="btn btn-primary" onClick={handleDownload} style={{ width: 'auto', display: 'inline-flex' }}>Download PDF</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CandidateDashboard;