import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface MonthlyReportData {
  month: string;
  generatedAt: string;
  plant: {
    name: string;
    phone: string;
    address: string;
    currency: string;
  };
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string;
    area: string;
    ratePerBottle: number;
  };
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

export function generateCustomerMonthlyPDF(data: MonthlyReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const currency = data.plant.currency || 'Rs.';

  // Format month name (e.g., "October 2026")
  const [yearStr, monthStr] = data.month.split('-');
  const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  const monthName = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // 1. Header Banner
  doc.setFillColor(14, 165, 233); // Sky Blue 500
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(data.plant.name || 'PURE WATER PLANT', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const contactText = [data.plant.phone ? `Phone: ${data.plant.phone}` : '', data.plant.address].filter(Boolean).join(' | ');
  doc.text(contactText || 'Pure & Mineral Drinking Water Supply', 14, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('MONTHLY WATER BILL / KHATA', pageWidth - 14, 12, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Billing Month: ${monthName}`, pageWidth - 14, 18, { align: 'right' });

  // 2. Customer & Bill Info Box
  let currentY = 33;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(14, currentY, pageWidth - 28, 26, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Customer: ${data.customer.name}`, 18, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${data.customer.phone || 'N/A'}`, 18, currentY + 13);
  doc.text(`Area / Address: ${[data.customer.area, data.customer.address].filter(Boolean).join(', ') || 'N/A'}`, 18, currentY + 19);

  // Right side of customer box
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rate Per Bottle: ${currency} ${data.customer.ratePerBottle}`, pageWidth - 18, currentY + 7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date of Issue: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 18, currentY + 13, { align: 'right' });
  doc.text(`Bottles with Customer: ${data.totalBottlesWithCustomer} cans`, pageWidth - 18, currentY + 19, { align: 'right' });

  // 3. Financial Summary Badges
  currentY = 64;
  const cardWidth = (pageWidth - 28 - 9) / 4;

  const cards = [
    { title: 'Previous Balance', value: `${currency} ${data.openingBalance.toLocaleString()}`, color: [241, 245, 249], textCol: [71, 85, 105] },
    { title: 'Current Month Bill', value: `${currency} ${data.monthBilling.toLocaleString()}`, color: [238, 242, 255], textCol: [79, 70, 229] },
    { title: 'Payments Received', value: `${currency} ${data.monthPaymentsTotal.toLocaleString()}`, color: [236, 253, 245], textCol: [5, 150, 105] },
    { title: 'Net Payable (Baqi)', value: `${currency} ${data.closingBalance.toLocaleString()}`, color: [254, 242, 242], textCol: [220, 38, 38] },
  ];

  cards.forEach((card, idx) => {
    const cardX = 14 + idx * (cardWidth + 3);
    doc.setFillColor(card.color[0], card.color[1], card.color[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, currentY, cardWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.title, cardX + cardWidth / 2, currentY + 6, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(card.textCol[0], card.textCol[1], card.textCol[2]);
    doc.text(card.value, cardX + cardWidth / 2, currentY + 13, { align: 'center' });
  });

  // 4. Detailed Daily Ledger Table
  currentY = 88;

  // Merge deliveries & payments chronologically
  const deliveryDatesMap = new Map<string, { delivered: number; returned: number; rate: number; total: number; notes: string }>();
  data.monthDeliveries.forEach((d) => {
    deliveryDatesMap.set(d.date, {
      delivered: d.bottlesDelivered,
      returned: d.bottlesReturned,
      rate: d.rate,
      total: d.totalAmount,
      notes: d.notes || '',
    });
  });

  const paymentDatesMap = new Map<string, { amount: number; method: string; receipt: string }>();
  data.monthPayments.forEach((p) => {
    paymentDatesMap.set(p.date, {
      amount: p.amount,
      method: p.paymentMethod,
      receipt: p.receiptNo || '',
    });
  });

  // Collect all unique dates in the month that have activity
  const allDates = Array.from(new Set([...Array.from(deliveryDatesMap.keys()), ...Array.from(paymentDatesMap.keys())])).sort();

  const tableRows: (string | number)[][] = [];

  allDates.forEach((date) => {
    const del = deliveryDatesMap.get(date);
    const pay = paymentDatesMap.get(date);

    // Format date e.g. "12 Oct (Sun)"
    const dObj = new Date(date + 'T00:00:00');
    const dayStr = dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', weekday: 'short' });

    tableRows.push([
      dayStr,
      del ? del.delivered : '-',
      del ? del.returned : '-',
      del ? `${currency} ${del.rate}` : '-',
      del ? `${currency} ${del.total.toLocaleString()}` : '-',
      pay ? `${currency} ${pay.amount.toLocaleString()} (${pay.method})` : '-',
    ]);
  });

  if (tableRows.length === 0) {
    tableRows.push(['No deliveries or payments recorded for this month.', '-', '-', '-', '-', '-']);
  }

  // Summary Row at bottom
  tableRows.push([
    'TOTALS',
    data.monthBottlesDelivered,
    data.monthBottlesReturned,
    '-',
    `${currency} ${data.monthBilling.toLocaleString()}`,
    `${currency} ${data.monthPaymentsTotal.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Date / Day', 'Delivered (Cans)', 'Returned (Empty)', 'Rate', 'Total Amount', 'Payment Received']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [14, 165, 233],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      halign: 'center',
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      4: { fontStyle: 'bold', textColor: [15, 23, 42] },
      5: { fontStyle: 'bold', textColor: [5, 150, 105] },
    },
    didParseCell: (hookData) => {
      // Highlight the last TOTALS row
      if (hookData.row.index === tableRows.length - 1) {
        hookData.cell.styles.fillColor = [241, 245, 249];
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.textColor = [15, 23, 42];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Final Balance Box & Signature
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastTableY = (doc as any).lastAutoTable?.finalY || currentY + 60;
  let finalY = lastTableY + 8;

  if (finalY > 250) {
    doc.addPage();
    finalY = 20;
  }

  // Total summary pill
  doc.setFillColor(15, 23, 42); // Deep slate
  doc.roundedRect(14, finalY, pageWidth - 28, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`NET PAYABLE BALANCE (KUL WAJIB-UL-ADA): ${currency} ${data.closingBalance.toLocaleString()}`, pageWidth / 2, finalY + 9, {
    align: 'center',
  });

  // Footer notes & signature
  finalY += 22;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Important Note: Baraye mehrbani mahine ke ikhtitam par bill ada karein.', 14, finalY);
  doc.text('Kharidari aur shafaf tareen pani k aitmad par shukriya!', 14, finalY + 5);

  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - 70, finalY + 4, pageWidth - 14, finalY + 4);
  doc.text('Authorized Signature / Stamp', pageWidth - 42, finalY + 9, { align: 'center' });

  // Save the PDF
  const filename = `Water_Bill_${data.customer.name.replace(/\s+/g, '_')}_${data.month}.pdf`;
  doc.save(filename);
}
