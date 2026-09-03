import React from 'react';
import { formatProjectCurrency } from '../../utils/currency';

const BOQBillPanel = ({
  sections = [],
  activeSectionId,
  sectionTotalsBySection = {},
  selectionCountsBySection = {},
  onSelectBill,
  project = null,
}) => {
  const formatMoney = (value) => formatProjectCurrency(value, project, { maximumFractionDigits: 2 });
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
              <span className="wbp-title-row">
                <strong>{section.title}</strong>
                {isActive && <span className="wbp-active-pill">ACTIVE</span>}
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
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.6rem 1.1rem;
          border-radius: 9999px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          text-align: left;
          cursor: pointer;
          position: relative;
          transition: all var(--duration-fast) var(--ease-standard);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .wbp-item:hover {
          transform: translateY(-1px);
          border-color: #cbd5e1;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
        }

        .wbp-item.active {
          border-color: #0f172a;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.22);
          background: #0f172a;
        }

        .wbp-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 0.5rem;
          min-width: 0;
        }

        .wbp-title-row strong {
          font-size: 0.82rem;
          color: #1e293b;
          line-height: 1.35;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .wbp-item.active .wbp-title-row strong {
          color: #ffffff;
        }

        .wbp-active-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.16rem 0.48rem;
          border-radius: 9999px;
          background: #38bdf8;
          color: #0f172a;
          font-size: 0.56rem;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          white-space: nowrap;
          flex-shrink: 0;
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
            min-width: 180px;
            padding: 0.45rem 0.8rem;
            border-radius: 9999px;
          }

          .wbp-title-row strong {
            font-size: 0.72rem;
          }

          .wbp-active-pill {
            font-size: 0.48rem;
            padding: 0.1rem 0.28rem;
          }
        }
      `}</style>
    </aside>
  );
};

export default BOQBillPanel;
