import React from 'react';

const formatMoney = (value) =>
  `N${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const BOQBillPanel = ({
  sections = [],
  activeSectionId,
  sectionTotalsBySection = {},
  selectionCountsBySection = {},
  onSelectBill,
}) => {
  return (
    <aside className="wbp-panel">
      <div className="wbp-header">
        <span className="wbp-eyebrow">BOQ Bills</span>
        <strong>{sections.length} active bill{sections.length === 1 ? '' : 's'}</strong>
        <small>Switch bill sections without leaving the estimate sheet.</small>
      </div>

      <div className="wbp-list">
        {sections.map((section, index) => {
          const itemCount = (section.items || []).length;
          const selectedCount = selectionCountsBySection?.[section.id] || itemCount;
          const subtotal = sectionTotalsBySection?.[section.id] || 0;
          const isActive = section.id === activeSectionId;

          return (
            <button
              key={section.id}
              type="button"
              className={`wbp-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectBill?.(section.id)}
            >
              <span className="wbp-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="wbp-copy">
                <strong>{section.title}</strong>
                <small>{itemCount} line{itemCount === 1 ? '' : 's'} · {selectedCount} selected</small>
              </span>
              <span className="wbp-total">{formatMoney(subtotal)}</span>
            </button>
          );
        })}
      </div>

      <style>{`
        .wbp-panel {
          width: 248px;
          min-width: 248px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          border-right: 1px solid rgba(226, 232, 240, 0.9);
          padding-right: 1rem;
        }

        .wbp-header {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          padding: 1rem;
          border-radius: 18px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          border: 1px solid rgba(203, 213, 225, 0.9);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06);
        }

        .wbp-eyebrow {
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #64748b;
        }

        .wbp-header strong {
          font-size: 1rem;
          color: #0f172a;
        }

        .wbp-header small {
          font-size: 0.78rem;
          line-height: 1.5;
          color: #64748b;
        }

        .wbp-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          overflow: auto;
          padding-right: 0.15rem;
        }

        .wbp-item {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr);
          align-items: center;
          gap: 0.8rem;
          padding: 0.9rem;
          border-radius: 18px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background: #ffffff;
          text-align: left;
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
        }

        .wbp-item:hover {
          transform: translateY(-1px);
          border-color: rgba(147, 197, 253, 0.95);
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.08);
        }

        .wbp-item.active {
          border-color: rgba(59, 130, 246, 0.88);
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.14);
          background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
        }

        .wbp-index {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 0.8rem;
          font-weight: 800;
        }

        .wbp-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.22rem;
        }

        .wbp-copy strong {
          font-size: 0.92rem;
          color: #0f172a;
          line-height: 1.35;
        }

        .wbp-copy small {
          font-size: 0.75rem;
          color: #64748b;
          line-height: 1.45;
        }

        .wbp-total {
          grid-column: 2;
          font-size: 0.76rem;
          font-weight: 700;
          color: #0f172a;
        }

        @media (max-width: 1180px) {
          .wbp-panel {
            width: 100%;
            min-width: 0;
            border-right: none;
            padding-right: 0;
            padding-bottom: 0.25rem;
          }

          .wbp-list {
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;
            padding-bottom: 0.25rem;
          }

          .wbp-item {
            min-width: 260px;
          }
        }
      `}</style>
    </aside>
  );
};

export default BOQBillPanel;
