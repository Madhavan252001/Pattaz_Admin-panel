import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Sparkles, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const isSuperAdmin =
            user.role_name?.toLowerCase() === 'superadmin' ||
            user.admin_name?.toLowerCase() === 'superadmin' ||
            user.role?.toLowerCase() === 'superadmin' ||
            user.email === 'superadmin@rsfireworks.com';
          if (isSuperAdmin) {
            navigate('/super-dashboard', { replace: true });
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Specific input validations for end-user
    if (!email.trim() && !password.trim()) {
      setError(t('login.err_email_pass_empty'));
      return;
    }

    if (!email.trim()) {
      setError(t('login.err_email_empty'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t('login.err_email_invalid'));
      return;
    }

    if (!password.trim()) {
      setError(t('login.err_password_empty'));
      return;
    }

    if (email.trim() === 'superadmin@rsfireworks.com' && password.trim() === 'superadmin123') {
      // Hardcoded Super Admin Login
      setLoading(true);
      setTimeout(() => {
        const superUserData = {
          name: 'Super Admin',
          email: 'superadmin@rsfireworks.com',
          role: 'superadmin',
          token: 'mock-superadmin-token'
        };
        localStorage.setItem('token', superUserData.token);
        localStorage.setItem('user', JSON.stringify(superUserData));
        setLoading(false);
        navigate('/super-dashboard', { replace: true });
      }, 500);
      return;
    }

    try {
      setLoading(true);
      const res = await authAPI.login({ email, password });

      // API success status verification
      if (res.status === true && res.data && res.data.length > 0) {
        const userData = res.data[0];
        localStorage.setItem('token', userData.token);
        localStorage.setItem('user', JSON.stringify(userData));
        // Backend returns role_name: "SuperAdmin" for super admin accounts
        const isSuperAdmin =
          userData.role_name?.toLowerCase() === 'superadmin' ||
          userData.admin_name?.toLowerCase() === 'superadmin' ||
          userData.role?.toLowerCase() === 'superadmin' ||
          userData.email === 'superadmin@rsfireworks.com';
        if (isSuperAdmin) {
          navigate('/super-dashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        // Backend returns status: false — clear any stale old token to prevent 403 flood
        localStorage.clear();
        sessionStorage.clear();
        setError(t('login.err_incorrect'));
      }
    } catch (err) {
      // Clear stale tokens on error too
      localStorage.clear();
      sessionStorage.clear();
      setError(err.message || t('login.err_incorrect'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Animated Fireworks & Glow Background Elements */}
      <div className="login-bg-animated">
        <div className="login-glow-sphere sphere-1"></div>
        <div className="login-glow-sphere sphere-2"></div>
        <div className="login-glow-sphere sphere-3"></div>
        <div className="login-particle particle-1"></div>
        <div className="login-particle particle-2"></div>
        <div className="login-particle particle-3"></div>
        <div className="login-particle particle-4"></div>
      </div>

      <div className="login-card">
        <div className="login-brand-header">
          <img className="login-logo-img" src={`${process.env.PUBLIC_URL}/login-logo.png`} alt="Logo" />
          <p>{t('login.title')}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label className="form-label">{t('login.username')}</label>
            <div className="login-input-wrapper">
              <User size={18} className="login-input-icon" />
              <input
                type="email"
                className="login-input"
                placeholder={t('login.enter_email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="login-input-group">
            <label className="form-label">{t('login.password')}</label>
            <div className="login-input-wrapper">
              <Lock size={18} className="login-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder={t('login.enter_password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login-eye-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? t('login.hide_password') : t('login.show_password')}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="login-error-msg">{error}</div>}

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{t('login.signing_in')}</span>
              </>
            ) : (
              <>
                <span>{t('login.sign_in')}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer-hint">
          <Sparkles size={14} color="#5B5FC7" />
          <span>{t('login.access_hint')}</span>
        </div>
      </div>
    </div>
  );
}
