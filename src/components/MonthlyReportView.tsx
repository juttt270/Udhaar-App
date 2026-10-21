'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Download,
  Calendar,
  MessageCircle,
  CheckCircle,
} from 'lucide-react';
import { useToast } from './Toast';
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

export default function MonthlyReportView({ initialCustomerId }: MonthlyReportViewProps) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId || '');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();
  const customersLoaded = useRef(false);

  // Load customers only once
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
        } else if (list.length > 0) {
          setSelectedCustomerId((prev) => prev || list[0]._id);
        }
      } catch {
        toast.error('Failed to load customers list');
      }
    };
    fetchCustomers();
  }, [initialCustomerId, toast]);

  const loadReport = useCallback(async () => {
    if (!selectedCustomerId || !selectedMonth) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/monthly?customerId=${selectedCustomerId}&month=${selectedMonth}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate monthly report');
      }

      setReportData(data.report);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generating report';
      toast.error(msg);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedCustomerId, selectedMonth, toast]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadReport();
    }
  }, [selectedCustomerId, selectedMonth, loadReport]);

  const handleDownloadPDF = () => {
    if (!reportData) return;
    setDownloading(true);
    try {
      generateCustomerMonthlyPDF(reportData);
      toast.success(`PDF Bill downloaded for ${reportData.customer.name}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generating PDF';
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!reportData) return;
    const phone = reportData.customer.phone?.replace(/[^0-9]/g, '');
    const currency = reportData.plant.currency || 'Rs.';

    const text =
      `*Water Delivery Bill - ${reportData.plant.name}*\n` +
      `Dear ${reportData.customer.name},\n` +
      `Here is your monthly water bill for *${reportData.month}*:\n\n` +
      `• Previous Balance: ${currency} ${reportData.openingBalance.toLocaleString()}\n` +
      `• Bottles Delivered: ${reportData.monthBottlesDelivered} Cans\n` +
      `• Month Charges: ${currency} ${reportData.monthBilling.toLocaleString()}\n` +
      `• Payments Received: ${currency} ${reportData.monthPaymentsTotal.toLocaleString()}\n` +
      `---------------------------------\n` +
      `*TOTAL DUE: ${currency} ${reportData.closingBalance.toLocaleString()}*\n` +
      `• Empty Bottles Held: ${reportData.totalBottlesWithCustomer} Cans\n\n` +
      `Thank you!`;

    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={22} color="var(--primary)" /> Monthly Bill & PDF
        </h2>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          View delivery statement and download PDF invoice
        </p>
      </div>

      {/* Selectors Bar */}
      <div
        className="card"
        style={{
          marginBottom: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          alignItems: 'end',
        }}
      >
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Select Customer</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="form-select"
          >
            <option value="">-- Choose Customer --</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} {c.area ? `(${c.area})` : ''}
              </option>
            ))}
          </select>
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

        <button
          onClick={loadReport}
          className="btn btn-outline-primary"
          style={{ width: '100%' }}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Statement Preview */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Calculating statement...
        </div>
      ) : !reportData ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <FileText size={32} />
          </div>
          <h3>Select Customer & Month</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Choose a customer from the dropdown above to view their monthly statement.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: '16px 14px' }}>
          {/* Printable Header */}
          <div
            style={{
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: 14,
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: 6 }}>
                  MONTHLY STATEMENT
                </span>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--primary)', margin: '4px 0 2px' }}>
                  {reportData.plant.name}
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {reportData.plant.address}{reportData.plant.phone ? ` • Ph: ${reportData.plant.phone}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Period</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{reportData.month}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>
                  Generated: {new Date().toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Details Box */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Customer Name</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{reportData.customer.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {reportData.customer.phone || 'No phone'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Address</div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                {[reportData.customer.area, reportData.customer.address].filter(Boolean).join(', ') || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Rate</div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700 }}>
                Rs.{reportData.customer.ratePerBottle}/bottle
              </div>
              <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>
                Empty Held: {reportData.totalBottlesWithCustomer}
              </div>
            </div>
          </div>

          {/* 4 Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <div style={{ background: '#f1f5f9', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Prev. Balance</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 3 }}>
                Rs.{reportData.openingBalance.toLocaleString()}
              </div>
            </div>

            <div style={{ background: '#eff6ff', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: 600 }}>
                This Month ({reportData.monthBottlesDelivered} Cans)
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1d4ed8', marginTop: 3 }}>
                Rs.{reportData.monthBilling.toLocaleString()}
              </div>
            </div>

            <div style={{ background: '#ecfdf5', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600 }}>Payments Received</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#047857', marginTop: 3 }}>
                Rs.{reportData.monthPaymentsTotal.toLocaleString()}
              </div>
            </div>

            <div style={{ background: '#fef2f2', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600 }}>Balance Due</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#b91c1c', marginTop: 3 }}>
                Rs.{reportData.closingBalance.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Daily Delivery Entries */}
          <div style={{ marginBottom: 18 }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={15} color="var(--primary)" /> Daily Deliveries
            </h4>

            {reportData.monthDeliveries.length === 0 ? (
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 8, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No deliveries recorded this month.
              </div>
            ) : (
              <>
                {/* Mobile: compact card rows */}
                <div className="report-mobile-list">
                  {reportData.monthDeliveries.map((d, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid #f1f5f9', fontSize: '0.84rem', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{d.date}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {d.bottlesDelivered} del · {d.bottlesReturned} ret · @Rs.{d.rate}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                        Rs.{d.totalAmount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', fontWeight: 800, fontSize: '0.85rem' }}>
                    <span>TOTAL ({reportData.monthBottlesDelivered} Cans)</span>
                    <span>Rs.{reportData.monthBilling.toLocaleString()}</span>
                  </div>
                </div>

                {/* Desktop table */}
                <div className="report-desktop-table" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px' }}>Date</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Delivered</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Returned</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Rate</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.monthDeliveries.map((d, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{d.date}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span className="badge badge-info">{d.bottlesDelivered} Cans</span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span className="badge badge-warning">{d.bottlesReturned} Cans</span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>Rs.{d.rate}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                            Rs.{d.totalAmount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                        <td style={{ padding: '10px' }}>TOTAL</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{reportData.monthBottlesDelivered} Cans</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{reportData.monthBottlesReturned} Cans</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>-</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>Rs.{reportData.monthBilling.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Payments Received Breakdown */}
          {reportData.monthPayments.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={15} color="var(--success)" /> Payments Received
              </h4>

              {/* Mobile card rows */}
              <div className="report-mobile-list">
                {reportData.monthPayments.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid #f1f5f9', fontSize: '0.84rem', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.date}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {p.paymentMethod}{p.receiptNo ? ` · #${p.receiptNo}` : ''}
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--success)', whiteSpace: 'nowrap' }}>
                      Rs.{p.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="report-desktop-table" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#ecfdf5', borderBottom: '1px solid #a7f3d0', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Date</th>
                      <th style={{ padding: '8px 10px' }}>Method</th>
                      <th style={{ padding: '8px 10px' }}>Receipt #</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.monthPayments.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.date}</td>
                        <td style={{ padding: '8px 10px' }}>{p.paymentMethod}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{p.receiptNo || '-'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>
                          Rs.{p.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Download Footer */}
          <div
            style={{
              paddingTop: 14,
              borderTop: '2px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Save as PDF or send to WhatsApp directly.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={handleWhatsAppShare} className="btn btn-secondary" style={{ color: '#16a34a', flex: '1 1 140px' }}>
                <MessageCircle size={16} /> WhatsApp Bill
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="btn btn-primary btn-lg"
                style={{ flex: '1 1 140px' }}
              >
                <Download size={18} /> {downloading ? 'Downloading...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
