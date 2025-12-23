import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/Profile.css';

const RecruiterProfile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // --- STATE ---
    const [personalInfo, setPersonalInfo] = useState({
        firstName: '', lastName: '', email: '', phone: '', bio: ''
    });

    const [orgInfo, setOrgInfo] = useState({
        companyName: '', industry: '', companySize: '', companyWebsite: '',
        companyLocation: '', department: '', jobTitle: ''
    });

    // NEW: State for Profile Picture URL
    const [profilePic, setProfilePic] = useState(null);

    // --- FETCH DATA ---
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) setUser(storedUser);
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/recruiters/me', {
                headers: { 'x-auth-token': token }
            });
            
            const data = res.data;
            
            // Populate Personal Info
            const names = (data.fullName || '').split(' ');
            setPersonalInfo({
                firstName: names[0] || '',
                lastName: names.slice(1).join(' ') || '',
                email: data.email || '',
                phone: data.phone || '',
                bio: data.bio || ''
            });

            // Populate Org Info
            setOrgInfo({
                companyName: data.orgName || '',
                industry: data.industry || '',
                companySize: data.orgSize || '',
                companyWebsite: data.orgWebsite || '',
                companyLocation: data.orgLocation || '',
                department: data.department || '',
                jobTitle: data.orgRole || ''
            });

            // Populate Profile Picture
            if (data.profilePicture) {
                // Ensure the URL is absolute if it starts with /uploads
                const url = data.profilePicture.startsWith('http') 
                    ? data.profilePicture 
                    : `http://localhost:5000${data.profilePicture}`;
                setProfilePic(url);
            }

        } catch (err) {
            console.error("Profile load error", err);
            alert("Failed to load profile.");
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLERS ---
    const handlePersonalChange = (e) => {
        setPersonalInfo({ ...personalInfo, [e.target.name]: e.target.value });
    };

    const handleOrgChange = (e) => {
        setOrgInfo({ ...orgInfo, [e.target.name]: e.target.value });
    };

    // --- NEW: IMAGE UPLOAD HANDLER ---
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validations (Optional but recommended)
        if (file.size > 5 * 1024 * 1024) return alert("File too large (Max 5MB)");
        if (!file.type.startsWith('image/')) return alert("Please upload an image file");

        const formData = new FormData();
        formData.append('image', file);

        try {
            const token = localStorage.getItem('token');
            // This matches the backend route we created in Step 4
            const res = await axios.post('http://localhost:5000/api/recruiters/me/avatar', 
                formData, 
                { headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' } }
            );
            
            // Update UI immediately with the new image
            const newUrl = `http://localhost:5000${res.data.profilePicture}`;
            setProfilePic(newUrl);
            alert("Profile picture updated!");
            
        } catch (err) {
            console.error(err);
            alert("Failed to upload image. Ensure server is running and supports uploads.");
        }
    };

    // --- SUBMIT PERSONAL ---
    const savePersonal = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5000/api/recruiters/me/personal', 
                personalInfo, 
                { headers: { 'x-auth-token': token } }
            );
            alert("Personal information saved!");
            // Update local user object for header avatar
            const updatedUser = { ...user, fullName: `${personalInfo.firstName} ${personalInfo.lastName}` };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (err) {
            alert("Failed to save personal info.");
        }
    };

    // --- SUBMIT ORG ---
    const saveOrg = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5000/api/recruiters/me/organization', 
                orgInfo, 
                { headers: { 'x-auth-token': token } }
            );
            alert("Organization details saved!");
        } catch (err) {
            alert("Failed to save organization info.");
        }
    };

    if (loading) return <Layout><div>Loading profile...</div></Layout>;

    return (
        <Layout title="My Profile" user={user}>
            
            {/* 1. Profile Picture Section (Updated for Upload) */}
            <div className="profile-section">
                <div className="profile-picture-section">
                    <div className="profile-picture-container">
                        {/* Display Image or Initial */}
                        {profilePic ? (
                            <img 
                                src={profilePic} 
                                alt="Profile" 
                                className="profile-picture" 
                                style={{padding: 0, objectFit: 'cover'}} // Override default padding
                            />
                        ) : (
                            <div className="profile-picture">
                                {personalInfo.firstName ? personalInfo.firstName[0].toUpperCase() : 'R'}
                            </div>
                        )}
                        
                        {/* Camera Icon triggers the hidden input */}
                        <div 
                            className="picture-upload-overlay" 
                            onClick={() => document.getElementById('profilePictureInput').click()}
                        >
                            <i className="fas fa-camera"></i>
                        </div>
                    </div>
                    
                    {/* Hidden Input for File Selection */}
                    <input 
                        type="file" 
                        id="profilePictureInput" 
                        accept="image/*" 
                        style={{display:'none'}} 
                        onChange={handleImageUpload} 
                    />
                    
                    <div style={{textAlign:'center', color:'#666'}}>
                        <h3>{personalInfo.firstName} {personalInfo.lastName}</h3>
                        <p>{orgInfo.jobTitle} at {orgInfo.companyName}</p>
                        <p style={{fontSize:'0.8rem', color:'#999'}}>Click the camera icon to upload</p>
                    </div>
                </div>
            </div>

            {/* 2. Personal Info Form */}
            <div className="profile-section">
                <div className="section-header">
                    <i className="fas fa-user"></i>
                    <h2 className="section-title">Personal Information</h2>
                </div>
                <form onSubmit={savePersonal}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>First Name</label>
                            <input name="firstName" value={personalInfo.firstName} onChange={handlePersonalChange} required />
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input name="lastName" value={personalInfo.lastName} onChange={handlePersonalChange} required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input name="email" value={personalInfo.email} disabled style={{background:'#eee'}} />
                        <small className="form-help-text">Email cannot be changed.</small>
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input name="phone" value={personalInfo.phone} onChange={handlePersonalChange} />
                    </div>
                    <div className="form-group">
                        <label>Bio</label>
                        <textarea name="bio" rows="3" value={personalInfo.bio} onChange={handlePersonalChange} />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">Save Personal Information</button>
                    </div>
                </form>
            </div>

            {/* 3. Organization Info Form */}
            <div className="profile-section">
                <div className="section-header">
                    <i className="fas fa-building"></i>
                    <h2 className="section-title">Organization Details</h2>
                </div>
                <form onSubmit={saveOrg}>
                    <div className="form-group">
                        <label>Company Name</label>
                        <input name="companyName" value={orgInfo.companyName} onChange={handleOrgChange} required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Industry</label>
                            <input name="industry" value={orgInfo.industry} onChange={handleOrgChange} />
                        </div>
                        <div className="form-group">
                            <label>Company Size</label>
                            <select name="companySize" value={orgInfo.companySize} onChange={handleOrgChange}>
                                <option value="">Select size</option>
                                <option value="1-10">1-10 employees</option>
                                <option value="11-50">11-50 employees</option>
                                <option value="51-200">51-200 employees</option>
                                <option value="201-500">201-500 employees</option>
                                <option value="501-1000">501-1000 employees</option>
                                <option value="1000+">1000+ employees</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Company Website</label>
                        <input name="companyWebsite" value={orgInfo.companyWebsite} onChange={handleOrgChange} />
                    </div>
                    <div className="form-group">
                        <label>Company Location</label>
                        <input name="companyLocation" value={orgInfo.companyLocation} onChange={handleOrgChange} />
                    </div>
                    <div className="form-group">
                        <label>Job Title</label>
                        <input name="jobTitle" value={orgInfo.jobTitle} onChange={handleOrgChange} />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">Save Organization Details</button>
                    </div>
                </form>
            </div>

        </Layout>
    );
};

export default RecruiterProfile;