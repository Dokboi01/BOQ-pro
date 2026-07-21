import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { getItemTotal, getItemUnitRate } from './pricing';
import {
  formatReportNumber,
  getReportItemDescription,
  getReportItemQuantity,
  getSafeReportFileName
} from './reportRows';
import { convertNgnToProjectCurrency, formatProjectCurrency, getProjectCurrencySymbol } from './currency';

const getProjectRegion = (projectInfo) => projectInfo?.region || 'Lagos';

const getSectionTotal = (section, region) => {
  return (section?.items || []).reduce((acc, item) => acc + getItemTotal(item, region), 0);
};

const getGrandTotal = (boqData, region) => {
  return (boqData || []).reduce((acc, section) => acc + getSectionTotal(section, region), 0);
};

const toDisplayString = (value, fallback) => String(value || fallback);

const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
};

const buildProjectMeta = (projectInfo, boqData) => {
  const region = getProjectRegion(projectInfo);
  return {
    region,
    // grandTotal (and every rate/total computed from pricing.js) is always in
    // NGN -- the benchmark/pricing engine's source of truth. Convert with
    // convertNgnToProjectCurrency / formatProjectCurrency at the point of
    // display, never upstream of this.
    grandTotal: getGrandTotal(boqData, region),
    currencySymbol: getProjectCurrencySymbol(projectInfo),
    title: toDisplayString(projectInfo?.title, 'Untitled Project'),
    client: toDisplayString(projectInfo?.client, 'Private Client'),
    location: toDisplayString(projectInfo?.location, region),
    date: toDisplayString(projectInfo?.date, new Date().toLocaleDateString()),
    reference: toDisplayString(projectInfo?.ref, 'N/A'),
    notes: toDisplayString(projectInfo?.notes, 'No generic notes provided.'),
    assumptions: toDisplayString(projectInfo?.assumptions, 'No specific assumptions.'),
    preparedBy: toDisplayString(projectInfo?.preparedBy, 'Quantra Professional'),
    checkedBy: toDisplayString(projectInfo?.checkedBy, 'Senior QA/QC'),
  };
};

