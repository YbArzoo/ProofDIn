import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/Recruiter.css';
import { Link } from 'react-router-dom';

const Recruiter = () => {
    // 1. STATE
    const [user, setUser] = useState(null);
    const [jobDescription, setJobDescription] = useState('');
    const [extractedSkills, setExtractedSkills] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [currentJobId, setCurrentJobId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [shortlistIds, setShortlistIds] = useState([]);

    // 2. INITIAL LOAD
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) setUser(storedUser);
        fetchShortlistIds();
    }, []);

    const fetchShortlistIds = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/shortlist', {
                headers: { 'x-auth-token': token }
            });
            // Map the results to just get the candidate IDs for easy checking
            setShortlistIds(res.data.map(item => item.candidate._id));
        } catch (err) {
            console.error("Error fetching shortlist", err);
        }
    };

    // 3. ACTIONS
    const analyzeJob = async () => {
        if (!jobDescription.trim()) return alert("Paste a JD first!");
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/jobs/analyze', 
                { description: jobDescription },
                { headers: { 'x-auth-token': token } }
            );
            
            setExtractedSkills(res.data.skills || []);
            setCurrentJobId(res.data.jobId);
            
            // Auto-trigger search once analysis is done
            await performSearch(res.data.jobId);

        } catch (err) {
            alert(err.response?.data?.message || "Analysis failed");
        }
        setLoading(false);
    };

    const performSearch = async (jobIdOverride = null) => {
        const jId = jobIdOverride || currentJobId;
        if (!jId) return alert("Please analyze a job first!");

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/jobs/match', 
                { jobId: jId, query: searchQuery },
                { headers: { 'x-auth-token': token } }
            );
            setCandidates(res.data.candidates || []);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const saveCandidate = async (candidateId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/shortlist/add', 
                { candidateId, jobId: currentJobId, status: 'saved' },
                { headers: { 'x-auth-token': token } }
            );
            setShortlistIds(prev => [...prev, candidateId]); // Update UI instantly
        } catch (err) {
            alert(err.response?.data?.message || "Error saving");
        }
    };

    // --- UPDATED LOGIC HERE ---
    // --- UPDATED LOGIC: Sets status to 'emailed' ---
    const contactCandidate = async (candidateId) => {
        const msg = prompt("Enter message:", "We'd like to interview you!");
        if(!msg) return;

        const token = localStorage.getItem('token');

        try {
            // STEP 1: Add to Shortlist with 'emailed' status
            if (!shortlistIds.includes(candidateId)) {
                try {
                    await axios.post('/api/shortlist/add', 
                        { candidateId, jobId: currentJobId, status: 'emailed' }, // <--- CHANGED TO 'emailed'
                        { headers: { 'x-auth-token': token } }
                    );
                    setShortlistIds(prev => [...prev, candidateId]); 
                } catch (saveError) {
                    console.log("Candidate might already be in list...");
                }
            } else {
                // If they are already saved, you might want an endpoint here to update status to 'emailed'
                // But for now, the email sends regardless.
            }

            // STEP 2: Send the Email
            const res = await axios.post('/api/shortlist/contact',
                { candidateId, message: msg, jobId: currentJobId },
                { headers: { 'x-auth-token': token } }
            );
            
            // Handle Simulation
            if(res.data.previewUrl) {
                if(window.confirm("Email sent! Moved to 'Emailed' column.\n\nView simulated email?")) {
                    window.open(res.data.previewUrl, '_blank');
                }
            } else if (res.data.simulatedHtml) {
                if(window.confirm("Email Simulated (Offline)! Moved to 'Emailed' column.\n\nView preview?")) {
                    const blob = new Blob([res.data.simulatedHtml], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                }
            } else {
                alert("Email sent! Candidate moved to 'Emailed' column.");
            }

        } catch (err) {
            alert("Failed to process request");
            console.error(err);
        }
    };

    // 4. RENDER
    return (
        <Layout title="Dashboard" user={user}>
            {/* JOB POST INPUT */}
            <section className="job-post-section">
                <div className="section-header">
                    <h2 className="section-title">Paste a Job Post</h2>
                    <button className="btn btn-primary" onClick={analyzeJob} disabled={loading}>
                        {loading ? 'Analyzing...' : <><i className="fas fa-magic"></i> Analyze Job Post</>}
                    </button>
                </div>
                
                <div className="job-input-container">
                    <div className="job-input">
                        <textarea 
                            placeholder="Paste job description here..."
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                        />
                    </div>
                    <div className="skills-extracted">
                        <h3>Extracted Skills</h3>
                        <div className="skills-tags">
                            {extractedSkills.length > 0 ? (
                                extractedSkills.map((skill, i) => (
                                    <div key={i} className="skill-tag"><i className="fas fa-check"></i> {skill}</div>
                                ))
                            ) : <span style={{color:'#777'}}>No skills yet.</span>}
                        </div>
                    </div>
                </div>
            </section>

            {/* SEARCH BAR
            <section className="search-section">
                <h2>Search Candidates</h2>
                <div className="search-container">
                    <div className="search-input">
                        <i className="fas fa-search"></i>
                        <input 
                            type="text" 
                            placeholder="Search in plain English (e.g., 'React developer with 3 years exp')" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => performSearch()}>Search</button>
                </div>
            </section> */}

            {/* RESULTS GRID */}
            <section>
                <h3>Matches ({candidates.length})</h3>
                <div className="candidates-grid">
                    {candidates.map((c) => (
                        <div key={c.id} className="candidate-card">
                            <div className="candidate-header">
                                <div className="candidate-anonymous"><i className="fas fa-user"></i></div>
                                <div>
                                    <div className="candidate-title">{c.name}</div>
                                    <div style={{color:'gray'}}>{c.title}</div>
                                    <div className="match-score">{c.matchScore}% Match</div>
                                </div>
                            </div>
                            <div className="why-matched">
                                <strong>Why Matched:</strong>
                                <p>{c.whyMatched}</p>
                            </div>
                            <div className="candidate-actions">
                            {/* ✅ UPDATED VIEW BUTTON */}
                            <Link 
                                to={`/candidate-view/${c.id}`} 
                                target="_blank" 
                                className="btn" 
                                style={{ background: '#f0f0f0', textDecoration: 'none', color: '#333', textAlign: 'center' }}
                            >
                                View
                            </Link>

                            <button className="btn btn-primary" onClick={() => contactCandidate(c.id)}>Contact</button>
                            
                            {shortlistIds.includes(c.id) ? (
                                <button className="btn" style={{color:'green'}} disabled><i className="fas fa-check"></i> Saved</button>
                            ) : (
                                <button className="btn" onClick={() => saveCandidate(c.id)}>Save</button>
                            )}
                        </div>
                        </div>
                    ))}
                </div>
            </section>
        </Layout>
    );
};

export default Recruiter;