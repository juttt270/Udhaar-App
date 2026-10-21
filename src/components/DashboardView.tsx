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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 20px',
          color: '#ffffff',
          marginBottom: 20,
          boxShadow: '0 10px 20px rgba(2, 132, 199, 0.2)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '3px 8px',
              borderRadius: 20,
              fontWeight: 700,
            }}
          >
            {todayFormatted}
          </span>
          <h1 style={{ fontSize: '1.6rem', marginTop: 8, color: '#ffffff' }}>
            {plantName || 'Water Plant Dashboard'}
          </h1>
          <p style={{ fontSize: '0.88rem', opacity: 0.9, marginTop: 4 }}>
            Roznamcha, Udhaar Khata aur Monthly Bill Management
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
            <CalendarCheck2 size={16} /> Aaj Ka Roznamcha
          </button>
          <button
            onClick={() => onNavigate('customers')}
            className="btn"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.4)',
            }}
          >
            <PlusCircle size={16} /> Naya Customer
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>Aaj Deliver Huwe</span>
            <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <Droplets size={18} />
            </div>
          </div>
          <div className="stat-value">
            {loading ? '...' : `${stats?.today?.bottlesDelivered || 0} Cans`}
          </div>
          <div className="stat-hint">
            Billed: Rs. {(stats?.today?.billedAmount || 0).toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Khali Cans Wapas</span>
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <RotateCcw size={18} />
            </div>
          </div>
          <div className="stat-value">
            {loading ? '...' : `${stats?.today?.bottlesReturned || 0} Cans`}
          </div>
          <div className="stat-hint">Aaj wapas mosool huwe</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Aaj Ki Wasooli (Cash)</span>
            <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {loading ? '...' : `Rs. ${(stats?.today?.cashReceived || 0).toLocaleString()}`}
          </div>
          <div className="stat-hint">Payment entry recorded</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Kul Baqi Udhaar</span>
            <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#dc2626' }}>
            {loading ? '...' : `Rs. ${(stats?.totalPendingUdhaar || 0).toLocaleString()}`}
          </div>
          <div className="stat-hint">
            {stats?.activeCustomersCount || 0} Active Customers
          </div>
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14,
          marginBottom: 24,
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
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarCheck2 size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.98rem' }}>Daily Delivery Entry</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Aaj k delivers & wapsi cans darj karein
              </p>
            </div>
            <ArrowRight size={16} color="var(--text-sub)" />
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
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--success-light)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.98rem' }}>Wasooli / Cash Entry</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Customer se aane wali raqam record karein
              </p>
            </div>
            <ArrowRight size={16} color="var(--text-sub)" />
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
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-sm)',
                background: '#f3e8ff',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.98rem' }}>Monthly PDF Bill</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Mahana hisab & printable PDF download
              </p>
            </div>
            <ArrowRight size={16} color="var(--text-sub)" />
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
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--warning-light)',
                color: 'var(--warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.98rem' }}>Customer Directory</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Tamam ghaak aur unka balance
              </p>
            </div>
            <ArrowRight size={16} color="var(--text-sub)" />
          </div>
        </div>
      </div>

      {/* Top Pending Receivables */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="var(--danger)" />
            <h3 style={{ fontSize: '1.05rem' }}>Top Pending Udhaar (Wajib-ul-Ada)</h3>
          </div>
          <button
            onClick={() => onNavigate('customers')}
            className="btn btn-secondary btn-sm"
          >
            Tamam Customers Dekhein <ArrowRight size={14} />
          </button>
        </div>

        {topDebtors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
            Koi bara pending udhaar nahi hai. Sab hisab clear hai!
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
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{cust.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {cust.area || 'Address not set'} • {cust.phone || 'No phone'} • Cans held:{' '}
                    <strong>{cust.bottlesWithCustomer}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    className="badge badge-danger"
                    style={{ fontSize: '0.85rem', padding: '4px 10px' }}
                  >
                    Baqi: Rs. {cust.currentBalance.toLocaleString()}
                  </span>
                  <button
                    onClick={() => onNavigate('payments', { customerId: cust._id })}
                    className="btn btn-success btn-sm"
                  >
                    Wasooli Darj Karein
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
