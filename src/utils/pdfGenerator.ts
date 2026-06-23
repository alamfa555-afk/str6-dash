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
  selectedWarehouseFilter?: string; // Opt warehouse filter
}

function drawAjantaLogo(doc: jsPDF, x: number, y: number, scale = 0.58) {
  // Save current colors
  const prevDrawColor = doc.getDrawColor();
  const prevFillColor = doc.getFillColor();

  // Draw an elegant circular shield background for the logo
  doc.setFillColor(235, 245, 255);
  doc.ellipse(x + 10.5 * scale, y + 7.5 * scale, 14 * scale, 11 * scale, 'F');
  
  // Highlight border for the logo shield
  doc.setDrawColor(242, 114, 21);
  doc.setLineWidth(0.3 * scale);
  doc.ellipse(x + 10.5 * scale, y + 7.5 * scale, 14 * scale, 11 * scale, 'S');

  // Left Leg: Grey (Concrete texture theme) - Split into two triangles
  doc.setFillColor(150, 155, 160);
  doc.triangle(x + 9 * scale, y, x + 12.5 * scale, y, x + 5 * scale, y + 15 * scale, 'F');
  doc.triangle(x + 9 * scale, y, x + 5 * scale, y + 15 * scale, x, y + 15 * scale, 'F');

  // Right Leg: Dark Navy Blue - Split into two triangles
  doc.setFillColor(26, 43, 76);
  doc.triangle(x + 12.5 * scale, y, x + 16 * scale, y, x + 21 * scale, y + 15 * scale, 'F');
  doc.triangle(x + 12.5 * scale, y, x + 21 * scale, y + 15 * scale, x + 15 * scale, y + 15 * scale, 'F');

  // Crossbar Belt: Orange - Split into two triangles
  doc.setFillColor(242, 114, 21);
  doc.triangle(x + 5.5 * scale, y + 9.5 * scale, x + 18 * scale, y + 9.5 * scale, x + 19 * scale, y + 12 * scale, 'F');
  doc.triangle(x + 5.5 * scale, y + 9.5 * scale, x + 19 * scale, y + 12 * scale, x + 4.5 * scale, y + 12 * scale, 'F');

  // White Belt Buckle outer frame
  doc.setFillColor(255, 255, 255);
  doc.rect(x + 13.5 * scale, y + 10 * scale, 2.5 * scale, 1.6 * scale, 'F');
  
  // Tiny orange center of buckle
  doc.setFillColor(242, 114, 21);
  doc.rect(x + 14.3 * scale, y + 10.4 * scale, 0.9 * scale, 0.8 * scale, 'F');

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
  selectedWarehouseFilter,
}: PDFRequest): { blob: Blob; blobURL: string; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const now = new Date();
  const todayStr = now.toLocaleDateString('en-GB');
  const timeStr = now.toLocaleTimeString('en-GB');

  const warehouseFilter = selectedWarehouseFilter || 'all';

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

  // Filter issue and receipt transactions based on time range AND warehouse filter
  const filteredIssues = issues.filter((issue) => {
    const issueDate = new Date(issue.issuedAt);
    const dateOk = issueDate >= startDateLimit;
    const warehouseOk = warehouseFilter === 'all' || issue.warehouse === warehouseFilter;
    return dateOk && warehouseOk;
  });

  const filteredReceives = receives.filter((rec) => {
    const recDate = new Date(rec.receivedAt);
    const dateOk = recDate >= startDateLimit;
    const warehouseOk = warehouseFilter === 'all' || rec.warehouse === warehouseFilter;
    return dateOk && warehouseOk;
  });

  // Calculate dynamic current quantities for each item
  const initialFilteredItems = selectedItemCode === 'all'
    ? items
    : items.filter((item) => item.itemCode === selectedItemCode);

  const processedRows = initialFilteredItems.map((item) => {
    // Current stock calculations (all-time, subject to warehouse)
    const itemReceived = receives
      .filter((r) => r.itemCode === item.itemCode && (warehouseFilter === 'all' || r.warehouse === warehouseFilter))
      .reduce((sum, r) => sum + Number(r.quantity || 0), 0);

    const itemIssued = issues
      .filter((i) => i.itemCode === item.itemCode && (warehouseFilter === 'all' || i.warehouse === warehouseFilter))
      .reduce((sum, i) => sum + Number(i.quantity || 0), 0);

    const itemWarehouse = item.warehouse || 'Main Warehouse';
    const isMatchingWarehouse = warehouseFilter === 'all' || warehouseFilter === itemWarehouse;

    const initQty = isMatchingWarehouse ? Number(item.initialQty || 0) : 0;
    const dmg = isMatchingWarehouse ? Number(item.damagedQty || 0) : 0;
    const rej = isMatchingWarehouse ? Number(item.rejectedQty || 0) : 0;
    const exp = isMatchingWarehouse ? Number(item.expiredQty || 0) : 0;

    const currentStock = Math.max(0, initQty + itemReceived - itemIssued - dmg - rej - exp);
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

    const hasActivityInWarehouse = itemReceived > 0 || itemIssued > 0 || initQty > 0;

    return {
      item,
      itemReceived,
      itemIssued,
      periodReceived,
      periodIssued,
      initQty,
      currentStock,
      stockVal,
      statusText,
      hasActivityInWarehouse
    };
  });

  // Filter items in the PDF table for warehouse relevance (if filtered)
  const finalRows = processedRows.filter((row) => {
    if (warehouseFilter !== 'all') {
      return row.hasActivityInWarehouse || row.currentStock > 0;
    }
    return true;
  });

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
  const margin = 19.05; // 0.75 inch (19.05 mm) narrow margin on all sides
  const rightMarginX = 210 - margin;
  const primaryColor: [number, number, number] = [26, 43, 76]; // Matching the Navy Indigo of Ajanta Logo
  const secondaryColor = [31, 41, 55]; // Gray-800

  // 2. Add Executive Header Block (Ajanta Construction Company Letterhead)
  // Draw Logo Vector (compact scale 0.58 used by default, positioned higher at y=7)
  drawAjantaLogo(doc, margin, 7);

  // Logo Typography Text next to compact logo
  doc.setTextColor(26, 43, 76);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('AJANTA', margin + 17, 11);

  doc.setTextColor(242, 114, 21);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CONSTRUCTION COMPANY', margin + 17, 14.8);

  doc.setTextColor(115, 125, 135);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('STRENGTH  •  TRUST  •  INNOVATION', margin + 17, 17.8);

  // Decorative Accent line separating letterhead (scaled down and shifted up)
  doc.setFillColor(242, 114, 21); // Orange
  doc.rect(margin, 20.5, 210 - 2 * margin, 0.6, 'F');

  // 3. Document Metadata Block
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFontSize(10.5);
  doc.setFont('Helvetica', 'bold');
  doc.text(reportTitleMap[reportType], margin, 27);

  doc.setFont('Helvetica', 'oblique');
  doc.setFontSize(8);
  doc.text(reportSubtitleMap[reportType], margin, 30.5);

  // Meta parameters (Right-aligned using rightMarginX and alignment option)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Report Generation Details:', rightMarginX, 27, { align: 'right' });
  doc.setFont('Helvetica', 'normal');
  doc.text(`Date & Time: ${todayStr} ${timeStr}`, rightMarginX, 30.5, { align: 'right' });
  doc.text(`Generated By: ${generatedBy}`, rightMarginX, 34, { align: 'right' });
  doc.text(`Warehouse: ${warehouseFilter === 'all' ? 'All' : warehouseFilter} | Item: ${selectedItemCode === 'all' ? 'All' : selectedItemCode}`, rightMarginX, 37.5, { align: 'right' });
  doc.text(`Period Limit: ${reportType === 'all' ? 'All-Time' : `Since ${startDateLimit.toLocaleDateString()}`}`, rightMarginX, 41, { align: 'right' });

  // 4. Quick Summary Overview stats cards computed precisely from finalRows
  let totalUniqueItems = finalRows.length;
  let totalCurrentVal = finalRows.reduce((sum, row) => sum + row.stockVal, 0);
  let lowStockAlertCount = finalRows.filter((row) => row.currentStock > 0 && row.currentStock <= 10).length;
  let totalIssuedQtyInPeriod = 0;

  filteredIssues.forEach((issue) => {
    if (selectedItemCode === 'all' || issue.itemCode === selectedItemCode) {
      totalIssuedQtyInPeriod += issue.quantity;
    }
  });

  // Table summary box (shifted up significantly from startY: 66 to startY: 44.5)
  autoTable(doc, {
    startY: 44.5,
    head: [['Stats Metric', 'Value', 'Description']],
    body: [
      ['Total Items Listed', String(totalUniqueItems), 'Registered items matching chosen filters'],
      ['Total Stock Valuation (SAR)', `SAR ${totalCurrentVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Net worth of stock held in store'],
      ['Low Stock Items Count (<=10)', String(lowStockAlertCount), 'Items demanding reorder/purchase refills'],
      [`Total Released Quantity (${reportType})`, String(totalIssuedQtyInPeriod), `Sum of units issued during this ${reportType} period`]
    ],
    theme: 'grid',
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [74, 85, 104], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { cellWidth: 40 },
      2: { textColor: [100, 116, 139] }
    }
  });

  // 5. Stock Balance Table
  const lastY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. STOCK INVENTORY BALANCE STATUS', margin, lastY);

  const itemRows = finalRows.map((row, index) => {
    const { item, itemReceived, itemIssued, periodReceived, periodIssued, initQty, currentStock, stockVal, statusText } = row;
    return [
      String(index + 1),
      item.itemCode,
      `${item.description} (${item.department || 'Civil'})`,
      item.unit,
      `SAR ${item.pricePerUnit.toFixed(2)}`,
      String(initQty),
      `+${itemReceived} (${periodReceived} in period)`,
      `-${itemIssued} (${periodIssued} in period)`,
      String(currentStock),
      `SAR ${stockVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      statusText
    ];
  });

  const totalOpening = finalRows.reduce((acc, r) => acc + Number(r.initQty || 0), 0);
  const totalReceived = finalRows.reduce((acc, r) => acc + Number(r.itemReceived || 0), 0);
  const totalIssued = finalRows.reduce((acc, r) => acc + Number(r.itemIssued || 0), 0);
  const totalCurrentStock = finalRows.reduce((acc, r) => acc + Number(r.currentStock || 0), 0);
  const totalValue = finalRows.reduce((acc, r) => acc + Number(r.stockVal || 0), 0);

  autoTable(doc, {
    startY: lastY + 3,
    head: [['#', 'Item Code', 'Description', 'Unit', 'Price/Unit', 'Opening', 'Total Recv', 'Total Isd', 'Current Stock', 'Total Value', 'Status']],
    body: itemRows,
    foot: [[
      'Total',
      '',
      'Overall Stock Balance',
      '',
      '',
      String(totalOpening),
      String(totalReceived),
      String(totalIssued),
      String(totalCurrentStock),
      `SAR ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ''
    ]],
    theme: 'striped',
    margin: { left: margin, right: margin },
    headStyles: { fillColor: primaryColor, textColor: 255 },
    footStyles: { fillColor: [74, 85, 104], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 5 },
      1: { fontStyle: 'bold', cellWidth: 18 },
      2: { cellWidth: 32 },
      3: { cellWidth: 10 },
      4: { cellWidth: 18 },
      5: { cellWidth: 12 },
      6: { cellWidth: 18 },
      7: { cellWidth: 18 },
      8: { fontStyle: 'bold', cellWidth: 14 },
      9: { cellWidth: 20 },
      10: { fontStyle: 'bold', cellWidth: 17 }
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
  doc.text('2. STOCK RELEASE & ISSUE REPORT LOGS', margin, activeY);

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
      [
        is.remark,
        is.withdrawReceiptNo ? `WR-No: ${is.withdrawReceiptNo}` : null,
        is.mdrNo ? `MDR-No: ${is.mdrNo}` : null
      ].filter(Boolean).join(' | ') || '-'
    ];
  });

  if (issueRows.length === 0) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`No stock issue entries found during selected period range: [${reportType.toUpperCase()}]`, margin, activeY + 6);
  } else {
    const totalIssuedQuantity = displayIssueList.reduce((acc, is) => acc + Number(is.quantity || 0), 0);

    autoTable(doc, {
      startY: activeY + 3,
      head: [['#', 'Item Code', 'Description', 'Issued To / Receiver', 'Dept', 'Qty', 'Date Issued', 'Issued By (ID)', 'Issue Remarks']],
      body: issueRows,
      foot: [[
        'Total',
        '',
        'Overall Qty Released',
        '',
        '',
        String(totalIssuedQuantity),
        '',
        '',
        ''
      ]],
      theme: 'grid',
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [43, 108, 176], textColor: 255 }, // Dark Blue for transaction listings
      footStyles: { fillColor: [55, 75, 110], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 5 },
        1: { fontStyle: 'bold', cellWidth: 18 },
        2: { cellWidth: 26 },
        3: { cellWidth: 26 },
        4: { fontStyle: 'bold', cellWidth: 12 },
        5: { fontStyle: 'bold', cellWidth: 10 },
        6: { cellWidth: 24 },
        7: { cellWidth: 24 },
        8: { cellWidth: 26 }
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
    doc.text(`Ajanta Construction Company Store Automation Center | Page ${i} of ${pagesCount}`, margin, 292);
    doc.text('This is an automatic audit record. No hand signature required.', rightMarginX, 292, { align: 'right' });
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
