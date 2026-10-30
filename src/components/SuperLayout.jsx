import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LogOut,
  BarChart2,
  Store,
  Menu,
  X
  , Activity, CreditCard
} from 'lucide-react';
import { adminService } from '../api/adminService';

const superNavItems = [
  { to: '/super-dashboard', icon: BarChart2, label: 'Dashboard', count: 'Super', iconClass: 'icon-3d-dashboard' },
  { to: '/super-shops', icon: Store, label: 'Shops', count: '', iconClass: 'icon-3d-customers' },
  { to: '/super-activity', icon: Activity, label: 'Activity log', count: '', iconClass: 'icon-3d-orders' },
  { to: '/super-billing', icon: CreditCard, label: 'Billing', count: '', iconClass: 'icon-3d-categories' },
];

export default function SuperLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Sidebar state: auto-collapse on tablet (width <= 1024)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth <= 1024);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [totalShops, setTotalShops] = useState(0);

  useEffect(() => {
    let mounted = true;
    adminService.getAllAdmins().then((response) => {
      const admins = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      const approvedShops = admins.filter((admin) => admin.approved === true || admin.approved === 1 || admin.approved === '1');
      if (mounted) setTotalShops(approvedShops.length);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Logout confirmation modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (!showLogoutModal) return undefined;
    const scrollY = window.scrollY;
    const bodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      left: document.body.style.left,
    };
    const htmlOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.width = '100%';
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      Object.assign(document.body.style, bodyStyles);
      window.scrollTo(0, scrollY);
    };
  }, [showLogoutModal]);

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
        setSidebarPinned(false);
        setSidebarCollapsed(true);
      } else {
        setSidebarPinned(true);
        setSidebarCollapsed(false);
      }
    }
  };

  return (
    <div className={`layout ${sidebarCollapsed ? 'sidebar-is-collapsed' : 'sidebar-is-expanded'}`}>
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
          {!sidebarCollapsed && <h2 className="sidebar-title" style={{ fontSize: '0.92rem' }}>Super Admin Portal</h2>}

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
          {superNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              title={sidebarCollapsed ? item.label : ''}
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
                {(!sidebarCollapsed || mobileDrawerOpen) && <span>{item.label}</span>}
              </div>
              {(!sidebarCollapsed || mobileDrawerOpen) && <span className="nav-badge">{item.to === '/super-shops' ? totalShops : item.count}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Area */}
      <div className="main-area">
        {/* Top Header */}
        <header className="top-header">
          <div className="top-header-left">
            <div className="brand-logo-title" onClick={() => navigate('/super-dashboard')} style={{ cursor: 'pointer' }}>
              <img className="brand-logo-img" src={`${process.env.PUBLIC_URL}/nav-logo.png`} alt="Logo" />
            </div>

            {/* Super Admin Role Indicator Badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0.22) 100%)',
              border: '1.5px solid rgba(124,58,237,0.4)',
              fontSize: '0.7rem',
              fontWeight: 800,
              color: '#6D28D9',
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
              marginLeft: '8px'
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#7C3AED', display: 'inline-block', boxShadow: '0 0 0 2px rgba(124,58,237,0.35)' }}></span>
              Super Admin
            </div>
          </div>

          <div className="top-header-right">
            <div className="shift-status-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#D97706', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <span className="pulse-dot" style={{ backgroundColor: '#F59E0B' }}></span>
              <span>All Shops Open</span>
            </div>

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
          {children || <Outlet key={location.pathname} />}
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
              Confirm Logout?
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: '1.5', marginBottom: '24px' }}>
              Are you sure you want to log out from the Super Admin Portal?
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, height: '42px', justifyContent: 'center' }}
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
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
                <span>Yes, Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
