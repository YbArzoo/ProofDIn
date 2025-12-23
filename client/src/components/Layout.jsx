import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Layout = ({ children, title, user }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <div style={{ display: 'flex' }}>
            {/* --- SIDEBAR --- */}
            <aside className="sidebar" style={{
                position: 'fixed', left: 0, top: 0, width: '260px', height: '100vh',
                background: 'white', boxShadow: '2px 0 10px rgba(0,0,0,0.05)', padding: '1.5rem 1rem', zIndex: 1100
            }}>
                <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
                    <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <i className="fas fa-search-check"></i>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>ProofdIn</div>
                </div>

                <nav style={{ listStyle: 'none' }}>
                    <SidebarLink to="/dashboard" icon="fas fa-chart-line" text="Dashboard" active={isActive('/dashboard')} />
                    <SidebarLink to="/post-job" icon="fas fa-briefcase" text="Post a Job" active={isActive('/post-job')} />
                    <SidebarLink to="/job-portal" icon="fas fa-globe" text="Job Portal (Public)" active={isActive('/job-portal')} />
                    
                    {/* --- ADDED SHORTLIST LINK HERE --- */}
                    <SidebarLink to="/shortlist" icon="fas fa-bookmark" text="Shortlisted" active={isActive('/shortlist')} />
                    
                    <SidebarLink to="/sourcing" icon="fa-solid fa-magnifying-glass" text="Sourcing" active={isActive('/sourcing')} />
                    
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--secondary)', marginBottom: '0.5rem', marginTop: '2rem' }}>Account</div>
                    
                    <SidebarLink to="/my-jobs" icon="fas fa-list-ul" text="My Posted Jobs" active={isActive('/my-jobs')} />
                    <SidebarLink to="/profile" icon="fas fa-user-circle" text="My Profile" active={isActive('/profile')} />
                    
                    <li style={{ marginBottom: '0.5rem' }}>
                        <button onClick={handleLogout} className="sidebar-nav-link" style={{ 
                            width: '100%', background: 'none', border: 'none', cursor: 'pointer', 
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '0.7rem 1rem', 
                            fontSize: '1rem', color: 'var(--dark)', fontWeight: 600 
                        }}>
                            <i className="fas fa-sign-out-alt"></i>
                            <span>Logout</span>
                        </button>
                    </li>
                </nav>
            </aside>

            {/* --- MAIN CONTENT WRAPPER --- */}
            <div style={{ flex: 1, marginLeft: '260px' }}>
                {/* HEADER */}
                <header style={{ backgroundColor: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 1000, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{title}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {user?.fullName?.charAt(0).toUpperCase() || 'R'}
                        </div>
                    </div>
                </header>

                {/* PAGE CONTENT INJECTED HERE */}
                <main style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 2rem' }}>
                    {children}
                </main>
            </div>
        </div>
    );
};

// Helper Sub-component for Links
const SidebarLink = ({ to, icon, text, active }) => (
    <li style={{ marginBottom: '0.5rem' }}>
        <Link to={to} className={`sidebar-nav-link ${active}`} style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '0.7rem 1rem',
            borderRadius: '8px', textDecoration: 'none', fontWeight: 600,
            backgroundColor: active ? 'var(--primary-light)' : 'transparent',
            color: active ? 'var(--primary)' : 'var(--dark)'
        }}>
            <i className={icon}></i>
            <span>{text}</span>
        </Link>
    </li>
);

export default Layout;