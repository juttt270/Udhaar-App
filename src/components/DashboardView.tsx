'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Droplets,
  RotateCcw,
  Wallet,
  Users,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  FileText,
  CalendarCheck2,
  TrendingUp,
} from 'lucide-react';
import { useToast } from './Toast';

interface DashboardViewProps {
  onNavigate: (tab: string, extra?: unknown) => void;
  plantName: string;
}

interface StatsData {
  today: {
    date: string;
    bottlesDelivered: number;
    bottlesReturned: number;
    billedAmount: number;
    cashReceived: number;
  };
  month: {
    monthStr: string;
    totalBottles: number;
    billedAmount: number;
    collectedAmount: number;
  };
  activeCustomersCount: number;
  totalPendingUdhaar: number;
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
  const [stats, setStats] = useState<StatsData | null>(null);
  const [topDebtors, setTopDebtors] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchStats = useCallback(async () => {
    try {
      const [resStats, resCust] = await Promise.all([
        fetch('/api/stats'),
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
  }, [toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="page-container">
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '22px 20px',
          color: '#ffffff',
          marginBottom: 20,
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
            {plantName || 'Water Plant Dashboard'}
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

      {/* 4 Primary KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>Delivered Today</span>
            <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <Droplets size={18} />
            </div>
          </div>
          <div className="stat-value">
            {loading ? '...' : `${stats?.today?.bottlesDelivered || 0} Bottles`}
          </div>
          <div className="stat-hint">
            Bill: Rs. {(stats?.today?.billedAmount || 0).toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Empty Bottles Collected</span>
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <RotateCcw size={18} />
            </div>
          </div>
          <div className="stat-value">
            {loading ? '...' : `${stats?.today?.bottlesReturned || 0} Empty`}
          </div>
          <div className="stat-hint">Returned by customers today</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Cash Received Today</span>
            <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {loading ? '...' : `Rs. ${(stats?.today?.cashReceived || 0).toLocaleString()}`}
          </div>
          <div className="stat-hint">Total payments collected</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Total Unpaid Balance</span>
            <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#dc2626' }}>
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
            <h3 style={{ fontSize: '1rem' }}>Top Unpaid Customers (Pending Balances)</h3>
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