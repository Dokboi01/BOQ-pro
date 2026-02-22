import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  FileSpreadsheet,
  PieChart,
  Package,
  ExternalLink,
  Lock,
  Mail as MailIcon,
  ShieldCheck,
  AlertTriangle,
  History,
  TrendingUp,
  Landmark,
  Zap
} from 'lucide-react';
import { hasFeature, PLAN_NAMES } from '../../data/plans';
import { sendReportEmail } from '../../utils/mailService';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { generateProjectSummary, getRegionalModifier } from '../../utils/aiService';

const Reports = ({ user, projects, activeProjectId, onUpgrade }) => {
  const [activeReport, setActiveReport] = useState(null);
  const [projectSummary, setProjectSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailConfig, setEmailConfig] = useState({ recipient: '', includePDF: true, includeExcel: false });
  const [isSending, setIsSending] = useState(false);
  const [isUnpriced, setIsUnpriced] = useState(false);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const reports = [
    {
      id: 'boq',
      title: 'Detailed Bill of Quantities',
      description: 'The standard engineering document for tender and valuation purposes. Includes itemized sections with automatic numbering.',
      icon: FileText,
      tag: 'Main Document'
    },
    {
      id: 'summary',
      title: 'Executive Cost Summary',
      description: 'A higher-level financial overview for stakeholders and clients. Focuses on cost distribution and final contract sums.',
      icon: PieChart,
      tag: 'Management'
    },
    {
      id: 'materials',
      title: 'Material Requirement Schedule',
      description: 'Aggregated list of all materials across all segments. Essential for site procurement and logistics planning.',
      icon: Package,
      tag: 'Operations'
    },
    {
      id: 'ipc',
      title: 'Interim Payment Certificate',
      description: 'Formal financial certification of work completed. Calculates retention, advance recoveries, and net amount due.',
      icon: ShieldCheck,
      tag: 'Post-Contract',
      isPremium: true
    },
    {
      id: 'variations',
      title: 'Variation Order Summary',
      description: 'Tracks all additions and omissions to the original contract sum. Essential for final account reconciliation.',
      icon: AlertTriangle,
      tag: 'Post-Contract',
      isPremium: true
    }
  ];

  // Mock data for project info (linked to current highway context)
  const projectInfo = {
    title: activeProject?.name || 'Untitled Project',
    phase: activeProject?.type || 'General',
    ref: activeProject?.id ? `BOQ-${activeProject.id}` : 'N/A',
    client: user?.organization || 'Private Client',
    location: 'Lagos - Algiers Sector',
    preparedBy: user?.full_name || 'BOQ Pro Professional',
    date: activeProject?.date || new Date().toLocaleDateString()
  };

  const boqData = React.useMemo(() => activeProject?.sections || [], [activeProject]);

  const calculateGrandTotal = React.useCallback(() => {
    return boqData.reduce((acc, section) => {
      return acc + (section.items || []).reduce((itemAcc, item) => itemAcc + (item.total || 0), 0);
    }, 0);
  }, [boqData]);

  const summaryData = React.useMemo(() => {
    const total = calculateGrandTotal();
    return {
      total: total,
      breakdown: boqData.map(section => {
        const amt = (section.items || []).reduce((acc, item) => acc + (item.total || 0), 0);
        return {
          label: section.title,
          amt: amt,
          percent: total > 0 ? (amt / total) * 100 : 0
        };
      })
    };
  }, [boqData, calculateGrandTotal]);

  const ipcStats = React.useMemo(() => {
    let grossWorkDone = 0;
    let voTotal = 0;

    boqData.forEach(section => {
      section.items.forEach(item => {
        const rate = (item.useBenchmark ? (item.benchmark * getRegionalModifier(activeProject?.region || 'Lagos')) : item.rate);
        grossWorkDone += (item.qtyCompleted || 0) * rate;
        if (item.isVO) {
          voTotal += (item.qty * rate);
        }
      });
    });

    const contractSum = calculateGrandTotal();
    const retentionPercent = 0.05;
    const retentionAmt = grossWorkDone * retentionPercent;
    const netWorkDone = grossWorkDone - retentionAmt;
    const advanceRecovery = grossWorkDone > (contractSum * 0.1) ? (grossWorkDone * 0.05) : 0;
    const totalDue = netWorkDone - advanceRecovery;

    return {
      contractSum,
      grossWorkDone,
      voTotal,
      retentionAmt,
      netWorkDone,
      advanceRecovery,
      totalDue,
      progressPercent: contractSum > 0 ? (grossWorkDone / contractSum) * 100 : 0
    };
  }, [boqData, activeProject, calculateGrandTotal]);

  const materialData = React.useMemo(() => {
    const agg = {};
    boqData.forEach(section => {
      section.items.forEach(item => {
        if (item.breakdown?.materials) {
          item.breakdown.materials.forEach(mat => {
            const key = mat.name;
            if (!agg[key]) {
              agg[key] = { item: mat.name, unit: mat.unit, totalQty: 0, usage: [] };
            }
            // Quantity in breakdown is per unit of item. So total mat qty = item.qty * mat.qty
            agg[key].totalQty += (item.qty * mat.qty);
            if (!agg[key].usage.includes(section.title)) {
              agg[key].usage.push(section.title);
            }
          });
        }
      });
    });
    return Object.values(agg).map(m => ({
      ...m,
      usage: m.usage.join(', ')
    }));
  }, [boqData]);

  const handlePrint = () => {
    window.print();
  };

  React.useEffect(() => {
    if (activeReport === 'summary' && !projectSummary) {
      const fetchSummary = async () => {
        setIsGeneratingSummary(true);
        const summ = await generateProjectSummary({
          name: projectInfo.title,
          totalValue: summaryData.total,
          sections: boqData
        });
        setProjectSummary(summ);
        setIsGeneratingSummary(false);
      };
      fetchSummary();
    }
  }, [activeReport, projectSummary, projectInfo.title, summaryData.total, boqData]);

  const handleExportExcel = async () => {
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

    // --- 7. EXPORT ---
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${projectInfo.title.replace(/\s+/g, '_')}_BEME.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    // ══════════════════════════════════════════════════════
    //  PAGE 1: PROFESSIONAL COVER PAGE
    // ══════════════════════════════════════════════════════

    // Top accent line
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 6, 'F');

    // Company branding area
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('BOQ PRO ENTERPRISE', margin, 25);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Digital Engineering Standards Platform', margin, 31);

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, 38, pageWidth - margin, 38);

    // Main title block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(15, 23, 42);
    doc.text('BILL OF', margin, 70);
    doc.text('QUANTITIES', margin, 82);

    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text('BILL OF ENGINEERING MEASUREMENT & EVALUATION (BEME)', margin, 95);

    // Project details box
    const boxY = 115;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, boxY, contentWidth, 70, 3, 3, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);

    const labelX = margin + 10;
    const valX = margin + 10;

    doc.text('PROJECT TITLE', labelX, boxY + 12);
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(projectInfo.title.toUpperCase(), valX, boxY + 21);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('CLIENT / EMPLOYER', labelX, boxY + 33);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(projectInfo.client, valX, boxY + 41);

    // Two-column details
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('LOCATION', labelX, boxY + 53);
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(projectInfo.location, valX, boxY + 60);

    const rightCol = pageWidth / 2 + 10;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('REFERENCE NO.', rightCol, boxY + 53);
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(projectInfo.ref, rightCol, boxY + 60);

    // Status badges
    const badgeY = boxY + 85;
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, badgeY, 55, 10, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(isUnpriced ? 'UNPRICED DOCUMENT' : 'PRICED DOCUMENT', margin + 5, badgeY + 7);

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(margin + 60, badgeY, 45, 10, 2, 2, 'F');
    doc.text('FOR TENDER', margin + 65, badgeY + 7);

    // Prepared by section (bottom of cover)
    const prepY = pageHeight - 60;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, prepY, pageWidth - margin, prepY);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('PREPARED BY', margin, prepY + 10);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(projectInfo.preparedBy, margin, prepY + 18);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Registered Quantity Surveyor', margin, prepY + 24);

    doc.setFont('helvetica', 'bold');
    doc.text('DATE OF ISSUE', rightCol, prepY + 10);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(projectInfo.date, rightCol, prepY + 18);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Phase: ${projectInfo.phase}`, rightCol, prepY + 24);

    // CONFIDENTIAL watermark (diagonal, faint)
    doc.setFontSize(60);
    doc.setTextColor(240, 240, 240);
    doc.setFont('helvetica', 'bold');
    doc.text('CONFIDENTIAL', pageWidth / 2, pageHeight / 2 + 30, { angle: 45, align: 'center' });

    // ══════════════════════════════════════════════════════
    //  PAGE 2+: DETAILED BILL OF QUANTITIES TABLE
    // ══════════════════════════════════════════════════════
    doc.addPage();

    // Page header for BOQ
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('DETAILED BILL OF QUANTITIES', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Project: ${projectInfo.title}  |  Ref: ${projectInfo.ref}`, pageWidth / 2, 27, { align: 'center' });

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1);
    doc.line(margin, 31, pageWidth - margin, 31);

    // Build table data
    const tableData = [];
    boqData.forEach((section, sIdx) => {
      // Section Header Row
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

      // Section Sub-total
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
      columnStyles: {
        0: { cellWidth: 16, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 22, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 32, halign: 'right' }
      },
      styles: { fontSize: 7.5, font: 'helvetica', cellPadding: 3, lineColor: [226, 232, 240] },
      alternateRowStyles: { fillColor: [252, 252, 253] },
      didDrawPage: () => {
        // Header on every page
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, pageWidth, 3, 'F');

        // Footer on every page
        const pageNum = doc.internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text(`BOQ PRO ENTERPRISE  •  ${projectInfo.ref}  •  ${projectInfo.date}`, margin, pageHeight - 8);
        doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
      }
    });

    // ══════════════════════════════════════════════════════
    //  SUMMARY OF COLLECTIONS PAGE
    // ══════════════════════════════════════════════════════
    doc.addPage();

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('SUMMARY OF COLLECTIONS', pageWidth / 2, 22, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Carried from Detailed Bill of Quantities`, pageWidth / 2, 29, { align: 'center' });

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1);
    doc.line(margin, 33, pageWidth - margin, 33);

    const summaryRows = boqData.map((section, idx) => {
      const sTotal = section.items.reduce((acc, i) => acc + (i.total || 0), 0);
      return [
        String.fromCharCode(65 + idx),
        section.title.toUpperCase(),
        section.items.length,
        isUnpriced ? '-' : `₦${sTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      ];
    });

    doc.autoTable({
      startY: 40,
      head: [['REF', 'ELEMENT / SECTION DESCRIPTION', 'ITEMS', 'AMOUNT (₦)']],
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold', cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
      },
      styles: { cellPadding: 6, fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    const sumFinalY = doc.lastAutoTable.finalY + 5;

    // Grand Total highlight box
    if (!isUnpriced) {
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(margin, sumFinalY, contentWidth, 18, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('TOTAL ESTIMATED CONTRACT SUM (CARRIED TO FORM OF TENDER)', margin + 8, sumFinalY + 12);
      doc.setFontSize(12);
      doc.text(`₦${calculateGrandTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - margin - 8, sumFinalY + 12, { align: 'right' });
    }

    // ══════════════════════════════════════════════════════
    //  RATE ANALYSIS SUMMARY PAGE
    // ══════════════════════════════════════════════════════
    // Aggregate materials, labour, plant from all items with breakdowns
    let totalMaterials = 0, totalLabour = 0, totalPlant = 0;
    let hasBreakdowns = false;

    boqData.forEach(section => {
      section.items.forEach(item => {
        if (item.breakdown) {
          hasBreakdowns = true;
          const bd = item.breakdown;
          if (bd.materials) bd.materials.forEach(m => { totalMaterials += (m.qty || 0) * (m.rate || 0) * (item.qty || 1); });
          if (bd.labor) bd.labor.forEach(l => { totalLabour += (l.qty || 0) * (l.rate || 0) * (item.qty || 1); });
          if (bd.plant) bd.plant.forEach(p => { totalPlant += (p.qty || 0) * (p.rate || 0) * (item.qty || 1); });
        }
      });
    });

    if (hasBreakdowns && !isUnpriced) {
      doc.addPage();

      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('RATE ANALYSIS SUMMARY', pageWidth / 2, 22, { align: 'center' });

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Aggregate Cost Breakdown by Category', pageWidth / 2, 29, { align: 'center' });

      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(1);
      doc.line(margin, 33, pageWidth - margin, 33);

      const directTotal = totalMaterials + totalLabour + totalPlant;
      const overheadAmount = directTotal * 0.15;
      const profitAmount = directTotal * 0.10;
      const allInTotal = directTotal + overheadAmount + profitAmount;

      const rateRows = [
        ['A', 'MATERIAL COSTS', `₦${totalMaterials.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, directTotal > 0 ? `${((totalMaterials / directTotal) * 100).toFixed(1)}%` : '0%'],
        ['B', 'LABOUR COSTS', `₦${totalLabour.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, directTotal > 0 ? `${((totalLabour / directTotal) * 100).toFixed(1)}%` : '0%'],
        ['C', 'PLANT & EQUIPMENT', `₦${totalPlant.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, directTotal > 0 ? `${((totalPlant / directTotal) * 100).toFixed(1)}%` : '0%'],
      ];

      doc.autoTable({
        startY: 40,
        head: [['REF', 'COST CATEGORY', 'AMOUNT (₦)', 'DISTRIBUTION']],
        body: rateRows,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold', cellPadding: 5 },
        columnStyles: {
          0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 'auto', fontStyle: 'bold' },
          2: { cellWidth: 55, halign: 'right' },
          3: { cellWidth: 35, halign: 'center' }
        },
        styles: { cellPadding: 6, fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      const rateFinalY = doc.lastAutoTable.finalY + 5;

      // Sub-totals
      const subHeaders = [
        ['', 'DIRECT COST SUB-TOTAL', `₦${directTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, ''],
        ['D', 'OVERHEADS (15%)', `₦${overheadAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, ''],
        ['E', 'PROFIT & MARGIN (10%)', `₦${profitAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, ''],
      ];

      doc.autoTable({
        startY: rateFinalY,
        body: subHeaders,
        theme: 'plain',
        columnStyles: {
          0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 'auto', fontStyle: 'bold' },
          2: { cellWidth: 55, halign: 'right', fontStyle: 'bold' },
          3: { cellWidth: 35 }
        },
        styles: { cellPadding: 4, fontSize: 9 }
      });

      const rateFinalY2 = doc.lastAutoTable.finalY + 5;

      // All-in total
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(margin, rateFinalY2, contentWidth, 18, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('ALL-IN RATE ANALYSIS TOTAL', margin + 8, rateFinalY2 + 12);
      doc.setFontSize(12);
      doc.text(`₦${allInTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - margin - 8, rateFinalY2 + 12, { align: 'right' });

      // Disclaimer
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'italic');
      doc.text('Note: Rate analysis is based on individual item breakdowns. Overhead and profit percentages are applied to direct costs.', margin, rateFinalY2 + 30);
    }

    // ══════════════════════════════════════════════════════
    //  FINAL PAGE: SIGNATURE & CERTIFICATION
    // ══════════════════════════════════════════════════════
    doc.addPage();

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('FORM OF CERTIFICATION', pageWidth / 2, 22, { align: 'center' });

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1);
    doc.line(margin, 28, pageWidth - margin, 28);

    // Certification text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const certText = `I/We certify that the rates and prices in this Bill of Quantities have been determined in accordance with professional standards and represent a fair and reasonable assessment of the cost of the works described herein.`;
    doc.text(certText, margin, 45, { maxWidth: contentWidth });

    const certText2 = `This document has been prepared using BOQ Pro Enterprise digital engineering standards. All quantities are subject to site measurement and verification. Rates are based on current market conditions as at the date of issue.`;
    doc.text(certText2, margin, 68, { maxWidth: contentWidth });

    // Signature Block 1 - QS
    const sig1Y = 100;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, sig1Y, contentWidth / 2 - 10, 55, 3, 3, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('PREPARED BY', margin + 8, sig1Y + 10);

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(margin + 8, sig1Y + 30, margin + contentWidth / 2 - 18, sig1Y + 30);

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(projectInfo.preparedBy, margin + 8, sig1Y + 37);

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Registered Quantity Surveyor (NIQS)', margin + 8, sig1Y + 43);
    doc.text(`Date: ${projectInfo.date}`, margin + 8, sig1Y + 49);

    // Signature Block 2 - Client
    const sig2X = pageWidth / 2 + 5;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(sig2X, sig1Y, contentWidth / 2 - 10, 55, 3, 3, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('FOR THE CLIENT / EMPLOYER', sig2X + 8, sig1Y + 10);

    doc.line(sig2X + 8, sig1Y + 30, pageWidth - margin - 8, sig1Y + 30);

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(projectInfo.client, sig2X + 8, sig1Y + 37);

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorised Signatory', sig2X + 8, sig1Y + 43);
    doc.text('Date: ............................', sig2X + 8, sig1Y + 49);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`BOQ PRO ENTERPRISE  •  ${projectInfo.ref}  •  ${projectInfo.date}`, margin, pageHeight - 8);
    doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 8, { align: 'right' });

    // ═══ SAVE ═══
    doc.save(`${projectInfo.title.replace(/\s+/g, '_')}_BEME.pdf`);
  };

  const handleExportMaterialsPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    // Top accent line
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 6, 'F');

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('BOQ PRO ENTERPRISE', margin, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Digital Engineering Standards Platform', margin, 26);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, 32, pageWidth - margin, 32);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text('MATERIAL REQUIREMENT SCHEDULE', margin, 48);

    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.text('Aggregated Procurement & Logistics Planning', margin, 56);

    // Project details
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Project: ${projectInfo.title}  |  Ref: ${projectInfo.ref}  |  Date: ${projectInfo.date}`, margin, 66);

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1);
    doc.line(margin, 70, pageWidth - margin, 70);

    // Build table
    const matRows = materialData.map((mat, i) => [
      i + 1,
      mat.item,
      mat.unit,
      mat.totalQty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      mat.usage
    ]);

    doc.autoTable({
      startY: 76,
      head: [['SN', 'MATERIAL DESCRIPTION', 'UNIT', 'TOTAL QTY', 'PROJECT USAGE SEGMENTS']],
      body: matRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold', halign: 'center', cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 'auto', fontStyle: 'bold' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 55 }
      },
      styles: { fontSize: 7.5, font: 'helvetica', cellPadding: 3, lineColor: [226, 232, 240] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: () => {
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, pageWidth, 3, 'F');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text(`BOQ PRO ENTERPRISE  •  ${projectInfo.ref}  •  Material Schedule`, margin, pageHeight - 8);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
      }
    });

    const finalY = doc.lastAutoTable.finalY + 8;

    // Summary box
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, finalY, contentWidth, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`TOTAL UNIQUE MATERIALS: ${materialData.length}`, margin + 8, finalY + 9);
    doc.text(`SECTIONS COVERED: ${boqData.length}`, pageWidth - margin - 8, finalY + 9, { align: 'right' });

    // Logistics note
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.text('Note: Quantities are aggregated from individual BOQ item rate breakdowns. Site conditions may require quantity adjustments.', margin, finalY + 26);
    doc.text('Coordinate bulk delivery logistics with Ministry of Works representative for heavy-duty axle permits.', margin, finalY + 32);

    doc.save(`${projectInfo.title.replace(/\s+/g, '_')}_Material_Schedule.pdf`);
  };

  const handleEmailReport = async () => {
    setIsSending(true);
    try {
      const attachments = [];

      if (emailConfig.includePDF) {
        const doc = new jsPDF();
        // Recalculate same as handleExportPDF for consistency
        doc.setFontSize(20);
        doc.text('BILL OF QUANTITIES', 105, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Project: ${projectInfo.title}`, 14, 25);
        doc.text(`Client: ${projectInfo.client}`, 14, 30);
        doc.text(`Date: ${projectInfo.date}`, 14, 35);

        const tableData = [];
        boqData.forEach(section => {
          tableData.push([{ content: section.title, colSpan: 6, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
          section.items.forEach((item, idx) => {
            tableData.push([
              idx + 1,
              item.description,
              item.unit,
              item.qty.toLocaleString(),
              (item.useBenchmark ? item.benchmark : item.rate).toLocaleString(),
              item.total.toLocaleString()
            ]);
          });
        });

        tableData.push([{ content: 'GRAND TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `₦${calculateGrandTotal().toLocaleString()}`, styles: { fontStyle: 'bold' } }]);

        doc.autoTable({
          startY: 40,
          head: [['Item', 'Description', 'Unit', 'Qty', 'Rate', 'Total']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 15 }, 5: { fontStyle: 'bold', halign: 'right' } },
          styles: { fontSize: 8 }
        });

        const pdfBase64 = doc.output('datauristring').split(',')[1];
        attachments.push({
          filename: `${projectInfo.title}_BOQ.pdf`,
          content: pdfBase64
        });
      }

      if (emailConfig.includeExcel) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('BOQ Report');
        // Simple excel gen for attachment
        worksheet.addRow(['Description', 'Unit', 'Qty', 'Rate', 'Total']).font = { bold: true };
        boqData.forEach(s => {
          worksheet.addRow([s.title]).font = { bold: true };
          s.items.forEach(i => worksheet.addRow([i.description, i.unit, i.qty, i.rate, i.total]));
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const excelBase64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        attachments.push({
          filename: `${projectInfo.title}_BOQ.xlsx`,
          content: excelBase64
        });
      }

      const success = await sendReportEmail(emailConfig.recipient, {
        name: projectInfo.title,
        totalValue: calculateGrandTotal()
      }, attachments);

      if (success) {
        alert(`Report successfully emailed to ${emailConfig.recipient}`);
        setIsEmailModalOpen(false);
      } else {
        alert('Failed to send email. Check your Resend API key in Settings.');
      }
    } catch (error) {
      console.error('Email error:', error);
      alert('An error occurred while preparing the email.');
    } finally {
      setIsSending(false);
    }
  };

  const renderSelectionScreen = () => (
    <div className="selection-screen">
      <div className="report-header-text">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Document Generation Center</h2>
            <p>Prepare consultant-grade, audit-ready documents for official submission.</p>
          </div>
          <div className="tendering-mode-switch enterprise-card">
            <div className="switch-info">
              <span className="switch-label">TENDERING MODE</span>
              <span className="switch-desc">{isUnpriced ? 'Unpriced - Ready for Bidders' : 'Priced - Consultant View'}</span>
            </div>
            <button
              className={`switch-btn ${isUnpriced ? 'active' : ''}`}
              onClick={() => setIsUnpriced(!isUnpriced)}
            >
              <div className="switch-handle"></div>
            </button>
          </div>
        </div>
      </div>

      <div className="selection-grid">
        {reports.map((report) => {
          const isRestricted = (report.id === 'summary' || report.id === 'materials') && !hasFeature(user?.plan, 'advanced-analysis');

          return (
            <div
              key={report.id}
              className={`report-selection-card enterprise-card ${isRestricted ? 'restricted' : ''}`}
              onClick={isRestricted ? onUpgrade : () => setActiveReport(report.id)}
            >
              <div className="card-top">
                <div className="icon-box"><report.icon size={24} /></div>
                {isRestricted ? (
                  <span className="type-badge premium">Premium</span>
                ) : (
                  <span className="type-badge">{report.tag}</span>
                )}
              </div>
              <h3>{report.title} {isRestricted && <Lock size={16} className="text-subtle ml-2" />}</h3>
              <p>{report.description}</p>
              <div className="card-footer">
                <span>{isRestricted ? 'Upgrade to Unlock' : 'View Preview'}</span>
                <ChevronRight size={16} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderBOQReport = () => (
    <div className="print-document view-fade-in">
      {/* Header Info */}
      <div className="doc-header">
        <div className="doc-meta">
          <div className="client-line">CLIENT: {projectInfo.client}</div>
          <div className="project-line">PROJECT: {projectInfo.title}</div>
          <div className="ref-line">LOCATION: {projectInfo.location} | REF: {projectInfo.ref}</div>
        </div>
        <div className="doc-title-box">
          <h2>BILL OF QUANTITIES</h2>
          <div className="date-line">{projectInfo.date}</div>
        </div>
      </div>

      {/* Main Table */}
      <table className="formal-report-table">
        <thead>
          <tr>
            <th className="w-10">ITEM</th>
            <th>DESCRIPTION OF WORK</th>
            <th className="w-10">UNIT</th>
            <th className="w-15">QTY</th>
            <th className="w-15">RATE (₦)</th>
            <th className="w-15">AMOUNT (₦)</th>
          </tr>
        </thead>
        <tbody>
          {boqData.map((section, sidx) => (
            <React.Fragment key={sidx}>
              <tr className="section-row">
                <td colSpan="6" className="font-bold">{section.title}</td>
              </tr>
              {section.items.map((item, iidx) => (
                <tr key={iidx}>
                  <td>{iidx + 1}</td>
                  <td className="text-left">{item.description}</td>
                  <td>{item.unit}</td>
                  <td>{item.qty.toLocaleString()}</td>
                  <td>{(item.useBenchmark ? item.benchmark : item.rate).toLocaleString()}</td>
                  <td>{item.total.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="subtotal-row">
                <td colSpan="5">SUBTOTAL</td>
                <td>{section.items.reduce((acc, i) => acc + (i.total || 0), 0).toLocaleString()}</td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr className="grand-total-row">
            <td colSpan="5">GRAND SUMMARY (CARRIED TO TENDER)</td>
            <td>₦ {summaryData.total.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <div className="report-signatures">
        <div className="sig-box">
          <div className="sig-line"></div>
          <p>PREPARED BY: {projectInfo.preparedBy}</p>
          <span>Quantity Surveyor (NIQS)</span>
        </div>
        <div className="sig-box">
          <div className="sig-line"></div>
          <p>FOR THE CLIENT: {projectInfo.client}</p>
          <span>Authorized Representative</span>
        </div>
      </div>
    </div>
  );

  const renderVariationSummary = () => {
    const voItems = boqData.flatMap(s => s.items.filter(i => i.isVO));

    return (
      <div className="report-preview-canvas enterprise-card view-fade-in">
        <div className="report-header-premium">
          <div className="header-main">
            <h1 className="report-type-title">VARIATION ORDER (VO) SUMMARY</h1>
            <h2 className="project-title-large">{projectInfo.title}</h2>
          </div>
          <div className="header-meta">
            <div className="meta-item"><span className="label">DATE:</span> <span className="val">{projectInfo.date}</span></div>
            <div className="meta-item"><span className="label">REF:</span> <span className="val">{projectInfo.ref}/VO</span></div>
          </div>
        </div>

        <div className="vo-summary-stats">
          <div className="v-stat-card">
            <span className="v-label">ORIGINAL CONTRACT SUM</span>
            <span className="v-val">₦{ipcStats.contractSum.toLocaleString()}</span>
          </div>
          <div className="v-stat-card highlight">
            <span className="v-label">TOTAL VARIATION VALUE</span>
            <span className="v-val">₦{ipcStats.voTotal.toLocaleString()}</span>
          </div>
        </div>

        <table className="professional-report-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Description of Variation</th>
              <th>Unit</th>
              <th>Qty</th>
              <th>Rate (₦)</th>
              <th>Amount (₦)</th>
            </tr>
          </thead>
          <tbody>
            {voItems.length > 0 ? voItems.map((item, idx) => (
              <tr key={item.id}>
                <td>{idx + 1}</td>
                <td className="text-bold">{item.description}</td>
                <td>{item.unit}</td>
                <td>{item.qty.toLocaleString()}</td>
                <td>{item.rate.toLocaleString()}</td>
                <td className="text-right">₦{(item.qty * item.rate).toLocaleString()}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="text-center p-8 text-subtle">No variation orders recorded for this project.</td>
              </tr>
            )}
          </tbody>
          {voItems.length > 0 && (
            <tfoot>
              <tr className="grand-total-row">
                <td colSpan="5">NET IMPACT OF VARIATIONS</td>
                <td className="text-right">₦{ipcStats.voTotal.toLocaleString()}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  const renderIPC = () => {
    return (
      <div className="report-preview-canvas enterprise-card view-fade-in">
        <div className="ipc-header-premium">
          <div className="certificate-badge">INTERIM PAYMENT CERTIFICATE</div>
          <div className="header-content">
            <div className="client-info">
              <span className="label">CLIENT/EMPLOYER:</span>
              <span className="val-large">{projectInfo.client}</span>
            </div>
            <div className="project-id-box">
              <div className="box-item">
                <span className="label">CERTIFICATE NO:</span>
                <span className="val-bold">01</span>
              </div>
              <div className="box-item">
                <span className="label">DATE:</span>
                <span className="val-bold">{projectInfo.date}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ipc-body">
          <div className="project-context-box">
            <div className="c-item"><span className="l">Project Title:</span> <span className="v">{projectInfo.title}</span></div>
            <div className="c-item"><span className="l">Location:</span> <span className="v">{projectInfo.location}</span></div>
          </div>

          <div className="valuation-breakdown-box">
            <h3 className="section-heading">VALUATION SUMMARY</h3>
            <div className="accounting-table">
              <div className="account-row main">
                <span>1.0 CONTRACT SUM</span>
                <span className="val">₦{ipcStats.contractSum.toLocaleString()}</span>
              </div>
              <div className="account-row divider"></div>
              <div className="account-row indent">
                <span>2.0 Gross Value of Work Done to Date</span>
                <span className="val">₦{ipcStats.grossWorkDone.toLocaleString()}</span>
              </div>
              <div className="account-row indent text-danger">
                <span>3.0 Less Retention (5%)</span>
                <span className="val">(-) ₦{ipcStats.retentionAmt.toLocaleString()}</span>
              </div>
              <div className="account-row indent-2 highlight">
                <span>4.0 NET VALUE OF WORK DONE TO DATE (2.0 - 3.0)</span>
                <span className="val">₦{ipcStats.netWorkDone.toLocaleString()}</span>
              </div>
              <div className="account-row indent text-warning">
                <span>5.0 Less Mobilization Advance Recovery</span>
                <span className="val">(-) ₦{ipcStats.advanceRecovery.toLocaleString()}</span>
              </div>
              <div className="account-row indent">
                <span>6.0 Less Previous Payments (First Cert)</span>
                <span className="val">(-) ₦0.00</span>
              </div>
              <div className="account-row grand-total">
                <div className="total-label-box">
                  <span className="main-label">7.0 TOTAL NET AMOUNT DUE FOR PAYMENT</span>
                  <span className="sub-label">Subject to certification by Consultant Engineer</span>
                </div>
                <span className="total-val">₦{ipcStats.totalDue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="ipc-signature-block">
            <div className="sig-item">
              <div className="sig-line"></div>
              <span>Quantity Surveyor</span>
              <span className="date-sig">{projectInfo.date}</span>
            </div>
            <div className="sig-item">
              <div className="sig-line"></div>
              <span>Consultant Engineer</span>
              <span className="date-sig">....................</span>
            </div>
            <div className="sig-item">
              <div className="sig-line"></div>
              <span>Employer Selection</span>
              <span className="date-sig">....................</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryReport = () => (
    <div className="print-document view-fade-in text-center">
      <div className="doc-header mb-8">
        <h2>EXECUTIVE COST SUMMARY</h2>
        <p className="text-subtle">For Strategic Planning and Financial Review</p>
      </div>

      <div className="project-snapshot enterprise-card mb-8">
        <div className="snap-item">
          <span className="snap-label">Project Valuation</span>
          <span className="snap-val">₦ {summaryData.total.toLocaleString()}</span>
        </div>
        <div className="snap-item">
          <span className="snap-label">Status</span>
          <span className="snap-val text-success">FOR TENDER</span>
        </div>
      </div>

      <table className="formal-report-table summary-table">
        <thead>
          <tr>
            <th>SECTION DESCRIPTION</th>
            <th className="w-20">CONTRACT SUM (₦)</th>
            <th className="w-20">DISTRIBUTION (%)</th>
          </tr>
        </thead>
        <tbody>
          {summaryData.breakdown.map((item, i) => (
            <tr key={i}>
              <td className="text-left">{item.label}</td>
              <td>{item.amt.toLocaleString()}</td>
              <td>{item.percent.toFixed(2)} %</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="grand-total-row">
            <td>TOTAL ESTIMATED CONTRACT SUM</td>
            <td>₦ {summaryData.total.toLocaleString()}</td>
            <td>100.00 %</td>
          </tr>
        </tfoot>
      </table>

      <div className="executive-notes">
        <h4>COMMERCIAL NOTES</h4>
        <p>This estimate is based on Lagos prevailing market rates as of Q1 2026. A 10% contingency has been included for price volatility in steel and bitumen indices.</p>
      </div>

      <div className="ai-executive-summary enterprise-card mt-8 text-left">
        <div className="summary-header">
          <Zap size={16} className="text-accent" />
          <h4>AI EXECUTIVE INSIGHT</h4>
        </div>
        {isGeneratingSummary ? (
          <p className="summary-text animate-pulse">Synthesizing project intelligence...</p>
        ) : (
          <p className="summary-text">{projectSummary}</p>
        )}
      </div>
    </div>
  );

  const renderMaterialSchedule = () => (
    <div className="print-document view-fade-in">
      <div className="doc-header mb-6">
        <h2>MATERIAL REQUIREMENT SCHEDULE</h2>
        <p className="text-subtle">Aggregated Procurement & Logistics Planning</p>
      </div>

      <table className="formal-report-table">
        <thead>
          <tr>
            <th className="w-10">SN</th>
            <th>MATERIAL DESCRIPTION</th>
            <th className="w-15">UNIT</th>
            <th className="w-15">TOTAL QTY</th>
            <th>PROJECT USAGE SEGMENTS</th>
          </tr>
        </thead>
        <tbody>
          {materialData.map((mat, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td className="text-left font-bold">{mat.item}</td>
              <td>{mat.unit}</td>
              <td>{mat.totalQty.toLocaleString()}</td>
              <td className="text-left">{mat.usage}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="logistics-warning">
        <p><strong>Note:</strong> Bulk delivery routes for Section B and C require heavy-duty axle permissions. Coordinate with Ministry of Works logistics representative.</p>
      </div>
    </div>
  );

  return (
    <div className="reporting-workspace">
      {!activeReport ? (
        renderSelectionScreen()
      ) : (
        <div className="report-preview-container">
          <div className="control-toolbar">
            <button className="btn-back" onClick={() => setActiveReport(null)}>
              <ArrowLeft size={16} /> Back to Documents
            </button>
            <div className="toolbar-actions">
              <span className="print-warning">Preview Mode: Use 'Print to PDF' for digital export</span>
              <button className="btn-secondary" onClick={handleExportExcel}>
                <FileSpreadsheet size={16} /> Export to Excel
              </button>
              <button className="btn-secondary" onClick={() => setIsEmailModalOpen(true)}>
                <MailIcon size={16} /> Email to Client
              </button>
              <button className="btn-primary-action" onClick={activeReport === 'materials' ? handleExportMaterialsPDF : handleExportPDF}>
                <Download size={16} /> Export to PDF
              </button>
              <button className="btn-primary-action" onClick={handlePrint}>
                <Printer size={16} /> Print Document
              </button>
            </div>
          </div>

          <div className="preview-canvas">
            {activeReport === 'boq' && renderBOQReport()}
            {activeReport === 'summary' && renderSummaryReport()}
            {activeReport === 'materials' && renderMaterialSchedule()}
            {activeReport === 'ipc' && renderIPC()}
            {activeReport === 'variations' && renderVariationSummary()}
          </div>
        </div>
      )}

      {/* Email Modal */}
      {isEmailModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content email-modal view-fade-in">
            <div className="modal-header">
              <div className="title-with-icon">
                <MailIcon className="text-accent" />
                <h3>Email Professional Report</h3>
              </div>
              <button className="btn-close" onClick={() => setIsEmailModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">Send the project cost breakdown directly to your client's inbox.</p>

              <div className="form-group">
                <label>Recipient Email</label>
                <input
                  type="email"
                  placeholder="client@company.com"
                  className="modal-input"
                  value={emailConfig.recipient}
                  onChange={(e) => setEmailConfig({ ...emailConfig, recipient: e.target.value })}
                />
              </div>

              <div className="attachment-options">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={emailConfig.includePDF}
                    onChange={(e) => setEmailConfig({ ...emailConfig, includePDF: e.target.checked })}
                  />
                  <span>Include Official PDF Report</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={emailConfig.includeExcel}
                    onChange={(e) => setEmailConfig({ ...emailConfig, includeExcel: e.target.checked })}
                  />
                  <span>Include Excel Data Summary</span>
                </label>
              </div>

              <div className="modal-info-box">
                <CheckCircle2 size={14} className="text-success" />
                <span>Reports are generated using your consultant branding.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsEmailModalOpen(false)}>Cancel</button>
              <button
                className="btn-primary-glow"
                onClick={handleEmailReport}
                disabled={isSending || !emailConfig.recipient}
              >
                {isSending ? 'Generating & Sending...' : 'Send Report Now'}
              </button>
            </div>
          </div>
        </div>
      )}


      <style jsx="true">{`
        .reporting-workspace {
          padding-top: 1rem;
        }

        .tendering-mode-switch {
          background: white;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          border-radius: 12px;
          border: 1px solid var(--border-medium);
        }

        .switch-info { display: flex; flex-direction: column; }
        .switch-label { font-size: 0.625rem; font-weight: 800; color: var(--primary-500); letter-spacing: 0.05em; }
        .switch-desc { font-size: 0.75rem; font-weight: 700; color: var(--primary-900); }

        .switch-btn {
          width: 44px;
          height: 22px;
          background: #e2e8f0;
          border-radius: 20px;
          border: none;
          position: relative;
          cursor: pointer;
          transition: all 0.3s;
        }

        .switch-btn.active { background: var(--accent-600); }
        .switch-handle {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .switch-btn.active .switch-handle { left: 24px; }

        .report-header-text {
          margin-bottom: 2.5rem;
        }

        .report-header-text h2 { font-size: 1.75rem; margin-bottom: 0.5rem; }
        .report-header-text p { color: var(--primary-500); font-size: 1rem; }

        .selection-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .report-selection-card {
          padding: 2rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .report-selection-card:hover {
          transform: translateY(-4px);
          border-color: var(--accent-600);
          box-shadow: var(--shadow-lg);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .icon-box {
          padding: 0.75rem;
          background: rgba(37, 99, 235, 0.05);
          color: var(--accent-600);
          border-radius: 8px;
        }

        .type-badge {
          font-size: 0.625rem;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--primary-500);
          border: 1px solid var(--border-light);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .report-selection-card h3 { font-size: 1.125rem; color: var(--primary-900); }
        .report-selection-card p { font-size: 0.8125rem; color: var(--primary-600); line-height: 1.5; flex: 1; }

        .card-footer {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--accent-600);
        }

        .report-selection-card.restricted {
          opacity: 0.8;
          cursor: pointer;
        }
        .report-selection-card.restricted:hover {
          border-color: var(--accent-500);
        }
        .type-badge.premium {
          background: var(--accent-600);
          color: white;
          border: none;
        }
        .ml-2 { margin-left: 0.5rem; }

        /* Preview Area */
        .report-preview-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .control-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 3.5rem;
          background: var(--bg-main);
          padding: 1rem 0;
          z-index: 100;
        }

        .btn-back {
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: var(--primary-600);
          cursor: pointer;
        }

        .btn-back:hover { color: var(--primary-900); }

        .toolbar-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .print-warning {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary-400);
        }

        .btn-secondary {
          background: white;
          border: 1px solid var(--border-medium);
          padding: 0.625rem 1.25rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary-action {
          background: var(--primary-900);
          color: white;
          border: none;
          padding: 0.625rem 1.25rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: var(--shadow-md);
        }

        .preview-canvas {
          background: #e2e8f0;
          padding: 3rem 0;
          display: flex;
          justify-content: center;
          min-height: 1000px;
        }

        .print-document {
          background: white;
          width: 210mm; /* A4 width */
          min-height: 297mm; /* A4 height */
          padding: 25mm;
          box-shadow: 0 0 40px rgba(0,0,0,0.1);
          color: black;
          font-family: serif; /* Classic engineering report feel */
          display: flex;
          flex-direction: column;
        }

        .doc-header {
          border-bottom: 2px solid black;
          padding-bottom: 1.5rem;
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .doc-meta { font-size: 0.75rem; line-height: 1.6; font-weight: bold; }
        .doc-title-box { text-align: right; }
        .doc-title-box h2 { font-size: 1.5rem; margin: 0; text-decoration: underline; }
        .date-line { font-size: 0.8rem; margin-top: 0.25rem; }

        .formal-report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
        }

        .formal-report-table th {
          border-top: 2px solid black;
          border-bottom: 1.5px solid black;
          padding: 0.75rem 0.5rem;
          text-align: center;
          font-weight: 800;
        }

        .formal-report-table td {
          padding: 0.5rem 0.5rem;
          border-bottom: 0.5px solid #eee;
          text-align: center;
        }

        .text-left { text-align: left !important; }
        .font-bold { font-weight: 800; }
        .w-10 { width: 10%; }
        .w-15 { width: 15%; }
        .w-20 { width: 20%; }

        .section-row td {
          background: #fcfcfc;
          padding: 0.75rem 0.5rem;
          border-bottom: 1px solid black;
        }

        .subtotal-row td {
          padding-top: 1rem;
          font-weight: 800;
          text-align: right;
          border-bottom: none;
        }

        .grand-total-row td {
          border-top: 2px solid black;
          border-bottom: 4px double black;
          padding: 1rem 0.5rem;
          font-weight: 900;
          font-size: 1rem;
          text-align: right;
        }

        .report-signatures {
          margin-top: auto;
          padding-top: 4rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
        }

        .sig-box { display: flex; flex-direction: column; gap: 0.25rem; }
        .sig-line { border-bottom: 1px solid black; height: 1.5rem; width: 100%; margin-bottom: 0.5rem; }
        .sig-box p { font-size: 0.75rem; font-weight: 800; margin: 0; }
        .sig-box span { font-size: 0.625rem; font-style: italic; }

        .snap-item { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
        .snap-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
        .snap-val { font-size: 1.5rem; font-weight: 900; }

        .executive-notes, .logistics-warning {
          margin-top: 3rem;
          padding: 1.5rem;
          border-top: 1px solid black;
          font-size: 0.8rem;
          font-style: italic;
        }

        /* Print Media Queries */
        @media print {
          .reporting-workspace { padding: 0 !important; }
          .control-toolbar, .app-container > aside, .topbar, .sticky-summary-bar {
            display: none !important;
          }
          .content-area { padding: 0 !important; overflow: visible !important; }
          .preview-canvas { background: white !important; padding: 0 !important; display: block !important; }
          .print-document {
            width: 100% !important;
            box-shadow: none !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          @page {
            margin: 20mm;
          }
          .section-row {
            break-inside: avoid;
          }
          tr {
            break-inside: avoid;
            break-after: auto;
          }
        }

        .ai-executive-summary {
          padding: 1.5rem;
          background: linear-gradient(to right, #0f172a, #1e293b);
          color: white;
          border: none;
          margin-top: 2rem;
          border-radius: 8px;
        }
        .ai-executive-summary .summary-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .ai-executive-summary h4 {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          margin: 0;
          color: #94a3b8;
          text-decoration: none;
        }
        .ai-executive-summary .summary-text {
          font-size: 0.875rem;
          line-height: 1.6;
          margin: 0;
          font-family: sans-serif;
          color: #e2e8f0;
          text-align: left;
        }
        /* IPC & Variation Report Styles */
        .report-preview-canvas {
          background: white;
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          box-shadow: var(--shadow-2xl);
          color: #0f172a;
          display: flex;
          flex-direction: column;
        }

        .report-header-premium {
          border-bottom: 3px solid var(--primary-900);
          padding-bottom: 2rem;
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .report-type-title {
          font-size: 1.75rem;
          font-weight: 900;
          color: var(--primary-900);
          margin: 0;
          letter-spacing: -0.02em;
        }

        .project-title-large {
          font-size: 1.125rem;
          color: var(--primary-500);
          margin-top: 0.5rem;
        }

        .vo-summary-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .v-stat-card {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .v-stat-card.highlight {
          background: #fef2f2;
          border-color: #fecaca;
        }

        .v-stat-card.highlight .v-val { color: #ef4444; }

        .v-label { font-size: 0.7rem; font-weight: 800; color: var(--primary-400); text-transform: uppercase; }
        .v-val { font-size: 1.5rem; font-weight: 900; color: var(--primary-900); }

        .professional-report-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid var(--primary-900);
        }

        .professional-report-table th {
          background: var(--primary-900);
          color: white;
          padding: 1rem;
          text-align: left;
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .professional-report-table td {
          padding: 1rem;
          border-bottom: 1px solid var(--border-light);
          font-size: 0.875rem;
        }

        /* IPC Specific Styles */
        .ipc-header-premium {
          border: 2px solid var(--primary-900);
          padding: 1.5rem;
          margin-bottom: 2rem;
          background: #f1f5f9;
        }

        .certificate-badge {
          background: var(--primary-900);
          color: white;
          padding: 4px 12px;
          font-size: 0.7rem;
          font-weight: 900;
          width: fit-content;
          margin-bottom: 1rem;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .client-info { display: flex; flex-direction: column; gap: 0.25rem; }
        .project-id-box { display: flex; gap: 2rem; }
        .box-item { display: flex; flex-direction: column; align-items: flex-end; }
        .val-large { font-size: 1.5rem; font-weight: 900; color: var(--primary-900); }
        .val-bold { font-size: 1rem; font-weight: 800; color: var(--primary-900); }

        .project-context-box {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background: white;
          border: 1px solid var(--border-medium);
          margin-bottom: 2rem;
        }

        .project-context-box .c-item { display: flex; gap: 1rem; font-size: 0.8125rem; }
        .project-context-box .l { font-weight: 800; color: var(--primary-500); width: 100px; }
        .project-context-box .v { font-weight: 700; color: var(--primary-900); }

        .accounting-table {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--primary-900);
        }

        .account-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          border-bottom: 1px solid var(--border-light);
        }

        .account-row.main { background: #f8fafc; font-weight: 800; }
        .account-row.indent { padding-left: 3rem; }
        .account-row.indent-2 { padding-left: 4.5rem; }
        .account-row.highlight { background: #f0fdf4; border-top: 1px solid #bbf7d0; border-bottom: 1px solid #bbf7d0; }
        .account-row.grand-total { 
          background: var(--primary-900); 
          color: white; 
          padding: 1.5rem 1rem;
          align-items: center;
          margin-top: 1rem;
        }

        .total-label-box { display: flex; flex-direction: column; }
        .main-label { font-size: 1rem; font-weight: 900; }
        .sub-label { font-size: 0.65rem; color: var(--primary-300); text-transform: uppercase; font-weight: 500; }
        .total-val { font-size: 1.75rem; font-weight: 900; color: var(--accent-400); }

        .ipc-signature-block {
          margin-top: 4rem;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 2rem;
        }

        .sig-item { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
        .sig-line { border-bottom: 1px solid var(--primary-900); width: 100%; height: 2rem; }
        .sig-item span { font-size: 0.75rem; font-weight: 800; color: var(--primary-900); }
        .date-sig { font-size: 0.65rem !important; color: var(--primary-400) !important; font-weight: 500 !important; }

        .text-danger { color: #ef4444 !important; }
        .text-warning { color: #f59e0b !important; }
        .text-bold { font-weight: 800; }
        .text-right { text-align: right !important; }
        .section-heading { font-size: 0.75rem; font-weight: 900; margin-bottom: 1rem; color: var(--primary-400); }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content.email-modal {
          background: white;
          width: 480px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .modal-header {
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-light);
        }

        .title-with-icon {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .title-with-icon h3 { margin: 0; font-size: 1.125rem; }

        .btn-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--primary-400);
          cursor: pointer;
        }

        .modal-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .modal-desc {
          font-size: 0.875rem;
          color: var(--primary-500);
          margin: 0;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary-700);
          text-transform: uppercase;
        }

        .modal-input {
          padding: 0.75rem;
          border: 1px solid var(--border-medium);
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .attachment-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          background: var(--bg-main);
          border-radius: 8px;
        }

        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
        }

        .modal-info-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--primary-500);
        }

        .modal-footer {
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          background: var(--bg-main);
          border-top: 1px solid var(--border-light);
        }

        .btn-primary-glow {
          background: var(--primary-900);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-primary-glow:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default Reports;
