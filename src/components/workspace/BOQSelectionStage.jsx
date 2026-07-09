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
const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase();
const buildItemNameText = (item) => normalizeSearchValue(item?.name);

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

const matchesItemSearch = (searchName, searchLibrary, normalizedQuery, queryTerms) => {
  if (!normalizedQuery) return true;
  if (searchName.includes(normalizedQuery)) return true;
  if (queryTerms.length > 1 && queryTerms.every((term) => searchName.includes(term))) return true;
  return searchLibrary.includes(normalizedQuery);
};

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
  const searchableItems = React.useMemo(() => (
    (catalogItems || []).map((item) => ({
      item,
      searchName: buildItemNameText(item),
      searchLibrary: buildSearchText(item),
    }))
  ), [catalogItems]);

  const categories = React.useMemo(() => (
    ['all', ...Array.from(new Set(
      (catalogItems || [])
        .map((item) => item.category || 'General')
        .filter(Boolean)
    ))]
  ), [catalogItems]);

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);
    const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);

    const filtered = searchableItems.filter(({ item, searchName, searchLibrary }) => {
      const itemCategory = item.category || 'General';
      const hasFormula = hasFormulaSupport(item);
      const hasBenchmark = getBenchmarkValue(item) > 0;
      const isSelected = selectedCodeSet.has(item.code);

      const matchesQuery = matchesItemSearch(searchName, searchLibrary, normalizedQuery, queryTerms);
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

    return filtered.map(({ item }) => item).sort((leftItem, rightItem) => {
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
  }, [activeCategory, activeFilter, activeSort, query, searchableItems, selectedCodeSet]);

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
    <div className="boq-selection-shell obsidian-surface">
      <aside className="boq-selection-sidebar glass-panel">
        <div className="boq-selection-sidebar glass-panel-head">
          <span className="boq-selection-eyebrow emerald-text-gradient">BOQ Bills</span>
          <strong>Bill Navigator</strong>
          <small>{sections.length} active bill{sections.length === 1 ? '' : 's'} in this structure.</small>
        </div>

        <div className="boq-selection-sidebar-search-wrap">
          <span className="boq-selection-sidebar-search-label">Search Items</span>
          <div className="boq-selection-search glass-input boq-selection-search-sidebar">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search items..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
              aria-label="Search items"
            />
          </div>
        </div>

        <div className="boq-selection-sidebar glass-panel-list">
          {(sections || []).map((entry, index) => {
            const isActive = activeBillSectionId === entry.id;
            const selectedCount = selectionCountsBySection?.[entry.id] || 0;
            const libraryCount = sectionLibraryCounts?.[entry.id] || 0;
            
            return (
              <button
                key={entry.id}
                type="button"
                className={`boq-selection-sidebar glass-panel-item ${isActive ? 'active' : ''}`}
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

        <div className="boq-selection-sidebar glass-panel-footer">
          <div className="boq-selection-sidebar glass-panel-summary">
            <span>Total Selected</span>
            <strong>{totalSelectedCount} items</strong>
          </div>
          <button
            type="button"
            className="boq-selection-generate-btn emerald-button"
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

      <div className="boq-selection-content staggered-fade-in">
        <section className="boq-selection-page-header">
          <div className="boq-selection-overview-copy">
            <span className="boq-selection-eyebrow emerald-text-gradient">{structureType || 'Item Selection Stage'}</span>
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
            <span className="boq-selection-eyebrow emerald-text-gradient">Item Selection Stage</span>
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
          <div className="boq-selection-panel-card glass-card boq-selection-panel-card glass-card-wide">
            <span className="boq-selection-panel-label">Search Library</span>
            <div className="boq-selection-search glass-input">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search items..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
                aria-label="Search items"
              />
            </div>
            <small className="boq-selection-panel-help">
              Search instantly by item name, with support for partial words and quick keyword fallback.
            </small>

            <div className="boq-selection-filter-section">
              <span className="boq-selection-panel-label">
                <ListFilter size={14} /> Quick Filters
              </span>
              <div className="boq-selection-chip glass-card-grid">
                {FILTER_OPTIONS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`boq-selection-chip glass-card ${activeFilter === filter.id ? 'active' : ''}`}
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

              <div className="boq-selection-category glass-card-wrap">
                <span className="boq-selection-panel-label">Categories</span>
                <div className="boq-selection-category glass-card-list">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`boq-selection-category glass-card ${activeCategory === category ? 'active' : ''}`}
                      onClick={() => setActiveCategory(category)}
                    >
                      {category === 'all' ? 'All Categories' : category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="boq-selection-panel-card glass-card boq-selection-panel-card glass-card-summary">
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
                    className={`boq-selection-card glass-card boq-item ${isSelected ? 'selected' : ''}`}
                    data-item-name={item.name || ''}
                    onClick={() => onToggleItem?.(item.code)}
                  >
                    <div className="boq-selection-card glass-card-kicker">
                      <span className="boq-selection-code">{item.code}</span>
                      <div className="boq-selection-card glass-card-tags">
                        <span>{item.category || 'General'}</span>
                        <span>{item.unit || 'Nr'}</span>
                      </div>
                    </div>
                    <div className="boq-selection-card glass-card-top">
                      <div className="boq-selection-card glass-card-heading">
                        <strong>{item.name}</strong>
                      </div>
                      <span className={`boq-selection-state ${isSelected ? 'selected' : ''}`}>
                        {isSelected ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                        {isSelected ? 'Selected' : 'Add'}
                      </span>
                    </div>

                    <p>{item.description || item.name}</p>

                    <div className="boq-selection-card glass-card-flags">
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

                    <div className="boq-selection-card glass-card-meta">
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
                      <div className="boq-selection-card glass-card-basis">
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

                    <div className="boq-selection-card glass-card-footer">
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
        /* ═══════════════════════════════════════════════════════
           BOQ Selection Stage — Premium UI
           ═══════════════════════════════════════════════════════ */

        @keyframes selectionFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes selectionSlideRight {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes selectionPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.2); }
          50%      { box-shadow: 0 0 0 6px rgba(37, 99, 235, 0); }
        }
        @keyframes selectionGlow {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }

        .boq-selection-shell.obsidian-surface {
          height: 100vh;
          max-height: 100vh;
          display: grid;
          grid-template-columns: 340px minmax(0, 1fr);
          background: #f8fafc;
          overflow: hidden;
        }

        /* ═══════ SIDEBAR ═══════ */
        .boq-selection-sidebar.glass-panel {
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 40%, #f1f5f9 100%);
          border-right: 1px solid rgba(226, 232, 240, 0.8);
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          z-index: 10;
          box-shadow: 4px 0 24px rgba(15, 23, 42, 0.03);
        }

        .boq-selection-sidebar.glass-panel-head {
          padding: 2rem 1.5rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          background: linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%);
          position: relative;
          overflow: hidden;
        }
        .boq-selection-sidebar.glass-panel-head::after {
          content: '';
          position: absolute;
          top: -40%;
          right: -20%;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .boq-selection-eyebrow.emerald-text-gradient {
          font-size: 0.62rem;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          position: relative;
          z-index: 1;
        }

        .boq-selection-sidebar.glass-panel-head strong {
          font-size: 1.35rem;
          color: #0f172a;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: -0.025em;
          position: relative;
          z-index: 1;
        }

        .boq-selection-sidebar.glass-panel-head small {
          font-size: 0.82rem;
          color: #64748b;
          font-weight: 500;
          line-height: 1.45;
          position: relative;
          z-index: 1;
        }

        .boq-selection-sidebar-search-wrap {
          padding: 1rem 1rem 0.9rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          border-top: 1px solid rgba(226, 232, 240, 0.5);
          background: rgba(248, 250, 252, 0.6);
        }

        .boq-selection-sidebar-search-label {
          font-size: 0.62rem;
          font-weight: 900;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .boq-selection-sidebar.glass-panel-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 1rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          scrollbar-width: thin;
          scrollbar-color: #dbeafe transparent;
        }

        .boq-selection-sidebar.glass-panel-list::-webkit-scrollbar { width: 4px; }
        .boq-selection-sidebar.glass-panel-list::-webkit-scrollbar-thumb { background: #dbeafe; border-radius: 4px; }

        .boq-selection-sidebar.glass-panel-item {
          display: grid;
          grid-template-columns: 44px 1fr;
          align-items: center;
          gap: 1.1rem;
          padding: 1.05rem 1rem;
          border-radius: 16px;
          border: 1.5px solid rgba(226, 232, 240, 0.6);
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(6px);
          text-align: left;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          animation: selectionSlideRight 0.4s ease-out both;
        }

        .boq-selection-sidebar.glass-panel-item:hover {
          transform: translateY(-2px) translateX(2px);
          border-color: #93c5fd;
          box-shadow: 0 8px 28px rgba(37, 99, 235, 0.06);
          background: #ffffff;
        }

        .boq-selection-sidebar.glass-panel-item.active {
          border-color: #2563eb;
          background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08), 0 12px 32px rgba(37, 99, 235, 0.1);
          transform: none;
          z-index: 2;
        }

        .boq-selection-index {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.82rem;
          font-weight: 900;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .active .boq-selection-index {
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
          color: white;
          box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35);
        }

        .boq-selection-copy { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
        .boq-selection-title-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .boq-selection-title-row strong { font-size: 0.9rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 800; letter-spacing: -0.01em; }

        .boq-selection-active-pill {
          padding: 0.2rem 0.55rem;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          color: #1d4ed8;
          border-radius: 999px;
          font-size: 0.56rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          flex-shrink: 0;
          border: 1px solid #bfdbfe;
          animation: selectionPulse 2.5s ease-in-out infinite;
        }

        .boq-selection-meta-row { display: flex; align-items: center; gap: 0.6rem; }
        .boq-selection-meta-row small { font-size: 0.72rem; color: #94a3b8; font-weight: 600; }
        .boq-selection-meta-row small.highlighted { color: #059669; font-weight: 800; display: flex; align-items: center; gap: 0.25rem; }
        .boq-selection-meta-row small.highlighted::before { content: '•'; font-size: 1.2rem; animation: selectionGlow 2s ease-in-out infinite; }

        .boq-selection-sidebar.glass-panel-footer {
          padding: 1.5rem;
          border-top: 1px solid rgba(226, 232, 240, 0.6);
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          box-shadow: 0 -8px 28px rgba(15, 23, 42, 0.03);
        }

        .boq-selection-sidebar.glass-panel-summary { display: flex; justify-content: space-between; align-items: center; }
        .boq-selection-sidebar.glass-panel-summary span { font-size: 0.76rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .boq-selection-sidebar.glass-panel-summary strong { font-size: 1.08rem; color: #0f172a; font-weight: 900; }

        .boq-selection-generate-btn.emerald-button {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
          color: white;
          border: none;
          border-radius: 16px;
          font-size: 0.9rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.7rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2);
          letter-spacing: -0.01em;
          position: relative;
          overflow: hidden;
        }
        .boq-selection-generate-btn.emerald-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%);
          transform: translateY(-3px);
          box-shadow: 0 14px 36px rgba(15, 23, 42, 0.3);
        }
        .boq-selection-generate-btn.emerald-button:active:not(:disabled) { transform: translateY(-1px) scale(0.985); }
        .boq-selection-generate-btn.emerald-button:disabled { opacity: 0.3; cursor: not-allowed; box-shadow: none; background: #94a3b8; }

        .boq-selection-return-link {
          background: none; border: none; color: #64748b; font-size: 0.78rem; font-weight: 700;
          text-decoration: none; cursor: pointer; text-align: center; transition: all 0.2s; padding: 0.4rem; border-radius: 8px;
        }
        .boq-selection-return-link:hover { color: #2563eb; background: rgba(37, 99, 235, 0.04); }

        /* ═══════ CONTENT AREA ═══════ */
        .boq-selection-content.staggered-fade-in {
          flex: 1; height: 100%; overflow-y: auto;
          background: linear-gradient(180deg, #f8fafc 0%, #ffffff 30%, #f8fafc 100%);
          padding: 2.5rem 3.5rem;
          display: flex; flex-direction: column; gap: 2.5rem;
          scrollbar-width: thin; scrollbar-color: #dbeafe transparent;
          animation: selectionFadeIn 0.5s ease-out;
        }
        .boq-selection-content.staggered-fade-in::-webkit-scrollbar { width: 6px; }
        .boq-selection-content.staggered-fade-in::-webkit-scrollbar-thumb { background: #dbeafe; border-radius: 6px; }

        .boq-selection-page-header {
          display: flex; justify-content: space-between; align-items: flex-end; gap: 2.5rem;
          padding-bottom: 2rem; border-bottom: 1px solid rgba(226, 232, 240, 0.5);
        }

        .boq-selection-overview-copy { flex: 1; }
        .boq-selection-overview-copy h2 { font-size: 2rem; font-weight: 900; color: #0f172a; margin: 0.65rem 0; letter-spacing: -0.035em; line-height: 1.1; }
        .boq-selection-overview-copy p { font-size: 1rem; color: #64748b; font-weight: 500; max-width: 580px; line-height: 1.6; }

        .boq-selection-overview-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.75rem; }
        .boq-selection-overview-tags span { display: inline-flex; align-items: center; padding: 0.3rem 0.7rem; border-radius: 999px; background: #f1f5f9; border: 1px solid #e2e8f0; font-size: 0.68rem; font-weight: 700; color: #475569; }

        .boq-selection-progress-block { flex-shrink: 0; }
        .boq-selection-progress-copy { display: flex; flex-direction: column; gap: 0.2rem; }
        .boq-selection-progress-copy strong { font-size: 1.1rem; color: #0f172a; font-weight: 900; }
        .boq-selection-progress-copy span { font-size: 0.82rem; color: #64748b; font-weight: 500; }

        .boq-selection-header-copy { flex: 1; }
        .boq-selection-header-copy h2 { font-size: 2.75rem; font-weight: 900; color: #0f172a; margin: 0.75rem 0; letter-spacing: -0.035em; line-height: 1; }
        .boq-selection-header-copy p { font-size: 1.1rem; color: #64748b; font-weight: 500; max-width: 600px; }

        .boq-selection-page-header-secondary { display: flex; justify-content: space-between; align-items: flex-end; gap: 3rem; padding-bottom: 2.5rem; border-bottom: 1px solid rgba(226, 232, 240, 0.5); }
        .boq-selection-header-stats { display: flex; gap: 1rem; }

        .boq-selection-stat {
          background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px);
          padding: 1.35rem 1.5rem; border-radius: 20px; border: 1.5px solid rgba(226, 232, 240, 0.6);
          min-width: 220px; display: flex; flex-direction: column; gap: 0.35rem;
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.03); transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .boq-selection-stat:hover { border-color: #93c5fd; box-shadow: 0 8px 28px rgba(37, 99, 235, 0.06); transform: translateY(-2px); }
        .boq-selection-stat span { font-size: 0.62rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.12em; }
        .boq-selection-stat strong { font-size: 1.4rem; color: #0f172a; font-weight: 900; line-height: 1.1; letter-spacing: -0.02em; }
        .boq-selection-stat small { font-size: 0.76rem; color: #64748b; font-weight: 500; }
        .boq-selection-stat:first-child { border-color: rgba(147, 197, 253, 0.5); background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%); }
        .boq-selection-stat:first-child strong { background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        /* ═══════ TOOLS ═══════ */
        .boq-selection-results { min-width: 0; border-radius: 22px; border: 1.5px solid rgba(226, 232, 240, 0.5); background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(12px); box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02), 0 16px 48px rgba(15, 23, 42, 0.05); padding: 1.15rem; display: flex; flex-direction: column; gap: 1rem; }
        .boq-selection-tools { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.95fr); gap: 1rem; min-height: 0; }

        .boq-selection-panel-card.glass-card {
          border-radius: 20px; border: 1.5px solid rgba(226, 232, 240, 0.5);
          background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(12px);
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02), 0 12px 40px rgba(15, 23, 42, 0.04);
          padding: 1.15rem; display: flex; flex-direction: column; gap: 0.75rem; min-width: 0;
          transition: box-shadow 0.3s, border-color 0.3s;
        }
        .boq-selection-panel-card.glass-card:hover { border-color: rgba(147, 197, 253, 0.4); box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02), 0 16px 48px rgba(37, 99, 235, 0.06); }
        .boq-selection-panel-card.glass-card-wide { gap: 0.95rem; }

        .boq-selection-filter-section { display: flex; flex-direction: column; gap: 0.55rem; }
        .boq-selection-tools-row { display: grid; grid-template-columns: minmax(220px, 260px) minmax(0, 1fr); gap: 1rem; align-items: start; }
        .boq-selection-category.glass-card-wrap { display: flex; flex-direction: column; gap: 0.55rem; }

        .boq-selection-panel-label { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.62rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }

        .boq-selection-search.glass-input {
          display: flex; align-items: center; gap: 0.7rem;
          border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 0.78rem 0.95rem;
          background: #ffffff; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02);
        }
        .boq-selection-search.glass-input:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08), 0 2px 8px rgba(59, 130, 246, 0.06); }
        .boq-selection-search.glass-input svg { color: #94a3b8; flex-shrink: 0; transition: color 0.2s; }
        .boq-selection-search.glass-input:focus-within svg { color: #3b82f6; }
        .boq-selection-search.glass-input input { flex: 1; border: none; outline: none; background: transparent; font-size: 0.88rem; color: #0f172a; min-width: 0; font-weight: 500; }
        .boq-selection-search input::placeholder { color: #94a3b8; }
        .boq-selection-search-sidebar { border-radius: 12px; padding: 0.68rem 0.8rem; background: #ffffff; border-color: #e2e8f0; }
        .boq-selection-panel-help { margin: 0; font-size: 0.72rem; color: #94a3b8; line-height: 1.55; font-weight: 500; }

        .boq-selection-chip.glass-card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.4rem; }

        .boq-selection-chip.glass-card,
        .boq-selection-category.glass-card {
          border: 1.5px solid #e2e8f0; background: #f8fafc; color: #475569;
          border-radius: 12px; padding: 0.58rem 0.72rem; font-size: 0.74rem; font-weight: 700;
          cursor: pointer; text-align: left; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .boq-selection-chip.glass-card:hover, .boq-selection-category.glass-card:hover { background: #f1f5f9; border-color: #cbd5e1; transform: translateY(-1px); }
        .boq-selection-chip.glass-card.active, .boq-selection-category.glass-card.active { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-color: #0f172a; color: white; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); }
        .boq-selection-category.glass-card-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }

        .boq-selection-sort-field { display: flex; flex-direction: column; gap: 0.45rem; color: #475569; font-size: 0.74rem; font-weight: 700; }
        .boq-selection-sort-field select { border: 1.5px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #0f172a; padding: 0.68rem 0.85rem; font-size: 0.82rem; outline: none; font-weight: 600; transition: border-color 0.2s; cursor: pointer; }
        .boq-selection-sort-field select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08); }

        .boq-selection-summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.55rem; }
        .boq-selection-summary-grid div { border-radius: 14px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid rgba(226, 232, 240, 0.7); padding: 0.8rem; display: flex; flex-direction: column; gap: 0.15rem; transition: all 0.2s; }
        .boq-selection-summary-grid div:hover { border-color: #93c5fd; background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%); }
        .boq-selection-summary-grid strong { font-size: 1.15rem; color: #0f172a; font-weight: 900; }
        .boq-selection-summary-grid span { font-size: 0.64rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800; }
        .boq-selection-panel-copy { margin: 0; font-size: 0.78rem; line-height: 1.6; color: #64748b; font-weight: 500; }

        .boq-selection-selected-preview { display: flex; flex-wrap: wrap; gap: 0.35rem; }
        .boq-selection-selected-preview span, .boq-selection-selected-preview em { display: inline-flex; align-items: center; border-radius: 999px; padding: 0.3rem 0.65rem; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; color: #1d4ed8; font-size: 0.68rem; font-style: normal; font-weight: 700; transition: all 0.2s; }
        .boq-selection-selected-preview span:hover, .boq-selection-selected-preview em:hover { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); transform: translateY(-1px); }
        .boq-selection-selected-preview .boq-selection-selected-placeholder { background: #f8fafc; border-color: #e2e8f0; color: #94a3b8; }
        .boq-selection-panel-actions { display: flex; flex-wrap: wrap; gap: 0.45rem; }

        /* ═══════ RESULTS ═══════ */
        .boq-selection-results-head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; padding-bottom: 0.85rem; border-bottom: 1px solid rgba(226, 232, 240, 0.5); }
        .boq-selection-results-label { font-size: 0.62rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 0.4rem; }
        .boq-selection-results-head strong { display: block; color: #0f172a; font-size: 1.1rem; margin-top: 0.2rem; font-weight: 900; letter-spacing: -0.01em; }
        .boq-selection-results-head small { display: block; color: #94a3b8; font-size: 0.74rem; font-weight: 600; }

        .boq-selection-results-badges { display: flex; flex-wrap: wrap; gap: 0.35rem; justify-content: flex-end; }
        .boq-selection-results-badges span { display: inline-flex; align-items: center; border-radius: 999px; background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b; padding: 0.32rem 0.65rem; font-size: 0.68rem; font-weight: 700; transition: all 0.2s; }
        .boq-selection-results-badges span:hover { background: #f1f5f9; border-color: #cbd5e1; }

        .boq-selection-results-toolbar { display: flex; justify-content: space-between; gap: 1rem; align-items: center; flex-wrap: wrap; }
        .boq-selection-results-stats { display: flex; flex-wrap: wrap; gap: 0.6rem; }
        .boq-selection-results-stat { min-width: 140px; border-radius: 14px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid rgba(226, 232, 240, 0.7); padding: 0.7rem 0.85rem; display: flex; flex-direction: column; gap: 0.12rem; transition: all 0.2s; }
        .boq-selection-results-stat:hover { border-color: #93c5fd; background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%); }
        .boq-selection-results-stat strong { color: #0f172a; font-size: 1rem; font-weight: 900; }
        .boq-selection-results-stat span { color: #94a3b8; font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 800; }

        .boq-selection-inline-link { border: none; background: transparent; color: #2563eb; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s; padding: 0.3rem 0.5rem; border-radius: 8px; }
        .boq-selection-inline-link:hover { background: rgba(37, 99, 235, 0.06); color: #1d4ed8; }

        /* ═══════ ITEM CARDS ═══════ */
        .boq-selection-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 0.85rem; }

        .boq-selection-card.glass-card {
          border: 1.5px solid rgba(226, 232, 240, 0.6); border-radius: 18px; background: #ffffff;
          padding: 1.05rem; text-align: left; display: flex; flex-direction: column; gap: 0.75rem;
          cursor: pointer; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); position: relative; overflow: hidden;
        }
        .boq-selection-card.glass-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(37, 99, 235, 0.02) 0%, transparent 60%); opacity: 0; transition: opacity 0.25s; pointer-events: none; }
        .boq-selection-card.glass-card:hover { transform: translateY(-3px); border-color: #93c5fd; box-shadow: 0 8px 24px rgba(37, 99, 235, 0.07), 0 4px 12px rgba(15, 23, 42, 0.03); }
        .boq-selection-card.glass-card:hover::before { opacity: 1; }
        .boq-selection-card.glass-card.selected { border-color: #2563eb; background: linear-gradient(135deg, #fafbff 0%, #eff6ff 100%); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08), 0 12px 32px rgba(37, 99, 235, 0.1); }
        .boq-selection-card.glass-card.selected::before { opacity: 1; background: linear-gradient(135deg, rgba(37, 99, 235, 0.03) 0%, transparent 60%); }

        .boq-selection-card.glass-card-kicker { display: flex; justify-content: space-between; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
        .boq-selection-card.glass-card-top { display: flex; justify-content: space-between; gap: 0.75rem; align-items: flex-start; }
        .boq-selection-card.glass-card-heading { min-width: 0; }

        .boq-selection-code { display: inline-flex; align-items: center; border-radius: 8px; padding: 0.24rem 0.55rem; background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%); font-size: 0.62rem; font-weight: 900; letter-spacing: 0.1em; color: #1d4ed8; text-transform: uppercase; }
        .boq-selection-card.glass-card-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }
        .boq-selection-card.glass-card-tags span { display: inline-flex; align-items: center; border-radius: 8px; padding: 0.24rem 0.52rem; background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; }

        .boq-selection-card.glass-card strong { color: #0f172a; font-size: 0.95rem; line-height: 1.35; font-weight: 800; letter-spacing: -0.01em; }
        .boq-selection-card.glass-card p { margin: 0; font-size: 0.8rem; line-height: 1.6; color: #64748b; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        .boq-selection-state {
          display: inline-flex; align-items: center; gap: 0.3rem; border-radius: 10px; padding: 0.38rem 0.7rem;
          background: #f1f5f9; color: #64748b; font-size: 0.68rem; font-weight: 800; white-space: nowrap;
          flex-shrink: 0; border: 1.5px solid #e2e8f0; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); letter-spacing: 0.01em;
        }
        .boq-selection-card.glass-card:hover .boq-selection-state:not(.selected) { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); color: #1d4ed8; border-color: #93c5fd; }
        .boq-selection-state.selected { background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); color: white; border-color: rgba(37, 99, 235, 0.3); box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25); animation: selectionPulse 2.5s ease-in-out infinite; }

        .boq-selection-card.glass-card-meta, .boq-selection-card.glass-card-flags { display: flex; flex-wrap: wrap; gap: 0.35rem; }
        .boq-selection-card.glass-card-meta span { font-size: 0.7rem; color: #64748b; font-weight: 600; display: inline-flex; align-items: center; gap: 0.15rem; }

        .boq-selection-flag { display: inline-flex; align-items: center; border-radius: 8px; padding: 0.22rem 0.55rem; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 0.6rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.02em; transition: all 0.2s; }
        .boq-selection-flag.ready { border-color: #bfdbfe; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); color: #1d4ed8; }
        .boq-selection-flag-recommended { border-color: #fde68a !important; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%) !important; color: #b45309 !important; }

        .boq-selection-hint { border-radius: 10px; border: 1px solid #e2e8f0; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 0.6rem 0.75rem; font-size: 0.72rem; color: #64748b; line-height: 1.55; font-weight: 500; }

        .boq-selection-card.glass-card-basis { border-radius: 10px; border: 1px solid #e2e8f0; background: #ffffff; padding: 0.6rem 0.75rem; display: flex; flex-direction: column; gap: 0.15rem; }
        .boq-selection-card.glass-card-basis strong { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
        .boq-selection-card.glass-card-basis span { font-size: 0.74rem; color: #334155; line-height: 1.5; }

        .boq-selection-formula { border-radius: 12px; border: 1px solid #ddd6fe; background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 40%, #ede9fe 100%); padding: 0.7rem 0.8rem; display: flex; flex-direction: column; gap: 0.25rem; color: #5b21b6; }
        .boq-selection-formula strong { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: #7c3aed; }
        .boq-selection-formula span, .boq-selection-formula small { font-size: 0.72rem; line-height: 1.5; }
        .boq-selection-formula small { opacity: 0.75; }

        .boq-selection-card.glass-card-footer { margin-top: auto; padding-top: 0.6rem; display: flex; justify-content: space-between; gap: 0.75rem; align-items: center; border-top: 1px solid rgba(226, 232, 240, 0.5); }
        .boq-selection-card.glass-card-footer span { font-size: 0.68rem; color: #94a3b8; font-weight: 600; }
        .boq-selection-card.glass-card-footer strong { font-size: 0.72rem; color: #0f172a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; transition: color 0.2s; }
        .selected .boq-selection-card.glass-card-footer strong { color: #2563eb; }
        .boq-selection-card.glass-card:hover .boq-selection-card.glass-card-footer strong { color: #2563eb; }

        .boq-selection-empty { min-height: 280px; border: 2px dashed #dbeafe; border-radius: 22px; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6rem; text-align: center; color: #64748b; padding: 2.5rem; }
        .boq-selection-empty strong { font-size: 1.1rem; color: #334155; font-weight: 800; }
        .boq-selection-empty span { font-size: 0.88rem; max-width: 380px; line-height: 1.55; }

        /* ═══════ FOOTER ═══════ */
        .boq-selection-footer {
          border-radius: 20px; border: 1.5px solid rgba(226, 232, 240, 0.5);
          background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(8px);
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02), 0 12px 36px rgba(15, 23, 42, 0.04);
          padding: 1.1rem 1.35rem; display: flex; justify-content: space-between; gap: 1rem; align-items: center;
        }
        .boq-selection-footer-copy { display: flex; flex-direction: column; gap: 0.2rem; }
        .boq-selection-footer-copy strong { color: #0f172a; font-size: 0.9rem; font-weight: 800; letter-spacing: -0.01em; }
        .boq-selection-footer-copy span { color: #94a3b8; font-size: 0.76rem; font-weight: 500; }
        .boq-selection-footer-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.55rem; }

        /* ═══════ BUTTONS ═══════ */
        .boq-selection-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; min-width: 130px; border-radius: 12px; border: 1.5px solid transparent; padding: 0.72rem 1rem; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
        .boq-selection-btn.primary { background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%); color: white; border-color: rgba(255, 255, 255, 0.1); box-shadow: 0 4px 16px rgba(37, 99, 235, 0.28); }
        .boq-selection-btn.primary:hover:not(:disabled) { background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #60a5fa 100%); box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35); transform: translateY(-1px); }
        .boq-selection-btn.secondary { background: #ffffff; color: #334155; border-color: #e2e8f0; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03); }
        .boq-selection-btn.secondary:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); }
        .boq-selection-btn.tertiary { background: transparent; border-color: #e2e8f0; color: #94a3b8; min-width: 0; }
        .boq-selection-btn.tertiary:hover:not(:disabled) { background: #f8fafc; color: #475569; border-color: #cbd5e1; }
        .boq-selection-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; box-shadow: none !important; }

        /* ═══════ RESPONSIVE ═══════ */
        @media (max-width: 1280px) {
          .boq-selection-overview, .boq-selection-tools { grid-template-columns: 1fr; }
          .boq-selection-tools-row { grid-template-columns: 1fr; }
          .boq-selection-overview-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .boq-selection-content.staggered-fade-in { padding: 2rem 2.5rem; }
        }

        @media (max-width: 1080px) {
          .boq-selection-shell.obsidian-surface { grid-template-columns: 1fr; height: auto; overflow: visible; padding: 0.9rem; }
          .boq-selection-content.staggered-fade-in { overflow: visible; padding: 1.5rem 1rem; }
          .boq-selection-bill-browser { position: static; height: auto; max-height: none; padding: 0.9rem; }
          .boq-selection-bill-tabs { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(220px, 1fr); overflow-x: auto; overflow-y: hidden; padding-bottom: 0.15rem; }
          .boq-selection-overview-stats { grid-template-columns: 1fr; }
          .boq-selection-results-head, .boq-selection-results-toolbar, .boq-selection-footer { flex-direction: column; align-items: stretch; }
          .boq-selection-page-header, .boq-selection-page-header-secondary { flex-direction: column; align-items: stretch; gap: 1.5rem; }
          .boq-selection-header-stats { flex-direction: column; }
          .boq-selection-stat { min-width: 0; }
        }

        @media (max-width: 720px) {
          .boq-selection-bill-browser-summary { grid-template-columns: 1fr; }
          .boq-selection-bill-tab { padding: 0.72rem 0.78rem; grid-template-columns: 36px minmax(0, 1fr); }
          .boq-selection-bill-index { width: 36px; height: 36px; }
          .boq-selection-chip.glass-card-grid { grid-template-columns: 1fr; }
          .boq-selection-grid { grid-template-columns: 1fr; }
          .boq-selection-footer-actions { justify-content: stretch; }
          .boq-selection-btn { width: 100%; }
          .boq-selection-content.staggered-fade-in { padding: 1rem 0.75rem; gap: 1.5rem; }
        }
      `}</style>
    </div>
  );
};

export default BOQSelectionStage;
