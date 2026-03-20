import React, { useMemo, useState } from 'react';
import {
  X,
  Calculator,
  Square,
  Triangle,
  Circle,
  Layers,
  CheckCircle2,
  CircleDot,
  ChevronRight,
  Pyramid,
  Ruler
} from 'lucide-react';

const normalizeUnit = (unit = '') => {
  const value = String(unit).toLowerCase().replace(/\s+/g, '');
  if (/(m³|m3|cum|cubic)/.test(value)) return 'm3';
  if (/(m²|m2|sqm|sq\.m|square)/.test(value)) return 'm2';
  if (/^(m|lm|rm|linm|mtr|meter|metre)$/.test(value)) return 'm';
  if (/^(nr|no|nos|pcs|pc|item|sum)$/i.test(String(unit).trim().toLowerCase())) return 'nr';
  return 'm3';
};

const FIELD_META = {
  length: { label: 'Length', unit: 'm' },
  width: { label: 'Width', unit: 'm' },
  height: { label: 'Height', unit: 'm' },
  depth: { label: 'Depth', unit: 'm' },
  radius: { label: 'Radius', unit: 'm' },
  innerRadius: { label: 'Inner Radius', unit: 'm' },
  topWidth: { label: 'Top Width', unit: 'm' },
  bottomWidth: { label: 'Bottom Width', unit: 'm' },
  base: { label: 'Base', unit: 'm' },
  thickness: { label: 'Thickness', unit: 'm' },
  footingWidth: { label: 'Footing Width', unit: 'm' },
  footingDepth: { label: 'Footing Depth', unit: 'm' },
  sections: { label: 'No. of Sections', unit: 'nr' },
  allowance: { label: 'Allowance', unit: '%' },
};

const SHAPES = {
  m: [
    { id: 'linear-run', label: 'Linear Run', icon: Ruler, fields: ['length', 'sections'], formula: 'Q = L x N' },
    { id: 'perimeter', label: 'Perimeter', icon: Square, fields: ['length', 'width', 'sections'], formula: 'Q = 2 x (L + W) x N' },
    { id: 'circular-run', label: 'Circular Perimeter', icon: Circle, fields: ['radius', 'sections'], formula: 'Q = 2 x pi x r x N' },
  ],
  m2: [
    { id: 'rectangle-area', label: 'Rectangle Area', icon: Square, fields: ['length', 'width', 'sections'], formula: 'Q = L x W x N' },
    { id: 'wall-area', label: 'Wall Face', icon: Layers, fields: ['length', 'height', 'sections'], formula: 'Q = L x H x N' },
    { id: 'circle-area', label: 'Circular Area', icon: Circle, fields: ['radius', 'sections'], formula: 'Q = pi x r² x N' },
    { id: 'trapezoid-area', label: 'Trapezoid Area', icon: Triangle, fields: ['topWidth', 'bottomWidth', 'height', 'sections'], formula: 'Q = ((W1 + W2) / 2) x H x N' },
  ],
  m3: [
    { id: 'rectangular', label: 'Rectangular Volume', icon: Square, fields: ['length', 'width', 'depth', 'sections'], formula: 'Q = L x W x D x N' },
    { id: 'circular', label: 'Circular Column', icon: Circle, fields: ['radius', 'height', 'sections'], formula: 'Q = pi x r² x H x N' },
    { id: 'trapezoidal', label: 'Trapezoidal Drain', icon: Layers, fields: ['length', 'topWidth', 'bottomWidth', 'depth', 'sections'], formula: 'Q = ((W1 + W2) / 2) x D x L x N' },
    { id: 'triangular', label: 'Triangular Prism', icon: Triangle, fields: ['length', 'base', 'height', 'sections'], formula: 'Q = 0.5 x B x H x L x N' },
    { id: 'pipe', label: 'Pipe / Ring', icon: CircleDot, fields: ['length', 'radius', 'innerRadius', 'sections'], formula: 'Q = pi x (R² - r²) x L x N' },
    { id: 'cone', label: 'Circular Cone', icon: Pyramid, fields: ['radius', 'height', 'sections'], formula: 'Q = (1/3) x pi x r² x H x N' },
    { id: 'culvert', label: 'Box Culvert', icon: Square, fields: ['length', 'width', 'height', 'thickness', 'sections'], formula: 'Q = (Outer Vol - Inner Vol) x N' },
    { id: 'abutment', label: 'T-Wall / Abutment', icon: Layers, fields: ['length', 'height', 'thickness', 'footingWidth', 'footingDepth', 'sections'], formula: 'Q = (Stem Vol + Footing Vol) x N' },
  ],
  nr: [
    { id: 'count', label: 'Count Units', icon: Calculator, fields: ['sections'], formula: 'Q = N' },
  ],
};

