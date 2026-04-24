import React from 'react';
import { 
  Zap, ChevronRight, Lock, FileText, PieChart, Package, ShieldCheck, AlertTriangle 
} from 'lucide-react';
import { getItemTotal, getItemUnitRate } from '../../utils/pricing';
import { formatReportNumber, getReportItemDescription, getReportItemQuantity } from '../../utils/reportRows';

const ReportViewer = ({ 
  activeReport, 
  projectInfo, 
  boqData, 
  summaryData, 
  ipcStats, 
  materialData, 
  projectSummary, 
  isGeneratingSummary 
}) => {
  const projectRegion = projectInfo?.region || 'Lagos';
  
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
              {section.items.map((item, iidx) => {
                const rate = getItemUnitRate(item, projectRegion);
                const total = getItemTotal(item, projectRegion);

                return (
                  <tr key={iidx}>
                    <td>{iidx + 1}</td>
                    <td className="text-left">{getReportItemDescription(item)}</td>
                    <td>{item.unit}</td>
                    <td>{formatReportNumber(getReportItemQuantity(item))}</td>
                    <td>{formatReportNumber(rate)}</td>
                    <td>{formatReportNumber(total)}</td>
                  </tr>
                );
              })}
              <tr className="subtotal-row">
                <td colSpan="5">SUBTOTAL</td>
                <td>{section.items.reduce((acc, i) => acc + getItemTotal(i, projectRegion), 0).toLocaleString()}</td>
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
    const voItems = boqData.flatMap((section) =>
      (section.items || [])
        .filter((item) => item.isVO)
        .map((item) => ({
          ...item,
          rate: getItemUnitRate(item, projectRegion)
        }))
    );

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
                <td className="text-bold">{getReportItemDescription(item)}</td>
                <td>{item.unit}</td>
                <td>{formatReportNumber(getReportItemQuantity(item))}</td>
                <td>{formatReportNumber(item.rate)}</td>
                <td className="text-right">₦{formatReportNumber(getReportItemQuantity(item) * item.rate)}</td>
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
    <div className="preview-canvas">
      {activeReport === 'boq' && renderBOQReport()}
      {activeReport === 'summary' && renderSummaryReport()}
      {activeReport === 'materials' && renderMaterialSchedule()}
      {activeReport === 'ipc' && renderIPC()}
      {activeReport === 'variations' && renderVariationSummary()}
    </div>
  );
};

export default ReportViewer;
