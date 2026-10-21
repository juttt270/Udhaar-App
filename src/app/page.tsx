'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Droplet,
  LayoutDashboard,
  CalendarCheck2,
  Users,
  Wallet,
  FileText,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
  PlusCircle,
} from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import DashboardView from '@/components/DashboardView';
import DailyEntryView from '@/components/DailyEntryView';
import CustomersView from '@/components/CustomersView';
import PaymentsView from '@/components/PaymentsView';
import MonthlyReportView from '@/components/MonthlyReportView';
import SettingsView from '@/components/SettingsView';
import { useToast } from '@/components/Toast';

interface UserData {
  id: string;
  name: string;
  email: string;
  plantName: string;
  phone: string;
  defaultRate: number;
}

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [hasAnyAdmin, setHasAnyAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'daily' | 'customers' | 'payments' | 'reports' | 'settings'>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [openAddCustomer, setOpenAddCustomer] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 769);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setHasAnyAdmin(data.hasAnyAdmin);
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      toast.error('Session check failed');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      toast.info('Signed out successfully.');
    } catch {
      toast.error('Logout error');
    }
  };

  const navigateTo = (tab: string, extra?: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (extra && (extra as any).customerId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSelectedCustomerId((extra as any).customerId);
    } else {
      setSelectedCustomerId(undefined);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (extra && (extra as any).openAdd) {
      setOpenAddCustomer(true);
    } else {
      setOpenAddCustomer(false);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setActiveTab(tab as any);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-page)',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Droplet size={28} />
        </div>
        <div style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Loading Water Plant System...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthModal
        hasAnyAdmin={hasAnyAdmin}
        onSuccess={(user) => {
          setCurrentUser(user as UserData);
          setHasAnyAdmin(true);
        }}
      />
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'daily', label: 'Daily Delivery', icon: CalendarCheck2 },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'payments', label: 'Payments', icon: Wallet },
    { id: 'reports', label: 'Bills & PDF', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="app-layout">
      {/* Sidebar Navigation for Desktop */}
      <aside
        className="sidebar"
        style={{
          display: isMobile ? (mobileMenuOpen ? 'flex' : 'none') : 'flex',
          position: isMobile ? 'fixed' : 'sticky',
          left: 0,
          boxShadow: isMobile ? 'var(--shadow-lg)' : 'none',
        }}
      >
        {/* Plant Branding */}
        <div
          style={{
            padding: '20px 18px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 8px rgba(2, 132, 199, 0.25)',
              }}
            >
              <Droplet size={20} />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  lineHeight: 1.2,
                  color: 'var(--text-main)',
                  maxWidth: 150,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {currentUser.plantName || 'Water Plant'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>
                UDHAAR & BILLING
              </div>
            </div>
          </div>

          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="toast-close"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Sidebar Nav Links */}
        <nav style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? '#ffffff' : 'var(--text-main)',
                  background: isActive ? 'var(--primary)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 4px 10px var(--primary-glow)' : 'none',
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Info & Sign Out */}
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--border-color)',
            background: '#fafbfc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '0.84rem',
                fontWeight: 700,
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {currentUser.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Plant Manager</div>
          </div>
          <button
            onClick={handleLogout}
            className="toast-close"
            style={{ color: 'var(--danger)' }}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Bar Header */}
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn btn-secondary btn-sm"
              style={{ display: isMobile ? 'inline-flex' : 'none' }}
              aria-label="Toggle menu"
            >
              <Menu size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={18} color="var(--primary)" />
              <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                {currentUser.plantName}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => navigateTo('daily')}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex' }}
            >
              <CalendarCheck2 size={15} /> Deliver Bottles
            </button>
          </div>
        </header>

        {/* Views */}
        {activeTab === 'dashboard' && (
          <DashboardView
            plantName={currentUser.plantName}
            onNavigate={navigateTo}
          />
        )}

        {activeTab === 'daily' && <DailyEntryView />}

        {activeTab === 'customers' && (
          <CustomersView
            onNavigate={navigateTo}
            defaultPlantRate={currentUser.defaultRate}
            initialOpenAdd={openAddCustomer}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsView initialCustomerId={selectedCustomerId} />
        )}

        {activeTab === 'reports' && (
          <MonthlyReportView initialCustomerId={selectedCustomerId} />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            onLogout={handleLogout}
            onUpdatePlantName={(newName) => {
              setCurrentUser((prev) => (prev ? { ...prev, plantName: newName } : null));
            }}
          />
        )}
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="nav-icon-wrapper">
                <Icon size={18} />
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}