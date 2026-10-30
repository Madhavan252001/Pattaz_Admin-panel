import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import { onlineOrderAPI, offlineOrderAPI, categoryAPI, couponAPI, staffAPI, comboPackAPI, referralAPI, adminProfileAPI, footerAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';
import {
  Clock,
  ShoppingBag,
  LogOut,
  BarChart2,
  Edit3,
  AtSign,
  Ticket,
  Users,
  Layers,
  Settings,
  Receipt,
  FileText,
  FileSpreadsheet,
  Menu,
  X,
  Globe,
  Video,
  UserCircle,
  UserCheck,
  Package,
  Languages,
  RefreshCw,
  Share2,
  BadgePercent,
  Image as ImageIcon
} from 'lucide-react';

const navSections = [
  {
    title: 'Overview',
    items: [
      { to: '/dashboard', icon: BarChart2, labelKey: 'nav.dashboard', count: 'Main', iconClass: 'icon-3d-dashboard' },
    ],
  },
  {
    title: 'Orders',
    items: [
      { to: '/orders', icon: ShoppingBag, labelKey: 'nav.orders', countKey: 'orders', iconClass: 'icon-3d-orders' },
      { to: '/offline-orders', icon: FileSpreadsheet, labelKey: 'nav.offlineOrders', countKey: 'offlineOrders', iconClass: 'icon-3d-offline' },
    ],
  },
  {
    title: 'Categories and Product',
    items: [
      { to: '/categories', icon: Layers, labelKey: 'nav.categories', countKey: 'categories', iconClass: 'icon-3d-categories' },
      { to: '/combo-packs', icon: Package, labelKey: 'nav.comboPacks', countKey: 'combos', iconClass: 'icon-3d-categories' },
      { to: '/coupon', icon: Ticket, labelKey: 'nav.coupon', countKey: 'coupon', iconClass: 'icon-3d-coupon' },
      { to: '/offers', icon: BadgePercent, labelKey: 'nav.offer', count: 'New', iconClass: 'icon-3d-coupon' },
    ],
  },
  {
    title: 'People',
    items: [
      { to: '/customers', icon: Users, labelKey: 'nav.customers', countKey: 'customers', iconClass: 'icon-3d-customers' },
      { to: '/staffs', icon: UserCheck, labelKey: 'nav.staffs', countKey: 'staffs', iconClass: 'icon-3d-customers' },
      { to: '/referrals', icon: Share2, labelKey: 'nav.referrals', countKey: 'referrals', iconClass: 'icon-3d-coupon', activePaths: ['/referrals', '/referrals-summary'] },
    ],
  },
  {
    title: 'Website Setup',
    items: [
      { to: '/brand-logo', icon: ImageIcon, labelKey: 'nav.brandLogo', count: 'Logo', iconClass: 'icon-3d-design' },
      { to: '/reels', icon: Video, labelKey: 'nav.reels', count: 'Media', iconClass: 'icon-3d-reels' },
      { to: '/design', icon: Edit3, labelKey: 'nav.design', count: 'Theme', iconClass: 'icon-3d-design' },
      { to: '/footer', icon: AtSign, labelKey: 'nav.footer', count: 'Info', iconClass: 'icon-3d-footer' },
      { to: '/setting', icon: Settings, labelKey: 'nav.setting', count: 'Config', iconClass: 'icon-3d-setting' },
      { to: '/web-control', icon: Globe, labelKey: 'nav.webControl', count: 'API', iconClass: 'icon-3d-webcontrol' },
    ],
  },
  {
    title: 'Reports & Account',
    items: [
      { to: '/report', icon: FileText, labelKey: 'nav.report', count: 'Sales', iconClass: 'icon-3d-report' },
      { to: '/profile', icon: UserCircle, labelKey: 'nav.profile', count: 'Admin', iconClass: 'icon-3d-setting' },
    ],
  },
];

function isSuperAdminUser() {
  try {
    const _u = JSON.parse(localStorage.getItem('user') || 'null');
    if (!_u) return false;
    return (
      _u.role_name?.toLowerCase() === 'superadmin' ||
      _u.admin_name?.toLowerCase() === 'superadmin' ||
      _u.role?.toLowerCase() === 'superadmin' ||
      _u.email === 'superadmin@rsfireworks.com'
    );
  } catch (_e) {
    return false;
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return Array.isArray(value?.data?.data) ? value.data.data : [];
}

const SIDEBAR_BADGES_CACHE_KEY = 'pattaz_sidebar_badges';
const SIDEBAR_BADGES_CACHE_TTL = 5 * 60 * 1000;

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null') || {};
  } catch (_e) {
    return {};
  }
}

