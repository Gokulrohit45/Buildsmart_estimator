import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { adminAPI } from '../../services/api';

export default function RateMaster() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editRate, setEditRate] = useState('');
  const [editVendor, setEditVendor] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ city: 'Default', material_code: '', rate: '', vendor: '' });

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getRates('');
      setRates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load rates.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (r) => {
    setEditId(r.id);
    setEditRate(r.rate?.toString() || '');
    setEditVendor(r.vendor || '');
  };

  const saveEdit = async (id) => {
    setSavingId(id);
    try {
      await adminAPI.updateRate(id, { rate: Number(editRate), vendor: editVendor });
      setRates((prev) => prev.map((r) => r.id === id ? { ...r, rate: Number(editRate), vendor: editVendor } : r));
      setEditId(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Failed to save rate.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rate entry?')) return;
    setDeletingId(id);
    try {
      await adminAPI.deleteRate(id);
      setRates((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete rate.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.material_code || !addForm.rate) {
      setError('Material code and rate are required.');
      return;
    }
    try {
      const created = await adminAPI.addRate({ ...addForm, city: 'Default', rate: Number(addForm.rate) });
      setRates((prev) => [...prev, created.rate || created]);
      setShowAdd(false);
      setAddForm({ city: 'Default', material_code: '', rate: '', vendor: '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Failed to add rate.');
    }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('bs_token');
      const res = await fetch('http://localhost:5000/api/admin/rates/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import CSV');
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      loadRates();
    } catch (err) {
      setError(err.message || 'Failed to import CSV.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <Layout role="admin">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="hero-banner-label">Configuration</div>
            <div className="hero-banner-title">Rate Master</div>
            <div className="hero-banner-sub">Configure base rates for raw materials and labour</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', zIndex: 1 }}>
            <input
              type="file"
              id="csv-file-input"
              accept=".csv"
              onChange={handleImportCSV}
              style={{ display: 'none' }}
            />
            <button
              className="btn btn-secondary"
              onClick={() => document.getElementById('csv-file-input').click()}
              disabled={loading}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              📥 Import CSV
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowAdd(true)}
              style={{ fontWeight: 700 }}
            >
              ＋ Add Rate Entry
            </button>
          </div>
        </div>
      </div>

      {/* Save Success Alert */}
      {saved && (
        <div className="alert alert-green" style={{ marginBottom: 16 }}>
          <span className="alert-icon">✅</span>
          <div>
            <div className="alert-title">Rate Master Updated</div>
            The modifications have been committed successfully. New estimates will reflect these base rates.
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="alert alert-red" style={{ marginBottom: 16 }}>
          <span className="alert-icon">⚠️</span>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}>✕</button>
          </div>
        </div>
      )}

      {/* Add Rate Card */}
      {showAdd && (
        <div className="card fade-in" style={{ marginBottom: '20px', borderTop: '3px solid var(--color-primary)' }}>
          <div className="card-header" style={{ background: 'linear-gradient(to right, rgba(15,118,110,0.05), transparent)' }}>
            <div className="card-title">🆕 Add New Rate Entry</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>✕ Close</button>
          </div>
          <div className="card-body">
            <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Material Code *</label>
                <input className="form-control" placeholder="e.g. cement, steel_tmt" value={addForm.material_code} onChange={(e) => setAddForm((f) => ({ ...f, material_code: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Rate (₹) *</label>
                <input className="form-control" type="number" placeholder="0" value={addForm.rate} onChange={(e) => setAddForm((f) => ({ ...f, rate: e.target.value }))} min="0" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Vendor Name (Optional)</label>
                <input className="form-control" placeholder="e.g. Jindal Steel" value={addForm.vendor} onChange={(e) => setAddForm((f) => ({ ...f, vendor: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>💾 Save Rate Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Package Rates (Per Sqft) Card */}
      <div className="card" style={{ marginBottom: '24px', overflow: 'hidden' }}>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #d97706, #fbbf24)', width: '100%' }} />
        <div className="card-header" style={{ background: 'linear-gradient(to right, rgba(217,119,6,0.04), transparent)' }}>
          <div>
            <div className="card-title">Package Rates (Per Sqft)</div>
            <div className="card-subtitle">Base construction package rates managed by system setting</div>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
            {[
              { tier: 'Base', rate: '₹2,100', emoji: '💰', color: '#64748b' },
              { tier: 'Standard', rate: '₹2,400', emoji: '🏗️', color: '#0f766e' },
              { tier: 'Premium', rate: '₹2,600', emoji: '✨', color: '#2563eb' },
              { tier: 'Luxury', rate: '₹2,800', emoji: '👑', color: '#d97706' },
            ].map((item) => (
              <div key={item.tier} style={{
                padding: '16px 14px', border: '1px solid var(--color-gray-200)',
                borderRadius: '12px', textAlign: 'center', background: 'var(--bg-card)',
                boxShadow: 'var(--shadow-xs)', transition: 'transform 0.2s',
              }}
              className="hover-lift"
              >
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.emoji}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.tier}</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: item.color, marginTop: '4px' }}>{item.rate}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rate Table Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="card-title">Material Rates</div>
          <button className="btn btn-ghost btn-sm" onClick={loadRates} style={{ border: '1px solid var(--color-gray-200)' }}>↻ Refresh</button>
        </div>

        <div className="p-0">
          <div className="table-wrapper" style={{ border: 'none' }}>
            {loading ? (
              <div style={{ padding: '20px 0' }}>
                {[1, 2, 3].map((n) => (
                  <div key={n} className="skeleton-row">
                    <div className="skeleton-line skeleton" style={{ width: '20%' }} />
                    <div className="skeleton-line skeleton" style={{ width: '25%' }} />
                    <div className="skeleton-line skeleton" style={{ width: '10%' }} />
                    <div className="skeleton-line skeleton" style={{ width: '12%' }} />
                    <div className="skeleton-line skeleton" style={{ width: '15%', marginLeft: 'auto' }} />
                  </div>
                ))}
              </div>
            ) : rates.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📦</div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>No rate entries found.</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Add a rate entry to get started.</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr style={{ background: 'linear-gradient(to right, #f0fdfa, #f1f5f9)' }}>
                    <th style={{ color: '#0f766e' }}>Material Code</th>
                    <th style={{ color: '#0f766e' }}>Material Name</th>
                    <th style={{ color: '#0f766e' }}>Unit</th>
                    <th style={{ color: '#0f766e' }}>Category</th>
                    <th style={{ color: '#0f766e' }}>Vendor</th>
                    <th style={{ color: '#0f766e', textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ color: '#0f766e', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r) => {
                    const mat = r.material_master || {};
                    const isEditing = editId === r.id;
                    const catBadge = mat.category === 'Civil' ? 'badge-blue' : mat.category === 'Finishing' ? 'badge-teal' : 'badge-gray';

                    return (
                      <tr
                        key={r.id}
                        style={{
                          transition: 'background 0.15s ease',
                          background: isEditing ? 'rgba(15,118,110,0.03)' : '',
                        }}
                        onMouseEnter={(e) => { if (!isEditing) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={(e) => { if (!isEditing) e.currentTarget.style.background = ''; }}
                      >
                        <td className="text-muted td-mono" style={{ fontSize: '12px' }}>{r.material_code}</td>
                        <td style={{ fontWeight: 500 }}>{mat.material_name || r.material_code}</td>
                        <td className="text-muted">{mat.unit || '—'}</td>
                        <td>
                          <span className={`badge ${catBadge}`}>{mat.category || '—'}</span>
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              className="form-control"
                              value={editVendor}
                              onChange={(e) => setEditVendor(e.target.value)}
                              style={{ maxWidth: '140px', padding: '6px 10px' }}
                              placeholder="Vendor"
                            />
                          ) : (
                            <span style={{ color: r.vendor ? 'inherit' : 'var(--color-gray-300)' }}>
                              {r.vendor || '—'}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isEditing ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-gray-400)' }}>₹</span>
                              <input
                                className="form-control"
                                type="number"
                                value={editRate}
                                onChange={(e) => setEditRate(e.target.value)}
                                style={{ maxWidth: '100px', textAlign: 'right', padding: '6px 10px' }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <span className="td-mono td-bold" style={{ color: '#0f766e', fontSize: '14px' }}>
                              ₹{(r.rate || 0).toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {isEditing ? (
                              <>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => saveEdit(r.id)}
                                  disabled={savingId === r.id}
                                  style={{ padding: '4px 10px', fontWeight: 600 }}
                                >
                                  {savingId === r.id ? 'Saving…' : '✓ Save'}
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setEditId(null)}
                                  style={{ padding: '4px 10px' }}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => startEdit(r)}
                                  style={{ padding: '4px 10px', color: 'var(--color-primary)', fontWeight: 600 }}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{
                                    color: 'var(--color-danger)',
                                    opacity: deletingId === r.id ? 0.5 : 1,
                                    padding: '4px 8px',
                                  }}
                                  onClick={() => handleDelete(r.id)}
                                  disabled={deletingId === r.id}
                                >
                                  🗑️
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
    </Layout>
  );
}
