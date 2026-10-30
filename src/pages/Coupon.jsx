import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { couponAPI } from '../api/api';
import {
  Plus, Trash2, Tag, Edit, X, RefreshCw, Loader2, AlertCircle, CheckCircle2,
  Calendar, Check
} from 'lucide-react';

export default function Coupon() {
  const { t } = useLanguage();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsgValue] = useState('');
  const setErrorMsg = (message) => { setErrorMsgValue(message); if (message) toast.error(message); };
  const [modalError, setModalError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    minimum_order_amount: 1000,
    expiry: '2026-12-31',
    description: ''
  });

  const [deleteTarget, setDeleteTarget] = useState(null); // { id, code }

  // Fetch Coupons on Mount
  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await couponAPI.getCoupons();
      if (res && Array.isArray(res.data)) {
        setCoupons(res.data);
      } else {
        throw new Error(res?.message || 'Failed to load coupons');
      }
    } catch (err) {
      console.warn('API coupon fetch failed:', err.message);
      setCoupons([]);
      setErrorMsg(err.message || t('cup.fetch_error'));
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCoupon(null);
    setFormData({
      name: '',
      code: '',
      discount_type: 'percentage',
      discount_value: 10,
      minimum_order_amount: 1000,
      expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: ''
    });
    setModalError('');
    setShowModal(true);
  };

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon);
    let rawDate = coupon.expiry || '';
    if (rawDate.includes(' ')) {
      rawDate = rawDate.split(' ')[0];
    } else if (rawDate.includes('T')) {
      rawDate = rawDate.split('T')[0];
    }

    const discountType = (coupon.discount_type === 'flat' ? 'amount' : coupon.discount_type) || 'percentage';

    setFormData({
      name: coupon.name || '',
      code: coupon.code || '',
      discount_type: discountType,
      discount_value: coupon.discount_value !== undefined ? Number(coupon.discount_value) : 10,
      minimum_order_amount: coupon.minimum_order_amount !== undefined ? Number(coupon.minimum_order_amount) : 1000,
      expiry: rawDate || '2026-12-31',
      description: coupon.description || ''
    });
    setModalError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      setModalError(t('cup.err_code_required'));
      return;
    }

    setSaving(true);
    setModalError('');

    const payload = {
      name: formData.name.trim() || formData.code.trim(),
      code: formData.code.toUpperCase().trim(),
      discount_type: formData.discount_type,
      discount_value: Number(formData.discount_value) || 0,
      minimum_order_amount: Number(formData.minimum_order_amount) || 0,
      expiry: formData.expiry,
      description: formData.description.trim()
    };

    try {
      let res;
      if (editingCoupon) {
        res = await couponAPI.updateCoupon(editingCoupon.id, payload);
      } else {
        res = await couponAPI.createCoupon(payload);
      }

      if (res && res.success) {
        setSuccessMsg(res.message || (editingCoupon ? t('cup.success_updated') : t('cup.success_created')));
        setShowModal(false);
        fetchCoupons();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setModalError(res?.message || t('cup.err_operation_failed'));
      }
    } catch (err) {
      console.error('Coupon submit error:', err);
      setModalError(err.message || t('cup.err_server_failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, code } = deleteTarget;
    setDeletingId(id);
    setErrorMsg('');

    try {
      const res = await couponAPI.deleteCoupon(id);
      if (res && res.success) {
        setSuccessMsg(res.message || `${t('cup.delete_success')}: "${code}"`);
        setDeleteTarget(null);
        fetchCoupons();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        throw new Error(res?.message || t('cup.err_delete_failed'));
      }
    } catch (err) {
      console.error('Delete coupon error:', err);
      setErrorMsg(err.message || t('cup.err_delete_failed'));
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ width: '100%' }}>

      {/* Header Bar */}
      <div className="page-title-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Tag size={24} color="#5B5FC7" />
            {t('cup.title')}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '4px', fontWeight: 600 }}>
            {t('cup.subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchCoupons}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem', gap: '6px' }}
          >
            <RefreshCw size={16} /> {t('cup.refresh')}
          </button>

          <button className="btn-primary" onClick={openAddModal} style={{ padding: '8px 18px', fontSize: '0.88rem', gap: '6px' }}>
            <Plus size={18} />
            <span>{t('cup.add_new')}</span>
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

      {/* Coupons Table Card */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('cup.th_code_name')}</th>
                <th>{t('cup.th_discount')}</th>
                <th>{t('cup.th_min_order')}</th>
                <th>{t('cup.th_expiry')}</th>
                <th>{t('cup.th_description')}</th>
                <th style={{ textAlign: 'right' }}>{t('cup.th_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <Loader2 size={22} color="#5B5FC7" className="animate-spin" />
                      <span>{t('cup.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                    {t('cup.empty_1')} <strong>"{t('cup.add_new')}"</strong> {t('cup.empty_2')}
                  </td>
                </tr>
              ) : (
                coupons.map((c) => {
                  const isExpired = new Date(c.expiry) < new Date();
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 800, color: '#E65100', fontSize: '0.92rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Tag size={15} />
                            {c.code}
                          </span>
                          {c.name && <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{c.name}</span>}
                        </div>
                      </td>

                      <td style={{ fontWeight: 700, color: '#0F172A' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '4px 10px', borderRadius: '20px',
                          background: c.discount_type === 'percentage' ? '#EEF2FF' : '#FEF3C7',
                          color: c.discount_type === 'percentage' ? '#5B5FC7' : '#D97706',
                          fontSize: '0.82rem', fontWeight: 700
                        }}>
                          {c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value}`} {t('cup.off')}
                        </span>
                      </td>

                      <td style={{ fontWeight: 600, color: '#334155' }}>
                        ₹{Number(c.minimum_order_amount || 0).toLocaleString('en-IN')}
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} color="#64748B" />
                          <span style={{ fontSize: '0.85rem', color: isExpired ? '#EF4444' : '#334155', fontWeight: isExpired ? 700 : 500 }}>
                            {c.expiry ? c.expiry.split(' ')[0] : t('cup.na')}
                          </span>
                          {isExpired && (
                            <span style={{ fontSize: '0.68rem', background: '#FEE2E2', color: '#EF4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              {t('cup.expired')}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ fontSize: '0.82rem', color: '#64748B', maxWidth: '200px' }}>
                        {c.description || <span style={{ fontStyle: 'italic', color: '#CBD5E1' }}>-</span>}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '5px 10px', borderRadius: '6px', border: '1.5px solid #C7D2FE',
                              background: '#EEF2FF', color: '#5B5FC7', fontSize: '0.78rem', fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Edit size={13} /> {t('cup.edit')}
                          </button>

                          <button
                            type="button"
                            className="btn-danger"
                            disabled={deletingId === c.id}
                            style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setDeleteTarget({ id: c.id, code: c.code })}
                          >
                            {deletingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            {t('cup.delete')}
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

      {/* Create / Edit Coupon Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={20} color="#5B5FC7" />
                {editingCoupon ? t('cup.modal_title_edit') : t('cup.modal_title_create')}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">{t('cup.label_code')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('cup.placeholder_code')}
                    required
                    style={{ textTransform: 'uppercase', fontWeight: 700 }}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('cup.label_name')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('cup.placeholder_name')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">{t('cup.label_type')}</label>
                  <select
                    className="form-select"
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  >
                    <option value="percentage">{t('cup.type_percentage')}</option>
                    <option value="amount">{t('cup.type_amount')}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {t('cup.label_discount_value')} ({formData.discount_type === 'percentage' ? '%' : '₹'}) *
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min="1"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">{t('cup.label_min_order')}</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={formData.minimum_order_amount}
                    onChange={(e) => setFormData({ ...formData, minimum_order_amount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('cup.label_expiry')}</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    value={formData.expiry}
                    onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('cup.label_description')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('cup.placeholder_description')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  {t('cup.cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={saving} style={{ gap: '6px' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{saving ? t('cup.saving') : (editingCoupon ? t('cup.update') : t('cup.create'))}</span>
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
              {t('cup.delete_title')}
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.5, marginBottom: '24px' }}>
              {t('cup.delete_confirm_1')} <strong style={{ color: '#E65100' }}>"{deleteTarget.code}"</strong>{t('cup.delete_confirm_2')}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: '10px 16px', fontWeight: 700, justifyContent: 'center', textAlign: 'center' }}
              >
                {t('cup.cancel')}
              </button>

              <button
                type="button"
                className="btn-danger"
                disabled={deletingId === deleteTarget.id}
                onClick={handleConfirmDelete}
                style={{ flex: 1, padding: '10px 16px', gap: '6px', justifyContent: 'center', fontWeight: 700 }}
              >
                {deletingId === deleteTarget.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>{deletingId === deleteTarget.id ? t('cup.deleting') : t('cup.yes_delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
