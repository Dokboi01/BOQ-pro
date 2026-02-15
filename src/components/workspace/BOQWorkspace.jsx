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
  TrendingDown,
  Zap,
  Globe
} from 'lucide-react';
import RateAnalysisModal from './RateAnalysisModal';
import GeometricCalculator from './GeometricCalculator';
import { calculateResourceRequirement, getRegionalModifier } from '../../utils/aiService';

const SmoothInput = ({ value, onChange, className, disabled, type = "number" }) => {
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
  };

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(type === "number" ? Number(localValue) : localValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  return (
    <input
      type={type}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      disabled={disabled}
    />
  );
};

const BOQWorkspace = ({ project, onUpdate, onAddSection, onExport, onDelete }) => {
  const [sections, setSections] = useState(project?.sections || []);
  const [analyzingItem, setAnalyzingItem] = useState(null);
  const [calculatingQtyForItem, setCalculatingQtyForItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync state with props when project changes
  React.useEffect(() => {
    if (project?.sections) {
      setSections(project.sections);
    }
  }, [project]);

  const toggleSection = (id) => {
    setSections(sections.map(s => s.id === id ? { ...s, expanded: !s.expanded } : s));
  };

  const handleRateApply = (newRate, breakdown) => {
    if (analyzingItem) {
      updateItem(analyzingItem.sectionId, analyzingItem.item.id, 'rate', newRate, breakdown);
      updateItem(analyzingItem.sectionId, analyzingItem.item.id, 'useBenchmark', false);
      setAnalyzingItem(null);
    }
  };

  const updateItem = (sectionId, itemId, field, value, breakdown = null) => {
    const updatedSections = sections.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        items: section.items.map(item => {
          if (item.id !== itemId) return item;
          const updatedItem = { ...item, [field]: value };

          if (breakdown) {
            updatedItem.breakdown = breakdown;
          }

          // Recalculate total
          const rateToUse = updatedItem.useBenchmark ? updatedItem.benchmark : updatedItem.rate;
          updatedItem.total = updatedItem.qty * rateToUse;

          return updatedItem;
        })
      };
    });

    onUpdate(project.id, updatedSections);
  };

  const updateSectionTitle = (sectionId, newTitle) => {
    const updatedSections = sections.map(section => {
      if (section.id !== sectionId) return section;
      return { ...section, title: newTitle };
    });

    setSections(updatedSections);
    onUpdate(project.id, updatedSections);
  };

  const addItemToSection = (sectionId) => {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: 'New Engineering Item',
      unit: 'm³',
      qty: 0,
      rate: 0,
      benchmark: 5000,
      total: 0,
      useBenchmark: true
    };

    const updatedSections = sections.map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, items: [...s.items, newItem] };
    });

    setSections(updatedSections);
    onUpdate(project.id, updatedSections);
  };

  const calculateGrandTotal = React.useMemo(() => {
    return sections.reduce((acc, section) => {
      return acc + section.items.reduce((itemAcc, item) => itemAcc + (item.total || 0), 0);
    }, 0);
  }, [sections]);

  const filteredSections = React.useMemo(() => {
    if (!searchQuery.trim()) return sections;

    const query = searchQuery.toLowerCase();
    return sections.map(section => {
      const filteredItems = section.items.filter(item =>
        item.description.toLowerCase().includes(query) ||
        item.unit.toLowerCase().includes(query)
      );

      if (filteredItems.length > 0 || section.title.toLowerCase().includes(query)) {
        return { ...section, items: filteredItems, expanded: true };
      }
      return null;
    }).filter(Boolean);
  }, [sections, searchQuery]);

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
            <span className="b-label">REGION</span>
            <select
              className="region-select"
              value={project?.region || 'Lagos'}
              onChange={(e) => onUpdate(project.id, sections, e.target.value)}
            >
              <option value="Lagos">Lagos</option>
              <option value="Abuja">Abuja</option>
              <option value="Port_Harcourt">Port Harcourt</option>
              <option value="Ibadan">Ibadan</option>
              <option value="Kano">Kano</option>
            </select>
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
          <input
            type="text"
            placeholder="Search project items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="workspace-actions">
          <button
            className="btn-secondary"
            onClick={() => {
              if (sections.length > 0 && sections[0].items.length > 0) {
                setAnalyzingItem({ sectionId: sections[0].id, item: sections[0].items[0] });
              } else {
                alert('Please add a work item first to use many-factor rate analysis.');
              }
            }}
          >
            <Calculator size={16} /> Rate Analysis
          </button>
          <button className="btn-secondary" onClick={onExport}><Download size={16} /> Export Document</button>
          <button className="btn-primary" onClick={onAddSection}><Plus size={16} /> New Section</button>
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
            {filteredSections.map((section) => (
              <React.Fragment key={section.id}>
                <tr className="section-header-row" onClick={() => toggleSection(section.id)}>
                  <td colSpan="7">
                    <div className="section-title" onClick={(e) => e.stopPropagation()}>
                      {section.expanded ? (
                        <ChevronDown size={14} onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }} style={{ cursor: 'pointer' }} />
                      ) : (
                        <ChevronRight size={14} onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }} style={{ cursor: 'pointer' }} />
                      )}
                      <SmoothInput
                        type="text"
                        value={section.title}
                        onChange={(val) => updateSectionTitle(section.id, val)}
                        className="section-title-input"
                      />
                    </div>
                  </td>
                  <td className="actions-cell">
                    <button className="btn-icon-danger" onClick={(e) => { e.stopPropagation(); onDelete(project.id, section.id); }} title="Delete Section">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
                {section.expanded && (
                  <>
                    {section.items.map((item, idx) => {
                      const outlier = !item.useBenchmark && isOutlier(item.rate, item.benchmark);
                      return (
                        <tr key={item.id} className={`item-row ${outlier ? 'outlier-warning' : ''}`}>
                          <td className="text-subtle">{idx + 1}</td>
                          <td className="description-cell">
                            {item.description}
                            <div className="item-intelligence-tags">
                              {outlier && (
                                <div className="outlier-tag">
                                  <AlertCircle size={10} /> Significant Variance
                                </div>
                              )}
                              {(() => {
                                const resources = calculateResourceRequirement(item.description, item.qty, item.unit);
                                if (resources.length === 0) return null;
                                return (
                                  <div className="resource-tag">
                                    <Zap size={10} className="text-accent" />
                                    {resources.map(r => `${r.qty} ${r.name.split(' ')[0]}`).join(', ')}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                          <td>{item.unit}</td>
                          <td>
                            <div className="qty-input-wrapper">
                              <SmoothInput
                                value={item.qty}
                                onChange={(val) => updateItem(section.id, item.id, 'qty', val)}
                                className="inline-input"
                              />
                              <button
                                className="btn-geo-trigger"
                                onClick={() => setCalculatingQtyForItem({ sectionId: section.id, item })}
                                title="Geometric Takeoff"
                              >
                                <Calculator size={12} />
                              </button>
                            </div>
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
                              <SmoothInput
                                value={(item.useBenchmark ? (item.benchmark * getRegionalModifier(project?.region || 'Lagos')) : item.rate)}
                                onChange={(val) => updateItem(section.id, item.id, 'rate', val)}
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
                          <td className="total-cell">
                            ₦{(item.qty * (item.useBenchmark ? (item.benchmark * getRegionalModifier(project?.region || 'Lagos')) : item.rate)).toLocaleString()}
                          </td>
                          <td className="actions-cell">
                            <button className="btn-icon-danger" onClick={() => onDelete(project.id, section.id, item.id)} title="Delete Item">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="add-item-row">
                      <td colSpan="8">
                        <button className="btn-add-inline" onClick={() => addItemToSection(section.id)}>
                          <Plus size={14} /> Add Work Item to {section.title}
                        </button>
                      </td>
                    </tr>
                  </>
                )}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="grand-total-row">
              <td colSpan="6">Professional Contract Sum</td>
              <td className="grand-total-value">₦{calculateGrandTotal.toLocaleString()}</td>
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

      {calculatingQtyForItem && (
        <GeometricCalculator
          onClose={() => setCalculatingQtyForItem(null)}
          onApply={(newQty) => {
            updateItem(calculatingQtyForItem.sectionId, calculatingQtyForItem.item.id, 'qty', newQty);
            setCalculatingQtyForItem(null);
          }}
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

        .region-select {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
          outline: none;
          cursor: pointer;
        }

        .region-select option {
          background: #0f172a;
          color: white;
        }

        .item-intelligence-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.35rem;
        }

        .resource-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: rgba(59, 130, 246, 0.05);
          color: var(--accent-600);
          font-size: 0.625rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid rgba(59, 130, 246, 0.1);
        }

        .banner-metrics { display: flex; gap: 2rem; }
        .b-metric { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
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
          flex: 1;
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 320px);
          overflow-y: auto;
        }

        .boq-intelligence-table-wrapper::-webkit-scrollbar {
          width: 8px;
        }

        .boq-intelligence-table-wrapper::-webkit-scrollbar-track {
          background: var(--bg-main);
        }

        .boq-intelligence-table-wrapper::-webkit-scrollbar-thumb {
          background: var(--primary-400);
          border-radius: 4px;
        }

        .boq-intelligence-table-wrapper::-webkit-scrollbar-thumb:hover {
          background: var(--primary-600);
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
          padding: 0.5rem 1rem;
          font-weight: 800;
          color: var(--primary-900);
          font-size: 0.75rem;
          width: 100%;
        }

        .section-title-input {
          border: 1px solid transparent;
          background: transparent;
          font-weight: 800;
          color: var(--primary-900);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          width: 100%;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .section-title-input:hover {
          background: rgba(0,0,0,0.05);
          border-color: var(--border-medium);
        }

        .section-title-input:focus {
          background: white;
          border-color: var(--accent-600);
          outline: none;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
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

        .qty-input-wrapper {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: var(--bg-main);
          border-radius: 4px;
          padding-right: 4px;
        }

        .btn-geo-trigger {
          border: none;
          background: transparent;
          color: var(--primary-400);
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }

        .btn-geo-trigger:hover { color: var(--accent-600); transform: scale(1.1); }

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

        .actions-cell { color: var(--primary-300); text-align: center; }
        .actions-cell:hover { color: var(--primary-600); }

        .btn-icon-danger {
          background: transparent;
          border: none;
          color: var(--primary-300);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .btn-icon-danger:hover {
          color: #ef4444;
          background: #fee2e2;
        }

        .add-item-row {
          background: #fdfdfd;
        }

        .btn-add-inline {
          width: 100%;
          padding: 0.75rem;
          background: transparent;
          border: 1px dashed var(--border-medium);
          color: var(--primary-500);
          font-weight: 600;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-add-inline:hover {
          background: var(--bg-main);
          color: var(--accent-600);
          border-color: var(--accent-400);
        }
      `}</style>
    </div>
  );
};

export default BOQWorkspace;
