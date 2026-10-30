import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { X, Printer, Download, Copy, Check, QrCode, Barcode, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductCodeModal({ product, onClose }) {
  const barcodeRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('both'); // 'both' | 'barcode' | 'qrcode'

  const rawCode = product?.product_code || product?.id || '';
  const codeToUse = String(rawCode).trim() || `PROD-${product?.id || '001'}`;
  const productName = product?.name || 'Unnamed Product';
  const displayPrice = product?.discount_price || product?.price || product?.original_price || 0;

  // Format QR content: structured details for scanner
  const qrPayload = JSON.stringify({
    code: codeToUse,
    name: productName,
    price: displayPrice,
    pack: product?.pack_quantity || '1 Box'
  });

  useEffect(() => {
    if (barcodeRef.current && product) {
      try {
        JsBarcode(barcodeRef.current, codeToUse, {
          format: 'CODE128',
          lineColor: '#0F172A',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          font: 'monospace',
          textMargin: 6,
          margin: 10,
          background: '#FFFFFF'
        });
      } catch (err) {
        console.error('JsBarcode rendering error:', err);
      }
    }
  }, [codeToUse, activeTab, product]);

  if (!product) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeToUse);
    setCopied(true);
    toast.success('Product Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const qrCanvas = document.querySelector('#product-qr-canvas');
    if (!qrCanvas) {
      toast.error('Unable to capture QR Code canvas.');
      return;
    }

    // Create composite canvas to embed Product Code & Product Name at the bottom of exported QR PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const qrSize = qrCanvas.width; // 300px
    const padding = 24;
    const textAreaHeight = 85;

    canvas.width = qrSize + (padding * 2);
    canvas.height = qrSize + (padding * 2) + textAreaHeight;

    if (ctx) {
      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Card border
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

      // Draw QR Code
      ctx.drawImage(qrCanvas, padding, padding, qrSize, qrSize);

      // Divider line
      ctx.beginPath();
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 2;
      ctx.moveTo(padding, padding + qrSize + 10);
      ctx.lineTo(canvas.width - padding, padding + qrSize + 10);
      ctx.stroke();

      ctx.textAlign = 'center';

      // Product Code at bottom of QR
      ctx.font = 'bold 20px monospace, sans-serif';
      ctx.fillStyle = '#5B5FC7';
      ctx.fillText(`CODE: ${codeToUse}`, canvas.width / 2, padding + qrSize + 36);

      // Product Name at bottom of QR
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#0F172A';

      // Truncate product name if too wide
      let nameText = productName;
      const maxTextWidth = canvas.width - (padding * 2);
      if (ctx.measureText(nameText).width > maxTextWidth) {
        while (nameText.length > 3 && ctx.measureText(nameText + '...').width > maxTextWidth) {
          nameText = nameText.slice(0, -1);
        }
        nameText += '...';
      }
      ctx.fillText(nameText, canvas.width / 2, padding + qrSize + 60);

      // Price & Pack info at bottom
      ctx.font = '600 13px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#16A34A';
      ctx.fillText(`₹${Number(displayPrice).toFixed(2)} (${product?.pack_quantity || '1 Box'})`, canvas.width / 2, padding + qrSize + 80);

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${productName.replace(/[^a-z0-9]/gi, '_')}_QR_${codeToUse}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR Code downloaded with Product Name & Code!');
    }
  };

  const handleDownloadBarcode = () => {
    if (!barcodeRef.current) return;
    const svg = barcodeRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const png = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = png;
        link.download = `${productName.replace(/[^a-z0-9]/gi, '_')}_Barcode_${codeToUse}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Barcode downloaded!');
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrintSticker = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) {
      toast.error('Please allow popups to print barcode label.');
      return;
    }

    const barcodeSvgHtml = barcodeRef.current ? barcodeRef.current.outerHTML : '';
    const qrCanvas = document.querySelector('#product-qr-canvas');
    const qrDataUrl = qrCanvas ? qrCanvas.toDataURL('image/png') : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sticker Label - ${productName}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body {
              font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
              padding: 20px;
              margin: 0;
              background: #fff;
              color: #0f172a;
            }
            .label-card {
              border: 2px dashed #64748b;
              border-radius: 12px;
              padding: 20px;
              max-width: 420px;
              margin: 0 auto;
              text-align: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .shop-header {
              font-size: 14px;
              font-weight: 800;
              color: #5b5fc7;
              letter-spacing: 1px;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .prod-title {
              font-size: 18px;
              font-weight: 800;
              margin: 6px 0;
              color: #0f172a;
            }
            .code-badge {
              display: inline-block;
              background: #f1f5f9;
              color: #475569;
              padding: 4px 12px;
              border-radius: 6px;
              font-family: monospace;
              font-size: 13px;
              font-weight: 700;
              margin-bottom: 14px;
            }
            .codes-flex {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 20px;
              margin: 16px 0;
            }
            .qr-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
              border: 1px solid #e2e8f0;
              padding: 8px;
              border-radius: 10px;
              background: #fafafa;
            }
            .qr-label-code {
              font-family: monospace;
              font-size: 11px;
              font-weight: 800;
              color: #5b5fc7;
              margin-top: 4px;
            }
            .qr-label-name {
              font-size: 11px;
              font-weight: 700;
              color: #0f172a;
              max-width: 120px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .price-tag {
              font-size: 22px;
              font-weight: 900;
              color: #16a34a;
              margin-top: 10px;
            }
            .pack-info {
              font-size: 12px;
              color: #64748b;
              font-weight: 600;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              .label-card { border: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="shop-header">PRODUCT STICKER LABEL</div>
            <div class="prod-title">${productName}</div>
            <div class="code-badge">CODE: ${codeToUse}</div>
            
            <div class="codes-flex">
              <div>${barcodeSvgHtml}</div>
              ${qrDataUrl ? `
                <div class="qr-wrapper">
                  <img src="${qrDataUrl}" width="100" height="100" style="border-radius:4px;" />
                  <div class="qr-label-code">${codeToUse}</div>
                  <div class="qr-label-name">${productName}</div>
                </div>
              ` : ''}
            </div>

            <div class="price-tag">₹${Number(displayPrice).toFixed(2)}</div>
            <div class="pack-info">Pack: ${product.pack_quantity || '1 Box'} | Type: ${product.type || 'Standard'}</div>
          </div>
          <div style="text-align:center; margin-top:20px;" class="no-print">
            <button onclick="window.print()" style="padding:10px 24px; font-size:16px; background:#5b5fc7; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700;">Print Label Now</button>
          </div>
          <script>
            setTimeout(() => { window.print(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{ maxWidth: '560px', width: '92%', borderRadius: '20px', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#EEF2FF', padding: '10px', borderRadius: '12px', color: '#5B5FC7', display: 'flex' }}>
              <QrCode size={24} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                Product Codes & Sticker
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '2px 0 0', fontWeight: 600 }}>
                {productName}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Product Code Copy Ribbon */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Tag size={18} color="#64748B" />
            <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 700 }}>Unique Code:</span>
            <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 800, color: '#5B5FC7', background: '#EEF2FF', padding: '2px 8px', borderRadius: '6px' }}>
              {codeToUse}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            style={{
              border: 'none',
              background: copied ? '#DCFCE7' : '#EEF2FF',
              color: copied ? '#15803D' : '#5B5FC7',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* View Toggle Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveTab('both')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'both' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'both' ? '#0F172A' : '#64748B',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'both' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            All Codes
          </button>
          <button
            onClick={() => setActiveTab('barcode')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'barcode' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'barcode' ? '#0F172A' : '#64748B',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeTab === 'barcode' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <Barcode size={16} /> Barcode
          </button>
          <button
            onClick={() => setActiveTab('qrcode')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'qrcode' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'qrcode' ? '#0F172A' : '#64748B',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeTab === 'qrcode' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <QrCode size={16} /> QR Code
          </button>
        </div>

        {/* Code Displays Area */}
        <div
          style={{
            background: '#FFFFFF',
            border: '2px solid #F1F5F9',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
          }}
        >
          {/* Barcode Section */}
          {(activeTab === 'both' || activeTab === 'barcode') && (
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94A3B8', fontWeight: 800, marginBottom: '8px' }}>
                Standard Barcode (Code128)
              </div>
              <div style={{ background: '#FFF', padding: '10px', borderRadius: '10px', display: 'inline-block', border: '1px solid #E2E8F0' }}>
                <svg ref={barcodeRef}></svg>
              </div>
            </div>
          )}

          {/* Hidden Canvas for QR PNG Download */}
          <div style={{ display: 'none' }}>
            <QRCodeCanvas
              id="product-qr-canvas"
              value={qrPayload}
              size={300}
              level="H"
              includeMargin={true}
            />
          </div>

          {/* QR Code Section */}
          {(activeTab === 'both' || activeTab === 'qrcode') && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94A3B8', fontWeight: 800, marginBottom: '8px' }}>
                2D QR Code
              </div>
              <div
                style={{
                  background: '#FFF',
                  padding: '16px',
                  borderRadius: '16px',
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                }}
              >
                <QRCodeSVG
                  value={qrPayload}
                  size={activeTab === 'qrcode' ? 180 : 130}
                  level="H"
                  includeMargin={true}
                />

                {/* Product Code & Product Name at bottom of QR code */}
                <div
                  style={{
                    width: '100%',
                    borderTop: '1px solid #F1F5F9',
                    marginTop: '10px',
                    paddingTop: '8px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 800, color: '#5B5FC7' }}>
                    CODE: {codeToUse}
                  </div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#0F172A',
                      marginTop: '2px',
                      maxWidth: activeTab === 'qrcode' ? '200px' : '150px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={productName}
                  >
                    {productName}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginTop: '8px' }}>
                Scan to view details (Code, Name, Price)
              </div>
            </div>
          )}

          {/* Price & Details Summary */}
          <div style={{ textAlign: 'center', borderTop: '1px dashed #E2E8F0', paddingTop: '14px', width: '100%' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16A34A' }}>
              ₹{Number(displayPrice).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
              {product.pack_quantity || '1 Box'} • {product.type || 'Standard'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
          <button
            onClick={handlePrintSticker}
            className="btn-primary"
            style={{ flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.88rem' }}
          >
            <Printer size={18} />
            <span>Print Sticker Label</span>
          </button>

          {(activeTab === 'both' || activeTab === 'qrcode') && (
            <button
              onClick={handleDownloadQR}
              className="btn-secondary"
              style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.88rem', border: '1.5px solid #C7D2FE', color: '#5B5FC7', fontWeight: 800 }}
            >
              <Download size={16} />
              <span>QR PNG</span>
            </button>
          )}

          {(activeTab === 'both' || activeTab === 'barcode') && (
            <button
              onClick={handleDownloadBarcode}
              className="btn-secondary"
              style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.88rem', border: '1.5px solid #E2E8F0', color: '#0F172A', fontWeight: 800 }}
            >
              <Download size={16} />
              <span>Barcode PNG</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
