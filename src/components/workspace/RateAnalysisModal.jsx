import React, { useState } from 'react';
import {
  X,
  Package,
  HardHat,
  Plus,
  Trash2,
  CheckCircle,
  Zap,
  ShieldCheck,
  Wrench,
  Truck,
  Percent,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { generateAIInsight } from '../../utils/aiService';
import { getBreakdownForItem } from '../../data/rateBreakdowns';
import { applyRegionCostProfileToBreakdown } from '../../utils/pricing';
import {
  buildCustomPricingFromRateAnalysis,
  buildRateAnalysisBreakdownFromCustomPricing,
  buildCustomPricingSummary,
} from '../../utils/customPricing';

const normalizeUnit = (unit = '') => {
  const value = String(unit).toLowerCase().replace(/\s+/g, '');
  if (/(m³|m3|cum|cubic)/.test(value)) return 'm3';
  if (/(m²|m2|sqm|sq\.m|square)/.test(value)) return 'm2';
  if (/^(m|lm|rm|linm|mtr|meter|metre)$/.test(value)) return 'm';
  if (/^(kg|kilogram)$/.test(value)) return 'kg';
  if (/^(ton|t|tonne)$/.test(value)) return 'ton';
  if (/^(nr|no|nos|pcs|pc|item|sum)$/.test(String(unit).trim().toLowerCase())) return 'nr';
  return 'm3';
};

const inferWorkType = (description = '') => {
  const text = description.toLowerCase();
  if (/paint|emulsion|satin/.test(text)) return 'painting';
  if (/tile|terrazzo|granite tile|ceramic/.test(text)) return 'tiling';
  if (/plaster|render|screed/.test(text)) return 'plastering';
  if (/block|masonry|sandcrete|brick/.test(text)) return 'masonry';
  if (/formwork|shuttering|falsework/.test(text)) return 'formwork';
  if (/rebar|reinforcement|brc mesh|high yield/.test(text)) return 'reinforcement';
  if (/roof|sheet|truss|purlin/.test(text)) return 'roofing';
  if (/pipe|drain|culvert|sewer/.test(text)) return 'pipework';
  if (/plumb|sanitary|water supply/.test(text)) return 'plumbing';
  if (/electrical|cable|conduit|lighting/.test(text)) return 'electrical';
  if (/steel|fabricat|weld|portal frame|i-beam/.test(text)) return 'steelwork';
  if (/road|asphalt|kerb|paving/.test(text)) return 'roadwork';
  if (/excavat|backfill|earthwork/.test(text)) return 'earthwork';
  if (/concrete|slab|beam|column|foundation|pile|abutment/.test(text)) return 'concrete';
  return 'general';
};

const DEFAULTS = {
  concrete: { overheads: 12, profit: 10, waste: 2.5 },
  masonry: { overheads: 12, profit: 12, waste: 3 },
  plastering: { overheads: 10, profit: 15, waste: 5 },
  tiling: { overheads: 10, profit: 15, waste: 7 },
  painting: { overheads: 10, profit: 15, waste: 3 },
  formwork: { overheads: 12, profit: 10, waste: 5 },
  reinforcement: { overheads: 12, profit: 10, waste: 5 },
  roofing: { overheads: 12, profit: 12, waste: 7 },
  pipework: { overheads: 12, profit: 12, waste: 4 },
  plumbing: { overheads: 10, profit: 12, waste: 4 },
  electrical: { overheads: 10, profit: 12, waste: 4 },
  steelwork: { overheads: 12, profit: 10, waste: 4 },
  roadwork: { overheads: 15, profit: 10, waste: 5 },
  earthwork: { overheads: 12, profit: 10, waste: 3 },
  general: { overheads: 12, profit: 10, waste: 3 },
};

const getSuggestedOutput = ({ category, rowName, workType, unit }) => {
  const name = rowName.toLowerCase();

  if (category === 'labor') {
    if (workType === 'concrete') return unit === 'm3' ? 5 : 4;
    if (workType === 'masonry') return unit === 'm2' ? (name.includes('general') ? 18 : 9) : 5;
    if (workType === 'plastering') return unit === 'm2' ? (name.includes('general') ? 25 : 14) : 10;
    if (workType === 'tiling') return unit === 'm2' ? 10 : 6;
    if (workType === 'painting') return unit === 'm2' ? 28 : 18;
    if (workType === 'formwork') return unit === 'm2' ? 8 : 5;
    if (workType === 'reinforcement') return unit === 'kg' ? 350 : unit === 'ton' ? 0.35 : 1;
    if (workType === 'roofing') return unit === 'm2' ? 18 : 10;
    if (workType === 'pipework' || workType === 'plumbing') return unit === 'm' ? 12 : 4;
    if (workType === 'electrical') return unit === 'm' ? 25 : 6;
    if (workType === 'steelwork') return unit === 'kg' ? 250 : unit === 'ton' ? 0.25 : 3;
    if (workType === 'roadwork') return unit === 'm2' ? 120 : unit === 'm3' ? 25 : 15;
    if (workType === 'earthwork') return unit === 'm3' ? 12 : 20;
  }

  if (category === 'plant') {
    if (name.includes('excavator')) return unit === 'm3' ? 80 : 40;
    if (name.includes('mixer')) return unit === 'm3' ? 6 : 4;
    if (name.includes('vibrator')) return unit === 'm3' ? 12 : 6;
    if (name.includes('roller')) return unit === 'm2' ? 400 : 200;
    if (name.includes('grader')) return unit === 'm2' ? 800 : 250;
    if (name.includes('compactor')) return unit === 'm2' ? 150 : 30;
    if (name.includes('pump')) return unit === 'm3' ? 30 : 10;
    if (name.includes('formwork')) return unit === 'm2' ? 12 : 8;
    if (name.includes('crane')) return unit === 'ton' ? 8 : unit === 'nr' ? 6 : 4;
    if (name.includes('generator')) return unit === 'm2' ? 80 : unit === 'm3' ? 15 : 20;
    if (name.includes('truck')) return unit === 'm3' ? 30 : 15;
  }

  if (unit === 'm3') return category === 'plant' ? 20 : 5;
  if (unit === 'm2') return category === 'plant' ? 80 : 12;
  if (unit === 'm') return category === 'plant' ? 100 : 15;
  if (unit === 'kg') return category === 'plant' ? 600 : 300;
  if (unit === 'ton') return category === 'plant' ? 0.8 : 0.3;
  return 1;
};

const getLineTotal = (category, row) => {
  if (category === 'materials') {
    return Number(row.qty || 0) * Number(row.rate || 0) * (1 + ((Number(row.waste) || 0) / 100));
  }
  if (category === 'labor' || category === 'plant') {
    return (Number(row.qty || 0) * Number(row.rate || 0)) / Math.max(Number(row.output || 1), 0.001);
  }
  return Number(row.qty || 0) * Number(row.rate || 0);
};

const RateAnalysisModal = ({ item, structureType, region = 'Lagos', onClose, onSave }) => {
  const normalizeBreakdown = (bd) => {
    const unit = normalizeUnit(item?.unit);
    const workType = bd?.linkedCustomPricing?.workType || inferWorkType(item?.description);
    const defaults = DEFAULTS[workType] || DEFAULTS.general;

    return {
      ...bd,
      analysisMode: bd.analysisMode || (item?.customPricing ? 'custom-pricing-linked' : 'detailed-analysis'),
      materials: (bd.materials || []).map((row) => ({ ...row, waste: row.waste ?? defaults.waste })),
      labor: (bd.labor || []).map((row) => ({
        ...row,
        output: row.output ?? getSuggestedOutput({ category: 'labor', rowName: row.name || '', workType, unit }),
      })),
      plant: (bd.plant || []).map((row) => ({
        ...row,
        output: row.output ?? getSuggestedOutput({ category: 'plant', rowName: row.name || '', workType, unit }),
      })),
      transport: bd.transport || [],
      siteAdjustment: bd.siteAdjustment ?? 0,
      overheads: bd.overheads ?? defaults.overheads,
      profit: bd.profit ?? defaults.profit,
      pricingReference: bd.pricingReference || '',
      supplierQuote: bd.supplierQuote || '',
      notes: bd.notes || '',
      linkedCustomPricing: bd.linkedCustomPricing || null,
    };
  };

  const [breakdown, setBreakdown] = useState(() => {
    try {
      const hasDetailedCustomPricing = item.customPricing
        && ['materialsCost', 'labourCost', 'plantCost', 'transportCost']
          .some((field) => Number(item.customPricing?.[field]) > 0);

      if (hasDetailedCustomPricing) {
        return normalizeBreakdown(buildRateAnalysisBreakdownFromCustomPricing(item, item.customPricing));
      }
      if (item.breakdown) return normalizeBreakdown(item.breakdown);
      return applyRegionCostProfileToBreakdown(
        normalizeBreakdown(getBreakdownForItem(item.description, structureType)),
        region,
        item
      );
    } catch (err) {
      console.warn('[RateAnalysis] Breakdown engine error:', err.message);
      return applyRegionCostProfileToBreakdown(normalizeBreakdown({
        materials: [{ id: 1, name: 'OPC Cement (50kg)', qty: 6.5, unit: 'Bags', rate: 12500 }],
        labor: [{ id: 2, name: 'Mason / Concrete Worker', qty: 1, unit: 'Day', rate: 8000, output: 5 }],
        plant: [{ id: 3, name: 'Concrete Mixer (350L)', qty: 1, unit: 'Day', rate: 15000, output: 5 }],
        transport: [{ id: 4, name: 'Material Haulage', qty: 1, unit: 'Trip', rate: 5000 }],
      }), region, item);
    }
  });

  const [aiInsight, setAiInsight] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [collapsedSteps, setCollapsedSteps] = useState({});

  React.useEffect(() => {
    const fetchInsight = async () => {
      setIsAnalyzing(true);
      const insight = await generateAIInsight(item);
      setAiInsight(insight);
      setIsAnalyzing(false);
    };
    fetchInsight();
  }, [item]);

  const toggleStep = (step) => {
    setCollapsedSteps((prev) => ({ ...prev, [step]: !prev[step] }));
  };

  const updateBreakdown = (category, id, field, value) => {
    setBreakdown((prev) => ({
      ...prev,
      [category]: prev[category].map((row) => row.id === id ? { ...row, [field]: value } : row)
    }));
  };

  const addRow = (category) => {
    const unit = normalizeUnit(item?.unit);
    const workType = inferWorkType(item?.description);
    const defaults = DEFAULTS[workType] || DEFAULTS.general;

    const seeds = {
      materials: { name: 'New Material', qty: 1, unit: 'Unit', rate: 0, waste: defaults.waste },
      labor: { name: 'New Labour', qty: 1, unit: 'Day', rate: 0, output: getSuggestedOutput({ category: 'labor', rowName: 'labour', workType, unit }) },
      plant: { name: 'New Equipment', qty: 1, unit: 'Day', rate: 0, output: getSuggestedOutput({ category: 'plant', rowName: 'equipment', workType, unit }) },
      transport: { name: 'New Haulage', qty: 1, unit: 'Trip', rate: 0 },
    };

    setBreakdown((prev) => ({
      ...prev,
      [category]: [...prev[category], { id: Date.now(), ...seeds[category] }]
    }));
  };

  const removeRow = (category, id) => {
    setBreakdown((prev) => ({
      ...prev,
      [category]: prev[category].filter((row) => row.id !== id)
    }));
  };

  const materialBaseTotal = breakdown.materials.reduce((acc, row) => acc + (Number(row.qty || 0) * Number(row.rate || 0)), 0);
  const materialWasteTotal = breakdown.materials.reduce((acc, row) => {
    const baseAmount = Number(row.qty || 0) * Number(row.rate || 0);
    return acc + (baseAmount * ((Number(row.waste || 0)) / 100));
  }, 0);
  const matTotal = materialBaseTotal + materialWasteTotal;
  const labTotal = breakdown.labor.reduce((acc, row) => acc + getLineTotal('labor', row), 0);
  const plaTotal = breakdown.plant.reduce((acc, row) => acc + getLineTotal('plant', row), 0);
  const transTotal = breakdown.transport.reduce((acc, row) => acc + getLineTotal('transport', row), 0);
  const itemQuantity = Math.max(Number(item?.qty) || 0, 0);

  const directCost = materialBaseTotal + labTotal + plaTotal + transTotal;
  const siteAdjustmentVal = (Number(breakdown.siteAdjustment || 0) / 100) * (directCost + materialWasteTotal);
  const subtotalBeforeOverheads = directCost + materialWasteTotal + siteAdjustmentVal;
  const overheadsVal = (Number(breakdown.overheads || 0) / 100) * subtotalBeforeOverheads;
  const profitVal = (Number(breakdown.profit || 0) / 100) * (subtotalBeforeOverheads + overheadsVal);
  const unitRate = subtotalBeforeOverheads + overheadsVal + profitVal;
  const totalMaterialAmount = materialBaseTotal * itemQuantity;
  const totalWasteAmount = materialWasteTotal * itemQuantity;
  const totalLaborAmount = labTotal * itemQuantity;
  const totalPlantAmount = plaTotal * itemQuantity;
  const totalTransportAmount = transTotal * itemQuantity;
  const totalDirectCost = directCost * itemQuantity;
  const totalSiteAdjustmentAmount = siteAdjustmentVal * itemQuantity;
  const totalOverheadsAmount = overheadsVal * itemQuantity;
  const totalProfitAmount = profitVal * itemQuantity;
  const totalAmount = unitRate * itemQuantity;
  const linkedCustomPricing = breakdown.analysisMode === 'custom-pricing-linked'
    ? buildCustomPricingFromRateAnalysis(item, breakdown, item?.customPricing)
    : null;
  const linkedCustomSummary = linkedCustomPricing
    ? buildCustomPricingSummary(linkedCustomPricing)
    : null;

  const sections = [
    { key: 'materials', step: 1, label: 'Material Cost', icon: Package, color: '#059669', mode: 'materials', total: matTotal },
    { key: 'labor', step: 2, label: 'Labour Productivity', icon: HardHat, color: '#d97706', mode: 'output', total: labTotal },
    { key: 'plant', step: 3, label: 'Plant & Equipment', icon: Wrench, color: '#7c3aed', mode: 'output', total: plaTotal },
    { key: 'transport', step: 4, label: 'Transportation', icon: Truck, color: '#0284c7', mode: 'simple', total: transTotal },
  ];

  return (
    <div className="analysis-overlay">
      <div className="analysis-modal enterprise-card view-slide-up">
        <header className="analysis-header">
          <div className="header-info">
            <div className="item-badge">Professional Rate Build-Up</div>
            <h3>{item.description}</h3>
            <span className="unit-label">Analysis per 1.00 {item.unit} | BOQ Qty: {itemQuantity.toLocaleString()} {item.unit}</span>
          </div>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="analysis-content">
          <div className="ai-advisor-panel enterprise-card">
            <div className="advisor-header">
              <div className="title">
                <Zap size={14} className="text-primary" />
                <span>AI Cost Advisor</span>
              </div>
              {aiInsight && (
                <div className="confidence-pill">
                  <ShieldCheck size={12} /> {aiInsight.confidence}% Confidence
                </div>
              )}
            </div>
            {isAnalyzing ? (
              <div className="advisor-loading">Consulting market intelligence...</div>
            ) : (
              <div className="advisor-body">
                <p className="ai-summary">{aiInsight?.summary}</p>
                <div className="ai-recommendation">
                  <strong>Recommendation:</strong> {aiInsight?.recommendation}
                </div>
              </div>
            )}
          </div>

          <div className="formula-banner">
            <div className="formula-label"><TrendingUp size={14} /> QS Rate Formula</div>
            <div className="formula-stack">
              <div className="formula-text">
                Rate = Direct cost + material waste + site adjustment + overheads + profit
              </div>
              <div className="formula-subtext">
                {breakdown.analysisMode === 'custom-pricing-linked'
                  ? 'Aligned to the current custom pricing studio build-up'
                  : 'Amount = Quantity x Unit Rate'}
              </div>
            </div>
          </div>

          {(breakdown.pricingReference || breakdown.supplierQuote || breakdown.notes) && (
            <div className="pricing-basis-card">
              <div className="pricing-basis-head">
                <Info size={14} />
                <span>{breakdown.analysisMode === 'custom-pricing-linked' ? 'Custom pricing basis' : 'Rate basis'}</span>
              </div>
              <div className="pricing-basis-body">
                {breakdown.pricingReference && <div><strong>Reference:</strong> {breakdown.pricingReference}</div>}
                {breakdown.supplierQuote && <div><strong>Supplier / Quote:</strong> {breakdown.supplierQuote}</div>}
                {breakdown.notes && <div><strong>Notes:</strong> {breakdown.notes}</div>}
              </div>
            </div>
          )}

          {sections.map(({ key, step, label, icon, color, mode, total }) => {
            const isCollapsed = collapsedSteps[key];
            const rows = breakdown[key];
            const SectionIcon = icon;
            const template = mode === 'materials'
              ? '1.4fr 55px 60px 80px 55px 85px 30px'
              : mode === 'output'
                ? '1.4fr 50px 55px 80px 70px 85px 30px'
                : '1.4fr 60px 60px 90px 85px 30px';

            return (
              <section key={key} className="analysis-section">
                <div className="section-head" onClick={() => toggleStep(key)} style={{ cursor: 'pointer' }}>
                  <div className="title">
                    <span className="step-badge" style={{ background: color }}>{step}</span>
                    <SectionIcon size={16} />
                    {label}
                    {isCollapsed ? <ChevronRight size={14} className="toggle-chevron" /> : <ChevronDown size={14} className="toggle-chevron" />}
                  </div>
                  <div className="head-right">
                    <span className="subtotal" style={{ color }}>NGN {total.toLocaleString()} / {item.unit}</span>
                    <button className="btn-icon-small" onClick={(e) => { e.stopPropagation(); addRow(key); }}><Plus size={14} /></button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="analysis-table">
                    {mode === 'output' && (
                      <div className="output-hint">
                        <Info size={12} /> Unit cost = crew or plant daily cost divided by expected daily output.
                      </div>
                    )}
                    {mode === 'materials' && (
                      <div className="output-hint">
                        <Info size={12} /> Material waste and cutting allowance are included per line for a more realistic build-up.
                      </div>
                    )}

                    <div className="table-header-row" style={{ gridTemplateColumns: template }}>
                      <span>Item Description</span>
                      <span>{mode === 'output' ? 'Crew' : 'Qty'}</span>
                      <span>Unit</span>
                      <span>Rate (NGN)</span>
                      {mode === 'materials' && <span>Waste %</span>}
                      {mode === 'output' && <span>Output/day</span>}
                      <span>Unit Cost (NGN/{item.unit})</span>
                      <span></span>
                    </div>

                    {rows.map((row) => {
                      const lineTotal = getLineTotal(key, row);
                      return (
                        <div key={row.id} className="analysis-row" style={{ gridTemplateColumns: template }}>
                          <input className="name-input" value={row.name} onChange={(e) => updateBreakdown(key, row.id, 'name', e.target.value)} />
                          <input type="number" className="num-input" value={row.qty || ''} onChange={(e) => updateBreakdown(key, row.id, 'qty', Number(e.target.value) || 0)} />
                          <input className="unit-input-sm" value={row.unit} onChange={(e) => updateBreakdown(key, row.id, 'unit', e.target.value)} />
                          <input type="number" className="rate-input-sm" value={row.rate || ''} onChange={(e) => updateBreakdown(key, row.id, 'rate', Number(e.target.value) || 0)} />
                          {mode === 'materials' && (
                            <input type="number" className="output-input" value={row.waste || ''} onChange={(e) => updateBreakdown(key, row.id, 'waste', Number(e.target.value) || 0)} />
                          )}
                          {mode === 'output' && (
                            <input type="number" className="output-input" value={row.output || ''} onChange={(e) => updateBreakdown(key, row.id, 'output', Math.max(Number(e.target.value) || 1, 0.001))} />
                          )}
                          <span className="line-total">NGN {lineTotal.toLocaleString()}</span>
                          <button className="btn-remove" onClick={() => removeRow(key, row.id)}><Trash2 size={12} /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}

          <div className="prime-cost-bar">
            <div className="pc-label">Direct Cost Per Unit (Steps 1-4)</div>
            <div className="pc-breakdown">
              <span className="pc-chip" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>Mat base: NGN {materialBaseTotal.toLocaleString()}</span>
              <span className="pc-chip" style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706' }}>Lab: NGN {labTotal.toLocaleString()}</span>
              <span className="pc-chip" style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>Plt: NGN {plaTotal.toLocaleString()}</span>
              <span className="pc-chip" style={{ background: 'rgba(2,132,199,0.1)', color: '#0284c7' }}>Trn: NGN {transTotal.toLocaleString()}</span>
            </div>
            <div className="pc-total">NGN {directCost.toLocaleString()} / {item.unit}</div>
          </div>

          <div className="prime-cost-bar quantity-bar">
            <div className="pc-label">Quantity-Scaled Amount Preview</div>
            <div className="pc-breakdown">
              <span className="pc-chip" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>Mat base x Qty: NGN {totalMaterialAmount.toLocaleString()}</span>
              <span className="pc-chip" style={{ background: 'rgba(13,148,136,0.1)', color: '#0f766e' }}>Waste x Qty: NGN {totalWasteAmount.toLocaleString()}</span>
              <span className="pc-chip" style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706' }}>Lab x Qty: NGN {totalLaborAmount.toLocaleString()}</span>
              <span className="pc-chip" style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>Plt x Qty: NGN {totalPlantAmount.toLocaleString()}</span>
              <span className="pc-chip" style={{ background: 'rgba(2,132,199,0.1)', color: '#0284c7' }}>Trn x Qty: NGN {totalTransportAmount.toLocaleString()}</span>
            </div>
            <div className="pc-total">Direct Cost Amount: NGN {totalDirectCost.toLocaleString()}</div>
          </div>

          <section className="analysis-summary">
            <div className="summary-row">
              <div className="summary-label">
                <span className="step-badge" style={{ background: '#0f766e' }}>5</span>
                <Package size={14} />
                Material Waste
              </div>
              <div className="summary-controls summary-controls-static">
                <span className="percent-sign">{Number(breakdown.materials?.length || 0)} line{Number(breakdown.materials?.length || 0) === 1 ? '' : 's'}</span>
              </div>
              <span className="summary-val">NGN {materialWasteTotal.toLocaleString()} / {item.unit}</span>
            </div>
            <div className="overhead-hint">
              Derived from the waste allowance set on the material lines above.
            </div>
            <div className="summary-amount-note">Amount at current quantity: NGN {totalWasteAmount.toLocaleString()}</div>

            <div className="summary-row">
              <div className="summary-label">
                <span className="step-badge" style={{ background: '#0891b2' }}>6</span>
                <Truck size={14} />
                Site Adjustment
              </div>
              <div className="summary-controls">
                <input type="number" className="percent-input" value={breakdown.siteAdjustment} onChange={(e) => setBreakdown((prev) => ({ ...prev, siteAdjustment: Number(e.target.value) || 0 }))} />
                <span className="percent-sign">%</span>
              </div>
              <span className="summary-val">NGN {siteAdjustmentVal.toLocaleString()} / {item.unit}</span>
            </div>
            <div className="overhead-hint">
              Access difficulty, constrained site logistics, security, remote location or abnormal supervision.
            </div>
            <div className="summary-amount-note">Amount at current quantity: NGN {totalSiteAdjustmentAmount.toLocaleString()}</div>

            <div className="summary-row">
              <div className="summary-label">
                <span className="step-badge" style={{ background: '#dc2626' }}>7</span>
                <Percent size={14} />
                Overheads
              </div>
              <div className="summary-controls">
                <input type="number" className="percent-input" value={breakdown.overheads} onChange={(e) => setBreakdown((prev) => ({ ...prev, overheads: Number(e.target.value) || 0 }))} />
                <span className="percent-sign">%</span>
              </div>
              <span className="summary-val">NGN {overheadsVal.toLocaleString()} / {item.unit}</span>
            </div>
            <div className="overhead-hint">
              Site supervision, preliminaries, security, temporary works and admin support.
            </div>
            <div className="summary-amount-note">Amount at current quantity: NGN {totalOverheadsAmount.toLocaleString()}</div>
            <div className="summary-row">
              <div className="summary-label">
                <span className="step-badge" style={{ background: '#ea580c' }}>8</span>
                <TrendingUp size={14} />
                Profit & Risk
              </div>
              <div className="summary-controls">
                <input type="number" className="percent-input" value={breakdown.profit} onChange={(e) => setBreakdown((prev) => ({ ...prev, profit: Number(e.target.value) || 0 }))} />
                <span className="percent-sign">%</span>
              </div>
              <span className="summary-val">NGN {profitVal.toLocaleString()} / {item.unit}</span>
            </div>
            <div className="overhead-hint">
              Use higher margins for volatile, remote or risk-heavy work packages.
            </div>
            <div className="summary-amount-note">Amount at current quantity: NGN {totalProfitAmount.toLocaleString()}</div>

            {linkedCustomSummary && (
              <div className="linked-custom-summary">
                <span className="summary-eyebrow">Custom pricing alignment</span>
                <div className="linked-custom-grid">
                  <div><span>Direct cost</span><strong>NGN {linkedCustomSummary.directCost.toLocaleString()}</strong></div>
                  <div><span>Waste</span><strong>NGN {linkedCustomSummary.wasteValue.toLocaleString()}</strong></div>
                  <div><span>Site adj.</span><strong>NGN {linkedCustomSummary.siteValue.toLocaleString()}</strong></div>
                  <div><span>Overheads</span><strong>NGN {linkedCustomSummary.overheadValue.toLocaleString()}</strong></div>
                  <div><span>Profit</span><strong>NGN {linkedCustomSummary.profitValue.toLocaleString()}</strong></div>
                  <div><span>Final custom rate</span><strong>NGN {linkedCustomSummary.finalRate.toLocaleString()}</strong></div>
                </div>
              </div>
            )}

            <div className="final-rate-row">
              <div>
                <span className="final-label">Computed Unit Rate</span>
                <span className="final-unit">per {item.unit}</span>
              </div>
              <span className="rate-val">NGN {unitRate.toLocaleString()}</span>
            </div>

            <div className="final-rate-row total-amount-row">
              <div>
                <span className="final-label">BOQ Amount</span>
                <span className="final-unit">{itemQuantity.toLocaleString()} x NGN {unitRate.toLocaleString()} per {item.unit}</span>
              </div>
              <span className="rate-val">NGN {totalAmount.toLocaleString()}</span>
            </div>
          </section>
        </div>

        <footer className="analysis-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary-glow" onClick={() => onSave(unitRate, breakdown)}>
            <CheckCircle size={18} /> {breakdown.analysisMode === 'custom-pricing-linked' ? 'Apply aligned custom rate' : 'Apply rate'} - NGN {unitRate.toLocaleString()}/{item.unit}
          </button>
        </footer>
      </div>

      <style jsx="true">{`
        .analysis-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          z-index: 1100;
        }

        .analysis-modal {
          width: 760px;
          height: 100vh;
          background: white;
          display: flex;
          flex-direction: column;
          box-shadow: -20px 0 50px rgba(0,0,0,0.15);
        }

        .analysis-header {
          padding: 1.75rem 1.5rem;
          background: #0f172a;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .analysis-header h3 { margin: 0.25rem 0; font-size: 1rem; font-weight: 700; }
        .item-badge { background: #2563eb; font-size: 0.5625rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; width: fit-content; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.06em; }
        .unit-label { font-size: 0.6875rem; color: rgba(255,255,255,0.55); }

        .analysis-content { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
        .formula-banner {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .formula-label { display: flex; align-items: center; gap: 0.375rem; font-weight: 800; font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; color: #93c5fd; }
        .formula-stack { display: flex; flex-direction: column; gap: 0.2rem; }
        .formula-text { font-size: 0.75rem; font-weight: 600; color: rgba(255,255,255,0.85); font-family: 'SF Mono', 'Fira Code', monospace; }
        .formula-subtext { font-size: 0.7rem; font-weight: 700; color: #bfdbfe; }

        .pricing-basis-card {
          background: linear-gradient(135deg, #f8fafc, #eff6ff);
          border: 1px solid #dbeafe;
          border-radius: 10px;
          padding: 0.9rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .pricing-basis-head {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #1d4ed8;
        }
        .pricing-basis-body {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-size: 0.74rem;
          color: #334155;
          line-height: 1.55;
        }

        .step-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          color: white;
          font-size: 0.625rem;
          font-weight: 900;
          flex-shrink: 0;
        }

        .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid #f1f5f9; }
        .head-right { display: flex; align-items: center; gap: 0.75rem; }
        .section-head .title { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; color: #1e293b; text-transform: uppercase; font-size: 0.6875rem; letter-spacing: 0.04em; }
        .toggle-chevron { color: #94a3b8; }
        .subtotal { font-weight: 800; font-size: 0.875rem; }
        .btn-icon-small { border: none; background: #f1f5f9; color: #475569; padding: 4px; border-radius: 4px; cursor: pointer; }

        .analysis-table { display: flex; flex-direction: column; gap: 0; }
        .output-hint {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.625rem;
          color: #64748b;
          background: #f8fafc;
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .table-header-row,
        .analysis-row {
          display: grid;
          gap: 6px;
          align-items: center;
        }

        .table-header-row {
          padding: 0.375rem 0.5rem;
          font-size: 0.5625rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #f1f5f9;
        }

        .analysis-row {
          font-size: 0.8125rem;
          padding: 0.5rem;
          border-bottom: 1px solid #f8fafc;
        }

        .analysis-row:hover { background: #f8fafc; }
        .name-input { border: 1px solid transparent; background: transparent; font-weight: 600; color: #1e293b; width: 100%; padding: 5px 6px; border-radius: 4px; font-size: 0.75rem; }
        .name-input:focus { background: white; border-color: #2563eb; outline: none; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1); }

        .num-input, .unit-input-sm, .rate-input-sm, .output-input, .percent-input {
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 4px 6px;
          font-size: 0.75rem;
          width: 100%;
          background: white;
        }

        .num-input, .unit-input-sm, .output-input, .percent-input { text-align: center; }
        .rate-input-sm { text-align: right; }
        .output-input { background: #fefce8; border-color: #fde68a; }

        .num-input:focus, .unit-input-sm:focus, .rate-input-sm:focus, .output-input:focus, .percent-input:focus {
          border-color: #2563eb;
          outline: none;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        .line-total { font-weight: 700; color: #1e293b; text-align: right; font-size: 0.75rem; white-space: nowrap; }
        .btn-remove { border: none; background: transparent; color: #94a3b8; cursor: pointer; }
        .btn-remove:hover { color: #ef4444; }

        .prime-cost-bar {
          background: linear-gradient(135deg, #f0f9ff, #eff6ff);
          border: 1px solid #bfdbfe;
          padding: 1rem;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .quantity-bar {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-color: #cbd5e1;
        }
        .pc-label { font-weight: 800; font-size: 0.6875rem; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.05em; }
        .pc-breakdown { display: flex; flex-wrap: wrap; gap: 0.375rem; }
        .pc-chip { font-size: 0.6875rem; font-weight: 700; padding: 3px 10px; border-radius: 100px; white-space: nowrap; }
        .pc-total { font-size: 1.25rem; font-weight: 900; color: #1e3a8a; text-align: right; }

        .analysis-summary {
          background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
          padding: 1.25rem;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          border: 1px solid #e2e8f0;
        }
        .summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; font-weight: 600; color: #475569; }
        .summary-label { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; }
        .summary-controls { display: flex; align-items: center; gap: 2px; }
        .summary-controls-static { justify-content: flex-end; min-width: 92px; }
        .summary-val { font-weight: 800; color: #1e293b; min-width: 100px; text-align: right; }
        .percent-sign { font-size: 0.75rem; color: #94a3b8; font-weight: 700; }
        .overhead-hint { font-size: 0.625rem; color: #94a3b8; padding-left: 2.5rem; margin-top: -0.25rem; font-style: italic; }
        .summary-amount-note { font-size: 0.6875rem; color: #475569; padding-left: 2.5rem; margin-top: -0.1rem; font-weight: 700; }
        .summary-eyebrow {
          display: block;
          font-size: 0.64rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 0.55rem;
        }
        .linked-custom-summary {
          border-top: 1px dashed #cbd5e1;
          margin-top: 0.35rem;
          padding-top: 0.9rem;
        }
        .linked-custom-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.65rem;
        }
        .linked-custom-grid div {
          display: flex;
          flex-direction: column;
          gap: 0.16rem;
          padding: 0.7rem 0.75rem;
          border-radius: 10px;
          background: rgba(255,255,255,0.72);
          border: 1px solid #dbeafe;
        }
        .linked-custom-grid span {
          font-size: 0.64rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }
        .linked-custom-grid strong {
          font-size: 0.82rem;
          color: #0f172a;
        }

        .final-rate-row { border-top: 2px solid #cbd5e1; padding-top: 1rem; margin-top: 0.5rem; display: flex; justify-content: space-between; align-items: center; }
        .total-amount-row { border-top-color: #93c5fd; }
        .final-label { font-weight: 900; color: #0f172a; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; display: block; }
        .final-unit { font-size: 0.625rem; color: #64748b; }
        .rate-val { font-size: 1.5rem; font-weight: 900; color: #2563eb; letter-spacing: -0.02em; }

        .analysis-footer { padding: 1rem 1.5rem; display: flex; gap: 0.75rem; border-top: 1px solid #e2e8f0; background: #fafbfc; }
        .btn-secondary {
          padding: 0.75rem 1rem;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-primary-glow {
          flex: 1;
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.8125rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
        }
        .btn-close { border: none; background: transparent; color: white; cursor: pointer; opacity: 0.7; }
        .btn-close:hover { opacity: 1; }

        .ai-advisor-panel {
          background: linear-gradient(135deg, #f8fafc, #eff6ff);
          border: 1px solid #dbeafe;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          border-radius: 10px;
        }
        .advisor-header { display: flex; justify-content: space-between; align-items: center; }
        .advisor-header .title { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 0.65rem; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.05em; }
        .confidence-pill { display: flex; align-items: center; gap: 4px; background: #dcfce7; color: #166534; font-size: 0.5625rem; font-weight: 800; padding: 3px 8px; border-radius: 100px; }
        .advisor-loading { font-size: 0.75rem; color: #64748b; font-style: italic; }
        .ai-summary { font-size: 0.75rem; color: #1e293b; line-height: 1.5; margin: 0; font-weight: 500; }
        .ai-recommendation { font-size: 0.6875rem; color: #2563eb; background: rgba(37, 99, 235, 0.08); padding: 0.5rem 0.75rem; border-radius: 6px; font-weight: 600; border-left: 3px solid #2563eb; }
        .text-primary { color: #2563eb; }

        @media (max-width: 768px) {
          .analysis-modal { width: 100%; }
          .analysis-content { padding: 0.75rem; }
          .analysis-footer { padding: 0.75rem; position: sticky; bottom: 0; background: white; box-shadow: 0 -4px 15px rgba(0,0,0,0.05); }
          .analysis-row { grid-template-columns: 1fr !important; }
          .table-header-row { display: none; }
          .formula-banner { flex-direction: column; gap: 0.5rem; }
          .linked-custom-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default RateAnalysisModal;
