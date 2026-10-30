import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Ban, CheckCircle2, Edit2, Eye, Globe2, Loader2, Mail, MapPin, Phone, RefreshCw, Store, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../api/adminService';
import { shopAdminAPI } from '../api/api';

const PAGE_SIZE = 10;
const FIXED_ADMIN_PANEL_URL = 'https://pattaz.com/manager';
const FIXED_BILLING_URL = 'https://pattaz.com/billing';

const unwrapAdmins = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.admins)) return response.admins;
  if (Array.isArray(response?.data?.admins)) return response.data.admins;
  return [];
};

const normalizeAdmin = (admin) => ({
  ...admin,
  id: admin.id ?? admin.admin_id,
  shop_name: admin.shop_name || admin.shopName || 'Unnamed Shop',
  mobile_no: admin.mobile_no || admin.mobile || '',
  email: admin.email || '',
  address: admin.address || '',
  landmark: admin.landmark || '',
  postalcode: admin.postalcode || admin.postal_code || '',
  delivery_eligible: Number(admin.delivery_eligible ?? admin.deliveryEligible ?? 0) ? 1 : 0,
});

const isBlocked = (admin) => (
  admin.status === 1 || admin.status === '1' ||
  admin.is_blocked === true || admin.is_blocked === 1 || admin.is_blocked === '1' || admin.blocked === true || admin.blocked === 1 || admin.blocked === '1' ||
  admin.is_active === 0 || admin.is_active === false || admin.active === false ||
  String(admin.status || '').toLowerCase() === 'blocked' ||
  ['blocked', 'inactive', 'disabled'].includes(String(admin.account_status || '').toLowerCase()) ||
  String(admin.status_name || '').toLowerCase() === 'blocked'
);

const isApproved = (admin) => admin.approved === true || admin.approved === 1 || admin.approved === '1';
const isDeclined = (admin) => admin.approved === 2 || admin.approved === '2';
const toStoreUrlSlug = (value) => String(value || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+/, '');

const emptyForm = {
  shop_name: '',
  mobile_no: '',
  email: '',
  address: '',
  landmark: '',
  postalcode: '',
  delivery_eligible: 0,
};

const emptyCustomDomainForm = {
  shop_name: '',
  email: '',
  mobile_no: '',
  password: '',
  confirm_password: '',
  domain: '',
  address: '',
  landmark: '',
  postalcode: '',
  gst_no: '',
  license_no: '',
};

