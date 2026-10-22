'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  Wallet,
  DollarSign,
  PlusCircle,
  Trash2,
  Save,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useToast } from './Toast';

interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  category?: string;
}

interface DailyData {
  plantCostPerBottle: number;
  customerBottles: number;
  customerBilledAmount: number;
  cashReceived: number;
  extraBottles: number;
  extraCash: number;
  expenses: ExpenseItem[];
  notes: string;
  isSaved: boolean;
}

interface HistoryItem {
  _id: string;
  date: string;
  plantCostPerBottle: number;
  customerBottles: number;
  extraBottles: number;
  totalBottles: number;
  wholesaleCost: number;
  cashReceived: number;
  extraCash: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  notes?: string;
}

export default function RevenueProfitView() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const toast = useToast();

  const [plantCost, setPlantCost] = useState(35);
  const [customerBottles, setCustomerBottles] = useState(0);
  const [customerBilledAmount, setCustomerBilledAmount] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [extraBottles, setExtraBottles] = useState<number | string>(0);
  const [extraCash, setExtraCash] = useState<number | string>(0);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [notes, setNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // New expense form
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');

  // History ledger
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load data for selected date
  const loadDateData = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/revenue?date=${date}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch revenue');

      const d: DailyData = json.data;
      setPlantCost(d.plantCostPerBottle || 35);
      setCustomerBottles(d.customerBottles || 0);
      setCustomerBilledAmount(d.customerBilledAmount || 0);
      setCashReceived(d.cashReceived || 0);
      setExtraBottles(d.extraBottles || 0);
      setExtraCash(d.extraCash || 0);
      setExpenses(d.expenses || []);
      setNotes(d.notes || '');
      setIsSaved(d.isSaved);

      setHistory(json.history || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDateData(selectedDate);
  }, [selectedDate, loadDateData]);

  // Calculations
  const numExtraBottles = Number(extraBottles) || 0;
  const numExtraCash = Number(extraCash) || 0;
  const totalBottles = customerBottles + numExtraBottles;
  const totalWholesaleCost = totalBottles * plantCost;
  const totalCashIncome = cashReceived + numExtraCash;
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [expenses]
  );
  const netProfit = totalCashIncome - totalWholesaleCost - totalExpenses;

  // Add Expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpTitle.trim()) {
      toast.warning('Please enter expense title');
      return;
    }
    const amt = Number(newExpAmount);
    if (!amt || amt <= 0) {
      toast.warning('Please enter a valid expense amount');
      return;
    }

    const newItem: ExpenseItem = {
      id: `exp-${Date.now()}`,
      title: newExpTitle.trim(),
      amount: amt,
      category: 'General',
    };

    setExpenses((prev) => [...prev, newItem]);
    setNewExpTitle('');
    setNewExpAmount('');
    toast.success(`Expense "${newItem.title}" added`);
  };

  // Delete Expense
  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Save Daily Record
  const handleSave = async () => {
    if (savingRef.current || saving) return;
    savingRef.current = true;
    setSaving(true);

    try {
      const res = await fetch('/api/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          plantCostPerBottle: plantCost,
          customerBottles,
          customerBilledAmount,
          cashReceived,
          extraBottles: numExtraBottles,
          extraCash: numExtraCash,
          expenses,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');

      toast.success(`Daily ledger saved for ${selectedDate}!`);
      setIsSaved(true);
      loadDateData(selectedDate);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={24} color="var(--primary)" /> Supplier Revenue & Profit Ledger
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Calculate daily wholesale bottle costs, sales revenue, other expenses, and net profit
          </p>
        </div>

        {/* Date Selector & Plant Rate */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <Calendar size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '0.86rem', fontWeight: 700 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Plant Rate/Bottle:</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rs.</span>
            <input
              type="number"
              min="1"
              value={plantCost}
              onChange={(e) => setPlantCost(Math.max(Number(e.target.value) || 0, 1))}
              style={{ width: 55, border: '1px solid var(--border-color)', borderRadius: 4, padding: '2px 6px', fontWeight: 800, fontSize: '0.9rem' }}
            />
          </div>
        </div>
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: 18 }}>
        {/* Total Bottles */}
        <div className="stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div className="stat-header">
            <span>Total Bottles Supplied</span>
            <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <Package size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#0284c7' }}>
            {loading ? '...' : `${totalBottles} Bottles`}
          </div>
          <div className="stat-hint">
            {customerBottles} registered + {numExtraBottles} extra
          </div>
        </div>

        {/* Wholesale Cost */}
        <div className="stat-card" style={{ borderLeft: '4px solid #d97706' }}>
          <div className="stat-header">
            <span>Plant Wholesale Cost</span>
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {loading ? '...' : `Rs. ${totalWholesaleCost.toLocaleString()}`}
          </div>
          <div className="stat-hint">
            {totalBottles} bottles × Rs. {plantCost}
          </div>
        </div>

        {/* Total Cash Income */}
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-header">
            <span>Total Cash Income</span>
            <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {loading ? '...' : `Rs. ${totalCashIncome.toLocaleString()}`}
          </div>
          <div className="stat-hint">
            Rs. {cashReceived.toLocaleString()} payments + Rs. {numExtraCash.toLocaleString()} extra
          </div>
        </div>

        {/* Net Profit */}
        <div className="stat-card" style={{ borderLeft: `4px solid ${netProfit >= 0 ? '#10b981' : '#ef4444'}` }}>
          <div className="stat-header">
            <span>Daily Net Profit</span>
            <div className="stat-icon" style={{ background: netProfit >= 0 ? '#ecfdf5' : '#fee2e2', color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>
            {loading ? '...' : `Rs. ${netProfit.toLocaleString()}`}
          </div>
          <div className="stat-hint">
            After wholesale cost & {totalExpenses > 0 ? `Rs. ${totalExpenses.toLocaleString()} expenses` : 'zero expenses'}
          </div>
        </div>
      </div>

      {/* Main 2 Column Grid: Adjustments & Expenses */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Card 1: Extra Bottles & Direct Cash (Non-Registered Customers) */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 10 }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Package size={17} color="var(--primary)" /> Extra / Casual Bottles Sold
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Sold to walk-in / other customers today
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Registered Customer Deliveries:</span>
                <strong>{customerBottles} Bottles</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Registered Customer Cash Received:</span>
                <strong style={{ color: 'var(--success)' }}>Rs. {cashReceived.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Registered Customer Billed:</span>
                <span>Rs. {customerBilledAmount.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Extra Bottles Sold</label>
                <input
                  type="number"
                  min="0"
                  value={extraBottles}
                  onChange={(e) => setExtraBottles(e.target.value)}
                  className="form-input"
                  placeholder="0"
                  style={{ fontWeight: 800, fontSize: '1.05rem' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Extra Cash Received (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  value={extraCash}
                  onChange={(e) => setExtraCash(e.target.value)}
                  className="form-input"
                  placeholder="0"
                  style={{ fontWeight: 800, fontSize: '1.05rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Daily Notes / Remarks (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-input"
                placeholder="e.g. Heavy rain today, plant supply delayed by 1 hour"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Daily Expenses (Fuel, Food, Rikshaw, etc.) */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 10 }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <DollarSign size={17} color="#dc2626" /> Other Daily Expenses
            </h3>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#dc2626' }}>
              Total: Rs. {totalExpenses.toLocaleString()}
            </span>
          </div>

          {/* Quick Add Expense Form */}
          <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Expense title (e.g. Petrol / Food)..."
              value={newExpTitle}
              onChange={(e) => setNewExpTitle(e.target.value)}
              className="form-input"
              style={{ flex: 2 }}
            />
            <input
              type="number"
              min="1"
              placeholder="Rs."
              value={newExpAmount}
              onChange={(e) => setNewExpAmount(e.target.value)}
              className="form-input"
              style={{ flex: 1, fontWeight: 700 }}
            />
            <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0 }}>
              <PlusCircle size={15} /> Add
            </button>
          </form>

          {/* Expense items list */}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {expenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                No expenses added for today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      background: '#f8fafc',
                      borderRadius: 6,
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{exp.title}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <strong style={{ color: '#dc2626' }}>Rs. {exp.amount.toLocaleString()}</strong>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="toast-close"
                        style={{ padding: 2 }}
                      >
                        <Trash2 size={13} color="var(--danger)" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '12px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: '0.84rem' }}>
          {isSaved ? (
            <span style={{ color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} /> Saved ledger record for {selectedDate}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={16} color="var(--primary)" /> Unsaved changes for {selectedDate}
            </span>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ minWidth: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {saving ? 'Saving...' : <><Save size={16} /> Save Daily Ledger</>}
        </button>
      </div>

      {/* Day-Wise Revenue & Profit Ledger History Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="var(--primary)" /> Day-Wise Profit & Revenue Ledger
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Showing past 30 days
          </span>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
            No saved daily ledger records yet. Click &quot;Save Daily Ledger&quot; to log today&apos;s record.
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="payment-mobile-list">
              {history.map((h) => (
                <div
                  key={h._id}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{h.date}</strong>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 12,
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        background: h.netProfit >= 0 ? '#ecfdf5' : '#fee2e2',
                        color: h.netProfit >= 0 ? '#059669' : '#dc2626',
                      }}
                    >
                      Profit: Rs. {h.netProfit.toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#f8fafc', padding: 8, borderRadius: 6, fontSize: '0.78rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Total Bottles: </span>
                      <strong>{h.totalBottles}</strong> ({h.customerBottles}+{h.extraBottles})
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Plant Cost: </span>
                      <strong style={{ color: '#d97706' }}>Rs. {h.wholesaleCost.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Cash In: </span>
                      <strong style={{ color: 'var(--success)' }}>Rs. {h.totalIncome.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Expenses: </span>
                      <strong style={{ color: '#dc2626' }}>Rs. {h.totalExpenses.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setSelectedDate(h.date);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      View / Edit Date
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
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Total Bottles</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Wholesale Cost</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Cash Income</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Other Expenses</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Net Profit</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>{h.date}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <strong>{h.totalBottles}</strong>{' '}
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          ({h.customerBottles} + {h.extraBottles})
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#d97706', fontWeight: 600 }}>
                        Rs. {h.wholesaleCost.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--success)', fontWeight: 700 }}>
                        Rs. {h.totalIncome.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                        Rs. {h.totalExpenses.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800 }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: '0.8rem',
                            background: h.netProfit >= 0 ? '#ecfdf5' : '#fee2e2',
                            color: h.netProfit >= 0 ? '#059669' : '#dc2626',
                          }}
                        >
                          Rs. {h.netProfit.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedDate(h.date);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          Load
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
  );
}
