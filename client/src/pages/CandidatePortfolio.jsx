import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import '../styles/Portfolio.css';

const CandidatePortfolio = () => {
    // 1. DATA STATE
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState({});
    const [skills, setSkills] = useState([]);
    
    // 2. CONFIGURATION STATE
    const [config, setConfig] = useState({
        theme: 'modern', // modern, minimal, creative
        showPhoto: true,
        showContact: true,
        showBio: true,
        showExperience: true,
        showEducation: true,
        showSkills: true,
        customTitle: 'My Portfolio'
    });

    // 3. FETCH DATA
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            const headers = { 'x-auth-token': token };

            try {
                // Fetch Profile
                const profileRes = await fetch('/api/candidate/me', { headers });
                const profileData = await profileRes.json();
                
                // Fetch Skills
                const skillsRes = await fetch('/api/candidate/skills', { headers });
                const skillsData = await skillsRes.json();

                if (profileRes.ok) {
                    setProfile(profileData.profile);
                    // Load saved config if exists
                    if (profileData.profile.portfolio) {
                        setConfig(prev => ({ ...prev, ...profileData.profile.portfolio }));
                    }
                }
                if (skillsRes.ok) setSkills(skillsData);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // 4. ACTIONS
    const handleSaveConfig = async () => {
        const token = localStorage.getItem('token');
        try {
            await fetch('/api/candidate/me', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-auth-token': token 
                },
                body: JSON.stringify({ portfolio: config })
            });
            alert('✅ Portfolio settings saved!');
        } catch (err) {
            alert('Failed to save settings');
        }
    };

    const handleDownloadPDF = () => {
        const element = document.getElementById('portfolio-content');
        const opt = {
            margin: 0,
            filename: `${profile.firstName}_Portfolio.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    // 5. RENDER THEME LOGIC
    const renderContent = () => {
        // --- COMMON SECTIONS ---
        const Header = () => (
            <header>
                {config.showPhoto && profile.photoUrl && (
                    <img src={profile.photoUrl} alt="Profile" style={{width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem'}}/>
                )}
                <h1>{profile.firstName} {profile.lastName}</h1>
                <p style={{fontSize: '1.2rem', opacity: 0.8}}>{profile.headline}</p>
                {config.showContact && (
                    <div className="contact-info">
                        <p>{profile.email} • {profile.phone} • {profile.location}</p>
                        <div style={{marginTop: '10px'}}>
                            {profile.socialLinks?.map((link, i) => (
                                <a key={i} href={link} target="_blank" rel="noreferrer" style={{margin: '0 5px', color: 'inherit'}}>
                                    <i className="fas fa-link"></i> Link
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </header>
        );

        const Bio = () => config.showBio && (
            <section className="p-section">
                <h2>About Me</h2>
                <p>{profile.summary || "No bio available."}</p>
            </section>
        );

        const Experience = () => config.showExperience && (
            <section className="p-section">
                <h2>Experience</h2>
                <div className="exp-item">
                    <h3>{profile.headline}</h3>
                    <p>{profile.experienceYears} Years of Experience</p>
                    <p style={{color: '#666'}}>{profile.industry}</p>
                </div>
            </section>
        );

        const Education = () => config.showEducation && (
            <section className="p-section">
                <h2>Education</h2>
                <p>{profile.education || "No education listed."}</p>
            </section>
        );

        const SkillsList = () => config.showSkills && (
            <section className="p-section">
                <h2>Skills</h2>
                <div style={{display: 'flex', flexWrap: 'wrap'}}>
                    {skills.length > 0 ? skills.map(s => (
                        <span key={s._id} className="skill-tag">
                            {s.name} {s.level === 'expert' ? '★' : ''}
                        </span>
                    )) : <p>No skills added to grid.</p>}
                </div>
            </section>
        );

        // --- THEME STRUCTURES ---

        if (config.theme === 'creative') {
            return (
                <div id="portfolio-content" className={`portfolio-paper theme-${config.theme}`}>
                    <aside>
                        {config.showPhoto && <div style={{width: '100px', height: '100px', background: '#fff', borderRadius: '50%', margin: '0 auto 20px'}}></div>}
                        <h1>{profile.firstName}<br/>{profile.lastName}</h1>
                        <p>{profile.headline}</p>
                        {config.showContact && (
                            <div className="contact-info">
                                <p><i className="fas fa-envelope"></i> {profile.email}</p>
                                <p><i className="fas fa-phone"></i> {profile.phone}</p>
                                <p><i className="fas fa-map-marker-alt"></i> {profile.location}</p>
                            </div>
                        )}
                        <br/>
                        {config.showSkills && (
                            <div>
                                <h3 style={{color: '#dfe6e9', borderBottom: '1px solid #636e72', paddingBottom: '5px'}}>Top Skills</h3>
                                <div style={{marginTop: '10px'}}>
                                    {skills.slice(0, 8).map(s => <div key={s._id} style={{marginBottom: '5px'}}>{s.name}</div>)}
                                </div>
                            </div>
                        )}
                    </aside>
                    <main>
                        <Bio />
                        <Experience />
                        <Education />
                    </main>
                </div>
            );
        }

        // Default Layout (Modern & Minimal use same HTML structure, diff CSS)
        return (
            <div id="portfolio-content" className={`portfolio-paper theme-${config.theme}`}>
                <Header />
                <Bio />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', padding: '0 2rem' }}>
                    <div>
                        <Experience />
                        <Education />
                    </div>
                    <div>
                        <SkillsList />
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return <div className="loading-spinner">Loading Portfolio Builder...</div>;

    // ... (imports and logic remain the same)

    return (
        <div>
             {/* ✅ FIX: Added inline style to force full width */}
             <header className="dashboard-header" style={{ width: '100%', marginLeft: 0, left: 0 }}>
                <nav className="dashboard-nav">
                    <div className="logo">
                        <div className="logo-icon"><i className="fas fa-check-circle"></i></div>
                        <div className="logo-text">ProofdIn</div>
                    </div>
                    <div className="user-menu">
                        <Link to="/candidate-dashboard" className="btn btn-secondary" style={{display:'inline-flex', alignItems:'center', gap:'5px'}}>
                            <i className="fas fa-arrow-left"></i> Back to Dashboard
                        </Link>
                    </div>
                </nav>
            </header>

            <div className="portfolio-container">
                {/* LEFT: EDITOR */}
                <aside className="portfolio-editor">
                    <h3><i className="fas fa-paint-brush"></i> Design</h3>
                    <p style={{marginBottom: '1rem', color: '#666'}}>Choose a style for your recruiter-facing portfolio.</p>
                    
                    <label style={{fontWeight: 'bold', display: 'block', marginBottom: '10px'}}>Select Theme</label>
                    <div className="theme-grid">
                        <div className={`theme-card ${config.theme === 'modern' ? 'active' : ''}`} onClick={() => setConfig({...config, theme: 'modern'})}>
                            <i className="fas fa-columns" style={{fontSize: '2rem', color: '#4361ee'}}></i>
                            <div style={{marginTop: '5px'}}>Modern</div>
                        </div>
                        <div className={`theme-card ${config.theme === 'minimal' ? 'active' : ''}`} onClick={() => setConfig({...config, theme: 'minimal'})}>
                            <i className="fas fa-font" style={{fontSize: '2rem', color: '#333'}}></i>
                            <div style={{marginTop: '5px'}}>Minimal</div>
                        </div>
                        <div className={`theme-card ${config.theme === 'creative' ? 'active' : ''}`} onClick={() => setConfig({...config, theme: 'creative'})}>
                            <i className="fas fa-palette" style={{fontSize: '2rem', color: '#e17055'}}></i>
                            <div style={{marginTop: '5px'}}>Creative</div>
                        </div>
                    </div>

                    <h3 style={{marginTop: '2rem'}}><i className="fas fa-eye"></i> Content</h3>
                    <div className="toggle-list">
                        <div className="toggle-item">
                            <span>Show Photo</span>
                            <input type="checkbox" checked={config.showPhoto} onChange={(e) => setConfig({...config, showPhoto: e.target.checked})} />
                        </div>
                        <div className="toggle-item">
                            <span>Contact Info</span>
                            <input type="checkbox" checked={config.showContact} onChange={(e) => setConfig({...config, showContact: e.target.checked})} />
                        </div>
                        <div className="toggle-item">
                            <span>Bio / Summary</span>
                            <input type="checkbox" checked={config.showBio} onChange={(e) => setConfig({...config, showBio: e.target.checked})} />
                        </div>
                        <div className="toggle-item">
                            <span>Skills Grid</span>
                            <input type="checkbox" checked={config.showSkills} onChange={(e) => setConfig({...config, showSkills: e.target.checked})} />
                        </div>
                        <div className="toggle-item">
                            <span>Education</span>
                            <input type="checkbox" checked={config.showEducation} onChange={(e) => setConfig({...config, showEducation: e.target.checked})} />
                        </div>
                    </div>

                    <div style={{marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                        <button className="btn btn-primary" onClick={handleSaveConfig}><i className="fas fa-save"></i> Save Settings</button>
                        <button className="btn btn-secondary" onClick={handleDownloadPDF}><i className="fas fa-file-pdf"></i> Download as PDF</button>
                    </div>
                </aside>

                {/* RIGHT: PREVIEW */}
                <main className="portfolio-preview-wrapper">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default CandidatePortfolio;