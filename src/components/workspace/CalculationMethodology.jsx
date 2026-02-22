import React, { useState } from 'react';
import {
    BookOpen, Package, HardHat, Wrench, Truck, Percent, TrendingUp,
    ChevronDown, ChevronRight, Calculator, AlertTriangle, Info, Globe, Lightbulb
} from 'lucide-react';

const CalculationMethodology = () => {
    const [openStep, setOpenStep] = useState(null);

    const toggle = (step) => setOpenStep(prev => prev === step ? null : step);

    const steps = [
        {
            num: 1,
            title: 'Material Cost',
            icon: <Package size={18} />,
            color: '#059669',
            formula: 'Material Rate = Quantity of Material × Unit Price',
            description: 'Calculate the cost of all materials required per unit of work. Each material is priced individually based on current market survey prices.',
            example: {
                title: 'Example: Concrete 1m³ (Grade 40)',
                rows: [
                    { item: 'OPC Cement (50kg bags)', qty: '8 bags', rate: '₦9,000', amount: '₦72,000' },
                    { item: 'Sharp Sand', qty: '0.5 m³', rate: '₦7,000', amount: '₦3,500' },
                    { item: 'Granite (20mm)', qty: '0.8 m³', rate: '₦12,000', amount: '₦9,600' },
                    { item: 'Water', qty: 'Lump sum', rate: '—', amount: '₦2,000' },
                ],
                total: '₦87,100'
            },
            tips: [
                'Always use current market survey prices, not assumptions',
                'Include wastage allowance (typically 5-10%)',
                'Account for delivery costs if not covered under Transport',
            ]
        },
        {
            num: 2,
            title: 'Labour Cost',
            icon: <HardHat size={18} />,
            color: '#d97706',
            formula: 'Labour Rate per Unit = Total Daily Labour Cost ÷ Daily Output',
            description: 'Determine the labour required per unit of work. This uses productivity rates — the amount of work a crew can complete in one day — to calculate the labour cost per unit.',
            example: {
                title: 'Example: Casting 1m³ Concrete',
                rows: [
                    { item: 'Mason (1 No.)', qty: '1 day', rate: '₦8,000', amount: '₦8,000' },
                    { item: 'Labourers (2 No.)', qty: '1 day', rate: '₦6,000 each', amount: '₦12,000' },
                ],
                total: '₦20,000 / day',
                outputNote: 'Daily Output = 5m³ → Labour rate per m³ = ₦20,000 ÷ 5 = ₦4,000/m³'
            },
            tips: [
                'Use productivity rates based on experience, not guesswork',
                'Adjust for weather conditions and access constraints',
                'Include foreman/supervisor costs in the crew',
            ]
        },
        {
            num: 3,
            title: 'Plant & Equipment',
            icon: <Wrench size={18} />,
            color: '#7c3aed',
            formula: 'Plant Rate per Unit = Daily Equipment Cost ÷ Daily Output',
            description: 'Include the cost of all plant and equipment needed: mixers, vibrators, compactors, excavators, etc. For heavy civil works, this becomes a very significant cost component.',
            example: {
                title: 'Example: Equipment for Concrete Works',
                rows: [
                    { item: 'Concrete Mixer (350L)', qty: '1 day', rate: '₦15,000', amount: '₦15,000' },
                    { item: 'Poker Vibrator', qty: '1 day', rate: '₦5,000', amount: '₦5,000' },
                    { item: 'Fuel (Diesel)', qty: 'Lump sum', rate: '—', amount: '₦4,000' },
                ],
                total: '₦24,000 / day',
                outputNote: 'Daily Output = 5m³ → Plant rate per m³ = ₦24,000 ÷ 5 = ₦4,800/m³'
            },
            tips: [
                'Include fuel and maintenance costs',
                'For hired equipment, use the hire rate per day',
                'For owned equipment, calculate depreciation + running costs',
                'Heavy civil works (filling, excavation) have higher plant costs',
            ]
        },
        {
            num: 4,
            title: 'Transportation',
            icon: <Truck size={18} />,
            color: '#0284c7',
            formula: 'Transport Cost = Cost per Trip × Number of Trips ÷ Volume',
            description: 'Calculate haulage costs separately. This covers the cost of transporting materials to site, including truck hire, fuel, and distance-based pricing.',
            example: {
                title: 'Example: Laterite Haulage',
                rows: [
                    { item: '10-wheel Tipper Truck', qty: '1 trip', rate: '₦35,000', amount: '₦35,000' },
                    { item: 'Truck Capacity', qty: '10 m³', rate: '—', amount: '—' },
                ],
                total: 'Cost per m³ = ₦35,000 ÷ 10 = ₦3,500/m³',
                outputNote: 'Adjust for haul distance — longer distances increase cost per trip'
            },
            tips: [
                'Consider round-trip distance and time',
                'Account for waiting time at loading/unloading points',
                'Multiple trips may be needed for large volumes',
                'Factor in road conditions and accessibility',
            ]
        },
        {
            num: 5,
            title: 'Overheads',
            icon: <Percent size={18} />,
            color: '#dc2626',
            formula: 'Overhead Amount = Overhead % × Prime Cost',
            description: 'Overheads cover indirect costs that cannot be allocated to a specific work item. These are typically applied as a percentage of the Prime Cost (Materials + Labour + Plant + Transport).',
            example: {
                title: 'Typical Overhead Inclusions',
                rows: [
                    { item: 'Site Supervision', qty: '—', rate: '—', amount: 'Included' },
                    { item: 'Site Security', qty: '—', rate: '—', amount: 'Included' },
                    { item: 'Temporary Works (formwork, scaffolding)', qty: '—', rate: '—', amount: 'Included' },
                    { item: 'Office & Administrative Expenses', qty: '—', rate: '—', amount: 'Included' },
                    { item: 'Insurance & Bonds', qty: '—', rate: '—', amount: 'Included' },
                ],
                total: 'Typical Range: 5% – 15% of Prime Cost'
            },
            tips: [
                'Small projects: 10-15% overhead',
                'Large projects: 5-8% (economy of scale)',
                'Remote sites: higher overheads due to logistics',
            ]
        },
        {
            num: 6,
            title: 'Profit & Risk',
            icon: <TrendingUp size={18} />,
            color: '#ea580c',
            formula: 'Profit Amount = Profit % × (Prime Cost + Overheads)',
            description: 'Profit margin is the contractor\'s reward for undertaking the work. Risk premium accounts for unforeseen circumstances. Applied to the sum of Prime Cost and Overheads.',
            example: {
                title: 'Profit Margin Guidelines',
                rows: [
                    { item: 'Government Jobs (low risk)', qty: '—', rate: '—', amount: '5 – 10%' },
                    { item: 'Private Jobs (standard)', qty: '—', rate: '—', amount: '10 – 15%' },
                    { item: 'Complex/High-Risk Projects', qty: '—', rate: '—', amount: '15 – 20%' },
                    { item: 'Coastal/Marine Works', qty: '—', rate: '—', amount: '20 – 25%' },
                ],
                total: 'Higher risk = Higher profit margin'
            },
            tips: [
                'Negotiate based on project complexity and market conditions',
                'Consider contract type (lump sum vs. remeasurement)',
                'Factor in payment terms and cash flow risk',
            ]
        },
    ];

    return (
        <div className="calc-method-container">
            {/* Hero */}
            <div className="cm-hero">
                <div className="cm-hero-content">
                    <div className="cm-hero-badge"><BookOpen size={14} /> Professional QS Reference</div>
                    <h1>Rate Analysis Methodology</h1>
                    <p>The standard 6-step professional rate build-up used in BOQ Pro, based on Nigerian construction industry practice.</p>
                </div>
            </div>

            {/* Master Formula */}
            <div className="cm-master-formula">
                <div className="cm-formula-header">
                    <Calculator size={16} />
                    <span>Master Formula</span>
                </div>
                <div className="cm-formula-body">
                    <code>Unit Rate = Prime Cost + Overhead% + Profit%</code>
                    <div className="cm-formula-sub">
                        Where: <strong>Prime Cost</strong> = Materials + Labour + Plant & Equipment + Transport
                    </div>
                </div>
            </div>

            {/* Steps */}
            <div className="cm-steps">
                {steps.map(step => (
                    <div key={step.num} className={`cm-step ${openStep === step.num ? 'open' : ''}`}>
                        <div className="cm-step-header" onClick={() => toggle(step.num)}>
                            <div className="cm-step-left">
                                <span className="cm-step-badge" style={{ background: step.color }}>{step.num}</span>
                                <span className="cm-step-icon" style={{ color: step.color }}>{step.icon}</span>
                                <span className="cm-step-title">{step.title}</span>
                            </div>
                            <div className="cm-step-right">
                                <code className="cm-step-formula">{step.formula}</code>
                                {openStep === step.num ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </div>
                        </div>
                        {openStep === step.num && (
                            <div className="cm-step-body">
                                <p className="cm-step-desc">{step.description}</p>
                                {/* Example Table */}
                                <div className="cm-example">
                                    <div className="cm-example-title">{step.example.title}</div>
                                    <table className="cm-example-table">
                                        <thead>
                                            <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
                                        </thead>
                                        <tbody>
                                            {step.example.rows.map((row, i) => (
                                                <tr key={i}>
                                                    <td>{row.item}</td>
                                                    <td>{row.qty}</td>
                                                    <td>{row.rate}</td>
                                                    <td className="cm-amount">{row.amount}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr><td colSpan="4" className="cm-example-total">{step.example.total}</td></tr>
                                        </tfoot>
                                    </table>
                                    {step.example.outputNote && (
                                        <div className="cm-output-note">
                                            <Info size={12} /> {step.example.outputNote}
                                        </div>
                                    )}
                                </div>
                                {/* Tips */}
                                <div className="cm-tips">
                                    <div className="cm-tips-header"><Lightbulb size={14} /> Professional Tips</div>
                                    <ul>
                                        {step.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Worked Example */}
            <div className="cm-worked-example">
                <div className="cm-we-header">
                    <Calculator size={16} />
                    <span>Complete Worked Example</span>
                </div>
                <div className="cm-we-subtitle">Concrete Works — Rate per 1m³ (Grade 25)</div>
                <table className="cm-we-table">
                    <thead>
                        <tr><th>Component</th><th>Cost (₦)</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>① Materials</td><td className="cm-amount">120,000</td></tr>
                        <tr><td>② Labour</td><td className="cm-amount">25,000</td></tr>
                        <tr><td>③ Plant & Equipment</td><td className="cm-amount">15,000</td></tr>
                        <tr><td>④ Transport</td><td className="cm-amount">10,000</td></tr>
                        <tr className="cm-we-prime"><td>Prime Cost</td><td className="cm-amount">170,000</td></tr>
                        <tr><td>⑤ Overheads (10%)</td><td className="cm-amount">17,000</td></tr>
                        <tr><td>⑥ Profit & Risk (15%)</td><td className="cm-amount">28,050</td></tr>
                    </tbody>
                    <tfoot>
                        <tr className="cm-we-final"><td>Final Unit Rate</td><td>₦215,050 / m³</td></tr>
                    </tfoot>
                </table>
            </div>

            {/* Regional Adjustments */}
            <div className="cm-regional">
                <div className="cm-regional-header">
                    <Globe size={16} />
                    <span>Regional Adjustment Factors</span>
                </div>
                <p className="cm-regional-desc">Rates vary by location due to material availability, labour costs, and transport distances. BOQ Pro automatically applies these modifiers.</p>
                <div className="cm-region-grid">
                    {[
                        { name: 'Lagos', factor: '1.00x', note: 'Base rate' },
                        { name: 'Abuja', factor: '1.05x', note: '+5% premium' },
                        { name: 'Port Harcourt', factor: '1.08x', note: '+8% premium' },
                        { name: 'Ibadan', factor: '0.92x', note: '-8% lower' },
                        { name: 'Kano', factor: '0.90x', note: '-10% lower' },
                    ].map(r => (
                        <div key={r.name} className="cm-region-card">
                            <span className="cm-region-name">{r.name}</span>
                            <span className="cm-region-factor">{r.factor}</span>
                            <span className="cm-region-note">{r.note}</span>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx="true">{`
        .calc-method-container {
          height: calc(100vh - 56px);
          overflow-y: auto;
          background: #f8fafc;
          padding: 0;
        }

        /* Hero */
        .cm-hero {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
          padding: 2.5rem 2rem 2rem;
        }
        .cm-hero-badge {
          display: inline-flex; align-items: center; gap: 0.375rem;
          font-size: 0.625rem; font-weight: 800; text-transform: uppercase;
          color: #93c5fd; letter-spacing: 0.06em; margin-bottom: 0.75rem;
        }
        .cm-hero h1 { font-size: 1.5rem; font-weight: 900; margin: 0 0 0.5rem; }
        .cm-hero p { font-size: 0.8125rem; color: rgba(255,255,255,0.6); margin: 0; max-width: 600px; line-height: 1.5; }

        /* Master Formula */
        .cm-master-formula {
          margin: 1.5rem 2rem 0;
          background: white;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        .cm-formula-header {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #f0f4ff;
          font-weight: 800; font-size: 0.6875rem;
          color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
        }
        .cm-formula-body { padding: 1.25rem 1rem; }
        .cm-formula-body code {
          font-size: 1rem; font-weight: 800; color: #0f172a;
          font-family: 'SF Mono', 'Fira Code', monospace;
          background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 6px;
          display: block; margin-bottom: 0.75rem;
        }
        .cm-formula-sub { font-size: 0.75rem; color: #64748b; }

        /* Steps */
        .cm-steps { padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .cm-step {
          background: white;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          transition: box-shadow 0.2s;
        }
        .cm-step.open { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .cm-step-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.875rem 1rem;
          cursor: pointer;
          transition: background 0.15s;
        }
        .cm-step-header:hover { background: #f8fafc; }
        .cm-step-left { display: flex; align-items: center; gap: 0.5rem; }
        .cm-step-right { display: flex; align-items: center; gap: 0.75rem; color: #94a3b8; }
        .cm-step-badge {
          display: inline-flex; align-items: center; justify-content: center;
          width: 24px; height: 24px; border-radius: 50%;
          color: white; font-size: 0.6875rem; font-weight: 900; flex-shrink: 0;
        }
        .cm-step-title { font-weight: 800; font-size: 0.875rem; color: #1e293b; }
        .cm-step-formula {
          font-size: 0.6875rem; font-weight: 600;
          color: #64748b; background: #f1f5f9;
          padding: 3px 8px; border-radius: 4px;
          font-family: monospace;
        }

        .cm-step-body { padding: 0 1rem 1.25rem; border-top: 1px solid #f1f5f9; }
        .cm-step-desc { font-size: 0.8125rem; color: #475569; line-height: 1.6; margin: 1rem 0; }

        /* Example Table */
        .cm-example {
          background: #f8fafc; border-radius: 8px;
          padding: 1rem; margin-bottom: 1rem;
          border: 1px solid #e2e8f0;
        }
        .cm-example-title { font-weight: 800; font-size: 0.6875rem; color: #1e293b; text-transform: uppercase; margin-bottom: 0.75rem; letter-spacing: 0.04em; }
        .cm-example-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        .cm-example-table th {
          text-align: left; padding: 0.375rem 0.5rem;
          font-size: 0.5625rem; font-weight: 800; color: #94a3b8;
          text-transform: uppercase; letter-spacing: 0.06em;
          border-bottom: 1px solid #e2e8f0;
        }
        .cm-example-table td {
          padding: 0.375rem 0.5rem; border-bottom: 1px solid #f1f5f9;
          color: #334155;
        }
        .cm-amount { font-weight: 700; color: #1e293b; text-align: right; }
        .cm-example-total {
          font-weight: 900; color: #2563eb; padding-top: 0.5rem !important;
          font-size: 0.875rem;
        }
        .cm-output-note {
          display: flex; align-items: center; gap: 0.375rem;
          font-size: 0.6875rem; color: #2563eb; font-weight: 600;
          margin-top: 0.75rem; background: rgba(37,99,235,0.06);
          padding: 0.5rem 0.75rem; border-radius: 6px;
        }

        /* Tips */
        .cm-tips { }
        .cm-tips-header {
          display: flex; align-items: center; gap: 0.375rem;
          font-weight: 800; font-size: 0.6875rem; color: #d97706;
          text-transform: uppercase; margin-bottom: 0.5rem;
        }
        .cm-tips ul { margin: 0; padding-left: 1.25rem; }
        .cm-tips li { font-size: 0.75rem; color: #475569; margin-bottom: 0.25rem; line-height: 1.4; }

        /* Worked Example */
        .cm-worked-example {
          margin: 0 2rem 1.5rem;
          background: white;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        .cm-we-header {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white; font-weight: 800; font-size: 0.6875rem;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .cm-we-subtitle {
          padding: 0.625rem 1rem;
          font-size: 0.75rem; font-weight: 700; color: #64748b;
          border-bottom: 1px solid #e2e8f0;
        }
        .cm-we-table { width: 100%; border-collapse: collapse; }
        .cm-we-table th {
          text-align: left; padding: 0.5rem 1rem;
          font-size: 0.5625rem; font-weight: 800; color: #94a3b8;
          text-transform: uppercase; border-bottom: 1px solid #e2e8f0;
        }
        .cm-we-table td { padding: 0.5rem 1rem; border-bottom: 1px solid #f1f5f9; font-size: 0.8125rem; color: #334155; }
        .cm-we-prime td { font-weight: 900; color: #1e293b; background: #f0f4ff; border-top: 2px solid #e2e8f0; }
        .cm-we-final td { font-weight: 900; font-size: 1rem; color: white; background: #0f172a; padding: 0.875rem 1rem; }

        /* Regional */
        .cm-regional {
          margin: 0 2rem 2rem;
          background: white;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem;
        }
        .cm-regional-header {
          display: flex; align-items: center; gap: 0.5rem;
          font-weight: 800; font-size: 0.6875rem; color: #1e3a8a;
          text-transform: uppercase; margin-bottom: 0.75rem;
        }
        .cm-regional-desc { font-size: 0.75rem; color: #64748b; margin: 0 0 1rem; line-height: 1.5; }
        .cm-region-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.5rem; }
        .cm-region-card {
          display: flex; flex-direction: column; align-items: center;
          padding: 0.75rem; border-radius: 8px;
          background: #f8fafc; border: 1px solid #e2e8f0;
          text-align: center;
        }
        .cm-region-name { font-weight: 800; font-size: 0.75rem; color: #1e293b; }
        .cm-region-factor { font-size: 1.125rem; font-weight: 900; color: #2563eb; margin: 0.25rem 0; }
        .cm-region-note { font-size: 0.625rem; color: #64748b; }

        @media (max-width: 768px) {
          .cm-hero { padding: 1.5rem 1rem; }
          .cm-hero h1 { font-size: 1.25rem; }
          .cm-master-formula, .cm-steps, .cm-worked-example, .cm-regional { margin-left: 0.75rem; margin-right: 0.75rem; }
          .cm-step-formula { display: none; }
        }
      `}</style>
        </div>
    );
};

export default CalculationMethodology;