export const exportToExcel = async (projectInfo, boqData, isUnpriced) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('BEME Report');
  const meta = buildProjectMeta(projectInfo, boqData);

  worksheet.columns = [
    { key: 'item', width: 8 },
    { key: 'desc', width: 60 },
    { key: 'unit', width: 10 },
    { key: 'qty', width: 15 },
    { key: 'rate', width: 18 },
    { key: 'total', width: 20 },
  ];

  worksheet.mergeCells('A1:F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'BILL OF ENGINEERING MEASUREMENT AND EVALUATION (BEME)';
  titleCell.font = { name: 'Arial Black', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells('A2:F2');
  const projectCell = worksheet.getCell('A2');
  projectCell.value = `PROJECT: ${meta.title.toUpperCase()}`;
  projectCell.font = { bold: true, size: 11 };
  projectCell.alignment = { horizontal: 'left' };

  worksheet.mergeCells('A3:F3');
  worksheet.getCell('A3').value = `CLIENT: ${meta.client}`;

  worksheet.mergeCells('A4:F4');
  worksheet.getCell('A4').value = `LOCATION: ${meta.location} | DATE: ${meta.date}`;
  worksheet.getRow(4).border = { bottom: { style: 'medium' } };

  const headerRow = worksheet.addRow(['ITEM', 'DESCRIPTION OF WORK', 'UNIT', 'QTY', `RATE (${meta.currencySymbol})`, `AMOUNT (${meta.currencySymbol})`]);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  (boqData || []).forEach((section, sectionIndex) => {
    const sectionCode = String.fromCharCode(65 + sectionIndex);
    const sectionTitle = toDisplayString(section?.title, 'Untitled Section').toUpperCase();
    const sectionRow = worksheet.addRow([sectionCode, sectionTitle]);
    sectionRow.font = { bold: true };
    sectionRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    (section.items || []).forEach((item, itemIndex) => {
      const rate = convertNgnToProjectCurrency(getItemUnitRate(item, meta.region), projectInfo);
      const total = convertNgnToProjectCurrency(getItemTotal(item, meta.region), projectInfo);
      const row = worksheet.addRow([
        itemIndex + 1,
        getReportItemDescription(item),
        item.unit,
        getReportItemQuantity(item),
        isUnpriced ? '' : rate,
        isUnpriced ? '' : total
      ]);

      row.getCell(2).alignment = { wrapText: true, vertical: 'middle' };
      row.getCell(4).numFmt = '#,##0.00';
      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '#,##0.00';
      row.eachCell((cell) => {
        cell.border = { top: { style: 'hair' }, left: { style: 'thin' }, bottom: { style: 'hair' }, right: { style: 'thin' } };
      });
    });

    const sectionTotal = convertNgnToProjectCurrency(getSectionTotal(section, meta.region), projectInfo);
    const subtotalRow = worksheet.addRow(['', `TOTAL FOR ${sectionTitle}`, '', '', '', isUnpriced ? '' : sectionTotal]);
    subtotalRow.font = { bold: true, italic: true };
    if (!isUnpriced) {
      subtotalRow.getCell(6).numFmt = `"${meta.currencySymbol}"#,##0.00`;
      subtotalRow.getCell(6).border = { bottom: { style: 'medium' } };
    }
  });

  worksheet.addRow([]);
  const grandRow = worksheet.addRow(['', 'GRAND TOTAL (CARRIED TO TENDER)', '', '', '', isUnpriced ? '' : convertNgnToProjectCurrency(meta.grandTotal, projectInfo)]);
  grandRow.height = 25;
  grandRow.font = { bold: true, size: 12 };
  if (!isUnpriced) {
    grandRow.getCell(6).numFmt = `"${meta.currencySymbol}"#,##0.00`;
    grandRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
  }

  worksheet.addRow([]);
  const notesTitleRow = worksheet.addRow(['', 'PROJECT NOTES & ASSUMPTIONS']);
  notesTitleRow.font = { bold: true, underline: true };
  worksheet.addRow(['', meta.notes]);
  worksheet.addRow(['', meta.assumptions]);
  worksheet.addRow([]);

  worksheet.addRow([]);
  worksheet.addRow(['', '_________________________', '', '', '', '_________________________']);
  const labelRow = worksheet.addRow(['', `PREPARED BY: ${meta.preparedBy.toUpperCase()}`, '', '', '', `CHECKED BY: ${meta.checkedBy.toUpperCase()}`]);
  labelRow.font = { size: 9, bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `${getSafeReportFileName(meta.title)}_BEME.xlsx`);
};

export const exportToPDF = (projectInfo, boqData, isUnpriced) => {
  const doc = new jsPDF();
  const meta = buildProjectMeta(projectInfo, boqData);
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 6, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Quantra ENTERPRISE', margin, 25);
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
  doc.text('BILL OF ENGINEERING MEASUREMENT & EVALUATION (BEME)', margin, 95);

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
  doc.text(meta.title.toUpperCase(), margin + 10, boxY + 21);
  doc.setFontSize(8);
  doc.text('CLIENT / EMPLOYER', margin + 10, boxY + 33);
  doc.setFontSize(11);
  doc.text(meta.client, margin + 10, boxY + 41);
  doc.text('LOCATION', margin + 10, boxY + 53);
  doc.setFontSize(10);
  doc.text(meta.location, margin + 10, boxY + 60);

  const rightCol = pageWidth / 2 + 10;
  doc.setFontSize(8);
  doc.text('REFERENCE NO.', rightCol, boxY + 53);
  doc.setFontSize(10);
  doc.text(meta.reference, rightCol, boxY + 60);

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
  doc.text(meta.preparedBy, margin, prepY + 18);
  doc.setFont('helvetica', 'bold');
  doc.text('DATE OF ISSUE', rightCol, prepY + 10);
  doc.setFontSize(11);
  doc.text(meta.date, rightCol, prepY + 18);

  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('DETAILED BILL OF QUANTITIES', pageWidth / 2, 20, { align: 'center' });

  const tableData = [];
  (boqData || []).forEach((section, sectionIndex) => {
    const sectionCode = String.fromCharCode(65 + sectionIndex);
    tableData.push([
      { content: sectionCode, styles: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249] } },
      { content: toDisplayString(section?.title, 'Untitled Section').toUpperCase(), colSpan: 5, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
    ]);

    (section.items || []).forEach((item, itemIndex) => {
      const rate = convertNgnToProjectCurrency(getItemUnitRate(item, meta.region), projectInfo);
      const total = convertNgnToProjectCurrency(getItemTotal(item, meta.region), projectInfo);
      tableData.push([
        { content: `${sectionCode}.${itemIndex + 1}`, styles: { halign: 'center', fontSize: 7 } },
        getReportItemDescription(item),
        item.unit,
        formatReportNumber(getReportItemQuantity(item), { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        isUnpriced ? '-' : formatReportNumber(rate, { minimumFractionDigits: 2 }),
        isUnpriced ? '-' : formatReportNumber(total, { minimumFractionDigits: 2 })
      ]);
    });

    const sectionTotal = getSectionTotal(section, meta.region);
    tableData.push([
      { content: '', styles: { fillColor: [255, 255, 255] } },
      { content: `Sub-Total: ${toDisplayString(section?.title, 'Untitled Section')}`, colSpan: 4, styles: { fontStyle: 'bolditalic', halign: 'right', fillColor: [255, 255, 255] } },
      { content: isUnpriced ? '-' : formatProjectCurrency(sectionTotal, projectInfo), styles: { fontStyle: 'bold', fillColor: [255, 255, 255] } }
    ]);
  });

  autoTable(doc, {
    startY: 36,
    head: [['ITEM', 'DESCRIPTION OF WORK', 'UNIT', 'QTY', `RATE (${meta.currencySymbol})`, `AMOUNT (${meta.currencySymbol})`]],
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
      doc.text(`Quantra ENTERPRISE | ${meta.reference} | ${meta.date}`, margin, pageHeight - 8);
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }
  });

  doc.addPage();
  doc.setFontSize(16);
  doc.text('SUMMARY OF COLLECTIONS', pageWidth / 2, 22, { align: 'center' });
  const summaryRows = (boqData || []).map((section, sectionIndex) => {
    const sectionTotal = getSectionTotal(section, meta.region);
    return [
      String.fromCharCode(65 + sectionIndex),
      toDisplayString(section?.title, 'Untitled Section').toUpperCase(),
      (section.items || []).length,
      isUnpriced ? '-' : formatProjectCurrency(sectionTotal, projectInfo)
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [['REF', 'ELEMENT / SECTION DESCRIPTION', 'ITEMS', `AMOUNT (${meta.currencySymbol})`]],
    body: summaryRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold', cellPadding: 5 },
    columnStyles: { 0: { cellWidth: 18, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 50, halign: 'right' } },
    styles: { cellPadding: 6, fontSize: 9 }
  });

  const sumFinalY = (doc.lastAutoTable?.finalY || 40) + 5;
  if (!isUnpriced) {
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, sumFinalY, contentWidth, 18, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL ESTIMATED CONTRACT SUM (CARRIED TO FORM OF TENDER)', margin + 8, sumFinalY + 12);
    doc.text(formatProjectCurrency(meta.grandTotal, projectInfo), pageWidth - margin - 8, sumFinalY + 12, { align: 'right' });
  }

  doc.addPage();
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('PROJECT NOTES & ASSUMPTIONS', pageWidth / 2, 22, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text('NOTES:', margin, 40);
  doc.text(doc.splitTextToSize(meta.notes, contentWidth), margin, 48);

  const notesHeight = doc.getTextDimensions(doc.splitTextToSize(meta.notes || 'N/A', contentWidth)).h;
  doc.text('ASSUMPTIONS & EXCLUSIONS:', margin, 55 + notesHeight);
  doc.text(doc.splitTextToSize(meta.assumptions, contentWidth), margin, 63 + notesHeight);

  doc.addPage();
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('FORM OF CERTIFICATION', pageWidth / 2, 22, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text('I/We certify that the rates and prices in this Bill of Quantities have been determined in accordance with professional engineering and estimating standards, based on the conditions and scope communicated.', margin, 45, { maxWidth: contentWidth });

  doc.setDrawColor(15, 23, 42);
  doc.line(margin, 100, margin + 60, 100);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED BY', margin, 105);
  doc.setFont('helvetica', 'normal');
  doc.text(meta.preparedBy, margin, 110);

  doc.line(pageWidth - margin - 60, 100, pageWidth - margin, 100);
  doc.setFont('helvetica', 'bold');
  doc.text('CHECKED BY', pageWidth - margin - 60, 105);
  doc.setFont('helvetica', 'normal');
  doc.text(meta.checkedBy, pageWidth - margin - 60, 110);
  doc.save(`${getSafeReportFileName(meta.title)}_BEME.pdf`);
};

export const exportMaterialsToPDF = (projectInfo, materialData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const title = toDisplayString(projectInfo?.title, 'Untitled Project');

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text('MATERIAL REQUIREMENT SCHEDULE', margin, 48);

  const tableRows = (materialData || []).map((material, index) => [
    index + 1,
    material.item,
    material.unit,
    Number(material.totalQty || 0).toLocaleString(),
    material.usage
  ]);

  autoTable(doc, {
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
  doc.text(`TOTAL UNIQUE MATERIALS: ${(materialData || []).length}`, margin + 8, finalY + 9);
  doc.save(`${getSafeReportFileName(title)}_Material_Schedule.pdf`);
};
