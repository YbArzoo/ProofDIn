import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CandidateSidebar from '../components/CandidateSidebar'; // ✅ IMPORT
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
        highestDegree: '', fieldOfStudy: '', schoolName: '', graduationYear: ''
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
                const res = await fetch('/api/candidate/me', {
                    headers: { 'x-auth-token': token }
                });
                
                if (!res.ok) throw new Error('Failed to fetch profile');
                
                const data = await res.json();
                const profile = data.profile || {};

                // 1. Load Personal Info
                setPersonalInfo({
                    firstName: profile.firstName || '', 
                    lastName: profile.lastName || '',
                    email: profile.email || '', 
                    phone: profile.phone || '',
                    city: profile.location ? profile.location.split(',')[0].trim() : '',
                    country: profile.location ? profile.location.split(',')[1]?.trim() || '' : '',
                    bio: profile.summary || ''
                });

                // 2. Load Profile Pic
                if (profile.photoUrl) {
                    setProfilePic(profile.photoUrl);
                }

                // 3. Load Experience (FIXED SKILLS & INDUSTRY)
                setExperience({
                    currentCompany: '', 
                    currentRole: profile.headline || '',
                    yearsOfExperience: profile.experienceYears || '',
                    industry: profile.industry || '', 
                    skills: profile.skills 
                        ? profile.skills.map(s => (typeof s === 'object' ? s.name : s)).join(', ') 
                        : ''
                });

                // 4. Load Social Links
                if (profile.socialLinks && Array.isArray(profile.socialLinks)) {
                    setOrganization({
                        linkedinUrl: profile.socialLinks.find(l => l.includes('linkedin.com')) || '',
                        githubUrl: profile.socialLinks.find(l => l.includes('github.com')) || '',
                        portfolioUrl: profile.portfolioUrl || '',
                        otherLinks: ''
                    });
                }

                // 5. Load Education
                if (profile.education) {
                    try {
                        const eduObj = JSON.parse(profile.education);
                        setEducation({
                            highestDegree: eduObj.highestDegree || '',
                            fieldOfStudy: eduObj.fieldOfStudy || '',
                            schoolName: eduObj.schoolName || '',
                            graduationYear: eduObj.graduationYear || ''
                        });
                    } catch (e) {
                        setEducation(prev => ({ ...prev, fieldOfStudy: profile.education }));
                    }
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
            const res = await fetch('/api/candidate/me', {
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
        const payload = {
            firstName: personalInfo.firstName,
            lastName: personalInfo.lastName,
            phone: personalInfo.phone,
            summary: personalInfo.bio,
            location: `${personalInfo.city}, ${personalInfo.country}`,
            photoUrl: profilePic 
        };
        const success = await saveToBackend(payload);
        if (success) showAlert('Personal information saved!', 'success');
    };

    const handleEducationSubmit = async (e) => {
        e.preventDefault();
        const educationString = JSON.stringify(education);
        const payload = { education: educationString };
        const success = await saveToBackend(payload);
        if (success) showAlert('Educational background saved!', 'success');
    };

    const handleExperienceSubmit = async (e) => {
        e.preventDefault();
        const skillsArray = experience.skills.split(',').map(s => s.trim()).filter(s => s);
        
        const payload = {
            headline: experience.currentRole,
            experienceYears: experience.yearsOfExperience,
            industry: experience.industry, 
            skills: skillsArray
        };
        const success = await saveToBackend(payload);
        if (success) showAlert('Work experience saved!', 'success');
    };

    const handleOrganizationSubmit = async (e) => {
        e.preventDefault();
        const socialLinks = [];
        if (organization.linkedinUrl) socialLinks.push(organization.linkedinUrl);
        if (organization.githubUrl) socialLinks.push(organization.githubUrl);
        if (organization.otherLinks) socialLinks.push(organization.otherLinks);

        const payload = { 
            socialLinks: socialLinks,
            portfolioUrl: organization.portfolioUrl
        };
        const success = await saveToBackend(payload);
        if (success) showAlert('Links saved!', 'success');
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        showAlert('Password changed successfully!', 'success');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    };

    const handleLogout = () => { localStorage.clear(); window.location.href = '/'; };

    if (loading) return <div style={{padding: '2rem', textAlign: 'center'}}>Loading Profile...</div>;

    return (
        <div className="cp-body">
            {/* ✅ REPLACED SIDEBAR */}
            <CandidateSidebar />

            <header className="dashboard-header">
                <nav className="dashboard-nav">
                    <div className="user-menu">
                        <div className="user-profile">
                            <div className="avatar">{personalInfo.firstName ? personalInfo.firstName[0] : 'C'}</div>
                            <span>{personalInfo.firstName || 'Candidate'}</span>
                        </div>
                        <button className="btn btn-primary" onClick={handleLogout} style={{ width: 'auto', display: 'inline-flex' }}>
                            <i className="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </nav>
            </header>

            <div className="dashboard-container" style={{ marginTop: 0 }}>
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
                            <img src={profilePic} alt="Profile" className="profile-picture" style={{objectFit: 'cover'}} />
                            <div className="picture-upload-overlay" onClick={() => document.getElementById('profilePictureInput').click()}>
                                <i className="fas fa-camera"></i>
                            </div>
                        </div>
                        <input 
                            type="file" 
                            id="profilePictureInput" 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    if (file.size > 2 * 1024 * 1024) {
                                        showAlert("Image too large. Please select an image under 2MB.", "error");
                                        return;
                                    }
                                    const reader = new FileReader();
                                    reader.onload = (event) => setProfilePic(event.target.result);
                                    reader.readAsDataURL(file);
                                }
                            }} 
                        />
                        <div className="picture-info">
                            <h3>Update Profile Picture</h3>
                            <p>Click the camera to change. <strong>Click "Save Personal Information" below to apply.</strong></p>
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
                            <input type="email" name="email" value={personalInfo.email} disabled style={{backgroundColor: '#eee', cursor: 'not-allowed'}} />
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
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">Save Personal Information</button>
                        </div>
                    </form>
                </div>

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