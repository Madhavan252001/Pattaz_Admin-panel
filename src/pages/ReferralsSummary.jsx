import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  User,
  Phone,
  MapPin,
  Tag,
  CheckCircle2,
  XCircle,
  Calendar,
  Gift,
  Award,
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Filter,
  Eye,
  ChevronDown,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { offlineOrderAPI, onlineOrderAPI, referralAPI } from '../api/api';

function ReferralCodeDropdown({ items, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const selected = items.find((item) => item.referral_code === value);

  useEffect(() => {
    const handleOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => (
      String(item.name || '').toLowerCase().includes(q) ||
      String(item.referral_code || '').toLowerCase().includes(q) ||
      String(item.mobile_no || item.mobile || '').toLowerCase().includes(q)
    ));
  }, [items, query]);

  const selectItem = (code) => {
    onChange(code);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{
          width: '100%',
          minHeight: '46px',
          borderRadius: '12px',
          border: open ? '1.5px solid #0284C7' : '1.5px solid #E2E8F0',
          background: '#FFFFFF',
          boxShadow: open ? '0 0 0 3px rgba(2,132,199,0.12)' : '0 1px 2px rgba(15,23,42,0.04)',
          padding: '7px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#0F172A', fontWeight: 900, fontSize: '0.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selected ? selected.name : 'All Referral Codes'}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px', color: '#64748B', fontSize: '0.72rem', fontWeight: 800 }}>
            {selected ? (
              <>
                <span style={{ color: '#0284C7' }}>{selected.referral_code}</span>
                <span>{selected.mobile_no || selected.mobile || '-'}</span>
              </>
            ) : (
              <span>Show every referral partner</span>
            )}
          </div>
        </div>
        <Filter size={16} color={open ? '#0284C7' : '#64748B'} style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 1000, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', boxShadow: '0 18px 45px rgba(15,23,42,0.18)', padding: '8px', maxHeight: '320px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px 10px', marginBottom: '8px' }}>
            <Search size={15} color="#64748B" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, code or mobile..."
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}
            />
          </div>

          <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '2px' }}>
            <button
              type="button"
              onClick={() => selectItem('')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', border: 'none', background: value === '' ? '#E0F2FE' : 'transparent', borderRadius: '10px', padding: '10px', cursor: 'pointer', textAlign: 'left', marginBottom: '4px' }}
            >
              <div>
                <div style={{ color: '#0F172A', fontWeight: 900 }}>All Referral Codes</div>
                <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 700, marginTop: '2px' }}>No code filter applied</div>
              </div>
              {value === '' && <Check size={16} color="#0284C7" />}
            </button>

            {filteredItems.map((item) => {
              const active = item.referral_code === value;
              return (
                <button
                  key={item.id || item.referral_code}
                  type="button"
                  onClick={() => selectItem(item.referral_code)}
                  style={{ width: '100%', border: 'none', background: active ? '#EEF2FF' : '#FFFFFF', borderRadius: '10px', padding: '10px', cursor: 'pointer', textAlign: 'left', marginBottom: '5px', display: 'grid', gap: '6px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#0F172A', fontWeight: 900, fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name || 'Partner'}</span>
                    <span style={{ borderRadius: '999px', background: '#E0F2FE', color: '#0369A1', padding: '3px 8px', fontSize: '0.68rem', fontWeight: 900, flexShrink: 0 }}>{item.referral_code}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', color: '#64748B', fontSize: '0.7rem', fontWeight: 800 }}>
                    <span>{item.mobile_no || item.mobile || 'No mobile'}</span>
                    <span>Customer {item.customer_discount ?? 0}%</span>
                    <span>Partner {item.sales_partner_discount ?? 0}%</span>
                  </div>
                  {active && <Check size={15} color="#4F46E5" style={{ justifySelf: 'end' }} />}
                </button>
              );
            })}

            {filteredItems.length === 0 && (
              <div style={{ padding: '16px 10px', textAlign: 'center', color: '#94A3B8', fontWeight: 800, fontSize: '0.82rem' }}>
                No referral codes found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function unwrapList(response) {
  if (Array.isArray(response)) return response;
  const queue = [response];
  const visited = new Set();

  while (queue.length) {
    const payload = queue.shift();
    if (!payload || typeof payload !== 'object' || visited.has(payload)) continue;
    visited.add(payload);

    const listKeys = [
      'data',
      'orders',
      'offline_orders',
      'offlineOrders',
      'online_orders',
      'onlineOrders',
      'bills',
      'rows',
      'records',
      'items'
    ];

    for (const key of listKeys) {
      if (Array.isArray(payload[key])) return payload[key];
    }

    ['data', 'result', 'payload', 'response'].forEach((key) => {
      if (payload[key] && typeof payload[key] === 'object') queue.push(payload[key]);
    });
  }

  return [];
}

function getReferralCode(order) {
  return order.referral_code
    || order.referralCode
    || order.ref_code
    || order.referral_code_used
    || order.applied_referral_code
    || order.customer_referral_code
    || order.referral?.referral_code
    || order.referral?.code
    || order.referrer?.referral_code
    || '';
}

function normalizeReferralOrder(order, orderSource = 'Online') {
  const items = Array.isArray(order.items) ? order.items
    : Array.isArray(order.order_items) ? order.order_items
      : Array.isArray(order.details) ? order.details
      : Array.isArray(order.products) ? order.products
        : Array.isArray(order.order_products) ? order.order_products
          : Array.isArray(order.product_details) ? order.product_details
            : Array.isArray(order.orderDetails) ? order.orderDetails
              : [];
  return {
    ...order,
    id: order.id || order._id,
    orderNumber: order.orderNumber || order.order_no || order.invoice_no || `ORD-${order.id || order._id || ''}`,
    createdAt: order.created_at || order.date || order.updated_at || '',
    orderType: order.order_type || order.orderType || orderSource,
    referral_code: getReferralCode(order),
    payableAmount: Number(order.payable_amount || order.grandTotal || order.grand_total || order.total_amount || 0),
    customerName: order.customer?.name || order.customer_name || order.name || 'Customer',
    customerMobile: order.customer?.mobile || order.customer_mobile || order.mobile_no || order.mobile || 'N/A',
    items
  };
}

function isOrderRecord(order) {
  return Boolean(
    order.orderNumber ||
    order.order_no ||
    order.invoice_no ||
    order.payable_amount ||
    order.grandTotal ||
    order.grand_total ||
    order.total_amount ||
    order.payment_status ||
    order.order_status ||
    Array.isArray(order.items) ||
    Array.isArray(order.order_items) ||
    Array.isArray(order.details)
  );
}

function getOrderTimestamp(order) {
  const rawDate = order.createdAt || order.created_at || order.order_date || order.date || order.updated_at;
  const timestamp = rawDate ? new Date(rawDate).getTime() : NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isWithinDateRange(order, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  const timestamp = getOrderTimestamp(order);
  if (timestamp === null) return true;
  if (fromDate) {
    const fromTimestamp = new Date(`${fromDate}T00:00:00`).getTime();
    if (timestamp < fromTimestamp) return false;
  }
  if (toDate) {
    const toTimestamp = new Date(`${toDate}T23:59:59`).getTime();
    if (timestamp > toTimestamp) return false;
  }
  return true;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function matchesReferralOrder(order, referral) {
  const referralCode = normalizeText(referral.referral_code);
  const orderRefCode = normalizeText(getReferralCode(order));
  if (referralCode && orderRefCode && referralCode === orderRefCode) return true;

  const referralMobile = normalizePhone(referral.mobile_no || referral.mobile);
  const orderMobile = normalizePhone(order.customerMobile || order.customer_mobile || order.mobile_no || order.mobile || order.customer?.mobile);
  if (referralMobile && orderMobile && referralMobile === orderMobile) return true;

  const referralName = normalizeText(referral.name);
  const orderName = normalizeText(order.customerName || order.customer_name || order.name || order.customer?.name);
  if (referralName && orderName && referralName === orderName) return true;

  return false;
}

function getProductImage(item) {
  if (item.image_url) return item.image_url;
  if (item.images) return item.images;
  if (item.product_image) return item.product_image;
  if (item.product?.image_url) return item.product.image_url;
  if (Array.isArray(item.product?.product_images) && item.product.product_images[0]) {
    return item.product.product_images[0].images || item.product.product_images[0].image_url;
  }
  if (Array.isArray(item.product_images) && item.product_images[0]) {
    return item.product_images[0].images || item.product_images[0].image_url;
  }
  return '';
}

function getProductName(item) {
  return item.product_name || item.name || item.item_name || item.product?.name || 'Product Item';
}

function getProductCode(item) {
  return item.product_code || item.code || item.product?.product_code || item.product?.code || '';
}

function getOrderPreviewKey(order, index) {
  return `${order.orderType || 'order'}-${order.id || order.orderNumber || index}`;
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getPartnerDiscountRate(item) {
  return Number(item?.sales_partner_discount || item?.partner_discount || 0);
}

function getPartnerCommission(item) {
  return Number(item?.total_order_amount || 0) * (getPartnerDiscountRate(item) / 100);
}

export default function ReferralsSummary() {
  const [summaryData, setSummaryData] = useState([]);
  const [referralCodesList, setReferralCodesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsgValue] = useState('');
  const setErrorMsg = (message) => { setErrorMsgValue(message); if (message) toast.error(message); };
  
  // Filter States
  const [selectedCode, setSelectedCode] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [orderPreview, setOrderPreview] = useState(null);
  const [orderPreviewOrders, setOrderPreviewOrders] = useState([]);
  const [orderPreviewLoading, setOrderPreviewLoading] = useState(false);
  const [expandedPreviewOrders, setExpandedPreviewOrders] = useState({});

  const outletContext = useOutletContext();
  const navigate = useNavigate();

  // Fetch Referral Codes for dropdown select
  useEffect(() => {
    (async () => {
      try {
        const res = await referralAPI.getReferrals();
        let list = [];
        if (Array.isArray(res)) list = res;
        else if (Array.isArray(res?.data)) list = res.data;
        else if (Array.isArray(res?.data?.data)) list = res.data.data;
        setReferralCodesList(list);
      } catch (err) {
        console.error('Error loading referral code dropdown list:', err);
      }
    })();
  }, []);

  // Fetch Referral Summary Data
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = {};
      if (selectedCode) params.referral_code = selectedCode;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const res = await referralAPI.getReferralSummary(params);
      let list = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (Array.isArray(res?.data)) {
        list = res.data;
      } else if (Array.isArray(res?.data?.data)) {
        list = res.data.data;
      }
      setSummaryData(list);
    } catch (err) {
      console.error('Error fetching referral summary:', err);
      setErrorMsg(err.message || 'Failed to load referral summary report');
    } finally {
      setLoading(false);
    }
  }, [selectedCode, fromDate, toDate]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Copy code handler
  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Referral code "${code}" copied!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenOrderPreview = async (item) => {
    setOrderPreview(item);
    setOrderPreviewOrders([]);
    setExpandedPreviewOrders({});

    if (!item?.referral_code) return;

    setOrderPreviewLoading(true);
    try {
      const [onlineResult, offlineResult] = await Promise.allSettled([
        onlineOrderAPI.getOnlineOrdersWithFilters({
          filter: 'all',
          from_date: fromDate,
          to_date: toDate,
          page: 1,
          limit: 100,
        }),
        offlineOrderAPI.getOfflineOrders(),
      ]);

      const onlineOrders = onlineResult.status === 'fulfilled' ? unwrapList(onlineResult.value) : [];
      const offlineOrders = offlineResult.status === 'fulfilled' ? unwrapList(offlineResult.value) : [];
      const detailedOfflineOrders = await Promise.all(
        offlineOrders.filter(isOrderRecord).slice(0, 100).map(async (order) => {
          if (!order.id || getReferralCode(order)) return order;
          try {
            const detailResponse = await offlineOrderAPI.getOfflineOrderById(order.id);
            return detailResponse?.data || detailResponse || order;
          } catch (err) {
            return order;
          }
        })
      );

      const orders = [
        ...onlineOrders.filter(isOrderRecord).map((order) => normalizeReferralOrder(order, 'Online')),
        ...detailedOfflineOrders.filter(isOrderRecord).map((order) => normalizeReferralOrder(order, 'Offline')),
      ]
        .filter((order) => matchesReferralOrder(order, item))
        .filter((order) => isWithinDateRange(order, fromDate, toDate));

      const detailedOrders = await Promise.all(
        orders.slice(0, 50).map(async (order) => {
          if (order.items.length > 0 || !order.id) return order;
          try {
            const isOfflineOrder = normalizeText(order.orderType) === 'offline';
            const detailResponse = isOfflineOrder
              ? await offlineOrderAPI.getOfflineOrderById(order.id)
              : await onlineOrderAPI.getOnlineOrderById(order.id);
            return normalizeReferralOrder(detailResponse?.data || detailResponse || order, order.orderType);
          } catch (err) {
            console.warn('Could not load referral order product details:', err.message);
            return order;
          }
        })
      );

      setOrderPreviewOrders(detailedOrders);
      setExpandedPreviewOrders({});
    } catch (err) {
      toast.error(err.message || 'Failed to load ordered products.');
      setOrderPreviewOrders([]);
      setExpandedPreviewOrders({});
    } finally {
      setOrderPreviewLoading(false);
    }
  };

  // Quick Preset Date Ranges
  const handlePresetDate = (preset) => {
    const today = new Date();
    const formatDateStr = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const str = formatDateStr(today);
      setFromDate(str);
      setToDate(str);
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(formatDateStr(firstDay));
      setToDate(formatDateStr(today));
    } else if (preset === 'clear') {
      setFromDate('');
      setToDate('');
      setSelectedCode('');
    }
  };

  // Filtered Items (Client search)
  const filteredItems = summaryData.filter((item) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.mobile_no && item.mobile_no.toLowerCase().includes(q)) ||
      (item.referral_code && item.referral_code.toLowerCase().includes(q)) ||
      (item.address && item.address.toLowerCase().includes(q))
    );
  });

  // Analytics Aggregates
  const totalPartners = summaryData.length;
  const totalOrders = summaryData.reduce((acc, curr) => acc + Number(curr.order_count || 0), 0);
  const totalRevenue = summaryData.reduce((acc, curr) => acc + Number(curr.total_order_amount || 0), 0);
  const totalPartnerCommission = summaryData.reduce((acc, curr) => acc + getPartnerCommission(curr), 0);

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* PAGE HEADER */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(14, 165, 233, 0.3)',
              color: '#FFFFFF'
            }}
          >
            <BarChart3 size={24} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: '#0F172A',
                margin: 0,
                letterSpacing: '-0.02em'
              }}
            >
              Referrals Summary & Report
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Track referral code usage, order counts, sales revenue & total discounts
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              fetchSummary();
              if (outletContext?.refreshPage) outletContext.refreshPage();
            }}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* PAGE TABS NAVIGATION */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          borderBottom: '2px solid #E2E8F0',
          marginBottom: '24px',
          paddingBottom: '2px'
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/referrals')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            fontWeight: 700,
            fontSize: '0.92rem',
            color: '#64748B',
            cursor: 'pointer',
            borderBottom: '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          Referral Profiles
        </button>
        <button
          type="button"
          onClick={() => navigate('/referrals-summary')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            fontWeight: 800,
            fontSize: '0.92rem',
            color: '#0284C7',
            cursor: 'pointer',
            borderBottom: '3px solid #0284C7',
            marginBottom: '-2px'
          }}
        >
          Summary & Report
        </button>
      </div>

      {/* ANALYTICS KPI METRIC CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {/* Total Partners */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#E0F2FE',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Tag size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Referral Partners
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {totalPartners}
            </div>
          </div>
        </div>

        {/* Total Referral Orders */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#EEF2FF',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ShoppingBag size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Total Orders Generated
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4F46E5', marginTop: '2px' }}>
              {totalOrders}
            </div>
          </div>
        </div>

        {/* Total Order Amount */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Total Order Revenue
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16A34A', marginTop: '2px' }}>
              ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Partner Commission */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Gift size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Partner Commission
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>
              {formatMoney(totalPartnerCommission)}
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & DATE RANGE BAR */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          {/* Referral Code Dropdown */}
          <div style={{ flex: '1 1 240px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '6px'
              }}
            >
              Filter by Referral Code
            </label>
            <ReferralCodeDropdown
              items={referralCodesList}
              value={selectedCode}
              onChange={setSelectedCode}
            />
          </div>

          {/* From Date */}
          <div style={{ flex: '1 1 180px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '6px'
              }}
            >
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '10px',
                border: '1.5px solid #E2E8F0',
                padding: '0 12px',
                fontSize: '0.88rem',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* To Date */}
          <div style={{ flex: '1 1 180px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '6px'
              }}
            >
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '10px',
                border: '1.5px solid #E2E8F0',
                padding: '0 12px',
                fontSize: '0.88rem',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Quick Preset Date Buttons */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexWrap: 'wrap', paddingTop: '20px' }}>
            <button
              type="button"
              onClick={() => handlePresetDate('today')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                cursor: 'pointer'
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate('this_month')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                cursor: 'pointer'
              }}
            >
              This Month
            </button>
            {(fromDate || toDate || selectedCode) && (
              <button
                type="button"
                onClick={() => handlePresetDate('clear')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: 'none',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <X size={14} /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Live Search input */}
        <div style={{ position: 'relative', marginTop: '4px' }}>
          <Search
            size={18}
            color="#94A3B8"
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          />
          <input
            type="text"
            placeholder="Search by name, phone, referral code or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '42px',
              paddingRight: '16px',
              height: '42px',
              borderRadius: '10px',
              border: '1.5px solid #E2E8F0',
              fontSize: '0.88rem',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      {/* ERROR DISPLAY */}
      {false && errorMsg && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1.5px solid #FCA5A5',
            borderRadius: '12px',
            padding: '16px 20px',
            color: '#991B1B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={20} color="#DC2626" />
            <span style={{ fontWeight: 600 }}>{errorMsg}</span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={fetchSummary}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* SUMMARY TABLE DATA */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
            <Loader2 size={36} color="#0284C7" className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>Loading referral summary report...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
            <BarChart3 size={48} color="#CBD5E1" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px' }}>
              No Referral Summary Found
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748B' }}>
              No summary statistics available for the selected filters.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.88rem'
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#F8FAFC',
                    borderBottom: '1.5px solid #E2E8F0',
                    color: '#475569',
                    fontSize: '0.78rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 800
                  }}
                >
                  <th style={{ padding: '16px 20px', width: '60px' }}>ID</th>
                  <th style={{ padding: '16px 20px' }}>Referrer Partner</th>
                  <th style={{ padding: '16px 20px' }}>Mobile No</th>
                  <th style={{ padding: '16px 20px' }}>Referral Code</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center' }}>Orders Count</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Total Order Revenue</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Partner Commission</th>
                  <th style={{ padding: '16px 20px' }}>Rates (Customer / Partner)</th>
                  <th style={{ padding: '16px 20px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => {
                  const isActive = String(item.is_active ?? '1') === '1';
                  const orderCount = Number(item.order_count || 0);
                  const orderAmount = Number(item.total_order_amount || 0);
                  const partnerCommission = getPartnerCommission(item);

                  return (
                    <tr
                      key={item.id || index}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* ID */}
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: '#64748B' }}>
                        #{item.id}
                      </td>

                      {/* Name & Address */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                          {item.name || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <MapPin size={12} />
                          <span>{item.address || 'Sivakasi'}</span>
                        </div>
                      </td>

                      {/* Mobile */}
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={14} color="#64748B" />
                          <span>{item.mobile_no || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Referral Code */}
                      <td style={{ padding: '16px 20px' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#F1F5F9',
                            border: '1px dashed #CBD5E1',
                            padding: '6px 12px',
                            borderRadius: '8px'
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '0.92rem',
                              color: '#0284C7',
                              letterSpacing: '0.05em'
                            }}
                          >
                            {item.referral_code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(item.referral_code)}
                            title="Copy Code"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              color: copiedCode === item.referral_code ? '#16A34A' : '#64748B'
                            }}
                          >
                            {copiedCode === item.referral_code ? (
                              <Check size={16} color="#16A34A" />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Orders Count */}
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '42px',
                              background: orderCount > 0 ? '#E0F2FE' : '#F1F5F9',
                              color: orderCount > 0 ? '#0369A1' : '#64748B',
                              fontWeight: 800,
                              padding: '5px 13px',
                              borderRadius: '20px',
                              fontSize: '0.88rem'
                            }}
                          >
                            {orderCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenOrderPreview(item)}
                            title="Preview orders count"
                            aria-label="Preview orders count"
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '10px',
                              border: '1px solid #BFDBFE',
                              background: '#EFF6FF',
                              color: '#2563EB',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: '0 6px 14px rgba(37,99,235,0.12)'
                            }}
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>

                      {/* Total Order Revenue */}
                      <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 800, color: orderAmount > 0 ? '#16A34A' : '#475569' }}>
                        ₹{orderAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Partner Commission */}
                      <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 800, color: partnerCommission > 0 ? '#D97706' : '#475569' }}>
                        {formatMoney(partnerCommission)}
                      </td>

                      {/* Rates */}
                      <td style={{ padding: '16px 20px', fontSize: '0.8rem' }}>
                        <div>
                          <span style={{ color: '#64748B' }}>Cust:</span>{' '}
                          <span style={{ fontWeight: 700, color: '#2563EB' }}>{item.customer_discount || '0'}%</span>
                        </div>
                        <div>
                          <span style={{ color: '#64748B' }}>Partner:</span>{' '}
                          <span style={{ fontWeight: 700, color: '#16A34A' }}>{item.sales_partner_discount || '0'}%</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        {isActive ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#DCFCE7',
                              color: '#15803D',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.76rem',
                              fontWeight: 800
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#16A34A'
                              }}
                            />
                            Active
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#F1F5F9',
                              color: '#64748B',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.76rem',
                              fontWeight: 800
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#94A3B8'
                              }}
                            />
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {orderPreview && (
        <div
          onClick={() => setOrderPreview(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(15, 23, 42, 0.46)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#FFFFFF',
              borderRadius: '18px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 24px 70px rgba(15,23,42,0.28)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '18px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#DBEAFE',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Eye size={21} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, color: '#0F172A', fontSize: '1.05rem', fontWeight: 900 }}>
                    Orders Count Preview
                  </h3>
                  <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.82rem', fontWeight: 700 }}>
                    {orderPreview.name || 'Referral Partner'} - {orderPreview.referral_code || 'No code'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderPreview(null)}
                aria-label="Close preview"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div
                style={{
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #EFF6FF, #F8FAFC)',
                  border: '1px solid #DBEAFE',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  marginBottom: '16px'
                }}
              >
                <div>
                  <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>
                    Orders Count
                  </div>
                  <div style={{ color: '#1D4ED8', fontSize: '2rem', fontWeight: 950, lineHeight: 1.1 }}>
                    {orderPreviewLoading ? Number(orderPreview.order_count || 0) : orderPreviewOrders.length}
                  </div>
                </div>
                <ShoppingBag size={36} color="#2563EB" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                {[
                  ['Referrer Partner', orderPreview.name || 'N/A'],
                  ['Mobile No', orderPreview.mobile_no || 'N/A'],
                  ['Referral Code', orderPreview.referral_code || 'N/A'],
                  ['Total Amount', formatMoney(orderPreview.total_order_amount)],
                  ['Customer Discount', `${Number(orderPreview.total_customer_discount || 0)}%`],
                  ['Partner Discount', `${getPartnerDiscountRate(orderPreview).toFixed(2)}%`],
                  ['Partner Commission', formatMoney(getPartnerCommission(orderPreview))],
                  ['Status', String(orderPreview.is_active ?? '1') === '1' ? 'Active' : 'Inactive']
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      padding: '12px'
                    }}
                  >
                    <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 900, marginBottom: '5px' }}>
                      {label}
                    </div>
                    <div style={{ color: '#0F172A', fontSize: '0.9rem', fontWeight: 850, wordBreak: 'break-word' }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '18px', border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '13px 14px',
                    background: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A', fontWeight: 900 }}>
                    <ShoppingBag size={17} color="#2563EB" />
                    <span>Ordered Products</span>
                  </div>
                  <span style={{ color: '#64748B', fontSize: '0.76rem', fontWeight: 850 }}>
                    {orderPreviewLoading ? 'Loading...' : `${orderPreviewOrders.length} orders`}
                  </span>
                </div>

                <div style={{ padding: '12px', maxHeight: '280px', overflowY: 'auto', background: '#FFFFFF' }}>
                  {orderPreviewLoading ? (
                    <div
                      style={{
                        minHeight: '96px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        textAlign: 'center',
                        color: '#64748B',
                        fontWeight: 850,
                        background: '#FFFFFF'
                      }}
                    >
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: '#EFF6FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 8px 18px rgba(37,99,235,0.12)'
                        }}
                      >
                        <Loader2 size={21} color="#2563EB" className="animate-spin" />
                      </div>
                      <div style={{ fontSize: '0.88rem', lineHeight: 1.3 }}>
                        Loading ordered products...
                      </div>
                    </div>
                  ) : orderPreviewOrders.length === 0 ? (
                    <div style={{ padding: '26px 12px', textAlign: 'center', color: '#94A3B8', fontWeight: 850 }}>
                      No ordered products found for this referral code.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {orderPreviewOrders.map((order, orderIndex) => {
                        const orderKey = getOrderPreviewKey(order, orderIndex);
                        const isExpanded = expandedPreviewOrders[orderKey] === true;
                        const isOfflineOrder = normalizeText(order.orderType) === 'offline';

                        return (
                          <div key={orderKey} style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                            <button
                              type="button"
                              onClick={() => setExpandedPreviewOrders((current) => ({ ...current, [orderKey]: current[orderKey] !== true }))}
                              style={{
                                width: '100%',
                                border: 'none',
                                padding: '10px 12px',
                                background: '#F8FAFC',
                                display: 'grid',
                                gridTemplateColumns: '1fr auto auto',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ color: '#0F172A', fontWeight: 900, fontSize: '0.86rem' }}>{order.orderNumber}</span>
                                  <span
                                    style={{
                                      borderRadius: '999px',
                                      background: isOfflineOrder ? '#FEF3C7' : '#DBEAFE',
                                      color: isOfflineOrder ? '#B45309' : '#1D4ED8',
                                      border: `1px solid ${isOfflineOrder ? '#FCD34D' : '#BFDBFE'}`,
                                      padding: '3px 8px',
                                      fontSize: '0.68rem',
                                      fontWeight: 950
                                    }}
                                  >
                                    {isOfflineOrder ? 'Offline Order' : 'Online Order'}
                                  </span>
                                  <span style={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 850 }}>
                                    {order.items.length} products
                                  </span>
                                </div>
                                <div style={{ color: '#64748B', fontWeight: 700, fontSize: '0.72rem', marginTop: '4px' }}>
                                  {order.customerName} - {order.customerMobile}
                                </div>
                              </div>
                              <div style={{ color: '#16A34A', fontWeight: 900, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                Rs. {order.payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                              <ChevronDown
                                size={18}
                                color="#64748B"
                                style={{
                                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.18s ease'
                                }}
                              />
                            </button>

                            {isExpanded && (
                              <div style={{ display: 'grid', gap: '8px', padding: '10px' }}>
                                {order.items.length === 0 ? (
                                  <div style={{ color: '#94A3B8', fontWeight: 800, fontSize: '0.8rem', textAlign: 'center', padding: '10px' }}>
                                    No products found in this order.
                                  </div>
                                ) : (
                                  order.items.map((product, productIndex) => {
                                const qty = Number(product.quantity || product.qty || 1);
                                const price = Number(product.unit_price || product.price || product.product_price || 0);
                                const total = Number(product.total_price || product.total || (price * qty) || 0);
                                const image = getProductImage(product);

                                return (
                                  <div
                                    key={`${order.id || orderIndex}-${product.id || product.product_id || productIndex}`}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '46px 1fr auto',
                                      gap: '10px',
                                      alignItems: 'center',
                                      padding: '9px',
                                      borderRadius: '10px',
                                      background: '#FFFFFF',
                                      border: '1px solid #F1F5F9'
                                    }}
                                  >
                                    <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {image ? (
                                        <img src={image} alt={getProductName(product)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      ) : (
                                        <ShoppingBag size={18} color="#94A3B8" />
                                      )}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ color: '#0F172A', fontWeight: 900, fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {getProductName(product)}
                                      </div>
                                      <div style={{ color: '#64748B', fontWeight: 750, fontSize: '0.72rem', marginTop: '2px' }}>
                                        {getProductCode(product) ? `Code: ${getProductCode(product)} - ` : ''}Qty: {qty} x Rs. {price.toFixed(2)}
                                      </div>
                                    </div>
                                    <div style={{ color: '#4F46E5', fontWeight: 900, fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                                      Rs. {total.toFixed(2)}
                                    </div>
                                  </div>
                                );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
