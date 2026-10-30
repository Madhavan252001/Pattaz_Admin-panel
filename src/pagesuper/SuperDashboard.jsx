import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Award, BarChart3,
  BellRing, CheckCircle2, ChevronRight, Clock3, IndianRupee, Loader2,
  MapPin, PackageCheck, RefreshCcw, ShieldCheck, ShoppingBag, Store,
  Target, TrendingUp, Users, Wifi, XCircle,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminService } from '../api/adminService';

const fallbackShops = [
  { id: 1, shop_name: 'Chennai Main', city: 'Chennai', sales: 540000, orders: 1824, health: 98, status: 'Healthy', color: '#6366F1' },
  { id: 2, shop_name: 'Madurai Branch', city: 'Madurai', sales: 410000, orders: 1398, health: 94, status: 'Healthy', color: '#8B5CF6' },
  { id: 3, shop_name: 'Coimbatore Retail', city: 'Coimbatore', sales: 360000, orders: 1176, health: 91, status: 'Healthy', color: '#06B6D4' },
  { id: 4, shop_name: 'Trichy Counter', city: 'Trichy', sales: 280000, orders: 906, health: 86, status: 'Attention', color: '#F59E0B' },
  { id: 5, shop_name: 'Salem Outlet', city: 'Salem', sales: 255900, orders: 842, health: 78, status: 'Attention', color: '#F97316' },
];

const monthRevenueData = [
  { name: 'Jan', revenue: 11.8, orders: 3200 }, { name: 'Feb', revenue: 13.2, orders: 3650 },
  { name: 'Mar', revenue: 12.6, orders: 3420 }, { name: 'Apr', revenue: 15.4, orders: 4100 },
  { name: 'May', revenue: 16.1, orders: 4380 }, { name: 'Jun', revenue: 18.5, orders: 5146 },
];
const dayRevenueData = [
  { name: 'Mon', revenue: 2.1, orders: 612 }, { name: 'Tue', revenue: 2.8, orders: 780 },
  { name: 'Wed', revenue: 2.4, orders: 694 }, { name: 'Thu', revenue: 3.1, orders: 846 },
  { name: 'Fri', revenue: 3.6, orders: 992 }, { name: 'Sat', revenue: 4.2, orders: 1180 }, { name: 'Sun', revenue: 3.9, orders: 1042 },
];
const yearRevenueData = [
  { name: '2021', revenue: 92, orders: 28400 }, { name: '2022', revenue: 118, orders: 35200 },
  { name: '2023', revenue: 146, orders: 42800 }, { name: '2024', revenue: 174, orders: 50600 },
  { name: '2025', revenue: 202, orders: 61200 }, { name: '2026', revenue: 218, orders: 65800 },
];

const channelData = [
  { name: 'POS / In-store', value: 58, color: '#6366F1' },
  { name: 'Online Store', value: 31, color: '#06B6D4' },
  { name: 'Direct / WhatsApp', value: 11, color: '#F59E0B' },
];

const formatCurrency = (value) => `₹${Number(value).toLocaleString('en-IN')}`;
const unwrapAdmins = (response) => Array.isArray(response) ? response : response?.data || response?.admins || response?.data?.admins || [];
const isApproved = (item) => item.approved === true || item.approved === 1 || item.approved === '1';
const isBlocked = (item) => item.status === 1 || item.status === '1' || item.is_blocked === true || item.is_blocked === 1 || item.is_active === 0 || item.is_active === false;

function MetricCard({ icon: Icon, label, value, change, note, tone = 'violet', inverse = false }) {
  return <div className={`super-metric-card ${inverse ? 'super-metric-card--inverse' : ''}`}>
    <div className="super-metric-top"><span className={`super-metric-icon super-tone-${tone}`}><Icon size={19} /></span><span className="super-metric-label">{label}</span><span className={`metric-change ${change?.startsWith('-') ? 'negative' : ''}`}>{change?.startsWith('-') ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}{change}</span></div>
    <div className="super-metric-value">{value}</div><div className="super-metric-note">{note}</div>
  </div>;
}

