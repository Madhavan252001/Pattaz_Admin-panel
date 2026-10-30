import React, { useEffect, useMemo } from 'react';
import { loadStoreConfig } from '../utils/storeConfigStore';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

function cleanImageUrl(value) {
  if (!value) return '';
  const text = String(value).trim();
  const markdownMatch = text.match(/\((https?:\/\/[^)]+)\)/);
  if (markdownMatch?.[1]) return markdownMatch[1];
  const urlMatch = text.match(/https?:\/\/[^\s)]+/);
  if (urlMatch?.[0]) return urlMatch[0];
  return text;
}

function getItemData(item = {}) {
  const qty = Number(firstValue(item.quantity, item.qty, 1)) || 1;
  const unitPrice = Number(firstValue(item.unit_price, item.unitPrice, item.price, item.discount_price, item.offer_price, item.product?.price, 0)) || 0;
  const total = Number(firstValue(item.total_price, item.line_total, item.subtotal, item.amount, item.total, unitPrice * qty)) || 0;

  return {
    name: firstValue(item.product_name, item.item_name, item.name, item.title, item.product?.name, 'Product Item'),
    sku: firstValue(item.sku, item.product_code, ''),
    qty,
    unitPrice,
    total,
  };
}

function formatDate(value) {
  if (!value) return new Date().toLocaleString('en-IN');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function PrintableBill({ order, variant = 'invoice' }) {
  const config = useMemo(() => loadStoreConfig(), []);

  useEffect(() => {
    if (!order) return undefined;
    document.body.classList.add('printing-bill');
    const clearPrintMode = () => document.body.classList.remove('printing-bill');
    window.addEventListener('afterprint', clearPrintMode);
    return () => {
      window.removeEventListener('afterprint', clearPrintMode);
      document.body.classList.remove('printing-bill');
    };
  }, [order]);

  if (!order) return null;

  const setting = config.setting || {};
  const footer = config.footer || {};
  const shopDetails = order.shop_details || order.shopDetails || {};
  const shopName = firstValue(shopDetails.shop_name, setting.storeName, footer.companyName, 'Fireworks Store');
  const shopLogo = cleanImageUrl(firstValue(shopDetails.footer_logo_url, footer.logoUrl, setting.logoUrl, ''));
  const shopAddressParts = [
    firstValue(shopDetails.address, footer.address, ''),
    shopDetails.landmark,
    shopDetails.postalcode,
  ].filter(Boolean);
  const shopLegalParts = [
    shopDetails.gst_no ? `GST: ${shopDetails.gst_no}` : '',
    shopDetails.license_no ? `License: ${shopDetails.license_no}` : '',
  ].filter(Boolean);
  const items = Array.isArray(order.items) ? order.items.map(getItemData) : [];
  const totalProductCount = items.length;
  const totalQuantityCount = items.reduce((sum, item) => sum + item.qty, 0);
  const itemSubtotal = items.reduce((sum, item) => sum + item.total, 0);
  const subtotal = Number(firstValue(order.subtotal, order.subTotal, itemSubtotal)) || 0;
  const taxPercent = Number(firstValue(order.tax_percentage, order.taxPercent, setting.gstPercent, 18)) || 0;
  const taxAmount = Number(firstValue(order.tax_amount, order.taxAmount, subtotal * (taxPercent / 100))) || 0;
  const basicDiscount = Number(firstValue(order.basic_discount_amount, order.discount_amount, 0)) || 0;
  const otherDiscount = Number(firstValue(order.other_discount_amount, 0)) || 0;
  const referralDiscountAmount = Number(firstValue(order.referral_customer_discount, order.referral_discount, 0)) || 0;
  const referralDiscountPercent = Math.min(100, Math.max(0, Number(firstValue(
    order.referral_customer_discount_percentage,
    order.referral_discount_percentage,
    order.customer_discount,
    0
  )) || 0));
  const referralDiscount = order.referral_code
    ? (referralDiscountAmount > 0 ? referralDiscountAmount : subtotal * (referralDiscountPercent / 100))
    : 0;
  const total = Number(firstValue(order.payable_amount, order.grandTotal, order.total, subtotal + taxAmount - basicDiscount - otherDiscount - referralDiscount)) || 0;
  const customer = order.customer || {};
  const orderNumber = firstValue(order.orderNumber, order.order_no, order.id, 'BILL');
  const paymentMethod = firstValue(order.paymentMethod, order.payment_method, 'Cash / Counter');
  const paymentStatus = firstValue(order.payment_status, order.paymentStatus, 'Paid');
  const isThermal = variant === 'receipt';

  return (
    <div className="print-only-layer" aria-hidden="true">
      <article className={`printable-bill ${isThermal ? 'printable-bill--thermal' : ''}`} id="printable-bill">
        <header className="printable-bill__header">
          {shopLogo && <img className="printable-bill__logo" src={shopLogo} alt={shopName} />}
          <h1>{shopName}</h1>
          {shopAddressParts.length > 0 && <p>{shopAddressParts.join(', ')}</p>}
          {shopLegalParts.length > 0 && <p>{shopLegalParts.join(' | ')}</p>}
        </header>

        <div className="printable-bill__title-row">
          <div>
            <span className="printable-bill__eyebrow">{isThermal ? 'SALES RECEIPT' : 'TAX INVOICE'}</span>
            <h2>{orderNumber}</h2>
          </div>
          <div className="printable-bill__meta">
            <span>Date</span><strong>{formatDate(firstValue(order.created_at, order.date, order.order_date))}</strong>
            <span>Payment</span><strong>{String(paymentMethod).toUpperCase()}</strong>
          </div>
        </div>

        <section className="printable-bill__customer">
          <div>
            <span className="printable-bill__label">BILL TO</span>
            <strong>{firstValue(customer.name, order.customer_name, 'Walk-in Customer')}</strong>
            <span>{firstValue(customer.mobile, order.customer_mobile, '')}</span>
            {customer.address && customer.address !== 'N/A' && <span>{customer.address}</span>}
            {customer.pincode && <span>{customer.pincode}</span>}
          </div>
          <div className="printable-bill__status">
            <span className="printable-bill__label">PAYMENT STATUS</span>
            <strong>{String(paymentStatus).toUpperCase()}</strong>
          </div>
        </section>

        <div className="printable-bill__item-counts" aria-label="Bill item summary">
          <div><span>Total Products</span><strong>{totalProductCount}</strong></div>
          <div><span>Total Quantity</span><strong>{totalQuantityCount}</strong></div>
        </div>

        <table className="printable-bill__items">
          <thead>
            <tr><th>#</th><th>Item Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {items.length > 0 ? items.map((item, index) => (
              <tr key={`${item.name}-${index}`}>
                <td>{index + 1}</td>
                <td><strong>{item.name}</strong>{item.sku && <small>{item.sku}</small>}</td>
                <td>{item.qty}</td>
                <td>{money(item.unitPrice)}</td>
                <td>{money(item.total)}</td>
              </tr>
            )) : <tr><td colSpan="5" className="printable-bill__empty">No item details available</td></tr>}
          </tbody>
        </table>

        <section className="printable-bill__summary">
          <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          <div><span>GST ({taxPercent}%)</span><strong>{money(taxAmount)}</strong></div>
          {basicDiscount > 0 && <div className="printable-bill__discount"><span>Discount</span><strong>-{money(basicDiscount)}</strong></div>}
          {otherDiscount > 0 && <div className="printable-bill__discount"><span>Other Discount</span><strong>-{money(otherDiscount)}</strong></div>}
          {order.referral_code && <div className="printable-bill__discount"><span>{`Referral Discount (${order.referral_code})`}</span><strong>-{money(referralDiscount)}</strong></div>}
          <div className="printable-bill__grand-total"><span>Total Payable</span><strong>{money(total)}</strong></div>
        </section>

        <footer className="printable-bill__footer">
          <strong>Thank you for your purchase!</strong>
          <span>{footer.termsText || 'Goods once sold cannot be returned.'}</span>
          {setting.upiId && <span>UPI: {setting.upiId}</span>}
        </footer>
      </article>
    </div>
  );
}