const DEFAULT_PARAMS = {
  length: 0,
  width: 0,
  height: 0,
  depth: 0,
  radius: 0,
  innerRadius: 0,
  topWidth: 0,
  bottomWidth: 0,
  base: 0,
  thickness: 0.2,
  footingWidth: 0,
  footingDepth: 0,
  sections: 1,
  allowance: 0
};

const roundQuantity = (value) => Number((value || 0).toFixed(3));

const GeometricCalculator = ({ item, onApply, onClose }) => {
  const unit = normalizeUnit(item?.unit);
  const availableShapes = SHAPES[unit] || SHAPES.m3;
  const [shape, setShape] = useState(availableShapes[0].id);
  const [params, setParams] = useState(() => ({ ...DEFAULT_PARAMS }));

  const currentShape = useMemo(
    () => availableShapes.find((entry) => entry.id === shape) || availableShapes[0],
    [availableShapes, shape]
  );

  const computeNetQuantity = () => {
    const {
      length,
      width,
      depth,
      height,
      radius,
      innerRadius,
      topWidth,
      bottomWidth,
      base,
      sections,
      thickness,
      footingWidth,
      footingDepth
    } = params;

    const count = Number(sections) || 1;

    switch (shape) {
      case 'linear-run':
        return (Number(length) || 0) * count;
      case 'perimeter':
        return (2 * ((Number(length) || 0) + (Number(width) || 0))) * count;
      case 'circular-run':
        return (2 * Math.PI * (Number(radius) || 0)) * count;
      case 'rectangle-area':
        return (Number(length) || 0) * (Number(width) || 0) * count;
      case 'wall-area':
        return (Number(length) || 0) * (Number(height) || 0) * count;
      case 'circle-area':
        return Math.PI * Math.pow(Number(radius) || 0, 2) * count;
      case 'trapezoid-area':
        return (((Number(topWidth) || 0) + (Number(bottomWidth) || 0)) / 2) * (Number(height) || 0) * count;
      case 'rectangular':
        return (Number(length) || 0) * (Number(width) || 0) * (Number(depth) || 0) * count;
      case 'circular':
        return Math.PI * Math.pow(Number(radius) || 0, 2) * (Number(height) || 0) * count;
      case 'trapezoidal':
        return (((Number(topWidth) || 0) + (Number(bottomWidth) || 0)) / 2) * (Number(depth) || 0) * (Number(length) || 0) * count;
      case 'triangular':
        return 0.5 * (Number(base) || 0) * (Number(height) || 0) * (Number(length) || 0) * count;
      case 'pipe':
        return Math.PI * Math.max(0, Math.pow(Number(radius) || 0, 2) - Math.pow(Number(innerRadius) || 0, 2)) * (Number(length) || 0) * count;
      case 'cone':
        return (1 / 3) * Math.PI * Math.pow(Number(radius) || 0, 2) * (Number(height) || 0) * count;
      case 'culvert': {
        const outerWidth = Number(width) || 0;
        const outerHeight = Number(height) || 0;
        const wallThickness = Number(thickness) || 0;
        const innerWidth = Math.max(0, outerWidth - (2 * wallThickness));
        const innerHeight = Math.max(0, outerHeight - (2 * wallThickness));
        return ((outerWidth * outerHeight) - (innerWidth * innerHeight)) * (Number(length) || 0) * count;
      }
      case 'abutment': {
        const stemVolume = (Number(height) || 0) * (Number(thickness) || 0) * (Number(length) || 0);
        const footingVolume = (Number(footingWidth) || 0) * (Number(footingDepth) || 0) * (Number(length) || 0);
        return (stemVolume + footingVolume) * count;
      }
      case 'count':
        return count;
      default:
        return 0;
    }
  };

  const netQuantity = roundQuantity(computeNetQuantity());
  const adjustedQuantity = roundQuantity(netQuantity * (1 + ((Number(params.allowance) || 0) / 100)));
  const unitLabel = unit === 'nr' ? 'nr' : unit;

  return (
    <div className="geo-calc-overlay">
      <div className="geo-calc-modal enterprise-card view-slide-up">
        <header className="geo-header">
          <div className="header-title">
            <Calculator size={20} className="text-secondary" />
            <div>
              <h3>Measurement Takeoff</h3>
              <p>{item?.description || 'BOQ Item'} · Unit: {item?.unit || unitLabel}</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="shape-selector">
          {availableShapes.map((entry) => (
            <button
              key={entry.id}
              className={`shape-btn ${shape === entry.id ? 'active' : ''}`}
              onClick={() => setShape(entry.id)}
            >
              <entry.icon size={18} />
              <span>{entry.label}</span>
            </button>
          ))}
        </div>

        <div className="calc-body">
          <div className="formula-preview">
            <span className="formula-label">Current Formula</span>
            <code className="formula-code">{currentShape.formula}</code>
          </div>

          <div className="input-grid">
            {currentShape.fields.map((field) => (
              <div key={field} className="form-item">
                <label>{FIELD_META[field].label} ({FIELD_META[field].unit})</label>
                <input
                  type="number"
                  min="0"
                  value={params[field] ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setParams((prev) => ({
                      ...prev,
                      [field]: value === '' ? 0 : Math.max(0, Number(value))
                    }));
                  }}
                  className="geo-input"
                  placeholder="0.00"
                />
              </div>
            ))}

            <div className="form-item">
              <label>{FIELD_META.allowance.label} ({FIELD_META.allowance.unit})</label>
              <input
                type="number"
                min="0"
                value={params.allowance}
                onChange={(e) => setParams((prev) => ({ ...prev, allowance: Math.max(0, Number(e.target.value) || 0) }))}
                className="geo-input highlight"
              />
              <span className="helper-note">Leave at `0` for net BOQ measurement. Use only if you intentionally want an allowance.</span>
            </div>
          </div>

          <div className="result-grid">
            <div className="result-card">
              <div className="result-header">
                <CheckCircle2 size={16} className="text-success" />
                <span>Net Measured Quantity</span>
              </div>
              <div className="result-display">
                <span className="result-val">{netQuantity.toLocaleString()}</span>
                <span className="result-unit">{unitLabel}</span>
              </div>
            </div>

            <div className="result-card accent">
              <div className="result-header">
                <ChevronRight size={16} className="text-secondary" />
                <span>Applied Quantity</span>
              </div>
              <div className="result-display">
                <span className="result-val">{adjustedQuantity.toLocaleString()}</span>
                <span className="result-unit">{unitLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <footer className="geo-footer">
          <button className="btn-cancel" onClick={onClose}>Discard Changes</button>
          <button className="btn-apply-main" onClick={() => { onApply(adjustedQuantity); onClose(); }}>
            Apply Quantity <ChevronRight size={18} />
          </button>
        </footer>
      </div>

      <style jsx="true">{`
        .geo-calc-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .geo-calc-modal {
          width: 640px;
          max-height: 90vh;
          background: white;
          border-radius: 20px;
          box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .geo-header {
          padding: 1.25rem 1.5rem;
          background: #0f172a;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .header-title {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
        }

        .header-title h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 800;
        }

        .header-title p {
          margin: 0.2rem 0 0;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.65);
        }

        .shape-selector {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          padding: 0.75rem;
          background: #f1f5f9;
          gap: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .shape-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.45rem;
          padding: 0.75rem;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #64748b;
          font-size: 0.7rem;
          font-weight: 800;
        }

        .shape-btn.active {
          border-color: #2563eb;
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          color: #2563eb;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .calc-body {
          padding: 1.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .formula-preview {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 10px;
          padding: 0.85rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .formula-label {
          font-size: 0.65rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .formula-code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.9rem;
          color: #0f172a;
          font-weight: 700;
        }

        .input-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .form-item {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-item label {
          font-size: 0.68rem;
          font-weight: 800;
          color: #475569;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .geo-input {
          padding: 0.7rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.95rem;
          background: #f8fafc;
        }

        .geo-input:focus {
          outline: none;
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .geo-input.highlight {
          border-color: #fbbf24;
          background: #fffbeb;
        }

        .helper-note {
          font-size: 0.72rem;
          color: #64748b;
          line-height: 1.4;
        }

        .result-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .result-card {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding: 1.25rem;
          border-radius: 12px;
          color: white;
        }

        .result-card.accent {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
        }

        .result-header {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.68rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.75);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .result-display {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }

        .result-val {
          font-size: 2rem;
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .result-unit {
          font-size: 0.9rem;
          font-weight: 700;
        }

        .geo-footer {
          padding: 1.25rem 1.5rem;
          display: flex;
          gap: 1rem;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .btn-cancel {
          flex: 1;
          background: white;
          border: 1px solid #e2e8f0;
          padding: 0.8rem;
          border-radius: 8px;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
        }

        .btn-apply-main {
          flex: 2;
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          color: white;
          border: none;
          padding: 0.9rem;
          border-radius: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3);
        }

        .btn-close {
          border: none;
          background: transparent;
          color: white;
          opacity: 0.75;
          cursor: pointer;
        }

        .text-success { color: #22c55e; }
        .text-secondary { color: #93c5fd; }

        @media (max-width: 768px) {
          .geo-calc-modal {
            width: calc(100vw - 1rem);
            max-height: 95vh;
          }

          .input-grid,
          .result-grid {
            grid-template-columns: 1fr;
          }

          .geo-footer {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default GeometricCalculator;
