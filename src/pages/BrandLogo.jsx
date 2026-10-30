import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle, Edit2, Eye, Image as ImageIcon, Loader2,
  Save, Sparkles, Trash2, Upload, X
} from 'lucide-react';
import { brandLogoAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return Array.isArray(value?.data?.data) ? value.data.data : [];
}

function getLogoUrl(item) {
  const image = item?.image_url || item?.images || item?.image || '';
  if (!image) return '';
  if (String(image).startsWith('http://') || String(image).startsWith('https://') || String(image).startsWith('data:') || String(image).startsWith('blob:')) return image;
  return `https://offer360.in/uploads/sds_crackers_shop_6/brand_logos/${String(image).replace(/^\/+/, '')}`;
}

function LogoUploadBox({ file, currentUrl, onFileChange, label }) {
  const preview = file ? URL.createObjectURL(file) : currentUrl;
  return (
    <label style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: '14px', alignItems: 'center', padding: '14px', borderRadius: '14px', border: '2px dashed #CBD5E1', background: '#F8FAFC', cursor: 'pointer', position: 'relative' }}>
      <div style={{ width: '92px', height: '92px', borderRadius: '14px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {preview ? (
          <img src={preview} alt="Brand logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} />
        ) : (
          <ImageIcon size={32} color="#94A3B8" />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5B5FC7', fontWeight: 900, marginBottom: '6px' }}>
          <Upload size={17} /> {label}
        </div>
        <div style={{ color: '#64748B', fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.5 }}>
          {file ? file.name : 'Choose PNG, JPG or WebP brand logo image'}
        </div>
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
      />
    </label>
  );
}

