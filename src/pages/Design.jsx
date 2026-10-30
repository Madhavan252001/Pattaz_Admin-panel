import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { themesAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';
import useWebsitePreviewUrl from '../hooks/useWebsitePreviewUrl';
import {
  Save, Image as ImageIcon, Palette, Type, Upload, CheckCircle2, Flame, Eye, Edit2, X, Loader2, AlertCircle, FileText,
  ShieldCheck, Truck, Trophy, Banknote, Tag, Star, ShoppingCart, Play, Phone, MessageCircle, MapPin, Mail, Heart, BookOpen,
  ChevronRight, Zap, Sparkles, Award, Package, Ticket, Film, CircleCheck, Shield, PhoneCall
} from 'lucide-react';

function getFullImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  let path = url.replace(/^\/+/, '');
  return `https://offer360.in/${path}`;
}

function getReadableTextColor(hexColor) {
  const hex = String(hexColor || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return '#FFFFFF';
  const channels = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  // Keep bright text on saturated/dark brand colors (red, blue, purple, etc.).
  // Dark text is reserved for genuinely light backgrounds where white would disappear.
  return luminance > 0.55 ? '#1E293B' : '#FFFFFF';
}

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
          <Edit2 size={14} /> {t('des.edit')}
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
            <X size={14} /> {t('des.cancel')}
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
            {saving ? t('des.saving') : t('des.save')}
          </button>
        </div>
      )}
    </div>
  );
}

function BackgroundCarousel({ images, primaryColor, children }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % images.length), 4000);
    return () => clearInterval(t);
  }, [images.length]);
  return (
    <div style={{ position: 'relative', minHeight: '180px', overflow: 'hidden' }}>
      {images.length > 0 ? (
        <div style={{ position: 'absolute', inset: 0 }}>
          {images.map((img, i) => (
            <div key={i} style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: i === idx ? 1 : 0,
              transition: 'opacity 1s ease-in-out'
            }} />
          ))}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, rgba(10,0,0,0.7) 0%, rgba(20,5,0,0.5) 50%, ${primaryColor}66 100%)` }} />
          {images.length > 1 && (
            <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 2 }}>
              {images.map((_, i) => (
                <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: i === idx ? '#FFF' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setIdx(i)} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, #1a0a00 0%, #2d1200 50%, ${primaryColor}44 100%)` }} />
      )}
      {children}
    </div>
  );
}

