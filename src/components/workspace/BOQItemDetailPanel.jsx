import React from 'react';
import {
  X,
  BarChart2,
  Cpu,
  SlidersHorizontal,
  Info,
  FileText,
  ChevronRight,
  Target,
  Zap,
  ShieldCheck,
  CreditCard,
  PenLine,
  Layers,
  TrendingUp,
  Check,
  Lock,
  Sparkles,
  Calculator,
  Gavel,
  Copy,
  Trash2,
  Plus,
  RefreshCcw,
  Download,
  ArrowUpRight,
  Percent,
  DollarSign,
  Package,
  AlertTriangle,
  Hash,
  Ruler,
  Eye,
  Settings2,
  Clipboard,
  ExternalLink
} from 'lucide-react';
import {
  getFormulaDisplayText,
  getWorkedExamplePreview,
  isFormulaDrivenItem,
  normalizeEditableInputs,
} from '../../utils/boqFormulas';

const formatCurrency = (value) =>
  `₦${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const CONFIDENCE_COLORS = {
  high: '#059669',
  medium: '#2563eb',
  low: '#d97706',
};

const Section = ({ icon: Icon, title, children, defaultOpen = true, badge, compact }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={`idp-section ${open ? 'idp-section-open' : ''}`}>
      <button
        type="button"
        className={`idp-section-header ${compact ? 'idp-section-header-compact' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="idp-section-header-left">
          <div className="idp-section-icon-wrap">
            {Icon && <Icon size={12} />}
          </div>
          <strong>{title}</strong>
          {badge && <span className="idp-section-badge">{badge}</span>}
        </span>
        <div className={`idp-section-chevron ${open ? 'idp-section-chevron-open' : ''}`}>
          <ChevronRight size={12} />
        </div>
      </button>
      <div className={`idp-section-collapse ${open ? 'idp-section-collapse-open' : ''}`}>
        <div className="idp-section-body">{children}</div>
      </div>
    </div>
  );
};

const MetaRow = ({ label, value, mono }) => {
  if (!value) return null;
  return (
    <div className="idp-meta-row">
      <span className="idp-meta-label">{label}</span>
      <span className={`idp-meta-value ${mono ? 'idp-meta-mono' : ''}`}>{value}</span>
    </div>
  );
};

