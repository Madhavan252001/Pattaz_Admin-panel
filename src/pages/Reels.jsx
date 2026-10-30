import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { reelsAPI, productAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';
import {
  Video, Plus, Trash2, Edit, X, RefreshCw, Loader2, AlertCircle, CheckCircle2,
  Check, Play, ArrowUp, ArrowDown, Package, ExternalLink, GripVertical, Eye,
  Share2, Volume2, VolumeX, ShoppingCart, ChevronUp, ChevronDown

} from 'lucide-react';

function isDirectVideoUrl(url) {
  if (!url) return false;
  return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg') || url.includes('.mp4?') || url.includes('example.com');
}

function getYouTubeEmbedUrl(url, isMuted = false) {
  if (!url) return '';
  let videoId = '';
  if (url.includes('/shorts/')) {
    videoId = url.split('/shorts/')[1]?.split('?')[0]?.split('/')[0];
  } else if (url.includes('v=')) {
    videoId = url.split('v=')[1]?.split('&')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0];
  } else if (url.includes('/embed/')) {
    videoId = url.split('/embed/')[1]?.split('?')[0];
  }

  if (videoId) {
    const muteVal = isMuted ? 1 : 0;
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=${muteVal}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&playsinline=1&enablejsapi=1&loop=1&playlist=${videoId}`;
  }
  return url;
}

export default function Reels() {
  const { t } = useLanguage();
  const [reels, setReels] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [draggedIdx, setDraggedIdx] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingReel, setEditingReel] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [previewIndex, setPreviewIndex] = useState(null); // Index of reel being previewed
  const [isMuted, setIsMuted] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsgValue] = useState('');
  const setErrorMsg = (message) => { setErrorMsgValue(message); if (message) toast.error(message); };
  const [modalError, setModalError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    product_id: '',
    position: 1
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async (excludeReelId) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [reelsRes, prodRes] = await Promise.allSettled([
        reelsAPI.getReels(),
        productAPI.getProducts()
      ]);

      if (reelsRes.status === 'fulfilled' && reelsRes.value?.success) {
        const sorted = Array.isArray(reelsRes.value.data)
          ? [...reelsRes.value.data].sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))
          : [];
        setReels(excludeReelId ? sorted.filter((r) => r.id !== excludeReelId) : sorted);
      }

      if (prodRes.status === 'fulfilled' && prodRes.value?.success) {
        setProducts(Array.isArray(prodRes.value.data) ? prodRes.value.data : []);
      }
    } catch (err) {
      console.error('Error loading reels data:', err);
      setErrorMsg(err.message || t('reels.failed_load'));
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIdx) return;

    const updated = [...reels];
    const [movedItem] = updated.splice(draggedIdx, 1);
    updated.splice(dropIdx, 0, movedItem);

    const reordered = updated.map((r, i) => ({ ...r, position: i + 1 }));
    setReels(reordered);
    setDraggedIdx(null);

    try {
      await Promise.all(
        reordered.map((r) =>
          reelsAPI.updateReelPosition(r.id, {
            product_id: r.product_id || r.product?.id || 1,
            position: r.position
          })
        )
      );
      setSuccessMsg(t('reels.position_reordered'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error updating positions:', err);
      fetchInitialData();
    }
  };

  const handleMoveUp = async (index) => {
    if (index <= 0) return;
    const updated = [...reels];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;

    const reordered = updated.map((r, i) => ({ ...r, position: i + 1 }));
    setReels(reordered);

    try {
      await Promise.all(
        reordered.map((r) =>
          reelsAPI.updateReelPosition(r.id, {
            product_id: r.product_id || r.product?.id || 1,
            position: r.position
          })
        )
      );
      setSuccessMsg(t('reels.position_updated'));
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      console.error('Error moving position up:', err);
      fetchInitialData();
    }
  };

  const handleMoveDown = async (index) => {
    if (index >= reels.length - 1) return;
    const updated = [...reels];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;

    const reordered = updated.map((r, i) => ({ ...r, position: i + 1 }));
    setReels(reordered);

    try {
      await Promise.all(
        reordered.map((r) =>
          reelsAPI.updateReelPosition(r.id, {
            product_id: r.product_id || r.product?.id || 1,
            position: r.position
          })
        )
      );
      setSuccessMsg(t('reels.position_updated'));
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      console.error('Error moving position down:', err);
      fetchInitialData();
    }
  };

  const openAddModal = () => {
    setEditingReel(null);
    setFormData({
      name: '',
      url: '',
      product_id: products.length > 0 ? products[0].id : '',
      position: reels.length + 1
    });
    setModalError('');
    setShowModal(true);
  };

  const openEditModal = (reel) => {
    setEditingReel(reel);
    setFormData({
      name: reel.name || '',
      url: reel.url || '',
      product_id: reel.product_id || (reel.product?.id || ''),
      position: reel.position || 1
    });
    setModalError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError(t('reels.name_required'));
      return;
    }
    if (!formData.url.trim()) {
      setModalError(t('reels.url_required'));
      return;
    }

    setSaving(true);
    setModalError('');

    const payload = {
      name: formData.name.trim(),
      url: formData.url.trim(),
      product_id: Number(formData.product_id) || null,
      position: Number(formData.position) || 1
    };

    try {
      let res;
      if (editingReel) {
        res = await reelsAPI.updateReel(editingReel.id, payload);
      } else {
        res = await reelsAPI.createReel(payload);
      }

      if (res && res.success) {
        setSuccessMsg(res.message || (editingReel ? t('reels.updated_success') : t('reels.added_success')));
        setShowModal(false);
        fetchInitialData();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setModalError(res?.message || t('reels.operation_failed'));
      }
    } catch (err) {
      console.error('Submit reel error:', err);
      setModalError(err.message || t('reels.server_error_save'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeletingId(id);
    setErrorMsg('');

    try {
      const res = await reelsAPI.deleteReel(id);
      if (res && res.success) {
        setSuccessMsg(res.message || `${t('reels.deleted_success_prefix')} "${name}" ${t('reels.deleted_success_suffix')}`);
        setDeleteTarget(null);
        if (previewIndex !== null && reels[previewIndex]?.id === id) {
          setPreviewIndex(null);
        }
        setReels((prev) => prev.filter((r) => r.id !== id));
        fetchInitialData(id);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        throw new Error(res?.message || t('reels.delete_failed'));
      }
    } catch (err) {
      console.error('Delete reel error:', err);
      setErrorMsg(err.message || t('reels.delete_failed'));
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  const activePreviewReel = previewIndex !== null && reels[previewIndex] ? reels[previewIndex] : null;
  const previewProd = activePreviewReel?.product;
  const previewProdImg = previewProd?.product_images?.[0]?.images || previewProd?.image || null;

  return (
    <div style={{ width: '100%' }}>

      {/* Header Bar */}
      <div className="page-title-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(220, 39, 67, 0.35)', flexShrink: 0
            }}>
              <Video size={20} color="#FFFFFF" />
            </div>
            {t('reels.title')}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '4px', fontWeight: 600 }}>
            {t('reels.subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {reels.length > 0 && (
            <button
              type="button"
              onClick={() => setPreviewIndex(0)}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.85rem', gap: '6px', background: '#FDF2F8', color: '#DB2777', border: '1px solid #FBCFE8' }}
            >
              <Eye size={16} /> {t('reels.live_preview')}
            </button>
          )}

          <button
            type="button"
            onClick={fetchInitialData}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem', gap: '6px' }}
          >
            <RefreshCw size={16} /> {t('reels.refresh')}
          </button>

          <button className="btn-primary" onClick={openAddModal} style={{ padding: '8px 18px', fontSize: '0.88rem', gap: '6px' }}>
            <Plus size={18} />
            <span>{t('reels.add_new_reel')}</span>
          </button>
        </div>
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

      {/* Reels Table Card */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>{t('reels.col_position')}</th>
                <th>{t('reels.col_title_url')}</th>
                <th>{t('reels.col_linked_product')}</th>
                <th>{t('reels.col_product_price')}</th>
                <th style={{ textAlign: 'right' }}>{t('reels.col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <Loader2 size={22} color="#5B5FC7" className="animate-spin" />
                      <span>{t('reels.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : reels.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                    {t('reels.empty_state_1')} <strong>"{t('reels.add_new_reel')}"</strong> {t('reels.empty_state_2')}
                  </td>
                </tr>
              ) : (
                reels.map((r, idx) => {
                  const linkedProd = r.product;
                  const prodImg = linkedProd?.product_images?.[0]?.images || linkedProd?.image || null;
                  const isBeingDragged = draggedIdx === idx;

                  return (
                    <tr
                      key={r.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      style={{
                        background: isBeingDragged ? '#EEF2FF' : 'transparent',
                        boxShadow: isBeingDragged ? '0 4px 12px rgba(91, 95, 199, 0.15)' : 'none',
                        transition: 'background 0.15s'
                      }}
                    >
                      {/* Position */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: '#94A3B8' }} title={t('reels.drag_to_reorder')}>
                            <GripVertical size={16} />
                          </span>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '26px', height: '26px', borderRadius: '6px',
                            background: '#EEF2FF', color: '#5B5FC7', fontWeight: 800, fontSize: '0.85rem'
                          }}>
                            {r.position || (idx + 1)}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <button
                              type="button"
                              onClick={() => handleMoveUp(idx)}
                              disabled={idx === 0}
                              style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', padding: 0, color: idx === 0 ? '#CBD5E1' : '#5B5FC7' }}
                              title={t('reels.move_up')}
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveDown(idx)}
                              disabled={idx === reels.length - 1}
                              style={{ border: 'none', background: 'none', cursor: idx === reels.length - 1 ? 'not-allowed' : 'pointer', padding: 0, color: idx === reels.length - 1 ? '#CBD5E1' : '#5B5FC7' }}
                              title={t('reels.move_down')}
                            >
                              <ArrowDown size={13} />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Reel Title & Link */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Play size={16} color="#E1306C" fill="#E1306C" style={{ opacity: 0.9 }} />
                            {r.name}
                          </span>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={r.url}
                            style={{
                              fontSize: '0.78rem', color: '#5B5FC7', textDecoration: 'none',
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              maxWidth: '280px'
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.url?.length > 42 ? `${r.url.substring(0, 40)}...` : r.url}
                            </span>
                            <ExternalLink size={12} style={{ flexShrink: 0 }} />
                          </a>
                        </div>
                      </td>

                      {/* Linked Product */}
                      <td>
                        {linkedProd ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {prodImg ? (
                              <img
                                src={prodImg}
                                alt={linkedProd.name}
                                style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #E2E8F0' }}
                              />
                            ) : (
                              <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Package size={18} color="#94A3B8" />
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.85rem' }}>{linkedProd.name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{linkedProd.pack_quantity || linkedProd.height || ''}</div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: '#CBD5E1', fontSize: '0.82rem' }}>{t('reels.no_product_linked')}</span>
                        )}
                      </td>

                      {/* Product Price */}
                      <td>
                        {linkedProd ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 800, color: '#16A34A', fontSize: '0.88rem' }}>
                              ₹{linkedProd.discount_price || linkedProd.original_price}
                            </span>
                            {linkedProd.discount_price && linkedProd.original_price && (
                              <span style={{ fontSize: '0.72rem', color: '#94A3B8', textDecoration: 'line-through' }}>
                                ₹{linkedProd.original_price}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#CBD5E1' }}>-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setPreviewIndex(idx)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '5px 10px', borderRadius: '6px', border: '1.5px solid #FBCFE8',
                              background: '#FDF2F8', color: '#DB2777', fontSize: '0.78rem', fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={13} /> {t('reels.preview')}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(r)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '5px 10px', borderRadius: '6px', border: '1.5px solid #C7D2FE',
                              background: '#EEF2FF', color: '#5B5FC7', fontSize: '0.78rem', fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Edit size={13} /> {t('reels.edit')}
                          </button>

                          <button
                            type="button"
                            className="btn-danger"
                            disabled={deletingId === r.id}
                            style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setDeleteTarget({ id: r.id, name: r.name })}
                          >
                            {deletingId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            {t('reels.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Reel Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div className="modal-content" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Video size={20} color="#5B5FC7" />
                {editingReel ? t('reels.edit_video_reel') : t('reels.add_new_video_reel')}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', background: '#FEE2E2', color: '#EF4444',
                borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600
              }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label">{t('reels.label_title')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('reels.placeholder_name')}
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('reels.label_url')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('reels.placeholder_url')}
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label">{t('reels.label_linked_product')}</label>
                  <select
                    className="form-select"
                    style={{ width: '100%', maxWidth: '100%' }}
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  >
                    <option value="">{t('reels.select_linked_product')}</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.discount_price || p.original_price})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label">{t('reels.label_position')}</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: '100%' }}
                    min="1"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  {t('reels.cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={saving} style={{ gap: '6px' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{saving ? t('reels.saving') : (editingReel ? t('reels.update_reel') : t('reels.add_reel'))}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup Modal */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '28px 24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Trash2 size={24} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              {t('reels.delete_title')}
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.5, marginBottom: '24px' }}>
              {t('reels.delete_confirm_1')} <strong style={{ color: '#E65100' }}>"{deleteTarget.name}"</strong>{t('reels.delete_confirm_2')}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: '10px 16px', fontWeight: 700, justifyContent: 'center', textAlign: 'center' }}
              >
                {t('reels.cancel')}
              </button>

              <button
                type="button"
                className="btn-danger"
                disabled={deletingId === deleteTarget.id}
                onClick={handleConfirmDelete}
                style={{ flex: 1, padding: '10px 16px', gap: '6px', justifyContent: 'center', fontWeight: 700 }}
              >
                {deletingId === deleteTarget.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>{deletingId === deleteTarget.id ? t('reels.deleting') : t('reels.confirm_delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📱 MOBILE REEL PLAYER PREVIEW MODAL (EXACT MATCH TO UI SCREENSHOT) */}
      {activePreviewReel && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '340px',
              height: '640px',
              borderRadius: '28px',
              background: '#09090B',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 0 4px rgba(255, 255, 255, 0.1)',
              border: '2px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            {/* Close X Button */}
            <button
              type="button"
              onClick={() => setPreviewIndex(null)}
              style={{
                position: 'absolute', top: '12px', right: '12px', zIndex: 30,
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.6)', border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>

            {/* Video Iframe / Player (Native controls hidden!) */}
            {isDirectVideoUrl(activePreviewReel.url) ? (
              <video
                src={activePreviewReel.url}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : activePreviewReel.url ? (
              <iframe
                key={`${activePreviewReel.id}-${isMuted}`}
                src={getYouTubeEmbedUrl(activePreviewReel.url, isMuted)}
                title={activePreviewReel.name}
                style={{ width: '100%', height: '100%', border: 'none', objectFit: 'cover' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8' }}>
                {t('reels.no_video_url')}
              </div>
            )}

            {/* Sound Toggle / YouTube Sound Pill Button */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              style={{
                position: 'absolute', top: '14px', left: '12px', zIndex: 25,
                background: 'linear-gradient(90deg, #E1306C 0%, #FD1D1D 100%)',
                color: '#FFFFFF', padding: '6px 12px', borderRadius: '20px',
                fontSize: '0.7rem', fontWeight: 800, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px',
                boxShadow: '0 4px 12px rgba(225, 48, 108, 0.4)'
              }}
            >
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              <span>{isMuted ? t('reels.click_to_unmute') : t('reels.sound_on')}</span>
            </button>

            {/* Channel Title & Reel Name Overlay */}
            <div style={{ position: 'absolute', top: '52px', left: '12px', right: '12px', zIndex: 20, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFF', fontWeight: 800, fontSize: '0.72rem', border: '1.5px solid #FFF',
                flexShrink: 0
              }}>
                {activePreviewReel.name?.substring(0, 2)?.toUpperCase() || 'RS'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activePreviewReel.name} 🤩 😹
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.68rem', fontWeight: 600 }}>
                  SDS FIREWORKS
                </div>
              </div>
            </div>

            {/* Left Reel Switch Controls (Up / Down Arrows) */}
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPreviewIndex(prev => Math.max(0, prev - 1))}
                disabled={previewIndex === 0}
                style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(8px)',
                  border: 'none', cursor: previewIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: previewIndex === 0 ? 0.4 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}
              >
                <ChevronUp size={18} color="#0F172A" />
              </button>

              <button
                type="button"
                onClick={() => setPreviewIndex(prev => Math.min(reels.length - 1, prev + 1))}
                disabled={previewIndex === reels.length - 1}
                style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(8px)',
                  border: 'none', cursor: previewIndex === reels.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: previewIndex === reels.length - 1 ? 0.4 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}
              >
                <ChevronDown size={18} color="#0F172A" />
              </button>
            </div>

            {/* Right Side Social Actions (Share) */}
            <div style={{ position: 'absolute', bottom: '110px', right: '12px', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}>
                  <Share2 size={16} color="#0F172A" />
                </div>
                <span style={{ color: '#FFFFFF', fontSize: '0.68rem', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{t('reels.share')}</span>
              </div>
            </div>

            {/* Bottom Floating Glassmorphic Product Card (EXACT MATCH TO UI SCREENSHOT) */}
            {previewProd && (
              <div style={{
                position: 'absolute', bottom: '12px', left: '10px', right: '10px', zIndex: 20,
                background: 'rgba(255, 255, 255, 0.94)', backdropFilter: 'blur(12px)',
                borderRadius: '16px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 10px 25px rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.8)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  {previewProdImg ? (
                    <img
                      src={previewProdImg}
                      alt={previewProd.name}
                      style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #E2E8F0', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={20} color="#94A3B8" />
                    </div>
                  )}

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {previewProd.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontWeight: 800, color: '#D90429', fontSize: '0.88rem' }}>
                        ₹{previewProd.discount_price || previewProd.original_price}
                      </span>
                      {previewProd.discount_price && previewProd.original_price && (
                        <span style={{ fontSize: '0.72rem', color: '#94A3B8', textDecoration: 'line-through' }}>
                          ₹{previewProd.original_price}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    background: 'linear-gradient(135deg, #D90429 0%, #EF233C 100%)',
                    color: '#FFFFFF', border: 'none', borderRadius: '20px',
                    padding: '8px 12px', fontSize: '0.75rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(217, 4, 41, 0.4)', flexShrink: 0, marginLeft: '6px'
                  }}
                >
                  <ShoppingCart size={13} />
                  <span>கூடையில் சேர்</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
