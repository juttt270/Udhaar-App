'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch('/api/customers');
        const data = await res.json();
        const list = data.customers || [];
        setCustomers(list);
        if (initialCustomerId) {
          setSelectedCustomerId(initialCustomerId);
        } else if (list.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(list[0]._id);
        }
      } catch {
        toast.error('Failed to load customers list');
      }
    };
    fetchCustomers();
  }, [initialCustomerId, toast, selectedCustomerId]);

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
      `• Bottles Delivered This Month: ${reportData.monthBottlesDelivered} Cans\n` +
      `• Current Month Charges: ${currency} ${reportData.monthBilling.toLocaleString()}\n` +
      `• Total Payments Received: ${currency} ${reportData.monthPaymentsTotal.toLocaleString()}\n` +
      `---------------------------------\n` +
      `*TOTAL BALANCE DUE: ${currency} ${reportData.closingBalance.toLocaleString()}*\n` +
      `• Empty Bottles with Customer: ${reportData.totalBottlesWithCustomer} Cans\n\n` +
      `Thank you for your business!`;

    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="page-container">
      {/* Header */}
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
            <FileText size={24} color="var(--primary)" /> Monthly Customer Bill & PDF
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            View month-wise delivery statement and download printable PDF invoice
          </p>
        </div>

        {reportData && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleWhatsAppShare}
              className="btn btn-secondary"
              style={{ color: '#16a34a' }}
            >
              <MessageCircle size={16} /> WhatsApp Bill
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="btn btn-primary"
              style={{ boxShadow: 'var(--shadow-md)' }}
            >
              <Download size={16} /> {downloading ? 'Downloading...' : 'Download PDF Bill'}
            </button>
          </div>
        )}
      </div>

      {/* Selectors Bar */}
      <div
        className="card"
        style={{
          marginBottom: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          alignItems: 'center',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={loadReport}
            className="btn btn-outline-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Statement'}
          </button>
        </div>
      </div>

      {/* Statement Preview Card */}
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
        <div className="card" style={{ padding: 22 }}>
          {/* Printable Header */}
          <div
            style={{
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: 16,
              marginBottom: 16,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div>
              <span className="badge badge-info" style={{ marginBottom: 6 }}>
                MONTHLY STATEMENT
              </span>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)' }}>
                {reportData.plant.name}
              </h2>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                {reportData.plant.address} {reportData.plant.phone ? `• Ph: ${reportData.plant.phone}` : ''}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Period</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{reportData.month}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                Generated: {new Date().toLocaleDateString('en-GB')}
              </div>
            </div>
          </div>

          {/* Customer Details Box */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer Name</div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>{reportData.customer.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {reportData.customer.phone || 'No phone'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivery Address</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                {[reportData.customer.area, reportData.customer.address].filter(Boolean).join(', ') || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rate & Bottles</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                Rs. {reportData.customer.ratePerBottle} / bottle
              </div>
              <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 600 }}>
                Empty Bottles Held: {reportData.totalBottlesWithCustomer} cans
              </div>
            </div>
          </div>

          {/* 4 Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                background: '#f1f5f9',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Previous Balance
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: 4 }}>
                Rs. {reportData.openingBalance.toLocaleString()}
              </div>
            </div>

            <div
              style={{
                background: '#eff6ff',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #bfdbfe',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 600 }}>
                This Month Deliveries ({reportData.monthBottlesDelivered} Cans)
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>
                Rs. {reportData.monthBilling.toLocaleString()}
              </div>
            </div>

            <div
              style={{
                background: '#ecfdf5',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #a7f3d0',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>
                Total Payments Received
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#047857', marginTop: 4 }}>
                Rs. {reportData.monthPaymentsTotal.toLocaleString()}
              </div>
            </div>

            <div
              style={{
                background: '#fef2f2',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #fecaca',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600 }}>
                Total Balance Due
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#b91c1c', marginTop: 4 }}>
                Rs. {reportData.closingBalance.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Daily Delivery Entries Breakdown Table */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: '0.96rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={16} color="var(--primary)" /> Daily Deliveries Log
            </h4>

            {reportData.monthDeliveries.length === 0 ? (
              <div style={{ padding: '14px', background: '#f8fafc', borderRadius: 8, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No bottle deliveries recorded in this month.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Date</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Delivered</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Empty Returned</th>
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
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>Rs. {d.rate}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                          Rs. {d.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                      <td style={{ padding: '10px' }}>TOTAL</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{reportData.monthBottlesDelivered} Cans</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{reportData.monthBottlesReturned} Cans</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>-</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>Rs. {reportData.monthBilling.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payments Received Breakdown */}
          {reportData.monthPayments.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: '0.96rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={16} color="var(--success)" /> Payments Received This Month
              </h4>
              <div style={{ overflowX: 'auto' }}>
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
                          Rs. {p.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Download Action Footer */}
          <div
            style={{
              paddingTop: 16,
              borderTop: '2px solid var(--border-color)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Click below to save this official invoice as a PDF file or send to WhatsApp.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleWhatsAppShare} className="btn btn-secondary" style={{ color: '#16a34a' }}>
                <MessageCircle size={16} /> Send via WhatsApp
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="btn btn-primary btn-lg"
              >
                <Download size={18} /> {downloading ? 'Downloading...' : 'Download PDF Bill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}