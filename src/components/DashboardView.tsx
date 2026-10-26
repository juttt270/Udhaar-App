'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Droplets,
  Wallet,
  Users,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  FileText,
  CalendarCheck2,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from './Toast';

interface DashboardViewProps {
  onNavigate: (tab: string, extra?: unknown) => void;
  plantName: string;
}

interface StatsData {
  period: string;
  selectedMonth: string;
  bottlesDelivered: number;
  billedAmount: number;
  collectedAmount: number;
  totalExpenses: number;
  wholesaleCost: number;
  netProfit: number;
  activeCustomersCount: number;
  totalPendingUdhaar: number;
  availableMonths: string[];
}

interface CustomerSummary {
  _id: string;
  name: string;
  phone: string;
  area: string;
  currentBalance: number;
  bottlesWithCustomer: number;
}

export default function DashboardView({ onNavigate, plantName }: DashboardViewProps) {
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentMonthStr); // 'today' or 'YYYY-MM'
  const [stats, setStats] = useState<StatsData | null>(null);
  const [topDebtors, setTopDebtors] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const isToday = selectedPeriod === 'today';
      const url = isToday
        ? '/api/stats?period=today'
        : `/api/stats?period=month&month=${selectedPeriod}`;

      const [resStats, resCust] = await Promise.all([
        fetch(url),
        fetch('/api/customers?status=active'),
      ]);

      if (resStats.ok) {
        const data = await resStats.json();
        setStats(data.stats);
      }

      if (resCust.ok) {
        const custData = await resCust.json();
        const sorted = (custData.customers || [])
          .filter((c: CustomerSummary) => c.currentBalance > 0)
          .sort((a: CustomerSummary, b: CustomerSummary) => b.currentBalance - a.currentBalance)
          .slice(0, 5);
        setTopDebtors(sorted);
      }
    } catch {
      toast.error('Failed to load dashboard figures');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const getMonthLabel = (m: string) => {
    const [y, mo] = m.split('-');
    const dateObj = new Date(Number(y), Number(mo) - 1, 1);
    const label = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    return m === currentMonthStr ? `${label} (Current Month)` : label;
  };

  return (
    <div className="page-container">
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '22px 20px',
          color: '#ffffff',
          marginBottom: 18,
          boxShadow: '0 8px 20px rgba(2, 132, 199, 0.2)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '3px 8px',
              borderRadius: 20,
              fontWeight: 700,
            }}
          >
            Today: {todayFormatted}
          </span>
          <h1 style={{ fontSize: '1.5rem', marginTop: 6, color: '#ffffff' }}>
            {plantName || 'AB Water Filter Dashboard'}
          </h1>
          <p style={{ fontSize: '0.86rem', opacity: 0.9, marginTop: 2 }}>
            Manage daily deliveries, customer accounts, and monthly bills easily.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigate('daily')}
            className="btn"
            style={{
              background: '#ffffff',
              color: 'var(--primary)',
              fontWeight: 700,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <CalendarCheck2 size={16} /> Deliver Bottles Today
          </button>
          <button
            onClick={() => onNavigate('customers', { openAdd: true })}
            className="btn"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.4)',
            }}
          >
            <PlusCircle size={16} /> Add Customer
          </button>
        </div>
      </div>

      {/* Period Filter Dropdown Bar */}
      <div
        className="card"
        style={{
          marginBottom: 18,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>Data Filter / دورانیہ</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {selectedPeriod === 'today'
                ? "Showing figures for Today"
                : `Showing monthly figures for ${getMonthLabel(selectedPeriod)}`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="form-select"
            style={{
              fontWeight: 700,
              fontSize: '0.9rem',
              padding: '8px 14px',
              minWidth: 200,
              borderColor: 'var(--primary)',
            }}
          >
            <option value="today">📅 Today (آج کا ڈیٹا)</option>
            {stats?.availableMonths && stats.availableMonths.length > 0 ? (
              stats.availableMonths.map((m) => (
                <option key={m} value={m}>
                  📆 {getMonthLabel(m)}
                </option>
              ))
            ) : (
              <option value={currentMonthStr}>📆 {getMonthLabel(currentMonthStr)}</option>
            )}
          </select>
        </div>
      </div>

      {/* 5 KPI Cards for the Selected Period */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {/* 1. Bottles Delivered */}
        <div className="stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div className="stat-header">
            <span>{selectedPeriod === 'today' ? 'Bottles Delivered Today' : 'Bottles Delivered in Month'}</span>
            <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <Droplets size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#0284c7' }}>
            {loading ? '...' : `${(stats?.bottlesDelivered || 0).toLocaleString()} Bottles`}
          </div>
          <div className="stat-hint">
            Wholesale cost: Rs. {(stats?.wholesaleCost || 0).toLocaleString()}
          </div>
        </div>

        {/* 2. Total Billed / Revenue */}
        <div className="stat-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div className="stat-header">
            <span>{selectedPeriod === 'today' ? 'Billed Amount Today' : 'Total Billed (Revenue)'}</span>
            <div className="stat-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#4f46e5' }}>
            {loading ? '...' : `Rs. ${(stats?.billedAmount || 0).toLocaleString()}`}
          </div>
          <div className="stat-hint">
            {selectedPeriod === 'today' ? "Today's delivery bill" : 'Total charges billed'}
          </div>
        </div>

        {/* 3. Total Expenses */}
        <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="stat-header">
            <span>{selectedPeriod === 'today' ? "Today's Expense" : 'Month Expenses'}</span>
            <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#dc2626' }}>
            {loading ? '...' : `Rs. ${(stats?.totalExpenses || 0).toLocaleString()}`}
          </div>
          <div className="stat-hint">Plant & delivery expenses</div>
        </div>

        {/* 4. Net Profit */}
        <div
          className="stat-card"
          style={{
            borderLeft: `4px solid ${(stats?.netProfit || 0) >= 0 ? '#10b981' : '#ef4444'}`,
          }}
        >
          <div className="stat-header">
            <span>{selectedPeriod === 'today' ? "Today's Profit" : 'Month Net Profit'}</span>
            <div
              className="stat-icon"
              style={{
                background: (stats?.netProfit || 0) >= 0 ? '#ecfdf5' : '#fee2e2',
                color: (stats?.netProfit || 0) >= 0 ? '#10b981' : '#ef4444',
              }}
            >
              <TrendingUp size={18} />
            </div>
          </div>
          <div
            className="stat-value"
            style={{ color: (stats?.netProfit || 0) >= 0 ? '#059669' : '#dc2626' }}
          >
            {loading ? '...' : `Rs. ${(stats?.netProfit || 0).toLocaleString()}`}
          </div>
          <div className="stat-hint">
            (Billed - Bottle cost - Expenses)
          </div>
        </div>

        {/* 5. Cash Received / Collected */}
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-header">
            <span>{selectedPeriod === 'today' ? 'Cash Received Today' : 'Cash Collected'}</span>
            <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {loading ? '...' : `Rs. ${(stats?.collectedAmount || 0).toLocaleString()}`}
          </div>
          <div className="stat-hint">Payments collected in period</div>
        </div>

        {/* 6. Total Unpaid Balance (Overall) */}
        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-header">
            <span>Total Pending Udhaar</span>
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {loading ? '...' : `Rs. ${(stats?.totalPendingUdhaar || 0).toLocaleString()}`}
          </div>
          <div className="stat-hint">
            {stats?.activeCustomersCount || 0} active customers
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 22,
        }}
      >
        <div
          onClick={() => onNavigate('daily')}
          className="card"
          style={{ cursor: 'pointer', borderLeft: '4px solid var(--primary)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarCheck2 size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.96rem' }}>Daily Delivery</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Mark bottles delivered today
              </p>
            </div>
            <ArrowRight size={15} color="var(--text-sub)" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('payments')}
          className="card"
          style={{ cursor: 'pointer', borderLeft: '4px solid var(--success)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--success-light)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.96rem' }}>Receive Cash</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Record customer payments
              </p>
            </div>
            <ArrowRight size={15} color="var(--text-sub)" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('reports')}
          className="card"
          style={{ cursor: 'pointer', borderLeft: '4px solid #8b5cf6' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-sm)',
                background: '#f3e8ff',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.96rem' }}>Monthly Bills</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Download customer PDF bills
              </p>
            </div>
            <ArrowRight size={15} color="var(--text-sub)" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('deposits')}
          className="card"
          style={{ cursor: 'pointer', borderLeft: '4px solid #0284c7' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-sm)',
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.96rem' }}>Bottle Security</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Track bottle amanat cash
              </p>
            </div>
            <ArrowRight size={15} color="var(--text-sub)" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('revenue')}
          className="card"
          style={{ cursor: 'pointer', borderLeft: '4px solid #10b981' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-sm)',
                background: '#ecfdf5',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.96rem' }}>Revenue & Profit</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Daily wholesale & profit ledger
              </p>
            </div>
            <ArrowRight size={15} color="var(--text-sub)" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('customers')}
          className="card"
          style={{ cursor: 'pointer', borderLeft: '4px solid #f59e0b' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--warning-light)',
                color: 'var(--warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.96rem' }}>Customers List</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                View all customer balances
              </p>
            </div>
            <ArrowRight size={15} color="var(--text-sub)" />
          </div>
        </div>
      </div>

      {/* Customers With Highest Unpaid Balance */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="var(--danger)" />
            <h3 style={{ fontSize: '1rem' }}>Top Unpaid Customers</h3>
          </div>
          <button
            onClick={() => onNavigate('customers')}
            className="btn btn-secondary btn-sm"
          >
            View All Customers <ArrowRight size={14} />
          </button>
        </div>

        {topDebtors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            All customer accounts are clear! No pending balances.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topDebtors.map((cust) => (
              <div
                key={cust._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#f8fafc',
                  border: '1px solid var(--border-color)',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{cust.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {cust.area || 'No area set'} • Phone: {cust.phone || 'N/A'} • Bottles held:{' '}
                    <strong>{cust.bottlesWithCustomer}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    className="badge badge-danger"
                    style={{ fontSize: '0.85rem', padding: '4px 10px' }}
                  >
                    Unpaid: Rs. {cust.currentBalance.toLocaleString()}
                  </span>
                  <button
                    onClick={() => onNavigate('payments', { customerId: cust._id })}
                    className="btn btn-success btn-sm"
                  >
                    <Wallet size={14} /> Receive Cash
                  </button>
                  <button
                    onClick={() => onNavigate('reports', { customerId: cust._id })}
                    className="btn btn-outline-primary btn-sm"
                  >
                    <FileText size={14} /> Bill
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}