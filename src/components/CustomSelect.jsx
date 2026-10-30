import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

export default function CustomSelect({ options, value, onChange, placeholder = 'Select option', style = {}, triggerStyle = {}, direction = 'down', searchable = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [popoverPosition, setPopoverPosition] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value) || { label: value || placeholder, value };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target) && !popoverRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return undefined;
    const updatePosition = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopoverPosition({
        left: rect.left,
        width: rect.width,
        ...(direction === 'up'
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, direction]);

  const visibleOptions = searchable && searchQuery.trim()
    ? options.filter((opt) => String(opt.label || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : options;

  const handleToggle = () => {
    if (!isOpen) setSearchQuery('');
    setIsOpen(!isOpen);
  };

  const handleSelect = (val) => {
    onChange(val);
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="custom-select-container" style={{ position: 'relative', minWidth: '140px', ...style }}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        className="custom-select-trigger"
        onClick={handleToggle}
        style={{
          width: '100%',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '10px',
          fontSize: '0.88rem',
          fontWeight: 700,
          color: '#0F172A',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 0 3px rgba(91, 95, 199, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
          borderColor: isOpen ? '#5B5FC7' : '#CBD5E1',
          transition: 'all 0.15s ease',
          textAlign: 'left',
          ...triggerStyle
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          color="#64748B"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0
          }}
        />
      </button>

      {/* Floating Popover Menu */}
      {isOpen && popoverPosition && createPortal(
        <div
          ref={popoverRef}
          className="custom-select-popover"
          style={{
            position: 'fixed',
            ...popoverPosition,
            zIndex: 99999,
            background: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            padding: '6px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          {searchable && (
            <div style={{ position: 'sticky', top: 0, zIndex: 2, background: '#FFFFFF', padding: '2px 2px 6px 2px', borderBottom: '1px solid #F1F5F9', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px' }}>
                <Search size={14} color="#64748B" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.84rem', fontWeight: 600, color: '#0F172A' }}
                />
              </div>
            </div>
          )}
          {visibleOptions.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.82rem', color: '#94A3B8', fontWeight: 600 }}>
              No matching products found
            </div>
          ) : (
            visibleOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? '#5B5FC7' : '#1E293B',
                    background: isSelected ? '#EEF2FF' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    marginBottom: '2px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden' }}>{opt.labelNode || opt.label}</span>
                  {isSelected && <Check size={16} color="#5B5FC7" style={{ flexShrink: 0 }} />}
                </div>
              );
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
