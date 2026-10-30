import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  Edit3,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  Globe2,
  ImagePlus,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Save,
  ShieldCheck,
  Store,
  Truck,
  X
} from 'lucide-react';
import { adminProfileAPI, footerAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';
import PageRefreshButton from '../components/PageRefreshButton';

const emptyForm = {
  admin_id: '',
  shop_name: '',
  email: '',
  mobile_no: '',
  images: '',
  address: '',
  landmark: '',
  gst_no: '',
  license_no: '',
  postalcode: '',
  delivery_eligible: '',
  web_url: '',
};

const emptyPasswordForm = {
  password: '',
  confirm_password: '',
};

function valueOrDash(value) {
  return value || '-';
}

function getFullImageUrl(url) {
  if (!url) return '';
  const value = String(url);
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }
  let path = value.replace(/^\/+/, '');
  if (path.startsWith('uploads/')) {
    path = path.substring(8);
  }
  return `https://offer360.in/uploads/${path}`;
}

function InfoField({ icon: Icon, label, value, children }) {
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label">
        <Icon size={14} /> {label}
      </label>
      <div
        style={{
          minHeight: '42px',
          padding: '10px 12px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          color: '#0F172A',
          fontWeight: 800,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          wordBreak: 'break-word'
        }}
      >
        {children || valueOrDash(value)}
      </div>
    </div>
  );
}

function EditField({ icon: Icon, label, type = 'text', value, onChange, placeholder, trailing }) {
  const autoComplete = type === 'password' ? 'new-password' : undefined;
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label">
        <Icon size={14} /> {label}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          className="form-input"
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          style={trailing ? { width: '100%', paddingRight: '44px', boxSizing: 'border-box' } : undefined}
        />
        {trailing}
      </div>
    </div>
  );
}

