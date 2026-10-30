import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import toast from 'react-hot-toast';
import { footerAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';
import useWebsitePreviewUrl from '../hooks/useWebsitePreviewUrl';

import {
  Save, Building, MapPin, Phone, Mail, FileText, AtSign,
  CheckCircle2, Eye, Share2, MessageCircle, Link, Loader2,
  AlertCircle, Edit2, X, ChevronRight, ShieldCheck, Truck, CreditCard, Package
} from 'lucide-react';

const POWERED_BY_TEXT = 'Powered By Offer360';

const getUserCopyrightText = (value = '') => String(value)
  .replace(new RegExp(`\\s*[|·-]?\\s*${POWERED_BY_TEXT}\\s*$`, 'i'), '')
  .trim();

const formatCopyrightText = (value = '') => {
  const userText = getUserCopyrightText(value);
  return userText ? `${userText} | ${POWERED_BY_TEXT}` : POWERED_BY_TEXT;
};

function getFullImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  let path = url.replace(/^\/+/, '');
  if (path.startsWith('uploads/')) {
    path = path.substring(8);
  }
  return `https://offer360.in/uploads/${path}`;
}

// ── Helper: read-only info row ──────────────────────────────────────────────
function InfoRow({ icon, label, value }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  if (!value) return null;
  const short = value.length > 120;
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
      <div style={{ color: '#94A3B8', flexShrink: 0, marginTop: '2px' }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '0.88rem', color: '#1E293B', fontWeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.5' }}>
          {short && !expanded ? value.slice(0, 120) + '...' : value}
        </div>
        {short && (
          <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: '#7C3AED', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: '2px 0', marginTop: '2px' }}>
            {expanded ? t('foot.show_less') : t('foot.read_more')}
          </button>
        )}
      </div>
    </div>
  );
}

function CharCounter({ current, max }) {
  const pct = current / max;
  let color = '#475569';
  let bg = '#F1F5F9';
  let border = '#E2E8F0';
  if (pct > 0.95) { color = '#DC2626'; bg = '#FEE2E2'; border = '#FCA5A5'; }
  else if (pct > 0.80) { color = '#D97706'; bg = '#FEF3C7'; border = '#FDE68A'; }
  return (
    <span style={{ fontSize: '0.7rem', color, fontWeight: 700, background: bg, padding: '2px 8px', borderRadius: '10px', border: `1px solid ${border}` }}>
      {current}/{max}
    </span>
  );
}

