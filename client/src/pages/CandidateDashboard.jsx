import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import html2pdf from 'html2pdf.js';
import CandidateSidebar from '../components/CandidateSidebar'; // ✅ IMPORT
import '../styles/CandidateProfile.css'; 

const CandidateDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState({ name: 'Candidate', role: 'Candidate', avatar: 'C' });
    const [resumes, setResumes] = useState([]);
    const [stats, setStats] = useState({ skills: 0, projects: 0 });
    const [jdText, setJdText] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedResume, setGeneratedResume] = useState(null);
    const [currentResumeMeta, setCurrentResumeMeta] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    // Editing state (renaming) for Dashboard quick edits
    const [editingResumeId, setEditingResumeId] = useState(null);
    const [editedTitle, setEditedTitle] = useState('');

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
        fetchStats(token); 
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

    const fetchStats = async (token) => {
        try {
            const resSkills = await fetch('http://localhost:5000/api/candidate/skills', {
                headers: { 'x-auth-token': token }
            });
            const skillsData = await resSkills.json();
            
            const skillCount = Array.isArray(skillsData) ? skillsData.length : 0;
            let projectCount = 0;
            if(Array.isArray(skillsData)) {
                skillsData.forEach(skill => {
                    if(skill.proofs) projectCount += skill.proofs.length;
                });
            }
            setStats({ skills: skillCount, projects: projectCount });
        } catch (err) { console.error("Error fetching stats:", err); }
    };

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
            
            setCurrentResumeMeta({
                id: data.id, 
                title: data.jobTitle || 'Tailored_Resume',
                company: data.companyName || 'Target Company',
                date: 'Just now'
            });
            
            fetchResumeHistory(token);
            alert("✅ Resume Generated Successfully!");
        } catch (err) { alert(`Error: ${err.message}`); } 
        finally { setLoading(false); }
    };

    const loadResume = (resume) => {
        setGeneratedResume(marked.parse(resume.content));
        setCurrentResumeMeta({
            id: resume._id,
            title: resume.jobTitle || 'Tailored_Resume',
            company: resume.companyName || 'Target Company',
            date: new Date(resume.createdAt).toLocaleDateString()
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

    // Quick Rename from Dashboard
    const handleSaveResume = async (resumeId) => {
        if (!editedTitle.trim()) return alert("Title cannot be empty.");
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/candidate/resumes/${resumeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ jobTitle: editedTitle })
            });
            if (!res.ok) throw new Error('Update failed');
            alert("✅ Resume title updated!");
            setEditingResumeId(null);
            fetchResumeHistory(token);
        } catch (err) { alert(err.message); }
    };

    const handleDeleteResume = async (resumeId) => {
        if (!window.confirm("Delete this resume?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/candidate/resumes/${resumeId}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            if (!res.ok) throw new Error('Delete failed');
            alert("✅ Deleted!");
            fetchResumeHistory(token);
        } catch (err) { alert(err.message); }
    };

    const handleLogout = () => { localStorage.clear(); window.location.href = '/'; };

    return (
        <div>
            {/* ✅ REPLACED HARDCODED SIDEBAR */}
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
                {/* Welcome Card */}
                <section className="welcome-card">
                    <h1>Welcome back, {user.name.split(' ')[0]}!</h1>
                    <p>Your resume is ready to be optimized. Start by pasting a job description below.</p>
                    <div className="welcome-stats">
                        <div className="stat"><div className="stat-value">{resumes.length}</div><div className="stat-label">Tailored Resumes</div></div>
                        <div className="stat"><div className="stat-value">{stats.skills}</div><div className="stat-label">Skills Tracked</div></div>
                        <div className="stat"><div className="stat-value">{stats.projects}</div><div className="stat-label">Projects Linked</div></div>
                    </div>
                </section>

                {/* Generator Section */}
                <section className="section-card">
                    <div className="section-header">
                        <h2>Tailored Resumes</h2>
                    </div>
                    <p className="section-subtitle">One resume, many versions: Paste a job post to get a tailored PDF in 1 click.</p>
                    <div className="resume-tailor">
                        <div className="job-input">
                            <textarea
                                value={jdText} onChange={(e) => setJdText(e.target.value)}
                                placeholder="Paste the job description here..."
                                style={{ minHeight: '150px', width: '100%', padding: '1rem', marginBottom: '1rem' }}
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

                        {generatedResume && (
                            <div className="tailored-resume-preview" style={{ border: '2px solid #eef2ff', background: 'white' }}>
                                <i className="fas fa-file-pdf" style={{ fontSize: '3rem', color: '#dc3545', marginBottom: '1rem' }}></i>
                                <h3>Resume Ready!</h3>
                                <button className="btn btn-secondary" onClick={() => setShowPreviewModal(true)}>Preview</button>
                            </div>
                        )}
                    </div>

                    {/* Recent Resumes List */}
                    <div style={{ marginTop: '2rem' }}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '1rem'}}>
                            <h3>Recent Tailored Resumes</h3>
                            <Link to="/tailored-resumes" style={{color:'var(--primary)', fontWeight:'600'}}>View All <i className="fas fa-arrow-right"></i></Link>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '0.5rem 0' }}>
                            {resumes.length === 0 ? <p style={{ color: '#888' }}>No resumes yet.</p> : resumes.slice(0, 3).map(r => (
                                <div key={r._id} className="tailored-resume-preview" style={{ minWidth: '200px', cursor: 'pointer', border: '1px solid #eee', position: 'relative' }}>
                                    <i className="fas fa-file-pdf" style={{ fontSize: '2rem', color: '#dc3545', marginBottom: '0.5rem' }} onClick={() => loadResume(r)}></i>
                                    
                                    {editingResumeId === r._id ? (
                                        <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                                            <input value={editedTitle} onChange={e => setEditedTitle(e.target.value)} style={{width:'100%', padding:'4px'}} />
                                            <div style={{display:'flex', gap:'5px', justifyContent:'center'}}>
                                                <button onClick={() => handleSaveResume(r._id)} className="btn-icon text-success"><i className="fas fa-check"></i></button>
                                                <button onClick={() => setEditingResumeId(null)} className="btn-icon text-danger"><i className="fas fa-times"></i></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }} onClick={() => loadResume(r)}>{r.jobTitle}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#666' }}>{r.companyName}</div>
                                            <div style={{ position: 'absolute', top: '5px', right: '5px', display:'flex', gap:'5px' }}>
                                                <i className="fas fa-edit text-muted" style={{cursor:'pointer'}} onClick={(e) => { e.stopPropagation(); setEditingResumeId(r._id); setEditedTitle(r.jobTitle); }}></i>
                                                <i className="fas fa-trash text-danger" style={{cursor:'pointer'}} onClick={(e) => { e.stopPropagation(); handleDeleteResume(r._id); }}></i>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
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

export default CandidateDashboard;