export default function Shops() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [incompleteAdmins, setIncompleteAdmins] = useState([]);
  const [declinedAdmins, setDeclinedAdmins] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [viewingAdmin, setViewingAdmin] = useState(null);
  const [confirmAdmin, setConfirmAdmin] = useState(null);
  const [requestAdmin, setRequestAdmin] = useState(null);
  const [showRequests, setShowRequests] = useState(false);
  const [priorityAdminId, setPriorityAdminId] = useState(null);
  const [approvalResult, setApprovalResult] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showCreateShop, setShowCreateShop] = useState(false);
  const [creatingShop, setCreatingShop] = useState(false);
  const [editingPendingRequest, setEditingPendingRequest] = useState(null);
  const [editingRequestKind, setEditingRequestKind] = useState('');
  const [storeUrlConflictRequestIds, setStoreUrlConflictRequestIds] = useState(new Set());
  const [createStoreUrlError, setCreateStoreUrlError] = useState('');
  const [createForm, setCreateForm] = useState({ shop_name: '', email: '', mobile_no: '', store_url: '', password: '', confirm_password: '', address: '', landmark: '', postalcode: '' });
  const [showCustomDomainModal, setShowCustomDomainModal] = useState(false);
  const [customDomainForm, setCustomDomainForm] = useState(emptyCustomDomainForm);
  const [creatingCustomDomain, setCreatingCustomDomain] = useState(false);

  useEffect(() => {
    const modalOpen = showCreateShop || showCustomDomainModal || showRequests || editingAdmin || viewingAdmin || confirmAdmin || requestAdmin || approvalResult;
    if (!modalOpen) return undefined;

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
  }, [showCreateShop, showCustomDomainModal, showRequests, editingAdmin, viewingAdmin, confirmAdmin, requestAdmin, approvalResult]);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [response, incompleteResponse, declinedResponse] = await Promise.all([
        adminService.getAllAdmins(),
        adminService.getIncompleteAdmins().catch(() => ({ data: [] })),
        adminService.getDeclinedAdmins().catch(() => ({ data: [] })),
      ]);
      const normalizedAdmins = unwrapAdmins(response).map(normalizeAdmin);
      const normalizedIncompleteAdmins = unwrapAdmins(incompleteResponse).map(normalizeAdmin);
      const normalizedDeclinedAdmins = unwrapAdmins(declinedResponse).map(normalizeAdmin);
      setAdmins(normalizedAdmins);
      setIncompleteAdmins(normalizedIncompleteAdmins);
      setDeclinedAdmins((current) => {
        if (normalizedDeclinedAdmins.length === 0) return current;
        const apiIds = new Set(normalizedDeclinedAdmins.map((admin) => String(admin.id)));
        return [...normalizedDeclinedAdmins, ...current.filter((admin) => !apiIds.has(String(admin.id)))];
      });
      return normalizedAdmins;
    } catch (err) {
      if (err.status === 401) {
        localStorage.removeItem('token');
        navigate('/login', { replace: true });
        return;
      }
      setError(err.message || 'Failed to load shops.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const filteredAdmins = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const approvedAdmins = admins.filter(isApproved);
    const statusFiltered = viewMode === 'pending'
      ? incompleteAdmins
      : viewMode === 'declined'
      ? declinedAdmins
      : viewMode === 'blocked'
      ? approvedAdmins.filter(isBlocked)
        : viewMode === 'active'
        ? approvedAdmins.filter((admin) => !isBlocked(admin))
        : approvedAdmins;
    const ordered = [...statusFiltered].sort((first, second) => {
      const firstIsPriority = priorityAdminId != null && String(first.id) === String(priorityAdminId);
      const secondIsPriority = priorityAdminId != null && String(second.id) === String(priorityAdminId);
      if (firstIsPriority !== secondIsPriority) return firstIsPriority ? -1 : 1;
      const firstDate = new Date(String(first.approved_at || first.created_at || '').replace(' ', 'T')).getTime() || 0;
      const secondDate = new Date(String(second.approved_at || second.created_at || '').replace(' ', 'T')).getTime() || 0;
      return secondDate - firstDate;
    });
    if (!query) return ordered;
    return ordered.filter((admin) => [admin.shop_name, admin.mobile_no, admin.email, admin.address, admin.landmark, admin.postalcode]
      .some((value) => String(value || '').toLowerCase().includes(query)));
  }, [admins, incompleteAdmins, declinedAdmins, priorityAdminId, searchTerm, viewMode]);

  const pageCount = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredAdmins.length / pageSize));
  const visibleAdmins = pageSize === 'all' ? filteredAdmins : filteredAdmins.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = admins.filter((admin) => isApproved(admin) && !isBlocked(admin)).length;
  const blockedCount = admins.filter((admin) => isApproved(admin) && isBlocked(admin)).length;
  const pendingRequests = admins.filter((admin) => !isApproved(admin) && !isDeclined(admin));
  const declinedCount = declinedAdmins.length;

  const handleSearch = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const openEdit = (admin) => {
    setEditingAdmin(admin);
    setForm({
      shop_name: admin.shop_name,
      mobile_no: admin.mobile_no,
      email: admin.email,
      address: admin.address,
      landmark: admin.landmark,
      postalcode: admin.postalcode,
      delivery_eligible: admin.delivery_eligible,
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await adminService.updateAdmin(editingAdmin.id, {
        ...form,
        delivery_eligible: Number(form.delivery_eligible) ? 1 : 0,
      });
      toast.success('Admin details updated successfully.');
      setEditingAdmin(null);
      await fetchAdmins();
    } catch (err) {
      if (err.status === 401) navigate('/login', { replace: true });
      else toast.error(err.message || 'Failed to update admin.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBlock = async (admin) => {
    setConfirmAdmin(admin);
  };

  const confirmToggleBlock = async () => {
    if (!confirmAdmin) return;
    const admin = confirmAdmin;
    const blocked = isBlocked(admin);
    setConfirmAdmin(null);
    setActionId(admin.id);
    try {
      if (blocked) await adminService.unblockAdmin(admin.id);
      else await adminService.blockAdmin(admin.id);
      toast.success(`Admin ${blocked ? 'unblocked' : 'blocked'} successfully.`);
      setAdmins((current) => current.map((item) => item.id === admin.id
        ? { ...item, status: blocked ? 1 : 0, is_blocked: blocked ? 0 : 1, is_active: blocked ? 1 : 0 }
        : item));
      await fetchAdmins();
    } catch (err) {
      if (err.status === 401) navigate('/login', { replace: true });
      else toast.error(err.message || 'Failed to update admin status.');
    } finally {
      setActionId(null);
    }
  };

  const approveRequest = async (admin) => {
    setActionId(admin.id);
    try {
      const approvalResponse = await adminService.approveAdmin(admin.id);
      const approvedPayload = unwrapAdmins(approvalResponse).map(normalizeAdmin)[0];
      toast.success(`${admin.shop_name} approved successfully.`);
      setApprovalResult({ message: approvalResponse?.message || 'Admin approved successfully.', shopName: admin.shop_name, details: approvedPayload });
      setAdmins((current) => current.map((item) => item.id === admin.id ? { ...item, ...(approvedPayload || {}), approved: 1 } : item));
      setPriorityAdminId(admin.id);
      setPage(1);
      setRequestAdmin(null);
      setShowRequests(false);
      await fetchAdmins();
      if (approvedPayload) {
        setAdmins((current) => current.map((item) => item.id === admin.id ? { ...item, ...approvedPayload, approved: 1 } : item));
      }
    } catch (err) {
      if (err.status === 401) navigate('/login', { replace: true });
      else {
        const message = err.message || 'Failed to approve shop request.';
        if (/store_url.*already exist|store url.*already exist/i.test(message)) {
          setStoreUrlConflictRequestIds((current) => new Set([...current, String(admin.id)]));
          toast.error('Store URL already exists. Use Edit URL to update it.');
        } else toast.error(message);
      }
    } finally { setActionId(null); }
  };

  const declineRequest = async () => {
    if (!requestAdmin) return;
    const admin = requestAdmin;
    setRequestAdmin(null);
    setActionId(admin.id);
    try {
      const declineResponse = await adminService.declineAdmin(admin.id);
      const declinedPayload = unwrapAdmins(declineResponse).map(normalizeAdmin)[0];
      toast.success('Shop request declined and removed.');
      setAdmins((current) => current.filter((item) => item.id !== admin.id));
      setDeclinedAdmins((current) => {
        const declinedAdmin = { ...admin, ...(declinedPayload || {}), approved: 2 };
        return current.some((item) => String(item.id) === String(admin.id)) ? current : [declinedAdmin, ...current];
      });
      await fetchAdmins();
    } catch (err) {
      if (err.status === 401) navigate('/login', { replace: true });
      else toast.error(err.message || 'Failed to decline shop request.');
    } finally { setActionId(null); }
  };

  const createShopAdmin = async (event) => {
    event.preventDefault();
    setCreateStoreUrlError('');
    if (editingPendingRequest && !createForm.store_url.trim()) {
      toast.error('Please enter a store URL.');
      return;
    }
    if (!editingPendingRequest && Object.values(createForm).some((value) => !String(value).trim())) {
      toast.error('Please complete all required fields.');
      return;
    }
    if (!editingPendingRequest && createForm.password !== createForm.confirm_password) {
      toast.error('Password and confirm password must match.');
      return;
    }
    setCreatingShop(true);
    try {
      if (editingPendingRequest) {
        await adminService.approveAdmin(editingPendingRequest.id, { store_url: createForm.store_url.trim() });
        toast.success('Store URL updated and shop approved successfully.');
        setShowCreateShop(false);
        setEditingPendingRequest(null);
        setEditingRequestKind('');
        setCreateForm({ shop_name: '', email: '', mobile_no: '', store_url: '', password: '', confirm_password: '', address: '', landmark: '', postalcode: '' });
        await fetchAdmins();
        return;
      }
      await shopAdminAPI.createShopAdmin({
        role: '2', shop_name: createForm.shop_name.trim(), email: createForm.email.trim(), mobile_no: createForm.mobile_no.trim(),
        store_url: createForm.store_url.trim(), password: createForm.password, confirm_password: createForm.confirm_password,
        address: createForm.address.trim(), landmark: createForm.landmark.trim(), postalcode: createForm.postalcode.trim(),
      });
      toast.success('New shop admin created successfully.');
      setShowCreateShop(false);
      setCreateForm({ shop_name: '', email: '', mobile_no: '', store_url: '', password: '', confirm_password: '', address: '', landmark: '', postalcode: '' });
      await fetchAdmins();
    } catch (err) {
      const message = err?.response?.data?.message || err.message || 'Unable to create the shop admin.';
      if (/store_url.*already exist|store url.*already exist/i.test(message)) {
        setCreateStoreUrlError(message);
      } else toast.error(message);
    } finally { setCreatingShop(false); }
  };

  const createCustomDomainAdmin = async (event) => {
    event.preventDefault();
    if (Object.values(customDomainForm).some((value) => !String(value).trim())) {
      toast.error('Please complete all custom domain details.');
      return;
    }
    if (customDomainForm.password !== customDomainForm.confirm_password) {
      toast.error('Password and confirm password must match.');
      return;
    }

    setCreatingCustomDomain(true);
    try {
      await adminService.createAdmin({
        shop_name: customDomainForm.shop_name.trim(),
        email: customDomainForm.email.trim(),
        mobile_no: customDomainForm.mobile_no.trim(),
        password: customDomainForm.password,
        confirm_password: customDomainForm.confirm_password,
        domain: customDomainForm.domain.trim().replace(/^https?:\/\//i, '').replace(/\/$/, ''),
        address: customDomainForm.address.trim(),
        landmark: customDomainForm.landmark.trim(),
        postalcode: customDomainForm.postalcode.trim(),
        gst_no: customDomainForm.gst_no.trim(),
        license_no: customDomainForm.license_no.trim(),
      });
      toast.success('Custom domain shop admin created successfully.');
      setShowCustomDomainModal(false);
      setCustomDomainForm(emptyCustomDomainForm);
      await fetchAdmins();
    } catch (err) {
      if (err.status === 401) navigate('/login', { replace: true });
      else toast.error(err.message || 'Unable to create the custom domain shop admin.');
    } finally {
      setCreatingCustomDomain(false);
    }
  };

  const openPendingRequestUrlEditor = (admin, kind = 'pending') => {
    setEditingPendingRequest(admin);
    setEditingRequestKind(kind);
    setCreateStoreUrlError('');
    setCreateForm({
      shop_name: admin.shop_name || '', email: admin.email || '', mobile_no: admin.mobile_no || admin.mobile || '',
      store_url: admin.store_url || admin.storeUrl || '', password: admin.password || '••••••••', confirm_password: admin.confirm_password || '••••••••',
      address: admin.address || '', landmark: admin.landmark || '', postalcode: admin.postalcode || admin.postal_code || '',
    });
    setShowRequests(false);
    setShowCreateShop(true);
  };

  return (
    <div className="dashboard-container shops-page">
      <section className="shops-command-hero">
        <div className="shops-command-copy">
          <div className="shops-command-eyebrow"><span /> Network operations <b>•</b> Live overview</div>
          <h1>Manage your shop network</h1>
          <p>Monitor every storefront, approve new registrations and keep your retail network healthy from one place.</p>
          <div className="shops-command-pills"><span><CheckCircle2 size={14} /> {activeCount} active now</span><span><MapPin size={14} /> Tamil Nadu network</span><span><RefreshCw size={13} /> Synced just now</span></div>
        </div>
        <div className="shops-command-art"><div className="shops-art-ring shops-art-ring-one" /><div className="shops-art-ring shops-art-ring-two" /><Store size={48} strokeWidth={1.4} /><div className="shops-art-node node-one" /><div className="shops-art-node node-two" /><div className="shops-art-node node-three" /></div>
      </section>
      <div className="page-title-row shops-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Store color="#7C3AED" size={24} />
            <span>Shops</span>
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '2px', fontWeight: 600 }}>
            Live admin shops from the Super Admin API.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}><button type="button" className="btn-primary" onClick={() => { setEditingPendingRequest(null); setEditingRequestKind(''); setCreateStoreUrlError(''); setShowCreateShop(true); }} style={{ height: '40px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: '7px', padding: '0 14px' }}><UserPlus size={15} /> Add new shop</button><button type="button" onClick={() => { setCustomDomainForm(emptyCustomDomainForm); setShowCustomDomainModal(true); }} style={{ height: '40px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: '7px', padding: '0 14px', borderRadius: '9px', border: '1px solid #C7D2FE', background: '#EEF2FF', color: '#4338CA', fontWeight: 800, cursor: 'pointer' }}><Globe2 size={15} /> Custom Domain</button><button type="button" onClick={() => setShowRequests(true)} style={{ height: '40px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: '7px', padding: '0 14px', borderRadius: '9px', border: '1px solid #FDE68A', background: '#FFFBEB', color: '#B45309', fontWeight: 800, cursor: 'pointer' }}><AlertCircle size={15} /> Requests <span style={{ minWidth: '21px', height: '21px', padding: '0 5px', borderRadius: '999px', background: '#F59E0B', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>{pendingRequests.length}</span></button><button className="btn-secondary" onClick={fetchAdmins} disabled={loading} style={{ height: '40px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: '6px' }}><RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh</button></div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', marginBottom: '16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontWeight: 700 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: 'TOTAL SHOPS', value: activeCount + blockedCount, color: '#5B5FC7', icon: Store, iconClass: 'icon-3d-dashboard' },
          { label: 'ACTIVE SHOPS', value: activeCount, color: '#059669', icon: CheckCircle2, iconClass: 'icon-3d-orders' },
          { label: 'BLOCKED SHOPS', value: blockedCount, color: '#DC2626', icon: Ban, iconClass: 'icon-3d-staffs' },
          { label: 'PENDING REQUESTS', value: pendingRequests.length, color: '#D97706', icon: AlertCircle, iconClass: 'icon-3d-design' },
          { label: 'DECLINED SHOPS', value: declinedCount, color: '#64748B', icon: Ban, iconClass: 'icon-3d-categories' },
        ].map(({ label, value, color, icon: Icon, iconClass }) => (
          <div key={label} className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className={`nav-icon-3d-box ${iconClass}`} style={{ width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0 }}><Icon size={20} color="#FFF" /></div>
            <div><div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.5px' }}>{label}</div><div style={{ fontSize: '1.4rem', fontWeight: 800, color, marginTop: '2px' }}>{value}</div></div>
          </div>
        ))}
      </div>

      <div className="admin-card" style={{ marginBottom: '16px', padding: '14px 16px' }}>
        <div className="search-input-wrapper" style={{ maxWidth: '460px' }}>
          <Store size={16} color="#64748B" />
          <input className="search-input-field" placeholder="Search shop, mobile, email, or address..." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} />
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 30, overflow: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '16px', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: '13px', background: '#FFFFFF', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { value: 'all', label: `All Shops (${activeCount + blockedCount})` },
          { value: 'active', label: `Active Shops (${activeCount})` },
          { value: 'blocked', label: `Blocked Shops (${blockedCount})` },
          { value: 'pending', label: `Incomplete Shops (${incompleteAdmins.length})` },
          { value: 'declined', label: `Declined Shops (${declinedCount})` },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => { setViewMode(tab.value); setPage(1); }}
            style={{
              padding: '8px 14px',
              borderRadius: '9px',
              border: viewMode === tab.value ? '1px solid #7C3AED' : '1px solid #CBD5E1',
              background: viewMode === tab.value ? '#F3E8FF' : '#FFFFFF',
              color: viewMode === tab.value ? '#6D28D9' : '#64748B',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}</div>
        <div style={{ position: 'relative', zIndex: 40, display: 'flex', alignItems: 'center', gap: '9px', color: '#64748B', fontSize: '0.76rem', fontWeight: 800, whiteSpace: 'nowrap' }}><span>Rows per page</span><button type="button" onClick={() => setPageSizeOpen((open) => !open)} style={{ minWidth: '104px', height: '38px', padding: '0 11px', borderRadius: '9px', border: pageSizeOpen ? '2px solid #6366F1' : '1px solid #CBD5E1', color: '#1E293B', fontWeight: 800, background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}><span>{pageSize === 'all' ? 'All' : pageSize}</span><span style={{ color: '#64748B', fontSize: '0.8rem' }}>{pageSizeOpen ? '▴' : '▾'}</span></button>{pageSizeOpen && <div style={{ position: 'absolute', top: '44px', right: 0, zIndex: 100, width: '104px', boxSizing: 'border-box', padding: '5px', border: '1px solid #D8DEE9', borderRadius: '10px', background: '#FFFFFF', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.14)' }}>{[10, 25, 50, 'all'].map((value) => <button key={value} type="button" onClick={() => { setPageSize(value); setPage(1); setPageSizeOpen(false); }} style={{ display: 'block', width: '100%', boxSizing: 'border-box', border: 0, borderRadius: '7px', padding: '8px 10px', textAlign: 'left', background: pageSize === value ? '#EEF2FF' : '#FFFFFF', color: pageSize === value ? '#4F46E5' : '#334155', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>{value === 'all' ? 'All' : value}</button>)}</div>}</div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', fontSize: '0.9rem', fontWeight: 800, color: '#334155' }}>
          {viewMode === 'blocked' ? 'Blocked Shops — Unblock access from here' : viewMode === 'active' ? 'Active Shops' : viewMode === 'pending' ? 'Pending Shop Requests — Review new shop details' : viewMode === 'declined' ? 'Declined Shops — Previously declined registration requests' : 'All Shops'}
        </div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead><tr><th>Shop Name</th><th>Mobile</th><th>Email</th><th>Address</th><th>Delivery</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="spin" size={24} color="#7C3AED" /></td></tr>
              ) : visibleAdmins.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontWeight: 700 }}>No admins found.</td></tr>
              ) : visibleAdmins.map((admin) => {
                const blocked = isBlocked(admin);
                const declined = isDeclined(admin);
                const pending = !isApproved(admin) && !declined;
                const location = [admin.address, admin.landmark, admin.postalcode].filter(Boolean).join(', ') || '—';
                return (
                  <tr key={admin.id}>
                    <td><strong>{admin.shop_name}</strong></td>
                    <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Phone size={13} color="#64748B" />{admin.mobile_no || '—'}</span></td>
                    <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Mail size={13} color="#64748B" />{admin.email || '—'}</span></td>
                    <td style={{ maxWidth: '280px', whiteSpace: 'normal' }}><span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: '5px' }}><MapPin size={13} color="#64748B" style={{ marginTop: '2px', flexShrink: 0 }} />{location}</span></td>
                    <td><span className="badge" style={{ background: admin.delivery_eligible ? '#DCFCE7' : '#F1F5F9', color: admin.delivery_eligible ? '#15803D' : '#64748B' }}>{admin.delivery_eligible ? 'Eligible' : 'Not Eligible'}</span></td>
                    <td><span className="badge" style={{ background: pending ? '#FEF3C7' : declined ? '#F1F5F9' : blocked ? '#FEE2E2' : '#DCFCE7', color: pending ? '#B45309' : declined ? '#64748B' : blocked ? '#B91C1C' : '#15803D' }}>{pending ? 'Pending' : declined ? 'Declined' : blocked ? 'Blocked' : 'Active'}</span></td>
                    <td><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button className="header-action-btn" onClick={() => setViewingAdmin(admin)} title="View shop details"><Eye size={14} color="#0284C7" /></button>
                      {!pending && !declined && <button className="header-action-btn" onClick={() => openEdit(admin)} title="Edit shop"><Edit2 size={14} color="#7C3AED" /></button>}
                      {pending && <button className="header-action-btn" onClick={() => openPendingRequestUrlEditor(admin, 'incomplete')} title="Edit and approve shop"><Edit2 size={14} color="#7C3AED" /><span>Edit & Approve</span></button>}
                      {!pending && !declined && <>
                      <button className="header-action-btn" onClick={() => handleToggleBlock(admin)} disabled={actionId === admin.id} title={blocked ? 'Unblock admin' : 'Block admin'} style={{ color: blocked ? '#15803D' : '#B91C1C' }}>
                        {actionId === admin.id ? <Loader2 size={14} className="spin" /> : blocked ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                        <span>{blocked ? 'Unblock Shop' : 'Block Shop'}</span>
                      </button></>}
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', padding: '12px 16px', borderTop: '1px solid #F1F5F9' }}><button className="btn-secondary" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Page {page} of {pageCount}</span><button className="btn-secondary" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
      </div>

      {approvalResult && <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}><div className="modal-content" style={{ maxWidth: '540px', padding: 0, overflow: 'hidden', borderRadius: '18px' }} onClick={(event) => event.stopPropagation()}>
        <div style={{ padding: '25px 28px', textAlign: 'center', color: '#FFFFFF', background: 'linear-gradient(135deg, #047857, #10B981)' }}><div style={{ width: '58px', height: '58px', margin: '0 auto 12px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={31} /></div><h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Admin Approved Successfully</h2><div style={{ marginTop: '6px', fontSize: '0.82rem', opacity: 0.9 }}>{approvalResult.shopName}</div></div>
        <div style={{ padding: '22px 26px' }}><div style={{ padding: '12px 14px', marginBottom: '16px', borderRadius: '10px', background: '#ECFDF5', color: '#047857', fontSize: '0.84rem', fontWeight: 700 }}>{approvalResult.message}</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>{[{ label: 'Admin ID', value: approvalResult.details?.id }, { label: 'Database', value: approvalResult.details?.admin_database }, { label: 'Email Sent', value: approvalResult.details?.mail_sent ? 'Yes' : 'No' }, { label: 'WhatsApp Sent', value: approvalResult.details?.whatsapp_sent ? 'Yes' : 'No' }].map(({ label, value }) => <div key={label} style={{ padding: '11px 12px', border: '1px solid #E2E8F0', borderRadius: '10px', background: '#F8FAFC' }}><div style={{ color: '#64748B', fontSize: '0.67rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '5px' }}>{label}</div><div style={{ color: '#1E293B', fontSize: '0.82rem', fontWeight: 750, wordBreak: 'break-word' }}>{value ?? '-'}</div></div>)}</div><div style={{ color: '#334155', fontSize: '0.86rem', fontWeight: 800, marginBottom: '10px' }}>Generated URLs</div><div style={{ display: 'grid', gap: '8px' }}>{[{ label: 'Shop Website', value: approvalResult.details?.urls?.shop_website_url }, { label: 'Admin Panel', value: approvalResult.details?.urls?.admin_panel_url }, { label: 'Billing Page', value: approvalResult.details?.urls?.billing_url }].map(({ label, value }) => <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: '9px', background: '#FFFFFF' }}><span style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 800 }}>{label}</span>{value ? <a href={value} target="_blank" rel="noreferrer" style={{ maxWidth: '72%', color: '#4F46E5', fontSize: '0.78rem', fontWeight: 750, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: 'none' }} title={value}>{value}</a> : <span style={{ color: '#94A3B8' }}>-</span>}</div>)}</div><button type="button" className="btn-primary approval-done-btn" onClick={() => { setApprovalResult(null); fetchAdmins(); }}>Done</button></div>
      </div></div>}

      {showCustomDomainModal && <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}><div className="modal-content" style={{ maxWidth: '680px', padding: 0, overflow: 'hidden', borderRadius: '18px' }} onClick={(event) => event.stopPropagation()}>
        <div style={{ padding: '22px 26px', color: '#FFFFFF', background: 'linear-gradient(135deg, #312E81, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Globe2 size={21} /></div><div><div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase', opacity: 0.8 }}>Super Admin</div><h2 style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 800 }}>Create Custom Domain</h2></div></div><button type="button" className="modal-close" aria-label="Close" onClick={() => { setShowCustomDomainModal(false); setCustomDomainForm(emptyCustomDomainForm); }} style={{ color: '#FFFFFF' }}><X size={20} /></button></div>
        <form onSubmit={createCustomDomainAdmin} style={{ padding: '22px 26px 24px', background: '#FFFFFF' }}>
          <p style={{ margin: '0 0 18px', color: '#64748B', fontSize: '0.84rem', lineHeight: 1.5 }}>Enter the shop and custom domain details. This sends a POST request to the Super Admin API.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px 16px' }}>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>Shop Name<input className="form-input" required value={customDomainForm.shop_name} onChange={(e) => setCustomDomainForm({ ...customDomainForm, shop_name: e.target.value })} placeholder="Digital Crackers" /></label>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>Custom Domain<input className="form-input" required value={customDomainForm.domain} onChange={(e) => setCustomDomainForm({ ...customDomainForm, domain: e.target.value })} placeholder="digitalcrackers.com" /></label>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>Email<input type="email" className="form-input" required value={customDomainForm.email} onChange={(e) => setCustomDomainForm({ ...customDomainForm, email: e.target.value })} placeholder="digital@example.com" /></label>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>Mobile Number<input className="form-input" required value={customDomainForm.mobile_no} onChange={(e) => setCustomDomainForm({ ...customDomainForm, mobile_no: e.target.value })} placeholder="9876543210" /></label>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>Password<input type="password" minLength="6" className="form-input" required value={customDomainForm.password} onChange={(e) => setCustomDomainForm({ ...customDomainForm, password: e.target.value })} placeholder="Minimum 6 characters" /></label>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>Confirm Password<input type="password" minLength="6" className="form-input" required value={customDomainForm.confirm_password} onChange={(e) => setCustomDomainForm({ ...customDomainForm, confirm_password: e.target.value })} placeholder="Re-enter password" /></label>
            <label className="form-label" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '7px' }}>Address<input className="form-input" required value={customDomainForm.address} onChange={(e) => setCustomDomainForm({ ...customDomainForm, address: e.target.value })} placeholder="Test address" /></label>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>Landmark<input className="form-input" required value={customDomainForm.landmark} onChange={(e) => setCustomDomainForm({ ...customDomainForm, landmark: e.target.value })} placeholder="Near bus stand" /></label>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>Postal Code<input inputMode="numeric" className="form-input" required value={customDomainForm.postalcode} onChange={(e) => setCustomDomainForm({ ...customDomainForm, postalcode: e.target.value })} placeholder="600001" /></label>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>GST Number<input className="form-input" required value={customDomainForm.gst_no} onChange={(e) => setCustomDomainForm({ ...customDomainForm, gst_no: e.target.value })} placeholder="33ABCDE1234F1Z5" /></label>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>License Number<input className="form-input" required value={customDomainForm.license_no} onChange={(e) => setCustomDomainForm({ ...customDomainForm, license_no: e.target.value })} placeholder="LIC123456" /></label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px', paddingTop: '18px', borderTop: '1px solid #E2E8F0' }}><button type="button" className="btn-secondary" disabled={creatingCustomDomain} onClick={() => { setShowCustomDomainModal(false); setCustomDomainForm(emptyCustomDomainForm); }}>Cancel</button><button type="submit" className="btn-primary" disabled={creatingCustomDomain}>{creatingCustomDomain ? <><Loader2 size={15} className="spin" /> Creating...</> : <><Globe2 size={15} /> Create Custom Domain</>}</button></div>
        </form>
      </div></div>}

      {showCreateShop && <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}><div className="modal-content create-shop-modal" style={{ maxWidth: '620px', padding: 0, overflow: 'hidden', borderRadius: '18px' }} onClick={(event) => event.stopPropagation()}>
        <div className="create-shop-modal-header"><div className="create-shop-modal-icon"><UserPlus size={22} /></div><div><div className="create-shop-modal-kicker">{editingRequestKind === 'incomplete' ? 'Incomplete request correction' : editingPendingRequest ? 'Pending request correction' : 'Network onboarding'}</div><h2>{editingPendingRequest ? (editingRequestKind === 'incomplete' ? 'Update shop details' : 'Update store URL') : 'Create a new shop admin'}</h2><p>{editingRequestKind === 'incomplete' ? 'Update the incomplete shop details and approve the request.' : editingPendingRequest ? 'Only the store URL can be changed before approval.' : 'Create the account that will manage this shop.'}</p></div><button type="button" className="modal-close create-shop-close" aria-label="Close" onClick={() => { setShowCreateShop(false); setEditingPendingRequest(null); setEditingRequestKind(''); setCreateStoreUrlError(''); }}><X size={20} /></button></div>
        <form onSubmit={createShopAdmin} className="create-shop-form">
          <div className="create-shop-section"><span>Admin signup details</span><div className="create-shop-grid">
            <label>Role<input value="2" readOnly aria-label="Role" /></label>
            <label>Shop name<input required disabled={Boolean(editingPendingRequest) && editingRequestKind !== 'incomplete'} value={createForm.shop_name} onChange={(event) => setCreateForm({ ...createForm, shop_name: event.target.value })} placeholder="Ruban Crackers" /></label>
            <label>Email<input required disabled={Boolean(editingPendingRequest) && editingRequestKind !== 'incomplete'} type="email" value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} placeholder="shop@example.com" /></label>
            <label>Mobile number<input required disabled={Boolean(editingPendingRequest) && editingRequestKind !== 'incomplete'} value={createForm.mobile_no} onChange={(event) => setCreateForm({ ...createForm, mobile_no: event.target.value })} placeholder="e.g. 9585122665" /></label>
            <label>Store URL<div className={`store-url-input ${createStoreUrlError ? 'store-url-input-error' : ''}`}><input required aria-invalid={Boolean(createStoreUrlError)} value={createForm.store_url} onChange={(event) => { setCreateForm({ ...createForm, store_url: toStoreUrlSlug(event.target.value) }); setCreateStoreUrlError(''); }} placeholder="e.g. smart-crackers" /><span>.pattaz.com</span></div>{createStoreUrlError && <small className="field-error-message">{createStoreUrlError}</small>}</label>
            <label>Password<input required disabled={Boolean(editingPendingRequest) && editingRequestKind !== 'incomplete'} minLength="6" type="password" value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} placeholder="Minimum 6 characters" /></label>
            <label>Confirm password<input required disabled={Boolean(editingPendingRequest) && editingRequestKind !== 'incomplete'} minLength="6" type="password" value={createForm.confirm_password} onChange={(event) => setCreateForm({ ...createForm, confirm_password: event.target.value })} placeholder="Re-enter password" /></label>
            <label>Address<input required disabled={Boolean(editingPendingRequest) && editingRequestKind !== 'incomplete'} value={createForm.address} onChange={(event) => setCreateForm({ ...createForm, address: event.target.value })} placeholder="Shop address" /></label>
            <label>Landmark<input required disabled={Boolean(editingPendingRequest) && editingRequestKind !== 'incomplete'} value={createForm.landmark} onChange={(event) => setCreateForm({ ...createForm, landmark: event.target.value })} placeholder="e.g. Madurai" /></label>
            <label>Postal code<input required disabled={Boolean(editingPendingRequest) && editingRequestKind !== 'incomplete'} value={createForm.postalcode} onChange={(event) => setCreateForm({ ...createForm, postalcode: event.target.value })} placeholder="e.g. 600001" /></label>
          </div></div>
          <div className="create-shop-form-footer"><small>{editingRequestKind === 'incomplete' ? 'Correct the incomplete details, then approve this shop.' : editingPendingRequest ? 'All request details are locked; change the Store URL and update.' : 'Creates an AdminSignup account with shop role access.'}</small><div><button type="button" className="btn-secondary" onClick={() => { setShowCreateShop(false); setEditingPendingRequest(null); setEditingRequestKind(''); setCreateStoreUrlError(''); }} disabled={creatingShop}>Cancel</button><button type="submit" className="btn-primary" disabled={creatingShop}>{creatingShop ? <><Loader2 size={15} className="spin" /> Updating...</> : editingPendingRequest ? 'Update & approve' : <><UserPlus size={15} /> Create shop admin</>}</button></div></div>
        </form>
      </div></div>}

      {showRequests && <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}><div className="modal-content" style={{ maxWidth: '650px', padding: 0, overflow: 'hidden', borderRadius: '18px' }} onClick={(event) => event.stopPropagation()}>
        <div className="pending-requests-header" style={{ padding: '22px 26px', background: 'linear-gradient(135deg, #FFFBEB, #FFF7ED)', borderBottom: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#F59E0B', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertCircle size={21} /></div><div><div style={{ color: '#B45309', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Pending approvals</div><h2 style={{ margin: '4px 0 0', color: '#78350F', fontSize: '1.2rem', fontWeight: 800 }}>Shop Requests <span style={{ color: '#B45309' }}>({pendingRequests.length})</span></h2></div></div><button className="modal-close pending-requests-close" aria-label="Close shop requests" onClick={() => setShowRequests(false)}><X size={20} /></button></div>
        <div style={{ padding: '20px 26px', maxHeight: '62vh', overflowY: 'auto' }}>{pendingRequests.length === 0 ? <div style={{ padding: '38px 20px', textAlign: 'center', color: '#64748B' }}><CheckCircle2 size={30} color="#10B981" /><div style={{ marginTop: '10px', fontWeight: 800, color: '#334155' }}>No pending shop requests</div></div> : pendingRequests.map((admin) => <div key={admin.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '14px', marginBottom: '10px', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#FFFFFF' }}><div style={{ minWidth: 0 }}><div style={{ color: '#1E293B', fontWeight: 800, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{admin.shop_name}</div><div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '4px' }}>{admin.mobile_no || '-'} {admin.email ? `• ${admin.email}` : ''}</div></div><div style={{ display: 'flex', gap: '7px', flexShrink: 0 }}>{storeUrlConflictRequestIds.has(String(admin.id)) && <button type="button" onClick={() => openPendingRequestUrlEditor(admin)} disabled={actionId === admin.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 11px', border: '1px solid #C7D2FE', borderRadius: '8px', background: '#EEF2FF', color: '#4F46E5', fontWeight: 800, cursor: 'pointer' }}><Edit2 size={14} /> Edit URL</button>}<button type="button" onClick={() => approveRequest(admin)} disabled={actionId === admin.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 11px', border: 0, borderRadius: '8px', background: '#DCFCE7', color: '#15803D', fontWeight: 800, cursor: 'pointer' }}>{actionId === admin.id ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />} Approve</button><button type="button" onClick={() => setRequestAdmin(admin)} disabled={actionId === admin.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 11px', border: '1px solid #FECACA', borderRadius: '8px', background: '#FFF1F2', color: '#DC2626', fontWeight: 800, cursor: 'pointer' }}><Ban size={14} /> Decline</button></div></div>)}</div>
      </div></div>}

      {requestAdmin && <div className="modal-backdrop" style={{ zIndex: 1200 }} onClick={(event) => event.stopPropagation()}><div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '28px 26px', borderRadius: '16px' }} onClick={(event) => event.stopPropagation()}><div style={{ width: '52px', height: '52px', margin: '0 auto 14px', borderRadius: '50%', background: '#FFF1F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ban size={25} /></div><h3 style={{ margin: '0 0 8px', color: '#0F172A', fontSize: '1.08rem', fontWeight: 800 }}>Decline this shop request?</h3><p style={{ margin: '0 auto 22px', color: '#64748B', fontSize: '0.83rem', lineHeight: 1.5 }}>“{requestAdmin.shop_name}” will be removed from the pending requests list.</p><div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}><button type="button" className="btn-secondary" onClick={() => setRequestAdmin(null)}>Cancel</button><button type="button" onClick={declineRequest} disabled={actionId === requestAdmin.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', border: 0, borderRadius: '8px', background: '#DC2626', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}>{actionId === requestAdmin.id && <Loader2 size={14} className="spin" />}Decline Request</button></div></div></div>}

      {editingAdmin && <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}><div className="modal-content" style={{ maxWidth: '720px', padding: 0, overflow: 'hidden', borderRadius: '18px' }} onClick={(event) => event.stopPropagation()}>
        <div style={{ padding: '24px 28px 22px', color: '#FFFFFF', background: 'linear-gradient(135deg, #3730A3 0%, #5B5FC7 58%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}><div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Store size={22} /></div><div><div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', opacity: 0.78 }}>Shop management</div><h2 style={{ margin: '4px 0 0', fontSize: '1.3rem', fontWeight: 800 }}>Edit Admin Details</h2></div></div>
          <button onClick={() => setEditingAdmin(null)} aria-label="Close" style={{ width: '34px', height: '34px', border: 0, borderRadius: '9px', background: 'rgba(255,255,255,0.14)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSave} style={{ padding: '24px 28px 26px', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#334155', fontSize: '0.88rem', fontWeight: 800 }}><Store size={16} color="#5B5FC7" /> Basic Information</div>
          <div style={{ padding: '18px', border: '1px solid #E2E8F0', borderRadius: '14px', background: '#F8FAFC', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 18px' }}>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>Shop Name<input className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} required value={form.shop_name || ''} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} /></label>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>Mobile Number<input className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={form.mobile_no || ''} onChange={(e) => setForm({ ...form, mobile_no: e.target.value })} /></label>
            <label className="form-label" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>Email Address<input type="email" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '22px 0 16px', color: '#334155', fontSize: '0.88rem', fontWeight: 800 }}><MapPin size={16} color="#5B5FC7" /> Location & Delivery</div>
          <div style={{ padding: '18px', border: '1px solid #E2E8F0', borderRadius: '14px', background: '#F8FAFC', display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '16px 18px' }}>
            <label className="form-label" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>Address<textarea className="form-input" style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} rows="3" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>Landmark<input className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={form.landmark || ''} onChange={(e) => setForm({ ...form, landmark: e.target.value })} /></label>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>Postal Code<input className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={form.postalcode || ''} onChange={(e) => setForm({ ...form, postalcode: e.target.value })} /></label>
            <label className="form-label" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>Delivery Eligibility<select className="form-select" style={{ width: '100%', boxSizing: 'border-box' }} value={form.delivery_eligible} onChange={(e) => setForm({ ...form, delivery_eligible: Number(e.target.value) })}><option value={1}>Eligible for delivery</option><option value={0}>Not eligible for delivery</option></select></label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E2E8F0' }}><span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>Changes will be applied to this shop account.</span><div style={{ display: 'flex', gap: '10px' }}><button type="button" className="btn-secondary" onClick={() => setEditingAdmin(null)}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? <><Loader2 size={15} className="spin" /> Saving...</> : 'Save Changes'}</button></div></div>
        </form>
      </div></div>}

      {viewingAdmin && <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
        <div className="modal-content" style={{ maxWidth: '700px', padding: 0, overflow: 'hidden', borderRadius: '18px' }} onClick={(event) => event.stopPropagation()}>
          <div style={{ padding: '24px 28px', color: '#FFFFFF', background: 'linear-gradient(135deg, #3730A3 0%, #5B5FC7 58%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}><div style={{ width: '46px', height: '46px', borderRadius: '13px', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Store size={23} /></div><div><div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', opacity: 0.78 }}>Shop profile</div><h2 style={{ margin: '4px 0 0', fontSize: '1.3rem', fontWeight: 800 }}>{viewingAdmin.shop_name}</h2></div></div>
            <button onClick={() => setViewingAdmin(null)} aria-label="Close" style={{ width: '34px', height: '34px', border: 0, borderRadius: '9px', background: 'rgba(255,255,255,0.14)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
          </div>
          <div style={{ padding: '24px 28px', maxHeight: '68vh', overflowY: 'auto', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 15px', marginBottom: '20px', borderRadius: '12px', background: isBlocked(viewingAdmin) ? '#FEF2F2' : '#ECFDF5', color: isBlocked(viewingAdmin) ? '#B91C1C' : '#047857' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 800 }}>{isBlocked(viewingAdmin) ? <Ban size={16} /> : <CheckCircle2 size={16} />}{isBlocked(viewingAdmin) ? 'This admin account is blocked' : 'This admin account is active'}</div><span style={{ fontSize: '0.72rem', fontWeight: 900 }}>{isBlocked(viewingAdmin) ? 'BLOCKED' : 'ACTIVE'}</span></div>
            {(viewingAdmin.urls || viewingAdmin.domain) && <div style={{ marginBottom: '22px' }}><div style={{ color: '#334155', fontSize: '0.88rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Store size={16} color="#5B5FC7" /> Website & Platform URLs</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>{[{ label: 'Shop Website', value: viewingAdmin.urls?.shop_website_url || (viewingAdmin.domain ? `https://${viewingAdmin.domain}` : '') }, { label: 'Admin Panel', value: FIXED_ADMIN_PANEL_URL }, { label: 'Billing Page', value: FIXED_BILLING_URL }].map(({ label, value }) => <div key={label} style={{ minWidth: 0, padding: '12px 13px', border: '1px solid #D9E2F0', borderRadius: '10px', background: '#F8FAFC' }}><div style={{ color: '#64748B', fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>{value ? <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noreferrer" title={value} style={{ display: 'block', color: '#4F46E5', fontSize: '0.78rem', fontWeight: 750, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: 'none' }}>{value}</a> : <div style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 700 }}>-</div>}</div>)}</div></div>}
            <div style={{ color: '#334155', fontSize: '0.88rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Store size={16} color="#5B5FC7" /> Shop Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Admin ID', value: viewingAdmin.id, icon: Store },
                { label: 'Mobile', value: viewingAdmin.mobile_no, icon: Phone },
                { label: 'Email', value: viewingAdmin.email, icon: Mail },
                { label: 'Address', value: viewingAdmin.address, icon: MapPin },
                { label: 'Landmark', value: viewingAdmin.landmark, icon: MapPin },
                { label: 'Postal Code', value: viewingAdmin.postalcode, icon: MapPin },
                { label: 'Store URL', value: viewingAdmin.store_url, icon: Store },
                { label: 'Shop Code', value: viewingAdmin.shop_code, icon: Store },
                { label: 'GST Number', value: viewingAdmin.gst_no, icon: CheckCircle2 },
                { label: 'License Number', value: viewingAdmin.license_no, icon: CheckCircle2 },
                { label: 'Delivery', value: Number(viewingAdmin.delivery_eligible) ? 'Eligible' : 'Not Eligible', icon: CheckCircle2 },
                { label: 'Approval', value: Number(viewingAdmin.approved) ? 'Approved' : 'Not Approved', icon: CheckCircle2 },
                { label: 'Approved At', value: viewingAdmin.approved_at, icon: CheckCircle2 },
                { label: 'Created At', value: viewingAdmin.created_at, icon: CheckCircle2 },
                { label: 'Blocked Flag', value: String(viewingAdmin.is_blocked) === '1' ? 'Blocked (1)' : 'Active (0)', icon: Ban },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '10px', background: '#F8FAFC', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '5px' }}><Icon size={13} /> {label}</div>
                  <div style={{ color: '#1E293B', fontSize: '0.84rem', fontWeight: 700, wordBreak: 'break-word' }}>{value || '—'}</div>
                </div>
              ))}
            </div>
            {viewingAdmin.footer_image && <div style={{ marginTop: '14px', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '10px', background: '#F8FAFC' }}>
              <div style={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>Footer Image</div>
              <img src={viewingAdmin.footer_image} alt="Shop footer" style={{ width: '100%', maxHeight: '120px', objectFit: 'contain', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0' }} />
            </div>}
          </div>
        </div>
      </div>}

      {confirmAdmin && <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
        <div className="modal-content" style={{ maxWidth: '390px', textAlign: 'center', padding: '28px 26px' }} onClick={(event) => event.stopPropagation()}>
          <div style={{ width: '54px', height: '54px', margin: '0 auto 16px', borderRadius: '50%', background: isBlocked(confirmAdmin) ? '#DCFCE7' : '#FEE2E2', color: isBlocked(confirmAdmin) ? '#15803D' : '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isBlocked(confirmAdmin) ? <CheckCircle2 size={27} /> : <Ban size={27} />}
          </div>
          <h3 style={{ margin: '0 0 8px', color: '#0F172A', fontSize: '1.08rem', fontWeight: 800 }}>
            {isBlocked(confirmAdmin) ? 'Unblock this shop?' : 'Block this shop?'}
          </h3>
          <p style={{ margin: '0 auto 22px', maxWidth: '280px', color: '#64748B', fontSize: '0.84rem', lineHeight: 1.5 }}>
            {isBlocked(confirmAdmin) ? 'This shop will be allowed to access the admin panel again.' : 'This shop will no longer be allowed to access the admin panel.'}
          </p>
          <strong style={{ display: 'block', marginBottom: '20px', color: '#334155', fontSize: '0.9rem' }}>{confirmAdmin.shop_name}</strong>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmAdmin(null)}>Cancel</button>
            <button type="button" className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: isBlocked(confirmAdmin) ? '#059669' : '#DC2626' }} onClick={confirmToggleBlock}>
              {isBlocked(confirmAdmin) ? 'Unblock Shop' : 'Block Shop'}
            </button>
          </div>
        </div>
      </div>}
    </div>
  );
}
