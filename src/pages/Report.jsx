import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import PageRefreshButton from '../components/PageRefreshButton';
import { offlineOrderAPI, reportsAPI } from '../api/api';
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
  Filter,
  Printer,
  Download,
  Loader2,
  AlertCircle
} from 'lucide-react';

const PIE_COLORS = ['#5B5FC7', '#38BDF8', '#10B981', '#F59E0B'];

function normalizeReportResponse(response) {
  if (Array.isArray(response)) {
    return { orders: response };
  }

  // Support direct responses and wrappers used by different backend helpers:
  // { data: {...} }, { result: {...} }, { payload: {...} }, etc.
  const queue = [response];
  const visited = new Set();
  while (queue.length) {
    const payload = queue.shift();
    if (!payload || typeof payload !== 'object' || visited.has(payload)) continue;
    visited.add(payload);

    if (Array.isArray(payload.orders) || Array.isArray(payload.reports)) {
      return payload;
    }
    if (Array.isArray(payload.detailed_financial_sales_ledger)) {
      const cards = payload.summary_cards || {};
      return {
        ...payload,
        orders: payload.detailed_financial_sales_ledger,
        total_orders: cards.filtered_orders,
        total_revenue: cards.total_sales_revenue,
        total_tax: cards.gst_taxes,
      };
    }
    if (Array.isArray(payload.data)) {
      return { ...payload, orders: payload.data };
    }

    ['data', 'result', 'payload', 'response'].forEach((key) => {
      if (payload[key] && typeof payload[key] === 'object') queue.push(payload[key]);
    });
  }

  return {};
}

function unwrapList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.orders)) return response.orders;
  if (Array.isArray(response?.data?.orders)) return response.data.orders;
  return [];
}

function isWithinDateRange(order, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  const rawDate = order.order_date || order.orderDate || order.date || order.created_at || order.updated_at;
  const timestamp = rawDate ? new Date(rawDate).getTime() : NaN;
  if (!Number.isFinite(timestamp)) return true;
  if (fromDate && timestamp < new Date(`${fromDate}T00:00:00`).getTime()) return false;
  if (toDate && timestamp > new Date(`${toDate}T23:59:59`).getTime()) return false;
  return true;
}

function normalizeReportOrder(order, source = 'Online') {
  const items = Array.isArray(order.items) ? order.items
    : Array.isArray(order.order_items) ? order.order_items
      : Array.isArray(order.details) ? order.details
        : [];
  const orderType = order.order_type || order.orderType || source;

  return {
    ...order,
    orderNumber: order.order_id || order.orderId || order.order_no || order.invoice_no || order._id || order.id,
    date: order.order_date || order.orderDate || order.date || order.created_at || order.updated_at,
    customer: {
      name: order.customer?.name || order.customer_name || order.customerName || 'N/A',
      mobile: order.customer?.mobile || order.customer_mobile || order.mobile_no || order.mobile || ''
    },
    status: order.order_status || order.orderStatus || order.status || 'completed',
    grandTotal: Number(order.total_amount ?? order.totalAmount ?? order.grand_total ?? order.payable_amount ?? 0),
    paymentMethod: order.payment_method || 'N/A',
    items,
    items_count: order.items_count ?? items.length,
    order_type: orderType,
    sourceKey: `${String(orderType).toLowerCase()}-${order.order_id || order.orderId || order.order_no || order.invoice_no || order._id || order.id}`
  };
}

