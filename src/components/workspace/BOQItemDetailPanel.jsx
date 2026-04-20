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
          <Section icon={Info} title="Item Overview">
            <div className="idp-overview-card">
              <p className="idp-overview-description">
                {item.description || 'No detailed description has been added for this BOQ item yet.'}
              </p>
              <div className="idp-overview-grid">
                <div className="idp-overview-chip">{section?.title || 'Unassigned Bill'}</div>
                <div className="idp-overview-chip">{item.unit || 'Unit pending'}</div>
                <div className={`idp-overview-chip idp-overview-chip-${selectedRateSource}`}>
                  {sourceLabels[selectedRateSource] || selectedRateSource} active
                </div>
                <div className={`idp-overview-chip ${hasFormula ? 'idp-overview-chip-available' : 'idp-overview-chip-muted'}`}>
                  {hasFormula ? 'Formula available' : 'No formula yet'}
                </div>
                <div className={`idp-overview-chip ${benchmarkRate > 0 ? 'idp-overview-chip-available' : 'idp-overview-chip-muted'}`}>
                  {benchmarkRate > 0 ? 'Benchmark available' : 'No benchmark yet'}
                </div>
              </div>
            </div>
          </Section>

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
          <Section icon={Cpu} title="Formula" defaultOpen={hasFormula}>
            {hasFormula ? (
              <>
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
              </>
            ) : (
              <p className="idp-empty-note">
                No saved formula logic is attached to this item yet. You can still price it with a
                benchmark or a manual override.
              </p>
            )}
          </Section>

          {/* Benchmark */}
          <Section icon={BarChart2} title="Benchmark / Pricing Source" defaultOpen={!hasFormula}>
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
          <Section icon={FileText} title="Notes / Analysis" defaultOpen={false}>
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
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px);
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
            width: min(520px, 100vw);
            height: 100dvh;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            box-shadow: -20px 0 60px rgba(15, 23, 42, 0.2);
            overflow: hidden;
            border-left: 1px solid #e2e8f0;
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
            padding: 1.5rem 2rem;
          }

          .idp-panel-docked .idp-title {
            font-size: 1.25rem;
          }

          .idp-panel-docked .idp-body {
            padding-top: 0.5rem;
          }

          .idp-panel-docked .idp-section-header { 
            width: 100%; 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            padding: 1.5rem 2rem; 
            background: #ffffff; 
            border: none; 
            cursor: pointer; 
            color: #0f172a; 
            transition: all 0.2s ease; 
          }
          .idp-panel-docked .idp-section-header:hover { background: #f8fafc; }

          .idp-panel-docked .idp-section-body { padding: 0 2rem 2rem; display: flex; flex-direction: column; gap: 1.25rem; }

          .idp-panel-docked .idp-footer {
            padding: 1.5rem 2rem;
            background: #ffffff;
          }

          .idp-header {
            display: flex;
            justify-content: space-between;
            gap: 1.5rem;
            padding: 2rem;
            border-bottom: 1px solid #f1f5f9;
            background: linear-gradient(135deg, #ffffff 0%, #f9fbff 100%);
            flex-shrink: 0;
          }

          .idp-header-copy {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .idp-code {
            font-size: 0.75rem;
            font-weight: 800;
            color: #2563eb;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .idp-title {
            margin: 0;
            font-size: 1.5rem;
            color: #0f172a;
            font-weight: 900;
            line-height: 1.1;
            letter-spacing: -0.02em;
          }

          .idp-desc {
            margin: 0;
            font-size: 0.95rem;
            color: #64748b;
            line-height: 1.6;
            font-weight: 500;
          }

          .idp-header-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.5rem;
          }

          .idp-tag {
            display: inline-flex;
            align-items: center;
            padding: 0.35rem 0.75rem;
            border-radius: 999px;
            background: #f1f5f9;
            color: #475569;
            font-size: 0.7rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .idp-tag-src-benchmark { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
          .idp-tag-src-formula { background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; }
          .idp-tag-src-manual { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
          .idp-tag-section { background: #fefce8; color: #854d0e; border: 1px solid #fef08a; }

          .idp-close {
            width: 40px;
            height: 40px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: white;
            color: #94a3b8;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }
          .idp-close:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }

          .idp-body {
            flex: 1;
            overflow-y: auto;
            padding: 1rem 0;
            background: #ffffff;
            scrollbar-width: thin;
          }
          .idp-body::-webkit-scrollbar { width: 4px; }
          .idp-body::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

          .idp-overview-card { 
            display: flex; 
            flex-direction: column; 
            gap: 1.25rem; 
            padding: 1.5rem; 
            border-radius: 24px; 
            background: #f8fafc; 
            border: 1px solid #f1f5f9; 
          }

          .idp-overview-description {
            margin: 0;
            font-size: 0.95rem;
            line-height: 1.6;
            color: #334155;
            font-weight: 450;
          }

          .idp-overview-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .idp-overview-chip {
            display: inline-flex;
            align-items: center;
            padding: 0.3rem 0.7rem;
            border-radius: 999px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 0.7rem;
            font-weight: 800;
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
            padding: 1.5rem 2rem; 
            background: transparent; 
            border: none; 
            cursor: pointer; 
            color: #0f172a; 
            transition: all 0.2s ease; 
          }
          .idp-section-header:hover { background: #f8fafc; }

          .idp-section-header-left {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .idp-section-header strong { 
            font-size: 0.95rem; 
            font-weight: 800; 
            letter-spacing: -0.01em;
          }

          .idp-section-body { padding: 0 2rem 2rem; display: flex; flex-direction: column; gap: 1.25rem; }

          /* ── Rate rows ── */
          .idp-rate-row {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem 1.25rem;
            border-radius: 16px;
            background: #ffffff;
            border: 1px solid #f1f5f9;
            transition: all 0.2s;
          }

          .idp-rate-row-active {
            border-color: #2563eb;
            background: #f9fbff;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.05);
          }

          .idp-rate-label {
            flex: 1;
            font-size: 0.9rem;
            color: #475569;
            font-weight: 500;
          }

          .idp-rate-value {
            font-size: 1rem;
            font-weight: 800;
            color: #0f172a;
          }
          .idp-rate-value-benchmark { color: #1d4ed8; }
          .idp-rate-value-formula   { color: #6d28d9; }
          .idp-rate-value-manual    { color: #15803d; }

          .idp-rate-active-badge {
            padding: 0.25rem 0.6rem;
            border-radius: 999px;
            background: #2563eb;
            color: white;
            font-size: 0.6rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .idp-resolved-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.25rem 1.5rem;
            border-radius: 20px;
            background: #0f172a;
            color: white;
            font-size: 0.95rem;
            font-weight: 500;
          }

          .idp-resolved-row strong {
            font-size: 1.25rem;
            font-weight: 900;
          }

          .idp-resolved-row-amount {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          /* ── Formula ── */
          .idp-formula-display {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            background: #f5f3ff;
            border: 1px solid #ede9fe;
            border-radius: 20px;
            padding: 1.25rem;
          }

          .idp-formula-label {
            font-size: 0.7rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #7c3aed;
          }

          .idp-formula-text {
            font-size: 1rem;
            color: #4c1d95;
            font-family: 'JetBrains Mono', 'Menlo', monospace;
            line-height: 1.5;
            word-break: break-all;
          }

          .idp-inputs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 0.75rem;
          }

          .idp-input-row {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            padding: 0.85rem 1rem;
            background: #ffffff;
            border-radius: 12px;
            border: 1px solid #f1f5f9;
          }

          .idp-input-label {
            font-size: 0.7rem;
            font-weight: 800;
            color: #94a3b8;
            text-transform: uppercase;
          }

          .idp-input-value {
            font-size: 1rem;
            font-weight: 800;
            color: #0f172a;
          }

          .idp-action-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.25rem;
            border-radius: 14px;
            border: 1px solid #ddd6fe;
            background: #f5f3ff;
            color: #6d28d9;
            font-size: 0.85rem;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
            width: fit-content;
          }
          .idp-action-btn:hover { background: #ede9fe; transform: translateY(-1px); }

          /* ── Benchmark ── */
          .idp-benchmark-rate-display {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #eff6ff;
            border: 1px solid #dbeafe;
            border-radius: 20px;
            padding: 1.25rem 1.5rem;
          }

          .idp-benchmark-rate-display span { font-size: 0.95rem; color: #1d4ed8; font-weight: 600; }
          .idp-benchmark-rate-display strong { font-size: 1.5rem; color: #1e40af; font-weight: 900; }

          .idp-meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            background: #f8fafc;
            padding: 1.25rem;
            border-radius: 20px;
            border: 1px solid #f1f5f9;
          }

          .idp-meta-row {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .idp-meta-label {
            font-size: 0.7rem;
            font-weight: 800;
            color: #94a3b8;
            text-transform: uppercase;
          }

          .idp-meta-value {
            font-size: 0.9rem;
            color: #0f172a;
            font-weight: 700;
          }

          .idp-evidence-note {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.85rem;
            color: #64748b;
            padding: 1rem;
            background: #f1f5f9;
            border-radius: 12px;
          }

          /* ── Notes ── */
          .idp-notes-input {
            width: 100%;
            border: 1.5px solid #e2e8f0;
            border-radius: 16px;
            padding: 1rem;
            font-size: 0.95rem;
            color: #0f172a;
            resize: vertical;
            outline: none;
            background: #ffffff;
            transition: all 0.2s;
            box-sizing: border-box;
          }
          .idp-notes-input:focus { border-color: #2563eb; ring: 4px rgba(37, 99, 235, 0.1); }

          /* ── Footer ── */
          .idp-footer {
            padding: 1.5rem 2rem;
            border-top: 1px solid #f1f5f9;
            background: #ffffff;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .idp-footer-ref {
            font-size: 0.8rem;
            font-weight: 600;
            color: #94a3b8;
          }

          .idp-close-btn {
            padding: 0.75rem 1.5rem;
            border-radius: 14px;
            border: 1px solid #e2e8f0;
            background: white;
            color: #0f172a;
            font-size: 0.85rem;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
          }
          .idp-close-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
        `}</style>
      </div>
    </div>
  );
};

export default BOQItemDetailPanel;
