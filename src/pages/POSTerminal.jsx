import React, { useState, useMemo } from 'react';
import { getCategories } from '../utils/productData';
import { addOrder } from '../utils/orderStore';
import { Plus, Minus, Trash2, ShoppingBag, CheckCircle, Package, Zap } from 'lucide-react';

export default function POSTerminal() {
  const categories = useMemo(() => getCategories(), []);
  const [selectedCat, setSelectedCat] = useState('sparklers');
  const [mobileNo, setMobileNo] = useState('7010922424');
  const [customerName, setCustomerName] = useState('ruban');
  const [cart, setCart] = useState([
    {
      id: 'spk-2',
      name: '10 CM Electric Sparklers',
      price: 58,
      originalPrice: 65,
      qty: 3,
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120'
    }
  ]);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [basicDiscount, setBasicDiscount] = useState(3);
  const [otherDiscount, setOtherDiscount] = useState(4);
  const [orderProcessed, setOrderProcessed] = useState(false);

  const currentCategory = categories.find((c) => c.id === selectedCat) || categories[0];

  const handleAddToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price || 58,
          originalPrice: (product.price || 58) + 10,
          qty: 1,
          image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120'
        }
      ];
    });
  };

  const handleUpdateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const handleRemoveFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Cart Financial Calculations
  const subTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [cart]);

  const gstTax = useMemo(() => {
    return taxEnabled ? Math.round(subTotal * 0.18 * 100) / 100 : 0;
  }, [subTotal, taxEnabled]);

  const discountAmount = useMemo(() => {
    const percentDisc = subTotal * (basicDiscount / 100);
    return Math.round((percentDisc + otherDiscount) * 100) / 100;
  }, [subTotal, basicDiscount, otherDiscount]);

  const payableAmount = useMemo(() => {
    const total = subTotal + gstTax - discountAmount;
    return Math.max(0, Math.round(total * 100) / 100);
  }, [subTotal, gstTax, discountAmount]);

  const handleProcessOrder = () => {
    if (cart.length === 0) return;
    const newOrder = {
      _id: `POS-${Date.now()}`,
      orderNumber: `FW-${Math.floor(2025100 + Math.random() * 900)}`,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      customer: {
        name: customerName || 'Walk-in Customer',
        mobile: mobileNo || '9842100000',
        address: 'Sivakasi Store Billing Counter'
      },
      items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price, total: i.price * i.qty })),
      subTotal: subTotal,
      discount: discountAmount,
      grandTotal: payableAmount,
      paymentMethod: 'POS Cash/UPI',
      status: 'completed'
    };

    addOrder(newOrder);
    setOrderProcessed(true);
    setTimeout(() => {
      setOrderProcessed(false);
      setCart([]);
    }, 2500);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px' }}>
      {/* Center & Category Products Area */}
      <div>
        {/* Category Chips Bar */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '12px' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={selectedCat === cat.id ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.8rem', padding: '6px 12px', whiteSpace: 'nowrap', borderRadius: '8px' }}
            >
              {cat.name} ({cat.products.length})
            </button>
          ))}
        </div>

        {/* Product Details Table Card matching screenshot */}
        <div className="pos-table-card">
          <div className="pos-table-header">
            <span>Product Image</span>
            <span>Product Details</span>
            <span>Stock</span>
            <span>Original Price</span>
            <span>Offer Price</span>
            <span>Select Quantity</span>
          </div>

          {currentCategory.products.map((p, idx) => {
            const inCart = cart.find((item) => item.id === p.id);
            const isOutOfStock = idx === 0 || idx === 2; // match screenshot out of stock badges
            const offerPrice = p.price || 58;
            const originalPrice = offerPrice + Math.floor(offerPrice * 0.15);
            const discountPct = Math.round(((originalPrice - offerPrice) / originalPrice) * 100);

            return (
              <div className="pos-product-row" key={p.id || idx}>
                {/* Product Image */}
                <div className="pos-img-box">
                  <img
                    src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200"
                    alt={p.name}
                  />
                  <span className="pos-discount-tag">-{discountPct}%</span>
                  {isOutOfStock && <div className="pos-out-tag">Out of Stock</div>}
                </div>

                {/* Details */}
                <div>
                  <h4 className="pos-prod-title">{p.name}</h4>
                  <div className="pos-pack-badge">
                    <Package size={12} />
                    1 Box – 10 Pieces
                  </div>
                </div>

                {/* Stock */}
                <div style={{ fontWeight: 800, color: isOutOfStock ? '#EF4444' : '#10B981' }}>
                  {isOutOfStock ? 0 : 32 + idx * 9}
                  <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', fontWeight: 600 }}>
                    available
                  </span>
                </div>

                {/* Original Price */}
                <div style={{ textDecoration: 'line-through', color: '#EF4444', fontWeight: 700 }}>
                  ₹{originalPrice}.00
                </div>

                {/* Offer Price */}
                <div>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>
                    ₹{offerPrice}.00
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', fontWeight: 700 }}>
                    {discountPct}% off
                  </span>
                </div>

                {/* Action / Quantity Counter */}
                <div>
                  {isOutOfStock ? (
                    <button className="btn-add-stock">
                      + Add Stock
                    </button>
                  ) : inCart ? (
                    <div className="qty-counter">
                      <button className="qty-btn" onClick={() => handleUpdateQty(p.id, -1)}>
                        <Minus size={14} />
                      </button>
                      <span style={{ fontWeight: 800, width: '20px', textAlign: 'center' }}>
                        {inCart.qty}
                      </span>
                      <button className="qty-btn" onClick={() => handleUpdateQty(p.id, 1)}>
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <button className="btn-add-stock" onClick={() => handleAddToCart(p)}>
                      + Add to Cart
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Side: POS Current Order Billing Panel matching screenshot */}
      <div className="pos-cart-panel">
        <div className="pos-cart-header">
          <div className="pos-cart-title">
            <ShoppingBag size={18} color="#5B5FC7" />
            Current Order
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="cart-item-count-badge">{cart.length} ITEM</span>
            <button className="btn-cart-clear" onClick={() => setCart([])}>Clear</button>
          </div>
        </div>

        {/* Customer Mobile & Name Inputs */}
        <div className="cart-customer-grid">
          <div>
            <label style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
              Mobile No
            </label>
            <input
              type="text"
              className="cart-customer-input"
              value={mobileNo}
              onChange={(e) => setMobileNo(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
              Name
            </label>
            <input
              type="text"
              className="cart-customer-input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
        </div>

        {/* Cart Items Table */}
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <table className="cart-items-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Product Name</th>
                <th>Unit Price</th>
                <th>Total Price</th>
                <th>Qty</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#94A3B8' }}>
                    Cart is empty. Click "+ Add to Cart" on any product.
                  </td>
                </tr>
              ) : (
                cart.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <img src={item.image} alt={item.name} style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }} />
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{item.name}</td>
                    <td>₹{item.price}.00</td>
                    <td style={{ color: '#5B5FC7', fontWeight: 800 }}>₹{item.price * item.qty}.00</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button style={{ border: 'none', background: '#E2E8F0', width: '18px', height: '18px', borderRadius: '4px', cursor: 'pointer', fontWeight: 800 }} onClick={() => handleUpdateQty(item.id, -1)}>-</button>
                        <span>{item.qty}</span>
                        <button style={{ border: 'none', background: '#10B981', color: '#FFF', width: '18px', height: '18px', borderRadius: '4px', cursor: 'pointer', fontWeight: 800 }} onClick={() => handleUpdateQty(item.id, 1)}>+</button>
                      </div>
                    </td>
                    <td>
                      <button style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer' }} onClick={() => handleRemoveFromCart(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bill Calculations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #E2E8F0', paddingTop: '12px', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748B' }}>Subtotal</span>
            <span style={{ fontWeight: 800 }}>₹{subTotal.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#64748B' }}>
              <input type="checkbox" checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} />
              Tax (GST) 18%
            </label>
            <span style={{ fontWeight: 700 }}>₹{gstTax.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748B' }}>Basic Discount</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input type="number" style={{ width: '45px', padding: '2px 4px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '0.78rem' }} value={basicDiscount} onChange={(e) => setBasicDiscount(Number(e.target.value))} />
              <span>%</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748B' }}>Other Discount</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Rs ₹</span>
              <input type="number" style={{ width: '45px', padding: '2px 4px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '0.78rem' }} value={otherDiscount} onChange={(e) => setOtherDiscount(Number(e.target.value))} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A', fontWeight: 700 }}>
            <span>Discount amount</span>
            <span>-₹{discountAmount.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', borderTop: '2px solid #E2E8F0', paddingTop: '8px' }}>
            <span>Payable Amount</span>
            <span>₹{payableAmount.toFixed(2)}</span>
          </div>
        </div>

        {orderProcessed && (
          <div style={{ padding: '10px', background: '#DCFCE7', color: '#16A34A', borderRadius: '8px', textAlign: 'center', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <CheckCircle size={18} /> Order Billed Successfully!
          </div>
        )}

        <button className="btn-process-order" onClick={handleProcessOrder}>
          <Zap size={18} />
          <span>Process Order (₹{payableAmount.toFixed(2)})</span>
        </button>
      </div>
    </div>
  );
}
