'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  Wallet,
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  X,
  CheckCircle2,
  Edit2,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { useToast } from './Toast';

interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
}

interface RevenueRecord {
  _id: string;
  date: string;
  plantCostPerBottle: number;
  bottlesSold: number;
  actualBilled: number;
  cashReceived: number;
  wholesaleCost: number;
  expenses: ExpenseItem[];
  totalExpenses: number;
  netProfit: number;
  notes?: string;
  createdAt: string;
}

export default function RevenueProfitView() {
  const [history, setHistory] = useState<RevenueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters & Sorting
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'profit-desc' | 'profit-asc' | 'bottles-desc'>('date-desc');

  // Modal Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPlantCost, setFormPlantCost] = useState<number | string>(35);
  const [formBottles, setFormBottles] = useState<number | string>(0);
  const [formBilled, setFormBilled] = useState<number | string>(0);
  const [formCash, setFormCash] = useState<number | string>(0);
  const [formExpenses, setFormExpenses] = useState<Array<{ id: string; title: string; amount: number | string }>>([
    { id: 'exp-1', title: '', amount: '' },
  ]);
  const [formNotes, setFormNotes] = useState('');
  const [loadingDateData, setLoadingDateData] = useState(false);

  const submittingRef = useRef(false);
  const deletingRef = useRef(false);
  const toast = useToast();

  // Load all history records
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/revenue');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load revenue data');
      setHistory(json.history || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Load auto data or existing record when date changes in modal
  const fetchDateDetails = useCallback(async (date: string) => {
    setLoadingDateData(true);
    try {
      const res = await fetch(`/api/revenue?date=${date}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');

      if (json.saved) {
        // Load existing saved record
        const s: RevenueRecord = json.saved;
        setFormPlantCost(s.plantCostPerBottle || 35);
        setFormBottles(s.bottlesSold || 0);
        setFormBilled(s.actualBilled || 0);
        setFormCash(s.cashReceived || 0);
        setFormExpenses(
          s.expenses && s.expenses.length > 0
            ? s.expenses.map((e) => ({ id: e.id || `exp-${Date.now()}`, title: e.title, amount: e.amount }))
            : [{ id: 'exp-1', title: '', amount: '' }]
        );
        setFormNotes(s.notes || '');
      } else {
        // Populate with auto values from deliveries & payments
        const auto = json.auto || { bottles: 0, billed: 0, cash: 0 };
        setFormPlantCost(35);
        setFormBottles(auto.bottles || 0);
        setFormBilled(auto.billed || 0);
        setFormCash(auto.cash || 0);
        setFormExpenses([{ id: 'exp-1', title: '', amount: '' }]);
        setFormNotes('');
      }
    } catch {
      // silent fallback
    } finally {
      setLoadingDateData(false);
    }
  }, []);

  // Open modal for a specific date (or new entry)
  const openEntryModal = (dateToLoad?: string) => {
    const targetDate = dateToLoad || new Date().toISOString().split('T')[0];
    setFormDate(targetDate);
    fetchDateDetails(targetDate);
    setModalOpen(true);
  };

  // Add another expense row
  const addExpenseRow = () => {
    setFormExpenses((prev) => [
      ...prev,
      { id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, title: '', amount: '' },
    ]);
  };

  // Remove an expense row
  const removeExpenseRow = (id: string) => {
    setFormExpenses((prev) => {
      const filtered = prev.filter((e) => e.id !== id);
      return filtered.length > 0 ? filtered : [{ id: `exp-${Date.now()}`, title: '', amount: '' }];
    });
  };

  // Update an expense row
  const updateExpenseRow = (id: string, field: 'title' | 'amount', value: string) => {
    setFormExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  // Live calculations for modal
  const calcBottles = Number(formBottles) || 0;
  const calcPlantCost = Number(formPlantCost) || 0;
  const calcCash = Number(formCash) || 0;
  const calcWholesale = calcBottles * calcPlantCost;
  const calcExpensesTotal = formExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const calcNetProfit = calcCash - calcWholesale - calcExpensesTotal;

  // Handle Save
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || submitting) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const cleanExpenses = formExpenses
        .filter((e) => e.title.trim() && Number(e.amount) > 0)
        .map((e) => ({ id: e.id, title: e.title.trim(), amount: Number(e.amount) }));

      const res = await fetch('/api/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formDate,
          plantCostPerBottle: Number(formPlantCost) || 35,
          bottlesSold: Number(formBottles) || 0,
          actualBilled: Number(formBilled) || 0,
          cashReceived: Number(formCash) || 0,
          expenses: cleanExpenses,
          notes: formNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');

      toast.success(json.message || 'Daily entry saved successfully!');
      setModalOpen(false);
      loadHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this daily revenue record?')) return;
    if (deletingRef.current || deletingId) return;
    deletingRef.current = true;
    setDeletingId(id);

    try {
      const res = await fetch(`/api/revenue?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete');

      toast.success('Record deleted.');
      loadHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      deletingRef.current = false;
      setDeletingId(null);
    }
  };

  // Distinct months for filter
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    history.forEach((h) => {
      if (h.date && h.date.length >= 7) {
        set.add(h.date.slice(0, 7)); // YYYY-MM
      }
    });
    return Array.from(set).sort().reverse();
  }, [history]);

  // Filtered & sorted entries
  const displayedHistory = useMemo(() => {
    let list = [...history];

    if (selectedMonth !== 'all') {
      list = list.filter((h) => h.date.startsWith(selectedMonth));
    }

    list.sort((a, b) => {
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
      if (sortBy === 'profit-desc') return (b.netProfit || 0) - (a.netProfit || 0);
      if (sortBy === 'profit-asc') return (a.netProfit || 0) - (b.netProfit || 0);
      if (sortBy === 'bottles-desc') return (b.bottlesSold || 0) - (a.bottlesSold || 0);
      return 0;
    });

    return list;
  }, [history, selectedMonth, sortBy]);

  // Overall totals for filtered view
  const summaryTotals = useMemo(() => {
    let bottles = 0;
    let billed = 0;
    let cash = 0;
    let wholesale = 0;
    let expenses = 0;
    let profit = 0;

    displayedHistory.forEach((h) => {
      bottles += Number(h.bottlesSold) || 0;
      billed += Number(h.actualBilled) || 0;
      cash += Number(h.cashReceived) || 0;
      wholesale += Number(h.wholesaleCost) || 0;
      expenses += Number(h.totalExpenses) || 0;
      profit += Number(h.netProfit) || 0;
    });

    return { bottles, billed, cash, wholesale, expenses, profit };
  }, [displayedHistory]);

  return (
    <div className="page-container">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={24} color="var(--primary)" /> Revenue & Daily Ledger
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Day-wise bottle supply, actual billings, expenses, and net profit ledger
          </p>
        </div>

        <button
          onClick={() => openEntryModal()}
          className="btn btn-primary btn-lg"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={18} /> + Add / Edit Daily Entry
        </button>
      </div>

      {/* Summary KPI Cards for Selected Month / Overall */}
      <div className="stats-grid" style={{ marginBottom: 18 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div className="stat-header">
            <span>Total Bottles Sold</span>
            <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <Package size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#0284c7' }}>
            {loading ? '...' : `${summaryTotals.bottles.toLocaleString()} Bottles`}
          </div>
          <div className="stat-hint">
            Wholesale Cost: Rs. {summaryTotals.wholesale.toLocaleString()}
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-header">
            <span>Cash Received</span>
            <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {loading ? '...' : `Rs. ${summaryTotals.cash.toLocaleString()}`}
          </div>
          <div className="stat-hint">
            Actual Billed: Rs. {summaryTotals.billed.toLocaleString()}
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="stat-header">
            <span>Total Expenses</span>
            <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#dc2626' }}>
            {loading ? '...' : `Rs. ${summaryTotals.expenses.toLocaleString()}`}
          </div>
          <div className="stat-hint">Daily other expenses</div>
        </div>

        <div className="stat-card" style={{ borderLeft: `4px solid ${summaryTotals.profit >= 0 ? '#10b981' : '#ef4444'}` }}>
          <div className="stat-header">
            <span>Net Profit</span>
            <div className="stat-icon" style={{ background: summaryTotals.profit >= 0 ? '#ecfdf5' : '#fee2e2', color: summaryTotals.profit >= 0 ? '#10b981' : '#ef4444' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: summaryTotals.profit >= 0 ? '#10b981' : '#ef4444' }}>
            {loading ? '...' : `Rs. ${summaryTotals.profit.toLocaleString()}`}
          </div>
          <div className="stat-hint">
            {displayedHistory.length} day entries
          </div>
        </div>
      </div>

      {/* Filter & Sort Bar */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={15} color="var(--primary)" />
            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Month:</span>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="form-select"
            style={{ width: 'auto', minWidth: 150, padding: '6px 12px', fontSize: '0.86rem' }}
          >
            <option value="all">All Months</option>
            {availableMonths.map((m) => {
              const [y, mo] = m.split('-');
              const dateObj = new Date(Number(y), Number(mo) - 1, 1);
              const label = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
              return (
                <option key={m} value={m}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowUpDown size={15} color="var(--primary)" />
            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Sort By:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="form-select"
            style={{ width: 'auto', minWidth: 160, padding: '6px 12px', fontSize: '0.86rem' }}
          >
            <option value="date-desc">Date (Newest First)</option>
            <option value="date-asc">Date (Oldest First)</option>
            <option value="profit-desc">Profit (Highest First)</option>
            <option value="profit-asc">Profit (Lowest First)</option>
            <option value="bottles-desc">Bottles (Highest First)</option>
          </select>
        </div>
      </div>

      {/* Day-Wise Ledger List */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
            Loading revenue entries...
          </div>
        ) : displayedHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: 12 }}>No daily revenue entries saved yet.</p>
            <button onClick={() => openEntryModal()} className="btn btn-primary btn-sm">
              <Plus size={15} /> Add First Daily Entry
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="payment-mobile-list">
              {displayedHistory.map((h) => (
                <div
                  key={h._id}
                  style={{
                    padding: '14px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                      {h.date}
                    </div>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 14,
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        background: h.netProfit >= 0 ? '#ecfdf5' : '#fee2e2',
                        color: h.netProfit >= 0 ? '#059669' : '#dc2626',
                      }}
                    >
                      Profit: Rs. {h.netProfit.toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#f8fafc', padding: 10, borderRadius: 8, fontSize: '0.82rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Bottles Sold: </span>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.92rem' }}>{h.bottlesSold}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Wholesale Cost: </span>
                      <strong style={{ color: '#d97706' }}>Rs. {h.wholesaleCost.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Actual Billed: </span>
                      <strong>Rs. {h.actualBilled.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Cash Received: </span>
                      <strong style={{ color: 'var(--success)' }}>Rs. {h.cashReceived.toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Expenses chips */}
                  {h.expenses && h.expenses.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Expenses:</span>
                      {h.expenses.map((e, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.74rem',
                            background: '#fee2e2',
                            color: '#dc2626',
                            padding: '2px 7px',
                            borderRadius: 4,
                            fontWeight: 600,
                          }}
                        >
                          {e.title}: Rs.{e.amount}
                        </span>
                      ))}
                      <strong style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                        (Total: Rs. {h.totalExpenses.toLocaleString()})
                      </strong>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      No expenses on this date
                    </div>
                  )}

                  {h.notes && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      &ldquo;{h.notes}&rdquo;
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      onClick={() => openEntryModal(h.date)}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(h._id)}
                      disabled={deletingId === h._id}
                      className="toast-close"
                      title="Delete entry"
                    >
                      <Trash2 size={15} color={deletingId === h._id ? 'var(--text-muted)' : 'var(--danger)'} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="payment-desktop-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px' }}>Date</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Bottles Sold</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Wholesale Cost</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actual Billed</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Cash Received</th>
                    <th style={{ padding: '12px 14px' }}>Expenses Detail</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Net Profit</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedHistory.map((h) => (
                    <tr key={h._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 800 }}>{h.date}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                        {h.bottlesSold}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#d97706', fontWeight: 600 }}>
                        Rs. {h.wholesaleCost.toLocaleString()}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@ Rs.{h.plantCostPerBottle}/btl</div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>
                        Rs. {h.actualBilled.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--success)', fontWeight: 800 }}>
                        Rs. {h.cashReceived.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', maxWidth: 220 }}>
                        {h.expenses && h.expenses.length > 0 ? (
                          <div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {h.expenses.map((e, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: '0.72rem',
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    fontWeight: 600,
                                  }}
                                >
                                  {e.title}: {e.amount}
                                </span>
                              ))}
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', marginTop: 3 }}>
                              Total: Rs. {h.totalExpenses.toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 12,
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            background: h.netProfit >= 0 ? '#ecfdf5' : '#fee2e2',
                            color: h.netProfit >= 0 ? '#059669' : '#dc2626',
                          }}
                        >
                          Rs. {h.netProfit.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            onClick={() => openEntryModal(h.date)}
                            className="btn btn-secondary btn-sm"
                            title="Edit entry"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(h._id)}
                            disabled={deletingId === h._id}
                            className="toast-close"
                            title="Delete entry"
                          >
                            <Trash2 size={15} color={deletingId === h._id ? 'var(--text-muted)' : 'var(--danger)'} />
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

      {/* Add / Edit Daily Entry Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={20} color="var(--primary)" /> Daily Revenue & Expense Entry
              </h3>
              <button onClick={() => setModalOpen(false)} className="toast-close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEntry}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                {/* Date & Plant Rate Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => {
                        setFormDate(e.target.value);
                        fetchDateDetails(e.target.value);
                      }}
                      className="form-input"
                      style={{ fontWeight: 700 }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Plant Cost/Bottle</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formPlantCost}
                      onChange={(e) => setFormPlantCost(e.target.value)}
                      className="form-input"
                      placeholder="35"
                      style={{ fontWeight: 700 }}
                    />
                  </div>
                </div>

                {loadingDateData && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--primary)', marginBottom: 8 }}>
                    Fetching delivery & payment records for {formDate}...
                  </div>
                )}

                {/* Bottles Sold, Actual Billed, and Cash Received */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 4 }}>
                  <div className="form-group">
                    <label className="form-label">Bottles Sold *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formBottles}
                      onChange={(e) => setFormBottles(e.target.value)}
                      className="form-input"
                      style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}
                    />
                    <span className="form-hint">Editable bottles</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Actual Billed</label>
                    <input
                      type="number"
                      min="0"
                      value={formBilled}
                      onChange={(e) => setFormBilled(e.target.value)}
                      className="form-input"
                      style={{ fontWeight: 700 }}
                    />
                    <span className="form-hint">Rs. billed</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cash Received</label>
                    <input
                      type="number"
                      min="0"
                      value={formCash}
                      onChange={(e) => setFormCash(e.target.value)}
                      className="form-input"
                      style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--success)' }}
                    />
                    <span className="form-hint">Rs. cash in</span>
                  </div>
                </div>

                {/* Dynamic Multi-Row Expenses */}
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                      Daily Expenses
                    </label>
                    <button
                      type="button"
                      onClick={addExpenseRow}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.78rem' }}
                    >
                      <Plus size={14} /> Add Expense
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {formExpenses.map((exp, idx) => (
                      <div key={exp.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder={`Expense type #${idx + 1} (e.g. Petrol, Food, Repair)`}
                          value={exp.title}
                          onChange={(e) => updateExpenseRow(exp.id, 'title', e.target.value)}
                          className="form-input"
                          style={{ flex: 1.6 }}
                        />
                        <input
                          type="number"
                          min="0"
                          placeholder="Amount (Rs.)"
                          value={exp.amount}
                          onChange={(e) => updateExpenseRow(exp.id, 'amount', e.target.value)}
                          className="form-input"
                          style={{ flex: 1, fontWeight: 700 }}
                        />
                        <button
                          type="button"
                          onClick={() => removeExpenseRow(exp.id)}
                          className="toast-close"
                          title="Remove expense"
                          style={{ padding: 4 }}
                        >
                          <Trash2 size={16} color="var(--danger)" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {calcExpensesTotal > 0 && (
                    <div style={{ textAlign: 'right', marginTop: 6, fontSize: '0.82rem', fontWeight: 700, color: '#dc2626' }}>
                      Total Expenses: Rs. {calcExpensesTotal.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Live Net Profit Box */}
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '12px 14px',
                    borderRadius: 8,
                    marginTop: 14,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    fontSize: '0.84rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Wholesale Cost: </span>
                    <strong style={{ color: '#d97706' }}>Rs. {calcWholesale.toLocaleString()}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Daily Net Profit: </span>
                    <strong
                      style={{
                        color: calcNetProfit >= 0 ? '#059669' : '#dc2626',
                        fontSize: '1.05rem',
                      }}
                    >
                      Rs. {calcNetProfit.toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* Notes */}
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Notes / Remarks (Optional)</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Delivered 20 bottles by rider, payment collected in evening"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {submitting ? 'Saving...' : <><CheckCircle2 size={16} /> Save Entry</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
