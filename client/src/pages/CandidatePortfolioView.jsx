import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import '../styles/Portfolio.css';

const CandidatePortfolioView = () => {
    const { id } = useParams(); // Get Candidate ID from URL
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState({});
    const [skills, setSkills] = useState([]);
    const [config, setConfig] = useState({
        theme: 'modern', showPhoto: true, showContact: true, 
        showBio: true, showExperience: true, showEducation: true, showSkills: true
    });

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            try {
                // Fetch specific candidate data
                const res = await fetch(`/api/candidate/portfolio-view/${id}`, {
                    headers: { 'x-auth-token': token }
                });
                const data = await res.json();

                if (res.ok) {
                    setProfile(data.profile);
                    setSkills(data.skills);
                    // Apply their saved theme/config
                    if (data.profile.portfolio && typeof data.profile.portfolio === 'object') {
                        setConfig(prev => ({ ...prev, ...data.profile.portfolio }));
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleDownloadPDF = () => {
        const element = document.getElementById('portfolio-content');
        const opt = {
            margin: 0,
            filename: `${profile.firstName}_Resume.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    // --- REUSE YOUR RENDER LOGIC ---
    const renderContent = () => {
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
                                <a key={i} href={link} target="_blank" rel="noreferrer" style={{margin: '0 5px', color: 'inherit'}}><i className="fas fa-link"></i> Link</a>
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
                <div style={{display: 'flex', flexWrap: 'wrap', gap:'5px'}}>
                    {skills.map(s => (
                        <span key={s._id} style={{background:'#eee', padding:'4px 8px', borderRadius:'4px', fontSize:'0.9rem'}}>{s.name}</span>
                    ))}
                </div>
            </section>
        );

        if (config.theme === 'creative') {
            return (
                <div id="portfolio-content" className={`portfolio-paper theme-${config.theme}`}>
                    <aside>
                        {config.showPhoto && profile.photoUrl && <img src={profile.photoUrl} style={{width: 100, height: 100, borderRadius: '50%', marginBottom: 20}} />}
                        <h1>{profile.firstName}<br/>{profile.lastName}</h1>
                        <p>{profile.headline}</p>
                        {config.showContact && <div className="contact-info" style={{marginTop: 20}}><p>{profile.email}</p><p>{profile.location}</p></div>}
                        <br/>{config.showSkills && <div><h3>Top Skills</h3><div style={{marginTop: '10px'}}>{skills.slice(0,8).map(s => <div key={s._id}>{s.name}</div>)}</div></div>}
                    </aside>
                    <main><Bio /><Experience /><Education /></main>
                </div>
            );
        }

        return (
            <div id="portfolio-content" className={`portfolio-paper theme-${config.theme}`}>
                <Header />
                <Bio />
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginTop: '2rem' }}>
                    <div><Experience /><Education /></div>
                    <div><SkillsList /></div>
                </div>
            </div>
        );
    };

    if (loading) return <div style={{textAlign:'center', marginTop:'50px'}}>Loading Candidate Portfolio...</div>;

    return (
        <div style={{ background: '#f3f4f6', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Top Bar for Recruiter */}
            <div style={{ background: '#333', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>Viewing <strong>{profile.firstName}'s</strong> Portfolio</div>
                <div style={{display:'flex', gap:'10px'}}>
                    <button onClick={handleDownloadPDF} className="btn btn-sm" style={{background:'white', color:'#333'}}>
                        <i className="fas fa-download"></i> Download PDF
                    </button>
                    <button onClick={() => window.close()} className="btn btn-sm" style={{background:'#dc3545', color:'white'}}>
                        Close
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="portfolio-preview-wrapper" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                {renderContent()}
            </div>
        </div>
    );
};

export default CandidatePortfolioView;