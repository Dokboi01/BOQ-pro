import React from 'react';
import { Calculator, X } from 'lucide-react';
import {
  editableInputsToValueMap,
  evaluateBoqFormulaRate,
  getFormulaDisplayText,
  getUnresolvedFormulaVariables,
  getWorkedExamplePreview,
  normalizeEditableInputs,
} from '../../utils/boqFormulas';
import { formatProjectCurrency } from '../../utils/currency';

const BOQFormulaModal = ({ item, sectionTitle, onClose, onSave, project = null }) => {
  const formatMoney = (value) => formatProjectCurrency(value, project, { maximumFractionDigits: 2 });
  const [inputs, setInputs] = React.useState(() => normalizeEditableInputs(item?.editableInputs));

  const computedRate = React.useMemo(
    () => evaluateBoqFormulaRate({ ...item, editableInputs: inputs }) || 0,
    [inputs, item]
  );

  const formulaText = React.useMemo(
    () => getFormulaDisplayText(item) || 'Rate formula placeholder: define how the unit rate should be assembled from project inputs.',
    [item]
  );

  const workedExampleText = React.useMemo(
    () => getWorkedExamplePreview({ ...item, editableInputs: inputs }, { preferEditableInputs: true }),
    [inputs, item]
  );

  const unresolvedVariables = React.useMemo(() => {
    if (item?.defaultFormulaType !== 'expression') return [];
    const expression = item?.formulaExpression || item?.formulaText;
    return getUnresolvedFormulaVariables(expression, editableInputsToValueMap(inputs));
  }, [inputs, item]);

  const updateValue = (inputId, nextValue) => {
    setInputs((prev) => prev.map((input) => (
      input.id === inputId
        ? { ...input, value: Number(nextValue) || 0 }
        : input
    )));
  };

  return (
    <div className="boq-formula-overlay">
      <div className="boq-formula-modal">
        <header className="boq-formula-header">
          <div>
            <span className="boq-formula-eyebrow">{sectionTitle || item?.billSectionTitle || 'Formula Inputs'}</span>
            <h3>{item?.name || item?.description || 'Formula Item'}</h3>
            <p>Update the editable inputs for this BOQ item and the unit rate will recalculate immediately.</p>
          </div>
          <button type="button" className="boq-formula-close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="boq-formula-body">
          <div className="boq-formula-panel strong">
            <span className="boq-formula-label">Calculated Unit Rate</span>
            <strong>{formatMoney(computedRate)}</strong>
            <small>Amount updates automatically as Quantity x Calculated Unit Rate.</small>
          </div>

          {unresolvedVariables.length > 0 && (
            <div className="boq-formula-panel warning">
              <span className="boq-formula-label">Formula Warning</span>
              <p>
                This formula references {unresolvedVariables.length === 1 ? 'a variable' : 'variables'} with no matching
                editable input — <strong>{unresolvedVariables.join(', ')}</strong>. It is being treated as 0, so the
                calculated rate above is likely wrong. Check the formula expression against the input IDs below.
              </p>
            </div>
          )}

          <div className="boq-formula-panel">
            <span className="boq-formula-label">Formula Logic</span>
            <p>{formulaText}</p>
          </div>

          <div className={`boq-formula-panel ${item?.workedExample ? '' : 'placeholder'}`}>
            <span className="boq-formula-label">Worked Example</span>
            <p>{workedExampleText || 'Worked example placeholder: add editable inputs to preview how the unit rate is assembled.'}</p>
          </div>

          <div className="boq-formula-grid">
            {inputs.map((input) => (
              <label key={input.id} className="boq-formula-field">
                <span>{input.label}</span>
                <div className="boq-formula-input-wrap">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={input.value}
                    onChange={(event) => updateValue(input.id, event.target.value)}
                  />
                  {input.unit && <small>{input.unit}</small>}
                </div>
                {input.helpText && <em>{input.helpText}</em>}
              </label>
            ))}
          </div>
        </div>

        <footer className="boq-formula-footer">
          <button type="button" className="boq-formula-btn subtle" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="boq-formula-btn primary"
            onClick={() => onSave(inputs)}
          >
            <Calculator size={14} /> Apply Formula Inputs
          </button>
        </footer>
      </div>

      <style jsx="true">{`
        .boq-formula-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.72);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1250;
          padding: 1rem;
        }

        .boq-formula-modal {
          width: min(760px, 100%);
          background: white;
          border-radius: 22px;
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.28);
          overflow: hidden;
        }

        .boq-formula-header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.4rem 1.5rem 1rem;
          border-bottom: 1px solid #e2e8f0;
          background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
        }

        .boq-formula-eyebrow {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #2563eb;
          margin-bottom: 0.35rem;
        }

        .boq-formula-header h3 {
          margin: 0 0 0.35rem;
          font-size: 1.25rem;
          color: #0f172a;
        }

        .boq-formula-header p {
          margin: 0;
          font-size: 0.86rem;
          color: #475569;
        }

        .boq-formula-close {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          background: white;
          color: #475569;
          cursor: pointer;
        }

        .boq-formula-body {
          padding: 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background: #f8fafc;
        }

        .boq-formula-panel {
          border-radius: 16px;
          border: 1px solid #dbe3ef;
          background: white;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .boq-formula-panel.strong {
          background: #0f172a;
          color: white;
          border-color: #0f172a;
        }

        .boq-formula-panel.placeholder {
          border-style: dashed;
          background: #fffdf7;
          border-color: #fde68a;
        }

        .boq-formula-panel.warning {
          background: #fef2f2;
          border-color: #fecaca;
        }

        .boq-formula-panel.warning .boq-formula-label {
          color: #b91c1c;
        }

        .boq-formula-panel.warning p {
          color: #7f1d1d;
        }

        .boq-formula-panel.strong small {
          color: rgba(255, 255, 255, 0.78);
        }

        .boq-formula-label {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
        }

        .boq-formula-panel.strong .boq-formula-label {
          color: rgba(191, 219, 254, 0.82);
        }

        .boq-formula-panel strong {
          font-size: 1.5rem;
          color: inherit;
        }

        .boq-formula-panel p,
        .boq-formula-panel small {
          margin: 0;
          line-height: 1.5;
          color: #475569;
        }

        .boq-formula-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .boq-formula-field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          border-radius: 16px;
          background: white;
          border: 1px solid #dbe3ef;
          padding: 0.95rem;
        }

        .boq-formula-field span {
          font-size: 0.8rem;
          font-weight: 700;
          color: #334155;
        }

        .boq-formula-input-wrap {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 0.75rem 0.85rem;
          background: #f8fafc;
        }

        .boq-formula-input-wrap input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.95rem;
          color: #0f172a;
        }

        .boq-formula-input-wrap small {
          color: #64748b;
          font-size: 0.74rem;
          white-space: nowrap;
        }

        .boq-formula-field em {
          font-size: 0.72rem;
          color: #64748b;
          font-style: normal;
        }

        .boq-formula-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem 1.25rem;
          border-top: 1px solid #e2e8f0;
          background: white;
        }

        .boq-formula-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          min-width: 140px;
          padding: 0.8rem 1rem;
          border-radius: 12px;
          border: 1px solid transparent;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
        }

        .boq-formula-btn.subtle {
          background: #f8fafc;
          color: #475569;
          border-color: #cbd5e1;
        }

        .boq-formula-btn.primary {
          background: #2563eb;
          color: white;
        }

        @media (max-width: 720px) {
          .boq-formula-grid {
            grid-template-columns: 1fr;
          }

          .boq-formula-footer {
            flex-direction: column-reverse;
          }

          .boq-formula-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default BOQFormulaModal;
