'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Save, CheckCircle2, Droplets } from 'lucide-react';
import { useToast } from './Toast';

interface CustomerItem {
  _id: string;
  name: string;
  phone: string;
  area: string;
  ratePerBottle: number;
  bottlesWithCustomer: number;
}

interface DeliveryEntry {
  customerId: string;
  bottlesDelivered: number;
  rate: number;
  notes?: string;
  paymentReceived?: number | string;
}

export default function DailyEntryView() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [entries, setEntries] = useState<Record<string, DeliveryEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const savingRef = useRef(false);
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

      const deliveryMap: Record<string, DeliveryEntry> = {};
      (delData.deliveries || []).forEach(
        (d: { customerId: string; bottlesDelivered: number; rate: number; notes?: string }) => {
          deliveryMap[d.customerId] = {
            customerId: d.customerId,
            bottlesDelivered: d.bottlesDelivered,
            rate: d.rate,
            notes: d.notes || '',
            paymentReceived: '',
          };
        }
      );
      custList.forEach((c) => {
        if (!deliveryMap[c._id]) {
          deliveryMap[c._id] = {
            customerId: c._id,
            bottlesDelivered: 0,
            rate: c.ratePerBottle || 100,
            notes: '',
            paymentReceived: '',
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

  const handleUpdate = (customerId: string, val: number) => {
    setEntries((prev) => {
      const existing = prev[customerId] || { customerId, bottlesDelivered: 0, rate: 100 };
      return { ...prev, [customerId]: { ...existing, bottlesDelivered: Math.max(0, val) } };
    });
  };

  const handlePaymentUpdate = (customerId: string, val: string) => {
    setEntries((prev) => {
      const existing = prev[customerId] || { customerId, bottlesDelivered: 0, rate: 100 };
      return { ...prev, [customerId]: { ...existing, paymentReceived: val } };
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

  const totalDelivered = useMemo(
    () => Object.values(entries).reduce((sum, e) => sum + (e.bottlesDelivered || 0), 0),
    [entries]
  );

  const totalAmountBilled = useMemo(
    () => Object.values(entries).reduce((sum, e) => sum + (e.bottlesDelivered || 0) * (e.rate || 100), 0),
    [entries]
  );

  const totalPaymentReceived = useMemo(
    () => Object.values(entries).reduce((sum, e) => sum + (Number(e.paymentReceived) || 0), 0),
    [entries]
  );

  const handleSaveAll = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const entryList = Object.values(entries).map((e) => ({
        ...e,
        paymentReceived: Number(e.paymentReceived) || 0,
      }));
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, entries: entryList }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save entries');

      const paymentMsg = totalPaymentReceived > 0 ? ` and Rs.${totalPaymentReceived.toLocaleString()} payments collected` : '';
      toast.success(
        `Saved! ${totalDelivered} bottles (Rs.${totalAmountBilled.toLocaleString()})${paymentMsg} recorded for ${selectedDate}.`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error saving entries');
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const deliveredCount = Object.values(entries).filter((e) => e.bottlesDelivered > 0).length;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Droplets size={22} color="var(--primary)" /> Daily Delivery Entry
        </h2>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          Record how many bottles were delivered today to each customer
        </p>
      </div>

      {/* Date + Search bar */}
      <div
        className="card"
        style={{
          marginBottom: 14,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 160px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-input"
            style={{ flex: 1 }}
          />
        </div>

        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <input
            type="text"
            placeholder="Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: 12 }}
          />
        </div>

        {deliveredCount > 0 && (
          <div
            style={{
              fontSize: '0.82rem',
              color: 'var(--primary)',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              background: 'var(--primary-light)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {deliveredCount} customers · Rs.{totalAmountBilled.toLocaleString()}
          </div>
        )}
      </div>

      {/* Customer list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <Droplets size={32} />
          </div>
          <h3>No customers found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Add customers first to start recording daily water deliveries.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredCustomers.map((cust) => {
            const entry = entries[cust._id] || { customerId: cust._id, bottlesDelivered: 0, rate: cust.ratePerBottle || 100 };
            const delivered = entry.bottlesDelivered || 0;
            const rate = entry.rate || cust.ratePerBottle || 100;
            const dailyAmount = delivered * rate;

            return (
              <div
                key={cust._id}
                className="card"
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  borderLeft: delivered > 0 ? '4px solid var(--primary)' : '4px solid transparent',
                  background: delivered > 0 ? '#f0f9ff' : '#ffffff',
                  transition: 'background 0.2s',
                }}
              >
                {/* Customer info */}
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.97rem' }}>{cust.name}</span>
                    {delivered > 0 && (
                      <span className="badge badge-info">
                        <CheckCircle2 size={11} /> Done
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {cust.area || 'No Area'} · Rs.{rate}/bottle
                  </div>
                </div>

                {/* Stepper + Amount */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 3 }}>
                      BOTTLES DELIVERED
                    </div>
                    <div className="bottle-stepper">
                      <button
                        type="button"
                        onClick={() => handleUpdate(cust._id, delivered - 1)}
                        className="stepper-btn"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={delivered === 0 ? '' : delivered}
                        onChange={(e) =>
                          handleUpdate(cust._id, e.target.value === '' ? 0 : Number(e.target.value))
                        }
                        className="stepper-input"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdate(cust._id, delivered + 1)}
                        className="stepper-btn"
                        style={{ color: 'var(--primary)', fontWeight: 800 }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Optional Payment Received Input */}
                  <div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: 'var(--success)',
                        marginBottom: 3,
                      }}
                    >
                      PAYMENT RECVD
                    </div>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 500"
                      value={entry.paymentReceived || ''}
                      onChange={(e) => handlePaymentUpdate(cust._id, e.target.value)}
                      className="form-input"
                      style={{
                        width: 105,
                        padding: '6px 8px',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        borderColor: entry.paymentReceived ? 'var(--success)' : undefined,
                      }}
                    />
                  </div>

                  <div style={{ textAlign: 'right', minWidth: 70 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Amount</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                      Rs.{dailyAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Save Button */}
      {!loading && customers.length > 0 && (
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
              minWidth: 220,
            }}
          >
            {saving ? 'Saving...' : <><Save size={18} /> Save Deliveries{totalDelivered > 0 ? ` (Rs.${totalAmountBilled.toLocaleString()})` : ''}</>}
          </button>
        </div>
      )}
    </div>
  );
}
