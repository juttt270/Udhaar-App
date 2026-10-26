'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FileText, Download, Calendar, MessageCircle, CheckCircle } from 'lucide-react';
import { useToast } from './Toast';
import CustomerDropdown from './CustomerDropdown';
import { generateCustomerMonthlyPDF, MonthlyReportData } from '@/lib/pdfGenerator';

interface CustomerOption {
  _id: string;
  name: string;
  phone: string;
  area: string;
}

interface MonthlyReportViewProps {
  initialCustomerId?: string;
}

interface LedgerRow {
  id: string;
  date: string;
  type: 'opening' | 'delivery' | 'payment';
  description: string;
  bottles: number | string;
  charges: number | string;
  payment: number | string;
  balance: number;
}

export default function MonthlyReportView({ initialCustomerId }: MonthlyReportViewProps) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId || '');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();
  const customersLoaded = useRef(false);
  const downloadingRef = useRef(false);

  // Load customers once - Default to NO customer selected
  useEffect(() => {
    if (customersLoaded.current) return;
    customersLoaded.current = true;
    const fetchCustomers = async () => {
      try {
        const res = await fetch('/api/customers');
        const data = await res.json();
        const list: CustomerOption[] = data.customers || [];
        setCustomers(list);
        if (initialCustomerId) {
          setSelectedCustomerId(initialCustomerId);
        } else {
          // Requirement: default par koi customer select na ho
          setSelectedCustomerId('');
        }
      } catch {
        toast.error('Failed to load customers list');
      }
    };
    fetchCustomers();
  }, [initialCustomerId, toast]);

  const loadReport = useCallback(async () => {
    if (!selectedCustomerId || !selectedMonth) {
      setReportData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/monthly?customerId=${selectedCustomerId}&month=${selectedMonth}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate monthly report');
      setReportData(data.report);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error generating report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedCustomerId, selectedMonth, toast]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadReport();
    } else {
      setReportData(null);
    }
  }, [selectedCustomerId, selectedMonth, loadReport]);

  const handleDownloadPDF = () => {
    if (!reportData || downloadingRef.current) return;
    downloadingRef.current = true;
    setDownloading(true);
    try {
      generateCustomerMonthlyPDF(reportData);
      toast.success(`PDF downloaded for ${reportData.customer.name}!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error generating PDF');
    } finally {
      setDownloading(false);
      downloadingRef.current = false;
    }
  };

  const handleWhatsAppShare = () => {
    if (!reportData) return;
    const phone = reportData.customer.phone?.replace(/[^0-9]/g, '');
    const currency = reportData.plant.currency || 'Rs.';
    const isAdv = reportData.closingBalance < 0;
    const isDue = reportData.closingBalance > 0;
    const absClosing = Math.abs(reportData.closingBalance).toLocaleString();
    const closingSummary = isAdv
      ? `*CUSTOMER ADVANCE: +${currency} ${absClosing}*`
      : isDue
      ? `*TOTAL DUE: ${currency} ${absClosing}*`
      : `*BALANCE: ${currency} 0 (ALL CLEAR)*`;

    const openSummary =
      reportData.openingBalance < 0
        ? `+${currency} ${Math.abs(reportData.openingBalance).toLocaleString()} (Advance)`
        : `${currency} ${reportData.openingBalance.toLocaleString()}`;

    const text =
      `*Water Delivery Bill - ${reportData.plant.name}*\n` +
      `Dear ${reportData.customer.name},\n` +
      `Monthly bill for *${reportData.month}*:\n\n` +
      `• Previous Balance: ${openSummary}\n` +
      `• Bottles Delivered: ${reportData.monthBottlesDelivered}\n` +
      `• Month Charges: ${currency} ${reportData.monthBilling.toLocaleString()}\n` +
      `• Payments Received: ${currency} ${reportData.monthPaymentsTotal.toLocaleString()}\n` +
      `---------------------------------\n` +
      `${closingSummary}\n\n` +
      `Thank you!`;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Build Chronological ERP Customer Ledger with Running Balance
  const ledgerRows = useMemo(() => {
    if (!reportData) return [];
    const rows: LedgerRow[] = [];
    let running = reportData.openingBalance || 0;

    // 1. Opening Balance Row
    const isOpeningAdv = running < 0;
    rows.push({
      id: 'opening-bal',
      date: `${reportData.month}-01`,
      type: 'opening',
      description: isOpeningAdv ? 'Opening Balance (Advance)' : 'Opening Balance',
      bottles: '-',
      charges: '-',
      payment: '-',
      balance: running,
    });

    const events: Array<
      | { type: 'delivery'; date: string; data: (typeof reportData.monthDeliveries)[0] }
      | { type: 'payment'; date: string; data: (typeof reportData.monthPayments)[0] }
    > = [
      ...reportData.monthDeliveries.map((d) => ({ type: 'delivery' as const, date: d.date, data: d })),
      ...reportData.monthPayments.map((p) => ({ type: 'payment' as const, date: p.date, data: p })),
    ];

    events.sort((a, b) => {
      const dComp = a.date.localeCompare(b.date);
      if (dComp !== 0) return dComp;
      return a.type === 'delivery' ? -1 : 1;
    });

    events.forEach((ev, idx) => {
      if (ev.type === 'delivery') {
        const d = ev.data;
        running += d.totalAmount;
        rows.push({
          id: `del-${idx}-${d.date}`,
          date: d.date,
          type: 'delivery',
          description: `Delivery: ${d.bottlesDelivered} Bottles (@ Rs.${d.rate})${d.notes ? ` · ${d.notes}` : ''}`,
          bottles: d.bottlesDelivered,
          charges: d.totalAmount,
          payment: '-',
          balance: running,
        });
      } else {
        const p = ev.data;
        running -= p.amount;
        rows.push({
          id: `pay-${idx}-${p.date}`,
          date: p.date,
          type: 'payment',
          description: `Payment: ${p.paymentMethod}${p.receiptNo ? ` (#${p.receiptNo})` : ''}${p.notes ? ` · ${p.notes}` : ''}`,
          bottles: '-',
          charges: '-',
          payment: p.amount,
          balance: running,
        });
      }
    });

    return rows;
  }, [reportData]);

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={22} color="var(--primary)" /> Monthly Bill &amp; ERP Ledger
        </h2>
        <p className="desktop-only" style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          Detailed customer ledger statement with opening &amp; closing balance and running tally
        </p>
      </div>

      {/* Selectors */}
      <div
        className="card"
        style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'end' }}
      >
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Select Customer</label>
          <CustomerDropdown
            customers={customers}
            value={selectedCustomerId}
            onChange={(id) => setSelectedCustomerId(id)}
            placeholder="-- Choose Customer --"
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Billing Month</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="form-input"
          />
        </div>

        <button onClick={loadReport} className="btn btn-outline-primary" style={{ width: '100%' }} disabled={loading || !selectedCustomerId}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Statement */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Calculating statement &amp; ledger...</div>
      ) : !reportData ? (
        <div className="card empty-state" style={{ padding: '48px 16px', textAlign: 'center' }}>
          <div className="empty-icon"><FileText size={36} color="var(--primary)" /></div>
          <h3 style={{ marginTop: 12, fontSize: '1.1rem' }}>No Customer Selected</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: 400, margin: '6px auto 0' }}>
            Please select a customer from the dropdown above to view their comprehensive ERP account ledger and monthly statement.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: '16px 14px' }}>
          {/* Statement Header */}
          <div style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: 6 }}>ERP CUSTOMER LEDGER</span>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--primary)', margin: '4px 0 2px' }}>{reportData.plant.name}</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {reportData.plant.address}{reportData.plant.phone ? ` • Ph: ${reportData.plant.phone}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Billing Period</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{reportData.month}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>
                  Generated: {new Date().toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="report-customer-info">
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Customer</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{reportData.customer.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{reportData.customer.phone || 'No phone'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Address</div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                {[reportData.customer.area, reportData.customer.address].filter(Boolean).join(', ') || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Rate &amp; Bottles</div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700 }}>Rs.{reportData.customer.ratePerBottle}/bottle</div>
              <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>
                Held: {reportData.totalBottlesWithCustomer} bottles
              </div>
            </div>
          </div>

          {/* 4 Summary Cards — 2x2 grid */}
          <div className="report-summary-grid">
            <div className="report-summary-card" style={{ background: reportData.openingBalance < 0 ? '#ecfdf5' : '#f1f5f9', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: `1px solid ${reportData.openingBalance < 0 ? '#a7f3d0' : '#e2e8f0'}` }}>
              <div style={{ fontSize: '0.72rem', color: reportData.openingBalance < 0 ? '#047857' : 'var(--text-muted)', fontWeight: 600 }}>
                {reportData.openingBalance < 0 ? 'Opening Advance' : 'Opening Balance'}
              </div>
              <div className="stat-val" style={{ fontSize: '1.1rem', fontWeight: 800, color: reportData.openingBalance < 0 ? '#047857' : 'inherit', marginTop: 3 }}>
                {reportData.openingBalance < 0 ? `+ Rs. ${Math.abs(reportData.openingBalance).toLocaleString()}` : `Rs. ${reportData.openingBalance.toLocaleString()}`}
              </div>
            </div>
            <div className="report-summary-card" style={{ background: '#eff6ff', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: 600 }}>Month Deliveries ({reportData.monthBottlesDelivered} Btls)</div>
              <div className="stat-val" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1d4ed8', marginTop: 3 }}>Rs.{reportData.monthBilling.toLocaleString()}</div>
            </div>
            <div className="report-summary-card" style={{ background: '#ecfdf5', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600 }}>Payments Received</div>
              <div className="stat-val" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#047857', marginTop: 3 }}>Rs.{reportData.monthPaymentsTotal.toLocaleString()}</div>
            </div>
            {reportData.closingBalance < 0 ? (
              <div className="report-summary-card" style={{ background: '#ecfdf5', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600 }}>Customer Advance</div>
                <div className="stat-val" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#047857', marginTop: 3 }}>
                  + Rs. {Math.abs(reportData.closingBalance).toLocaleString()}
                </div>
              </div>
            ) : reportData.closingBalance > 0 ? (
              <div className="report-summary-card" style={{ background: '#fef2f2', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600 }}>Closing Balance Due</div>
                <div className="stat-val" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#b91c1c', marginTop: 3 }}>
                  Rs. {reportData.closingBalance.toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="report-summary-card" style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Closing Balance</div>
                <div className="stat-val" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 3 }}>
                  Rs. 0 (Clear)
                </div>
              </div>
            )}
          </div>

          {/* Professional ERP Customer Account Ledger Table */}
          <div style={{ marginBottom: 18 }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
              <Calendar size={16} color="var(--primary)" /> Complete Ledger &amp; Running Balance
            </h4>

            {/* Mobile View */}
            <div className="report-mobile-list">
              {ledgerRows.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #f1f5f9',
                    background: r.type === 'opening' ? '#f8fafc' : r.type === 'payment' ? '#f0fdf4' : '#ffffff',
                    fontSize: '0.84rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700 }}>{r.date}</span>
                    <span style={{ fontWeight: 800, color: r.balance < 0 ? 'var(--success)' : r.balance > 0 ? '#b91c1c' : 'inherit' }}>
                      Bal: {r.balance < 0 ? `+ Rs. ${Math.abs(r.balance).toLocaleString()} (Adv)` : r.balance > 0 ? `Rs. ${r.balance.toLocaleString()} (Due)` : 'Rs. 0'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {r.description}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.76rem', fontWeight: 600 }}>
                    {r.bottles !== '-' && <span>Bottles: {r.bottles}</span>}
                    {r.charges !== '-' && <span style={{ color: 'var(--primary)' }}>Charges: Rs.{Number(r.charges).toLocaleString()}</span>}
                    {r.payment !== '-' && <span style={{ color: 'var(--success)' }}>Paid: Rs.{Number(r.payment).toLocaleString()}</span>}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', fontWeight: 800, fontSize: '0.9rem' }}>
                <span>{reportData.closingBalance < 0 ? 'Customer Advance:' : 'Closing Balance Due:'}</span>
                <span style={{ color: reportData.closingBalance < 0 ? 'var(--success)' : reportData.closingBalance > 0 ? '#b91c1c' : 'inherit' }}>
                  {reportData.closingBalance < 0
                    ? `+ Rs. ${Math.abs(reportData.closingBalance).toLocaleString()} (Advance)`
                    : reportData.closingBalance > 0
                    ? `Rs. ${reportData.closingBalance.toLocaleString()} (Due)`
                    : 'Rs. 0 (Clear)'}
                </span>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="report-desktop-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px' }}>Date</th>
                    <th style={{ padding: '10px 12px' }}>Particulars / Description</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Bottles</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Charges / Deliveries</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Payment Received</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((r) => (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: r.type === 'opening' ? '#f8fafc' : r.type === 'payment' ? '#fafffa' : undefined,
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.date}</td>
                      <td style={{ padding: '10px 12px', fontWeight: r.type === 'opening' ? 700 : 500 }}>
                        {r.description}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {r.bottles !== '-' ? <span className="badge badge-info">{r.bottles}</span> : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: r.charges !== '-' ? 'var(--primary)' : 'inherit' }}>
                        {r.charges !== '-' ? `Rs. ${Number(r.charges).toLocaleString()}` : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: r.payment !== '-' ? 'var(--success)' : 'inherit' }}>
                        {r.payment !== '-' ? `Rs. ${Number(r.payment).toLocaleString()}` : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: r.balance < 0 ? 'var(--success)' : r.balance > 0 ? '#b91c1c' : 'inherit' }}>
                        {r.balance < 0
                          ? `+ Rs. ${Math.abs(r.balance).toLocaleString()} (Adv)`
                          : r.balance > 0
                          ? `Rs. ${r.balance.toLocaleString()} (Due)`
                          : 'Rs. 0'}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                    <td style={{ padding: '12px' }} colSpan={2}>
                      {reportData.closingBalance < 0 ? 'TOTALS / CLOSING ADVANCE' : 'TOTALS / CLOSING BALANCE'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{reportData.monthBottlesDelivered} Bottles</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--primary)' }}>
                      Rs. {reportData.monthBilling.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--success)' }}>
                      Rs. {reportData.monthPaymentsTotal.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: reportData.closingBalance < 0 ? 'var(--success)' : reportData.closingBalance > 0 ? '#b91c1c' : 'inherit', fontSize: '0.98rem' }}>
                      {reportData.closingBalance < 0
                        ? `+ Rs. ${Math.abs(reportData.closingBalance).toLocaleString()} (Advance)`
                        : reportData.closingBalance > 0
                        ? `Rs. ${reportData.closingBalance.toLocaleString()} (Due)`
                        : 'Rs. 0 (Clear)'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Download Footer */}
          <div style={{ paddingTop: 14, borderTop: '2px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="desktop-only" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Save as PDF or send to WhatsApp.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={handleWhatsAppShare} className="btn btn-secondary" style={{ color: '#16a34a', flex: '1 1 140px' }}>
                <MessageCircle size={16} /> WhatsApp Bill
              </button>
              <button onClick={handleDownloadPDF} disabled={downloading} className="btn btn-primary btn-lg" style={{ flex: '1 1 140px' }}>
                <Download size={18} /> {downloading ? 'Downloading...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