function ModalShell({ title, children, onClose, width = 560 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px' }}>
      <div className="admin-card" style={{ width: '100%', maxWidth: `${width}px`, margin: 0, padding: 0, overflow: 'hidden', boxShadow: '0 24px 70px rgba(15,23,42,0.28)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0F172A' }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '9px', border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={17} color="#64748B" />
          </button>
        </div>
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </div>
  );
}

export default function BrandLogo() {
  const { t } = useLanguage();
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLogo, setEditingLogo] = useState(null);
  const [viewingLogo, setViewingLogo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [inlineLogoFile, setInlineLogoFile] = useState(null);
  const [modalError, setModalError] = useState('');
  const inlineFileInputRef = useRef(null);

  const fetchLogos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await brandLogoAPI.getBrandLogos();
      setLogos(toArray(res));
    } catch (err) {
      toast.error(err.message || t('brand_logo.error_load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchLogos();
  }, [fetchLogos]);

  const openEditModal = (logo) => {
    setEditingLogo(logo);
    setLogoFile(null);
    setModalError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!logoFile) {
      setModalError(t('brand_logo.error_image_required'));
      return;
    }
    const fd = new FormData();
    fd.append('images', logoFile);

    setSaving(true);
    try {
      if (editingLogo) {
        await brandLogoAPI.updateBrandLogo(editingLogo.id, fd);
      } else {
        await brandLogoAPI.createBrandLogo(fd);
      }
      setShowModal(false);
      setEditingLogo(null);
      setLogoFile(null);
      await fetchLogos();
    } catch (err) {
      setModalError(err.message || t('brand_logo.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const handleInlineSave = async () => {
    if (!inlineLogoFile) return;
    const fd = new FormData();
    fd.append('images', inlineLogoFile);

    setSaving(true);
    try {
      // The main upload panel always adds a new logo. Replacements only happen
      // through the edit action on an existing logo card.
      await brandLogoAPI.createBrandLogo(fd);
      setInlineLogoFile(null);
      if (inlineFileInputRef.current) inlineFileInputRef.current.value = '';
      await fetchLogos();
    } catch (err) {
      toast.error(err.message || t('brand_logo.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await brandLogoAPI.deleteBrandLogo(deleteTarget.id);
      setDeleteTarget(null);
      await fetchLogos();
    } catch (err) {
      toast.error(err.message || t('brand_logo.error_delete'));
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  const inlinePreviewUrl = inlineLogoFile ? URL.createObjectURL(inlineLogoFile) : '';

  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 84px)' }}>
      <div className="page-title-row" style={{ maxWidth: '900px', margin: '0 auto 24px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ImageIcon size={26} color="#5B5FC7" />
            {t('brand_logo.title')}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '4px', fontWeight: 600 }}>
            {t('brand_logo.subtitle')}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 900px)', justifyContent: 'center', gap: '16px', alignItems: 'start' }}>
        <div className="hide-scrollbar" style={{ display: 'grid', gap: '16px', paddingRight: '6px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="admin-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.02rem', color: '#0F172A', fontWeight: 900 }}>{t('brand_logo.current_logo')}</h3>
                <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '0.78rem', fontWeight: 700 }}>{logos.length} {t('brand_logo.total')}</p>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '999px', background: '#EEF2FF', color: '#4F46E5', fontSize: '0.72rem', fontWeight: 900 }}>
                <Sparkles size={13} /> Live
              </span>
            </div>

            <button
              type="button"
              onClick={() => inlineFileInputRef.current?.click()}
              style={{ width: '100%', minHeight: '170px', borderRadius: '16px', background: 'linear-gradient(135deg,#F8FAFC,#EEF2FF)', border: inlineLogoFile ? '2px solid #5B5FC7' : '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', marginBottom: '16px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}
            >
              <input
                ref={inlineFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setInlineLogoFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
              {inlinePreviewUrl ? (
                <img src={inlinePreviewUrl} alt="Selected brand logo" style={{ maxWidth: '100%', maxHeight: '130px', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#94A3B8', fontWeight: 800 }}>
                  <ImageIcon size={34} />
                  <div style={{ marginTop: '8px' }}>{t('brand_logo.empty')}</div>
                  <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#64748B' }}>{t('brand_logo.click_upload')}</div>
                </div>
              )}
              <span style={{ position: 'absolute', right: '12px', bottom: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '999px', background: '#FFFFFF', color: '#5B5FC7', border: '1px solid #C7D2FE', fontSize: '0.72rem', fontWeight: 900, boxShadow: '0 6px 16px rgba(15,23,42,0.08)' }}>
                <Upload size={13} /> {inlineLogoFile ? t('brand_logo.selected') : t('brand_logo.click_upload')}
              </span>
            </button>

            {inlineLogoFile ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => {
                  setInlineLogoFile(null);
                  if (inlineFileInputRef.current) inlineFileInputRef.current.value = '';
                }} disabled={saving} style={{ justifyContent: 'center' }}>
                  <X size={16} />
                  {t('brand_logo.clear')}
                </button>
                <button type="button" className="btn-primary" onClick={handleInlineSave} disabled={saving} style={{ justifyContent: 'center' }}>
                  {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                  {saving ? t('brand_logo.saving') : t('brand_logo.save')}
                </button>
              </div>
            ) : (
              <button type="button" className="btn-primary" onClick={() => inlineFileInputRef.current?.click()} style={{ width: '100%', justifyContent: 'center' }}>
                <Upload size={17} />
                {t('brand_logo.upload_new')}
              </button>
            )}
          </div>

          <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#0F172A', fontWeight: 900 }}>{t('brand_logo.list_title')}</h3>
            </div>
            {loading ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#64748B', fontWeight: 800 }}>
                <Loader2 size={20} className="animate-spin" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                {t('brand_logo.loading')}
              </div>
            ) : logos.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#94A3B8', fontWeight: 800 }}>{t('brand_logo.empty')}</div>
            ) : (
              <div style={{ display: 'grid' }}>
                {logos.map((logo) => {
                  const url = getLogoUrl(logo);
                  return (
                    <div key={logo.id} style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: '12px', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ width: '64px', height: '54px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {url ? <img src={url} alt={`Brand logo ${logo.id}`} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} /> : <ImageIcon size={22} color="#94A3B8" />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900, color: '#0F172A' }}>#{logo.id} {logo.images || ''}</div>
                        <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 700, marginTop: '3px' }}>{logo.created_at || '-'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '7px' }}>
                        <button type="button" title={t('brand_logo.view')} onClick={() => setViewingLogo(logo)} style={{ width: '32px', height: '32px', borderRadius: '9px', border: '1px solid #BFDBFE', background: '#EFF6FF', cursor: 'pointer' }}>
                          <Eye size={14} color="#2563EB" />
                        </button>
                        <button type="button" title={t('brand_logo.edit')} onClick={() => openEditModal(logo)} style={{ width: '32px', height: '32px', borderRadius: '9px', border: '1px solid #C7D2FE', background: '#EEF2FF', cursor: 'pointer' }}>
                          <Edit2 size={14} color="#5B5FC7" />
                        </button>
                        <button type="button" title={t('brand_logo.delete')} onClick={() => setDeleteTarget(logo)} style={{ width: '32px', height: '32px', borderRadius: '9px', border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer' }}>
                          <Trash2 size={14} color="#DC2626" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {showModal && (
        <ModalShell title={editingLogo ? t('brand_logo.edit_title') : t('brand_logo.add_title')} onClose={() => setShowModal(false)}>
          {modalError && (
            <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', background: '#FEF2F2', color: '#DC2626', borderRadius: '10px', marginBottom: '16px', fontWeight: 800 }}>
              <AlertCircle size={16} /> {modalError}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '18px' }}>
            <LogoUploadBox
              file={logoFile}
              currentUrl={editingLogo ? getLogoUrl(editingLogo) : ''}
              onFileChange={setLogoFile}
              label={editingLogo ? t('brand_logo.replace_image') : t('brand_logo.choose_image')}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>{t('brand_logo.cancel')}</button>
              <button type="submit" className="btn-primary" disabled={saving} style={{ gap: '8px' }}>
                {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                {saving ? t('brand_logo.saving') : t('brand_logo.save')}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {viewingLogo && (
        <ModalShell title={t('brand_logo.view_title')} onClose={() => setViewingLogo(null)} width={520}>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ minHeight: '210px', borderRadius: '16px', background: 'linear-gradient(135deg,#F8FAFC,#EEF2FF)', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '22px' }}>
              <img src={getLogoUrl(viewingLogo)} alt={`Brand logo ${viewingLogo.id}`} style={{ maxWidth: '100%', maxHeight: '170px', objectFit: 'contain' }} />
            </div>
            {[
              ['ID', `#${viewingLogo.id}`],
              ['File', viewingLogo.images || '-'],
              ['Created At', viewingLogo.created_at || '-'],
              ['Updated At', viewingLogo.updated_at || '-']
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '12px', padding: '10px 12px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>{label}</span>
                <span style={{ color: '#0F172A', fontWeight: 800, wordBreak: 'break-word' }}>{value}</span>
              </div>
            ))}
          </div>
        </ModalShell>
      )}

      {deleteTarget && (
        <ModalShell title={t('brand_logo.delete_title')} onClose={() => setDeleteTarget(null)} width={440}>
          <p style={{ margin: '0 0 18px', color: '#475569', fontWeight: 700, lineHeight: 1.6 }}>
            {t('brand_logo.delete_confirm')} <strong style={{ color: '#0F172A' }}>#{deleteTarget.id}</strong>?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>{t('brand_logo.cancel')}</button>
            <button type="button" className="btn-danger" disabled={deletingId === deleteTarget.id} onClick={handleConfirmDelete} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {deletingId === deleteTarget.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {deletingId === deleteTarget.id ? t('brand_logo.deleting') : t('brand_logo.delete')}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
