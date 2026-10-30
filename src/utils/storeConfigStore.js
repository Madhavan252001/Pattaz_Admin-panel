const CONFIG_KEY = 'fireworks_admin_config';
const COUPONS_KEY = 'fireworks_admin_coupons';

const defaultConfig = {
  // Design settings
  design: {
    heroTitle: 'Diwali Special Crackers Sale 2026',
    heroSubtitle: 'Direct Factory Outlet from Sivakasi - 80% Flat Discount',
    bannerText: 'Flash Offer: Extra 10% OFF on Orders above ₹5,000 | Use Code: DIWALI80',
    primaryColor: '#E65100',
    headerTheme: '#E5B899',
    logoUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150',
    sliderImages: [
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200',
      'https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=1200'
    ]
  },
  // Footer settings
  footer: {
    companyName: 'Standard Fireworks Outlet Sivakasi',
    address: '142/3, Factory Road, Sivakasi, Tamil Nadu 626123',
    phone: '+91 98421 23456',
    whatsapp: '+91 98421 23456',
    email: 'info@sivakasifireworks.com',
    copyright: '© 2026 Sivakasi Fireworks Admin. All Rights Reserved.',
    termsText: 'Minimum Order Value is ₹2,000. All products strictly compliant with Supreme Court guidelines.',
    socialLinks: {
      facebook: 'https://facebook.com',
      instagram: 'https://instagram.com',
      youtube: 'https://youtube.com',
      whatsapp: 'https://wa.me/919842123456'
    }
  },
  // Store Settings
  setting: {
    storeName: 'Sivakasi Crackers Direct',
    tagline: 'Premium Quality Crackers at Wholesale Prices',
    minOrderValue: 2000,
    upiId: 'fireworks@upi',
    bankName: 'State Bank of India',
    accNo: '38492019284',
    ifsc: 'SBIN0000921',
    codEnabled: true,
    gstPercent: 18,
    adminEmail: 'admin@sivakasifireworks.com'
  }
};

export function loadStoreConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? { ...defaultConfig, ...JSON.parse(raw) } : defaultConfig;
  } catch {
    return defaultConfig;
  }
}

export function saveStoreConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function loadCoupons() {
  try {
    const raw = localStorage.getItem(COUPONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCoupons(coupons) {
  localStorage.setItem(COUPONS_KEY, JSON.stringify(coupons));
}
