import React, { useState, useEffect, useRef } from 'react';
import { saveCategories } from '../utils/productData';
import { Plus, Edit2, Trash2, Layers, Check, X, Search, Zap, Upload, Download, GripVertical, ChevronDown, ChevronRight, Loader2, Video, AlertCircle, Percent, QrCode, BookOpen } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import { categoryAPI, productAPI, discountAPI, footerAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';
import PageRefreshButton from '../components/PageRefreshButton';
import ProductCodeModal from '../components/ProductCodeModal';



export default function Categories() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewAll, setViewAll] = useState(true);
  const [allSearch, setAllSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [globalDiscountType, setGlobalDiscountType] = useState('percentage');
  const [globalDiscountValue, setGlobalDiscountValue] = useState('');
  const [globalDiscounts, setGlobalDiscounts] = useState([]);
  const [editingGlobalDiscountId, setEditingGlobalDiscountId] = useState(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Video Preview Modal State
  const [previewVideoUrl, setPreviewVideoUrl] = useState(null); // null = modal closed, string = video url/file

  // Barcode & QR Code Modal State
  const [codeModalProduct, setCodeModalProduct] = useState(null);

  // Shop Details State for Catalog Header & Branding
  const [shopDetails, setShopDetails] = useState(null);

  // Fetch Categories & Products from Backend API
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const [catRes, prodRes, footerRes] = await Promise.all([
        categoryAPI.getCategories(),
        productAPI.getProducts().catch(() => ({ success: false, data: [] })),
        footerAPI.getFooter().catch(() => ({ success: false, data: null }))
      ]);

      if (footerRes && footerRes.success && footerRes.data) {
        const footData = Array.isArray(footerRes.data) ? footerRes.data[0] : footerRes.data;
        if (footData) setShopDetails(footData);
      }

      if (catRes.success && Array.isArray(catRes.data)) {
        const allProductsList = (prodRes && prodRes.success && Array.isArray(prodRes.data)) ? prodRes.data : [];
        console.log('Products API Response Data:', allProductsList);

        // Map backend categories and sort by position
        const sortedCategories = [...catRes.data].sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));

        const formattedCats = sortedCategories.map((cat) => {
          const catIdStr = String(cat.id);

          // Get products from products API or inline category.products and sort by position
          const rawProds = allProductsList.filter((p) => String(p.category_id) === catIdStr);
          const combinedProds = rawProds.length > 0 ? rawProds : (cat.products || []);
          const sortedProds = [...combinedProds].sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));
          return {
            id: catIdStr,
            name: cat.name,
            image: cat.images || '',
            products: sortedProds.map((p, productIndex) => {
              // Filter image and video from product_images array using media_type or file extension
              let imgUrl = '';
              let videoUrl = '';

              if (p.product_images && Array.isArray(p.product_images) && p.product_images.length > 0) {
                const imgItem = p.product_images.find((item) => item.media_type === 'image' || (item.images && item.images.match(/\.(jpg|jpeg|png|webp)/i)));
                const vidItem = p.product_images.find((item) => item.media_type === 'video' || (item.images && item.images.match(/\.(mp4|webm|mov|avi)/i)));

                if (imgItem && imgItem.images) imgUrl = imgItem.images;
                if (vidItem && vidItem.images) videoUrl = vidItem.images;
              }

              // Fallback check if videos field comes separately
              if (!videoUrl) {
                if (p.product_videos && Array.isArray(p.product_videos) && p.product_videos.length > 0) {
                  const firstVid = p.product_videos[0];
                  videoUrl = typeof firstVid === 'string' ? firstVid : (firstVid.videos || firstVid.video || firstVid.url || '');
                } else if (p.videos) {
                  videoUrl = Array.isArray(p.videos) ? (p.videos[0]?.videos || p.videos[0]) : p.videos;
                } else if (p.video) {
                  videoUrl = typeof p.video === 'object' ? (p.video.url || p.video.videos) : p.video;
                } else if (p.video_url) {
                  videoUrl = p.video_url;
                }
              }

              return {
                id: String(p.id || p.product_id || p._id || `prod-${catIdStr}-${productIndex}`),
                category_id: String(p.category_id || cat.id),
                name: p.name || '',
                product_code: p.product_code || '',
                stock_count: p.stock_count !== undefined && p.stock_count !== null ? String(p.stock_count) : '',
                pack_quantity: p.pack_quantity || '',
                height: p.height || '',
                type: p.type || '',
                original_price: Number(p.original_price || p.price || 0),
                discount_price: Number(p.discount_price || p.price || 0),
                price: Number(p.discount_price || p.price || 0),
                discount_type: p.discount_type || null,
                discount_value: p.discount_value !== undefined && p.discount_value !== null ? String(p.discount_value) : null,
                created_at: p.created_at || p.createdAt || null,
                description: p.description || '',
                stock: p.stock !== undefined
                  ? p.stock
                  : (p.stock_count !== undefined && p.stock_count !== null ? Number(p.stock_count) > 0 : true),
                image: imgUrl,
                video: videoUrl
              };
            })
          };
        });

        setCategories(formattedCats);
        if (!initialExpandDoneRef.current) {
          setOpenCatIds(formattedCats.map((cat) => cat.id));
          initialExpandDoneRef.current = true;
        }
        if (formattedCats.length > 0) {
          const targetId = newCatIdRef.current;
          newCatIdRef.current = null;
          setSelectedCategory((prevSelected) => {
            const exists = formattedCats.some((c) => c.id === prevSelected);
            if (targetId && formattedCats.some((c) => c.id === targetId)) return targetId;
            return exists ? prevSelected : formattedCats[0].id;
          });
          setQuickCategory((prevQuick) => {
            const exists = formattedCats.some((c) => c.id === prevQuick);
            if (targetId && formattedCats.some((c) => c.id === targetId)) return targetId;
            return exists ? prevQuick : formattedCats[0].id;
          });
        }
      } else {
        setError(t('cat.error_load_failed'));
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err.message || t('cat.error_api_connect'));
    } finally {
      setLoading(false);
    }
  };

  // Accordion open state for All Categories view
  const [openCatIds, setOpenCatIds] = useState([]);
  const initialExpandDoneRef = useRef(false);
  const newCatIdRef = useRef(null);

  const toggleCategoryAccordion = (catId) => {
    setOpenCatIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  // Add / Edit Category Modal State
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null = add mode, object = edit mode
  const [newCatName, setNewCatName] = useState('');
  const [newCatPosition, setNewCatPosition] = useState('1');
  const [newCatImage, setNewCatImage] = useState(null);
  const [newCatImagePreview, setNewCatImagePreview] = useState(null);
  const [catSubmitLoading, setCatSubmitLoading] = useState(false);

  // Delete Category & Error Modal State
  const [categoryToDelete, setCategoryToDelete] = useState(null); // null = modal closed, object = category to delete
  const [productToDelete, setProductToDelete] = useState(null); // null = modal closed, object = product to delete
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [validationError, setValidationError] = useState(''); // Custom UI Error Popup state

  // Quick Inline Add State
  const [quickName, setQuickName] = useState('');
  const [quickPrice, setQuickPrice] = useState(100);
  const [quickCategory, setQuickCategory] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [quickStock, setQuickStock] = useState(true);
  const [quickImage, setQuickImage] = useState(null);


  // Edit Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [bulkTemplateLoading, setBulkTemplateLoading] = useState(false);
  const [discountType, setDiscountType] = useState('rs'); // 'rs' or 'percentage'
  const [discountValue, setDiscountValue] = useState('');
  const [discountSelection, setDiscountSelection] = useState('manual');
  const [productForm, setProductForm] = useState({
    name: '',
    product_code: '',
    stock_count: '',
    pack_quantity: '',
    height: '',
    type: '',
    original_price: '',
    discount_price: '',
    description: '',
    stock: true,
    image: null,
    video: ''
  });

  // Drag state refs — category tabs & cards
  const dragCatIdx = useRef(null);
  const dragOverCatIdx = useRef(null);

  // Drag state refs — product rows
  const dragProdIdx = useRef(null);
  const dragOverProdIdx = useRef(null);
  const dragCatIdForProd = useRef(null);

  // Visual highlight state & position animation state
  const [dragOverCat, setDragOverCat] = useState(null);
  const [dragOverProd, setDragOverProd] = useState(null);
  const [movedCatId, setMovedCatId] = useState(null);
  const [movedProdId, setMovedProdId] = useState(null);
  const [moveDirection, setMoveDirection] = useState(null); // 'up' | 'down'
  const [toastMessage, setToastMessage] = useState('');

  const triggerMovedAnimation = (catId, msg, direction = 'up') => {
    setMovedCatId(catId);
    setMoveDirection(direction);
    setToastMessage(msg);
    setTimeout(() => {
      setMovedCatId(null);
      setMoveDirection(null);
    }, 1000);
    setTimeout(() => {
      setToastMessage('');
    }, 2500);
  };

  const triggerProductMovedAnimation = (productId) => {
    setMovedProdId(productId);
    setTimeout(() => setMovedProdId(null), 1200);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const normalizeDiscounts = (response) => {
    const payload = response?.data ?? response;
    const list = Array.isArray(payload)
      ? payload
      : payload?.discounts || payload?.data || [];
    return Array.isArray(list) ? list.map((discount) => ({
      ...discount,
      id: discount.id ?? discount.discount_id,
      name: discount.discount_name || discount.name || discount.title || '',
      type: discount.discount_type || discount.type || 'percentage',
      value: discount.discount_value ?? discount.discount_percentage ?? discount.value ?? 0,
    })) : [];
  };

  const fetchGlobalDiscounts = async () => {
    try {
      setDiscountLoading(true);
      const response = await discountAPI.getDiscounts();
      setGlobalDiscounts(normalizeDiscounts(response));
    } catch (err) {
      setError(err.message || 'Failed to load discounts.');
    } finally {
      setDiscountLoading(false);
    }
  };

  useEffect(() => {
    if (discountModalOpen || showProductModal) fetchGlobalDiscounts();
  }, [discountModalOpen, showProductModal]);

  const currentCat = categories.find((c) => c.id === selectedCategory);
  const availableDiscounts = globalDiscounts.filter((discount) => (
    discount.status !== 'inactive' && discount.status !== false && discount.is_active !== false
  ));
  const isRecentlyAdded = (product) => {
    if (!product.created_at) return false;
    const createdTime = new Date(product.created_at).getTime();
    const age = currentTime - createdTime;
    return Number.isFinite(createdTime) && age >= 0 && age < 24 * 60 * 60 * 1000;
  };

  const handleDiscountSelectionChange = (selection) => {
    setDiscountSelection(selection);

    if (selection === 'manual') {
      setDiscountType('rs');
      setDiscountValue('');
      setProductForm((prev) => ({ ...prev, discount_price: prev.original_price || '' }));
      return;
    }

    const selectedDiscount = availableDiscounts.find((discount) => String(discount.id) === selection);
    if (!selectedDiscount) return;

    const mode = selectedDiscount.type === 'percentage' ? 'percentage' : 'rs';
    const value = Number(selectedDiscount.value) || 0;
    const originalPrice = Number(productForm.original_price) || 0;
    const calculatedPrice = mode === 'percentage'
      ? Math.round(originalPrice - (originalPrice * value / 100))
      : Math.max(0, originalPrice - value);

    setDiscountType(mode);
    setDiscountValue(String(value));
    setProductForm((prev) => ({
      ...prev,
      discount_price: originalPrice ? String(calculatedPrice) : prev.discount_price
    }));
  };

  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    setQuickCategory(catId);
  };

  /* ── CATEGORY DRAG HANDLERS ── */
  const onCatDragStart = (e, idx) => {
    dragCatIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const onCatDragOver = (e, idx) => {
    e.preventDefault();
    dragOverCatIdx.current = idx;
    setDragOverCat(idx);
  };

  const onCatDrop = async (e) => {
    e.preventDefault();
    const from = dragCatIdx.current;
    const to = dragOverCatIdx.current;
    if (from === null || to === null || from === to) {
      setDragOverCat(null);
      return;
    }
    const updated = [...categories];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setCategories(updated);
    saveCategories(updated);

    const dir = to < from ? 'up' : 'down';
    const newPosition = to + 1;
    triggerMovedAnimation(moved.id, `${t('cat.moved_to_position')} "${moved.name}" ${t('cat.to_position')} #${newPosition}`, dir);

    try {
      await categoryAPI.updateCategoryPosition(moved.id, newPosition);
    } catch (err) {
      console.error('Failed to update category position via API:', err);
    }

    dragCatIdx.current = null;
    dragOverCatIdx.current = null;
    setDragOverCat(null);
  };

  const onCatDragEnd = () => {
    dragCatIdx.current = null;
    dragOverCatIdx.current = null;
    setDragOverCat(null);
  };

  /* ── PRODUCT ROW DRAG HANDLERS ── */
  const onProdDragStart = (e, idx) => {
    dragProdIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const onProdDragOver = (e, idx) => {
    e.preventDefault();
    dragOverProdIdx.current = idx;
    setDragOverProd(idx);
  };

  const onProdDrop = async (e) => {
    e.preventDefault();
    const from = dragProdIdx.current;
    const to = dragOverProdIdx.current;
    if (from === null || to === null || from === to || !currentCat) {
      setDragOverProd(null);
      return;
    }

    const updated = categories.map((cat) => {
      if (cat.id !== currentCat.id) return cat;
      const prods = [...cat.products];
      const [moved] = prods.splice(from, 1);
      prods.splice(to, 0, moved);
      return { ...cat, products: prods };
    });

    setCategories(updated);
    saveCategories(updated);

    const movedProd = currentCat.products[from];
    const newPosition = to + 1;
    if (movedProd?.id) triggerProductMovedAnimation(movedProd.id);
    if (movedProd && movedProd.id) {
      try {
        await productAPI.updateProductPosition(movedProd.id, newPosition);
      } catch (err) {
        console.error('Failed to update product position via API:', err);
      }
    }

    dragProdIdx.current = null;
    dragOverProdIdx.current = null;
    setDragOverProd(null);
  };

  const onProdDragEnd = () => {
    dragProdIdx.current = null;
    dragOverProdIdx.current = null;
    setDragOverProd(null);
  };

  /* ── CATEGORY CRUD ── */
  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setNewCatName('');
    setNewCatPosition(String(categories.length + 1));
    setNewCatImage(null);
    setNewCatImagePreview(null);
    setShowAddCatModal(true);
  };

  const openEditCategoryModal = (cat, e) => {
    if (e) e.stopPropagation();
    setEditingCategory(cat);
    setNewCatName(cat.name);
    setNewCatPosition(cat.position || '1');
    setNewCatImage(null);
    setNewCatImagePreview(cat.image || null);
    setShowAddCatModal(true);
  };

  const handleAddCategorySubmit = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      setCatSubmitLoading(true);

      const formData = new FormData();
      formData.append('name', newCatName.trim());
      formData.append('position', newCatPosition || '1');
      if (newCatImage) {
        formData.append('images', newCatImage);
      }

      let res;
      if (editingCategory) {
        // Edit category API call
        res = await categoryAPI.updateCategory(editingCategory.id, formData);
      } else {
        // Create category API call
        res = await categoryAPI.createCategory(formData);
      }

      if (res.success) {
        setToastMessage(editingCategory ? t('cat.updated_success') : t('cat.added_success'));
        setTimeout(() => setToastMessage(''), 2500);

        if (!editingCategory && res.data?.id) {
          newCatIdRef.current = res.data.id;
        }

        setNewCatName('');
        setNewCatPosition('1');
        setNewCatImage(null);
        setNewCatImagePreview(null);
        setEditingCategory(null);
        setShowAddCatModal(false);

        // Refresh category list from server
        fetchCategories();
      } else {
        alert(res.message || t('cat.operation_failed'));
      }
    } catch (err) {
      console.error('Error saving category:', err);
      alert(err.message || t('cat.error_api_connect'));
    } finally {
      setCatSubmitLoading(false);
    }
  };

  const handleDeleteCategory = (catId, catName) => {
    setCategoryToDelete({ id: catId, name: catName });
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      setDeleteLoading(true);
      const res = await categoryAPI.deleteCategory(categoryToDelete.id);

      if (res.success) {
        setToastMessage(`${t('cat.delete_success')} "${categoryToDelete.name}"`);
        setTimeout(() => setToastMessage(''), 2500);

        setCategoryToDelete(null);
        if (categories.length === 1) {
          setSelectedCategory(null);
          setQuickCategory('');
          setViewAll(true);
        }

        // Refresh category list from server
        fetchCategories();
      } else {
        alert(res.message || t('cat.delete_failed'));
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      alert(err.message || t('cat.error_api_connect'));
    } finally {
      setDeleteLoading(false);
    }
  };

  /* ── PRODUCT CRUD ── */
  // eslint-disable-next-line no-unused-vars
  const handleQuickAddProduct = (e) => {

    e.preventDefault();
    if (!quickName.trim()) { alert(t('cat.enter_product_name')); return; }
    const targetCatId = quickCategory || selectedCategory;
    const updated = categories.map((cat) => {
      if (cat.id !== targetCatId) return cat;
      const newProds = [
        {
          id: `prod-${Date.now()}`,
          name: quickName.trim(),
          price: Number(quickPrice) || 0,
          stock: quickStock,
          image: quickImage || ''
        },
        ...cat.products
      ];
      return { ...cat, products: newProds };
    });
    setCategories(updated);
    saveCategories(updated);
    setQuickName('');
    setQuickPrice(100);
  };

  const handleToggleStock = (catId, prodId) => {
    const updated = categories.map((cat) => {
      if (cat.id !== catId) return cat;
      return { ...cat, products: cat.products.map((p) => (p.id === prodId ? { ...p, stock: !p.stock } : p)) };
    });
    setCategories(updated);
    saveCategories(updated);
  };

  const openDeleteProductModal = (prod) => {
    setProductToDelete(prod);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      setDeleteLoading(true);
      const res = await productAPI.deleteProduct(productToDelete.id);
      if (res.success) {
        setToastMessage(t('cat.product_deleted_success'));
        setTimeout(() => setToastMessage(''), 2500);

        setProductToDelete(null);
        fetchCategories();
      } else {
        alert(res.message || t('cat.product_delete_failed'));
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      alert(err.message || t('cat.error_api_connect'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveProductModal = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim() || !selectedCategory || productForm.stock_count === '') {
      setValidationError(t('cat.fill_required_details'));
      return;
    }

    if (!editingProduct && !productForm.imageFile && !productForm.image) {
      setValidationError(t('cat.product_image_required'));
      return;
    }

    if (editingProduct && !productForm.imageFile && !productForm.image) {
      setValidationError(t('cat.product_image_required'));
      return;
    }

    try {
      setCatSubmitLoading(true);
      setUploadProgress(15);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
      }, 200);

      const formData = new FormData();
      formData.append('category_id', selectedCategory);
      formData.append('name', productForm.name.trim());
      formData.append('product_code', productForm.product_code.trim());
      formData.append('stock_count', String(productForm.stock_count || '0'));
      formData.append('pack_quantity', productForm.pack_quantity || '1 Box');
      formData.append('height', productForm.height || '');
      formData.append('type', productForm.type || 'Standard');
      formData.append('original_price', String(productForm.original_price || '0'));
      formData.append('discount_price', String(productForm.discount_price || '0'));
      formData.append('discount_type', discountType === 'percentage' ? 'percentage' : 'amount');
      formData.append('discount_value', String(discountValue || '0'));
      formData.append('description', productForm.description || '');

      if (productForm.imageFile) {
        formData.append('images', productForm.imageFile);
      }
      if (productForm.videoFile) {
        formData.append('videos', productForm.videoFile);
      }

      let res;
      if (editingProduct) {
        // Edit product API call (PUT /products/:id)
        res = await productAPI.updateProduct(editingProduct.id, formData);
      } else {
        // Create product API call (POST /products)
        res = await productAPI.createProduct(formData);
      }
      clearInterval(progressInterval);

      if (res.success) {
        setUploadProgress(100);
        setToastMessage(editingProduct ? t('cat.product_updated_success') : t('cat.product_created_success'));
        setTimeout(() => setToastMessage(''), 2500);

        setTimeout(() => {
          setShowProductModal(false);
          setEditingProduct(null);
          setUploadProgress(0);
          setDiscountType('rs');
          setDiscountValue('');
          setProductForm({
            name: '',
            product_code: '',
            stock_count: '',
            pack_quantity: '',
            height: '',
            type: '',
            original_price: '',
            discount_price: '',
            description: '',
            stock: true,
            image: null,
            video: '',
            imageFile: null,
            videoFile: null
          });
        }, 400);

        // Refresh categories and products list from backend
        fetchCategories();
      } else {
        alert(res.message || t('cat.product_create_failed'));
        setUploadProgress(0);
      }
    } catch (err) {
      console.error('Error saving product:', err);
      alert(err.message || t('cat.error_api_connect'));
      setUploadProgress(0);
    } finally {
      setCatSubmitLoading(false);
    }
  };

  const closeBulkUploadModal = () => {
    if (bulkUploadLoading) return;
    setBulkUploadOpen(false);
    setBulkUploadFile(null);
  };

  const handleBulkUpload = async (event) => {
    event.preventDefault();
    if (!bulkUploadFile) {
      setValidationError('Please choose an Excel or CSV product file.');
      return;
    }

    if (!/\.(xlsx|xls|csv)$/i.test(bulkUploadFile.name)) {
      setValidationError('Only .xlsx, .xls, or .csv files can be uploaded.');
      return;
    }

    try {
      setBulkUploadLoading(true);
      const formData = new FormData();
      formData.append('file', bulkUploadFile);
      const result = await productAPI.bulkUpload(formData);

      if (result.success === false) {
        throw new Error(result.message || 'Bulk upload failed.');
      }

      setToastMessage(result.message || 'Products uploaded successfully.');
      setTimeout(() => setToastMessage(''), 3000);
      setBulkUploadOpen(false);
      setBulkUploadFile(null);
      await fetchCategories();
    } catch (err) {
      console.error('Error uploading products in bulk:', err);
      setValidationError(err.message || 'Bulk upload failed. Please try again.');
    } finally {
      setBulkUploadLoading(false);
    }
  };

  const handleDownloadBulkTemplate = async () => {
    if (bulkTemplateLoading) return;

    try {
      setBulkTemplateLoading(true);
      const { blob, filename } = await productAPI.downloadBulkTemplate();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'products_bulk_template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      setToastMessage('Bulk template downloaded successfully.');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      console.error('Error downloading bulk template:', err);
      setValidationError(err.message || 'Failed to download bulk template.');
    } finally {
      setBulkTemplateLoading(false);
    }
  };

  const handlePrintCatalog = async () => {
    // 1. Fetch fresh shop details if missing or update to latest
    let currentShopDetails = shopDetails;
    try {
      const footerRes = await footerAPI.getFooter();
      if (footerRes && footerRes.success && footerRes.data) {
        const footData = Array.isArray(footerRes.data) ? footerRes.data[0] : footerRes.data;
        if (footData) {
          currentShopDetails = footData;
          setShopDetails(footData);
        }
      }
    } catch (e) {
      console.warn('Could not refresh footer details for catalog:', e);
    }

    // Get Shop Details
    const shopName = currentShopDetails?.shop_name || 'SIVAKASI CRACKERS & FIREWORKS';
    const shopAddress = currentShopDetails?.shop_address || '';
    const shopCity = currentShopDetails?.city || '';
    const fullAddress = [shopAddress, shopCity].filter(Boolean).join(', ');
    const shopPhone = currentShopDetails?.phone || '';
    const shopWhatsapp = currentShopDetails?.whatsapp || '';

    // Handle logo URL
    let shopLogo = currentShopDetails?.image_url || currentShopDetails?.image || '';
    if (shopLogo && !shopLogo.startsWith('http://') && !shopLogo.startsWith('https://') && !shopLogo.startsWith('data:')) {
      let cleanPath = shopLogo.replace(/^\/+/, '');
      if (cleanPath.startsWith('uploads/')) cleanPath = cleanPath.substring(8);
      shopLogo = `https://offer360.in/uploads/${cleanPath}`;
    }

    // Convert logo to Base64 in parent React document to guarantee it renders in PDF without CORS or canvas taint issues
    let shopLogoBase64 = '';
    if (shopLogo) {
      if (shopLogo.startsWith('data:')) {
        shopLogoBase64 = shopLogo;
      } else {
        try {
          // Attempt 1: Fetch via blob & FileReader
          const blobRes = await fetch(shopLogo);
          if (blobRes.ok) {
            const blob = await blobRes.blob();
            shopLogoBase64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = () => resolve('');
              reader.readAsDataURL(blob);
            });
          }
        } catch (fetchErr) {
          console.warn('Fetch blob conversion failed, trying Image canvas fallback:', fetchErr);
        }

        // Attempt 2: Image + Canvas in current document
        if (!shopLogoBase64) {
          try {
            shopLogoBase64 = await new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                try {
                  const canvas = document.createElement('canvas');
                  canvas.width = img.naturalWidth || img.width || 200;
                  canvas.height = img.naturalHeight || img.height || 200;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0);
                  const dataURI = canvas.toDataURL('image/png');
                  resolve(dataURI || '');
                } catch (err) {
                  resolve('');
                }
              };
              img.onerror = () => resolve('');
              img.src = shopLogo;
              setTimeout(() => resolve(''), 1500);
            });
          } catch (err) {
            console.warn('Image canvas fallback failed:', err);
          }
        }

        // If Base64 conversion was blocked by CORS, pass the direct URL as fallback
        if (!shopLogoBase64) {
          shopLogoBase64 = shopLogo;
        }
      }
    }

    // Shop initials for monogram badge fallback
    const shopInitials = (shopName || 'SC')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('') || 'SC';

    const printWindow = window.open('', '_blank', 'width=1000,height=850');
    if (!printWindow) {
      alert('Popup was blocked. Please allow popups to open the catalog.');
      return;
    }

    const categoriesData = categories || [];
    let totalProductsCount = 0;

    const categoryPalette = [
      { gradient: 'linear-gradient(135deg, #DC2626 0%, #EA580C 100%)', border: '#DC2626', headerBg: '#FEF2F2', headerText: '#991B1B' },
      { gradient: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)', border: '#7C3AED', headerBg: '#F5F3FF', headerText: '#5B21B6' },
      { gradient: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)', border: '#059669', headerBg: '#ECFDF5', headerText: '#065F46' },
      { gradient: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)', border: '#D97706', headerBg: '#FFFBEB', headerText: '#92400E' },
      { gradient: 'linear-gradient(135deg, #DB2777 0%, #E11D48 100%)', border: '#DB2777', headerBg: '#FDF2F8', headerText: '#9D174D' },
      { gradient: 'linear-gradient(135deg, #2563EB 0%, #0284C7 100%)', border: '#2563EB', headerBg: '#EFF6FF', headerText: '#1E40AF' },
    ];

    const categorySectionsHtml = categoriesData.map((cat, catIdx) => {
      const prods = cat.products || [];
      if (prods.length === 0) return '';

      const theme = categoryPalette[catIdx % categoryPalette.length];

      const productRowsHtml = prods.map((prod, pIdx) => {
        totalProductsCount += 1;
        const origPrice = Number(prod.original_price || prod.price || 0);
        const discPrice = Number(prod.discount_price || prod.price || 0);
        const discAmt = origPrice > discPrice ? origPrice - discPrice : 0;
        const discPct = origPrice > 0 && discAmt > 0 ? Math.round((discAmt / origPrice) * 100) : 0;

        let discountDisplay = '-';
        if (discAmt > 0) {
          if (prod.discount_type === 'percentage') {
            discountDisplay = `${prod.discount_value || discPct}% Off`;
          } else if (prod.discount_type === 'flat' || prod.discount_type === 'rs') {
            discountDisplay = `₹${prod.discount_value || discAmt} Off`;
          } else {
            discountDisplay = `${discPct}% Off`;
          }
        }

        return `
          <tr class="catalog-row" style="background-color: ${pIdx % 2 === 0 ? '#FFFFFF' : '#FFFDF7'};">
            <td class="col-sno">${pIdx + 1}</td>
            <td class="col-product">
              <span class="product-name">${prod.name || 'Unnamed Product'}</span>
            </td>
            <td class="col-price">${origPrice > 0 ? `₹${origPrice.toFixed(2)}` : '-'}</td>
            <td class="col-discount">${discountDisplay}</td>
            <td class="col-total">₹${discPrice.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      return `
        <div class="category-block" style="border: 1.5px solid ${theme.border};">
          <div class="category-title-bar" style="background: ${theme.gradient};">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="cat-name">${cat.name}</span>
            </div>
            <span class="cat-count" style="color: ${theme.border};">${prods.length} ITEMS</span>
          </div>
          <table class="catalog-table">
            <thead>
              <tr style="background: #FFF7ED; border-bottom: 2px solid #FDBA74;">
                <th class="col-sno" style="color: #9A3412;">S.NO</th>
                <th class="col-product" style="color: #9A3412;">PRODUCT NAME</th>
                <th class="col-price" style="color: #9A3412;">PRICE</th>
                <th class="col-discount" style="color: #9A3412;">DISCOUNT</th>
                <th class="col-total" style="color: #9A3412;">TOTAL PRICE</th>
              </tr>
            </thead>
            <tbody>
              ${productRowsHtml}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    const catalogDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${shopName} - Price List</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 6mm 8mm 6mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0F172A;
              background: #F8FAFC;
              padding: 16px;
              font-size: 13.5px;
              line-height: 1.4;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .paper-container {
              max-width: 900px;
              margin: 0 auto;
          
              padding: 18px 20px;
            
            }

            /* Screen Action Buttons */
            .no-print {
              text-align: center;
              margin-bottom: 18px;
              display: flex;
              justify-content: center;
              gap: 14px;
              flex-wrap: wrap;
            }
            .btn-action-download {
              background: linear-gradient(135deg, #16A34A 0%, #15803D 100%);
              color: #FFFFFF;
              border: none;
              padding: 12px 26px;
              border-radius: 9px;
              font-size: 15px;
              font-weight: 800;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(22, 163, 74, 0.35);
              display: inline-flex;
              align-items: center;
              gap: 8px;
            }
            .btn-action-download:hover {
              filter: brightness(1.08);
            }
            .btn-action-print {
              background: linear-gradient(135deg, #EA580C 0%, #C2410C 100%);
              color: #FFFFFF;
              border: none;
              padding: 12px 26px;
              border-radius: 9px;
              font-size: 15px;
              font-weight: 800;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(234, 88, 12, 0.35);
              display: inline-flex;
              align-items: center;
              gap: 8px;
            }
            .btn-action-print:hover {
              filter: brightness(1.08);
            }
            .btn-action-close {
              background: #F1F5F9;
              color: #475569;
              border: 1.5px solid #CBD5E1;
              padding: 12px 22px;
              border-radius: 9px;
              font-size: 15px;
              font-weight: 700;
              cursor: pointer;
            }
            .btn-action-close:hover {
              background: #E2E8F0;
            }

            /* Shop Details Header */
            .shop-header-card {
              background: linear-gradient(135deg, #7C2D12 0%, #C2410C 50%, #EA580C 100%);
              color: #FFFFFF;
              border-radius: 12px;
              padding: 16px 20px;
              margin-bottom: 16px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              box-shadow: 0 4px 12px rgba(194, 65, 12, 0.25);
              border: 2.5px solid #FDE047;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .shop-identity-group {
              display: flex;
              align-items: center;
              gap: 16px;
              flex: 1;
              min-width: 0;
            }
            .shop-logo-box {
              width: 76px;
              height: 76px;
              border-radius: 10px;
              background: #FFFFFF;
              border: 2.5px solid #FEF08A;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              flex-shrink: 0;
              padding: 4px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.18);
              position: relative;
            }
            .shop-logo-img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
              display: block;
            }
            .shop-logo-fallback {
              width: 100%;
              height: 100%;
              border-radius: 6px;
              background: linear-gradient(135deg, #FEF08A 0%, #F59E0B 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              font-weight: 900;
              color: #7C2D12;
              letter-spacing: 1px;
            }
            .shop-name-title {
              font-size: 22px;
              font-weight: 900;
              letter-spacing: 0.7px;
              text-transform: uppercase;
              color: #FEF08A;
              text-shadow: 1px 1px 3px rgba(0,0,0,0.35);
              line-height: 1.25;
            }
            .shop-address-text {
              font-size: 13px;
              color: #FFEDD5;
              margin-top: 4px;
              line-height: 1.35;
              font-weight: 600;
            }
            .shop-contact-badges {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-top: 6px;
              font-size: 12.5px;
              color: #FEF08A;
              font-weight: 800;
            }
            .shop-contact-badges span {
              background: rgba(0, 0, 0, 0.28);
              padding: 3px 10px;
              border-radius: 6px;
              border: 1px solid rgba(254, 240, 138, 0.5);
            }
            .header-badge {
              background: rgba(255, 255, 255, 0.22);
              backdrop-filter: blur(4px);
              border: 1.5px solid rgba(254, 240, 138, 0.7);
              border-radius: 10px;
              padding: 10px 14px;
              text-align: right;
              flex-shrink: 0;
            }
            .header-date {
              font-size: 13.5px;
              font-weight: 900;
              color: #FEF08A;
            }
            .header-total {
              font-size: 13px;
              color: #FFFFFF;
              font-weight: 800;
              margin-top: 3px;
            }

            /* Category Block & Tables */
            .category-block {
              border-radius: 8px;
              overflow: hidden;
              margin-bottom: 14px;
              box-shadow: 0 1px 5px rgba(0,0,0,0.05);
              /* Allow natural page breaks so no giant blank spaces in A4 */
              page-break-inside: auto;
              break-inside: auto;
            }
            .category-title-bar {
              color: #FFFFFF;
              padding: 8px 14px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              page-break-after: avoid;
              break-after: avoid;
            }
            .cat-name {
              font-size: 15px;
              font-weight: 900;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .cat-count {
              font-size: 12px;
              font-weight: 900;
              background: #FFFFFF;
              padding: 3px 10px;
              border-radius: 18px;
            }
            .catalog-table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
              break-inside: auto;
            }
            .catalog-table thead {
              display: table-header-group;
            }
            .catalog-table tr {
              page-break-inside: avoid;
              break-inside: avoid;
              border-bottom: 1px solid #FED7AA;
            }
            .catalog-table th {
              font-weight: 900;
              font-size: 12px;
              letter-spacing: 0.4px;
              padding: 8px 9px;
              border-right: 1px solid #FED7AA;
            }
            .catalog-table td {
              padding: 7px 9px;
              font-size: 13px;
              border-right: 1px solid #FFEDD5;
            }
            .col-sno {
              width: 44px;
              text-align: center;
              font-weight: 800;
              color: #9A3412;
            }
            .col-product {
              text-align: left;
            }
            .product-name {
              font-weight: 800;
              color: #0F172A;
              font-size: 13.5px;
              line-height: 1.3;
              display: inline-block;
            }
            .col-price {
              width: 100px;
              text-align: right;
              color: #334155;
              font-weight: 800;
              font-size: 13px;
            }
            .col-discount {
              width: 105px;
              text-align: right;
              font-weight: 900;
              color: #DC2626;
              font-size: 13.5px;
            }
            .col-total {
              width: 110px;
              text-align: right;
              font-weight: 900;
              color: #15803D;
              font-size: 14.5px;
              border-right: none !important;
            }

            .festive-footer {
              margin-top: 16px;
              text-align: center;
              font-size: 12px;
              color: #9A3412;
              font-weight: 800;
              border-top: 2px dashed #FDBA74;
              padding-top: 10px;
              letter-spacing: 0.3px;
              page-break-inside: avoid;
              break-inside: avoid;
            }

            /* Print Rules */
            @media print {
              body {
                background: #FFFFFF;
                padding: 0;
                margin: 0;
                font-size: 13px;
              }
              .paper-container {
                border: none;
                box-shadow: none;
                padding: 0;
                margin: 0;
                max-width: 100%;
              }
              .no-print {
                display: none !important;
              }
              .category-block {
                margin-bottom: 10px;
                page-break-inside: auto;
                break-inside: auto;
              }
              .category-title-bar {
                page-break-after: avoid;
                break-after: avoid;
              }
              tr {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="btn-action-print" onclick="window.print()">Print / Save as PDF</button>
            <button class="btn-action-close" onclick="window.close()">Close</button>
          </div>

          <div class="paper-container" id="catalog-paper">
            <div class="shop-header-card">
              <div class="shop-identity-group">
                <div class="shop-logo-box" id="logo-container">
                  ${shopLogoBase64 ? `
                    <img src="${shopLogoBase64}" alt="Logo" class="shop-logo-img" id="shop-main-logo" onerror="this.style.display='none'; document.getElementById('shop-logo-fallback-badge').style.display='flex';" />
                    <div class="shop-logo-fallback" id="shop-logo-fallback-badge" style="display: none;">${shopInitials}</div>
                  ` : `
                    <div class="shop-logo-fallback" id="shop-logo-fallback-badge">${shopInitials}</div>
                  `}
                </div>
                <div>
                  <div class="shop-name-title">${shopName}</div>
                  ${fullAddress ? `<div class="shop-address-text">${fullAddress}</div>` : ''}
                  <div class="shop-contact-badges">
                    ${shopPhone ? `<span>Phone: ${shopPhone}</span>` : ''}
                    ${shopWhatsapp ? `<span>WhatsApp: ${shopWhatsapp}</span>` : ''}
                  </div>
                </div>
              </div>
              <div class="header-badge">
                <div class="header-date">Date: ${catalogDate}</div>
                <div class="header-total">${totalProductsCount} Products</div>
              </div>
            </div>

            ${categorySectionsHtml || '<div style="text-align:center; padding: 30px; color: #9A3412; font-weight: 700;">No products available.</div>'}

            <div class="festive-footer">
              Best Quality Sivakasi Crackers • Safe & Certified Products • Have a Sparkling & Joyful Celebration!
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setDiscountType('rs');
    setDiscountValue('');
    setDiscountSelection('manual');
    setProductForm({
      name: '',
      product_code: '',
      stock_count: '',
      pack_quantity: '',
      height: '',
      type: '',
      original_price: '',
      discount_price: '',
      description: '',
      stock: true,
      image: null,
      video: '',
      imageFile: null,
      videoFile: null
    });
    setShowProductModal(true);
  };

  const openEditProduct = (prod) => {
    setEditingProduct(prod);
    setDiscountSelection('manual');
    const orig = String(prod.original_price || prod.price || 150);
    const disc = String(prod.discount_price || prod.price || 100);

    const origNum = Number(orig) || 0;
    const discNum = Number(disc) || 0;

    // Check backend discount_type & discount_value or fallback to auto-detection
    let initialMode = 'rs';
    let initialValue = String(Math.max(0, origNum - discNum));

    if (prod.discount_type === 'percentage') {
      initialMode = 'percentage';
      initialValue = prod.discount_value !== undefined && prod.discount_value !== null ? String(prod.discount_value) : initialValue;
    } else if (prod.discount_type === 'amount') {
      initialMode = 'rs';
      initialValue = prod.discount_value !== undefined && prod.discount_value !== null ? String(prod.discount_value) : initialValue;
    } else if (origNum > 0 && discNum > 0 && discNum < origNum) {
      const calcPct = ((origNum - discNum) / origNum) * 100;
      if (Math.abs(calcPct - Math.round(calcPct)) < 0.01) {
        initialMode = 'percentage';
        initialValue = String(Math.round(calcPct));
      }
    }

    setDiscountType(initialMode);
    setDiscountValue(initialValue);
    setProductForm({
      name: prod.name || '',
      product_code: prod.product_code || '',
      stock_count: prod.stock_count !== undefined && prod.stock_count !== null ? String(prod.stock_count) : '',
      pack_quantity: prod.pack_quantity || '1 Box',
      height: prod.height || '',
      type: prod.type || 'Standard',
      original_price: orig,
      discount_price: disc,
      description: prod.description || '',
      stock: prod.stock !== undefined ? prod.stock : true,
      image: prod.image || null,
      video: prod.video || ''
    });
    setShowProductModal(true);
  };

  const handleImageFileUpload = (e, isQuick = true) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isQuick) {
          setQuickImage(reader.result);
        } else {
          setProductForm((prev) => ({
            ...prev,
            image: reader.result,
            imageFile: file
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProductForm((prev) => ({
        ...prev,
        videoFileName: file.name,
        videoFile: file
      }));
    }
  };

  const filteredProducts = currentCat
    ? currentCat.products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : [];

  const totalProductCount = categories.reduce((sum, c) => sum + c.products.length, 0);

  const createGlobalDiscount = async () => {
    const value = Number(globalDiscountValue);
    if (!value || value <= 0 || (globalDiscountType === 'percentage' && value > 100)) return;

    const discountName = globalDiscountType === 'percentage'
      ? `${value}% Discount`
      : `₹${value} Discount`;

    const payload = {
      discount_name: discountName,
      title: discountName,
      name: discountName,
      discount_type: globalDiscountType,
      discount_value: value,
      discount_percentage: globalDiscountType === 'percentage' ? value : undefined,
      percentage: globalDiscountType === 'percentage' ? value : undefined,
      status: 'active',
      is_active: true,
    };

    try {
      const response = editingGlobalDiscountId
        ? await discountAPI.updateDiscount(editingGlobalDiscountId, payload)
        : await discountAPI.createDiscount(payload);
      const savedDiscount = response?.data || response?.discount || response;
      if (savedDiscount && (savedDiscount.id || savedDiscount.discount_id)) {
        const normalized = normalizeDiscounts([savedDiscount])[0];
        setGlobalDiscounts((current) => editingGlobalDiscountId
          ? current.map((discount) => discount.id === editingGlobalDiscountId ? normalized : discount)
          : [...current, normalized]);
      } else {
        await fetchGlobalDiscounts();
      }
      setGlobalDiscountValue('');
      setEditingGlobalDiscountId(null);
    } catch (err) {
      setError(err.message || 'Failed to save discount.');
    }
  };

  const editGlobalDiscount = (discount) => {
    setGlobalDiscountType(discount.type);
    setGlobalDiscountValue(String(discount.value));
    setEditingGlobalDiscountId(discount.id);
  };

  const deleteGlobalDiscount = async (discountId) => {
    try {
      await discountAPI.deleteDiscount(discountId);
      setGlobalDiscounts((current) => current.filter((item) => item.id !== discountId));
      if (editingGlobalDiscountId === discountId) {
        setEditingGlobalDiscountId(null);
        setGlobalDiscountValue('');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete discount.');
    }
  };

  const categorySelectOptions = categories.map((c) => ({ label: c.name, value: c.id }));
  const stockSelectOptions = [
    { label: t('cat.in_stock'), value: true },
    { label: t('cat.out_of_stock'), value: false }
  ];

  return (
    <div className="dashboard-container">
      {/* Page Title */}
      <div className="page-title-row">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers color="#5B5FC7" size={24} />
            <span>{t('cat.page_title')}</span>
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '2px', fontWeight: 600 }}>
            {t('cat.page_subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <PageRefreshButton />
          <button className="btn-secondary" style={{ border: '1.5px solid #FBCFE8', color: '#BE185D', fontWeight: 800 }} onClick={() => setDiscountModalOpen(true)}>
            <Percent size={17} />
            <span>Discount</span>
          </button>
          <button
            className="btn-secondary"
            style={{ border: '1.5px solid #BBF7D0', color: '#15803D', fontWeight: 800 }}
            onClick={handleDownloadBulkTemplate}
            disabled={bulkTemplateLoading}
          >
            {bulkTemplateLoading ? <Loader2 className="animate-spin" size={17} /> : <Download size={17} />}
            <span>{bulkTemplateLoading ? 'Downloading...' : 'Bulk Template'}</span>
          </button>
          <button className="btn-secondary" style={{ border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontWeight: 800 }} onClick={() => setBulkUploadOpen(true)}>
            <Upload size={17} />
            <span>Bulk Upload</span>
          </button>
          <button
            className="btn-secondary"
            style={{ border: '1.5px solid #FED7AA', color: '#C2410C', fontWeight: 800 }}
            onClick={handlePrintCatalog}
            title="View & Download Product Catalog / Price List"
          >
            <BookOpen size={17} />
            <span>Catalog</span>
          </button>
          <button className="btn-secondary" style={{ border: '1.5px solid #C7D2FE', color: '#5B5FC7', fontWeight: 800 }} onClick={openAddProductModal}>
            <Plus size={18} />
            <span>+ {t('cat.add_new_product')}</span>
          </button>

          <button className="btn-primary" onClick={openAddCategoryModal}>
            <Plus size={18} />
            <span>+ {t('cat.add_new_category')}</span>
          </button>
        </div>
      </div>

      {/* Full Page Centered Spinner Loader */}
      {loading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 220px)',
          width: '100%',
          gap: '16px'
        }}>
          <Loader2 className="animate-spin" size={48} color="#5B5FC7" />
          <span style={{ color: '#475569', fontSize: '1rem', fontWeight: 800 }}>
            {t('cat.loading')}
          </span>
        </div>
      )}

      {error && (
        <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '14px 20px', borderRadius: '12px', fontWeight: 600, marginBottom: '20px' }}>
          {error}
        </div>
      )}



      {/* CATEGORY TABS — draggable + All Categories tab */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', overflowX: 'auto', paddingBottom: '6px', flexWrap: 'wrap' }}>

        {/* All Categories tab */}
        <button
          onClick={() => { setViewAll(true); setAllSearch(''); }}
          className={`chip-btn ${viewAll ? 'active' : ''}`}
          style={{ padding: '8px 14px', fontSize: '0.85rem', background: viewAll ? 'linear-gradient(135deg,#5B5FC7,#8B6FE8)' : undefined, color: viewAll ? '#fff' : undefined, fontWeight: 800 }}
        >
          <Layers size={14} />
          <span style={{ marginLeft: '5px' }}>{t('cat.all_categories')}</span>
          <span className="nav-badge" style={{ marginLeft: '6px', background: viewAll ? 'rgb(255, 255, 255)' : undefined, color: viewAll ? '#5B5FC7' : undefined }}>{categories.length}</span>
        </button>

        {/* Individual category tabs */}
        {categories.map((cat, idx) => (
          <div
            key={cat.id}
            draggable
            onDragStart={(e) => onCatDragStart(e, idx)}
            onDragOver={(e) => onCatDragOver(e, idx)}
            onDrop={onCatDrop}
            onDragEnd={onCatDragEnd}
            style={{ display: 'flex', alignItems: 'center', opacity: dragOverCat === idx ? 0.5 : 1, transition: 'opacity 0.15s', cursor: 'grab' }}
          >
            <span style={{ marginRight: '4px', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
              <GripVertical size={14} />
            </span>
            <button
              onClick={() => { setViewAll(false); handleSelectCategory(cat.id); }}
              className={`chip-btn ${!viewAll && selectedCategory === cat.id ? 'active' : ''}`}
              style={{ padding: '6px 14px 6px 8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {cat.image && (
                <img
                  src={cat.image}
                  alt={cat.name}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.4)' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <span>{cat.name}</span>
              <span className="nav-badge">{cat.products.length}</span>
            </button>
            {!viewAll && selectedCategory === cat.id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '-4px' }}>
                <button
                  onClick={(e) => openEditCategoryModal(cat, e)}
                  style={{ border: 'none', background: '#EEF2FF', color: '#5B5FC7', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}
                  title={t('cat.edit_category')}
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}
                  title={t('cat.delete_category')}
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '9999px' }} onClick={() => setShowAddCatModal(true)}>
          <Plus size={14} /><span>{t('cat.new_category')}</span>
        </button>
      </div>

      {/* ALL CATEGORIES VIEW */}
      {viewAll && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px', padding: '2px 4px', overflow: 'visible' }}>
          {/* Global search & Expand/Collapse All */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                {t('cat.all_categories')} — {totalProductCount} {t('cat.products')}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                <GripVertical size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {t('cat.drag_hint')}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                onClick={() => {
                  if (openCatIds.length === categories.length) {
                    setOpenCatIds([]);
                  } else {
                    setOpenCatIds(categories.map((c) => c.id));
                  }
                }}
              >
                {openCatIds.length === categories.length ? t('cat.collapse_all') : t('cat.expand_all')}
              </button>

              <div className="search-input-wrapper" style={{ width: '240px' }}>
                <Search size={14} color="#64748B" />
                <input type="text" className="search-input-field" style={{ fontSize: '0.8rem' }} placeholder={t('cat.search_all_products')} value={allSearch} onChange={(e) => setAllSearch(e.target.value)} />
              </div>
            </div>
          </div>

          {categories.map((cat, catIdx) => {
            const catProds = cat.products.filter((p) =>
              !allSearch || p.name.toLowerCase().includes(allSearch.toLowerCase())
            );
            if (catProds.length === 0 && allSearch) return null;
            const isMoved = movedCatId === cat.id;
            const isOpen = openCatIds.includes(cat.id) || allSearch.length > 0;
            const isDraggingOver = dragOverCat === catIdx;

            // Directional smooth slide animation transform
            let animTransform = 'translateY(0px) scale(1)';
            if (isMoved) {
              if (moveDirection === 'up') {
                animTransform = 'translateY(-8px) scale(1.005)';
              } else if (moveDirection === 'down') {
                animTransform = 'translateY(8px) scale(1.005)';
              } else {
                animTransform = 'scale(1.005)';
              }
            }

            // Glassmorphism Frosted Accent Colors
            const glassAccents = [
              { border: '#6366F1', text: '#4F46E5', bg: 'rgba(99, 102, 241, 0.08)', pill: '#EEF2FF' },
              { border: '#3B82F6', text: '#2563EB', bg: 'rgba(59, 130, 246, 0.08)', pill: '#EFF6FF' },
              { border: '#EC4899', text: '#DB2777', bg: 'rgba(236, 72, 153, 0.08)', pill: '#FDF2F8' },
              { border: '#10B981', text: '#059669', bg: 'rgba(16, 185, 129, 0.08)', pill: '#ECFDF5' },
              { border: '#F59E0B', text: '#D97706', bg: 'rgba(245, 158, 11, 0.08)', pill: '#FFFBEB' },
              { border: '#8B5CF6', text: '#7C3AED', bg: 'rgba(139, 92, 246, 0.08)', pill: '#F5F3FF' }
            ];
            const currentAccent = glassAccents[catIdx % glassAccents.length];

            return (
              <div
                key={cat.id}
                draggable
                onDragStart={(e) => onCatDragStart(e, catIdx)}
                onDragOver={(e) => onCatDragOver(e, catIdx)}
                onDrop={onCatDrop}
                onDragEnd={onCatDragEnd}
                className="admin-card"
                style={{
                  padding: '0',
                  overflow: 'hidden',
                  transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, outline-color 0.3s ease',
                  transform: animTransform,
                  boxShadow: isMoved ? '0 0 0 2px #10B981 inset, 0 14px 35px rgba(16, 185, 129, 0.2)' : isDraggingOver ? '0 0 0 2px #5B5FC7 inset, 0 8px 20px rgba(91, 95, 199, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.03)',
                  border: `1px solid ${isMoved ? '#10B981' : isDraggingOver ? '#5B5FC7' : `${currentAccent.border}40`}`,
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  opacity: isDraggingOver ? 0.7 : 1
                }}
              >
                {/* Category Header Bar — Premium Glassmorphism Look */}
                <div
                  onClick={() => toggleCategoryAccordion(cat.id)}
                  style={{
                    background: currentAccent.bg,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: isOpen ? `1px solid ${currentAccent.border}30` : 'none',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Drag Handle Icon */}
                    <div
                      style={{ cursor: 'grab', color: '#94A3B8', display: 'flex', alignItems: 'center', padding: '2px' }}
                      title={t('cat.drag_reorder_category')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical size={20} />
                    </div>

                    <span style={{ background: currentAccent.border, color: '#FFFFFF', padding: '3px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}>
                      #{catIdx + 1}
                    </span>

                    <span
                      title={`Category ID: ${cat.id}`}
                      style={{
                        background: '#FFFFFF',
                        color: '#334155',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '3px 9px',
                        fontSize: '0.76rem',
                        fontWeight: 900,
                        letterSpacing: '0.01em'
                      }}
                    >
                      ID: {cat.id}
                    </span>

                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        style={{ width: '30px', height: '30px', borderRadius: '8px', objectFit: 'cover', border: `1px solid ${currentAccent.border}50` }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: currentAccent.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Layers size={16} color="#FFF" />
                      </div>
                    )}

                    <span style={{ color: '#0F172A', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.01em' }}>{cat.name}</span>

                    <span style={{ background: currentAccent.pill, color: currentAccent.text, border: `1px solid ${currentAccent.border}40`, borderRadius: '999px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 800 }}>
                      {cat.products.length} {cat.products.length === 1 ? t('cat.product') : t('cat.products')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={(e) => openEditCategoryModal(cat, e)}
                      style={{
                        background: '#FFFFFF',
                        border: `1px solid ${currentAccent.border}40`,
                        color: currentAccent.text,
                        borderRadius: '8px',
                        padding: '5px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                        transition: 'all 0.2s ease'
                      }}
                      title={t('cat.edit_category')}
                    >
                      <Edit2 size={13} color={currentAccent.text} />
                      <span>{t('cat.edit')}</span>
                    </button>
                    <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>
                      {isOpen ? t('cat.collapse') : t('cat.expand')}
                    </span>
                    <div style={{ background: '#FFFFFF', border: `1px solid ${currentAccent.border}30`, borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isOpen ? <ChevronDown size={18} color="#475569" /> : <ChevronRight size={18} color="#475569" />}
                    </div>
                  </div>
                </div>

                {/* Dropdown Collapsible Product Body (Initially Closed) */}
                {isOpen && (
                  <div>
                    {catProds.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '0.88rem', fontWeight: 600 }}>
                        {t('cat.no_products_found')}
                      </div>
                    ) : (
                      <div
                        className="admin-table-container"
                        style={{
                          maxHeight: catProds.length > 10 ? '540px' : 'none',
                          overflowY: catProds.length > 10 ? 'auto' : 'visible'
                        }}
                      >
                        <table className="admin-table">
                          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F8FAFC' }}>
                            <tr>
                              <th style={{ width: '36px' }}></th>
                              <th style={{ width: '60px' }}>{t('cat.th_image')}</th>
                              <th>{t('cat.th_product_name')}</th>
                              <th>{t('cat.product_code')}</th>
                              <th>{t('cat.stock_count')}</th>
                              <th>{t('cat.th_pack_qty')}</th>
                              <th>{t('cat.th_type')}</th>
                              <th>{t('cat.th_orig_price')}</th>
                              <th>{t('cat.th_discount')}</th>
                              <th>{t('cat.th_total_price')}</th>
                              <th>{t('cat.th_availability')}</th>
                              <th style={{ textAlign: 'right' }}>{t('cat.th_actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {catProds.map((p, pIdx) => {
                              const origPrice = Number(p.original_price || p.price || 0);
                              const discPrice = Number(p.discount_price || p.price || 0);
                              const discAmt = origPrice > discPrice ? origPrice - discPrice : 0;
                              const discPct = origPrice > 0 && discAmt > 0 ? Math.round((discAmt / origPrice) * 100) : 0;
                              const isMovedProd = movedProdId === p.id;

                              return (
                              <tr
                                key={p.id}
                                draggable
                                onDragStart={(e) => {
                                  dragProdIdx.current = pIdx;
                                  dragCatIdForProd.current = cat.id;
                                  e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  dragOverProdIdx.current = pIdx;
                                  setDragOverProd(pIdx);
                                }}
                                onDrop={async (e) => {
                                   e.preventDefault();
                                   const from = dragProdIdx.current;
                                   const to = dragOverProdIdx.current;
                                   if (from === null || to === null || from === to || dragCatIdForProd.current !== cat.id) {
                                     setDragOverProd(null);
                                     return;
                                   }
                                   const movedProd = catProds[from];
                                   const newPosition = to + 1;

                                   const updated = categories.map((cItem) => {
                                     if (cItem.id !== cat.id) return cItem;
                                     const prods = [...cItem.products];
                                     const [moved] = prods.splice(from, 1);
                                     prods.splice(to, 0, moved);
                                     return { ...cItem, products: prods };
                                   });
                                   setCategories(updated);
                                   saveCategories(updated);

                                   if (movedProd?.id) triggerProductMovedAnimation(movedProd.id);
                                   if (movedProd && movedProd.id) {
                                     try {
                                       await productAPI.updateProductPosition(movedProd.id, newPosition);
                                     } catch (err) {
                                       console.error('Failed to update product position via API:', err);
                                     }
                                   }

                                   dragProdIdx.current = null;
                                   dragOverProdIdx.current = null;
                                   setDragOverProd(null);
                                 }}
                                onDragEnd={() => setDragOverProd(null)}
                                style={{
                                  background: isMovedProd ? '#ECFDF5' : dragOverProd === pIdx ? '#EEF2FF' : undefined,
                                  boxShadow: isMovedProd ? '0 0 0 2px #10B981 inset' : undefined,
                                  transition: 'background 0.15s, box-shadow 0.2s ease',
                                  cursor: 'default'
                                }}
                              >
                                <td style={{ padding: '10px 6px', cursor: 'grab', color: '#94A3B8' }} title={t('cat.drag_reorder_product')}>
                                  <GripVertical size={16} />
                                </td>
                                <td>
                                  <div
                                     style={{ position: 'relative', width: '40px', height: '40px', display: 'inline-block', cursor: p.video ? 'pointer' : 'default' }}
                                     onClick={() => p.video && setPreviewVideoUrl(p.video)}
                                     title={p.video ? t('cat.click_play_demo') : p.name}
                                   >
                                     <img src={p.image || ''} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #CBD5E1', display: 'block' }} />
                                     {p.video && (
                                       <div
                                         style={{
                                           position: 'absolute',
                                           bottom: '-2px',
                                           right: '-2px',
                                           background: '#D97706',
                                           color: '#FFFFFF',
                                           borderRadius: '50%',
                                           width: '18px',
                                           height: '18px',
                                           display: 'flex',
                                           alignItems: 'center',
                                           justifyContent: 'center',
                                           border: '2px solid #FFFFFF',
                                           boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                         }}
                                       >
                                         <Video size={10} color="#FFFFFF" />
                                       </div>
                                     )}
                                   </div>
                                </td>
                                <td style={{ fontWeight: 800, color: '#0F172A' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                    <span>{p.name}</span>
                                    {isRecentlyAdded(p) && <span style={{ padding: '2px 5px', borderRadius: '999px', background: '#DCFCE7', color: '#15803D', fontSize: '0.58rem', fontWeight: 800, lineHeight: 1.1, whiteSpace: 'nowrap' }}>New</span>}
                                  </div>
                                </td>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#475569', fontWeight: 700 }}>
                                 <button
                                   onClick={() => setCodeModalProduct(p)}
                                   style={{
                                     border: 'none',
                                     background: '#F1F5F9',
                                     color: '#5B5FC7',
                                     padding: '3px 8px',
                                     borderRadius: '6px',
                                     cursor: 'pointer',
                                     display: 'inline-flex',
                                     alignItems: 'center',
                                     gap: '4px',
                                     fontFamily: 'monospace',
                                     fontWeight: 800,
                                     transition: 'all 0.15s ease'
                                   }}
                                   title="Click to view Barcode & QR Code"
                                 >
                                   <QrCode size={12} />
                                   <span>{p.product_code || p.id}</span>
                                 </button>
                               </td>
                                <td style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>{p.stock_count === '' ? '—' : p.stock_count}</td>
                                <td style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>{p.pack_quantity || t('cat.one_box')}</td>
                                <td style={{ fontSize: '0.85rem', color: '#64748B' }}>{p.type || t('cat.standard')}</td>
                                <td style={{ fontWeight: 600, color: '#94A3B8', textDecoration: 'line-through', fontSize: '0.85rem' }}>₹{origPrice.toFixed(2)}</td>
                                <td style={{ fontSize: '0.82rem', fontWeight: 700, color: discAmt > 0 ? '#EF4444' : '#94A3B8' }}>
                                  {discAmt > 0 ? (
                                    p.discount_type === 'percentage'
                                      ? `${p.discount_value || discPct}% ${t('cat.off')}`
                                      : `₹${p.discount_value || discAmt} ${t('cat.off')}`
                                  ) : t('cat.no_disc')}
                                </td>
                                <td style={{ fontWeight: 800, color: '#10B981', fontSize: '0.92rem' }}>₹{discPrice.toFixed(2)}</td>
                                <td>
                                  <button onClick={() => handleToggleStock(cat.id, p.id)} className={`badge ${p.stock ? 'badge-completed' : 'badge-unpaid'}`} style={{ border: 'none', cursor: 'pointer' }}>
                                    {p.stock ? t('cat.in_stock') : t('cat.out_of_stock')}
                                  </button>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                    <button
                                      className="header-action-btn"
                                      style={{ padding: '5px 8px', background: '#EEF2FF', border: '1px solid #C7D2FE' }}
                                      onClick={() => setCodeModalProduct(p)}
                                      title="Generate & View Barcode / QR Code"
                                    >
                                      <QrCode size={14} color="#5B5FC7" />
                                      <span style={{ color: '#5B5FC7', fontWeight: 800 }}>Code</span>
                                    </button>
                                    {p.video && (
                                      <button
                                        className="header-action-btn"
                                        style={{ padding: '5px 8px', background: '#FEF3C7', border: '1px solid #FCD34D' }}
                                        onClick={() => setPreviewVideoUrl(p.video)}
                                        title={t('cat.watch_demo_video')}
                                      >
                                        <Video size={14} color="#D97706" />
                                        <span style={{ color: '#D97706', fontWeight: 800 }}>{t('cat.demo')}</span>
                                      </button>
                                    )}
                                    <button className="header-action-btn" style={{ padding: '5px 8px' }} onClick={() => { setViewAll(false); setSelectedCategory(cat.id); openEditProduct(p); }}>
                                      <Edit2 size={14} color="#5B5FC7" /><span>{t('cat.edit')}</span>
                                    </button>
                                    <button className="header-action-btn" style={{ padding: '5px 8px' }} onClick={() => openDeleteProductModal(p)}>
                                      <Trash2 size={14} color="#EF4444" />
                                    </button>
                                  </div>
                                </td>
                               </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PRODUCTS TABLE — draggable rows (single category view) */}
      {!viewAll && currentCat && (
        <div className="admin-card" style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
              {t('cat.products_in')} {currentCat.name} ({filteredProducts.length})
            </h3>
            <div className="search-input-wrapper" style={{ width: '250px' }}>
              <Search size={14} color="#64748B" />
              <input type="text" className="search-input-field" style={{ fontSize: '0.8rem' }} placeholder={t('cat.search_products')} value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            </div>
          </div>

          <div
            className="admin-table-container"
            style={{
              maxHeight: filteredProducts.length > 10 ? '540px' : 'none',
              overflowY: filteredProducts.length > 10 ? 'auto' : 'visible'
            }}
          >
            <table className="admin-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F8FAFC' }}>
                <tr>
                  <th style={{ width: '32px' }}></th>
                <th style={{ width: '60px' }}>{t('cat.th_image')}</th>
                  <th>{t('cat.th_product_name')}</th>
                  <th>{t('cat.product_code')}</th>
                  <th>{t('cat.stock_count')}</th>
                  <th>{t('cat.th_pack_qty')}</th>
                  <th>{t('cat.th_type')}</th>
                  <th>{t('cat.th_orig_price')}</th>
                  <th>{t('cat.th_discount')}</th>
                  <th>{t('cat.th_total_price')}</th>
                  <th>{t('cat.th_availability')}</th>
                  <th style={{ textAlign: 'right' }}>{t('cat.th_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                      {t('cat.no_items_found')}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p, idx) => {
                    const origPrice = Number(p.original_price || p.price || 0);
                    const discPrice = Number(p.discount_price || p.price || 0);
                    const discAmt = origPrice > discPrice ? origPrice - discPrice : 0;
                    const discPct = origPrice > 0 && discAmt > 0 ? Math.round((discAmt / origPrice) * 100) : 0;
                    const isMovedProd = movedProdId === p.id;

                    return (
                    <tr
                      key={p.id}
                      draggable
                      onDragStart={(e) => onProdDragStart(e, idx)}
                      onDragOver={(e) => onProdDragOver(e, idx)}
                      onDrop={onProdDrop}
                      onDragEnd={onProdDragEnd}
                      style={{
                        background: isMovedProd ? '#ECFDF5' : dragOverProd === idx ? '#EEF2FF' : undefined,
                        boxShadow: isMovedProd ? '0 0 0 2px #10B981 inset' : undefined,
                        transition: 'background 0.15s, box-shadow 0.2s ease',
                        cursor: 'default'
                      }}
                    >
                      {/* Drag handle */}
                      <td style={{ padding: '10px 6px', cursor: 'grab', color: '#94A3B8' }} title={t('cat.drag_reorder_product')}>
                        <GripVertical size={16} />
                      </td>
                      <td>
                        <div
                          style={{ position: 'relative', width: '40px', height: '40px', display: 'inline-block', cursor: p.video ? 'pointer' : 'default' }}
                          onClick={() => p.video && setPreviewVideoUrl(p.video)}
                          title={p.video ? t('cat.click_play_demo') : p.name}
                        >
                          <img src={p.image || ''} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #CBD5E1', display: 'block' }} />
                          {p.video && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '-2px',
                                right: '-2px',
                                background: '#D97706',
                                color: '#FFFFFF',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #FFFFFF',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                              }}
                            >
                              <Video size={10} color="#FFFFFF" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 800, color: '#0F172A' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span>{p.name}</span>
                          {isRecentlyAdded(p) && <span style={{ padding: '2px 5px', borderRadius: '999px', background: '#DCFCE7', color: '#15803D', fontSize: '0.58rem', fontWeight: 800, lineHeight: 1.1, whiteSpace: 'nowrap' }}>New</span>}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#475569', fontWeight: 700 }}>
                        <button
                          onClick={() => setCodeModalProduct(p)}
                          style={{
                            border: 'none',
                            background: '#F1F5F9',
                            color: '#5B5FC7',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            transition: 'all 0.15s ease'
                          }}
                          title="Click to view Barcode & QR Code"
                        >
                          <QrCode size={12} />
                          <span>{p.product_code || p.id}</span>
                        </button>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>{p.stock_count === '' ? '—' : p.stock_count}</td>
                      <td style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>{p.pack_quantity || t('cat.one_box')}</td>
                      <td style={{ fontSize: '0.85rem', color: '#64748B' }}>{p.type || t('cat.standard')}</td>
                      <td style={{ fontWeight: 600, color: '#94A3B8', textDecoration: 'line-through', fontSize: '0.85rem' }}>₹{origPrice.toFixed(2)}</td>
                      <td style={{ fontSize: '0.82rem', fontWeight: 700, color: discAmt > 0 ? '#EF4444' : '#94A3B8' }}>
                        {discAmt > 0 ? (
                          p.discount_type === 'percentage'
                            ? `${p.discount_value || discPct}% ${t('cat.off')}`
                            : `₹${p.discount_value || discAmt} ${t('cat.off')}`
                        ) : t('cat.no_disc')}
                      </td>
                      <td style={{ fontWeight: 800, color: '#10B981', fontSize: '0.92rem' }}>₹{discPrice.toFixed(2)}</td>
                      <td>
                        <button onClick={() => handleToggleStock(currentCat.id, p.id)} className={`badge ${p.stock ? 'badge-completed' : 'badge-unpaid'}`} style={{ border: 'none', cursor: 'pointer' }}>
                          {p.stock ? t('cat.in_stock') : t('cat.out_of_stock')}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            className="header-action-btn"
                            style={{ padding: '5px 8px', background: '#EEF2FF', border: '1px solid #C7D2FE' }}
                            onClick={() => setCodeModalProduct(p)}
                            title="Generate & View Barcode / QR Code"
                          >
                            <QrCode size={14} color="#5B5FC7" />
                            <span style={{ color: '#5B5FC7', fontWeight: 800 }}>Code</span>
                          </button>
                          {p.video && (
                            <button
                              className="header-action-btn"
                              style={{ padding: '5px 8px', background: '#FEF3C7', border: '1px solid #FCD34D' }}
                              onClick={() => setPreviewVideoUrl(p.video)}
                              title={t('cat.watch_demo_video')}
                            >
                              <Video size={14} color="#D97706" />
                              <span style={{ color: '#D97706', fontWeight: 800 }}>{t('cat.demo')}</span>
                            </button>
                          )}
                          <button className="header-action-btn" style={{ padding: '5px 8px' }} onClick={() => openEditProduct(p)} title={t('cat.edit_product')}>
                            <Edit2 size={14} color="#5B5FC7" /><span>{t('cat.edit')}</span>
                          </button>
                          <button className="header-action-btn" style={{ padding: '5px 8px' }} onClick={() => openDeleteProductModal(p)} title={t('cat.delete_product')}>
                            <Trash2 size={14} color="#EF4444" />
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
      )}

      {/* ADD / EDIT CATEGORY MODAL */}
      {showAddCatModal && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color="#5B5FC7" />
                <span>{editingCategory ? t('cat.edit_category') : t('cat.add_new_category')}</span>
              </h2>
              <button className="modal-close" onClick={() => setShowAddCatModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('cat.category_name')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('cat.eg_night_attractions')}
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('cat.position')}</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder={t('cat.eg_1')}
                  required
                  value={newCatPosition}
                  onChange={(e) => setNewCatPosition(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('cat.category_image')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
                  {newCatImage ? (
                    <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
                      <img
                        src={URL.createObjectURL(newCatImage)}
                        alt={t('cat.preview')}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', border: '2px solid #C7D2FE', boxShadow: '0 4px 10px rgba(91,95,199,0.15)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setNewCatImage(null)}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#EF4444', color: '#FFF', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        title={t('cat.remove_new_image')}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : newCatImagePreview ? (
                    <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
                      <img
                        src={newCatImagePreview}
                        alt={t('cat.existing')}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', border: '2px solid #CBD5E1' }}
                      />
                    </div>
                  ) : (
                    <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: '#F1F5F9', border: '2px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#94A3B8' }}>
                      <Upload size={22} />
                    </div>
                  )}

                  <label style={{ flex: 1, cursor: 'pointer' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      background: '#F8FAFC',
                      border: '1.5px dashed #C7D2FE',
                      borderRadius: '10px',
                      color: '#5B5FC7',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      transition: 'all 0.2s ease'
                    }}>
                      <Upload size={16} />
                      <span>{newCatImage ? newCatImage.name : editingCategory ? t('cat.change_image_file') : t('cat.choose_image_file')}</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => setNewCatImage(e.target.files[0] || null)}
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddCatModal(false)} disabled={catSubmitLoading}>
                  {t('cat.cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={catSubmitLoading}>
                  {catSubmitLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>{t('cat.saving')}</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>{editingCategory ? t('cat.update_category') : t('cat.create_category')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div className="modal-content product-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingProduct ? t('cat.edit_product_details') : `${t('cat.add_product_to')} ${currentCat?.name}`}</h2>
              <button className="modal-close" onClick={() => setShowProductModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveProductModal} className="product-edit-form">
              {/* Modern Custom Image & Video Upload Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                {/* Product Image Drop Zone (Mandatory) */}
                <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    {t('cat.product_image')} <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    background: '#F8FAFC',
                    border: '1.5px dashed #C7D2FE',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                    minWidth: 0
                  }}>
                    {productForm.image ? (
                      <img src={productForm.image} alt={t('cat.preview')} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #CBD5E1', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5B5FC7', flexShrink: 0 }}>
                        <Upload size={18} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <span
                        title={productForm.imageFile ? productForm.imageFile.name : productForm.image ? t('cat.change_image') : t('cat.upload_image')}
                        style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#5B5FC7', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}
                      >
                        {productForm.imageFile ? productForm.imageFile.name : productForm.image ? t('cat.change_image') : t('cat.upload_image')}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{t('cat.png_jpg_webp')}</span>
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleImageFileUpload(e, false)} style={{ display: 'none' }} />
                  </label>
                </div>

                {/* Product Video Drop Zone (Optional) */}
                <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    {t('cat.product_video')} <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>({t('cat.optional')})</span>
                  </label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      background: '#F8FAFC',
                      border: '1.5px dashed #C7D2FE',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      overflow: 'hidden',
                      flex: 1,
                      minWidth: 0
                    }}>
                    {(productForm.videoFile || productForm.video) ? (
                      <div style={{ width: '36px', height: '36px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #FCD34D', flexShrink: 0, position: 'relative', background: '#000' }}>
                        <video
                          src={productForm.videoFile ? URL.createObjectURL(productForm.videoFile) : productForm.video}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          preload="metadata"
                          muted
                        />
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Video size={14} color="#FFFFFF" />
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', flexShrink: 0 }}>
                        <Zap size={18} />
                      </div>
                    )}
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <span
                          title={productForm.videoFileName ? productForm.videoFileName : productForm.video ? (typeof productForm.video === 'string' ? productForm.video.split('/').pop() : t('cat.video_attached')) : t('cat.upload_video')}
                          style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#D97706', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}
                        >
                          {productForm.videoFileName
                            ? productForm.videoFileName
                            : productForm.video
                              ? t('cat.change_video')
                              : t('cat.upload_video')}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                          {productForm.video ? t('cat.video_attached') : t('cat.mp4_webm_demo')}
                        </span>
                      </div>
                      <input type="file" accept="video/*" onChange={handleVideoFileUpload} style={{ display: 'none' }} />
                    </label>

                    {productForm.video && (
                      <button
                        type="button"
                        onClick={() => setPreviewVideoUrl(productForm.videoFile || productForm.video)}
                        style={{
                          height: '52px',
                          padding: '0 10px',
                          background: '#FEF3C7',
                          border: '1px solid #FCD34D',
                          borderRadius: '10px',
                          color: '#D97706',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                        title={t('cat.watch_video_preview')}
                      >
                        <Video size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {t('cat.target_category')} <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <CustomSelect options={categorySelectOptions} value={selectedCategory} onChange={(val) => { setSelectedCategory(val); setQuickCategory(val); }} style={{ width: '100%' }} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {t('cat.product_name_label')} <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input type="text" className="form-input" placeholder={t('cat.eg_sparklers')} required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('cat.product_code')}</label>
                  <input type="text" className="form-input" placeholder={t('cat.eg_product_code')} value={productForm.product_code} onChange={(e) => setProductForm({ ...productForm, product_code: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    {t('cat.stock_count')} <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input type="number" min="0" inputMode="numeric" className="form-input" placeholder={t('cat.eg_stock_count')} required value={productForm.stock_count} onChange={(e) => setProductForm({ ...productForm, stock_count: e.target.value.replace(/\D/g, '') })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    {t('cat.pack_quantity')} <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input type="text" className="form-input" placeholder={t('cat.eg_box_pcs')} required value={productForm.pack_quantity} onChange={(e) => setProductForm({ ...productForm, pack_quantity: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('cat.height_size')}</label>
                  <input type="text" className="form-input" placeholder={t('cat.eg_cm_standard')} value={productForm.height} onChange={(e) => setProductForm({ ...productForm, height: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'start' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      {t('cat.original_price')} (₹) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="form-input"
                    placeholder={t('cat.eg_150')}
                    required
                    value={productForm.original_price}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const newOrig = e.target.value.replace(/\D/g, '');
                      let newDiscPrice = productForm.discount_price;
                      if (newOrig && discountValue) {
                        const offVal = Number(discountValue) || 0;
                        const origNum = Number(newOrig) || 0;
                        newDiscPrice = discountType === 'percentage'
                          ? String(Math.round(origNum - (origNum * offVal / 100)))
                          : String(Math.max(0, origNum - offVal));
                      }
                      setProductForm({ ...productForm, original_price: newOrig, discount_price: newDiscPrice });
                    }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ height: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Discount <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>({t('cat.optional')})</span>
                    </label>
                    {/* Mode Toggle Switch (₹ vs %) */}
                    <select
                      className="form-select"
                      value={discountSelection}
                      onChange={(e) => handleDiscountSelectionChange(e.target.value)}
                      style={{ display: 'none' }}
                    >
                      <option value="manual">Manual discount</option>
                      {availableDiscounts.map((discount) => (
                        <option key={discount.id} value={discount.id}>
                          {discount.type === 'percentage' ? `${discount.value}%` : `₹${discount.value}`} ({discount.type === 'percentage' ? 'Percentage' : 'Fixed Amount'})
                        </option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', background: '#F1F5F9', padding: '2px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                      <button
                        type="button"
                        disabled={discountSelection !== 'manual'}
                        onClick={() => {
                          setDiscountType('rs');
                          const origNum = Number(productForm.original_price) || 0;
                          const discNum = Number(productForm.discount_price) || 0;
                          const value = discountValue || (origNum > 0 && discNum > 0 && discNum < origNum ? String(origNum - discNum) : '');
                          const offVal = Number(value) || 0;
                          setDiscountValue(value);
                          setProductForm((prev) => ({
                            ...prev,
                            discount_price: origNum ? String(Math.max(0, origNum - offVal)) : prev.discount_price
                          }));
                        }}
                        style={{
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          background: discountType === 'rs' ? '#5B5FC7' : 'transparent',
                          color: discountType === 'rs' ? '#FFFFFF' : '#64748B',
                          opacity: discountSelection !== 'manual' ? 0.5 : 1,
                          cursor: discountSelection !== 'manual' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ₹ {t('cat.off')}
                      </button>
                      <button
                        type="button"
                        disabled={discountSelection !== 'manual'}
                        onClick={() => {
                          setDiscountType('percentage');
                          const origNum = Number(productForm.original_price) || 0;
                          const discNum = Number(productForm.discount_price) || 0;
                          const value = discountValue || (origNum > 0 && discNum < origNum ? String(Math.round(((origNum - discNum) / origNum) * 100)) : '');
                          const pct = Number(value) || 0;
                          setDiscountValue(value);
                          setProductForm((prev) => ({
                            ...prev,
                            discount_price: origNum ? String(Math.round(origNum - (origNum * pct / 100))) : prev.discount_price
                          }));
                        }}
                        style={{
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          background: discountType === 'percentage' ? '#5B5FC7' : 'transparent',
                          color: discountType === 'percentage' ? '#FFFFFF' : '#64748B',
                          opacity: discountSelection !== 'manual' ? 0.5 : 1,
                          cursor: discountSelection !== 'manual' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        % {t('cat.off')}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', width: '100%', maxWidth: '330px', height: '38px' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="form-input"
                    style={{ flex: 1, minWidth: 0, height: '38px', borderRadius: '8px 0 0 8px' }}
                    placeholder={discountSelection === 'manual' ? (discountType === 'rs' ? t('cat.eg_50') : t('cat.eg_20pct')) : 'Selected discount'}
                    value={discountValue}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setDiscountSelection('manual');
                      setDiscountValue(val);
                      const offVal = Number(val) || 0;
                      const origNum = Number(productForm.original_price) || 0;

                      if (discountType === 'rs') {
                        const calculatedDiscPrice = String(Math.max(0, origNum - offVal));
                        setProductForm({ ...productForm, discount_price: calculatedDiscPrice });
                      } else {
                        const calculatedDiscPrice = String(Math.round(origNum - (origNum * offVal / 100)));
                        setProductForm({ ...productForm, discount_price: calculatedDiscPrice });
                      }
                    }}
                  />
                  <CustomSelect
                    options={[
                      {
                        value: 'manual',
                        label: 'Manual ₹',
                        labelNode: <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}><strong>Manual ₹</strong><small style={{ color: '#64748B', fontSize: '0.68rem' }}>Enter manually</small></span>
                      },
                      ...availableDiscounts.map((discount) => ({
                        value: String(discount.id),
                        label: discount.type === 'percentage' ? `${discount.value}%` : `₹${discount.value}`,
                        labelNode: <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}><strong>{discount.type === 'percentage' ? `${discount.value}%` : `₹${discount.value}`}</strong><small style={{ color: '#64748B', fontSize: '0.68rem' }}>{discount.type === 'percentage' ? 'Percentage' : 'Fixed Amount'}</small></span>
                      }))
                    ]}
                    value={discountSelection}
                    onChange={handleDiscountSelectionChange}
                    style={{ width: '140px', minWidth: 0 }}
                    triggerStyle={{ height: '38px', padding: '0 10px', borderRadius: '0 8px 8px 0', borderLeft: 0, fontSize: '0.78rem', boxShadow: 'none' }}
                  />
                  </div>
                  {productForm.original_price && productForm.discount_price !== '' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 800 }}>
                        {t('cat.selling_price')}: ₹{productForm.discount_price || 0}
                      </span>
                      {Number(productForm.original_price) > Number(productForm.discount_price) && (
                        <span style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 700 }}>
                          {t('cat.save')} ₹{Number(productForm.original_price) - Number(productForm.discount_price)} ({Math.round(((Number(productForm.original_price) - Number(productForm.discount_price)) / Number(productForm.original_price)) * 100)}% {t('cat.off')})
                        </span>
                      )}
                    </div>
                  )}

                  <div className="form-group" style={{ margin: '12px 0 0' }}>
                    <label className="form-label">
                      {t('cat.selling_price')} (₹) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-input"
                      placeholder={t('cat.eg_150')}
                      required
                      value={productForm.discount_price}
                      onKeyDown={(e) => {
                        if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                      }}
                      onChange={(e) => {
                        const sellingPrice = e.target.value.replace(/\D/g, '');
                        const originalPrice = Number(productForm.original_price) || 0;
                        const discountAmount = Math.max(0, originalPrice - (Number(sellingPrice) || 0));
                        setDiscountSelection('manual');
                        setDiscountType('rs');
                        setDiscountValue(String(discountAmount));
                        setProductForm((prev) => ({ ...prev, discount_price: sellingPrice }));
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {t('cat.description')} <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>({t('cat.optional')})</span>
                </label>
                <textarea className="form-input" style={{ height: '54px', padding: '8px 12px' }} placeholder={t('cat.details_placeholder')} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    {t('cat.th_type')} <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>({t('cat.optional')})</span>
                  </label>
                  <input type="text" className="form-input" placeholder={t('cat.eg_type')} value={productForm.type} onChange={(e) => setProductForm({ ...productForm, type: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    {t('cat.in_stock_availability')} <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <CustomSelect options={stockSelectOptions} value={productForm.stock} onChange={(val) => setProductForm({ ...productForm, stock: val })} style={{ width: '100%' }} />
                </div>
              </div>

              {/* Premium Animated Progress Bar */}
              {catSubmitLoading && (
                <div style={{ marginTop: '4px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#5B5FC7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Loader2 className="animate-spin" size={14} />
                      {t('cat.uploading_saving')}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#5B5FC7' }}>
                      {uploadProgress}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: '#EEF2FF',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    border: '1px solid #C7D2FE'
                  }}>
                    <div style={{
                      width: `${uploadProgress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #5B5FC7 0%, #8B6FE8 50%, #10B981 100%)',
                      borderRadius: '999px',
                      transition: 'width 0.3s ease-in-out',
                      boxShadow: '0 2px 8px rgba(91, 95, 199, 0.4)'
                    }} />
                  </div>
                </div>
              )}

              <div className="product-edit-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowProductModal(false)} disabled={catSubmitLoading}>{t('cat.cancel')}</button>
                <button type="submit" className="btn-primary" disabled={catSubmitLoading}>
                  {catSubmitLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>{t('cat.saving_product')}</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>{t('cat.save_product')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION POPUP MODAL */}
      {categoryToDelete && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
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
              <Trash2 size={28} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              {t('cat.delete_category_confirm')}
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: '1.5', marginBottom: '24px' }}>
              {t('cat.delete_category_warning_1')} <strong style={{ color: '#0F172A' }}>"{categoryToDelete.name}"</strong>? {t('cat.cannot_be_undone')}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, height: '42px', justifyContent: 'center' }}
                onClick={() => setCategoryToDelete(null)}
                disabled={deleteLoading}
              >
                {t('cat.cancel')}
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
                onClick={confirmDeleteCategory}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>{t('cat.deleting')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>{t('cat.yes_delete')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT DELETE CONFIRMATION POPUP MODAL */}
      {productToDelete && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
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
              <Trash2 size={28} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              {t('cat.delete_product_confirm')}
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: '1.5', marginBottom: '24px' }}>
              {t('cat.delete_product_warning_1')} <strong style={{ color: '#0F172A' }}>"{productToDelete.name}"</strong>? {t('cat.permanently_remove')}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: '120px' }}
                onClick={() => setProductToDelete(null)}
                disabled={deleteLoading}
              >
                {t('cat.cancel')}
              </button>
              <button
                type="button"
                style={{
                  width: '140px',
                  padding: '10px 16px',
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
                onClick={confirmDeleteProduct}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>{t('cat.deleting')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>{t('cat.yes_delete')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIDEO DEMO PREVIEW MODAL */}
      {previewVideoUrl && (
        <div className="modal-backdrop" onClick={(event) => event.stopPropagation()}>
          <div className="modal-content" style={{ maxWidth: '560px', padding: '0', overflow: 'hidden', background: '#0F172A' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #1E293B', color: '#FFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.95rem' }}>
                <Video size={18} color="#F59E0B" />
                <span>{t('cat.video_preview_title')}</span>
              </div>
              <button onClick={() => setPreviewVideoUrl(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ width: '100%', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '280px' }}>
              <video
                src={typeof previewVideoUrl === 'string' ? previewVideoUrl : URL.createObjectURL(previewVideoUrl)}
                controls
                autoPlay
                style={{ width: '100%', maxHeight: '420px', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM VALIDATION ERROR POPUP MODAL */}
      {validationError && (
        <div className="modal-backdrop" style={{ zIndex: 999, background: 'rgba(15, 23, 42, 0.48)', backdropFilter: 'blur(4px)' }} onClick={(event) => event.stopPropagation()}>
          <div className="modal-content" style={{ maxWidth: '380px', width: 'calc(100% - 32px)', textAlign: 'center', padding: '30px 28px 26px', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.22)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: '#FFF1F2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              border: '7px solid #FEE2E2'
            }}>
              <AlertCircle size={25} strokeWidth={2.5} />
            </div>

            <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
              {t('cat.validation_error')}
            </h3>

            <p style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: '1.55', margin: '0 auto 24px', maxWidth: '280px' }}>
              {validationError}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ minWidth: '142px', height: '40px', padding: '8px 20px', justifyContent: 'center', borderRadius: '10px', fontSize: '0.82rem', boxShadow: '0 6px 14px rgba(91, 95, 199, 0.22)' }}
                onClick={() => setValidationError('')}
              >
                {t('cat.got_it')}
              </button>
            </div>
          </div>
        </div>
      )}

      {discountModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }} onClick={(event) => event.stopPropagation()}>
          <div className="modal-content" style={{ maxWidth: '680px', width: 'calc(100% - 32px)', padding: 0, borderRadius: '22px', overflow: 'hidden', boxShadow: '0 28px 90px rgba(15,23,42,0.28)' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header" style={{ margin: 0, padding: '22px 26px', background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', borderBottom: 0 }}>
              <div>
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FFFFFF' }}>
                  <span style={{ width: '38px', height: '38px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', background: 'rgba(255,255,255,0.18)', color: '#FFFFFF' }}><Percent size={20} /></span>
                  <span style={{ fontSize: '1.08rem' }}>Manage Discounts</span>
                </h2>
                <p style={{ margin: '6px 0 0 48px', color: 'rgba(255,255,255,0.78)', fontSize: '0.8rem' }}>Create and manage store discount values.</p>
              </div>
              <button
                className="modal-close"
                aria-label="Close discount modal"
                style={{ width: '34px', height: '34px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', color: '#FFFFFF', background: 'rgba(255,255,255,0.16)', cursor: 'pointer', transition: 'all 0.18s ease' }}
                onMouseEnter={(event) => { event.currentTarget.style.background = 'rgba(255,255,255,0.28)'; event.currentTarget.style.transform = 'rotate(90deg)'; }}
                onMouseLeave={(event) => { event.currentTarget.style.background = 'rgba(255,255,255,0.16)'; event.currentTarget.style.transform = 'rotate(0deg)'; }}
                onClick={() => setDiscountModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '22px 26px 20px', background: '#FFFFFF' }}>
            <div style={{ padding: '18px', background: '#F7F8FF', border: '1px solid #E0E7FF', borderRadius: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', alignItems: 'end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '8px', color: '#475569' }}>Discount Type</label>
                <CustomSelect
                  options={[
                    { value: 'percentage', label: 'Percentage (%)' },
                    { value: 'amount', label: 'Fixed Amount (₹)' },
                  ]}
                  value={globalDiscountType}
                  onChange={setGlobalDiscountType}
                  style={{ width: '100%', minWidth: 0 }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '8px', color: '#475569' }}>Discount Value</label>
                <input
                  className="form-input"
                  style={{ width: '100%', height: '44px', fontSize: '0.92rem', fontWeight: 700, boxSizing: 'border-box', borderRadius: '10px', borderColor: '#CBD5E1' }}
                  type="number"
                  min="0"
                  max={globalDiscountType === 'percentage' ? 100 : undefined}
                  placeholder={globalDiscountType === 'percentage' ? 'e.g. 10' : 'e.g. 50'}
                  value={globalDiscountValue}
                  onChange={(event) => setGlobalDiscountValue(event.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button type="button" className="btn-primary" style={{ width: '100%', justifyContent: 'center', height: '44px', borderRadius: '10px', background: 'linear-gradient(135deg, #5B5FC7, #7C3AED)', boxShadow: '0 8px 18px rgba(91,95,199,0.22)' }} onClick={createGlobalDiscount}>
                {editingGlobalDiscountId ? <Check size={16} /> : <Plus size={16} />}
                <span>{editingGlobalDiscountId ? 'Update Discount' : 'Create Discount'}</span>
              </button>
            </div>
            </div>

            <div style={{ paddingTop: '22px', borderTop: '1px solid #EEF2F7' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', margin: 0 }}>Available Discounts</h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8' }}>{globalDiscounts.length} saved</span>
              </div>
              {discountLoading ? (
                <div style={{ padding: '22px', textAlign: 'center', color: '#64748B', fontSize: '0.82rem', fontWeight: 700 }}>Loading discounts...</div>
              ) : globalDiscounts.length === 0 ? (
                <div style={{ padding: '18px', textAlign: 'center', border: '1px dashed #CBD5E1', borderRadius: '10px', color: '#94A3B8', fontSize: '0.82rem', fontWeight: 600 }}>
                  No discounts created yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {globalDiscounts.map((discount) => (
                    <div key={discount.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid #FBCFE8', background: '#FDF2F8', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <span style={{ minWidth: '58px', padding: '7px 9px', textAlign: 'center', borderRadius: '8px', background: '#FCE7F3', color: '#9D174D', fontSize: '0.9rem', fontWeight: 800 }}>
                          {discount.type === 'percentage' ? `${discount.value}%` : `₹${discount.value}`}
                        </span>
                        <span style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {discount.type === 'percentage' ? 'Percentage discount' : 'Fixed amount discount'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button type="button" aria-label="Edit discount" className="btn-secondary" style={{ padding: '7px 9px', borderRadius: '8px' }} onClick={() => editGlobalDiscount(discount)}>
                          <Edit2 size={14} />
                        </button>
                        <button type="button" aria-label="Delete discount" className="btn-danger" style={{ padding: '7px 9px', borderRadius: '8px' }} onClick={() => deleteGlobalDiscount(discount.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* PRODUCT BARCODE & QR CODE MODAL */}
      {codeModalProduct && (
        <ProductCodeModal
          product={codeModalProduct}
          onClose={() => setCodeModalProduct(null)}
        />
      )}

      {/* BULK PRODUCT UPLOAD MODAL */}
      {bulkUploadOpen && (
        <div className="modal-backdrop" onClick={closeBulkUploadModal}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <Upload size={20} color="#1D4ED8" />
                Bulk Upload Products
              </h2>
              <button className="modal-close" onClick={closeBulkUploadModal} disabled={bulkUploadLoading} aria-label="Close bulk upload modal">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBulkUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, color: '#64748B', fontSize: '0.82rem', lineHeight: 1.55 }}>
                Upload the approved product spreadsheet to add products in one operation.
              </p>

              <label style={{ display: 'block', padding: '24px', border: '1.5px dashed #93C5FD', borderRadius: '12px', background: '#F8FBFF', cursor: bulkUploadLoading ? 'not-allowed' : 'pointer', textAlign: 'center' }}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(event) => setBulkUploadFile(event.target.files?.[0] || null)}
                  disabled={bulkUploadLoading}
                  style={{ display: 'none' }}
                />
                <Upload size={28} color="#2563EB" style={{ marginBottom: '9px' }} />
                <strong style={{ display: 'block', color: '#1E3A8A', fontSize: '0.86rem' }}>
                  {bulkUploadFile ? bulkUploadFile.name : 'Choose Excel or CSV file'}
                </strong>
                <span style={{ display: 'block', marginTop: '6px', color: '#64748B', fontSize: '0.74rem' }}>
                  Supported formats: .xlsx, .xls, .csv
                </span>
              </label>

              {bulkUploadFile && (
                <div style={{ padding: '10px 12px', borderRadius: '9px', background: '#EFF6FF', color: '#1D4ED8', fontSize: '0.76rem', fontWeight: 700 }}>
                  Selected: {bulkUploadFile.name}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={closeBulkUploadModal} disabled={bulkUploadLoading}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={bulkUploadLoading || !bulkUploadFile}>
                  {bulkUploadLoading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  <span>{bulkUploadLoading ? 'Uploading...' : 'Upload Products'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