export default function Profile() {
  const { t } = useLanguage();
  const [form, setForm] = useState(emptyForm);
  const [savedForm, setSavedForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [footerLogoUrl, setFooterLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [showProfilePassword, setShowProfilePassword] = useState(false);

  const avatarText = useMemo(() => {
    const name = form.shop_name || form.email || 'Admin';
    return name.trim().slice(0, 2).toUpperCase();
  }, [form.shop_name, form.email]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminProfileAPI.getProfile();
      const data = response?.data || {};
      const loaded = {
        admin_id: data.admin_id || '',
        shop_name: data.shop_name || '',
        email: data.email || '',
        mobile_no: data.mobile_no || '',
        images: data.images || '',
        address: data.address || '',
        landmark: data.landmark || '',
        gst_no: data.gst_no || '',
        license_no: data.license_no || '',
        postalcode: data.postalcode || '',
        delivery_eligible: data.delivery_eligible || '',
        web_url: data.web_url || '',
      };
      setForm(loaded);
      setSavedForm(loaded);
      setImagePreview(getFullImageUrl(loaded.images));
    } catch (err) {
      setError(err.message || 'Unable to load admin profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadFooterLogo = async () => {
      try {
        const response = await footerAPI.getFooter();
        const data = Array.isArray(response?.data) ? response.data[0] : response?.data;
        if (mounted) setFooterLogoUrl(getFullImageUrl(data?.image_url || data?.image || ''));
      } catch (err) {
        console.error('Unable to load footer logo for profile avatar:', err);
      }
    };

    loadFooterLogo();
    window.addEventListener('footer-settings-updated', loadFooterLogo);
    return () => {
      mounted = false;
      window.removeEventListener('footer-settings-updated', loadFooterLogo);
    };
  }, []);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const password = passwordForm.password.trim();
    const confirmPassword = passwordForm.confirm_password.trim();
    if (password || confirmPassword) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Password and confirm password must match.');
        return;
      }
    }

    setSaving(true);

    try {
      const formData = new FormData();
      [
        'shop_name',
        'email',
        'mobile_no',
        'address',
        'landmark',
        'gst_no',
        'license_no',
        'postalcode',
        'delivery_eligible',
        'web_url',
      ].forEach((key) => {
        formData.append(key, form[key] ?? '');
      });

      if (imageFile) formData.append('images', imageFile);
      if (password) {
        formData.append('password', password);
        formData.append('confirm_password', confirmPassword);
      }

      await adminProfileAPI.updateProfile(formData);
      await loadProfile();
      window.dispatchEvent(new Event('admin-profile-updated'));
      setImageFile(null);
      setPasswordForm(emptyPasswordForm);
      setShowProfilePassword(false);
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Unable to update admin profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(savedForm);
    setImagePreview(savedForm.images || '');
    setImageFile(null);
    setPasswordForm(emptyPasswordForm);
    setShowProfilePassword(false);
    setEditing(false);
  };

  const deliveryEligible = String(form.delivery_eligible) === '1';
  const displayLogoUrl = imagePreview || footerLogoUrl;

  if (loading) {
    return (
      <div className="admin-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Loader2 className="animate-spin" size={22} color="#5B5FC7" />
        <span style={{ fontWeight: 800, color: '#475569' }}>{t('prof.loading')}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1 className="page-title">{t('prof.title')}</h1>
          <p style={{ color: '#64748B', fontWeight: 600, marginTop: '4px' }}>
            {t('prof.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <PageRefreshButton />
          {!editing && (
            <button className="btn-primary" onClick={() => setEditing(true)} style={{ gap: '6px' }}>
              <Edit3 size={16} />
              <span>{t('prof.edit_btn')}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '12px 16px', borderRadius: '12px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '18px' }}>
        <div className="admin-card" style={{ padding: 0, overflow: 'hidden', borderRadius: '18px' }}>
          <div
            style={{
              padding: '24px',
              background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 58%, #ECFDF5 100%)',
              borderBottom: '1px solid #E2E8F0',
              display: 'grid',
              gridTemplateColumns: '120px 1fr',
              gap: '20px',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                width: '112px',
                height: '112px',
                borderRadius: '22px',
                background: '#FFFFFF',
                border: '1px solid #DBEAFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                color: '#2563EB',
                fontSize: '2rem',
                fontWeight: 950,
                boxShadow: '0 14px 34px rgba(37,99,235,0.14)'
              }}
            >
              {displayLogoUrl ? (
                <img src={displayLogoUrl} alt={t('prof.img_alt')} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', padding: '12px', background: '#FFFFFF', boxSizing: 'border-box' }} />
              ) : (
                <span>{avatarText}</span>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: '999px', padding: '5px 10px', fontSize: '0.72rem', fontWeight: 900 }}>
                  <BadgeCheck size={14} /> Admin #{form.admin_id || '-'}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: deliveryEligible ? '#DCFCE7' : '#FEF3C7', color: deliveryEligible ? '#15803D' : '#B45309', border: `1px solid ${deliveryEligible ? '#86EFAC' : '#FCD34D'}`, borderRadius: '999px', padding: '5px 10px', fontSize: '0.72rem', fontWeight: 900 }}>
                  <Truck size={14} /> {deliveryEligible ? 'Delivery Eligible' : 'Delivery Not Eligible'}
                </span>
              </div>
              <h2 style={{ margin: 0, color: '#0F172A', fontSize: '1.55rem', fontWeight: 950 }}>
                {form.shop_name || t('prof.shop_name_fallback')}
              </h2>
              <p style={{ margin: '6px 0 0 0', color: '#475569', fontWeight: 700, lineHeight: 1.5 }}>
                {form.address || 'Store address not added'}
              </p>
              {editing && (
                <label className="btn-secondary" style={{ marginTop: '14px', justifyContent: 'center', cursor: 'pointer', width: 'fit-content' }}>
                  <ImagePlus size={16} />
                  <span>{t('prof.choose_image')}</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>

          <div style={{ padding: '22px', display: 'grid', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {editing ? (
                <>
                  <EditField icon={Store} label="Shop Name" value={form.shop_name} onChange={(value) => handleChange('shop_name', value)} placeholder={t('prof.ph_shop_name')} />
                  <EditField icon={Mail} label="Email" type="email" value={form.email} onChange={(value) => handleChange('email', value)} placeholder={t('prof.ph_email')} />
                  <EditField icon={Phone} label="Mobile No" value={form.mobile_no} onChange={(value) => handleChange('mobile_no', value)} placeholder="Enter mobile number" />
                  <EditField icon={Globe2} label="Website URL" type="url" value={form.web_url} onChange={(value) => handleChange('web_url', value)} placeholder="https://example.com" />
                </>
              ) : (
                <>
                  <InfoField icon={Store} label="Shop Name" value={form.shop_name} />
                  <InfoField icon={Mail} label="Email" value={form.email} />
                  <InfoField icon={Phone} label="Mobile No" value={form.mobile_no} />
                  <InfoField icon={Globe2} label="Website URL" value={form.web_url}>
                    {form.web_url ? (
                      <a href={form.web_url} target="_blank" rel="noreferrer" style={{ color: '#2563EB', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {form.web_url} <ExternalLink size={13} />
                      </a>
                    ) : '-'}
                  </InfoField>
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {editing ? (
                <>
                  <EditField icon={ShieldCheck} label="GST No" value={form.gst_no} onChange={(value) => handleChange('gst_no', value)} placeholder="Enter GST number" />
                  <EditField icon={FileText} label="License No" value={form.license_no} onChange={(value) => handleChange('license_no', value)} placeholder="Enter license number" />
                  <EditField icon={Navigation} label="Landmark" value={form.landmark} onChange={(value) => handleChange('landmark', value)} placeholder={t('prof.ph_landmark')} />
                  <EditField icon={Building2} label="Postal Code" value={form.postalcode} onChange={(value) => handleChange('postalcode', value)} placeholder={t('prof.ph_postal_code')} />
                </>
              ) : (
                <>
                  <InfoField icon={ShieldCheck} label="GST No" value={form.gst_no} />
                  <InfoField icon={FileText} label="License No" value={form.license_no} />
                  <InfoField icon={Navigation} label="Landmark" value={form.landmark} />
                  <InfoField icon={Building2} label="Postal Code" value={form.postalcode} />
                </>
              )}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label"><MapPin size={14} /> Address</label>
              {editing ? (
                <textarea className="form-input" rows={4} value={form.address} onChange={(event) => handleChange('address', event.target.value)} placeholder={t('prof.ph_address')} />
              ) : (
                <div style={{ padding: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#0F172A', fontWeight: 750, fontSize: '0.92rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {form.address || '-'}
                </div>
              )}
            </div>

            {editing && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <EditField
                  icon={Lock}
                  label="Set Password"
                  type={showProfilePassword ? 'text' : 'password'}
                  value={passwordForm.password}
                  onChange={(value) => handlePasswordChange('password', value)}
                  placeholder="Minimum 8 characters"
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowProfilePassword((current) => !current)}
                      aria-label={showProfilePassword ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: '11px', top: 0, bottom: 0, height: '100%', border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}
                    >
                      {showProfilePassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  }
                />
                <EditField
                  icon={Lock}
                  label="Confirm Password"
                  type={showProfilePassword ? 'text' : 'password'}
                  value={passwordForm.confirm_password}
                  onChange={(value) => handlePasswordChange('confirm_password', value)}
                  placeholder="Re-enter password"
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowProfilePassword((current) => !current)}
                      aria-label={showProfilePassword ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: '11px', top: 0, bottom: 0, height: '100%', border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}
                    >
                      {showProfilePassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  }
                />
              </div>
            )}

            {editing && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #F1F5F9', paddingTop: '16px', flexWrap: 'wrap' }}>
                <button type="button" className="btn-secondary" onClick={handleCancel} disabled={saving} style={{ gap: '6px' }}>
                  <X size={16} />
                  <span>{t('prof.cancel')}</span>
                </button>
                <button type="submit" className="btn-primary" disabled={saving} style={{ gap: '6px' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{saving ? t('prof.saving') : t('prof.update')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
