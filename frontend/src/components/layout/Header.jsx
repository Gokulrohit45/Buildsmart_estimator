import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getCurrentUser } from '../../services/api';

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

export default function Header({ role = 'user' }) {
  const navigate = useNavigate();
  const path = window.location.pathname;
  const pageInfo = PAGE_TITLES[path] || { title: 'BuildSmart', sub: '' };
  const user = getCurrentUser();

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
      {/* Page title */}
      <div className="header-breadcrumb">
        <div className="breadcrumb-title">{pageInfo.title}</div>
        {pageInfo.sub && <div className="breadcrumb-sub">{pageInfo.sub}</div>}
      </div>

      {/* Actions */}
      <div className="header-actions">
        {/* Role switcher */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleSwitchRole}
          title="Switch View"
          style={{ borderRadius: '20px', paddingLeft: '14px', paddingRight: '14px' }}
        >
          {role === 'builder' ? '🔐 Admin View' : '🏗 Builder View'}
        </button>

        {/* Notifications */}
        <button className="icon-btn" title="Notifications">
          🔔
        </button>

        {/* User avatar */}
        <div
          style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: '700', color: 'white', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(15,118,110,0.35)',
            flexShrink: 0,
          }}
          title={user?.email}
        >
          {((user?.company_name || user?.email || 'U')[0]).toUpperCase()}
        </div>

        {/* Sign out */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleLogout}
          style={{ color: 'var(--color-gray-500)' }}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
