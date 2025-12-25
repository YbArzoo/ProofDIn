import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
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
        {/* 1. Dashboard */}
        <li>
          <Link to="/candidate-dashboard" className={isActive('/candidate-dashboard')}>
            <i className="fas fa-tachometer-alt"></i> Dashboard
          </Link>
        </li>

        {/* 2. Job Portal */}
        <li>
          <Link to="/jobs" className={isActive('/jobs')}>
             <i className="fas fa-briefcase"></i> Job Portal
          </Link>
        </li>

        {/* 🔥 3. NEW LINK: Offers & Inquiries 🔥 */}
        <li>
          <Link to="/my-offers" className={isActive('/my-offers')} style={{ color: '#e65100', fontWeight: 'bold' }}>
            <i className="fas fa-envelope-open-text"></i> Offers & Inquiries
          </Link>
        </li>

        {/* 4. Applied Jobs */}
        <li>
          <Link to="/applied-jobs" className={isActive('/applied-jobs')}>
            <i className="fas fa-file-contract"></i> Applied Jobs
          </Link>
        </li>

        {/* 5. Tailored Resumes */}
        <li>
          <Link to="/tailored-resumes" className={isActive('/tailored-resumes')}>
            <i className="fas fa-file-pdf"></i> Tailored Resumes
          </Link>
        </li>

        {/* 6. Skills Grid */}
        <li>
          <Link to="/skills" className={isActive('/skills')}>
            <i className="fas fa-th-large"></i> Skills Grid
          </Link>
        </li>

        {/* 7. My Profile */}
        <li>
          <Link to="/candidate-profile" className={isActive('/candidate-profile')}>
            <i className="fas fa-user-circle"></i> My Profile
          </Link>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;