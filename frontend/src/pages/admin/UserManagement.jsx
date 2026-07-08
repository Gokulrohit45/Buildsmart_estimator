import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { adminAPI, getCurrentUser } from '../../services/api';

const STATUS_BADGE = {
  true: 'badge-green',    // is_approved = true → Active
  false: 'badge-amber',   // is_approved = false + not blocked → Pending
};

/* ── Initials Avatar Helper ── */
function InitialsAvatar({ name, index, role }) {
  const initials = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
  
  const grads = role === 'admin' 
    ? ['linear-gradient(135deg,#0f766e,#0891b2)']
    : [
        'linear-gradient(135deg,#6366f1,#3b82f6)',
        'linear-gradient(135deg,#3b82f6,#06b6d4)',
        'linear-gradient(135deg,#10b981,#059669)',
        'linear-gradient(135deg,#f59e0b,#d97706)',
        'linear-gradient(135deg,#ec4899,#d946ef)',
      ];

  const background = grads[index % grads.length];

  return (
    <div
      style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 12, fontWeight: 700,
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
      }}
    >
      {initials || '?'}
    </div>
  );
}

export default function UserManagement() {
  const loggedInUser = getCurrentUser() || {};
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionPending, setActionPending] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) {
      setAdminError('Email and password are required.');
      return;
    }
    if (adminPassword !== adminConfirmPassword) {
      setAdminError('Passwords do not match.');
      return;
    }
    if (adminPassword.length < 6) {
      setAdminError('Password must be at least 6 characters.');
      return;
    }
    try {
      setLoading(true);
      setAdminError('');
      await adminAPI.createAdmin({ email: adminEmail, password: adminPassword });
      setAdminSuccess(true);
      setAdminEmail('');
      setAdminPassword('');
      setAdminConfirmPassword('');
      setTimeout(() => {
        setAdminSuccess(false);
        setShowCreateAdmin(false);
      }, 2000);
      loadUsers();
    } catch (err) {
      setAdminError(err.message || 'Failed to create admin.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setPasswordError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    try {
      setLoading(true);
      setPasswordError('');
      await adminAPI.changePassword(selectedUser.id, newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(false);
        setSelectedUser(null);
      }, 2000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionPending(id);
    try {
      await adminAPI.approveUser(id);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_approved: true } : u));
    } catch (err) {
      setError(err.message || 'Failed to approve user.');
    } finally {
      setActionPending(null);
    }
  };

  const handleBlock = async (id) => {
    setActionPending(id);
    try {
      await adminAPI.blockUser(id);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_approved: false } : u));
    } catch (err) {
      setError(err.message || 'Failed to block user.');
    } finally {
      setActionPending(null);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this user account permanently?");
    if (!confirmDelete) return;

    setActionPending(id);
    try {
      await adminAPI.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete user.');
    } finally {
      setActionPending(null);
    }
  };

  const getStatus = (u) => {
    if (u.role === 'admin') return 'Admin';
    return u.is_approved ? 'Active' : 'Pending';
  };

  const getBadge = (u) => {
    const s = getStatus(u);
    if (s === 'Admin') return 'badge-blue';
    if (s === 'Active') return 'badge-green';
    return 'badge-amber';
  };

  const getStatusDot = (u) => {
    const s = getStatus(u);
    if (s === 'Admin') return 'pulse-dot blue';
    if (s === 'Active') return 'pulse-dot green';
    return 'pulse-dot amber';
  };

  const filtered = users.filter((u) => {
    const name = u.company_name || u.email || '';
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || (u.city || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase());
    const status = getStatus(u);
    const matchStatus = statusFilter === 'All' || status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = users.filter((u) => !u.is_approved && u.role !== 'admin').length;

  return (
    <Layout role="admin">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="hero-banner-label">Accounts</div>
            <div className="hero-banner-title">User Management</div>
            <div className="hero-banner-sub">Approve registrations, manage credentials and access control for builder accounts</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', zIndex: 1 }}>
            <button className="btn btn-secondary" onClick={loadUsers} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600 }}>↻ Refresh</button>
            <button className="btn btn-primary" onClick={() => setShowCreateAdmin(true)} style={{ fontWeight: 700 }}>＋ Create Admin Account</button>
          </div>
        </div>
      </div>

      {/* Pending Approvals Notification */}
      {pendingCount > 0 && (
        <div className="alert alert-amber fade-in" style={{ marginBottom: '20px' }}>
          <span className="alert-icon">⏳</span>
          <div className="alert-body">
            <div className="alert-title" style={{ fontWeight: 700 }}>{pendingCount} Pending Registration{pendingCount > 1 ? 's' : ''}</div>
            New builder accounts are awaiting administrator approval before accessing the platform.
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="alert alert-red" style={{ marginBottom: '20px' }}>
          <span className="alert-icon">⚠️</span>
          <div className="alert-body">
            <div className="alert-title">{error}</div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="search-bar" style={{ gap: '12px', marginBottom: '24px' }}>
        <div className="search-input-wrap" style={{ maxWidth: '420px' }}>
          <span className="search-icon">🔍</span>
          <input
            className="form-control"
            style={{ height: '42px', paddingLeft: '36px' }}
            placeholder="Search by builder, email or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-control"
          style={{ maxWidth: '180px', height: '42px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {['All', 'Active', 'Pending', 'Admin'].map((s) => <option key={s}>{s} Status</option>)}
        </select>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="p-0">
          <div className="table-wrapper" style={{ border: 'none', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {loading ? (
              <div style={{ padding: '20px 0' }}>
                {[1, 2, 3].map((n) => (
                  <div key={n} className="skeleton-row">
                    <div className="skeleton-circle skeleton" />
                    <div className="skeleton-line skeleton" style={{ width: '20%' }} />
                    <div className="skeleton-line skeleton" style={{ width: '25%' }} />
                    <div className="skeleton-line skeleton" style={{ width: '10%' }} />
                    <div className="skeleton-line skeleton" style={{ width: '15%' }} />
                    <div className="skeleton-line skeleton" style={{ width: '12%', marginLeft: 'auto' }} />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>👥</div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>No builder accounts found.</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr style={{ background: 'linear-gradient(to right, #f0fdfa, #f1f5f9)' }}>
                    <th style={{ width: '40px', color: '#0f766e' }}>#</th>
                    <th style={{ color: '#0f766e' }}>Builder / Company</th>
                    <th style={{ color: '#0f766e' }}>Email Address</th>
                    <th style={{ color: '#0f766e' }}>City</th>
                    <th style={{ color: '#0f766e' }}>Phone</th>
                    <th style={{ color: '#0f766e' }}>Status</th>
                    <th style={{ color: '#0f766e' }}>Joined Date</th>
                    <th style={{ color: '#0f766e', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => {
                    const status = getStatus(u);
                    const date = (u.created_at || '').split('T')[0];
                    const isPending = actionPending === u.id;
                    const displayName = u.company_name || 'Builder Account';

                    return (
                      <tr
                        key={u.id}
                        style={{ transition: 'background 0.15s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                      >
                        <td className="text-muted text-sm">{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <InitialsAvatar name={displayName} index={i} role={u.role} />
                            <span className="td-bold">{displayName}</span>
                          </div>
                        </td>
                        <td className="text-muted">{u.email}</td>
                        <td style={{ fontWeight: 500 }}>{u.city || '—'}</td>
                        <td className="text-muted">{u.phone || '—'}</td>
                        <td>
                          <span className={`badge ${getBadge(u)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <div className={getStatusDot(u)} />
                            {status}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '11px', fontWeight: 600,
                            background: 'var(--color-gray-100)',
                            color: 'var(--color-gray-500)',
                            borderRadius: '20px',
                            padding: '3px 10px',
                            whiteSpace: 'nowrap',
                          }}>
                            {date}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                             {u.role === 'admin' && (
                               <>
                                 <button
                                   className="btn btn-secondary btn-sm"
                                   onClick={() => setSelectedUser(u)}
                                   title="Reset account password"
                                   style={{ padding: '4px 10px', fontWeight: 600 }}
                                 >
                                   🔑 Reset Pass
                                 </button>
                                 {loggedInUser.id !== u.id && (
                                   <button
                                     className="btn btn-ghost btn-sm"
                                     style={{ color: 'var(--color-danger)', border: '1px solid rgba(220,38,38,0.15)', padding: '4px 10px', fontWeight: 600 }}
                                     onClick={() => handleDelete(u.id)}
                                     disabled={isPending}
                                   >
                                     {isPending ? '…' : '🗑️ Delete'}
                                   </button>
                                 )}
                               </>
                             )}
                             {u.role !== 'admin' && (
                               <>
                                 {status === 'Pending' && (
                                   <button
                                     className="btn btn-primary btn-sm"
                                     onClick={() => handleApprove(u.id)}
                                     disabled={isPending}
                                     style={{ padding: '4px 12px', fontWeight: 600 }}
                                   >
                                     {isPending ? '…' : '✓ Approve'}
                                   </button>
                                 )}
                                 <button
                                   className="btn btn-ghost btn-sm"
                                   style={{ color: 'var(--color-danger)', border: '1px solid rgba(220,38,38,0.15)', padding: '4px 12px', fontWeight: 600 }}
                                   onClick={() => handleDelete(u.id)}
                                   disabled={isPending}
                                 >
                                   {isPending ? '…' : '🗑️ Delete'}
                                 </button>
                               </>
                             )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Create Admin Modal */}
      {showCreateAdmin && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(11, 17, 32, 0.65)', backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '440px', margin: '0 20px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #0f766e, #0891b2)', width: '100%' }} />
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, rgba(15,118,110,0.05), transparent)' }}>
              <div className="card-title">Create Admin Account</div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowCreateAdmin(false); setAdminError(''); }} style={{ fontSize: '18px', padding: '4px 8px' }}>✕</button>
            </div>
            <div className="card-body" style={{ padding: '24px' }}>
              {adminSuccess ? (
                <div className="alert alert-green" style={{ marginBottom: 0 }}>
                  <span className="alert-icon">✅</span>
                  <div>
                    <div className="alert-title">Success</div>
                    Admin account created successfully!
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateAdmin}>
                  {adminError && (
                    <div className="alert alert-red" style={{ marginBottom: 16 }}>
                      <span className="alert-icon">⚠️</span>
                      <div>{adminError}</div>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      className="form-control"
                      type="email"
                      placeholder="e.g. admin@vtab.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input
                      className="form-control"
                      type="password"
                      placeholder="Min 6 characters"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label">Confirm Password *</label>
                    <input
                      className="form-control"
                      type="password"
                      placeholder="Re-enter password"
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateAdmin(false); setAdminError(''); }} disabled={loading}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }} disabled={loading}>
                      {loading ? '⏳ Creating...' : '💾 Create Account'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {selectedUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(11, 17, 32, 0.65)', backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '440px', margin: '0 20px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #7c3aed, #db2777)', width: '100%' }} />
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, rgba(124,58,237,0.05), transparent)' }}>
              <div className="card-title">Reset User Password</div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedUser(null); setPasswordError(''); }} style={{ fontSize: '18px', padding: '4px 8px' }}>✕</button>
            </div>
            <div className="card-body" style={{ padding: '24px' }}>
              <div style={{
                background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.12)',
                borderRadius: '8px', padding: '12px 14px', marginBottom: '20px',
              }}>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', fontWeight: 500 }}>Target Account:</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-gray-800)', marginTop: '2px', wordBreak: 'break-all' }}>{selectedUser.email}</div>
              </div>

              {passwordSuccess ? (
                <div className="alert alert-green" style={{ marginBottom: 0 }}>
                  <span className="alert-icon">✅</span>
                  <div>
                    <div className="alert-title">Success</div>
                    Password updated successfully!
                  </div>
                </div>
              ) : (
                <form onSubmit={handleChangePassword}>
                  {passwordError && (
                    <div className="alert alert-red" style={{ marginBottom: 16 }}>
                      <span className="alert-icon">⚠️</span>
                      <div>{passwordError}</div>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">New Password *</label>
                    <input
                      className="form-control"
                      type="password"
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label">Confirm New Password *</label>
                    <input
                      className="form-control"
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => { setSelectedUser(null); setPasswordError(''); }} disabled={loading}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ fontWeight: 700, background: 'linear-gradient(135deg, #7c3aed, #db2777)', border: 'none' }} disabled={loading}>
                      {loading ? '⏳ Updating...' : '💾 Update Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
