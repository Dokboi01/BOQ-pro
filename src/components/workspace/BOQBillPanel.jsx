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
  const totalLines = sections.reduce((sum, section) => sum + ((section.items || []).length || 0), 0);
  const totalSelected = sections.reduce((sum, section) => (
    sum + (selectionCountsBySection?.[section.id] || (section.items || []).length || 0)
  ), 0);
  const activeSubtotal = sectionTotalsBySection?.[activeSectionId] || 0;
  const pricedBills = sections.filter((section) => (sectionTotalsBySection?.[section.id] || 0) > 0).length;

  return (
    <aside className="wbp-panel">
      <div className="wbp-header">
        <span className="wbp-eyebrow">BOQ Bills</span>
        <strong>Bill Navigator</strong>
        <small>{sections.length} active bill{sections.length === 1 ? '' : 's'} in this workbook.</small>
        <div className="wbp-header-stats">
          <div className="wbp-header-stat">
            <span>Lines</span>
            <strong>{totalLines}</strong>
          </div>
          <div className="wbp-header-stat">
            <span>Selected</span>
            <strong>{totalSelected}</strong>
          </div>
          <div className="wbp-header-stat wbp-header-stat-strong">
            <span>Active Total</span>
            <strong>{formatMoney(activeSubtotal)}</strong>
            <small>{pricedBills}/{sections.length} priced</small>
          </div>
        </div>
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
          gap: 0.85rem;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          border-right: 1px solid var(--border-light);
          padding: 1.25rem 1rem 1.25rem 0.25rem;
          scrollbar-width: thin;
          scrollbar-color: var(--border-medium) transparent;
        }
        .wbp-panel::-webkit-scrollbar { width: 5px; }
        .wbp-panel::-webkit-scrollbar-track { background: transparent; }
        .wbp-panel::-webkit-scrollbar-thumb { background: var(--border-medium); border-radius: 3px; }

        .wbp-header {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          padding: 1rem;
          border-radius: 12px;
          background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-card-muted) 100%);
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .wbp-eyebrow {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .wbp-header strong {
          font-size: 1rem;
          color: var(--text-heading);
          line-height: 1.3;
          font-weight: 800;
        }

        .wbp-header small {
          font-size: 0.72rem;
          line-height: 1.4;
          color: var(--text-secondary);
        }

        .wbp-header-stats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.5rem;
          margin-top: 0.15rem;
        }

        .wbp-header-stat {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          padding: 0.65rem 0.75rem;
          border-radius: 8px;
          background: var(--bg-card);
          border: 1px solid var(--border-light);
        }

        .wbp-header-stat span {
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .wbp-header-stat strong {
          font-size: 0.9rem;
          color: var(--text-primary);
          line-height: 1.25;
          font-weight: 700;
        }

        .wbp-header-stat small {
          font-size: 0.65rem;
          line-height: 1.35;
          color: var(--text-muted);
        }

        .wbp-header-stat-strong {
          grid-column: span 2;
          background: linear-gradient(135deg, var(--obsidian-900) 0%, var(--quantra-blue-800) 100%);
          border-color: var(--quantra-blue-700);
          box-shadow: var(--shadow-sm);
        }

        .wbp-header-stat-strong span,
        .wbp-header-stat-strong strong,
        .wbp-header-stat-strong small {
          color: #ffffff;
        }

        .wbp-header-stat-strong small {
          color: rgba(255, 255, 255, 0.78);
        }

        .wbp-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          overflow: auto;
          padding-right: 0.15rem;
          padding-bottom: 0.35rem;
        }

        .wbp-item {
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0.85rem;
          border-radius: 12px;
          border: 1px solid var(--border-light);
          background: var(--bg-card);
          text-align: left;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform var(--duration-fast) var(--ease-premium),
                      border-color var(--duration-fast) var(--ease-standard),
                      box-shadow var(--duration-fast) var(--ease-premium),
                      background var(--duration-fast) var(--ease-standard);
          box-shadow: var(--shadow-xs);
        }

        .wbp-item::before {
          content: '';
          position: absolute;
          inset: 8px auto 8px 0;
          width: 3px;
          border-radius: 0 999px 999px 0;
          background: transparent;
          transition: background var(--duration-fast) var(--ease-standard);
        }

        .wbp-item:hover {
          transform: translateY(-1px);
          border-color: var(--quantra-blue-300);
          box-shadow: var(--shadow-sm);
        }

        .wbp-item.active {
          border-color: var(--quantra-blue-500);
          box-shadow: var(--shadow-md);
          background: linear-gradient(180deg, var(--quantra-blue-50) 0%, var(--bg-card) 100%);
        }

        .wbp-item.active::before {
          background: linear-gradient(180deg, var(--quantra-blue-500) 0%, var(--quantra-blue-700) 100%);
        }

        .wbp-index {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--quantra-blue-50);
          color: var(--quantra-blue-700);
          font-size: 0.76rem;
          font-weight: 800;
        }

        .wbp-item.active .wbp-index {
          background: linear-gradient(180deg, var(--quantra-blue-600) 0%, var(--quantra-blue-700) 100%);
          color: #ffffff;
          box-shadow: var(--shadow-sm);
        }

        .wbp-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .wbp-title-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          min-width: 0;
        }

        .wbp-copy strong {
          font-size: 0.85rem;
          color: var(--text-primary);
          line-height: 1.35;
          font-weight: 700;
        }

        .wbp-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
        }

        .wbp-copy small {
          display: inline-flex;
          align-items: center;
          padding: 0.15rem 0.38rem;
          border-radius: 999px;
          background: var(--bg-card-muted);
          border: 1px solid var(--border-light);
          font-size: 0.64rem;
          color: var(--text-muted);
          line-height: 1.3;
          white-space: nowrap;
        }

        .wbp-active-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.14rem 0.4rem;
          border-radius: 999px;
          background: var(--quantra-blue-100);
          color: var(--quantra-blue-700);
          font-size: 0.58rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .wbp-total-block {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.15rem;
          min-width: 88px;
          padding-left: 0.25rem;
        }

        .wbp-total-label {
          font-size: 0.56rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .wbp-total {
          font-size: 0.76rem;
          font-weight: 800;
          color: var(--text-primary);
          white-space: nowrap;
        }

        .wbp-item.active .wbp-total {
          color: var(--quantra-blue-700);
        }

        .wbp-item.active .wbp-total-label {
          color: var(--quantra-blue-500);
        }

        @media (max-width: 1180px) {
          .wbp-panel {
            width: 100%;
            min-width: 0;
            max-width: 100%;
            position: static;
            border-right: none;
            padding: 0;
            overflow-y: visible;
            gap: 0.5rem;
          }

          .wbp-list {
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;
            padding-bottom: 0.25rem;
            gap: 0.4rem;
            scrollbar-width: none;
          }

          .wbp-list::-webkit-scrollbar {
            display: none;
          }

          .wbp-header-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .wbp-header-stat-strong {
            grid-column: span 1;
          }

          .wbp-item {
            min-width: 240px;
          }
        }

        @media (max-width: 640px) {
          .wbp-panel {
            gap: 0.4rem;
          }

          .wbp-header {
            padding: 0.65rem;
            border-radius: 10px;
            gap: 0.3rem;
          }

          .wbp-eyebrow {
            font-size: 0.52rem;
          }

          .wbp-header strong {
            font-size: 0.84rem;
          }

          .wbp-header small {
            font-size: 0.62rem;
            line-height: 1.3;
          }

          .wbp-header-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.3rem;
          }

          .wbp-header-stat,
          .wbp-header-stat-strong {
            grid-column: auto;
            padding: 0.45rem;
            border-radius: 6px;
          }

          .wbp-header-stat span {
            font-size: 0.46rem;
          }

          .wbp-header-stat strong {
            font-size: 0.7rem;
          }

          .wbp-header-stat small {
            display: none;
          }

          .wbp-item {
            min-width: 200px;
            grid-template-columns: 28px minmax(0, 1fr);
            gap: 0.45rem;
            padding: 0.5rem 0.65rem;
            border-radius: 10px;
          }

          .wbp-index {
            width: 28px;
            height: 28px;
            border-radius: 6px;
            font-size: 0.6rem;
          }

          .wbp-copy {
            gap: 0.18rem;
          }

          .wbp-copy strong {
            font-size: 0.7rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .wbp-copy small,
          .wbp-active-pill {
            font-size: 0.46rem;
            padding: 0.08rem 0.24rem;
          }

          .wbp-total-block {
            grid-column: 1 / -1;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            min-width: 0;
            padding-left: 0;
            padding-top: 0.15rem;
            border-top: 1px solid var(--border-light);
          }

          .wbp-total-label {
            font-size: 0.44rem;
          }

          .wbp-total {
            font-size: 0.6rem;
          }
        }
      `}</style>
    </aside>
  );
};

export default BOQBillPanel;
