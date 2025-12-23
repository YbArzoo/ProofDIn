import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/Recruiter.css';

const Recruiter = () => {
    const [user, setUser] = useState(null);
    const [jobDescription, setJobDescription] = useState('');
    const [extractedSkills, setExtractedSkills] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [currentJobId, setCurrentJobId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [shortlistIds, setShortlistIds] = useState([]);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) setUser(storedUser);
        fetchShortlistIds();
    }, []);

    const fetchShortlistIds = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/shortlist', {
                headers: { 'x-auth-token': token }
            });
            setShortlistIds(res.data.map(item => item.candidate._id));
        } catch (err) {
            console.error("Error fetching shortlist", err);
        }
    };

    const analyzeJob = async () => {
        if (!jobDescription.trim()) return alert("Paste a JD first!");
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/jobs/analyze', 
                { description: jobDescription },
                { headers: { 'x-auth-token': token } }
            );
            
            setExtractedSkills(res.data.skills || []);
            setCurrentJobId(res.data.jobId);
            
            // Auto-trigger search
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
            const res = await axios.post('http://localhost:5000/api/jobs/match', 
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
            await axios.post('http://localhost:5000/api/shortlist/add', 
                { candidateId, jobId: currentJobId, status: 'saved' },
                { headers: { 'x-auth-token': token } }
            );
            setShortlistIds(prev => [...prev, candidateId]); // Update local state
        } catch (err) {
            alert(err.response?.data?.message || "Error saving");
        }
    };

    const contactCandidate = async (candidateId) => {
        const msg = prompt("Enter message:", "We'd like to interview you!");
        if(!msg) return;

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/shortlist/contact',
                { candidateId, message: msg },
                { headers: { 'x-auth-token': token } }
            );
            
            if(res.data.previewUrl) {
                if(confirm("Email sent! View simulated email?")) {
                    window.open(res.data.previewUrl, '_blank');
                }
            }
        } catch (err) {
            alert("Failed to send email");
        }
    };

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

            {/* SEARCH BAR */}
            <section className="search-section">
                <h2>Search Candidates</h2>
                <div className="search-container">
                    <div className="search-input">
                        <i className="fas fa-search"></i>
                        <input 
                            type="text" 
                            placeholder="Search in plain English..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => performSearch()}>Search</button>
                </div>
            </section>

            {/* RESULTS GRID */}
            <section>
                <h3>Matches ({candidates.length})</h3>
                <div className="candidates-grid">
                    {candidates.map((c, i) => (
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
                                <button className="btn" style={{background:'#f0f0f0'}}>View</button>
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