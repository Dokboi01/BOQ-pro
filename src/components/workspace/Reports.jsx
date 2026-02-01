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
  ExternalLink
} from 'lucide-react';

const Reports = () => {
  const [activeReport, setActiveReport] = useState(null); // null, 'boq', 'summary', 'materials'

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
    title: 'Trans-Sahara Highway Expansion',
    phase: 'Phase 1 - Section 4',
    ref: 'TS-HWY/2026/04/D',
    client: 'Ministry of Works & Infrastructure',
    location: 'Lagos - Algiers Sector',
    preparedBy: 'BOQ Pro Professional',
    date: 'January 28, 2026'
  };

  const boqData = [
    {
      section: 'A. PRELIMINARIES',
      items: [
        { id: '1.1', desc: 'Project Signboard with project details', unit: 'Nr', qty: 2, rate: 1500, total: 3000 },
        { id: '1.2', desc: 'Temporary Site Office for Consultant and Site Staff', unit: 'Sum', qty: 1, rate: 25000, total: 25000 },
        { id: '1.3', desc: 'Mobilization and Demobilization of plant and equipment', unit: 'Sum', qty: 1, rate: 15000, total: 15000 }
      ],
      subtotal: 43000
    },
    {
      section: 'B. EARTHWORKS & EXCAVATION',
      items: [
        { id: '2.1', desc: 'Excavation in trench not exceeding 1.5m deep for drainage lines', unit: 'm3', qty: 450, rate: 45, total: 20250 },
        { id: '2.2', desc: 'Cart away surplus material to designated site 5km from project', unit: 'm3', qty: 320, rate: 12, total: 3840 },
        { id: '2.3', desc: 'Compaction of sub-base material to 98% Proctor density', unit: 'm2', qty: 1200, rate: 8.50, total: 10200 }
      ],
      subtotal: 34290
    }
  ];

  const summaryData = {
    total: 248500000,
    breakdown: [
      { label: 'A. Preliminaries', amt: 43000, percent: 0.02 },
      { label: 'B. Earthworks & Excavation', amt: 34290, percent: 0.015 },
      { label: 'C. Surface Dressing & Asphalt', amt: 145000000, percent: 58.35 },
      { label: 'D. Concrete Structures & Bridges', amt: 85000000, percent: 34.21 },
      { label: 'E. Signage & Safety Equipment', amt: 18422710, percent: 7.41 }
    ]
  };

  const materialData = [
    { item: 'OPC Cement (50kg)', unit: 'Bag', totalQty: 12500, usage: 'Sections B, C, D' },
    { item: 'Deformed Steel Bar (12mm)', unit: 'Ton', totalQty: 450, usage: 'Sections C, D' },
    { item: 'Sharp Sand (Clean)', unit: 'Ton', totalQty: 2800, usage: 'All Sections' },
    { item: 'Crushed Granite (Mix)', unit: 'Ton', totalQty: 4200, usage: 'Sections C, D' },
    { item: 'Bitumen (Cold Mix)', unit: 'Drum', totalQty: 120, usage: 'Section C' }
  ];

  const handlePrint = () => {
    window.print();
  };

  const renderSelectionScreen = () => (
    <div className="selection-screen">
      <div className="report-header-text">
        <h2>Document Generation Center</h2>
        <p>Prepare consultant-grade, audit-ready documents for official submission.</p>
      </div>

      <div className="selection-grid">
        {reports.map((report) => (
          <div
            key={report.id}
            className="report-selection-card enterprise-card"
            onClick={() => setActiveReport(report.id)}
          >
            <div className="card-top">
              <div className="icon-box"><report.icon size={24} /></div>
              <span className="type-badge">{report.tag}</span>
            </div>
            <h3>{report.title}</h3>
            <p>{report.description}</p>
            <div className="card-footer">
              <span>View Preview</span>
              <ChevronRight size={16} />
            </div>
          </div>
        ))}
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
                <td colSpan="6" className="font-bold">{section.section}</td>
              </tr>
              {section.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td className="text-left">{item.desc}</td>
                  <td>{item.unit}</td>
                  <td>{item.qty.toLocaleString()}</td>
                  <td>{item.rate.toLocaleString()}</td>
                  <td>{item.total.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="subtotal-row">
                <td colSpan="5">SUBTOTAL {section.section.split('.')[0]}</td>
                <td>{section.subtotal.toLocaleString()}</td>
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
              <button className="btn-secondary" onClick={() => alert('Exporting as CSV...')}>
                <FileSpreadsheet size={16} /> Export to Excel
              </button>
              <button className="btn-primary-action" onClick={handlePrint}>
                <Printer size={16} /> Generate Consultant-Ready Document
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
      `}</style>
    </div>
  );
};

export default Reports;
