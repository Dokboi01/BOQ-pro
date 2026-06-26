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
        /* --- NEW SPLIT-VIEW STYLES --- */
        .boq-picker-modal {
          width: min(1200px, 95vw) !important;
          max-height: 90vh !important;
        }
        
        .boq-picker-body-split {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .boq-picker-sidebar {
          width: 260px;
          flex-shrink: 0;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
        }

        .boq-picker-sidebar .boq-picker-search {
          margin: 1.25rem 1.25rem 0;
          border-radius: 10px;
          background: white;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          border: 1px solid #cbd5e1;
          padding: 0.8rem 0.95rem;
        }

        .boq-picker-sidebar .boq-picker-search input {
           font-size: 0.8rem;
           flex: 1;
           border: none;
           background: transparent;
           outline: none;
           color: #0f172a;
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
        }

        .boq-picker-sidebar-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .boq-picker-sidebar-label {
           display: flex;
           align-items: center;
           gap: 0.35rem;
           font-size: 0.7rem;
           font-weight: 800;
           text-transform: uppercase;
           letter-spacing: 0.05em;
           color: #64748b;
        }

        .boq-picker-sidebar-chips {
           display: flex;
           flex-wrap: wrap;
           gap: 0.35rem;
        }
        
        .boq-picker-sidebar-chips.column {
           flex-direction: column;
        }

        .boq-picker-sidebar-chip {
           text-align: left;
           background: transparent;
           border: 1px solid transparent;
           color: #475569;
           padding: 0.4rem 0.6rem;
           border-radius: 6px;
           font-size: 0.76rem;
           font-weight: 600;
           cursor: pointer;
           transition: all 0.2s;
        }

        .boq-picker-sidebar-chip:hover {
           background: #f1f5f9;
        }

        .boq-picker-sidebar-chip.active {
           background: #eff6ff;
           color: #1d4ed8;
           border-color: #bfdbfe;
           font-weight: 700;
        }

        .boq-picker-main {
           flex: 1;
           display: flex;
           flex-direction: column;
           overflow: hidden;
           background: #f1f5f9;
        }
        
        .boq-picker-main-toolbar {
           padding: 0.75rem 1.5rem;
           border-bottom: 1px solid #e2e8f0;
           background: white;
           display: flex;
           justify-content: flex-end;
        }

        .boq-picker-summary span.highlight-selected {
           background: #0f172a;
           color: white;
        }

        .boq-picker-group-grid {
           grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important;
        }

        .boq-picker-card {
           border-radius: 12px !important;
           padding: 1.25rem !important;
           box-shadow: 0 4px 12px rgba(15,23,42,0.02);
        }
        .boq-picker-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.72);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 1rem;
        }

        .boq-picker-modal {
          width: min(1080px, 100%);
          max-height: 92vh;
          background: white;
          border-radius: 22px;
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.28);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .boq-picker-header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.4rem 1.5rem 1rem;
          border-bottom: 1px solid #e2e8f0;
          background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
        }

        .boq-picker-header-copy {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .boq-picker-eyebrow {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #2563eb;
        }

        .boq-picker-header h3 {
          margin: 0;
          font-size: 1.35rem;
          color: #0f172a;
        }

        .boq-picker-header p,
        .boq-picker-header small {
          margin: 0;
          color: #475569;
          line-height: 1.5;
        }

        .boq-picker-header small {
          font-size: 0.8rem;
        }

        .boq-picker-close {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          background: white;
          color: #475569;
          cursor: pointer;
        }

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
          border-top: 1px solid #e2e8f0;
          border-bottom: none;
          background: white;
        }

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

        .boq-picker-summary {
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .boq-picker-summary span {
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          padding: 0.45rem 0.8rem;
          font-size: 0.75rem;
          font-weight: 700;
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

        .boq-picker-list {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.5rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background: #f8fafc;
        }

        .boq-picker-group {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .boq-picker-group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .boq-picker-group-header strong {
          font-size: 0.95rem;
          color: #0f172a;
        }

        .boq-picker-group-header span {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
        }

        .boq-picker-group-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.9rem;
        }

        .boq-picker-empty {
          border: 1px dashed #cbd5e1;
          border-radius: 18px;
          background: white;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: #64748b;
          text-align: center;
        }

        .boq-picker-card {
          width: 100%;
          text-align: left;
          border: 1px solid #dbe3ef;
          border-radius: 18px;
          background: white;
          padding: 1rem;
          cursor: pointer;
          transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .boq-picker-card:hover:not(:disabled) {
          border-color: #60a5fa;
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(37, 99, 235, 0.08);
        }

        .boq-picker-card.selected {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .boq-picker-card.added {
          opacity: 0.72;
          cursor: default;
          background: #f8fafc;
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
          gap: 0.45rem;
        }

        .boq-picker-card-title {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .boq-picker-card-title strong {
          font-size: 0.98rem;
          color: #0f172a;
        }

        .boq-picker-card-copy p {
          margin: 0;
          font-size: 0.84rem;
          line-height: 1.5;
          color: #475569;
        }

        .boq-picker-code {
          font-size: 0.68rem;
          font-weight: 800;
          color: #2563eb;
          letter-spacing: 0.08em;
        }

        .boq-picker-card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }

        .boq-picker-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.18rem 0.48rem;
          border-radius: 999px;
          background: #eef2ff;
          color: #4338ca;
          font-size: 0.64rem;
          font-weight: 800;
        }

        .boq-picker-tag.recommended {
          background: #ecfdf5;
          color: #15803d;
        }

        .boq-picker-tag.formula {
          background: #ede9fe;
          color: #6d28d9;
        }

        .boq-picker-state {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          border-radius: 999px;
          padding: 0.35rem 0.65rem;
          font-size: 0.72rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .boq-picker-state.neutral {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .boq-picker-state.selected {
          background: #0f172a;
          color: white;
        }

        .boq-picker-state.added {
          background: #e2e8f0;
          color: #475569;
        }

        .boq-picker-card-meta {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .boq-picker-card-flags {
          display: flex;
          gap: 0.45rem;
          flex-wrap: wrap;
        }

        .boq-picker-card-meta span,
        .boq-picker-hint {
          font-size: 0.74rem;
          color: #475569;
          line-height: 1.5;
        }

        .boq-picker-availability {
          display: inline-flex;
          align-items: center;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: #475569;
          background: #f8fafc;
        }

        .boq-picker-availability.ready {
          border-color: #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .boq-picker-availability.formula {
          border-color: #ddd6fe;
          background: #f5f3ff;
          color: #6d28d9;
        }

        .boq-picker-availability.missing {
          border-style: dashed;
        }

        .boq-picker-hint {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.65rem 0.75rem;
          background: #f8fafc;
        }

        .boq-picker-formula {
          border-radius: 14px;
          background: #f5f3ff;
          border: 1px solid #ddd6fe;
          padding: 0.8rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          color: #5b21b6;
        }

        .boq-picker-formula strong {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .boq-picker-formula span,
        .boq-picker-formula small {
          font-size: 0.76rem;
          line-height: 1.45;
          color: inherit;
        }

        .boq-picker-footer-copy {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .boq-picker-footer-copy strong {
          color: #0f172a;
          font-size: 0.92rem;
        }

        .boq-picker-footer-copy span {
          font-size: 0.78rem;
          color: #64748b;
        }

        .boq-picker-footer-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .boq-picker-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          min-width: 132px;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          border: 1px solid transparent;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
        }

        .boq-picker-btn.subtle {
          background: #f8fafc;
          color: #475569;
          border-color: #cbd5e1;
        }

        .boq-picker-btn.primary {
          background: #2563eb;
          color: white;
        }

        .boq-picker-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 860px) {
          .boq-picker-group-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .boq-picker-modal {
            max-height: 96vh;
          }

          .boq-picker-toolbar,
          .boq-picker-footer {
            flex-direction: column;
            align-items: stretch;
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
        }
      `}</style>
    </div>
  );
};

export default BOQItemPickerModal;