export default function Design() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsgValue] = useState('');
  const setErrorMsg = (message) => { setErrorMsgValue(message); if (message) toast.error(message); };
  const [editingCard, setEditingCard] = useState(null);
  const [draft, setDraft] = useState({});
  const [originalDraft, setOriginalDraft] = useState({});
  const [previewVersion, setPreviewVersion] = useState(() => Date.now());
  const [previewSrc, setPreviewSrc] = useState('');
  const { websiteUrl, getPreviewUrl } = useWebsitePreviewUrl();
  const activePreviewSrc = previewSrc || getPreviewUrl(previewVersion);
  const saveQueueRef = useRef(Promise.resolve());
  const rightRef = useRef(null);
  const [fixedStyle, setFixedStyle] = useState({});

  // Image file states for upload
  const [homeBgFile, setHomeBgFile] = useState(null);
  const [videoBgFile, setVideoBgFile] = useState(null);

  useLayoutEffect(() => {
    const updatePos = () => {
      if (rightRef.current) {
        const r = rightRef.current.getBoundingClientRect();
        setFixedStyle({
          position: 'fixed',
          top: '90px',
          left: r.left + 'px',
          width: r.width + 'px',
        });
      }
    };
    updatePos();
    window.addEventListener('resize', updatePos);
    const resizeObserver = typeof ResizeObserver !== 'undefined' && rightRef.current
      ? new ResizeObserver(updatePos)
      : null;
    if (resizeObserver && rightRef.current) resizeObserver.observe(rightRef.current);
    return () => {
      window.removeEventListener('resize', updatePos);
      resizeObserver?.disconnect();
    };
  }, [data]);

  const forceRefreshPreview = async () => {
    const nextVersion = Date.now();
    const nextPreviewUrl = getPreviewUrl(nextVersion);
    setPreviewVersion(nextVersion);
    setPreviewSrc('about:blank');

    try {
      // Warm the browser cache with a network-only response before mounting the iframe.
      await axios.get(nextPreviewUrl, { headers: { 'Cache-Control': 'no-cache' } });
    } catch (err) {
      // The iframe navigation below still provides a fresh cache-busted request.
    }

    window.setTimeout(() => {
      setPreviewSrc(nextPreviewUrl);
    }, 50);
  };

  const fetchTheme = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const res = await themesAPI.getTheme();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      setErrorMsg(t('des.error_load'));
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => { fetchTheme(); }, []);

  const openEdit = (card) => {
    setDraft({ ...data });
    setOriginalDraft({ ...data });
    setEditingCard(card);
    setHomeBgFile(null);
    setVideoBgFile(null);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const cancelEdit = async () => {
    const colorChanged = editingCard === 'colors'
      && (draft.primary_color !== originalDraft.primary_color
        || draft.secondary_color !== originalDraft.secondary_color
        || draft.text_color !== originalDraft.text_color);

    if (colorChanged) {
      const previousColors = {
        primary_color: originalDraft.primary_color || '',
        secondary_color: originalDraft.secondary_color || '',
        text_color: originalDraft.text_color || '',
      };
      await saveThemeCard(previousColors);
      // Keep the read-only card in sync immediately after rollback.
      setData((previous) => ({ ...previous, ...previousColors }));
    } else {
      setEditingCard(null);
      setDraft({});
      setHomeBgFile(null);
      setVideoBgFile(null);
    }
    setOriginalDraft({});
  };

  const handleDraftChange = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleThemeColorChange = (field, value) => {
    setDraft((previous) => ({
      ...previous,
      [field]: value,
      ...(field === 'primary_color' ? { text_color: getReadableTextColor(value) } : {}),
    }));
  };

  const performSaveThemeCard = async (colorOverride = {}, closeAfterSave = true) => {
    try {
      setSaving(true);
      setErrorMsg('');

      const merged = { ...data, ...draft, ...colorOverride };
      const fd = new FormData();
      fd.append('title', merged.title || '');
      fd.append('description', merged.description || '');
      fd.append('primary_color', merged.primary_color || '');
      fd.append('secondary_color', merged.secondary_color || '');
      fd.append('text_color', merged.text_color || '');
      fd.append('banner_text', merged.banner_text || '');
      fd.append('hero_title', merged.hero_title || '');
      fd.append('hero_subtitle', merged.hero_subtitle || '');

      if (homeBgFile) fd.append('home_background_url', homeBgFile);
      if (videoBgFile) fd.append('video_player_background_url', videoBgFile);

      let res;
      if (data && data.id) {
        res = await themesAPI.updateTheme(fd);
      } else {
        res = await themesAPI.createTheme(fd);
      }

      if (res.success) {
        setSuccessMsg(t('des.success_saved'));
        if (closeAfterSave) {
          setEditingCard(null);
          setDraft({});
          setHomeBgFile(null);
          setVideoBgFile(null);
        }
        forceRefreshPreview();
        await fetchTheme(false);
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(res.message || t('des.error_save'));
      }
    } catch (err) {
      setErrorMsg(t('des.error_save_settings'));
    } finally {
      setSaving(false);
    }
  };

  // Serialize theme saves so Cancel rollback always runs after any preset auto-save.
  const saveThemeCard = (colorOverride = {}, closeAfterSave = true) => {
    const queuedSave = saveQueueRef.current.then(() => performSaveThemeCard(colorOverride, closeAfterSave));
    saveQueueRef.current = queuedSave.catch(() => undefined);
    return queuedSave;
  };

  const applyColorPreset = (preset) => {
    const colors = {
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      // Presets already define the intended readable text color for their palette.
      text_color: preset.text || getReadableTextColor(preset.primary),
    };
    setDraft((previous) => ({ ...previous, ...colors }));
    saveThemeCard(colors, false);
  };

  const d = editingCard ? draft : data;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Loader2 size={32} className="animate-spin" color="#5B5FC7" />
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="page-title-row" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Flame size={24} color="#5B5FC7" />
            {t('des.page_title')}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '4px', fontWeight: 600 }}>
            {t('des.page_subtitle')}
          </p>
        </div>
      </div>


      {false && errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: '#FEE2E2', color: '#DC2626', borderRadius: '12px', marginBottom: '24px', fontWeight: 700, border: '1px solid #FCA5A5' }}>
          <AlertCircle size={20} /><span>{errorMsg}</span>
        </div>
      )}

      <form>
        <div style={{ display: 'grid', gridTemplateColumns: '30% 1fr', gap: '14px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Card 1: Theme Colors */}
            <div className="admin-card">
              <CardHeader
                icon={<Palette />}
                iconBg="#EEF2FF"
                iconColor="#5B5FC7"
                title={t('des.card_colors')}
                isEditing={editingCard === 'colors'}
                onEdit={() => openEdit('colors')}
                onCancel={cancelEdit}
                saving={saving}
                onSave={saveThemeCard}
              />

              {editingCard === 'colors' ? (
                <>
                  {/* Gradient Presets */}
                  <div style={{ marginBottom: '22px' }}>
                    <label className="form-label" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#5B5FC7' }}>
                      <Flame size={14} color="#D97706" /> {t('des.gradient_presets')}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                      {[
                        { name: t('des.grad_sunset_gold'), primary: '#FF512F', secondary: '#FFF3E0', text: '#BF360C', grad: 'linear-gradient(135deg, #FF512F, #F09819)' },
                        { name: t('des.grad_instagram'), primary: '#f09433', secondary: '#FDF2F8', text: '#831843', grad: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' },
                        { name: t('des.grad_cyber_violet'), primary: '#7F00FF', secondary: '#F3E8FF', text: '#4C1D95', grad: 'linear-gradient(135deg, #7F00FF, #E100FF)' },
                        { name: t('des.grad_ocean_blue'), primary: '#00C6FF', secondary: '#E0F2FE', text: '#1E3A5F', grad: 'linear-gradient(135deg, #00C6FF, #0072FF)' },
                        { name: t('des.grad_emerald_aurora'), primary: '#11998E', secondary: '#E6F4EA', text: '#065F46', grad: 'linear-gradient(135deg, #11998E, #38EF7D)' },
                        { name: t('des.grad_neon_rose'), primary: '#FF416C', secondary: '#FFE4E6', text: '#881337', grad: 'linear-gradient(135deg, #FF416C, #FF4B2B)' },
                        { name: t('des.grad_royal_indigo'), primary: '#667EEA', secondary: '#EEF2FF', text: '#312E81', grad: 'linear-gradient(135deg, #667EEA, #764BA2)' },
                        { name: t('des.grad_cotton_candy'), primary: '#FF9A9E', secondary: '#FFF0F0', text: '#9B2C2C', grad: 'linear-gradient(135deg, #FF9A9E, #FAD0C4)' },
                        { name: t('des.grad_lime_fresh'), primary: '#56AB2F', secondary: '#F0FFF0', text: '#33691E', grad: 'linear-gradient(135deg, #56AB2F, #A8E063)' },
                      ].map((preset, idx) => (
                        <button type="button" key={idx} onClick={() => applyColorPreset(preset)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px',
                            borderRadius: '10px', border: '1px solid #C7D2FE', background: '#EEF2FF',
                            cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#5B5FC7'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                           onMouseLeave={e => { e.currentTarget.style.borderColor = '#C7D2FE'; e.currentTarget.style.transform = 'none'; }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: preset.grad || preset.primary, border: '2px solid #FFF', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B' }}>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Pickers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{t('des.label_primary')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F8FAFC', padding: '6px 12px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                      <input type="color" value={d.primary_color || '#10B981'} onChange={e => handleThemeColorChange('primary_color', e.target.value)} style={{ width: '32px', height: '32px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '6px', padding: 0 }} />
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.88rem', color: '#1E293B' }}>{d.primary_color || '#10B981'}</span>
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{t('des.label_secondary')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F8FAFC', padding: '6px 12px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                      <input type="color" value={d.secondary_color || '#D1FAE5'} onChange={e => handleThemeColorChange('secondary_color', e.target.value)} style={{ width: '32px', height: '32px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '6px', padding: 0 }} />
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.88rem', color: '#1E293B' }}>{d.secondary_color || '#D1FAE5'}</span>
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{t('des.label_text')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F8FAFC', padding: '6px 12px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                      <input type="color" value={d.text_color || '#E65100'} onChange={e => handleDraftChange('text_color', e.target.value)} style={{ width: '32px', height: '32px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '6px', padding: 0 }} />
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.88rem', color: '#1E293B' }}>{d.text_color || '#E65100'}</span>
                    </div>
                  </div>
                </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: data?.primary_color || '#10B981', border: '2px solid #E2E8F0' }} />
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>{t('des.label_primary')}</div>
                      <div style={{ fontSize: '0.88rem', color: '#1E293B', fontWeight: 500, fontFamily: 'monospace' }}>{data?.primary_color || '#10B981'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: data?.secondary_color || '#D1FAE5', border: '2px solid #E2E8F0' }} />
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>{t('des.label_secondary')}</div>
                      <div style={{ fontSize: '0.88rem', color: '#1E293B', fontWeight: 500, fontFamily: 'monospace' }}>{data?.secondary_color || '#D1FAE5'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: data?.text_color || '#E65100', border: '2px solid #E2E8F0' }} />
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>{t('des.label_text')}</div>
                      <div style={{ fontSize: '0.88rem', color: '#1E293B', fontWeight: 500, fontFamily: 'monospace' }}>{data?.text_color || '#E65100'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Background Images */}
            <div className="admin-card">
              <CardHeader
                icon={<ImageIcon />}
                iconBg="#FEF3C7"
                iconColor="#D97706"
                title={t('des.card_images')}
                isEditing={editingCard === 'images'}
                onEdit={() => openEdit('images')}
                onCancel={cancelEdit}
                saving={saving}
                onSave={saveThemeCard}
              />

              {editingCard === 'images' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{t('des.label_home_bg')}</label>
                    <div style={{ border: '2px dashed #CBD5E1', borderRadius: '10px', padding: '12px', background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                      {homeBgFile ? (
                        <img src={URL.createObjectURL(homeBgFile)} alt="Home BG Preview" style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0' }} />
                      ) : d.home_background_url ? (
                        <img src={d.home_background_url} alt="Current Home BG" style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0' }} />
                      ) : (
                        <div style={{ width: '80px', height: '50px', borderRadius: '6px', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={20} color="#94A3B8" />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block' }}>{homeBgFile ? homeBgFile.name : t('des.click_to_upload')}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748B' }}>JPEG, PNG, WEBP</span>
                      </div>
                      <input type="file" accept="image/*" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setHomeBgFile(f); handleDraftChange('home_background_url', URL.createObjectURL(f)); } }} />
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{t('des.label_video_bg')}</label>
                    <div style={{ border: '2px dashed #CBD5E1', borderRadius: '10px', padding: '12px', background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                      {videoBgFile ? (
                        <img src={URL.createObjectURL(videoBgFile)} alt="Video BG Preview" style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0' }} />
                      ) : d.video_player_background_url ? (
                        <img src={d.video_player_background_url} alt="Current Video BG" style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0' }} />
                      ) : (
                        <div style={{ width: '80px', height: '50px', borderRadius: '6px', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={20} color="#94A3B8" />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block' }}>{videoBgFile ? videoBgFile.name : t('des.click_to_upload')}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748B' }}>JPEG, PNG, WEBP</span>
                      </div>
                      <input type="file" accept="image/*" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setVideoBgFile(f); handleDraftChange('video_player_background_url', URL.createObjectURL(f)); } }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ width: '60px', height: '36px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #E2E8F0', background: '#F1F5F9', flexShrink: 0 }}>
                      {data?.home_background_url ? (
                        <img src={data.home_background_url} alt="Home BG" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '0.6rem' }}>{t('des.no_image')}</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>{t('des.label_home_bg')}</div>
                      <div style={{ fontSize: '0.78rem', color: '#1E293B', fontWeight: 500 }}>{data?.home_background_url ? t('des.uploaded') : t('des.not_set')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ width: '60px', height: '36px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #E2E8F0', background: '#F1F5F9', flexShrink: 0 }}>
                      {data?.video_player_background_url ? (
                        <img src={data.video_player_background_url} alt="Video BG" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '0.6rem' }}>{t('des.no_image')}</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>{t('des.label_video_bg')}</div>
                      <div style={{ fontSize: '0.78rem', color: '#1E293B', fontWeight: 500 }}>{data?.video_player_background_url ? t('des.uploaded') : t('des.not_set')}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card 4: Announcement & Headlines */}
            <div className="admin-card">
              <CardHeader
                icon={<Type />}
                iconBg="#FEE2E2"
                iconColor="#EF4444"
                title={t('des.card_headlines')}
                isEditing={editingCard === 'headlines'}
                onEdit={() => openEdit('headlines')}
                onCancel={cancelEdit}
                saving={saving}
                onSave={saveThemeCard}
              />

              {editingCard === 'headlines' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{t('des.label_banner')}</label>
                    <input type="text" className="form-input" value={d.banner_text || ''} onChange={e => handleDraftChange('banner_text', e.target.value)} placeholder={t('des.placeholder_banner')} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{t('des.label_hero_title')}</label>
                    <input type="text" className="form-input" value={d.hero_title || ''} onChange={e => handleDraftChange('hero_title', e.target.value)} placeholder={t('des.placeholder_hero_title')} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{t('des.label_hero_subtitle')}</label>
                    <input type="text" className="form-input" value={d.hero_subtitle || ''} onChange={e => handleDraftChange('hero_subtitle', e.target.value)} placeholder={t('des.placeholder_hero_subtitle')} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[
                    { label: t('des.label_banner'), value: data?.banner_text, fallback: t('des.fallback_banner') },
                    { label: t('des.label_hero_title'), value: data?.hero_title, fallback: t('des.fallback_hero_title') },
                    { label: t('des.label_hero_subtitle'), value: data?.hero_subtitle, fallback: t('des.fallback_hero_subtitle') },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: i < 2 ? '1px solid #F1F5F9' : 'none' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{item.label}</div>
                      <div style={{ fontSize: '0.88rem', color: '#1E293B', fontWeight: 500 }}>{item.value || <span style={{ color: '#CBD5E1', fontStyle: 'italic' }}>{item.fallback}</span>}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT — spacer placeholder */}
          <div ref={rightRef} style={{ visibility: 'hidden', pointerEvents: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '10px 4px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Eye size={16} color="#5B5FC7" />
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>{t('des.live_preview')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ padding: '6px 11px', fontSize: '0.72rem', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  Open Website
                </a>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', background: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: '999px', fontWeight: 800, letterSpacing: '0.3px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 0 2px rgba(34,197,94,0.3)' }} />
                  {t('des.live')}
                </span>
              </div>
            </div>
            <div style={{ height: '520px' }} />
          </div>

        </div>

        {/* FIXED PREVIEW */}
        {fixedStyle.left && (
          <div style={{ ...fixedStyle, zIndex: 50, maxHeight: '90vh', overflow: 'hidden', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 16px 40px rgba(15, 23, 42, 0.14)', background: '#FFFFFF' }} className="live-website-preview">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', position: 'sticky', top: 0, zIndex: 60, background: '#fff', padding: '10px 4px', borderBottom: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Eye size={16} color="#5B5FC7" />
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>{t('des.live_preview')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open Shiva Crackers website"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 11px', border: '1px solid #C7D2FE', borderRadius: '8px', background: '#EEF2FF', color: '#4338CA', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', cursor: 'pointer' }}
                >
                  Open Website
                </a>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', background: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: '999px', fontWeight: 800, letterSpacing: '0.3px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 0 2px rgba(34,197,94,0.3)' }} />
                  {t('des.live')}
                </span>
              </div>
            </div>

            {activePreviewSrc !== 'about:blank' && (
              <iframe
                key={activePreviewSrc}
                title="Shiva Crackers website preview"
                src={activePreviewSrc}
                style={{ width: '100%', height: 'calc(90vh - 58px)', border: 0, display: 'block', background: '#fff' }}
              />
            )}

            <div style={{ display: 'none', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.18)', border: '1px solid #E2E8F0' }}>

              {/* ── 1. Announcement Bar ── */}
              <div style={{ background: `linear-gradient(90deg, ${d?.primary_color || '#800020'}, ${d?.primary_color || '#b30026'}, ${d?.primary_color || '#800020'})`, padding: '5px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                <span style={{ fontSize: '0.55rem', color: '#FFF', fontWeight: 700 }}><Sparkles size={10} /> {d?.banner_text || t('des.preview_banner_fallback')}</span>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: '3px' }}><ShieldCheck size={9} /> {t('des.safety_guide')}</span>
                  <span style={{ fontSize: '0.5rem', color: '#FFC107', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}><Phone size={9} /> +91 9876262799</span>
                </div>
              </div>

              {/* ── 2. Navbar ── */}
              <div style={{ background: d?.secondary_color || '#fff', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1e5d1', height: '50px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {d?.logo_url ? (
                    <img src={d.logo_url} alt="Logo" style={{ height: '26px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: d?.primary_color || '#d90429', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Flame size={14} color="#fff" /></div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 900, color: d?.primary_color || '#d90429', lineHeight: 1.1, letterSpacing: '-0.02em' }}>SHIVA CRACKERS</div>
                    <div style={{ fontSize: '0.4rem', color: d?.text_color || '#64748b', fontWeight: 600 }}>SIVAKASI DIRECT STORE</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {['des.nav_home', 'des.nav_products', 'des.nav_reels', 'des.nav_offers', 'des.nav_safety', 'des.nav_track_order', 'des.nav_contact'].map(item => (
                    <span key={item} style={{ fontSize: '0.5rem', color: item === 'des.nav_home' ? (d?.primary_color || '#d90429') : '#475569', fontWeight: item === 'des.nav_home' ? 800 : 600, whiteSpace: 'nowrap', borderBottom: item === 'des.nav_home' ? `2px solid ${d?.primary_color || '#d90429'}` : 'none', paddingBottom: '2px' }}>{t(item)}</span>
                  ))}
                  <div style={{ position: 'relative' }}>
                    <ShoppingCart size={12} color="#475569" />
                    <div style={{ position: 'absolute', top: '-5px', right: '-6px', width: '12px', height: '12px', borderRadius: '50%', background: d?.primary_color || '#d90429', color: '#fff', fontSize: '0.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff' }}>1</div>
                  </div>
                </div>
              </div>

              {/* ── 3. Brand Partners ── */}
              <div style={{ position: 'relative', padding: '70px 16px', overflow: 'hidden', marginBottom: '14px', background: d?.secondary_color || '#fffcf8' }}>
                {d?.home_background_url && (
                  <>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${getFullImageUrl(d.home_background_url)})`, backgroundSize: '100% 100%', backgroundPosition: 'center' }} />
                    <div style={{ position: 'absolute', inset: 0, background: `${d?.primary_color || '#000'}66`, mixBlendMode: 'multiply' }} />
                  </>
                )}
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'left' }}>
                  <div style={{ display: 'inline-block', background: '#fffcf8', border: '1px solid #ffc107', borderRadius: '20px', padding: '4px 14px', fontSize: '0.48rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px', letterSpacing: '0.05em', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}><Trophy size={11} /> {t('des.preview_badge_manufacturers')}</div>
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 900, color: '#fff', margin: '0 0 6px', textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>{t('des.preview_partners_title')}</h3>
                  <p style={{ fontSize: '0.5rem', color: '#f1f5f9', margin: '0 0 14px', textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>{t('des.preview_partners_desc')}</p>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.2rem' }}>
                    {[
                      { icon: <ShieldCheck size={16} stroke="#ffc107" />, label: t('des.preview_feat_safe') },
                      { icon: <Award size={16} stroke="#ffc107" />, label: t('des.preview_feat_quality') },
                      { icon: <Truck size={16} stroke="#ffc107" />, label: t('des.preview_feat_delivery') },
                      { icon: <Tag size={16} stroke="#ffc107" />, label: t('des.preview_feat_prices') },
                    ].map((f, i) => (
                      <div key={i} style={{ background: '#fff', color: '#000', border: `1.5px solid ${d?.primary_color || '#AF0A28'}`, borderRadius: '24px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', cursor: 'pointer' }}>
                        <div style={{ display: 'inline-flex' }}>{f.icon}</div>
                        <span style={{ color: '#000', fontSize: '0.45rem', fontWeight: 800 }}>{f.label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '20px', fontSize: '0.45rem', fontWeight: 700 }}><CheckCircle2 size={10} /> {t('des.preview_certified')}</div>
                </div>
              </div>

              {/* ── 5. Countdown Timer ── */}
              <div style={{ background: 'linear-gradient(180deg, #a60724, #b80c2c 45%, #750216)', padding: '20px 16px', textAlign: 'center', color: '#fff', border: '2px solid #ca8a04', margin: '0 14px 14px', borderRadius: '16px' }}>
                <div style={{ display: 'inline-block', background: 'rgba(202,138,4,0.2)', border: '1px solid #ca8a04', borderRadius: '20px', padding: '3px 12px', fontSize: '0.45rem', fontWeight: 800, color: '#ffc107', marginBottom: '10px', letterSpacing: '0.08em' }}><Sparkles size={10} /> {t('des.preview_deepavali_deal')}</div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 900, margin: '0 0 6px' }}>{t('des.preview_countdown_title')}</h3>
                <p style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 14px' }}>{t('des.preview_countdown_desc')}</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
                  {[{ n: '100', l: t('des.preview_days') }, { n: '08', l: t('des.preview_hours') }, { n: '40', l: t('des.preview_mins') }, { n: '03', l: t('des.preview_secs') }].map((tItem, i) => (
                    <div key={i} style={{ background: 'linear-gradient(180deg, #2b040e, #360714)', border: '2px solid #ca8a04', borderRadius: '12px', minWidth: '48px', padding: '8px 6px', boxShadow: '0 8px 20px rgba(0,0,0,0.45)' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: '#ffc107', lineHeight: 1 }}>{tItem.n}</div>
                      <div style={{ fontSize: '0.35rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{tItem.l}</div>
                    </div>
                  ))}
                </div>
                <button type="button" style={{ background: 'linear-gradient(135deg, #ffc107, #ff9800)', color: '#0f172a', border: 'none', borderRadius: '12px', padding: '8px 20px', fontSize: '0.55rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 20px #ff980066' }}><Ticket size={10} /> {t('des.preview_grab_offers')}</button>
              </div>

              {/* ── 6. Video Showcase ── */}
              <div style={{ background: '#0f172a', padding: '24px 16px', textAlign: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'inline-block', background: 'rgba(255,193,7,0.15)', border: '1px solid rgba(255,193,7,0.4)', borderRadius: '20px', padding: '3px 12px', fontSize: '0.45rem', fontWeight: 800, color: '#ffc107', marginBottom: '10px' }}><Film size={10} /> {t('des.preview_showcase')}</div>
                <h3 style={{ fontSize: '0.82rem', fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>{t('des.preview_video_title')}</h3>
                <p style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 14px' }}>{t('des.preview_video_desc')}</p>
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155', background: '#1e293b' }}>
                  {d?.video_player_background_url ? (
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${getFullImageUrl(d.video_player_background_url)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#64748b', zIndex: 1 }}>
                      <div style={{ marginBottom: '6px' }}><Play size={28} color="#64748b" /></div>
                      <div style={{ fontSize: '0.5rem', fontWeight: 600 }}>{t('des.preview_upload_video_bg')}</div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {[t('des.preview_tag_green'), t('des.preview_tag_aerial'), t('des.preview_tag_sivakasi')].map(tag => (
                    <span key={tag} style={{ fontSize: '0.42rem', fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '3px' }}><CheckCircle2 size={8} /> {tag}</span>
                  ))}
                </div>
              </div>

              {/* ── 7. Products — Exclusive Festival Offers ── */}
              <div style={{ background: '#fffcf8', padding: '24px 16px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'inline-block', background: `${d?.primary_color || '#d90429'}11`, border: `1px solid ${d?.primary_color || '#d90429'}`, borderRadius: '20px', padding: '3px 10px', fontSize: '0.42rem', fontWeight: 800, color: d?.primary_color || '#d90429', marginBottom: '6px' }}><Tag size={9} /> {t('des.preview_offers_badge')}</div>
                    <h3 style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0f172a', margin: 0 }}><Flame size={12} /> {t('des.preview_offers_title')}</h3>
                    <p style={{ fontSize: '0.45rem', color: '#64748b', margin: '2px 0 0' }}>{t('des.preview_offers_desc')}</p>
                  </div>
                  <span style={{ fontSize: '0.48rem', color: d?.primary_color || '#d90429', fontWeight: 700, cursor: 'pointer' }}>{t('des.preview_products_link')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { name: 'TEST', price: '₹135', old: '₹500', stock: t('des.in_stock') + ' (30)', discount: '55% OFF' },
                    { name: 'Flower Pot1111', price: '₹120', old: '₹450', stock: t('des.in_stock') + ' (35)', discount: '52% OFF' },
                    { name: 'Rock Star Boom', price: '₹150', old: '₹500', stock: t('des.in_stock') + ' (30)', discount: '45% OFF' },
                  ].map((p, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
                      <div style={{ height: '70px', background: `linear-gradient(135deg, ${(d?.primary_color || '#d90429')}11, ${(d?.primary_color || '#d90429')}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', position: 'relative' }}>
                        <Flame size={24} color={d?.primary_color || '#d90429'} />
                        <div style={{ position: 'absolute', top: '4px', left: '4px', background: d?.primary_color || '#d90429', color: '#fff', fontSize: '0.38rem', fontWeight: 800, padding: '2px 6px', borderRadius: '8px' }}>{p.discount}</div>
                      </div>
                      <div style={{ padding: '6px 8px' }}>
                        <div style={{ fontSize: '0.48rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>{p.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 900, color: d?.primary_color || '#d90429' }}>{p.price}</span>
                          <span style={{ fontSize: '0.42rem', color: '#94a3b8', textDecoration: 'line-through' }}>{p.old}</span>
                        </div>
                        <div style={{ fontSize: '0.38rem', color: '#10b981', fontWeight: 600, margin: '2px 0', display: 'flex', alignItems: 'center', gap: '3px' }}><CheckCircle2 size={8} /> {p.stock}</div>
                        <button type="button" style={{ width: '100%', background: d?.primary_color || '#d90429', color: '#fff', border: 'none', borderRadius: '8px', padding: '4px 0', fontSize: '0.42rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}><ShoppingCart size={8} /> {t('des.add_to_cart')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 8. Combo Packs ── */}
              <div style={{ background: '#fffcf8', padding: '0 16px 24px', marginBottom: '14px' }}>
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'inline-block', background: `${(d?.primary_color || '#d90429')}11`, border: `1px solid ${d?.primary_color || '#d90429'}`, borderRadius: '20px', padding: '3px 10px', fontSize: '0.42rem', fontWeight: 800, color: d?.primary_color || '#d90429', marginBottom: '6px' }}><Banknote size={9} /> {t('des.maximum_savings')}</div>
                  <h3 style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>{t('des.combo_packs_title')}</h3>
                  <p style={{ fontSize: '0.45rem', color: '#64748b', margin: 0 }}>{t('des.combo_packs_desc')}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[
                    { name: 'abc', price: '₹1000', old: '₹1999', discount: '50% OFF' },
                    { name: 'Family Festival Combo Pack', price: '₹2499', old: '₹4999', discount: '50% OFF' },
                    { name: 'Family Festival Combo Pack1', price: '₹2499', old: '₹4999', discount: '50% OFF' },
                    { name: 'Family Festival Combo Pack2', price: '₹2499', old: '₹4999', discount: '50% OFF' },
                  ].map((p, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: '12px', border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
                      <div style={{ height: '60px', background: `linear-gradient(135deg, ${(d?.primary_color || '#d90429')}11, ${(d?.primary_color || '#d90429')}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', position: 'relative' }}>
                        <Package size={20} color={d?.primary_color || '#d90429'} />
                        <div style={{ position: 'absolute', top: '3px', left: '3px', background: d?.primary_color || '#d90429', color: '#fff', fontSize: '0.35rem', fontWeight: 800, padding: '2px 5px', borderRadius: '6px' }}>{p.discount}</div>
                      </div>
                      <div style={{ padding: '5px 6px' }}>
                        <div style={{ fontSize: '0.38rem', color: d?.primary_color || '#d90429', fontWeight: 800, marginBottom: '1px' }}>{t('des.combo_pack')}</div>
                        <div style={{ fontSize: '0.42rem', fontWeight: 700, color: '#0f172a', marginBottom: '2px', lineHeight: 1.2 }}>{p.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ fontSize: '0.52rem', fontWeight: 900, color: d?.primary_color || '#d90429' }}>{p.price}</span>
                          <span style={{ fontSize: '0.38rem', color: '#94a3b8', textDecoration: 'line-through' }}>{p.old}</span>
                        </div>
                        <div style={{ fontSize: '0.35rem', color: '#10b981', fontWeight: 600, margin: '2px 0', display: 'flex', alignItems: 'center', gap: '3px' }}><CheckCircle2 size={7} /> {t('des.in_stock')} (30)</div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button type="button" style={{ flex: 1, background: d?.primary_color || '#d90429', color: '#fff', border: 'none', borderRadius: '6px', padding: '3px 0', fontSize: '0.38rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}><ShoppingCart size={7} /> {t('des.cart')}</button>
                          <button type="button" style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Heart size={10} color="#94a3b8" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 9. Safety Guidelines ── */}
              <div style={{ background: '#fffcf8', padding: '24px 16px', borderTop: '1px solid #f1e5d1', marginBottom: '14px' }}>
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'inline-block', background: '#dcfce7', border: '1px solid #10b981', borderRadius: '20px', padding: '3px 10px', fontSize: '0.42rem', fontWeight: 800, color: '#166534', marginBottom: '6px' }}><ShieldCheck size={9} /> {t('des.safe_celebrations')}</div>
                  <h3 style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>{t('des.safety_title')}</h3>
                  <p style={{ fontSize: '0.45rem', color: '#64748b', margin: 0 }}>{t('des.safety_desc')}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { title: t('des.safety_tip1_title'), desc: t('des.safety_tip1_desc') },
                      { title: t('des.safety_tip2_title'), desc: t('des.safety_tip2_desc') },
                      { title: t('des.safety_tip3_title'), desc: t('des.safety_tip3_desc') },
                    ].map((tip, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckCircle2 size={10} color="#166534" /></div>
                        <div>
                          <div style={{ fontSize: '0.45rem', fontWeight: 800, color: '#0f172a', marginBottom: '1px' }}>{tip.title}</div>
                          <div style={{ fontSize: '0.38rem', color: '#64748b', lineHeight: 1.4 }}>{tip.desc}</div>
                        </div>
                      </div>
                    ))}
                    <button type="button" style={{ background: d?.primary_color || '#d90429', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '0.45rem', fontWeight: 800, cursor: 'pointer', alignSelf: 'flex-start', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={10} /> {t('des.read_safety_manual')}</button>
                  </div>
                  <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '14px' }}>
                    <div style={{ fontSize: '0.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>{t('des.contact_support')}</div>
                    <p style={{ fontSize: '0.42rem', color: '#64748b', margin: '0 0 10px' }}>{t('des.contact_support_desc')}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.42rem', color: '#475569' }}>
                        <PhoneCall size={10} color={d?.primary_color || '#d90429'} /> +91 98765 43210
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.42rem', color: '#475569' }}>
                        <MessageCircle size={10} color="#25d366" /> {t('des.whatsapp_chat')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 10. Footer ── */}
              <div style={{ background: '#0B1628', padding: '20px 16px', color: '#94a3b8' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: d?.primary_color || '#d90429', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Flame size={10} color="#fff" /></div>
                      <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#fff' }}>SHIVA CRACKERS</span>
                    </div>
                    <p style={{ fontSize: '0.4rem', lineHeight: 1.5, margin: 0 }}>{d?.description || t('des.preview_footer_desc')}</p>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      {[<svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>, <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>, <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M9 18V5l12-2v13M9 18c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zM21 16c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"/></svg>, <svg width="10" height="10" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/></svg>].map((icon, i) => (
                        <div key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{icon}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.48rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>{t('des.quick_links')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.4rem' }}>
                      {[t('des.footer_link_home'), t('des.footer_link_catalogue'), t('des.footer_link_combos'), t('des.footer_link_safety')].map(link => (
                        <span key={link} style={{ color: '#94a3b8', cursor: 'pointer' }}>→ {link}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.48rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>{t('des.customer_care')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.4rem' }}>
                      {[t('des.care_order_tracking'), t('des.care_track_status'), t('des.care_safety_instructions'), t('des.care_whatsapp')].map(link => (
                        <span key={link} style={{ color: '#94a3b8', cursor: 'pointer' }}>→ {link}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.48rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>{t('des.store_contact')}</div>
                    <div style={{ fontSize: '0.4rem', lineHeight: 1.8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={9} color={d?.primary_color || '#d90429'} /> Sivakasi, Tamil Nadu</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={9} color={d?.primary_color || '#d90429'} /> +91 9876262799</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={9} color={d?.primary_color || '#d90429'} /> shop@shivacrackers.in</div>
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.4rem', color: '#475569' }}>{d?.copyrights_notice || `© 2026 Shiva Crackers. ${t('des.all_rights_reserved')}`}</span>
                  <span style={{ fontSize: '0.38rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}>{t('des.preview_cod_prefix')} <Heart size={8} color={d?.primary_color || '#d90429'} fill={d?.primary_color || '#d90429'} /> {t('des.preview_cod_suffix')}</span>
                </div>
              </div>

            </div>
          </div>
        )}

        <style>{`
          .live-website-preview iframe { min-height: 420px; }
        `}</style>

      </form>
    </div>
  );
}
