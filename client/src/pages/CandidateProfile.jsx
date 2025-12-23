import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/CandidateProfile.css'; 

const CandidateProfile = () => {
    // --- STATE MANAGEMENT ---
    const [loading, setLoading] = useState(true);
    const [profilePic, setProfilePic] = useState("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='100' r='100' fill='%234a6cf7'/%3E%3Ctext x='100' y='110' text-anchor='middle' font-size='80' fill='white' font-family='Arial'%3EC%3C/text%3E%3C/svg%3E");
    const [alerts, setAlerts] = useState([]);

    // Form States
    const [personalInfo, setPersonalInfo] = useState({
        firstName: '', lastName: '', email: '', phone: '', city: '', country: '', bio: ''
    });

    const [education, setEducation] = useState({
        highestDegree: '', fieldOfStudy: '', schoolName: '', graduationYear: '', certifications: ''
    });

    const [experience, setExperience] = useState({
        currentCompany: '', currentRole: '', yearsOfExperience: '', industry: '', skills: ''
    });

    const [organization, setOrganization] = useState({
        linkedinUrl: '', portfolioUrl: '', githubUrl: '', otherLinks: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '', newPassword: '', confirmPassword: ''
    });

    // --- 1. FETCH DATA ON LOAD ---
    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const res = await fetch('http://localhost:5000/api/candidate/me', {
                    headers: { 'x-auth-token': token }
                });
                
                if (!res.ok) throw new Error('Failed to fetch profile');
                
                const data = await res.json();
                const profile = data.profile || {};

                setPersonalInfo({
                    firstName: profile.firstName || '', 
                    lastName: profile.lastName || '',
                    email: profile.email || '', 
                    phone: profile.phone || '', // Fetch phone
                    city: profile.location ? profile.location.split(',')[0] : '',
                    country: profile.location ? profile.location.split(',')[1] : '',
                    bio: profile.summary || ''
                });

                setExperience({
                    currentCompany: '', 
                    currentRole: profile.headline || '',
                    yearsOfExperience: profile.experienceYears || '',
                    industry: '',
                    skills: profile.skills ? profile.skills.join(', ') : ''
                });

                setOrganization({
                    linkedinUrl: profile.socialLinks ? profile.socialLinks.find(l => l.includes('linkedin')) : '',
                    portfolioUrl: profile.portfolioUrl || '',
                    githubUrl: profile.socialLinks ? profile.socialLinks.find(l => l.includes('github')) : '',
                    otherLinks: ''
                });

                if (profile.education) {
                    setEducation({
                        ...education,
                        fieldOfStudy: typeof profile.education === 'string' ? profile.education : ''
                    });
                }

                setLoading(false);
            } catch (err) {
                console.error("Load Error:", err);
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    // --- HELPER FUNCTIONS ---
    const showAlert = (message, type) => {
        const id = Date.now();
        setAlerts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setAlerts(prev => prev.filter(alert => alert.id !== id));
        }, 5000);
    };

    const removeAlert = (id) => {
        setAlerts(prev => prev.filter(alert => alert.id !== id));
    };

    const handleInputChange = (e, setter) => {
        const { name, value } = e.target;
        setter(prev => ({ ...prev, [name]: value }));
    };

    const saveToBackend = async (dataPayload) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('http://localhost:5000/api/candidate/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(dataPayload)
            });

            if (!res.ok) throw new Error('Update failed');
            return true;
        } catch (err) {
            console.error(err);
            showAlert('Failed to save changes. Please try again.', 'error');
            return false;
        }
    };

    // --- SUBMIT HANDLERS ---
    const handlePersonalSubmit = async (e) => {
        e.preventDefault();
        
        // ✅ FIX: Send Name and Phone
        const payload = {
            firstName: personalInfo.firstName,
            lastName: personalInfo.lastName,
            phone: personalInfo.phone,
            summary: personalInfo.bio,
            location: `${personalInfo.city}, ${personalInfo.country}`,
        };

        const success = await saveToBackend(payload);
        if (success) showAlert('Personal information saved successfully!', 'success');
    };

    const handleEducationSubmit = async (e) => {
        e.preventDefault();
        const educationString = `${education.highestDegree} in ${education.fieldOfStudy} at ${education.schoolName} (${education.graduationYear})`;
        const payload = { education: educationString };
        const success = await saveToBackend(payload);
        if (success) showAlert('Educational background saved successfully!', 'success');
    };

    const handleExperienceSubmit = async (e) => {
        e.preventDefault();
        const skillsArray = experience.skills.split(',').map(s => s.trim()).filter(s => s);
        const payload = {
            headline: experience.currentRole,
            experienceYears: experience.yearsOfExperience,
            skills: skillsArray
        };
        const success = await saveToBackend(payload);
        if (success) showAlert('Work experience saved successfully!', 'success');
    };

    const handleOrganizationSubmit = async (e) => {
        e.preventDefault();
        const socialLinks = [];
        if (organization.linkedinUrl) socialLinks.push(organization.linkedinUrl);
        if (organization.githubUrl) socialLinks.push(organization.githubUrl);
        if (organization.otherLinks) socialLinks.push(organization.otherLinks);

        const payload = { socialLinks: socialLinks };
        const success = await saveToBackend(payload);
        if (success) showAlert('Links saved successfully!', 'success');
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        showAlert('Password changed successfully!', 'success');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    };

    if (loading) return <div style={{padding: '2rem', textAlign: 'center'}}>Loading Profile...</div>;

    return (
        <div className="cp-body">
            <header className="dashboard-header">
                <nav className="dashboard-nav">
                    <div className="logo">
                        <div className="logo-icon"><i className="fas fa-check-circle"></i></div>
                        <div className="logo-text">ProofdIn</div>
                    </div>
                    <div className="user-menu">
                        <div className="user-profile">
                            <div className="avatar">C</div>
                            <span>Candidate</span>
                        </div>
                        <Link to="/candidate-dashboard" className="btn btn-secondary">
                            <i className="fas fa-arrow-left"></i> Back to Dashboard
                        </Link>
                    </div>
                </nav>
            </header>

            <div className="dashboard-container">
                <div id="alertContainer">
                    {alerts.map(alert => (
                        <div key={alert.id} className={`alert alert-${alert.type}`}>
                            <i className={`fas fa-${alert.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
                            <span>{alert.message}</span>
                            <i className="fas fa-times alert-close" onClick={() => removeAlert(alert.id)}></i>
                        </div>
                    ))}
                </div>

                <div className="profile-section">
                    <div className="profile-picture-section">
                        <div className="profile-picture-container">
                            <img src={profilePic} alt="Profile" className="profile-picture" />
                            <div className="picture-upload-overlay" onClick={() => document.getElementById('profilePictureInput').click()}>
                                <i className="fas fa-camera"></i>
                            </div>
                        </div>
                        <input type="file" id="profilePictureInput" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => setProfilePic(event.target.result);
                                reader.readAsDataURL(file);
                            }
                        }} />
                        <div className="picture-info">
                            <h3>Update Profile Picture</h3>
                            <p>Click the camera icon to upload a new profile picture</p>
                        </div>
                    </div>
                </div>

                <div className="profile-section">
                    <div className="section-header">
                        <i className="fas fa-user"></i>
                        <h2 className="section-title">Personal Information</h2>
                    </div>
                    <form onSubmit={handlePersonalSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="firstName">First Name</label>
                                <input type="text" name="firstName" value={personalInfo.firstName} onChange={(e) => handleInputChange(e, setPersonalInfo)} placeholder="Enter your first name" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="lastName">Last Name</label>
                                <input type="text" name="lastName" value={personalInfo.lastName} onChange={(e) => handleInputChange(e, setPersonalInfo)} placeholder="Enter your last name" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input type="email" name="email" value={personalInfo.email} disabled style={{backgroundColor: '#eee'}} placeholder="Email cannot be changed" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="phone">Phone Number</label>
                            <input type="tel" name="phone" value={personalInfo.phone} onChange={(e) => handleInputChange(e, setPersonalInfo)} placeholder="Enter your phone number" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="city">City</label>
                                <input type="text" name="city" value={personalInfo.city} onChange={(e) => handleInputChange(e, setPersonalInfo)} placeholder="Enter your city" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="country">Country</label>
                                <input type="text" name="country" value={personalInfo.country} onChange={(e) => handleInputChange(e, setPersonalInfo)} placeholder="Enter your country" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="bio">Professional Bio</label>
                            <textarea name="bio" value={personalInfo.bio} onChange={(e) => handleInputChange(e, setPersonalInfo)} rows="3" placeholder="Tell us about your professional background..."></textarea>
                            <p className="form-help-text">Brief description of your skills and experience (max 500 characters)</p>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">Save Personal Information</button>
                        </div>
                    </form>
                </div>

                {/* Other sections (Education, Work, etc.) remain the same... */}
                <div className="profile-section">
                    <div className="section-header">
                        <i className="fas fa-graduation-cap"></i>
                        <h2 className="section-title">Educational Background</h2>
                    </div>
                    <form onSubmit={handleEducationSubmit}>
                        <div className="form-group">
                            <label htmlFor="highestDegree">Highest Degree</label>
                            <select name="highestDegree" value={education.highestDegree} onChange={(e) => handleInputChange(e, setEducation)}>
                                <option value="">Select degree level</option>
                                <option value="High School">High School</option>
                                <option value="Bachelors">Bachelor's Degree</option>
                                <option value="Masters">Master's Degree</option>
                                <option value="PhD">PhD</option>
                                <option value="Diploma">Diploma</option>
                                <option value="Certification">Certification</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="fieldOfStudy">Field of Study</label>
                            <input type="text" name="fieldOfStudy" value={education.fieldOfStudy} onChange={(e) => handleInputChange(e, setEducation)} placeholder="e.g., Computer Science, Engineering" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="schoolName">School/University Name</label>
                                <input type="text" name="schoolName" value={education.schoolName} onChange={(e) => handleInputChange(e, setEducation)} placeholder="Enter your school or university name" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="graduationYear">Graduation Year</label>
                                <input type="number" name="graduationYear" value={education.graduationYear} onChange={(e) => handleInputChange(e, setEducation)} placeholder="e.g., 2020" min="1950" max="2099" />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">Save Educational Background</button>
                        </div>
                    </form>
                </div>

                <div className="profile-section">
                    <div className="section-header">
                        <i className="fas fa-briefcase"></i>
                        <h2 className="section-title">Work Experience</h2>
                    </div>
                    <form onSubmit={handleExperienceSubmit}>
                        <div className="form-group">
                            <label htmlFor="currentRole">Headline / Current Role</label>
                            <input type="text" name="currentRole" value={experience.currentRole} onChange={(e) => handleInputChange(e, setExperience)} placeholder="e.g., Senior Developer, Product Manager" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="yearsOfExperience">Years of Experience</label>
                                <input type="number" name="yearsOfExperience" value={experience.yearsOfExperience} onChange={(e) => handleInputChange(e, setExperience)} placeholder="e.g., 5" min="0" max="70" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="industry">Industry</label>
                                <input type="text" name="industry" value={experience.industry} onChange={(e) => handleInputChange(e, setExperience)} placeholder="e.g., Technology, Finance, Healthcare" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="skills">Key Skills (comma-separated)</label>
                            <textarea name="skills" value={experience.skills} onChange={(e) => handleInputChange(e, setExperience)} rows="3" placeholder="e.g., JavaScript, React, Node.js, Python, SQL"></textarea>
                            <p className="form-help-text">List your technical and professional skills</p>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">Save Work Experience</button>
                        </div>
                    </form>
                </div>

                <div className="profile-section">
                    <div className="section-header">
                        <i className="fas fa-link"></i>
                        <h2 className="section-title">Social Links</h2>
                    </div>
                    <form onSubmit={handleOrganizationSubmit}>
                        <div className="form-group">
                            <label htmlFor="linkedinUrl">LinkedIn Profile URL</label>
                            <input type="url" name="linkedinUrl" value={organization.linkedinUrl} onChange={(e) => handleInputChange(e, setOrganization)} placeholder="https://linkedin.com/in/yourprofile" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="githubUrl">GitHub Profile</label>
                            <input type="url" name="githubUrl" value={organization.githubUrl} onChange={(e) => handleInputChange(e, setOrganization)} placeholder="https://github.com/yourprofile" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="portfolioUrl">Portfolio Website</label>
                            <input type="url" name="portfolioUrl" value={organization.portfolioUrl} onChange={(e) => handleInputChange(e, setOrganization)} placeholder="https://yourportfolio.com" />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">Save Links</button>
                        </div>
                    </form>
                </div>

                <div className="profile-section">
                    <div className="section-header">
                        <i className="fas fa-lock"></i>
                        <h2 className="section-title">Change Password</h2>
                    </div>
                    <form onSubmit={handlePasswordSubmit} className="password-form">
                        <div className="form-group">
                            <label htmlFor="currentPassword">Current Password</label>
                            <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={(e) => handleInputChange(e, setPasswordData)} placeholder="Enter your current password" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="newPassword">New Password</label>
                            <input type="password" name="newPassword" value={passwordData.newPassword} onChange={(e) => handleInputChange(e, setPasswordData)} placeholder="Enter your new password" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm New Password</label>
                            <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={(e) => handleInputChange(e, setPasswordData)} placeholder="Confirm your new password" required />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">Change Password</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CandidateProfile;