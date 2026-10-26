'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Wallet,
  PlusCircle,
  Trash2,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  Calendar,
  ListFilter,
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
  receiptNo?: string;
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

const PAYMENT_METHODS = ['Cash', 'EasyPaisa', 'JazzCash', 'Bank', 'Other'];

export default function PaymentsView({ initialCustomerId }: PaymentsViewProps) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'accordion' | 'flat'>('accordion');

  const toast = useToast();
  const submittingRef = useRef(false);
  const deletingRef = useRef(false);

  const [formData, setFormData] = useState({
    customerId: initialCustomerId || '',
    amount: '',
    paymentMethod: 'Cash',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resCust, resPay] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/payments?limit=200'),
      ]);

      const custData = await resCust.json();
      const payData = await resPay.json();

      const custList: CustomerOption[] = custData.customers || [];
      const payList: PaymentRecord[] = payData.payments || [];

      setCustomers(custList);
      setPayments(payList);

      if (initialCustomerId) {
        setFormData((prev) => ({ ...prev, customerId: initialCustomerId }));
        setIsAddModalOpen(true);
        setExpandedCustomerIds({ [initialCustomerId]: true });
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

  const toggleAccordion = (custId: string) => {
    setExpandedCustomerIds((prev) => ({
      ...prev,
      [custId]: !prev[custId],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    customers.forEach((c) => {
      allExpanded[c._id] = true;
    });
    setExpandedCustomerIds(allExpanded);
  };

  const collapseAll = () => {
    setExpandedCustomerIds({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || submitting) return;
    if (!formData.customerId) {
      toast.warning('Please select a customer first');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.warning('Please enter a valid payment amount');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId,
          amount: Number(formData.amount),
          paymentMethod: formData.paymentMethod,
          date: formData.date,
          notes: formData.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment recording failed');

      toast.success(data.message || 'Payment recorded successfully!');

      const addedCustomerId = formData.customerId;
      setFormData((prev) => ({
        ...prev,
        amount: '',
        notes: '',
      }));
      setIsAddModalOpen(false);

      // Auto expand this customer's accordion
      setExpandedCustomerIds((prev) => ({
        ...prev,
        [addedCustomerId]: true,
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
    if (deletingRef.current || deletingId) return;
    deletingRef.current = true;
    setDeletingId(id);
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
      setDeletingId(null);
    }
  };

  // Group payments by customer
  const customerPaymentGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        customer: { _id: string; name: string; phone: string; area: string; currentBalance: number };
        totalPaid: number;
        payments: PaymentRecord[];
      }
    >();

    // Initialise with customers who have payments or balance
    customers.forEach((c) => {
      map.set(c._id, {
        customer: c,
        totalPaid: 0,
        payments: [],
      });
    });

    // Populate with payments
    payments.forEach((p) => {
      const custId = p.customerId?._id;
      if (!custId) return;
      if (!map.has(custId)) {
        map.set(custId, {
          customer: {
            _id: custId,
            name: p.customerId.name,
            phone: p.customerId.phone,
            area: p.customerId.area,
            currentBalance: 0,
          },
          totalPaid: 0,
          payments: [],
        });
      }
      const grp = map.get(custId)!;
      grp.totalPaid += p.amount;
      grp.payments.push(p);
    });

    // Convert to array and filter out customers with 0 payments unless they match search
    let list = Array.from(map.values()).filter((g) => g.payments.length > 0);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.customer.name.toLowerCase().includes(q) ||
          g.customer.phone?.toLowerCase().includes(q) ||
          g.customer.area?.toLowerCase().includes(q)
      );
    }

    // Sort by highest total paid or newest payment
    list.sort((a, b) => b.totalPaid - a.totalPaid);

    return list;
  }, [customers, payments, search]);

  const totalAllPaymentsAmount = useMemo(
    () => payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    [payments]
  );

  return (
    <div className="page-container">
      {/* Header with Prominent Add Payment Modal Trigger */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wallet size={24} color="var(--success)" /> Payments / Cash Ledger
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Customer payments categorized by account with quick accordion details
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-success btn-lg"
          style={{ display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
        >
          <PlusCircle size={18} /> + Add Payment
        </button>
      </div>

      {/* Summary KPI Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div className="card" style={{ padding: '8px 12px', borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL COLLECTED</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)', marginTop: 2 }}>
            Rs. {totalAllPaymentsAmount.toLocaleString()}
          </div>
          <div className="desktop-only" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {payments.length} payment transactions
          </div>
        </div>

        <div className="card" style={{ padding: '8px 12px', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>PAYING ACCOUNTS</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginTop: 2 }}>
            {customerPaymentGroups.length} Accounts
          </div>
          <div className="desktop-only" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Grouped in accordion view
          </div>
        </div>
      </div>

      {/* Search & View Controls */}
      <div
        className="card"
        style={{
          marginBottom: 14,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '8px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 200px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search customer, area, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ flex: 1, padding: '6px 10px', fontSize: '0.84rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {viewMode === 'accordion' && (
            <div className="desktop-flex" style={{ gap: 6 }}>
              <button onClick={expandAll} className="btn btn-secondary btn-sm" style={{ fontSize: '0.76rem' }}>
                Expand All
              </button>
              <button onClick={collapseAll} className="btn btn-secondary btn-sm" style={{ fontSize: '0.76rem' }}>
                Collapse All
              </button>
            </div>
          )}

          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('accordion')}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                background: viewMode === 'accordion' ? 'var(--primary)' : '#ffffff',
                color: viewMode === 'accordion' ? '#ffffff' : 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              Accordion Grouping
            </button>
            <button
              onClick={() => setViewMode('flat')}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                background: viewMode === 'flat' ? 'var(--primary)' : '#ffffff',
                color: viewMode === 'flat' ? '#ffffff' : 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              All Logs List
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Accordion View or Flat List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading payment records...
        </div>
      ) : payments.length === 0 ? (
        <div className="card empty-state" style={{ padding: '48px 16px', textAlign: 'center' }}>
          <div className="empty-icon"><Wallet size={36} color="var(--success)" /></div>
          <h3 style={{ marginTop: 12, fontSize: '1.1rem' }}>No Payments Recorded Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '6px auto 14px', maxWidth: 380 }}>
            Click the button below to record the first payment received from a customer.
          </p>
          <button onClick={() => setIsAddModalOpen(true)} className="btn btn-success">
            <PlusCircle size={16} /> Record First Payment
          </button>
        </div>
      ) : viewMode === 'accordion' ? (
        /* ACCORDION GROUPED BY CUSTOMER */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {customerPaymentGroups.map((group) => {
            const isExpanded = !!expandedCustomerIds[group.customer._id];
            const cust = group.customer;
            return (
              <div
                key={cust._id}
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  border: isExpanded ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  transition: 'border 0.2s ease',
                }}
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleAccordion(cust._id)}
                  style={{
                    padding: '12px 16px',
                    background: isExpanded ? '#f0f9ff' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                      }}
                    >
                      {cust.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.98rem' }}>{cust.name}</span>
                        <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                          {group.payments.length} {group.payments.length === 1 ? 'payment' : 'payments'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {cust.area || 'No Area'} · Phone: {cust.phone || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Paid</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--success)' }}>
                        Rs. {group.totalPaid.toLocaleString()}
                      </div>
                    </div>

                    {cust.currentBalance !== undefined && cust.currentBalance > 0 ? (
                      <span className="badge badge-danger" style={{ fontSize: '0.78rem' }}>
                        Due: Rs.{cust.currentBalance.toLocaleString()}
                      </span>
                    ) : cust.currentBalance !== undefined && cust.currentBalance < 0 ? (
                      <span className="badge badge-success" style={{ fontSize: '0.78rem' }}>
                        Adv: +Rs.{Math.abs(cust.currentBalance).toLocaleString()}
                      </span>
                    ) : null}

                    <div style={{ color: 'var(--text-muted)' }}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Accordion Body */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #e0f2fe', padding: '12px 16px', background: '#fafbfc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        PAYMENT HISTORY FOR {cust.name.toUpperCase()}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData((prev) => ({ ...prev, customerId: cust._id }));
                          setIsAddModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                      >
                        + Add Payment for {cust.name}
                      </button>
                    </div>

                    {/* Table for customer payments */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '8px 10px' }}>Date</th>
                            <th style={{ padding: '8px 10px' }}>Method</th>
                            <th style={{ padding: '8px 10px' }}>Receipt / Remarks</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.payments.map((p) => (
                            <tr key={p._id} style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                              <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.date}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <span className="badge badge-success">{p.paymentMethod}</span>
                              </td>
                              <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                {p.receiptNo && <span>#{p.receiptNo} </span>}
                                {p.notes && <span>· {p.notes}</span>}
                                {!p.receiptNo && !p.notes && '-'}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>
                                Rs. {p.amount.toLocaleString()}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <button
                                  onClick={() => handleDelete(p._id)}
                                  disabled={deletingId === p._id}
                                  className="toast-close"
                                  title="Delete payment"
                                >
                                  <Trash2 size={14} color={deletingId === p._id ? 'var(--text-muted)' : 'var(--danger)'} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* FLAT LIST CHRONOLOGICAL VIEW */
        <div className="card" style={{ padding: 0 }}>
          <div className="payment-desktop-table" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                  <th style={{ padding: '10px 12px' }}>Customer</th>
                  <th style={{ padding: '10px 12px' }}>Method</th>
                  <th style={{ padding: '10px 12px' }}>Notes / Receipt</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{p.date}</td>
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
                      {p.notes || p.receiptNo || '-'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>
                      Rs. {p.amount.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDelete(p._id)}
                        disabled={deletingId === p._id}
                        className="toast-close"
                        title="Delete entry"
                      >
                        <Trash2 size={15} color={deletingId === p._id ? 'var(--text-muted)' : 'var(--danger)'} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Form IN MODAL (as requested by user) */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={20} color="var(--success)" /> Record New Payment
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="toast-close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Searchable Customer Dropdown */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Customer *</span>
                    {selectedCustomer && (
                      <span
                        style={{
                          color: selectedCustomer.currentBalance > 0 ? 'var(--danger)' : selectedCustomer.currentBalance < 0 ? 'var(--success)' : 'var(--text-muted)',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                        }}
                      >
                        {selectedCustomer.currentBalance > 0
                          ? `Due: Rs.${selectedCustomer.currentBalance.toLocaleString()}`
                          : selectedCustomer.currentBalance < 0
                          ? `Adv: +Rs.${Math.abs(selectedCustomer.currentBalance).toLocaleString()}`
                          : 'Clear'}
                      </span>
                    )}
                  </label>
                  <CustomerDropdown
                    customers={customers}
                    value={formData.customerId}
                    onChange={(id) => setFormData((prev) => ({ ...prev, customerId: id }))}
                    placeholder="-- Select or search customer --"
                    showBalance={true}
                  />
                </div>

                {/* Amount (placeholder e.g. 1500, no default 0) */}
                <div className="form-group">
                  <label className="form-label">Payment Amount (Rs.) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 1500"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    className="form-input"
                    style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--success)' }}
                  />
                </div>

                {/* Date */}
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    className="form-input"
                  />
                </div>

                {/* Payment Method Pills */}
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {PAYMENT_METHODS.map((m) => {
                      const isSelected = formData.paymentMethod === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: m }))}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                            background: isSelected ? 'var(--primary)' : '#ffffff',
                            color: isSelected ? '#ffffff' : 'var(--text-main)',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">Notes / Remarks (Optional)</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    className="form-input"
                    placeholder="e.g. Cleared bill, cash received by driver"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-success"
                  style={{ minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {submitting ? 'Saving...' : <><CheckCircle2 size={16} /> Save Payment</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
