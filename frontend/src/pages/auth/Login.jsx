import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, saveAuthSession } from '../../services/api';

/* ─── Hook: tracks window width for responsive rendering ─── */
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}


export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('builder');
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({
    email: '', password: '', company_name: '', phone: '', city: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: Send OTP, 2: Verify OTP, 3: Reset Password
  const [forgotOtp, setForgotOtp] = useState('');
  const [newForgotPwd, setNewForgotPwd] = useState('');
  const [confirmForgotPwd, setConfirmForgotPwd] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const validatePassword = (password) => {
    if (password.length < 12) {
      return 'Password must be at least 12 characters long.';
    }
    if (password.length > 128) {
      return 'Password must not exceed 128 characters.';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter.';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter.';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number.';
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      return 'Password must contain at least one special character.';
    }
    return null;
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '#4b5563' };
    let score = 0;
    if (pwd.length >= 12) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;
    
    if (score <= 1) return { score, label: 'Weak 🔴', color: '#ef4444' };
    if (score <= 3) return { score, label: 'Medium 🟡', color: '#eab308' };
    return { score, label: 'Strong 🟢', color: '#22c55e' };
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authAPI.forgotPassword(forgotEmail.trim());
      setSuccess('A 6-digit OTP code has been sent to your email.');
      setForgotStep(2);
      setResendTimer(60);
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!forgotOtp.trim()) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authAPI.verifyOtp(forgotEmail.trim(), forgotOtp.trim());
      setSuccess('OTP verified! Please enter your new password.');
      setForgotStep(3);
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newForgotPwd || !confirmForgotPwd) {
      setError('Please fill in all password fields.');
      return;
    }
    const pwdErr = validatePassword(newForgotPwd);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    if (newForgotPwd !== confirmForgotPwd) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      localStorage.removeItem('bs_token');
      localStorage.removeItem('bs_user');
      await authAPI.resetPassword(forgotEmail.trim(), forgotOtp.trim(), newForgotPwd);
      setSuccess('Password has been reset successfully! You can now log in.');
      setMode('login');
      setNewForgotPwd('');
      setConfirmForgotPwd('');
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
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
      if (data.password_expired) {
        setError('Your password has expired (90 days). You must reset it before logging in.');
        setForgotEmail(form.email.trim());
        setMode('forgot-password');
        return;
      }
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

    const pwdErr = validatePassword(form.password);
    if (pwdErr) {
      setError(pwdErr);
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
      });
      setSuccess('Registration successful! You can now log in directly.');
      setMode('login');
      setForm({ email: '', password: '', company_name: '', phone: '', city: '' });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isMobile = useWindowWidth() <= 768;

  return (
    <div style={{ ...styles.page, flexDirection: isMobile ? 'column' : 'row', overflowY: isMobile ? 'auto' : 'hidden' }}>
      <div style={styles.bgImage} />
      <div style={styles.overlay} />

      {/* Left branding — hidden on mobile */}
      {!isMobile && (
      <div style={styles.brandingArea}>
        <div style={styles.logoWrap}>
          <div style={styles.logoBox}>BS</div>
          <div>
            <div style={styles.logoName}>Buildsmart 360</div>
            <div style={styles.logoSub}>AI Estimator Platform</div>
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
      )}

      {/* Card Wrapper */}
      <div style={{
        ...styles.cardWrap,
        minWidth: isMobile ? 'unset' : '440px',
        width: isMobile ? '100%' : 'auto',
        padding: isMobile ? '32px 16px' : '40px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}>
        {/* Mobile Header block (Logo + Tagline + Stats) */}
        {isMobile && (
          <div style={{
            width: '100%',
            maxWidth: '408px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: '24px',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px', color: 'white', boxShadow: '0 4px 14px rgba(15,118,110,0.4)' }}>BS</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Buildsmart 360</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>AI Estimator Platform</div>
              </div>
            </div>

            {/* Tagline */}
            <div style={{ fontSize: '24px', fontWeight: 900, color: 'white', lineHeight: 1.3, letterSpacing: '-0.02em', marginBottom: '8px' }}>
              Accurate estimates.<br />
              <span style={styles.taglineAccent}>Built for Indian builders.</span>
            </div>

            {/* Sub-tagline */}
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '16px' }}>
              Generate detailed BOQs, material quantities & breakdowns in minutes
            </div>

            {/* Stat Row */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', width: '100%' }}>
              {[
                { label: 'Builders', value: '500+' },
                { label: 'Estimates', value: '12,000+' },
                { label: 'Cities', value: '25+' },
              ].map((s) => (
                <div key={s.label} style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px', padding: '6px 4px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 900, background: 'linear-gradient(90deg, #2dd4bf, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.value}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{
          ...styles.card,
          maxWidth: isMobile ? '100%' : '408px',
          padding: isMobile ? '28px 22px 22px' : '38px 38px 30px',
          width: '100%',
        }}>

          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              {mode === 'login' ? 'Sign in to Buildsmart 360' : 'Create Account'}
            </div>
            <div style={styles.cardSub}>
              {mode === 'login' ? 'Enter your credentials to continue' : 'Register as a builder'}
            </div>
          </div>

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  style={styles.input}
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>
              <div style={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={styles.label}>Password</label>
                  <button
                    type="button"
                    style={styles.forgotBtn}
                    onClick={() => {
                      setMode('forgot');
                      setForgotEmail(form.email);
                      setForgotStep(1);
                      setForgotOtp('');
                      setNewForgotPwd('');
                      setConfirmForgotPwd('');
                      setError('');
                      setSuccess('');
                    }}
                  >
                    Forgot password?
                  </button>
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
                {loading ? 'Signing in...' : 'Sign in →'}
              </button>

              <div style={styles.switchMode}>
                New builder?{' '}
                <button type="button" style={styles.linkBtn} onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>
                  Register here
                </button>
              </div>
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
              </div>              <div style={styles.formGroup}>
                <label style={styles.label}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...styles.input, paddingRight: '42px' }}
                    type={showRegisterPassword ? "text" : "password"}
                    name="password"
                    placeholder="At least 12 characters with symbol, number, caps"
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
                {form.password && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                    Password Strength: <span style={{ color: getPasswordStrength(form.password).color, fontWeight: 'bold' }}>{getPasswordStrength(form.password).label}</span>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', height: '4px' }}>
                      <div style={{ flex: 1, height: '100%', backgroundColor: getPasswordStrength(form.password).score >= 1 ? getPasswordStrength(form.password).color : '#374151', borderRadius: '2px' }}></div>
                      <div style={{ flex: 1, height: '100%', backgroundColor: getPasswordStrength(form.password).score >= 3 ? getPasswordStrength(form.password).color : '#374151', borderRadius: '2px' }}></div>
                      <div style={{ flex: 1, height: '100%', backgroundColor: getPasswordStrength(form.password).score >= 4 ? getPasswordStrength(form.password).color : '#374151', borderRadius: '2px' }}></div>
                    </div>
                  </div>
                )}
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

          {/* Forgot Password Flow */}
          {mode === 'forgot' && (
            <div>
              <div style={styles.cardHeader}>
                <div style={styles.cardTitle}>Reset Password</div>
                <div style={styles.cardSub}>
                  {forgotStep === 1 && 'Enter your email to receive a password reset OTP'}
                  {forgotStep === 2 && `Enter the 6-digit OTP sent to ${forgotEmail}`}
                  {forgotStep === 3 && 'Enter and confirm your new password'}
                </div>
              </div>

              {forgotStep === 1 && (
                <form onSubmit={handleSendOtp}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email Address</label>
                    <input
                      style={styles.input}
                      type="email"
                      placeholder="builder@company.com"
                      value={forgotEmail}
                      onChange={(e) => { setForgotEmail(e.target.value); setError(''); setSuccess(''); }}
                      required
                    />
                  </div>

                  {error && <div style={styles.errorBox}>⚠ {error}</div>}
                  {success && <div style={styles.successBox}>✓ {success}</div>}

                  <button
                    type="submit"
                    style={{ ...styles.submitBtn, opacity: loading ? 0.75 : 1 }}
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send OTP via Email →'}
                  </button>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleVerifyOtp}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>One-Time Password (OTP)</label>
                    <input
                      style={{ ...styles.input, textAlign: 'center', letterSpacing: '4px', fontSize: '18px', fontWeight: 'bold' }}
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => { setForgotOtp(e.target.value.replace(/\D/g, '')); setError(''); setSuccess(''); }}
                      required
                    />
                  </div>

                  {error && <div style={styles.errorBox}>⚠ {error}</div>}
                  {success && <div style={styles.successBox}>✓ {success}</div>}

                  <button
                    type="submit"
                    style={{ ...styles.submitBtn, opacity: loading ? 0.75 : 1 }}
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'Verify OTP Code →'}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <button
                      type="button"
                      style={{ ...styles.linkBtn, color: resendTimer > 0 ? 'rgba(255,255,255,0.3)' : '#2dd4bf' }}
                      onClick={handleSendOtp}
                      disabled={resendTimer > 0 || loading}
                    >
                      {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                    </button>
                  </div>
                </form>
              )}

              {forgotStep === 3 && (
                <form onSubmit={handleResetPassword}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>New Password</label>
                    <input
                      style={styles.input}
                      type="password"
                      placeholder="At least 12 characters with symbol, number, caps"
                      value={newForgotPwd}
                      onChange={(e) => { setNewForgotPwd(e.target.value); setError(''); setSuccess(''); }}
                      required
                    />
                    {newForgotPwd && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                        Password Strength: <span style={{ color: getPasswordStrength(newForgotPwd).color, fontWeight: 'bold' }}>{getPasswordStrength(newForgotPwd).label}</span>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', height: '4px' }}>
                          <div style={{ flex: 1, height: '100%', backgroundColor: getPasswordStrength(newForgotPwd).score >= 1 ? getPasswordStrength(newForgotPwd).color : '#374151', borderRadius: '2px' }}></div>
                          <div style={{ flex: 1, height: '100%', backgroundColor: getPasswordStrength(newForgotPwd).score >= 3 ? getPasswordStrength(newForgotPwd).color : '#374151', borderRadius: '2px' }}></div>
                          <div style={{ flex: 1, height: '100%', backgroundColor: getPasswordStrength(newForgotPwd).score >= 4 ? getPasswordStrength(newForgotPwd).color : '#374151', borderRadius: '2px' }}></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Confirm New Password</label>
                    <input
                      style={styles.input}
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmForgotPwd}
                      onChange={(e) => { setConfirmForgotPwd(e.target.value); setError(''); setSuccess(''); }}
                      required
                    />
                  </div>

                  {error && <div style={styles.errorBox}>⚠ {error}</div>}
                  {success && <div style={styles.successBox}>✓ {success}</div>}

                  <button
                    type="submit"
                    style={{ ...styles.submitBtn, opacity: loading ? 0.75 : 1 }}
                    disabled={loading}
                  >
                    {loading ? 'Resetting...' : 'Reset Password & Log In →'}
                  </button>
                </form>
              )}

              <div style={styles.switchMode}>
                Remembered your password?{' '}
                <button type="button" style={styles.linkBtn} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={styles.footerNote}>
          © 2026 Buildsmart 360 · Built for Indian Construction Industry
          <div style={{ marginTop: '8px' }}>
            <button 
              type="button" 
              style={styles.privacyLink} 
              onClick={() => setShowPrivacyModal(true)}
            >
              Privacy Policy & Terms of Service
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Policy & Terms Modal */}
      {showPrivacyModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Privacy Policy & Terms of Service</h3>
              <button 
                type="button" 
                style={styles.modalCloseBtn} 
                onClick={() => setShowPrivacyModal(false)}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              <h4 style={styles.sectionHeader}>1. Introduction</h4>
              <p style={styles.paragraph}>
                Welcome to BuildSmart 360 ("we", "our", or "us"). We are committed to protecting the business and personal data of construction professionals and builders using our platform. This policy explains what information we collect, how we store it, and your rights under Indian data protection regulations (DPDP Act).
              </p>
              
              <h4 style={styles.sectionHeader}>2. Information Collection</h4>
              <p style={styles.paragraph}>
                We collect minimum business profile details necessary for verification and account setup:
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>Company Name / Business Entity</li>
                  <li>Registered Business Email & Phone Number</li>
                  <li>City of Operation</li>
                </ul>
                All cost estimate details, material selections, and project layouts are stored under your owner account boundaries. We do not sell or share your business data.
              </p>

              <h4 style={styles.sectionHeader}>3. Data Security & Storage</h4>
              <p style={styles.paragraph}>
                All account databases, estimation items, and files are hosted securely in the cloud utilizing AES-256 block-level Transparent Data Encryption (TDE) at rest. Communication between your browser and our server is secured using SSL/TLS encryption.
              </p>

              <h4 style={styles.sectionHeader}>4. Your Rights (Deletion & Access)</h4>
              <p style={styles.paragraph}>
                You retain complete ownership over your account data. You have the right to request permanent deletion of your profile, projects, and cost estimates. Deleting your account will cascade-purge all linked assets permanently from our cloud databases.
              </p>

              <h4 style={styles.sectionHeader}>5. Terms of Service</h4>
              <p style={styles.paragraph}>
                By registering on BuildSmart 360, you agree to supply authentic business credentials. The estimations calculated by our AI engine are based on localized rates and standard engineering coefficients, and should be verified prior to signing formal commercial construction contracts.
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button 
                type="button" 
                style={styles.modalCloseActionBtn} 
                onClick={() => setShowPrivacyModal(false)}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
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
  forgotBtn: {
    background: 'none', border: 'none', color: '#2dd4bf', fontWeight: 600, fontSize: '11px',
    cursor: 'pointer', fontFamily: 'inherit', padding: 0, textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  footerNote: { marginTop: '18px', fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' },
  privacyLink: {
    background: 'none',
    border: 'none',
    color: '#2dd4bf',
    fontSize: '11px',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
    marginTop: '4px',
    fontFamily: 'inherit',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(4, 9, 20, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    width: '100%',
    maxWidth: '600px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '85vh',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(90deg, #2dd4bf, #38bdf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
    lineHeight: 1,
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '14px',
    lineHeight: '1.6',
    textAlign: 'left',
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    marginTop: '20px',
    marginBottom: '8px',
  },
  paragraph: {
    marginBottom: '16px',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  modalCloseActionBtn: {
    backgroundColor: '#0f766e',
    color: '#ffffff',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(15,118,110,0.3)',
  }
};
