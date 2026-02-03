import React, { useState } from 'react';
import { X, Calculator, Square, Triangle, Circle, Layers, CheckCircle2 } from 'lucide-react';

const GeometricCalculator = ({ onApply, onClose }) => {
    const [shape, setShape] = useState('rectangular');
    const [params, setParams] = useState({ length: 0, width: 0, height: 0, depth: 0, radius: 0, sections: 1 });
    const [result, setResult] = useState(0);

    const shapes = [
        { id: 'rectangular', label: 'Rectangular Volume', icon: Square, fields: ['length', 'width', 'depth', 'sections'] },
        { id: 'circular', label: 'Circular Column', icon: Circle, fields: ['radius', 'height', 'sections'] },
        { id: 'trapezoidal', label: 'Trapezoidal Drain', icon: Layers, fields: ['length', 'topWidth', 'bottomWidth', 'depth', 'sections'] },
    ];

    const calculateVolume = () => {
        let vol = 0;
        const { length, width, depth, height, radius, topWidth, bottomWidth, sections } = params;

        switch (shape) {
            case 'rectangular':
                vol = length * width * depth;
                break;
            case 'circular':
                vol = Math.PI * Math.pow(radius, 2) * height;
                break;
            case 'trapezoidal':
                vol = ((Number(topWidth) + Number(bottomWidth)) / 2) * depth * length;
                break;
            default:
                vol = 0;
        }

        const final = vol * (sections || 1);
        setResult(final.toFixed(3));
    };

    const handleApply = () => {
        onApply(Number(result));
        onClose();
    };

    return (
        <div className="geo-calc-overlay">
            <div className="geo-calc-modal enterprise-card view-slide-up">
                <header className="geo-header">
                    <div className="header-title">
                        <Calculator size={20} className="text-accent" />
                        <h3>Geometric Takeoff Calculator</h3>
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
                            <s.icon size={20} />
                            <span>{s.label}</span>
                        </button>
                    ))}
                </div>

                <div className="calc-body">
                    <div className="input-grid">
                        {shapes.find(s => s.id === shape).fields.map(field => (
                            <div key={field} className="form-item">
                                <label>{field.charAt(0).toUpperCase() + field.slice(1)} (m)</label>
                                <input
                                    type="number"
                                    value={params[field] || ''}
                                    onChange={(e) => {
                                        const next = { ...params, [field]: Number(e.target.value) };
                                        setParams(next);
                                    }}
                                    className="geo-input"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="result-area">
                        <button className="btn-calculate" onClick={calculateVolume}>Compute Takeoff</button>
                        <div className="computed-val">
                            <span className="label">RESULTING QUANTITY</span>
                            <span className="val">{result} m³</span>
                        </div>
                    </div>
                </div>

                <footer className="geo-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary-glow" onClick={handleApply}>
                        <CheckCircle2 size={18} /> Apply to BOQ Item
                    </button>
                </footer>
            </div>

            <style jsx="true">{`
        .geo-calc-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
        }

        .geo-calc-modal {
          width: 500px;
          background: white;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .geo-header {
          padding: 1.5rem;
          background: #0f172a;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-title { display: flex; align-items: center; gap: 0.75rem; }
        .header-title h3 { font-size: 1rem; margin: 0; }

        .shape-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          padding: 1rem;
          background: #f8fafc;
          gap: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .shape-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 0.5rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .shape-btn span { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; text-align: center; }
        .shape-btn.active { border-color: #2563eb; background: #eff6ff; color: #2563eb; }

        .calc-body { padding: 2rem; }
        .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
        
        .form-item { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-item label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
        
        .geo-input {
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-weight: 700;
          font-size: 1rem;
          outline: none;
        }

        .geo-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

        .result-area {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          background: #f1f5f9;
          border-radius: 8px;
        }

        .btn-calculate {
          background: #1e293b;
          color: white;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
        }

        .computed-val { display: flex; flex-direction: column; align-items: flex-end; }
        .computed-val .label { font-size: 0.625rem; font-weight: 800; color: #64748b; }
        .computed-val .val { font-size: 1.5rem; font-weight: 900; color: #2563eb; }

        .geo-footer { padding: 1.5rem; display: flex; gap: 1rem; border-top: 1px solid #e2e8f0; background: #f8fafc; }
        .geo-footer button { flex: 1; }
        
        .btn-secondary { background: white; border: 1px solid #e2e8f0; padding: 0.75rem; border-radius: 6px; font-weight: 700; cursor: pointer; }
        .btn-primary-glow { background: #2563eb; color: white; border: none; padding: 0.75rem; border-radius: 6px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
        .btn-close { border: none; background: transparent; color: white; opacity: 0.7; cursor: pointer; }
      `}</style>
        </div>
    );
};

export default GeometricCalculator;
