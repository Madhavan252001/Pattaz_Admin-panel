import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Globe, Save, X, Loader2,
  RefreshCw, Play, Video, Languages, IndianRupee
} from 'lucide-react';
import { webControlAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';

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
          <Play size={14} /> {t('web.configure')}
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
            <X size={14} /> {t('web.cancel')}
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
            {saving ? t('web.saving') : t('web.save')}
          </button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, fallback }) {
  const { t } = useLanguage();
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
      <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.88rem', color: '#1E293B', fontWeight: 500 }}>
        {value || <span style={{ color: '#CBD5E1', fontStyle: 'italic' }}>{fallback || t('web.not_set')}</span>}
      </div>
    </div>
  );
}

function ToggleSwitch({ label, checked, onChange, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
      <div>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>{label}</div>
        {description && <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: '44px',
          height: '24px',
          borderRadius: '12px',
          border: 'none',
          background: checked ? '#5B5FC7' : '#CBD5E1',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background 0.2s',
          flexShrink: 0
        }}
      >
        <div style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: '3px',
          left: checked ? '23px' : '3px',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }} />
      </button>
    </div>
  );
}

export default function WebControl() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  const [savedSettings, setSavedSettings] = useState({
    id: null,
    admin_id: '',
    youtube_url: '',
    youtube_url_visible: false,
    diwali_countdown: false,
    online_sales: false,
    minimum_order_rupees: '',
    tacking: true,
    language: 'en',
    created_at: '',
    updated_at: ''
  });

  const [draft, setDraft] = useState({ ...savedSettings });

  useEffect(() => {
    fetchWebControlSettings();
  }, []);

  const fetchWebControlSettings = async () => {
    setLoading(true);
    try {
      const res = await webControlAPI.getWebControl();
      if (res && res.success && res.data) {
        const d = res.data;
        const loaded = {
          id: d.id || null,
          admin_id: d.admin_id || '',
          youtube_url: d.youtube_url || '',
          youtube_url_visible: d.youtube_url_visible === 'true' || d.youtube_url_visible === true,
          diwali_countdown: d.diwali_countdown === 'true' || d.diwali_countdown === true,
          online_sales: d.online_sales === 'true' || d.online_sales === true,
          minimum_order_rupees: d.minimum_order_rupees ?? '',
          tacking: d.tacking === '1' || d.tacking === 1 || d.tacking === true || d.tacking === 'true',
          language: d.language || 'en',
          created_at: d.created_at || '',
          updated_at: d.updated_at || ''
        };
        setSavedSettings(loaded);
        setDraft(loaded);
      }
    } catch (err) {
      console.warn('API fetch web-control settings error:', err.message);
      toast.error(err.message || t('web.error_connect'));
    } finally {
      setLoading(false);
    }
  };

  const openEditCard = (cardName) => {
    setDraft({ ...savedSettings });
    setEditingCard(cardName);
  };

  const cancelEdit = () => {
    setEditingCard(null);
    setDraft({ ...savedSettings });
  };

  const handleDraftChange = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const saveCard = async () => {
    setSaving(true);

    const formData = new FormData();
    formData.append('youtube_url', draft.youtube_url || '');
    formData.append('youtube_url_visible', draft.youtube_url_visible ? 'true' : 'false');
    formData.append('diwali_countdown', draft.diwali_countdown ? 'true' : 'false');
    formData.append('online_sales', draft.online_sales ? 'true' : 'false');
    formData.append('minimum_order_rupees', draft.minimum_order_rupees === '' ? '' : draft.minimum_order_rupees);
    formData.append('tacking', draft.tacking ? '1' : '0');
    formData.append('language', draft.language || 'en');

    try {
      let res;
      try {
        res = await webControlAPI.updateWebControl(formData);
      } catch (putErr) {
        console.warn('PUT web-control failed, trying POST fallback:', putErr.message);
        res = await webControlAPI.createWebControl(formData);
      }

      if (res && res.success) {
        const loaded = {
          ...draft,
          created_at: res.data?.created_at || draft.created_at,
          updated_at: res.data?.updated_at || new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
        setSavedSettings(loaded);
        setDraft(loaded);
        setEditingCard(null);
      } else {
        throw new Error(res?.message || t('web.error_save'));
      }
    } catch (err) {
      console.error('Error saving web control settings:', err);
      toast.error(err.message || t('web.error_connect'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
        <Loader2 size={32} color="#5B5FC7" className="animate-spin" />
        <span style={{ color: '#64748B', fontWeight: 600 }}>{t('web.loading')}</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="page-title-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Globe size={24} color="#5B5FC7" />
            {t('web.page_title')}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '4px', fontWeight: 600 }}>
            {t('web.page_subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchWebControlSettings}
          className="btn-secondary"
          style={{ padding: '8px 14px', fontSize: '0.85rem', gap: '6px' }}
        >
          <RefreshCw size={16} /> {t('web.reload_data')}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="admin-card">
          <CardHeader
            icon={<Globe />}
            iconBg="#EEF2FF"
            iconColor="#5B5FC7"
            title={t('web.card_title')}
            isEditing={editingCard === 'webhook'}
            onEdit={() => openEditCard('webhook')}
            onCancel={cancelEdit}
            saving={saving}
            onSave={saveCard}
          />

          {editingCard === 'webhook' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Language Selection */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Languages size={16} color="#5B5FC7" /> Website Language
                </label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleDraftChange('language', 'en')}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: `2px solid ${draft.language === 'en' ? '#5B5FC7' : '#E2E8F0'}`,
                      background: draft.language === 'en' ? '#EEF2FF' : '#F8FAFC',
                      color: draft.language === 'en' ? '#5B5FC7' : '#64748B',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span>English (en)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDraftChange('language', 'ta')}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: `2px solid ${draft.language === 'ta' ? '#5B5FC7' : '#E2E8F0'}`,
                      background: draft.language === 'ta' ? '#EEF2FF' : '#F8FAFC',
                      color: draft.language === 'ta' ? '#5B5FC7' : '#64748B',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span>Tamil / தமிழ் (ta)</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Video size={16} color="#FF0000" /> {t('web.label_youtube_url')}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={draft.youtube_url}
                  onChange={e => handleDraftChange('youtube_url', e.target.value)}
                  placeholder="https://www.youtube.com/embed/..."
                />
              </div>

              <ToggleSwitch
                label={t('web.toggle_youtube_label')}
                description={t('web.toggle_youtube_desc')}
                checked={draft.youtube_url_visible}
                onChange={(val) => handleDraftChange('youtube_url_visible', val)}
              />

              <ToggleSwitch
                label={t('web.toggle_diwali_label')}
                description={t('web.toggle_diwali_desc')}
                checked={draft.diwali_countdown}
                onChange={(val) => handleDraftChange('diwali_countdown', val)}
              />

              <ToggleSwitch
                label={t('web.toggle_online_label')}
                description={t('web.toggle_online_desc')}
                checked={draft.online_sales}
                onChange={(val) => handleDraftChange('online_sales', val)}
              />

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IndianRupee size={16} color="#16A34A" /> Minimum Order Rupees
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="form-input"
                  value={draft.minimum_order_rupees}
                  onChange={e => handleDraftChange('minimum_order_rupees', e.target.value)}
                  placeholder="Enter minimum order amount"
                />
              </div>

              <ToggleSwitch
                label={t('web.toggle_tracking_label')}
                description={t('web.toggle_tracking_desc')}
                checked={draft.tacking}
                onChange={(val) => handleDraftChange('tacking', val)}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <InfoRow label="Website Language" value={savedSettings.language === 'ta' ? 'Tamil / தமிழ் (ta)' : 'English (en)'} />
                <InfoRow label={t('web.label_youtube_url')} value={savedSettings.youtube_url} fallback={t('web.fallback_youtube_url')} />
                <InfoRow label={t('web.info_youtube_visible')} value={savedSettings.youtube_url_visible ? t('web.yes') : t('web.no')} />
                <InfoRow label={t('web.toggle_diwali_label')} value={savedSettings.diwali_countdown ? t('web.enabled') : t('web.disabled')} />
                <InfoRow label={t('web.toggle_online_label')} value={savedSettings.online_sales ? t('web.enabled') : t('web.disabled')} />
                <InfoRow
                  label="Minimum Order Rupees"
                  value={savedSettings.minimum_order_rupees !== '' && savedSettings.minimum_order_rupees !== null ? `₹${Number(savedSettings.minimum_order_rupees).toLocaleString('en-IN')}` : ''}
                />
                <InfoRow label={t('web.toggle_tracking_label')} value={savedSettings.tacking ? t('web.enabled') : t('web.disabled')} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