function dedupeOrders(orders) {
  const seen = new Set();
  return orders.filter((order, index) => {
    const key = order.sourceKey || `${order.order_type || 'order'}-${order.orderNumber || index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function Report() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ total_orders: 0, total_revenue: 0, total_tax: 0 });
  const [reportMeta, setReportMeta] = useState({ filters: null, trend: null, paymentMethods: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const hasFilters = dateFrom || dateTo;
      const response = hasFilters
        ? await reportsAPI.getReportsWithFilter(dateFrom, dateTo)
        : await reportsAPI.getReports();
      const offlineResponse = await offlineOrderAPI.getOfflineOrders().catch(() => null);
      const payload = normalizeReportResponse(response);
      const apiOrders = Array.isArray(payload.orders)
        ? payload.orders
        : Array.isArray(payload.reports)
          ? payload.reports
          : [];
      const onlineRows = apiOrders.map((order) => normalizeReportOrder(order, order.order_type || 'Online'));
      const offlineRows = unwrapList(offlineResponse)
        .filter((order) => isWithinDateRange(order, dateFrom, dateTo))
        .map((order) => normalizeReportOrder(order, 'Offline'));
      const normalizedOrders = dedupeOrders([...onlineRows, ...offlineRows]);
      const rowsRevenue = normalizedOrders.reduce((total, order) => total + order.grandTotal, 0);
      const rowsTax = normalizedOrders.reduce((total, order) => total + Number(order.tax_amount || 0), 0);
      setOrders(normalizedOrders);
      setReportMeta({
        filters: payload.filters || null,
        trend: payload.daily_sales_revenue_trend || null,
        paymentMethods: Array.isArray(payload.sales_revenue_by_payment_method)
          ? payload.sales_revenue_by_payment_method
          : [],
      });
      setSummary({
        total_orders: normalizedOrders.length,
        total_revenue: rowsRevenue,
        total_tax: rowsTax || Number(payload.total_tax ?? 0),
      });
    } catch (err) {
      setOrders([]);
      setReportMeta({ filters: null, trend: null, paymentMethods: [] });
      setSummary({ total_orders: 0, total_revenue: 0, total_tax: 0 });
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const filteredOrders = orders;

  // Financial Metrics Computation
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalTax = 0;
    let completedCount = 0;

    filteredOrders.forEach((o) => {
      if ((o.status || '').toLowerCase() !== 'deleted') {
        const grand = o.grandTotal || o.subTotal || 0;
        totalRevenue += grand;
        totalTax += grand * 0.18; // 18% GST estimate
        completedCount++;
      }
    });

    const avgOrderValue = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;

    return {
      totalRevenue: summary.total_revenue || totalRevenue,
      totalOrders: summary.total_orders || filteredOrders.length,
      avgOrderValue,
      totalTax: summary.total_tax ?? Math.round(totalTax)
    };
  }, [filteredOrders, summary.total_revenue, summary.total_orders, summary.total_tax]);

  // Chart Data: Revenue Trend
  const chartData = useMemo(() => {
    const apiTrendItems = reportMeta.trend?.items;
    if (Array.isArray(apiTrendItems) && apiTrendItems.length) {
      return apiTrendItems.map((item) => ({
        date: item.label || item.date,
        amount: Number(item.total_amount || 0),
      }));
    }
    const map = {};
    filteredOrders.forEach((o) => {
      if (!o.date) return;
      map[o.date] = (map[o.date] || 0) + (o.grandTotal || o.subTotal || 0);
    });
    const sorted = Object.keys(map).sort();
    return sorted.map((key) => ({ date: key, amount: map[key] }));
  }, [filteredOrders, reportMeta.trend]);

  // Payment Breakdown
  const paymentShare = useMemo(() => {
    if (reportMeta.paymentMethods.length) {
      return reportMeta.paymentMethods.map((item) => ({
        name: item.payment_method || 'N/A',
        value: Number(item.total_amount || 0),
      }));
    }
    const counts = {};
    filteredOrders.forEach((o) => {
      const mode = o.paymentMethod || 'UPI / GPay';
      counts[mode] = (counts[mode] || 0) + (o.grandTotal || 0);
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredOrders, reportMeta.paymentMethods]);

  const handleExportCSV = () => {
    const headers = [t('rep.csv_order_number'), t('rep.csv_date'), t('rep.csv_customer_name'), t('rep.csv_mobile'), t('rep.csv_payment_method'), t('rep.csv_status'), t('rep.csv_grand_total')];
    const rows = filteredOrders.map(o => [
      o.orderNumber || o._id,
      o.date,
      `"${o.customer?.name || ''}"`,
      o.customer?.mobile || '',
      o.paymentMethod || 'UPI',
      o.status || 'completed',
      o.grandTotal || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-title-row">
        <h1 className="page-title">{t('rep.title')}</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <PageRefreshButton />
          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download size={16} /> {t('rep.export_csv')}
          </button>
          <button className="btn-primary">
            <Printer size={16} /> {t('rep.print_report')}
          </button>
        </div>
      </div>

      {/* Report Filter Bar */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Filter size={16} color="#64748B" />
            <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.88rem' }}>{t('rep.filter_report')}</span>

            <input
              type="date"
              className="form-input"
              style={{ padding: '6px 10px', fontSize: '0.82rem' }}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span style={{ color: '#94A3B8' }}>{t('rep.to')}</span>
            <input
              type="date"
              className="form-input"
              style={{ padding: '6px 10px', fontSize: '0.82rem' }}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />

          </div>

          {(dateFrom || dateTo) && (
            <button
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#EF4444' }}
              onClick={() => { setDateFrom(''); setDateTo(''); }}
            >
              {t('rep.reset_filters')}
            </button>
          )}
        </div>
      </div>

      {reportMeta.filters && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B' }}>Applied filters:</span>
          {Object.entries(reportMeta.filters).map(([key, value]) => (
            value !== null && value !== '' && value !== 'all' && (
              <span key={key} style={{ padding: '5px 10px', borderRadius: '999px', background: '#EEF2FF', color: '#4338CA', fontSize: '0.75rem', fontWeight: 700 }}>
                {key.replaceAll('_', ' ')}: {String(value)}
              </span>
            )
          ))}
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', marginBottom: '20px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontWeight: 700 }}>
          <AlertCircle size={17} />
          <span>{error}</span>
      </div>
      )}

      {/* Financial Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '6px' }}>
            {t('rep.total_sales_revenue')}
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
            ₹{metrics.totalRevenue.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 700 }}>
            {t('rep.gross_sales_total')}
          </span>
        </div>

        <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '6px' }}>
            {t('rep.filtered_orders')}
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#5B5FC7' }}>
            {metrics.totalOrders}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
            {t('rep.order_volume')}
          </span>
        </div>

        <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '6px' }}>
            {t('rep.avg_order_value')}
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D97706' }}>
            ₹{metrics.avgOrderValue.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 700 }}>
            {t('rep.per_order_value')}
          </span>
        </div>

        <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '6px' }}>
            {t('rep.gst_taxes')}
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284C7' }}>
            ₹{metrics.totalTax.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#0284C7', fontWeight: 700 }}>
            {t('rep.tax_ledger_collection')}
          </span>
        </div>
      </div>

      {/* Revenue Trend & Payment Share Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
            {t('rep.daily_sales_trend')}
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#64748B' }} />
              <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, t('rep.revenue')]} />
              <Bar dataKey="amount" fill="#5B5FC7" radius={[4, 4, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
            {t('rep.payment_method_revenue')}
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={paymentShare} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} label>
                {paymentShare.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Sales Ledger Table */}
      <div className="admin-card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
            {t('rep.detailed_ledger')} ({filteredOrders.length} {t('rep.records')})
          </h3>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order Date</th>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Type</th>
                <th>Payment</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th>Tax</th>
                <th>Order Status</th>
                <th>Grand Total</th>
                <th>Staff</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                      <Loader2 size={18} className="animate-spin" /> Loading reports...
                    </span>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>
                    {t('rep.no_records')}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.sourceKey || o.orderNumber || o._id}>
                    <td>{o.date || 'N/A'}</td>
                    <td style={{ fontWeight: 700, color: '#5B5FC7' }}>{o.orderNumber || o._id}</td>
                    <td>{o.customer?.name || 'N/A'}</td>
                    <td>{o.customer?.mobile || 'N/A'}</td>
                    <td>{o.order_type || 'N/A'}</td>
                    <td>{o.paymentMethod || 'N/A'} / {o.payment_status || 'N/A'}</td>
                    <td>{o.items_count ?? o.items?.length ?? 0}</td>
                    <td>₹{Number(o.subtotal ?? 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#15803D' }}>₹{Number(o.discount_amount ?? 0).toLocaleString('en-IN')}</td>
                    <td>₹{Number(o.tax_amount ?? 0).toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badge badge-${(o.status || 'completed').toLowerCase().replace(' ', '')}`}>
                        {o.status || 'Completed'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800 }}>₹{(o.grandTotal || 0).toLocaleString('en-IN')}</td>
                    <td>{o.staff_name || 'N/A'}</td>
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
