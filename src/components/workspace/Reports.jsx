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
  Mail as MailIcon
} from 'lucide-react';
import { hasFeature, PLAN_NAMES } from '../../data/plans';
import { sendReportEmail } from '../../utils/mailService';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { generateProjectSummary } from '../../utils/aiService';

const Reports = ({ user, projects, activeProjectId, onUpgrade }) => {
  const [activeReport, setActiveReport] = useState(null);
  const [projectSummary, setProjectSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

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
    const worksheet = workbook.addWorksheet('BOQ Report');

    worksheet.columns = [
      { header: 'Item', key: 'id', width: 10 },
      { header: 'Description', key: 'desc', width: 50 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Qty', key: 'qty', width: 15 },
      { header: 'Rate (₦)', key: 'rate', width: 15 },
      { header: 'Total (₦)', key: 'total', width: 15 },
    ];

    boqData.forEach(section => {
      worksheet.addRow({ desc: section.title }).font = { bold: true };
      section.items.forEach((item, idx) => {
        worksheet.addRow({
          id: idx + 1,
          desc: item.description,
          unit: item.unit,
          qty: item.qty,
          rate: item.useBenchmark ? item.benchmark : item.rate,
          total: item.total
        });
      });
      worksheet.addRow({ desc: `Subtotal ${section.title}`, total: section.items.reduce((acc, i) => acc + i.total, 0) }).font = { italic: true };
    });

    worksheet.getColumn('desc').alignment = { wrapText: true };
    worksheet.addRow({});
    const totalRow = worksheet.addRow({ desc: 'GRAND TOTAL', total: calculateGrandTotal() });
    totalRow.font = { bold: true, size: 12 };
    totalRow.getCell('total').numFmt = '"₦"#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${projectInfo.title}_BOQ.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
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
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 'auto' },
        5: { fontStyle: 'bold', halign: 'right' }
      },
      styles: { fontSize: 8, font: 'helvetica' }
    });

    // Branding Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Generated via BOQ Pro Enterprise - Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    }

    doc.save(`${projectInfo.title}_BOQ.pdf`);
  };

  const handleEmailReport = async () => {
    const clientEmail = prompt('Enter client email address:');
    if (!clientEmail) return;

    const success = await sendReportEmail(clientEmail, {
      name: projectInfo.title,
      totalValue: calculateGrandTotal()
    });

    if (success) {
      alert(`Report successfully emailed to ${clientEmail}`);
    } else {
      alert('Failed to send email. Please ensure your API key is set in Settings.');
    }
  };

  const renderSelectionScreen = () => (
    <div className="selection-screen">
      <div className="report-header-text">
        <h2>Document Generation Center</h2>
        <p>Prepare consultant-grade, audit-ready documents for official submission.</p>
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
              <button className="btn-secondary" onClick={handleEmailReport}>
                <MailIcon size={16} /> Email to Client
              </button>
              <button className="btn-primary-action" onClick={handleExportPDF}>
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
          </div>
        </div>
      )}

      <style jsx="true">{`
        .reporting-workspace {
          padding-top: 1rem;
        }

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
      `}</style>
    </div>
  );
};

export default Reports;
