import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, BadgePercent, Edit, Eye, Loader2, Package,
  Plus, RefreshCw, Save, Search, Tag, Trash2, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { offerAPI, productAPI } from '../api/api';
import CustomSelect from '../components/CustomSelect';
import { useLanguage } from '../context/LanguageContext';

const emptyForm = {
  product_id: '',
  offer_original_price: '',
  offer_discount_price: ''
};

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return Array.isArray(value?.data?.data) ? value.data.data : [];
}

function getProductName(product) {
  return product?.product_name || product?.name || product?.title || `Product #${product?.id || ''}`;
}

function getProductCode(product) {
  return product?.product_code || product?.code || product?.sku || '-';
}

function getOfferProduct(offer) {
  return offer?.product || offer?.products || {};
}

function getOfferProductName(offer) {
  const product = getOfferProduct(offer);
  return getProductName(product) || `Product #${offer?.product_id || ''}`;
}

function getProductOriginalPrice(product) {
  return product?.product_original_price || product?.original_price || product?.originalPrice || product?.mrp || product?.price || '';
}

function getProductDiscountPrice(product) {
  return product?.product_discount_price || product?.discount_price || product?.discounted_price || product?.discountedPrice || product?.selling_price || '';
}

function getProductImage(product) {
  const image = product?.product_images?.[0]?.images || product?.product_images?.[0]?.image || product?.image_url || product?.image || product?.images || '';
  if (!image) return '';
  if (String(image).startsWith('http://') || String(image).startsWith('https://') || String(image).startsWith('data:')) return image;
  return `https://offer360.in/uploads_crackers/sds_crackers_shop_2/products/${String(image).replace(/^\/+/, '')}`;
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return amount ? `₹${amount.toLocaleString('en-IN')}` : '-';
}

function getOfferSavings(offer) {
  const original = Number(offer?.offer_original_price || 0);
  const discount = Number(offer?.offer_discount_price || 0);
  const amount = Math.max(original - discount, 0);
  const percent = original > 0 ? Math.round((amount / original) * 100) : 0;
  return { amount, percent };
}

