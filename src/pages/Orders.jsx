import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, Eye, Printer, X, ChevronDown, Check, Phone, MapPin, CreditCard,
  Clock, CheckCircle2, Loader2, Package, PackageOpen, XCircle, AlertCircle, RefreshCcw, Trash2, AlertTriangle
} from 'lucide-react';
import { onlineOrderAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';
import PrintableBill from '../components/PrintableBill';

const STATUS_CONFIG = {
  pending: { 
    label: 'Pending', 
    bg: '#FEF3C7', 
    color: '#D97706', 
    border: '#FCD34D', 
    icon: (props) => <Clock {...props} /> 
  },
  confirmed: { 
    label: 'Confirmed', 
    bg: '#EEF2FF', 
    color: '#5B5FC7', 
    border: '#C7D2FE', 
    icon: (props) => <CheckCircle2 {...props} /> 
  },
  processing: { 
    label: 'Processing', 
    bg: '#FFF7ED', 
    color: '#EA580C', 
    border: '#FDBA74', 
    icon: (props) => <Loader2 {...props} /> 
  },
  shipped: { 
    label: 'Shipped', 
    bg: '#E0F2FE', 
    color: '#0284C7', 
    border: '#7DD3FC', 
    icon: (props) => <Package {...props} /> 
  },
  delivered: {
    label: 'Delivered', 
    bg: '#DCFCE7', 
    color: '#16A34A', 
    border: '#86EFAC', 
    icon: (props) => <PackageOpen {...props} /> 
  },
  completed: {
    label: 'Completed',
    bg: '#DCFCE7',
    color: '#15803D',
    border: '#86EFAC',
    icon: (props) => <CheckCircle2 {...props} />
  },
  cancelled: { 
    label: 'Cancelled', 
    bg: '#FEE2E2', 
    color: '#DC2626', 
    border: '#FCA5A5', 
    icon: (props) => <XCircle {...props} /> 
  }
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'Pending', bg: '#FEF3C7', color: '#D97706', border: '#FCD34D', icon: (props) => <Clock {...props} /> },
  paid: { label: 'Paid', bg: '#DCFCE7', color: '#15803D', border: '#86EFAC', icon: (props) => <CheckCircle2 {...props} /> },
  partial: { label: 'Partial', bg: '#E0F2FE', color: '#0369A1', border: '#7DD3FC', icon: (props) => <CreditCard {...props} /> },
  failed: { label: 'Failed', bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5', icon: (props) => <AlertCircle {...props} /> },
  refunded: { label: 'Refunded', bg: '#F3E8FF', color: '#7E22CE', border: '#D8B4FE', icon: (props) => <RefreshCcw {...props} /> },
};

const ORDER_STATUS_OPTIONS = Object.keys(STATUS_CONFIG);
const PAYMENT_STATUS_OPTIONS = Object.keys(PAYMENT_STATUS_CONFIG);

function normalizeOnlineOrder(order) {
  const items = order.items || order.order_items || [];
  const itemsSubtotal = items.reduce((acc, it) => acc + Number(it.total_price || (it.price * (it.quantity || it.qty || 1)) || 0), 0);
  const subtotal = Number(order.subtotal ?? order.subTotal ?? itemsSubtotal);

  const refCode = order.referral_code || order.referralCode || '';
  const refPercent = parseFloat(order.referral_customer_discount || order.referral_discount || order.referralDiscount || 0);
  const refDiscountAmt = refCode && refPercent > 0 ? (subtotal * (refPercent / 100)) : Number(order.referral_discount_amount || 0);

  const basicDiscount = Number(order.basic_discount_amount || order.discount_amount || 0);
  const otherDiscount = Number(order.other_discount_amount || 0);

  const taxPercent = Number(order.tax_percentage || order.taxPercent || 0);
  const taxAmt = Number(order.tax_amount || order.taxAmount || (taxPercent > 0 ? subtotal * (taxPercent / 100) : 0));

  const computedPayable = subtotal + taxAmt - basicDiscount - otherDiscount - refDiscountAmt;
  const payable = (order.payable_amount !== undefined && order.payable_amount !== null && Number(order.payable_amount) > 0 && Number(order.payable_amount) < subtotal) 
    ? Number(order.payable_amount) 
    : (computedPayable > 0 ? computedPayable : subtotal);

  return {
    ...order,
    orderNumber: order.orderNumber || order.order_no || `ORD-${order.id}`,
    date: order.date || order.created_at?.split(' ')[0] || '',
    status: (order.order_status || order.status || 'pending').toLowerCase(),
    payment_status: (order.payment_status || 'pending').toLowerCase(),
    paymentMethod: order.paymentMethod || order.payment_method || 'N/A',
    subtotal: subtotal,
    tax_amount: taxAmt,
    tax_percentage: taxPercent,
    basic_discount_amount: basicDiscount,
    other_discount_amount: otherDiscount,
    referral_code: refCode,
    referral_customer_discount: refPercent,
    referral_discount_amount: refDiscountAmt,
    grandTotal: payable,
    payable_amount: payable,
    customer: {
      name: order.customer?.name || order.customer_name || 'Unknown Customer',
      mobile: order.customer?.mobile || order.customer_mobile || 'N/A',
      address: order.customer?.address || order.address || 'N/A',
      pincode: order.customer?.pincode || order.postalcode || '',
    },
    items: items,
  };
}

function unwrapOrderPayload(response, fallbackOrder = {}) {
  const payload = response?.data?.data || response?.data || response || fallbackOrder;
  if (Array.isArray(payload)) {
    return payload.find((item) => String(item.id) === String(fallbackOrder.id)) || payload[0] || fallbackOrder;
  }
  return payload?.order || payload?.online_order || payload;
}

function OverlayDropdown({ anchorRef, open, minWidth, children }) {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return undefined;
    const updatePosition = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const estimatedHeight = 250;
      const openUp = window.innerHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight;
      setPosition({
        left: rect.left,
        width: Math.max(rect.width, minWidth),
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, open, minWidth]);

  if (!open || !position) return null;
  return createPortal(
    <div
      onMouseDown={(event) => event.stopPropagation()}
      style={{
        position: 'fixed',
        ...position,
        zIndex: 99999,
        background: '#FFFFFF',
        borderRadius: '12px',
        padding: '6px',
        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.18), 0 0 0 1px #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      {children}
    </div>,
    document.body
  );
}

function CustomStatusSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const STATUS_MAP = { unpaid: 'pending', inprogress: 'processing', packed: 'shipped', deleted: 'cancelled' };
  const rawVal = (value || 'pending').toLowerCase().replace(/\s+/g, '');
  const normalizedVal = STATUS_MAP[rawVal] || rawVal;
  const current = STATUS_CONFIG[normalizedVal] || STATUS_CONFIG.pending;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          background: current.bg,
          color: current.color,
          border: `1px solid ${current.border}`,
          borderRadius: '9999px',
          padding: '5px 12px',
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          outline: 'none'
        }}
      >
        {current.icon && current.icon({ size: 14, color: current.color })}
        <span>{current.label}</span>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }} />
      </button>

      <OverlayDropdown anchorRef={triggerRef} open={open} minWidth={140}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const isSelected = normalizedVal === key;
            return (
              <div
                key={key}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: isSelected ? cfg.color : '#1E293B',
                  background: isSelected ? cfg.bg : 'transparent',
                  transition: 'background 0.1s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {cfg.icon && cfg.icon({ size: 14, color: isSelected ? cfg.color : '#64748B' })}
                  <span>{cfg.label}</span>
                </div>
                {isSelected && <Check size={14} color={cfg.color} />}
              </div>
            );
          })}
      </OverlayDropdown>
    </div>
  );
}

function CustomPaymentSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const normalizedValue = (value || 'pending').toLowerCase();
  const current = PAYMENT_STATUS_CONFIG[normalizedValue] || PAYMENT_STATUS_CONFIG.pending;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          background: current.bg,
          color: current.color,
          border: `1px solid ${current.border}`,
          borderRadius: '9999px',
          padding: '5px 10px',
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          outline: 'none'
        }}
      >
        {current.icon && current.icon({ size: 14, color: current.color })}
        <span>{current.label}</span>
        <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }} />
      </button>
      <OverlayDropdown anchorRef={triggerRef} open={open} minWidth={150}>
          {PAYMENT_STATUS_OPTIONS.map((key) => {
            const cfg = PAYMENT_STATUS_CONFIG[key];
            const selected = key === normalizedValue;
            return (
              <div
                key={key}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: selected ? cfg.color : '#1E293B',
                  background: selected ? cfg.bg : 'transparent',
                  transition: 'background 0.1s ease'
                }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.background = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {cfg.icon && cfg.icon({ size: 14, color: selected ? cfg.color : '#64748B' })}
                  <span>{cfg.label}</span>
                </div>
                {selected && <Check size={14} color={cfg.color} />}
              </div>
            );
          })}
      </OverlayDropdown>
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printOrder, setPrintOrder] = useState(null);
  const [deletingOrderNo, setDeletingOrderNo] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const { t } = useLanguage();

  const refreshOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const trimmedSearch = search.trim();
      const hasFilters = trimmedSearch || paymentFilter !== 'all' || statusFilter !== 'all';
      const response = hasFilters
        ? await onlineOrderAPI.getOnlineOrdersWithFilters({
            filter: 'all',
            search: trimmedSearch,
            payment_status: paymentFilter,
            order_status: statusFilter,
            page: 1,
            limit: 20,
          })
        : await onlineOrderAPI.getOnlineOrders();
      const list = Array.isArray(response?.data)
        ? response.data
        : (Array.isArray(response) ? response : []);
      setOrders(list.map(normalizeOnlineOrder));
    } catch (err) {
      setError(err.message || t('orders.loadError'));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [search, paymentFilter, statusFilter]);

  useEffect(() => { refreshOrders(); }, [refreshOrders]);

  // Compute status counts for filter tabs
  const counts = useMemo(() => {
    const res = { all: orders.length, pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, completed: 0, cancelled: 0 };
    orders.forEach((o) => {
      const st = (o.status || '').toLowerCase().replace(/\s+/g, '');
      if (st === 'pending') res.pending++;
      else if (st === 'confirmed') res.confirmed++;
      else if (st === 'processing' || st === 'inprogress' || st === 'in progress') res.processing++;
      else if (st === 'shipped' || st === 'packed') res.shipped++;
      else if (st === 'delivered') res.delivered++;
      else if (st === 'completed') res.completed++;
      else if (st === 'cancelled' || st === 'deleted') res.cancelled++;
      else res.pending++;
    });
    return res;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = (o.status || '').toLowerCase().replace(/\s+/g, '');
      if (statusFilter !== 'all') {
        if (statusFilter === 'processing' && st !== 'processing' && st !== 'inprogress') return false;
        if (statusFilter === 'shipped' && st !== 'shipped' && st !== 'packed') return false;
        if (statusFilter === 'delivered' && st !== 'delivered') return false;
        if (statusFilter === 'completed' && st !== 'completed') return false;
        if (statusFilter === 'cancelled' && st !== 'cancelled' && st !== 'deleted') return false;
        if (!['processing', 'shipped', 'delivered', 'cancelled'].includes(statusFilter) && st !== statusFilter) return false;
      }
      if (paymentFilter !== 'all' && (o.payment_status || '').toLowerCase() !== paymentFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const numMatch = (o.orderNumber || o._id || '').toLowerCase().includes(q);
        const nameMatch = (o.customer?.name || '').toLowerCase().includes(q);
        const phoneMatch = (o.customer?.mobile || '').includes(q);
        const refMatch = (o.referral_code || '').toLowerCase().includes(q);
        if (!numMatch && !nameMatch && !phoneMatch && !refMatch) return false;
      }
      return true;
    });
  }, [orders, statusFilter, paymentFilter, search]);

  const handleOrderUpdate = async (order, changes) => {
    try {
      await onlineOrderAPI.updateOnlineOrder(order.id, {
        order_status: changes.order_status || order.status || 'pending',
        payment_status: changes.payment_status || order.payment_status || 'pending',
        remark: changes.remark ?? order.remark ?? '',
      });
      setOrders((current) => current.map((item) => item.id === order.id ? normalizeOnlineOrder({ ...item, ...changes, order_status: changes.order_status || item.status }) : item));
      if (selectedOrder?.id === order.id) setSelectedOrder((current) => normalizeOnlineOrder({ ...current, ...changes, order_status: changes.order_status || current.status }));
    } catch (err) {
      alert(err.message || t('orders.updateError'));
    }
  };

  const handleViewOrder = async (order) => {
    setSelectedOrder(order);
    setDetailLoading(true);
    try {
      const response = await onlineOrderAPI.getOnlineOrderById(order.id);
      const detail = normalizeOnlineOrder(response?.data || response || order);
      setSelectedOrder(detail);
      setOrders((current) => current.map((item) => item.id === detail.id ? detail : item));
    } catch (err) {
      alert(err.message || t('orders.detailError'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePrint = async (order) => {
    let printableOrder = order;
    try {
      const response = await onlineOrderAPI.getOnlineOrderById(order.id);
      const detail = unwrapOrderPayload(response, order);
      printableOrder = normalizeOnlineOrder({
        ...order,
        ...detail,
        shop_details: detail.shop_details || detail.shopDetails || order.shop_details || order.shopDetails
      });
    } catch (err) {
      console.warn('Could not load complete order for printing:', err.message);
    }
    setPrintOrder(printableOrder);
    window.setTimeout(() => window.print(), 120);
  };

  const handleDeleteOrder = (order) => {
    if (!order.id || deletingOrderNo) return;
    setDeleteCandidate(order);
  };

  const confirmDeleteOrder = async () => {
    if (!deleteCandidate) return;
    const orderId = deleteCandidate.id;
    const orderNo = deleteCandidate.order_no || deleteCandidate.orderNumber;
    setDeletingOrderNo(orderId);
    setDeleteCandidate(null);
    try {
      await onlineOrderAPI.deleteOnlineOrder(orderId);
      setOrders((current) => current.filter((item) => (item.order_no || item.orderNumber) !== orderNo));
      setSelectedOrder((current) => {
        if (!current) return current;
        return (current.order_no || current.orderNumber) === orderNo ? null : current;
      });
    } catch (err) {
      alert(err.message || 'Failed to delete order');
    } finally {
      setDeletingOrderNo(null);
    }
  };

  return (
    <div>
      <div className="page-title-row">
        <h1 className="page-title">{t('orders.title')}</h1>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { key: 'all', label: `${t('orders.tabAll')} (${counts.all})` },
          { key: 'pending', label: `${t('orders.tabPending')} (${counts.pending})` },
          { key: 'confirmed', label: `${t('orders.tabConfirmed')} (${counts.confirmed})` },
          { key: 'processing', label: `${t('orders.tabProcessing')} (${counts.processing})` },
          { key: 'shipped', label: `${t('orders.tabShipped')} (${counts.shipped})` },
          { key: 'delivered', label: `${t('orders.tabDelivered')} (${counts.delivered})` },
          { key: 'completed', label: `${t('orders.tabCompleted')} (${counts.completed})` },
          { key: 'cancelled', label: `${t('orders.tabCancelled')} (${counts.cancelled})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={statusFilter === tab.key ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.88rem', padding: '6px 14px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-card" style={{ padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>{t('orders.paymentLabel')}</label>
        <select className="form-input" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} style={{ width: '150px', padding: '8px 10px' }}>
          <option value="all">All payments</option>
          {PAYMENT_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{PAYMENT_STATUS_CONFIG[status].label}</option>)}
        </select>
        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>{t('orders.orderStatusLabel')}</label>
        <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '160px', padding: '8px 10px' }}>
          <option value="all">All statuses</option>
          {ORDER_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>)}
        </select>
      </div>

      {/* Search Bar */}
      <div className="admin-card" style={{ padding: '12px 16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={18} color="#6b7280" />
          <input
            type="text"
            className="form-input"
            style={{ border: 'none', width: '100%', outline: 'none' }}
            placeholder={t('orders.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="admin-card">
        <div className="admin-table-container orders-table-container">
          <table className="admin-table orders-table">
            <thead>
              <tr>
                <th>{t('orders.thOrderNo')}</th>
                <th>{t('orders.thDate')}</th>
                <th>{t('orders.thCustomerName')}</th>
                <th>{t('orders.thMobile')}</th>
                <th>{t('orders.thPayableAmount')}</th>
                <th>{t('orders.thPaymentMethod')}</th>
                <th>{t('orders.thPaymentStatus')}</th>
                <th>{t('orders.thOrderStatus')}</th>
                <th style={{ textAlign: 'right' }}>{t('orders.thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontWeight: 600 }}>
                    {loading ? t('orders.loading') : error || t('orders.noOrders')}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.orderNumber || o._id}>
                    <td>
                      <span style={{ fontWeight: 800, color: '#5B5FC7', fontFamily: 'monospace' }}>
                        {o.orderNumber || o._id}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#64748B' }}>
                      {o.created_at || o.date || o.updated_at || t('orders.recently')}
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#0F172A' }}>
                        {o.customer?.name || t('orders.walkInCustomer')}
                      </span>
                      {o.referral_code && (
                        <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', border: '1px dashed #A5B4FC' }}>
                            Ref: {o.referral_code}
                          </span>
                          {parseFloat(o.referral_customer_discount || 0) > 0 && (
                            <span style={{ color: '#16A34A', fontSize: '0.72rem', fontWeight: 800 }}>
                              (-{parseFloat(o.referral_customer_discount)}%)
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                        {o.customer?.mobile || 'N/A'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 900, color: '#10B981', fontSize: '0.98rem' }}>₹{parseFloat(o.grandTotal || 0).toFixed(2)}</td>
                    <td>
                      <span className="badge" style={{ background: '#EEF2FF', color: '#5B5FC7', textTransform: 'uppercase', fontWeight: 800, fontSize: '0.7rem' }}>
                        {o.paymentMethod || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <CustomPaymentSelect
                        value={o.payment_status}
                        onChange={(newPaymentStatus) => handleOrderUpdate(o, { payment_status: newPaymentStatus })}
                      />
                    </td>
                    <td>
                      <CustomStatusSelect
                        value={o.status}
                        onChange={(newSt) => handleOrderUpdate(o, { order_status: newSt })}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="orders-table-actions" style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          className="header-action-btn"
                          style={{ padding: '5px 10px', gap: '4px' }}
                          title={t('orders.viewDetails')}
                          onClick={() => handleViewOrder(o)}
                        >
                          <Eye size={14} color="#0284C7" />
                          <span>{t('orders.view')}</span>
                        </button>
                        <button
                          className="header-action-btn"
                          style={{ padding: '5px 10px', gap: '4px' }}
                          title={t('orders.printInvoice')}
                          onClick={() => handlePrint(o)}
                        >
                          <Printer size={14} color="#10B981" />
                          <span>{t('orders.invoice')}</span>
                        </button>
                        <button
                          className="header-action-btn"
                          style={{ padding: '5px 10px', gap: '4px', color: '#DC2626' }}
                          title="Delete Order"
                          disabled={deletingOrderNo === o.id}
                          onClick={() => handleDeleteOrder(o)}
                        >
                          <Trash2 size={14} color="#DC2626" />
                          <span>{deletingOrderNo === o.id ? 'Deleting...' : 'Delete'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteCandidate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-order-title"
          onClick={() => setDeleteCandidate(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'rgba(15, 23, 42, 0.78)',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '334px',
              overflow: 'hidden',
              borderRadius: '8px',
              background: '#FFFFFF',
              boxShadow: '0 18px 45px rgba(0, 0, 0, 0.28)',
            }}
          >
            <div
              style={{
                position: 'relative',
                padding: '20px 18px 16px',
                textAlign: 'center',
                color: '#FFFFFF',
                background: '#F52D32',
                borderBottom: '5px solid #D7D7D7',
              }}
            >
              <button
                type="button"
                aria-label="Close delete confirmation"
                onClick={() => setDeleteCandidate(null)}
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '9px',
                  border: 0,
                  background: 'transparent',
                  color: '#FFFFFF',
                  fontSize: '26px',
                  lineHeight: 1,
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
              <span style={{ position: 'relative', display: 'inline-flex', marginBottom: '5px' }}>
                <AlertTriangle size={58} strokeWidth={2.7} color="#FFFFFF" fill="#FFFFFF" />
                <span style={{ position: 'absolute', left: '50%', top: '47%', transform: 'translate(-50%, -50%)', color: '#F52D32', fontSize: '32px', lineHeight: 1, fontWeight: 900 }}>!</span>
              </span>
              <h2 id="delete-order-title" style={{ margin: 0, fontSize: '29px', lineHeight: 1.05, fontWeight: 900, letterSpacing: '0.5px' }}>
                WARNING!
              </h2>
              <p style={{ margin: '8px 0 0', fontSize: '15px', fontWeight: 600 }}>
                Do you want to continue?
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', padding: '15px 16px 20px' }}>
              <button
                type="button"
                onClick={confirmDeleteOrder}
                style={{ minWidth: '81px', padding: '6px 18px', border: 0, borderRadius: '3px', background: '#68B36B', color: '#FFFFFF', fontSize: '15px', cursor: 'pointer' }}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                style={{ minWidth: '81px', padding: '6px 18px', border: 0, borderRadius: '3px', background: '#ED8084', color: '#FFFFFF', fontSize: '15px', cursor: 'pointer' }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal (Same layout as Offline Orders) */}
      {selectedOrder && (() => {
        const itemsList = Array.isArray(selectedOrder.items) ? selectedOrder.items : [];
        const totalProductCount = itemsList.length;
        const totalQuantityCount = itemsList.reduce((sum, item) => sum + Number(item.quantity || item.qty || 1), 0);
        const itemsSubtotal = itemsList.reduce((acc, it) => acc + Number(it.total_price || (it.price * (it.quantity || it.qty || 1)) || 0), 0);
        const subtotalVal = Number(selectedOrder.subtotal ?? selectedOrder.subTotal ?? itemsSubtotal);

        const taxPercentVal = Number(selectedOrder.tax_percentage ?? selectedOrder.taxPercent ?? 0);
        const taxAmountVal = Number(selectedOrder.tax_amount ?? selectedOrder.taxAmount ?? (taxPercentVal > 0 ? subtotalVal * (taxPercentVal / 100) : 0));

        const basicDiscountVal = Number(selectedOrder.basic_discount_amount ?? selectedOrder.discount_amount ?? 0);
        const basicDiscountPercentVal = Number(selectedOrder.basic_discount_percentage ?? 0);
        const otherDiscountVal = Number(selectedOrder.other_discount_amount ?? 0);

        const refCode = selectedOrder.referral_code || '';
        const refDiscountPercent = parseFloat(selectedOrder.referral_customer_discount || 0);
        const refDiscountAmount = refCode && refDiscountPercent > 0 ? (subtotalVal * (refDiscountPercent / 100)) : Number(selectedOrder.referral_discount_amount || 0);

        const computedTotal = subtotalVal + taxAmountVal - basicDiscountVal - otherDiscountVal - refDiscountAmount;
        const finalPayable = (selectedOrder.payable_amount !== undefined && selectedOrder.payable_amount !== null && Number(selectedOrder.payable_amount) > 0 && Number(selectedOrder.payable_amount) < subtotalVal)
          ? Number(selectedOrder.payable_amount)
          : (computedTotal > 0 ? computedTotal : subtotalVal);

        return (
          <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
            <div
              className="modal-content"
              style={{ maxWidth: '560px', width: '95%', padding: '24px', borderRadius: '20px', background: '#FFF', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="modal-header" style={{ marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
                  <Eye size={22} color="#0284C7" />
                  <span>Bill Details ({selectedOrder.orderNumber})</span>
                </h2>
                <button className="modal-close" onClick={() => setSelectedOrder(null)}>
                  <X size={20} />
                </button>
              </div>

              {/* Header Info Banner */}
              <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#0369A1', fontSize: '1.05rem', fontFamily: 'monospace' }}>{selectedOrder.orderNumber}</div>
                  <div style={{ fontSize: '0.78rem', color: '#0284C7' }}>{selectedOrder.created_at || selectedOrder.date || t('orders.recent')}</div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <CustomStatusSelect
                    value={selectedOrder.status}
                    onChange={(newSt) => handleOrderUpdate(selectedOrder, { order_status: newSt })}
                  />
                  <CustomPaymentSelect
                    value={selectedOrder.payment_status}
                    onChange={(newPaymentStatus) => handleOrderUpdate(selectedOrder, { payment_status: newPaymentStatus })}
                  />
                </div>
              </div>

              {/* Customer Info Card */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Customer Name</div>
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>{selectedOrder.customer?.name || t('orders.walkInCustomer')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Mobile Number</div>
                  <div style={{ fontWeight: 700, color: '#334155' }}>{selectedOrder.customer?.mobile || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Payment Method</div>
                  <div style={{ fontWeight: 800, color: '#5B5FC7', textTransform: 'uppercase' }}>{selectedOrder.paymentMethod || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Order Status</div>
                  <div style={{ fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>{selectedOrder.status || 'pending'}</div>
                </div>
                {selectedOrder.customer?.address && selectedOrder.customer.address !== 'N/A' && (
                  <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #E2E8F0', paddingTop: '8px', marginTop: '2px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Delivery Address</div>
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.82rem' }}>{selectedOrder.customer.address}</div>
                  </div>
                )}
                {selectedOrder.referral_code && (
                  <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #E2E8F0', paddingTop: '8px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Referral Code:</div>
                    <span style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: '0.78rem', fontWeight: 800, padding: '2px 8px', borderRadius: '8px', border: '1px dashed #A5B4FC', fontFamily: 'monospace' }}>
                      {selectedOrder.referral_code}
                    </span>
                    {refDiscountPercent > 0 && (
                      <span style={{ color: '#16A34A', fontSize: '0.78rem', fontWeight: 800 }}>
                        (-{refDiscountPercent}%)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Purchased Items List */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', background: '#FFF', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '10px', padding: '9px 12px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#0369A1', fontWeight: 700 }}>Total Products</div>
                    <strong style={{ display: 'block', marginTop: '3px', color: '#0C4A6E', fontSize: '1.05rem' }}>{detailLoading ? '...' : totalProductCount}</strong>
                  </div>
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '9px 12px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#15803D', fontWeight: 700 }}>Total Quantity</div>
                    <strong style={{ display: 'block', marginTop: '3px', color: '#166534', fontSize: '1.05rem' }}>{detailLoading ? '...' : totalQuantityCount}</strong>
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Items Purchased ({detailLoading ? '...' : itemsList.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detailLoading ? (
                    <div style={{ textAlign: 'center', padding: '18px', color: '#94A3B8', fontWeight: 700, fontSize: '0.84rem' }}>
                      Loading items...
                    </div>
                  ) : itemsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '18px', color: '#94A3B8', fontWeight: 700, fontSize: '0.84rem' }}>
                      No products found
                    </div>
                  ) : (
                    itemsList.map((it, idx) => {
                      const itemName = it.product_name || it.name || it.item_name || 'Product Item';
                      const qty = Number(it.quantity || it.qty || 1);
                      const price = Number(it.unit_price || it.price || 0);
                      const total = Number(it.total_price || it.total || (price * qty) || 0);
                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', border: '1px solid #F1F5F9', fontSize: '0.84rem', gap: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1E293B' }}>{itemName}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Qty: {qty} x ₹{price.toFixed(2)}</div>
                          </div>
                          <div style={{ fontWeight: 800, color: '#5B5FC7', whiteSpace: 'nowrap' }}>
                            ₹{total.toFixed(2)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Subtotal:</span>
                  <strong>₹{subtotalVal.toFixed(2)}</strong>
                </div>
                {taxAmountVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                    <span>GST ({taxPercentVal}%):</span>
                    <span>+₹{taxAmountVal.toFixed(2)}</span>
                  </div>
                )}
                {basicDiscountVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A' }}>
                    <span>Basic Discount ({basicDiscountPercentVal > 0 ? `-${basicDiscountPercentVal}%` : '-'}):</span>
                    <span>-₹{basicDiscountVal.toFixed(2)}</span>
                  </div>
                )}
                {otherDiscountVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A' }}>
                    <span>Other Discount (-):</span>
                    <span>-₹{otherDiscountVal.toFixed(2)}</span>
                  </div>
                )}
                {refCode && refDiscountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4F46E5' }}>
                    <span>Referral Discount ({refCode}) ({refDiscountPercent > 0 ? `-${refDiscountPercent}%` : '-'}):</span>
                    <span>-₹{refDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 900, color: '#10B981', paddingTop: '8px', borderTop: '1px solid #CBD5E1', marginTop: '4px' }}>
                  <span>Total Payable</span>
                  <span>₹{finalPayable.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setSelectedOrder(null)}>
                  Close
                </button>
                <button type="button" className="btn-primary" onClick={() => handlePrint(selectedOrder)}>
                  <Printer size={16} />
                  <span>Print Invoice</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      <PrintableBill order={printOrder} />
    </div>
  );
}
