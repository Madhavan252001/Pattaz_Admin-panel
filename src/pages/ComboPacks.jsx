import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { comboPackAPI, productAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';
import {
  Package, Plus, Trash2, Edit, X, RefreshCw, Loader2, AlertCircle, CheckCircle2,
  Search, Filter, Tag, Check, ShoppingCart, Eye, Boxes, Image as ImageIcon, ChevronDown,
  IndianRupee
} from 'lucide-react';

/**
 * Helper to extract valid image URL from a product object
 */
const getProductImage = (prod) => {
  if (!prod) return '';
  let url = '';
  if (typeof prod === 'string') {
    url = prod;
  } else if (prod.product_images && Array.isArray(prod.product_images) && prod.product_images.length > 0) {
    const imgObj = prod.product_images.find(i => i.media_type === 'image' || (i.images && String(i.images).match(/\.(jpg|jpeg|png|webp|gif)/i))) || prod.product_images[0];
    if (imgObj) {
      url = imgObj.images || imgObj.image || imgObj.url || '';
    }
  } else if (Array.isArray(prod.images) && prod.images.length > 0) {
    url = typeof prod.images[0] === 'string' ? prod.images[0] : (prod.images[0].images || prod.images[0].url || '');
  } else if (typeof prod.image === 'string' && prod.image) {
    url = prod.image;
  } else if (typeof prod.images === 'string' && prod.images) {
    url = prod.images;
  } else if (typeof prod.product_image === 'string' && prod.product_image) {
    url = prod.product_image;
  } else if (typeof prod.img === 'string' && prod.img) {
    url = prod.img;
  }

  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `https://offer360.in${url.startsWith('/') ? '' : '/'}${url}`;
};

/**
 * Custom Searchable Product Select Dropdown displaying Product Images, Names & Prices
 */
function CustomProductSelectWithImage({ products, selectedIds = [], onChange, placeholder, excludedIds = [] }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 });
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (triggerRef.current && triggerRef.current.contains(event.target)) return;
      if (popupRef.current && popupRef.current.contains(event.target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const computePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < 430;
    const maxHeight = openUp
      ? Math.max(180, Math.min(420, Math.floor(spaceAbove) - 14))
      : Math.max(180, Math.min(420, Math.floor(spaceBelow) - 14));
    setPos({
      top: openUp ? rect.top - 8 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      maxHeight
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    computePosition();
    const handleScroll = () => computePosition();
    const handleResize = () => computePosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      computePosition();
    }
  };

  const filteredProds = products.filter((p) => {
    const name = (p.name || p.product_name || '').toLowerCase();
    const code = String(p.id || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
  });

  const isChecked = (pid) => selectedIds.some((id) => Number(id) === Number(pid));

  const toggleItem = (pid) => {
    if (isChecked(pid)) {
      onChange(selectedIds.filter((id) => Number(id) !== Number(pid)));
    } else {
      onChange([...selectedIds, pid]);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleDropdown}
        style={{
          width: '100%',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 14px',
          background: '#FFFFFF',
          border: isOpen ? '2px solid #5B5FC7' : '1px solid #CBD5E1',
          borderRadius: '10px',
          fontSize: '0.88rem',
          fontWeight: 700,
          color: '#0F172A',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 0 3px rgba(91, 95, 199, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.15s ease',
          textAlign: 'left'
        }}
      >
        {selectedIds.length > 0 ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontWeight: 800, color: '#5B5FC7', background: '#EEF2FF',
            borderRadius: '999px', padding: '4px 12px', fontSize: '0.8rem',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            <Check size={13} color="#5B5FC7" strokeWidth={3} />
            {selectedIds.length} {t('combo.products_selected')}
          </span>
        ) : (
          <span style={{ color: '#94A3B8', fontWeight: 600 }}>{placeholder || t('combo.select_product_by_image')}</span>
        )}
        <ChevronDown size={18} color="#64748B" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>

      {/* Floating Searchable Popover List - rendered via portal to body so modal overflow can't clip it */}
      {isOpen && createPortal(
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 1000,
            background: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.06)',
            padding: '8px',
            maxHeight: pos.maxHeight,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder={t('combo.search_products_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                height: '36px',
                paddingLeft: '32px',
                paddingRight: '30px',
                fontSize: '0.82rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                outline: 'none',
                fontWeight: 600
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                title={t('combo.clear_search')}
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: '#E2E8F0', border: 'none', color: '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0
                }}
              >
                <X size={12} strokeWidth={3} />
              </button>
            )}
          </div>

          {/* Product Items List - inner scroll when more than 5 products */}
          <div style={{
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
            maxHeight: Math.max(160, Math.min(300, pos.maxHeight - 110)),
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            paddingRight: filteredProds.length > 5 ? '2px' : '0',
            scrollbarWidth: 'thin',
            scrollbarColor: '#C7D2FE transparent'
          }}>
            {filteredProds.length === 0 ? (
              <div style={{ padding: '14px', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>
                {t('combo.no_products_matching')} "{searchTerm}"
              </div>
            ) : (
              filteredProds.map((prod) => {
                const checked = isChecked(prod.id);
                const alreadyAdded = excludedIds.some((id) => Number(id) === Number(prod.id));
                const disabled = alreadyAdded;
                const img = getProductImage(prod);
                const origPrice = prod.product_original_price || prod.original_price || prod.originalPrice || 0;

                return (
                  <div
                    key={prod.id}
                    onClick={() => { if (!disabled) toggleItem(prod.id); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: checked ? '#EEF2FF' : disabled ? '#F8FAFC' : 'transparent',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.55 : 1,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => { if (!checked && !disabled) e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { if (!checked && !disabled) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      {/* Checkbox */}
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '5px',
                        border: checked ? '2px solid #5B5FC7' : '1.5px solid #CBD5E1',
                        background: checked ? '#5B5FC7' : '#FFFFFF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, boxShadow: checked ? '0 0 0 2px rgba(91, 95, 199, 0.2)' : 'none'
                      }}>
                        {checked && <Check size={11} color="#FFFFFF" strokeWidth={4} />}
                      </div>

                      <div style={{
                        width: '38px', height: '38px', borderRadius: '8px',
                        background: '#F1F5F9', border: '1px solid #CBD5E1',
                        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {img ? (
                          <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <ImageIcon size={18} color="#94A3B8" />
                        )}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.85rem', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', wordBreak: 'break-word', lineHeight: 1.2 }}>
                          {prod.name || prod.product_name}
                        </span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.76rem' }}>
                          <span style={{ color: '#166534', fontWeight: 800 }}>₹{origPrice}</span>
                        </div>
                      </div>
                    </div>

                    {alreadyAdded && (
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        color: '#15803D',
                        background: '#DCFCE7',
                        border: '1px solid #BBF7D0',
                        padding: '3px 8px',
                        borderRadius: '999px',
                        flexShrink: 0,
                        letterSpacing: '0.3px'
                      }}>
                        {t('combo.selected')}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Selection Footer */}
          {selectedIds.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderTop: '1px solid #E2E8F0', paddingTop: '8px', marginTop: '2px'
            }}>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.76rem', fontWeight: 800, color: '#5B5FC7' }}>
                {selectedIds.length} {t('combo.products_selected')}
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                style={{
                  fontSize: '0.72rem', fontWeight: 700, color: '#EF4444',
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: '6px', padding: '3px 10px', cursor: 'pointer'
                }}
              >
                {t('combo.clear_selection')}
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function ComboPacks() {
  const { t } = useLanguage();
  const [comboPacks, setComboPacks] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [viewingCombo, setViewingCombo] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsgValue] = useState('');
  const setErrorMsg = (message) => { setErrorMsgValue(message); if (message) toast.error(message); };
  const [modalError, setModalError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }

  // Initial form state
  const initialFormState = {
    name: '',
    description: '',
    combo_price: '',
    products: [] // Array of { product_id, quantity, product_name, product_image, product_discount_price }
  };

  const [formData, setFormData] = useState(initialFormState);

  // Selected products picker state inside modal (multi-select)
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Fetch Combo Packs & Available Products on Mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [comboRes, prodRes] = await Promise.all([
        comboPackAPI.getComboPacks().catch((err) => {
          console.warn('Combo packs fetch failed:', err.message);
          return null;
        }),
        productAPI.getProducts().catch((err) => {
          console.warn('Products fetch failed:', err.message);
          return null;
        })
      ]);

      // Handle Combo Packs Response
      let comboList = [];
      if (comboRes) {
        if (Array.isArray(comboRes)) {
          comboList = comboRes;
        } else if (comboRes.success && Array.isArray(comboRes.data)) {
          comboList = comboRes.data;
        } else if (Array.isArray(comboRes.data)) {
          comboList = comboRes.data;
        }
      }
      setComboPacks(comboList);

      // Handle Available Products Response
      let prodList = [];
      if (prodRes) {
        if (Array.isArray(prodRes)) {
          prodList = prodRes;
        } else if (prodRes.success && Array.isArray(prodRes.data)) {
          prodList = prodRes.data;
        } else if (Array.isArray(prodRes.data)) {
          prodList = prodRes.data;
        }
      }
      setAvailableProducts(prodList);
    } catch (err) {
      console.error('Error in fetchData:', err);
      setErrorMsg(t('combo.load_failed'));
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCombo(null);
    setFormData(initialFormState);
    setSelectedProductIds([]);
    setModalError('');
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingCombo(item);

    // Map existing products array to { product_id, quantity, product_name, product_image, ... }
    const existingProducts = (item.products || []).map(p => {
      const matchedProd = availableProducts.find(ap => Number(ap.id) === Number(p.product_id));
      const img = p.product_image || p.image || (matchedProd ? getProductImage(matchedProd) : '');
      return {
        product_id: p.product_id,
        quantity: Number(p.quantity) || 1,
        product_name: p.product_name || (matchedProd ? (matchedProd.name || matchedProd.product_name) : `${t('combo.product_hash')}${p.product_id}`),
        product_original_price: p.product_original_price || (matchedProd ? (matchedProd.product_original_price || matchedProd.original_price || matchedProd.originalPrice || 0) : 0),
        product_discount_price: p.product_discount_price || (matchedProd ? (matchedProd.product_discount_price || matchedProd.discounted_price || matchedProd.discountedPrice || matchedProd.price || 0) : 0),
        product_image: img
      };
    });

    setFormData({
      name: item.name || '',
      description: item.description || '',
      combo_price: item.combo_price !== undefined ? item.combo_price : '',
      products: existingProducts
    });

    setSelectedProductIds([]);
    setModalError('');
    setShowModal(true);
  };

  const handleAddProductToCombo = () => {
    if (!selectedProductIds || selectedProductIds.length === 0) {
      setModalError(t('combo.select_product_to_add'));
      return;
    }
    const qty = 1;
    let updatedProducts = [...formData.products];

    selectedProductIds.forEach((rawPid) => {
      const pid = Number(rawPid);
      const existingIdx = updatedProducts.findIndex(p => Number(p.product_id) === pid);
      const prodInfo = availableProducts.find(p => Number(p.id) === pid);

      if (existingIdx >= 0) {
        updatedProducts[existingIdx].quantity += qty;
      } else {
        updatedProducts.push({
          product_id: pid,
          quantity: qty,
          product_name: prodInfo ? (prodInfo.name || prodInfo.product_name) : `${t('combo.product_hash')}${pid}`,
          product_original_price: prodInfo ? (prodInfo.product_original_price || prodInfo.original_price || prodInfo.originalPrice || 0) : 0,
          product_discount_price: prodInfo ? (prodInfo.product_discount_price || prodInfo.discounted_price || prodInfo.discountedPrice || prodInfo.price || 0) : 0,
          product_image: prodInfo ? getProductImage(prodInfo) : ''
        });
      }
    });

    setFormData({ ...formData, products: updatedProducts });
    setSelectedProductIds([]);
    setModalError('');
  };

  const handleRemoveProductFromCombo = (productId) => {
    const updatedProducts = formData.products.filter(p => Number(p.product_id) !== Number(productId));
    setFormData({ ...formData, products: updatedProducts });
  };

  const handleUpdateProductQty = (productId, delta) => {
    const updatedProducts = formData.products.map(p => {
      if (Number(p.product_id) === Number(productId)) {
        const newQty = Math.max(1, (Number(p.quantity) || 0) + delta);
        return { ...p, quantity: newQty };
      }
      return p;
    });
    setFormData({ ...formData, products: updatedProducts });
  };

  const handleSetProductQty = (productId, value) => {
    const quantity = value === '' ? '' : Math.max(1, Number(value) || 1);
    const updatedProducts = formData.products.map((p) => (
      Number(p.product_id) === Number(productId) ? { ...p, quantity } : p
    ));
    setFormData({ ...formData, products: updatedProducts });
  };

  const [productAddError, setProductAddError] = useState(false);
  const productAddErrorTimerRef = useRef(null);

  const triggerAddProductError = () => {
    setProductAddError(false);
    requestAnimationFrame(() => setProductAddError(true));
    clearTimeout(productAddErrorTimerRef.current);
    productAddErrorTimerRef.current = setTimeout(() => setProductAddError(false), 3000);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.products || formData.products.length < 2) {
      triggerAddProductError();
      return;
    }

    if (!formData.name.trim()) {
      setModalError(t('combo.name_required'));
      return;
    }

    if (formData.combo_price === '' || Number(formData.combo_price) < 0) {
      setModalError(t('combo.valid_price_required'));
      return;
    }

    setSaving(true);
    setModalError('');

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      combo_price: Number(formData.combo_price),
      products: formData.products.map(p => ({
        product_id: Number(p.product_id),
        quantity: Number(p.quantity)
      }))
    };

    try {
      let res;
      if (editingCombo) {
        res = await comboPackAPI.updateComboPack(editingCombo.id, payload);
      } else {
        res = await comboPackAPI.createComboPack(payload);
      }

      if (res && (res.success || res.status === 200 || res.status === 201 || res.id || res.data)) {
        setSuccessMsg(res.message || (editingCombo ? t('combo.updated_success') : t('combo.created_success')));
        setShowModal(false);
        fetchData();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else if (res && res.message) {
        setModalError(res.message);
      } else {
        setSuccessMsg(editingCombo ? t('combo.updated_short') : t('combo.created_short'));
        setShowModal(false);
        fetchData();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Combo Pack submission error:', err);
      setModalError(err.message || t('combo.save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeletingId(id);
    setErrorMsg('');

    try {
      const res = await comboPackAPI.deleteComboPack(id);
      setSuccessMsg(res?.message || `${t('combo.deleted_success')} "${name}"`);
      setDeleteTarget(null);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Delete combo pack error:', err);
      setErrorMsg(err.message || t('combo.delete_failed'));
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  // Helper calculation for form modal preview
  const formOriginalTotal = formData.products.reduce((sum, p) => {
    const prod = availableProducts.find(item => Number(item.id) === Number(p.product_id));
    const origPrice = prod ? Number(prod.product_original_price || prod.original_price || prod.originalPrice || prod.price || 0) : Number(p.product_original_price || 0);
    return sum + (origPrice * p.quantity);
  }, 0);

  const formDiscountedTotal = formData.products.reduce((sum, p) => {
    const prod = availableProducts.find(item => Number(item.id) === Number(p.product_id));
    const discPrice = prod ? Number(prod.product_discount_price || prod.discounted_price || prod.discountedPrice || prod.price || 0) : Number(p.product_discount_price || 0);
    return sum + (discPrice * p.quantity);
  }, 0);

  const formDiscountSavings = Math.max(0, formOriginalTotal - (Number(formData.combo_price) || 0));

  // Filtered List for Main Table
  const filteredComboPacks = comboPacks.filter(item => {
    const nameMatch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const isItemActive = item.is_active !== "0" && item.is_active !== 0 && item.is_active !== false;
    const statusMatch = filterStatus === 'all' ||
                        (filterStatus === 'active' && isItemActive) ||
                        (filterStatus === 'inactive' && !isItemActive);

    return nameMatch && statusMatch;
  });

  // Calculate Summary Cards
  const totalCount = comboPacks.length;
  const activeCount = comboPacks.filter(c => c.is_active !== "0" && c.is_active !== 0 && c.is_active !== false).length;
  const totalProductsIncluded = comboPacks.reduce((sum, c) => sum + (c.products ? c.products.length : 0), 0);
  const avgComboPrice = totalCount > 0 ? Math.round(comboPacks.reduce((sum, c) => sum + Number(c.combo_price || 0), 0) / totalCount) : 0;

  return (
    <div style={{ width: '100%' }}>

      {/* Header Bar */}
      <div className="page-title-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={26} color="#5B5FC7" />
            {t('combo.page_title')}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '4px', fontWeight: 600 }}>
            {t('combo.page_subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchData}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem', gap: '6px' }}
          >
            <RefreshCw size={16} /> {t('combo.refresh')}
          </button>

          <button className="btn-primary" onClick={openAddModal} style={{ padding: '8px 18px', fontSize: '0.88rem', gap: '6px' }}>
            <Plus size={18} />
            <span>{t('combo.create_combo_pack')}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-customers" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <Package size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('combo.total_combo_packs')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {totalCount}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-orders" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <CheckCircle2 size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('combo.active_combos')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
              {activeCount}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-categories" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <Boxes size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('combo.total_products_bundled')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>
              {totalProductsIncluded}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-icon-3d-box icon-3d-report" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <IndianRupee size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('combo.avg_combo_price')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
              ₹{avgComboPrice.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {false && errorMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 18px', background: '#FEE2E2', color: '#EF4444',
          borderRadius: '12px', marginBottom: '20px', fontWeight: 700,
          border: '1px solid #FCA5A5'
        }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Controls Bar: Search & Filters */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              placeholder={t('combo.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px', fontSize: '0.88rem' }}
            />
          </div>

          {/* Filter Status */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Filter size={15} color="#64748B" />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>{t('combo.status')}:</span>
            <select
              className="form-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ height: '40px', padding: '0 12px', fontSize: '0.85rem' }}
            >
              <option value="all">{t('combo.all_status')}</option>
              <option value="active">{t('combo.active_only')}</option>
              <option value="inactive">{t('combo.inactive_only')}</option>
            </select>
          </div>

        </div>
      </div>

      {/* Combo Packs Table Card */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('combo.th_combo_details')}</th>
                <th>{t('combo.th_combo_price')}</th>
                <th>{t('combo.th_original_total')}</th>
                <th>{t('combo.th_discount_total')}</th>
                <th>{t('combo.th_products_included')}</th>
                <th>{t('combo.status')}</th>
                <th style={{ textAlign: 'right' }}>{t('combo.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <Loader2 size={22} color="#5B5FC7" className="animate-spin" />
                      <span>{t('combo.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredComboPacks.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                    {comboPacks.length === 0 ? (
                      <>{t('combo.no_combos_found')} <strong>"{t('combo.create_combo_pack')}"</strong> {t('combo.create_first')}</>
                    ) : (
                      <>{t('combo.no_match_search')}</>
                    )}
                  </td>
                </tr>
              ) : (
                filteredComboPacks.map((item) => {
                  const isItemActive = item.is_active !== "0" && item.is_active !== 0 && item.is_active !== false;
                  const prods = item.products || [];

                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>
                            {item.name}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#64748B', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.description || t('combo.no_description')}
                          </span>
                        </div>
                      </td>

                      <td style={{ fontWeight: 800, color: '#5B5FC7', fontSize: '1rem' }}>
                        ₹{Number(item.combo_price || 0).toLocaleString('en-IN')}
                      </td>

                      <td style={{ color: '#64748B', fontWeight: 600, textDecoration: 'line-through', fontSize: '0.85rem' }}>
                        {item.original_total !== undefined ? `₹${Number(item.original_total).toLocaleString('en-IN')}` : '-'}
                      </td>

                      <td style={{ color: '#166534', fontWeight: 700, fontSize: '0.88rem' }}>
                        {item.discount_total !== undefined ? `₹${Number(item.discount_total).toLocaleString('en-IN')}` : '-'}
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '260px' }}>
                          {prods.length === 0 ? (
                            <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontStyle: 'italic' }}>{t('combo.no_items')}</span>
                          ) : (
                            prods.slice(0, 3).map((p, idx) => {
                              const matchedProd = availableProducts.find(ap => Number(ap.id) === Number(p.product_id));
                              const imgUrl = p.product_image || p.image || (matchedProd ? getProductImage(matchedProd) : '');

                              return (
                                <div key={idx} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  background: '#F1F5F9',
                                  border: '1px solid #E2E8F0',
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  color: '#334155'
                                }}>
                                  {imgUrl ? (
                                    <img
                                      src={imgUrl}
                                      alt=""
                                      style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'cover' }}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                  ) : (
                                    <Package size={12} color="#5B5FC7" />
                                  )}
                                  <span>{p.product_name || `${t('combo.id_hash')}${p.product_id}`} × {p.quantity}</span>
                                </div>
                              );
                            })
                          )}
                          {prods.length > 3 && (
                            <span style={{ fontSize: '0.72rem', color: '#5B5FC7', fontWeight: 800, alignSelf: 'center' }}>
                              +{prods.length - 3} {t('combo.more')}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '4px 10px', borderRadius: '12px',
                          fontSize: '0.74rem', fontWeight: 800,
                          background: isItemActive ? '#DCFCE7' : '#F1F5F9',
                          color: isItemActive ? '#15803D' : '#64748B'
                        }}>
                          {isItemActive ? t('combo.active') : t('combo.inactive')}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setViewingCombo(item)}
                            title={t('combo.view_details')}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '5px 10px', borderRadius: '6px', border: '1.5px solid #CBD5E1',
                              background: '#F8FAFC', color: '#475569', fontSize: '0.78rem', fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={13} /> {t('combo.view')}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '5px 10px', borderRadius: '6px', border: '1.5px solid #C7D2FE',
                              background: '#EEF2FF', color: '#5B5FC7', fontSize: '0.78rem', fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Edit size={13} /> {t('combo.edit')}
                          </button>

                          <button
                            type="button"
                            className="btn-danger"
                            disabled={deletingId === item.id}
                            style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setDeleteTarget({ id: item.id, name: item.name })}
                          >
                            {deletingId === item.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            {t('combo.delete')}
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

      {/* View Products Details Modal */}
      {viewingCombo && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div className="modal-content" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} color="#5B5FC7" />
                {viewingCombo.name}
              </h2>
              <button className="modal-close" onClick={() => setViewingCombo(null)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '16px' }}>
              {viewingCombo.description || t('combo.no_description_provided')}
            </p>

            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>{t('combo.combo_price')}</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#5B5FC7' }}>
                  ₹{Number(viewingCombo.combo_price || 0).toLocaleString('en-IN')}
                </div>
              </div>
              {viewingCombo.original_total && (
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>{t('combo.original_value')}</span>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#94A3B8', textDecoration: 'line-through' }}>
                    ₹{Number(viewingCombo.original_total).toLocaleString('en-IN')}
                  </div>
                </div>
              )}
            </div>

            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', marginBottom: '10px' }}>
              {t('combo.bundled_products')} ({viewingCombo.products ? viewingCombo.products.length : 0})
            </h4>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '8px 12px' }}>{t('combo.th_product')}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>{t('combo.qty')}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>{t('combo.th_orig_price')}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>{t('combo.th_disc_price')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewingCombo.products || []).map((p, idx) => {
                    const matchedProd = availableProducts.find(ap => Number(ap.id) === Number(p.product_id));
                    const imgUrl = p.product_image || p.image || (matchedProd ? getProductImage(matchedProd) : '');

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0F172A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '8px',
                              background: '#F1F5F9', border: '1px solid #CBD5E1',
                              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {imgUrl ? (
                                <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                              ) : (
                                <ImageIcon size={16} color="#94A3B8" />
                              )}
                            </div>
                            <span>{p.product_name || `${t('combo.product_hash')}${p.product_id}`}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: '#5B5FC7' }}>
                          {p.quantity}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748B' }}>
                          ₹{p.product_original_price || 0}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                          ₹{p.product_discount_price || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="btn-secondary" onClick={() => setViewingCombo(null)}>
                {t('combo.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Combo Pack Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} color="#5B5FC7" />
                {editingCombo ? t('combo.edit_combo_pack') : t('combo.create_new_combo_pack')}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', background: '#FEE2E2', color: '#EF4444',
                borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600
              }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              {/* Visual Product Selection Section */}
              <div
                className={productAddError ? 'field-shake' : ''}
                style={{
                  background: '#F8FAFC',
                  border: '1px dashed',
                  borderColor: productAddError ? '#EF4444' : '#CBD5E1',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '16px',
                  ...(productAddError ? { boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.12)' } : {})
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <ShoppingCart size={16} color="#5B5FC7" />
                    {t('combo.select_add_products')} *
                  </h4>
                  <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>
                    {availableProducts.length} {t('combo.available_products')}
                  </span>
                </div>

                {productAddError && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    color: '#EF4444', fontSize: '0.78rem', fontWeight: 700,
                    background: '#FEF2F2', border: '1px solid #FECACA',
                    borderRadius: '8px', padding: '7px 10px', marginBottom: '10px'
                  }}>
                    <AlertCircle size={14} />
                    {t('combo.add_more_products')}
                  </div>
                )}

                {/* Custom Searchable Select Dropdown with Images */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
                  <CustomProductSelectWithImage
                    products={availableProducts}
                    selectedIds={selectedProductIds}
                    onChange={(ids) => setSelectedProductIds(ids)}
                    placeholder={t('combo.select_product_by_image')}
                    excludedIds={formData.products.map((p) => p.product_id)}
                  />

                  <button
                    type="button"
                    onClick={() => handleAddProductToCombo()}
                    className="btn-primary"
                    style={{ height: '44px', padding: '0 18px', fontSize: '0.85rem', gap: '6px', fontWeight: 700 }}
                  >
                    <Plus size={16} /> {t('combo.add_item')}
                  </button>
                </div>

                {/* Added Products Table / List with Images */}
                <h5 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('combo.bundled_products_list')} ({formData.products.length})
                </h5>

                {formData.products.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8', fontSize: '0.84rem', fontStyle: 'italic', background: '#FFFFFF', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
                    {t('combo.no_products_added')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                    {formData.products.map((item) => {
                      const prodInfo = availableProducts.find(p => Number(p.id) === Number(item.product_id));
                      const name = item.product_name || (prodInfo ? (prodInfo.name || prodInfo.product_name) : `${t('combo.product_hash')}${item.product_id}`);
                      const price = prodInfo ? Number(
                        prodInfo.product_original_price || prodInfo.original_price || prodInfo.originalPrice ||
                        prodInfo.product_discount_price || prodInfo.discounted_price || prodInfo.discountedPrice ||
                        prodInfo.price || 0
                      ) : Number(item.product_original_price || item.original_price || item.product_discount_price || 0);
                      const imgUrl = item.product_image || (prodInfo ? getProductImage(prodInfo) : '');

                      return (
                        <div key={item.product_id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Product Thumbnail Image */}
                            <div style={{
                              width: '44px', height: '44px', borderRadius: '8px',
                              background: '#F1F5F9', border: '1px solid #CBD5E1',
                              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <ImageIcon size={20} color="#94A3B8" />
                              )}
                            </div>

                            <div>
                              <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.88rem', display: 'block' }}>
                                {name}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                                ₹{price} × {item.quantity} = <strong style={{ color: '#166534' }}>₹{price * item.quantity}</strong>
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #CBD5E1', borderRadius: '6px', overflow: 'hidden' }}>
                              <button
                                type="button"
                                onClick={() => handleUpdateProductQty(item.product_id, -1)}
                                style={{ width: '28px', height: '28px', background: '#F1F5F9', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleSetProductQty(item.product_id, e.target.value)}
                                onBlur={(e) => handleSetProductQty(item.product_id, e.target.value || '1')}
                                onKeyDown={(e) => {
                                  if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
                                }}
                                style={{ width: '42px', height: '28px', border: 'none', outline: 'none', textAlign: 'center', fontWeight: 800, fontSize: '0.82rem', color: '#0F172A', background: '#FFFFFF' }}
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateProductQty(item.product_id, 1)}
                                style={{ width: '28px', height: '28px', background: '#F1F5F9', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveProductFromCombo(item.product_id)}
                              style={{
                                background: '#FEE2E2', border: 'none', color: '#EF4444',
                                borderRadius: '6px', width: '28px', height: '28px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                              title={t('combo.remove_item')}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">{t('combo.combo_name_label')} *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('combo.eg_family_combo')}
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('combo.description_label')}</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder={t('combo.eg_description')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">{t('combo.items_original_total')}</label>
                    <div style={{
                      height: '42px',
                      borderRadius: '10px',
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 12px',
                      fontWeight: 700,
                      color: '#166534',
                      fontSize: '0.88rem'
                    }}>
                      ₹{formOriginalTotal.toLocaleString('en-IN')}
                    </div>
                  </div>

                <div className="form-group">
                  <label className="form-label">{t('combo.special_combo_price')} (₹) *</label>
                  <input
                    type="number"
                    className="form-input lite-placeholder"
                    placeholder={t('combo.eg_2499')}
                    required
                    min="0"
                    step="any"
                    value={formData.combo_price}
                    onChange={(e) => setFormData({ ...formData, combo_price: e.target.value })}
                    style={{ fontWeight: 800, color: '#5B5FC7', fontSize: '1rem' }}
                  />
                </div>

                  <div className="form-group">
                    <label className="form-label">{t('combo.items_discount_total')}</label>
                    <div style={{
                      height: '42px',
                      borderRadius: '10px',
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 12px',
                      fontWeight: 700,
                      color: '#166534',
                      fontSize: '0.88rem'
                    }}>
                      <span>
                        ₹{formData.combo_price !== '' && Number(formData.combo_price) > 0
                          ? formDiscountSavings.toLocaleString('en-IN')
                          : '0'}
                      </span>
                      {formData.combo_price !== '' && Number(formData.combo_price) > 0 && formDiscountSavings > 0 && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803D', background: '#DCFCE7', borderRadius: '999px', padding: '2px 8px', letterSpacing: '0.3px' }}>
                          {t('combo.discount_saved')}
                        </span>
                      )}
                    </div>
                  </div>
            </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  {t('combo.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{
                    gap: '6px',
                    ...(formData.products.length < 2
                      ? { background: '#CBD5E1', color: '#FFFFFF', cursor: 'not-allowed', boxShadow: 'none', pointerEvents: 'auto' }
                      : {})
                  }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{saving ? t('combo.saving') : (editingCombo ? t('combo.update_combo_pack') : t('combo.create_combo_pack'))}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '28px 24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Trash2 size={24} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              {t('combo.delete_combo_confirm')}
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.5, marginBottom: '24px' }}>
              {t('combo.delete_warning_1')} <strong style={{ color: '#0F172A' }}>"{deleteTarget.name}"</strong>? {t('combo.delete_warning_2')}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: '10px 16px', fontWeight: 700, justifyContent: 'center', textAlign: 'center' }}
              >
                {t('combo.cancel')}
              </button>

              <button
                type="button"
                className="btn-danger"
                disabled={deletingId === deleteTarget.id}
                onClick={handleConfirmDelete}
                style={{ flex: 1, padding: '10px 16px', gap: '6px', justifyContent: 'center', fontWeight: 700 }}
              >
                {deletingId === deleteTarget.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>{deletingId === deleteTarget.id ? t('combo.deleting') : t('combo.yes_delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
