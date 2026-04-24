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
import {
  DEFAULT_TAKEOFF_PARAMS,
  TAKEOFF_FIELD_META,
  computeTakeoffQuantity,
  getTakeoffConfigForItem,
  roundTakeoffQuantity,
} from '../../utils/takeoff';

const ICON_MAP = {
  calculator: Calculator,
  square: Square,
  triangle: Triangle,
  circle: Circle,
  layers: Layers,
  'circle-dot': CircleDot,
  pyramid: Pyramid,
  ruler: Ruler,
  check: CheckCircle2,
};

const GeometricCalculator = ({ item, onApply, onClose }) => {
  const takeoffConfig = useMemo(() => getTakeoffConfigForItem(item), [item]);
  const availableTemplates = useMemo(
    () => takeoffConfig.templates || [],
    [takeoffConfig.templates]
  );
  const savedTemplateId = item?.takeoffMeta?.templateId;
  const initialTemplateId = availableTemplates.some((template) => template.id === savedTemplateId)
    ? savedTemplateId
    : (takeoffConfig.recommendedTemplateId || availableTemplates[0]?.id || 'count-units');

  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [params, setParams] = useState(() => ({
    ...DEFAULT_TAKEOFF_PARAMS,
    ...(item?.takeoffMeta?.params || {}),
    allowance: Number(item?.takeoffMeta?.allowance ?? DEFAULT_TAKEOFF_PARAMS.allowance) || 0,
  }));

  const currentTemplate = useMemo(
    () => availableTemplates.find((template) => template.id === templateId) || availableTemplates[0],
    [availableTemplates, templateId]
  );

  const recommendedTemplate = takeoffConfig.recommendedTemplate || currentTemplate;
  const netQuantity = roundTakeoffQuantity(computeTakeoffQuantity(currentTemplate?.id, params));
  const adjustedQuantity = roundTakeoffQuantity(
    netQuantity * (1 + ((Number(params.allowance) || 0) / 100))
  );

  const updateParam = (fieldId, rawValue) => {
    setParams((prev) => ({
      ...prev,
      [fieldId]: rawValue === '' ? 0 : Math.max(0, Number(rawValue) || 0),
    }));
  };

  return (
    <div className="geo-calc-overlay">
      <div className="geo-calc-modal enterprise-card view-slide-up">
        <header className="geo-header">
          <div className="header-title">
            <Calculator size={20} className="text-secondary" />
            <div>
              <h3>Takeoff Calculator</h3>
              <p>{item?.name || item?.description || 'BOQ Item'} · Unit: {item?.unit || takeoffConfig.primaryFamily}</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="shape-selector">
          {availableTemplates.map((template) => {
            const Icon = ICON_MAP[template.iconKey] || Calculator;
            const isRecommended = template.id === takeoffConfig.recommendedTemplateId;
            return (
              <button
                type="button"
                key={template.id}
                className={`shape-btn ${templateId === template.id ? 'active' : ''}`}
                onClick={() => setTemplateId(template.id)}
              >
                <div className="shape-btn-head">
                  <Icon size={18} />
                  {isRecommended && <span className="shape-badge">Match</span>}
                </div>
                <span>{template.label}</span>
              </button>
            );
          })}
        </div>

        <div className="calc-body">
          <div className="formula-preview">
            <span className="formula-label">Matched Calculator</span>
            <strong className="formula-title">{recommendedTemplate?.label || currentTemplate?.label}</strong>
            <p className="formula-hint">{takeoffConfig.recommendedReason}</p>
          </div>

          <div className="formula-preview formula-preview-current">
            <span className="formula-label">Current Formula</span>
            <code className="formula-code">{currentTemplate?.formula || 'Q = 0'}</code>
          </div>

          <div className="input-grid">
            {(currentTemplate?.fields || []).map((fieldId) => {
              const field = TAKEOFF_FIELD_META[fieldId] || { label: fieldId, unit: '' };
              return (
                <div key={fieldId} className="form-item">
                  <label>{field.label} ({field.unit})</label>
                  <input
                    type="number"
                    min="0"
                    value={params[fieldId] ?? ''}
                    onChange={(e) => updateParam(fieldId, e.target.value)}
                    className="geo-input"
                    placeholder="0.00"
                  />
                </div>
              );
            })}

            <div className="form-item">
              <label>{TAKEOFF_FIELD_META.allowance.label} ({TAKEOFF_FIELD_META.allowance.unit})</label>
              <input
                type="number"
                min="0"
                value={params.allowance}
                onChange={(e) => updateParam('allowance', e.target.value)}
                className="geo-input highlight"
              />
              <span className="helper-note">Leave at `0` for net measurement. Only add allowance when the bill requires it.</span>
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
                <span className="result-unit">{item?.unit || takeoffConfig.primaryFamily}</span>
              </div>
            </div>

            <div className="result-card accent">
              <div className="result-header">
                <ChevronRight size={16} className="text-secondary" />
                <span>Applied Quantity</span>
              </div>
              <div className="result-display">
                <span className="result-val">{adjustedQuantity.toLocaleString()}</span>
                <span className="result-unit">{item?.unit || takeoffConfig.primaryFamily}</span>
              </div>
            </div>
          </div>
        </div>

        <footer className="geo-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>Discard Changes</button>
          <button
            type="button"
            className="btn-apply-main"
            onClick={() => onApply({
              quantity: adjustedQuantity,
              netQuantity,
              templateId: currentTemplate?.id,
              templateLabel: currentTemplate?.label,
              recommendedTemplateId: takeoffConfig.recommendedTemplateId,
              recommendedReason: takeoffConfig.recommendedReason,
              formula: currentTemplate?.formula,
              unitFamilies: takeoffConfig.unitFamilies,
              params,
              allowance: Number(params.allowance) || 0,
              measuredAt: new Date().toISOString(),
            })}
          >
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
          width: 680px;
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
          grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
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
          padding: 0.85rem 0.75rem;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #64748b;
          font-size: 0.72rem;
          font-weight: 800;
        }

        .shape-btn-head {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .shape-badge {
          padding: 0.12rem 0.38rem;
          border-radius: 999px;
          background: #dbeafe;
          color: #2563eb;
          font-size: 0.6rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
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
          gap: 1rem;
        }

        .formula-preview {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 10px;
          padding: 0.9rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .formula-preview-current {
          border-style: solid;
        }

        .formula-label {
          font-size: 0.65rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .formula-title {
          font-size: 0.98rem;
          font-weight: 800;
          color: #0f172a;
        }

        .formula-hint {
          margin: 0;
          color: #475569;
          font-size: 0.8rem;
          line-height: 1.45;
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
