import React from 'react';
import {
  Search,
  ListFilter,
  CheckCircle2,
  Plus,
  ArrowRight,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  getFormulaDisplayText,
  getWorkedExamplePreview,
} from '../../utils/boqFormulas';
import { getBenchmarkCalibrationFactor } from '../../utils/pricing';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All Items' },
  { id: 'selected', label: 'Selected' },
  { id: 'recommended', label: 'Recommended' },
  { id: 'formula', label: 'Formula Ready' },
  { id: 'benchmark', label: 'Benchmark Ready' },
];

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended First' },
  { id: 'selected', label: 'Selected First' },
  { id: 'name', label: 'Name A-Z' },
  { id: 'benchmark', label: 'Highest Benchmark' },
  { id: 'formula', label: 'Formula First' },
];

const getBenchmarkValue = (item) => {
  const baseRate = Number(item?.benchmarkRate || item?.benchmarkMetadata?.rate || 0);
  return baseRate * getBenchmarkCalibrationFactor(item);
};
const hasFormulaSupport = (item) => Boolean(item?.defaultFormulaType && item.defaultFormulaType !== 'manual');

const buildSearchText = (item) => (
  [
    item.code,
    item.name,
    item.description,
    item.unit,
    item.category,
    item.formulaText,
    ...(Array.isArray(item.formulaBasis) ? item.formulaBasis : []),
    item.pickerHint,
    ...(Array.isArray(item.keywords) ? item.keywords : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
);

const BOQSelectionStage = ({
  projectName,
  marketRegion,
  structureType,
  sections = [],
  activeBillSectionId = null,
  selectionCountsBySection = {},
  sectionLibraryCounts = {},
  section,
  sectionMeta,
  catalogItems = [],
  selectedCodes = [],
  totalSelectedCount = 0,
  currentSectionSelectedCount = 0,
  onToggleItem,
  onSelectVisible,
  onClearBill,
  onGenerate,
  generateLabel = 'Generate BOQ',
  hasGeneratedBoq = false,
  onReturnToWorkspace = null,
  onNextSection = null,
  hasNextSection = false,
  onSelectBill = null,
}) => {
  const [query, setQuery] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [activeCategory, setActiveCategory] = React.useState('all');
  const [activeSort, setActiveSort] = React.useState('recommended');

  const selectedCodeSet = React.useMemo(() => new Set(selectedCodes), [selectedCodes]);

  const categories = React.useMemo(() => (
    ['all', ...Array.from(new Set(
      (catalogItems || [])
        .map((item) => item.category || 'General')
        .filter(Boolean)
    ))]
  ), [catalogItems]);

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = (catalogItems || []).filter((item) => {
      const itemCategory = item.category || 'General';
      const hasFormula = hasFormulaSupport(item);
      const hasBenchmark = getBenchmarkValue(item) > 0;
      const isSelected = selectedCodeSet.has(item.code);

      const matchesQuery = !normalizedQuery || buildSearchText(item).includes(normalizedQuery);
      const matchesCategory = activeCategory === 'all' || itemCategory === activeCategory;
      const matchesFilter = (() => {
        switch (activeFilter) {
          case 'selected':
            return isSelected;
          case 'recommended':
            return item.isRecommended === true;
          case 'formula':
            return hasFormula;
          case 'benchmark':
            return hasBenchmark;
          default:
            return true;
        }
      })();

      return matchesQuery && matchesCategory && matchesFilter;
    });

    return filtered.sort((leftItem, rightItem) => {
      const leftSelected = selectedCodeSet.has(leftItem.code);
      const rightSelected = selectedCodeSet.has(rightItem.code);
      const leftRecommended = leftItem.isRecommended === true;
      const rightRecommended = rightItem.isRecommended === true;
      const leftBenchmark = getBenchmarkValue(leftItem);
      const rightBenchmark = getBenchmarkValue(rightItem);
      const leftFormula = hasFormulaSupport(leftItem);
      const rightFormula = hasFormulaSupport(rightItem);
      const leftName = `${leftItem.code || ''} ${leftItem.name || ''}`.trim();
      const rightName = `${rightItem.code || ''} ${rightItem.name || ''}`.trim();

      switch (activeSort) {
        case 'selected':
          if (leftSelected !== rightSelected) {
            return leftSelected ? -1 : 1;
          }
          break;
        case 'name':
          return leftName.localeCompare(rightName);
        case 'benchmark':
          if (leftBenchmark !== rightBenchmark) {
            return rightBenchmark - leftBenchmark;
          }
          break;
        case 'formula':
          if (leftFormula !== rightFormula) {
            return leftFormula ? -1 : 1;
          }
          break;
        default:
          if (leftRecommended !== rightRecommended) {
            return leftRecommended ? -1 : 1;
          }
          break;
      }

      if (leftSelected !== rightSelected) {
        return leftSelected ? -1 : 1;
      }

      if (leftRecommended !== rightRecommended) {
        return leftRecommended ? -1 : 1;
      }

      return leftName.localeCompare(rightName);
    });
  }, [activeCategory, activeFilter, activeSort, catalogItems, query, selectedCodeSet]);

  const metrics = React.useMemo(() => ({
    recommended: (catalogItems || []).filter((item) => item.isRecommended === true).length,
    formulaReady: (catalogItems || []).filter((item) => hasFormulaSupport(item)).length,
    benchmarkReady: (catalogItems || []).filter((item) => getBenchmarkValue(item) > 0).length,
  }), [catalogItems]);

  const visibleCodes = React.useMemo(() => (
    filteredItems.map((item) => item.code)
  ), [filteredItems]);

  const selectedItems = React.useMemo(() => (
    (catalogItems || [])
      .filter((item) => selectedCodeSet.has(item.code))
  ), [catalogItems, selectedCodeSet]);

  const selectedPreview = React.useMemo(() => (
    selectedItems
      .slice(0, 3)
      .map((item) => item.name)
      .join(', ')
  ), [selectedItems]);

  const visibleSelectedCount = React.useMemo(() => (
    filteredItems.filter((item) => selectedCodeSet.has(item.code)).length
  ), [filteredItems, selectedCodeSet]);

  const selectionProgress = catalogItems.length > 0
    ? Math.min(100, Math.round((currentSectionSelectedCount / catalogItems.length) * 100))
    : 0;

  const clearFilters = () => {
    setQuery('');
    setActiveFilter('all');
    setActiveCategory('all');
  };

  return (
    <div className="boq-selection-shell">
      <aside className="boq-selection-sidebar">
        <div className="boq-selection-sidebar-head">
          <span className="boq-selection-eyebrow">BOQ Bills</span>
          <strong>Bill Navigator</strong>
          <small>{sections.length} active bill{sections.length === 1 ? '' : 's'} in this structure.</small>
        </div>

        <div className="boq-selection-sidebar-list">
          {(sections || []).map((entry, index) => {
            const isActive = activeBillSectionId === entry.id;
            const selectedCount = selectionCountsBySection?.[entry.id] || 0;
            const libraryCount = sectionLibraryCounts?.[entry.id] || 0;
            
            return (
              <button
                key={entry.id}
                type="button"
                className={`boq-selection-sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectBill?.(entry.id)}
              >
                <span className="boq-selection-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="boq-selection-copy">
                  <span className="boq-selection-title-row">
                    <strong>{entry.title}</strong>
                    {isActive && <span className="boq-selection-active-pill">Active</span>}
                  </span>
                  <span className="boq-selection-meta-row">
                    <small>{libraryCount} library item{libraryCount === 1 ? '' : 's'}</small>
                    <small className="highlighted">{selectedCount} selected</small>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="boq-selection-sidebar-footer">
          <div className="boq-selection-sidebar-summary">
            <span>Total Selected</span>
            <strong>{totalSelectedCount} items</strong>
          </div>
          <button
            type="button"
            className="boq-selection-generate-btn"
            onClick={onGenerate}
            disabled={totalSelectedCount === 0}
          >
            <FileSpreadsheet size={16} /> {generateLabel}
          </button>
          {hasGeneratedBoq && onReturnToWorkspace && (
            <button type="button" className="boq-selection-return-link" onClick={onReturnToWorkspace}>
              Return to Workspace
            </button>
          )}
        </div>
      </aside>

      <div className="boq-selection-content">
        <section className="boq-selection-page-header">
          <div className="boq-selection-overview-copy">
            <span className="boq-selection-eyebrow">{structureType || 'Item Selection Stage'}</span>
            <h2>{section?.title || 'Choose a bill section'}</h2>
            <p>{section?.description || sectionMeta?.description || 'Pick only the items you want to measure in this bill before generating the BOQ sheet.'}</p>
            <div className="boq-selection-overview-tags">
              <span>{projectName || 'Current Project'}</span>
              <span>{marketRegion || 'Market region'}</span>
              <span>{catalogItems.length} library items</span>
            </div>
          </div>

          <div className="boq-selection-progress-block">
            <div className="boq-selection-progress-copy">
              <strong>{selectionProgress}% of this bill curated</strong>
              <span>{currentSectionSelectedCount} of {catalogItems.length} available items selected for BOQ generation.</span>
            </div>
          </div>
        </section>

        <section className="boq-selection-page-header-secondary">
          <div className="boq-selection-header-copy">
            <span className="boq-selection-eyebrow">Item Selection Stage</span>
            <h2>{projectName || 'Project Workbook'}</h2>
            <p>{structureType || 'Bill of Quantities'} | {marketRegion} market benchmark | Estimate Sheet</p>
          </div>
          
          <div className="boq-selection-header-stats">
            <div className="boq-selection-stat">
              <span>Active Bill</span>
              <strong>{section?.title || 'No Selection'}</strong>
              <small>{currentSectionSelectedCount} items selected</small>
            </div>
            <div className="boq-selection-stat">
              <span>Subtotal</span>
              <strong>N0</strong>
              <small>0 pending pricing review</small>
            </div>
          </div>
        </section>

        <section className="boq-selection-tools">
          <div className="boq-selection-panel-card boq-selection-panel-card-wide">
            <span className="boq-selection-panel-label">Search Library</span>
            <div className="boq-selection-search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search by code, item, description, formula, or keyword"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <small className="boq-selection-panel-help">
              Search by code, item name, formula basis, benchmark hints, or keywords.
            </small>

            <div className="boq-selection-filter-section">
              <span className="boq-selection-panel-label">
                <ListFilter size={14} /> Quick Filters
              </span>
              <div className="boq-selection-chip-grid">
                {FILTER_OPTIONS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`boq-selection-chip ${activeFilter === filter.id ? 'active' : ''}`}
                    onClick={() => setActiveFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="boq-selection-tools-row">
              <label className="boq-selection-sort-field">
                <span>Sort results</span>
                <select value={activeSort} onChange={(event) => setActiveSort(event.target.value)}>
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div className="boq-selection-category-wrap">
                <span className="boq-selection-panel-label">Categories</span>
                <div className="boq-selection-category-list">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`boq-selection-category ${activeCategory === category ? 'active' : ''}`}
                      onClick={() => setActiveCategory(category)}
                    >
                      {category === 'all' ? 'All Categories' : category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="boq-selection-panel-card boq-selection-panel-card-summary">
            <span className="boq-selection-panel-label">
              <Sparkles size={14} /> Selection Summary
            </span>
            <div className="boq-selection-summary-grid">
              <div>
                <strong>{metrics.formulaReady}</strong>
                <span>formula-ready</span>
              </div>
              <div>
                <strong>{metrics.benchmarkReady}</strong>
                <span>benchmark-ready</span>
              </div>
            </div>
            <p className="boq-selection-panel-copy">
              {selectedPreview
                ? `Current picks include ${selectedPreview}${currentSectionSelectedCount > 3 ? '...' : ''}`
                : 'Pick only the exact lines you want before generating the BOQ sheet.'}
            </p>
            <div className="boq-selection-selected-preview">
              {selectedItems.length > 0 ? (
                <>
                  {selectedItems.slice(0, 5).map((item) => (
                    <span key={item.code}>{item.name}</span>
                  ))}
                  {selectedItems.length > 5 && (
                    <em>+{selectedItems.length - 5} more</em>
                  )}
                </>
              ) : (
                <span className="boq-selection-selected-placeholder">No items selected in this bill yet.</span>
              )}
            </div>
            <div className="boq-selection-panel-actions">
              <button
                type="button"
                className="boq-selection-btn secondary"
                onClick={() => onClearBill?.()}
                disabled={currentSectionSelectedCount === 0}
              >
                <RotateCcw size={14} /> Clear Bill
              </button>
              <button
                type="button"
                className="boq-selection-btn secondary"
                onClick={() => onSelectVisible?.(visibleCodes)}
                disabled={visibleCodes.length === 0}
              >
                <Plus size={14} /> Select Visible
              </button>
              <button
                type="button"
                className="boq-selection-btn tertiary"
                onClick={clearFilters}
              >
                Reset Filters
              </button>
            </div>
          </div>
        </section>

        <section className="boq-selection-results">
          <div className="boq-selection-results-head">
            <div>
              <span className="boq-selection-results-label">Available Items</span>
              <strong>{filteredItems.length} visible item{filteredItems.length === 1 ? '' : 's'}</strong>
              <small>{currentSectionSelectedCount} selected in this bill</small>
            </div>
            <div className="boq-selection-results-badges">
              <span>{section?.title || 'Current bill'}</span>
              <span>{activeCategory === 'all' ? 'All categories' : activeCategory}</span>
              <span>{activeFilter === 'all' ? 'All items' : FILTER_OPTIONS.find((entry) => entry.id === activeFilter)?.label}</span>
            </div>
          </div>
          <div className="boq-selection-results-toolbar">
            <div className="boq-selection-results-stats">
              <div className="boq-selection-results-stat">
                <strong>{visibleSelectedCount}</strong>
                <span>selected in view</span>
              </div>
              <div className="boq-selection-results-stat">
                <strong>{metrics.formulaReady}</strong>
                <span>formula-ready in library</span>
              </div>
              <div className="boq-selection-results-stat">
                <strong>{metrics.benchmarkReady}</strong>
                <span>benchmark-backed in library</span>
              </div>
            </div>
            {selectedItems.length > 0 && (
              <button
                type="button"
                className="boq-selection-inline-link"
                onClick={() => setActiveFilter(activeFilter === 'selected' ? 'all' : 'selected')}
              >
                {activeFilter === 'selected' ? 'Show full bill library' : 'Show selected items only'}
              </button>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <div className="boq-selection-empty">
              <strong>No items match the current filters.</strong>
              <span>Try a broader search or clear the active chips to see the full bill library.</span>
              <button type="button" className="boq-selection-btn secondary" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="boq-selection-grid">
              {filteredItems.map((item) => {
                const isSelected = selectedCodeSet.has(item.code);
                const hasFormula = hasFormulaSupport(item);
                const benchmarkValue = getBenchmarkValue(item);
                const hasBenchmark = benchmarkValue > 0;
                const formulaText = getFormulaDisplayText(item);
                const workedExample = hasFormula ? getWorkedExamplePreview(item) : '';
                const formulaBasisPreview = Array.isArray(item.formulaBasis) && item.formulaBasis.length > 0
                  ? item.formulaBasis[0]
                  : '';
                const benchmarkCurrency = item.benchmarkMetadata?.currency || 'NGN';

                return (
                  <button
                    key={item.code}
                    type="button"
                    className={`boq-selection-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => onToggleItem?.(item.code)}
                  >
                    <div className="boq-selection-card-kicker">
                      <span className="boq-selection-code">{item.code}</span>
                      <div className="boq-selection-card-tags">
                        <span>{item.category || 'General'}</span>
                        <span>{item.unit || 'Nr'}</span>
                      </div>
                    </div>
                    <div className="boq-selection-card-top">
                      <div className="boq-selection-card-heading">
                        <strong>{item.name}</strong>
                      </div>
                      <span className={`boq-selection-state ${isSelected ? 'selected' : ''}`}>
                        {isSelected ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                        {isSelected ? 'Selected' : 'Add'}
                      </span>
                    </div>

                    <p>{item.description || item.name}</p>

                    <div className="boq-selection-card-flags">
                      <span className={`boq-selection-flag ${hasFormula ? 'ready' : 'pending'}`}>
                        {hasFormula ? 'Formula ready' : 'Manual only'}
                      </span>
                      <span className={`boq-selection-flag ${hasBenchmark ? 'ready' : 'pending'}`}>
                        {hasBenchmark ? 'Benchmark ready' : 'Benchmark pending'}
                      </span>
                      {item.isRecommended && (
                        <span className="boq-selection-flag boq-selection-flag-recommended">Recommended</span>
                      )}
                    </div>

                    <div className="boq-selection-card-meta">
                      <span>Unit: {item.unit || 'Nr'}</span>
                      {hasBenchmark && (
                        <span>{benchmarkCurrency} {benchmarkValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      )}
                      {!hasBenchmark && <span>Add benchmark later</span>}
                    </div>

                    {item.pickerHint && (
                      <div className="boq-selection-hint">{item.pickerHint}</div>
                    )}

                    {formulaBasisPreview && (
                      <div className="boq-selection-card-basis">
                        <strong>Pricing basis</strong>
                        <span>{formulaBasisPreview}</span>
                      </div>
                    )}

                    {formulaText && (
                      <div className="boq-selection-formula">
                        <strong>Formula Preview</strong>
                        <span>{formulaText}</span>
                        {workedExample && <small>{workedExample}</small>}
                      </div>
                    )}

                    <div className="boq-selection-card-footer">
                      <span>{isSelected ? 'Included in BOQ generation' : 'Tap to include in BOQ generation'}</span>
                      <strong>{isSelected ? 'Remove item' : 'Add item'}</strong>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <footer className="boq-selection-footer">
          <div className="boq-selection-footer-copy">
            <strong>{totalSelectedCount} item{totalSelectedCount === 1 ? '' : 's'} ready for BOQ generation</strong>
            <span>
              Generate the BOQ only when you are happy with the selected items across all bills.
            </span>
          </div>

          <div className="boq-selection-footer-actions">
            {hasGeneratedBoq && onReturnToWorkspace && (
              <button type="button" className="boq-selection-btn secondary" onClick={onReturnToWorkspace}>
                <FileSpreadsheet size={14} /> Return to BOQ
              </button>
            )}
            {hasNextSection && (
              <button type="button" className="boq-selection-btn secondary" onClick={onNextSection}>
                Next Bill <ArrowRight size={14} />
              </button>
            )}
            <button
              type="button"
              className="boq-selection-btn primary"
              onClick={onGenerate}
              disabled={totalSelectedCount === 0}
            >
              <FileSpreadsheet size={14} /> {generateLabel}
            </button>
          </div>
        </footer>
      </div>
      <style jsx="true">{`
        .boq-selection-shell {
          height: 100vh;
          max-height: 100vh;
          display: grid;
          grid-template-columns: 340px minmax(0, 1fr);
          background: #ffffff;
          overflow: hidden;
        }

        /* --- SIDEBAR --- */
        .boq-selection-sidebar {
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          z-index: 10;
        }

        .boq-selection-sidebar-head {
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          background: #f8fafc;
        }

        .boq-selection-eyebrow {
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #64748b;
        }

        .boq-selection-sidebar-head strong {
          font-size: 1.35rem;
          color: #0f172a;
          line-height: 1.2;
          font-weight: 900;
        }

        .boq-selection-sidebar-head small {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 500;
        }

        .boq-selection-sidebar-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 1rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          scrollbar-width: thin;
        }

        .boq-selection-sidebar-list::-webkit-scrollbar { width: 4px; }
        .boq-selection-sidebar-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

        .boq-selection-sidebar-item {
          display: grid;
          grid-template-columns: 44px 1fr;
          align-items: center;
          gap: 1.2rem;
          padding: 1.15rem;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          text-align: left;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .boq-selection-sidebar-item:hover {
          transform: translateY(-2px);
          border-color: #cbd5e1;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }

        .boq-selection-sidebar-item.active {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 12px 32px rgba(37, 99, 235, 0.1);
          transform: none;
          z-index: 2;
        }

        .boq-selection-index {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: #f1f5f9;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 900;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .active .boq-selection-index {
          background: #2563eb;
          color: white;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
        }

        .boq-selection-copy {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          min-width: 0;
        }

        .boq-selection-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .boq-selection-title-row strong {
          font-size: 0.95rem;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 800;
        }

        .boq-selection-active-pill {
          padding: 0.2rem 0.5rem;
          background: #eff6ff;
          color: #2563eb;
          border-radius: 999px;
          font-size: 0.6rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          flex-shrink: 0;
        }

        .boq-selection-meta-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .boq-selection-meta-row small {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
        }

        .boq-selection-meta-row small.highlighted {
          color: #16a34a;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .boq-selection-meta-row small.highlighted::before {
          content: '•';
          font-size: 1.2rem;
        }

        .boq-selection-sidebar-footer {
          padding: 1.75rem;
          border-top: 1px solid #e2e8f0;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.02);
        }

        .boq-selection-sidebar-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .boq-selection-sidebar-summary span {
          font-size: 0.8rem;
          font-weight: 700;
          color: #64748b;
        }

        .boq-selection-sidebar-summary strong {
          font-size: 1.05rem;
          color: #0f172a;
          font-weight: 900;
        }

        .boq-selection-generate-btn {
          width: 100%;
          padding: 1.1rem;
          background: #0f172a;
          color: white;
          border: none;
          border-radius: 18px;
          font-size: 0.95rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2);
        }

        .boq-selection-generate-btn:hover:not(:disabled) {
          background: #1e293b;
          transform: translateY(-3px);
          box-shadow: 0 15px 35px rgba(15, 23, 42, 0.25);
        }

        .boq-selection-generate-btn:active:not(:disabled) {
          transform: translateY(-1px);
        }

        .boq-selection-generate-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          box-shadow: none;
          background: #94a3b8;
        }

        .boq-selection-return-link {
          background: none;
          border: none;
          color: #64748b;
          font-size: 0.8rem;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          text-align: center;
          transition: color 0.2s;
        }
        .boq-selection-return-link:hover { color: #0f172a; }

        /* --- CONTENT AREA --- */
        .boq-selection-content {
          flex: 1;
          height: 100%;
          overflow-y: auto;
          background: #ffffff;
          padding: 3rem 4rem;
          display: flex;
          flex-direction: column;
          gap: 3rem;
          scrollbar-width: thin;
        }

        .boq-selection-content::-webkit-scrollbar { width: 8px; }
        .boq-selection-content::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

        .boq-selection-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 3rem;
          padding-bottom: 2.5rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .boq-selection-header-copy { flex: 1; }

        .boq-selection-header-copy h2 {
          font-size: 2.75rem;
          font-weight: 900;
          color: #0f172a;
          margin: 0.75rem 0;
          letter-spacing: -0.035em;
          line-height: 1;
        }

        .boq-selection-header-copy p {
          font-size: 1.1rem;
          color: #64748b;
          font-weight: 500;
          max-width: 600px;
        }

        .boq-selection-header-stats {
          display: flex;
          gap: 1.25rem;
        }

        .boq-selection-stat {
          background: white;
          padding: 1.5rem 1.75rem;
          border-radius: 24px;
          border: 1px solid #f1f5f9;
          min-width: 240px;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.02);
        }

        .boq-selection-stat span {
          font-size: 0.7rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .boq-selection-stat strong {
          font-size: 1.45rem;
          color: #0f172a;
          font-weight: 900;
          line-height: 1.1;
        }

        .boq-selection-stat small {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 500;
        }

        .boq-selection-stat:first-child {
          border-color: #dbeafe;
          background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
        }

        .boq-selection-stat:first-child strong { color: #2563eb; }

        /* --- RESULTS GRID --- */
        .boq-selection-results {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .boq-selection-results-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .boq-selection-results-label {
          font-size: 0.8rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          display: block;
          margin-bottom: 0.5rem;
        }

        .boq-selection-results-head strong {
          font-size: 1.5rem;
          font-weight: 900;
          color: #0f172a;
        }

        .boq-selection-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.5rem;
        }

        .boq-selection-card {
          background: white;
          border: 1.5px solid #f1f5f9;
          border-radius: 24px;
          padding: 1.75rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          position: relative;
          overflow: hidden;
        }

        .boq-selection-card:hover {
          border-color: #cbd5e1;
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
        }

        .boq-selection-card.selected {
          border-color: #2563eb;
          background: #f9fbff;
          box-shadow: 0 12px 40px rgba(37, 99, 235, 0.1);
        }

        .boq-selection-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .boq-selection-card-heading strong {
          font-size: 1.15rem;
          color: #0f172a;
          line-height: 1.35;
          font-weight: 800;
          display: block;
        }

        .boq-selection-state {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.85rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 800;
          transition: all 0.2s;
          background: #f1f5f9;
          color: #64748b;
        }

        .boq-selection-state.selected {
          background: #2563eb;
          color: white;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .boq-selection-card p {
          font-size: 0.95rem;
          line-height: 1.6;
          color: #475569;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .boq-selection-card-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1.25rem;
          border-top: 1px solid #f1f5f9;
        }

        .boq-selection-card-footer span {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 600;
        }

        .boq-selection-card-footer strong {
          font-size: 0.8rem;
          color: #0f172a;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .selected .boq-selection-card-footer strong { color: #2563eb; }

        .boq-selection-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6rem 2rem;
          text-align: center;
          background: #f8fafc;
          border-radius: 40px;
          border: 2px dashed #e2e8f0;
          gap: 1.25rem;
        }

        .boq-selection-empty strong { font-size: 1.5rem; color: #0f172a; font-weight: 800; }
        .boq-selection-empty span { font-size: 1.1rem; color: #64748b; max-width: 450px; line-height: 1.5; }
        .boq-selection-tools {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.95fr);
          gap: 1rem;
          min-height: 0;
        }

        .boq-selection-panel-card {
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.06);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          min-width: 0;
        }

        .boq-selection-panel-card-wide {
          gap: 0.95rem;
        }

        .boq-selection-filter-section {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .boq-selection-tools-row {
          display: grid;
          grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
          gap: 1rem;
          align-items: start;
        }

        .boq-selection-category-wrap {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .boq-selection-panel-label {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .boq-selection-search {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          border: 1px solid #dbe3ef;
          border-radius: 16px;
          padding: 0.82rem 0.95rem;
          background: #f8fafc;
        }

        .boq-selection-search input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.92rem;
          color: #0f172a;
        }

        .boq-selection-panel-help {
          margin: 0;
          font-size: 0.76rem;
          color: #64748b;
          line-height: 1.55;
        }

        .boq-selection-chip-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 0.45rem;
        }

        .boq-selection-chip,
        .boq-selection-category {
          border: 1px solid #dbe3ef;
          background: #f8fafc;
          color: #334155;
          border-radius: 14px;
          padding: 0.6rem 0.72rem;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
        }

        .boq-selection-chip.active,
        .boq-selection-category.active {
          background: #0f172a;
          border-color: #0f172a;
          color: white;
        }

        .boq-selection-category-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }

        .boq-selection-sort-field {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          color: #475569;
          font-size: 0.76rem;
          font-weight: 700;
        }

        .boq-selection-sort-field select {
          border: 1px solid #dbe3ef;
          border-radius: 14px;
          background: #f8fafc;
          color: #0f172a;
          padding: 0.7rem 0.85rem;
          font-size: 0.84rem;
          outline: none;
        }

        .boq-selection-summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.65rem;
        }

        .boq-selection-summary-grid div {
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.18rem;
        }

        .boq-selection-summary-grid strong {
          font-size: 1.1rem;
          color: #0f172a;
        }

        .boq-selection-summary-grid span {
          font-size: 0.72rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .boq-selection-panel-copy {
          margin: 0;
          font-size: 0.8rem;
          line-height: 1.6;
          color: #475569;
        }

        .boq-selection-selected-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }

        .boq-selection-selected-preview span,
        .boq-selection-selected-preview em {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0.35rem 0.7rem;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          font-size: 0.72rem;
          font-style: normal;
          font-weight: 700;
        }

        .boq-selection-selected-preview .boq-selection-selected-placeholder {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #64748b;
        }

        .boq-selection-panel-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
        }

        .boq-selection-results {
          min-width: 0;
          border-radius: 28px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .boq-selection-results-head {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
          padding-bottom: 0.95rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .boq-selection-results-head strong {
          display: block;
          color: #0f172a;
          font-size: 1.1rem;
          margin-top: 0.22rem;
        }

        .boq-selection-results-head small,
        .boq-selection-results-label {
          display: block;
          color: #64748b;
          font-size: 0.76rem;
        }

        .boq-selection-results-label {
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .boq-selection-results-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          justify-content: flex-end;
        }

        .boq-selection-results-badges span {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 0.38rem 0.72rem;
          font-size: 0.74rem;
          font-weight: 700;
        }

        .boq-selection-results-toolbar {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .boq-selection-results-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .boq-selection-results-stat {
          min-width: 150px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 0.75rem 0.9rem;
          display: flex;
          flex-direction: column;
          gap: 0.18rem;
        }

        .boq-selection-results-stat strong {
          color: #0f172a;
          font-size: 1rem;
        }

        .boq-selection-results-stat span {
          color: #64748b;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .boq-selection-inline-link {
          border: none;
          background: transparent;
          color: #2563eb;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
        }

        .boq-selection-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 1rem;
        }

        .boq-selection-card {
          border: 1px solid #dbe3ef;
          border-radius: 22px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          padding: 1rem;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .boq-selection-card:hover {
          transform: translateY(-2px);
          border-color: #60a5fa;
          box-shadow: 0 18px 36px rgba(37, 99, 235, 0.08);
        }

        .boq-selection-card.selected {
          border-color: #2563eb;
          background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .boq-selection-card-kicker {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .boq-selection-card-top {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          align-items: flex-start;
        }

        .boq-selection-card-heading {
          min-width: 0;
        }

        .boq-selection-code {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0.26rem 0.56rem;
          background: #dbeafe;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #2563eb;
        }

        .boq-selection-card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }

        .boq-selection-card-tags span {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0.28rem 0.58rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.68rem;
          font-weight: 700;
        }

        .boq-selection-card strong {
          color: #0f172a;
          font-size: 1rem;
          line-height: 1.35;
        }

        .boq-selection-card p {
          margin: 0;
          font-size: 0.84rem;
          line-height: 1.6;
          color: #475569;
        }

        .boq-selection-state {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          border-radius: 999px;
          padding: 0.4rem 0.72rem;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 0.72rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .boq-selection-state.selected {
          background: #0f172a;
          color: white;
        }

        .boq-selection-card-meta,
        .boq-selection-card-flags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }

        .boq-selection-card-meta span {
          font-size: 0.74rem;
          color: #475569;
        }

        .boq-selection-flag {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0.25rem 0.6rem;
          border: 1px solid #dbe3ef;
          background: #f8fafc;
          font-size: 0.66rem;
          font-weight: 700;
          color: #64748b;
        }

        .boq-selection-flag.ready {
          border-color: #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .boq-selection-flag-recommended {
          border-color: #fde68a;
          background: #fffbeb;
          color: #b45309;
        }

        .boq-selection-hint {
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 0.72rem 0.8rem;
          font-size: 0.74rem;
          color: #475569;
          line-height: 1.55;
        }

        .boq-selection-card-basis {
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 0.72rem 0.8rem;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .boq-selection-card-basis strong {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #64748b;
        }

        .boq-selection-card-basis span {
          font-size: 0.77rem;
          color: #334155;
          line-height: 1.5;
        }

        .boq-selection-formula {
          border-radius: 16px;
          border: 1px solid #ddd6fe;
          background: #f5f3ff;
          padding: 0.82rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          color: #5b21b6;
        }

        .boq-selection-formula strong {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: inherit;
        }

        .boq-selection-formula span,
        .boq-selection-formula small {
          font-size: 0.76rem;
          line-height: 1.5;
        }

        .boq-selection-card-footer {
          margin-top: auto;
          padding-top: 0.15rem;
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          align-items: center;
          color: #475569;
          font-size: 0.75rem;
        }

        .boq-selection-card-footer strong {
          color: #0f172a;
          font-size: 0.76rem;
          white-space: nowrap;
        }

        .boq-selection-empty {
          min-height: 320px;
          border: 1px dashed #cbd5e1;
          border-radius: 24px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          text-align: center;
          color: #64748b;
          padding: 2rem;
        }

        .boq-selection-footer {
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
          padding: 1rem 1.2rem;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
        }

        .boq-selection-footer-copy {
          display: flex;
          flex-direction: column;
          gap: 0.24rem;
        }

        .boq-selection-footer-copy strong {
          color: #0f172a;
          font-size: 0.94rem;
        }

        .boq-selection-footer-copy span {
          color: #64748b;
          font-size: 0.78rem;
        }

        .boq-selection-footer-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .boq-selection-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          min-width: 136px;
          border-radius: 14px;
          border: 1px solid transparent;
          padding: 0.82rem 1rem;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
        }

        .boq-selection-btn.primary {
          background: #2563eb;
          color: white;
        }

        .boq-selection-btn.secondary {
          background: #f8fafc;
          color: #334155;
          border-color: #cbd5e1;
        }

        .boq-selection-btn.tertiary {
          background: transparent;
          border-color: #e2e8f0;
          color: #64748b;
          min-width: 0;
        }

        .boq-selection-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        @media (max-width: 1280px) {
          .boq-selection-overview,
          .boq-selection-tools {
            grid-template-columns: 1fr;
          }

          .boq-selection-tools-row {
            grid-template-columns: 1fr;
          }

          .boq-selection-overview-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1080px) {
          .boq-selection-shell {
            grid-template-columns: 1fr;
            height: auto;
            overflow: visible;
            padding: 0.9rem;
          }

          .boq-selection-content {
            overflow: visible;
            padding-right: 0;
          }

          .boq-selection-bill-browser {
            position: static;
            height: auto;
            max-height: none;
            padding: 0.9rem;
          }

          .boq-selection-bill-tabs {
            display: grid;
            grid-auto-flow: column;
            grid-auto-columns: minmax(220px, 1fr);
            overflow-x: auto;
            overflow-y: hidden;
            padding-bottom: 0.15rem;
          }

          .boq-selection-overview-stats {
            grid-template-columns: 1fr;
          }

          .boq-selection-results-head,
          .boq-selection-results-toolbar,
          .boq-selection-footer {
            flex-direction: column;
            align-items: stretch;
          }
        }

        @media (max-width: 720px) {
          .boq-selection-bill-browser-summary {
            grid-template-columns: 1fr;
          }

          .boq-selection-bill-tab {
            padding: 0.72rem 0.78rem;
            grid-template-columns: 36px minmax(0, 1fr);
          }

          .boq-selection-bill-index {
            width: 36px;
            height: 36px;
          }

          .boq-selection-chip-grid {
            grid-template-columns: 1fr;
          }

          .boq-selection-grid {
            grid-template-columns: 1fr;
          }

          .boq-selection-footer-actions {
            justify-content: stretch;
          }

          .boq-selection-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default BOQSelectionStage;
