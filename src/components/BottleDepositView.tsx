'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  PlusCircle,
  Search,
  Trash2,
  RotateCcw,
  Package,
  Coins,
  Users,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from './Toast';
import CustomerDropdown, { DropdownCustomer } from './CustomerDropdown';

interface DepositRecord {
  _id: string;
  bottlesDeposited: number;
  securityAmount: number;
  depositDate: string;
  status: 'active' | 'refunded';
  refundDate?: string;
  refundAmount?: number;
  notes?: string;
  createdAt: string;
  customerId: {
    _id: string;
    name: string;
    phone?: string;
    area?: string;
  };
}

interface DepositStats {
  totalSecurityHeld: number;
  totalDepositBottles: number;
  activeCount: number;
  refundedCount: number;
  totalRecords: number;
}

export default function BottleDepositView() {
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [customers, setCustomers] = useState<DropdownCustomer[]>([]);
  const [stats, setStats] = useState<DepositStats>({
    totalSecurityHeld: 0,
    totalDepositBottles: 0,
    activeCount: 0,
    refundedCount: 0,
    totalRecords: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'refunded'>('active');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [refundTarget, setRefundTarget] = useState<DepositRecord | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    customerId: '',
    bottlesDeposited: '' as number | string,
    securityAmount: '',
    depositDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [refundData, setRefundData] = useState({
    refundDate: new Date().toISOString().split('T')[0],
    refundAmount: '',
    notes: '',
  });

  // Loading & ref locks
  const [submitting, setSubmitting] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const refundingRef = useRef(false);
  const deletingRef = useRef(false);
  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resDep, resCust] = await Promise.all([
        fetch('/api/deposits'),
        fetch('/api/customers'),
      ]);
      const dataDep = await resDep.json();
      const dataCust = await resCust.json();

      setDeposits(dataDep.deposits || []);
      setStats(
        dataDep.stats || {
          totalSecurityHeld: 0,
          totalDepositBottles: 0,
          activeCount: 0,
          refundedCount: 0,
          totalRecords: 0,
        }
      );
      setCustomers(dataCust.customers || []);
    } catch {
      toast.error('Failed to load bottle deposit records');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Add Deposit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || submitting) return;
    if (!formData.customerId) {
      toast.warning('Please select a customer');
      return;
    }
    if (!formData.securityAmount || Number(formData.securityAmount) < 0) {
      toast.warning('Please enter a valid security deposit amount');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId,
          bottlesDeposited: Number(formData.bottlesDeposited) || 1,
          securityAmount: Number(formData.securityAmount),
          depositDate: formData.depositDate,
          notes: formData.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save deposit');

      toast.success('Bottle security deposit saved successfully!');
      setShowAddModal(false);
      setFormData({
        customerId: '',
        bottlesDeposited: '',
        securityAmount: '',
        depositDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // Open Refund Modal
  const openRefundModal = (dep: DepositRecord) => {
    setRefundTarget(dep);
    setRefundData({
      refundDate: new Date().toISOString().split('T')[0],
      refundAmount: String(dep.securityAmount),
      notes: '',
    });
  };

  // Handle Refund Submit
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget || refundingRef.current || refunding) return;
    refundingRef.current = true;
    setRefunding(true);

    try {
      const res = await fetch('/api/deposits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: refundTarget._id,
          action: 'refund',
          refundDate: refundData.refundDate,
          refundAmount: Number(refundData.refundAmount) || refundTarget.securityAmount,
          notes: refundData.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refund failed');

      toast.success(`Deposit refunded to ${refundTarget.customerId?.name || 'customer'}!`);
      setRefundTarget(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      refundingRef.current = false;
      setRefunding(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deposit record?')) return;
    if (deletingRef.current || deletingId) return;
    deletingRef.current = true;
    setDeletingId(id);

    try {
      const res = await fetch(`/api/deposits?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      toast.success('Deposit record deleted.');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      deletingRef.current = false;
      setDeletingId(null);
    }
  };

  // Filtered deposits
  const filtered = deposits.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = d.customerId?.name?.toLowerCase() || '';
      const area = d.customerId?.area?.toLowerCase() || '';
      const phone = d.customerId?.phone || '';
      return name.includes(q) || area.includes(q) || phone.includes(q);
    }
    return true;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={22} color="var(--primary)" /> Bottle Security Deposits
          </h2>
          <p className="desktop-only" style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Track security cash held against water bottles given to customers
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <PlusCircle size={17} /> + New Bottle Deposit
        </button>
      </div>

      {/* 3 KPI Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 18 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div className="stat-header">
            <span>Total Security Cash Held</span>
            <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <Coins size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#0284c7' }}>
            {loading ? '...' : `Rs. ${stats.totalSecurityHeld.toLocaleString()}`}
          </div>
          <div className="stat-hint">Active refundable security money</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-header">
            <span>Deposit Bottles Held</span>
            <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Package size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {loading ? '...' : `${stats.totalDepositBottles} Bottles`}
          </div>
          <div className="stat-hint">Bottles given under security</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="stat-header">
            <span>Active Customers</span>
            <div className="stat-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#8b5cf6' }}>
            {loading ? '...' : `${stats.activeCount} Customers`}
          </div>
          <div className="stat-hint">{stats.refundedCount} deposits refunded</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by customer name, phone, area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: 32 }}
          />
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`btn btn-sm ${statusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 8px', fontSize: '0.78rem' }}
          >
            Active ({stats.activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('refunded')}
            className={`btn btn-sm ${statusFilter === 'refunded' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 8px', fontSize: '0.78rem' }}
          >
            Refunded ({stats.refundedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 8px', fontSize: '0.78rem' }}
          >
            All ({stats.totalRecords})
          </button>
        </div>
      </div>

      {/* Deposits List */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
            Loading security deposit records...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
            No deposit records found.
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="payment-mobile-list">
              {filtered.map((d) => (
                <div
                  key={d._id}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {d.customerId?.name || 'Customer'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {[d.customerId?.area, d.customerId?.phone].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 12,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: d.status === 'active' ? '#ecfdf5' : '#f1f5f9',
                        color: d.status === 'active' ? '#059669' : '#64748b',
                      }}
                    >
                      {d.status === 'active' ? 'Active' : 'Refunded'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 10px', borderRadius: 6 }}>
                    <div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Bottles Deposited: </span>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>{d.bottlesDeposited}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Security Cash: </span>
                      <strong style={{ color: '#0284c7', fontSize: '1rem' }}>Rs. {d.securityAmount.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    <span>Date: {d.depositDate}</span>
                    {d.status === 'refunded' && d.refundDate && (
                      <span style={{ color: '#64748b' }}>Refunded on: {d.refundDate}</span>
                    )}
                  </div>

                  {d.notes && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      &ldquo;{d.notes}&rdquo;
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                    {d.status === 'active' && (
                      <button
                        onClick={() => openRefundModal(d)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#059669', borderColor: '#a7f3d0' }}
                      >
                        <RotateCcw size={13} /> Refund Deposit
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(d._id)}
                      disabled={deletingId === d._id}
                      className="toast-close"
                      title="Delete record"
                    >
                      <Trash2 size={15} color={deletingId === d._id ? 'var(--text-muted)' : 'var(--danger)'} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="payment-desktop-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px' }}>Date</th>
                    <th style={{ padding: '10px 14px' }}>Customer</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Bottles</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Security Amount</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Notes</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => (
                    <tr key={d._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{d.depositDate}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{d.customerId?.name || 'Customer'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {[d.customerId?.area, d.customerId?.phone].filter(Boolean).join(' · ')}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: 'var(--primary)' }}>
                        {d.bottlesDeposited}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#0284c7', whiteSpace: 'nowrap' }}>
                        Rs. {d.securityAmount.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: d.status === 'active' ? '#ecfdf5' : '#f1f5f9',
                            color: d.status === 'active' ? '#059669' : '#64748b',
                          }}
                        >
                          {d.status === 'active' ? 'Active' : 'Refunded'}
                        </span>
                        {d.status === 'refunded' && d.refundDate && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {d.refundDate}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: 180 }}>
                        {d.notes || '-'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                          {d.status === 'active' && (
                            <button
                              onClick={() => openRefundModal(d)}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#059669', borderColor: '#a7f3d0' }}
                            >
                              <RotateCcw size={13} /> Refund
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(d._id)}
                            disabled={deletingId === d._id}
                            className="toast-close"
                            title="Delete record"
                          >
                            <Trash2 size={15} color={deletingId === d._id ? 'var(--text-muted)' : 'var(--danger)'} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add Bottle Deposit Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={20} color="var(--primary)" /> Record Bottle Security Deposit
              </h3>
              <button onClick={() => setShowAddModal(false)} className="toast-close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                {/* Select Customer (Modal custom dropdown) */}
                <div className="form-group">
                  <label className="form-label">Select Customer *</label>
                  <CustomerDropdown
                    customers={customers}
                    value={formData.customerId}
                    onChange={(id) => setFormData((prev) => ({ ...prev, customerId: id }))}
                    placeholder="-- Search or choose customer --"
                    showBalance={true}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Deposit Bottles (Qty) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="0"
                      value={formData.bottlesDeposited}
                      onChange={(e) => setFormData({ ...formData, bottlesDeposited: e.target.value })}
                      className="form-input"
                      style={{ fontWeight: 800, fontSize: '1.05rem' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Security Cash (Rs.) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="e.g. 1500"
                      value={formData.securityAmount}
                      onChange={(e) => setFormData({ ...formData, securityAmount: e.target.value })}
                      className="form-input"
                      style={{ fontWeight: 800, fontSize: '1.05rem' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Deposit Date</label>
                  <input
                    type="date"
                    value={formData.depositDate}
                    onChange={(e) => setFormData({ ...formData, depositDate: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 new blue bottles given against Rs. 2000 cash amanat"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ minWidth: 140 }}>
                  {submitting ? 'Saving...' : <><CheckCircle2 size={16} /> Save Deposit</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refund Security Modal */}
      {refundTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RotateCcw size={18} /> Refund Bottle Security
              </h3>
              <button onClick={() => setRefundTarget(null)} className="toast-close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRefundSubmit}>
              <div className="modal-body">
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{refundTarget.customerId?.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Bottles under deposit: <strong>{refundTarget.bottlesDeposited}</strong> · Original Security: <strong>Rs. {refundTarget.securityAmount.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Refund Amount (Rs.) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={refundData.refundAmount}
                    onChange={(e) => setRefundData({ ...refundData, refundAmount: e.target.value })}
                    className="form-input"
                    style={{ fontWeight: 800, fontSize: '1.05rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Refund Date</label>
                  <input
                    type="date"
                    value={refundData.refundDate}
                    onChange={(e) => setRefundData({ ...refundData, refundDate: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Returned both bottles in good condition"
                    value={refundData.notes}
                    onChange={(e) => setRefundData({ ...refundData, notes: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setRefundTarget(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={refunding} className="btn btn-success" style={{ minWidth: 140 }}>
                  {refunding ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
