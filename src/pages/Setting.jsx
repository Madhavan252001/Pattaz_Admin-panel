import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { settingsAPI } from '../api/api';
import { loadStoreConfig, saveStoreConfig } from '../utils/storeConfigStore';
import { useLanguage } from '../context/LanguageContext';
import {
  Save, CreditCard, Shield, ShoppingBag, Edit2, X, CheckCircle2,
  AlertCircle, Loader2, RefreshCw
} from 'lucide-react';

// Helper component for card header with Edit / Save / Cancel controls
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
          <Edit2 size={14} /> {t('set.edit')}
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
            <X size={14} /> {t('set.cancel')}
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
            {saving ? t('set.saving') : t('set.save')}
          </button>
        </div>
      )}
    </div>
  );
}

// Read-only info row helper
function InfoRow({ label, value, fallback }) {
  const { t } = useLanguage();
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
      <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.88rem', color: '#1E293B', fontWeight: 500 }}>
        {value || <span style={{ color: '#CBD5E1', fontStyle: 'italic' }}>{fallback || t('set.not_set')}</span>}
      </div>
    </div>
  );
}

export default function Setting() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsgValue] = useState('');
  const setErrorMsg = (message) => { setErrorMsgValue(message); if (message) toast.error(message); };
  const [editingCard, setEditingCard] = useState(null);

  // Main state holding saved values from API
  const [savedSettings, setSavedSettings] = useState({
    store_name: '',
    min_order_value: 2000,
    store_tagline: '',
    upi_id: '',
    bank_name: '',
    bank_ac: '',
    ifsc: '',
    admin_email: ''
  });

  // Draft state for uncommitted edits
  const [draft, setDraft] = useState({ ...savedSettings });

  // Load Settings from API on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await settingsAPI.getSettings();
      if (res && res.success && res.data) {
        const data = res.data;
        const loaded = {
          store_name: data.store_name || '',
          min_order_value: data.min_order_value !== undefined ? Number(data.min_order_value) : 2000,
          store_tagline: data.store_tagline || '',
          upi_id: data.upi_id || '',
          bank_name: data.bank_name || '',
          bank_ac: data.bank_ac || '',
          ifsc: data.ifsc || '',
          admin_email: data.admin_email || ''
        };
        setSavedSettings(loaded);
        setDraft(loaded);

        // Also sync local storeConfig fallback if needed
        const localCfg = loadStoreConfig();
        if (localCfg) {
          saveStoreConfig({
            ...localCfg,
            setting: {
              ...localCfg.setting,
              storeName: loaded.store_name,
              minOrderValue: loaded.min_order_value,
              tagline: loaded.store_tagline,
              upiId: loaded.upi_id,
              bankName: loaded.bank_name,
              accNo: loaded.bank_ac,
              ifsc: loaded.ifsc,
              adminEmail: loaded.admin_email
            }
          });
        }
      }
    } catch (err) {
      console.warn('API fetch settings error, using fallback:', err.message);
      // Fallback to local store config if API fails
      const localCfg = loadStoreConfig();
      if (localCfg && localCfg.setting) {
        const loaded = {
          store_name: localCfg.setting.storeName || '',
          min_order_value: localCfg.setting.minOrderValue || 2000,
          store_tagline: localCfg.setting.tagline || '',
          upi_id: localCfg.setting.upiId || '',
          bank_name: localCfg.setting.bankName || '',
          bank_ac: localCfg.setting.accNo || '',
          ifsc: localCfg.setting.ifsc || '',
          admin_email: localCfg.setting.adminEmail || ''
        };
        setSavedSettings(loaded);
        setDraft(loaded);
      }
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
    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      store_name: draft.store_name,
      min_order_value: Number(draft.min_order_value) || 0,
      store_tagline: draft.store_tagline,
      upi_id: draft.upi_id,
      bank_name: draft.bank_name,
      bank_ac: draft.bank_ac,
      ifsc: draft.ifsc,
      admin_email: draft.admin_email
    };

    try {
      let res;
      try {
        // Try PUT method first
        res = await settingsAPI.updateSettings(payload);
      } catch (putErr) {
        console.warn('PUT failed, trying POST:', putErr.message);
        // Fallback to POST method
        res = await settingsAPI.createSettings(payload);
      }

      if (res && res.success) {
        setSavedSettings({ ...draft });
        setEditingCard(null);
        setSuccessMsg(res.message || t('set.success_updated'));

        // Sync local store config
        const localCfg = loadStoreConfig();
        if (localCfg) {
          saveStoreConfig({
            ...localCfg,
            setting: {
              ...localCfg.setting,
              storeName: draft.store_name,
              minOrderValue: Number(draft.min_order_value),
              tagline: draft.store_tagline,
              upiId: draft.upi_id,
              bankName: draft.bank_name,
              accNo: draft.bank_ac,
              ifsc: draft.ifsc,
              adminEmail: draft.admin_email
            }
          });
        }

        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        throw new Error(res?.message || t('set.error_save'));
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setErrorMsg(err.message || t('set.error_save_server'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
        <Loader2 size={32} color="#5B5FC7" className="animate-spin" />
        <span style={{ color: '#64748B', fontWeight: 600 }}>{t('set.loading')}</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>

      {/* Header Bar */}
      <div className="page-title-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag size={24} color="#5B5FC7" />
            {t('set.page_title')}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '4px', fontWeight: 600 }}>
            {t('set.page_subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          className="btn-secondary"
          style={{ padding: '8px 14px', fontSize: '0.85rem', gap: '6px' }}
        >
          <RefreshCw size={16} /> {t('set.reload_data')}
        </button>
      </div>

      {/* Success Alert */}

      {/* Error Alert */}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── CARD 1: Store General Profile ── */}
        <div className="admin-card">
          <CardHeader
            icon={<ShoppingBag />}
            iconBg="#FFF3E0"
            iconColor="#E65100"
            title={t('set.card_profile')}
            isEditing={editingCard === 'profile'}
            onEdit={() => openEditCard('profile')}
            onCancel={cancelEdit}
            saving={saving}
            onSave={saveCard}
          />

          {editingCard === 'profile' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">{t('set.label_store_name')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={draft.store_name}
                    onChange={e => handleDraftChange('store_name', e.target.value)}
                    placeholder={t('set.placeholder_store_name')}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('set.label_min_order')}</label>
                  <input
                    type="number"
                    className="form-input"
                    value={draft.min_order_value}
                    onChange={e => handleDraftChange('min_order_value', e.target.value)}
                    placeholder={t('set.placeholder_min_order')}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('set.label_tagline')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={draft.store_tagline}
                  onChange={e => handleDraftChange('store_tagline', e.target.value)}
                  placeholder={t('set.placeholder_tagline')}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <InfoRow label={t('set.label_store_name')} value={savedSettings.store_name} fallback={t('set.placeholder_store_name')} />
                <InfoRow label={t('set.label_min_order_view')} value={`₹${savedSettings.min_order_value}`} />
              </div>
              <InfoRow label={t('set.label_tagline')} value={savedSettings.store_tagline} fallback={t('set.fallback_tagline')} />
            </div>
          )}
        </div>

        {/* ── CARD 2: Payment Gateway & UPI Details ── */}
        <div className="admin-card">
          <CardHeader
            icon={<CreditCard />}
            iconBg="#EEF2FF"
            iconColor="#5B5FC7"
            title={t('set.card_payment')}
            isEditing={editingCard === 'payment'}
            onEdit={() => openEditCard('payment')}
            onCancel={cancelEdit}
            saving={saving}
            onSave={saveCard}
          />

          {editingCard === 'payment' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">{t('set.label_upi')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={draft.upi_id}
                    onChange={e => handleDraftChange('upi_id', e.target.value)}
                    placeholder={t('set.placeholder_upi')}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('set.label_bank')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={draft.bank_name}
                    onChange={e => handleDraftChange('bank_name', e.target.value)}
                    placeholder={t('set.placeholder_bank')}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">{t('set.label_acc_no')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={draft.bank_ac}
                    onChange={e => handleDraftChange('bank_ac', e.target.value)}
                    placeholder={t('set.placeholder_acc_no')}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('set.label_ifsc')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={draft.ifsc}
                    onChange={e => handleDraftChange('ifsc', e.target.value)}
                    placeholder={t('set.placeholder_ifsc')}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <InfoRow label={t('set.label_upi_id')} value={savedSettings.upi_id} fallback={t('set.fallback_upi')} />
                <InfoRow label={t('set.label_bank')} value={savedSettings.bank_name} fallback={t('set.fallback_bank')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <InfoRow label={t('set.label_account_number')} value={savedSettings.bank_ac} fallback={t('set.fallback_account_number')} />
                <InfoRow label={t('set.label_ifsc')} value={savedSettings.ifsc} fallback={t('set.fallback_ifsc')} />
              </div>
            </div>
          )}
        </div>

        {/* ── CARD 3: Admin Account & Security ── */}
        <div className="admin-card">
          <CardHeader
            icon={<Shield />}
            iconBg="#FEF3C7"
            iconColor="#D97706"
            title={t('set.card_security')}
            isEditing={editingCard === 'security'}
            onEdit={() => openEditCard('security')}
            onCancel={cancelEdit}
            saving={saving}
            onSave={saveCard}
          />

          {editingCard === 'security' ? (
            <div className="form-group">
              <label className="form-label">{t('set.label_admin_email')}</label>
              <input
                type="email"
                className="form-input"
                value={draft.admin_email}
                onChange={e => handleDraftChange('admin_email', e.target.value)}
                placeholder={t('set.placeholder_admin_email')}
              />
            </div>
          ) : (
            <InfoRow label={t('set.label_admin_email')} value={savedSettings.admin_email} fallback={t('set.fallback_email')} />
          )}
        </div>

      </div>
    </div>
  );
}
