import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const CandidateSidebar = () => {
    const location = useLocation();
    
    // Helper to check active state
    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <i className="fas fa-search-check"></i>
                </div>
                <div className="sidebar-logo-text">ProofdIn</div>
            </div>
            
            <ul className="sidebar-menu">
                <li className={isActive('/candidate-dashboard')}>
                    <Link to="/candidate-dashboard">
                        <i className="fas fa-tachometer-alt"></i> Dashboard
                    </Link>
                </li>
                <li className={isActive('/jobs')}>
                    <Link to="/jobs">
                        <i className="fas fa-briefcase"></i> Job Portal
                    </Link>
                </li>
                
                {/* Special Styling for Offers */}
                <li className={isActive('/my-offers')}>
                    <Link to="/my-offers" style={{ color: '#e65100', fontWeight: 'bold' }}>
                        <i className="fas fa-envelope-open-text"></i> Offers & Inquiries
                    </Link>
                </li>

                <li className={isActive('/applied-jobs')}>
                    <Link to="/applied-jobs">
                        <i className="fas fa-check-circle"></i> Applied Jobs
                    </Link>
                </li>
                
                <li className={isActive('/tailored-resumes')}>
                    <Link to="/tailored-resumes">
                        <i className="fas fa-file-pdf"></i> Tailored Resumes
                    </Link>
                </li>
                
                <li className={isActive('/portfolio')}>
                    <Link to="/portfolio">
                        <i className="fas fa-globe"></i> Portfolio
                    </Link>
                </li>

                <li className={isActive('/skills')}>
                    <Link to="/skills">
                        <i className="fas fa-th-large"></i> Skills Grid
                    </Link>
                </li>
                
                <li className={isActive('/candidate-profile')}>
                    <Link to="/candidate-profile">
                        <i className="fas fa-user-circle"></i> My Profile
                    </Link>
                </li>
            </ul>
        </aside>
    );
};

export default CandidateSidebar;