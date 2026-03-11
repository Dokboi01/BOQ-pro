import React, { useState } from 'react';

import {
  FileText,
  Download,
  Printer,
  ChevronRight,
  ArrowLeft,
  FileSpreadsheet,
  PieChart,
  Package,
  Lock,
  Zap,
  Share2,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { hasFeature } from '../../data/plans';
import { generateProjectSummary, getRegionalModifier } from '../../utils/aiService';
import { exportToExcel, exportToPDF, exportMaterialsToPDF } from '../../utils/reportExports';
import ShareModal from './ShareModal';
import ReportViewer from './ReportViewer';

const Reports = ({ user, projects, activeProjectId, onUpgrade }) => {

  const [activeReport, setActiveReport] = useState(null);
  const [projectSummary, setProjectSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
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

  const handleExportExcel = () => exportToExcel(projectInfo, boqData, isUnpriced, calculateGrandTotal());
  const handleExportPDF = () => exportToPDF(projectInfo, boqData, isUnpriced, calculateGrandTotal());
  const handleExportMaterialsPDF = () => exportMaterialsToPDF(projectInfo, materialData, boqData);


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
              <button className="btn-secondary" onClick={() => setIsShareModalOpen(true)}>
                <Share2 size={16} /> Share & Send
              </button>
              <button className="btn-primary-action" onClick={activeReport === 'materials' ? handleExportMaterialsPDF : handleExportPDF}>
                <Download size={16} /> Export to PDF
              </button>
              <button className="btn-primary-action" onClick={handlePrint}>
                <Printer size={16} /> Print Document
              </button>
            </div>
          </div>

          <ReportViewer 
            activeReport={activeReport}
            projectInfo={projectInfo}
            boqData={boqData}
            summaryData={summaryData}
            ipcStats={ipcStats}
            materialData={materialData}
            projectSummary={projectSummary}
            isGeneratingSummary={isGeneratingSummary}
          />
        </div>
      )}

      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        projectInfo={projectInfo}
        boqData={boqData}
        calculateGrandTotal={calculateGrandTotal}
      />


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

        /* ── Share Modal ── */
        .modal-content.share-modal {
          background: white;
          width: 520px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.35);
        }

        .share-modal-header {
          padding: 1.5rem 1.5rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .share-title-row {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .share-title-row h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--primary-900);
        }

        .share-subtitle {
          font-size: 0.8125rem;
          color: var(--primary-500);
          margin: 2px 0 0;
        }

        .share-close-btn {
          background: none;
          border: none;
          color: var(--primary-400);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: all 0.15s;
        }

        .share-close-btn:hover {
          background: var(--bg-main);
          color: var(--primary-700);
        }

        /* Quick Share Actions Grid */
        .share-quick-actions {
          display: flex;
          gap: 0.75rem;
          padding: 0 1.5rem;
        }

        .share-action-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 0.75rem;
          background: var(--bg-main);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary-600);
        }

        .share-action-card:hover {
          border-color: var(--accent-400);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .share-action-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .whatsapp-icon {
          background: linear-gradient(135deg, #25d366, #128c7e);
        }

        .copy-icon {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
        }

        .native-icon {
          background: linear-gradient(135deg, #0ea5e9, #0284c7);
        }

        .share-divider {
          display: flex;
          align-items: center;
          margin: 1.25rem 1.5rem;
          color: var(--primary-400);
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .share-divider::before,
        .share-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border-light);
        }

        .share-divider span {
          padding: 0 1rem;
        }

        .share-email-form {
          padding: 0 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--primary-600);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .modal-input {
          padding: 0.75rem;
          border: 1px solid var(--border-medium);
          border-radius: 8px;
          font-size: 0.875rem;
          transition: all 0.15s;
          outline: none;
        }

        .modal-input:focus {
          border-color: var(--accent-500);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .attachment-options {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          padding: 0.875rem;
          background: var(--bg-main);
          border-radius: 8px;
          border: 1px solid var(--border-light);
        }

        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          color: var(--primary-700);
        }

        .checkbox-item input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: var(--accent-600);
        }

        .modal-info-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--primary-500);
        }

        .share-modal-footer {
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          background: var(--bg-main);
          border-top: 1px solid var(--border-light);
        }

        .btn-primary-glow {
          background: var(--primary-900);
          color: white;
          border: none;
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.15s;
        }

        .btn-primary-glow:hover {
          background: var(--accent-600);
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
