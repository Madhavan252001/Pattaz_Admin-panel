import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  UserCheck,
  Users,
  ShieldCheck,
  Lock,
  Unlock,
  Search,
  Plus,
  Edit2,
  X,
  Loader2,
  AlertCircle,
  RefreshCcw,
  Eye,
  EyeOff,
  User,
  Mail,
  Phone
} from 'lucide-react';

import CustomSelect from '../components/CustomSelect';
import { staffAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';

export default function Staffs() {
  const { t } = useLanguage();
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsgValue] = useState('');
  const setErrorMsg = (message) => { setErrorMsgValue(message); if (message) toast.error(message); };
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    mobile_no: '',
    password: '',
    confirm_password: ''
  });

  const fetchStaffs = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await staffAPI.getStaffs();
      let list = [];
      if (response && Array.isArray(response.data)) {
        list = response.data;
      } else if (Array.isArray(response)) {
        list = response;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        list = response.data.data;
      }
      setStaffs(list);
    } catch (err) {
      console.error('Error fetching staff list:', err);
      setErrorMsg(err.message || 'Failed to fetch staff members from API.');
      setStaffs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffs();
  }, [fetchStaffs]);

  const [formErrors, setFormErrors] = useState({});

  // Real-time Field Validation
  const validateForm = () => {
    const errors = {};
    const nameTrimmed = (formData.name || '').trim();
    const usernameTrimmed = (formData.username || '').trim();
    const mobileTrimmed = (formData.mobile_no || '').trim();

    // Name Validation
    if (!nameTrimmed) {
      errors.name = t('staff.err_name_required');
    } else if (nameTrimmed.length < 2) {
      errors.name = t('staff.err_name_min');
    } else if (!/^[A-Za-z\s]+$/.test(nameTrimmed)) {
      errors.name = t('staff.err_name_text_only');
    }

    // Email value is sent to the API as the `username` field.
    if (!usernameTrimmed) {
      errors.username = t('staff.err_email_required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usernameTrimmed)) {
      errors.username = t('staff.err_email_invalid');
    }

    // Mobile Number Validation
    if (!mobileTrimmed) {
      errors.mobile_no = t('staff.err_mobile_required');
    } else if (/[a-zA-Z@]/.test(mobileTrimmed)) {
      errors.mobile_no = t('staff.err_mobile_digits');
    } else if (mobileTrimmed.length !== 10) {
      errors.mobile_no = t('staff.err_mobile_length');
    }

    const passwordValue = formData.password || '';
    const confirmPasswordValue = formData.confirm_password || '';
    if (!editingStaff && !passwordValue) {
      errors.password = t('staff.err_password_required');
    } else if (passwordValue && passwordValue.length < 8) {
      errors.password = t('staff.err_password_min');
    }
    if (passwordValue || confirmPasswordValue) {
      if (passwordValue !== confirmPasswordValue) {
        errors.confirm_password = 'Password and confirm password must match';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    let cleanValue = value;
    if (field === 'name') {
      cleanValue = value.replace(/[^A-Za-z\s]/g, '');
    }
    if (field === 'mobile_no') {
      // Restrict mobile_no to numbers only, max 10 digits
      cleanValue = value.replace(/[^0-9]/g, '').slice(0, 10);
    }
    setFormData((prev) => ({ ...prev, [field]: cleanValue }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Open Modal for Create or Edit
  const handleOpenModal = (staff = null) => {
    setShowPassword(false);
    setFormErrors({});
    if (staff) {
      setEditingStaff(staff);
      setFormData({
        name: staff.name || '',
        username: staff.email || staff.username || '',
        mobile_no: staff.mobile_no || '',
        password: '',
        confirm_password: ''
      });
    } else {
      setEditingStaff(null);
      setFormData({
        name: '',
        username: '',
        mobile_no: '',
        password: '',
        confirm_password: ''
      });
    }
    setIsModalOpen(true);
  };

  // Submit Modal Form (POST /crackers/staffs or PUT /crackers/staffs/:id)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      if (editingStaff) {
        // PUT /crackers/staffs/:id (name, username, mobile_no)
        const updatePayload = {
          name: formData.name.trim(),
          username: formData.username.trim(),
          mobile_no: formData.mobile_no.trim()
        };
        if (formData.password) {
          updatePayload.password = formData.password;
          updatePayload.confirm_password = formData.confirm_password;
        }
        const res = await staffAPI.updateStaff(editingStaff.id, updatePayload);
        const msg = res?.message || res?.data?.message || 'Staff member updated successfully!';
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        // POST /crackers/staffs (name, username, mobile_no, password)
        const createPayload = {
          name: formData.name.trim(),
          username: formData.username.trim(),
          mobile_no: formData.mobile_no.trim(),
          password: formData.password
        };
        const res = await staffAPI.createStaff(createPayload);
        const msg = res?.message || res?.data?.message || 'Staff added successfully.';
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
      setIsModalOpen(false);
      await fetchStaffs();
    } catch (err) {
      console.error('Failed to save staff:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to save staff record.');
    } finally {
      setSaving(false);
    }
  };


  // Block Staff member (PUT /crackers/staffs/:id/block)
  const handleBlockStaff = async (staff) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await staffAPI.blockStaff(staff.id);
      const msg = res?.message || res?.data?.message || `Staff member '${staff.name}' blocked successfully.`;
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchStaffs();
    } catch (err) {
      console.error('Failed to block staff:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to block staff member.');
    }
  };

  // Unblock Staff member (PUT /crackers/staffs/:id/unblock)
  const handleUnblockStaff = async (staff) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await staffAPI.unblockStaff(staff.id);
      const msg = res?.message || res?.data?.message || `Staff member '${staff.name}' unblocked successfully.`;
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchStaffs();
    } catch (err) {
      console.error('Failed to unblock staff:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to unblock staff member.');
    }
  };

  // Filtered Staffs
  const filteredStaffs = staffs.filter((s) => {
    const matchesSearch =
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.mobile_no || '').includes(searchTerm);

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && String(s.is_active) === '1' && String(s.is_blocked) !== '1') ||
      (statusFilter === 'Blocked' && String(s.is_blocked) === '1') ||
      (statusFilter === 'Inactive' && String(s.is_active) === '0');

    return matchesSearch && matchesStatus;
  });

  // KPI Stats
  const totalStaffCount = staffs.length;
  const activeStaffCount = staffs.filter((s) => String(s.is_active) === '1' && String(s.is_blocked) !== '1').length;
  const blockedStaffCount = staffs.filter((s) => String(s.is_blocked) === '1').length;
  const adminRoleCount = new Set(staffs.map((s) => s.admin_id).filter(Boolean)).size || 1;

  const statusOptions = [
    { label: t('staff.filter_all'), value: 'All' },
    { label: t('staff.filter_active'), value: 'Active' },
    { label: t('staff.filter_blocked'), value: 'Blocked' },
    { label: t('staff.filter_inactive'), value: 'Inactive' }
  ];

  return (
    <div className="dashboard-container">
      {/* Header Row */}
      <div className="page-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="nav-icon-3d-box icon-3d-customers"
            style={{ width: '42px', height: '42px', borderRadius: '12px' }}
          >
            <UserCheck size={22} color="#FFF" />
          </div>
          <div>
            <h1 className="page-title" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
              {t('staff.page_title')}
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.84rem', marginTop: '2px', fontWeight: 600 }}>
              {t('staff.page_subtitle')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn-secondary"
            onClick={fetchStaffs}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '0.85rem', borderRadius: '10px', fontWeight: 700 }}
          >
            <RefreshCcw size={15} className={loading ? 'spin' : ''} />
            <span>{t('staff.refresh')}</span>
          </button>

          <button
            className="btn-primary"
            onClick={() => handleOpenModal()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              fontSize: '0.85rem',
              borderRadius: '10px',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(91, 95, 199, 0.25)'
            }}
          >
            <Plus size={17} />
            <span>{t('staff.add_new')}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}

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
            <span style={{ fontWeight: 600 }}>{errorMsg}</span>
          </div>
          <button
            onClick={fetchStaffs}
            style={{
              background: '#DC2626',
              color: '#FFF',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            {t('staff.retry')}
          </button>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-customers" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <Users size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('staff.total_members')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {loading ? <Loader2 size={18} className="spin" /> : `${totalStaffCount} ${t('staff.members')}`}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-orders" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <UserCheck size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('staff.active_personnel')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
              {loading ? <Loader2 size={18} className="spin" /> : `${activeStaffCount} ${t('staff.active_count')}`}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-coupon" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)' }}>
            <Lock size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('staff.blocked_personnel')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#EF4444', marginTop: '2px' }}>
              {loading ? <Loader2 size={18} className="spin" /> : `${blockedStaffCount} ${t('staff.blocked_count')}`}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-dashboard" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <ShieldCheck size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('staff.manager_groups')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#5B5FC7', marginTop: '2px' }}>
              {loading ? <Loader2 size={18} className="spin" /> : `${adminRoleCount} ${t('staff.groups')}`}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="admin-card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-input-wrapper" style={{ flex: 1, minWidth: '240px' }}>
            <Search size={16} color="#64748B" />
            <input
              type="text"
              className="search-input-field"
              placeholder={t('staff.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B' }}>{t('staff.status_filter')}</span>
            <CustomSelect
              options={statusOptions}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
            />
          </div>
        </div>
      </div>

      {/* Staffs Data Table */}
      <div className="admin-card">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('staff.th_id')}</th>
                <th>{t('staff.th_staff_name')}</th>
                <th>{t('staff.th_email')}</th>
                <th>{t('staff.th_mobile')}</th>
                <th>{t('staff.th_admin_group')}</th>
                <th>{t('staff.th_account_status')}</th>
                <th>{t('staff.th_joined_date')}</th>
                <th style={{ textAlign: 'right' }}>{t('staff.th_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                      <Loader2 size={22} className="spin" color="#5B5FC7" />
                      <span style={{ fontWeight: 700 }}>{t('staff.loading_directory')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStaffs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#94A3B8', fontWeight: 600 }}>
                    {t('staff.no_results')}
                  </td>
                </tr>
              ) : (
                filteredStaffs.map((staff) => {
                  const isBlocked = String(staff.is_blocked) === '1';
                  const isActive = String(staff.is_active) === '1' && !isBlocked;

                  return (
                    <tr key={staff.id}>
                      <td>
                        <span style={{ fontWeight: 800, color: '#64748B' }}>#{staff.id}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                              color: '#5B5FC7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.88rem',
                              border: '1px solid #C7D2FE'
                            }}
                          >
                            {(staff.name || 'S').charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 800, color: '#0F172A', textTransform: 'capitalize' }}>
                            {staff.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: '#334155' }}>{staff.email || staff.username || 'N/A'}</td>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>{staff.mobile_no || 'N/A'}</td>
                      <td>
                        <span className="badge" style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
                          {t('staff.admin_group_badge')} #{staff.admin_id || 1}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: isBlocked ? '#FEE2E2' : isActive ? '#ECFDF5' : '#FEF3C7',
                            color: isBlocked ? '#DC2626' : isActive ? '#047857' : '#D97706',
                            border: `1px solid ${isBlocked ? '#FCA5A5' : isActive ? '#6EE7B7' : '#FDE68A'}`
                          }}
                        >
                          {isBlocked ? t('staff.status_blocked') : isActive ? t('staff.status_active') : t('staff.status_inactive')}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>
                        {staff.created_at || 'N/A'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {isBlocked ? (
                            <button
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem', color: '#10B981', background: '#ECFDF5', borderColor: '#A7F3D0', fontWeight: 700 }}
                              onClick={() => handleUnblockStaff(staff)}
                              title={t('staff.unblock_title')}
                            >
                              <Unlock size={14} />
                              <span>{t('staff.unblock')}</span>
                            </button>
                          ) : (
                            <button
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem', color: '#DC2626', background: '#FEF2F2', borderColor: '#FCA5A5', fontWeight: 700 }}
                              onClick={() => handleBlockStaff(staff)}
                              title={t('staff.block_title')}
                            >
                              <Lock size={14} />
                              <span>{t('staff.block')}</span>
                            </button>
                          )}

                          <button
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700 }}
                            onClick={() => handleOpenModal(staff)}
                            title={t('staff.edit_title')}
                          >
                            <Edit2 size={14} />
                            <span>{t('staff.edit')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT STAFF MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div
            className="modal-content"
            style={{ maxWidth: '520px', width: '92%', padding: '28px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="nav-icon-3d-box icon-3d-customers" style={{ width: '38px', height: '38px', borderRadius: '10px' }}>
                  <UserCheck size={20} color="#FFF" />
                </div>
                <div>
                  <h2 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {editingStaff ? t('staff.modal_edit_title') : t('staff.modal_add_title')}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
                    {editingStaff
                      ? t('staff.modal_edit_subtitle')
                      : t('staff.modal_add_subtitle')}
                  </p>
                </div>
              </div>

              <button
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {t('staff.label_full_name')}
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color={formErrors.name ? '#EF4444' : '#94A3B8'} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    name="staff_full_name"
                    autoComplete="off"
                    required
                    placeholder={t('staff.ph_name')}
                    style={{
                      width: '100%',
                      padding: '11px 12px 11px 38px',
                      borderRadius: '10px',
                      border: formErrors.name ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      outline: 'none',
                      background: formErrors.name ? '#FEF2F2' : '#FFF'
                    }}
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                {formErrors.name && (
                  <span style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600, display: 'block' }}>
                    {formErrors.name}
                  </span>
                )}
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {t('staff.label_email')}
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color={formErrors.username ? '#EF4444' : '#94A3B8'} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    name="staff_email"
                    autoComplete="off"
                    required
                    placeholder={t('staff.ph_email')}
                    style={{
                      width: '100%',
                      padding: '11px 12px 11px 38px',
                      borderRadius: '10px',
                      border: formErrors.username ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      outline: 'none',
                      background: formErrors.username ? '#FEF2F2' : '#FFF'
                    }}
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                  />
                </div>
                {formErrors.username ? (
                  <span style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600, display: 'block' }}>
                    {formErrors.username}
                  </span>
                ) : (
                  <span style={{ color: '#64748B', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                    {t('staff.ph_email')}
                  </span>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {t('staff.label_mobile')}
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color={formErrors.mobile_no ? '#EF4444' : '#94A3B8'} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="tel"
                    name="staff_mobile_no"
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    maxLength={10}
                    placeholder={t('staff.ph_mobile')}
                    style={{
                      width: '100%',
                      padding: '11px 12px 11px 38px',
                      borderRadius: '10px',
                      border: formErrors.mobile_no ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      outline: 'none',
                      background: formErrors.mobile_no ? '#FEF2F2' : '#FFF'
                    }}
                    value={formData.mobile_no}
                    onChange={(e) => handleInputChange('mobile_no', e.target.value)}
                  />
                </div>
                {formErrors.mobile_no ? (
                  <span style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600, display: 'block' }}>
                    {formErrors.mobile_no}
                  </span>
                ) : (
                  <span style={{ color: '#64748B', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                    {t('staff.mobile_hint')}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    {editingStaff ? 'Change Password' : t('staff.label_password')}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color={formErrors.password ? '#EF4444' : '#94A3B8'} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="staff_new_password"
                      autoComplete="new-password"
                      required={!editingStaff}
                      placeholder={editingStaff ? 'Leave blank to keep old password' : t('staff.ph_password')}
                      style={{
                        width: '100%',
                        padding: '11px 38px 11px 38px',
                        borderRadius: '10px',
                        border: formErrors.password ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        outline: 'none',
                        background: formErrors.password ? '#FEF2F2' : '#FFF'
                      }}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: 0,
                        bottom: 0,
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {formErrors.password && (
                    <span style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600, display: 'block' }}>
                      {formErrors.password}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color={formErrors.confirm_password ? '#EF4444' : '#94A3B8'} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="staff_confirm_password"
                      autoComplete="new-password"
                      required={!editingStaff}
                      placeholder="Re-enter password"
                      style={{
                        width: '100%',
                        padding: '11px 38px 11px 38px',
                        borderRadius: '10px',
                        border: formErrors.confirm_password ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        outline: 'none',
                        background: formErrors.confirm_password ? '#FEF2F2' : '#FFF'
                      }}
                      value={formData.confirm_password}
                      onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: 0,
                        bottom: 0,
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {formErrors.confirm_password && (
                    <span style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600, display: 'block' }}>
                      {formErrors.confirm_password}
                    </span>
                  )}
                </div>
              </div>


              {/* Form Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '14px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '11px 20px', fontSize: '0.88rem', borderRadius: '10px', fontWeight: 700 }}
                >
                  {t('staff.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{
                    padding: '11px 24px',
                    fontSize: '0.88rem',
                    borderRadius: '10px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(91, 95, 199, 0.3)'
                  }}
                >
                  {saving && <Loader2 size={16} className="spin" />}
                  <span>{editingStaff ? t('staff.update_btn') : t('staff.create_btn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
