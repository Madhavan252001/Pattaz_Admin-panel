import React, { useState, useMemo, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  ShoppingBag,
  Clock,
  PackageCheck,
  CheckCircle2,
  Trash2,
  BarChart3,
  IndianRupee,
  Users,
  TrendingUp,
  Award,
  ArrowUpRight,
  Plus,
  Ticket,
  Filter,
  Loader2,
  AlertCircle,
  RefreshCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, onlineOrderAPI, offlineOrderAPI, productAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';

const PAYMENT_COLORS = ['#5B5FC7', '#38BDF8', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export default function Dashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsgValue] = useState('');
  const setErrorMsg = (message) => { setErrorMsgValue(message); if (message) toast.error(message); };
  const [dashboardData, setDashboardData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);

  // Set default initial chartFilter to 'monthly' (Month wise)
  const [chartFilter, setChartFilter] = useState('monthly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [dashRes, onlineRes, offlineRes, prodRes] = await Promise.allSettled([
        dashboardAPI.getDashboard(),
        onlineOrderAPI.getOnlineOrders(),
        offlineOrderAPI.getOfflineOrders(),
        productAPI.getProducts()
      ]);

      let dashPayload = null;
      if (dashRes.status === 'fulfilled' && dashRes.value) {
        dashPayload = dashRes.value.data || dashRes.value;
        setDashboardData(dashPayload);
      }

      let onlineList = [];
      if (onlineRes.status === 'fulfilled' && onlineRes.value) {
        const val = onlineRes.value;
        onlineList = Array.isArray(val) ? val : Array.isArray(val.data) ? val.data : (val.data?.data || []);
      }

      let offlineList = [];
      if (offlineRes.status === 'fulfilled' && offlineRes.value) {
        const val = offlineRes.value;
        offlineList = Array.isArray(val) ? val : Array.isArray(val.data) ? val.data : (val.data?.data || []);
      }

      let prodList = [];
      if (prodRes.status === 'fulfilled' && prodRes.value) {
        const val = prodRes.value;
        prodList = Array.isArray(val) ? val : Array.isArray(val.data) ? val.data : (val.data?.data || []);
      }
      setProducts(prodList);

      // Normalize all orders into a single list
      const combinedOrders = [];

      onlineList.forEach((o) => {
        const amt = Number(o.payable_amount ?? o.grandTotal ?? o.total ?? o.subtotal ?? 0);
        combinedOrders.push({
          orderNumber: o.order_no || o.orderNumber || `ORD-ONLINE-${o.id}`,
          date: o.created_at?.split('T')[0] || o.date || o.order_date || '',
          status: (o.order_status || o.status || 'completed').toLowerCase(),
          payment_status: (o.payment_status || 'paid').toLowerCase(),
          paymentMethod: o.payment_method || o.paymentMethod || 'Razorpay / Online',
          grandTotal: amt,
          customer: {
            name: o.customer?.name || o.customer_name || o.name || 'Online Customer',
            mobile: o.customer?.mobile || o.customer_mobile || o.mobile || o.phone || 'N/A'
          },
          items: o.items || o.order_items || o.details || []
        });
      });

      offlineList.forEach((o) => {
        const amt = Number(o.payable_amount ?? o.grandTotal ?? o.total ?? 0);
        combinedOrders.push({
          orderNumber: o.order_no || `RS-${o.id}`,
          date: o.created_at?.split('T')[0] || o.date || o.order_date || '',
          status: (o.order_status || o.payment_status || 'completed').toLowerCase(),
          payment_status: (o.payment_status || 'paid').toLowerCase(),
          paymentMethod: o.payment_method || o.paymentMode || 'Cash / POS',
          grandTotal: amt,
          customer: {
            name: o.customer_name || o.customer?.name || o.name || 'Counter Customer',
            mobile: o.customer_mobile || o.customer?.mobile || o.mobile || o.phone || 'N/A'
          },
          items: o.items || o.order_items || o.details || []
        });
      });

      setOrders(combinedOrders);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
      setErrorMsg(err.message || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Aggregate Status Counts & KPI numbers
  const stats = useMemo(() => {
    if (dashboardData && (dashboardData.totalOrders || dashboardData.total_orders)) {
      return {
        total: dashboardData.totalOrders ?? dashboardData.total_orders ?? orders.length,
        unpaid: dashboardData.unpaidOrders ?? dashboardData.unpaid_count ?? orders.filter((o) => o.status === 'unpaid' || o.payment_status === 'pending').length,
        inprogress: dashboardData.inprogressOrders ?? dashboardData.inprogress_count ?? orders.filter((o) => o.status === 'inprogress' || o.status === 'processing').length,
        packed: dashboardData.packedOrders ?? dashboardData.packed_count ?? orders.filter((o) => o.status === 'packed' || o.status === 'shipped').length,
        completed: dashboardData.completedOrders ?? dashboardData.completed_count ?? orders.filter((o) => o.status === 'completed' || o.status === 'delivered' || o.status === 'paid').length,
        deleted: dashboardData.deletedOrders ?? dashboardData.deleted_count ?? orders.filter((o) => o.status === 'deleted' || o.status === 'cancelled').length,
        totalRevenue: dashboardData.totalRevenue ?? dashboardData.total_revenue ?? orders.reduce((sum, o) => (o.status !== 'deleted' && o.status !== 'cancelled' ? sum + o.grandTotal : sum), 0),
        totalCustomers: dashboardData.totalCustomers ?? dashboardData.total_customers ?? new Set(orders.map((o) => o.customer?.mobile).filter(Boolean)).size
      };
    }

    let unpaid = 0;
    let inprogress = 0;
    let packed = 0;
    let completed = 0;
    let deleted = 0;
    let totalRevenue = 0;
    const customerMobiles = new Set();

    orders.forEach((o) => {
      const st = (o.status || '').toLowerCase();
      if (st !== 'deleted' && st !== 'cancelled') {
        totalRevenue += (o.grandTotal || 0);
      }
      if (o.customer?.mobile && o.customer.mobile !== 'N/A') customerMobiles.add(o.customer.mobile);

      if (st === 'unpaid' || o.payment_status === 'pending') unpaid++;
      else if (st === 'inprogress' || st === 'in progress' || st === 'processing') inprogress++;
      else if (st === 'packed' || st === 'shipped') packed++;
      else if (st === 'deleted' || st === 'cancelled') deleted++;
      else completed++;
    });

    return {
      total: orders.length,
      unpaid,
      inprogress,
      packed,
      completed,
      deleted,
      totalRevenue,
      totalCustomers: customerMobiles.size
    };
  }, [orders, dashboardData]);

  // Aggregate orders for chart
  const chartData = useMemo(() => {
    const filteredOrders = orders.filter((o) => {
      if (!o.date) return false;
      if (dateFrom) {
        if (new Date(o.date) < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const td = new Date(dateTo);
        td.setHours(23, 59, 59, 999);
        if (new Date(o.date) > td) return false;
      }
      return true;
    });

    const map = {};

    filteredOrders.forEach((o) => {
      const d = new Date(o.date);
      const amount = o.grandTotal || 0;
      let key = o.date;

      if (chartFilter === 'monthly') {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        key = isNaN(d.getTime()) ? o.date : `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      } else if (chartFilter === 'yearly') {
        key = isNaN(d.getTime()) ? o.date : `${d.getFullYear()}`;
      }

      map[key] = (map[key] || 0) + amount;
    });

    if (chartFilter === 'daily') {
      const sortedKeys = Object.keys(map).sort();
      return sortedKeys.map((key) => ({ label: key, totalPrice: map[key] }));
    } else if (chartFilter === 'monthly') {
      const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const sortedKeys = Object.keys(map).sort((a, b) => {
        const [mA, yA] = a.split(' ');
        const [mB, yB] = b.split(' ');
        if (yA !== yB) return Number(yA) - Number(yB);
        return monthsOrder.indexOf(mA) - monthsOrder.indexOf(mB);
      });
      return sortedKeys.map((key) => ({ label: key, totalPrice: map[key] }));
    } else {
      const sortedKeys = Object.keys(map).sort();
      return sortedKeys.map((key) => ({ label: key, totalPrice: map[key] }));
    }
  }, [orders, chartFilter, dateFrom, dateTo]);

  // Payment Mode Distribution
  const paymentData = useMemo(() => {
    const counts = {};
    orders.forEach((o) => {
      const mode = o.paymentMethod || 'UPI / Cash';
      counts[mode] = (counts[mode] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // Top Selling Fireworks Items
  const topProducts = useMemo(() => {
    const itemMap = {};
    orders.forEach((o) => {
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          const name = it.name || it.product_name || 'Fireworks Item';
          const qty = Number(it.quantity || it.qty || 1);
          const price = Number(it.price || it.unit_price || 0);
          const total = Number(it.total || qty * price);

          if (!itemMap[name]) {
            itemMap[name] = { name, category: it.category || 'Crackers', price, sales: 0, total: 0 };
          }
          itemMap[name].sales += qty;
          itemMap[name].total += total;
        });
      }
    });

    return Object.values(itemMap).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [orders]);


  // Recent 5 Orders
  const recentOrders = useMemo(() => {
    return [...orders].slice(0, 5);
  }, [orders]);

  return (
    <div className="dashboard-container">
      {/* Header & Quick Action Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--primary-violet)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            boxShadow: '0 4px 12px rgba(91, 95, 199, 0.3)'
          }}>
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="dashboard-header-title">{t('dash.title')}</h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {t('dash.live_performance')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn-secondary"
            onClick={fetchDashboardData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem' }}
          >
            <RefreshCcw size={15} className={loading ? 'spin' : ''} />
            <span>{t('dash.refresh_data')}</span>
          </button>
          <button className="btn-secondary" onClick={() => navigate('/categories')}>
            <Plus size={16} /> {t('dash.add_product')}
          </button>
          <button className="btn-primary" onClick={() => navigate('/coupon')}>
            <Ticket size={16} /> {t('dash.create_coupon')}
          </button>
        </div>
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
            onClick={fetchDashboardData}
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
            {t('dash.retry')}
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Total Revenue */}
        <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>{t('dash.total_revenue')}</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
            {loading ? <Loader2 size={20} className="spin" /> : `₹${stats.totalRevenue.toLocaleString('en-IN')}`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700, color: '#16A34A', marginTop: '4px' }}>
            <TrendingUp size={14} /> +18.4% {t('dash.growth')}
          </div>
        </div>

        {/* Total Orders */}
        <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>{t('dash.total_orders')}</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
            {loading ? <Loader2 size={20} className="spin" /> : stats.total}
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '4px' }}>
            {stats.completed} {t('dash.completed')} ({stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%)
          </div>
        </div>

        {/* Customers Count */}
        <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>{t('dash.unique_buyers')}</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#F3E8FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
            {loading ? <Loader2 size={20} className="spin" /> : stats.totalCustomers}
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#9333EA', marginTop: '4px' }}>
            {t('dash.online_offline_customers')}
          </div>
        </div>

        {/* Catalog Count */}
        <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>{t('dash.active_products')}</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
            {loading ? <Loader2 size={20} className="spin" /> : products.length}
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16A34A', marginTop: '4px' }}>
            {t('dash.in_stock_items')}
          </div>
        </div>
      </div>

      {/* Main Bar Chart + Side Breakdown with Date/Month/Year Filters */}
      <div className="dashboard-main-grid">
        {/* Left Side: Recharts Bar Chart with Filters */}
        <div className="chart-card-box">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
              {t('dash.your_orders_chart')}
            </h3>

            {/* Filter Tabs: Date wise / Month wise / Year wise */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { key: 'monthly', label: t('dash.month_wise') },
                { key: 'daily', label: t('dash.date_wise') },
                { key: 'yearly', label: t('dash.year_wise') },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setChartFilter(tab.key)}
                  className={chartFilter === tab.key ? 'btn-primary' : 'btn-secondary'}
                  style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Date Range Inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', fontSize: '0.8rem' }}>
            <Filter size={14} color="#64748B" />
            <span style={{ fontWeight: 700, color: '#64748B' }}>{t('dash.date_range')}:</span>
            <input
              type="date"
              style={{ border: '1px solid #CBD5E1', borderRadius: '6px', padding: '4px 8px', fontSize: '0.78rem', outline: 'none' }}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span style={{ color: '#94A3B8' }}>{t('dash.date_to')}</span>
            <input
              type="date"
              style={{ border: '1px solid #CBD5E1', borderRadius: '6px', padding: '4px 8px', fontSize: '0.78rem', outline: 'none' }}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            {(dateFrom || dateTo) && (
              <button
                style={{ border: 'none', background: '#F1F5F9', color: '#EF4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                onClick={() => { setDateFrom(''); setDateTo(''); }}
              >
                {t('dash.clear_range')}
              </button>
            )}
          </div>

          <ResponsiveContainer width="100%" height={340}>
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 15, left: 10, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="label"
                angle={chartFilter === 'daily' ? -45 : 0}
                textAnchor={chartFilter === 'daily' ? 'end' : 'middle'}
                interval="preserveStartEnd"
                tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
              />
              <YAxis
                label={{
                  value: `${t('dash.total_price')} (₹)`,
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 11,
                  fill: '#64748B',
                  fontWeight: 700
                }}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
              />
              <Tooltip
                contentStyle={{
                  background: '#FFFFFF',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  border: '1px solid #E2E8F0',
                  fontWeight: 700,
                  color: '#0F172A',
                  fontSize: '0.85rem'
                }}
                formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, t('dash.total_price')]}
                labelFormatter={(label) => `${chartFilter === 'daily' ? t('dash.date') : chartFilter === 'monthly' ? t('dash.month') : t('dash.year')}: ${label}`}
              />
              <Bar
                dataKey="totalPrice"
                name={t('dash.total_price_orders')}
                fill="#38BDF8"
                radius={[4, 4, 0, 0]}
                maxBarSize={chartFilter === 'yearly' ? 45 : chartFilter === 'monthly' ? 24 : 12}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right Side: Order Status Breakdown */}
        <div className="orders-stats-panel">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
            {t('dash.order_status_breakdown')}
          </h3>

          {/* Total Orders */}
          <div className="status-item-card">
            <div className="status-item-left">
              <div className="status-icon-badge" style={{ background: '#EEF2FF', color: '#5B5FC7' }}>
                <ShoppingBag size={16} />
              </div>
              <span className="status-title-text">{t('dash.total_orders')}</span>
            </div>
            <span className="status-count-badge" style={{ background: '#EEF2FF', color: '#5B5FC7' }}>
              {loading ? <Loader2 size={12} className="spin" /> : stats.total}
            </span>
          </div>

          {/* Unpaid Orders */}
          <div className="status-item-card">
            <div className="status-item-left">
              <div className="status-icon-badge" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                <Clock size={16} />
              </div>
              <span className="status-title-text">{t('dash.unpaid_orders')}</span>
            </div>
            <span className="status-count-badge" style={{ background: '#FEE2E2', color: '#DC2626' }}>
              {loading ? <Loader2 size={12} className="spin" /> : stats.unpaid}
            </span>
          </div>

          {/* Inprogress Orders */}
          <div className="status-item-card">
            <div className="status-item-left">
              <div className="status-icon-badge" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <Clock size={16} />
              </div>
              <span className="status-title-text">{t('dash.inprogress_orders')}</span>
            </div>
            <span className="status-count-badge" style={{ background: '#FEF3C7', color: '#D97706' }}>
              {loading ? <Loader2 size={12} className="spin" /> : stats.inprogress}
            </span>
          </div>

          {/* Packed Orders */}
          <div className="status-item-card">
            <div className="status-item-left">
              <div className="status-icon-badge" style={{ background: '#E0F2FE', color: '#0284C7' }}>
                <PackageCheck size={16} />
              </div>
              <span className="status-title-text">{t('dash.packed_orders')}</span>
            </div>
            <span className="status-count-badge" style={{ background: '#E0F2FE', color: '#0284C7' }}>
              {loading ? <Loader2 size={12} className="spin" /> : stats.packed}
            </span>
          </div>

          {/* Completed Orders */}
          <div className="status-item-card">
            <div className="status-item-left">
              <div className="status-icon-badge" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                <CheckCircle2 size={16} />
              </div>
              <span className="status-title-text">{t('dash.completed_orders')}</span>
            </div>
            <span className="status-count-badge" style={{ background: '#DCFCE7', color: '#16A34A' }}>
              {loading ? <Loader2 size={12} className="spin" /> : stats.completed}
            </span>
          </div>

          {/* Deleted Orders */}
          <div className="status-item-card">
            <div className="status-item-left">
              <div className="status-icon-badge" style={{ background: '#F3F4F6', color: '#4B5563' }}>
                <Trash2 size={16} />
              </div>
              <span className="status-title-text">{t('dash.deleted_orders')}</span>
            </div>
            <span className="status-count-badge" style={{ background: '#F3F4F6', color: '#4B5563' }}>
              {loading ? <Loader2 size={12} className="spin" /> : stats.deleted}
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Payment Method Donut Chart & Top Best Sellers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Payment Methods Chart */}
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
            {t('dash.payment_method_share')}
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={paymentData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                label
              >
                {paymentData.map((_, idx) => (
                  <Cell key={idx} fill={PAYMENT_COLORS[idx % PAYMENT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} ${t('dash.orders')}`, t('dash.volume')]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Selling Crackers */}
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
            {t('dash.top_selling')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topProducts.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem', fontWeight: 600 }}>
                No product sales data yet.
              </div>
            ) : topProducts.map((p, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0'
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>
                    {idx + 1}. {p.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                    {t('dash.category')}: {p.category} {p.price ? `| ₹${p.price}/${t('dash.box')}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#5B5FC7', fontSize: '0.9rem' }}>
                    ₹{p.total.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 700 }}>
                    {p.sales} {t('dash.sold')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Recent Orders Activity Table */}
      <div className="admin-card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
            {t('dash.recent_orders')}
          </h3>
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={() => navigate('/orders')}>
            {t('dash.view_all_orders')} <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('dash.th_order')}</th>
                <th>{t('dash.th_date')}</th>
                <th>{t('dash.th_customer')}</th>
                <th>{t('dash.th_mobile')}</th>
                <th>{t('dash.th_amount')}</th>
                <th>{t('dash.th_status')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>
                    <Loader2 size={18} className="spin" color="#5B5FC7" />
                  </td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                    {t('dash.no_recent_orders')}
                  </td>
                </tr>
              ) : (
                recentOrders.map((o, idx) => (
                  <tr key={o.orderNumber || idx}>
                    <td style={{ fontWeight: 700, color: '#5B5FC7' }}>{o.orderNumber}</td>
                    <td>{o.date || 'N/A'}</td>
                    <td>{o.customer?.name || 'N/A'}</td>
                    <td>{o.customer?.mobile || 'N/A'}</td>
                    <td style={{ fontWeight: 700 }}>₹{(o.grandTotal || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badge badge-${(o.status || 'completed').toLowerCase().replace(/\s+/g, '')}`}>
                        {o.status || 'Completed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
