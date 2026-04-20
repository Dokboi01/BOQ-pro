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
  Target,
  Zap,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import {
  getFormulaDisplayText,
  getWorkedExamplePreview,
  isFormulaDrivenItem,
  normalizeEditableInputs,
} from '../../utils/boqFormulas';

const formatMoney = (value) =>
  `₦${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const formatCurrency = (value) =>
  `N${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const CONFIDENCE_COLORS = {
  high: '#059669',
  medium: '#2563eb',
  low: '#d97706',
};

const Section = ({ icon: Icon, title, children, defaultOpen = true }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={`idp-section ${open ? 'idp-section-open' : ''}`}>
      <button
        type="button"
        className="idp-section-header"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="idp-section-header-left">
          <div className="idp-section-icon-wrap">
            {Icon && <Icon size={14} />}
          </div>
          <strong>{title}</strong>
        </span>
        <div className={`idp-section-chevron ${open ? 'idp-section-chevron-open' : ''}`}>
          <ChevronRight size={14} />
        </div>
      </button>
      <div className={`idp-section-collapse ${open ? 'idp-section-collapse-open' : ''}`}>
        <div className="idp-section-body">{children}</div>
      </div>
    </div>
  );
};

const BasisCard = ({ label, value, active, tone, icon: Icon, description }) => (
  <div className={`idp-basis-card idp-basis-card-${tone} ${active ? 'idp-basis-card-active' : ''}`}>
    <div className="idp-basis-card-header">
      <div className="idp-basis-card-icon">
        {Icon && <Icon size={16} />}
      </div>
      <div className="idp-basis-card-copy">
        <span className="idp-basis-label">{label}</span>
        <span className="idp-basis-value">{value}</span>
      </div>
      {active && <div className="idp-active-indicator"><ShieldCheck size={12} /> Active</div>}
    </div>
    {description && <p className="idp-basis-desc">{description}</p>}
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

  const getConfidenceLabel = (level) => {
     if (!level) return 'N/A';
     return level.charAt(0).toUpperCase() + level.slice(1);
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
        {/* ── Dynamic Progress Header ─────────────────────────────────── */}
        <div className="idp-header">
          <div className="idp-header-top">
            <div className="idp-header-left">
               <span className="idp-eyebrow">BOQ Intelligence</span>
               <h3 className="idp-title">{item.name || 'Estimate Item'}</h3>
               <div className="idp-header-meta">
                   {item.code && <span className="idp-meta-tag idp-meta-tag-code">{item.code}</span>}
                   <span className="idp-meta-tag">{item.unit}</span>
                   {section?.title && <span className="idp-meta-tag idp-meta-tag-section">{section.title}</span>}
               </div>
            </div>
            {onClose && (
              <button type="button" className="idp-close-trigger" onClick={onClose}>
                <X size={20} />
              </button>
            )}
          </div>
          
          <div className="idp-hero-price">
            <div className="idp-hero-price-main">
              <span className="idp-hero-label">Resolved Unit Rate</span>
              <strong className="idp-hero-value">{formatCurrency(resolvedUnitRate)}</strong>
            </div>
            <div className="idp-hero-price-alt">
              <span className="idp-hero-label">Line Total (Qty {Number(item.qty || 0).toLocaleString()})</span>
              <strong className="idp-hero-total">{formatCurrency((item.qty || 0) * resolvedUnitRate)}</strong>
            </div>
          </div>
        </div>

        {/* ── Scrollable Body ────────────────────────────────────────── */}
        <div className="idp-body">
          
          {/* Item Strategic Context */}
          <Section icon={Target} title="Item Overview">
            <div className="idp-strategic-card">
              <div className="idp-strat-identity">
                <Info size={16} />
                <p>{item.description || 'Global specification for this resource requirement.'}</p>
              </div>
              <div className="idp-strat-badges">
                 <div className={`idp-strat-pill idp-strat-pill-${selectedRateSource}`}>
                    <Zap size={10} /> {sourceLabels[selectedRateSource]} Driven
                 </div>
                 {hasFormula && <div className="idp-strat-pill idp-strat-pill-blue">Logic-Enabled</div>}
                 {benchmarkRate > 0 && <div className="idp-strat-pill idp-strat-pill-teal">Market Synchronized</div>}
              </div>
            </div>
          </Section>

          {/* Pricing Basis */}
          <Section icon={CreditCard} title="Rate Summary">
            <div className="idp-basis-grid">
              <BasisCard
                icon={BarChart2}
                label="Benchmark Basis"
                value={formatCurrency(benchmarkRate)}
                active={selectedRateSource === 'benchmark'}
                tone="teal"
                description="Live market resource rate from engineering index."
              />
              {hasFormula && (
                <BasisCard
                  icon={Cpu}
                  label="Formula Synthesis"
                  value={formatCurrency(formulaRate)}
                  active={selectedRateSource === 'formula'}
                  tone="indigo"
                  description="Computed from first-principles engineering logic."
                />
              )}
              <BasisCard
                icon={SlidersHorizontal}
                label="Manual Allocation"
                value={formatCurrency(item.manualRate ?? item.rate ?? 0)}
                active={selectedRateSource === 'manual'}
                tone="slate"
                description="Custom override or specifically negotiated rate."
              />
            </div>
          </Section>

          {/* Logic & Inputs (Only if formula exists) */}
          {hasFormula && (
            <Section icon={Cpu} title="Formula Logic">
              <div className="idp-logic-wrap">
                <div className="idp-logic-header">
                  <span>Computed Expression</span>
                  <code>{formulaText}</code>
                </div>
                
                {editableInputs.length > 0 && (
                  <div className="idp-inputs-display">
                    <span className="idp-sub-label">Operating Variables</span>
                    <div className="idp-inputs-mini-grid">
                      {editableInputs.map((input) => (
                        <div key={input.id} className="idp-input-chip">
                          <span className="idp-input-chip-label">{input.label}</span>
                          <span className="idp-input-chip-value">
                            {Number(input.value).toLocaleString()}
                            <small>{input.unit}</small>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {workedExample && (
                   <div className="idp-logic-preview">
                      <span className="idp-sub-label">Logic Preview</span>
                      <p>{workedExample}</p>
                   </div>
                )}

                {onOpenFormulaEditor && (
                  <button type="button" className="idp-logic-btn" onClick={onOpenFormulaEditor}>
                    <SlidersHorizontal size={14} /> Open Logic Editor
                  </button>
                )}
              </div>
            </Section>
          )}

          {/* Market Intelligence */}
          <Section icon={BarChart2} title="Benchmark Source" defaultOpen={false}>
             {benchmarkRate > 0 ? (
               <div className="idp-intelligence-card">
                  <div className="idp-intel-header">
                    <div className="idp-intel-source">
                      <span className="idp-sub-label">Primary Source</span>
                      <strong>{benchmarkMeta.sourceType?.toUpperCase() || 'MARKET FEED'}</strong>
                    </div>
                    <div className="idp-intel-confidence" style={{ '--conf-color': CONFIDENCE_COLORS[benchmarkMeta.confidenceLevel] || '#64748b' }}>
                      <span className="idp-sub-label">Confidence</span>
                      <strong className="idp-conf-text">{getConfidenceLabel(benchmarkMeta.confidenceLevel)}</strong>
                    </div>
                  </div>
                  
                  <div className="idp-intel-meta-grid">
                    <MetaRow label="Last Updated" value={benchmarkMeta.dateCaptured || 'Real-time'} />
                    <MetaRow label="Jurisdiction" value={benchmarkMeta.region || 'National'} />
                    <MetaRow label="Basis Note" value={benchmarkMeta.sourceNote} />
                  </div>
               </div>
             ) : (
               <div className="idp-empty-state">
                  <Info size={18} />
                  <p>No active market benchmark synchronizing with this resource yet.</p>
               </div>
             )}
          </Section>

          {/* Decision Logs */}
          <Section icon={FileText} title="Notes & Analysis" defaultOpen={false}>
            <div className="idp-notes-wrap">
              <span className="idp-sub-label">Estimator Observations</span>
              <textarea
                className="idp-premium-textarea"
                rows={5}
                value={item.notes || ''}
                placeholder="Document your pricing assumptions or site-specific adjustments here..."
                onChange={(e) => onNotesChange?.(e.target.value)}
              />
              {item.pickerHint && (
                <div className="idp-hint-box">
                  <ShieldCheck size={14} />
                  <span>{item.pickerHint}</span>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* ── Specialized Footer ─────────────────────────────────────── */}
        <div className="idp-footer">
          <div className="idp-footer-info">
             <div className="idp-footer-dot" style={{ background: CONFIDENCE_COLORS[benchmarkMeta.confidenceLevel] || '#cbd5e1' }} />
             <span>System Integrated · {item.unit} Intelligence</span>
          </div>
          <button type="button" className="idp-done-btn" onClick={onClose}>
            Finalize Review
          </button>
        </div>

        <style>{`
          /* --- DESIGN SYSTEM TOKENS --- */
          :root {
            --idp-bg: #ffffff;
            --idp-border: #e2e8f0;
            --idp-text-main: #0f172a;
            --idp-text-muted: #64748b;
            --idp-accent: #2563eb;
            --idp-accent-soft: #eff6ff;
            --idp-radius-lg: 24px;
            --idp-radius-md: 16px;
            --idp-shadow: 0 10px 40px -10px rgba(15, 23, 42, 0.1);
          }

          .idp-overlay {
            position: fixed;
            inset: 0;
            z-index: 1300;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(12px);
            display: flex;
            justify-content: flex-end;
            animation: idpFadeIn 0.3s ease-out;
          }

          @keyframes idpFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .idp-overlay-docked {
            position: static;
            background: transparent;
            backdrop-filter: none;
            display: block;
            animation: none;
          }

          .idp-panel {
            width: min(560px, 100vw);
            height: 100dvh;
            background: var(--idp-bg);
            display: flex;
            flex-direction: column;
            box-shadow: -20px 0 60px rgba(15, 23, 42, 0.2);
            overflow: hidden;
            border-left: 1px solid var(--idp-border);
            animation: idpSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes idpSlideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }

          .idp-panel-docked {
            width: 100%;
            height: 100%;
            min-height: 0;
            border-left: none;
            box-shadow: none;
            background: linear-gradient(180deg, #fcfdff 0%, #f8fbff 100%);
            animation: none;
          }

          /* --- HEADER --- */
          .idp-header {
            padding: 1.5rem 1.35rem 1.2rem;
            background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
            border-bottom: 1px solid var(--idp-border);
            display: flex;
            flex-direction: column;
            gap: 1.2rem;
            flex-shrink: 0;
          }

          .idp-header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }

          .idp-eyebrow {
            font-size: 0.65rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: var(--idp-accent);
            display: block;
            margin-bottom: 0.5rem;
          }

          .idp-title {
            margin: 0;
            font-size: 1.75rem;
            font-weight: 900;
            color: var(--idp-text-main);
            letter-spacing: -0.03em;
            line-height: 1.1;
          }

          .idp-header-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 0.6rem;
            margin-top: 0.8rem;
          }

          .idp-meta-tag {
            padding: 0.35rem 0.75rem;
            border-radius: 8px;
            background: var(--idp-accent-soft);
            color: var(--idp-accent);
            font-size: 0.7rem;
            font-weight: 800;
          }
          .idp-meta-tag-code { background: #0f172a; color: white; }
          .idp-meta-tag-section { background: #fffbeb; color: #92400e; }

          .idp-hero-price {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            background: #0f172a;
            border-radius: var(--idp-radius-md);
            padding: 1.5rem;
            color: white;
            box-shadow: 0 20px 40px rgba(15, 23, 42, 0.4);
          }

          .idp-hero-label {
            display: block;
            font-size: 0.65rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #94a3b8;
            margin-bottom: 4px;
          }

          .idp-hero-value { font-size: 1.5rem; font-weight: 900; display: block; }
          .idp-hero-total { font-size: 1.5rem; font-weight: 900; color: #38bdf8; display: block; }

          .idp-close-trigger {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            border: 1px solid var(--idp-border);
            display: flex; align-items: center; justify-content: center;
            background: white; color: #94a3b8;
            cursor: pointer; transition: all 0.2s;
          }
          .idp-close-trigger:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }

          /* --- BODY --- */
          .idp-body {
            flex: 1;
            overflow-y: auto;
            scrollbar-width: thin;
            background: #ffffff;
          }
          .idp-body::-webkit-scrollbar { width: 4px; }
          .idp-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

          /* --- SECTIONS --- */
          .idp-section { border-bottom: 1px solid #f1f5f9; transition: background 0.2s; }
          .idp-section-open { background: #fdfdfe; }

          .idp-section-header {
            width: 100%;
            padding: 1rem 1.35rem;
            display: flex; align-items: center; justify-content: space-between;
            background: transparent; border: none; cursor: pointer;
            transition: all 0.2s;
          }
          .idp-section-header:hover { background: #f8fafc; }

          .idp-section-header-left { display: flex; align-items: center; gap: 1rem; }
          .idp-section-icon-wrap {
            width: 32px; height: 32px;
            border-radius: 10px; background: #f1f5f9;
            display: flex; align-items: center; justify-content: center;
            color: var(--idp-text-muted);
          }
          .idp-section-open .idp-section-icon-wrap { background: var(--idp-accent-soft); color: var(--idp-accent); }

          .idp-section-header strong { font-size: 1rem; font-weight: 800; color: var(--idp-text-main); }
          .idp-section-chevron { color: #cbd5e1; transition: transform 0.2s; }
          .idp-section-chevron-open { transform: rotate(90deg); color: var(--idp-accent); }

          .idp-section-collapse { display: none; }
          .idp-section-collapse-open { display: block; }

          .idp-section-body { padding: 0 1.35rem 1.4rem; }

          /* --- CARDS & GRIDS --- */
          .idp-strategic-card {
            background: #f8fafc;
            border-radius: var(--idp-radius-md);
            padding: 1.25rem;
            border: 1px solid #f1f5f9;
          }

          .idp-strat-identity { display: flex; gap: 0.75rem; color: #475569; }
          .idp-strat-identity p { margin: 0; font-size: 0.95rem; line-height: 1.5; font-weight: 500; }
          .idp-strat-identity svg { flex-shrink: 0; color: var(--idp-accent); margin-top: 3px; }

          .idp-strat-badges { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1.25rem; }
          .idp-strat-pill {
            padding: 0.35rem 0.65rem; border-radius: 6px;
            font-size: 0.65rem; font-weight: 800; display: flex; align-items: center; gap: 0.4rem;
            text-transform: uppercase;
          }
          .idp-strat-pill-benchmark { background: #ecfdf5; color: #059669; }
          .idp-strat-pill-formula   { background: #f5f3ff; color: #7c3aed; }
          .idp-strat-pill-manual    { background: #fef2f2; color: #dc2626; }
          .idp-strat-pill-blue      { background: #eff6ff; color: #2563eb; }
          .idp-strat-pill-teal      { background: #f0fdfa; color: #0d9488; }

          .idp-basis-grid { display: flex; flex-direction: column; gap: 0.8rem; }
          .idp-basis-card {
            background: white; border: 1px solid #eef2f7;
            padding: 1rem; border-radius: var(--idp-radius-md);
            transition: all 0.3s; position: relative;
          }
          .idp-basis-card:hover { border-color: #cbd5e1; transform: translateY(-2px); }
          .idp-basis-card-active { border-color: var(--idp-accent); background: #f9fbff; box-shadow: var(--idp-shadow); }

          .idp-basis-card-header { display: flex; align-items: center; gap: 1rem; }
          .idp-basis-card-icon {
            width: 40px; height: 40px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
          }
          .idp-basis-card-teal .idp-basis-card-icon { background: #f0fdfa; color: #0d9488; }
          .idp-basis-card-indigo .idp-basis-card-icon { background: #f5f3ff; color: #7c3aed; }
          .idp-basis-card-slate .idp-basis-card-icon { background: #f1f5f9; color: #475569; }

          .idp-basis-card-copy { display: flex; flex-direction: column; flex: 1; }
          .idp-basis-label { font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
          .idp-basis-value { font-size: 1.15rem; font-weight: 900; color: var(--idp-text-main); }

          .idp-active-indicator {
            position: absolute; top: 1.25rem; right: 1.25rem;
            display: flex; align-items: center; gap: 4px;
            font-size: 0.6rem; font-weight: 900; color: var(--idp-accent);
            text-transform: uppercase;
          }

          .idp-basis-desc { margin: 0.75rem 0 0; font-size: 0.8rem; color: #64748b; line-height: 1.4; }

          /* --- LOGIC --- */
          .idp-logic-wrap { background: #f8fafc; border-radius: var(--idp-radius-md); padding: 1.5rem; border: 1px solid #f1f5f9; }
          .idp-logic-header { margin-bottom: 1.5rem; }
          .idp-logic-header span { display: block; font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; }
          .idp-logic-header code {
            font-family: 'JetBrains Mono', monospace; font-size: 1rem; color: #4338ca;
            background: white; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; border-radius: 8px; display: block;
          }

          .idp-sub-label { font-size: 0.7rem; font-weight: 900; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 10px; }
          .idp-inputs-mini-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem; }
          .idp-input-chip { background: white; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; border-radius: 10px; }
          .idp-input-chip-label { display: block; font-size: 0.6rem; color: #64748b; font-weight: 800; margin-bottom: 2px; }
          .idp-input-chip-value { font-size: 0.95rem; font-weight: 900; color: #0f172a; }
          .idp-input-chip-value small { font-size: 0.65rem; margin-left: 4px; color: #94a3b8; }

          .idp-logic-btn {
            width: 100%; padding: 0.85rem; border-radius: 12px;
            background: var(--idp-text-main); color: white; border: none;
            font-size: 0.85rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px;
            cursor: pointer; transition: all 0.2s;
          }
          .idp-logic-btn:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2); }

          /* --- INTEL --- */
          .idp-intelligence-card { background: #fff; border: 1px solid #f1f5f9; border-radius: var(--idp-radius-md); overflow: hidden; }
          .idp-intel-header { display: flex; justify-content: space-between; padding: 1.25rem; background: #fafafa; border-bottom: 1px solid #f1f5f9; }
          .idp-intel-confidence { text-align: right; }
          .idp-conf-text { color: var(--conf-color); font-size: 1rem; font-weight: 900; }
          .idp-intel-meta-grid { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }

          .idp-meta-row { display: flex; justify-content: space-between; align-items: center; }
          .idp-meta-label { font-size: 0.75rem; color: #64748b; font-weight: 600; }
          .idp-meta-value { font-size: 0.85rem; color: #0f172a; font-weight: 800; }

          /* --- FOOTER --- */
          .idp-footer {
            padding: 1rem 1.35rem; border-top: 1px solid var(--idp-border);
            display: flex; align-items: center; justify-content: space-between;
            background: rgba(255, 255, 255, 0.96); flex-shrink: 0;
          }
          .idp-footer-info { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #94a3b8; font-weight: 700; }
          .idp-footer-dot { width: 8px; height: 8px; border-radius: 50%; }

          .idp-done-btn {
            padding: 0.85rem 1.75rem; border-radius: 12px;
            background: var(--idp-accent); color: white; border: none;
            font-size: 0.85rem; font-weight: 800; cursor: pointer; transition: all 0.2s;
          }
          .idp-done-btn:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 10px 20px rgba(37, 99, 235, 0.15); }

          /* --- TEXTAREA --- */
          .idp-premium-textarea {
            width: 100%; max-width: 100%; box-sizing: border-box; border: 1.5px solid #e2e8f0; border-radius: var(--idp-radius-md); padding: 1rem;
            font-size: 0.95rem; font-weight: 500; font-family: inherit; line-height: 1.6;
            outline: none; transition: border-color 0.2s;
          }
          .idp-premium-textarea:focus { border-color: var(--idp-accent); }

          .idp-hint-box {
            margin-top: 1rem; padding: 1rem; border-radius: 12px; background: #fffbeb; border: 1px solid #fef3c7;
            display: flex; gap: 10px; color: #92400e; font-size: 0.8rem; font-weight: 600; line-height: 1.4;
          }
        `}</style>
      </div>
    </div>
  );
};

export default BOQItemDetailPanel;
