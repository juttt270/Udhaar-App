'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Wallet,
  PlusCircle,
  Receipt,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from './Toast';
import CustomerDropdown from './CustomerDropdown';

interface CustomerOption {
  _id: string;
  name: string;
  phone: string;
  area: string;
  currentBalance: number;
}

interface PaymentRecord {
  _id: string;
  date: string;
  amount: number;
  paymentMethod: string;
  receiptNo: string;
  notes?: string;
  customerId: {
    _id: string;
    name: string;
    phone: string;
    area: string;
  };
}

interface PaymentsViewProps {
  initialCustomerId?: string;
}

export default function PaymentsView({ initialCustomerId }: PaymentsViewProps) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const submittingRef = useRef(false);
  const deletingRef = useRef(false);

  const [formData, setFormData] = useState({
    customerId: initialCustomerId || '',
    amount: '',
    paymentMethod: 'Cash',
    date: new Date().toISOString().split('T')[0],
    receiptNo: `REC-${Date.now().toString().slice(-5)}`,
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resCust, resPay] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/payments?limit=50'),
      ]);

      const custData = await resCust.json();
      const payData = await resPay.json();

      setCustomers(custData.customers || []);
      setPayments(payData.payments || []);

      if (initialCustomerId) {
        setFormData((prev) => ({ ...prev, customerId: initialCustomerId }));
      }
    } catch {
      toast.error('Failed to load payments or customer list');
    } finally {
      setLoading(false);
    }
  }, [initialCustomerId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedCustomer = customers.find((c) => c._id === formData.customerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!formData.customerId) {
      toast.warning('Please select a customer');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.warning('Please enter a valid amount');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment recording failed');

      toast.success(data.message || 'Payment recorded successfully!');

      setFormData((prev) => ({
        ...prev,
        amount: '',
        receiptNo: `REC-${Date.now().toString().slice(-5)}`,
        notes: '',
      }));

      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording payment';
      toast.error(msg);
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return;
    if (deletingRef.current) return;
    deletingRef.current = true;
    try {
      const res = await fetch(`/api/payments?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      toast.success('Payment record deleted.');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      deletingRef.current = false;
    }
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wallet size={22} color="var(--success)" /> Payments / Cash Received
        </h2>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          Record customer payments received in cash or online transfer
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        {/* Record Payment Form */}
        <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="card-header">
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <PlusCircle size={18} color="var(--success)" /> Record New Payment
            </h3>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Customer + Balance badge */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4 }}>
                <span>Select Customer *</span>
                {selectedCustomer && (
                  <span
                    style={{
                      color: selectedCustomer.currentBalance > 0 ? 'var(--danger)' : 'var(--success)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                    }}
                  >
                    Due: Rs.{selectedCustomer.currentBalance.toLocaleString()}
                  </span>
                )}
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="form-select"
                required
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.area ? `(${c.area})` : ''} — Due: Rs.{c.currentBalance}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount + Method row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
              }}
            >
              <div className="form-group">
                <label className="form-label">Amount (Rs.) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="form-input"
                  placeholder="e.g. 1500"
                  style={{ fontWeight: 700, fontSize: '1.05rem' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="form-select"
                >
                  <option value="Cash">Cash</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            {/* Receipt + Notes row — stacks on mobile */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
                marginTop: 4,
              }}
            >
              <div className="form-group">
                <label className="form-label">Receipt / Slip No.</label>
                <input
                  type="text"
                  value={formData.receiptNo}
                  onChange={(e) => setFormData({ ...formData, receiptNo: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="form-input"
                  placeholder="e.g. Paid via rider"
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-success btn-lg"
                style={{ width: '100%' }}
              >
                {submitting ? 'Recording...' : <><CheckCircle2 size={18} /> Save Payment</>}
              </button>
            </div>
          </form>
        </div>

        {/* Recent Payments History — card-style on mobile */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Receipt size={18} color="var(--primary)" /> Recent Payment Logs
            </h3>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              Loading payments...
            </div>
          ) : payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              No payments recorded yet.
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="payment-mobile-list">
                {payments.map((p) => (
                  <div
                    key={p._id}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 2 }}>
                        {p.customerId?.name || 'Customer'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                        {p.date} &nbsp;·&nbsp; {p.customerId?.area || p.customerId?.phone || ''}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="badge badge-success">{p.paymentMethod}</span>
                        {p.receiptNo && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            #{p.receiptNo}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1rem' }}>
                        Rs.{p.amount.toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleDelete(p._id)}
                        className="toast-close"
                        title="Delete entry"
                      >
                        <Trash2 size={15} color="var(--danger)" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table — hidden on mobile via CSS */}
              <div className="payment-desktop-table" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px' }}>Date</th>
                      <th style={{ padding: '10px 12px' }}>Customer</th>
                      <th style={{ padding: '10px 12px' }}>Method</th>
                      <th style={{ padding: '10px 12px' }}>Receipt #</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{p.date}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700 }}>{p.customerId?.name || 'Customer'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {p.customerId?.area || p.customerId?.phone || ''}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className="badge badge-success">{p.paymentMethod}</span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {p.receiptNo || '-'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--success)', whiteSpace: 'nowrap' }}>
                          Rs.{p.amount.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDelete(p._id)}
                            className="toast-close"
                            title="Delete entry"
                          >
                            <Trash2 size={15} color="var(--danger)" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
