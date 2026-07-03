import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { adminAPI } from '../../services/api';

const DEFAULT_SETTINGS = {
  // Defaults
  contingency_pct: '5',

  // Construction Package Rates
  rate_package_base: '2100',
  rate_package_standard: '2400',
  rate_package_premium: '2600',
  rate_package_luxury: '2800',

  // Additional Works Rates
  rate_compound_wall: '50',
  rate_water_tank: '5',
  rate_septic_tank: '8',
  rate_front_elevation: '120',
  rate_interior: '150',
  rate_open_portico: '800',

  // False Ceiling Rates
  rate_false_ceiling_base: '10',
  rate_false_ceiling_standard: '15',
  rate_false_ceiling_premium: '20',
  rate_false_ceiling_luxury: '25',

  // UPVC Wardrobes Rates
  rate_wardrobe_quality1: '260',
  rate_wardrobe_quality2: '280',
  rate_wardrobe_quality3: '300',
  rate_wardrobe_quality4: '320',

  // Wood Wardrobes Rates
  rate_wardrobe_wood_quality1: '330',
  rate_wardrobe_wood_quality2: '340',
  rate_wardrobe_wood_quality3: '350',
  rate_wardrobe_wood_quality4: '360',

  // Entrance Gate Rates
  rate_gate_base: '50',
  rate_gate_standard: '60',
  rate_gate_premium: '80',
  rate_gate_luxury: '90',

  // Tiles Rates
  rate_tiles_floor_base: '50',
  rate_tiles_floor_standard: '60',
  rate_tiles_floor_premium: '80',
  rate_tiles_floor_luxury: '100',

  rate_tiles_bath_floor_base: '50',
  rate_tiles_bath_floor_standard: '60',
  rate_tiles_bath_floor_premium: '80',
  rate_tiles_bath_floor_luxury: '100',

  rate_tiles_bath_wall_base: '50',
  rate_tiles_bath_wall_standard: '60',
  rate_tiles_bath_wall_premium: '80',
  rate_tiles_bath_wall_luxury: '100',

  rate_tiles_kitchen_wall_base: '50',
  rate_tiles_kitchen_wall_standard: '60',
  rate_tiles_kitchen_wall_premium: '80',
  rate_tiles_kitchen_wall_luxury: '100',

  rate_tiles_portico_base: '50',
  rate_tiles_portico_standard: '60',
  rate_tiles_portico_premium: '80',
  rate_tiles_portico_luxury: '100',

  // Modular Kitchen Rates
  rate_modular_kitchen_base: '20',
  rate_modular_kitchen_standard: '25',
  rate_modular_kitchen_premium: '30',
  rate_modular_kitchen_luxury: '40'
};

const SECTION_ICONS = {
  'Estimation Defaults': '🧮',
  'Construction Package Rates': '🏗️',
  'Additional Works Rates': '🛠️',
  'Entrance Gate Rates': '🚧',
  'False Ceiling Rates': '📐',
  'UPVC Wardrobes Rates': '🚪',
  'Wood Wardrobes Rates': '🪵',
  'Tiles Package Rates': '🧱',
  'Modular Kitchen Rates': '🍳'
};

