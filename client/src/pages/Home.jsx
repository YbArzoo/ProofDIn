import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

const Home = () => {
    const navigate = useNavigate();

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div style={{background: '#f9fafc'}}>
            
            {/* HEADER */}
            <header className="home-header">
                <nav className="home-navbar">
                    <div className="logo" style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <div style={{
                            width: '42px', height: '42px', borderRadius: '8px',
                            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                            display: 'grid', placeItems: 'center', color: 'white', fontSize: '1.2rem'
                        }}>
                            <i className="fas fa-search-check"></i>
                        </div>
                        <div style={{fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary)'}}>ProofdIn</div>
                    </div>
                    
                    <ul className="nav-links">
                        <li onClick={() => scrollToSection('home')}>Home</li>
                        <li onClick={() => scrollToSection('features')}>Features</li>
                        <li onClick={() => scrollToSection('how-it-works')}>How It Works</li>
                        {/* ✅ FIX: Updated route to /jobs */}
                        <li onClick={() => navigate('/jobs')}>Jobs</li>
                    </ul>

                    <div className="auth-buttons">
                        <button className="btn-login" onClick={() => navigate('/login')}>Login</button>
                        <button className="btn-signup" onClick={() => navigate('/login')}>Sign Up</button>
                    </div>
                </nav>
            </header>

            {/* HERO SECTION */}
            <section className="hero" id="home">
                <div className="hero-content">
                    <h1>Elevate Your Career with <span>AI-Powered Resume Analysis</span></h1>
                    <p>ProofdIn uses advanced artificial intelligence to analyze your resume, provide actionable feedback, and optimize it for Applicant Tracking Systems (ATS). Land more interviews with a professionally crafted resume.</p>
                    <div className="cta-buttons">
                        <button className="btn-signup" style={{padding:'0.8rem 2rem', fontSize:'1.1rem'}} onClick={() => navigate('/login')}>
                            Get Started For Free
                        </button>
                        <button className="btn-login" style={{padding:'0.8rem 2rem', fontSize:'1.1rem'}}>
                            Watch Demo
                        </button>
                    </div>
                    <div>
                        <p><i className="fas fa-check-circle" style={{color: 'var(--primary)', marginRight: '8px'}}></i> Analyze up to 3 resumes for free</p>
                    </div>
                </div>
                <div className="hero-image">
                    <div className="image-placeholder">
                        <i className="fas fa-file-alt"></i>
                    </div>
                </div>
            </section>

            {/* FEATURES SECTION */}
            <section className="section" id="features">
                <h2 className="section-title">Powerful Features</h2>
                <p className="section-subtitle">ProofdIn provides comprehensive resume analysis tools to help you stand out in today's competitive job market.</p>
                
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon"><i className="fas fa-robot"></i></div>
                        <h3>AI-Powered Analysis</h3>
                        <p>Our advanced AI scans your resume for common mistakes, formatting issues, and areas for improvement with industry-specific recommendations.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon"><i className="fas fa-check-double"></i></div>
                        <h3>ATS Optimization</h3>
                        <p>Ensure your resume passes through Applicant Tracking Systems with our compatibility scoring and keyword optimization suggestions.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon"><i className="fas fa-chart-line"></i></div>
                        <h3>Score & Insights</h3>
                        <p>Receive a comprehensive score with detailed insights on content, formatting, keywords, and overall impact to help you improve.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon"><i className="fas fa-industry"></i></div>
                        <h3>Industry-Specific Feedback</h3>
                        <p>Get tailored recommendations based on your target industry, whether it's tech, finance, healthcare, or any other field.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon"><i className="fas fa-edit"></i></div>
                        <h3>Live Editing</h3>
                        <p>Make changes to your resume directly in our editor and see your score update in real-time as you implement our suggestions.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon"><i className="fas fa-download"></i></div>
                        <h3>Multiple Formats</h3>
                        <p>Download your optimized resume in PDF, Word, or plain text formats, ready to submit to any job application.</p>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="section" id="how-it-works">
                <h2 className="section-title">How ProofdIn Works</h2>
                <p className="section-subtitle">Getting your resume optimized is simple with our three-step process.</p>
                
                <div className="steps-container">
                    <div className="step">
                        <div className="step-number">1</div>
                        <h3>Upload Your Resume</h3>
                        <p>Upload your existing resume in PDF, Word, or plain text format. Our system will securely process your document.</p>
                    </div>
                    <div className="step">
                        <div className="step-number">2</div>
                        <h3>AI Analysis & Feedback</h3>
                        <p>Our AI analyzes your resume for content, formatting, keywords, and ATS compatibility, providing detailed feedback.</p>
                    </div>
                    <div className="step">
                        <div className="step-number">3</div>
                        <h3>Optimize & Download</h3>
                        <p>Implement our suggestions using our built-in editor and download your optimized resume in your preferred format.</p>
                    </div>
                </div>
            </section>

            {/* CTA SECTION */}
            <section className="section">
                <div className="cta-section">
                    <h2>Ready to Transform Your Resume?</h2>
                    <p>Join over 50,000 professionals who have improved their resumes with ProofdIn. Get started for free today and see the difference an optimized resume can make.</p>
                    <button className="cta-btn" onClick={() => navigate('/login')}>Start Free Analysis</button>
                    <p style={{marginTop: '1rem', fontSize: '0.9rem'}}>• 3 free resume checks</p>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-column">
                        <div className="logo" style={{display:'flex', alignItems:'center', gap:'10px', marginBottom: '1.5rem'}}>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '8px',
                                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                                display: 'grid', placeItems: 'center', color: 'white', fontSize: '1.2rem'
                            }}>
                                <i className="fas fa-search-check"></i>
                            </div>
                            <div style={{fontSize: '1.8rem', fontWeight: 700, color: 'white'}}>ProofdIn</div>
                        </div>
                        <p style={{color: '#b0b7c3', marginBottom: '1.5rem'}}>AI-powered resume analysis to help you land your dream job.</p>
                        <div style={{display: 'flex', gap: '1rem'}}>
                            <a href="#" style={{color: 'white', fontSize: '1.2rem'}}><i className="fab fa-twitter"></i></a>
                            <a href="#" style={{color: 'white', fontSize: '1.2rem'}}><i className="fab fa-linkedin"></i></a>
                            <a href="#" style={{color: 'white', fontSize: '1.2rem'}}><i className="fab fa-facebook"></i></a>
                        </div>
                    </div>
                    
                    <div className="footer-column">
                        <h3>Product</h3>
                        <ul>
                            <li><a href="#">Features</a></li>
                            <li><a href="#">How It Works</a></li>
                            <li><a href="#">Pricing</a></li>
                            <li><a href="#">API</a></li>
                            <li><a href="#">FAQ</a></li>
                        </ul>
                    </div>
                    
                    <div className="footer-column">
                        <h3>Company</h3>
                        <ul>
                            <li><a href="#">About Us</a></li>
                            <li><a href="#">Careers</a></li>
                            <li><a href="#">Blog</a></li>
                            <li><a href="#">Press</a></li>
                            <li><a href="#">Contact</a></li>
                        </ul>
                    </div>
                    
                    <div className="footer-column">
                        <h3>Legal</h3>
                        <ul>
                            <li><a href="#">Terms of Service</a></li>
                            <li><a href="#">Privacy Policy</a></li>
                            <li><a href="#">Cookie Policy</a></li>
                            <li><a href="#">GDPR</a></li>
                        </ul>
                    </div>
                </div>
                
                <div className="footer-bottom">
                    <p>&copy; 2025 ProofdIn. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Home;