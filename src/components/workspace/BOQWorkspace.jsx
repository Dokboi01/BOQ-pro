import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Calculator,
  ShieldCheck,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import RateAnalysisModal from './RateAnalysisModal';

const BOQWorkspace = ({ project, onUpdate }) => {
  const [sections, setSections] = useState(project?.sections || []);
  const [analyzingItem, setAnalyzingItem] = useState(null);

  const toggleSection = (id) => {
    setSections(sections.map(s => s.id === id ? { ...s, expanded: !s.expanded } : s));
  };

  const handleRateApply = (newRate) => {
    if (analyzingItem) {
      updateItem(analyzingItem.sectionId, analyzingItem.item.id, 'rate', newRate);
      updateItem(analyzingItem.sectionId, analyzingItem.item.id, 'useBenchmark', false);
      setAnalyzingItem(null);
    }
  };

  const updateItem = (sectionId, itemId, field, value) => {
    const updatedSections = sections.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        items: section.items.map(item => {
          if (item.id !== itemId) return item;
          const updatedItem = { ...item, [field]: value };

          // Recalculate total
          const rateToUse = updatedItem.useBenchmark ? updatedItem.benchmark : updatedItem.rate;
          updatedItem.total = updatedItem.qty * rateToUse;

          return updatedItem;
        })
      };
    });

    setSections(updatedSections);
    onUpdate(project.id, updatedSections);
  };

  const calculateGrandTotal = () => {
    return sections.reduce((acc, section) => {
      return acc + section.items.reduce((itemAcc, item) => itemAcc + item.total, 0);
    }, 0);
  };

  const isOutlier = (rate, benchmark) => {
    if (!benchmark) return false;
    const diff = Math.abs(rate - benchmark) / benchmark;
    return diff > 0.2; // 20% deviation
  };

  return (
    <div className="workspace-intelligence-container view-fade-in">
      {/* Intelligence Header Bar */}
      <div className="intelligence-banner enterprise-card">
        <div className="banner-left">
          <ShieldCheck size={20} className="text-success" />
          <div>
            <span className="banner-title">Rate Management Engine</span>
            <p className="banner-subtitle">Synchronized with Q1 2026 Market Intelligence</p>
          </div>
        </div>
        <div className="banner-metrics">
          <div className="b-metric">
            <span className="b-label">BENCHMARK ADOPTION</span>
            <span className="b-val">65%</span>
          </div>
          <div className="b-metric">
            <span className="b-label">PRICE VOLATILITY</span>
            <span className="b-val text-warning">MED</span>
          </div>
        </div>
      </div>

      <div className="workspace-header">
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search project items..." />
        </div>
        <div className="workspace-actions">
          <button className="btn-secondary"><Calculator size={16} /> Rate Analysis</button>
          <button className="btn-secondary"><Download size={16} /> Export Document</button>
          <button className="btn-primary"><Plus size={16} /> New Section</button>
        </div>
      </div>

      <div className="boq-intelligence-table-wrapper enterprise-card">
        <table className="boq-intelligence-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Work Description</th>
              <th style={{ width: '80px' }}>Unit</th>
              <th style={{ width: '80px' }}>Qty</th>
              <th style={{ width: '180px' }}>Rate Strategy</th>
              <th style={{ width: '140px' }}>Rate (₦)</th>
              <th style={{ width: '140px' }}>Total (₦)</th>
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <React.Fragment key={section.id}>
                <tr className="section-header-row" onClick={() => toggleSection(section.id)}>
                  <td colSpan="7">
                    <div className="section-title">
                      {section.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      {section.title}
                    </div>
                  </td>
                  <td className="actions-cell"><MoreVertical size={14} /></td>
                </tr>
                {section.expanded && section.items.map((item, idx) => {
                  const outlier = !item.useBenchmark && isOutlier(item.rate, item.benchmark);
                  return (
                    <tr key={item.id} className={`item-row ${outlier ? 'outlier-warning' : ''}`}>
                      <td className="text-subtle">{idx + 1}</td>
                      <td className="description-cell">
                        {item.description}
                        {outlier && (
                          <div className="outlier-tag">
                            <AlertCircle size={10} /> Significant Variance Detected
                          </div>
                        )}
                      </td>
                      <td>{item.unit}</td>
                      <td>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateItem(section.id, item.id, 'qty', Number(e.target.value))}
                          className="inline-input"
                        />
                      </td>
                      <td>
                        <div className="rate-source-toggle">
                          <button
                            className={`toggle-btn ${!item.useBenchmark ? 'active' : ''}`}
                            onClick={() => updateItem(section.id, item.id, 'useBenchmark', false)}
                          >
                            Custom
                          </button>
                          <button
                            className={`toggle-btn shadow-sm ${item.useBenchmark ? 'active' : ''}`}
                            onClick={() => updateItem(section.id, item.id, 'useBenchmark', true)}
                          >
                            Benchmark
                          </button>
                        </div>
                      </td>
                      <td className="rate-cell">
                        <div className="rate-input-wrapper">
                          <span className="currency-prefix">₦</span>
                          <input
                            type="number"
                            value={item.useBenchmark ? item.benchmark : item.rate}
                            onChange={(e) => updateItem(section.id, item.id, 'rate', Number(e.target.value))}
                            className="inline-input rate-input"
                            disabled={item.useBenchmark}
                          />
                          <button
                            className="btn-analysis-trigger"
                            title="Open Rate Analysis"
                            onClick={() => setAnalyzingItem({ sectionId: section.id, item })}
                          >
                            <Calculator size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="total-cell">₦{item.total.toLocaleString()}</td>
                      <td className="actions-cell">
                        <MoreVertical size={14} />
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="grand-total-row">
              <td colSpan="6">Professional Contract Sum</td>
              <td className="grand-total-value">₦{calculateGrandTotal().toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {analyzingItem && (
        <RateAnalysisModal
          item={analyzingItem.item}
          onClose={() => setAnalyzingItem(null)}
          onSave={handleRateApply}
        />
      )}

      <style jsx="true">{`
        .workspace-intelligence-container {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          height: calc(100vh - 120px);
          overflow-y: auto;
        }

        .intelligence-banner {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
          padding: 1.25rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
        }

        .banner-left { display: flex; align-items: center; gap: 1rem; }
        .banner-title { font-weight: 800; font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.05em; display: block; }
        .banner-subtitle { font-size: 0.75rem; color: rgba(255,255,255,0.6); margin: 0; }

        .banner-metrics { display: flex; gap: 2rem; }
        .b-metric { display: flex; flex-direction: column; align-items: flex-end; }
        .b-label { font-size: 0.625rem; color: rgba(255,255,255,0.5); font-weight: 700; text-transform: uppercase; }
        .b-val { font-size: 1rem; font-weight: 900; color: white; }

        .workspace-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--border-medium);
          width: 300px;
          color: var(--primary-400);
        }

        .search-bar input {
          border: none;
          outline: none;
          font-size: 0.875rem;
          width: 100%;
          color: var(--primary-900);
        }

        .workspace-actions { display: flex; gap: 0.75rem; }

        .boq-intelligence-table-wrapper {
          background: white;
          padding: 0;
          overflow: hidden;
          border-radius: 12px;
        }

        .boq-intelligence-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
        }

        .boq-intelligence-table th {
          background: var(--bg-main);
          padding: 1rem;
          text-align: left;
          color: var(--primary-600);
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.6875rem;
          border-bottom: 2px solid var(--border-medium);
        }

        .section-header-row {
          background: #f8fafc;
          cursor: pointer;
        }

        .section-header-row:hover { background: var(--bg-main); }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          font-weight: 800;
          color: var(--primary-900);
          font-size: 0.75rem;
        }

        .item-row { border-bottom: 1px solid var(--border-light); transition: all 0.2s; }
        .item-row:hover { background: #fbfcfe; }
        .item-row td { padding: 0.75rem 1rem; vertical-align: middle; }

        .description-cell { color: var(--primary-800); font-weight: 500; font-size: 0.8125rem; }
        
        .outlier-warning { background: #fffbeb !important; }
        .outlier-tag { 
          display: inline-flex; 
          align-items: center; 
          gap: 0.25rem; 
          background: #fef3c7; 
          color: #92400e; 
          font-size: 0.625rem; 
          font-weight: 800; 
          padding: 2px 6px; 
          border-radius: 4px;
          margin-top: 0.25rem;
        }

        .inline-input {
          border: 1px solid transparent;
          background: transparent;
          padding: 4px 8px;
          border-radius: 4px;
          width: 100%;
          font-size: 0.8125rem;
          color: var(--primary-900);
          font-weight: 600;
          transition: all 0.2s;
        }

        .inline-input:hover { border-color: var(--border-medium); background: white; }
        .inline-input:focus { border-color: var(--accent-600); background: white; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
        .inline-input:disabled { cursor: not-allowed; color: var(--primary-400); background: transparent; }

        .rate-source-toggle {
          display: flex;
          background: var(--bg-main);
          padding: 2px;
          border-radius: 6px;
          width: fit-content;
        }

        .toggle-btn {
          border: none;
          background: transparent;
          padding: 4px 10px;
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--primary-400);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-btn.active { background: white; color: var(--accent-600); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

        .rate-input-wrapper {
          display: flex;
          align-items: center;
          background: var(--bg-main);
          border-radius: 6px;
          padding-right: 4px;
        }

        .currency-prefix {
          padding-left: 8px;
          color: var(--primary-400);
          font-weight: 700;
          font-size: 0.75rem;
        }

        .btn-analysis-trigger {
          border: none;
          background: transparent;
          color: var(--primary-400);
          padding: 4px;
          cursor: pointer;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .btn-analysis-trigger:hover { background: white; color: var(--accent-600); }

        .total-cell { font-weight: 800; color: var(--primary-900); text-align: right; }
        .grand-total-row { background: var(--primary-900); color: white; }
        .grand-total-row td { padding: 1.5rem 1rem; font-weight: 800; font-size: 1rem; text-align: right; }
        .grand-total-value { color: var(--accent-400); }

        .actions-cell { color: var(--primary-300); cursor: pointer; text-align: center; }
        .actions-cell:hover { color: var(--primary-600); }
      `}</style>
    </div>
  );
};

export default BOQWorkspace;
