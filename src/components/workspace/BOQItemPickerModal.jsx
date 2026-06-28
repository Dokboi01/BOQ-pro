import React from 'react';
import { Search, X, Plus, CheckCircle2, ListFilter } from 'lucide-react';
import {
  getFormulaDisplayText,
  getWorkedExamplePreview,
} from '../../utils/boqFormulas';
import { getBenchmarkCalibrationFactor } from '../../utils/pricing';

const normalizeText = (value) => String(value || '').toLowerCase();
const buildItemNameText = (item) => normalizeText(item?.name);

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

const formatMoney = (value) => (
  `₦${Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`
);

const getDisplayBenchmarkRate = (item) => {
  const baseRate = Number(item?.benchmarkRate || item?.benchmarkMetadata?.rate || 0);
  return baseRate * getBenchmarkCalibrationFactor(item);
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'All Items' },
  { id: 'remaining', label: 'Not Added' },
  { id: 'recommended', label: 'Recommended' },
  { id: 'formula', label: 'Formula-Driven' },
];

const BOQItemPickerModal = ({
  structureType,
  section,
  catalogItems = [],
  existingItems = [],
  onClose,
  onAddItems,
}) => {
  const [query, setQuery] = React.useState('');
  const [selectedCodes, setSelectedCodes] = React.useState([]);
  const [activeCategory, setActiveCategory] = React.useState('all');
  const [activeFilter, setActiveFilter] = React.useState('all');
  const searchableItems = React.useMemo(() => (
    (catalogItems || []).map((item) => ({
      item,
      searchName: buildItemNameText(item),
      searchLibrary: buildSearchText(item),
    }))
  ), [catalogItems]);

  const existingCatalogIds = React.useMemo(
    () => new Set((existingItems || []).map((item) => item.catalogItemId).filter(Boolean)),
    [existingItems]
  );

  const categories = React.useMemo(() => {
    const nextCategories = Array.from(new Set(
      (catalogItems || [])
        .map((item) => item.category || 'General')
        .filter(Boolean)
    ));
    return ['all', ...nextCategories];
  }, [catalogItems]);

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);

    return searchableItems
      .filter(({ item, searchName, searchLibrary }) => {
      const category = item.category || 'General';
      const isAdded = existingCatalogIds.has(item.code);
      const matchesCategory = activeCategory === 'all' || category === activeCategory;
      const matchesQuery = matchesItemSearch(searchName, searchLibrary, normalizedQuery, queryTerms);
      const matchesFilter = (() => {
        switch (activeFilter) {
          case 'remaining':
            return !isAdded;
          case 'recommended':
            return item.isRecommended === true;
          case 'formula':
            return item.defaultFormulaType !== 'manual';
          default:
            return true;
        }
      })();

      return matchesCategory && matchesQuery && matchesFilter;
    })
      .map(({ item }) => item);
  }, [activeCategory, activeFilter, existingCatalogIds, query, searchableItems]);

  const groupedItems = React.useMemo(() => (
    filteredItems.reduce((acc, item) => {
      const category = item.category || 'General';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {})
  ), [filteredItems]);

  const selectedItems = React.useMemo(
    () => (catalogItems || []).filter((item) => selectedCodes.includes(item.code)),
    [catalogItems, selectedCodes]
  );

  const selectedItemsPreview = React.useMemo(() => (
    selectedItems.slice(0, 3).map((item) => item.name).join(', ')
  ), [selectedItems]);

  const availableToSelectCount = React.useMemo(
    () => filteredItems.filter((item) => !existingCatalogIds.has(item.code)).length,
    [existingCatalogIds, filteredItems]
  );

  const toggleSelection = (code) => {
    setSelectedCodes((prev) => (
      prev.includes(code)
        ? prev.filter((entry) => entry !== code)
        : [...prev, code]
    ));
  };

  const selectVisibleItems = () => {
    const visibleCodes = filteredItems
      .filter((item) => !existingCatalogIds.has(item.code))
      .map((item) => item.code);
    setSelectedCodes((prev) => Array.from(new Set([...prev, ...visibleCodes])));
  };

  const clearFilters = () => {
    setQuery('');
    setActiveCategory('all');
    setActiveFilter('all');
  };

  const isPreliminaries = section?.isPreliminaries === true;
  const sectionPrompt = section?.pickerPrompt
    || (isPreliminaries
      ? 'Pick only the preliminaries that apply to this contract.'
      : 'Select only the items you want to measure in this bill.');

  return (
    <div className="boq-picker-overlay">
      <div className="boq-picker-modal">
        <header className="boq-picker-header">
          <div className="boq-picker-header-copy">
            <span className="boq-picker-eyebrow">{structureType}</span>
            <h3>{section?.title || 'Select BOQ Items'}</h3>
            <p>{section?.description || 'Choose the exact line items you want in this bill.'}</p>
            <small>{sectionPrompt}</small>
          </div>
          <button type="button" className="boq-picker-close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="boq-picker-body-split">
          
          <div className="boq-picker-sidebar">
            <div className="boq-picker-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search items..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
                autoComplete="off"
                aria-label="Search items"
              />
            </div>
            
            <div className="boq-picker-filter-strip vertical">
              <div className="boq-picker-sidebar-group">
                <span className="boq-picker-sidebar-label">
                  <ListFilter size={13} /> Filter
                </span>
                <div className="boq-picker-sidebar-chips">
                  {FILTER_OPTIONS.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      className={`boq-picker-sidebar-chip ${activeFilter === filter.id ? 'active' : ''}`}
                      onClick={() => setActiveFilter(filter.id)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="boq-picker-sidebar-group">
                <span className="boq-picker-sidebar-label">Categories</span>
                <div className="boq-picker-sidebar-chips column">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`boq-picker-sidebar-chip ${activeCategory === category ? 'active' : ''}`}
                      onClick={() => setActiveCategory(category)}
                    >
                      {category === 'all' ? 'All Categories' : category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="boq-picker-main">
            <div className="boq-picker-main-toolbar">
              <div className="boq-picker-summary">
                <span>{catalogItems.length} library items</span>
                <span>{availableToSelectCount} visible</span>
                <span className="highlight-selected">{selectedItems.length} selected</span>
              </div>
            </div>
            
            <div className="boq-picker-list">
          {filteredItems.length === 0 ? (
            <div className="boq-picker-empty">
              <strong>No matching items found.</strong>
              <span>Try a broader search or clear the active category and filter chips.</span>
              <button type="button" className="boq-picker-btn subtle" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, items]) => (
              <section key={category} className="boq-picker-group">
                <div className="boq-picker-group-header">
                  <strong>{category}</strong>
                  <span>{items.length} item{items.length === 1 ? '' : 's'}</span>
                </div>

                <div className="boq-picker-group-grid">
                  {items.map((item) => {
                    const isAdded = existingCatalogIds.has(item.code);
                    const isSelected = selectedCodes.includes(item.code);
                    const formulaText = getFormulaDisplayText(item);
                    const workedExampleText = item.defaultFormulaType !== 'manual'
                      ? getWorkedExamplePreview(item)
                      : '';
                    const hasFormula = item.defaultFormulaType !== 'manual';
                    const benchmarkRate = getDisplayBenchmarkRate(item);
                    const hasBenchmark = benchmarkRate > 0;

                    return (
                      <button
                        key={item.code}
                        type="button"
                        className={`boq-picker-card boq-item ${isSelected ? 'selected' : ''} ${isAdded ? 'added' : ''}`}
                        data-item-name={item.name || ''}
                        onClick={() => !isAdded && toggleSelection(item.code)}
                        disabled={isAdded}
                      >
                        <div className="boq-picker-card-top">
                          <div className="boq-picker-card-copy">
                            <div className="boq-picker-card-title">
                              <span className="boq-picker-code">{item.code}</span>
                              <strong>{item.name}</strong>
                            </div>
                            <div className="boq-picker-card-tags">
                              <span className="boq-picker-tag">{item.category || 'General'}</span>
                              {item.isRecommended && <span className="boq-picker-tag recommended">Recommended</span>}
                              {item.defaultFormulaType !== 'manual' && <span className="boq-picker-tag formula">Formula</span>}
                            </div>
                            <p>{item.description}</p>
                          </div>
                          {isAdded ? (
                            <span className="boq-picker-state added">
                              <CheckCircle2 size={14} /> Added
                            </span>
                          ) : isSelected ? (
                            <span className="boq-picker-state selected">
                              <CheckCircle2 size={14} /> Selected
                            </span>
                          ) : (
                            <span className="boq-picker-state neutral">
                              <Plus size={14} /> Pick
                            </span>
                          )}
                        </div>

                        <div className="boq-picker-card-meta">
                          <span>Unit: {item.unit}</span>
                          <span>Benchmark: {hasBenchmark ? formatMoney(benchmarkRate) : 'Pending'}</span>
                        </div>

                        <div className="boq-picker-card-flags">
                          <span className={`boq-picker-availability ${hasBenchmark ? 'ready' : 'missing'}`}>
                            {hasBenchmark ? 'Benchmark Ready' : 'Benchmark Pending'}
                          </span>
                          <span className={`boq-picker-availability ${hasFormula ? 'formula' : 'missing'}`}>
                            {hasFormula ? 'Formula Ready' : 'Manual Only'}
                          </span>
                        </div>

                        {item.pickerHint && (
                          <div className="boq-picker-hint">{item.pickerHint}</div>
                        )}

                        {formulaText && (
                          <div className="boq-picker-formula">
                            <strong>Formula</strong>
                            <span>{formulaText}</span>
                            {workedExampleText && <small>{workedExampleText}</small>}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

          </div>
        </div>
        <footer className="boq-picker-footer">
          <div className="boq-picker-footer-copy">
            <strong>{selectedItems.length} item{selectedItems.length === 1 ? '' : 's'} ready to add</strong>
            <span>
              Selected items will drop straight into this bill and can be priced immediately in the BOQ table.
              {selectedItemsPreview ? ` Preview: ${selectedItemsPreview}${selectedItems.length > 3 ? '…' : ''}` : ''}
            </span>
          </div>
          <div className="boq-picker-footer-actions">
            <button type="button" className="boq-picker-btn subtle" onClick={clearFilters}>
              Reset Filters
            </button>
            <button type="button" className="boq-picker-btn subtle" onClick={selectVisibleItems}>
              <Plus size={14} /> Select Visible
            </button>
            <button
              type="button"
              className="boq-picker-btn primary"
              disabled={selectedItems.length === 0}
              onClick={() => onAddItems(selectedItems)}
            >
              <Plus size={14} /> Add Selected Items
            </button>
          </div>
        </footer>
      </div>

      <style jsx="true">{`
        /* ═══════════════════════════════════════════════════
           BOQ Item Picker — Premium UI
           ═══════════════════════════════════════════════════ */

        @keyframes pickerSlideUp {
          from { opacity: 0; transform: translateY(18px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes pickerOverlayFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pickerPulseRing {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.18); }
          50%      { box-shadow: 0 0 0 6px rgba(37, 99, 235, 0); }
        }
        @keyframes pickerShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        /* ── Overlay ── */
        .boq-picker-overlay {
          position: fixed;
          inset: 0;
          background: rgba(2, 6, 23, 0.65);
          backdrop-filter: blur(12px) saturate(1.4);
          -webkit-backdrop-filter: blur(12px) saturate(1.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 1rem;
          animation: pickerOverlayFade 0.25s ease-out;
        }

        /* ── Modal Shell ── */
        .boq-picker-modal {
          width: min(1200px, 95vw) !important;
          max-height: 90vh !important;
          background: #ffffff;
          border-radius: 24px;
          box-shadow:
            0 0 0 1px rgba(15, 23, 42, 0.04),
            0 24px 80px -12px rgba(15, 23, 42, 0.32),
            0 8px 24px -4px rgba(15, 23, 42, 0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: pickerSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* ── Header ── */
        .boq-picker-header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.6rem 1.75rem 1.25rem;
          border-bottom: 1px solid rgba(226, 232, 240, 0.7);
          background: linear-gradient(135deg, #f8fafc 0%, #eef4ff 50%, #f0f9ff 100%);
          position: relative;
          overflow: hidden;
        }
        .boq-picker-header::before {
          content: '';
          position: absolute;
          top: -60%;
          right: -10%;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .boq-picker-header-copy {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          position: relative;
          z-index: 1;
        }

        .boq-picker-eyebrow {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          font-size: 0.62rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .boq-picker-header h3 {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.025em;
          line-height: 1.2;
        }

        .boq-picker-header p {
          margin: 0;
          color: #475569;
          font-size: 0.85rem;
          line-height: 1.55;
          font-weight: 500;
        }

        .boq-picker-header small {
          margin: 0;
          font-size: 0.74rem;
          color: #64748b;
          font-weight: 600;
          line-height: 1.5;
        }

        .boq-picker-close {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(8px);
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          z-index: 1;
        }
        .boq-picker-close:hover {
          background: #fee2e2;
          border-color: #fca5a5;
          color: #dc2626;
          transform: rotate(90deg);
        }

        /* ── Body Split ── */
        .boq-picker-body-split {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* ── Sidebar ── */
        .boq-picker-sidebar {
          width: 268px;
          flex-shrink: 0;
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          border-right: 1px solid rgba(226, 232, 240, 0.8);
          display: flex;
          flex-direction: column;
        }

        .boq-picker-sidebar .boq-picker-search {
          margin: 1.25rem 1.25rem 0;
          border-radius: 12px;
          background: #ffffff;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          border: 1.5px solid #e2e8f0;
          padding: 0.75rem 0.95rem;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
        }
        .boq-picker-sidebar .boq-picker-search:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08), 0 2px 8px rgba(59, 130, 246, 0.06);
          background: #ffffff;
        }
        .boq-picker-sidebar .boq-picker-search svg {
          color: #94a3b8;
          flex-shrink: 0;
          transition: color 0.2s;
        }
        .boq-picker-sidebar .boq-picker-search:focus-within svg {
          color: #3b82f6;
        }

        .boq-picker-sidebar .boq-picker-search input {
           font-size: 0.8rem;
           flex: 1;
           border: none;
           background: transparent;
           outline: none;
           color: #0f172a;
           font-weight: 500;
        }
        .boq-picker-sidebar .boq-picker-search input::placeholder {
           color: #94a3b8;
        }

        .boq-picker-filter-strip.vertical {
          padding: 1.25rem;
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          border: none;
          background: transparent;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .boq-picker-filter-strip.vertical::-webkit-scrollbar {
          width: 4px;
        }
        .boq-picker-filter-strip.vertical::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .boq-picker-sidebar-group {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .boq-picker-sidebar-label {
           display: flex;
           align-items: center;
           gap: 0.4rem;
           font-size: 0.62rem;
           font-weight: 900;
           text-transform: uppercase;
           letter-spacing: 0.1em;
           color: #94a3b8;
           padding: 0 0.15rem;
        }

        .boq-picker-sidebar-chips {
           display: flex;
           flex-wrap: wrap;
           gap: 0.3rem;
        }
        
        .boq-picker-sidebar-chips.column {
           flex-direction: column;
        }

        .boq-picker-sidebar-chip {
           text-align: left;
           background: transparent;
           border: 1.5px solid transparent;
           color: #475569;
           padding: 0.45rem 0.7rem;
           border-radius: 10px;
           font-size: 0.74rem;
           font-weight: 600;
           cursor: pointer;
           transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
           position: relative;
        }

        .boq-picker-sidebar-chip:hover {
           background: rgba(241, 245, 249, 0.8);
           color: #334155;
           transform: translateX(2px);
        }

        .boq-picker-sidebar-chip.active {
           background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%);
           color: #1d4ed8;
           border-color: #93c5fd;
           font-weight: 700;
           box-shadow: 0 2px 8px rgba(37, 99, 235, 0.06);
        }
        .boq-picker-sidebar-chip.active::before {
           content: '';
           position: absolute;
           left: 0;
           top: 50%;
           transform: translateY(-50%);
           width: 3px;
           height: 16px;
           background: linear-gradient(180deg, #2563eb 0%, #3b82f6 100%);
           border-radius: 0 3px 3px 0;
        }

        /* ── Main Panel ── */
        .boq-picker-main {
           flex: 1;
           display: flex;
           flex-direction: column;
           overflow: hidden;
           background: #f4f6fa;
        }
        
        .boq-picker-main-toolbar {
           padding: 0.7rem 1.5rem;
           border-bottom: 1px solid rgba(226, 232, 240, 0.7);
           background: rgba(255, 255, 255, 0.85);
           backdrop-filter: blur(8px);
           display: flex;
           justify-content: flex-end;
        }

        .boq-picker-summary {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .boq-picker-summary span {
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          padding: 0.38rem 0.75rem;
          font-size: 0.7rem;
          font-weight: 700;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }

        .boq-picker-summary span.highlight-selected {
           background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
           color: white;
           border-color: #0f172a;
           box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
        }

        /* ── List / Grid ── */
        .boq-picker-list {
          flex: 1;
          overflow-y: auto;
          padding: 1.25rem 1.5rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .boq-picker-list::-webkit-scrollbar {
          width: 5px;
        }
        .boq-picker-list::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 5px;
        }

        .boq-picker-group {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .boq-picker-group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0 0.15rem;
        }

        .boq-picker-group-header strong {
          font-size: 0.88rem;
          color: #0f172a;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .boq-picker-group-header span {
          font-size: 0.68rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .boq-picker-group-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important;
          gap: 0.85rem;
        }

        /* ── Empty State ── */
        .boq-picker-empty {
          border: 2px dashed #dbeafe;
          border-radius: 20px;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          padding: 2.5rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
          color: #64748b;
          text-align: center;
        }
        .boq-picker-empty strong {
          font-size: 1rem;
          color: #334155;
        }
        .boq-picker-empty span {
          font-size: 0.82rem;
          max-width: 340px;
          line-height: 1.55;
        }

        /* ── Item Cards ── */
        .boq-picker-card {
          width: 100%;
          text-align: left;
          border: 1.5px solid #e8edf5;
          border-radius: 16px !important;
          background: #ffffff;
          padding: 1.15rem 1.2rem !important;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          box-shadow:
            0 1px 3px rgba(15, 23, 42, 0.02),
            0 4px 12px rgba(15, 23, 42, 0.02);
          position: relative;
          overflow: hidden;
        }
        .boq-picker-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.02) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.25s;
          pointer-events: none;
        }

        .boq-picker-card:hover:not(:disabled) {
          border-color: #93c5fd;
          transform: translateY(-2px);
          box-shadow:
            0 8px 24px rgba(37, 99, 235, 0.08),
            0 4px 12px rgba(15, 23, 42, 0.04);
        }
        .boq-picker-card:hover:not(:disabled)::before {
          opacity: 1;
        }

        .boq-picker-card.selected {
          border-color: #2563eb;
          background: linear-gradient(135deg, #fafbff 0%, #f0f4ff 100%);
          box-shadow:
            0 0 0 3px rgba(37, 99, 235, 0.1),
            0 8px 20px rgba(37, 99, 235, 0.1);
        }
        .boq-picker-card.selected::before {
          opacity: 1;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, transparent 60%);
        }

        .boq-picker-card.added {
          opacity: 0.6;
          cursor: default;
          background: #f8fafc;
          border-color: #e2e8f0;
          box-shadow: none;
        }

        .boq-picker-card-top {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
        }

        .boq-picker-card-copy {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          min-width: 0;
          flex: 1;
        }

        .boq-picker-card-title {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .boq-picker-card-title strong {
          font-size: 0.92rem;
          color: #0f172a;
          font-weight: 800;
          letter-spacing: -0.01em;
          line-height: 1.35;
        }

        .boq-picker-card-copy p {
          margin: 0;
          font-size: 0.78rem;
          line-height: 1.55;
          color: #64748b;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .boq-picker-code {
          font-size: 0.62rem;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .boq-picker-card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
        }

        .boq-picker-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.2rem 0.55rem;
          border-radius: 8px;
          background: #f1f5f9;
          color: #475569;
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          border: 1px solid #e2e8f0;
          text-transform: uppercase;
        }

        .boq-picker-tag.recommended {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          color: #047857;
          border-color: #a7f3d0;
        }

        .boq-picker-tag.formula {
          background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
          color: #6d28d9;
          border-color: #ddd6fe;
        }

        /* ── State Badges ── */
        .boq-picker-state {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          border-radius: 10px;
          padding: 0.35rem 0.7rem;
          font-size: 0.68rem;
          font-weight: 800;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.2s;
          letter-spacing: 0.01em;
        }

        .boq-picker-state.neutral {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
        }
        .boq-picker-card:hover:not(:disabled) .boq-picker-state.neutral {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          color: #1d4ed8;
          border-color: #93c5fd;
        }

        .boq-picker-state.selected {
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
          animation: pickerPulseRing 2s ease-in-out infinite;
        }

        .boq-picker-state.added {
          background: #f1f5f9;
          color: #94a3b8;
          border: 1px solid #e2e8f0;
        }

        /* ── Card Meta ── */
        .boq-picker-card-meta {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .boq-picker-card-meta span {
          font-size: 0.7rem;
          color: #64748b;
          line-height: 1.5;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
        }
        .boq-picker-card-meta span::before {
          content: '';
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #cbd5e1;
        }
        .boq-picker-card-meta span:first-child::before {
          display: none;
        }

        .boq-picker-card-flags {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }

        .boq-picker-availability {
          display: inline-flex;
          align-items: center;
          padding: 0.22rem 0.6rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: #94a3b8;
          background: #f8fafc;
          text-transform: uppercase;
          transition: all 0.2s;
        }

        .boq-picker-availability.ready {
          border-color: #bfdbfe;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          color: #1d4ed8;
        }

        .boq-picker-availability.formula {
          border-color: #ddd6fe;
          background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
          color: #6d28d9;
        }

        .boq-picker-availability.missing {
          border-style: dashed;
          border-color: #e2e8f0;
        }

        .boq-picker-hint {
          font-size: 0.74rem;
          color: #475569;
          line-height: 1.5;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.6rem 0.75rem;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          font-weight: 500;
        }

        .boq-picker-formula {
          border-radius: 12px;
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 40%, #ede9fe 100%);
          border: 1px solid #ddd6fe;
          padding: 0.75rem 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          color: #5b21b6;
        }

        .boq-picker-formula strong {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #7c3aed;
        }

        .boq-picker-formula span,
        .boq-picker-formula small {
          font-size: 0.72rem;
          line-height: 1.5;
          color: inherit;
        }
        .boq-picker-formula small {
          color: #7c3aed;
          opacity: 0.75;
        }

        /* ── Footer ── */
        .boq-picker-toolbar,
        .boq-picker-footer {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .boq-picker-footer {
          border-top: 1px solid rgba(226, 232, 240, 0.7);
          border-bottom: none;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          padding: 1.15rem 1.75rem;
        }

        .boq-picker-footer-copy {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .boq-picker-footer-copy strong {
          color: #0f172a;
          font-size: 0.88rem;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .boq-picker-footer-copy span {
          font-size: 0.74rem;
          color: #64748b;
          line-height: 1.5;
          font-weight: 500;
        }

        .boq-picker-footer-actions {
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        /* ── Buttons ── */
        .boq-picker-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          min-width: 128px;
          padding: 0.7rem 1.1rem;
          border-radius: 12px;
          border: 1.5px solid transparent;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .boq-picker-btn.subtle {
          background: #ffffff;
          color: #475569;
          border-color: #e2e8f0;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        .boq-picker-btn.subtle:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
        }

        .boq-picker-btn.primary {
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%);
          color: white;
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
        }
        .boq-picker-btn.primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #60a5fa 100%);
          box-shadow: 0 6px 24px rgba(37, 99, 235, 0.4);
          transform: translateY(-1px);
        }
        .boq-picker-btn.primary:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }

        .boq-picker-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        /* ── Legacy selectors kept for compatibility ── */
        .boq-picker-search {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          border: 1px solid #cbd5e1;
          border-radius: 14px;
          padding: 0.8rem 0.95rem;
          background: #f8fafc;
        }

        .boq-picker-search input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.9rem;
          color: #0f172a;
        }

        .boq-picker-filter-strip {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          padding: 0.9rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
        }

        .boq-picker-filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .boq-picker-filter-label {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 800;
          color: #475569;
          min-width: 88px;
        }

        .boq-picker-chip {
          border: 1px solid #dbe3ef;
          background: #f8fafc;
          color: #334155;
          border-radius: 999px;
          padding: 0.45rem 0.8rem;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }

        .boq-picker-chip.active {
          background: #0f172a;
          border-color: #0f172a;
          color: white;
        }

        /* ── Responsive ── */
        @media (max-width: 860px) {
          .boq-picker-group-grid {
            grid-template-columns: 1fr !important;
          }
          .boq-picker-body-split {
            flex-direction: column;
          }
          .boq-picker-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid #e2e8f0;
            max-height: 180px;
          }
          .boq-picker-sidebar .boq-picker-search {
            margin: 0.75rem 0.75rem 0;
          }
          .boq-picker-filter-strip.vertical {
            padding: 0.75rem;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 0.75rem;
            overflow-y: visible;
            overflow-x: auto;
          }
          .boq-picker-sidebar-chips.column {
            flex-direction: row;
          }
        }

        @media (max-width: 720px) {
          .boq-picker-modal {
            max-height: 96vh !important;
            border-radius: 18px;
          }

          .boq-picker-header {
            padding: 1.15rem 1rem 0.85rem;
          }

          .boq-picker-header h3 {
            font-size: 1.15rem;
          }

          .boq-picker-toolbar,
          .boq-picker-footer {
            flex-direction: column;
            align-items: stretch;
            padding: 1rem;
          }

          .boq-picker-summary,
          .boq-picker-footer-actions {
            justify-content: flex-start;
          }

          .boq-picker-filter-strip {
            gap: 0.75rem;
          }

          .boq-picker-filter-group {
            align-items: flex-start;
          }

          .boq-picker-filter-label {
            min-width: auto;
          }

          .boq-picker-btn {
            width: 100%;
          }

          .boq-picker-list {
            padding: 0.85rem 0.75rem 1.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default BOQItemPickerModal;
