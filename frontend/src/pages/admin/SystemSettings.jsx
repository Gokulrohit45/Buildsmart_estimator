import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { adminAPI } from '../../services/api';

const DEFAULT_SETTINGS = {
  default_gst_pct: '18',
  contingency_pct: '5',
  app_name: 'BuildSmart AI Estimator',
  support_email: 'support@buildsmart.in',
  max_projects_per_builder: '50',
};

const SECTION_ICONS = {
  General: '⚙️',
  'Estimation Defaults': '🧮',
  'User & Registration': '👥',
  'CPWD Cost Indexes': '🏙️',
};

function SettingRow({ label, sublabel, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '20px 0', borderBottom: '1px solid var(--color-gray-100)', gap: '24px',
      transition: 'background 0.15s',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-gray-800)' }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', marginTop: '3px', lineHeight: 1.5 }}>
            {sublabel}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function SectionCard({ title, children }) {
  const icon = SECTION_ICONS[title] || '⚙️';
  return (
    <div className="card" style={{ marginBottom: '20px', overflow: 'hidden' }}>
      {/* Gradient top accent */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #0f766e, #0891b2)', width: '100%' }} />
      <div className="card-header" style={{ background: 'linear-gradient(135deg, rgba(15,118,110,0.04) 0%, rgba(8,145,178,0.02) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(15,118,110,0.15), rgba(8,145,178,0.1))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
          }}>{icon}</div>
          <div className="card-title">{title}</div>
        </div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export default function SystemSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Cost Index state variables
  const [cityIndexes, setCityIndexes] = useState([]);
  const [newCityName, setNewCityName] = useState('');
  const [newCityState, setNewCityState] = useState('');
  const [newCityIndex, setNewCityIndex] = useState('100');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [serverSettings, indexesResponse] = await Promise.all([
        adminAPI.getSettings(),
        adminAPI.getCityIndexes()
      ]);
      if (serverSettings && typeof serverSettings === 'object') {
        setSettings((prev) => ({ ...prev, ...serverSettings }));
      }
      if (indexesResponse) {
        setCityIndexes(Array.isArray(indexesResponse) ? indexesResponse : (indexesResponse.data || []));
      }
    } catch (err) {
      setError('Could not load saved settings — showing defaults.');
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  const handleIndexChange = (city, state, val) => {
    setCityIndexes(prev => prev.map(ci => (ci.city === city && ci.state === state) ? { ...ci, cost_index: val } : ci));
  };

  const handleAddCityIndex = (e) => {
    e.preventDefault();
    setError('');
    if (!newCityName.trim() || !newCityState.trim()) {
      setError('City Name and State are required.');
      return;
    }
    const cleanCity = newCityName.trim();
    const cleanState = newCityState.trim();
    
    if (cityIndexes.some(ci => ci.city.toLowerCase() === cleanCity.toLowerCase() && ci.state.toLowerCase() === cleanState.toLowerCase())) {
      setError(`City "${cleanCity}" in state "${cleanState}" already exists in the cost indexes list.`);
      return;
    }

    const newRow = {
      city: cleanCity,
      state: cleanState,
      cost_index: parseFloat(newCityIndex) || 100.0
    };

    setCityIndexes(prev => [...prev, newRow]);
    setNewCityName('');
    setNewCityState('');
    setNewCityIndex('100');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const keys = Object.keys(settings);
      
      // Save global settings and city indexes concurrently
      await Promise.all([
        ...keys.map((k) => adminAPI.updateSetting(k, settings[k])),
        ...cityIndexes.map((ci) => adminAPI.updateCityIndex(ci.city, ci.cost_index, ci.state))
      ]);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '260px' };
  const numberInputStyle = { width: '120px' };

  return (
    <Layout role="admin">
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0b1120 0%, #0f2027 60%, rgba(15,118,110,0.15) 100%)',
        borderRadius: 'var(--border-radius-xl)',
        padding: '28px 36px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', right: 60, top: -30, width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(15,118,110,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(45,212,191,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
            Configuration
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            System Settings
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
            Global configuration for the BuildSmart platform
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', position: 'relative', zIndex: 1 }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSave}
            disabled={saving || loading}
            style={{ minWidth: '140px' }}
          >
            {saving ? '⏳ Saving…' : '💾 Save Changes'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {saved && (
        <div className="alert alert-green" style={{ marginBottom: 20 }}>
          <span className="alert-icon">✅</span>
          <div><div className="alert-title">Settings saved</div>All changes have been saved successfully.</div>
        </div>
      )}
      {error && (
        <div className="alert alert-amber" style={{ marginBottom: 16 }}>
          <span className="alert-icon">⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {/* General */}
      <SectionCard title="General">
        <SettingRow label="Application Name" sublabel="Displayed in the browser title and header across the platform">
          <input className="form-control" style={inputStyle} value={settings.app_name || ''}
            onChange={(e) => set('app_name', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Support Email" sublabel="Email address shown to users for support queries and notifications">
          <input className="form-control" style={inputStyle} value={settings.support_email || ''}
            onChange={(e) => set('support_email', e.target.value)} disabled={loading} />
        </SettingRow>
      </SectionCard>

      {/* Estimation Defaults */}
      <SectionCard title="Estimation Defaults">
        <SettingRow label="Default Contingency (%)" sublabel="Added as a buffer over subtotal in all AI-generated estimates. Recommended: 5%">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input className="form-control" type="number" style={numberInputStyle}
              value={settings.contingency_pct || ''} onChange={(e) => set('contingency_pct', e.target.value)}
              min="0" max="25" disabled={loading} />
            <span style={{ fontSize: '13px', color: 'var(--color-gray-500)', fontWeight: 500 }}>%</span>
          </div>
        </SettingRow>
        <SettingRow label="Default GST (%)" sublabel="Applied when generating client-facing quotations. Current standard: 18%">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input className="form-control" type="number" style={numberInputStyle}
              value={settings.default_gst_pct || ''} onChange={(e) => set('default_gst_pct', e.target.value)}
              min="0" max="28" disabled={loading} />
            <span style={{ fontSize: '13px', color: 'var(--color-gray-500)', fontWeight: 500 }}>%</span>
          </div>
        </SettingRow>
      </SectionCard>

      {/* User & Registration */}
      <SectionCard title="User & Registration">
        <SettingRow label="Max Projects per Builder" sublabel="Maximum number of estimates a single builder account can create on the platform">
          <input className="form-control" type="number" style={numberInputStyle}
            value={settings.max_projects_per_builder || ''} onChange={(e) => set('max_projects_per_builder', e.target.value)}
            min="1" disabled={loading} />
        </SettingRow>
      </SectionCard>

      {/* CPWD Cost Indexes */}
      <SectionCard title="CPWD Cost Indexes">
        <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--color-gray-400)', lineHeight: 1.5 }}>
          Define the inflation adjustment Cost Index for each city relative to the New Delhi baseline (100.0). Standard material and labour costs are scaled by this factor.
        </div>
        
        {/* Table list of city indexes */}
        <div className="table-wrapper" style={{ border: '1px solid var(--color-gray-200)', borderRadius: '8px', marginBottom: '24px', overflow: 'hidden' }}>
          <table style={{ margin: 0 }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ color: 'var(--color-gray-700)', fontWeight: 600, fontSize: '12px' }}>City Name</th>
                <th style={{ color: 'var(--color-gray-700)', fontWeight: 600, fontSize: '12px' }}>State</th>
                <th style={{ color: 'var(--color-gray-700)', fontWeight: 600, fontSize: '12px', width: '180px' }}>CPWD Cost Index</th>
              </tr>
            </thead>
            <tbody>
              {cityIndexes.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--color-gray-400)' }}>
                    No city indexes configured.
                  </td>
                </tr>
              ) : (
                cityIndexes.map((ci) => (
                  <tr key={`${ci.city}-${ci.state}`}>
                    <td className="td-bold">{ci.city}</td>
                    <td className="text-muted">{ci.state}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          className="form-control"
                          type="number"
                          style={{ width: '100px', height: '32px', padding: '4px 8px', fontSize: '13px' }}
                          value={ci.cost_index}
                          onChange={(e) => handleIndexChange(ci.city, ci.state, e.target.value)}
                          min="1"
                          step="0.1"
                          disabled={loading}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Form to add a new city index */}
        <div style={{
          background: 'rgba(15,118,110,0.03)',
          border: '1px dashed var(--color-primary-light)',
          borderRadius: '8px',
          padding: '16px 20px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '12px' }}>
            ＋ Add New City Cost Index
          </div>
          <form onSubmit={handleAddCityIndex} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>City Name *</label>
              <input
                className="form-control"
                style={{ height: '36px', fontSize: '13px' }}
                placeholder="e.g. Coimbatore"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                required
              />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>State *</label>
              <input
                className="form-control"
                style={{ height: '36px', fontSize: '13px' }}
                placeholder="e.g. Tamil Nadu"
                value={newCityState}
                onChange={(e) => setNewCityState(e.target.value)}
                required
              />
            </div>
            <div style={{ width: '120px' }}>
              <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Cost Index *</label>
              <input
                className="form-control"
                type="number"
                style={{ height: '36px', fontSize: '13px' }}
                placeholder="100"
                value={newCityIndex}
                onChange={(e) => setNewCityIndex(e.target.value)}
                min="1"
                step="0.1"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-secondary"
              style={{ height: '36px', padding: '0 16px', fontWeight: 600, fontSize: '13px' }}
            >
              Add City
            </button>
          </form>
        </div>
      </SectionCard>

      {/* Platform info footer */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '8px',
      }}>
        {[
          { label: 'Platform Version', value: 'v1.0.0', icon: '🚀', color: '#0f766e' },
          { label: 'Database', value: 'Supabase PostgreSQL', icon: '🗄️', color: '#2563eb' },
          { label: 'AI Engine', value: 'Rule-Based + Heuristics', icon: '🤖', color: '#7c3aed' },
        ].map((item) => (
          <div key={item.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--color-gray-200)',
            borderRadius: 'var(--border-radius-lg)', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '12px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: `${item.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-gray-800)', marginTop: '2px' }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