// ── Helper: card section header ─────────────────────────────────────────────
function CardHeader({ icon, iconBg, iconColor, title, isEditing, onEdit, onCancel, saving, onSave }) {
  const { t } = useLanguage();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {React.cloneElement(icon, { size: 18, color: iconColor })}
        </div>
        {title}
      </h3>

      {!isEditing ? (
        <button
          type="button"
          onClick={onEdit}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '8px', border: '1.5px solid #C7D2FE',
            background: '#EEF2FF', color: '#5B5FC7', fontSize: '0.82rem', fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#5B5FC7'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = '#5B5FC7'; }}
        >
          <Edit2 size={14} /> {t('foot.edit')}
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px', borderRadius: '8px', border: '1.5px solid #E2E8F0',
              background: '#F8FAFC', color: '#64748B', fontSize: '0.82rem', fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <X size={14} /> {t('foot.cancel')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 14px', borderRadius: '8px', border: 'none',
              background: saving ? '#94A3B8' : '#5B5FC7', color: '#fff',
              fontSize: '0.82rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s'
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? t('foot.saving') : t('foot.save')}
          </button>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
export default function Footer() {
  const { t } = useLanguage();

  // Saved (server) data
  const [saved, setSaved] = useState({
    shop_name: '', shop_address: '', city: '', phone: '', whatsapp: '', upi_number: '',
    email: '', facebook_link: '', instagram_link: '',
    google_map_link: '',
    copyrights_notice: '', description: '', footer_terms: '',
    image: ''
  });

  // Draft copies per card (only populated while editing)
  const [draft, setDraft] = useState({});
  const [logoFile, setLogoFile] = useState(null);

  // Which card is currently in edit mode: null | 'shop' | 'contact' | 'social'
  const [editingCard, setEditingCard] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsgValue] = useState('');
  const setErrorMsg = (message) => { setErrorMsgValue(message); if (message) toast.error(message); };
  const [previewVersion] = useState(() => Date.now());
  const { getPreviewUrl } = useWebsitePreviewUrl();
  const rightRef = useRef(null);    
  const [fixedStyle, setFixedStyle] = useState({});

  useLayoutEffect(() => {
    const updatePreviewPosition = () => {
      if (!rightRef.current) return;
      const rect = rightRef.current.getBoundingClientRect();
      setFixedStyle({
        position: 'fixed',
        top: '96px',
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      });
    };

    updatePreviewPosition();
    window.addEventListener('resize', updatePreviewPosition);
    const observer = typeof ResizeObserver !== 'undefined' && rightRef.current
      ? new ResizeObserver(updatePreviewPosition)
      : null;
    if (observer && rightRef.current) observer.observe(rightRef.current);
    return () => {
      window.removeEventListener('resize', updatePreviewPosition);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => { fetchFooterSettings(); }, []);

  const fetchFooterSettings = async () => {
    try {
      setLoading(true);
      const res = await footerAPI.getFooter();
      if (res.success && res.data) {
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        if (data) {
          setHasExisting(true);
          setSaved({
            shop_name: data.shop_name || '',
            shop_address: data.shop_address || '',
            city: data.city || '',
            phone: data.phone || '',
            whatsapp: data.whatsapp || '',
            upi_number: data.upi_number || '',
            email: data.email || '',
            facebook_link: data.facebook_link || '',
            instagram_link: data.instagram_link || data.instegram_link || '',
            youtube_link: data.youtube_link || '',
            google_map_link: data.google_map_link || '',
            copyrights_notice: getUserCopyrightText(data.copyrights_notice || ''),
            description: data.description || '',
            footer_terms: data.footer_terms || '',
            image: data.image_url || data.image || ''
          });
        }
      }
    } catch (err) {
      console.error('Error fetching footer:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open edit mode for a card — clone saved values into draft
  const openEdit = (card) => {
    setDraft({ ...saved });
    setEditingCard(card);
    setLogoFile(null);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const cancelEdit = () => {
    setEditingCard(null);
    setDraft({});
    setLogoFile(null);
  };

  const handleDraftChange = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  // Save a specific card
  const saveCard = async () => {
    try {
      setSaving(true);
      setErrorMsg('');

      // Merge draft into existing saved for the full payload
      const merged = { ...saved, ...draft };

      const fd = new FormData();
      fd.append('shop_name', merged.shop_name || '');
      fd.append('shop_address', merged.shop_address || '');
      fd.append('city', merged.city || '');
      fd.append('phone', merged.phone || '');
      fd.append('whatsapp', merged.whatsapp || '');
      fd.append('upi_number', merged.upi_number || '');
      fd.append('email', merged.email || '');
      fd.append('facebook_link', merged.facebook_link || '');
      fd.append('instagram_link', merged.instagram_link || '');
      fd.append('instegram_link', merged.instagram_link || '');
      fd.append('youtube_link', merged.youtube_link || '');
      fd.append('google_map_link', merged.google_map_link || '');
      fd.append('copyrights_notice', formatCopyrightText(merged.copyrights_notice));
      fd.append('footer_terms', merged.footer_terms || '');
      fd.append('description', merged.description || '');

      // Only append new image file if selected
      if (logoFile) {
        fd.append('image', logoFile);
      }

      let res;
      if (hasExisting) {
        res = await footerAPI.updateFooter(fd);
      } else {
        res = await footerAPI.createFooter(fd);
      }

      if (res.success) {
        setSuccessMsg(t('foot.success_saved'));
        setEditingCard(null);
        setDraft({});
        setLogoFile(null);
        fetchFooterSettings(); // reload to fetch new image url
        window.dispatchEvent(new Event('footer-settings-updated'));
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(res.message || t('foot.error_save'));
      }
    } catch (err) {
      setErrorMsg(err.message || t('foot.error_connect'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px', gap: '10px', color: '#5B5FC7' }}>
        <Loader2 className="animate-spin" size={24} />
        <span style={{ fontWeight: 700 }}>{t('foot.loading')}</span>
      </div>
    );
  }

  const isEditingShop    = editingCard === 'shop';
  const isEditingContact = editingCard === 'contact';
  const isEditingSocial  = editingCard === 'social';

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 84px)', overflow: 'hidden' }}>

      {/* Page Title */}
      <div className="page-title-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building size={24} color="#5B5FC7" />
            {t('foot.page_title')}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '4px', fontWeight: 600 }}>
            {t('foot.page_subtitle')}
          </p>
        </div>
      </div>

      {/* Success Banner */}

      {/* Error Banner */}
      {false && errorMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 18px', background: '#FEE2E2', color: '#EF4444',
          borderRadius: '12px', marginBottom: '20px', fontWeight: 700,
          border: '1px solid #FCA5A5'
        }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}>
            <X size={16} />
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '35% 1fr', gap: '16px', alignItems: 'start' }}>

        {/* EDIT CARDS — row of 3 cards side by side */}
        <div className="hide-scrollbar" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', alignItems: 'start', maxHeight: 'calc(100vh - 170px)', overflowY: 'auto', overflowX: 'hidden', paddingRight: '6px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

          {/* ── CARD 1: Shop Info & Description ── */}
          <div className="admin-card">
            <CardHeader
              icon={<Building />}
              iconBg="#EEF2FF"
              iconColor="#5B5FC7"
              title={t('foot.card_shop')}
              isEditing={isEditingShop}
              onEdit={() => openEdit('shop')}
              onCancel={cancelEdit}
              saving={saving}
              onSave={saveCard}
            />

            {!isEditingShop ? (
              /* VIEW MODE — description shows only if API returns a value */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', borderRadius: '12px', marginBottom: '4px' }}>
                  {saved.image ? (
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '14px', overflow: 'hidden', border: '2px solid #E2E8F0', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                        <img
                          src={getFullImageUrl(saved.image)}
                          alt="Shop Logo"
                          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }}
                        />
                      </div>
                      <div style={{ position: 'absolute', bottom: '-3px', right: '-3px', width: '18px', height: '18px', borderRadius: '50%', background: '#10B981', border: '2px solid #F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={10} color="#fff" />
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: '64px', height: '64px', borderRadius: '14px', background: 'linear-gradient(135deg,#E2E8F0,#CBD5E1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px dashed #94A3B8' }}>
                      <Building size={24} color="#94A3B8" />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('foot.label_shop_logo')}</div>
                    {saved.image ? (
                      <span style={{ fontSize: '0.82rem', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={13} /> {t('foot.logo_uploaded')}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: '#94A3B8', fontStyle: 'italic' }}>{t('foot.no_logo')}</span>
                    )}
                  </div>
                </div>

                <InfoRow icon={<Building size={15} />} label={t('foot.label_shop_name')} value={saved.shop_name} />
                <InfoRow icon={<FileText size={15} />} label={t('foot.label_description')} value={saved.description} />
                <InfoRow icon={<FileText size={15} />} label={t('foot.label_footer_terms')} value={saved.footer_terms} />

                {!saved.shop_name && !saved.description && !saved.footer_terms && !saved.image && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#CBD5E1', fontSize: '0.85rem' }}>
                    {t('foot.empty_shop_before')} <strong>{t('foot.edit')}</strong> {t('foot.empty_shop_after')}
                  </div>
                )}
              </div>
            ) : (
              /* EDIT MODE */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{t('foot.label_shop_logo_image')}</label>
                  <div style={{ border: '2px dashed #CBD5E1', borderRadius: '10px', padding: '12px', background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                    {logoFile ? (
                      <img src={URL.createObjectURL(logoFile)} alt="Logo Preview" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '6px', background: '#FFF', border: '1px solid #E2E8F0' }} />
                    ) : saved.image ? (
                      <img src={getFullImageUrl(saved.image)} alt="Current Logo" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '6px', background: '#FFF', border: '1px solid #E2E8F0' }} />
                    ) : (
                      <div style={{ width: '60px', height: '60px', borderRadius: '6px', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building size={24} color="#94A3B8" />
                      </div>
                    )}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                        {logoFile ? logoFile.name : t('foot.select_logo')}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{t('foot.file_formats')}</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) setLogoFile(file);
                      }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Link size={14} color="#FF0000" /> {t('foot.label_youtube_link')}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={draft.youtube_link || ''}
                      onChange={e => handleDraftChange('youtube_link', e.target.value)}
                      placeholder="https://youtube.com/..."
                    />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{t('foot.label_shop_name')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={draft.shop_name || ''}
                    onChange={e => handleDraftChange('shop_name', e.target.value)}
                    placeholder={t('foot.placeholder_shop_name')}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{t('foot.label_description')}</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    maxLength={500}
                    style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                    value={draft.description || ''}
                    onChange={e => handleDraftChange('description', e.target.value)}
                    placeholder={t('foot.placeholder_description')}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{t('foot.max_500_chars')}</span>
                    <CharCounter current={draft.description?.length || 0} max={500} />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{t('foot.label_footer_terms_policy')}</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    maxLength={1500}
                    value={draft.footer_terms || ''}
                    onChange={e => handleDraftChange('footer_terms', e.target.value)}
                    placeholder={t('foot.placeholder_footer_terms')}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{t('foot.max_1500_chars')}</span>
                    <CharCounter current={draft.footer_terms?.length || 0} max={1500} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── CARD 2: Contact Details ── */}
          <div className="admin-card">
            <CardHeader
              icon={<Phone />}
              iconBg="#FEF3C7"
              iconColor="#D97706"
              title={t('foot.card_contact')}
              isEditing={isEditingContact}
              onEdit={() => openEdit('contact')}
              onCancel={cancelEdit}
              saving={saving}
              onSave={saveCard}
            />

            {!isEditingContact ? (
              /* VIEW MODE */
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <InfoRow icon={<MapPin size={15} />} label={t('foot.label_address')} value={saved.shop_address} />
                <InfoRow icon={<Building size={15} />} label={t('foot.label_city')} value={saved.city} />
                <InfoRow icon={<Phone size={15} />} label={t('foot.label_phone')} value={saved.phone} />
                <InfoRow icon={<MessageCircle size={15} />} label={t('foot.label_whatsapp')} value={saved.whatsapp} />
                <InfoRow icon={<CreditCard size={15} />} label="UPI Number" value={saved.upi_number} />
                <InfoRow icon={<Mail size={15} />} label={t('foot.label_email')} value={saved.email} />
                {!saved.shop_address && !saved.city && !saved.phone && !saved.whatsapp && !saved.upi_number && !saved.email && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#CBD5E1', fontSize: '0.85rem' }}>
                    {t('foot.empty_contact_before')} <strong>{t('foot.edit')}</strong> {t('foot.empty_contact_after')}
                  </div>
                )}
              </div>
            ) : (
              /* EDIT MODE */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={14} color="#64748B" /> {t('foot.label_shop_address')}
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={draft.shop_address || ''}
                    onChange={e => handleDraftChange('shop_address', e.target.value)}
                    placeholder={t('foot.placeholder_shop_address')}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Building size={14} color="#64748B" /> {t('foot.label_city')}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={draft.city || ''}
                    onChange={e => handleDraftChange('city', e.target.value)}
                    placeholder={t('foot.placeholder_city')}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Phone size={14} color="#64748B" /> {t('foot.label_phone')}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={draft.phone || ''}
                      onChange={e => handleDraftChange('phone', e.target.value)}
                      placeholder={t('foot.placeholder_phone')}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MessageCircle size={14} color="#25D366" /> {t('foot.label_whatsapp')}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={draft.whatsapp || ''}
                      onChange={e => handleDraftChange('whatsapp', e.target.value)}
                      placeholder={t('foot.placeholder_whatsapp')}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CreditCard size={14} color="#64748B" /> UPI Number
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={draft.upi_number || ''}
                    onChange={e => handleDraftChange('upi_number', e.target.value)}
                    placeholder="Enter UPI number"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Mail size={14} color="#64748B" /> {t('foot.label_email')}
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={draft.email || ''}
                    onChange={e => handleDraftChange('email', e.target.value)}
                    placeholder={t('foot.placeholder_email')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── CARD 3: Social Media & Copyright ── */}
          <div className="admin-card">
            <CardHeader
              icon={<Share2 />}
              iconBg="#DCFCE7"
              iconColor="#10B981"
              title={t('foot.card_social')}
              isEditing={isEditingSocial}
              onEdit={() => openEdit('social')}
              onCancel={cancelEdit}
              saving={saving}
              onSave={saveCard}
            />

            {!isEditingSocial ? (
              /* VIEW MODE */
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <InfoRow icon={<Link size={15} />} label={t('foot.label_facebook')} value={saved.facebook_link} />
                <InfoRow icon={<Link size={15} />} label={t('foot.label_instagram')} value={saved.instagram_link} />
                <InfoRow icon={<Link size={15} />} label={t('foot.label_youtube')} value={saved.youtube_link} />
                <InfoRow icon={<MapPin size={15} />} label={t('foot.label_google_map')} value={saved.google_map_link} />
                <InfoRow icon={<AtSign size={15} />} label={t('foot.label_copyright')} value={saved.copyrights_notice} />
                {!saved.facebook_link && !saved.instagram_link && !saved.youtube_link && !saved.google_map_link && !saved.copyrights_notice && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#CBD5E1', fontSize: '0.85rem' }}>
                    {t('foot.empty_social_before')} <strong>{t('foot.edit')}</strong> {t('foot.empty_social_after')}
                  </div>
                )}
              </div>
            ) : (
              /* EDIT MODE */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Link size={14} color="#1877F2" /> {t('foot.label_facebook_link')}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={draft.facebook_link || ''}
                      onChange={e => handleDraftChange('facebook_link', e.target.value)}
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Link size={14} color="#E4405F" /> {t('foot.label_instagram_link')}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={draft.instagram_link || ''}
                      onChange={e => handleDraftChange('instagram_link', e.target.value)}
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Link size={14} color="#FF0000" /> {t('foot.label_youtube_link')}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                  value={draft.youtube_link || ''}
                  onChange={e => handleDraftChange('youtube_link', e.target.value)}
                  placeholder="https://youtube.com/..."
                />
              </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={14} color="#10B981" /> {t('foot.label_google_map_link')}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={draft.google_map_link || ''}
                    onChange={e => handleDraftChange('google_map_link', e.target.value)}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <AtSign size={14} color="#64748B" /> {t('foot.label_copyright')}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={draft.copyrights_notice || ''}
                    onChange={e => handleDraftChange('copyrights_notice', e.target.value)}
                    placeholder={t('foot.placeholder_copyright')}
                  />
                  <div style={{ marginTop: '6px', color: '#64748B', fontSize: '0.75rem', fontWeight: 700 }}>
                    Fixed footer text: <span style={{ color: '#5B5FC7' }}>{POWERED_BY_TEXT}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* LIVE WEBSITE PREVIEW */}
        <div ref={rightRef} style={{ minWidth: 0, minHeight: 'calc(100vh - 110px)' }}>
          <div style={{ ...fixedStyle, zIndex: 50, minWidth: 0, maxHeight: 'calc(100vh - 110px)', overflow: 'hidden', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 16px 40px rgba(15, 23, 42, 0.14)', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Eye size={17} color="#5B5FC7" />
              </div>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>{t('foot.live_preview')}</span>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: '#DCFCE7', color: '#15803D', fontSize: '0.72rem', fontWeight: 800 }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E' }} /> Live
            </span>
          </div>

            {/* ── Exact website footer replica ── */}
            <div style={{ borderRadius: '14px', overflow: 'hidden', boxShadow: '0 16px 40px rgba(15, 23, 42, 0.14)', border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
              <iframe
                key={getPreviewUrl(previewVersion)}
                title="Shiva Crackers footer website preview"
                src={getPreviewUrl(previewVersion)}
                style={{ width: '100%', height: 'calc(100vh - 168px)', minHeight: '560px', border: 0, display: 'block', background: '#fff' }}
              />
            </div>

            <div style={{ display: 'none', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,0.45)', border: '1px solid #1E293B', fontSize: '13px' }}>

              {/* Top: Trust badges strip */}
              <div style={{ background: '#0D1428', borderBottom: '1px solid #1E2D45', padding: '14px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { icon: <ShieldCheck size={18} />, text: '100% பாதுகாப்பான சான்றளிக்கப்பட்டது', sub: t('foot.trust_sub_safe') },
                  { icon: <Truck size={18} />, text: 'பாதுகாப்பான மற்றும் வேகமான விரிவாகம்', sub: t('foot.trust_sub_delivery') },
                  { icon: <CreditCard size={18} />, text: '100% பாதுகாப்பான Razorpay ஆன்லைன் கட்டணம்', sub: t('foot.trust_sub_payment') },
                  { icon: <Package size={18} />, text: 'ஆர்டர் கண்காணிப்பு', sub: t('foot.trust_sub_tracking') },
                ].map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ color: '#F59E0B', flexShrink: 0, marginTop: '1px' }}>{b.icon}</div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#E2E8F0', lineHeight: 1.4 }}>{b.text}</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748B', lineHeight: 1.4, marginTop: '2px' }}>{b.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Main footer body — 4 columns */}
              <div style={{ background: '#0B1628', padding: '28px 24px', display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1.4fr', gap: '24px' }}>

                {/* Col 1 — Brand */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Logo + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {saved.image ? (
                      <img
                        src={getFullImageUrl(saved.image)}
                        alt="Shop Logo"
                        style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)' }}
                      />
                    ) : (
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#D97706,#EF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                        {(saved.shop_name || 'S').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
                        {saved.shop_name || <span style={{ color: '#475569', fontStyle: 'italic' }}>{t('foot.label_shop_name')}</span>}
                      </div>
                      <div style={{ fontSize: '0.58rem', color: '#94A3B8' }}>{saved.description ? saved.description.substring(0, 40) : 'சிவகாசி நேரடி பட்டாசு கடை'}</div>
                    </div>
                  </div>

                  {saved.description && (
                    <p style={{ fontSize: '0.65rem', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>{saved.description}</p>
                  )}

                  {saved.footer_terms && (
                    <p style={{ fontSize: '0.6rem', color: '#64748B', lineHeight: 1.5, margin: 0, borderTop: '1px solid #1E293B', paddingTop: '8px' }}>{saved.footer_terms}</p>
                  )}

                  {/* Licensed badge */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #D97706', borderRadius: '20px', padding: '3px 10px', width: 'fit-content', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.58rem', color: '#D97706', fontWeight: 700, letterSpacing: '0.04em' }}>{t('foot.licensed_store')}</span>
                  </div>

                  {/* Social icons */}
                  {(saved.facebook_link || saved.instagram_link || saved.youtube_link) && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {saved.facebook_link && (
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(24,119,242,0.4)' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                        </div>
                      )}
                      {saved.instagram_link && (
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#F58529,#DD2A7B,#8134AF,#515BD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(221,42,123,0.4)' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                        </div>
                      )}
                      {saved.youtube_link && (
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#FF0000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(255,0,0,0.4)' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/></svg>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Col 2 — Quick Links */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px 0', paddingBottom: '6px', borderBottom: '2px solid #D97706', display: 'inline-block' }}>விரைவு இணைப்புகள்</h4>
                  {['முகப்பு', 'பொருட்கள்', 'சலுகைகள்', 'பாதுகாப்பு'].map(link => (
                    <span key={link} style={{ fontSize: '0.65rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <ChevronRight size={9} color="#D97706" /> {link}
                    </span>
                  ))}
                </div>

                {/* Col 3 — Order Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px 0', paddingBottom: '6px', borderBottom: '2px solid #D97706', display: 'inline-block' }}>ஆர்டர் சுருக்கம்</h4>
                  {['கடை', 'ஆர்டர் கண்காணிப்பு', 'தொடர்பு'].map(link => (
                    <span key={link} style={{ fontSize: '0.65rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <ChevronRight size={9} color="#D97706" /> {link}
                    </span>
                  ))}
                </div>

                {/* Col 4 — Contact */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px 0', paddingBottom: '6px', borderBottom: '2px solid #D97706', display: 'inline-block' }}>தொடர்பு விவரங்கள்</h4>

                  {saved.shop_address && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <MapPin size={11} color="#F59E0B" style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span style={{ fontSize: '0.62rem', color: '#94A3B8', lineHeight: 1.5 }}>{saved.shop_address}</span>
                    </div>
                  )}
                  {(saved.phone || saved.whatsapp) && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <Phone size={11} color="#F59E0B" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.62rem', color: '#94A3B8' }}>
                        {[saved.phone, saved.whatsapp].filter(Boolean).join(' / ')}
                      </span>
                    </div>
                  )}
                  {saved.upi_number && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <CreditCard size={11} color="#F59E0B" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.62rem', color: '#94A3B8' }}>{saved.upi_number}</span>
                    </div>
                  )}
                  {saved.email && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <Mail size={11} color="#F59E0B" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.62rem', color: '#94A3B8' }}>{saved.email}</span>
                    </div>
                  )}

                  {!saved.shop_address && !saved.phone && !saved.upi_number && !saved.email && (
                    <span style={{ fontSize: '0.6rem', color: '#475569', fontStyle: 'italic' }}>{t('foot.no_contact_info')}</span>
                  )}
                </div>

              </div>

              {/* Copyright Bar */}
              <div style={{ background: '#070F1C', padding: '10px 16px', textAlign: 'center', borderTop: '1px solid #1E293B' }}>
                <span style={{ fontSize: '0.65rem', color: '#475569' }}>
                  {saved.copyrights_notice
                    ? formatCopyrightText(saved.copyrights_notice)
                    : `© 2026 ${saved.shop_name || t('foot.your_store')}. ${t('foot.all_rights_reserved')} | ${POWERED_BY_TEXT}`}
                </span>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
