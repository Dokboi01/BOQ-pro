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

const FILTER_OPTIONS = [
  { id: 'all', label: 'All Items' },
  { id: 'recommended', label: 'Recommended' },
  { id: 'formula', label: 'Formula Ready' },
  { id: 'benchmark', label: 'Benchmark Ready' },
];

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
}) => {
  const [query, setQuery] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [activeCategory, setActiveCategory] = React.useState('all');

  const categories = React.useMemo(() => (
    ['all', ...Array.from(new Set(
      (catalogItems || [])
        .map((item) => item.category || 'General')
        .filter(Boolean)
    ))]
  ), [catalogItems]);

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return (catalogItems || []).filter((item) => {
      const itemCategory = item.category || 'General';
      const hasFormula = item.defaultFormulaType && item.defaultFormulaType !== 'manual';
      const hasBenchmark = Number(item.benchmarkRate || item.benchmarkMetadata?.rate || 0) > 0;

      const matchesQuery = !normalizedQuery || buildSearchText(item).includes(normalizedQuery);
      const matchesCategory = activeCategory === 'all' || itemCategory === activeCategory;
      const matchesFilter = (() => {
        switch (activeFilter) {
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
  }, [activeCategory, activeFilter, catalogItems, query]);

  const metrics = React.useMemo(() => ({
    recommended: (catalogItems || []).filter((item) => item.isRecommended === true).length,
    formulaReady: (catalogItems || []).filter((item) => item.defaultFormulaType && item.defaultFormulaType !== 'manual').length,
    benchmarkReady: (catalogItems || []).filter((item) => Number(item.benchmarkRate || item.benchmarkMetadata?.rate || 0) > 0).length,
  }), [catalogItems]);

  const visibleCodes = React.useMemo(() => (
    filteredItems.map((item) => item.code)
  ), [filteredItems]);

  const selectedPreview = React.useMemo(() => (
    (catalogItems || [])
      .filter((item) => selectedCodes.includes(item.code))
      .slice(0, 3)
      .map((item) => item.name)
      .join(', ')
  ), [catalogItems, selectedCodes]);

  const clearFilters = () => {
    setQuery('');
    setActiveFilter('all');
    setActiveCategory('all');
  };

  return (
    <div className="boq-selection-shell">
      <section className="boq-selection-overview">
        <div className="boq-selection-overview-copy">
          <span className="boq-selection-eyebrow">{structureType || 'BOQ Builder'}</span>
          <h2>{section?.title || 'Choose a bill section'}</h2>
          <p>{section?.description || sectionMeta?.description || 'Pick only the items you want to measure in this bill before generating the BOQ sheet.'}</p>
          <div className="boq-selection-overview-tags">
            <span>{projectName || 'Current Project'}</span>
            <span>{marketRegion || 'Market region'}</span>
            <span>{catalogItems.length} library items</span>
          </div>
          <small>{sectionMeta?.pickerPrompt || 'Selections stay grouped by bill section until you generate the BOQ table.'}</small>
        </div>

        <div className="boq-selection-overview-stats">
          <div className="boq-selection-metric-card highlighted">
            <span>Selected in this bill</span>
            <strong>{currentSectionSelectedCount}</strong>
            <small>Only these will become BOQ rows for {section?.title || 'this bill'}.</small>
          </div>
          <div className="boq-selection-metric-card">
            <span>Total selected</span>
            <strong>{totalSelectedCount}</strong>
            <small>Across the full structure before BOQ generation.</small>
          </div>
          <div className="boq-selection-metric-card">
            <span>Recommended</span>
            <strong>{metrics.recommended}</strong>
            <small>Seeded items marked as likely picks for this bill.</small>
          </div>
        </div>
      </section>

      <section className="boq-selection-workbench">
        <aside className="boq-selection-control-panel">
          <div className="boq-selection-panel-card">
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
          </div>

          <div className="boq-selection-panel-card">
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

          <div className="boq-selection-panel-card">
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

          <div className="boq-selection-panel-card">
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
        </aside>

        <div className="boq-selection-results">
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
                const isSelected = selectedCodes.includes(item.code);
                const hasFormula = item.defaultFormulaType && item.defaultFormulaType !== 'manual';
                const hasBenchmark = Number(item.benchmarkRate || item.benchmarkMetadata?.rate || 0) > 0;
                const formulaText = getFormulaDisplayText(item);
                const workedExample = hasFormula ? getWorkedExamplePreview(item) : '';

                return (
                  <button
                    key={item.code}
                    type="button"
                    className={`boq-selection-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => onToggleItem?.(item.code)}
                  >
                    <div className="boq-selection-card-top">
                      <div className="boq-selection-card-heading">
                        <span className="boq-selection-code">{item.code}</span>
                        <strong>{item.name}</strong>
                      </div>
                      <span className={`boq-selection-state ${isSelected ? 'selected' : ''}`}>
                        {isSelected ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                        {isSelected ? 'Selected' : 'Add'}
                      </span>
                    </div>

                    <p>{item.description || item.name}</p>

                    <div className="boq-selection-card-meta">
                      <span>Unit: {item.unit || 'Nr'}</span>
                      <span>{item.category || 'General'}</span>
                    </div>

                    <div className="boq-selection-card-flags">
                      <span className={`boq-selection-flag ${hasFormula ? 'ready' : 'pending'}`}>
                        {hasFormula ? 'Formula ready' : 'Manual only'}
                      </span>
                      <span className={`boq-selection-flag ${hasBenchmark ? 'ready' : 'pending'}`}>
                        {hasBenchmark ? 'Benchmark ready' : 'Benchmark pending'}
                      </span>
                    </div>

                    {item.pickerHint && (
                      <div className="boq-selection-hint">{item.pickerHint}</div>
                    )}

                    {formulaText && (
                      <div className="boq-selection-formula">
                        <strong>Formula Preview</strong>
                        <span>{formulaText}</span>
                        {workedExample && <small>{workedExample}</small>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
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

      <style jsx="true">{`
        .boq-selection-shell {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background:
            radial-gradient(circle at top right, rgba(191, 219, 254, 0.35), transparent 30%),
            linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          padding: 1.25rem;
        }

        .boq-selection-overview {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(300px, 1fr);
          gap: 1rem;
          align-items: stretch;
        }

        .boq-selection-overview-copy,
        .boq-selection-overview-stats {
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08);
        }

        .boq-selection-overview-copy {
          padding: 1.35rem 1.45rem;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
          color: #0f172a;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .boq-selection-eyebrow {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          border-radius: 999px;
          padding: 0.34rem 0.72rem;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .boq-selection-overview-copy h2 {
          margin: 0;
          font-size: 1.55rem;
          line-height: 1.12;
          color: #0f172a;
        }

        .boq-selection-overview-copy p,
        .boq-selection-overview-copy small {
          margin: 0;
          line-height: 1.6;
          color: #64748b;
        }

        .boq-selection-overview-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin-top: 0.15rem;
        }

        .boq-selection-overview-tags span {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0.38rem 0.72rem;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          font-size: 0.74rem;
          font-weight: 700;
          color: #1e3a8a;
        }

        .boq-selection-overview-stats {
          padding: 1rem;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          display: grid;
          gap: 0.75rem;
        }

        .boq-selection-metric-card {
          border-radius: 20px;
          padding: 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 0.28rem;
        }

        .boq-selection-metric-card.highlighted {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-color: #bfdbfe;
        }

        .boq-selection-metric-card span {
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #64748b;
        }

        .boq-selection-metric-card strong {
          font-size: 1.3rem;
          color: #0f172a;
        }

        .boq-selection-metric-card small {
          line-height: 1.55;
          color: #475569;
        }

        .boq-selection-workbench {
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 1rem;
          min-height: 0;
        }

        .boq-selection-control-panel {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
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

        .boq-selection-chip-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
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
          flex-direction: column;
          gap: 0.45rem;
          max-height: 240px;
          overflow-y: auto;
          padding-right: 0.2rem;
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

        .boq-selection-panel-actions {
          display: flex;
          flex-direction: column;
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
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
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
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #2563eb;
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

        .boq-selection-hint {
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 0.72rem 0.8rem;
          font-size: 0.74rem;
          color: #475569;
          line-height: 1.55;
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

        @media (max-width: 1200px) {
          .boq-selection-overview,
          .boq-selection-workbench,
          .boq-selection-footer {
            grid-template-columns: 1fr;
            flex-direction: column;
            align-items: stretch;
          }

          .boq-selection-overview-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 860px) {
          .boq-selection-shell {
            padding: 0.9rem;
          }

          .boq-selection-overview-stats {
            grid-template-columns: 1fr;
          }

          .boq-selection-results-head,
          .boq-selection-footer {
            flex-direction: column;
            align-items: stretch;
          }
        }

        @media (max-width: 720px) {
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
