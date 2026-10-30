import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { offlineOrderAPI, productAPI } from '../api/api';
import {
  Search,
  Plus,
  Edit2,
  Printer,
  Check,
  X,
  FileSpreadsheet,
  Receipt,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Package,
  Eye,
  IndianRupee,
  Clock,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import { useLanguage } from '../context/LanguageContext';
import PrintableBill from '../components/PrintableBill';
import PageRefreshButton from '../components/PageRefreshButton';

const getReferralDiscountPercent = (order = {}) => {
  const safeOrder = order || {};
  const value = Number(
    safeOrder.referral_customer_discount_percentage ??
    safeOrder.referral_discount_percentage ??
    safeOrder.customer_discount ??
    safeOrder.referral_customer_discount ??
    0
  );
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
};

const getBillTotals = (order = {}) => {
  const safeOrder = order || {};
  const subtotal = Number(safeOrder.subtotal || 0) || 0;
  const taxAmount = Number(safeOrder.tax_amount || 0) || 0;
  const basicDiscount = Number(safeOrder.basic_discount_amount || 0) || 0;
  const otherDiscount = Number(safeOrder.other_discount_amount || 0) || 0;
  const referralPercent = getReferralDiscountPercent(safeOrder);
  const referralDiscount = safeOrder.referral_code ? subtotal * (referralPercent / 100) : 0;

  return {
    referralPercent,
    referralDiscount,
    payable: Math.max(0, subtotal + taxAmount - basicDiscount - otherDiscount - referralDiscount),
  };
};

function unwrapOrderPayload(response, fallbackOrder = {}) {
  const payload = response?.data?.data || response?.data || response || fallbackOrder;
  if (Array.isArray(payload)) {
    return payload.find((item) => String(item.id) === String(fallbackOrder.id)) || payload[0] || fallbackOrder;
  }
  return payload?.order || payload?.offline_order || payload;
}

export default function OfflineOrders() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [updatingPaymentStatusId, setUpdatingPaymentStatusId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsgValue] = useState('');
  const setErrorMsg = (message) => { setErrorMsgValue(message); if (message) toast.error(message); };

  // Editable Receipt Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  // View Bill Modal State
  const [viewOrder, setViewOrder] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deletingOrderNo, setDeletingOrderNo] = useState(null);

  // Thermal Print Receipt Modal State
  const [printOrder, setPrintOrder] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const [orderRes, prodRes] = await Promise.all([
        offlineOrderAPI.getOfflineOrders().catch(() => null),
        productAPI.getProducts().catch(() => null)
      ]);

      if (orderRes) {
        let list = [];
        if (Array.isArray(orderRes)) {
          list = orderRes;
        } else if (Array.isArray(orderRes.data)) {
          list = orderRes.data;
        } else if (Array.isArray(orderRes.data?.data)) {
          list = orderRes.data.data;
        }
        setOrders(list);
      }

      if (prodRes) {
        let pList = [];
        if (Array.isArray(prodRes)) {
          pList = prodRes;
        } else if (Array.isArray(prodRes.data)) {
          pList = prodRes.data;
        } else if (Array.isArray(prodRes.data?.data)) {
          pList = prodRes.data.data;
        }
        setProducts(pList);
      }
    } catch (err) {
      console.error('Error fetching POS data:', err);
      setErrorMsg(err.message || t('pos.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Search & Status Filtered Orders
  const filteredOrders = orders.filter((order) => {
    const orderNo = order.order_no || '';
    const custName = order.customer_name || '';
    const custMobile = order.customer_mobile || '';

    const matchesSearch =
      orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custMobile.includes(searchTerm);

    const normalizedPaymentStatus = String(order.payment_status || 'pending').toLowerCase();
    const matchesStatus =
      filterStatus === 'All' ||
      (filterStatus === 'paid' && normalizedPaymentStatus === 'paid') ||
      (filterStatus === 'unpaid' && normalizedPaymentStatus !== 'paid');

    return matchesSearch && matchesStatus;
  });

  // Total Offline POS Stats
  const totalSales = orders.reduce(
    (sum, o) => sum + (o.payment_status === 'paid' ? parseFloat(o.payable_amount || 0) : 0),
    0
  );
  const paidCount = orders.filter((o) => o.payment_status === 'paid').length;
  const pendingCount = orders.filter((o) => o.payment_status !== 'paid').length;
  const viewBillTotals = getBillTotals(viewOrder);

  const handlePaymentStatusChange = async (order, nextStatus) => {
    if (!order?.id || updatingPaymentStatusId === order.id) return;

    const previousStatus = order.payment_status || 'pending';
    const apiStatus = nextStatus === 'paid' ? 'paid' : 'pending';
    setUpdatingPaymentStatusId(order.id);
    setOrders((current) => current.map((item) => (
      item.id === order.id ? { ...item, payment_status: apiStatus } : item
    )));

    try {
      await offlineOrderAPI.updateOfflineOrder(order.id, { payment_status: apiStatus });
      toast.success(`Payment status updated to ${nextStatus === 'paid' ? 'Paid' : 'Unpaid'}`);
    } catch (err) {
      setOrders((current) => current.map((item) => (
        item.id === order.id ? { ...item, payment_status: previousStatus } : item
      )));
      toast.error(err.message || 'Failed to update payment status');
    } finally {
      setUpdatingPaymentStatusId(null);
    }
  };

  const normalizeOrderItems = (order) => {
    const rawItems = order?.items || order?.order_items || order?.details || [];
    if (!Array.isArray(rawItems)) return [];

    return rawItems.map((item) => {
      const quantity = Number(item.quantity || item.qty || 1);
      const unitPrice = Number(item.unit_price || item.price || 0);
      const totalPrice = Number(item.total_price || item.total || (unitPrice * quantity) || 0);

      return {
        ...item,
        product_name: item.product_name || item.name || item.item_name || 'Product Item',
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      };
    });
  };

  const handleViewBill = async (order) => {
    const initialOrder = { ...order, items: normalizeOrderItems(order) };
    setViewOrder({ ...initialOrder, payable_amount: getBillTotals(initialOrder).payable });
    setViewLoading(true);
    try {
      const response = await offlineOrderAPI.getOfflineOrderById(order.id);
      const detail = response?.data?.data || response?.data || response || order;
      const normalizedDetail = { ...detail, items: normalizeOrderItems(detail) };
      const correctedDetail = { ...normalizedDetail, payable_amount: getBillTotals(normalizedDetail).payable };
      setViewOrder(correctedDetail);
      setOrders((current) => current.map((item) => item.id === correctedDetail.id ? correctedDetail : item));
    } catch (err) {
      setErrorMsg(err.message || t('pos.loadBillError'));
    } finally {
      setViewLoading(false);
    }
  };

  const handlePrint = async (order) => {
    let printableOrder = { ...order, items: normalizeOrderItems(order) };
    try {
      const response = await offlineOrderAPI.getOfflineOrderById(order.id);
      const detail = unwrapOrderPayload(response, order);
      printableOrder = {
        ...order,
        ...detail,
        shop_details: detail.shop_details || detail.shopDetails || order.shop_details || order.shopDetails,
        items: normalizeOrderItems(detail)
      };
    } catch (err) {
      console.warn('Could not load complete bill for printing:', err.message);
    }
    setPrintOrder({ ...printableOrder, payable_amount: getBillTotals(printableOrder).payable });
    window.setTimeout(() => window.print(), 120);
  };

  const handleDeleteOrder = (order) => {
    if (!order.id || deletingOrderNo) return;
    setDeleteCandidate(order);
  };

  const confirmDeleteOrder = async () => {
    if (!deleteCandidate) return;
    const orderId = deleteCandidate.id;
    const orderNo = deleteCandidate.order_no;
    setDeletingOrderNo(orderId);
    setDeleteCandidate(null);
    try {
      await offlineOrderAPI.deleteOfflineOrder(orderId);
      setOrders((current) => current.filter((item) => item.order_no !== orderNo));
      setViewOrder((current) => (current?.order_no === orderNo ? null : current));
      toast.success('Offline order deleted successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to delete offline order');
    } finally {
      setDeletingOrderNo(null);
    }
  };

  // Open Modal for Creating or Editing Bill Receipt
  const handleOpenEditModal = (order = null) => {
    setErrorMsg('');
    if (order) {
      // Parse existing items or fallback
      let rawItems = order.items || order.order_items || order.details || [];
      let initialItems = [];
      if (Array.isArray(rawItems) && rawItems.length > 0) {
        initialItems = rawItems.map(item => ({
          product_id: Number(item.product_id || item.id || (products[0]?.id || 1)),
          product_name: String(item.product_name || item.name || (products[0]?.name || 'Item')),
          original_price: parseFloat(item.original_price || item.unit_price || item.price || 0),
          discount_type: item.discount_type || null,
          discount_value: item.discount_value !== undefined && item.discount_value !== null ? item.discount_value : null,
          quantity: parseFloat(item.quantity || item.qty || 1),
          unit_price: parseFloat(item.unit_price || item.price || 0),
          total_price: parseFloat(item.total_price || item.total || 0)
        }));
      } else if (products.length > 0) {
        const p = products[0];
        const uPrice = parseFloat(p.price || p.offer_price || 100);
        initialItems = [{
          product_id: p.id,
          product_name: p.name,
          quantity: 1,
          unit_price: uPrice,
          total_price: uPrice
        }];
      } else {
        initialItems = [{
          product_id: 1,
          product_name: 'Product Item',
          quantity: 1,
          unit_price: 100,
          total_price: 100
        }];
      }

    const subtotal = parseFloat(order.subtotal || 0);
      const tax_percentage = parseFloat(order.tax_percentage || 18);
      const tax_amount = parseFloat(order.tax_amount || (subtotal * (tax_percentage / 100)));
      const basic_discount_type = order.basic_discount_type || 'percentage';
      const basic_discount_percentage = parseFloat(order.basic_discount_percentage || 0);
      const basic_discount_amount = parseFloat(order.basic_discount_amount || 0);
      const other_discount_type = order.other_discount_type || 'percentage';
      const other_discount_value = parseFloat(order.other_discount_value || 0);
      const other_discount_amount = parseFloat(order.other_discount_amount || 0);
      const payable_amount = parseFloat(order.payable_amount || 0);

      setEditingOrder({
        id: order.id,
        order_no: order.order_no,
        customer_name: order.customer_name || 'Walk-in Customer',
        customer_mobile: order.customer_mobile || '9876543210',
        items: initialItems,
        subtotal: subtotal,
        tax_percentage: tax_percentage,
        tax_amount: tax_amount,
        basic_discount_type: basic_discount_type,
        basic_discount_percentage: basic_discount_percentage,
        basic_discount_amount: basic_discount_amount,
        other_discount_type: other_discount_type,
        other_discount_value: other_discount_value,
        other_discount_amount: other_discount_amount,
        payable_amount: payable_amount,
        payment_status: order.payment_status || 'paid',
        order_status: order.order_status || 'completed',
        payment_method: order.payment_method || 'cash',
        remark: order.remark || ''
      });
    } else {
      // Setup initial product item
      const firstProd = products[0];
      const initialPrice = firstProd ? parseFloat(firstProd.discount_price || firstProd.offer_price || firstProd.price || 200) : 200;
      const initialItems = [{
        product_id: firstProd ? firstProd.id : 1,
        product_name: firstProd ? firstProd.name : 'Sample Product',
        original_price: firstProd ? parseFloat(firstProd.original_price || firstProd.mrp || firstProd.price || initialPrice) : initialPrice,
        quantity: 1,
        unit_price: initialPrice,
        total_price: initialPrice
      }];

      const subtotal = initialPrice;
      const tax_percentage = 18;
      const tax_amount = subtotal * (tax_percentage / 100);
      const basic_discount_type = 'percentage';
      const basic_discount_percentage = 0;
      const basic_discount_amount = 0;
      const other_discount_type = 'percentage';
      const other_discount_value = 0;
      const other_discount_amount = 0;
      const payable_amount = Math.max(0, subtotal + tax_amount - basic_discount_amount - other_discount_amount);

      setEditingOrder({
        id: null,
        order_no: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        customer_name: '',
        customer_mobile: '',
        items: initialItems,
        subtotal: subtotal,
        tax_percentage: tax_percentage,
        tax_amount: tax_amount,
        basic_discount_type: basic_discount_type,
        basic_discount_percentage: basic_discount_percentage,
        basic_discount_amount: basic_discount_amount,
        other_discount_type: other_discount_type,
        other_discount_value: other_discount_value,
        other_discount_amount: other_discount_amount,
        payable_amount: payable_amount,
        payment_status: 'paid',
        order_status: 'completed',
        payment_method: 'cash',
        remark: ''
      });
    }
    setIsModalOpen(true);
  };

  // Recalculate totals from items & percentages
  const recalculateOrderTotals = (updatedItems, draftState = editingOrder) => {
    if (!draftState) return;

    const subtotal = updatedItems.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
    const taxP = parseFloat(draftState.tax_percentage) || 0;
    const basicDiscP = parseFloat(draftState.basic_discount_percentage) || 0;
    const basicDiscType = draftState.basic_discount_type || 'percentage';
    const otherDiscVal = parseFloat(draftState.other_discount_value) || 0;
    const otherDiscType = draftState.other_discount_type || 'percentage';

    const taxAmount = subtotal * (taxP / 100);
    const basicDiscAmount = basicDiscType === 'amount' ? basicDiscP : subtotal * (basicDiscP / 100);
    const otherDiscAmount = otherDiscType === 'percentage' ? (subtotal * (otherDiscVal / 100)) : otherDiscVal;
    
    const payable = Math.max(0, subtotal + taxAmount - basicDiscAmount - otherDiscAmount);

    setEditingOrder({
      ...draftState,
      items: updatedItems,
      subtotal: subtotal,
      tax_amount: taxAmount,
      basic_discount_amount: basicDiscAmount,
      other_discount_amount: otherDiscAmount,
      payable_amount: payable
    });
  };

  // Handle line item change
  const handleItemProductSelect = (index, productId) => {
    if (!editingOrder) return;
    const selectedProd = products.find(p => String(p.id) === String(productId));
    const updatedItems = [...editingOrder.items];

    if (selectedProd) {
      const original = parseFloat(selectedProd.original_price || selectedProd.mrp || selectedProd.price || 0);
      const discount = parseFloat(selectedProd.discount_price || selectedProd.offer_price || selectedProd.price || 0);
      const uPrice = discount > 0 ? discount : (original || 0);
      const qty = parseFloat(updatedItems[index].quantity) || 1;
      updatedItems[index] = {
        ...updatedItems[index],
        product_id: selectedProd.id,
        product_name: selectedProd.name,
        original_price: original > 0 ? original : uPrice,
        discount_type: selectedProd.discount_type || null,
        discount_value: selectedProd.discount_value !== undefined && selectedProd.discount_value !== null ? selectedProd.discount_value : null,
        unit_price: uPrice,
        quantity: qty,
        total_price: qty * uPrice
      };
    } else {
      updatedItems[index].product_id = productId;
    }

    recalculateOrderTotals(updatedItems);
  };

  const handleItemFieldChange = (index, field, value) => {
    if (!editingOrder) return;
    const updatedItems = [...editingOrder.items];
    updatedItems[index][field] = value;

    if (field === 'quantity' || field === 'unit_price') {
      const qty = parseFloat(updatedItems[index].quantity) || 0;
      const price = parseFloat(updatedItems[index].unit_price) || 0;
      updatedItems[index].total_price = qty * price;
    }

    recalculateOrderTotals(updatedItems);
  };

  const handleAddItemRow = () => {
    if (!editingOrder) return;
    const firstP = products[0];
    const uPrice = firstP ? parseFloat(firstP.discount_price || firstP.offer_price || firstP.price || 100) : 100;
    const ogPrice = firstP ? parseFloat(firstP.original_price || firstP.mrp || firstP.price || uPrice) : uPrice;
    const newItem = {
      product_id: firstP ? firstP.id : (Date.now() % 10000),
      product_name: firstP ? firstP.name : 'New Product',
      original_price: ogPrice,
      quantity: 1,
      unit_price: uPrice,
      total_price: uPrice
    };
    recalculateOrderTotals([...editingOrder.items, newItem]);
  };

  const handleRemoveItemRow = (index) => {
    if (!editingOrder || editingOrder.items.length <= 1) return;
    const updatedItems = editingOrder.items.filter((_, i) => i !== index);
    recalculateOrderTotals(updatedItems);
  };

  // Recalculate on tax / discount value input change
  const handleRateInputChange = (field, value) => {
    if (!editingOrder) return;
    const val = parseFloat(value) || 0;
    const updatedState = { ...editingOrder, [field]: val };
    recalculateOrderTotals(editingOrder.items, updatedState);
  };

  // Save (Create or Update) Bill
  const handleSaveBill = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;

    if (!editingOrder.items || editingOrder.items.length === 0) {
      alert(t('pos.needItem'));
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');

      // Build JSON body strictly matching Postman structure
      const payload = {
        customer_name: editingOrder.customer_name || 'Walk-in Customer',
        customer_mobile: editingOrder.customer_mobile || '9876543210',
        subtotal: Number(editingOrder.subtotal || 0),
        tax_percentage: Number(editingOrder.tax_percentage || 0),
        tax_amount: Number(editingOrder.tax_amount || 0),
        basic_discount_type: editingOrder.basic_discount_type || 'percentage',
        basic_discount_percentage: Number(editingOrder.basic_discount_percentage || 0),
        basic_discount_amount: Number(editingOrder.basic_discount_amount || 0),
        other_discount_type: editingOrder.other_discount_type || 'percentage',
        other_discount_value: Number(editingOrder.other_discount_value || 0),
        other_discount_amount: Number(editingOrder.other_discount_amount || 0),
        payment_method: editingOrder.payment_method || 'cash',
        payment_status: editingOrder.payment_status || 'paid',
        order_status: editingOrder.order_status || 'completed',
        payable_amount: Number(editingOrder.payable_amount || 0),
        remark: editingOrder.remark || '',
        items: editingOrder.items.map(item => ({
          product_id: Number(item.product_id || 1),
          product_name: String(item.product_name || 'Product'),
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unit_price || 0),
          total_price: Number(item.total_price || 0)
        }))
      };

      let res;
      if (editingOrder.id) {
        res = await offlineOrderAPI.updateOfflineOrder(editingOrder.id, payload);
      } else {
        res = await offlineOrderAPI.createOfflineOrder(payload);
      }

      if (res.success) {
        setSuccessMsg(editingOrder.id ? t('pos.updatedSuccess') : t('pos.createdSuccess'));
        setIsModalOpen(false);
        setEditingOrder(null);
        fetchInitialData();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(res.message || t('pos.saveFailed'));
      }
    } catch (err) {
      setErrorMsg(err.message || t('pos.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const filterStatusOptions = [
    { label: t('pos.allStatuses'), value: 'All' },
    { label: t('pos.paid'), value: 'paid' },
    { label: 'Unpaid', value: 'unpaid' }
  ];

  const inlinePaymentStatusOptions = [
    { label: t('pos.paid'), value: 'paid' },
    { label: 'Unpaid', value: 'unpaid' }
  ];

  const paymentMethodOptions = [
    { label: t('pos.cash'), value: 'cash' },
    { label: t('pos.cod'), value: 'cod' },
    { label: t('pos.upi'), value: 'upi' },
    { label: t('pos.card'), value: 'card' },
    { label: t('pos.online'), value: 'online' },
    { label: t('pos.other'), value: 'other' }
  ];

  const paymentStatusOptions = [
    { label: t('pos.pending'), value: 'pending' },
    { label: t('pos.paid'), value: 'paid' },
    { label: t('pos.partial'), value: 'partial' },
    { label: t('pos.refunded'), value: 'refunded' }
  ];

  const orderStatusOptions = [
    { label: t('pos.completed'), value: 'completed' },
    { label: t('pos.pending'), value: 'pending' },
    { label: t('pos.cancelled'), value: 'cancelled' }
  ];

  // eslint-disable-next-line no-unused-vars
  const otherDiscountTypeOptions = [
    { label: t('pos.percentageOption'), value: 'percentage' },
    { label: t('pos.flatOption'), value: 'amount' }
  ];


  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px', gap: '10px', color: '#10B981' }}>
        <Loader2 className="animate-spin" size={24} />
        <span style={{ fontWeight: 700 }}>{t('pos.loadingOrders')}</span>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ width: '100%' }}>

      {/* Header & Title */}
      <div className="page-title-row">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet color="#10B981" size={24} />
            <span>{t('pos.title')}</span>
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '2px', fontWeight: 600 }}>
            {t('pos.subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <PageRefreshButton />
          <button className="btn-primary" onClick={() => window.location.assign('https://pattaz.com/billing')}>
            <Plus size={16} />
            <span>{t('pos.createBill')}</span>
          </button>
        </div>
      </div>

      {/* Error Notification */}
      {false && errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: '#FEE2E2', color: '#EF4444', borderRadius: '12px', marginBottom: '16px', fontWeight: 700, border: '1px solid #FCA5A5' }}>
          <AlertCircle size={20} /><span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-orders" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <IndianRupee size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('pos.statRevenue')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
              ₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-customers" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <Receipt size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('pos.statPaidBills')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {paidCount} {t('pos.bills')}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.2)' }}>
            <Clock size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('pos.statPending')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#EF4444', marginTop: '2px' }}>
              {pendingCount} {t('pos.bills')}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="admin-card" style={{ marginBottom: '16px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-input-wrapper" style={{ flex: 1, minWidth: '240px' }}>
            <Search size={16} color="#64748B" />
            <input
              type="text"
              className="search-input-field"
              placeholder={t('pos.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>{t('pos.paymentStatusLabel')}</span>
            <CustomSelect
              options={filterStatusOptions}
              value={filterStatus}
              onChange={(val) => setFilterStatus(val)}
            />
          </div>
        </div>
      </div>

      {/* Orders Data Table */}
      <div className="admin-card">
        <div className="admin-table-container orders-table-container">
          <table className="admin-table orders-table">
            <thead>
              <tr>
                <th>{t('pos.colOrderNo')}</th>
                <th>{t('pos.colDate')}</th>
                <th>{t('pos.colCustomer')}</th>
                <th>{t('pos.colMobile')}</th>
                <th>{t('pos.colPaymentMethod')}</th>
                <th>{t('pos.colSubtotal')}</th>
                <th>{t('pos.colPayable')}</th>
                <th>{t('pos.colPaymentStatus')}</th>
                <th style={{ textAlign: 'right' }}>{t('pos.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontWeight: 600 }}>
                    {t('pos.noOrders')}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id || order.order_no}>
                    <td>
                      <span style={{ fontWeight: 800, color: '#5B5FC7', fontFamily: 'monospace' }}>
                        {order.order_no}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#64748B' }}>
                      {order.created_at || order.updated_at || t('pos.recently')}
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#0F172A' }}>{order.customer_name || t('pos.walkInCustomer')}</span>
                      {order.referral_code && (
                        <div style={{ marginTop: '3px' }}>
                          <span style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', border: '1px dashed #A5B4FC' }}>
                            Ref: {order.referral_code}
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>{order.customer_mobile || t('pos.na')}</span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: '#EEF2FF', color: '#5B5FC7', textTransform: 'uppercase', fontWeight: 800, fontSize: '0.7rem' }}>
                        {order.payment_method || 'cash'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#475569' }}>
                      ₹{parseFloat(order.subtotal || 0).toFixed(2)}
                    </td>
                    <td>
                      <span style={{ fontWeight: 900, color: '#10B981', fontSize: '0.98rem' }}>
                        ₹{parseFloat(order.payable_amount || 0).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const s = (order.payment_status || 'pending').toLowerCase();
                        const displayStatus = s === 'paid' ? 'paid' : 'unpaid';
                        return (
                          <select
                            aria-label={`Payment status for ${order.order_no || 'order'}`}
                            value={displayStatus}
                            disabled={updatingPaymentStatusId === order.id}
                            onChange={(event) => handlePaymentStatusChange(order, event.target.value)}
                            style={{
                              minHeight: '32px',
                              minWidth: '92px',
                              padding: '5px 28px 5px 10px',
                              borderRadius: '999px',
                              border: displayStatus === 'paid' ? '1px solid #A7F3D0' : '1px solid #FCD34D',
                              background: displayStatus === 'paid' ? '#D1FAE5' : '#FEF3C7',
                              color: displayStatus === 'paid' ? '#047857' : '#B45309',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              cursor: updatingPaymentStatusId === order.id ? 'wait' : 'pointer',
                              opacity: updatingPaymentStatusId === order.id ? 0.65 : 1
                            }}
                          >
                            {inlinePaymentStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        );
                      })()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="orders-table-actions" style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          className="header-action-btn"
                          style={{ padding: '5px 10px', gap: '4px' }}
                          onClick={() => handleViewBill(order)}
                          title={t('pos.viewBillDetails')}
                        >
                          <Eye size={14} color="#0284C7" />
                          <span>{t('pos.view')}</span>
                        </button>

                        <button
                          className="header-action-btn"
                          style={{ padding: '5px 10px', gap: '4px' }}
                          onClick={() => handlePrint(order)}
                          title={t('pos.printReceipt')}
                        >
                          <Printer size={14} color="#10B981" />
                          <span>{t('pos.receipt')}</span>
                        </button>

                        <button
                          className="header-action-btn"
                          style={{ padding: '5px 10px', gap: '4px', color: '#DC2626' }}
                          title="Delete Order"
                          disabled={deletingOrderNo === order.id}
                          onClick={() => handleDeleteOrder(order)}
                        >
                          <Trash2 size={14} color="#DC2626" />
                          <span>{deletingOrderNo === order.id ? 'Deleting...' : 'Delete'}</span>
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
          aria-labelledby="delete-offline-order-title"
          onClick={() => setDeleteCandidate(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(15, 23, 42, 0.78)' }}
        >
          <div onClick={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: '334px', overflow: 'hidden', borderRadius: '8px', background: '#FFFFFF', boxShadow: '0 18px 45px rgba(0, 0, 0, 0.28)' }}>
            <div style={{ position: 'relative', padding: '20px 18px 16px', textAlign: 'center', color: '#FFFFFF', background: '#F52D32', borderBottom: '5px solid #D7D7D7' }}>
              <button type="button" aria-label="Close delete confirmation" onClick={() => setDeleteCandidate(null)} style={{ position: 'absolute', top: '5px', right: '9px', border: 0, background: 'transparent', color: '#FFFFFF', fontSize: '26px', lineHeight: 1, fontWeight: 900, cursor: 'pointer' }}>×</button>
              <span style={{ position: 'relative', display: 'inline-flex', marginBottom: '5px' }}>
                <AlertTriangle size={58} strokeWidth={2.7} color="#FFFFFF" fill="#FFFFFF" />
                <span style={{ position: 'absolute', left: '50%', top: '47%', transform: 'translate(-50%, -50%)', color: '#F52D32', fontSize: '32px', lineHeight: 1, fontWeight: 900 }}>!</span>
              </span>
              <h2 id="delete-offline-order-title" style={{ margin: 0, fontSize: '29px', lineHeight: 1.05, fontWeight: 900, letterSpacing: '0.5px' }}>WARNING!</h2>
              <p style={{ margin: '8px 0 0', fontSize: '15px', fontWeight: 600 }}>Do you want to continue?</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', padding: '15px 16px 20px' }}>
              <button type="button" onClick={confirmDeleteOrder} style={{ minWidth: '81px', padding: '6px 18px', border: 0, borderRadius: '3px', background: '#68B36B', color: '#FFFFFF', fontSize: '15px', cursor: 'pointer' }}>Yes</button>
              <button type="button" onClick={() => setDeleteCandidate(null)} style={{ minWidth: '81px', padding: '6px 18px', border: 0, borderRadius: '3px', background: '#ED8084', color: '#FFFFFF', fontSize: '15px', cursor: 'pointer' }}>No</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT OFFLINE ORDER MODAL */}
      {isModalOpen && editingOrder && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div
            className="modal-content"
            style={{ maxWidth: '720px', width: '95%', padding: '24px', borderRadius: '20px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={22} color="#5B5FC7" />
                <span>{editingOrder.id ? `${t('pos.editBillTitle')} (${editingOrder.order_no})` : t('pos.createBillTitle')}</span>
              </h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBill} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Customer Details Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{t('pos.customerName')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingOrder.customer_name}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customer_name: e.target.value })}
                    placeholder={t('pos.placeholderCustomer')}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{t('pos.mobileNumber')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingOrder.customer_mobile}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customer_mobile: e.target.value })}
                    placeholder={t('pos.placeholderMobile')}
                    required
                  />
                </div>
              </div>

              {/* PRODUCTS SELECTION LIST SECTION */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={16} color="#5B5FC7" />
                    <span>{t('pos.selectProducts')}</span>
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                    onClick={handleAddItemRow}
                  >
                    <Plus size={14} />
                    <span>{t('pos.addItem')}</span>
                  </button>
                </div>

                {/* Column Headers */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 56px 88px 92px 92px 24px',
                    gap: '8px',
                    padding: '0 10px 4px 10px'
                  }}
                >
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t('pos.product')}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.3px', textAlign: 'center' }}>{t('pos.qty')}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.3px', textAlign: 'right' }}>{t('pos.mrp')}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.3px', textAlign: 'right' }}>{t('pos.discPrice')}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.3px', textAlign: 'right' }}>{t('pos.total')}</span>
                  <span></span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {editingOrder.items.map((item, idx) => {
                    const itemOriginal = parseFloat(item.original_price || item.unit_price || 0);
                    const itemUnit = parseFloat(item.unit_price || 0);
                    const itemQty = parseFloat(item.quantity) || 1;
                    const hasItemDiscount = itemOriginal > 0 && itemUnit > 0 && itemOriginal > itemUnit;
                    return (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 56px 88px 92px 92px 24px',
                        gap: '8px',
                        alignItems: 'center',
                        background: '#F8FAFC',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      {/* Product Selector Dropdown or Manual Text */}
                      {products.length > 0 ? (
                        <CustomSelect
                          searchable
                          options={products.map(p => {
                            return {
                              label: p.name,
                              value: p.id
                            };
                          })}
                          value={item.product_id}
                          onChange={(val) => handleItemProductSelect(idx, val)}
                        />
                      ) : (
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '5px 8px', fontSize: '0.8rem' }}
                          value={item.product_name}
                          onChange={(e) => handleItemFieldChange(idx, 'product_name', e.target.value)}
                          placeholder={t('pos.productName')}
                          required
                        />
                      )}

                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        style={{ padding: '5px 6px', fontSize: '0.8rem', textAlign: 'center', height: '42px', boxSizing: 'border-box' }}
                        value={item.quantity}
                        onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                        placeholder={t('pos.qty')}
                        required
                      />

                      <div style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 6px', background: '#FFFFFF', border: '1px dashed #CBD5E1', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>
                          ₹{itemOriginal.toFixed(2)}
                        </span>
                      </div>

                      <div style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', borderRadius: '8px', background: '#DCFCE7', border: '1px solid #86EFAC' }}>
                        {(() => {
                          if (item.discount_type === 'percentage' && item.discount_value !== null && item.discount_value !== undefined) {
                            return <span style={{ fontSize: '1rem', textAlign: 'center', color: '#15803D', fontWeight: 800, whiteSpace: 'nowrap' }}>{Math.round(Number(item.discount_value))}%</span>;
                          }
                          if ((item.discount_type === 'amount' || item.discount_type === 'flat' || item.discount_type === 'rs') && item.discount_value !== null && item.discount_value !== undefined) {
                            return <span style={{ fontSize: '1rem', textAlign: 'center', color: '#15803D', fontWeight: 800, whiteSpace: 'nowrap' }}>₹{Number(item.discount_value)}</span>;
                          }
                          if (hasItemDiscount) {
                            const pct = ((itemOriginal - itemUnit) / itemOriginal) * 100;
                            const isCleanPct = Math.abs(pct - Math.round(pct)) < 0.001;
                            return <span style={{ fontSize: '1rem', textAlign: 'center', color: '#15803D', fontWeight: 800, whiteSpace: 'nowrap' }}>
                              {isCleanPct ? `${Math.round(pct)}%` : `₹${(itemOriginal - itemUnit).toFixed(2)}`}
                            </span>;
                          }
                          return <span style={{ fontSize: '1rem', textAlign: 'center', color: '#16A34A', fontWeight: 800, whiteSpace: 'nowrap' }}>0%</span>;
                        })()}
                      </div>

                      <input
                        type="number"
                        readOnly
                        tabIndex="-1"
                        className="form-input"
                        style={{
                          padding: '5px 6px',
                          fontSize: '0.8rem',
                          textAlign: 'right',
                          fontWeight: 800,
                          color: '#5B5FC7',
                          background: '#EEF2FF',
                          border: '1px solid #C7D2FE',
                          cursor: 'default',
                          height: '42px',
                          boxSizing: 'border-box'
                        }}
                        value={parseFloat(item.total_price || 0).toFixed(2)}
                      />

                      {editingOrder.items.length > 1 && (
                        <button
                          type="button"
                          style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer', padding: 0 }}
                          onClick={() => handleRemoveItemRow(idx)}
                          title={t('pos.removeItem')}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Amount Breakdown Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', background: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>{t('pos.subtotalLabel')}</label>
                  <div style={{ background: '#EEF2FF', padding: '8px 12px', borderRadius: '10px', border: '1px solid #C7D2FE', fontWeight: 800, color: '#5B5FC7', fontSize: '0.95rem' }}>
                    ₹{parseFloat(editingOrder.subtotal || 0).toFixed(2)}
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>{t('pos.taxGst')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={editingOrder.tax_percentage}
                    disabled
                    style={{ background: '#F8FAFC', color: '#64748B', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>{t('pos.basicDiscount')}</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '130px', flexShrink: 0 }}>
                      <CustomSelect
                        options={[
                          { label: t('pos.pctDisc'), value: 'percentage' },
                          { label: t('pos.rsFlat'), value: 'amount' }
                        ]}
                        value={editingOrder.basic_discount_type || 'percentage'}
                        onChange={(val) => {
                          const updatedState = { ...editingOrder, basic_discount_type: val };
                          recalculateOrderTotals(editingOrder.items, updatedState);
                        }}
                      />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      value={editingOrder.basic_discount_percentage || ''}
                      placeholder={editingOrder.basic_discount_type === 'amount' ? t('pos.placeholderDiscFlat') : t('pos.placeholderDiscPct')}
                      onChange={(e) => handleRateInputChange('basic_discount_percentage', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>{t('pos.otherDiscount')}</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '130px', flexShrink: 0 }}>
                      <CustomSelect
                        options={[
                          { label: t('pos.pctDisc'), value: 'percentage' },
                          { label: t('pos.rsFlat'), value: 'amount' }
                        ]}
                        value={editingOrder.other_discount_type || 'percentage'}
                        onChange={(val) => {
                          const updatedState = { ...editingOrder, other_discount_type: val };
                          recalculateOrderTotals(editingOrder.items, updatedState);
                        }}
                      />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      style={{ flex: 1, height: '42px', borderRadius: '10px' }}
                      value={editingOrder.other_discount_value || ''}
                      placeholder={editingOrder.other_discount_type === 'percentage' ? t('pos.placeholderOtherPct') : t('pos.placeholderDiscFlat')}
                      onChange={(e) => handleRateInputChange('other_discount_value', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Summary Totals Calculation Preview */}
              <div style={{ background: '#EEF2FF', padding: '12px 16px', borderRadius: '12px', border: '1px solid #C7D2FE', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem' }}>
                {(() => {
                  const productDiscTotal = (editingOrder.items || []).reduce((sum, it) => {
                    const orig = parseFloat(it.original_price || it.unit_price || 0);
                    const unit = parseFloat(it.unit_price || 0);
                    const qty = parseFloat(it.quantity) || 1;
                    return sum + (orig > unit ? (orig - unit) * qty : 0);
                  }, 0);
                  return productDiscTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A' }}>
                      <span>{t('pos.productDiscounts')}</span>
                      <strong>-₹{productDiscTotal.toFixed(2)}</strong>
                    </div>
                  );
                })()}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>{t('pos.summaryTax')} (+GST {editingOrder.tax_percentage}%):</span>
                  <strong>+₹{editingOrder.tax_amount.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A' }}>
                  <span>{t('pos.basicDiscount')} ({editingOrder.basic_discount_type === 'amount' ? `-₹${editingOrder.basic_discount_percentage}` : `-${editingOrder.basic_discount_percentage}%`}):</span>
                  <strong>-₹{editingOrder.basic_discount_amount.toFixed(2)}</strong>
                </div>
                {editingOrder.other_discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A' }}>
                    <span>{t('pos.otherDiscount')} (-):</span>
                    <strong>-₹{editingOrder.other_discount_amount.toFixed(2)}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1E293B', fontWeight: 900, fontSize: '1.08rem', borderTop: '1px solid #C7D2FE', paddingTop: '6px', marginTop: '2px' }}>
                  <span>{t('pos.totalPayable')}</span>
                  <span style={{ color: '#10B981' }}>₹{editingOrder.payable_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Statuses and Method Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{t('pos.paymentMethod')}</label>
                  <CustomSelect
                    options={paymentMethodOptions}
                    value={editingOrder.payment_method}
                    onChange={(val) => setEditingOrder({ ...editingOrder, payment_method: val })}
                    direction="up"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{t('pos.paymentStatus')}</label>
                  <CustomSelect
                    options={paymentStatusOptions}
                    value={editingOrder.payment_status}
                    onChange={(val) => setEditingOrder({ ...editingOrder, payment_status: val })}
                    direction="up"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{t('pos.orderStatus')}</label>
                  <CustomSelect
                    options={orderStatusOptions}
                    value={editingOrder.order_status}
                    onChange={(val) => setEditingOrder({ ...editingOrder, order_status: val })}
                    direction="up"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  {t('pos.cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{saving ? t('pos.saving') : editingOrder.id ? t('pos.updateBill') : t('pos.createBillBtn')}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* POS RECEIPT PRINT MODAL */}
      {false && printOrder && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div
            className="modal-content"
            style={{ maxWidth: '420px', width: '95%', padding: '24px', borderRadius: '20px', background: '#FFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #E2E8F0', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1E293B' }}>{t('pos.receiptBrand')}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{t('pos.receiptSubtitle')}</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>
                {t('pos.billNo')} <strong>{printOrder.order_no}</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                {t('pos.date')} {printOrder.created_at || new Date().toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>{t('pos.customer')}</span>
                <strong style={{ color: '#0F172A' }}>{printOrder.customer_name || t('pos.walkInCustomer')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>{t('pos.mobile')}</span>
                <strong>{printOrder.customer_mobile || t('pos.na')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>{t('pos.paymentMethodLabel')}</span>
                <strong style={{ textTransform: 'uppercase' }}>{printOrder.payment_method || 'Cash'}</strong>
              </div>
            </div>

            {/* Items Purchased List */}
            {Array.isArray(printOrder.items) && printOrder.items.length > 0 && (
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px' }}>{t('pos.itemsList')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {printOrder.items.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span>{it.product_name || it.name} x {it.quantity || it.qty || 1}</span>
                      <strong>₹{parseFloat(it.total_price || it.total || (it.unit_price * it.quantity) || 0).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid #F1F5F9', borderBottom: '2px dashed #E2E8F0', padding: '12px 0', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('pos.subtotalColon')}</span>
                <span>₹{parseFloat(printOrder.subtotal || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                <span>{t('pos.taxReceipt')} (+GST {printOrder.tax_percentage || 18}%):</span>
                <span>+₹{parseFloat(printOrder.tax_amount || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A' }}>
                <span>{t('pos.basicDiscount')} ({printOrder.basic_discount_type === 'amount' ? `-₹${printOrder.basic_discount_percentage}` : `-${printOrder.basic_discount_percentage}%`}):</span>
                <span>-₹{parseFloat(printOrder.basic_discount_amount || 0).toFixed(2)}</span>
              </div>
              {parseFloat(printOrder.other_discount_amount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A' }}>
                <span>{t('pos.otherDiscount')} (-):</span>
                <span>-₹{parseFloat(printOrder.other_discount_amount || 0).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 900, color: '#10B981', paddingTop: '6px', borderTop: '1px solid #E2E8F0' }}>
                <span>{t('pos.totalPayableShort')}</span>
                <span>₹{parseFloat(printOrder.payable_amount || 0).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#64748B', marginBottom: '20px' }}>
              {t('pos.thankYou')}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setPrintOrder(null)}>
                {t('pos.close')}
              </button>
              <button type="button" className="btn-primary" style={{ flex: 1 }}>
                <Printer size={16} />
                <span>{t('pos.printBill')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW BILL DETAILS MODAL */}
      {viewOrder && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div
            className="modal-content"
            style={{ maxWidth: '560px', width: '95%', padding: '24px', borderRadius: '20px', background: '#FFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={22} color="#0284C7" />
                <span>{t('pos.billDetails')} ({viewOrder.order_no})</span>
              </h2>
              <button className="modal-close" onClick={() => setViewOrder(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Header Info Banner */}
            <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#0369A1', fontSize: '1.05rem', fontFamily: 'monospace' }}>{viewOrder.order_no}</div>
                <div style={{ fontSize: '0.78rem', color: '#0284C7' }}>{viewOrder.created_at || viewOrder.updated_at || t('pos.recently')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`badge ${(viewOrder.payment_status || '').toLowerCase() === 'paid' ? 'badge-completed' : 'badge-unpaid'}`} style={{ textTransform: 'uppercase' }}>
                  {viewOrder.payment_status || 'paid'}
                </span>
              </div>
            </div>

            {/* Customer Info Card */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>{t('pos.customerName')}</div>
                <div style={{ fontWeight: 800, color: '#0F172A' }}>{viewOrder.customer_name || t('pos.walkInCustomer')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>{t('pos.mobileNumber')}</div>
                <div style={{ fontWeight: 700, color: '#334155' }}>{viewOrder.customer_mobile || t('pos.na')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>{t('pos.paymentMethod')}</div>
                <div style={{ fontWeight: 800, color: '#5B5FC7', textTransform: 'uppercase' }}>{viewOrder.payment_method || 'cash'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>{t('pos.orderStatus')}</div>
                <div style={{ fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>{viewOrder.order_status || 'completed'}</div>
              </div>
            </div>

            {/* Purchased Items List */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', background: '#FFF', marginBottom: '16px' }}>
              {(() => {
                const viewItems = Array.isArray(viewOrder.items) ? viewOrder.items : [];
                const totalProductCount = viewItems.length;
                const totalQuantityCount = viewItems.reduce((sum, item) => sum + Number(item.quantity || item.qty || 1), 0);
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '10px', padding: '9px 12px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#0369A1', fontWeight: 700 }}>Total Products</div>
                      <strong style={{ display: 'block', marginTop: '3px', color: '#0C4A6E', fontSize: '1.05rem' }}>{viewLoading ? '...' : totalProductCount}</strong>
                    </div>
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '9px 12px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#15803D', fontWeight: 700 }}>Total Quantity</div>
                      <strong style={{ display: 'block', marginTop: '3px', color: '#166534', fontSize: '1.05rem' }}>{viewLoading ? '...' : totalQuantityCount}</strong>
                    </div>
                  </div>
                );
              })()}
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '10px' }}>
                {t('pos.itemsPurchased')} ({viewLoading ? '...' : (viewOrder.items || []).length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {viewLoading ? (
                  <div style={{ textAlign: 'center', padding: '18px', color: '#94A3B8', fontWeight: 700, fontSize: '0.84rem' }}>
                    {t('pos.loadingProducts')}
                  </div>
                ) : !Array.isArray(viewOrder.items) || viewOrder.items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '18px', color: '#94A3B8', fontWeight: 700, fontSize: '0.84rem' }}>
                    {t('pos.noProducts')}
                  </div>
                ) : (
                  viewOrder.items.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', border: '1px solid #F1F5F9', fontSize: '0.84rem', gap: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1E293B' }}>{it.product_name || it.name || 'Product Item'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{t('pos.qtyColon')} {it.quantity || 1} x ₹{parseFloat(it.unit_price || 0).toFixed(2)}</div>
                      </div>
                      <div style={{ fontWeight: 800, color: '#5B5FC7', whiteSpace: 'nowrap' }}>
                        ₹{parseFloat(it.total_price || 0).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* Financial Breakdown */}
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>{t('pos.subtotalColon')}</span>
                <strong>₹{parseFloat(viewOrder.subtotal || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                <span>{t('pos.taxGstSummary')} (+{viewOrder.tax_percentage || 18}%):</span>
                <span>+₹{parseFloat(viewOrder.tax_amount || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A' }}>
                <span>{t('pos.basicDiscount')} ({viewOrder.basic_discount_type === 'amount' ? `-₹${viewOrder.basic_discount_percentage}` : `-${viewOrder.basic_discount_percentage}%`}):</span>
                <span>-₹{parseFloat(viewOrder.basic_discount_amount || 0).toFixed(2)}</span>
              </div>
              {parseFloat(viewOrder.other_discount_amount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A' }}>
                  <span>{t('pos.otherDiscount')} (-):</span>
                  <span>-₹{parseFloat(viewOrder.other_discount_amount || 0).toFixed(2)}</span>
                </div>
              )}
              {viewOrder.referral_code && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4F46E5' }}>
                  <span>{`Referral Discount (${viewOrder.referral_code}) (-${viewBillTotals.referralPercent}%):`}</span>
                  <span>{`-₹${viewBillTotals.referralDiscount.toFixed(2)}`}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 900, color: '#10B981', paddingTop: '8px', borderTop: '1px solid #CBD5E1', marginTop: '4px' }}>
                <span>{t('pos.totalPayable')}</span>
                <span>₹{parseFloat(viewOrder.payable_amount || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setViewOrder(null)}>
                {t('pos.close')}
              </button>
              <button type="button" className="btn-primary" onClick={() => handlePrint(viewOrder)}>
                <Printer size={16} />
                <span>{t('pos.printReceipt')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <PrintableBill order={printOrder} variant="receipt" />

    </div>
  );
}

