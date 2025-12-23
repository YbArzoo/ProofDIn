import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/Sourcing.css'; 

const Sourcing = () => {
    const [user, setUser] = useState(null);
    
    // --- STATE MANAGEMENT ---
    const [jdText, setJdText] = useState('');
    
    // GitHub Inputs
    const [ghSkills, setGhSkills] = useState('');
    const [ghLocation, setGhLocation] = useState('');
    const [ghRepos, setGhRepos] = useState(1); // RESTORED FEATURE
    
    // LinkedIn Inputs
    const [liTitle, setLiTitle] = useState('');
    const [liSkills, setLiSkills] = useState('');
    const [liLocation, setLiLocation] = useState(''); // RESTORED FEATURE

    // Results & Loading
    const [results, setResults] = useState([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) setUser(storedUser);
    }, []);

    // 1. SMART ANALYZE & AUTO-FILL
    const analyzeAndFill = async () => {
        if (!jdText.trim()) return alert("Please paste a Job Description first!");
        
        setAnalyzing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/jobs/analyze', 
                { description: jdText },
                { headers: { 'x-auth-token': token } }
            );

            const { skills, location, title } = res.data;

            // Auto-fill BOTH tools
            if (skills && skills.length > 0) {
                const topSkills = skills.slice(0, 4).join(' ');
                setGhSkills(topSkills);
                setLiSkills(topSkills);
            }
            
            if (location) {
                setGhLocation(location);
                setLiLocation(location);
            }
            
            if (title) setLiTitle(title);

        } catch (err) {
            console.error(err);
            alert("Analysis failed. Make sure the server is running.");
        }
        setAnalyzing(false);
    };

    // 2. GITHUB SEARCH (Restored Repo Count Logic)
    const searchGitHub = async () => {
        if(!ghSkills) return alert("Skills are required for GitHub search.");
        
        setSearching(true);
        setResults([]); // Clear previous results

        // Construct Query: skills location:city repos:>N
        let query = encodeURIComponent(ghSkills);
        if (ghLocation) query += `+location:${encodeURIComponent(ghLocation)}`;
        if (ghRepos > 0) query += `+repos:>${ghRepos}`;
        
        try {
            const res = await axios.get(`https://api.github.com/search/users?q=${query}&per_page=9`);
            setResults(res.data.items || []);
        } catch (err) {
            alert("GitHub API Error: " + (err.response?.data?.message || err.message));
        }
        setSearching(false);
    };

    // 3. LINKEDIN X-RAY (Restored Location Logic)
    const searchLinkedIn = () => {
        if(!liTitle && !liSkills) return alert("Please fill in Job Title or Skills.");

        // Query: site:linkedin.com/in/ "Title" "Skills" "Location"
        let query = `site:linkedin.com/in/ "${liTitle}" "${liSkills}"`;
        if (liLocation) query += ` "${liLocation}"`;

        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    };

    return (
        <Layout title="External Sourcing" user={user}>
            
            {/* --- SMART FILL SECTION --- */}
            <div className="smart-fill-section">
                <div className="smart-fill-header">
                    <div>
                        <h3 style={{color: 'var(--primary)'}}><i className="fas fa-magic"></i> Auto-Fill from JD</h3>
                        <small style={{color: 'var(--secondary)'}}>Paste a JD below. We'll extract skills and location automatically.</small>
                    </div>
                    <button className="btn btn-primary" onClick={analyzeAndFill} disabled={analyzing}>
                        {analyzing ? <><i className="fas fa-spinner fa-spin"></i> Analyzing...</> : <><i className="fas fa-bolt"></i> Extract & Fill</>}
                    </button>
                </div>
                <textarea 
                    className="smart-fill-textarea"
                    placeholder="Paste job description here (e.g. 'Looking for a React Developer in Dhaka with 3 years experience...')..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                />
            </div>

            {/* --- TOOLS GRID --- */}
            <div className="sourcing-grid">
                
                {/* TOOL 1: GITHUB */}
                <div className="tool-card">
                    <div className="tool-header">
                        <i className="fab fa-github tool-icon"></i>
                        <div>
                            <h2 style={{fontSize: '1.3rem'}}>GitHub Search</h2>
                            <span style={{fontSize: '0.9rem', color: 'var(--secondary)'}}>Find developers with real code.</span>
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Skills / Keywords</label>
                        <input className="form-input" placeholder="e.g. React Node" value={ghSkills} onChange={e => setGhSkills(e.target.value)} />
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Location</label>
                            <input className="form-input" placeholder="e.g. Dhaka" value={ghLocation} onChange={e => setGhLocation(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Min. Public Projects</label>
                            <input 
                                type="number" className="form-input" min="0" 
                                value={ghRepos} onChange={e => setGhRepos(e.target.value)} 
                            />
                        </div>
                    </div>

                    <button className="btn btn-github" onClick={searchGitHub}>
                        {searching ? 'Searching...' : <><i className="fas fa-search"></i> Search GitHub</>}
                    </button>
                </div>

                {/* TOOL 2: LINKEDIN */}
                <div className="tool-card">
                    <div className="tool-header">
                        <i className="fab fa-linkedin tool-icon" style={{color:'#0077b5'}}></i>
                        <div>
                            <h2 style={{fontSize: '1.3rem'}}>LinkedIn X-Ray</h2>
                            <span style={{fontSize: '0.9rem', color: 'var(--secondary)'}}>Precision Google Search.</span>
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Target Job Title</label>
                        <input className="form-input" placeholder="e.g. Frontend Engineer" value={liTitle} onChange={e => setLiTitle(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Must-Have Skills</label>
                        <input className="form-input" placeholder="e.g. Tailwind TypeScript" value={liSkills} onChange={e => setLiSkills(e.target.value)} />
                    </div>
                    
                    {/* RESTORED LOCATION INPUT */}
                    <div className="form-group">
                        <label className="form-label">Location (Optional)</label>
                        <input className="form-input" placeholder="e.g. Dhaka, New York" value={liLocation} onChange={e => setLiLocation(e.target.value)} />
                    </div>

                    <button className="btn btn-linkedin" onClick={searchLinkedIn}>
                        <i className="fab fa-google"></i> Open Google Search
                    </button>
                </div>
            </div>

            {/* --- GITHUB RESULTS SECTION --- */}
            {results.length > 0 && (
                <div className="results-section">
                    <div className="results-header">
                        <h3 style={{fontSize: '1.3rem'}}>GitHub Candidates</h3>
                        <span style={{color: 'var(--secondary)'}}>Found {results.length} candidates</span>
                    </div>
                    <div className="results-grid">
                        {results.map(dev => (
                            <div key={dev.id} className="dev-card">
                                <img src={dev.avatar_url} className="dev-avatar" alt="avatar" />
                                <div className="dev-name">{dev.login}</div>
                                <div className="dev-stat">
                                    <i className="fas fa-code-branch"></i> Check profile for details
                                </div>
                                <a href={dev.html_url} target="_blank" rel="noreferrer" className="dev-link">
                                    <i className="fab fa-github"></i> View Profile
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Sourcing;