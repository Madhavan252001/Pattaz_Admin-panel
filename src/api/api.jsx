import toast from 'react-hot-toast';
import axios from 'axios';

// ==========================================
// 1. BASE URL CONFIGURATION
// Easily change BASE_URL here whenever needed
// ==========================================
// Relative endpoint when in dev proxy, full URL fallback
export const BASE_URL = process.env.NODE_ENV === 'development' 
  ? '/fireworks/crackers' 
  : 'https://offer360.in/fireworks/crackers';

// Short-lived GET cache prevents duplicate requests when Layout and the active
// page request the same resource during the same navigation.
const GET_CACHE = new Map();
const GET_CACHE_TTL = 3000;

function notifySuccess(data) {
  toast.success(data?.message || 'Changes saved successfully.');
}

/**
 * Generic Axios Helper with Auth Header & Error Handling
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const method = (options.method || 'GET').toUpperCase();

  if (method === 'GET') {
    const cached = GET_CACHE.get(endpoint);
    if (cached && Date.now() - cached.createdAt < GET_CACHE_TTL) {
      return cached.promise;
    }
  } else {
    // Any write can change one or more list endpoints.
    GET_CACHE.clear();
  }

  const headers = { Accept: 'application/json', ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const requestPromise = (async () => {
    try {
      const response = await axios({
        url: `${BASE_URL}${endpoint}`,
        method,
        headers,
        data: options.data,
      });
      const data = response.data || {};

      if (method !== 'GET') notifySuccess(data);

      return data;
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Request failed';
      throw new Error(message);
    }
  })();

  if (method === 'GET') {
    GET_CACHE.set(endpoint, { promise: requestPromise, createdAt: Date.now() });
    requestPromise.catch(() => GET_CACHE.delete(endpoint));
  }

  return requestPromise;
}

/**
 * Generic Axios Helper for FormData (POST multipart/form-data)
 */
async function requestFormData(endpoint, formData) {
  const token = localStorage.getItem('token');

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await axios.post(`${BASE_URL}${endpoint}`, formData, { headers });
    const data = response.data || {};

    notifySuccess(data);

    return data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.response?.data?.error || error.message || 'Request failed');
  }
}

/**
 * Generic Axios Helper for PUT FormData (PUT multipart/form-data)
 */
async function requestPutFormData(endpoint, formData) {
  const token = localStorage.getItem('token');

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await axios.put(`${BASE_URL}${endpoint}`, formData, { headers });
    const data = response.data || {};

    notifySuccess(data);

    return data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.response?.data?.error || error.message || 'Update request failed');
  }
}

async function requestBlob(endpoint) {
  const token = localStorage.getItem('token');
  const headers = { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await axios({
      url: `${BASE_URL}${endpoint}`,
      method: 'GET',
      headers,
      responseType: 'blob',
    });

    return {
      blob: response.data,
      filename: response.headers?.['content-disposition']?.match(/filename="?([^"]+)"?/i)?.[1] || ''
    };
  } catch (error) {
    throw new Error(error.response?.data?.message || error.response?.data?.error || error.message || 'Download failed');
  }
}

// HTTP Helper Methods
export const api = {
  get: (endpoint, headers) => request(endpoint, { method: 'GET', headers }),
  post: (endpoint, body, headers) => request(endpoint, { method: 'POST', data: body, headers }),
  postFormData: (endpoint, formData) => requestFormData(endpoint, formData),
  putFormData: (endpoint, formData) => requestPutFormData(endpoint, formData),
  put: (endpoint, body, headers) => request(endpoint, { method: 'PUT', data: body, headers }),
  delete: (endpoint, headers) => request(endpoint, { method: 'DELETE', headers }),
};

// ==========================================
// 2. API ENDPOINTS
// Clean & easy to understand API functions
// ==========================================

export const authAPI = {
  // Admin Login Endpoint
  // Payload: { email, password }
  login: (credentials) => api.post('/Adminlogin', credentials),
};

