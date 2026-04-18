import React from 'react';
import { Layers3, CheckCircle2, FileSpreadsheet } from 'lucide-react';

const formatMoney = (value) => (
  `N${Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`
);

const BOQBillSidebar = ({
  projectName = '',
  structureType = '',
  mode = 'workspace',
  sections = [],
  activeSectionId = null,
  countsBySection = {},
  totalsBySection = {},
  onSectionSelect,
  footer = null,
}) => {
  const stageLabel = mode === 'selection' ? 'BOQ Item Selection' : 'BOQ Workspace';
  const Icon = mode === 'selection' ? CheckCircle2 : FileSpreadsheet;

  return (
    <aside className="boq-sidebar-shell">
      <div className="boq-sidebar-head">
        <span className="boq-sidebar-eyebrow">{structureType || 'BOQ Project'}</span>
        <h3>{projectName || 'Project Workspace'}</h3>
        <div className="boq-sidebar-stage">
          <Icon size={14} />
          <span>{stageLabel}</span>
        </div>
      </div>

      <div className="boq-sidebar-summary">
        <div className="boq-sidebar-summary-icon">
          <Layers3 size={16} />
        </div>
        <div>
          <strong>{sections.length} bill section{sections.length === 1 ? '' : 's'}</strong>
          <small>
            {mode === 'selection'
              ? 'Choose bills from the sidebar and pick only the items you want before generating the BOQ.'
              : 'Switch bills without moving the pricing workspace layout.'}
          </small>
        </div>
      </div>

      <div className="boq-sidebar-list">
        {sections.map((section, index) => {
          const isActive = section.id === activeSectionId;
          const itemCount = Number(countsBySection?.[section.id] || 0);
          const total = Number(totalsBySection?.[section.id] || 0);

          return (
            <button
              key={section.id}
              type="button"
              className={`boq-sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => onSectionSelect?.(section.id)}
            >
              <span className="boq-sidebar-item-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="boq-sidebar-item-copy">
                <strong>{section.title}</strong>
                <small>{itemCount} {mode === 'selection' ? 'selected' : 'row'}{itemCount === 1 ? '' : 's'}</small>
              </div>
              <div className="boq-sidebar-item-metrics">
                {mode === 'workspace' && total > 0 && (
                  <span className="boq-sidebar-item-amount">{formatMoney(total)}</span>
                )}
                {isActive && <span className="boq-sidebar-item-active">Open</span>}
              </div>
            </button>
          );
        })}
      </div>

      {footer && <div className="boq-sidebar-footer">{footer}</div>}

      <style jsx="true">{`
        .boq-sidebar-shell {
          width: 280px;
          min-width: 280px;
          max-width: 280px;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
          color: #e2e8f0;
          border-right: 1px solid rgba(148, 163, 184, 0.18);
          min-height: 0;
        }

        .boq-sidebar-head {
          padding: 1.25rem 1rem 0.95rem;
          border-bottom: 1px solid rgba(148, 163, 184, 0.14);
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .boq-sidebar-eyebrow {
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #93c5fd;
        }

        .boq-sidebar-head h3 {
          margin: 0;
          font-size: 1rem;
          line-height: 1.4;
          color: #f8fafc;
        }

        .boq-sidebar-stage {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          align-self: flex-start;
          padding: 0.35rem 0.6rem;
          background: rgba(59, 130, 246, 0.12);
          color: #bfdbfe;
          border: 1px solid rgba(96, 165, 250, 0.2);
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .boq-sidebar-summary {
          margin: 0.9rem 1rem 0;
          padding: 0.9rem;
          display: flex;
          gap: 0.75rem;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.38);
          border: 1px solid rgba(148, 163, 184, 0.14);
        }

        .boq-sidebar-summary-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(96, 165, 250, 0.15);
          color: #93c5fd;
          flex-shrink: 0;
        }

        .boq-sidebar-summary strong {
          display: block;
          font-size: 0.86rem;
          color: #f8fafc;
        }

        .boq-sidebar-summary small {
          display: block;
          margin-top: 0.28rem;
          line-height: 1.5;
          color: #94a3b8;
          font-size: 0.74rem;
        }

        .boq-sidebar-list {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .boq-sidebar-item {
          width: 100%;
          border: 1px solid rgba(148, 163, 184, 0.14);
          background: rgba(15, 23, 42, 0.28);
          color: inherit;
          border-radius: 14px;
          padding: 0.8rem 0.85rem;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) auto;
          gap: 0.75rem;
          align-items: center;
          text-align: left;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .boq-sidebar-item:hover {
          transform: translateY(-1px);
          border-color: rgba(96, 165, 250, 0.35);
          background: rgba(30, 41, 59, 0.72);
        }

        .boq-sidebar-item.active {
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.22) 0%, rgba(30, 64, 175, 0.22) 100%);
          border-color: rgba(96, 165, 250, 0.45);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.24);
        }

        .boq-sidebar-item-index {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(148, 163, 184, 0.12);
          color: #cbd5e1;
          font-size: 0.72rem;
          font-weight: 800;
        }

        .boq-sidebar-item.active .boq-sidebar-item-index {
          background: rgba(191, 219, 254, 0.18);
          color: #eff6ff;
        }

        .boq-sidebar-item-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.22rem;
        }

        .boq-sidebar-item-copy strong {
          font-size: 0.84rem;
          color: #f8fafc;
          line-height: 1.35;
        }

        .boq-sidebar-item-copy small {
          font-size: 0.72rem;
          color: #94a3b8;
        }

        .boq-sidebar-item-metrics {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.3rem;
        }

        .boq-sidebar-item-amount {
          font-size: 0.72rem;
          font-weight: 700;
          color: #cbd5f5;
        }

        .boq-sidebar-item-active {
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #bfdbfe;
        }

        .boq-sidebar-footer {
          padding: 1rem;
          border-top: 1px solid rgba(148, 163, 184, 0.14);
        }

        @media (max-width: 1100px) {
          .boq-sidebar-shell {
            width: 100%;
            min-width: 0;
            max-width: none;
            border-right: none;
            border-bottom: 1px solid rgba(148, 163, 184, 0.18);
          }

          .boq-sidebar-list {
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;
          }

          .boq-sidebar-item {
            min-width: 250px;
          }
        }
      `}</style>
    </aside>
  );
};

export default BOQBillSidebar;
