import React from 'react';
import { Search, X, Plus, CheckCircle2 } from 'lucide-react';

const matchesQuery = (item, query) => {
  const haystack = [
    item.code,
    item.name,
    item.description,
    item.unit,
    item.formulaText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
};

const formatMoney = (value) => (
  `₦${Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`
);

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

  const existingCatalogIds = React.useMemo(
    () => new Set((existingItems || []).map((item) => item.catalogItemId).filter(Boolean)),
    [existingItems]
  );

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return catalogItems;
    return (catalogItems || []).filter((item) => matchesQuery(item, normalizedQuery));
  }, [catalogItems, query]);

  const toggleSelection = (code) => {
    setSelectedCodes((prev) => (
      prev.includes(code)
        ? prev.filter((entry) => entry !== code)
        : [...prev, code]
    ));
  };

  const selectedItems = React.useMemo(
    () => (catalogItems || []).filter((item) => selectedCodes.includes(item.code)),
    [catalogItems, selectedCodes]
  );

  return (
    <div className="boq-picker-overlay">
      <div className="boq-picker-modal">
        <header className="boq-picker-header">
          <div>
            <span className="boq-picker-eyebrow">{structureType}</span>
            <h3>{section?.title || 'Select BOQ Items'}</h3>
            <p>{section?.description || 'Pick the exact line items you want in this bill.'}</p>
          </div>
          <button type="button" className="boq-picker-close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="boq-picker-toolbar">
          <div className="boq-picker-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search by code, item name, description, or unit"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
            />
          </div>
          <div className="boq-picker-summary">
            <span>{filteredItems.length} available</span>
            <span>{selectedItems.length} selected</span>
          </div>
        </div>

        <div className="boq-picker-list">
          {filteredItems.length === 0 ? (
            <div className="boq-picker-empty">
              <strong>No matching items found.</strong>
              <span>Try a broader search for this bill section.</span>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isAdded = existingCatalogIds.has(item.code);
              const isSelected = selectedCodes.includes(item.code);

              return (
                <button
                  key={item.code}
                  type="button"
                  className={`boq-picker-card ${isSelected ? 'selected' : ''} ${isAdded ? 'added' : ''}`}
                  onClick={() => !isAdded && toggleSelection(item.code)}
                  disabled={isAdded}
                >
                  <div className="boq-picker-card-top">
                    <div className="boq-picker-card-copy">
                      <div className="boq-picker-card-title">
                        <span className="boq-picker-code">{item.code}</span>
                        <strong>{item.name}</strong>
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
                    <span>Benchmark: {formatMoney(item.benchmarkRate)}</span>
                    {item.defaultFormulaType !== 'manual' && <span>Formula-backed</span>}
                  </div>
                  {item.formulaText && (
                    <div className="boq-picker-formula">{item.formulaText}</div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <footer className="boq-picker-footer">
          <div className="boq-picker-footer-copy">
            <strong>{selectedItems.length} item{selectedItems.length === 1 ? '' : 's'} ready</strong>
            <span>Selected items will be added straight into the active bill table.</span>
          </div>
          <div className="boq-picker-footer-actions">
            <button type="button" className="boq-picker-btn subtle" onClick={onClose}>
              Cancel
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
          width: min(980px, 100%);
          max-height: 90vh;
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

        .boq-picker-eyebrow {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #2563eb;
          margin-bottom: 0.35rem;
        }

        .boq-picker-header h3 {
          margin: 0 0 0.35rem;
          font-size: 1.35rem;
          color: #0f172a;
        }

        .boq-picker-header p {
          margin: 0;
          font-size: 0.875rem;
          color: #475569;
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

        .boq-picker-toolbar {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
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

        .boq-picker-list {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.5rem 1.5rem;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.9rem;
          background: #f8fafc;
        }

        .boq-picker-empty {
          grid-column: 1 / -1;
          border: 1px dashed #cbd5e1;
          border-radius: 18px;
          background: white;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
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

        .boq-picker-card-title {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .boq-picker-card-title strong {
          font-size: 0.98rem;
          color: #0f172a;
        }

        .boq-picker-code {
          font-size: 0.68rem;
          font-weight: 800;
          color: #2563eb;
          letter-spacing: 0.08em;
        }

        .boq-picker-card-copy p {
          margin: 0.45rem 0 0;
          font-size: 0.84rem;
          line-height: 1.5;
          color: #475569;
        }

        .boq-picker-state {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          white-space: nowrap;
          border-radius: 999px;
          padding: 0.42rem 0.72rem;
          font-size: 0.72rem;
          font-weight: 800;
        }

        .boq-picker-state.neutral {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .boq-picker-state.selected {
          background: rgba(16, 185, 129, 0.12);
          color: #047857;
        }

        .boq-picker-state.added {
          background: #e2e8f0;
          color: #475569;
        }

        .boq-picker-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.9rem;
        }

        .boq-picker-card-meta span,
        .boq-picker-formula {
          font-size: 0.74rem;
          color: #475569;
          background: #f8fafc;
          border-radius: 10px;
          padding: 0.45rem 0.6rem;
        }

        .boq-picker-formula {
          margin-top: 0.65rem;
          color: #1d4ed8;
          background: #eff6ff;
        }

        .boq-picker-footer {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e2e8f0;
          background: white;
        }

        .boq-picker-footer-copy {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .boq-picker-footer-copy strong {
          color: #0f172a;
          font-size: 0.92rem;
        }

        .boq-picker-footer-copy span {
          color: #64748b;
          font-size: 0.8rem;
        }

        .boq-picker-footer-actions {
          display: flex;
          gap: 0.75rem;
        }

        .boq-picker-btn {
          border-radius: 12px;
          padding: 0.75rem 1rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          cursor: pointer;
          border: 1px solid transparent;
        }

        .boq-picker-btn.subtle {
          background: white;
          color: #334155;
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

        @media (max-width: 900px) {
          .boq-picker-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .boq-picker-modal {
            max-height: 100vh;
            height: 100vh;
            border-radius: 0;
          }

          .boq-picker-toolbar,
          .boq-picker-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .boq-picker-footer-actions {
            width: 100%;
          }

          .boq-picker-btn {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default BOQItemPickerModal;