export const categoryAPI = {
  // Get Categories list
  getCategories: () => api.get('/category'),

  // Insert New Category (FormData: name, position, images)
  createCategory: (formData) => api.postFormData('/category/insert/', formData),

  // Update Category (PUT /category/update/:id)
  updateCategory: (id, formData) => api.putFormData(`/category/update/${id}`, formData),

  // Update Category Position (PUT /category/position/:id, payload: { position: 2 })
  updateCategoryPosition: (id, position) => api.put(`/category/position/${id}`, { position: Number(position) }),

  // Delete Category (DELETE /category/delete?id=:id)
  deleteCategory: (id) => api.delete(`/category/delete?id=${id}`),
};

export const productAPI = {
  // Get All Products (GET /products)
  getProducts: () => api.get('/products'),

  // Create Product (POST /products, FormData)
  createProduct: (formData) => api.postFormData('/products', formData),

  // Import products from a spreadsheet (POST /products/bulk-upload, FormData: file)
  bulkUpload: (formData) => api.postFormData('/products/bulk-upload', formData),

  // Download product bulk upload template (GET /products/bulk-template)
  downloadBulkTemplate: () => requestBlob('/products/bulk-template'),

  // Update Product (PUT /products/:id, FormData)
  updateProduct: (id, formData) => api.putFormData(`/products/${id}`, formData),

  // Update Product Position (PUT /products/position/:id, payload: { position: 2 })
  updateProductPosition: (id, position) => api.put(`/products/position/${id}`, { position: Number(position) }),

  // Delete Product (DELETE /products/:id)
  deleteProduct: (id) => api.delete(`/products/${id}`),
};

export const offerAPI = {
  // Get Offers list
  getOffers: () => api.get('/offers'),

  // Add product offer
  // Payload: { product_id, offer_original_price, offer_discount_price }
  createOffer: (data) => api.post('/offers', data),

  // Update product offer
  updateOffer: (id, data) => api.put(`/offers/${id}`, data),

  // Delete product offer
  deleteOffer: (id) => api.delete(`/offers/${id}`),
};

export const brandLogoAPI = {
  // Get Brand Logos list
  getBrandLogos: () => api.get('/brand-logos'),

  // Create Brand Logo (FormData: images)
  createBrandLogo: (formData) => api.postFormData('/brand-logos', formData),

  // Update Brand Logo (PUT /brand-logos/:id, FormData: images)
  updateBrandLogo: (id, formData) => api.putFormData(`/brand-logos/${id}`, formData),

  // Delete Brand Logo
  deleteBrandLogo: (id) => api.delete(`/brand-logos/${id}`),
};

export const footerAPI = {
  // Get Footer Settings (GET /footer)
  getFooter: () => api.get('/footer'),

  // Create/Update Footer Settings (POST /footer)
  createFooter: (formData) => api.postFormData('/footer', formData),
  updateFooter: (formData) => api.postFormData('/footer', formData),
};

export const settingsAPI = {
  // Get Settings (GET /settings)
  getSettings: () => api.get('/settings'),

  // Create Settings (POST /settings)
  createSettings: (data) => api.post('/settings', data),

  // Update Settings (PUT /settings)
  updateSettings: (data) => api.put('/settings', data),
};

export const adminProfileAPI = {
  // GET /adminProfile
  getProfile: () => api.get('/adminProfile'),

  // PUT /adminProfile/update (multipart/form-data)
  updateProfile: (formData) => api.putFormData('/adminProfile/update', formData),
};

export const webControlAPI = {
  // Get Web Control Settings (GET /web-control)
  getWebControl: () => api.get('/web-control'),

  // Create Web Control Settings (POST /web-control, FormData)
  createWebControl: (formData) => api.postFormData('/web-control', formData),

  // Update Web Control Settings (PUT /web-control, FormData)
  updateWebControl: (formData) => api.putFormData('/web-control', formData),
};

