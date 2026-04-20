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
        <strong>Bill Navigator</strong>
        <small>{sections.length} active bill{sections.length === 1 ? '' : 's'} in this workbook.</small>
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
                <span className="wbp-title-row">
                  <strong>{section.title}</strong>
                  {isActive && <span className="wbp-active-pill">Active</span>}
                </span>
                <span className="wbp-meta-row">
                  <small>{itemCount} line{itemCount === 1 ? '' : 's'}</small>
                  <small>{selectedCount} selected</small>
                </span>
              </span>
              <span className="wbp-total-block">
                <span className="wbp-total-label">Subtotal</span>
                <span className="wbp-total">{formatMoney(subtotal)}</span>
              </span>
            </button>
          );
        })}
      </div>

      <style>{`
        .wbp-panel {
          width: 280px;
          min-width: 280px;
          max-width: 280px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          border-right: 1px solid rgba(226, 232, 240, 0.9);
          padding-right: 1rem;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .wbp-panel::-webkit-scrollbar { width: 5px; }
        .wbp-panel::-webkit-scrollbar-track { background: transparent; }
        .wbp-panel::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

        .wbp-header {
          display: flex;
          flex-direction: column;
          gap: 0.38rem;
          padding: 1rem 1rem 0.95rem;
          border-radius: 20px;
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
          font-size: 1.02rem;
          color: #0f172a;
          line-height: 1.3;
        }

        .wbp-header small {
          font-size: 0.76rem;
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
          grid-template-columns: 44px minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.85rem;
          padding: 0.95rem 0.9rem;
          border-radius: 20px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background: #ffffff;
          text-align: left;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
        }

        .wbp-item::before {
          content: '';
          position: absolute;
          inset: 10px auto 10px 0;
          width: 4px;
          border-radius: 0 999px 999px 0;
          background: transparent;
          transition: background 0.18s ease;
        }

        .wbp-item:hover {
          transform: translateY(-1px);
          border-color: rgba(147, 197, 253, 0.95);
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.08);
        }

        .wbp-item.active {
          border-color: rgba(59, 130, 246, 0.88);
          box-shadow: 0 16px 30px rgba(37, 99, 235, 0.14);
          background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
        }

        .wbp-item.active::before {
          background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
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

        .wbp-item.active .wbp-index {
          background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
          color: #ffffff;
          box-shadow: 0 10px 18px rgba(37, 99, 235, 0.22);
        }

        .wbp-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .wbp-title-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          min-width: 0;
        }

        .wbp-copy strong {
          font-size: 0.92rem;
          color: #0f172a;
          line-height: 1.35;
        }

        .wbp-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }

        .wbp-copy small {
          display: inline-flex;
          align-items: center;
          padding: 0.18rem 0.42rem;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          font-size: 0.68rem;
          color: #64748b;
          line-height: 1.35;
          white-space: nowrap;
        }

        .wbp-active-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.16rem 0.44rem;
          border-radius: 999px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 0.62rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .wbp-total-block {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.18rem;
          min-width: 88px;
        }

        .wbp-total-label {
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #94a3b8;
        }

        .wbp-total {
          font-size: 0.78rem;
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
        }

        .wbp-item.active .wbp-total {
          color: #1d4ed8;
        }

        .wbp-item.active .wbp-total-label {
          color: #60a5fa;
        }

        @media (max-width: 1180px) {
          .wbp-panel {
            width: 100%;
            min-width: 0;
            max-width: 100%;
            position: static;
            border-right: none;
            padding-right: 0;
            padding-bottom: 0.25rem;
            overflow-y: visible;
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

        @media (max-width: 640px) {
          .wbp-header {
            padding: 0.9rem;
          }

          .wbp-item {
            min-width: 240px;
            padding: 0.85rem;
          }
        }
      `}</style>
    </aside>
  );
};

export default BOQBillPanel;
