'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Save,
  CheckCircle2,
  Droplets,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useToast } from './Toast';

interface CustomerItem {
  _id: string;
  name: string;
  phone: string;
  area: string;
  ratePerBottle: number;
  bottlesWithCustomer: number;
}

interface DeliveryRecord {
  customerId: string;
  bottlesDelivered: number;
  bottlesReturned: number;
  rate: number;
  notes?: string;
}

export default function DailyEntryView() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [entries, setEntries] = useState<Record<string, DeliveryRecord>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resCust, resDel] = await Promise.all([
        fetch('/api/customers?status=active'),
        fetch(`/api/deliveries?date=${selectedDate}`),
      ]);

      const custData = await resCust.json();
      const delData = await resDel.json();

      const custList: CustomerItem[] = custData.customers || [];
      setCustomers(custList);

      // Map existing deliveries for this date
      const deliveryMap: Record<string, DeliveryRecord> = {};
      (delData.deliveries || []).forEach(
        (d: {
          customerId: string;
          bottlesDelivered: number;
          bottlesReturned: number;
          rate: number;
          notes?: string;
        }) => {
          deliveryMap[d.customerId] = {
            customerId: d.customerId,
            bottlesDelivered: d.bottlesDelivered,
            bottlesReturned: d.bottlesReturned,
            rate: d.rate,
            notes: d.notes || '',
          };
        }
      );

      // For customers without an entry on this date, initialize with 0
      custList.forEach((c) => {
        if (!deliveryMap[c._id]) {
          deliveryMap[c._id] = {
            customerId: c._id,
            bottlesDelivered: 0,
            bottlesReturned: 0,
            rate: c.ratePerBottle || 100,
            notes: '',
          };
        }
      });

      setEntries(deliveryMap);
    } catch {
      toast.error('Failed to load customers or daily entries.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDateShift = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleUpdate = (customerId: string, field: 'bottlesDelivered' | 'bottlesReturned', val: number) => {
    setEntries((prev) => {
      const existing = prev[customerId] || {
        customerId,
        bottlesDelivered: 0,
        bottlesReturned: 0,
        rate: 100,
      };
      return {
        ...prev,
        [customerId]: {
          ...existing,
          [field]: Math.max(0, val),
        },
      };
    });
  };

  const handleQuickPreset = (customerId: string, delivered: number, returned: number) => {
    setEntries((prev) => {
      const existing = prev[customerId] || {
        customerId,
        bottlesDelivered: 0,
        bottlesReturned: 0,
        rate: 100,
      };
      return {
        ...prev,
        [customerId]: {
          ...existing,
          bottlesDelivered: delivered,
          bottlesReturned: returned,
        },
      };
    });
  };

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.area && c.area.toLowerCase().includes(q))
    );
  }, [customers, search]);

  // Totals calculations
  const totalDelivered = useMemo(() => {
    return Object.values(entries).reduce((sum, e) => sum + (e.bottlesDelivered || 0), 0);
  }, [entries]);

  const totalReturned = useMemo(() => {
    return Object.values(entries).reduce((sum, e) => sum + (e.bottlesReturned || 0), 0);
  }, [entries]);

  const totalAmountBilled = useMemo(() => {
    return Object.values(entries).reduce((sum, e) => sum + (e.bottlesDelivered || 0) * (e.rate || 100), 0);
  }, [entries]);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const entryList = Object.values(entries);
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          entries: entryList,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save entries');
      }

      toast.success(`Roznamcha Saved! Total ${totalDelivered} bottles (Rs. ${totalAmountBilled}) recorded.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving entries';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      {/* Top Header & Date Navigation */}
      <div
        className="card"
        style={{
          marginBottom: 16,
          background: '#ffffff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => handleDateShift(-1)}
            className="btn btn-secondary btn-sm"
            title="Pichla Din"
          >
            <ChevronLeft size={16} /> Pichla Din
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={18} color="var(--primary)" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
              style={{ width: 'auto', minHeight: 36, fontWeight: 700 }}
            />
          </div>

          <button
            onClick={() => handleDateShift(1)}
            className="btn btn-secondary btn-sm"
            title="Agla Din"
          >
            Agla Din <ChevronRight size={16} />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="btn btn-outline-primary btn-sm"
          >
            Aaj (Today)
          </button>
        </div>

        {/* Live Counters */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              background: '#e0f2fe',
              color: '#0369a1',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            Delivered: {totalDelivered} Cans
          </div>

          <div
            style={{
              background: '#fef3c7',
              color: '#92400e',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            Returned: {totalReturned} Empty
          </div>

          <div
            style={{
              background: '#ecfdf5',
              color: '#065f46',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            Billed: Rs. {totalAmountBilled.toLocaleString()}
          </div>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="btn btn-success"
            style={{ boxShadow: 'var(--shadow-md)' }}
          >
            {saving ? (
              'Saving...'
            ) : (
              <>
                <Save size={16} /> Roznamcha Save Karein
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: 14, position: 'relative' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Customer ka naam, phone number ya area search karein..."
          className="form-input"
          style={{ paddingLeft: 38, background: '#ffffff' }}
        />
        <Search
          size={18}
          style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-sub)' }}
        />
      </div>

      {/* Customer Entry List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
          Loading daily delivery grid...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <Droplets size={32} />
          </div>
          <h3>Koi active customer nahi mila</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Roznamcha shuru karne k liye pehle customer add karein.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredCustomers.map((cust) => {
            const entry = entries[cust._id] || {
              customerId: cust._id,
              bottlesDelivered: 0,
              bottlesReturned: 0,
              rate: cust.ratePerBottle || 100,
            };

            const delivered = entry.bottlesDelivered || 0;
            const returned = entry.bottlesReturned || 0;
            const rate = entry.rate || cust.ratePerBottle || 100;
            const dailyAmount = delivered * rate;

            return (
              <div
                key={cust._id}
                className="card"
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  borderLeft: delivered > 0 ? '4px solid var(--primary)' : '4px solid transparent',
                  background: delivered > 0 ? '#f0f9ff' : '#ffffff',
                }}
              >
                {/* Customer Info */}
                <div style={{ minWidth: 200, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.98rem' }}>{cust.name}</span>
                    {delivered > 0 && (
                      <span className="badge badge-info">
                        <CheckCircle2 size={12} /> Delivered
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {cust.area || 'No Area'} • Rate: Rs. {rate} • Cans held:{' '}
                    <strong>{cust.bottlesWithCustomer}</strong>
                  </div>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(cust._id, 1, 1)}
                    className="btn btn-secondary btn-sm"
                    title="1 Delivery, 1 Empty Wapas"
                  >
                    1 In / 1 Out
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(cust._id, 2, 2)}
                    className="btn btn-secondary btn-sm"
                    title="2 Delivery, 2 Empty Wapas"
                  >
                    2 In / 2 Out
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(cust._id, 0, 0)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#ef4444' }}
                    title="Clear/Nahi Liya"
                  >
                    Clear (0)
                  </button>
                </div>

                {/* Steppers: Delivered and Returned */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Delivered Cans */}
                  <div>
                    <label
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        display: 'block',
                        marginBottom: 3,
                      }}
                    >
                      DELIVERED (CANS)
                    </label>
                    <div className="bottle-stepper">
                      <button
                        type="button"
                        onClick={() => handleUpdate(cust._id, 'bottlesDelivered', delivered - 1)}
                        className="stepper-btn"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={delivered}
                        onChange={(e) =>
                          handleUpdate(cust._id, 'bottlesDelivered', Number(e.target.value) || 0)
                        }
                        className="stepper-input"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdate(cust._id, 'bottlesDelivered', delivered + 1)}
                        className="stepper-btn"
                        style={{ color: 'var(--primary)', fontWeight: 800 }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Returned Empty Cans */}
                  <div>
                    <label
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#b45309',
                        display: 'block',
                        marginBottom: 3,
                      }}
                    >
                      EMPTY RETURNED
                    </label>
                    <div className="bottle-stepper">
                      <button
                        type="button"
                        onClick={() => handleUpdate(cust._id, 'bottlesReturned', returned - 1)}
                        className="stepper-btn"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={returned}
                        onChange={(e) =>
                          handleUpdate(cust._id, 'bottlesReturned', Number(e.target.value) || 0)
                        }
                        className="stepper-input"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdate(cust._id, 'bottlesReturned', returned + 1)}
                        className="stepper-btn"
                        style={{ color: '#b45309', fontWeight: 800 }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Daily Total Cost */}
                  <div style={{ textAlign: 'right', minWidth: 80 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Amount</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Rs. {dailyAmount}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Save button for mobile screens */}
      <div
        style={{
          position: 'sticky',
          bottom: 74,
          padding: '12px 0',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="btn btn-success btn-lg"
          style={{
            pointerEvents: 'auto',
            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)',
            padding: '12px 28px',
          }}
        >
          {saving ? 'Saving Entries...' : <><Save size={18} /> Roznamcha Save Karein (Rs. {totalAmountBilled})</>}
        </button>
      </div>
    </div>
  );
}
