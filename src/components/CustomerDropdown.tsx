'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

export interface DropdownCustomer {
  _id: string;
  name: string;
  area?: string;
  phone?: string;
  currentBalance?: number;
}

interface CustomerDropdownProps {
  customers: DropdownCustomer[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  showBalance?: boolean;
  disabled?: boolean;
  label?: string;
}

export default function CustomerDropdown({
  customers,
  value,
  onChange,
  placeholder = '-- Choose Customer --',
  showBalance = false,
  disabled = false,
}: CustomerDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = customers.find((c) => c._id === value);

  const filtered = query.trim()
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          (c.area && c.area.toLowerCase().includes(query.toLowerCase())) ||
          (c.phone && c.phone.includes(query))
      )
    : customers;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // On desktop, click outside closes
      if (window.innerWidth > 640 && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 60);
  }, [disabled]);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        style={{
          width: '100%',
          minHeight: 42,
          padding: '9px 12px',
          border: `1.5px solid ${open ? 'var(--primary)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-sm)',
          background: disabled ? '#f8fafc' : 'var(--bg-input)',
          color: selected ? 'var(--text-main)' : 'var(--text-muted)',
          fontSize: '0.9rem',
          fontFamily: 'inherit',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          boxShadow: open ? '0 0 0 3px var(--primary-light)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? (
            <>
              <strong>{selected.name}</strong>
              {selected.area && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}> ({selected.area})</span>
              )}
              {showBalance && selected.currentBalance !== undefined && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: selected.currentBalance > 0 ? 'var(--danger)' : selected.currentBalance < 0 ? 'var(--success)' : 'var(--text-muted)',
                  }}
                >
                  {selected.currentBalance > 0
                    ? `Due: Rs.${selected.currentBalance.toLocaleString()}`
                    : selected.currentBalance < 0
                    ? `Adv: +Rs.${Math.abs(selected.currentBalance).toLocaleString()}`
                    : 'Clear'}
                </span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {selected && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              style={{ cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
              title="Clear selection"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            color="var(--text-muted)"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          />
        </div>
      </button>

      {/* Dropdown panel & mobile modal */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="dropdown-mobile-backdrop"
            onClick={() => {
              setOpen(false);
              setQuery('');
            }}
          />

          <div className="dropdown-panel-responsive">
            {/* Mobile Header with title and close X */}
            <div className="dropdown-mobile-header">
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                Select Customer
              </span>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setQuery('');
                }}
                className="toast-close"
                style={{ padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#f8fafc',
              }}
            >
              <Search size={16} color="var(--primary)" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, area or phone..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  color: 'var(--text-main)',
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Options list */}
            <div style={{ overflowY: 'auto', flex: 1, maxHeight: '350px' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '24px 12px', color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center' }}>
                  No customer matching &quot;{query}&quot;
                </div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => handleSelect(c._id)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      border: 'none',
                      borderBottom: '1px solid #f1f5f9',
                      background: c._id === value ? 'var(--primary-light)' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        {c.name}
                      </div>
                      {(c.area || c.phone) && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {[c.area, c.phone].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    {showBalance && c.currentBalance !== undefined && (
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: c.currentBalance > 0 ? 'var(--danger)' : c.currentBalance < 0 ? 'var(--success)' : 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {c.currentBalance > 0
                          ? `Due: Rs.${c.currentBalance.toLocaleString()}`
                          : c.currentBalance < 0
                          ? `Adv: +Rs.${Math.abs(c.currentBalance).toLocaleString()}`
                          : 'Clear'}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
