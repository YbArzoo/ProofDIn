import React from 'react';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
              <i className="fas fa-search-check"></i>
          </div>
          <div className="sidebar-logo-text">ProofdIn</div>
      </div>

      <ul className="sidebar-menu">
        {/* Dashboard Link - Scrolls to Top */}
        <li>
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <i className="fas fa-tachometer-alt"></i> Dashboard
          </a>
        </li>

        {/* Section Links - These now use IDs to SCROLL instead of hiding content */}
        <li>
          <a href="#tailored-resume">
            <i className="fas fa-file-pdf"></i> Tailored Resumes
          </a>
        </li>
        <li>
          <a href="#skills-grid">
            <i className="fas fa-th-large"></i> Skills Grid
          </a>
        </li>
        <li>
          <a href="#skill-proof">
            <i className="fas fa-link"></i> Skill Proof
          </a>
        </li>
        <li>
          <a href="#skill-gaps">
            <i className="fas fa-chart-line"></i> Skill Gaps
          </a>
        </li>
        <li>
          <a href="#portfolio">
            <i className="fas fa-globe"></i> Portfolio
          </a>
        </li>
        <li>
          <a href="#settings">
            <i className="fas fa-cog"></i> Settings
          </a>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;