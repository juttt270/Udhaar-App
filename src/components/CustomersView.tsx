'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Building,
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
}

export default function CustomersView({ onNavigate, defaultPlantRate }: CustomersViewProps) {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'debtors' | 'active'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const toast = useToast();

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
    if (!formData.name.trim()) {
      toast.warning('Please enter customer name');
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

      toast.success(isEdit ? 'Customer details updated!' : 'New customer added successfully!');
      setShowAddModal(false);
      fetchCustomers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
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
            <Users size={24} color="var(--primary)" /> Customer Directory ({customers.length})
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Tamam monthly water delivery customers aur unka hisab kitab
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary">
          <UserPlus size={16} /> Naya Customer Add Karein
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
            placeholder="Search by name, phone, area..."
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
            Sab ({customers.length})
          </button>
          <button
            onClick={() => setStatusFilter('debtors')}
            className={`btn btn-sm ${statusFilter === 'debtors' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Baqi Udhaar Walay ({customers.filter((c) => c.currentBalance > 0).length})
          </button>
        </div>
      </div>

      {/* Customer Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
          Loading customer directory...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <Users size={32} />
          </div>
          <h3>Koi customer nahi mila</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Naya customer shamil karne k liye &quot;Naya Customer Add Karein&quot; par click karein.
          </p>
          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ marginTop: 8 }}>
            <UserPlus size={16} /> Add First Customer
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

                  {/* Financial & Bottles Badges */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      background: '#f8fafc',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      margin: '10px 0',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Net Udhaar Baqi
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
                          {hasDebt ? '(Wajib)' : isAdvance ? '(Advance)' : '(Clear)'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Cans Held (Wapas lene hain)
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b45309' }}>
                        {cust.bottlesWithCustomer} <span style={{ fontSize: '0.75rem' }}>Cans</span>
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
                    <span>Rate: <strong>Rs. {cust.ratePerBottle}</strong> / can</span>
                    {cust.phone && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={12} /> {cust.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => onNavigate('payments', { customerId: cust._id })}
                    className="btn btn-success btn-sm"
                    style={{ flex: 1 }}
                  >
                    <Wallet size={14} /> Wasooli
                  </button>

                  <button
                    onClick={() => onNavigate('reports', { customerId: cust._id })}
                    className="btn btn-outline-primary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <FileText size={14} /> Month Bill (PDF)
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

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>
                {editingCustomer ? 'Customer Details Edit Karein' : 'Naya Customer Shamil Karein'}
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
                    <label className="form-label">Area / Sector / Street</label>
                    <input
                      type="text"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Block C, St 5"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="form-input"
                    placeholder="House #, Street details"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Rate / Can (Rs.)</label>
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
                    <label className="form-label">Initial Udhaar (Rs.)</label>
                    <input
                      type="number"
                      value={formData.initialBalance}
                      onChange={(e) =>
                        setFormData({ ...formData, initialBalance: Number(e.target.value) || 0 })
                      }
                      className="form-input"
                    />
                    <span className="form-hint">Pichla baqi hisab</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Deposit Cans</label>
                    <input
                      type="number"
                      value={formData.depositBottles}
                      onChange={(e) =>
                        setFormData({ ...formData, depositBottles: Number(e.target.value) || 0 })
                      }
                      className="form-input"
                    />
                    <span className="form-hint">Khali bottles di huwi</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Special Notes (Optional)</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Delivery in morning only"
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
            <div className="modal-body" style={{ fontSize: '0.9rem' }}>
              Kya aap waqai is customer ko delete karna chahte hain? Is customer k tamam delivery records aur payments bhi delete ho jayen ge.
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteConfirmId(null)} className="btn btn-secondary">
                Nahi, Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="btn btn-danger">
                Haan, Delete Karein
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
