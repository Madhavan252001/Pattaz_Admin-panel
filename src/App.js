import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import Design from './pages/Design';
import Footer from './pages/Footer';
import Orders from './pages/Orders';
import OfflineOrders from './pages/OfflineOrders';
import Customers from './pages/Customers';
import Coupon from './pages/Coupon';
import Categories from './pages/Categories';
import Discounts from './pages/Discounts';
import Setting from './pages/Setting';
import Profile from './pages/Profile';
import Layout from './components/Layout';
import WebControl from './pages/WebControl';
import Reels from './pages/Reels';
import Staffs from './pages/Staffs';
import ComboPacks from './pages/ComboPacks';
import Referrals from './pages/Referrals';
import ReferralsSummary from './pages/ReferralsSummary';
import Offer from './pages/Offer';
import BrandLogo from './pages/BrandLogo';

// Super Admin imports
import SuperLayout from './components/SuperLayout';
import SuperDashboard from './pagesuper/SuperDashboard';
import Shops from './pagesuper/Shops';
import { SuperActivity, SuperBilling } from './pagesuper/SuperControlPages';

import './App.css';
import { LanguageProvider } from './context/LanguageContext';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      const isSuperAdmin =
        user.role_name?.toLowerCase() === 'superadmin' ||
        user.admin_name?.toLowerCase() === 'superadmin' ||
        user.role?.toLowerCase() === 'superadmin' ||
        user.email === 'superadmin@rsfireworks.com';
      if (isSuperAdmin) {
        return <Navigate to="/super-dashboard" replace />;
      }
    } catch (e) {
      console.error(e);
    }
  }
  return children;
}

function SuperPrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      const isSuperAdmin =
        user.role_name?.toLowerCase() === 'superadmin' ||
        user.admin_name?.toLowerCase() === 'superadmin' ||
        user.role?.toLowerCase() === 'superadmin' ||
        user.email === 'superadmin@rsfireworks.com';
      if (isSuperAdmin) {
        return children;
      }
    } catch (e) {
      console.error(e);
    }
  }
  return <Navigate to="/dashboard" replace />;
}

function HomeRedirect() {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      const isSuperAdmin =
        user.role_name?.toLowerCase() === 'superadmin' ||
        user.admin_name?.toLowerCase() === 'superadmin' ||
        user.role?.toLowerCase() === 'superadmin' ||
        user.email === 'superadmin@rsfireworks.com';
      if (isSuperAdmin) {
        return <Navigate to="/super-dashboard" replace />;
      }
    } catch (e) {
      console.error(e);
    }
  }
  return <Navigate to="/dashboard" replace />;
}

// Smart basename fallback: supports /manager deployment and root local dev URL
const getBasename = () => {
  if (window.location.pathname.startsWith('/manager')) {
    return '/manager';
  }
  return process.env.PUBLIC_URL || '';
};

export default function App() {
  return (
    <LanguageProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3200,
          className: 'app-toast',
          style: { fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700 },
          success: { iconTheme: { primary: '#16A34A', secondary: '#FFFFFF' } },
          error: { iconTheme: { primary: '#DC2626', secondary: '#FFFFFF' } },
        }}
      />
      <Router basename={getBasename()}>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />

          {/* Client Admin Routes: keep Layout mounted while only the active page changes */}
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/report" element={<Report />} />
            <Route path="/design" element={<Design />} />
            <Route path="/footer" element={<Footer />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/offline-orders" element={<OfflineOrders />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/staffs" element={<Staffs />} />
            <Route path="/coupon" element={<Coupon />} />
            <Route path="/discounts" element={<Discounts />} />
            <Route path="/offers" element={<Offer />} />
            <Route path="/brand-logo" element={<BrandLogo />} />
            <Route path="/combo-packs" element={<ComboPacks />} />
            <Route path="/reels" element={<Reels />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/setting" element={<Setting />} />
            <Route path="/web-control" element={<WebControl />} />
            <Route path="/referrals" element={<Referrals />} />
            <Route path="/referrals-summary" element={<ReferralsSummary />} />
          </Route>

          {/* Super Admin Routes */}
          <Route element={<SuperPrivateRoute><SuperLayout /></SuperPrivateRoute>}>
            <Route path="/super-dashboard" element={<SuperDashboard />} />
            <Route path="/super-shops" element={<Shops />} />
            <Route path="/super-activity" element={<SuperActivity />} />
            <Route path="/super-billing" element={<SuperBilling />} />
          </Route>

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}
