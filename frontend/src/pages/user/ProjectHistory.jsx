import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { projectsAPI, estimatesAPI, formatINR, clearAuthSession } from '../../services/api';


/* ── initials avatar helper ── */
function InitialsAvatar({ name, index }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
  const grads = [
    'linear-gradient(135deg,#0f766e,#0891b2)',
    'linear-gradient(135deg,#7c3aed,#db2777)',
    'linear-gradient(135deg,#d97706,#dc2626)',
    'linear-gradient(135deg,#059669,#0891b2)',
    'linear-gradient(135deg,#6d28d9,#0f766e)',
  ];
  return (
    <div
      style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: grads[index % grads.length],
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 11, fontWeight: 700,
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
      }}
    >
      {initials || '?'}
    </div>
  );
}

export default function ProjectHistory() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [openingId, setOpeningId] = useState(null);

  const handleOpenEstimate = async (p, latestEst) => {
    if (!latestEst || !latestEst.id) return;
    setOpeningId(latestEst.id);
    try {
      const fullEst = await estimatesAPI.get(latestEst.id);
      
      const normalized = {
        estimate_id: fullEst.id,
        project_id: fullEst.project_id,
        version: fullEst.version,
        costs: {
          subtotal: fullEst.subtotal,
          contingencyPct: fullEst.contingency_pct,
          contingency: fullEst.contingency_amount,
          gstPct: fullEst.gst_pct,
          gst: fullEst.gst_amount,
          grandTotal: fullEst.grand_total
        },
        duration: {
          min: fullEst.duration_min,
          max: fullEst.duration_max
        },
        boqItems: (fullEst.items || []).map(item => ({
          ...item,
          qty: item.qty ?? item.quantity ?? 0,
          code: item.item_code ?? item.material_code ?? item.code ?? ''
        })),
        quantities: fullEst.output_json?.quantities || {},
        recommendations: fullEst.output_json?.recommendations || [],
        summary: {
          customerName: fullEst.project?.customer_name || p.name,
          location: fullEst.project?.city || p.location,
          buildingType: fullEst.project?.building_type || p.building_type,
          totalSqft: fullEst.project?.total_sqft || p.total_sqft,
          quality: fullEst.project?.quality || p.quality
        },
        input: {
          ...fullEst.input_json,
          customer_name: fullEst.project?.customer_name,
          customer_mobile: fullEst.project?.customer_mobile,
          customer_email: fullEst.project?.customer_email,
          project_name: fullEst.project?.project_name,
          quotation_number: fullEst.project?.quotation_number,
          quotation_date: fullEst.project?.quotation_date,
          builder_company_name: fullEst.project?.builder_company_name,
          country: fullEst.project?.country,
          state: fullEst.project?.state,
          city: fullEst.project?.city,
          locality: fullEst.project?.locality,
          pincode: fullEst.project?.pincode,
          project_address: fullEst.project?.project_address,
          structure_type: fullEst.project?.structure_type,
          plot_area_sqft: fullEst.project?.plot_area_sqft,
          builtup_area_sqft: fullEst.project?.builtup_area_sqft,
          basement_area_sqft: fullEst.project?.basement_area_sqft,
          parking_area_sqft: fullEst.project?.parking_area_sqft,
          terrace_area_sqft: fullEst.project?.terrace_area_sqft,
          balcony_area_sqft: fullEst.project?.balcony_area_sqft,
          total_construction_area_sqft: fullEst.project?.total_construction_area_sqft,
          living_rooms: fullEst.project?.living_rooms,
          dining_rooms: fullEst.project?.dining_rooms,
          kitchens: fullEst.project?.kitchens,
          pooja_rooms: fullEst.project?.pooja_rooms,
          study_rooms: fullEst.project?.study_rooms,
          store_rooms: fullEst.project?.store_rooms,
          soil_type: fullEst.project?.soil_type,
          contingency_percentage: fullEst.project?.contingency_percentage,
          builder_margin_percentage: fullEst.project?.builder_margin_percentage,
          gst_percentage: fullEst.project?.gst_percentage,
          septic_tank_capacity: fullEst.project?.septic_tank_capacity,
          floors_list: fullEst.project?.floors_list || [],
          flooring_rooms: fullEst.project?.flooring_rooms || []
        }
      };
      
      sessionStorage.setItem('bs_estimate', JSON.stringify(normalized));
      navigate('/estimate-result');
    } catch (err) {
      setError(err.message || 'Failed to open estimate.');
    } finally {
      setOpeningId(null);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsAPI.list();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.message?.includes('401')) {
        clearAuthSession();
        navigate('/login');
      } else {
        setError(err.message || 'Failed to load projects.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project and all its estimates?')) return;
    setDeleting(id);
    try {
      await projectsAPI.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete project.');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = projects.filter((p) => {
    return !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.location?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <Layout role="builder">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-banner-label">History & Archives</div>
        <div className="hero-banner-title">My Projects</div>
        <div className="hero-banner-sub">All your saved estimates and project history at a glance</div>
      </div>

      {/* Toolbar / Search */}
      <div className="search-bar" style={{ gap: '12px', marginBottom: '24px' }}>
        <div className="search-input-wrap" style={{ maxWidth: '420px' }}>
          <span className="search-icon">🔍</span>
          <input
            className="form-control"
            style={{ height: '42px', paddingLeft: '36px' }}
            placeholder="Search by project name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-red" style={{ marginBottom: '20px' }}>
          <span className="alert-icon">⚠️</span>
          <div className="alert-body">
            <div className="alert-title">{error}</div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="p-0">
          <div className="table-wrapper" style={{ border: 'none' }}>
            {loading ? (
              /* Shimmer skeletons instead of plain loading text */
              <div style={{ padding: '20px 0' }}>
                {[1, 2, 3].map((n) => (
                  <div key={n} className="skeleton-row">
                    <div className="skeleton-circle skeleton" />
                    <div className="skeleton-line skeleton" style={{ width: '25%' }} />
                    <div className="skeleton-line skeleton" style={{ width: '15%' }} />
                    <div className="skeleton-line skeleton" style={{ width: '20%' }} />
                    <div className="skeleton-line skeleton" style={{ width: '12%', marginLeft: 'auto' }} />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{
                padding: '64px 32px',
                textAlign: 'center',
                background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
              }}>
                <div style={{ fontSize: '56px', marginBottom: '16px', lineHeight: 1 }}>🏗️</div>
                <div style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #0f766e, #0891b2)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '10px',
                }}>
                   {search ? 'No matching projects found' : 'No estimates saved yet'}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--color-gray-500)',
                  maxWidth: '360px',
                  margin: '0 auto 24px',
                  lineHeight: 1.6,
                }}>
                  {search
                    ? 'Try adjusting your filters or search keywords to find your estimates.'
                    : 'Get started by creating your first construction project estimate.'}
                </div>
                {!search && (
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate('/new-estimate')}
                    style={{ borderRadius: '50px', padding: '11px 28px', fontWeight: 700 }}
                  >
                    ＋ Create First Estimate
                  </button>
                )}
              </div>
            ) : (
              <table>
                <thead>
                  <tr style={{ background: 'linear-gradient(to right, #f0fdfa, #e0f2fe)' }}>
                    <th style={{ width: '40px', color: '#0f766e' }}>#</th>
                    <th style={{ color: '#0f766e' }}>Project Name</th>
                    <th style={{ color: '#0f766e' }}>Location</th>
                    <th style={{ color: '#0f766e' }}>Area / Floors</th>
                    <th style={{ color: '#0f766e' }}>Type</th>
                    <th style={{ color: '#0f766e' }}>Total Estimate</th>
                    <th style={{ color: '#0f766e' }}>Cost/Sqft</th>
                    <th style={{ color: '#0f766e' }}>Date</th>
                    <th style={{ color: '#0f766e', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const latestEst = (p.estimates || [])[0];
                    const status = latestEst?.status || 'Draft';
                    const total = latestEst?.grand_total || 0;
                    const sqft = p.total_sqft || 1;
                    const date = (p.created_at || '').split('T')[0];
                    return (
                      <tr
                        key={p.id}
                        style={{ transition: 'background 0.15s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f0fdfa'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                      >
                        <td className="text-muted text-sm">{i + 1}</td>
                        <td className="td-bold">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <InitialsAvatar name={p.name} index={i} />
                            <span>{p.name}</span>
                          </div>
                        </td>
                        <td className="text-muted">
                          <span style={{ marginRight: '4px' }}>📍</span>
                          {p.location}
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {sqft.toLocaleString()} sqft <span style={{ color: 'var(--color-gray-400)', fontSize: '12px' }}>/ G+{(p.floors || 1) - 1}</span>
                        </td>
                        <td>
                          <span className="badge badge-gray">{p.building_type || '—'}</span>
                        </td>
                        <td className="td-bold" style={{ color: '#0f766e', fontFamily: 'monospace', fontSize: '13px' }}>
                          {total ? formatINR(total) : '—'}
                        </td>
                        <td className="td-mono" style={{ color: 'var(--color-gray-600)' }}>
                          {total && sqft ? `₹${Math.round(total / sqft).toLocaleString()}` : '—'}
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
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEstimate(p, latestEst)}
                              style={{ padding: '4px 10px', fontWeight: 600 }}
                              disabled={openingId === latestEst?.id}
                            >
                              {openingId === latestEst?.id ? '⏳ Loading...' : '📂 Open'}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{
                                color: 'var(--color-danger)',
                                opacity: deleting === p.id ? 0.5 : 1,
                                padding: '4px 8px',
                              }}
                              onClick={() => handleDelete(p.id)}
                              disabled={deleting === p.id}
                              title="Delete project"
                            >
                              🗑️
                            </button>
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
