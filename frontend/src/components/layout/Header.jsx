import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { clearAuthSession, getCurrentUser } from '../../services/api';

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

const PAGE_TITLES = {
  '/dashboard':     { title: 'Dashboard',       sub: 'Overview of your estimates and projects' },
  '/new-estimate':  { title: 'New Estimate',    sub: 'Generate a detailed AI construction estimate' },
  '/projects':      { title: 'My Projects',     sub: 'All your saved estimates and projects' },
  '/settings':      { title: 'Settings',         sub: 'Manage your account and preferences' },
  '/admin':         { title: 'Admin Dashboard', sub: 'Platform overview and statistics' },
  '/admin/users':   { title: 'User Management', sub: 'Manage builder accounts and access' },
  '/admin/rates':   { title: 'Rate Master',     sub: 'Configure material and labour rates by city' },
  '/admin/settings':{ title: 'System Settings', sub: 'Global system configuration' },
};

export default function Header({ role = 'user', onHamburgerClick }) {
  const navigate = useNavigate();
  const path = window.location.pathname;
  const pageInfo = PAGE_TITLES[path] || { title: 'Buildsmart 360', sub: '' };
  const [user, setUser] = useState(getCurrentUser());
  const windowWidth = useWindowWidth();
  const isSmall = windowWidth <= 480;
  const isMobile = windowWidth <= 768;

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const handleSwitchRole = () => {
    if (role === 'builder') navigate('/admin');
    else navigate('/dashboard');
  };

  return (
    <header className="header">
      {/* Hamburger — visible only on mobile via CSS */}
      <button
        className="hamburger-btn"
        onClick={onHamburgerClick}
        title="Menu"
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      {/* Page title */}
      <div className="header-breadcrumb">
        <div className="breadcrumb-title">{pageInfo.title}</div>
        {pageInfo.sub && <div className="breadcrumb-sub">{pageInfo.sub}</div>}
      </div>

      {/* Actions */}
      <div className="header-actions">
        {!isMobile && (
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(15,118,110,0.08)',
              color: '#0f766e',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              border: '1px solid rgba(15,118,110,0.18)',
            }}
          >
            {role === 'admin' ? '🔐 Admin View' : '🏗 Builder View'}
          </span>
        )}

        {/* User avatar */}
        <div
          style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: '700', color: 'white', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(15,118,110,0.35)',
            flexShrink: 0,
            overflow: 'hidden',
          }}
          title={user?.email}
          onClick={() => navigate(role === 'admin' ? '/admin/settings' : '/settings')}
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            ((user?.company_name || user?.email || 'U')[0]).toUpperCase()
          )}
        </div>

        {/* Sign out */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleLogout}
          style={{ color: 'var(--color-gray-500)', padding: isSmall ? '6px 8px' : undefined }}
        >
          {isSmall ? '↪' : 'Sign Out'}
        </button>
      </div>
    </header>
  );
}
