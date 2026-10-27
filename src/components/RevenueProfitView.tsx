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
  BarChart3,
  Layers,
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
  autoBottles?: number;
  extraBottles?: number;
  bottlesSold: number;
  autoBilled?: number;
  extraBilled?: number;
  actualBilled: number;
  cashReceived: number;
  wholesaleCost: number;
  expenses: ExpenseItem[];
  totalExpenses: number;
  netProfit: number;
  profitShare20?: number;
  notes?: string;
  createdAt: string;
}

export default function RevenueProfitView() {
  const [history, setHistory] = useState<RevenueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // View mode: 'daily' (day-wise ledger) vs 'monthly' (monthly aggregate record)
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  // Filters & Sorting
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'profit-desc' | 'profit-asc' | 'bottles-desc'>('date-desc');

  // Modal Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPlantCost, setFormPlantCost] = useState<number | string>(35);
  // Auto & Extra bottles
  const [formAutoBottles, setFormAutoBottles] = useState<number>(0);
  const [formExtraBottles, setFormExtraBottles] = useState<number | string>('');
  // Auto & Extra billed
  const [formAutoBilled, setFormAutoBilled] = useState<number>(0);
  const [formExtraBilled, setFormExtraBilled] = useState<number | string>('');
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

        const autoBtls =
          s.autoBottles !== undefined
            ? s.autoBottles
            : json.auto?.bottles !== undefined
            ? json.auto.bottles
            : s.bottlesSold || 0;
        const extraBtls =
          s.extraBottles !== undefined
            ? s.extraBottles
            : s.bottlesSold > autoBtls
            ? s.bottlesSold - autoBtls
            : '';

        setFormAutoBottles(autoBtls);
        setFormExtraBottles(extraBtls === 0 ? '' : extraBtls);

        const autoBill =
          s.autoBilled !== undefined
            ? s.autoBilled
            : json.auto?.billed !== undefined
            ? json.auto.billed
            : s.actualBilled || 0;
        const extraBill =
          s.extraBilled !== undefined
            ? s.extraBilled
            : s.actualBilled > autoBill
            ? s.actualBilled - autoBill
            : '';

        setFormAutoBilled(autoBill);
        setFormExtraBilled(extraBill === 0 ? '' : extraBill);

        setFormCash(s.cashReceived || 0);
        setFormExpenses(
          s.expenses && s.expenses.length > 0
            ? s.expenses.map((e) => ({
                id: e.id || `exp-${Date.now()}`,
                title: e.title,
                amount: e.amount === 0 ? '' : e.amount,
              }))
            : [{ id: 'exp-1', title: '', amount: '' }]
        );
        setFormNotes(s.notes || '');
      } else {
        // Populate with auto values from deliveries & payments
        const auto = json.auto || { bottles: 0, billed: 0, cash: 0 };
        setFormPlantCost(35);
        setFormAutoBottles(auto.bottles || 0);
        setFormExtraBottles('');
        setFormAutoBilled(auto.billed || 0);
        setFormExtraBilled('');
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
  const calcTotalBottles = (Number(formAutoBottles) || 0) + (Number(formExtraBottles) || 0);
  const calcTotalBilled = (Number(formAutoBilled) || 0) + (Number(formExtraBilled) || 0);
  const calcPlantCost = Number(formPlantCost) || 0;
  const calcWholesale = calcTotalBottles * calcPlantCost;
  const calcExpensesTotal = formExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  // Profit = Total Amount - Wholesale Bottle Cost - Expenses
  const calcNetProfit = calcTotalBilled - calcWholesale - calcExpensesTotal;
  const calcProfitShare20 = Math.round(calcNetProfit * 0.2);

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
          autoBottles: Number(formAutoBottles) || 0,
          extraBottles: Number(formExtraBottles) || 0,
          bottlesSold: calcTotalBottles,
          autoBilled: Number(formAutoBilled) || 0,
          extraBilled: Number(formExtraBilled) || 0,
          actualBilled: calcTotalBilled,
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

  // Filtered & sorted day-wise entries
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

  // Professional Monthly Aggregate Records
  const monthlyRecords = useMemo(() => {
    const map = new Map<
      string,
      {
        month: string;
        bottles: number;
        billed: number;
        wholesale: number;
        expenses: number;
        profit: number;
        share20: number;
        daysCount: number;
      }
    >();

    history.forEach((h) => {
      if (!h.date || h.date.length < 7) return;
      const mo = h.date.substring(0, 7);
      if (!map.has(mo)) {
        map.set(mo, {
          month: mo,
          bottles: 0,
          billed: 0,
          wholesale: 0,
          expenses: 0,
          profit: 0,
          share20: 0,
          daysCount: 0,
        });
      }
      const item = map.get(mo)!;
      item.bottles += Number(h.bottlesSold) || 0;
      item.billed += Number(h.actualBilled) || 0;
      item.wholesale += Number(h.wholesaleCost) || 0;
      item.expenses += Number(h.totalExpenses) || 0;
      item.profit += Number(h.netProfit) || 0;
      item.share20 += h.profitShare20 !== undefined ? Number(h.profitShare20) : Math.round((Number(h.netProfit) || 0) * 0.2);
      item.daysCount += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [history]);

  // Overall totals for filtered view
  const summaryTotals = useMemo(() => {
    let bottles = 0;
    let billed = 0;
    let cash = 0;
    let wholesale = 0;
    let expenses = 0;
    let profit = 0;
    let share20 = 0;

    displayedHistory.forEach((h) => {
      bottles += Number(h.bottlesSold) || 0;
      billed += Number(h.actualBilled) || 0;
      cash += Number(h.cashReceived) || 0;
      wholesale += Number(h.wholesaleCost) || 0;
      expenses += Number(h.totalExpenses) || 0;
      profit += Number(h.netProfit) || 0;
      share20 += h.profitShare20 !== undefined ? Number(h.profitShare20) : Math.round((Number(h.netProfit) || 0) * 0.2);
    });

    return { bottles, billed, cash, wholesale, expenses, profit, share20 };
  }, [displayedHistory]);

  const getMonthDisplay = (mStr: string) => {
    const [y, mo] = mStr.split('-');
    const dateObj = new Date(Number(y), Number(mo) - 1, 1);
    return dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

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
          marginBottom: 18,
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={24} color="var(--primary)" /> Revenue &amp; Profit Ledger
          </h2>
          <p className="desktop-only" style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Wholesale bottle cost, total billed revenue, plant expenses, and net profit
          </p>
        </div>

        <button
          onClick={() => openEntryModal()}
          className="btn btn-primary btn-lg"
          style={{ display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)' }}
        >
          <Plus size={18} /> + Add / Edit Daily Entry
        </button>
      </div>

      {/* Summary KPI Cards for Selected Month / Overall */}
      <div className="stats-grid" style={{ marginBottom: 18 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div className="stat-header">
            <span>Total Bottles Supplied</span>
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

        <div className="stat-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div className="stat-header">
            <span>Total Billed Revenue</span>
            <div className="stat-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#4f46e5' }}>
            {loading ? '...' : `Rs. ${summaryTotals.billed.toLocaleString()}`}
          </div>
          <div className="stat-hint">
            Cash Collected: Rs. {summaryTotals.cash.toLocaleString()}
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
          <div className="stat-hint">Plant &amp; running costs</div>
        </div>

        <div
          className="stat-card"
          style={{
            borderLeft: `4px solid ${summaryTotals.profit >= 0 ? '#10b981' : '#ef4444'}`,
          }}
        >
          <div className="stat-header">
            <span>Net Profit</span>
            <div
              className="stat-icon"
              style={{
                background: summaryTotals.profit >= 0 ? '#ecfdf5' : '#fee2e2',
                color: summaryTotals.profit >= 0 ? '#10b981' : '#ef4444',
              }}
            >
              <TrendingUp size={18} />
            </div>
          </div>
          <div
            className="stat-value"
            style={{ color: summaryTotals.profit >= 0 ? '#059669' : '#dc2626' }}
          >
            {loading ? '...' : `Rs. ${summaryTotals.profit.toLocaleString()}`}
          </div>
          <div style={{ fontSize: '0.80rem', color: '#0284c7', fontWeight: 700, marginTop: 2 }}>
            20% Share: Rs. {summaryTotals.share20.toLocaleString()}
          </div>
          <div className="stat-hint">
            (Billed - Bottle Cost - Expenses)
          </div>
        </div>
      </div>

      {/* Mode Switcher & Filter Bar */}
      <div
        className="card"
        style={{
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {/* Tab switch between Daily Ledger and Monthly Record */}
        <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <button
            onClick={() => setViewMode('daily')}
            style={{
              padding: '8px 16px',
              fontSize: '0.86rem',
              fontWeight: 700,
              border: 'none',
              background: viewMode === 'daily' ? 'var(--primary)' : '#ffffff',
              color: viewMode === 'daily' ? '#ffffff' : 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Layers size={16} /> Day-Wise Ledger
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            style={{
              padding: '8px 16px',
              fontSize: '0.86rem',
              fontWeight: 700,
              border: 'none',
              background: viewMode === 'monthly' ? 'var(--primary)' : '#ffffff',
              color: viewMode === 'monthly' ? '#ffffff' : 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <BarChart3 size={16} /> Monthly Record
          </button>
        </div>

        {/* Filters if in daily mode */}
        {viewMode === 'daily' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={15} color="var(--primary)" />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="form-select"
                style={{ width: 'auto', minWidth: 150, padding: '5px 10px', fontSize: '0.84rem' }}
              >
                <option value="all">All Months</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {getMonthDisplay(m)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowUpDown size={15} color="var(--primary)" />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="form-select"
                style={{ width: 'auto', minWidth: 150, padding: '5px 10px', fontSize: '0.84rem' }}
              >
                <option value="date-desc">Date (Newest First)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="profit-desc">Profit (Highest First)</option>
                <option value="profit-asc">Profit (Lowest First)</option>
                <option value="bottles-desc">Bottles (Highest First)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main View: Day-Wise Ledger or Monthly Record */}
      {viewMode === 'monthly' ? (
        /* PROFESSIONAL MONTHLY RECORD VIEW */
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={20} color="var(--primary)" /> Monthly Performance &amp; Profit Summary
            </h3>
          </div>

          {monthlyRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
              No monthly data available yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px' }}>Month</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Days Logged</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Total Bottles</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Billed (Revenue)</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Wholesale Cost</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Expenses</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Net Profit</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>20% Profit</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRecords.map((m) => {
                    const margin = m.billed > 0 ? Math.round((m.profit / m.billed) * 100) : 0;
                    return (
                      <tr key={m.month} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--text-main)' }}>
                          {getMonthDisplay(m.month)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span className="badge badge-info">{m.daysCount} days</span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                          {m.bottles.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>
                          Rs. {m.billed.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', color: '#d97706', fontWeight: 600 }}>
                          Rs. {m.wholesale.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                          Rs. {m.expenses.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: 12,
                                fontSize: '0.86rem',
                                fontWeight: 800,
                                background: m.profit >= 0 ? '#ecfdf5' : '#fee2e2',
                                color: m.profit >= 0 ? '#059669' : '#dc2626',
                              }}
                            >
                              Rs. {m.profit.toLocaleString()}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              Margin: {margin}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: 12,
                              fontSize: '0.86rem',
                              fontWeight: 800,
                              background: m.share20 >= 0 ? '#eff6ff' : '#fee2e2',
                              color: m.share20 >= 0 ? '#0284c7' : '#dc2626',
                            }}
                          >
                            Rs. {m.share20.toLocaleString()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setSelectedMonth(m.month);
                              setViewMode('daily');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.76rem' }}
                          >
                            View Days
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* DAY-WISE LEDGER VIEW */
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                        {h.date}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: '0.80rem',
                            fontWeight: 800,
                            background: h.netProfit >= 0 ? '#ecfdf5' : '#fee2e2',
                            color: h.netProfit >= 0 ? '#059669' : '#dc2626',
                          }}
                        >
                          Profit: Rs. {h.netProfit.toLocaleString()}
                        </span>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: '0.80rem',
                            fontWeight: 800,
                            background: '#eff6ff',
                            color: '#0284c7',
                          }}
                        >
                          20%: Rs. {(h.profitShare20 ?? Math.round((h.netProfit || 0) * 0.2)).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                        background: '#f8fafc',
                        padding: 10,
                        borderRadius: 8,
                        fontSize: '0.82rem',
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Total Bottles: </span>
                        <strong style={{ color: 'var(--primary)', fontSize: '0.92rem' }}>
                          {h.bottlesSold}
                          {h.extraBottles ? (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {' '}
                              ({h.autoBottles || 0} + {h.extraBottles})
                            </span>
                          ) : null}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Wholesale Cost: </span>
                        <strong style={{ color: '#d97706' }}>Rs. {h.wholesaleCost.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Actual Billed: </span>
                        <strong>
                          Rs. {h.actualBilled.toLocaleString()}
                          {h.extraBilled ? (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {' '}
                              (+{h.extraBilled})
                            </span>
                          ) : null}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Cash In: </span>
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
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Billed (Revenue)</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Cash Received</th>
                      <th style={{ padding: '12px 14px' }}>Expenses Detail</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Net Profit</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>20% Profit</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedHistory.map((h) => (
                      <tr key={h._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 800 }}>{h.date}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                          {h.bottlesSold}
                          {h.extraBottles ? (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Auto: {h.autoBottles || 0} + Extra: {h.extraBottles}
                            </div>
                          ) : null}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', color: '#d97706', fontWeight: 600 }}>
                          Rs. {h.wholesaleCost.toLocaleString()}
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@ Rs.{h.plantCostPerBottle}/btl</div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>
                          Rs. {h.actualBilled.toLocaleString()}
                          {h.extraBilled ? (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Auto: Rs.{h.autoBilled || 0} + Extra: Rs.{h.extraBilled}
                            </div>
                          ) : null}
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
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: 12,
                              fontSize: '0.85rem',
                              fontWeight: 800,
                              background: (h.profitShare20 ?? Math.round((h.netProfit || 0) * 0.2)) >= 0 ? '#eff6ff' : '#fee2e2',
                              color: (h.profitShare20 ?? Math.round((h.netProfit || 0) * 0.2)) >= 0 ? '#0284c7' : '#dc2626',
                            }}
                          >
                            Rs. {(h.profitShare20 ?? Math.round((h.netProfit || 0) * 0.2)).toLocaleString()}
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
      )}

      {/* Add / Edit Daily Entry Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={20} color="var(--primary)" /> Daily Revenue &amp; Expense Entry
              </h3>
              <button onClick={() => setModalOpen(false)} className="toast-close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEntry}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                {/* Date & Plant Rate Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
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

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Plant Cost/Bottle (Rs.)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="35"
                      value={formPlantCost === 0 ? '' : formPlantCost}
                      onChange={(e) =>
                        setFormPlantCost(e.target.value === '' ? 0 : Number(e.target.value))
                      }
                      className="form-input"
                      style={{ fontWeight: 700 }}
                    />
                  </div>
                </div>

                {loadingDateData && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--primary)', marginBottom: 10 }}>
                    Fetching delivery &amp; payment records for {formDate}...
                  </div>
                )}

                {/* 1. Bottles: Auto (Readonly) + Extra (Optional) = Total Bottles */}
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                    marginBottom: 12,
                  }}
                >
                  <label
                    className="form-label"
                    style={{
                      fontWeight: 700,
                      marginBottom: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 4,
                    }}
                  >
                    <span>Bottles Delivered &amp; Sold</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 800 }}>
                      Total: {calcTotalBottles} Bottles
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 110px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Auto (Deliveries)
                      </span>
                      <input
                        type="number"
                        readOnly
                        value={formAutoBottles}
                        className="form-input"
                        title="Readonly: Auto fetched from daily deliveries"
                        style={{
                          background: '#e2e8f0',
                          color: 'var(--text-main)',
                          fontWeight: 800,
                          cursor: 'not-allowed',
                        }}
                      />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)', paddingTop: 14 }}>
                      +
                    </div>
                    <div style={{ flex: '1 1 110px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Extra Bottles (Optional)
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formExtraBottles === 0 ? '' : formExtraBottles}
                        onChange={(e) => setFormExtraBottles(e.target.value)}
                        className="form-input"
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Amount / Revenue: Auto Billed (Readonly) + Extra Amount (Optional) = Total Billed */}
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                    marginBottom: 12,
                  }}
                >
                  <label
                    className="form-label"
                    style={{
                      fontWeight: 700,
                      marginBottom: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 4,
                    }}
                  >
                    <span>Total Amount Billed (Revenue)</span>
                    <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 800 }}>
                      Total: Rs. {calcTotalBilled.toLocaleString()}
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 110px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Auto Billed (Deliveries)
                      </span>
                      <input
                        type="number"
                        readOnly
                        value={formAutoBilled}
                        className="form-input"
                        title="Readonly: Auto calculated from daily deliveries"
                        style={{
                          background: '#e2e8f0',
                          color: 'var(--text-main)',
                          fontWeight: 800,
                          cursor: 'not-allowed',
                        }}
                      />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)', paddingTop: 14 }}>
                      +
                    </div>
                    <div style={{ flex: '1 1 110px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Extra Amount (Optional)
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formExtraBilled === 0 ? '' : formExtraBilled}
                        onChange={(e) => setFormExtraBilled(e.target.value)}
                        className="form-input"
                        style={{ fontWeight: 700 }}
                      />
                    </div>
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

                {/* Live Net Profit Box (Profit = Total Amount - Wholesale Cost - Expenses) */}
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '12px 14px',
                    borderRadius: 8,
                    marginTop: 14,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 10,
                    fontSize: '0.84rem',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Wholesale Cost: </span>
                    <strong style={{ color: '#d97706', display: 'block', fontSize: '1rem', marginTop: 2 }}>
                      Rs. {calcWholesale.toLocaleString()}
                    </strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      ({calcTotalBottles} btl × Rs.{calcPlantCost})
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Daily Net Profit: </span>
                    <strong
                      style={{
                        color: calcNetProfit >= 0 ? '#059669' : '#dc2626',
                        fontSize: '1.05rem',
                        display: 'block',
                        marginTop: 2,
                      }}
                    >
                      Rs. {calcNetProfit.toLocaleString()}
                    </strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      (Billed - Wholesale - Exp)
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#0284c7', fontWeight: 700 }}>20% Profit Share: </span>
                    <strong
                      style={{
                        color: calcProfitShare20 >= 0 ? '#0284c7' : '#dc2626',
                        fontSize: '1.05rem',
                        display: 'block',
                        marginTop: 2,
                      }}
                    >
                      Rs. {calcProfitShare20.toLocaleString()}
                    </strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      (20% of Net Profit)
                    </div>
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
                    placeholder="e.g. Delivered 20 bottles by rider, paid petrol"
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
                  {submitting ? 'Saving...' : <><CheckCircle2 size={16} /> Save Daily Entry</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
