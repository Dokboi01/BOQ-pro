import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { getRegionalModifier } from './aiService';

export const exportToExcel = async (projectInfo, boqData, isUnpriced, calculateGrandTotal) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('BEME Report');

  // --- 1. SET COLUMN WIDTHS ---
  worksheet.columns = [
    { key: 'item', width: 8 },
    { key: 'desc', width: 60 },
    { key: 'unit', width: 10 },
    { key: 'qty', width: 15 },
    { key: 'rate', width: 18 },
    { key: 'total', width: 20 },
  ];

  // --- 2. PROFESSIONAL HEADER ---
  worksheet.mergeCells('A1:F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'BILL OF ENGINEERING MEASUREMENT AND EVALUATION (BEME)';
  titleCell.font = { name: 'Arial Black', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Navy
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells('A2:F2');
  const projectCell = worksheet.getCell('A2');
  projectCell.value = `PROJECT: ${projectInfo.title.toUpperCase()}`;
  projectCell.font = { bold: true, size: 11 };
  projectCell.alignment = { horizontal: 'left' };

  worksheet.mergeCells('A3:F3');
  worksheet.getCell('A3').value = `CLIENT: ${projectInfo.client}`;

  worksheet.mergeCells('A4:F4');
  worksheet.getCell('A4').value = `LOCATION: ${projectInfo.location} | DATE: ${projectInfo.date}`;
  worksheet.getRow(4).border = { bottom: { style: 'medium' } };

  // --- 3. TABLE HEADERS ---
  const headerRow = worksheet.addRow(['ITEM', 'DESCRIPTION OF WORK', 'UNIT', 'QTY', 'RATE (N)', 'AMOUNT (N)']);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // --- 4. POPULATE DATA ---
  boqData.forEach((section, sIdx) => {
    // Section Header
    const sRow = worksheet.addRow([String.fromCharCode(65 + sIdx), section.title.toUpperCase()]);
    sRow.font = { bold: true };
    sRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    section.items.forEach((item, idx) => {
      const row = worksheet.addRow([
        idx + 1,
        item.description,
        item.unit,
        item.qty,
        isUnpriced ? '' : (item.useBenchmark ? item.benchmark : item.rate),
        isUnpriced ? '' : item.total
      ]);

      row.getCell(2).alignment = { wrapText: true, vertical: 'middle' };
      row.getCell(4).numFmt = '#,##0.00';
      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '#,##0.00';

      // Borders for all data cells
      row.eachCell((cell) => {
        cell.border = { top: { style: 'hair' }, left: { style: 'thin' }, bottom: { style: 'hair' }, right: { style: 'thin' } };
      });
    });

    // Section Subtotal
    const sectionTotal = section.items.reduce((acc, i) => acc + (i.total || 0), 0);
    const subRow = worksheet.addRow(['', `TOTAL FOR ${section.title.toUpperCase()}`, '', '', '', isUnpriced ? '' : sectionTotal]);
    subRow.font = { bold: true, italic: true };
    if (!isUnpriced) {
      subRow.getCell(6).numFmt = '"N"#,##0.00';
      subRow.getCell(6).border = { bottom: { style: 'medium' } };
    }
  });

  // --- 5. GRAND TOTAL ---
  worksheet.addRow([]); // Empty spacing
  const grandRow = worksheet.addRow(['', 'GRAND TOTAL (CARRIED TO TENDER)', '', '', '', isUnpriced ? '' : calculateGrandTotal()]);
  grandRow.height = 25;
  grandRow.font = { bold: true, size: 12 };
  if (!isUnpriced) {
    grandRow.getCell(6).numFmt = '"N"#,##0.00';
    grandRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } }; // Light Gold/Yellow
  }

  // --- 6. SIGNATURES ---
  worksheet.addRow([]);
  worksheet.addRow(['', '_________________________', '', '', '', '_________________________']);
  const labelRow = worksheet.addRow(['', 'QS PREPARED BY', '', '', '', 'CLIENT AUTHORISED SIGNATORY']);
  labelRow.font = { size: 9, bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${projectInfo.title.replace(/\s+/g, '_')}_BEME.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

export const exportToPDF = (projectInfo, boqData, isUnpriced, calculateGrandTotal) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // PAGE 1: COVER PAGE
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 6, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('BOQ PRO ENTERPRISE', margin, 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Digital Engineering Standards Platform', margin, 31);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, 38, pageWidth - margin, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(15, 23, 42);
  doc.text('BILL OF', margin, 70);
  doc.text('QUANTITIES', margin, 82);
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text('BILL OF ENGINEERING MEASUREMENT \u0026 EVALUATION (BEME)', margin, 95);
  const boxY = 115;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, boxY, contentWidth, 70, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('PROJECT TITLE', margin + 10, boxY + 12);
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(projectInfo.title.toUpperCase(), margin + 10, boxY + 21);
  doc.setFontSize(8);
  doc.text('CLIENT / EMPLOYER', margin + 10, boxY + 33);
  doc.setFontSize(11);
  doc.text(projectInfo.client, margin + 10, boxY + 41);
  doc.text('LOCATION', margin + 10, boxY + 53);
  doc.setFontSize(10);
  doc.text(projectInfo.location, margin + 10, boxY + 60);
  const rightCol = pageWidth / 2 + 10;
  doc.setFontSize(8);
  doc.text('REFERENCE NO.', rightCol, boxY + 53);
  doc.setFontSize(10);
  doc.text(projectInfo.ref, rightCol, boxY + 60);
  const badgeY = boxY + 85;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, badgeY, 55, 10, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(isUnpriced ? 'UNPRICED DOCUMENT' : 'PRICED DOCUMENT', margin + 5, badgeY + 7);
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(margin + 60, badgeY, 45, 10, 2, 2, 'F');
  doc.text('FOR TENDER', margin + 65, badgeY + 7);
  const prepY = pageHeight - 60;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, prepY, pageWidth - margin, prepY);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PREPARED BY', margin, prepY + 10);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(projectInfo.preparedBy, margin, prepY + 18);
  doc.setFont('helvetica', 'bold');
  doc.text('DATE OF ISSUE', rightCol, prepY + 10);
  doc.setFontSize(11);
  doc.text(projectInfo.date, rightCol, prepY + 18);

  // PAGE 2+: TABLE
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('DETAILED BILL OF QUANTITIES', pageWidth / 2, 20, { align: 'center' });
  const tableData = [];
  boqData.forEach((section, sIdx) => {
    tableData.push([
      { content: String.fromCharCode(65 + sIdx), styles: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249] } },
      { content: section.title.toUpperCase(), colSpan: 5, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
    ]);
    section.items.forEach((item, idx) => {
      const rate = item.useBenchmark ? item.benchmark : item.rate;
      tableData.push([
        { content: `${String.fromCharCode(65 + sIdx)}.${idx + 1}`, styles: { halign: 'center', fontSize: 7 } },
        item.description,
        item.unit,
        item.qty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        isUnpriced ? '-' : rate.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        isUnpriced ? '-' : (item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })
      ]);
    });
    const sectionTotal = section.items.reduce((acc, i) => acc + (i.total || 0), 0);
    tableData.push([
      { content: '', styles: { fillColor: [255, 255, 255] } },
      { content: `Sub-Total: ${section.title}`, colSpan: 4, styles: { fontStyle: 'bolditalic', halign: 'right', fillColor: [255, 255, 255] } },
      { content: isUnpriced ? '-' : `₦${sectionTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', fillColor: [255, 255, 255] } }
    ]);
  });

  doc.autoTable({
    startY: 36,
    head: [['ITEM', 'DESCRIPTION OF WORK', 'UNIT', 'QTY', 'RATE (₦)', 'AMOUNT (₦)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold', halign: 'center', cellPadding: 4 },
    columnStyles: { 0: { cellWidth: 16, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 14, halign: 'center' }, 3: { cellWidth: 22, halign: 'right' }, 4: { cellWidth: 28, halign: 'right' }, 5: { cellWidth: 32, halign: 'right' } },
    styles: { fontSize: 7.5, font: 'helvetica', cellPadding: 3, lineColor: [226, 232, 240] },
    alternateRowStyles: { fillColor: [252, 252, 253] },
    didDrawPage: () => {
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 3, 'F');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`BOQ PRO ENTERPRISE  •  ${projectInfo.ref}  •  ${projectInfo.date}`, margin, pageHeight - 8);
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }
  });

  // SUMMARY OF COLLECTIONS
  doc.addPage();
  doc.setFontSize(16);
  doc.text('SUMMARY OF COLLECTIONS', pageWidth / 2, 22, { align: 'center' });
  const summaryRows = boqData.map((section, idx) => {
    const sTotal = section.items.reduce((acc, i) => acc + (i.total || 0), 0);
    return [String.fromCharCode(65 + idx), section.title.toUpperCase(), section.items.length, isUnpriced ? '-' : `₦${sTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` ];
  });
  doc.autoTable({
    startY: 40,
    head: [['REF', 'ELEMENT / SECTION DESCRIPTION', 'ITEMS', 'AMOUNT (₦)']],
    body: summaryRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold', cellPadding: 5 },
    columnStyles: { 0: { cellWidth: 18, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 50, halign: 'right' } },
    styles: { cellPadding: 6, fontSize: 9 }
  });

  const sumFinalY = doc.lastAutoTable.finalY + 5;
  if (!isUnpriced) {
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, sumFinalY, contentWidth, 18, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL ESTIMATED CONTRACT SUM (CARRIED TO FORM OF TENDER)', margin + 8, sumFinalY + 12);
    doc.text(`₦${calculateGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - margin - 8, sumFinalY + 12, { align: 'right' });
  }

  // SIGNATURES
  doc.addPage();
  doc.text('FORM OF CERTIFICATION', pageWidth / 2, 22, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text('I/We certify that the rates and prices in this Bill of Quantities have been determined in accordance with professional standards...', margin, 45, { maxWidth: contentWidth });
  doc.save(`${projectInfo.title.replace(/\s+/g, '_')}_BEME.pdf`);
};

export const exportMaterialsToPDF = (projectInfo, materialData, boqData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text('MATERIAL REQUIREMENT SCHEDULE', margin, 48);

  const tableRows = materialData.map((m, i) => [i + 1, m.item, m.unit, m.totalQty.toLocaleString(), m.usage]);

  doc.autoTable({
    startY: 65,
    head: [['SN', 'MATERIAL DESCRIPTION', 'UNIT', 'TOTAL QTY', 'PROJECT USAGE SEGMENTS']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
    styles: { fontSize: 8 }
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin, finalY, contentWidth, 14, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`TOTAL UNIQUE MATERIALS: ${materialData.length}`, margin + 8, finalY + 9);
  doc.save(`${projectInfo.title.replace(/\s+/g, '_')}_Material_Schedule.pdf`);
};
