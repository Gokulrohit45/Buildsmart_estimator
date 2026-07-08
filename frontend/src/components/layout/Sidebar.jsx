import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../../services/api';

const USER_NAV = [
  {
    section: 'Main',
    items: [
      { icon: '▦', label: 'Dashboard', path: '/dashboard', emoji: '📊' },
      { icon: '＋', label: 'New Estimate', path: '/new-estimate', emoji: '✨' },
      { icon: '📁', label: 'My Projects', path: '/projects', emoji: '📁' },
    ],
  },
  {
    section: 'Account',
    items: [
      { icon: '⚙', label: 'Settings', path: '/settings', emoji: '⚙️' },
    ],
  },
];

const ADMIN_NAV = [
  {
    section: 'Overview',
    items: [
      { icon: '▦', label: 'Dashboard', path: '/admin', emoji: '📊' },
      { icon: '👥', label: 'Users', path: '/admin/users', emoji: '👥' },
    ],
  },
  {
    section: 'Configuration',
    items: [
      { icon: '₹', label: 'Rate Master', path: '/admin/rates', emoji: '₹' },
      { icon: '⚙', label: 'Package & Add-on Rates', path: '/admin/settings', emoji: '⚙️' },
    ],
  },
];

export default function Sidebar({ role = 'builder', isOpen = false, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(getCurrentUser());
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('bs_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const handleCollapseChange = () => {
      setIsCollapsed(localStorage.getItem('bs_sidebar_collapsed') === 'true');
    };
    window.addEventListener('sidebar-collapse-change', handleCollapseChange);
    return () => window.removeEventListener('sidebar-collapse-change', handleCollapseChange);
  }, []);

  const toggleCollapse = (e) => {
    e.stopPropagation(); // prevent navigation
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('bs_sidebar_collapsed', String(nextVal));
    window.dispatchEvent(new Event('sidebar-collapse-change'));
  };

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const navGroups = role === 'admin' ? ADMIN_NAV : USER_NAV;
  const displayName = user?.company_name || user?.email || (role === 'admin' ? 'Admin User' : 'Builder Account');
  const displayRole = role === 'admin' ? 'Administrator' : 'Builder';

  return (
    <aside className={`sidebar slide-in${isOpen ? ' open' : ''}${isCollapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <div className="logo-icon">BS</div>
          <div className="logo-text">
            <span className="logo-name">Buildsmart</span>
            <span className="logo-sub" style={{ letterSpacing: '2.5px', fontWeight: '800', color: 'var(--color-teal-400)' }}>360</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.section}>
            <div className="nav-section-label">{group.section}</div>
            {group.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <span className="nav-item-icon" style={{ fontSize: '15px' }}>{item.emoji}</span>
                  <span>{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer user profile */}
      <div className="sidebar-footer">
        <div
          className="sidebar-user"
          onClick={() => navigate(role === 'admin' ? '/admin/settings' : '/settings')}
          style={{ cursor: 'pointer' }}
          title="Account settings"
        >
          <div className="user-avatar" style={{ overflow: 'hidden' }}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (displayName[0] || '?').toUpperCase()
            )}
          </div>
          <div className="user-info">
            <div className="user-name">{displayName}</div>
            <div className="user-role">{displayRole}</div>
          </div>
          <span
            onClick={toggleCollapse}
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '18px',
              marginLeft: 'auto',
              padding: '6px 10px',
              cursor: 'pointer',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? '›' : '‹'}
          </span>
        </div>
      </div>
    </aside>
  );
}
