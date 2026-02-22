import React, { useState } from 'react';
import RateAnalysisModal from './RateAnalysisModal';
import GeometricCalculator from './GeometricCalculator';
import BidManagerModal from './BidManagerModal';
import { calculateResourceRequirement, getRegionalModifier } from '../../utils/aiService';
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
  Globe,
  Gavel,
  Trophy,
  Activity,
  Percent,
  ClipboardCheck,
  AlertTriangle,
  Pencil,
  Sparkles,
  Globe2
} from 'lucide-react';

const SmoothInput = ({ value, onChange, className, disabled, type = "number", source }) => {
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

  const getSourceIcon = () => {
    if (source === 'manual') return <Pencil size={10} className="source-icon edited" title="Manually Edited" />;
    if (source === 'calculated') return <Sparkles size={10} className="source-icon calculated" title="Calculated by AI/Engine" />;
    if (source === 'benchmark') return <Globe2 size={10} className="source-icon benchmark" title="Market Benchmark" />;
    return null;
  };

  return (
    <div className="smooth-input-container">
      <input
        type={type}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={className}
        disabled={disabled}
      />
      {getSourceIcon()}
    </div>
  );
};

const BOQWorkspace = ({ project, onUpdate, onAddSection, onExport, onDelete }) => {
  const [sections, setSections] = useState(project?.sections || []);
  const [analyzingItem, setAnalyzingItem] = useState(null);
  const [calculatingQtyForItem, setCalculatingQtyForItem] = useState(null);
  const [biddingItem, setBiddingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('estimation'); // 'estimation' or 'valuation'
  const [expandedItems, setExpandedItems] = useState({});

  const toggleItemExpand = (itemId) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const isItemExpanded = (itemId) => {
    return expandedItems[itemId] !== false; // default expanded
  };

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
      updateItem(analyzingItem.sectionId, analyzingItem.item.id, {
        rate: newRate,
        useBenchmark: false,
        rateSource: 'calculated'
      }, breakdown);
      setAnalyzingItem(null);
    }
  };

  const updateItem = (sectionId, itemId, fieldOrUpdates, valueOrBreakdown = null, breakdown = null) => {
    let updates = {};
    let finalBreakdown = breakdown;

    if (typeof fieldOrUpdates === 'string') {
      updates[fieldOrUpdates] = valueOrBreakdown;
      // Auto-tag manual source if updating value directly from UI
      if (fieldOrUpdates === 'qty') updates.qtySource = 'manual';
      if (fieldOrUpdates === 'rate') updates.rateSource = 'manual';
    } else {
      updates = fieldOrUpdates;
      finalBreakdown = valueOrBreakdown;
    }

    const updatedSections = sections.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        items: section.items.map(item => {
          if (item.id !== itemId) return item;
          const updatedItem = { ...item, ...updates };

          if (finalBreakdown) {
            updatedItem.breakdown = finalBreakdown;
          }

          // Recalculate total
          const rateToUse = updatedItem.useBenchmark ? (updatedItem.benchmark * getRegionalModifier(project?.region || 'Lagos')) : updatedItem.rate;
          updatedItem.total = updatedItem.qty * rateToUse;

          // Update valuation math if in valuation mode
          if (updatedItem.qtyCompleted !== undefined) {
            updatedItem.progressPercent = (updatedItem.qtyCompleted / updatedItem.qty) * 100;
            updatedItem.totalDone = updatedItem.qtyCompleted * rateToUse;
          }

          return updatedItem;
        })
      };
    });

    setSections(updatedSections);
    onUpdate(project.id, updatedSections);
  };

  const toggleVO = (sectionId, itemId) => {
    const updatedSections = sections.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        items: section.items.map(item => {
          if (item.id !== itemId) return item;
          return { ...item, isVO: !item.isVO };
        })
      };
    });
    setSections(updatedSections);
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
      useBenchmark: true,
      qtySource: 'manual',
      rateSource: 'benchmark'
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
      {/* Compact Intelligence Strip */}
      <div className="intelligence-strip">
        <div className="strip-left">
          <ShieldCheck size={16} className="text-success" />
          <span className="strip-title">Rate Engine</span>
          <span className="strip-sep">•</span>
          <span className="strip-subtitle">Q1 2026 Market Rates</span>
        </div>
        <div className="strip-right">
          <div className="strip-metric">
            <span className="strip-label">REGION</span>
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
          <div className="strip-metric">
            <span className="strip-label">VOLATILITY</span>
            <span className="strip-val text-warning">MED</span>
          </div>
          <div className="strip-metric">
            <span className="strip-label">SECTIONS</span>
            <span className="strip-val">{sections.length}</span>
          </div>
          <div className="strip-metric">
            <span className="strip-label">ITEMS</span>
            <span className="strip-val">{sections.reduce((a, s) => a + s.items.length, 0)}</span>
          </div>
        </div>
      </div>

      <div className="workspace-header">
        <div className="header-left">
          <div className="search-bar">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search items, units, descriptions…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="workspace-mode-switcher">
            <button
              className={`mode-btn ${viewMode === 'estimation' ? 'active' : ''}`}
              onClick={() => setViewMode('estimation')}
            >
              <Calculator size={14} /> Estimation
            </button>
            <button
              className={`mode-btn ${viewMode === 'valuation' ? 'active' : ''}`}
              onClick={() => setViewMode('valuation')}
            >
              <Activity size={14} /> Valuation
            </button>
          </div>
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
          <button className="btn-secondary" onClick={onExport}><Download size={16} /> Export</button>
          <button className="btn-primary" onClick={onAddSection}><Plus size={16} /> New Section</button>
        </div>
      </div>

      <div className="boq-intelligence-table-wrapper enterprise-card">
        <table className="boq-intelligence-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>WORK DESCRIPTION</th>
              <th style={{ width: '70px' }}>UNIT</th>
              <th style={{ width: '90px' }}>QTY</th>
              {viewMode === 'valuation' ? (
                <>
                  <th style={{ width: '100px' }}>QTY DONE</th>
                  <th style={{ width: '120px' }}>PROGRESS</th>
                </>
              ) : (
                <th style={{ width: '140px' }}>STRATEGY</th>
              )}
              <th style={{ width: '120px' }}>RATE (₦)</th>
              <th style={{ width: '130px' }}>TOTAL (₦)</th>
              <th style={{ width: '60px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredSections.map((section) => (
              <React.Fragment key={section.id}>
                <tr className="section-header-row" onClick={() => toggleSection(section.id)}>
                  <td colSpan="7">
                    <div className="section-title" onClick={(e) => e.stopPropagation()}>
                      {section.expanded ? (
                        <ChevronDown size={14} onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }} style={{ cursor: 'pointer', flexShrink: 0 }} />
                      ) : (
                        <ChevronRight size={14} onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }} style={{ cursor: 'pointer', flexShrink: 0 }} />
                      )}
                      <SmoothInput
                        type="text"
                        value={section.title}
                        onChange={(val) => updateSectionTitle(section.id, val)}
                        className="section-title-input"
                      />
                      <span className="section-item-count">{section.items.length} item{section.items.length !== 1 ? 's' : ''}</span>
                      {!section.expanded && (
                        <span className="section-collapsed-total">₦{section.items.reduce((a, i) => a + (i.total || 0), 0).toLocaleString()}</span>
                      )}
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
                        <React.Fragment key={item.id}>
                          {/* Full-width description row */}
                          <tr className={`item-desc-row ${outlier ? 'outlier-warning' : ''}`} onClick={() => toggleItemExpand(item.id)}>
                            <td className="item-num">{String.fromCharCode(65 + filteredSections.indexOf(section))}.{idx + 1}</td>
                            <td colSpan={viewMode === 'valuation' ? 6 : 5} className="description-cell-full">
                              <div className="desc-full-wrapper">
                                <div className="desc-expand-toggle">
                                  {isItemExpanded(item.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                </div>
                                {item.isVO && <span className="vo-badge" title="Variation Order">VO</span>}
                                <SmoothInput
                                  type="text"
                                  value={item.description}
                                  onChange={(val) => updateItem(section.id, item.id, 'description', val)}
                                  className="inline-input desc-input-full"
                                />
                                <span className="desc-inline-total">₦{(item.total || 0).toLocaleString()}</span>
                              </div>
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
                                {(() => {
                                  const bestBid = item.bids?.find(b => b.selected);
                                  if (!bestBid) return null;
                                  return (
                                    <div className="intelligence-tag gold">
                                      <Trophy size={10} /> {bestBid.subcontractor}
                                    </div>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="actions-cell">
                              {viewMode === 'valuation' ? (
                                <button
                                  className={`btn-vo-toggle ${item.isVO ? 'active' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); toggleVO(section.id, item.id); }}
                                  title={item.isVO ? "Remove VO Tag" : "Tag as Variation Order"}
                                >
                                  <AlertTriangle size={14} />
                                </button>
                              ) : (
                                <div className="action-btn-group">
                                  <button
                                    className={`btn-icon-action ${item.bids?.length > 0 ? 'active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setBiddingItem({ sectionId: section.id, item }); }}
                                    title="Market Bids & Leveling"
                                  >
                                    <Gavel size={14} />
                                  </button>
                                  <button className="btn-icon-danger" onClick={(e) => { e.stopPropagation(); onDelete(project.id, section.id, item.id); }} title="Delete Item">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                          {/* Collapsible data row */}
                          {isItemExpanded(item.id) && (
                            <tr className={`item-data-row ${outlier ? 'outlier-warning' : ''}`}>
                              <td></td>
                              <td>
                                <SmoothInput
                                  type="text"
                                  value={item.unit}
                                  onChange={(val) => updateItem(section.id, item.id, 'unit', val)}
                                  className="inline-input unit-input"
                                />
                              </td>
                              <td>
                                <div className="qty-input-wrapper">
                                  <SmoothInput
                                    value={item.qty}
                                    onChange={(val) => updateItem(section.id, item.id, 'qty', val)}
                                    className="inline-input"
                                    source={item.qtySource}
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
                              <td></td>
                              {viewMode === 'valuation' ? (
                                <>
                                  <td className="valuation-cell">
                                    <SmoothInput
                                      value={item.qtyCompleted || 0}
                                      onChange={(val) => updateItem(section.id, item.id, 'qtyCompleted', val)}
                                      className="inline-input text-accent font-bold"
                                    />
                                  </td>
                                  <td className="valuation-cell">
                                    <div className="progress-mini-bar">
                                      <div className="progress-fill" style={{ width: `${Math.min(100, item.progressPercent || 0)}%` }}></div>
                                      <span className="percent-text">{Math.round(item.progressPercent || 0)}%</span>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <td>
                                  <div className="rate-source-toggle">
                                    <button
                                      className={`toggle-btn shadow-sm ${!item.useBenchmark ? 'active' : ''}`}
                                      onClick={() => updateItem(section.id, item.id, 'useBenchmark', false)}
                                    >
                                      Custom
                                    </button>
                                    <button
                                      className={`toggle-btn shadow-sm ${item.useBenchmark ? 'active' : ''}`}
                                      onClick={() => {
                                        updateItem(section.id, item.id, {
                                          useBenchmark: true,
                                          rateSource: 'benchmark'
                                        });
                                      }}
                                    >
                                      Benchmark
                                    </button>
                                  </div>
                                </td>
                              )}
                              <td className="rate-cell">
                                <div className="rate-input-wrapper">
                                  <span className="currency-prefix">₦</span>
                                  <SmoothInput
                                    value={(item.useBenchmark ? (item.benchmark * getRegionalModifier(project?.region || 'Lagos')) : item.rate)}
                                    onChange={(val) => updateItem(section.id, item.id, 'rate', val)}
                                    className="inline-input rate-input"
                                    disabled={item.useBenchmark}
                                    source={item.useBenchmark ? 'benchmark' : (item.rateSource || 'manual')}
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
                              <td></td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {/* Section Subtotal Row */}
                    <tr className="section-subtotal-row">
                      <td colSpan="5"></td>
                      <td colSpan="2" className="section-subtotal-val">
                        Sub-Total: ₦{section.items.reduce((a, i) => a + (i.total || 0), 0).toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                    <tr className="add-item-row">
                      <td colSpan="8">
                        <button className="btn-add-inline" onClick={() => addItemToSection(section.id)}>
                          <Plus size={14} /> Add Work Item
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
          structureType={project?.type}
          onClose={() => setAnalyzingItem(null)}
          onSave={handleRateApply}
        />
      )}

      {calculatingQtyForItem && (
        <GeometricCalculator
          onClose={() => setCalculatingQtyForItem(null)}
          onApply={(newQty) => {
            updateItem(calculatingQtyForItem.sectionId, calculatingQtyForItem.item.id, {
              qty: newQty,
              qtySource: 'calculated'
            });
            setCalculatingQtyForItem(null);
          }}
        />
      )}

      {biddingItem && (
        <BidManagerModal
          item={biddingItem.item}
          onClose={() => setBiddingItem(null)}
          onSave={(updatedBids) => {
            const selectedBid = updatedBids.find(b => b.selected);
            updateItem(biddingItem.sectionId, biddingItem.item.id, {
              bids: updatedBids,
              rate: selectedBid ? selectedBid.rate : biddingItem.item.rate,
              useBenchmark: selectedBid ? false : biddingItem.item.useBenchmark,
              rateSource: selectedBid ? 'calculated' : biddingItem.item.rateSource
            });
            setBiddingItem(null);
          }}
        />
      )}

      <style jsx="true">{`
        .workspace-intelligence-container {
          padding: 0.5rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          height: calc(100vh - 60px);
          overflow: hidden;
        }

        .intelligence-strip {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.97), rgba(30, 41, 59, 0.97));
          color: white;
          padding: 0.5rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .strip-left { display: flex; align-items: center; gap: 0.5rem; }
        .strip-title { font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
        .strip-sep { color: rgba(255,255,255,0.25); }
        .strip-subtitle { font-size: 0.7rem; color: rgba(255,255,255,0.5); }
        .strip-right { display: flex; gap: 1.25rem; align-items: center; }
        .strip-metric { display: flex; flex-direction: column; align-items: center; gap: 1px; }
        .strip-label { font-size: 0.5625rem; color: rgba(255,255,255,0.4); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .strip-val { font-size: 0.8125rem; font-weight: 900; color: white; }

        .smooth-input-container {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .source-icon {
          position: absolute;
          right: 4px;
          opacity: 0.6;
          pointer-events: none;
        }

        .source-icon.edited { color: #f59e0b; }
        .source-icon.calculated { color: #8b5cf6; }
        .source-icon.benchmark { color: #10b981; }

        .header-left { display: flex; align-items: center; gap: 0.75rem; flex: 1; }

        .region-select {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 2px 6px;
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

        .workspace-actions { display: flex; gap: 0.5rem; }

        .boq-intelligence-table tr.item-row:hover {
          background: #f8fafc;
        }

        .boq-intelligence-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-light);
          font-size: 0.8125rem;
          transition: background 0.2s;
        }

        .total-cell, .grand-total-value {
          font-family: 'Inter', system-ui, sans-serif;
          font-weight: 700;
          color: var(--primary-900);
        }

        .inline-input:focus {
          background: #fff;
          border-color: var(--accent-600);
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: white;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          border: 1px solid var(--border-medium);
          flex: 1;
          max-width: 340px;
          color: var(--primary-400);
        }

        .search-bar input {
          border: none;
          outline: none;
          font-size: 0.875rem;
          width: 100%;
          color: var(--primary-900);
        }

        .workspace-actions { display: flex; gap: 0.5rem; }

        .boq-intelligence-table-wrapper {
          background: white;
          padding: 0;
          overflow: hidden;
          border-radius: 8px;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          min-height: 0;
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
          padding: 0.75rem 1rem;
          text-align: left;
          color: var(--primary-600);
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.625rem;
          letter-spacing: 0.04em;
          border-bottom: 2px solid var(--border-medium);
          position: sticky;
          top: 0;
          z-index: 2;
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

        .item-desc-row { 
          cursor: pointer; 
          transition: background 0.15s; 
          border-bottom: none;
        }
        .item-desc-row:hover { background: #f8fafc; }
        .item-desc-row td { padding: 0.625rem 1rem; vertical-align: middle; }

        .item-data-row {
          background: #fafbfc;
          border-left: 3px solid var(--accent-500);
        }
        .item-data-row td { 
          padding: 0.5rem 1rem; 
          vertical-align: middle; 
          border-bottom: 1px solid var(--border-light);
          font-size: 0.8125rem;
        }

        .description-cell-full {
          font-size: 0.8125rem;
        }

        .desc-full-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
        }

        .desc-expand-toggle {
          color: var(--primary-400);
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }

        .desc-input-full {
          flex: 1;
          font-weight: 600;
          color: var(--primary-900);
          font-size: 0.8125rem;
        }

        .desc-inline-total {
          font-weight: 800;
          font-size: 0.75rem;
          color: var(--accent-600);
          white-space: nowrap;
          flex-shrink: 0;
          background: rgba(37, 99, 235, 0.06);
          padding: 2px 10px;
          border-radius: 100px;
        }

        .action-btn-group {
          display: flex;
          gap: 2px;
          align-items: center;
        }

        .description-cell { color: var(--primary-800); font-weight: 500; font-size: 0.8125rem; }

        .item-num {
          font-family: 'Inter', monospace;
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--primary-400);
          text-align: center;
          letter-spacing: 0.02em;
        }

        .desc-input {
          font-weight: 600;
          color: var(--primary-900);
          font-size: 0.8125rem;
        }

        .unit-input {
          text-align: center;
          font-weight: 700;
          color: var(--primary-600);
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.03em;
        }

        .section-item-count {
          font-size: 0.625rem;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.08);
          padding: 2px 8px;
          border-radius: 100px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .section-header-row .section-item-count {
          color: var(--primary-400);
          background: var(--bg-main);
          border: 1px solid var(--border-light);
        }

        .section-collapsed-total {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--accent-600);
          margin-left: auto;
          flex-shrink: 0;
        }

        .section-subtotal-row {
          background: #f1f5f9;
        }

        .section-subtotal-val {
          text-align: right;
          font-weight: 800;
          font-size: 0.8125rem;
          color: var(--primary-700);
          padding: 0.5rem 1rem !important;
          border-bottom: 2px solid var(--border-medium);
        }
        
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

        .workspace-mode-switcher {
          background: #f1f5f9;
          padding: 3px;
          border-radius: 10px;
          display: flex;
          gap: 2px;
          border: 1px solid var(--border-medium);
        }

        .workspace-mode-switcher .mode-btn {
          padding: 0.5rem 1.25rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          border: none;
          background: transparent;
          color: var(--primary-500);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .workspace-mode-switcher .mode-btn.active {
          background: white;
          color: var(--primary-900);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .item-description-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .vo-badge {
          background: #ef4444;
          color: white;
          font-size: 9px;
          font-weight: 900;
          padding: 2px 5px;
          border-radius: 4px;
          letter-spacing: 0.05em;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
        }

        .item-desc-text {
          font-weight: 600;
          color: var(--primary-900);
        }

        .valuation-cell {
          background: rgba(37, 99, 235, 0.015);
        }

        .progress-mini-bar {
          width: 100%;
          height: 16px;
          background: #e2e8f0;
          border-radius: 100px;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.03);
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #22c55e, #16a34a);
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.2);
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .percent-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 9px;
          font-weight: 900;
          color: #064e3b;
          text-shadow: 0 0 2px rgba(255,255,255,0.8);
        }

        .text-accent { color: var(--accent-600); }
        .font-bold { font-weight: 800; }

        .btn-vo-toggle {
          background: transparent;
          border: 1px solid var(--border-medium);
          padding: 6px;
          border-radius: 6px;
          color: var(--primary-300);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-vo-toggle:hover {
          color: #ef4444;
          background: #fef2f2;
          border-color: #fecaca;
        }

        .btn-vo-toggle.active {
          background: #ef4444;
          color: white;
          border-color: #dc2626;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
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

        /* ── Workspace Mobile Overrides ── */
        @media (max-width: 768px) {
          .workspace-intelligence-container {
            padding: 0.75rem;
          }

          .workspace-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .search-bar {
            width: 100%;
          }

          .workspace-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
          }

          .workspace-actions button {
            width: 100%;
            justify-content: center;
          }

          .boq-intelligence-table th:nth-child(3),
          .boq-intelligence-table td:nth-child(3) {
            display: none; /* Hide Unit on mobile */
          }

          .grand-total-row td {
            font-size: 0.8125rem;
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default BOQWorkspace;