function getFullImageUrl(url) {
  if (!url) return '';
  const value = String(url);
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }
  let path = value.replace(/^\/+/, '');
  if (path.startsWith('uploads/')) {
    path = path.substring(8);
  }
  return `https://offer360.in/uploads/${path}`;
}

function getAdminDisplayProfile(profile = {}, user = {}) {
  const name =
    profile.shop_name ||
    profile.admin_name ||
    user.shop_name ||
    user.admin_name ||
    user.name ||
    user.username ||
    user.email ||
    'Admin';
  const contact = profile.email || user.email || profile.mobile_no || user.mobile_no || '';
  const role = user.role_name || user.role || 'Admin';
  const image = getFullImageUrl(profile.footerLogo || profile.images || user.images || user.image || '');
  const initials = String(name).trim().slice(0, 2).toUpperCase() || 'AD';

  return { name, contact, role, image, initials };
}

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang, toggleLang } = useLanguage();

  // All hooks must be declared BEFORE any conditional returns (Rules of Hooks)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth <= 1024);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [pageRefreshKey, setPageRefreshKey] = useState(0);
  const [adminProfile, setAdminProfile] = useState(() => getAdminDisplayProfile({}, getStoredUser()));
  const [badgeCounts, setBadgeCounts] = useState({ orders: null, customers: null, offlineOrders: null, categories: null, coupon: null, staffs: null, combos: null, referrals: null });
  const pagesWithOwnRefreshButton = new Set(['/dashboard', '/customers', '/staffs', '/combo-packs', '/coupon', '/offers', '/brand-logo', '/discounts', '/reels', '/setting', '/web-control', '/offline-orders', '/categories', '/profile', '/report', '/design', '/footer', '/referrals', '/referrals-summary']);
  const refreshPage = () => setPageRefreshKey((current) => current + 1);

  const refreshBadgeCounts = useCallback(async () => {
    if (isSuperAdminUser()) return;
    try {
      const [onlineRes, offlineRes, catRes, coupRes, staffRes, comboRes, refRes] = await Promise.allSettled([
        onlineOrderAPI.getOnlineOrders(),
        offlineOrderAPI.getOfflineOrders(),
        categoryAPI.getCategories(),
        couponAPI.getCoupons(),
        staffAPI.getStaffs(),
        comboPackAPI.getComboPacks(),
        referralAPI.getReferrals()
      ]);

      const onlineOrders = onlineRes.status === 'fulfilled' ? toArray(onlineRes.value) : [];
      const offlineOrders = offlineRes.status === 'fulfilled' ? toArray(offlineRes.value) : [];

      const phoneSet = new Set();
      [...onlineOrders, ...offlineOrders].forEach((order) => {
        const phone = String(
          order.customer?.mobile ||
            order.customer_mobile ||
            order.mobile ||
            order.phone ||
            order.customer_phone ||
            ''
        ).trim();
        if (phone) phoneSet.add(phone);
      });

      const nextBadgeCounts = {
        orders: onlineOrders.length,
        offlineOrders: offlineOrders.length,
        customers: phoneSet.size,
        categories: catRes.status === 'fulfilled' ? toArray(catRes.value).length : 0,
        coupon: coupRes.status === 'fulfilled' ? toArray(coupRes.value).length : 0,
        staffs: staffRes.status === 'fulfilled' ? toArray(staffRes.value).length : 0,
        combos: comboRes.status === 'fulfilled' ? toArray(comboRes.value).length : 0,
        referrals: refRes.status === 'fulfilled' ? toArray(refRes.value).length : 0
      };

      setBadgeCounts(nextBadgeCounts);
      sessionStorage.setItem(SIDEBAR_BADGES_CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        counts: nextBadgeCounts
      }));
    } catch (err) {
      console.error('Failed to load sidebar badge counts:', err);
    }
  }, []);

  useEffect(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(SIDEBAR_BADGES_CACHE_KEY) || 'null');
      if (cached?.counts && Date.now() - cached.savedAt < SIDEBAR_BADGES_CACHE_TTL) {
        setBadgeCounts(cached.counts);
        return;
      }
    } catch (err) {
      sessionStorage.removeItem(SIDEBAR_BADGES_CACHE_KEY);
    }

    refreshBadgeCounts();
  }, [refreshBadgeCounts]);

  useEffect(() => {
    let mounted = true;
    const loadHeaderProfile = () => {
      const storedUser = getStoredUser();
      setAdminProfile(getAdminDisplayProfile({}, storedUser));

      Promise.allSettled([
        adminProfileAPI.getProfile(),
        footerAPI.getFooter()
      ])
        .then(([profileResult, footerResult]) => {
          if (!mounted) return;
          const profileData = profileResult.status === 'fulfilled' ? profileResult.value?.data || {} : {};
          const footerPayload = footerResult.status === 'fulfilled' ? footerResult.value?.data : null;
          const footerData = Array.isArray(footerPayload) ? footerPayload[0] : footerPayload;
          setAdminProfile(getAdminDisplayProfile({
            ...profileData,
            footerLogo: footerData?.image_url || footerData?.image || ''
          }, storedUser));
        })
        .catch((err) => {
          console.error('Failed to load header admin profile:', err);
        });
    };

    loadHeaderProfile();
    window.addEventListener('admin-profile-updated', loadHeaderProfile);
    window.addEventListener('footer-settings-updated', loadHeaderProfile);

    return () => {
      mounted = false;
      window.removeEventListener('admin-profile-updated', loadHeaderProfile);
      window.removeEventListener('footer-settings-updated', loadHeaderProfile);
    };
  }, []);

  // Auto-close sidebar on tablet view & on navigation
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setSidebarCollapsed(true);
        setSidebarPinned(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 1024) {
      setSidebarCollapsed(true);
      setSidebarPinned(false);
    }
  }, [location.pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // ── SUPERADMIN GUARD (after all hooks) ────────────────────────────────
  // If a superadmin somehow reaches admin Layout, redirect immediately
  // before any admin UI renders (prevents 403 API error flood).
  if (isSuperAdminUser()) {
    return <Navigate to="/super-dashboard" replace />;
  }
  // ─────────────────────────────────────────────────────────────────────

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileDrawerOpen(!mobileDrawerOpen);
    } else {
      if (sidebarPinned) {
        // Unpin and collapse
        setSidebarPinned(false);
        setSidebarCollapsed(true);
      } else {
        // Pin and keep open
        setSidebarPinned(true);
        setSidebarCollapsed(false);
      }
    }
  };

  const handleOpenExternalBilling = () => {
    window.open('https://pattaz.com/billing', '_blank');
  };

  return (
    <div className={`layout ${sidebarCollapsed ? 'sidebar-is-collapsed' : 'sidebar-is-expanded'} ${lang === 'ta' ? 'layout-lang-ta' : ''}`}>
      {/* Mobile/Tablet Backdrop */}
      {mobileDrawerOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileDrawerOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileDrawerOpen ? 'mobile-open' : ''}`}
        onMouseLeave={() => {
          if (window.innerWidth > 768 && !sidebarPinned) {
            setSidebarCollapsed(true);
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          {!sidebarCollapsed && <h2 className="sidebar-title">{t('sidebar.title')}</h2>}

          {/* Toggle Sidebar Button with Menu (Open) / X (Close) Icons */}
          <button
            onClick={handleToggleSidebar}
            className="sidebar-collapse-btn"
            title={sidebarPinned ? 'Close & Unpin Sidebar' : 'Pin Sidebar Open'}
            style={{ margin: sidebarCollapsed ? '0 auto' : 0 }}
          >
            {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.title} style={{ display: 'grid', gap: '6px' }}>
              {(!sidebarCollapsed || mobileDrawerOpen) && (
                <div style={{
                  margin: '12px 10px 2px',
                  paddingTop: '10px',
                  borderTop: '1px solid #EEF2F7',
                  color: '#94A3B8',
                  fontSize: '0.66rem',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase'
                }}>
                  {section.title}
                </div>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-link ${isActive || item.activePaths?.includes(location.pathname) ? 'active' : ''}`}
                  title={sidebarCollapsed ? t(item.labelKey) : ''}
                  onClick={() => setMobileDrawerOpen(false)}
                  onMouseEnter={() => {
                    if (window.innerWidth > 768 && sidebarCollapsed && !sidebarPinned) {
                      setSidebarCollapsed(false);
                    }
                  }}
                >
                  <div className="nav-link-left">
                    <div className={`nav-icon-3d-box ${item.iconClass}`}>
                      <item.icon size={18} color="#FFFFFF" />
                    </div>
                    {(!sidebarCollapsed || mobileDrawerOpen) && <span>{t(item.labelKey)}</span>}
                  </div>
                    {(!sidebarCollapsed || mobileDrawerOpen) && (
                      item.countKey
                        ? (badgeCounts[item.countKey] !== null && badgeCounts[item.countKey] !== undefined && (
                            <span className="nav-badge">{badgeCounts[item.countKey]}</span>
                          ))
                        : (item.count && <span className="nav-badge">{item.count}</span>)
                    )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Area */}
      <div className="main-area">
        {/* Top Header */}
        <header className="top-header">
          <div className="top-header-left">
            <div className="brand-logo-title" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
              <img className="brand-logo-img" src={`${process.env.PUBLIC_URL}/nav-logo.png`} alt="Logo" />
            </div>

            {/* Role Indicator Badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(91,95,199,0.12) 0%, rgba(91,95,199,0.2) 100%)',
              border: '1.5px solid rgba(91,95,199,0.3)',
              fontSize: '0.7rem',
              fontWeight: 800,
              color: '#3B3E99',
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
              marginLeft: '8px'
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#5B5FC7', display: 'inline-block', boxShadow: '0 0 0 2px rgba(91,95,199,0.3)' }}></span>
              {t('header.role')}
            </div>

            <button
              type="button"
              className="header-admin-profile"
              onClick={() => navigate('/profile')}
              title={`Logged in as ${adminProfile.name}`}
            >
              <span className="header-admin-avatar">
                {adminProfile.image ? (
                  <img src={adminProfile.image} alt={adminProfile.name} />
                ) : (
                  <span>{adminProfile.initials}</span>
                )}
              </span>
              <span className="header-admin-copy">
                <span className="header-admin-kicker">Logged in</span>
                <strong>{adminProfile.name}</strong>
                {adminProfile.contact && <small>{adminProfile.contact}</small>}
              </span>
            </button>
          </div>

          <div className="top-header-right">
            <div className="shift-status-badge">
              <span className="pulse-dot"></span>
              <span>{t('header.shiftOpen')}</span>
              <span className="shift-time-text">03:14 pm</span>
            </div>

            <button className="header-action-btn" onClick={() => alert('Shift Summary: Cash sales ₹54,820 recorded today.')}>
              <Clock size={15} color="#EF4444" />
              <span className="btn-label-responsive">{t('header.closeShift')}</span>
            </button>

            {/* Language Toggle Button */}
            <button className="header-action-btn" onClick={toggleLang} title={t('lang.title')} style={{ borderColor: lang === 'ta' ? '#5B5FC7' : undefined }}>
              <Languages size={15} color="#5B5FC7" />
              <span className="btn-label-responsive">{t('header.langBtn')}</span>
            </button>

            {/* Direct External URL Navigation for Billing */}
            <button className="header-action-btn" onClick={handleOpenExternalBilling} title="Open Billing Site">
              <Receipt size={15} color="#5B5FC7" />
              <span className="btn-label-responsive">{t('header.billing')}</span>
            </button>

            <button className="header-action-btn" onClick={() => navigate('/orders')}>
              <ShoppingBag size={15} color="#5B5FC7" />
              <span className="btn-label-responsive">{t('header.orders')}</span>
            </button>

            <button className="header-action-btn logout-btn" onClick={handleLogoutClick} title="Logout">
              <LogOut size={16} color="#EF4444" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          className="main-content"
          style={{
            marginTop: '84px'
          }}
        >
          {!pagesWithOwnRefreshButton.has(location.pathname) && (
            <button
              type="button"
              className="page-refresh-btn"
              onClick={refreshPage}
              title="Refresh current page"
              aria-label="Refresh current page"
            >
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>
          )}
          {children || <Outlet key={`${location.pathname}-${pageRefreshKey}`} context={{ refreshPage }} />}
        </main>
      </div>

      {/* LOGOUT CONFIRMATION POPUP MODAL */}
      {showLogoutModal && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div className="modal-content" style={{ maxWidth: '380px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <LogOut size={26} color="#EF4444" />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              {t('logout.title')}
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: '1.5', marginBottom: '24px' }}>
              {t('logout.msg')}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, height: '42px', justifyContent: 'center' }}
                onClick={() => setShowLogoutModal(false)}
              >
                {t('logout.cancel')}
              </button>

              <button
                type="button"
                style={{
                  flex: 1,
                  height: '42px',
                  background: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                  transition: 'background 0.2s ease'
                }}
                onClick={confirmLogout}
              >
                <LogOut size={16} />
                <span>{t('logout.confirm')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