const QuickAction = ({ icon, label, onClick, tone = 'default', disabled }) => {
  const actionIcon = icon ? React.createElement(icon, { size: 13 }) : null;

  return (
    <button
      type="button"
      className={`idp-quick-action idp-quick-action-${tone}`}
      onClick={onClick}
      disabled={disabled}
    >
      {actionIcon}
      <span>{label}</span>
    </button>
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
  onDescriptionChange,
  onRateSourceChange,
  onOpenFormulaEditor,
  onOpenRateAnalysis,
  onOpenCustomPricing,
  onOpenTakeoff,
  onOpenBidManager,
  onDuplicate,
  onDelete,
  onAddBelow,
  onRefreshBenchmark,
  onExport,
  variant = 'overlay',
}) => {
  if (!item) return null;

  const formulaText = getFormulaDisplayText(item);
  const workedExample = getWorkedExamplePreview(item, { preferEditableInputs: true });
  const hasFormula = isFormulaDrivenItem(item);
  const editableInputs = normalizeEditableInputs(item.editableInputs);
  const benchmarkMeta = item.benchmarkMetadata || {};
  const benchmarkEvidence = item.benchmarkEvidence || {};
  const benchmarkRegionCoverage = Object.keys(item.benchmarkRegionalRates || {}).length;
  const benchmarkTrace = item.benchmarkMatchSource || benchmarkEvidence.matchSource || 'catalog';
  const quantity = Number(item.qty || 0);
  const lineTotal = quantity * resolvedUnitRate;
  const hasBids = item.bids?.length > 0;
  const hasCustomPricing = Boolean(item.customPricing);
  const hasBreakdown = Boolean(item.breakdown);

  const sourceLabels = {
    benchmark: 'Benchmark',
    formula: 'Formula',
    manual: 'Manual',
  };

  const sourceDescriptions = {
    benchmark: 'Market-indexed rate from engineering database',
    formula: 'Computed via first-principles logic engine',
    manual: 'Custom rate override or negotiated value',
  };

  const getConfidenceLabel = (level) => {
     if (!level) return 'N/A';
     return level.charAt(0).toUpperCase() + level.slice(1);
  };

  const hasBenchmarkAvailable = benchmarkRate > 0;

  const pricingOptions = [
    {
      key: 'benchmark',
      label: 'Benchmark',
      icon: BarChart2,
      value: formatCurrency(benchmarkRate),
      tone: 'teal',
      available: hasBenchmarkAvailable,
      sub: 'Market rate',
    },
    ...(hasFormula ? [{
      key: 'formula',
      label: 'Formula',
      icon: Cpu,
      value: formatCurrency(formulaRate),
      tone: 'indigo',
      available: true,
      sub: 'Calculated',
    }] : []),
    {
      key: 'manual',
      label: 'Manual',
      icon: PenLine,
      value: formatCurrency(item.manualRate ?? item.rate ?? 0),
      tone: 'slate',
      available: true,
      sub: 'Custom rate',
    },
  ];

  // Compute breakdown percentages
  const breakdownSummary = (() => {
    if (!hasBreakdown && !hasCustomPricing) return null;
    const bd = item.customPricing || item.breakdown || {};
    const materials = Array.isArray(bd.materials) ? bd.materials.reduce((a, r) => a + (Number(r.amount || r.total || 0)), 0) : 0;
    const labor = Array.isArray(bd.labor) ? bd.labor.reduce((a, r) => a + (Number(r.amount || r.total || 0)), 0) : 0;
    const plant = Array.isArray(bd.plant) ? bd.plant.reduce((a, r) => a + (Number(r.amount || r.total || 0)), 0) : 0;
    const transport = Array.isArray(bd.transport || bd.logistics) ? (bd.transport || bd.logistics).reduce((a, r) => a + (Number(r.amount || r.total || 0)), 0) : 0;
    const total = materials + labor + plant + transport || 1;
    return {
      materials: { amount: materials, pct: Math.round((materials / total) * 100) },
      labor: { amount: labor, pct: Math.round((labor / total) * 100) },
      plant: { amount: plant, pct: Math.round((plant / total) * 100) },
      transport: { amount: transport, pct: Math.round((transport / total) * 100) },
      total,
    };
  })();

  return (
    <div
      className={`idp-overlay ${variant === 'docked' ? 'idp-overlay-docked' : ''}`}
      onClick={variant === 'overlay' ? onClose : undefined}
    >
      <div
        className={`idp-panel ${variant === 'docked' ? 'idp-panel-docked' : ''}`}
        onClick={(e) => { if (variant === 'overlay') e.stopPropagation(); }}
      >
        {/* ── Header ── */}
        <div className="idp-header">
          <div className="idp-header-top">
            <div className="idp-header-left">
               <span className="idp-eyebrow"><Sparkles size={9} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />Item Intelligence</span>
               <h3 className="idp-title">{item.name || 'Estimate Item'}</h3>
               <div className="idp-header-meta">
                   {item.code && <span className="idp-meta-tag idp-meta-tag-code">{item.code}</span>}
                   <span className="idp-meta-tag">{item.unit}</span>
                   {section?.title && <span className="idp-meta-tag idp-meta-tag-section">{section.title}</span>}
                   <span className={`idp-meta-tag idp-meta-tag-${selectedRateSource}`}>{sourceLabels[selectedRateSource]}</span>
               </div>
            </div>
            {onClose && (
              <button type="button" className="idp-close-trigger" onClick={onClose}><X size={16} /></button>
            )}
          </div>
          
          {/* Quick Stats */}
          <div className="idp-stats-row">
            <div className="idp-stat idp-stat-dark">
              <span className="idp-stat-lbl">UNIT RATE</span>
              <strong>{formatCurrency(resolvedUnitRate)}</strong>
            </div>
            <div className="idp-stat">
              <span className="idp-stat-lbl">QTY</span>
              <strong>{quantity.toLocaleString()} <small>{item.unit}</small></strong>
            </div>
            <div className="idp-stat idp-stat-accent">
              <span className="idp-stat-lbl">LINE TOTAL</span>
              <strong>{formatCurrency(lineTotal)}</strong>
            </div>
          </div>
          <div className="idp-user-guide">
            <span>1. Confirm the item</span>
            <span>2. Choose rate source</span>
            <span>3. Use tools below</span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="idp-body">

          {/* Quick Actions */}
          <div className="idp-actions-bar">
            {onOpenTakeoff && <QuickAction icon={Calculator} label="Takeoff Calculator" onClick={onOpenTakeoff} />}
            {onOpenRateAnalysis && <QuickAction icon={BarChart2} label="Rate Analysis" onClick={onOpenRateAnalysis} tone="blue" />}
            {onOpenCustomPricing && <QuickAction icon={SlidersHorizontal} label="Manual Rate" onClick={onOpenCustomPricing} tone="teal" />}
            {hasFormula && onOpenFormulaEditor && <QuickAction icon={Cpu} label="Formula Inputs" onClick={onOpenFormulaEditor} tone="indigo" />}
            {onOpenBidManager && <QuickAction icon={Gavel} label={hasBids ? `Bids (${item.bids.length})` : 'Bids'} onClick={onOpenBidManager} tone={hasBids ? 'amber' : 'default'} />}
            {onRefreshBenchmark && <QuickAction icon={RefreshCcw} label="Refresh Benchmark" onClick={onRefreshBenchmark} />}
            {onExport && <QuickAction icon={Download} label="Export" onClick={onExport} />}
            {onDuplicate && <QuickAction icon={Copy} label="Duplicate Row" onClick={onDuplicate} />}
            {onAddBelow && <QuickAction icon={Plus} label="Add Below" onClick={onAddBelow} />}
            {onDelete && <QuickAction icon={Trash2} label="Delete" onClick={onDelete} tone="danger" />}
          </div>

          {/* Pricing Strategy */}
          <Section icon={CreditCard} title="Choose Rate Source" badge={sourceLabels[selectedRateSource]}>
            <div className="idp-pricing-stack">
              {pricingOptions.map((opt) => {
                const isActive = selectedRateSource === opt.key;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={`idp-price-opt idp-price-opt-${opt.tone} ${isActive ? 'idp-price-opt-on' : ''} ${!opt.available ? 'idp-price-opt-off' : ''}`}
                    onClick={() => opt.available && onRateSourceChange?.(opt.key)}
                    disabled={!opt.available}
                  >
                    <div className="idp-price-opt-l">
                      <div className="idp-price-opt-ico"><Icon size={14} /></div>
                      <div className="idp-price-opt-copy">
                        <span className="idp-price-opt-name">{opt.label}</span>
                        <span className="idp-price-opt-sub">{opt.sub}</span>
                      </div>
                    </div>
                    <div className="idp-price-opt-r">
                      <strong>{opt.value}</strong>
                      {isActive && <span className="idp-price-check"><Check size={11} /></span>}
                      {!opt.available && <Lock size={10} className="idp-price-lock" />}
                    </div>
                  </button>
                );
              })}
              <p className="idp-pricing-hint"><Info size={10} />{sourceDescriptions[selectedRateSource]}</p>
            </div>
          </Section>

          {/* Cost Breakdown Preview */}
          {breakdownSummary && (
            <Section icon={Layers} title="Cost Breakdown" compact>
              <div className="idp-breakdown-grid">
                {[
                  { label: 'Materials', ...breakdownSummary.materials, color: '#2563eb' },
                  { label: 'Labour', ...breakdownSummary.labor, color: '#7c3aed' },
                  { label: 'Plant', ...breakdownSummary.plant, color: '#0d9488' },
                  { label: 'Transport', ...breakdownSummary.transport, color: '#ea580c' },
                ].map((cat) => (
                  <div key={cat.label} className="idp-bd-row">
                    <div className="idp-bd-bar-bg">
                      <div className="idp-bd-bar-fill" style={{ width: `${cat.pct}%`, background: cat.color }} />
                    </div>
                    <span className="idp-bd-label">{cat.label}</span>
                    <span className="idp-bd-pct">{cat.pct}%</span>
                    <span className="idp-bd-val">{formatCurrency(cat.amount)}</span>
                  </div>
                ))}
                <div className="idp-bd-total">
                  <span>Direct Cost Total</span>
                  <strong>{formatCurrency(breakdownSummary.total)}</strong>
                </div>
              </div>
              {onOpenCustomPricing && (
                <button className="idp-link-btn" onClick={onOpenCustomPricing}>
                  <ExternalLink size={11} /> Open Custom Pricing Studio
                </button>
              )}
            </Section>
          )}

          {/* Description */}
          <Section icon={PenLine} title="Item Description">
            <div className="idp-desc-edit">
              <textarea
                className="idp-desc-ta"
                rows={3}
                value={item.description || ''}
                placeholder="Describe this BOQ item — scope, specs, assumptions..."
                onChange={(e) => onDescriptionChange?.(e.target.value)}
              />
              <span className="idp-desc-hint">Edit the item description. Changes sync to the table.</span>
            </div>
          </Section>

          {/* Formula Logic */}
          {hasFormula && (
            <Section icon={Cpu} title="Formula Logic" badge="ACTIVE">
              <div className="idp-logic-card">
                <div className="idp-logic-expr">
                  <span className="idp-micro-label">Expression</span>
                  <code>{formulaText}</code>
                </div>
                {editableInputs.length > 0 && (
                  <div className="idp-vars-grid">
                    <span className="idp-micro-label">Variables</span>
                    <div className="idp-vars-chips">
                      {editableInputs.map((input) => (
                        <div key={input.id} className="idp-var-chip">
                          <span className="idp-var-name">{input.label}</span>
                          <strong>{Number(input.value).toLocaleString()}<small>{input.unit}</small></strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {workedExample && (
                   <div className="idp-logic-result">
                      <span className="idp-micro-label">Preview</span>
                      <p>{workedExample}</p>
                   </div>
                )}
                {onOpenFormulaEditor && (
                  <button className="idp-logic-btn" onClick={onOpenFormulaEditor}>
                    <SlidersHorizontal size={12} /> Edit Formula
                  </button>
                )}
              </div>
            </Section>
          )}

          {/* Item Metadata */}
          <Section icon={Hash} title="Item Metadata" defaultOpen={false}>
            <div className="idp-meta-grid">
              <MetaRow label="Item Name" value={item.name || item.description} />
              <MetaRow label="Code" value={item.code} mono />
              <MetaRow label="Unit" value={item.unit} />
              <MetaRow label="Section" value={section?.title} />
              <MetaRow label="Subcategory" value={item.subcategory} />
              <MetaRow label="Rate Source" value={sourceLabels[selectedRateSource]} />
              <MetaRow label="Benchmark Rate" value={benchmarkRate > 0 ? formatCurrency(benchmarkRate) : '—'} />
              <MetaRow label="Manual Rate" value={formatCurrency(item.manualRate ?? 0)} />
              {hasFormula && <MetaRow label="Formula Rate" value={formatCurrency(formulaRate)} />}
              <MetaRow label="Resolved Rate" value={formatCurrency(resolvedUnitRate)} mono />
              <MetaRow label="Quantity" value={`${quantity.toLocaleString()} ${item.unit || ''}`} />
              <MetaRow label="Line Total" value={formatCurrency(lineTotal)} mono />
              {item.qtyCompleted !== undefined && <MetaRow label="Qty Completed" value={Number(item.qtyCompleted || 0).toLocaleString()} />}
              {item.progressPercent !== undefined && <MetaRow label="Progress" value={`${Math.round(item.progressPercent || 0)}%`} />}
              {hasCustomPricing && <MetaRow label="Custom Pricing" value="Active" />}
              {hasBids && <MetaRow label="Bids Received" value={`${item.bids.length}`} />}
              <MetaRow label="Qty Source" value={item.qtySource || 'manual'} />
              <MetaRow label="Takeoff Method" value={item.takeoffMeta?.templateLabel} />
              {hasBenchmarkAvailable && <MetaRow label="Benchmark Match" value={benchmarkTrace} />}
              {hasBenchmarkAvailable && <MetaRow label="Regional Coverage" value={benchmarkRegionCoverage > 0 ? `${benchmarkRegionCoverage} regions` : 'Base benchmark only'} />}
            </div>
          </Section>

          {/* Benchmark Intelligence */}
          <Section icon={TrendingUp} title="Benchmark / Market Rate" defaultOpen={false}>
             {benchmarkRate > 0 ? (
               <div className="idp-intel-card">
                  <div className="idp-intel-row">
                    <div><span className="idp-micro-label">Source</span><strong>{benchmarkMeta.sourceType?.toUpperCase() || 'MARKET FEED'}</strong></div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="idp-micro-label">Confidence</span>
                      <strong className="idp-conf" style={{ '--cf': CONFIDENCE_COLORS[benchmarkMeta.confidenceLevel] || '#64748b' }}>{getConfidenceLabel(benchmarkMeta.confidenceLevel)}</strong>
                    </div>
                  </div>
                  <div className="idp-intel-meta">
                    <MetaRow label="Last Updated" value={benchmarkMeta.dateCaptured || 'Real-time'} />
                    <MetaRow label="Region" value={benchmarkMeta.region || 'National'} />
                    <MetaRow label="Basis Note" value={benchmarkMeta.sourceNote} />
                    {benchmarkEvidence.summary && <MetaRow label="Source Trace" value={benchmarkEvidence.summary} />}
                    {item.benchmarkMatchSource && <MetaRow label="Catalog Match" value={item.benchmarkMatchSource} />}
                    {benchmarkRegionCoverage > 0 && <MetaRow label="Regional Matrix" value={`${benchmarkRegionCoverage} benchmark regions available`} />}
                    {benchmarkMeta.rate && <MetaRow label="Base Rate" value={formatCurrency(benchmarkMeta.rate)} />}
                    {benchmarkMeta.calibrationFactor && (
                      <MetaRow
                        label="Seed Calibration"
                        value={`${Math.round(Number(benchmarkMeta.calibrationFactor) * 100)}% planning factor`}
                      />
                    )}
                  </div>
                  {onRefreshBenchmark && (
                    <button className="idp-link-btn" onClick={onRefreshBenchmark}>
                      <RefreshCcw size={11} /> Refresh Benchmark Data
                    </button>
                  )}
               </div>
             ) : (
               <div className="idp-empty-pill">
                  <Info size={14} /><span>No benchmark data linked to this item.</span>
               </div>
             )}
          </Section>

          {/* Notes */}
          <Section icon={FileText} title="Notes" defaultOpen={false}>
            <div className="idp-notes-block">
              <textarea
                className="idp-notes-ta"
                rows={4}
                value={item.notes || ''}
                placeholder="Document pricing assumptions, site adjustments, or audit notes..."
                onChange={(e) => onNotesChange?.(e.target.value)}
              />
              {item.pickerHint && (
                <div className="idp-hint-box"><ShieldCheck size={12} /><span>{item.pickerHint}</span></div>
              )}
            </div>
          </Section>

        </div>

        {/* ── Footer ── */}
        <div className="idp-footer">
          <div className="idp-footer-info">
             <div className="idp-footer-dot" style={{ background: CONFIDENCE_COLORS[benchmarkMeta.confidenceLevel] || '#cbd5e1' }} />
             <span>{item.unit} · {sourceLabels[selectedRateSource]}</span>
          </div>
          <button type="button" className="idp-done-btn" onClick={onClose}>Done</button>
        </div>

        <style>{`
          .idp-overlay {
            position: fixed; inset: 0; z-index: 1300;
            background: rgba(15,23,42,0.4); backdrop-filter: blur(12px);
            display: flex; justify-content: flex-end;
            animation: idpFI 0.3s ease-out;
          }
          @keyframes idpFI { from { opacity: 0; } to { opacity: 1; } }
          .idp-overlay-docked { position: static; background: transparent; backdrop-filter: none; display: block; animation: none; }

          .idp-panel {
            --idp-bg: var(--bg-card);
            --idp-border: var(--border-light);
            --idp-text: var(--text-primary);
            --idp-muted: var(--text-muted);
            --idp-accent: var(--quantra-blue-600);
            --idp-accent-soft: var(--quantra-blue-100);
            --idp-r: var(--radius-md);

            font-family: var(--font-main), 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            width: min(520px, 100vw); height: 100dvh; background: var(--idp-bg);
            display: flex; flex-direction: column;
            box-shadow: -16px 0 50px rgba(15,23,42,0.18);
            overflow: hidden; border-left: 1px solid var(--idp-border);
            animation: idpSI 0.35s cubic-bezier(0.16,1,0.3,1);
          }
          @keyframes idpSI { from { transform: translateX(100%); } to { transform: translateX(0); } }
          .idp-panel-docked { width: 100%; height: 100%; min-height: 0; border-left: none; box-shadow: none; background: linear-gradient(180deg,#fcfdff,#f8fbff); animation: none; }

          /* Metadata Grid & Rows */
          .idp-meta-grid,
          .idp-intel-meta {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            margin-top: 0.35rem;
          }
          .idp-meta-row {
            display: grid;
            grid-template-columns: 140px 1fr;
            gap: 0.85rem;
            padding: 0.45rem 0;
            border-bottom: 1px solid #f1f5f9;
            align-items: flex-start;
          }
          .idp-meta-row:last-child {
            border-bottom: none;
          }
          .idp-meta-label {
            font-size: 0.65rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            line-height: 1.4;
          }
          .idp-meta-value {
            font-size: 0.72rem;
            font-weight: 550;
            color: #1e293b;
            line-height: 1.4;
            word-break: break-word;
          }
          .idp-meta-mono {
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 0.68rem;
            color: #0f172a;
            background: #f8fafc;
            padding: 0.1rem 0.3rem;
            border-radius: 4px;
            font-weight: 600;
          }

          /* Intel Card (Benchmark details) */
          .idp-intel-card {
            background: #fafbff;
            border: 1px solid var(--border-light);
            border-radius: 10px;
            padding: 0.75rem;
            margin-top: 0.5rem;
          }
          .idp-intel-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-light);
            padding-bottom: 0.6rem;
            margin-bottom: 0.6rem;
          }
          .idp-intel-row strong {
            font-size: 0.76rem;
            font-weight: 800;
            color: var(--idp-text);
          }
          .idp-conf {
            padding: 0.15rem 0.4rem;
            border-radius: 5px;
            background: var(--cf);
            color: white;
            font-size: 0.58rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          .idp-micro-label {
            display: block;
            font-size: 0.55rem;
            font-weight: 800;
            text-transform: uppercase;
            color: #94a3b8;
            letter-spacing: 0.08em;
            margin-bottom: 2px;
          }

          /* Formula Logic Styling */
          .idp-logic-card {
            background: #fafbff;
            border: 1px solid var(--border-light);
            border-radius: 10px;
            padding: 0.75rem;
            margin-top: 0.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .idp-logic-expr {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }
          .idp-logic-expr code {
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            padding: 0.45rem 0.6rem;
            border-radius: 6px;
            font-size: 0.72rem;
            color: #0f172a;
            word-break: break-all;
            display: block;
            line-height: 1.4;
            font-weight: 600;
          }
          .idp-vars-grid {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
          }
          .idp-vars-chips {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 0.4rem;
          }
          .idp-var-chip {
            background: #ffffff;
            border: 1px solid var(--border-light);
            border-radius: 6px;
            padding: 0.35rem 0.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.1rem;
            box-shadow: 0 1px 2px rgba(15,23,42,0.02);
          }
          .idp-var-name {
            font-size: 0.55rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .idp-var-chip strong {
            font-size: 0.72rem;
            font-weight: 800;
            color: var(--idp-text);
          }
          .idp-var-chip strong small {
            font-size: 0.52rem;
            color: #94a3b8;
            font-weight: 600;
            margin-left: 1px;
          }
          .idp-logic-result {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            border-top: 1px dashed var(--border-light);
            padding-top: 0.6rem;
          }
          .idp-logic-result p {
            margin: 0;
            font-size: 0.72rem;
            color: #334155;
            line-height: 1.45;
            background: #ffffff;
            border: 1px solid #f1f5f9;
            padding: 0.45rem 0.6rem;
            border-radius: 6px;
            font-weight: 500;
            word-break: break-word;
          }

          /* Header */
          .idp-header {
            padding: 0.85rem 1rem 0.7rem; background: linear-gradient(180deg,#f8fbff,#fff);
            border-bottom: 1px solid var(--idp-border);
            display: flex; flex-direction: column; gap: 0.6rem; flex-shrink: 0;
          }
          .idp-header-top { display: flex; justify-content: space-between; align-items: flex-start; }
          .idp-eyebrow { font-size: 0.52rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; color: var(--idp-accent); display: block; margin-bottom: 0.2rem; }
          .idp-title { margin: 0; font-size: 1.1rem; font-weight: 900; color: var(--idp-text); letter-spacing: -0.03em; line-height: 1.15; }
          .idp-header-meta { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.4rem; }
          .idp-meta-tag { padding: 0.15rem 0.45rem; border-radius: 6px; background: var(--idp-accent-soft); color: var(--idp-accent); font-size: 0.55rem; font-weight: 800; }
          .idp-meta-tag-code { background: #0f172a; color: white; }
          .idp-meta-tag-section { background: #fffbeb; color: #92400e; }
          .idp-meta-tag-benchmark { background: #ecfdf5; color: #059669; }
          .idp-meta-tag-formula { background: #f5f3ff; color: #7c3aed; }
          .idp-meta-tag-manual { background: #fef2f2; color: #dc2626; }
          .idp-close-trigger {
            width: 30px;
            height: 30px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--idp-border);
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            color: #94a3b8;
            cursor: pointer;
            transition: all var(--duration-fast) var(--ease-premium);
            flex-shrink: 0;
          }
          .idp-close-trigger:hover {
            background: #fef2f2;
            color: #ef4444;
            border-color: #fecaca;
            transform: translateY(-0.5px);
          }
          .idp-close-trigger:active {
            transform: translateY(0) scale(0.92);
          }

          /* Stats Row */
          .idp-stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.4rem; }
          .idp-stat { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 0.45rem 0.5rem; text-align: center; }
          .idp-stat-lbl { display: block; font-size: 0.44rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 1px; }
          .idp-stat strong { font-size: 0.82rem; font-weight: 900; color: var(--idp-text); display: block; line-height: 1.2; }
          .idp-stat strong small { font-size: 0.52rem; color: #94a3b8; font-weight: 700; margin-left: 2px; }
          .idp-stat-dark { background: #0f172a; border-color: #0f172a; }
          .idp-stat-dark .idp-stat-lbl { color: #94a3b8; }
          .idp-stat-dark strong { color: #fff; }
          .idp-stat-accent { background: linear-gradient(135deg,#1e40af,#3b82f6); border-color: transparent; }
          .idp-stat-accent .idp-stat-lbl { color: rgba(255,255,255,0.65); }
          .idp-stat-accent strong { color: #fff; }
          .idp-user-guide {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.35rem;
          }
          .idp-user-guide span {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 28px;
            padding: 0.28rem 0.35rem;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #ffffff;
            color: #475569;
            font-size: 0.55rem;
            font-weight: 850;
            text-align: center;
            line-height: 1.2;
          }

          /* Body */
          .idp-body { flex: 1; overflow-y: auto; scrollbar-width: thin; background: #fff; }
          .idp-body::-webkit-scrollbar { width: 3px; }
          .idp-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

          /* Actions Bar */
          .idp-actions-bar {
            display: flex; flex-wrap: wrap; gap: 0.3rem;
            padding: 0.6rem 1rem; border-bottom: 1px solid #f1f5f9;
            background: #fafbff;
          }
          .idp-quick-action {
            display: inline-flex; align-items: center; gap: 0.3rem;
            padding: 0.3rem 0.55rem; border-radius: 8px;
            border: 1px solid #e2e8f0; background: white;
            font-size: 0.6rem; font-weight: 700; color: #475569;
            cursor: pointer; transition: all var(--duration-fast) var(--ease-premium);
            white-space: nowrap;
          }
          .idp-quick-action:hover { background: #f1f5f9; border-color: #cbd5e1; transform: translateY(-1px); }
          .idp-quick-action:active { transform: translateY(0) scale(0.96); }
          .idp-quick-action-blue { border-color: #bfdbfe; color: #1d4ed8; background: #eff6ff; }
          .idp-quick-action-blue:hover { background: #dbeafe; }
          .idp-quick-action-teal { border-color: #99f6e4; color: #0f766e; background: #f0fdfa; }
          .idp-quick-action-teal:hover { background: #ccfbf1; }
          .idp-quick-action-indigo { border-color: #c7d2fe; color: #4338ca; background: #eef2ff; }
          .idp-quick-action-indigo:hover { background: #e0e7ff; }
          .idp-quick-action-amber { border-color: #fde68a; color: #92400e; background: #fffbeb; }
          .idp-quick-action-amber:hover { background: #fef3c7; }
          .idp-quick-action-danger { border-color: #fecaca; color: #dc2626; background: #fef2f2; }
          .idp-quick-action-danger:hover { background: #fee2e2; }

          /* Sections */
          .idp-section { border-bottom: 1px solid #f1f5f9; }
          .idp-section-open { background: #fdfdfe; }
          .idp-section-header {
            width: 100%; padding: 0.6rem 1rem;
            display: flex; align-items: center; justify-content: space-between;
            background: transparent; border: none; cursor: pointer; transition: all var(--duration-fast) var(--ease-premium);
          }
          .idp-section-header-compact { padding: 0.5rem 1rem; }
          .idp-section-header:hover { background: #f8fafc; }
          .idp-section-header:active { opacity: 0.8; }
          .idp-section-header-left { display: flex; align-items: center; gap: 0.55rem; }
          .idp-section-icon-wrap { width: 26px; height: 26px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: var(--idp-muted); flex-shrink: 0; }
          .idp-section-open .idp-section-icon-wrap { background: var(--idp-accent-soft); color: var(--idp-accent); }
          .idp-section-header strong { font-size: 0.76rem; font-weight: 800; color: var(--idp-text); }
          .idp-section-badge { font-size: 0.48rem; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.12rem 0.4rem; border-radius: 5px; background: var(--idp-accent-soft); color: var(--idp-accent); }
          .idp-section-chevron { color: #cbd5e1; transition: transform 0.2s; }
          .idp-section-chevron-open { transform: rotate(90deg); color: var(--idp-accent); }
          .idp-section-collapse { display: none; }
          .idp-section-collapse-open { display: block; }
          .idp-section-body { padding: 0 1rem 0.8rem; }

          /* Pricing Options */
          .idp-pricing-stack { display: flex; flex-direction: column; gap: 0.35rem; }
          .idp-price-opt {
            display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
            padding: 0.55rem 0.7rem; border-radius: 10px;
            border: 1px solid var(--border-light); background: white;
            cursor: pointer; transition: all var(--duration-fast) var(--ease-premium); position: relative; overflow: hidden;
          }
          .idp-price-opt:hover:not(:disabled) { border-color: #cbd5e1; transform: translateY(-1px); box-shadow: 0 3px 10px rgba(15,23,42,0.05); }
          .idp-price-opt:active:not(:disabled) { transform: translateY(0) scale(0.97); }
          .idp-price-opt-on { border-color: var(--idp-accent) !important; background: linear-gradient(135deg,#f8fbff,#eff6ff) !important; box-shadow: 0 3px 12px rgba(37,99,235,0.1) !important; }
          .idp-price-opt-on::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--idp-accent); }
          .idp-price-opt-off { opacity: 0.4; cursor: not-allowed; }
          .idp-price-opt-l { display: flex; align-items: center; gap: 0.55rem; }
          .idp-price-opt-ico { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .idp-price-opt-teal .idp-price-opt-ico { background: #f0fdfa; color: #0d9488; }
          .idp-price-opt-indigo .idp-price-opt-ico { background: #f5f3ff; color: #7c3aed; }
          .idp-price-opt-slate .idp-price-opt-ico { background: #f1f5f9; color: #475569; }
          .idp-price-opt-on.idp-price-opt-teal .idp-price-opt-ico { background: #ccfbf1; }
          .idp-price-opt-on.idp-price-opt-indigo .idp-price-opt-ico { background: #ede9fe; }
          .idp-price-opt-on.idp-price-opt-slate .idp-price-opt-ico { background: #e2e8f0; }
          .idp-price-opt-copy { display: flex; flex-direction: column; gap: 0; }
          .idp-price-opt-name { font-size: 0.72rem; font-weight: 800; color: var(--idp-text); }
          .idp-price-opt-sub { font-size: 0.55rem; color: #94a3b8; font-weight: 600; }
          .idp-price-opt-r { display: flex; align-items: center; gap: 0.35rem; }
          .idp-price-opt-r strong { font-size: 0.82rem; font-weight: 900; color: var(--idp-text); }
          .idp-price-check { width: 18px; height: 18px; border-radius: 50%; background: var(--idp-accent); color: white; display: flex; align-items: center; justify-content: center; }
          .idp-price-lock { color: #cbd5e1; }
          .idp-pricing-hint { margin: 0.2rem 0 0; display: flex; align-items: center; gap: 0.3rem; font-size: 0.6rem; color: #94a3b8; font-weight: 600; font-style: italic; }

          /* Link & Logic Buttons */
          .idp-link-btn,
          .idp-logic-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.35rem;
            width: 100%;
            margin-top: 0.5rem;
            padding: 0.45rem 0.75rem;
            border: 1px solid var(--quantra-blue-200);
            border-radius: var(--radius-md);
            background: #ffffff;
            color: var(--quantra-blue-700);
            font-size: 0.68rem;
            font-weight: 750;
            cursor: pointer;
            transition: all var(--duration-fast) var(--ease-premium);
            box-shadow: 0 1px 3px rgba(30, 108, 247, 0.04);
          }
          .idp-link-btn:hover,
          .idp-logic-btn:hover {
            background: var(--quantra-blue-50);
            border-color: var(--quantra-blue-400);
            color: var(--quantra-blue-800);
            transform: translateY(-1px);
            box-shadow: 0 3px 8px rgba(30, 108, 247, 0.08);
          }
          .idp-link-btn:active,
          .idp-logic-btn:active {
            transform: translateY(0) scale(0.97);
            box-shadow: 0 1px 2px rgba(30, 108, 247, 0.04);
          }

          /* Breakdown */
          .idp-breakdown-grid { display: flex; flex-direction: column; gap: 0.15rem; }
          .idp-bd-row {
            display: grid;
            grid-template-columns: 1fr 35px 75px;
            gap: 0.25rem 0.5rem;
            align-items: center;
            padding: 0.35rem 0;
            border-bottom: 1px dashed #f1f5f9;
          }
          .idp-bd-row:last-of-type {
            border-bottom: none;
          }
          .idp-bd-bar-bg {
            height: 6px;
            border-radius: 3px;
            background: #f1f5f9;
            overflow: hidden;
            grid-column: 1 / -1;
            margin-bottom: 2px;
          }
          .idp-bd-bar-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.4s ease-out;
          }
          .idp-bd-label {
            font-size: 0.68rem;
            font-weight: 700;
            color: #475569;
          }
          .idp-bd-pct {
            font-size: 0.68rem;
            font-weight: 800;
            color: var(--idp-text);
            text-align: right;
          }
          .idp-bd-val {
            font-size: 0.68rem;
            font-weight: 700;
            color: #64748b;
            text-align: right;
          }
          .idp-bd-total { display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 1px solid #e2e8f0; margin-top: 0.3rem; }
          .idp-bd-total span { font-size: 0.7rem; font-weight: 700; color: #64748b; }
          .idp-bd-total strong { font-size: 0.82rem; font-weight: 900; color: var(--idp-text); }

          /* Description & Notes */
          .idp-desc-ta, .idp-notes-ta { width: 100%; box-sizing: border-box; border: 1px solid var(--border-medium); border-radius: 8px; padding: 0.52rem 0.75rem; font-size: 0.74rem; font-weight: 520; font-family: inherit; line-height: 1.5; color: #1e293b; outline: none; resize: vertical; min-height: 52px; background: #fafbff; transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-premium), background var(--duration-fast) var(--ease-standard); }
          .idp-desc-ta:focus, .idp-notes-ta:focus { border-color: var(--idp-accent); box-shadow: 0 0 0 2px var(--idp-accent-soft); background: white; }

          /* Notes Section Styling */
          .idp-notes-block {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-top: 0.5rem;
          }
          .idp-notes-ta {
            min-height: 90px !important;
          }
          .idp-hint-box {
            display: flex;
            align-items: flex-start;
            gap: 0.45rem;
            padding: 0.5rem 0.65rem;
            border-radius: 8px;
            background: #fffbeb;
            border: 1px solid #fef3c7;
            color: #b45309;
            font-size: 0.62rem;
            line-height: 1.4;
            font-weight: 550;
          }
          .idp-hint-box svg {
            color: #d97706;
            margin-top: 1px;
            flex-shrink: 0;
          }

          /* Description Section Styling */
          .idp-desc-edit {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
            margin-top: 0.5rem;
          }
          .idp-desc-ta {
            min-height: 110px !important;
          }
          .idp-desc-hint {
            font-size: 0.6rem;
            color: #94a3b8;
            font-weight: 600;
            font-style: italic;
          }

          /* Footer */
          .idp-footer { padding: 0.5rem 1rem; border-top: 1px solid var(--idp-border); display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.96); flex-shrink: 0; }
          .idp-done-btn {
            min-height: 32px;
            padding: 0.38rem 1.2rem;
            border-radius: var(--radius-md);
            background: linear-gradient(135deg, var(--quantra-blue-600) 0%, var(--quantra-blue-700) 100%);
            color: white;
            border: none;
            font-size: 0.7rem;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(30, 108, 247, 0.22);
            transition: all var(--duration-fast) var(--ease-premium);
          }
          .idp-done-btn:hover {
            transform: translateY(-1.5px);
            box-shadow: 0 6px 16px rgba(30, 108, 247, 0.32);
          }
          .idp-done-btn:active {
            transform: translateY(0) scale(0.96);
            box-shadow: 0 2px 6px rgba(30, 108, 247, 0.18);
          }

          /* Final workspace polish: tighter rhythm without changing the panel structure. */
          .idp-panel-docked {
            background: #ffffff;
          }

          .idp-header {
            padding: 0.78rem 1rem 0.68rem;
            gap: 0.55rem;
            background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          }

          .idp-header-top {
            gap: 0.6rem;
          }

          .idp-header-left {
            min-width: 0;
          }

          .idp-eyebrow,
          .idp-stat-lbl,
          .idp-micro-label,
          .idp-section-badge {
            letter-spacing: 0.06em;
          }

          .idp-title {
            font-size: 1rem;
            line-height: 1.18;
            letter-spacing: 0;
          }

          .idp-header-meta {
            gap: 0.24rem;
            margin-top: 0.32rem;
          }

          .idp-meta-tag {
            border-radius: 5px;
            padding: 0.13rem 0.38rem;
          }



          .idp-stats-row {
            gap: 0.35rem;
          }

          .idp-stat {
            padding: 0.42rem 0.45rem;
            border-radius: 8px;
          }

          .idp-stat strong {
            font-size: 0.78rem;
            letter-spacing: 0;
          }

          .idp-user-guide {
            gap: 0.3rem;
          }

          .idp-user-guide span {
            min-height: 26px;
            padding: 0.24rem 0.3rem;
            border-radius: 7px;
          }

          .idp-actions-bar {
            gap: 0.28rem;
            padding: 0.5rem 1rem;
          }

          .idp-quick-action {
            min-height: 30px;
            padding: 0.26rem 0.46rem;
            border-radius: 7px;
          }

          .idp-section-header {
            padding: 0.54rem 1rem;
          }

          .idp-section-header-compact {
            padding: 0.48rem 1rem;
          }

          .idp-section-header-left {
            gap: 0.48rem;
          }

          .idp-section-icon-wrap {
            width: 24px;
            height: 24px;
            border-radius: 7px;
          }

          .idp-section-header strong {
            font-size: 0.72rem;
            letter-spacing: 0;
          }

          .idp-section-body {
            padding: 0 1rem 0.68rem;
          }

          .idp-price-opt {
            padding: 0.5rem 0.75rem;
            border-radius: 8px;
          }

          .idp-price-opt-l {
            min-width: 0;
          }

          .idp-price-opt-copy {
            min-width: 0;
          }

          .idp-price-opt-name,
          .idp-price-opt-sub {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .idp-logic-card,
          .idp-intel-card,
          .idp-empty-pill,
          .idp-desc-ta,
          .idp-notes-ta {
            border-radius: 8px;
          }

          .idp-desc-ta,
          .idp-notes-ta {
            min-height: 52px;
            padding: 0.52rem 0.75rem;
            font-size: 0.74rem;
          }

          .idp-footer {
            padding: 0.5rem 1rem;
          }



          @media (max-width: 768px) {
            .idp-panel { width: 100%; height: auto; min-height: 0; border-left: none; }
            .idp-header { padding: 0.68rem; gap: 0.45rem; }
            .idp-title { font-size: 0.9rem; }
            .idp-stats-row { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.28rem; }
            .idp-user-guide { display: none; }
            .idp-body { overflow-y: visible; }
            .idp-actions-bar { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); padding: 0.45rem 0.68rem; gap: 0.3rem; }
            .idp-quick-action { justify-content: center; padding: 0.28rem 0.25rem; font-size: 0; }
            .idp-section-header { padding: 0.48rem 0.68rem; }
            .idp-section-body { padding: 0 0.68rem 0.58rem; }
            .idp-footer { padding: 0.45rem 0.68rem; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default BOQItemDetailPanel;
