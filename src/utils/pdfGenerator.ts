import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryItem, IssueTransaction, ReceiveTransaction } from '../types';

interface PDFRequest {
  reportType: 'daily' | 'weekly' | 'monthly' | 'all';
  selectedItemCode: string; // 'all' or specific item code
  items: InventoryItem[];
  issues: IssueTransaction[];
  receives: ReceiveTransaction[];
  generatedBy: string; // User email / identifier
}

function drawAjantaLogo(doc: jsPDF, x: number, y: number) {
  // Save current colors
  const prevDrawColor = doc.getDrawColor();
  const prevFillColor = doc.getFillColor();

  // Draw an elegant circular shield background for the logo
  doc.setFillColor(235, 245, 255);
  doc.ellipse(x + 10.5, y + 7.5, 14, 11, 'F');
  
  // Highlight border for the logo shield
  doc.setDrawColor(242, 114, 21);
  doc.setLineWidth(0.4);
  doc.ellipse(x + 10.5, y + 7.5, 14, 11, 'S');

  // Left Leg: Grey (Concrete texture theme) - Split into two triangles
  doc.setFillColor(150, 155, 160);
  doc.triangle(x + 9, y, x + 12.5, y, x + 5, y + 15, 'F');
  doc.triangle(x + 9, y, x + 5, y + 15, x, y + 15, 'F');

  // Right Leg: Dark Navy Blue - Split into two triangles
  doc.setFillColor(26, 43, 76);
  doc.triangle(x + 12.5, y, x + 16, y, x + 21, y + 15, 'F');
  doc.triangle(x + 12.5, y, x + 21, y + 15, x + 15, y + 15, 'F');

  // Crossbar Belt: Orange - Split into two triangles
  doc.setFillColor(242, 114, 21);
  doc.triangle(x + 5.5, y + 9.5, x + 18, y + 9.5, x + 19, y + 12, 'F');
  doc.triangle(x + 5.5, y + 9.5, x + 19, y + 12, x + 4.5, y + 12, 'F');

  // White Belt Buckle outer frame
  doc.setFillColor(255, 255, 255);
  doc.rect(x + 13.5, y + 10, 2.5, 1.6, 'F');
  
  // Tiny orange center of buckle
  doc.setFillColor(242, 114, 21);
  doc.rect(x + 14.3, y + 10.4, 0.9, 0.8, 'F');

  // Restore original colors
  doc.setFillColor(prevFillColor);
  doc.setDrawColor(prevDrawColor);
}

