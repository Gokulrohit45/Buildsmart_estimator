import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { authAPI, projectsAPI, getCurrentUser, saveAuthSession } from '../../services/api';

export default function Settings() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');

  const [globalSettings, setGlobalSettings] = useState({});

  // Initial load
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setCompanyName(user.company_name || '');
    setPhone(user.phone || '');
    setCity(user.city || '');
    setAvatarUrl(user.avatar_url || '');

    // Fetch settings
    projectsAPI.getSettings()
      .then(res => {
        if (res && typeof res === 'object') setGlobalSettings(res);
      })
      .catch(err => console.error('Failed to load settings', err));
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (max 5MB to fit high-res logos easily)
    if (file.size > 5242880) {
      setFileError('Profile picture/logo must be under 5 MB.');
      return;
    }
    setFileError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;

      // Convert to standard PNG to guarantee ReportLab compatibility (AVIF/WEBP etc.)
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 300;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const pngDataUrl = canvas.toDataURL('image/png');
        setAvatarUrl(pngDataUrl);
      };
      img.onerror = () => {
        // Fallback to raw data url if canvas drawing fails
        setAvatarUrl(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Profile Name / Company Name is required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess(null);

      const payload = {
        company_name: companyName,
        phone,
        city,
        avatar_url: avatarUrl
      };

      const res = await authAPI.updateProfile(payload);
      if (res && res.user) {
        // Save new user session details to localStorage (keeps JWT token same)
        const token = localStorage.getItem('bs_token');
        saveAuthSession(token, res.user);
        setSuccess('Profile updated successfully!');
        
        // Dispatch custom storage event so other components (Header, Sidebar) update
        window.dispatchEvent(new Event('storage'));
      } else {
        throw new Error('Failed to update profile.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred while updating profile.');
    } finally {
      setLoading(false);
    }
  };

  const initials = companyName
    ? companyName.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
    : (user?.email || '?')[0].toUpperCase();

  return (
    <Layout role="builder">
      {/* Hero Banner */}
      <div className="hero-banner" style={{ background: 'linear-gradient(135deg, #0b1120 0%, #0f172a 60%, #0f766e22 100%)', marginBottom: '28px' }}>
        <div className="hero-banner-label">Account Management</div>
        <div className="hero-banner-title">My Settings</div>
        <div className="hero-banner-sub">Customize your profile, business details, and configuration information</div>
      </div>

      {/* Message Banners */}
      {success && (
        <div className="alert alert-green" style={{ marginBottom: '24px' }}>
          <span className="alert-icon">✨</span>
          <div className="alert-body">
            <div className="alert-title">{success}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-red" style={{ marginBottom: '24px' }}>
          <span className="alert-icon">⚠️</span>
          <div className="alert-body">
            <div className="alert-title">{error}</div>
          </div>
        </div>
      )}

      <div className="grid-2col">
        {/* Left Col: Avatar Upload */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-primary)', marginBottom: '20px' }}>Profile Picture</div>
          
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
                boxShadow: '0 8px 24px rgba(15,118,110,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '36px',
                fontWeight: 700,
                overflow: 'hidden',
                border: '4px solid #ffffff'
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
            
            <label
              htmlFor="avatar-upload"
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#0f766e',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                border: '2px solid #ffffff',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              title="Upload profile picture"
            >
              📷
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', maxWidth: '200px', lineHeight: '1.5' }}>
            Supports JPG, PNG formats.<br />Max size 5 MB.<br />
            <span style={{ color: 'var(--color-teal-600)', fontWeight: 600 }}>This logo will appear on all generated PDF quotations.</span>
          </div>

          {fileError && (
            <div style={{ color: '#dc2626', fontSize: '11px', fontWeight: 600, marginTop: '10px' }}>
              ⚠️ {fileError}
            </div>
          )}

          {avatarUrl && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setAvatarUrl('')}
              style={{ color: 'var(--color-danger)', marginTop: '16px', fontSize: '12px' }}
            >
              Remove Logo
            </button>
          )}
        </div>

        {/* Right Col: Fields Form */}
        <div className="card" style={{ padding: '32px 36px' }}>
          <div style={{ borderBottom: '1px solid var(--color-gray-150)', paddingBottom: '14px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>Builder Profile Details</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-gray-450)', margin: '4px 0 0' }}>Update your corporate identification details shown on generated cost estimates</p>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Company Name / Construction Name <span style={{ color: '#dc2626' }}>*</span>
                <span style={{ fontSize: '11px', color: '#0f766e', marginLeft: '8px', fontWeight: '500' }}>(Appears as the main branding name on all PDF reports)</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. ABC Constructions"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div className="grid-2col" style={{ gap: '20px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>City</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Erode"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
              </div>
            </div>



            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  borderRadius: '50px',
                  padding: '11px 32px',
                  fontWeight: 700,
                  fontSize: '14px',
                  boxShadow: '0 4px 14px rgba(15,118,110,0.25)'
                }}
              >
                {loading ? '⏳ Saving Changes...' : '💾 Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Turnkey Inclusions Matrix */}
      <div className="card" style={{ marginTop: '28px', padding: '32px 36px' }}>
        <div style={{ borderBottom: '1px solid var(--color-gray-150)', paddingBottom: '14px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>Turnkey Package Inclusions Matrix</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-gray-450)', margin: '4px 0 0' }}>Review which feature add-ons are included by default in each construction package tier</p>
        </div>

        <div className="alert alert-teal" style={{ marginBottom: '24px' }}>
          <span className="alert-icon">ℹ️</span>
          <div className="alert-body">
            <div className="alert-title" style={{ fontSize: '12.5px', fontWeight: 600 }}>
              These package inclusion parameters are managed globally by the System Administrator. If you need default rules updated or checked/unchecked, please contact the Admin.
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--color-gray-200)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: 'var(--color-primary)' }}>Feature Add-on</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: 'var(--color-primary)' }}>Base Package</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: 'var(--color-primary)' }}>Standard Package</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: 'var(--color-primary)' }}>Premium Package</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: 'var(--color-primary)' }}>Luxury Package</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Compound Wall', key: 'compound_wall' },
                { label: 'Entrance Gate', key: 'gate' },
                { label: 'Underground Sump (Water Tank)', key: 'water_tank' },
                { label: 'Upper Water Tank', key: 'upper_water_tank' },
                { label: 'Septic Tank', key: 'septic_tank' },
                { label: 'Front Elevation', key: 'front_elevation' },
                { label: 'False Ceiling', key: 'false_ceiling' },
                { label: 'Wardrobes', key: 'wardrobes' },
                { label: 'Modular Kitchen', key: 'modular_kitchen' },
                { label: 'Surkhi Weathering Course', key: 'surkhi' }
              ].map((feature, idx) => (
                <tr key={feature.key} style={{ borderBottom: '1px solid var(--color-gray-150)', background: idx % 2 === 0 ? 'rgba(240,253,250,0.2)' : 'none' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--color-gray-800)' }}>{feature.label}</td>
                  {['base', 'standard', 'premium', 'luxury'].map((pkg) => {
                    const isIncluded = globalSettings[`include_${feature.key}_${pkg}`] === 'true';
                    return (
                      <td key={pkg} style={{ padding: '14px 16px', textAlign: 'center', fontSize: '16px' }}>
                        {isIncluded ? <span style={{ color: '#10b981' }}>✔️</span> : <span style={{ color: '#ef4444' }}>❌</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
