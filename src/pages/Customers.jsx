import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  Receipt,
  X,
  Loader2,
  AlertCircle,
  RefreshCcw,
  Globe,
  Store,
  IndianRupee
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import { onlineOrderAPI, offlineOrderAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsgValue] = useState('');
  const setErrorMsg = (message) => { setErrorMsgValue(message); if (message) toast.error(message); };
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const { t } = useLanguage();

  // Customer Bills History Modal State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const fetchCustomerData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [onlineRes, offlineRes] = await Promise.allSettled([
        onlineOrderAPI.getOnlineOrders(),
        offlineOrderAPI.getOfflineOrders()
      ]);

      let onlineOrders = [];
      if (onlineRes.status === 'fulfilled' && onlineRes.value) {
        const val = onlineRes.value;
        onlineOrders = Array.isArray(val)
          ? val
          : Array.isArray(val.data)
          ? val.data
          : (val.data?.data || []);
      }

      let offlineOrders = [];
      if (offlineRes.status === 'fulfilled' && offlineRes.value) {
        const val = offlineRes.value;
        offlineOrders = Array.isArray(val)
          ? val
          : Array.isArray(val.data)
          ? val.data
          : (val.data?.data || []);
      }

      // Map to aggregate customers by phone/mobile number
      const customerMap = {};
      let custCounter = 101;

      // Helper to format date
      const formatDate = (rawDate) => {
        if (!rawDate) return 'N/A';
        try {
          const d = new Date(rawDate);
          if (isNaN(d.getTime())) return String(rawDate);
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) {
          return String(rawDate);
        }
      };

      // Helper to extract line items
      const extractItems = (rawItems) => {
        if (!Array.isArray(rawItems)) return [];
        return rawItems.map((item) => ({
          name: item.name || item.product_name || item.title || 'Fireworks Item',
          qty: Number(item.quantity || item.qty || 1),
          price: Number(item.price || item.unit_price || 0),
          total: Number(item.total || item.total_price || (Number(item.quantity || 1) * Number(item.price || 0)))
        }));
      };

      // Process Online Orders
      onlineOrders.forEach((order) => {
        const phone = String(
          order.customer?.mobile ||
            order.customer_mobile ||
            order.mobile ||
            order.phone ||
            order.customer_phone ||
            ''
        ).trim();

        const key = phone || `ONLINE_${order.id || order.order_no || Math.random()}`;
        const name = order.customer?.name || order.customer_name || order.name || 'Online Customer';
        const city = order.customer?.city || order.city || order.address || 'Online';
        const email = order.customer?.email || order.email || '';
        const totalAmount = Number(order.payable_amount ?? order.grandTotal ?? order.total ?? order.subtotal ?? 0);
        const rawDate = order.created_at || order.date || order.order_date || '';
        const items = extractItems(order.items || order.order_items || order.details);

        const billObj = {
          billId: order.order_no || order.orderNumber || `ORD-ONLINE-${order.id}`,
          date: formatDate(rawDate),
          rawDate: rawDate ? new Date(rawDate).getTime() : 0,
          type: 'Online',
          itemsCount: items.length,
          paymentMode: order.payment_method || order.paymentMethod || 'Online Payment',
          status: order.payment_status || order.order_status || 'Paid',
          total: totalAmount,
          items
        };

        if (!customerMap[key]) {
          customerMap[key] = {
            id: `CUST-${custCounter++}`,
            name,
            phone: phone || 'N/A',
            email,
            city: city || 'N/A',
            hasOnline: true,
            hasOffline: false,
            totalOrders: 0,
            totalSpent: 0,
            lastPurchaseTimestamp: 0,
            lastPurchase: '',
            bills: []
          };
        } else {
          customerMap[key].hasOnline = true;
          if (name && customerMap[key].name === 'Online Customer') customerMap[key].name = name;
          if (city && customerMap[key].city === 'N/A') customerMap[key].city = city;
        }

        customerMap[key].totalOrders += 1;
        customerMap[key].totalSpent += totalAmount;
        customerMap[key].bills.push(billObj);

        const billTime = rawDate ? new Date(rawDate).getTime() : 0;
        if (billTime >= customerMap[key].lastPurchaseTimestamp) {
          customerMap[key].lastPurchaseTimestamp = billTime;
          customerMap[key].lastPurchase = formatDate(rawDate);
        }
      });

      // Process Offline Orders
      offlineOrders.forEach((order) => {
        const phone = String(
          order.customer_mobile ||
            order.customer?.mobile ||
            order.mobile ||
            order.phone ||
            ''
        ).trim();

        const key = phone || `OFFLINE_${order.id || order.order_no || Math.random()}`;
        const name = order.customer_name || order.customer?.name || order.name || 'Counter Customer';
        const city = order.city || order.customer?.city || 'In-Store / Counter';
        const email = order.email || order.customer?.email || '';
        const totalAmount = Number(order.payable_amount ?? order.grandTotal ?? order.total ?? 0);
        const rawDate = order.created_at || order.date || order.order_date || '';
        const items = extractItems(order.items || order.order_items || order.details);

        const billObj = {
          billId: order.order_no || `RS-${order.id}`,
          date: formatDate(rawDate),
          rawDate: rawDate ? new Date(rawDate).getTime() : 0,
          type: 'Offline',
          itemsCount: items.length,
          paymentMode: order.payment_method || order.paymentMode || 'Cash / Counter',
          status: order.payment_status || 'Paid',
          total: totalAmount,
          items
        };

        if (!customerMap[key]) {
          customerMap[key] = {
            id: `CUST-${custCounter++}`,
            name,
            phone: phone || 'N/A',
            email,
            city: city || 'N/A',
            hasOnline: false,
            hasOffline: true,
            totalOrders: 0,
            totalSpent: 0,
            lastPurchaseTimestamp: 0,
            lastPurchase: '',
            bills: []
          };
        } else {
          customerMap[key].hasOffline = true;
          if (name && (customerMap[key].name === 'Counter Customer' || customerMap[key].name === 'Online Customer')) {
            customerMap[key].name = name;
          }
          if (city && customerMap[key].city === 'N/A') customerMap[key].city = city;
        }

        customerMap[key].totalOrders += 1;
        customerMap[key].totalSpent += totalAmount;
        customerMap[key].bills.push(billObj);

        const billTime = rawDate ? new Date(rawDate).getTime() : 0;
        if (billTime >= customerMap[key].lastPurchaseTimestamp) {
          customerMap[key].lastPurchaseTimestamp = billTime;
          customerMap[key].lastPurchase = formatDate(rawDate);
        }
      });

      // Convert customer map into array
      const aggregated = Object.values(customerMap).map((cust) => {
        let type = 'Offline';
        if (cust.hasOnline && cust.hasOffline) {
          type = 'Both';
        } else if (cust.hasOnline) {
          type = 'Online';
        }

        // Sort bills by date descending
        cust.bills.sort((a, b) => b.rawDate - a.rawDate);

        return {
          ...cust,
          type
        };
      });

      setCustomers(aggregated);
    } catch (err) {
      console.error('Failed to load customer order APIs:', err);
      setErrorMsg(err.message || t('cust.fetchError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  // Search & Type Filtered Customers
  const filteredCustomers = customers.filter((cust) => {
    const matchesSearch =
      cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.phone.includes(searchTerm) ||
      cust.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || cust.type === filterType;
    return matchesSearch && matchesType;
  });

  // Total Customer Stats
  const totalCustomersCount = customers.length;
  const onlineCustomersCount = customers.filter((c) => c.type === 'Online' || c.type === 'Both').length;
  const offlineCustomersCount = customers.filter((c) => c.type === 'Offline' || c.type === 'Both').length;
  const totalCustomerRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  // Open Bills History Modal for Customer
  const handleOpenBillsModal = (customer) => {
    setSelectedCustomer(customer);
    setIsHistoryModalOpen(true);
  };

  const filterTypeOptions = [
    { label: 'All Types', value: 'All' },
    { label: 'Online Customers', value: 'Online' },
    { label: 'Offline Customers', value: 'Offline' },
    { label: 'Online & Offline', value: 'Both' }
  ];

  return (
    <div className="dashboard-container">
      {/* Header Title */}
      <div className="page-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users color="#5B5FC7" size={24} />
            <span>{t('cust.title')}</span>
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '2px', fontWeight: 600 }}>
            {t('cust.subtitle')}
          </p>
        </div>

        <button
          className="btn-secondary"
          onClick={fetchCustomerData}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem' }}
        >
          <RefreshCcw size={15} className={loading ? 'spin' : ''} />
          <span>{t('cust.refreshData')}</span>
        </button>
      </div>

      {/* Error Alert Banner */}
      {false && errorMsg && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#991B1B',
            fontSize: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#DC2626" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={fetchCustomerData}
            style={{
              background: '#DC2626',
              color: '#FFF',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {t('cust.retry')}
          </button>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-customers" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <Users size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('cust.totalCustomers')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {loading ? <Loader2 size={18} className="spin" /> : `${totalCustomersCount} ${t('cust.customers')}`}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-webcontrol" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <Globe size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('cust.onlineCustomers')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#5B5FC7', marginTop: '2px' }}>
              {loading ? <Loader2 size={18} className="spin" /> : `${onlineCustomersCount} ${t('cust.customers')}`}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-orders" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <Store size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('cust.offlineCustomers')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
              {loading ? <Loader2 size={18} className="spin" /> : `${offlineCustomersCount} ${t('cust.customers')}`}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-categories" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <IndianRupee size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('cust.totalSpend')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>
              {loading ? <Loader2 size={18} className="spin" /> : `₹${totalCustomerRevenue.toLocaleString('en-IN')}`}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="admin-card" style={{ marginBottom: 0, padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-input-wrapper" style={{ flex: 1, minWidth: '240px' }}>
            <Search size={16} color="#64748B" />
            <input
              type="text"
              className="search-input-field"
              placeholder={t('cust.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>{t('cust.customerType')}</span>
            <CustomSelect
              options={filterTypeOptions}
              value={filterType}
              onChange={(val) => setFilterType(val)}
            />
          </div>
        </div>
      </div>

      {/* Customers Data Table */}
      <div className="admin-card">
        <div className="admin-table-container">
          <table className="admin-table" style={{ textAlign: 'center' }}>
            <thead>
              <tr style={{ textAlign: 'center' }}>
                <th>{t('cust.thCustomerId')}</th>
                <th>{t('cust.thCustomerName')}</th>
                <th>{t('cust.thMobile')}</th>
                <th>{t('cust.thCity')}</th>
                <th>{t('cust.thCustomerType')}</th>
                <th>{t('cust.thTotalOrders')}</th>
                <th>{t('cust.thTotalSpent')}</th>
                <th>{t('cust.thLastPurchase')}</th>
                <th>{t('cust.thAction')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                      <Loader2 size={20} className="spin" color="#5B5FC7" />
                      <span style={{ fontWeight: 600 }}>{t('cust.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                    {t('cust.noCustomers')}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id}>
                    <td>
                      <span style={{ fontWeight: 800, color: '#64748B' }}>{cust.id}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#0F172A' }}>{cust.name}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#334155' }}>{cust.phone}</td>
                    <td>{cust.city}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background:
                            cust.type === 'Online'
                              ? '#EEF2FF'
                              : cust.type === 'Offline'
                              ? '#ECFDF5'
                              : '#F3E8FF',
                          color:
                            cust.type === 'Online'
                              ? '#5B5FC7'
                              : cust.type === 'Offline'
                              ? '#047857'
                              : '#7C3AED',
                          border: '1px solid transparent'
                        }}
                      >
                        {cust.type === 'Both' ? 'Online & Offline' : `${cust.type} Customer`}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800 }}>{cust.totalOrders} {t('cust.orders')}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#10B981', fontSize: '0.92rem' }}>
                        ₹{cust.totalSpent.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#64748B' }}>{cust.lastPurchase || 'N/A'}</td>
                    <td>
                      <button
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        onClick={() => handleOpenBillsModal(cust)}
                      >
                        <Receipt size={14} />
                        <span>{t('cust.viewBills')} ({cust.bills.length})</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOMER PURCHASE BILLS HISTORY MODAL */}
      {isHistoryModalOpen && selectedCustomer && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div
            className="modal-content"
            style={{ maxWidth: '640px', width: '95%', padding: '20px', borderRadius: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={20} color="#5B5FC7" />
                  <span>{t('cust.billsHistory')} - {selectedCustomer.name}</span>
                </h2>
                <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
                  {t('cust.mobile')}: {selectedCustomer.phone} | {t('cust.city')}: {selectedCustomer.city} | {t('cust.type')}: {selectedCustomer.type}
                </p>
              </div>
              <button className="modal-close" onClick={() => setIsHistoryModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '65vh', overflowY: 'auto' }}>
              {selectedCustomer.bills.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                  {t('cust.noBills')}
                </div>
              ) : (
                selectedCustomer.bills.map((bill) => (
                  <div
                    key={bill.billId}
                    style={{
                      background: '#F8FAFC',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    {/* Bill Header Card */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: bill.type === 'Online' ? '#EEF2FF' : '#ECFDF5',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: `1px solid ${bill.type === 'Online' ? '#C7D2FE' : '#A7F3D0'}`
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: bill.type === 'Online' ? '#5B5FC7' : '#047857', fontSize: '0.9rem' }}>
                          {bill.billId}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{bill.date}</div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '1.05rem' }}>
                          ₹{bill.total.toFixed(2)}
                        </div>
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.68rem',
                            padding: '2px 8px',
                            background: bill.type === 'Online' ? '#5B5FC7' : '#10B981',
                            color: '#FFFFFF'
                          }}
                        >
                          {bill.type} {t('cust.bill')}
                        </span>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569' }}>
                      <span>{t('cust.paymentMethod')}: <strong>{bill.paymentMode}</strong></span>
                      <span>{t('cust.status')}: <strong style={{ color: String(bill.status).toLowerCase() === 'paid' || String(bill.status).toLowerCase() === 'completed' ? '#10B981' : '#D97706' }}>{bill.status}</strong></span>
                    </div>

                    {/* Items List */}
                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                        {t('cust.purchasedItems')} ({bill.items.length}):
                      </div>
                      {bill.items.length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: '#94A3B8', italic: 'true' }}>{t('cust.noItemDetails')}</div>
                      ) : (
                        bill.items.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '3px' }}>
                            <span>{idx + 1}. {item.name} x{item.qty}</span>
                            <span style={{ fontWeight: 700 }}>₹{item.total.toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Total Breakdown */}
                    <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.85rem', color: '#0F172A' }}>
                      <span>{t('cust.grandTotal')}</span>
                      <span style={{ color: '#5B5FC7' }}>₹{bill.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
