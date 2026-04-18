import React from 'react';
import {
  Search,
  ListFilter,
  CheckCircle2,
  Plus,
  ArrowRight,
  FileSpreadsheet,
  RotateCcw,
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
      <div className="boq-selection-head">
        <div className="boq-selection-copy">
          <span className="boq-selection-eyebrow">{structureType || 'BOQ Builder'}</span>
          <h2>{section?.title || 'Choose a bill section'}</h2>
          <p>{section?.description || sectionMeta?.description || 'Pick only the items you want to measure in this bill before generating the BOQ sheet.'}</p>
          <small>{sectionMeta?.pickerPrompt || 'Selections stay grouped by bill section until you generate the BOQ table.'}</small>
        </div>

        <div className="boq-selection-summary">
          <div className="boq-selection-stat">
            <span>Current bill</span>
            <strong>{currentSectionSelectedCount} selected</strong>
          </div>
          <div className="boq-selection-stat">
            <span>Across project</span>
            <strong>{totalSelectedCount} selected</strong>
          </div>
          <div className="boq-selection-stat">
            <span>Library size</span>
            <strong>{catalogItems.length} items</strong>
          </div>
        </div>
      </div>

      <div className="boq-selection-toolbar">
        <div className="boq-selection-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by code, item, description, formula, or keyword"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="boq-selection-filter-group">
          <span className="boq-selection-filter-label">
            <ListFilter size={14} /> Filters
          </span>
          <div className="boq-selection-chip-row">
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

        <div className="boq-selection-filter-group">
          <span className="boq-selection-filter-label">Category</span>
          <div className="boq-selection-chip-row">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`boq-selection-chip ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category === 'all' ? 'All Categories' : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="boq-selection-canvas">
        {filteredItems.length === 0 ? (
          <div className="boq-selection-empty">
            <strong>No items match the current filters.</strong>
            <span>Try a broader search or clear the active filter chips.</span>
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
                    <div>
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
                      {hasFormula ? 'Formula available' : 'No formula yet'}
                    </span>
                    <span className={`boq-selection-flag ${hasBenchmark ? 'ready' : 'pending'}`}>
                      {hasBenchmark ? 'Benchmark available' : 'Benchmark pending'}
                    </span>
                  </div>

                  {item.pickerHint && (
                    <div className="boq-selection-hint">{item.pickerHint}</div>
                  )}

                  {formulaText && (
                    <div className="boq-selection-formula">
                      <strong>Formula Basis</strong>
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

      <div className="boq-selection-footer">
        <div className="boq-selection-footer-copy">
          <strong>{currentSectionSelectedCount} item{currentSectionSelectedCount === 1 ? '' : 's'} selected in {section?.title || 'this bill'}</strong>
          <span>
            {selectedPreview
              ? `Preview: ${selectedPreview}${currentSectionSelectedCount > 3 ? '...' : ''}`
              : 'Selected items stay in this bill until you generate the BOQ table.'}
          </span>
        </div>

        <div className="boq-selection-footer-actions">
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
      </div>

      <style jsx="true">{`
        .boq-selection-shell {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
        }

        .boq-selection-head {
          padding: 1.5rem 1.6rem 1rem;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          border-bottom: 1px solid #e2e8f0;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        }

        .boq-selection-copy {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          max-width: 760px;
        }

        .boq-selection-eyebrow {
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #2563eb;
        }

        .boq-selection-copy h2 {
          margin: 0;
          font-size: 1.4rem;
          color: #0f172a;
        }

        .boq-selection-copy p,
        .boq-selection-copy small {
          margin: 0;
          color: #475569;
          line-height: 1.55;
        }

        .boq-selection-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
          min-width: 320px;
        }

        .boq-selection-stat {
          border-radius: 16px;
          padding: 0.9rem;
          background: #0f172a;
          color: #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .boq-selection-stat span {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #94a3b8;
        }

        .boq-selection-stat strong {
          font-size: 0.96rem;
        }

        .boq-selection-toolbar {
          padding: 1rem 1.6rem;
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
        }

        .boq-selection-search {
          min-width: 280px;
          flex: 1 1 320px;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          border: 1px solid #cbd5e1;
          border-radius: 14px;
          padding: 0.82rem 0.95rem;
          background: #f8fafc;
        }

        .boq-selection-search input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          color: #0f172a;
          font-size: 0.92rem;
        }

        .boq-selection-filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          min-width: 220px;
        }

        .boq-selection-filter-label {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .boq-selection-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }

        .boq-selection-chip {
          border: 1px solid #dbe3ef;
          background: #f8fafc;
          color: #334155;
          border-radius: 999px;
          padding: 0.45rem 0.8rem;
          font-size: 0.74rem;
          font-weight: 700;
          cursor: pointer;
        }

        .boq-selection-chip.active {
          background: #0f172a;
          border-color: #0f172a;
          color: white;
        }

        .boq-selection-canvas {
          flex: 1;
          min-height: 0;
          padding: 1.25rem 1.6rem 1.5rem;
          overflow-y: auto;
        }

        .boq-selection-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 1rem;
        }

        .boq-selection-card {
          border: 1px solid #dbe3ef;
          border-radius: 18px;
          background: white;
          padding: 1rem;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .boq-selection-card:hover {
          transform: translateY(-1px);
          border-color: #60a5fa;
          box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
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
          font-size: 0.98rem;
        }

        .boq-selection-card p {
          margin: 0;
          font-size: 0.84rem;
          line-height: 1.55;
          color: #475569;
        }

        .boq-selection-state {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          border-radius: 999px;
          padding: 0.38rem 0.72rem;
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
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 0.65rem 0.75rem;
          font-size: 0.74rem;
          color: #475569;
        }

        .boq-selection-formula {
          border-radius: 14px;
          border: 1px solid #ddd6fe;
          background: #f5f3ff;
          padding: 0.8rem;
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
          line-height: 1.45;
        }

        .boq-selection-empty {
          min-height: 280px;
          border: 1px dashed #cbd5e1;
          border-radius: 20px;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          text-align: center;
          color: #64748b;
          padding: 2rem;
        }

        .boq-selection-footer {
          padding: 1rem 1.6rem 1.25rem;
          border-top: 1px solid #e2e8f0;
          background: #ffffff;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
        }

        .boq-selection-footer-copy {
          display: flex;
          flex-direction: column;
          gap: 0.28rem;
        }

        .boq-selection-footer-copy strong {
          color: #0f172a;
          font-size: 0.92rem;
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
          border-radius: 12px;
          border: 1px solid transparent;
          padding: 0.78rem 1rem;
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

        .boq-selection-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        @media (max-width: 1100px) {
          .boq-selection-head,
          .boq-selection-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .boq-selection-summary {
            min-width: 0;
          }
        }

        @media (max-width: 720px) {
          .boq-selection-head,
          .boq-selection-toolbar,
          .boq-selection-canvas,
          .boq-selection-footer {
            padding-left: 1rem;
            padding-right: 1rem;
          }

          .boq-selection-summary {
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
