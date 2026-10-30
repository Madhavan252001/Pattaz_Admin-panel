import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Share2,
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
  Percent,
  Calendar,
  Gift,
  Award,
  Plus,
  X,
  UserPlus,
  Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { referralAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';

export default function Referrals() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsgValue] = useState('');
  const setErrorMsg = (message) => { setErrorMsgValue(message); if (message) toast.error(message); };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [copiedCode, setCopiedCode] = useState(null);

  // Modal State for Creating / Editing Referral
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null for create, object for edit
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile_no: '',
    address: 'Sivakasi',
    customer_discount: '100',
    sales_partner_discount: '50',
    is_active: '1'
  });

  const outletContext = useOutletContext();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await referralAPI.getReferrals();
      let list = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (Array.isArray(res?.data)) {
        list = res.data;
      } else if (Array.isArray(res?.data?.data)) {
        list = res.data.data;
      }
      setReferrals(list);
    } catch (err) {
      console.error('Error fetching referrals:', err);
      setErrorMsg(err.message || 'Failed to fetch referral records from server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  // Handle Copy Referral Code
  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Referral code "${code}" copied!`);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      mobile_no: '',
      address: 'Sivakasi',
      customer_discount: '100',
      sales_partner_discount: '50',
      is_active: '1'
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      mobile_no: item.mobile_no || '',
      address: item.address || 'Sivakasi',
      customer_discount: String(item.customer_discount ?? '100'),
      sales_partner_discount: String(item.sales_partner_discount ?? '50'),
      is_active: String(item.is_active ?? '1')
    });
    setIsModalOpen(true);
  };

  // Handle Form Submit (Create or Edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter the partner name');
      return;
    }
    if (!formData.mobile_no.trim()) {
      toast.error('Please enter the mobile number');
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        // PUT API call
        const payload = {
          name: formData.name.trim(),
          mobile_no: formData.mobile_no.trim(),
          address: formData.address.trim() || 'Sivakasi',
          customer_discount: Number(formData.customer_discount || 0),
          sales_partner_discount: Number(formData.sales_partner_discount || 0),
          is_active: String(formData.is_active)
        };

        const res = await referralAPI.updateReferral(editingItem.id, payload);
        toast.success(res?.message || 'Referral profile updated successfully!');
      } else {
        // POST API call
        const payload = {
          name: formData.name.trim(),
          mobile_no: formData.mobile_no.trim(),
          address: formData.address.trim() || 'Sivakasi',
          customer_discount: Number(formData.customer_discount || 0),
          sales_partner_discount: Number(formData.sales_partner_discount || 0)
        };

        const res = await referralAPI.createReferral(payload);
        toast.success(res?.message || 'Sales partner referral profile created successfully!');
      }

      setIsModalOpen(false);
      fetchReferrals();
    } catch (err) {
      console.error('Error saving referral:', err);
      toast.error(err.message || 'Failed to save referral profile');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtering Logic
  const filteredReferrals = referrals.filter((item) => {
    const isActiveStr = String(item.is_active ?? '1');
    if (statusFilter === 'active' && isActiveStr !== '1') return false;
    if (statusFilter === 'inactive' && isActiveStr !== '0') return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.mobile_no && item.mobile_no.toLowerCase().includes(q)) ||
      (item.referral_code && item.referral_code.toLowerCase().includes(q)) ||
      (item.address && item.address.toLowerCase().includes(q))
    );
  });

  // Calculate Metrics
  const totalCount = referrals.length;
  const activeCount = referrals.filter((r) => String(r.is_active ?? '1') === '1').length;
  const inactiveCount = totalCount - activeCount;

  const formatDate = (rawDate) => {
    if (!rawDate) return 'N/A';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return String(rawDate);
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(rawDate);
    }
  };

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
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
              color: '#FFFFFF'
            }}
          >
            <Share2 size={24} />
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
              {t('nav.referrals') || 'Referrals'}
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Manage sales partners, referral codes, and discount programs
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              fetchReferrals();
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

          <button
            type="button"
            onClick={handleOpenCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.9rem',
              background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <Plus size={18} />
            <span>Add Referral</span>
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
            fontWeight: 800,
            fontSize: '0.92rem',
            color: '#4F46E5',
            cursor: 'pointer',
            borderBottom: '3px solid #4F46E5',
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
            fontWeight: 700,
            fontSize: '0.92rem',
            color: '#64748B',
            cursor: 'pointer',
            borderBottom: '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          Summary & Report
        </button>
      </div>

      {/* METRIC STAT CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
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
            <Tag size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Total Referral Codes
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {totalCount}
            </div>
          </div>
        </div>

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
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Active Referrals
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16A34A', marginTop: '2px' }}>
              {activeCount}
            </div>
          </div>
        </div>

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
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <XCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Inactive Referrals
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
              {inactiveCount}
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS & SEARCH BAR */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px 20px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        {/* Search Input */}
        <div
          style={{
            position: 'relative',
            flex: '1 1 300px',
            maxWidth: '450px'
          }}
        >
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
            placeholder="Search by name, mobile, code or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '42px',
              paddingRight: '16px',
              height: '42px',
              borderRadius: '10px',
              border: '1.5px solid #E2E8F0',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Status Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer',
              background: statusFilter === 'all' ? '#4F46E5' : '#F1F5F9',
              color: statusFilter === 'all' ? '#FFFFFF' : '#475569',
              transition: 'all 0.2s ease'
            }}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer',
              background: statusFilter === 'active' ? '#16A34A' : '#F1F5F9',
              color: statusFilter === 'active' ? '#FFFFFF' : '#475569',
              transition: 'all 0.2s ease'
            }}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer',
              background: statusFilter === 'inactive' ? '#DC2626' : '#F1F5F9',
              color: statusFilter === 'inactive' ? '#FFFFFF' : '#475569',
              transition: 'all 0.2s ease'
            }}
          >
            Inactive ({inactiveCount})
          </button>
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
            onClick={fetchReferrals}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* TABLE / CONTENT SECTION */}
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
            <Loader2 size={36} color="#4F46E5" className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>Loading referrals data...</p>
          </div>
        ) : filteredReferrals.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
            <Share2 size={48} color="#CBD5E1" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px' }}>
              No Referrals Found
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748B' }}>
              {searchTerm ? 'No referral codes match your search query.' : 'There are currently no referrals available.'}
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
                  <th style={{ padding: '16px 20px' }}>Referrer Name</th>
                  <th style={{ padding: '16px 20px' }}>Mobile No</th>
                  <th style={{ padding: '16px 20px' }}>Address</th>
                  <th style={{ padding: '16px 20px' }}>Referral Code</th>
                  <th style={{ padding: '16px 20px' }}>Customer Discount</th>
                  <th style={{ padding: '16px 20px' }}>Partner Discount</th>
                  <th style={{ padding: '16px 20px' }}>Status</th>
                  <th style={{ padding: '16px 20px' }}>Created Date</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReferrals.map((item, index) => {
                  const isActive = String(item.is_active ?? '1') === '1';
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

                      {/* Name */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                              color: '#4F46E5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.9rem'
                            }}
                          >
                            {(item.name || 'R').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                              {item.name || 'N/A'}
                            </div>
                            {item.admin_id && (
                              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                Admin ID: #{item.admin_id}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Mobile */}
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={14} color="#64748B" />
                          <span>{item.mobile_no || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Address */}
                      <td style={{ padding: '16px 20px', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} color="#64748B" />
                          <span>{item.address || 'Sivakasi'}</span>
                        </div>
                      </td>

                      {/* Referral Code with Copy Button */}
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
                              fontSize: '0.95rem',
                              color: '#4F46E5',
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

                      {/* Customer Discount */}
                      <td style={{ padding: '16px 20px' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#EFF6FF',
                            color: '#2563EB',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontWeight: 800,
                            fontSize: '0.82rem'
                          }}
                        >
                          <Gift size={14} />
                          <span>{item.customer_discount || '0'}%</span>
                        </div>
                      </td>

                      {/* Sales Partner Discount */}
                      <td style={{ padding: '16px 20px' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#F0FDF4',
                            color: '#16A34A',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontWeight: 800,
                            fontSize: '0.82rem'
                          }}
                        >
                          <Award size={14} />
                          <span>{item.sales_partner_discount || '0'}%</span>
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
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '0.78rem',
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
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '0.78rem',
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

                      {/* Created Date */}
                      <td style={{ padding: '16px 20px', color: '#64748B', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} color="#94A3B8" />
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          title="Edit Referral"
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            color: '#4F46E5',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Edit2 size={14} />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT REFERRAL MODAL POPUP */}
      {isModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => !submitting && setIsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                background: editingItem
                  ? 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)'
                  : 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {editingItem ? <Edit2 size={22} /> : <UserPlus size={22} />}
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    {editingItem ? `Edit Referral #${editingItem.id}` : 'Add Sales Partner Referral'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                    {editingItem
                      ? 'Update partner details, discounts, and active status'
                      : 'Generate a new referral code and partner discount'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setIsModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleFormSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Name */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.83rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '6px'
                    }}
                  >
                    Partner Name <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Raja Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      padding: '0 14px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Mobile No */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.83rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '6px'
                    }}
                  >
                    Mobile Number <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={formData.mobile_no}
                    onChange={(e) => setFormData({ ...formData, mobile_no: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      padding: '0 14px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Address */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.83rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '6px'
                    }}
                  >
                    Address / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sivakasi"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      padding: '0 14px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Discounts Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {/* Customer Discount */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.83rem',
                        fontWeight: 700,
                        color: '#334155',
                        marginBottom: '6px'
                      }}
                    >
                      Customer Discount (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      placeholder="10"
                      value={formData.customer_discount}
                      onChange={(e) => setFormData({ ...formData, customer_discount: e.target.value })}
                      style={{
                        width: '100%',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        padding: '0 14px',
                        fontSize: '0.9rem',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  {/* Partner Discount */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.83rem',
                        fontWeight: 700,
                        color: '#334155',
                        marginBottom: '6px'
                      }}
                    >
                      Partner Discount (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      placeholder="75"
                      value={formData.sales_partner_discount}
                      onChange={(e) => setFormData({ ...formData, sales_partner_discount: e.target.value })}
                      style={{
                        width: '100%',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        padding: '0 14px',
                        fontSize: '0.9rem',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>

                {/* Is Active Status Dropdown (only visible when editing or configurable) */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.83rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '6px'
                    }}
                  >
                    Referral Status
                  </label>
                  <select
                    value={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value })}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      padding: '0 14px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      background: '#FFFFFF'
                    }}
                  >
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Form Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px solid #E2E8F0'
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  style={{
                    height: '42px',
                    padding: '0 20px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    height: '42px',
                    padding: '0 24px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    background: editingItem
                      ? 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)'
                      : 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: editingItem
                      ? '0 4px 14px rgba(14, 165, 233, 0.35)'
                      : '0 4px 14px rgba(79, 70, 229, 0.35)'
                  }}
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  <span>
                    {submitting
                      ? 'Saving...'
                      : editingItem
                      ? 'Update Referral'
                      : 'Create Referral'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