function ModalShell({ title, children, onClose, width = 680 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px' }}>
      <div className="admin-card" style={{ width: '100%', maxWidth: `${width}px`, margin: 0, padding: 0, overflow: 'hidden', boxShadow: '0 24px 70px rgba(15,23,42,0.28)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0F172A' }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '9px', border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={17} color="#64748B" />
          </button>
        </div>
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </div>
  );
}

export default function Offer() {
  const { t } = useLanguage();
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [viewingOffer, setViewingOffer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [offerRes, productRes] = await Promise.all([
        offerAPI.getOffers(),
        productAPI.getProducts()
      ]);
      setOffers(toArray(offerRes));
      setProducts(toArray(productRes));
    } catch (err) {
      toast.error(err.message || t('offer.error_load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const productOptions = useMemo(() => products.map((product) => {
    const name = getProductName(product);
    const originalPrice = getProductOriginalPrice(product);
    const discountPrice = getProductDiscountPrice(product);
    const productCode = getProductCode(product);
    const image = getProductImage(product);
    return {
      value: String(product.id),
      label: `${name} - ${productCode} - ID ${product.id}`,
      labelNode: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {image ? (
            <img src={image} alt={name} style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #E2E8F0', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Package size={19} color="#5B5FC7" />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', minWidth: 0 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 900, color: '#0F172A' }}>{name}</span>
              <span style={{ flexShrink: 0, borderRadius: '999px', background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE', padding: '2px 8px', fontSize: '0.68rem', fontWeight: 900 }}>
                {productCode}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.7rem', color: '#64748B', fontWeight: 800 }}>
              <span>ID: {product.id}</span>
              {product.type && <span>Type: {product.type}</span>}
              {product.pack_quantity && <span>Pack: {product.pack_quantity}</span>}
              {product.stock_count !== undefined && <span>Stock: {product.stock_count}</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', fontWeight: 900 }}>
              {originalPrice && <span style={{ color: '#475569' }}>MRP {formatMoney(originalPrice)}</span>}
              {discountPrice && <span style={{ color: '#15803D' }}>Sale {formatMoney(discountPrice)}</span>}
            </div>
          </div>
        </div>
      )
    };
  }), [products]);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(formData.product_id)),
    [products, formData.product_id]
  );

  const filteredOffers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return offers;
    return offers.filter((offer) => {
      const productName = getOfferProductName(offer).toLowerCase();
      const productCode = getProductCode(getOfferProduct(offer)).toLowerCase();
      return productName.includes(query) || productCode.includes(query) || String(offer.product_id || '').includes(query) || String(offer.id || '').includes(query);
    });
  }, [offers, searchQuery]);

  const openAddModal = () => {
    setEditingOffer(null);
    setFormData(emptyForm);
    setModalError('');
    setShowModal(true);
  };

  const openEditModal = (offer) => {
    setEditingOffer(offer);
    setFormData({
      product_id: String(offer.product_id || getOfferProduct(offer).id || ''),
      offer_original_price: offer.offer_original_price || '',
      offer_discount_price: offer.offer_discount_price || ''
    });
    setModalError('');
    setShowModal(true);
  };

  const handleProductChange = (productId) => {
    const product = products.find((item) => String(item.id) === String(productId));
    setFormData((current) => ({
      ...current,
      product_id: productId,
      offer_original_price: current.offer_original_price || getProductOriginalPrice(product),
      offer_discount_price: current.offer_discount_price || getProductDiscountPrice(product)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    const payload = {
      product_id: Number(formData.product_id),
      offer_original_price: Number(formData.offer_original_price),
      offer_discount_price: Number(formData.offer_discount_price)
    };

    if (!payload.product_id) return setModalError(t('offer.error_product_required'));
    if (!payload.offer_original_price || payload.offer_original_price <= 0) return setModalError(t('offer.error_original_required'));
    if (!payload.offer_discount_price || payload.offer_discount_price <= 0) return setModalError(t('offer.error_discount_required'));

    setSaving(true);
    try {
      const res = editingOffer
        ? await offerAPI.updateOffer(editingOffer.id, payload)
        : await offerAPI.createOffer(payload);
      if (res?.success || res?.data || res?.id) {
        setShowModal(false);
        setEditingOffer(null);
        setFormData(emptyForm);
        fetchData();
      } else {
        setModalError(res?.message || t('offer.error_save'));
      }
    } catch (err) {
      setModalError(err.message || t('offer.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await offerAPI.deleteOffer(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || t('offer.error_delete'));
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <div className="page-title-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BadgePercent size={26} color="#5B5FC7" />
            {t('offer.title')}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '4px', fontWeight: 600 }}>
            {t('offer.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={fetchData} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem', gap: '6px' }} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {t('offer.refresh')}
          </button>
          <button type="button" onClick={openAddModal} className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.88rem', gap: '6px' }}>
            <Plus size={18} />
            {t('offer.add')}
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid #E2E8F0', gap: '14px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0F172A' }}>{t('offer.table_title')}</h3>
            <p style={{ margin: '3px 0 0', color: '#64748B', fontSize: '0.8rem', fontWeight: 700 }}>{offers.length} {t('offer.total_offers')}</p>
          </div>
          <div style={{ position: 'relative', width: 'min(320px, 100%)' }}>
            <Search size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('offer.search')}
              style={{ paddingLeft: '36px', height: '42px' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>{t('offer.product')}</th>
                <th>{t('offer.product_code')}</th>
                <th>{t('offer.original_price')}</th>
                <th>{t('offer.discount_price')}</th>
                <th>{t('offer.created_at')}</th>
                <th style={{ textAlign: 'right' }}>{t('offer.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontWeight: 800 }}>
                    <Loader2 size={20} className="animate-spin" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    {t('offer.loading')}
                  </td>
                </tr>
              ) : filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontWeight: 800 }}>{t('offer.empty')}</td>
                </tr>
              ) : (
                filteredOffers.map((offer) => (
                  (() => {
                    const product = getOfferProduct(offer);
                    const productName = getOfferProductName(offer);
                    const productCode = getProductCode(product);
                    const productImage = getProductImage(product);
                    return (
                  <tr key={offer.id}>
                    <td style={{ fontWeight: 800 }}>#{offer.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {productImage ? (
                          <img src={productImage} alt={productName} style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #E2E8F0', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Package size={18} color="#5B5FC7" />
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 900, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '260px' }}>{productName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>ID: {offer.product_id}{product.type ? ` | ${product.type}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: '999px', background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE', padding: '4px 10px', fontSize: '0.76rem', fontWeight: 900 }}>
                        {productCode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800 }}>{formatMoney(offer.offer_original_price)}</td>
                    <td><span style={{ color: '#15803D', fontWeight: 900 }}>{formatMoney(offer.offer_discount_price)}</span></td>
                    <td>{offer.created_at ? String(offer.created_at).split(' ')[0] : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button type="button" title={t('offer.view')} onClick={() => setViewingOffer(offer)} style={{ width: '34px', height: '34px', borderRadius: '9px', border: '1px solid #BFDBFE', background: '#EFF6FF', cursor: 'pointer' }}>
                          <Eye size={15} color="#2563EB" />
                        </button>
                        <button type="button" title={t('offer.edit')} onClick={() => openEditModal(offer)} style={{ width: '34px', height: '34px', borderRadius: '9px', border: '1px solid #C7D2FE', background: '#EEF2FF', cursor: 'pointer' }}>
                          <Edit size={15} color="#5B5FC7" />
                        </button>
                        <button type="button" title={t('offer.delete')} onClick={() => setDeleteTarget({ id: offer.id, name: getOfferProductName(offer) })} style={{ width: '34px', height: '34px', borderRadius: '9px', border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer' }}>
                          <Trash2 size={15} color="#DC2626" />
                        </button>
                      </div>
                    </td>
                  </tr>
                    );
                  })()
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ModalShell title={editingOffer ? t('offer.edit_title') : t('offer.add_title')} onClose={() => setShowModal(false)}>
          {modalError && (
            <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', background: '#FEF2F2', color: '#DC2626', borderRadius: '10px', marginBottom: '16px', fontWeight: 800 }}>
              <AlertCircle size={16} /> {modalError}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={15} color="#5B5FC7" /> {t('offer.product')}
              </label>
              <CustomSelect
                options={productOptions}
                value={formData.product_id}
                onChange={handleProductChange}
                placeholder={t('offer.select_product')}
                searchable
                triggerStyle={{ height: '48px' }}
              />
            </div>

            {selectedProduct && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                {getProductImage(selectedProduct) ? (
                  <img src={getProductImage(selectedProduct)} alt={getProductName(selectedProduct)} style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #E2E8F0', flexShrink: 0 }} />
                ) : (
                  <Tag size={18} color="#10B981" />
                )}
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{ fontSize: '0.88rem', color: '#0F172A', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getProductName(selectedProduct)}</span>
                  <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 800 }}>
                    Code: {getProductCode(selectedProduct)} | ID: {selectedProduct.id}{selectedProduct.stock_count !== undefined ? ` | Stock: ${selectedProduct.stock_count}` : ''}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('offer.original_price')}</label>
                <input type="number" className="form-input" min="0" step="0.01" value={formData.offer_original_price} onChange={(e) => setFormData((current) => ({ ...current, offer_original_price: e.target.value }))} placeholder="200" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('offer.discount_price')}</label>
                <input type="number" className="form-input" min="0" step="0.01" value={formData.offer_discount_price} onChange={(e) => setFormData((current) => ({ ...current, offer_discount_price: e.target.value }))} placeholder="100" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>{t('offer.cancel')}</button>
              <button type="submit" className="btn-primary" disabled={saving} style={{ gap: '8px' }}>
                {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                {saving ? t('offer.saving') : t('offer.save')}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {viewingOffer && (
        <ModalShell title={t('offer.view_title')} onClose={() => setViewingOffer(null)} width={720}>
          {(() => {
            const product = getOfferProduct(viewingOffer);
            const productName = getOfferProductName(viewingOffer);
            const productImage = getProductImage(product);
            const productCode = getProductCode(product);
            const savings = getOfferSavings(viewingOffer);
            const detailRows = [
              [t('offer.product_code'), productCode],
              [t('offer.product_id'), viewingOffer.product_id],
              ['Type', product.type || '-'],
              ['Pack Quantity', product.pack_quantity || '-'],
              ['Height / Size', product.height || '-'],
              ['Stock', product.stock_count ?? '-'],
              ['Category ID', product.category_id || '-'],
              ['Offer ID', `#${viewingOffer.id}`],
              [t('offer.created_at'), viewingOffer.created_at || '-'],
              [t('offer.updated_at'), viewingOffer.updated_at || '-']
            ];

            return (
              <div style={{ display: 'grid', gap: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '16px', alignItems: 'center', padding: '16px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  {productImage ? (
                    <img src={productImage} alt={productName} style={{ width: '110px', height: '110px', borderRadius: '14px', objectFit: 'cover', border: '1px solid #E2E8F0', background: '#FFFFFF' }} />
                  ) : (
                    <div style={{ width: '110px', height: '110px', borderRadius: '14px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={34} color="#5B5FC7" />
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <span style={{ borderRadius: '999px', background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 900 }}>{productCode}</span>
                      {product.type && <span style={{ borderRadius: '999px', background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 900 }}>{product.type}</span>}
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', color: '#0F172A', fontWeight: 950, lineHeight: 1.25 }}>{productName}</h3>
                    <p style={{ margin: 0, color: '#64748B', fontSize: '0.84rem', fontWeight: 700, lineHeight: 1.5 }}>
                      {product.description || 'No product description available.'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: '12px', background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                    <div style={{ color: '#C2410C', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '5px' }}>{t('offer.original_price')}</div>
                    <div style={{ color: '#0F172A', fontSize: '1.2rem', fontWeight: 950 }}>{formatMoney(viewingOffer.offer_original_price)}</div>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                    <div style={{ color: '#047857', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '5px' }}>{t('offer.discount_price')}</div>
                    <div style={{ color: '#0F172A', fontSize: '1.2rem', fontWeight: 950 }}>{formatMoney(viewingOffer.offer_discount_price)}</div>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <div style={{ color: '#1D4ED8', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '5px' }}>Savings</div>
                    <div style={{ color: '#0F172A', fontSize: '1.2rem', fontWeight: 950 }}>{formatMoney(savings.amount)} <span style={{ color: '#2563EB', fontSize: '0.82rem' }}>({savings.percent}%)</span></div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                  {detailRows.map(([label, value]) => (
                    <div key={label} style={{ padding: '11px 12px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                      <div style={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '5px' }}>{label}</div>
                      <div style={{ color: '#0F172A', fontSize: '0.86rem', fontWeight: 850, wordBreak: 'break-word' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </ModalShell>
      )}

      {deleteTarget && (
        <ModalShell title={t('offer.delete_title')} onClose={() => setDeleteTarget(null)} width={460}>
          <p style={{ margin: '0 0 18px', color: '#475569', fontWeight: 700, lineHeight: 1.6 }}>
            {t('offer.delete_confirm')} <strong style={{ color: '#0F172A' }}>{deleteTarget.name}</strong>?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>{t('offer.cancel')}</button>
            <button type="button" className="btn-danger" disabled={deletingId === deleteTarget.id} onClick={handleConfirmDelete} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {deletingId === deleteTarget.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {deletingId === deleteTarget.id ? t('offer.deleting') : t('offer.delete')}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
