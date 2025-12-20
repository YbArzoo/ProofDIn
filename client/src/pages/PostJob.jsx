import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/PostJob.css';

const PostJob = () => {
    const [user, setUser] = useState(null);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const jobId = searchParams.get('id');
    const isEditMode = !!jobId;

    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    // --- FORM STATE ---
    const [formData, setFormData] = useState({
        jobTitle: '',
        jobType: 'Full-Time',
        experienceLevel: '',
        locationType: 'On-Site',
        city: '',
        country: '',
        salaryMin: '',
        salaryMax: '',
        jobDescription: '',
        responsibilities: '',
        benefits: [] // Array of strings
    });

    // Skills are managed separately for easier UI handling
    const [manualSkills, setManualSkills] = useState([]);
    const [niceToHaveSkills, setNiceToHaveSkills] = useState([]);
    const [skillInput, setSkillInput] = useState('');
    const [niceSkillInput, setNiceSkillInput] = useState('');

    // --- INIT ---
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) setUser(storedUser);
        
        if (isEditMode) loadJobData();
    }, [isEditMode]);

    // --- API: LOAD JOB (EDIT MODE) ---
    const loadJobData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/jobs/${jobId}`, {
                headers: { 'x-auth-token': token }
            });
            const job = res.data;

            // Map Backend Data -> Form State
            setFormData({
                jobTitle: job.title || '',
                jobType: job.jobType || 'Full-Time',
                experienceLevel: job.experienceLevel || '',
                locationType: job.locationType || 'On-Site',
                // Split "City, Country"
                city: job.location ? job.location.split(',')[0].trim() : '',
                country: job.location ? job.location.split(',')[1]?.trim() : '',
                salaryMin: job.salary?.min || '',
                salaryMax: job.salary?.max || '',
                jobDescription: job.description || '',
                responsibilities: job.responsibilities || '',
                benefits: job.benefits || []
            });

            setManualSkills(job.skills || []);
            setNiceToHaveSkills(job.niceToHaveSkills || []);

        } catch (err) {
            console.error(err);
            alert("Failed to load job details.");
        }
    };

    // --- API: AI AUTO-FILL ---
    const autoFillForm = async () => {
        if (!formData.jobDescription || formData.jobDescription.length < 50) {
            return alert("Please paste the full job description first!");
        }
        setAiLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/jobs/parse-jd', 
                { description: formData.jobDescription },
                { headers: { 'x-auth-token': token } }
            );
            
            const data = res.data;
            
            // Populate State
            setFormData(prev => ({
                ...prev,
                jobTitle: data.jobTitle || prev.jobTitle,
                jobType: data.jobType || prev.jobType,
                experienceLevel: data.experienceLevel || prev.experienceLevel,
                locationType: data.locationType || prev.locationType,
                city: data.city || prev.city,
                country: data.country || prev.country,
                salaryMin: data.salaryMin || prev.salaryMin,
                salaryMax: data.salaryMax || prev.salaryMax,
                responsibilities: data.responsibilities || prev.responsibilities,
                benefits: data.benefits || prev.benefits
            }));

            if (data.skills) setManualSkills(data.skills);
            if (data.niceToHaveSkills) setNiceToHaveSkills(data.niceToHaveSkills);

            alert("Form auto-filled by AI!");

        } catch (err) {
            alert("AI parsing failed. Please fill manually.");
        }
        setAiLoading(false);
    };

    // --- HANDLERS ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBenefitChange = (benefit) => {
        setFormData(prev => {
            const exists = prev.benefits.includes(benefit);
            return {
                ...prev,
                benefits: exists 
                    ? prev.benefits.filter(b => b !== benefit)
                    : [...prev.benefits, benefit]
            };
        });
    };

    // Skill Handlers
    const addSkill = (type) => {
        const val = type === 'required' ? skillInput.trim() : niceSkillInput.trim();
        if (!val) return;

        if (type === 'required' && !manualSkills.includes(val)) {
            setManualSkills([...manualSkills, val]);
            setSkillInput('');
        } else if (type === 'nice' && !niceToHaveSkills.includes(val)) {
            setNiceToHaveSkills([...niceToHaveSkills, val]);
            setNiceSkillInput('');
        }
    };

    const removeSkill = (skill, type) => {
        if (type === 'required') {
            setManualSkills(manualSkills.filter(s => s !== skill));
        } else {
            setNiceToHaveSkills(niceToHaveSkills.filter(s => s !== skill));
        }
    };

    // --- SUBMIT ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            title: formData.jobTitle,
            description: formData.jobDescription,
            jobType: formData.jobType,
            experienceLevel: formData.experienceLevel,
            locationType: formData.locationType,
            location: `${formData.city}, ${formData.country}`,
            salaryMin: formData.salaryMin,
            salaryMax: formData.salaryMax,
            responsibilities: formData.responsibilities,
            benefits: formData.benefits,
            manualSkills: manualSkills,
            niceToHaveSkills: niceToHaveSkills
        };

        try {
            const token = localStorage.getItem('token');
            const url = isEditMode 
                ? `http://localhost:5000/api/jobs/${jobId}`
                : `http://localhost:5000/api/jobs/analyze`; // Note: Your backend uses /analyze for Create logic
            
            const method = isEditMode ? 'put' : 'post';

            await axios[method](url, payload, { headers: { 'x-auth-token': token } });
            
            alert(isEditMode ? "Job Updated!" : "Job Posted Successfully!");
            navigate('/my-jobs'); // Redirect to list

        } catch (err) {
            console.error(err);
            alert("Operation failed. Check server.");
        }
        setLoading(false);
    };

    return (
        <Layout title={isEditMode ? "Edit Job" : "Post a Job"} user={user}>
            <div className="dashboard-container">
                <div className="job-post-form-section">
                    <div className="section-header">
                        <i className="fas fa-briefcase"></i>
                        <h2 className="section-title">{isEditMode ? 'Edit Job Post' : 'Post a New Job'}</h2>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* 1. TITLE */}
                        <div className="form-group">
                            <label>Job Title *</label>
                            <input name="jobTitle" value={formData.jobTitle} onChange={handleChange} required placeholder="e.g. Senior React Developer" />
                        </div>

                        {/* 2. JOB TYPE */}
                        <div className="form-group">
                            <label>Job Type *</label>
                            <div className="selection-group">
                                {['Full-Time', 'Part-Time', 'Contract', 'Freelance'].map(type => (
                                    <label key={type} className="selection-option">
                                        <input 
                                            type="radio" name="jobType" value={type} 
                                            checked={formData.jobType === type} 
                                            onChange={handleChange} 
                                        />
                                        <span className="selection-label">{type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 3. EXPERIENCE */}
                        <div className="form-group">
                            <label>Experience Level *</label>
                            <select name="experienceLevel" value={formData.experienceLevel} onChange={handleChange} required>
                                <option value="">Select Level</option>
                                <option value="entry-level">Entry Level</option>
                                <option value="mid-level">Mid Level</option>
                                <option value="senior">Senior</option>
                                <option value="lead">Lead/Principal</option>
                            </select>
                        </div>

                        {/* 4. LOCATION */}
                        <div className="form-group">
                            <label>Location Type *</label>
                            <div className="selection-group">
                                {['On-Site', 'Hybrid', 'Remote'].map(type => (
                                    <label key={type} className="selection-option">
                                        <input 
                                            type="radio" name="locationType" value={type} 
                                            checked={formData.locationType === type} 
                                            onChange={handleChange} 
                                        />
                                        <span className="selection-label">{type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>City</label>
                                <input name="city" value={formData.city} onChange={handleChange} placeholder="New York" />
                            </div>
                            <div className="form-group">
                                <label>Country</label>
                                <input name="country" value={formData.country} onChange={handleChange} placeholder="USA" />
                            </div>
                        </div>

                        {/* 5. SALARY */}
                        <div className="form-row">
                            <div className="form-group">
                                <label>Min Salary</label>
                                <input type="number" name="salaryMin" value={formData.salaryMin} onChange={handleChange} placeholder="50000" />
                            </div>
                            <div className="form-group">
                                <label>Max Salary</label>
                                <input type="number" name="salaryMax" value={formData.salaryMax} onChange={handleChange} placeholder="80000" />
                            </div>
                        </div>

                        {/* 6. DESCRIPTION & AI BUTTON */}
                        <div className="form-group">
                            <div style={{display:'flex', justifyContent:'space-between'}}>
                                <label>Job Description *</label>
                                <button type="button" className="btn btn-secondary" onClick={autoFillForm} disabled={aiLoading} style={{fontSize:'0.8rem', padding:'0.3rem 0.8rem'}}>
                                    {aiLoading ? 'Analyzing...' : <><i className="fas fa-magic"></i> Auto-Fill Form</>}
                                </button>
                            </div>
                            <textarea 
                                name="jobDescription" 
                                value={formData.jobDescription} 
                                onChange={handleChange} 
                                rows="8" 
                                placeholder="Paste the full job description here..."
                            />
                        </div>

                        {/* 7. SKILLS */}
                        <div className="form-group">
                            <label>Required Skills</label>
                            <div className="skill-input-box">
                                <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="Add skill" />
                                <button type="button" onClick={() => addSkill('required')}>Add</button>
                            </div>
                            <div className="skills-tags">
                                {manualSkills.map((s, i) => (
                                    <div key={i} className="skill-tag">
                                        {s} <i className="fas fa-times" onClick={() => removeSkill(s, 'required')}></i>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 8. NICE TO HAVE SKILLS */}
                        <div className="form-group">
                            <label>Nice-to-Have Skills</label>
                            <div className="skill-input-box">
                                <input value={niceSkillInput} onChange={(e) => setNiceSkillInput(e.target.value)} placeholder="Add optional skill" />
                                <button type="button" onClick={() => addSkill('nice')}>Add</button>
                            </div>
                            <div className="skills-tags">
                                {niceToHaveSkills.map((s, i) => (
                                    <div key={i} className="skill-tag" style={{background:'#eef2f6', color:'#555'}}>
                                        {s} <i className="fas fa-times" onClick={() => removeSkill(s, 'nice')}></i>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 9. BENEFITS */}
                        <div className="form-group">
                            <label>Benefits</label>
                            <div className="selection-group">
                                {['Health Insurance', 'Remote Work', 'Paid Time Off', '401k', 'Stock Options'].map(b => (
                                    <label key={b} className="selection-option">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.benefits.includes(b)} 
                                            onChange={() => handleBenefitChange(b)} 
                                        />
                                        <span className="selection-label">{b}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 10. SUBMIT */}
                        <div style={{display:'flex', justifyContent:'flex-end', marginTop:'2rem'}}>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : (isEditMode ? 'Update Job' : 'Post Job')}
                            </button>
                        </div>

                    </form>

                    {/* LIVE PREVIEW */}
                    <div className="job-preview">
                        <div className="preview-header">
                            <h2>{formData.jobTitle || 'Job Title'}</h2>
                            <div className="preview-meta">
                                {formData.jobType} • {formData.locationType} • {formData.city}, {formData.country}
                            </div>
                            <div className="preview-salary">
                                ${formData.salaryMin || '0'} - ${formData.salaryMax || '0'}
                            </div>
                        </div>
                        <div className="preview-content">
                            <h4>Description</h4>
                            <p style={{whiteSpace:'pre-wrap'}}>{formData.jobDescription || 'Description will appear here...'}</p>
                            
                            {manualSkills.length > 0 && (
                                <div style={{marginTop:'1rem'}}>
                                    <h4>Skills</h4>
                                    <div className="skills-tags">
                                        {manualSkills.map(s => <span key={s} className="skill-tag">{s}</span>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </Layout>
    );
};

export default PostJob;