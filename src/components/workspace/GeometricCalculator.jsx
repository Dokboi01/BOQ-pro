import React, { useState } from 'react';
import { X, Calculator, Square, Triangle, Circle, Layers, CheckCircle2, CircleDot, ChevronRight, Pyramid } from 'lucide-react';

const GeometricCalculator = ({ onApply, onClose }) => {
    const [shape, setShape] = useState('rectangular');
    const [params, setParams] = useState({
        length: 0,
        width: 0,
        height: 0,
        depth: 0,
        radius: 0,
        innerRadius: 0,
        topWidth: 0,
        bottomWidth: 0,
        base: 0,
        sections: 1
    });

    const shapes = [
        {
            id: 'rectangular',
            label: 'Rectangular Volume',
            icon: Square,
            fields: ['length', 'width', 'depth', 'sections'],
            formula: 'V = L × W × D × N'
        },
        {
            id: 'circular',
            label: 'Circular Column',
            icon: Circle,
            fields: ['radius', 'height', 'sections'],
            formula: 'V = π × r² × H × N'
        },
        {
            id: 'trapezoidal',
            label: 'Trapezoidal Drain',
            icon: Layers,
            fields: ['length', 'topWidth', 'bottomWidth', 'depth', 'sections'],
            formula: 'V = ((W₁ + W₂) / 2) × D × L × N'
        },
        {
            id: 'triangular',
            label: 'Triangular Prism',
            icon: Triangle,
            fields: ['length', 'base', 'height', 'sections'],
            formula: 'V = 0.5 × B × H × L × N'
        },
        {
            id: 'pipe',
            label: 'Circular Pipe',
            icon: CircleDot,
            fields: ['length', 'radius', 'innerRadius', 'sections'],
            formula: 'V = π × (R² - r²) × L × N'
        },
        {
            id: 'cone',
            label: 'Conical Pile',
            icon: Pyramid,
            fields: ['radius', 'height', 'sections'],
            formula: 'V = (1/3) × π × r² × H × N'
        },
    ];

    const getVolume = () => {
        let vol = 0;
        const {
            length, width, depth, height, radius,
            innerRadius, topWidth, bottomWidth, base, sections
        } = params;

        switch (shape) {
            case 'rectangular':
                vol = (length || 0) * (width || 0) * (depth || 0);
                break;
            case 'circular':
                vol = Math.PI * Math.pow(radius || 0, 2) * (height || 0);
                break;
            case 'trapezoidal':
                vol = ((Number(topWidth || 0) + Number(bottomWidth || 0)) / 2) * (depth || 0) * (length || 0);
                break;
            case 'triangular':
                vol = 0.5 * (base || 0) * (height || 0) * (length || 0);
                break;
            case 'pipe':
                vol = Math.PI * (Math.pow(radius || 0, 2) - Math.pow(innerRadius || 0, 2)) * (length || 0);
                break;
            case 'cone':
                vol = (1 / 3) * Math.PI * Math.pow(radius || 0, 2) * (height || 0);
                break;
            default:
                vol = 0;
        }

        return vol * (sections || 1);
    };

    const result = getVolume().toFixed(3);

    const handleApply = () => {
        onApply(Number(result));
        onClose();
    };

    const currentShape = shapes.find(s => s.id === shape);

    return (
        <div className="geo-calc-overlay">
            <div className="geo-calc-modal enterprise-card view-slide-up">
                <header className="geo-header">
                    <div className="header-title">
                        <Calculator size={20} className="text-secondary" />
                        <h3>Geometric Real-Time Takeoff</h3>
                    </div>
                    <button className="btn-close" onClick={onClose}><X size={20} /></button>
                </header>

                <div className="shape-selector">
                    {shapes.map(s => (
                        <button
                            key={s.id}
                            className={`shape-btn ${shape === s.id ? 'active' : ''}`}
                            onClick={() => setShape(s.id)}
                        >
                            <s.icon size={18} />
                            <span>{s.label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>

                <div className="calc-body">
                    <div className="formula-preview">
                        <span className="formula-label">Current Formula:</span>
                        <code className="formula-code">{currentShape.formula}</code>
                    </div>

                    <div className="input-grid">
                        {currentShape.fields.map(field => (
                            <div key={field} className="form-item">
                                <label>{field.replace(/([A-Z])/g, ' $1').toUpperCase()} (m)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={params[field] || ''}
                                    onChange={(e) => {
                                        const val = Math.max(0, Number(e.target.value));
                                        setParams(prev => ({ ...prev, [field]: val }));
                                    }}
                                    className="geo-input"
                                    placeholder="0.00"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="result-area-new">
                        <div className="result-header">
                            <CheckCircle2 size={16} className="text-success" />
                            <span>COMPUTED NET VOLUME</span>
                        </div>
                        <div className="result-display">
                            <span className="result-val">{result}</span>
                            <span className="result-unit">m³</span>
                        </div>
                    </div>
                </div>

                <footer className="geo-footer">
                    <button className="btn-cancel" onClick={onClose}>Discard Changes</button>
                    <button className="btn-apply-main" onClick={handleApply}>
                        Confirm & Apply <ChevronRight size={18} />
                    </button>
                </footer>
            </div>

            <style jsx="true">{`
        .geo-calc-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .geo-calc-modal {
          width: 520px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .geo-header {
          padding: 1.25rem 1.5rem;
          background: #0f172a;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-title { display: flex; align-items: center; gap: 0.75rem; }
        .header-title h3 { font-size: 0.9rem; margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }

        .shape-selector {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          padding: 0.75rem;
          background: #f1f5f9;
          gap: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .shape-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          padding: 0.75rem 0.25rem;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: #64748b;
        }

        .shape-btn span { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; }
        .shape-btn:hover { border-color: #3b82f6; background: #f8fafc; }
        .shape-btn.active { border-color: #3b82f6; background: #eff6ff; color: #3b82f6; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2); }

        .calc-body { padding: 1.5rem; }

        .formula-preview {
          background: #f8fafc;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border: 1px dashed #cbd5e1;
        }

        .formula-label { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
        .formula-code { font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0f172a; font-weight: 700; }

        .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
        
        .form-item { display: flex; flex-direction: column; gap: 0.4rem; }
        .form-item label { font-size: 0.65rem; font-weight: 800; color: #475569; letter-spacing: 0.025em; }
        
        .geo-input {
          padding: 0.625rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          outline: none;
          background: #f8fafc;
          transition: all 0.2s;
        }

        .geo-input:focus { border-color: #3b82f6; background: white; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }

        .result-area-new {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding: 1.5rem;
          border-radius: 12px;
          color: white;
          text-align: center;
        }

        .result-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.7rem;
          font-weight: 800;
          color: #94a3b8;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
        }

        .result-display { display: flex; align-items: baseline; justify-content: center; gap: 0.5rem; }
        .result-val { font-size: 2.5rem; font-weight: 900; letter-spacing: -0.025em; }
        .result-unit { font-size: 1rem; font-weight: 700; color: #3b82f6; }

        .geo-footer { padding: 1.25rem 1.5rem; display: flex; gap: 1rem; border-top: 1px solid #e2e8f0; background: #f8fafc; }
        
        .btn-cancel { 
            flex: 1;
            background: white; 
            border: 1px solid #e2e8f0; 
            padding: 0.75rem; 
            border-radius: 8px; 
            font-weight: 700; 
            color: #64748b;
            cursor: pointer; 
            transition: all 0.2s;
        }
        .btn-cancel:hover { background: #f1f5f9; color: #0f172a; }

        .btn-apply-main { 
            flex: 2;
            background: #2563eb; 
            color: white; 
            border: none; 
            padding: 0.75rem; 
            border-radius: 8px; 
            font-weight: 700; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 0.5rem; 
            cursor: pointer; 
            box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
            transition: all 0.2s;
        }
        .btn-apply-main:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.4); }

        .btn-close { border: none; background: transparent; color: white; opacity: 0.7; cursor: pointer; transition: all 0.2s; }
        .btn-close:hover { opacity: 1; transform: rotate(90deg); }

        .text-success { color: #22c55e; }
        .text-secondary { color: #3b82f6; }
      `}</style>
        </div>
    );
};

export default GeometricCalculator;
