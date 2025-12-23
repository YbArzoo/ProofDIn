import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Login.css';

const Login = () => {
    const navigate = useNavigate();
    
    // UI State
    const [activeTab, setActiveTab] = useState('login'); 
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form Data State
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: '', 
        orgName: '',
        orgRole: '',
        agreeTerms: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const API_BASE_URL = "http://localhost:5000/api"; 

        try {
            let endpoint = activeTab === 'login' ? '/auth/login' : '/auth/signup';
            let payload = {};

            if (activeTab === 'login') {
                payload = { email: formData.email, password: formData.password };
            } else {
                if (formData.password !== formData.confirmPassword) {
                    alert("Passwords do not match!");
                    setLoading(false); return;
                }
                if (!formData.agreeTerms) {
                    alert("Please agree to the Terms.");
                    setLoading(false); return;
                }
                if (formData.role === 'recruiter' && (!formData.orgName || !formData.orgRole)) {
                    alert("Recruiters must provide Organization details.");
                    setLoading(false); return;
                }
                payload = {
                    fullName: formData.fullName,
                    email: formData.email,
                    password: formData.password,
                    role: formData.role,
                    orgName: formData.role === 'recruiter' ? formData.orgName : undefined,
                    orgRole: formData.role === 'recruiter' ? formData.orgRole : undefined
                };
            }

            const res = await axios.post(`${API_BASE_URL}${endpoint}`, payload);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));

            if (res.data.user.role === 'recruiter') navigate('/recruiter-dashboard'); 
            else navigate('/candidate-dashboard');

        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Operation failed. Check server connection.');
        } finally {
            setLoading(false);
        }
    };

    // Helper Component for Social Icons
    const SocialLogin = () => (
        <>
            <div className="divider">
                <span>Or continue with</span>
            </div>
            <div className="social-login">
                <a href="#" className="social-btn"><i className="fab fa-google"></i></a>
                <a href="#" className="social-btn"><i className="fab fa-linkedin-in"></i></a>
                <a href="#" className="social-btn"><i className="fab fa-github"></i></a>
            </div>
        </>
    );

    return (
        <div className="login-body">
            <div className="login-container">
                {/* BRANDING SECTION (Left Side) */}
                <div className="brand-section">
                    <h1>ProofdIn</h1>
                    <p>Elevate your career with our professional resume analysis tool</p>
                    <ul>
                        <li><i className="fas fa-check-circle"></i> AI-powered resume analysis</li>
                        <li><i className="fas fa-check-circle"></i> Industry-specific recommendations</li>
                        <li><i className="fas fa-check-circle"></i> ATS compatibility scoring</li>
                        <li><i className="fas fa-check-circle"></i> Professional formatting tips</li>
                        <li><i className="fas fa-check-circle"></i> Keyword optimization</li> 
                    </ul>
                </div>

                {/* FORM SECTION (Right Side) */}
                <div className="form-section">
                    <div className="logo">
                        <i className="fas fa-file-alt"></i>
                        <h2>ProofdIn</h2>
                    </div>

                    <div className="tabs">
                        <div className={`tab ${activeTab === 'login' ? 'active' : ''}`} onClick={() => setActiveTab('login')}>Login</div>
                        <div className={`tab ${activeTab === 'signup' ? 'active' : ''}`} onClick={() => setActiveTab('signup')}>Sign Up</div>
                    </div>

                    {/* LOGIN FORM */}
                    {activeTab === 'login' && (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" name="email" className="form-control" placeholder="Enter your email" required value={formData.email} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <div className="password-container">
                                    <input type={showPassword ? "text" : "password"} name="password" className="form-control" placeholder="Enter your password" required value={formData.password} onChange={handleChange} />
                                    <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </span>
                                </div>
                            </div>
                            
                            <div className="remember-forgot">
                                <div className="remember-me">
                                    <input type="checkbox" id="remember" />
                                    <label htmlFor="remember" style={{marginBottom:0, marginLeft:'5px'}}>Remember me</label>
                                </div>
                                <a href="#" className="forgot-password">Forgot password?</a>
                            </div>

                            {/* UPDATED BUTTON HERE: added 'btn-full' */}
                            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
                            
                            <SocialLogin /> 

                            <p className="signup-text">Don't have an account? <span onClick={() => setActiveTab('signup')}>Sign up</span></p>
                        </form>
                    )}

                    {/* SIGNUP FORM */}
                    {activeTab === 'signup' && (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input type="text" name="fullName" className="form-control" placeholder="Enter your name" required value={formData.fullName} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" name="email" className="form-control" placeholder="Enter your email" required value={formData.email} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select name="role" className="form-control" required value={formData.role} onChange={handleChange}>
                                    <option value="">Select your role</option>
                                    <option value="candidate">Candidate</option>
                                    <option value="recruiter">Recruiter</option>
                                </select>
                            </div>
                            {formData.role === 'recruiter' && (
                                <div className="form-group" style={{ background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                    <label>Organization Name</label>
                                    <input type="text" name="orgName" className="form-control" placeholder="Company Name" value={formData.orgName} onChange={handleChange} />
                                    <label style={{marginTop: '10px'}}>Job Title</label>
                                    <input type="text" name="orgRole" className="form-control" placeholder="e.g. Hiring Manager" value={formData.orgRole} onChange={handleChange} />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Password</label>
                                <input type={showPassword ? "text" : "password"} name="password" className="form-control" placeholder="Create a password" required value={formData.password} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input type="password" name="confirmPassword" className="form-control" placeholder="Confirm password" required value={formData.confirmPassword} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <div className="remember-me">
                                    <input type="checkbox" name="agreeTerms" id="terms" required checked={formData.agreeTerms} onChange={handleChange} />
                                    <label htmlFor="terms" style={{marginBottom:0, fontSize:'0.9rem', marginLeft:'5px'}}>I agree to Terms & Conditions</label>
                                </div>
                            </div>

                            {/* UPDATED BUTTON HERE: added 'btn-full' */}
                            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Creating Account...' : 'Create Account'}</button>
                            
                            <SocialLogin />

                            <p className="signup-text">Already have an account? <span onClick={() => setActiveTab('login')}>Login</span></p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;