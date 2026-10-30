import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { discountAPI } from '../api/api';
import {
  Percent, Plus, Trash2, Edit, X, RefreshCw, Loader2, AlertCircle, CheckCircle2,
  Calendar, Check, Search, Filter, Tag, ArrowUpRight, CheckSquare, XCircle
} from 'lucide-react';

export default function Discounts() {
  const { t } = useLanguage();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, percentage, amount
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsgValue] = useState('');
  const setErrorMsg = (message) => { setErrorMsgValue(message); if (message) toast.error(message); };
  const [modalError, setModalError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title }

  // Initial form state
  const initialFormState = {
    title: '',
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    minimum_order_amount: 500,
    maximum_discount_amount: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
    description: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const getDiscountId = (item) => item?.id || item?.discount_id;
  const getDiscountTitle = (item) => item?.discount_name || item?.title || item?.name || '';
  const getDiscountCode = (item) => item?.discount_code || item?.code || item?.coupon_code || '';
  const getDiscountDescription = (item) => item?.discount_description || item?.description || '';
  const getMinimumOrderAmount = (item) => item?.minimum_order_amount ?? item?.min_order_amount ?? item?.min_purchase ?? 0;
  const getMaximumDiscountAmount = (item) => item?.maximum_discount_amount ?? item?.max_discount_amount ?? 0;
  const getDiscountValue = (item) => item?.discount_value ?? item?.discount_percentage ?? item?.percentage ?? 10;
  const getDiscountEndDate = (item) => item?.end_date || item?.expiry || item?.expiry_date || '';

  // Fetch Discounts on Mount
  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await discountAPI.getDiscounts();
      let list = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res && Array.isArray(res.data)) {
        list = res.data;
      } else if (res && Array.isArray(res.discounts)) {
        list = res.discounts;
      }

      setDiscounts(list);
    } catch (err) {
      console.warn('API fetch for discounts failed:', err.message);
      setErrorMsg(t('disc.fetch_error'));
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingDiscount(null);
    setFormData(initialFormState);
    setModalError('');
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingDiscount(item);

    const parseDate = (d) => {
      if (!d) return '';
      if (typeof d === 'string') {
        if (d.includes('T')) return d.split('T')[0];
        if (d.includes(' ')) return d.split(' ')[0];
        return d;
      }
      return '';
    };

    const dType = (item.discount_type === 'flat' || item.discount_type === 'amount') ? 'amount' : 'percentage';

    setFormData({
      title: getDiscountTitle(item),
      code: getDiscountCode(item),
      discount_type: dType,
      discount_value: Number(getDiscountValue(item)) || 10,
      minimum_order_amount: Number(getMinimumOrderAmount(item)) || 0,
      maximum_discount_amount: Number(getMaximumDiscountAmount(item)) || 0,
      start_date: parseDate(item.start_date) || new Date().toISOString().split('T')[0],
      end_date: parseDate(getDiscountEndDate(item)) || '2026-12-31',
      status: (item.status === 'inactive' || item.status === false || item.is_active === false) ? 'inactive' : 'active',
      description: getDiscountDescription(item)
    });

    setModalError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setModalError(t('disc.err_title_required'));
      return;
    }

    if (!formData.discount_value || Number(formData.discount_value) <= 0) {
      setModalError(t('disc.err_value_required'));
      return;
    }

    setSaving(true);
    setModalError('');

    const payload = {
      discount_name: formData.title.trim(),
      title: formData.title.trim(),
      name: formData.title.trim(),
      discount_code: formData.code.toUpperCase().trim(),
      code: formData.code.toUpperCase().trim(),
      discount_type: formData.discount_type,
      discount_value: Number(formData.discount_value),
      discount_percentage: formData.discount_type === 'percentage' ? Number(formData.discount_value) : undefined,
      percentage: formData.discount_type === 'percentage' ? Number(formData.discount_value) : undefined,
      minimum_order_amount: Number(formData.minimum_order_amount) || 0,
      min_order_amount: Number(formData.minimum_order_amount) || 0,
      maximum_discount_amount: Number(formData.maximum_discount_amount) || 0,
      max_discount_amount: Number(formData.maximum_discount_amount) || 0,
      start_date: formData.start_date,
      end_date: formData.end_date,
      expiry: formData.end_date,
      status: formData.status,
      is_active: formData.status === 'active',
      discount_description: formData.description.trim(),
      description: formData.description.trim()
    };

    try {
      let res;
      if (editingDiscount) {
        res = await discountAPI.updateDiscount(getDiscountId(editingDiscount), payload);
      } else {
        res = await discountAPI.createDiscount(payload);
      }

      if (res && (res.success || res.status === 200 || res.status === 201 || res.id || res.data)) {
        setSuccessMsg(res.message || (editingDiscount ? t('disc.success_updated') : t('disc.success_created')));
        setShowModal(false);
        fetchDiscounts();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else if (res && res.message) {
        setModalError(res.message);
      } else {
        // Fallback update local state if API returns standard object
        setSuccessMsg(editingDiscount ? t('disc.updated') : t('disc.created'));
        setShowModal(false);
        fetchDiscounts();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Discount submission error:', err);
      setModalError(err.message || t('disc.err_api_failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, title } = deleteTarget;
    setDeletingId(id);
    setErrorMsg('');

    try {
      const res = await discountAPI.deleteDiscount(id);
      setSuccessMsg(res?.message || `${t('disc.delete_success')}: "${title}"`);
      setDeleteTarget(null);
      fetchDiscounts();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Delete discount error:', err);
      setErrorMsg(err.message || t('disc.err_delete_failed'));
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered List
  const filteredDiscounts = discounts.filter(item => {
    const titleMatch = getDiscountTitle(item).toLowerCase().includes(searchQuery.toLowerCase()) ||
                       getDiscountCode(item).toLowerCase().includes(searchQuery.toLowerCase()) ||
                       getDiscountDescription(item).toLowerCase().includes(searchQuery.toLowerCase());

    const typeMatch = filterType === 'all' || 
                      (filterType === 'percentage' && (item.discount_type === 'percentage' || item.percentage)) ||
                      (filterType === 'amount' && (item.discount_type === 'flat' || item.discount_type === 'amount'));

    const isItemActive = item.status !== 'inactive' && item.status !== false && item.is_active !== false;
    const statusMatch = filterStatus === 'all' ||
                        (filterStatus === 'active' && isItemActive) ||
                        (filterStatus === 'inactive' && !isItemActive);

    return titleMatch && typeMatch && statusMatch;
  });

  // Calculate Summary Cards
  const totalCount = discounts.length;
  const activeCount = discounts.filter(d => d.status !== 'inactive' && d.status !== false && d.is_active !== false).length;
  const percentageCount = discounts.filter(d => d.discount_type === 'percentage' || d.percentage).length;
  const flatCount = discounts.filter(d => d.discount_type === 'flat' || d.discount_type === 'amount').length;

  return (
    <div style={{ width: '100%' }}>

      {/* Header Bar */}
      <div className="page-title-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Percent size={26} color="#5B5FC7" />
            {t('disc.title')}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '4px', fontWeight: 600 }}>
            {t('disc.subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchDiscounts}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem', gap: '6px' }}
          >
            <RefreshCw size={16} /> {t('disc.refresh')}
          </button>

          <button className="btn-primary" onClick={openAddModal} style={{ padding: '8px 18px', fontSize: '0.88rem', gap: '6px' }}>
            <Plus size={18} />
            <span>{t('disc.add_new')}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-customers" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <Percent size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('disc.total_discounts')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {totalCount}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-orders" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <CheckSquare size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('disc.active_offers')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
              {activeCount}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-categories" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <Tag size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('disc.percentage_deals')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>
              {percentageCount}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-report" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <ArrowUpRight size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('disc.flat_rate_deals')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
              {flatCount}
            </div>
          </div>
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

      {/* Controls Bar: Search & Filters */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              placeholder={t('disc.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px', fontSize: '0.88rem' }}
            />
          </div>

          {/* Filter Options */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} color="#64748B" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>{t('disc.type_label')}</span>
              <select
                className="form-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ height: '40px', padding: '0 12px', fontSize: '0.85rem' }}
              >
                <option value="all">{t('disc.type_all')}</option>
                <option value="percentage">{t('disc.type_percentage')}</option>
                <option value="amount">{t('disc.type_amount')}</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>{t('disc.status_label')}</span>
              <select
                className="form-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ height: '40px', padding: '0 12px', fontSize: '0.85rem' }}
              >
                <option value="all">{t('disc.status_all')}</option>
                <option value="active">{t('disc.status_active')}</option>
                <option value="inactive">{t('disc.status_inactive')}</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Discounts Table Card */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('disc.th_title_code')}</th>
                <th>{t('disc.th_discount_value')}</th>
                <th>{t('disc.th_min_order')}</th>
                <th>{t('disc.th_validity')}</th>
                <th>{t('disc.th_status')}</th>
                <th>{t('disc.th_description')}</th>
                <th style={{ textAlign: 'right' }}>{t('disc.th_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <Loader2 size={22} color="#5B5FC7" className="animate-spin" />
                      <span>{t('disc.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                    {discounts.length === 0 ? (
                      <>{t('disc.empty_no_discounts_1')} <strong>"{t('disc.add_new')}"</strong> {t('disc.empty_no_discounts_2')}</>
                    ) : (
                      <>{t('disc.empty_no_results')}</>
                    )}
                  </td>
                </tr>
              ) : (
                filteredDiscounts.map((item, idx) => {
                  const isPercentage = item.discount_type === 'percentage' || (item.percentage !== undefined && item.discount_type !== 'flat' && item.discount_type !== 'amount');
                  const val = getDiscountValue(item) || 0;
                  const isItemActive = item.status !== 'inactive' && item.status !== false && item.is_active !== false;

                  const endDateStr = getDiscountEndDate(item);
                  const isExpired = endDateStr ? new Date(endDateStr) < new Date() : false;

                  return (
                    <tr key={item.id || idx}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                            {getDiscountTitle(item) || t('disc.offer_fallback')}
                          </span>
                          {getDiscountCode(item) && (
                            <span style={{ fontSize: '0.76rem', color: '#E65100', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Tag size={12} />
                              {getDiscountCode(item)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ fontWeight: 700 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '4px 10px', borderRadius: '20px',
                          background: isPercentage ? '#EEF2FF' : '#FEF3C7',
                          color: isPercentage ? '#5B5FC7' : '#D97706',
                          fontSize: '0.82rem', fontWeight: 800
                        }}>
                          {isPercentage ? `${val}%` : `₹${val}`} {t('disc.off')}
                        </span>
                      </td>

                      <td style={{ fontWeight: 600, color: '#334155' }}>
                        ₹{Number(getMinimumOrderAmount(item)).toLocaleString('en-IN')}
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Calendar size={13} color="#64748B" />
                            <span style={{ fontSize: '0.82rem', color: isExpired ? '#EF4444' : '#334155', fontWeight: isExpired ? 700 : 500 }}>
                              {endDateStr ? endDateStr.split('T')[0].split(' ')[0] : t('disc.no_expiry')}
                            </span>
                          </div>
                          {isExpired && (
                            <span style={{ fontSize: '0.68rem', color: '#EF4444', fontWeight: 700 }}>
                              {t('disc.expired')}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 9px', borderRadius: '12px',
                          fontSize: '0.74rem', fontWeight: 800,
                          background: isItemActive ? '#DCFCE7' : '#F1F5F9',
                          color: isItemActive ? '#15803D' : '#64748B'
                        }}>
                          {isItemActive ? <CheckSquare size={12} /> : <XCircle size={12} />}
                          {isItemActive ? t('disc.active') : t('disc.inactive')}
                        </span>
                      </td>

                      <td style={{ fontSize: '0.82rem', color: '#64748B', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getDiscountDescription(item) || <span style={{ fontStyle: 'italic', color: '#CBD5E1' }}>-</span>}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '5px 10px', borderRadius: '6px', border: '1.5px solid #C7D2FE',
                              background: '#EEF2FF', color: '#5B5FC7', fontSize: '0.78rem', fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Edit size={13} /> {t('disc.edit')}
                          </button>

                          <button
                            type="button"
                            className="btn-danger"
                            disabled={deletingId === getDiscountId(item)}
                            style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setDeleteTarget({ id: getDiscountId(item) || idx, title: getDiscountTitle(item) || t('disc.offer_fallback') })}
                          >
                            {deletingId === getDiscountId(item) ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            {t('disc.delete')}
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div className="modal-content" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Percent size={20} color="#5B5FC7" />
                {editingDiscount ? t('disc.modal_title_edit') : t('disc.modal_title_create')}
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
                <label className="form-label">{t('disc.label_title')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('disc.placeholder_title')}
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">{t('disc.label_code')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('disc.placeholder_code')}
                    style={{ textTransform: 'uppercase', fontWeight: 700 }}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('disc.label_type')}</label>
                  <select
                    className="form-select"
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  >
                    <option value="percentage">{t('disc.type_percentage')}</option>
                    <option value="amount">{t('disc.type_amount_flat')}</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">
                    {t('disc.label_discount_value')} ({formData.discount_type === 'percentage' ? '%' : '₹'}) *
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min="0.1"
                    step="any"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('disc.label_min_order')}</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    placeholder={t('disc.placeholder_no_min')}
                    value={formData.minimum_order_amount}
                    onChange={(e) => setFormData({ ...formData, minimum_order_amount: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">{t('disc.label_start_date')}</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('disc.label_end_date')}</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('disc.label_status')}</label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">{t('disc.option_active')}</option>
                  <option value="inactive">{t('disc.option_inactive')}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('disc.label_description')}</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder={t('disc.placeholder_description')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  {t('disc.cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={saving} style={{ gap: '6px' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{saving ? t('disc.saving') : (editingDiscount ? t('disc.update') : t('disc.create'))}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '28px 24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Trash2 size={24} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              {t('disc.delete_title')}
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.5, marginBottom: '24px' }}>
              {t('disc.delete_confirm_1')} <strong style={{ color: '#0F172A' }}>"{deleteTarget.title}"</strong>{t('disc.delete_confirm_2')}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: '10px 16px', fontWeight: 700, justifyContent: 'center', textAlign: 'center' }}
              >
                {t('disc.cancel')}
              </button>

              <button
                type="button"
                className="btn-danger"
                disabled={deletingId === deleteTarget.id}
                onClick={handleConfirmDelete}
                style={{ flex: 1, padding: '10px 16px', gap: '6px', justifyContent: 'center', fontWeight: 700 }}
              >
                {deletingId === deleteTarget.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>{deletingId === deleteTarget.id ? t('disc.deleting') : t('disc.yes_delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
