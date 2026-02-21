import React, { useState } from 'react';
import { X, Package, HardHat, Plus, Trash2, CheckCircle, Zap, ShieldCheck, Wrench } from 'lucide-react';
import { generateAIInsight } from '../../utils/aiService';
import { getBreakdownForItem } from '../../data/rateBreakdowns';

const RateAnalysisModal = ({ item, structureType, onClose, onSave }) => {
    // Ensure all three sections always exist (guards against old saved breakdowns)
    const normalizeBreakdown = (bd) => ({
        ...bd,
        materials: bd.materials || [],
        labor: bd.labor || [],
        plant: bd.plant || [],
        overheads: bd.overheads ?? 15,
        profit: bd.profit ?? 10,
    });

    const [breakdown, setBreakdown] = useState(() => {
        try {
            // If item already has a saved custom breakdown, use it (normalized)
            if (item.breakdown) return normalizeBreakdown(item.breakdown);
            // Otherwise generate the engineering-correct breakdown
            return getBreakdownForItem(item.description, structureType);
        } catch (err) {
            console.warn('[RateAnalysis] Breakdown engine error:', err.message);
            // Absolute safe fallback
            return {
                materials: [{ id: 1, name: 'OPC Cement (50kg)', qty: 6.5, unit: 'Bags', rate: 12500 }],
                labor: [{ id: 2, name: 'Mason / Concrete Worker', qty: 1, unit: 'Day', rate: 8000 }],
                plant: [{ id: 3, name: 'Concrete Mixer (350L)', qty: 0.2, unit: 'Day', rate: 15000 }],
                overheads: 15,
                profit: 10,
            };
        }
    });

    const [aiInsight, setAiInsight] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    React.useEffect(() => {
        const fetchInsight = async () => {
            setIsAnalyzing(true);
            const insight = await generateAIInsight(item);
            setAiInsight(insight);
            setIsAnalyzing(false);
        };
        fetchInsight();
    }, [item]);

    const updateBreakdown = (category, id, field, value) => {
        setBreakdown(prev => ({
            ...prev,
            [category]: prev[category].map(row =>
                row.id === id ? { ...row, [field]: value } : row
            )
        }));
    };

    const addRow = (category) => {
        const newRow = {
            id: Date.now(),
            name: 'New Item',
            qty: 1,
            unit: 'Unit',
            rate: 0
        };
        setBreakdown(prev => ({
            ...prev,
            [category]: [...prev[category], newRow]
        }));
    };

    const removeRow = (category, id) => {
        setBreakdown(prev => ({
            ...prev,
            [category]: prev[category].filter(row => row.id !== id)
        }));
    };

    const calculateSubtotal = (category) => {
        return breakdown[category].reduce((acc, curr) => acc + (Number(curr.qty) * Number(curr.rate)), 0);
    };

    const matTotal = calculateSubtotal('materials');
    const labTotal = calculateSubtotal('labor');
    const plaTotal = calculateSubtotal('plant');

    const primeCost = matTotal + labTotal + plaTotal;
    const overheadsVal = (breakdown.overheads / 100) * primeCost;
    const profitVal = (breakdown.profit / 100) * (primeCost + overheadsVal);
    const unitRate = primeCost + overheadsVal + profitVal;

    return (
        <div className="analysis-overlay">
            <div className="analysis-modal enterprise-card view-slide-up">
                <header className="analysis-header">
                    <div className="header-info">
                        <div className="item-badge">Professional Rate Builder</div>
                        <h3>{item.description}</h3>
                        <span className="unit-label">Analysis per 1.00 {item.unit}</span>
                    </div>
                    <button className="btn-close" onClick={onClose}><X size={20} /></button>
                </header>

                <div className="analysis-content">
                    {/* AI Advisor Panel */}
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
                    {/* Materials Section */}
                    <section className="analysis-section">
                        <div className="section-head">
                            <div className="title"><Package size={16} /> Materials</div>
                            <div className="head-right">
                                <span className="subtotal">₦{matTotal.toLocaleString()}</span>
                                <button className="btn-icon-small" onClick={() => addRow('materials')}><Plus size={14} /></button>
                            </div>
                        </div>
                        <div className="analysis-table">
                            {breakdown.materials.map(m => (
                                <div key={m.id} className="analysis-row">
                                    <input
                                        className="name-input"
                                        value={m.name}
                                        onChange={(e) => updateBreakdown('materials', m.id, 'name', e.target.value)}
                                    />
                                    <div className="calc-inputs">
                                        <input
                                            type="number"
                                            value={m.qty || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                updateBreakdown('materials', m.id, 'qty', isNaN(val) ? 0 : val);
                                            }}
                                        />
                                        <span className="unit">{m.unit}</span>
                                        <span className="at">@</span>
                                        <input
                                            type="number"
                                            value={m.rate || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                updateBreakdown('materials', m.id, 'rate', isNaN(val) ? 0 : val);
                                            }}
                                        />
                                    </div>
                                    <span className="total">₦{(m.qty * m.rate).toLocaleString()}</span>
                                    <button className="btn-remove" onClick={() => removeRow('materials', m.id)}><Trash2 size={12} /></button>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Labor Section */}
                    <section className="analysis-section">
                        <div className="section-head">
                            <div className="title"><HardHat size={16} /> Labor</div>
                            <div className="head-right">
                                <span className="subtotal">₦{labTotal.toLocaleString()}</span>
                                <button className="btn-icon-small" onClick={() => addRow('labor')}><Plus size={14} /></button>
                            </div>
                        </div>
                        <div className="analysis-table">
                            {breakdown.labor.map(l => (
                                <div key={l.id} className="analysis-row">
                                    <input
                                        className="name-input"
                                        value={l.name}
                                        onChange={(e) => updateBreakdown('labor', l.id, 'name', e.target.value)}
                                    />
                                    <div className="calc-inputs">
                                        <input
                                            type="number"
                                            value={l.qty || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                updateBreakdown('labor', l.id, 'qty', isNaN(val) ? 0 : val);
                                            }}
                                        />
                                        <span className="unit">{l.unit}</span>
                                        <span className="at">@</span>
                                        <input
                                            type="number"
                                            value={l.rate || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                updateBreakdown('labor', l.id, 'rate', isNaN(val) ? 0 : val);
                                            }}
                                        />
                                    </div>
                                    <span className="total">₦{(l.qty * l.rate).toLocaleString()}</span>
                                    <button className="btn-remove" onClick={() => removeRow('labor', l.id)}><Trash2 size={12} /></button>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Plant & Equipment Section */}
                    <section className="analysis-section">
                        <div className="section-head">
                            <div className="title"><Wrench size={16} /> Plant &amp; Equipment</div>
                            <div className="head-right">
                                <span className="subtotal">₦{plaTotal.toLocaleString()}</span>
                                <button className="btn-icon-small" onClick={() => addRow('plant')}><Plus size={14} /></button>
                            </div>
                        </div>
                        <div className="analysis-table">
                            {breakdown.plant.map(p => (
                                <div key={p.id} className="analysis-row">
                                    <input
                                        className="name-input"
                                        value={p.name}
                                        onChange={(e) => updateBreakdown('plant', p.id, 'name', e.target.value)}
                                    />
                                    <div className="calc-inputs">
                                        <input
                                            type="number"
                                            value={p.qty || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                updateBreakdown('plant', p.id, 'qty', isNaN(val) ? 0 : val);
                                            }}
                                        />
                                        <span className="unit">{p.unit}</span>
                                        <span className="at">@</span>
                                        <input
                                            type="number"
                                            value={p.rate || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                updateBreakdown('plant', p.id, 'rate', isNaN(val) ? 0 : val);
                                            }}
                                        />
                                    </div>
                                    <span className="total">₦{(p.qty * p.rate).toLocaleString()}</span>
                                    <button className="btn-remove" onClick={() => removeRow('plant', p.id)}><Trash2 size={12} /></button>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Management & Profit */}
                    <section className="analysis-summary">
                        <div className="summary-row">
                            <span>Prime Cost</span>
                            <span>₦{primeCost.toLocaleString()}</span>
                        </div>
                        <div className="summary-row">
                            <span>Overheads (%)</span>
                            <input
                                type="number"
                                className="percent-input"
                                value={breakdown.overheads}
                                onChange={(e) => setBreakdown(prev => ({ ...prev, overheads: Number(e.target.value) }))}
                            />
                            <span>₦{overheadsVal.toLocaleString()}</span>
                        </div>
                        <div className="summary-row">
                            <span>Profit & Risk (%)</span>
                            <input
                                type="number"
                                className="percent-input"
                                value={breakdown.profit}
                                onChange={(e) => setBreakdown(prev => ({ ...prev, profit: Number(e.target.value) }))}
                            />
                            <span>₦{profitVal.toLocaleString()}</span>
                        </div>
                        <div className="final-rate-row">
                            <span>Computed Unit Rate</span>
                            <span className="rate-val">₦{unitRate.toLocaleString()}</span>
                        </div>
                    </section>
                </div>

                <footer className="analysis-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary-glow" onClick={() => onSave(unitRate, breakdown)}>
                        <CheckCircle size={18} /> Apply Custom Rate
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
          width: 620px;
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
          padding: 2.5rem 2rem;
          background: #0f172a;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .item-badge { background: #2563eb; font-size: 0.625rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; width: fit-content; margin-bottom: 0.75rem; text-transform: uppercase; }
        .unit-label { font-size: 0.75rem; color: rgba(255,255,255,0.6); }

        .analysis-content { flex: 1; overflow-y: auto; padding: 2rem; display: flex; flex-direction: column; gap: 2rem; }

        .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #f1f5f9; }
        .head-right { display: flex; align-items: center; gap: 1rem; }
        .section-head .title { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; color: #1e293b; text-transform: uppercase; font-size: 0.75rem; }

        .subtotal { font-weight: 800; color: #1e293b; }
        .btn-icon-small { border: none; background: #f1f5f9; color: #475569; padding: 4px; border-radius: 4px; cursor: pointer; }

        .analysis-table { display: flex; flex-direction: column; gap: 0.75rem; }
        .analysis-row { display: grid; grid-template-columns: 1fr 200px 100px 30px; align-items: center; gap: 1rem; font-size: 0.8125rem; padding: 0.625rem 0.5rem; border-radius: 8px; transition: all 0.2s; }
        .analysis-row:hover { background: #f1f5f9; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }

        .name-input { border: 1px solid transparent; background: transparent; font-weight: 600; color: #1e293b; width: 100%; padding: 6px 8px; border-radius: 6px; transition: all 0.2s; }
        .name-input:focus { background: white; border-color: #2563eb; outline: none; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

        .calc-inputs { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #64748b; }
        .calc-inputs input { width: 45px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 6px; text-align: center; transition: all 0.2s; }
        .calc-inputs input:focus { border-color: #2563eb; outline: none; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1); }
        .calc-inputs input:last-child { width: 70px; text-align: right; }

        .at { color: #94a3b8; }
        .total { font-weight: 700; color: #1e293b; text-align: right; }
        .btn-remove { border: none; background: transparent; color: #94a3b8; cursor: pointer; opacity: 0; transition: all 0.2s; }
        .analysis-row:hover .btn-remove { opacity: 1; }
        .btn-remove:hover { color: #ef4444; transform: scale(1.2); }

        .analysis-summary { background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%); padding: 1.5rem; border-radius: 12px; display: flex; flex-direction: column; gap: 0.75rem; border: 1px solid #e2e8f0; }
        .summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; font-weight: 600; color: #475569; }
        .percent-input { width: 50px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 6px; text-align: center; transition: all 0.2s; }
        .percent-input:focus { border-color: #2563eb; outline: none; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1); }

        .final-rate-row { border-top: 2px solid #e2e8f0; padding-top: 1rem; display: flex; justify-content: space-between; align-items: center; }
        .final-rate-row span:first-child { font-weight: 800; color: #0f172a; text-transform: uppercase; font-size: 0.8125rem; letter-spacing: 0.05em; }
        .rate-val { font-size: 1.75rem; font-weight: 900; color: #2563eb; letter-spacing: -0.02em; }

        .analysis-footer { padding: 1.5rem 2rem; display: flex; gap: 1rem; border-top: 1px solid #e2e8f0; background: #fafbfc; }
        .btn-primary-glow { 
          flex: 1; 
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); 
          color: white; 
          border: none; 
          padding: 0.875rem; 
          border-radius: 10px; 
          font-weight: 700; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 0.5rem;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-primary-glow:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(37, 99, 235, 0.4);
        }
        .btn-close { border: none; background: transparent; color: white; cursor: pointer; opacity: 0.7; }
        .btn-close:hover { opacity: 1; }

        .ai-advisor-panel {
          background: linear-gradient(135deg, #f8fafc, #eff6ff);
          border: 1px solid #dbeafe;
          padding: 1.25rem;
          margin-bottom: 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          border-radius: 12px;
          position: relative;
          overflow: hidden;
        }

        .ai-advisor-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
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
        .advisor-header .title { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 0.7rem; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.05em; }
        
        .confidence-pill { 
          display: flex; 
          align-items: center; 
          gap: 4px; 
          background: #dcfce7; 
          color: #166534; 
          font-size: 0.625rem; 
          font-weight: 800; 
          padding: 4px 10px; 
          border-radius: 100px; 
        }

        .advisor-loading { font-size: 0.8125rem; color: #64748b; font-style: italic; animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .ai-summary { font-size: 0.8125rem; color: #1e293b; line-height: 1.5; margin: 0; font-weight: 500; }
        .ai-recommendation { font-size: 0.75rem; color: #2563eb; background: rgba(37, 99, 235, 0.08); padding: 0.625rem 0.875rem; border-radius: 8px; font-weight: 600; border-left: 3px solid #2563eb; }
      `}</style>
        </div >
    );
};

export default RateAnalysisModal;
