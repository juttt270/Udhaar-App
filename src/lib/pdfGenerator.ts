import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface MonthlyReportData {
  plant: {
    name: string;
    phone?: string;
    address?: string;
    currency?: string;
  };
  customer: {
    name: string;
    phone?: string;
    area?: string;
    address?: string;
    ratePerBottle: number;
  };
  month: string;
  openingBalance: number;
  monthDeliveries: Array<{
    date: string;
    bottlesDelivered: number;
    bottlesReturned: number;
    rate: number;
    totalAmount: number;
    notes?: string;
  }>;
  monthPayments: Array<{
    date: string;
    amount: number;
    paymentMethod: string;
    receiptNo?: string;
    notes?: string;
  }>;
  monthBottlesDelivered: number;
  monthBottlesReturned: number;
  monthBilling: number;
  monthPaymentsTotal: number;
  closingBalance: number;
  totalBottlesWithCustomer: number;
}

const BRAND = 'AB WATER FILTER';
const BRAND_COLOR: [number, number, number] = [2, 132, 199];

export function generateCustomerMonthlyPDF(data: MonthlyReportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const currency = data.plant.currency || 'Rs.';

  const [yearStr, monthStr] = data.month.split('-');
  const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  const monthName = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // ── Watermark ──
  doc.saveGraphicsState();
  const GState = (doc as any).GState;
  doc.setGState(new GState({ opacity: 0.06 }));
  doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(46);
  doc.text(BRAND, pageWidth / 2, pageHeight / 2, { align: 'center', angle: 40 });
  doc.restoreGraphicsState();

  // ── Header Banner ──
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(data.plant.name || BRAND, 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const contactText = [data.plant.phone ? `Phone: ${data.plant.phone}` : '', data.plant.address]
    .filter(Boolean)
    .join(' | ');
  doc.text(contactText || 'Pure Drinking Water Supply', 14, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('MONTHLY WATER BILL', pageWidth - 14, 11, { align: 'right' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Billing Month: ${monthName}`, pageWidth - 14, 18, { align: 'right' });

  // Brand sub-line
  doc.setFontSize(7);
  doc.setTextColor(200, 235, 255);
  doc.text(BRAND, 14, 24);

  // ── Customer Info Box ──
  let currentY = 34;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, pageWidth - 28, 26, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Customer: ${data.customer.name}`, 18, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${data.customer.phone || 'N/A'}`, 18, currentY + 13);
  doc.text(
    `Area / Address: ${[data.customer.area, data.customer.address].filter(Boolean).join(', ') || 'N/A'}`,
    18,
    currentY + 19
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rate: ${currency} ${data.customer.ratePerBottle} / bottle`, pageWidth - 18, currentY + 7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Issue Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 18, currentY + 13, { align: 'right' });
  doc.text(
    `Bottles with Customer: ${data.totalBottlesWithCustomer}`,
    pageWidth - 18,
    currentY + 19,
    { align: 'right' }
  );

  // ── 4 Summary Cards ──
  currentY = 65;
  const cardWidth = (pageWidth - 28 - 9) / 4;
  const cards = [
    { title: 'Previous Balance', value: `${currency} ${data.openingBalance.toLocaleString()}`, color: [241, 245, 249] as [number,number,number], textCol: [71, 85, 105] as [number,number,number] },
    { title: 'This Month Bill', value: `${currency} ${data.monthBilling.toLocaleString()}`, color: [238, 242, 255] as [number,number,number], textCol: [79, 70, 229] as [number,number,number] },
    { title: 'Payments Received', value: `${currency} ${data.monthPaymentsTotal.toLocaleString()}`, color: [236, 253, 245] as [number,number,number], textCol: [5, 150, 105] as [number,number,number] },
    { title: 'Total Due', value: `${currency} ${data.closingBalance.toLocaleString()}`, color: [254, 242, 242] as [number,number,number], textCol: [220, 38, 38] as [number,number,number] },
  ];
  cards.forEach((card, idx) => {
    const cardX = 14 + idx * (cardWidth + 3);
    doc.setFillColor(...card.color);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, currentY, cardWidth, 18, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.title, cardX + cardWidth / 2, currentY + 6, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...card.textCol);
    doc.text(card.value, cardX + cardWidth / 2, currentY + 13, { align: 'center' });
  });

  // ── Daily Ledger Table (delivery only — no returned column) ──
  // ── ERP Customer Ledger Table with Running Balance ──
  currentY = 89;

  type EventItem =
    | { type: 'delivery'; date: string; bottles: number; rate: number; amount: number; desc: string }
    | { type: 'payment'; date: string; amount: number; desc: string };

  const events: EventItem[] = [];

  data.monthDeliveries.forEach((d) => {
    events.push({
      type: 'delivery',
      date: d.date,
      bottles: d.bottlesDelivered,
      rate: d.rate,
      amount: d.totalAmount,
      desc: `Delivery (${d.bottlesDelivered} Bottles @ Rs.${d.rate})${d.notes ? ` · ${d.notes}` : ''}`,
    });
  });

  data.monthPayments.forEach((p) => {
    events.push({
      type: 'payment',
      date: p.date,
      amount: p.amount,
      desc: `Payment (${p.paymentMethod}${p.receiptNo ? ` #${p.receiptNo}` : ''})${p.notes ? ` · ${p.notes}` : ''}`,
    });
  });

  events.sort((a, b) => {
    const c = a.date.localeCompare(b.date);
    if (c !== 0) return c;
    return a.type === 'delivery' ? -1 : 1;
  });

  const tableRows: (string | number)[][] = [];
  let runningBal = data.openingBalance || 0;

  // 1. Opening Balance Row
  tableRows.push([
    `${data.month}-01`,
    'Opening Balance (سابقہ بقایا)',
    '-',
    '-',
    '-',
    `${currency} ${runningBal.toLocaleString()}`,
  ]);

  events.forEach((ev) => {
    const dObj = new Date(ev.date + 'T00:00:00');
    const dayStr = dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    if (ev.type === 'delivery') {
      runningBal += ev.amount;
      tableRows.push([
        dayStr,
        ev.desc,
        ev.bottles,
        `${currency} ${ev.amount.toLocaleString()}`,
        '-',
        `${currency} ${runningBal.toLocaleString()}`,
      ]);
    } else {
      runningBal -= ev.amount;
      tableRows.push([
        dayStr,
        ev.desc,
        '-',
        '-',
        `${currency} ${ev.amount.toLocaleString()}`,
        `${currency} ${runningBal.toLocaleString()}`,
      ]);
    }
  });

  // Total Summary Row
  tableRows.push([
    'CLOSING BALANCE',
    'Total Month Activity',
    data.monthBottlesDelivered,
    `${currency} ${data.monthBilling.toLocaleString()}`,
    `${currency} ${data.monthPaymentsTotal.toLocaleString()}`,
    `${currency} ${data.closingBalance.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Particulars / Description', 'Bottles', 'Charges (+)', 'Paid (-)', 'Balance']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
    styles: { fontSize: 7.8, cellPadding: 2, halign: 'center', textColor: [30, 41, 59] },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 20 },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 26 },
      4: { halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105], cellWidth: 26 },
      5: { halign: 'right', fontStyle: 'bold', textColor: [3, 105, 161], cellWidth: 28 },
    },
    didParseCell: (hookData) => {
      // Opening balance row styling
      if (hookData.row.index === 0) {
        hookData.cell.styles.fillColor = [241, 245, 249];
        hookData.cell.styles.fontStyle = 'bold';
      }
      // Closing balance total row styling
      if (hookData.row.index === tableRows.length - 1) {
        hookData.cell.styles.fillColor = [238, 242, 255];
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.textColor = [15, 23, 42];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastY = (doc as any).lastAutoTable?.finalY || currentY + 60;
  let finalY = lastY + 8;
  if (finalY > 250) { doc.addPage(); finalY = 20; }

  // ── Total Due Box ──
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(14, finalY, pageWidth - 28, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`TOTAL BALANCE DUE: ${currency} ${data.closingBalance.toLocaleString()}`, pageWidth / 2, finalY + 9, { align: 'center' });

  // ── Footer note ──
  finalY += 22;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Note: Please clear your water delivery bill by the end of the month.', 14, finalY);
  doc.text('Thank you for choosing pure drinking water for your family and office.', 14, finalY + 5);

  // Signature line
  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - 70, finalY + 4, pageWidth - 14, finalY + 4);
  doc.text('Authorized Signature / Stamp', pageWidth - 42, finalY + 9, { align: 'center' });

  // ── Branded footer ──
  finalY += 18;
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Generated by ${BRAND}`, pageWidth / 2, pageHeight - 4, { align: 'center' });

  const filename = `WaterBill_${data.customer.name.replace(/\s+/g, '_')}_${data.month}.pdf`;
  doc.save(filename);
}
