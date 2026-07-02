import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, saveAuthSession } from '../../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('builder');
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({
    email: '', password: '', company_name: '', phone: '', city: '', gstin: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await authAPI.login(form.email, form.password);
      saveAuthSession(data.token, data.user);
      if (data.user.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.company_name || !form.city) {
      setError('Please fill in all required fields (Email, Password, Company Name, City).');
      return;
    }
    
    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    // Phone regex validation (if entered)
    if (form.phone && form.phone.trim()) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(form.phone.trim())) {
        setError('Please enter a valid 10-digit phone number starting with 6-9.');
        return;
      }
    }
    setLoading(true);
    try {
      await authAPI.register({
        email: form.email,
        password: form.password,
        company_name: form.company_name,
        phone: form.phone,
        city: form.city,
        gstin: form.gstin,
      });
      setSuccess('Registration successful! You can now log in directly.');
      setMode('login');
      setForm({ email: '', password: '', company_name: '', phone: '', city: '', gstin: '' });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgImage} />
      <div style={styles.overlay} />

      {/* Left branding */}
      <div style={styles.brandingArea}>
        <div style={styles.logoWrap}>
          <div style={styles.logoBox}>BS</div>
          <div>
            <div style={styles.logoName}>BuildSmart AI</div>
            <div style={styles.logoSub}>Construction Estimator</div>
          </div>
        </div>

        <div style={styles.tagline}>
          Accurate estimates.<br />
          <span style={styles.taglineAccent}>Built for Indian builders.</span>
        </div>

        <p style={styles.brandDesc}>
          Generate detailed BOQs, material quantities,<br />
          cost breakdowns, and project timelines in minutes.
        </p>

        <div style={styles.featureList}>
          {[
            'Itemized Bill of Quantities (BOQ)',
            'City-wise rate adjustments across India',
            'AI-powered construction recommendations',
            'Instant PDF & Excel export',
          ].map((f) => (
            <div key={f} style={styles.featureItem}>
              <div style={styles.featureDot} />
              <span style={styles.featureText}>{f}</span>
            </div>
          ))}
        </div>

        <div style={styles.statRow}>
          {[
            { label: 'Builders', value: '500+' },
            { label: 'Estimates', value: '12,000+' },
            { label: 'Cities', value: '25+' },
          ].map((s) => (
            <div key={s.label} style={styles.statPill}>
              <div style={styles.statVal}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div style={styles.cardWrap}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              {mode === 'login' ? 'Sign in to BuildSmart' : 'Create Account'}
            </div>
            <div style={styles.cardSub}>
              {mode === 'login' ? 'Enter your credentials to continue' : 'Register as a builder'}
            </div>
          </div>

          {/* Role Tabs (login mode only) */}
          {mode === 'login' && (
            <div style={styles.tabRow}>
              <button
                style={{ ...styles.tabBtn, ...(tab === 'builder' ? styles.tabBtnActive : {}) }}
                onClick={() => setTab('builder')}
              >
                🏗 Builder
              </button>
              <button
                style={{ ...styles.tabBtn, ...(tab === 'admin' ? styles.tabBtnActive : {}) }}
                onClick={() => setTab('admin')}
              >
                🔐 Admin
              </button>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  style={styles.input}
                  type="email"
                  name="email"
                  placeholder={tab === 'admin' ? 'admin@buildsmart.in' : 'builder@company.com'}
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>
              <div style={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={styles.label}>Password</label>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...styles.input, paddingRight: '42px' }}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)',
                      fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0
                    }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              {error && <div style={styles.errorBox}>⚠ {error}</div>}
              {success && <div style={styles.successBox}>✓ {success}</div>}

              <button
                type="submit"
                style={{ ...styles.submitBtn, opacity: loading ? 0.75 : 1 }}
                disabled={loading}
              >
                {loading ? 'Signing in...' : `Sign in as ${tab === 'admin' ? 'Admin' : 'Builder'} →`}
              </button>

              {tab === 'builder' && (
                <div style={styles.switchMode}>
                  New builder?{' '}
                  <button type="button" style={styles.linkBtn} onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>
                    Register here
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Company Name *</label>
                <input style={styles.input} type="text" name="company_name" placeholder="ABC Constructions Pvt Ltd" value={form.company_name} onChange={handleChange} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address *</label>
                <input style={styles.input} type="email" name="email" placeholder="builder@company.com" value={form.email} onChange={handleChange} autoComplete="email" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...styles.input, paddingRight: '42px' }}
                    type={showRegisterPassword ? "text" : "password"}
                    name="password"
                    placeholder="Minimum 6 characters"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)',
                      fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0
                    }}
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  >
                    {showRegisterPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Phone</label>
                  <input style={styles.input} type="tel" name="phone" placeholder="+91 98000 00000" value={form.phone} onChange={handleChange} />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>City *</label>
                  <input style={styles.input} type="text" name="city" placeholder="Mumbai" value={form.city} onChange={handleChange} />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>GSTIN (optional)</label>
                <input style={styles.input} type="text" name="gstin" placeholder="22AAAAA0000A1Z5" value={form.gstin} onChange={handleChange} />
              </div>

              {error && <div style={styles.errorBox}>⚠ {error}</div>}
              {success && <div style={styles.successBox}>✓ {success}</div>}

              <button
                type="submit"
                style={{ ...styles.submitBtn, opacity: loading ? 0.75 : 1 }}
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Submit Registration →'}
              </button>

              <div style={styles.switchMode}>
                Already have an account?{' '}
                <button type="button" style={styles.linkBtn} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
                  Sign in
                </button>
              </div>
            </form>
          )}
        </div>

        <div style={styles.footerNote}>
          © 2026 BuildSmart AI · Built for Indian Construction Industry
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ─── */
const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  bgImage: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'url(/construction_bg.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: 0,
    filter: 'brightness(0.85)',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(120deg, rgba(4,9,20,0.90) 0%, rgba(4,12,25,0.65) 50%, rgba(4,9,20,0.88) 100%)',
    zIndex: 1,
  },
  brandingArea: {
    flex: 1,
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '60px 56px',
    maxWidth: '600px',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '56px' },
  logoBox: {
    width: '48px', height: '48px',
    background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
    borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: '18px', color: 'white', flexShrink: 0,
    boxShadow: '0 6px 20px rgba(15,118,110,0.5)',
    letterSpacing: '-0.5px',
  },
  logoName: { fontSize: '20px', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.2 },
  logoSub: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '2px' },
  tagline: { fontSize: '40px', fontWeight: 900, color: 'white', lineHeight: 1.2, letterSpacing: '-0.03em', marginBottom: '18px' },
  taglineAccent: { background: 'linear-gradient(90deg, #2dd4bf, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
  brandDesc: { fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: '40px' },
  featureList: { display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '48px' },
  featureItem: { display: 'flex', alignItems: 'center', gap: '10px' },
  featureDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#2dd4bf', flexShrink: 0, boxShadow: '0 0 8px rgba(45,212,191,0.6)' },
  featureText: { fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 400 },
  statRow: { display: 'flex', gap: '12px' },
  statPill: {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '14px', padding: '14px 24px', textAlign: 'center',
    transition: 'all 0.2s ease',
  },
  statVal: { fontSize: '22px', fontWeight: 900, background: 'linear-gradient(90deg, #2dd4bf, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.02em' },
  statLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '3px', fontWeight: 600 },
  cardWrap: {
    position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center', padding: '40px 48px', minWidth: '440px',
  },
  card: {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.14)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
    padding: '38px 38px 30px', width: '100%', maxWidth: '408px',
  },
  cardHeader: { marginBottom: '28px' },
  cardTitle: { fontSize: '22px', fontWeight: 900, color: 'rgba(255,255,255,0.96)', letterSpacing: '-0.02em', marginBottom: '5px' },
  cardSub: { fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 400 },
  tabRow: {
    display: 'flex', gap: '6px', marginBottom: '24px',
    background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '4px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  tabBtn: {
    flex: 1, padding: '8px 0', borderRadius: '7px', border: 'none', background: 'transparent',
    fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.50)', cursor: 'pointer',
    transition: 'all 0.18s ease', fontFamily: 'inherit',
  },
  tabBtnActive: { background: 'linear-gradient(135deg, rgba(15,118,110,0.85), rgba(8,145,178,0.70))', color: 'white', fontWeight: 700, boxShadow: '0 4px 12px rgba(15,118,110,0.35)' },
  formGroup: { marginBottom: '14px' },
  formRow: { display: 'flex', gap: '12px' },
  label: { display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: '7px', letterSpacing: '0.07em', textTransform: 'uppercase' },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: '10px',
    border: '1.5px solid rgba(255,255,255,0.14)',
    fontSize: '13px', color: 'rgba(255,255,255,0.92)', background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', outline: 'none',
    transition: 'all 0.2s ease', fontFamily: 'inherit', boxSizing: 'border-box', fontWeight: 500,
  },
  errorBox: {
    background: 'rgba(220,38,38,0.20)', border: '1px solid rgba(220,38,38,0.35)', color: '#fca5a5',
    borderRadius: '8px', padding: '10px 14px', fontSize: '12px', marginBottom: '14px',
  },
  successBox: {
    background: 'rgba(5,150,105,0.20)', border: '1px solid rgba(5,150,105,0.35)', color: '#6ee7b7',
    borderRadius: '8px', padding: '10px 14px', fontSize: '12px', marginBottom: '14px',
  },
  submitBtn: {
    width: '100%', padding: '12px',
    background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px', fontSize: '14px', fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.02em', fontFamily: 'inherit',
    transition: 'all 0.2s ease', marginBottom: '12px',
    boxShadow: '0 6px 24px rgba(15,118,110,0.50)',
  },
  switchMode: { textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' },
  linkBtn: {
    background: 'none', border: 'none', color: '#2dd4bf', fontWeight: 600, fontSize: '12px',
    cursor: 'pointer', fontFamily: 'inherit', padding: 0,
  },
  footerNote: { marginTop: '18px', fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' },
};
