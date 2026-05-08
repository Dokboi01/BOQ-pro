import React, { useMemo, useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Layers,
  MapPin,
  Save,
} from 'lucide-react';
import {
  STRUCTURE_OPTIONS,
  getStructureDefinition,
} from '../../data/boqCatalog';
import {
  DEFAULT_NIGERIA_LOCATION,
  groupNigeriaStateOptionsByZone,
} from '../../data/nigeriaLocations';

const TOTAL_STEPS = 4;

const ProjectWizard = ({ onSelect, onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    region: DEFAULT_NIGERIA_LOCATION,
    notes: '',
    assumptions: '',
    exclusions: '',
  });
  const [structureType, setStructureType] = useState('');
  const [selectedSectionIds, setSelectedSectionIds] = useState([]);

  const structureDefinition = useMemo(
    () => getStructureDefinition(structureType),
    [structureType]
  );
  const groupedStates = useMemo(() => groupNigeriaStateOptionsByZone(), []);

  const totalAvailableItems = useMemo(
    () => (structureDefinition?.sections || []).reduce(
      (sum, section) => sum + ((section.availableItems || []).length),
      0
    ),
    [structureDefinition]
  );

  const handleStructureSelect = (nextStructureType) => {
    const definition = getStructureDefinition(nextStructureType);
    setStructureType(nextStructureType);
    setSelectedSectionIds((definition?.sections || []).map((section) => section.id));
    setStep(3);
  };

  const toggleSection = (sectionId) => {
    setSelectedSectionIds((prev) => (
      prev.includes(sectionId)
        ? prev.filter((entry) => entry !== sectionId)
        : [...prev, sectionId]
    ));
  };

  const canContinueFromDetails = formData.name.trim() && formData.clientName.trim();
  const canGenerate = structureType && selectedSectionIds.length > 0;

  const handleGenerate = () => {
    if (!canGenerate) return;

    onSelect({
      name: formData.name.trim(),
      clientName: formData.clientName.trim(),
      region: formData.region,
      notes: formData.notes.trim(),
      assumptions: formData.assumptions.trim(),
      exclusions: formData.exclusions.trim(),
      type: structureType,
      structureType,
      selectedSectionIds,
      projectMode: 'structure-based',
      pricingMode: 'user-entered',
    });
  };

  const progressPercent = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal enterprise-card">
        <header className="wizard-nav">
          <div className="brand">
            <Layers size={20} className="text-accent" />
            <span>Structure-Based BOQ Builder</span>
          </div>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="wizard-progress-bar">
          <div className="wizard-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="wizard-content">
          {step === 1 && (
            <div className="wizard-step view-fade-in">
              <div className="step-header">
                <span className="step-number">Step 1 of {TOTAL_STEPS}</span>
                <h3>Project Details</h3>
                <p>Start with the core project information we’ll carry into the BOQ workspace and reports.</p>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Project Name <span className="req">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="e.g. Lekki Coastal Revetment BOQ"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Client / Owner <span className="req">*</span></label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(event) => setFormData((prev) => ({ ...prev, clientName: event.target.value }))}
                    placeholder="Client name"
                  />
                </div>
                <div className="form-group">
                  <label>Project State / Market <span className="req">*</span></label>
                  <div className="input-icon-wrapper">
                    <MapPin size={16} className="input-icon" />
                    <select
                      value={formData.region}
                      onChange={(event) => setFormData((prev) => ({ ...prev, region: event.target.value }))}
                      className="pl-8"
                    >
                      {groupedStates.map((group) => (
                        <optgroup key={group.zone} label={group.zone}>
                          {group.states.map((state) => (
                            <option key={state.value} value={state.value}>
                              {state.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="wizard-actions right">
                <button
                  className="btn-primary"
                  disabled={!canContinueFromDetails}
                  onClick={() => setStep(2)}
                >
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step view-fade-in">
              <div className="step-header">
                <button className="btn-back" onClick={() => setStep(1)}><ChevronLeft size={16} /> Back</button>
                <span className="step-number">Step 2 of {TOTAL_STEPS}</span>
                <h3>Choose Structure Type</h3>
                <p>Select the structure type so the app can open the correct bill sections for this BOQ.</p>
              </div>

              <div className="selection-grid">
                {STRUCTURE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="selection-card"
                    onClick={() => handleStructureSelect(option.id)}
                  >
                    <div className="card-icon">{option.icon}</div>
                    <div className="card-body">
                      <h4>{option.label}</h4>
                      <p>{option.description}</p>
                    </div>
                    <ChevronRight size={18} className="arrow" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step view-fade-in">
              <div className="step-header">
                <button className="btn-back" onClick={() => setStep(2)}><ChevronLeft size={16} /> Back</button>
                <span className="step-number">Step 3 of {TOTAL_STEPS}</span>
                <h3>Relevant Bill Sections</h3>
                <p>
                  These are the structure-specific bills that will be created for <strong>{structureType}</strong>.
                  We’ll create them empty so you can pick only the items you want inside each bill, especially Preliminaries.
                </p>
              </div>

              <div className="section-summary">
                <div>
                  <strong>{selectedSectionIds.length}</strong>
                  <span>bill sections selected</span>
                </div>
                <div>
                  <strong>{totalAvailableItems}</strong>
                  <span>catalog items available across selected bills</span>
                </div>
              </div>

              <div className="checklist-grid">
                {(structureDefinition?.sections || []).map((section) => {
                  const isSelected = selectedSectionIds.includes(section.id);
                  return (
                    <label key={section.id} className={`checklist-item ${isSelected ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSection(section.id)}
                      />
                      <div className="checklist-content">
                        <div className="checklist-title-row">
                          <h4>{section.title}</h4>
                          {isSelected && <CheckCircle2 size={16} className="check-icon" />}
                        </div>
                        <p>{section.description}</p>
                        <span className="checklist-meta">{section.availableItems.length} library item{section.availableItems.length === 1 ? '' : 's'}</span>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="wizard-actions right">
                <button
                  className="btn-primary"
                  disabled={selectedSectionIds.length === 0}
                  onClick={() => setStep(4)}
                >
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="wizard-step view-fade-in">
              <div className="step-header">
                <button className="btn-back" onClick={() => setStep(3)}><ChevronLeft size={16} /> Back</button>
                <span className="step-number">Step 4 of {TOTAL_STEPS}</span>
                <h3>Finalize Quantraject</h3>
                <p>Review the setup, add optional pricing notes, and create the project. We’ll open the dedicated BOQ item-selection page before the estimate sheet.</p>
              </div>

              <div className="summary-card">
                <div className="summary-grid">
                  <div className="summary-group">
                    <h5>Project</h5>
                    <div className="summary-row"><span>Name</span><strong>{formData.name}</strong></div>
                    <div className="summary-row"><span>Client</span><strong>{formData.clientName}</strong></div>
                    <div className="summary-row"><span>State / Market</span><strong>{formData.region}</strong></div>
                  </div>
                  <div className="summary-group">
                    <h5>BOQ Setup</h5>
                    <div className="summary-row"><span>Structure</span><strong>{structureType}</strong></div>
                    <div className="summary-row"><span>Bill Sections</span><strong>{selectedSectionIds.length}</strong></div>
                    <div className="summary-row"><span>Item Builder</span><strong>Dedicated selection stage enabled</strong></div>
                    <div className="summary-row"><span>Preliminaries</span><strong>Real selectable bill</strong></div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Project Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Anything important to capture before pricing starts"
                  />
                </div>

                <div className="form-group">
                  <label>Assumptions</label>
                  <textarea
                    rows={3}
                    value={formData.assumptions}
                    onChange={(event) => setFormData((prev) => ({ ...prev, assumptions: event.target.value }))}
                    placeholder="Assumptions for estimate build-up, rates, or scope"
                  />
                </div>

                <div className="form-group">
                  <label>Exclusions</label>
                  <textarea
                    rows={3}
                    value={formData.exclusions}
                    onChange={(event) => setFormData((prev) => ({ ...prev, exclusions: event.target.value }))}
                    placeholder="Exclusions to keep visible in reports and review"
                  />
                </div>
              </div>

              <div className="wizard-actions end">
                <button className="btn-generate" disabled={!canGenerate} onClick={handleGenerate}>
                  <Save size={16} /> Create & Pick Items
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx="true">{`
        .wizard-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          padding: 1rem;
        }

        .wizard-modal {
          width: 100%;
          max-width: 880px;
          background: white;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .wizard-nav {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-light);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 800;
          font-size: 0.95rem;
          color: var(--primary-900);
        }

        .btn-close {
          background: transparent;
          border: none;
          color: var(--primary-400);
          cursor: pointer;
        }

        .wizard-progress-bar {
          height: 4px;
          background: var(--border-light);
        }

        .wizard-progress-fill {
          height: 100%;
          background: var(--accent-600);
          transition: width 0.3s ease;
        }

        .wizard-content {
          padding: 2rem;
          max-height: 86vh;
          overflow-y: auto;
        }

        .step-header {
          margin-bottom: 1.5rem;
          position: relative;
        }

        .step-number {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--accent-600);
          letter-spacing: 0.08em;
          display: block;
          margin-bottom: 0.5rem;
        }

        .step-header h3 {
          font-size: 1.8rem;
          color: var(--primary-900);
          margin-bottom: 0.45rem;
        }

        .step-header p {
          color: var(--primary-500);
          font-size: 0.94rem;
          line-height: 1.6;
          max-width: 720px;
        }

        .btn-back {
          position: absolute;
          top: -2.5rem;
          left: 0;
          background: transparent;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary-500);
          cursor: pointer;
        }

        .form-grid,
        .summary-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .form-group label {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--primary-700);
        }

        .form-group .req {
          color: #ef4444;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.8rem 1rem;
          border: 1px solid var(--border-medium);
          border-radius: 14px;
          font-size: 0.9rem;
          background: white;
          outline: none;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: var(--accent-500);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .input-icon-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--primary-400);
        }

        .pl-8 {
          padding-left: 2.5rem !important;
        }

        .selection-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .selection-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.2rem;
          border: 1px solid var(--border-medium);
          border-radius: 18px;
          cursor: pointer;
          background: white;
          transition: all 0.2s;
          text-align: left;
        }

        .selection-card:hover {
          border-color: var(--accent-500);
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(37, 99, 235, 0.08);
        }

        .card-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .card-body {
          flex: 1;
        }

        .card-body h4 {
          margin: 0 0 0.35rem;
          font-size: 1rem;
          color: var(--primary-900);
        }

        .card-body p {
          margin: 0;
          font-size: 0.84rem;
          color: var(--primary-500);
          line-height: 1.55;
        }

        .arrow {
          color: var(--primary-300);
          margin-top: 0.2rem;
        }

        .section-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .section-summary > div,
        .summary-card {
          border: 1px solid var(--border-light);
          border-radius: 18px;
          background: #f8fafc;
          padding: 1rem 1.1rem;
        }

        .section-summary strong {
          display: block;
          font-size: 1.35rem;
          color: var(--primary-900);
        }

        .section-summary span {
          color: var(--primary-500);
          font-size: 0.78rem;
        }

        .checklist-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .checklist-item {
          display: flex;
          gap: 0.9rem;
          align-items: flex-start;
          border: 1px solid var(--border-light);
          border-radius: 16px;
          padding: 1rem;
          background: white;
        }

        .checklist-item.selected {
          border-color: var(--accent-500);
          background: #eff6ff;
        }

        .checklist-item input {
          margin-top: 0.25rem;
        }

        .checklist-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .checklist-content h4 {
          margin: 0 0 0.25rem;
          color: var(--primary-900);
          font-size: 0.95rem;
        }

        .checklist-content p {
          margin: 0;
          color: var(--primary-500);
          font-size: 0.8rem;
          line-height: 1.5;
        }

        .checklist-meta {
          display: inline-block;
          margin-top: 0.5rem;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--accent-700);
          background: rgba(37, 99, 235, 0.08);
          border-radius: 999px;
          padding: 0.28rem 0.6rem;
        }

        .check-icon {
          color: var(--accent-600);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .summary-group h5 {
          margin: 0 0 0.75rem;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--primary-500);
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.35rem 0;
          font-size: 0.86rem;
        }

        .summary-row span {
          color: var(--primary-500);
        }

        .summary-row strong {
          color: var(--primary-900);
          text-align: right;
        }

        .wizard-actions {
          display: flex;
          gap: 0.8rem;
          margin-top: 1.5rem;
        }

        .wizard-actions.right,
        .wizard-actions.end {
          justify-content: flex-end;
        }

        .btn-primary,
        .btn-generate {
          border: none;
          border-radius: 14px;
          padding: 0.85rem 1.25rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          cursor: pointer;
        }

        .btn-primary {
          background: var(--accent-600);
          color: white;
        }

        .btn-generate {
          background: #10b981;
          color: white;
        }

        .btn-primary:disabled,
        .btn-generate:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .wizard-modal {
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
          }

          .wizard-content {
            padding: 1.5rem;
          }

          .selection-grid,
          .checklist-grid,
          .summary-grid,
          .section-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ProjectWizard;