export function generateInventoryPDF({
  reportType,
  selectedItemCode,
  items,
  issues,
  receives,
  generatedBy,
}: PDFRequest): { blob: Blob; blobURL: string; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const now = new Date();
  const todayStr = now.toLocaleDateString('en-GB');
  const timeStr = now.toLocaleTimeString('en-GB');

  // 1. Filter Data based on reportType (Daily, Weekly, Monthly, All)
  const getStartDateLimit = () => {
    const limit = new Date();
    limit.setHours(0, 0, 0, 0); // Start of today

    if (reportType === 'daily') {
      return limit; // From 12:00 AM today
    } else if (reportType === 'weekly') {
      limit.setDate(limit.getDate() - 7);
      return limit;
    } else if (reportType === 'monthly') {
      limit.setMonth(limit.getMonth() - 1);
      return limit;
    }
    return new Date(0); // All time
  };

  const startDateLimit = getStartDateLimit();

  // Filter issue and receipt transactions based on time range
  const filteredIssues = issues.filter((issue) => {
    const issueDate = new Date(issue.issuedAt);
    return issueDate >= startDateLimit;
  });

  const filteredReceives = receives.filter((rec) => {
    const recDate = new Date(rec.receivedAt);
    return recDate >= startDateLimit;
  });

  // Calculate dynamic current quantities for each item
  const filteredItems = selectedItemCode === 'all'
    ? items
    : items.filter((item) => item.itemCode === selectedItemCode);

  const reportTitleMap = {
    daily: 'Daily Store Inventory Report',
    weekly: 'Weekly Store Inventory Report',
    monthly: 'Monthly Store Inventory Report',
    all: 'Complete Store Inventory & Audit Report',
  };

  const reportSubtitleMap = {
    daily: 'Today\'s Transactions & Opening/Closing Stock Balance',
    weekly: 'Past 7 Days Transactions & Stock Status',
    monthly: 'Past 30 Days Transactions & Stock Status',
    all: 'All-Time Inventory Status & Historical Logs',
  };

  // --- PDF Styling & Header Constants ---
  const primaryColor: [number, number, number] = [26, 43, 76]; // Matching the Navy Indigo of Ajanta Logo
  const secondaryColor = [31, 41, 55]; // Gray-800

  // 2. Add Executive Header Block (Ajanta Construction Company Letterhead)
  // Draw Logo Vector
  drawAjantaLogo(doc, 14, 10);

  // Logo Typography Text
  doc.setTextColor(26, 43, 76);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('AJANTA', 46, 15);

  doc.setTextColor(242, 114, 21);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('CONSTRUCTION COMPANY', 46, 20);

  doc.setTextColor(115, 125, 135);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('STRENGTH  •  TRUST  •  INNOVATION', 46, 24);

  // Decorative Accent line separating letterhead
  doc.setFillColor(242, 114, 21); // Orange
  doc.rect(14, 31, 182, 0.8, 'F');

  // 3. Document Metadata Block
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFontSize(12);
  doc.setFont('Helvetica', 'bold');
  doc.text(reportTitleMap[reportType], 14, 43);

  doc.setFont('Helvetica', 'oblique');
  doc.setFontSize(9);
  doc.text(reportSubtitleMap[reportType], 14, 47);

  // Meta parameters (Right-aligned or structured layout)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Report Generation Details:', 140, 43);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Date & Time: ${todayStr} ${timeStr}`, 140, 47.5);
  doc.text(`Generated By: ${generatedBy}`, 140, 52);
  doc.text(`Item Filter: ${selectedItemCode === 'all' ? 'All Inventory Items' : selectedItemCode}`, 140, 56.5);
  doc.text(`Period Limit: ${reportType === 'all' ? 'All-Time History' : `Since ${startDateLimit.toLocaleDateString()}`}`, 140, 61);

  // 4. Quick Summary Overview stats cards
  let totalUniqueItems = filteredItems.length;
  let totalCurrentVal = 0;
  let lowStockAlertCount = 0;
  let totalIssuedQtyInPeriod = 0;

  filteredItems.forEach((item) => {
    // Current stock calculations
    const curReceived = receives
      .filter((r) => r.itemCode === item.itemCode)
      .reduce((sum, r) => sum + r.quantity, 0);

    const curIssued = issues
      .filter((i) => i.itemCode === item.itemCode)
      .reduce((sum, i) => sum + i.quantity, 0);

    const currentStock = item.initialQty + curReceived - curIssued;
    totalCurrentVal += (currentStock * item.pricePerUnit);

    if (currentStock <= 10) {
      lowStockAlertCount++;
    }
  });

  filteredIssues.forEach((issue) => {
    if (selectedItemCode === 'all' || issue.itemCode === selectedItemCode) {
      totalIssuedQtyInPeriod += issue.quantity;
    }
  });

  // Table summary box
  autoTable(doc, {
    startY: 66,
    head: [['Stats Metric', 'Value', 'Description']],
    body: [
      ['Total Items Listed', String(totalUniqueItems), 'Registered items matching chosen filters'],
      ['Total Stock Valuation (INR)', `Rs. ${totalCurrentVal.toLocaleString('en-IN')}`, 'Net worth of stock held in store'],
      ['Low Stock Items Count (<=10)', String(lowStockAlertCount), 'Items demanding reorder/purchase refills'],
      [`Total Released Quantity (${reportType})`, String(totalIssuedQtyInPeriod), `Sum of units issued during this ${reportType} period`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [74, 85, 104], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 45 },
      2: { textColor: [100, 116, 139] }
    }
  });

  // 5. Stock Balance Table
  const lastY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. STOCK INVENTORY BALANCE STATUS', 14, lastY);

  const itemRows = filteredItems.map((item, index) => {
    const itemReceived = receives
      .filter((r) => r.itemCode === item.itemCode)
      .reduce((sum, r) => sum + r.quantity, 0);

    const itemIssued = issues
      .filter((i) => i.itemCode === item.itemCode)
      .reduce((sum, i) => sum + i.quantity, 0);

    const currentStock = item.initialQty + itemReceived - itemIssued;
    const stockVal = currentStock * item.pricePerUnit;

    const statusText = currentStock === 0
      ? 'Out of Stock'
      : currentStock <= 10
      ? 'Low Stock (Alert)'
      : 'Good';

    // Period specific movement
    const periodReceived = filteredReceives
      .filter((r) => r.itemCode === item.itemCode)
      .reduce((sum, r) => sum + r.quantity, 0);

    const periodIssued = filteredIssues
      .filter((i) => i.itemCode === item.itemCode)
      .reduce((sum, i) => sum + i.quantity, 0);

    return [
      String(index + 1),
      item.itemCode,
      `${item.description} (${item.department || 'Civil'})`,
      item.unit,
      `Rs. ${item.pricePerUnit}`,
      String(item.initialQty),
      `+${itemReceived} (${periodReceived} in period)`,
      `-${itemIssued} (${periodIssued} in period)`,
      String(currentStock),
      `Rs. ${stockVal.toLocaleString('en-IN')}`,
      statusText
    ];
  });

  autoTable(doc, {
    startY: lastY + 3,
    head: [['#', 'Item Code', 'Description', 'Unit', 'Price/Unit', 'Opening', 'Total Recv', 'Total Isd', 'Current Stock', 'Total Value', 'Status']],
    body: itemRows,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 6 },
      1: { fontStyle: 'bold', cellWidth: 22 },
      2: { cellWidth: 38 },
      3: { cellWidth: 12 },
      4: { cellWidth: 20 },
      5: { cellWidth: 14 },
      6: { cellWidth: 22 },
      7: { cellWidth: 22 },
      8: { fontStyle: 'bold', cellWidth: 18 },
      9: { cellWidth: 24 },
      10: { fontStyle: 'bold', cellWidth: 22 }
    },
    didDrawCell: (data: any) => {
      // Color code specific statuses
      if (data.column.index === 10 && data.cell.section === 'body') {
        const text = data.cell.text[0];
        if (text === 'Out of Stock') {
          doc.setTextColor(220, 38, 38); // Bold Red
        } else if (text.startsWith('Low Stock')) {
          doc.setTextColor(217, 119, 6); // Amber
        } else {
          doc.setTextColor(22, 163, 74); // Green
        }
      }
    }
  });

  // 6. Issues Registry Log
  const secondTableY = (doc as any).lastAutoTable.finalY + 10;
  
  // Create a new page if the issue log title is too low
  let activeY = secondTableY;
  if (activeY > 240) {
    doc.addPage();
    activeY = 20;
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('2. STOCK RELEASE & ISSUE REPORT LOGS', 14, activeY);

  const displayIssueList = filteredIssues.filter((is) => {
    return selectedItemCode === 'all' || is.itemCode === selectedItemCode;
  });

  const issueRows = displayIssueList.map((is, index) => {
    const matchedItem = items.find((it) => it.itemCode === is.itemCode);
    const dateFormatted = new Date(is.issuedAt).toLocaleString('en-GB');
    return [
      String(index + 1),
      is.itemCode,
      matchedItem ? matchedItem.description : 'Unknown',
      is.issuedTo,
      is.department || 'Civil',
      `${is.quantity} ${matchedItem ? matchedItem.unit : ''}`,
      dateFormatted,
      `${is.issuedByName} (${is.issuedById})`,
      is.remark || '-'
    ];
  });

  if (issueRows.length === 0) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`No stock issue entries found during selected period range: [${reportType.toUpperCase()}]`, 14, activeY + 6);
  } else {
    autoTable(doc, {
      startY: activeY + 3,
      head: [['#', 'Item Code', 'Description', 'Issued To / Receiver', 'Dept', 'Qty', 'Date Issued', 'Issued By (ID)', 'Issue Remarks']],
      body: issueRows,
      theme: 'grid',
      headStyles: { fillColor: [43, 108, 176], textColor: 255 }, // Dark Blue for transaction listings
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 6 },
        1: { fontStyle: 'bold', cellWidth: 22 },
        2: { cellWidth: 32 },
        3: { cellWidth: 34 },
        4: { fontStyle: 'bold', cellWidth: 14 },
        5: { fontStyle: 'bold', cellWidth: 12 },
        6: { cellWidth: 26 },
        7: { cellWidth: 30 },
        8: { cellWidth: 30 }
      }
    });
  }

  // 7. Footer / Page stamps and signatures
  const pagesCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pagesCount; i++) {
    doc.setPage(i);
    doc.setFillColor(26, 43, 76);
    doc.rect(0, 287, 210, 10, 'F'); // Navy blue footer strip

    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Ajanta Construction Company Store Automation Center | Page ${i} of ${pagesCount}`, 14, 292);
    doc.text('This is an automatic audit record. No hand signature required.', 130, 292);
  }

  // Save/Download Action using modern safe anchor click to avoid iframe sandbox downloads limitation
  const filename = `Ajanta_InventoryReport_${reportType}_${selectedItemCode}_${now.toISOString().split('T')[0]}.pdf`;
  const blob = doc.output('blob');
  const blobURL = URL.createObjectURL(blob);

  // Trigger download automatically
  try {
    const link = document.createElement('a');
    link.href = blobURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.warn('Anchor link download failed', err);
    try {
      doc.save(filename);
    } catch (err2) {
      console.error('doc.save also failed', err2);
    }
  }

  return { blob, blobURL, filename };
}
