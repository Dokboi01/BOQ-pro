import React, { useState } from 'react';
import { X, Package, HardHat, Plus, Trash2, CheckCircle, Zap, ShieldCheck, Wrench, Truck, Percent, TrendingUp, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { generateAIInsight } from '../../utils/aiService';
import { getBreakdownForItem } from '../../data/rateBreakdowns';

const RateAnalysisModal = ({ item, structureType, onClose, onSave }) => {
    const normalizeBreakdown = (bd) => ({
        ...bd,
        materials: bd.materials || [],
        labor: bd.labor || [],
        plant: bd.plant || [],
        transport: bd.transport || [],
        overheads: bd.overheads ?? 10,
        profit: bd.profit ?? 15,
    });

    const [breakdown, setBreakdown] = useState(() => {
        try {
            if (item.breakdown) return normalizeBreakdown(item.breakdown);
            const base = getBreakdownForItem(item.description, structureType);
            return normalizeBreakdown(base);
        } catch (err) {
            console.warn('[RateAnalysis] Breakdown engine error:', err.message);
            return {
                materials: [{ id: 1, name: 'OPC Cement (50kg)', qty: 6.5, unit: 'Bags', rate: 12500 }],
                labor: [{ id: 2, name: 'Mason / Concrete Worker', qty: 1, unit: 'Day', rate: 8000, output: 5 }],
                plant: [{ id: 3, name: 'Concrete Mixer (350L)', qty: 1, unit: 'Day', rate: 15000, output: 5 }],
                transport: [{ id: 4, name: 'Material Haulage', qty: 1, unit: 'Trip', rate: 5000 }],
                overheads: 10,
                profit: 15,
            };
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
        setCollapsedSteps(prev => ({ ...prev, [step]: !prev[step] }));
    };

    const updateBreakdown = (category, id, field, value) => {
        setBreakdown(prev => ({
            ...prev,
            [category]: prev[category].map(row =>
                row.id === id ? { ...row, [field]: value } : row
            )
        }));
    };

    const addRow = (category) => {
        const defaults = {
            materials: { name: 'New Material', qty: 1, unit: 'Unit', rate: 0 },
            labor: { name: 'New Labour', qty: 1, unit: 'Day', rate: 0, output: 1 },
            plant: { name: 'New Equipment', qty: 1, unit: 'Day', rate: 0, output: 1 },
            transport: { name: 'New Haulage', qty: 1, unit: 'Trip', rate: 0 },
        };
        setBreakdown(prev => ({
            ...prev,
            [category]: [...prev[category], { id: Date.now(), ...defaults[category] }]
        }));
    };

    const removeRow = (category, id) => {
        setBreakdown(prev => ({
            ...prev,
            [category]: prev[category].filter(row => row.id !== id)
        }));
    };

    // Step 1: Materials = Σ(qty × rate)
    const matTotal = breakdown.materials.reduce((acc, m) => acc + (Number(m.qty) * Number(m.rate)), 0);

    // Step 2: Labour = Σ(daily cost / daily output)
    const labTotal = breakdown.labor.reduce((acc, l) => {
        const dailyCost = Number(l.qty) * Number(l.rate);
        const output = Number(l.output) || 1;
        return acc + (dailyCost / output);
    }, 0);

    // Step 3: Plant = Σ(daily cost / daily output)
    const plaTotal = breakdown.plant.reduce((acc, p) => {
        const dailyCost = Number(p.qty) * Number(p.rate);
        const output = Number(p.output) || 1;
        return acc + (dailyCost / output);
    }, 0);

    // Step 4: Transport = Σ(qty × rate)
    const transTotal = breakdown.transport.reduce((acc, t) => acc + (Number(t.qty) * Number(t.rate)), 0);

    // Prime Cost
    const primeCost = matTotal + labTotal + plaTotal + transTotal;

    // Step 5: Overheads
    const overheadsVal = (breakdown.overheads / 100) * primeCost;

    // Step 6: Profit
    const profitVal = (breakdown.profit / 100) * (primeCost + overheadsVal);

    // Final Rate
    const unitRate = primeCost + overheadsVal + profitVal;

    const stepConfig = [
        { key: 'materials', step: 1, label: 'Material Cost', icon: <Package size={16} />, color: '#059669', total: matTotal, hasOutput: false },
        { key: 'labor', step: 2, label: 'Labour Cost', icon: <HardHat size={16} />, color: '#d97706', total: labTotal, hasOutput: true },
        { key: 'plant', step: 3, label: 'Plant & Equipment', icon: <Wrench size={16} />, color: '#7c3aed', total: plaTotal, hasOutput: true },
        { key: 'transport', step: 4, label: 'Transportation', icon: <Truck size={16} />, color: '#0284c7', total: transTotal, hasOutput: false },
    ];

    const renderSection = ({ key, step, label, icon, color, total, hasOutput }) => {
        const isCollapsed = collapsedSteps[key];
        const items = breakdown[key];
        return (
            <section key={key} className="analysis-section">
                <div className="section-head" onClick={() => toggleStep(key)} style={{ cursor: 'pointer' }}>
                    <div className="title">
                        <span className="step-badge" style={{ background: color }}>{step}</span>
                        {icon}
                        {label}
                        {isCollapsed ? <ChevronRight size={14} className="toggle-chevron" /> : <ChevronDown size={14} className="toggle-chevron" />}
                    </div>
                    <div className="head-right">
                        <span className="subtotal" style={{ color }}>₦{total.toLocaleString()}</span>
                        <button className="btn-icon-small" onClick={(e) => { e.stopPropagation(); addRow(key); }}><Plus size={14} /></button>
                    </div>
                </div>
                {!isCollapsed && (
                    <div className="analysis-table">
                        {hasOutput && (
                            <div className="output-hint">
                                <Info size={12} /> Rate per {item.unit} = Daily Cost ÷ Daily Output
                            </div>
                        )}
                        <div className="table-header-row" style={{ gridTemplateColumns: hasOutput ? '1fr 45px 50px 70px 65px 80px 30px' : '1fr 55px 55px 80px 80px 30px' }}>
                            <span>Item Description</span>
                            <span>{hasOutput ? 'No.' : 'Qty'}</span>
                            <span>Unit</span>
                            <span>Rate (₦)</span>
                            {hasOutput && <span>Output/{item.unit}</span>}
                            <span>Amount (₦)</span>
                            <span></span>
                        </div>
                        {items.map(row => {
                            const lineTotal = hasOutput
                                ? (Number(row.qty) * Number(row.rate)) / (Number(row.output) || 1)
                                : Number(row.qty) * Number(row.rate);
                            return (
                                <div key={row.id} className="analysis-row" style={{ gridTemplateColumns: hasOutput ? '1fr 45px 50px 70px 65px 80px 30px' : '1fr 55px 55px 80px 80px 30px' }}>
                                    <input
                                        className="name-input"
                                        value={row.name}
                                        onChange={(e) => updateBreakdown(key, row.id, 'name', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        className="num-input"
                                        value={row.qty || ''}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            updateBreakdown(key, row.id, 'qty', isNaN(val) ? 0 : val);
                                        }}
                                    />
                                    <input
                                        className="unit-input-sm"
                                        value={row.unit}
                                        onChange={(e) => updateBreakdown(key, row.id, 'unit', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        className="rate-input-sm"
                                        value={row.rate || ''}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            updateBreakdown(key, row.id, 'rate', isNaN(val) ? 0 : val);
                                        }}
                                    />
                                    {hasOutput && (
                                        <input
                                            type="number"
                                            className="output-input"
                                            value={row.output || ''}
                                            placeholder="1"
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                updateBreakdown(key, row.id, 'output', isNaN(val) ? 1 : val);
                                            }}
                                        />
                                    )}
                                    <span className="line-total">₦{lineTotal.toLocaleString()}</span>
                                    <button className="btn-remove" onClick={() => removeRow(key, row.id)}><Trash2 size={12} /></button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        );
    };

    return (
        <div className="analysis-overlay">
            <div className="analysis-modal enterprise-card view-slide-up">
                <header className="analysis-header">
                    <div className="header-info">
                        <div className="item-badge">Professional Rate Build-Up</div>
                        <h3>{item.description}</h3>
                        <span className="unit-label">Analysis per 1.00 {item.unit}</span>
                    </div>
                    <button className="btn-close" onClick={onClose}><X size={20} /></button>
                </header>

                <div className="analysis-content">
                    {/* AI Advisor */}
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

                    {/* Formula Banner */}
                    <div className="formula-banner">
                        <div className="formula-label"><TrendingUp size={14} /> QS Rate Formula</div>
                        <div className="formula-text">
                            Rate = (Materials + Labour + Plant + Transport) + Overheads% + Profit%
                        </div>
                    </div>

                    {/* Steps 1-4: Cost Sections */}
                    {stepConfig.map(renderSection)}

                    {/* Prime Cost Summary */}
                    <div className="prime-cost-bar">
                        <div className="pc-label">Prime Cost (Steps 1–4)</div>
                        <div className="pc-breakdown">
                            <span className="pc-chip" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>Mat: ₦{matTotal.toLocaleString()}</span>
                            <span className="pc-chip" style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706' }}>Lab: ₦{labTotal.toLocaleString()}</span>
                            <span className="pc-chip" style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>Plt: ₦{plaTotal.toLocaleString()}</span>
                            <span className="pc-chip" style={{ background: 'rgba(2,132,199,0.1)', color: '#0284c7' }}>Trn: ₦{transTotal.toLocaleString()}</span>
                        </div>
                        <div className="pc-total">₦{primeCost.toLocaleString()}</div>
                    </div>

                    {/* Steps 5-6: Overheads & Profit */}
                    <section className="analysis-summary">
                        <div className="summary-row">
                            <div className="summary-label">
                                <span className="step-badge" style={{ background: '#dc2626' }}>5</span>
                                <Percent size={14} />
                                Overheads
                            </div>
                            <div className="summary-controls">
                                <input
                                    type="number"
                                    className="percent-input"
                                    value={breakdown.overheads}
                                    onChange={(e) => setBreakdown(prev => ({ ...prev, overheads: Number(e.target.value) }))}
                                />
                                <span className="percent-sign">%</span>
                            </div>
                            <span className="summary-val">₦{overheadsVal.toLocaleString()}</span>
                        </div>
                        <div className="overhead-hint">
                            Site supervision, security, temporary works, office expenses (typically 5–15%)
                        </div>
                        <div className="summary-row">
                            <div className="summary-label">
                                <span className="step-badge" style={{ background: '#ea580c' }}>6</span>
                                <TrendingUp size={14} />
                                Profit & Risk
                            </div>
                            <div className="summary-controls">
                                <input
                                    type="number"
                                    className="percent-input"
                                    value={breakdown.profit}
                                    onChange={(e) => setBreakdown(prev => ({ ...prev, profit: Number(e.target.value) }))}
                                />
                                <span className="percent-sign">%</span>
                            </div>
                            <span className="summary-val">₦{profitVal.toLocaleString()}</span>
                        </div>
                        <div className="overhead-hint">
                            Government jobs: 5–10% | Private jobs: 10–20% | High-risk: up to 25%
                        </div>

                        <div className="final-rate-row">
                            <div>
                                <span className="final-label">Computed Unit Rate</span>
                                <span className="final-unit">per {item.unit}</span>
                            </div>
                            <span className="rate-val">₦{unitRate.toLocaleString()}</span>
                        </div>
                    </section>
                </div>

                <footer className="analysis-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary-glow" onClick={() => onSave(unitRate, breakdown)}>
                        <CheckCircle size={18} /> Apply Rate — ₦{unitRate.toLocaleString()}/{item.unit}
                    </button>
                </footer>
            </div>

            <style jsx="true">{`
        .analysis-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          z-index: 1100;
          animation: overlay-in 0.3s ease;
        }

        @keyframes overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .analysis-modal {
          width: 680px;
          height: 100vh;
          background: white;
          border-radius: 0;
          display: flex;
          flex-direction: column;
          box-shadow: -20px 0 50px rgba(0,0,0,0.15);
          animation: slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
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
        .unit-label { font-size: 0.6875rem; color: rgba(255,255,255,0.5); }

        .analysis-content { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

        /* Formula Banner */
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
        .formula-text { font-size: 0.75rem; font-weight: 600; color: rgba(255,255,255,0.8); font-family: 'SF Mono', 'Fira Code', monospace; }

        /* Step Badge */
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

        /* Section */
        .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid #f1f5f9; }
        .head-right { display: flex; align-items: center; gap: 0.75rem; }
        .section-head .title { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; color: #1e293b; text-transform: uppercase; font-size: 0.6875rem; letter-spacing: 0.04em; }
        .toggle-chevron { color: #94a3b8; }

        .subtotal { font-weight: 800; font-size: 0.875rem; }
        .btn-icon-small { border: none; background: #f1f5f9; color: #475569; padding: 4px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
        .btn-icon-small:hover { background: #e2e8f0; }

        /* Table */
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

        .table-header-row {
          display: grid;
          grid-template-columns: 1fr 55px 55px 80px 80px 30px;
          gap: 6px;
          padding: 0.375rem 0.5rem;
          font-size: 0.5625rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #f1f5f9;
        }
        .table-header-row[data-has-output="true"] {
          grid-template-columns: 1fr 45px 50px 70px 65px 80px 30px;
        }

        .analysis-row {
          display: grid;
          grid-template-columns: 1fr 55px 55px 80px 80px 30px;
          align-items: center;
          gap: 6px;
          font-size: 0.8125rem;
          padding: 0.5rem;
          border-radius: 6px;
          transition: all 0.15s;
          border-bottom: 1px solid #f8fafc;
        }
        .analysis-row:hover { background: #f8fafc; }

        .analysis-section[data-has-output="true"] .table-header-row,
        .analysis-section[data-has-output="true"] .analysis-row {
          grid-template-columns: 1fr 45px 50px 70px 65px 80px 30px;
        }

        .name-input { border: 1px solid transparent; background: transparent; font-weight: 600; color: #1e293b; width: 100%; padding: 5px 6px; border-radius: 4px; transition: all 0.2s; font-size: 0.75rem; }
        .name-input:focus { background: white; border-color: #2563eb; outline: none; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1); }

        .num-input, .unit-input-sm, .rate-input-sm, .output-input {
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 4px 5px;
          text-align: center;
          transition: all 0.2s;
          font-size: 0.75rem;
          width: 100%;
          background: white;
        }
        .num-input:focus, .unit-input-sm:focus, .rate-input-sm:focus, .output-input:focus {
          border-color: #2563eb;
          outline: none;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }
        .rate-input-sm { text-align: right; }
        .output-input { background: #fefce8; border-color: #fde68a; }
        .output-input:focus { border-color: #f59e0b; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1); }

        .line-total { font-weight: 700; color: #1e293b; text-align: right; font-size: 0.75rem; white-space: nowrap; }
        .btn-remove { border: none; background: transparent; color: #94a3b8; cursor: pointer; opacity: 0; transition: all 0.2s; padding: 2px; }
        .analysis-row:hover .btn-remove { opacity: 1; }
        .btn-remove:hover { color: #ef4444; transform: scale(1.2); }

        /* Prime Cost Bar */
        .prime-cost-bar {
          background: linear-gradient(135deg, #f0f9ff, #eff6ff);
          border: 1px solid #bfdbfe;
          padding: 1rem;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .pc-label { font-weight: 800; font-size: 0.6875rem; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.05em; }
        .pc-breakdown { display: flex; flex-wrap: wrap; gap: 0.375rem; }
        .pc-chip { font-size: 0.6875rem; font-weight: 700; padding: 3px 10px; border-radius: 100px; white-space: nowrap; }
        .pc-total { font-size: 1.25rem; font-weight: 900; color: #1e3a8a; text-align: right; }

        /* Summary / Steps 5-6 */
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
        .summary-val { font-weight: 800; color: #1e293b; min-width: 100px; text-align: right; }
        .percent-input { width: 48px; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px 6px; text-align: center; transition: all 0.2s; font-weight: 700; }
        .percent-input:focus { border-color: #2563eb; outline: none; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1); }
        .percent-sign { font-size: 0.75rem; color: #94a3b8; font-weight: 700; }
        .overhead-hint { font-size: 0.625rem; color: #94a3b8; padding-left: 2.5rem; margin-top: -0.25rem; font-style: italic; }

        .final-rate-row { border-top: 2px solid #cbd5e1; padding-top: 1rem; margin-top: 0.5rem; display: flex; justify-content: space-between; align-items: center; }
        .final-label { font-weight: 900; color: #0f172a; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; display: block; }
        .final-unit { font-size: 0.625rem; color: #64748b; }
        .rate-val { font-size: 1.5rem; font-weight: 900; color: #2563eb; letter-spacing: -0.02em; }

        .analysis-footer { padding: 1rem 1.5rem; display: flex; gap: 0.75rem; border-top: 1px solid #e2e8f0; background: #fafbfc; }
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
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-primary-glow:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
        }
        .btn-close { border: none; background: transparent; color: white; cursor: pointer; opacity: 0.7; }
        .btn-close:hover { opacity: 1; }

        /* AI Panel */
        .ai-advisor-panel {
          background: linear-gradient(135deg, #f8fafc, #eff6ff);
          border: 1px solid #dbeafe;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          border-radius: 10px;
          position: relative;
          overflow: hidden;
        }
        .ai-advisor-panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #2563eb, #7c3aed, #2563eb);
          background-size: 200% 100%;
          animation: gradient-shift 3s ease-in-out infinite;
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .advisor-header { display: flex; justify-content: space-between; align-items: center; }
        .advisor-header .title { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 0.65rem; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.05em; }
        .confidence-pill { display: flex; align-items: center; gap: 4px; background: #dcfce7; color: #166534; font-size: 0.5625rem; font-weight: 800; padding: 3px 8px; border-radius: 100px; }
        .advisor-loading { font-size: 0.75rem; color: #64748b; font-style: italic; animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .ai-summary { font-size: 0.75rem; color: #1e293b; line-height: 1.5; margin: 0; font-weight: 500; }
        .ai-recommendation { font-size: 0.6875rem; color: #2563eb; background: rgba(37, 99, 235, 0.08); padding: 0.5rem 0.75rem; border-radius: 6px; font-weight: 600; border-left: 3px solid #2563eb; }

        /* Mobile */
        @media (max-width: 768px) {
          .analysis-modal { width: 100%; }
          .analysis-header { padding: 1.25rem 1rem; }
          .analysis-content { padding: 0.75rem; }
          .analysis-footer { padding: 0.75rem; position: sticky; bottom: 0; background: white; box-shadow: 0 -4px 15px rgba(0,0,0,0.05); }
          .analysis-row { grid-template-columns: 1fr; gap: 0.375rem; }
          .table-header-row { display: none; }
          .formula-banner { flex-direction: column; gap: 0.5rem; }
          .pc-breakdown { flex-direction: column; }
          .prime-cost-bar { padding: 0.75rem; }
        }
      `}</style>
        </div>
    );
};

export default RateAnalysisModal;
