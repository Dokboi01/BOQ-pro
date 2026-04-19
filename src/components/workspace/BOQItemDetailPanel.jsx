import React from 'react';
import {
  X,
  BarChart2,
  Cpu,
  SlidersHorizontal,
  Info,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  getFormulaDisplayText,
  getWorkedExamplePreview,
  isFormulaDrivenItem,
  normalizeEditableInputs,
} from '../../utils/boqFormulas';

const formatMoney = (value) =>
  `₦${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const CONFIDENCE_COLORS = {
  high: '#16a34a',
  medium: '#2563eb',
  low: '#b45309',
};

const Section = ({ icon: Icon, title, children, defaultOpen = true }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="idp-section">
      <button
        type="button"
        className="idp-section-header"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="idp-section-header-left">
          {Icon && <Icon size={13} />}
          <strong>{title}</strong>
        </span>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {open && <div className="idp-section-body">{children}</div>}
    </div>
  );
};

const RateRow = ({ label, value, active, tone }) => (
  <div className={`idp-rate-row ${active ? 'idp-rate-row-active' : ''}`}>
    <span className="idp-rate-label">{label}</span>
    <span
      className={`idp-rate-value ${active ? `idp-rate-value-${tone || 'active'}` : ''}`}
    >
      {value}
    </span>
    {active && <span className="idp-rate-active-badge">In Use</span>}
  </div>
);

const MetaRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="idp-meta-row">
      <span className="idp-meta-label">{label}</span>
      <span className="idp-meta-value">{value}</span>
    </div>
  );
};

const BOQItemDetailPanel = ({
  item,
  section,
  benchmarkRate,
  formulaRate,
  resolvedUnitRate,
  selectedRateSource,
  onClose,
  onNotesChange,
  onOpenFormulaEditor,
  variant = 'overlay',
}) => {
  if (!item) return null;

  const formulaText = getFormulaDisplayText(item);
  const workedExample = getWorkedExamplePreview(item, { preferEditableInputs: true });
  const hasFormula = isFormulaDrivenItem(item);
  const editableInputs = normalizeEditableInputs(item.editableInputs);
  const formulaBasis = Array.isArray(item.formulaBasis)
    ? item.formulaBasis.filter(Boolean)
    : [];
  const benchmarkMeta = item.benchmarkMetadata || {};

  const sourceLabels = {
    benchmark: 'Benchmark',
    formula: 'Formula',
    manual: 'Manual',
  };

  return (
    <div
      className={`idp-overlay ${variant === 'docked' ? 'idp-overlay-docked' : ''}`}
      onClick={variant === 'overlay' ? onClose : undefined}
    >
      <div
        className={`idp-panel ${variant === 'docked' ? 'idp-panel-docked' : ''}`}
        onClick={(e) => {
          if (variant === 'overlay') {
            e.stopPropagation();
          }
        }}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="idp-header">
          <div className="idp-header-copy">
            {item.code && <span className="idp-code">{item.code}</span>}
            <h3 className="idp-title">{item.name || 'BOQ Item'}</h3>
            <p className="idp-desc">{item.description}</p>
            <div className="idp-header-tags">
              <span className="idp-tag">{item.unit}</span>
              {item.category && <span className="idp-tag">{item.category}</span>}
              <span className={`idp-tag idp-tag-src-${selectedRateSource}`}>
                {sourceLabels[selectedRateSource] || selectedRateSource} Rate Active
              </span>
              {item.billSectionTitle && (
                <span className="idp-tag idp-tag-section">{item.billSectionTitle}</span>
              )}
            </div>
          </div>
          {onClose && (
            <button type="button" className="idp-close" onClick={onClose}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── Scrollable body ─────────────────────────────────────── */}
        <div className="idp-body">
          {/* Rate summary */}
          <Section icon={BarChart2} title="Rate Summary">
            <RateRow
              label="Benchmark Rate"
              value={formatMoney(benchmarkRate)}
              active={selectedRateSource === 'benchmark'}
              tone="benchmark"
            />
            {hasFormula && (
              <RateRow
                label="Formula Rate"
                value={formatMoney(formulaRate)}
                active={selectedRateSource === 'formula'}
                tone="formula"
              />
            )}
            <RateRow
              label="Manual Rate"
              value={formatMoney(item.manualRate ?? item.rate ?? 0)}
              active={selectedRateSource === 'manual'}
              tone="manual"
            />
            <div className="idp-resolved-row">
              <span>Resolved Unit Rate</span>
              <strong>{formatMoney(resolvedUnitRate)}</strong>
            </div>
            <div className="idp-resolved-row idp-resolved-row-amount">
              <span>Amount (Qty {(item.qty || 0).toLocaleString()} × Rate)</span>
              <strong>{formatMoney((item.qty || 0) * resolvedUnitRate)}</strong>
            </div>
          </Section>

          {/* Formula */}
          {hasFormula && (
            <Section icon={Cpu} title="Formula" defaultOpen>
              {formulaText && (
                <div className="idp-formula-display">
                  <span className="idp-formula-label">Formula</span>
                  <code className="idp-formula-text">{formulaText}</code>
                </div>
              )}

              {formulaBasis.length > 0 && (
                <div className="idp-formula-basis">
                  <span className="idp-formula-label">Pricing Basis</span>
                  <ul className="idp-formula-basis-list">
                    {formulaBasis.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                </div>
              )}

              {editableInputs.length > 0 && (
                <div className="idp-inputs-grid">
                  {editableInputs.map((input) => (
                    <div key={input.id} className="idp-input-row">
                      <span className="idp-input-label">{input.label}</span>
                      <span className="idp-input-value">
                        {Number(input.value).toLocaleString()}
                        {input.unit ? ` ${input.unit}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {workedExample && (
                <div className="idp-worked-example">
                  <span className="idp-worked-label">Worked Example</span>
                  <p>{workedExample}</p>
                </div>
              )}

              {onOpenFormulaEditor && (
                <button
                  type="button"
                  className="idp-action-btn"
                  onClick={onOpenFormulaEditor}
                >
                  <SlidersHorizontal size={13} /> Edit Formula Inputs
                </button>
              )}
            </Section>
          )}

          {/* Benchmark */}
          <Section icon={BarChart2} title="Benchmark Information" defaultOpen={!hasFormula}>
            {benchmarkRate > 0 ? (
              <>
                <div className="idp-benchmark-rate-display">
                  <span>Current Benchmark</span>
                  <strong>{formatMoney(benchmarkRate)}</strong>
                </div>
                <div className="idp-meta-grid">
                  <MetaRow label="Currency" value={benchmarkMeta.currency || 'NGN'} />
                  <MetaRow label="Region" value={benchmarkMeta.region || 'Lagos'} />
                  <MetaRow
                    label="Source Type"
                    value={benchmarkMeta.sourceType
                      ? benchmarkMeta.sourceType.charAt(0).toUpperCase() + benchmarkMeta.sourceType.slice(1)
                      : 'Catalog'}
                  />
                  {benchmarkMeta.sourceNote && (
                    <MetaRow label="Source Note" value={benchmarkMeta.sourceNote} />
                  )}
                  {benchmarkMeta.dateCaptured && (
                    <MetaRow label="Date Captured" value={benchmarkMeta.dateCaptured} />
                  )}
                  {benchmarkMeta.confidenceLevel && (
                    <div className="idp-meta-row">
                      <span className="idp-meta-label">Confidence</span>
                      <span
                        className="idp-meta-value idp-meta-confidence"
                        style={{
                          color: CONFIDENCE_COLORS[benchmarkMeta.confidenceLevel] || '#475569',
                        }}
                      >
                        {benchmarkMeta.confidenceLevel.charAt(0).toUpperCase() +
                          benchmarkMeta.confidenceLevel.slice(1)}
                      </span>
                    </div>
                  )}
                </div>
                {item.benchmarkEvidence?.verifiedBy && (
                  <div className="idp-evidence-note">
                    <Info size={12} />
                    Verified by {item.benchmarkEvidence.verifiedBy}
                  </div>
                )}
              </>
            ) : (
              <p className="idp-empty-note">
                No benchmark rate available for this item yet. Set a manual rate or use the
                benchmark refresh to pull in market data.
              </p>
            )}
          </Section>

          {/* Notes */}
          <Section icon={FileText} title="Notes" defaultOpen={false}>
            <textarea
              className="idp-notes-input"
              rows={4}
              value={item.notes || ''}
              placeholder="Add estimating notes, assumptions, or pricing decisions for this item…"
              onChange={(e) => onNotesChange?.(e.target.value)}
            />
            {item.pickerHint && (
              <div className="idp-picker-hint">
                <Info size={12} /> {item.pickerHint}
              </div>
            )}
          </Section>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="idp-footer">
          <span className="idp-footer-ref">
            {section?.title && `${section.title} · `}
            {item.unit} · {sourceLabels[selectedRateSource] || selectedRateSource} active
          </span>
          {onClose && (
            <button type="button" className="idp-close-btn" onClick={onClose}>
              Close
            </button>
          )}
        </div>

        <style>{`
          .idp-overlay {
            position: fixed;
            inset: 0;
            z-index: 1300;
            background: rgba(15, 23, 42, 0.35);
            backdrop-filter: blur(2px);
            display: flex;
            justify-content: flex-end;
          }

          .idp-overlay-docked {
            position: static;
            inset: auto;
            z-index: auto;
            background: transparent;
            backdrop-filter: none;
            display: block;
          }

          .idp-panel {
            width: min(480px, 100vw);
            height: 100dvh;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            box-shadow: -16px 0 48px rgba(15, 23, 42, 0.16);
            overflow: hidden;
          }

          .idp-panel-docked {
            width: 100%;
            height: 100%;
            min-height: 0;
            border-left: none;
            border-radius: 0;
            box-shadow: none;
            background: transparent;
          }

          .idp-panel-docked .idp-header {
            padding: 1rem 1rem 0.9rem;
          }

          .idp-panel-docked .idp-title {
            font-size: 1rem;
          }

          .idp-panel-docked .idp-body {
            padding-top: 0.2rem;
          }

          .idp-panel-docked .idp-section-header {
            padding: 0.8rem 1rem;
          }

          .idp-panel-docked .idp-section-body {
            padding: 0 1rem 0.95rem;
          }

          .idp-panel-docked .idp-footer {
            padding: 0.8rem 1rem;
            background: #ffffff;
          }

          .idp-header {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            padding: 1.25rem 1.25rem 1rem;
            border-bottom: 1px solid #e2e8f0;
            background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
            flex-shrink: 0;
          }

          .idp-header-copy {
            display: flex;
            flex-direction: column;
            gap: 0.3rem;
          }

          .idp-code {
            font-size: 0.68rem;
            font-weight: 800;
            color: #2563eb;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .idp-title {
            margin: 0;
            font-size: 1.1rem;
            color: #0f172a;
            font-weight: 700;
            line-height: 1.3;
          }

          .idp-desc {
            margin: 0;
            font-size: 0.82rem;
            color: #475569;
            line-height: 1.5;
          }

          .idp-header-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.4rem;
            margin-top: 0.15rem;
          }

          .idp-tag {
            display: inline-flex;
            align-items: center;
            padding: 0.2rem 0.55rem;
            border-radius: 999px;
            background: #e2e8f0;
            color: #334155;
            font-size: 0.65rem;
            font-weight: 700;
          }

          .idp-tag-src-benchmark { background: #dbeafe; color: #1d4ed8; }
          .idp-tag-src-formula   { background: #ede9fe; color: #6d28d9; }
          .idp-tag-src-manual    { background: #d1fae5; color: #15803d; }
          .idp-tag-section       { background: #fef9c3; color: #a16207; }

          .idp-close {
            width: 32px;
            height: 32px;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            background: white;
            color: #64748b;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .idp-close:hover { background: #f1f5f9; }

          .idp-body {
            flex: 1;
            overflow-y: auto;
            padding: 0.5rem 0;
          }

          /* ── Section ── */
          .idp-section {
            border-bottom: 1px solid #f1f5f9;
          }

          .idp-section-header {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1.25rem;
            background: none;
            border: none;
            cursor: pointer;
            color: #0f172a;
          }
          .idp-section-header:hover { background: #f8fafc; }

          .idp-section-header-left {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .idp-section-header strong { font-size: 0.85rem; }

          .idp-section-body {
            padding: 0 1.25rem 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          /* ── Rate rows ── */
          .idp-rate-row {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            padding: 0.45rem 0.75rem;
            border-radius: 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }

          .idp-rate-row-active {
            border-color: #bfdbfe;
            background: #eff6ff;
          }

          .idp-rate-label {
            flex: 1;
            font-size: 0.8rem;
            color: #475569;
          }

          .idp-rate-value {
            font-size: 0.88rem;
            font-weight: 700;
            color: #0f172a;
          }
          .idp-rate-value-benchmark { color: #1d4ed8; }
          .idp-rate-value-formula   { color: #6d28d9; }
          .idp-rate-value-manual    { color: #15803d; }
          .idp-rate-value-active    { color: #0f172a; }

          .idp-rate-active-badge {
            padding: 0.15rem 0.45rem;
            border-radius: 999px;
            background: #2563eb;
            color: white;
            font-size: 0.62rem;
            font-weight: 800;
          }

          .idp-resolved-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0.75rem;
            border-radius: 10px;
            background: #0f172a;
            color: white;
            font-size: 0.82rem;
            margin-top: 0.25rem;
          }

          .idp-resolved-row-amount {
            background: #1e293b;
            margin-top: 0.15rem;
          }

          /* ── Formula ── */
          .idp-formula-display {
            display: flex;
            flex-direction: column;
            gap: 0.3rem;
            background: #f5f3ff;
            border: 1px solid #ddd6fe;
            border-radius: 10px;
            padding: 0.75rem;
          }

          .idp-formula-label {
            font-size: 0.68rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #6d28d9;
          }

          .idp-formula-text {
            font-size: 0.82rem;
            color: #4c1d95;
            font-family: 'Menlo', 'Monaco', monospace;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-word;
          }

          .idp-formula-basis {
            display: flex;
            flex-direction: column;
            gap: 0.45rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 0.75rem;
          }

          .idp-formula-basis-list {
            margin: 0;
            padding-left: 1rem;
            display: grid;
            gap: 0.35rem;
            color: #334155;
            font-size: 0.8rem;
            line-height: 1.5;
          }

          .idp-inputs-grid {
            display: flex;
            flex-direction: column;
            gap: 0.3rem;
          }

          .idp-input-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.35rem 0.6rem;
            background: #faf5ff;
            border-radius: 6px;
            border: 1px solid #ede9fe;
          }

          .idp-input-label {
            font-size: 0.78rem;
            color: #6d28d9;
          }

          .idp-input-value {
            font-size: 0.82rem;
            font-weight: 700;
            color: #4c1d95;
          }

          .idp-worked-example {
            background: #f8fafc;
            border-radius: 8px;
            padding: 0.65rem 0.75rem;
            border: 1px solid #e2e8f0;
          }

          .idp-worked-label {
            display: block;
            font-size: 0.68rem;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 0.3rem;
          }

          .idp-worked-example p {
            margin: 0;
            font-size: 0.8rem;
            color: #334155;
            line-height: 1.5;
          }

          .idp-action-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.5rem 0.85rem;
            border-radius: 10px;
            border: 1px solid #ddd6fe;
            background: #f5f3ff;
            color: #6d28d9;
            font-size: 0.8rem;
            font-weight: 700;
            cursor: pointer;
            align-self: flex-start;
          }
          .idp-action-btn:hover { background: #ede9fe; }

          /* ── Benchmark ── */
          .idp-benchmark-rate-display {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 10px;
            padding: 0.65rem 0.85rem;
          }

          .idp-benchmark-rate-display span { font-size: 0.8rem; color: #1d4ed8; }
          .idp-benchmark-rate-display strong { font-size: 1rem; color: #1e40af; font-weight: 800; }

          .idp-meta-grid {
            display: flex;
            flex-direction: column;
            gap: 0.3rem;
          }

          .idp-meta-row {
            display: flex;
            align-items: baseline;
            gap: 0.5rem;
          }

          .idp-meta-label {
            font-size: 0.74rem;
            color: #64748b;
            min-width: 110px;
            flex-shrink: 0;
          }

          .idp-meta-value {
            font-size: 0.78rem;
            color: #0f172a;
            font-weight: 600;
          }

          .idp-meta-confidence { font-weight: 800; }

          .idp-evidence-note {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.76rem;
            color: #475569;
            border-top: 1px solid #e2e8f0;
            padding-top: 0.5rem;
            margin-top: 0.25rem;
          }

          .idp-empty-note {
            font-size: 0.8rem;
            color: #64748b;
            line-height: 1.6;
            margin: 0;
          }

          /* ── Notes ── */
          .idp-notes-input {
            width: 100%;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 0.65rem 0.75rem;
            font-size: 0.82rem;
            color: #0f172a;
            resize: vertical;
            outline: none;
            background: #f8fafc;
            font-family: inherit;
            box-sizing: border-box;
          }
          .idp-notes-input:focus { border-color: #60a5fa; background: white; }

          .idp-picker-hint {
            display: flex;
            align-items: flex-start;
            gap: 0.4rem;
            font-size: 0.76rem;
            color: #475569;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 0.55rem 0.7rem;
          }

          /* ── Footer ── */
          .idp-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.85rem 1.25rem;
            border-top: 1px solid #e2e8f0;
            background: #f8fafc;
            flex-shrink: 0;
          }

          .idp-footer-ref {
            font-size: 0.74rem;
            color: #64748b;
          }

          .idp-close-btn {
            padding: 0.5rem 1rem;
            border-radius: 10px;
            border: 1px solid #cbd5e1;
            background: white;
            color: #334155;
            font-size: 0.8rem;
            font-weight: 700;
            cursor: pointer;
          }
          .idp-close-btn:hover { background: #f1f5f9; }

          @media (max-width: 640px) {
            .idp-panel {
              width: 100vw;
            }

            .idp-panel-docked {
              border-left: none;
              border-radius: 22px;
              box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default BOQItemDetailPanel;
