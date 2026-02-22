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
  Calculator,
  ShieldCheck,
  AlertCircle,
  Zap,
  Gavel,
  Trophy,
  AlertTriangle,
  Pencil,
  Sparkles,
  Globe2
} from 'lucide-react';

const BOQWorkspace = ({ project, onUpdate, onAddSection, onExport, onDelete }) => {
  const [sections, setSections] = useState(project?.sections || []);
  const [analyzingItem, setAnalyzingItem] = useState(null);
  const [calculatingQtyForItem, setCalculatingQtyForItem] = useState(null);
  const [biddingItem, setBiddingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('estimation');

  React.useEffect(() => {
    if (project?.sections) {
      setSections(project.sections);
    }
  }, [project]);

  const toggleSection = (sectionId) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, expanded: !s.expanded } : s
    ));
  };

  const updateSectionTitle = (sectionId, newTitle) => {
    const updated = sections.map(s =>
      s.id === sectionId ? { ...s, title: newTitle } : s
    );
    setSections(updated);
    onUpdate(project.id, updated);
  };

  const updateItem = (sectionId, itemId, fieldOrUpdates, valueOrBreakdown = null, breakdown = null) => {
    const updated = sections.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        items: section.items.map(item => {
          if (item.id !== itemId) return item;
          let updatedItem;
          if (typeof fieldOrUpdates === 'object') {
            updatedItem = { ...item, ...fieldOrUpdates };
          } else {
            updatedItem = { ...item, [fieldOrUpdates]: valueOrBreakdown };
            if (breakdown) updatedItem.breakdown = breakdown;
          }
          const rateToUse = updatedItem.useBenchmark ? (updatedItem.benchmark * getRegionalModifier(project?.region || 'Lagos')) : updatedItem.rate;
          updatedItem.total = updatedItem.qty * rateToUse;
          if (updatedItem.qtyCompleted !== undefined) {
            updatedItem.progressPercent = updatedItem.qty > 0 ? (updatedItem.qtyCompleted / updatedItem.qty) * 100 : 0;
          }
          return updatedItem;
        })
      };
    });
    setSections(updated);
    onUpdate(project.id, updated);
  };

  const handleRateApply = (rate, breakdown) => {
    if (!analyzingItem) return;
    updateItem(analyzingItem.sectionId, analyzingItem.item.id, {
      rate: rate,
      rateSource: 'calculated',
      useBenchmark: false,
      breakdown: breakdown
    });
    setAnalyzingItem(null);
  };

  const toggleVO = (sectionId, itemId) => {
    updateItem(sectionId, itemId, 'isVO', !sections.find(s => s.id === sectionId)?.items.find(i => i.id === itemId)?.isVO);
  };

  const addItemToSection = (sectionId) => {
    const updated = sections.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        items: [...section.items, {
          id: Date.now(),
          description: 'New Work Item',
          unit: 'm²',
          qty: 0,
          rate: 0,
          total: 0,
          benchmark: 0,
          useBenchmark: false,
          rateSource: 'manual',
          qtySource: 'manual'
        }]
      };
    });
    setSections(updated);
    onUpdate(project.id, updated);
  };

  const isOutlier = (rate, benchmark) => {
    if (!benchmark || benchmark === 0 || !rate) return false;
    const ratio = rate / benchmark;
    return ratio > 1.5 || ratio < 0.5;
  };

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

  const calculateGrandTotal = React.useMemo(() => {
    return sections.reduce((acc, section) =>
      acc + section.items.reduce((sum, item) => sum + (item.total || 0), 0), 0
    );
  }, [sections]);

  const totalItems = sections.reduce((a, s) => a + s.items.length, 0);

  return (
    <div className="ws-container">
      {/* Toolbar */}
      <div className="ws-toolbar">
        <div className="ws-toolbar-left">
          <div className="ws-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search items…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="ws-mode-switch">
            <button className={`ws-mode-btn ${viewMode === 'estimation' ? 'active' : ''}`} onClick={() => setViewMode('estimation')}>
              <Calculator size={12} /> Estimation
            </button>
            <button className={`ws-mode-btn ${viewMode === 'valuation' ? 'active' : ''}`} onClick={() => setViewMode('valuation')}>
              <ShieldCheck size={12} /> Valuation
            </button>
          </div>
        </div>
        <div className="ws-toolbar-center">
          <div className="ws-stat"><span className="ws-stat-label">Region</span>
            <select className="ws-region-sel" value={project?.region || 'Lagos'} onChange={(e) => onUpdate(project.id, sections, e.target.value)}>
              <option value="Lagos">Lagos</option>
              <option value="Abuja">Abuja</option>
              <option value="Port_Harcourt">PH</option>
              <option value="Ibadan">Ibadan</option>
              <option value="Kano">Kano</option>
            </select>
          </div>
          <div className="ws-stat"><span className="ws-stat-label">Sections</span><span className="ws-stat-val">{sections.length}</span></div>
          <div className="ws-stat"><span className="ws-stat-label">Items</span><span className="ws-stat-val">{totalItems}</span></div>
          <div className="ws-stat ws-stat-total"><span className="ws-stat-label">Total</span><span className="ws-stat-val">₦{calculateGrandTotal.toLocaleString()}</span></div>
        </div>
        <div className="ws-toolbar-right">
          <button className="ws-btn ws-btn-ghost" onClick={() => {
            const firstItem = sections.flatMap(s => s.items)[0];
            if (firstItem) {
              setAnalyzingItem({ sectionId: sections.find(s => s.items.includes(firstItem))?.id, item: firstItem });
            }
          }}>
            <Calculator size={14} /> Rate Analysis
          </button>
          <button className="ws-btn ws-btn-ghost" onClick={onExport}><Download size={14} /> Export</button>
          <button className="ws-btn ws-btn-primary" onClick={onAddSection}><Plus size={14} /> Section</button>
        </div>
      </div>

      {/* Table */}
      <div className="ws-table-wrap">
        <table className="ws-table">
          <thead>
            <tr>
              <th className="ws-th-num">#</th>
              <th className="ws-th-desc">WORK DESCRIPTION</th>
              <th className="ws-th-unit">UNIT</th>
              <th className="ws-th-qty">QTY</th>
              {viewMode === 'valuation' ? (
                <>
                  <th className="ws-th-sm">DONE</th>
                  <th className="ws-th-sm">%</th>
                </>
              ) : (
                <th className="ws-th-strategy">STRATEGY</th>
              )}
              <th className="ws-th-rate">RATE (₦)</th>
              <th className="ws-th-total">TOTAL (₦)</th>
              <th className="ws-th-act"></th>
            </tr>
          </thead>
          <tbody>
            {filteredSections.map((section, sIdx) => (
              <React.Fragment key={section.id}>
                {/* Section Header */}
                <tr className="ws-section-row" onClick={() => toggleSection(section.id)}>
                  <td colSpan={viewMode === 'valuation' ? 8 : 7} className="ws-section-cell">
                    <div className="ws-section-inner">
                      {section.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span className="ws-section-letter">{String.fromCharCode(65 + sIdx)}</span>
                      <input
                        type="text"
                        className="ws-section-title-input"
                        value={section.title}
                        onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="ws-section-badge">{section.items.length}</span>
                      {!section.expanded && (
                        <span className="ws-section-total">₦{section.items.reduce((a, i) => a + (i.total || 0), 0).toLocaleString()}</span>
                      )}
                    </div>
                  </td>
                  <td className="ws-act-cell">
                    <button className="ws-btn-icon ws-btn-danger" onClick={(e) => { e.stopPropagation(); onDelete(project.id, section.id); }}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
                {/* Items */}
                {section.expanded && section.items.map((item, idx) => {
                  const outlier = !item.useBenchmark && isOutlier(item.rate, item.benchmark);
                  const rate = item.useBenchmark ? (item.benchmark * getRegionalModifier(project?.region || 'Lagos')) : item.rate;
                  return (
                    <tr key={item.id} className={`ws-item-row ${outlier ? 'ws-outlier' : ''}`}>
                      <td className="ws-num">{String.fromCharCode(65 + sIdx)}.{idx + 1}</td>
                      <td className="ws-desc">
                        <div className="ws-desc-inner">
                          {item.isVO && <span className="ws-vo">VO</span>}
                          <input
                            type="text"
                            className="ws-input ws-desc-input"
                            value={item.description}
                            onChange={(e) => updateItem(section.id, item.id, 'description', e.target.value)}
                          />
                          {outlier && <AlertCircle size={11} className="ws-outlier-icon" title="Rate variance detected" />}
                        </div>
                      </td>
                      <td className="ws-unit-cell">
                        <input
                          type="text"
                          className="ws-input ws-unit-input"
                          value={item.unit}
                          onChange={(e) => updateItem(section.id, item.id, 'unit', e.target.value)}
                        />
                      </td>
                      <td className="ws-qty-cell">
                        <div className="ws-qty-wrap">
                          <input
                            type="number"
                            className="ws-input ws-qty-input"
                            value={item.qty || ''}
                            onChange={(e) => updateItem(section.id, item.id, 'qty', Number(e.target.value))}
                          />
                          <button className="ws-geo-btn" onClick={() => setCalculatingQtyForItem({ sectionId: section.id, item })} title="Geometric Takeoff">
                            <Calculator size={10} />
                          </button>
                        </div>
                      </td>
                      {viewMode === 'valuation' ? (
                        <>
                          <td>
                            <input type="number" className="ws-input ws-sm-input" value={item.qtyCompleted || ''}
                              onChange={(e) => updateItem(section.id, item.id, 'qtyCompleted', Number(e.target.value))} />
                          </td>
                          <td>
                            <div className="ws-progress-bar">
                              <div className="ws-progress-fill" style={{ width: `${Math.min(100, item.progressPercent || 0)}%` }}></div>
                              <span>{Math.round(item.progressPercent || 0)}%</span>
                            </div>
                          </td>
                        </>
                      ) : (
                        <td>
                          <div className="ws-strategy-toggle">
                            <button className={`ws-strat-btn ${!item.useBenchmark ? 'active' : ''}`}
                              onClick={() => updateItem(section.id, item.id, 'useBenchmark', false)}>C</button>
                            <button className={`ws-strat-btn ${item.useBenchmark ? 'active' : ''}`}
                              onClick={() => updateItem(section.id, item.id, { useBenchmark: true, rateSource: 'benchmark' })}>B</button>
                          </div>
                        </td>
                      )}
                      <td className="ws-rate-cell">
                        <div className="ws-rate-wrap">
                          <input
                            type="number"
                            className="ws-input ws-rate-input"
                            value={rate || ''}
                            onChange={(e) => updateItem(section.id, item.id, 'rate', Number(e.target.value))}
                            disabled={item.useBenchmark}
                          />
                          <button className="ws-analysis-btn" onClick={() => setAnalyzingItem({ sectionId: section.id, item })} title="Rate Analysis">
                            <Calculator size={11} />
                          </button>
                        </div>
                      </td>
                      <td className="ws-total-cell">₦{(item.total || 0).toLocaleString()}</td>
                      <td className="ws-act-cell">
                        {viewMode === 'valuation' ? (
                          <button className={`ws-btn-icon ${item.isVO ? 'ws-vo-active' : ''}`}
                            onClick={() => toggleVO(section.id, item.id)} title="Variation Order">
                            <AlertTriangle size={12} />
                          </button>
                        ) : (
                          <div className="ws-act-group">
                            <button className={`ws-btn-icon ${item.bids?.length > 0 ? 'ws-bid-active' : ''}`}
                              onClick={() => setBiddingItem({ sectionId: section.id, item })} title="Bids">
                              <Gavel size={12} />
                            </button>
                            <button className="ws-btn-icon ws-btn-danger"
                              onClick={() => onDelete(project.id, section.id, item.id)} title="Delete">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {/* Section Footer */}
                {section.expanded && (
                  <>
                    <tr className="ws-subtotal-row">
                      <td colSpan={viewMode === 'valuation' ? 6 : 5}></td>
                      <td colSpan="2" className="ws-subtotal-val">
                        Sub-Total: ₦{section.items.reduce((a, i) => a + (i.total || 0), 0).toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                    <tr className="ws-add-row">
                      <td colSpan={viewMode === 'valuation' ? 9 : 8}>
                        <button className="ws-add-btn" onClick={() => addItemToSection(section.id)}>
                          <Plus size={13} /> Add Item
                        </button>
                      </td>
                    </tr>
                  </>
                )}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="ws-grand-total">
              <td colSpan={viewMode === 'valuation' ? 7 : 6}>CONTRACT SUM</td>
              <td className="ws-grand-val">₦{calculateGrandTotal.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Modals */}
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
        /* ═══════════════════════════════════════════ */
        /*  BOQ WORKSPACE — FULL-PAGE SPREADSHEET     */
        /* ═══════════════════════════════════════════ */

        .ws-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 56px);
          background: #f1f5f9;
          overflow: hidden;
        }

        /* ── TOOLBAR ── */
        .ws-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.375rem 0.75rem;
          background: #0f172a;
          color: white;
          gap: 0.75rem;
          flex-shrink: 0;
        }
        .ws-toolbar-left { display: flex; align-items: center; gap: 0.5rem; }
        .ws-toolbar-center { display: flex; align-items: center; gap: 1rem; }
        .ws-toolbar-right { display: flex; align-items: center; gap: 0.375rem; }

        .ws-search {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 0.3rem 0.625rem;
          border-radius: 6px;
          color: white;
          width: 180px;
        }
        .ws-search input {
          background: none;
          border: none;
          outline: none;
          color: white;
          font-size: 0.6875rem;
          width: 100%;
        }
        .ws-search input::placeholder { color: rgba(255,255,255,0.4); }

        .ws-mode-switch { display: flex; background: rgba(255,255,255,0.06); border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
        .ws-mode-btn {
          display: flex; align-items: center; gap: 0.25rem;
          padding: 0.25rem 0.625rem;
          font-size: 0.625rem; font-weight: 700;
          color: rgba(255,255,255,0.5);
          background: none; border: none; cursor: pointer;
          transition: all 0.15s;
        }
        .ws-mode-btn.active { background: rgba(255,255,255,0.12); color: white; }

        .ws-stat { display: flex; flex-direction: column; align-items: center; gap: 1px; }
        .ws-stat-label { font-size: 0.5rem; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.06em; }
        .ws-stat-val { font-size: 0.75rem; font-weight: 900; color: white; }
        .ws-stat-total .ws-stat-val { color: #60a5fa; }

        .ws-region-sel {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          color: white;
          font-size: 0.625rem; font-weight: 800;
          padding: 1px 4px; border-radius: 4px;
          outline: none; cursor: pointer;
        }

        .ws-btn {
          display: flex; align-items: center; gap: 0.25rem;
          padding: 0.3rem 0.625rem; border-radius: 6px;
          font-size: 0.625rem; font-weight: 700; cursor: pointer;
          border: none; transition: all 0.15s;
        }
        .ws-btn-ghost { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.1); }
        .ws-btn-ghost:hover { background: rgba(255,255,255,0.12); color: white; }
        .ws-btn-primary { background: #2563eb; color: white; }
        .ws-btn-primary:hover { background: #1d4ed8; }

        /* ── TABLE ── */
        .ws-table-wrap {
          flex: 1;
          overflow-y: auto;
          overflow-x: auto;
          min-height: 0;
        }
        .ws-table-wrap::-webkit-scrollbar { width: 6px; height: 6px; }
        .ws-table-wrap::-webkit-scrollbar-track { background: #f1f5f9; }
        .ws-table-wrap::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

        .ws-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
          background: white;
          table-layout: fixed;
        }

        .ws-table thead { position: sticky; top: 0; z-index: 10; }
        .ws-table th {
          background: #f8fafc;
          padding: 0.5rem 0.625rem;
          text-align: left;
          font-size: 0.5625rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }

        .ws-th-num { width: 44px; text-align: center; }
        .ws-th-desc { /* auto width — takes remaining space */ }
        .ws-th-unit { width: 60px; text-align: center; }
        .ws-th-qty { width: 80px; text-align: center; }
        .ws-th-sm { width: 70px; text-align: center; }
        .ws-th-strategy { width: 80px; text-align: center; }
        .ws-th-rate { width: 120px; text-align: right; }
        .ws-th-total { width: 120px; text-align: right; }
        .ws-th-act { width: 64px; }

        /* ── SECTION ROW ── */
        .ws-section-row {
          cursor: pointer;
          background: #f0f4f8;
          border-top: 2px solid #e2e8f0;
          transition: background 0.15s;
        }
        .ws-section-row:hover { background: #e8eef4; }
        .ws-section-cell { padding: 0.5rem 0.625rem !important; }
        .ws-section-inner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #334155;
        }
        .ws-section-letter {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px;
          background: #1e293b; color: white;
          font-size: 0.625rem; font-weight: 900;
          border-radius: 5px; flex-shrink: 0;
        }
        .ws-section-title-input {
          background: none; border: none; outline: none;
          font-size: 0.8125rem; font-weight: 700; color: #1e293b;
          flex: 1; padding: 2px 4px; border-radius: 3px;
        }
        .ws-section-title-input:focus { background: white; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
        .ws-section-badge {
          font-size: 0.5625rem; font-weight: 800;
          background: #1e293b; color: white;
          padding: 1px 7px; border-radius: 100px;
          flex-shrink: 0;
        }
        .ws-section-total {
          font-size: 0.75rem; font-weight: 800; color: #2563eb;
          margin-left: auto; flex-shrink: 0;
        }

        /* ── ITEM ROW ── */
        .ws-item-row {
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.1s;
        }
        .ws-item-row:hover { background: #f8fafc; }
        .ws-item-row td { padding: 0.375rem 0.625rem; vertical-align: middle; }
        .ws-outlier { background: #fffbeb !important; }

        .ws-num {
          text-align: center;
          font-size: 0.6875rem; font-weight: 700;
          color: #94a3b8;
          font-family: 'Inter', system-ui, monospace;
        }

        .ws-desc-inner { display: flex; align-items: center; gap: 0.375rem; }
        .ws-vo {
          font-size: 0.5rem; font-weight: 900;
          background: #fef3c7; color: #92400e;
          padding: 1px 5px; border-radius: 3px; flex-shrink: 0;
        }
        .ws-outlier-icon { color: #f59e0b; flex-shrink: 0; }

        /* ── INPUTS ── */
        .ws-input {
          width: 100%;
          border: 1px solid transparent;
          background: transparent;
          padding: 0.25rem 0.375rem;
          border-radius: 4px;
          font-size: 0.8125rem;
          transition: all 0.15s;
          outline: none;
          color: #1e293b;
        }
        .ws-input:hover { border-color: #e2e8f0; }
        .ws-input:focus { background: white; border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.08); }

        .ws-desc-input { font-weight: 600; }
        .ws-unit-input { text-align: center; font-weight: 700; text-transform: uppercase; font-size: 0.6875rem; color: #64748b; letter-spacing: 0.04em; }
        .ws-qty-input { text-align: right; font-weight: 600; }
        .ws-rate-input { text-align: right; font-weight: 600; }
        .ws-sm-input { text-align: center; font-weight: 600; width: 100%; }
        .ws-input:disabled { color: #94a3b8; background: #f8fafc; }

        .ws-qty-wrap, .ws-rate-wrap { display: flex; align-items: center; gap: 2px; }

        .ws-geo-btn, .ws-analysis-btn {
          display: flex; align-items: center; justify-content: center;
          width: 20px; height: 20px;
          border: none; background: #f1f5f9; color: #64748b;
          border-radius: 4px; cursor: pointer; flex-shrink: 0;
          transition: all 0.15s; opacity: 0;
        }
        .ws-item-row:hover .ws-geo-btn,
        .ws-item-row:hover .ws-analysis-btn { opacity: 1; }
        .ws-geo-btn:hover, .ws-analysis-btn:hover { background: #2563eb; color: white; }

        .ws-strategy-toggle { display: flex; gap: 1px; justify-content: center; }
        .ws-strat-btn {
          padding: 0.175rem 0.5rem;
          font-size: 0.5625rem; font-weight: 800;
          border: 1px solid #e2e8f0;
          background: white; color: #94a3b8;
          cursor: pointer; transition: all 0.15s;
        }
        .ws-strat-btn:first-child { border-radius: 4px 0 0 4px; }
        .ws-strat-btn:last-child { border-radius: 0 4px 4px 0; }
        .ws-strat-btn.active { background: #1e293b; color: white; border-color: #1e293b; }

        .ws-total-cell { text-align: right; font-weight: 700; color: #1e293b; font-size: 0.8125rem; white-space: nowrap; }
        .ws-rate-cell { text-align: right; }

        .ws-progress-bar {
          height: 18px; background: #f1f5f9;
          border-radius: 100px; position: relative;
          overflow: hidden; font-size: 0.5625rem;
          font-weight: 800; display: flex; align-items: center;
          justify-content: center; color: #1e293b;
        }
        .ws-progress-fill {
          position: absolute; top: 0; left: 0; bottom: 0;
          background: linear-gradient(90deg, #2563eb, #3b82f6);
          border-radius: 100px;
          transition: width 0.3s;
        }

        /* ── ACTIONS ── */
        .ws-act-cell { text-align: center; }
        .ws-act-group { display: flex; gap: 2px; justify-content: center; }
        .ws-btn-icon {
          display: flex; align-items: center; justify-content: center;
          width: 24px; height: 24px;
          border: none; background: transparent; color: #94a3b8;
          border-radius: 4px; cursor: pointer;
          transition: all 0.15s; opacity: 0;
        }
        .ws-item-row:hover .ws-btn-icon,
        .ws-section-row:hover .ws-btn-icon { opacity: 1; }
        .ws-btn-danger:hover { background: #fef2f2; color: #ef4444; }
        .ws-bid-active { opacity: 1 !important; color: #2563eb; }
        .ws-vo-active { opacity: 1 !important; color: #f59e0b; }

        /* ── SUBTOTAL ── */
        .ws-subtotal-row { background: #f8fafc; }
        .ws-subtotal-val {
          text-align: right !important;
          font-weight: 800; font-size: 0.75rem;
          color: #334155;
          padding: 0.375rem 0.625rem !important;
          border-bottom: 2px solid #e2e8f0;
        }

        .ws-add-row td { padding: 0.25rem 0.625rem !important; background: #fafbfc; border-bottom: 2px solid #e2e8f0; }
        .ws-add-btn {
          display: flex; align-items: center; gap: 0.25rem;
          background: none; border: 1px dashed #cbd5e1; color: #64748b;
          padding: 0.25rem 0.75rem; border-radius: 4px;
          font-size: 0.6875rem; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
          width: 100%;
          justify-content: center;
        }
        .ws-add-btn:hover { border-color: #2563eb; color: #2563eb; background: rgba(37,99,235,0.03); }

        /* ── GRAND TOTAL ── */
        .ws-grand-total {
          background: #0f172a;
          color: white;
        }
        .ws-grand-total td {
          padding: 0.75rem 0.625rem !important;
          font-weight: 900;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .ws-grand-val {
          text-align: right !important;
          font-size: 1rem !important;
          color: #60a5fa !important;
        }

        /* ── MOBILE ── */
        @media (max-width: 768px) {
          .ws-toolbar { flex-wrap: wrap; padding: 0.5rem; }
          .ws-toolbar-center { display: none; }
          .ws-search { width: 100%; }
          .ws-table { font-size: 0.75rem; }
          .ws-th-strategy, .ws-th-rate { display: none; }
        }
      `}</style>
    </div>
  );
};

export default BOQWorkspace;