export const couponAPI = {
  // Get All Coupons (GET /coupons)
  getCoupons: () => api.get('/coupons'),

  // Create Coupon (POST /coupons)
  createCoupon: (data) => api.post('/coupons', data),

  // Update Coupon (PUT /coupons/:id)
  updateCoupon: (id, data) => api.put(`/coupons/${id}`, data),

  // Delete Coupon (DELETE /coupons/:id)
  deleteCoupon: (id) => api.delete(`/coupons/${id}`),
};

export const referralAPI = {
  // Get All Referrals (GET /referrals)
  getReferrals: () => api.get('/referrals'),

  // Create Referral (POST /referrals)
  // Payload: { name, mobile_no, address, customer_discount, sales_partner_discount }
  createReferral: (data) => api.post('/referrals', data),

  // Update Referral (PUT /referrals/:id)
  // Payload: { name, mobile_no, address, customer_discount, sales_partner_discount, is_active }
  updateReferral: (id, data) => api.put(`/referrals/${id}`, data),

  // Get Referrals Summary (GET /referrals/summary?referral_code=&from_date=&to_date=)
  getReferralSummary: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        query.set(key, value);
      }
    });
    const queryString = query.toString();
    return api.get(`/referrals/summary${queryString ? `?${queryString}` : ''}`);
  },
};

export const themesAPI = {
  // Get Theme Settings (GET /themes)
  getTheme: () => api.get('/themes'),

  // Create Theme (POST /themes, FormData)
  createTheme: (formData) => api.postFormData('/themes', formData),

  // Update Theme (PUT /themes, FormData)
  updateTheme: (formData) => api.putFormData('/themes', formData),
};

export const discountAPI = {
  // Get All Discounts (GET /discounts)
  getDiscounts: () => api.get('/discounts'),

  // Get Discount Details by ID (GET /discounts/:id)
  getDiscountById: (id) => api.get(`/discounts/${id}`),

  // Create New Discount (POST /discounts)
  createDiscount: (data) => api.post('/discounts', data),

  // Update Discount by ID (PUT /discounts/:id)
  updateDiscount: (id, data) => api.put(`/discounts/${id}`, data),

  // Delete Discount by ID (DELETE /discounts/:id)
  deleteDiscount: (id) => api.delete(`/discounts/${id}`),
};

export const comboPackAPI = {
  // Get All Combo Packs (GET /crackers/combo-packs)
  getComboPacks: () => api.get('/combo-packs'),

  // Create Combo Pack (POST /crackers/combo-packs)
  createComboPack: (data) => api.post('/combo-packs', data),

  // Update Combo Pack (PUT /crackers/combo-packs/:id)
  updateComboPack: (id, data) => api.put(`/combo-packs/${id}`, data),

  // Delete Combo Pack (DELETE /crackers/combo-packs/:id)
  deleteComboPack: (id) => api.delete(`/combo-packs/${id}`),
};

export const reelsAPI = {
  // Get All Reels (GET /reels)
  getReels: () => api.get('/reels'),

  // Create Reel (POST /reels)
  createReel: (data) => api.post('/reels', data),

  // Update Reel (PUT /reels/:id)
  updateReel: (id, data) => api.put(`/reels/${id}`, data),

  // Delete Reel (DELETE /reels/:id)
  deleteReel: (id) => api.delete(`/reels/${id}`),
};

export const offlineOrderAPI = {
  // Get Offline Orders (GET /orders/offline)
  getOfflineOrders: () => api.get('/orders/offline'),

  // Get Offline Order Details (GET /orders/offline/:id)
  getOfflineOrderById: (id) => api.get(`/orders/offline/${id}`),

  // Create Offline Order (POST /orders/offline)
  createOfflineOrder: (data) => api.post('/orders/offline', data),

  // Update Offline Order (PUT /orders/offline/:id)
  updateOfflineOrder: (id, data) => api.put(`/orders/offline/${id}`, data),

  // DELETE /orders/offline/:id
  deleteOfflineOrder: (id) => api.delete(`/orders/offline/${encodeURIComponent(id)}`),
};