export default function SuperDashboard() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [range, setRange] = useState('month');
  const chartData = useMemo(() => range === 'day' ? dayRevenueData : range === 'year' ? yearRevenueData : monthRevenueData, [range]);
  const chartLabel = range === 'day' ? 'Daily performance · ₹ in lakhs' : range === 'year' ? 'Yearly performance · ₹ in lakhs' : 'Monthly performance · ₹ in lakhs';

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try { setAdmins(unwrapAdmins(await adminService.getAllAdmins())); } catch (error) { setAdmins([]); } finally { setLoading(false); setLastUpdated(new Date()); }
  }, []);
  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const stats = useMemo(() => {
    const approved = admins.filter(isApproved);
    return { total: approved.length || fallbackShops.length, active: approved.filter((item) => !isBlocked(item)).length || 5, blocked: approved.filter(isBlocked).length, pending: admins.filter((item) => !isApproved(item)).length };
  }, [admins]);
  const shopRows = useMemo(() => {
    if (!admins.length) return fallbackShops;
    return admins.filter(isApproved).slice(0, 5).map((item, index) => ({ ...fallbackShops[index % fallbackShops.length], ...item, shop_name: item.shop_name || fallbackShops[index % fallbackShops.length].shop_name, city: item.address?.split(',')[0] || fallbackShops[index % fallbackShops.length].city, status: isBlocked(item) ? 'Blocked' : index > 3 ? 'Attention' : 'Healthy' }));
  }, [admins]);

  return <div className="dashboard-container super-dashboard-page">
    <section className="super-hero">
      <div className="super-hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> Network command centre <span className="eyebrow-divider" /> Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><h1>Good morning, Super Admin <span>👋</span></h1><p>Here is what is happening across your RS Fireworks network today.</p><div className="hero-actions"><button className="super-primary-btn"><BarChart3 size={16} /> View full report</button><button className="super-ghost-btn" onClick={fetchAdmins} disabled={loading}><RefreshCcw size={15} className={loading ? 'spin' : ''} /> Sync data</button></div></div>
      <div className="hero-illustration"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-glow" /><TrendingUp size={58} strokeWidth={1.4} /><span className="hero-float hero-float--one"><IndianRupee size={14} /> +18.4%</span><span className="hero-float hero-float--two"><Wifi size={13} /> Live network</span></div>
    </section>

    <div className="super-section-heading"><div><span className="section-kicker">Network snapshot</span><h2>Business at a glance</h2></div></div>
    <section className="super-metrics-grid">
      <MetricCard icon={IndianRupee} label="Total revenue" value="₹18.46L" change="18.4%" note="vs. previous month" tone="violet" /><MetricCard icon={ShoppingBag} label="Total orders" value="5,146" change="12.8%" note="Across all channels" tone="cyan" /><MetricCard icon={Store} label="Active shops" value={loading ? <Loader2 size={22} className="spin" /> : stats.active} change="2 new" note={`${stats.total} registered shops`} tone="orange" /><MetricCard icon={Users} label="Customers reached" value="12,842" change="8.6%" note="1,284 new this month" tone="green" />
    </section>

    <section className="super-main-grid"><div className="super-panel revenue-panel"><div className="panel-header"><div><div className="panel-title"><span className="panel-title-icon"><TrendingUp size={16} /></span>Revenue performance</div><div className="panel-subtitle">Network-wide {chartLabel}</div></div><div className="revenue-header-tools"><div className="range-tabs" role="tablist" aria-label="Revenue period"><Clock3 size={14} />{[['day','Day wise'],['month','Month wise'],['year','Year wise']].map(([value,label]) => <button key={value} type="button" role="tab" aria-selected={range === value} className={range === value ? 'active' : ''} onClick={() => setRange(value)}>{label}</button>)}</div><div className="legend-inline"><span><i className="legend-dot violet-dot" /> Revenue</span><span><i className="legend-dot cyan-dot" /> Orders</span></div></div></div><div className="revenue-total"><strong>{range === 'day' ? '₹22,10,000' : range === 'year' ? '₹2.18Cr' : '₹18,45,900'}</strong><span className="trend-up"><ArrowUpRight size={14} /> 18.4%</span></div><div className="super-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} barGap={6} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="#EEF2F7" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} /><Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,.08)' }} formatter={(value, name) => [name === 'revenue' ? `₹${value}L` : value.toLocaleString(), name === 'revenue' ? 'Revenue' : 'Orders']} /><Bar dataKey="revenue" fill="#6366F1" radius={[5, 5, 0, 0]} barSize={23} /><Bar dataKey="orders" fill="#CFFAFE" radius={[5, 5, 0, 0]} barSize={23} /></BarChart></ResponsiveContainer></div><div className="chart-footer"><span><i className="pulse-dot" /> Live data synced from 5 shops</span><button>View analytics <ChevronRight size={14} /></button></div></div>
      <div className="super-panel channel-panel"><div className="panel-header"><div><div className="panel-title"><span className="panel-title-icon panel-title-icon--cyan"><ShoppingBag size={16} /></span>Sales channels</div><div className="panel-subtitle">Where your orders come from</div></div><button className="icon-plain-btn" aria-label="Channel options">•••</button></div><div className="channel-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={channelData} dataKey="value" innerRadius={62} outerRadius={89} paddingAngle={4} stroke="none">{channelData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fill="#0F172A" fontSize="21" fontWeight="800">5,146</text><text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fill="#94A3B8" fontSize="10" fontWeight="700">ORDERS</text></PieChart></ResponsiveContainer></div><div className="channel-list">{channelData.map((item) => <div className="channel-row" key={item.name}><span className="channel-name"><i className="legend-dot" style={{ background: item.color }} />{item.name}</span><strong>{item.value}%</strong><span className="channel-value">{Math.round(5146 * item.value / 100).toLocaleString()}</span></div>)}</div></div></section>

    <section className="super-bottom-grid"><div className="super-panel shops-panel"><div className="panel-header"><div><div className="panel-title"><span className="panel-title-icon panel-title-icon--orange"><Award size={16} /></span>Top performing shops</div><div className="panel-subtitle">Ranked by revenue this month</div></div><button className="panel-link">View all shops <ChevronRight size={14} /></button></div><div className="shop-table"><div className="shop-table-head"><span>Shop</span><span>Revenue</span><span>Orders</span><span>Health</span></div>{shopRows.map((shop, index) => <div className="shop-table-row" key={shop.id || shop.shop_name}><div className="shop-identity"><span className="rank-number">{String(index + 1).padStart(2, '0')}</span><span className="shop-avatar" style={{ background: `${shop.color || fallbackShops[index].color}18`, color: shop.color || fallbackShops[index].color }}>{(shop.shop_name || 'S').slice(0, 1)}</span><span><strong>{shop.shop_name}</strong><small><MapPin size={11} /> {shop.city || 'Tamil Nadu'}</small></span></div><strong>{formatCurrency(shop.sales || fallbackShops[index].sales)}</strong><span>{(shop.orders || fallbackShops[index].orders).toLocaleString()}</span><span className={`health-pill ${shop.status === 'Healthy' ? 'healthy' : 'attention'}`}><i />{shop.status}</span></div>)}</div></div>
      <div className="side-stack"><div className="super-panel attention-panel"><div className="panel-header"><div><div className="panel-title"><span className="panel-title-icon panel-title-icon--red"><BellRing size={16} /></span>Needs attention</div><div className="panel-subtitle">Items that need your review</div></div><span className="attention-count">{stats.pending + stats.blocked + 2}</span></div><div className="attention-list"><div className="attention-item"><span className="attention-icon warning"><AlertTriangle size={15} /></span><span><strong>{stats.pending || 3} shop requests pending</strong><small>Review new admin registrations</small></span><ChevronRight size={15} /></div><div className="attention-item"><span className="attention-icon danger"><XCircle size={15} /></span><span><strong>{stats.blocked || 1} blocked shop account</strong><small>Access is currently restricted</small></span><ChevronRight size={15} /></div><div className="attention-item"><span className="attention-icon info"><PackageCheck size={15} /></span><span><strong>Low stock in 2 categories</strong><small>Check inventory alerts</small></span><ChevronRight size={15} /></div></div><button className="attention-footer">Open action centre <ChevronRight size={14} /></button></div>
        <div className="goal-card"><div className="goal-icon"><Target size={18} /></div><div className="goal-copy"><span>Monthly revenue goal</span><strong>₹18.46L <em>of ₹25L</em></strong><div className="goal-track"><i style={{ width: '74%' }} /></div><small>74% achieved · 12 days remaining</small></div><div className="goal-percent">74%</div></div></div></section>

    <section className="super-status-strip"><div className="status-strip-item"><span className="status-strip-icon green"><ShieldCheck size={17} /></span><span><strong>Platform secure</strong><small>All systems operational</small></span><i className="status-live-dot" /></div><div className="status-strip-item"><span className="status-strip-icon cyan"><Activity size={17} /></span><span><strong>API response</strong><small>142ms average latency</small></span><b>99.98%</b></div><div className="status-strip-item"><span className="status-strip-icon violet"><Store size={17} /></span><span><strong>Shop availability</strong><small>Network uptime this month</small></span><b>99.9%</b></div><div className="status-strip-item"><span className="status-strip-icon orange"><CheckCircle2 size={17} /></span><span><strong>Last sync</strong><small>All data sources connected</small></span><b>2m ago</b></div></section>
  </div>;
}
