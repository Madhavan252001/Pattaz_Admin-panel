import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { getAllProducts } from '../utils/productData';

export default function Products() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const products = useMemo(() => getAllProducts(), []);

  const categories = useMemo(() => {
    const cats = ['all', ...new Set(products.map(p => p.categoryId))];
    return cats;
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (activeCategory !== 'all' && p.categoryId !== activeCategory) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, activeCategory, search]);

  return (
    <div className="page-content">
      <h2 className="page-title">Products</h2>

      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat}
            className={`tab-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === 'all' ? 'All' : cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </button>
        ))}
      </div>

      <div className="product-grid">
        {filtered.map((p, idx) => (
          <div key={p.id || idx} className="product-card">
            <div className="product-body">
              <h4>{p.name}</h4>
              <p className="product-category">{p.category}</p>
              <div className="product-pricing">
                <span className="original-price">₹{p.originalPrice}</span>
                <span className="discounted-price">₹{p.discountedPrice}</span>
                {p.discountPercentage > 0 && (
                  <span className="discount-badge">{p.discountPercentage}% OFF</span>
                )}
              </div>
              <p className="product-stock">
                Stock: <span className={p.stock <= 10 ? 'low-stock' : ''}>{p.stock}</span>
              </p>
            </div>
            <button
              className="view-btn"
              onClick={() => setExpanded(expanded === (p.id || idx) ? null : (p.id || idx))}
            >
              {expanded === (p.id || idx) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {expanded === (p.id || idx) ? ' Less' : ' View'}
            </button>
            {expanded === (p.id || idx) && (
              <div className="product-details">
                <p><strong>Code:</strong> {p.code}</p>
                <p><strong>Package:</strong> {p.packageInfo}</p>
                <p><strong>Base Price:</strong> ₹{p.basePrice}</p>
                <p><strong>Original Price:</strong> ₹{p.originalPrice}</p>
                <p><strong>Discounted Price:</strong> ₹{p.discountedPrice}</p>
                <p><strong>Discount:</strong> {p.discountPercentage}%</p>
                <p><strong>Stock:</strong> {p.stock}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