export const onlineOrderAPI = {
  // GET /orders/online
  getOnlineOrders: () => api.get('/orders/online'),

  // GET /orders/online?filter=all&search=&from_date=&to_date=&payment_status=&order_status=&payment_method=&page=1&limit=20
  getOnlineOrdersWithFilters: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && (value !== 'all' || key === 'filter')) {
        query.set(key, value);
      }
    });
    const queryString = query.toString();
    return api.get(`/orders/online${queryString ? `?${queryString}` : ''}`);
  },

  // GET /orders/online/:id
  getOnlineOrderById: (id) => api.get(`/orders/online/${id}`),

  // PUT /orders/online/:id
  // Payload: { order_status, payment_status, remark }
  updateOnlineOrder: (id, data) => api.put(`/orders/online/${id}`, data),

  // DELETE /orders/online/:id
  deleteOnlineOrder: (id) => api.delete(`/orders/online/${encodeURIComponent(id)}`),
};

export const reportsAPI = {
  getReports: () => api.get('/reports'),
  getReportsWithFilter: (from_date = '', to_date = '', order_status = 'all', payment_status = 'all', payment_method = 'all', order_type = 'all') => {
    const query = new URLSearchParams();
    Object.entries({ from_date, to_date, order_status, payment_status, payment_method, order_type }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value);
    });
    const queryString = query.toString();
    return api.get(`/reports${queryString ? `?${queryString}` : ''}`);
  },
};

export const customerAPI = {
  // Get Online Orders / Customers (GET /orders/online)
  getOnlineCustomers: () => api.get('/orders/online'),

  // Get Offline Orders / Customers (GET /orders/offline)
  getOfflineCustomers: () => api.get('/orders/offline'),
};

export const dashboardAPI = {
  // GET /dashboard (or /crackers/dashboard)
  getDashboard: () => api.get('/dashboard'),
};

export const staffAPI = {
  // GET /staffs (GET /crackers/staffs)
  getStaffs: () => api.get('/staffs'),

  // POST /staffs (POST /crackers/staffs, payload: { name, email, mobile_no, password })
  createStaff: (data) => api.post('/staffs', data),

  // PUT /staffs/:id (PUT /crackers/staffs/:id, payload: { name, email, mobile_no, password })
  updateStaff: (id, data) => api.put(`/staffs/${id}`, data),

  // PUT /staffs/:id/block (PUT /crackers/staffs/:id/block)
  blockStaff: (id) => api.put(`/staffs/${id}/block`, {}),

  // PUT /staffs/:id/unblock (PUT /crackers/staffs/:id/unblock)
  unblockStaff: (id) => api.put(`/staffs/${id}/unblock`, {}),
};

export const adminManagementAPI = {
  // GET all admins (Super Admin use)
  getAdmins: () => api.get('/staffs'),

  // POST create new admin account
  // Payload: { name, email, mobile_no, password, shop_name }
  createAdmin: (data) => api.post('/staffs', data),

  // PUT update admin account
  // Payload: { name, email, mobile_no, password, shop_name }
  updateAdmin: (id, data) => api.put(`/staffs/${id}`, data),

  // PUT block admin account
  blockAdmin: (id) => api.put(`/staffs/${id}/block`, {}),

  // PUT unblock admin account
  unblockAdmin: (id) => api.put(`/staffs/${id}/unblock`, {}),

  // DELETE admin account
  deleteAdmin: (id) => api.delete(`/staffs/${id}`),
};

// Super Admin shop onboarding (POST /crackers/AdminSignup)
export const shopAdminAPI = {
  createShopAdmin: (data) => api.post('/AdminSignup', data),
};

export default api;