function SettingRow({ label, sublabel, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '16px 0', borderBottom: '1px solid var(--color-gray-100)', gap: '24px',
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

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const serverSettings = await adminAPI.getSettings();
      if (serverSettings && typeof serverSettings === 'object') {
        setSettings((prev) => ({ ...prev, ...serverSettings }));
      }
    } catch (err) {
      setError('Could not load saved settings — showing defaults.');
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const keys = Object.keys(settings);
      await Promise.all(
        keys.map((k) => adminAPI.updateSetting(k, settings[k]))
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

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
            Package &amp; Add-on Rates
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
            Manage construction package values and add-on unit pricing rates
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
          <div><div className="alert-title">Settings saved</div>All package rates and add-on pricing updated successfully.</div>
        </div>
      )}
      {error && (
        <div className="alert alert-amber" style={{ marginBottom: 16 }}>
          <span className="alert-icon">⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {/* Estimation Defaults */}
      <SectionCard title="Estimation Defaults">
        <SettingRow label="Default Contingency (%)" sublabel="Added as a buffer over subtotal in all estimates">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input className="form-control" type="number" style={numberInputStyle}
              value={settings.contingency_pct || ''} onChange={(e) => set('contingency_pct', e.target.value)}
              min="0" max="25" disabled={loading} />
            <span style={{ fontSize: '13px', color: 'var(--color-gray-500)', fontWeight: 500 }}>%</span>
          </div>
        </SettingRow>
      </SectionCard>

      {/* Package Rates */}
      <SectionCard title="Construction Package Rates">
        <SettingRow label="Base Package Rate (₹/sqft)" sublabel="Rate for Base construction package (Standard is ₹2,100)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_package_base || ''}
            onChange={(e) => set('rate_package_base', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Standard Package Rate (₹/sqft)" sublabel="Rate for Standard construction package (Standard is ₹2,400)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_package_standard || ''}
            onChange={(e) => set('rate_package_standard', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Premium Package Rate (₹/sqft)" sublabel="Rate for Premium construction package (Standard is ₹2,600)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_package_premium || ''}
            onChange={(e) => set('rate_package_premium', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Luxury Package Rate (₹/sqft)" sublabel="Rate for Luxury construction package (Standard is ₹2,800)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_package_luxury || ''}
            onChange={(e) => set('rate_package_luxury', e.target.value)} disabled={loading} />
        </SettingRow>
      </SectionCard>

      {/* Additional Works Rates */}
      <SectionCard title="Additional Works Rates">
        <SettingRow label="Compound Wall Rate (₹/sqft)" sublabel="Compound Wall Construction rate (Default is ₹50)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_compound_wall || ''}
            onChange={(e) => set('rate_compound_wall', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Underground Water Tank Rate (₹/litre)" sublabel="Sump tank rate per capacity litre (Default is ₹5)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_water_tank || ''}
            onChange={(e) => set('rate_water_tank', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Septic Tank Rate (₹/litre)" sublabel="Septic tank rate per capacity litre (Default is ₹8)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_septic_tank || ''}
            onChange={(e) => set('rate_septic_tank', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Front Elevation Rate (₹/sqft)" sublabel="Facade designer front elevation rate (Default is ₹120)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_front_elevation || ''}
            onChange={(e) => set('rate_front_elevation', e.target.value)} disabled={loading} />
        </SettingRow>
      </SectionCard>

      {/* False Ceiling Rates */}
      <SectionCard title="False Ceiling Rates">
        <SettingRow label="Base Package False Ceiling (₹/sqft)" sublabel="Ceiling rate under Base package (Default is ₹10)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_false_ceiling_base || ''}
            onChange={(e) => set('rate_false_ceiling_base', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Standard Package False Ceiling (₹/sqft)" sublabel="Ceiling rate under Standard package (Default is ₹15)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_false_ceiling_standard || ''}
            onChange={(e) => set('rate_false_ceiling_standard', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Premium Package False Ceiling (₹/sqft)" sublabel="Ceiling rate under Premium package (Default is ₹20)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_false_ceiling_premium || ''}
            onChange={(e) => set('rate_false_ceiling_premium', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Luxury Package False Ceiling (₹/sqft)" sublabel="Ceiling rate under Luxury package (Default is ₹25)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_false_ceiling_luxury || ''}
            onChange={(e) => set('rate_false_ceiling_luxury', e.target.value)} disabled={loading} />
        </SettingRow>
      </SectionCard>

      {/* UPVC Wardrobes Rates */}
      <SectionCard title="UPVC Wardrobes Rates">
        <SettingRow label="UPVC Quality 1 (₹/sqft)" sublabel="UPVC wardrobe rate under Quality 1 (Default is ₹260)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_wardrobe_quality1 || ''}
            onChange={(e) => set('rate_wardrobe_quality1', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="UPVC Quality 2 (₹/sqft)" sublabel="UPVC wardrobe rate under Quality 2 (Default is ₹280)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_wardrobe_quality2 || ''}
            onChange={(e) => set('rate_wardrobe_quality2', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="UPVC Quality 3 (₹/sqft)" sublabel="UPVC wardrobe rate under Quality 3 (Default is ₹300)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_wardrobe_quality3 || ''}
            onChange={(e) => set('rate_wardrobe_quality3', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="UPVC Quality 4 (₹/sqft)" sublabel="UPVC wardrobe rate under Quality 4 (Default is ₹320)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_wardrobe_quality4 || ''}
            onChange={(e) => set('rate_wardrobe_quality4', e.target.value)} disabled={loading} />
        </SettingRow>
      </SectionCard>

      {/* Wood Wardrobes Rates */}
      <SectionCard title="Wood Wardrobes Rates">
        <SettingRow label="Wood Quality 1 (₹/sqft)" sublabel="Wood wardrobe rate under Quality 1 (Default is ₹330)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_wardrobe_wood_quality1 || ''}
            onChange={(e) => set('rate_wardrobe_wood_quality1', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Wood Quality 2 (₹/sqft)" sublabel="Wood wardrobe rate under Quality 2 (Default is ₹340)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_wardrobe_wood_quality2 || ''}
            onChange={(e) => set('rate_wardrobe_wood_quality2', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Wood Quality 3 (₹/sqft)" sublabel="Wood wardrobe rate under Quality 3 (Default is ₹350)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_wardrobe_wood_quality3 || ''}
            onChange={(e) => set('rate_wardrobe_wood_quality3', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Wood Quality 4 (₹/sqft)" sublabel="Wood wardrobe rate under Quality 4 (Default is ₹360)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_wardrobe_wood_quality4 || ''}
            onChange={(e) => set('rate_wardrobe_wood_quality4', e.target.value)} disabled={loading} />
        </SettingRow>
      </SectionCard>

      {/* Entrance Gate Rates */}
      <SectionCard title="Entrance Gate Rates">
        <SettingRow label="Base Gate Package (₹/sqft)" sublabel="Gate fabrication rate under Base quality (Default is ₹50)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_gate_base || ''}
            onChange={(e) => set('rate_gate_base', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Standard Gate Package (₹/sqft)" sublabel="Gate fabrication rate under Standard quality (Default is ₹60)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_gate_standard || ''}
            onChange={(e) => set('rate_gate_standard', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Premium Gate Package (₹/sqft)" sublabel="Gate fabrication rate under Premium quality (Default is ₹80)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_gate_premium || ''}
            onChange={(e) => set('rate_gate_premium', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Luxury Gate Package (₹/sqft)" sublabel="Gate fabrication rate under Luxury quality (Default is ₹90)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_gate_luxury || ''}
            onChange={(e) => set('rate_gate_luxury', e.target.value)} disabled={loading} />
        </SettingRow>
      </SectionCard>


      {/* Modular Kitchen Rates */}
      <SectionCard title="Modular Kitchen Rates">
        <SettingRow label="Base Modular Kitchen (₹/sqft)" sublabel="Kitchen carpentry rate under Base (Default is ₹20)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_modular_kitchen_base || ''}
            onChange={(e) => set('rate_modular_kitchen_base', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Standard Modular Kitchen (₹/sqft)" sublabel="Kitchen carpentry rate under Standard (Default is ₹25)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_modular_kitchen_standard || ''}
            onChange={(e) => set('rate_modular_kitchen_standard', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Premium Modular Kitchen (₹/sqft)" sublabel="Kitchen carpentry rate under Premium (Default is ₹30)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_modular_kitchen_premium || ''}
            onChange={(e) => set('rate_modular_kitchen_premium', e.target.value)} disabled={loading} />
        </SettingRow>
        <SettingRow label="Luxury Modular Kitchen (₹/sqft)" sublabel="Kitchen carpentry rate under Luxury (Default is ₹40)">
          <input className="form-control" type="number" style={numberInputStyle} value={settings.rate_modular_kitchen_luxury || ''}
            onChange={(e) => set('rate_modular_kitchen_luxury', e.target.value)} disabled={loading} />
        </SettingRow>
      </SectionCard>
    </Layout>
  );
}
