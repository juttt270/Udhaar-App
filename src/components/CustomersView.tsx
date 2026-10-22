'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  FileText,
  Wallet,
  Edit2,
  Trash2,
  X,
  MessageCircle,
  PlusCircle,
  Droplets,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from './Toast';

export interface CustomerData {
  _id: string;
  name: string;
  phone: string;
  address: string;
  area: string;
  ratePerBottle: number;
  initialBalance: number;
  depositBottles: number;
  isActive: boolean;
  notes?: string;
  totalBilled: number;
  totalPaid: number;
  currentBalance: number;
  bottlesWithCustomer: number;
}

interface CustomersViewProps {
  onNavigate: (tab: string, extra?: unknown) => void;
  defaultPlantRate: number;
  initialOpenAdd?: boolean;
}

export default function CustomersView({ onNavigate, defaultPlantRate, initialOpenAdd }: CustomersViewProps) {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'debtors' | 'active'>('all');
  const [showAddModal, setShowAddModal] = useState(initialOpenAdd || false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Quick action modals directly from customer card
  const [quickDeliveryCust, setQuickDeliveryCust] = useState<CustomerData | null>(null);
  const [deliveryData, setDeliveryData] = useState({
    date: new Date().toISOString().split('T')[0],
    bottlesDelivered: 1,
  });
  const [savingDelivery, setSavingDelivery] = useState(false);

  const [quickPaymentCust, setQuickPaymentCust] = useState<CustomerData | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'Cash',
    date: new Date().toISOString().split('T')[0],
    receiptNo: `REC-${Date.now().toString().slice(-5)}`,
  });
  const [savingPayment, setSavingPayment] = useState(false);

  const toast = useToast();
  const submittingRef = useRef(false);
  const savingDeliveryRef = useRef(false);
  const savingPaymentRef = useRef(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    area: '',
    ratePerBottle: defaultPlantRate || 100,
    initialBalance: 0,
    depositBottles: 1,
    notes: '',
  });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (res.ok) {
        setCustomers(data.customers || []);
      } else {
        toast.error(data.error || 'Failed to fetch customers');
      }
    } catch {
      toast.error('Network error loading customers');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      address: '',
      area: '',
      ratePerBottle: defaultPlantRate || 100,
      initialBalance: 0,
      depositBottles: 1,
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (cust: CustomerData) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.name,
      phone: cust.phone || '',
      address: cust.address || '',
      area: cust.area || '',
      ratePerBottle: cust.ratePerBottle || defaultPlantRate || 100,
      initialBalance: cust.initialBalance || 0,
      depositBottles: cust.depositBottles || 1,
      notes: cust.notes || '',
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!formData.name.trim()) {
      toast.warning('Customer name is required');
      return;
    }

    try {
      const isEdit = !!editingCustomer;
      const url = '/api/customers';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit ? { ...formData, id: editingCustomer._id } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');

      toast.success(isEdit ? 'Customer updated!' : 'New customer added successfully!');
      setShowAddModal(false);
      fetchCustomers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      submittingRef.current = false;
    }
  };

  // Quick 1-click delivery logger from customer card
  const handleSaveQuickDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDeliveryCust || savingDeliveryRef.current) return;
    savingDeliveryRef.current = true;
    setSavingDelivery(true);
    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: deliveryData.date,
          entries: [
            {
              customerId: quickDeliveryCust._id,
              bottlesDelivered: Number(deliveryData.bottlesDelivered) || 0,
              rate: quickDeliveryCust.ratePerBottle || 100,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save delivery');

      toast.success(`Delivery of ${deliveryData.bottlesDelivered} bottles saved for ${quickDeliveryCust.name}!`);
      setQuickDeliveryCust(null);
      fetchCustomers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      setSavingDelivery(false);
      savingDeliveryRef.current = false;
    }
  };

  // Quick 1-click payment logger from customer card
  const handleSaveQuickPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPaymentCust || !paymentData.amount || savingPaymentRef.current) return;
    savingPaymentRef.current = true;
    setSavingPayment(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: quickPaymentCust._id,
          amount: Number(paymentData.amount),
          paymentMethod: paymentData.paymentMethod,
          date: paymentData.date,
          receiptNo: paymentData.receiptNo,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      toast.success(`Payment of Rs. ${paymentData.amount} received from ${quickPaymentCust.name}!`);
      setQuickPaymentCust(null);
      fetchCustomers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      setSavingPayment(false);
      savingPaymentRef.current = false;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      toast.success('Customer deleted.');
      setDeleteConfirmId(null);
      fetchCustomers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    }
  };

  const filteredCustomers = useMemo(() => {
    let result = customers;
    if (statusFilter === 'debtors') {
      result = result.filter((c) => c.currentBalance > 0);
    } else if (statusFilter === 'active') {
      result = result.filter((c) => c.isActive);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.area && c.area.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q))
      );
    }

    return result;
  }, [customers, search, statusFilter]);

  return (
    <div className="page-container">
      {/* Top Header */}
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
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={24} color="var(--primary)" /> Customers ({customers.length})
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            List of regular delivery customers and their balance status
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary">
          <UserPlus size={16} /> Add New Customer
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          marginBottom: 16,
          padding: 12,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, area..."
            className="form-input"
            style={{ paddingLeft: 36, minHeight: 38 }}
          />
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-sub)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setStatusFilter('all')}
            className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => setStatusFilter('debtors')}
            className={`btn btn-sm ${statusFilter === 'debtors' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Unpaid Balances ({customers.filter((c) => c.currentBalance > 0).length})
          </button>
        </div>
      </div>

      {/* Customer Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
          Loading customer records...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <Users size={32} />
          </div>
          <h3>No customers found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Click &quot;Add New Customer&quot; above to create your first customer.
          </p>
          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ marginTop: 8 }}>
            <UserPlus size={16} /> Add New Customer
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 14,
          }}
        >
          {filteredCustomers.map((cust) => {
            const hasDebt = cust.currentBalance > 0;
            const isAdvance = cust.currentBalance < 0;

            return (
              <div
                key={cust._id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: hasDebt ? '4px solid var(--danger)' : '4px solid var(--success)',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>{cust.name}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {cust.area ? `${cust.area} • ` : ''}
                        {cust.address || 'No specific address'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => handleOpenEdit(cust)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: 6, minHeight: 30 }}
                        title="Edit Customer"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(cust._id)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: 6, minHeight: 30, color: 'var(--danger)' }}
                        title="Delete Customer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Financial Badge */}
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      margin: '10px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Unpaid Balance
                      </div>
                      <div
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 800,
                          color: hasDebt ? 'var(--danger)' : isAdvance ? 'var(--success)' : 'var(--text-main)',
                        }}
                      >
                        Rs. {Math.abs(cust.currentBalance).toLocaleString()}{' '}
                        <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                          {hasDebt ? '(Due)' : isAdvance ? '(Advance)' : '(Clear)'}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Rate</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        Rs. {cust.ratePerBottle} / bottle
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      marginBottom: 12,
                    }}
                  >
                    <span>Rate: <strong>Rs. {cust.ratePerBottle}</strong> / bottle</span>
                    {cust.phone && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={12} /> {cust.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Direct Action Buttons on Customer Card (Minimum Clicks!) */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => {
                      setQuickDeliveryCust(cust);
                      setDeliveryData({
                        date: new Date().toISOString().split('T')[0],
                        bottlesDelivered: 1,
                      });
                    }}
                    className="btn btn-outline-primary btn-sm"
                    style={{ flex: 1 }}
                    title="Log today's delivery for this customer"
                  >
                    <Droplets size={14} /> + Delivery
                  </button>

                  <button
                    onClick={() => {
                      setQuickPaymentCust(cust);
                      setPaymentData({
                        amount: cust.currentBalance > 0 ? String(cust.currentBalance) : '',
                        paymentMethod: 'Cash',
                        date: new Date().toISOString().split('T')[0],
                        receiptNo: `REC-${Date.now().toString().slice(-5)}`,
                      });
                    }}
                    className="btn btn-success btn-sm"
                    style={{ flex: 1 }}
                    title="Record cash received from this customer"
                  >
                    <Wallet size={14} /> + Cash
                  </button>

                  <button
                    onClick={() => onNavigate('reports', { customerId: cust._id })}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    title="View & Download PDF Bill"
                  >
                    <FileText size={14} /> Bill
                  </button>

                  {cust.phone && (
                    <a
                      href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#16a34a' }}
                      title="Open WhatsApp"
                    >
                      <MessageCircle size={14} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Delivery Modal (Log delivery right from customer card!) */}
      {quickDeliveryCust && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Droplets size={18} color="var(--primary)" /> Log Delivery: {quickDeliveryCust.name}
              </h3>
              <button onClick={() => setQuickDeliveryCust(null)} className="toast-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveQuickDelivery}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={deliveryData.date}
                    onChange={(e) => setDeliveryData({ ...deliveryData, date: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Bottles Delivered</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={deliveryData.bottlesDelivered}
                    onChange={(e) => setDeliveryData({ ...deliveryData, bottlesDelivered: Number(e.target.value) || 0 })}
                    className="form-input"
                    style={{ fontWeight: 700 }}
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, fontSize: '0.84rem' }}>
                  Cost: <strong>Rs. {(deliveryData.bottlesDelivered * (quickDeliveryCust.ratePerBottle || 100)).toLocaleString()}</strong> (Rate: Rs. {quickDeliveryCust.ratePerBottle}/bottle)
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setQuickDeliveryCust(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={savingDelivery} className="btn btn-primary">
                  {savingDelivery ? 'Saving...' : 'Save Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Payment Modal (Receive cash right from customer card!) */}
      {quickPaymentCust && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wallet size={18} color="var(--success)" /> Receive Cash: {quickPaymentCust.name}
              </h3>
              <button onClick={() => setQuickPaymentCust(null)} className="toast-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveQuickPayment}>
              <div className="modal-body">
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: '0.78rem', color: '#b91c1c' }}>Total Unpaid Balance Due:</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#b91c1c' }}>
                    Rs. {quickPaymentCust.currentBalance.toLocaleString()}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount Received (Rs.) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    className="form-input"
                    placeholder="Enter amount"
                    style={{ fontWeight: 800, fontSize: '1.1rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select
                      value={paymentData.paymentMethod}
                      onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                      className="form-select"
                    >
                      <option value="Cash">Cash</option>
                      <option value="EasyPaisa">EasyPaisa</option>
                      <option value="JazzCash">JazzCash</option>
                      <option value="Bank">Bank Transfer</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      value={paymentData.date}
                      onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setQuickPaymentCust(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={savingPayment} className="btn btn-success">
                  {savingPayment ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>
                {editingCustomer ? 'Edit Customer Details' : 'Add New Customer'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="toast-close"
                style={{ padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Haji Muhammad Aslam"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="form-input"
                      placeholder="0300-1234567"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Area / Street</label>
                    <input
                      type="text"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Sector G, Street 4"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Address (Optional)</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="form-input"
                    placeholder="House number, landmark, etc."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Bottle Price (Rs.)</label>
                    <input
                      type="number"
                      required
                      value={formData.ratePerBottle}
                      onChange={(e) =>
                        setFormData({ ...formData, ratePerBottle: Number(e.target.value) || 0 })
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Previous Balance</label>
                    <input
                      type="number"
                      value={formData.initialBalance}
                      onChange={(e) =>
                        setFormData({ ...formData, initialBalance: Number(e.target.value) || 0 })
                      }
                      className="form-input"
                    />
                    <span className="form-hint">Old pending debt (if any)</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Deposit Bottles</label>
                    <input
                      type="number"
                      value={formData.depositBottles}
                      onChange={(e) =>
                        setFormData({ ...formData, depositBottles: Number(e.target.value) || 0 })
                      }
                      className="form-input"
                    />
                    <span className="form-hint">Bottles held</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes (Optional)</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Leave bottles at gate"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCustomer ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', color: 'var(--danger)' }}>Confirm Deletion</h3>
              <button onClick={() => setDeleteConfirmId(null)} className="toast-close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: '0.88rem' }}>
              Are you sure you want to delete this customer? All their delivery history and payment records will also be removed.
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteConfirmId(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="btn btn-danger">
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}