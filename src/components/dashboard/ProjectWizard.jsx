import React, { useMemo, useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Layers,
  MapPin,
  Save,
  Sparkles,
  Building2,
  Home,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  STRUCTURE_OPTIONS,
  STRUCTURE_TYPES,
  getStructureDefinition,
} from '../../data/boqCatalog';
import {
  DEFAULT_NIGERIA_LOCATION,
  groupNigeriaStateOptionsByZone,
} from '../../data/nigeriaLocations';
import { DEFAULT_CURRENCY_CODE, SUPPORTED_CURRENCIES } from '../../data/currencies';
import {
  BUILDING_STOREY_PRESETS,
  getBuildingStoreyConfig,
  getRelevantBuildingSectionIds,
  getStoreySectionBadge,
} from '../../data/buildingStories';

const TOTAL_STEPS = 4;

const ProjectWizard = ({
  onSelect,
  onClose,
  onRequestDrawingAnalysis = null,
  initialData = null,
  initialStep = 1
}) => {
  const [step, setStep] = useState(initialStep);
  const [formData, setFormData] = useState(() => ({
    name: initialData?.name || '',
    clientName: initialData?.clientName || '',
    region: initialData?.region || DEFAULT_NIGERIA_LOCATION,
    currency: initialData?.currency || DEFAULT_CURRENCY_CODE,
    notes: initialData?.notes || '',
    assumptions: initialData?.assumptions || '',
    exclusions: initialData?.exclusions || '',
  }));
  const [structureType, setStructureType] = useState(initialData?.structureType || '');
  const [buildingStories, setBuildingStories] = useState(initialData?.buildingStories || 2);
  const [isConfiguringBuilding, setIsConfiguringBuilding] = useState(false);
  const [selectedSectionIds, setSelectedSectionIds] = useState([]);

  const structureDefinition = useMemo(
    () => getStructureDefinition(structureType),
    [structureType]
  );
  const groupedStates = useMemo(() => groupNigeriaStateOptionsByZone(), []);

  const storeyConfig = useMemo(
    () => getBuildingStoreyConfig(buildingStories),
    [buildingStories]
  );

  const totalAvailableItems = useMemo(
    () => (structureDefinition?.sections || []).reduce(
      (sum, section) => sum + ((section.availableItems || []).length),
      0
    ),
    [structureDefinition]
  );

  const handleStructureSelect = (nextStructureType) => {
    if (nextStructureType === STRUCTURE_TYPES.BUILDING || nextStructureType === 'Building') {
      setStructureType('Building');
      setIsConfiguringBuilding(true);
      return;
    }

    const definition = getStructureDefinition(nextStructureType);
    setStructureType(nextStructureType);
    setIsConfiguringBuilding(false);
    setSelectedSectionIds((definition?.sections || []).map((section) => section.id));
    setStep(3);
  };

  const handleConfirmBuildingStories = (storiesToUse) => {
    const finalStories = Math.max(1, parseInt(storiesToUse, 10) || 1);
    setBuildingStories(finalStories);
    const definition = getStructureDefinition('Building');
    const relevantIds = getRelevantBuildingSectionIds(finalStories, definition?.sections || []);
    setSelectedSectionIds(relevantIds);
    setIsConfiguringBuilding(false);
    setStep(3);
  };

  const handleResetRecommendedSections = () => {
    if (structureType === 'Building') {
      const relevantIds = getRelevantBuildingSectionIds(buildingStories, structureDefinition?.sections || []);
      setSelectedSectionIds(relevantIds);
    } else {
      setSelectedSectionIds((structureDefinition?.sections || []).map((s) => s.id));
    }
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
      currency: formData.currency,
      notes: formData.notes.trim(),
      assumptions: formData.assumptions.trim(),
      exclusions: formData.exclusions.trim(),
      type: structureType,
      structureType,
      subtype: structureType === 'Building'
        ? `${buildingStories}-Storey ${storeyConfig.badge}`
        : null,
      buildingStories: structureType === 'Building' ? buildingStories : null,
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
                    placeholder="e.g. Lekki 2-Storey Commercial BOQ"
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
                <div className="form-group">
                  <label>Billing Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(event) => setFormData((prev) => ({ ...prev, currency: event.target.value }))}
                  >
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} ({currency.symbol}) — {currency.name}
                      </option>
                    ))}
                  </select>
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

          {step === 2 && !isConfiguringBuilding && (
            <div className="wizard-step view-fade-in">
              <div className="step-header">
                <button className="btn-back" onClick={() => setStep(1)}><ChevronLeft size={16} /> Back</button>
                <span className="step-number">Step 2 of {TOTAL_STEPS}</span>
                <h3>Choose Structure Type</h3>
                <p>Select the structure type so the app can open the correct bill sections for this BOQ, or let AI draft it from a drawing.</p>
              </div>

              <div className="selection-grid">
                {onRequestDrawingAnalysis && (
                  <button
                    type="button"
                    className="selection-card ai-card"
                    onClick={() => onRequestDrawingAnalysis(formData)}
                  >
                    <div className="card-icon ai-icon">
                      <Sparkles size={24} />
                    </div>
                    <div className="card-body">
                      <div className="title-row">
                        <h4>AI Drawing Assistant</h4>
                        <span className="premium-tag">PREMIUM</span>
                      </div>
                      <p>Instant takeoff from blueprints. Upload drawing files to auto-build your BOQ.</p>
                    </div>
                    <ChevronRight size={18} className="arrow" />
                  </button>
                )}
                {STRUCTURE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`selection-card ${option.id === STRUCTURE_TYPES.BUILDING ? 'selection-card-highlight' : ''}`}
                    onClick={() => handleStructureSelect(option.id)}
                  >
                    <div className="card-icon">{option.icon}</div>
                    <div className="card-body">
                      <div className="title-row">
                        <h4>{option.label}</h4>
                        {option.id === STRUCTURE_TYPES.BUILDING && (
                          <span className="storey-feature-tag">Story Guided</span>
                        )}
                      </div>
                      <p>{option.description}</p>
                    </div>
                    <ChevronRight size={18} className="arrow" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && isConfiguringBuilding && (
            <div className="wizard-step view-fade-in">
              <div className="step-header">
                <button className="btn-back" onClick={() => setIsConfiguringBuilding(false)}>
                  <ChevronLeft size={16} /> Choose Different Structure
                </button>
                <span className="step-number">Building Specification</span>
                <h3>How many stories is the building?</h3>
                <p>
                  Select or specify the number of stories. Quantra will calibrate the structural frame (columns, beams, slabs, stairs), lift core provisions, and relevant bill sections for your BOQ.
                </p>
              </div>

              <div className="storey-presets-grid">
                {BUILDING_STOREY_PRESETS.map((preset) => {
                  const isSelected = buildingStories === preset.stories;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`storey-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setBuildingStories(preset.stories)}
                    >
                      <div className="storey-card-top">
                        <span className="storey-icon">{preset.icon}</span>
                        <span className="storey-badge">{preset.badge}</span>
                      </div>
                      <h4>{preset.name}</h4>
                      <p>{preset.description}</p>
                      <div className="storey-card-footer">
                        <span>{preset.structuralType}</span>
                        {isSelected && <CheckCircle2 size={16} className="check-icon" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="storey-custom-wrapper">
                <div className="storey-custom-header">
                  <div>
                    <strong>Or specify exact number of stories</strong>
                    <span>Use stepper or enter custom floor count for taller buildings</span>
                  </div>
                  <div className="storey-stepper">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setBuildingStories((prev) => Math.max(1, prev - 1))}
                      disabled={buildingStories <= 1}
                    >
                      <Minus size={16} />
                    </button>
                    <div className="stepper-input-wrap">
                      <input
                        type="number"
                        min="1"
                        max="80"
                        value={buildingStories}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1) {
                            setBuildingStories(val);
                          }
                        }}
                        className="stepper-input"
                      />
                      <span className="stepper-unit">Storey{buildingStories === 1 ? '' : 's'}</span>
                    </div>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setBuildingStories((prev) => Math.min(80, prev + 1))}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="storey-live-summary">
                  <div className="summary-left">
                    <span className="summary-pill">🏢 Selected Configuration</span>
                    <h4>{buildingStories} Storey{buildingStories === 1 ? '' : 's'} — {storeyConfig.classification}</h4>
                    <p>{storeyConfig.keyItemsSummary}</p>
                  </div>
                  <div className="summary-right">
                    <div className="summary-metric">
                      <span>Suspended Floors</span>
                      <strong>{Math.max(0, buildingStories - 1)} floor{buildingStories === 2 ? '' : 's'}</strong>
                    </div>
                    <div className="summary-metric">
                      <span>Lifts / Elevators</span>
                      <strong>{buildingStories >= 4 ? 'Recommended' : 'Optional / Stairs'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="wizard-actions right">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleConfirmBuildingStories(buildingStories)}
                >
                  Continue to Relevant Bills ({buildingStories} Storey{buildingStories === 1 ? '' : 's'}) <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step view-fade-in">
              <div className="step-header">
                <button
                  className="btn-back"
                  onClick={() => {
                    if (structureType === 'Building') {
                      setIsConfiguringBuilding(true);
                      setStep(2);
                    } else {
                      setStep(2);
                    }
                  }}
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <span className="step-number">Step 3 of {TOTAL_STEPS}</span>
                <h3>
                  {structureType === 'Building'
                    ? `Relevant Bill Sections for ${buildingStories}-Storey Building`
                    : `Relevant Bill Sections for ${structureType}`}
                </h3>
                <p>
                  {structureType === 'Building'
                    ? `We’ve tailored the bill sections below specifically for your ${buildingStories}-storey ${storeyConfig.badge}. All bills will be created empty so you can pick only the lines you want inside each bill before generating the BOQ sheet.`
                    : `These are the structure-specific bills that will be created for ${structureType}. We’ll create them empty so you can pick only the items you want inside each bill.`}
                </p>
              </div>

              {structureType === 'Building' && (
                <div className="storey-switch-bar">
                  <div className="storey-switch-info">
                    <span className="storey-badge-live">🏢 {buildingStories} Storey{buildingStories === 1 ? '' : 's'}</span>
                    <strong>{storeyConfig.classification}</strong>
                    <span>({storeyConfig.structuralType})</span>
                  </div>
                  <button
                    type="button"
                    className="btn-change-stories"
                    onClick={() => {
                      setIsConfiguringBuilding(true);
                      setStep(2);
                    }}
                  >
                    Change Number of Stories
                  </button>
                </div>
              )}

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

              <div className="section-toolbar">
                <span className="toolbar-label">Quick Selection:</span>
                <button
                  type="button"
                  className="btn-toolbar"
                  onClick={handleResetRecommendedSections}
                >
                  <RotateCcw size={13} /> {structureType === 'Building' ? `Recommended for ${buildingStories}-Storey` : 'Select Default'}
                </button>
                <button
                  type="button"
                  className="btn-toolbar"
                  onClick={() => setSelectedSectionIds((structureDefinition?.sections || []).map((s) => s.id))}
                >
                  Select All ({(structureDefinition?.sections || []).length})
                </button>
                <button
                  type="button"
                  className="btn-toolbar"
                  onClick={() => setSelectedSectionIds([])}
                >
                  Clear All
                </button>
              </div>

              <div className="checklist-grid">
                {(structureDefinition?.sections || []).map((section) => {
                  const isSelected = selectedSectionIds.includes(section.id);
                  const storeyBadgeNote = structureType === 'Building'
                    ? getStoreySectionBadge(section.id, buildingStories)
                    : null;

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
                        
                        <div className="checklist-footer-row">
                          <span className="checklist-meta">
                            {section.availableItems.length} library item{section.availableItems.length === 1 ? '' : 's'}
                          </span>
                          {storeyBadgeNote && (
                            <span className="checklist-storey-note">
                              ℹ️ {storeyBadgeNote}
                            </span>
                          )}
                        </div>
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
                <h3>Finalize Project</h3>
                <p>Review your project configuration and jump straight into the dedicated BOQ item picker.</p>
              </div>

              <div className="summary-card">
                <div className="summary-grid">
                  <div className="summary-group">
                    <h5>Project</h5>
                    <div className="summary-row"><span>Name</span><strong>{formData.name}</strong></div>
                    <div className="summary-row"><span>Client</span><strong>{formData.clientName}</strong></div>
                    <div className="summary-row"><span>State / Market</span><strong>{formData.region}</strong></div>
                    <div className="summary-row"><span>Currency</span><strong>{formData.currency}</strong></div>
                  </div>
                  <div className="summary-group">
                    <h5>BOQ Setup</h5>
                    <div className="summary-row"><span>Structure</span><strong>{structureType}</strong></div>
                    {structureType === 'Building' && (
                      <>
                        <div className="summary-row">
                          <span>Building Height</span>
                          <strong>{buildingStories} Storey{buildingStories === 1 ? '' : 's'} ({storeyConfig.badge})</strong>
                        </div>
                        <div className="summary-row">
                          <span>Classification</span>
                          <strong>{storeyConfig.classification}</strong>
                        </div>
                      </>
                    )}
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
          max-width: 920px;
          background: white;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .wizard-nav {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-light, #e2e8f0);
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
          color: var(--primary-900, #0f172a);
        }

        .btn-close {
          background: transparent;
          border: none;
          color: var(--primary-400, #94a3b8);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wizard-progress-bar {
          height: 4px;
          background: var(--border-light, #e2e8f0);
        }

        .wizard-progress-fill {
          height: 100%;
          background: var(--accent-600, #2563eb);
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
          color: var(--accent-600, #2563eb);
          letter-spacing: 0.08em;
          display: block;
          margin-bottom: 0.5rem;
        }

        .step-header h3 {
          font-size: 1.75rem;
          color: var(--primary-900, #0f172a);
          margin-bottom: 0.45rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .step-header p {
          color: var(--primary-500, #64748b);
          font-size: 0.92rem;
          line-height: 1.6;
          max-width: 760px;
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
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--primary-500, #64748b);
          cursor: pointer;
        }
        .btn-back:hover {
          color: #0f172a;
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
          color: var(--primary-700, #334155);
        }

        .form-group .req {
          color: #ef4444;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.8rem 1rem;
          border: 1px solid var(--border-medium, #cbd5e1);
          border-radius: 14px;
          font-size: 0.9rem;
          background: white;
          outline: none;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: var(--accent-500, #3b82f6);
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
          color: var(--primary-400, #94a3b8);
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
          border: 1.5px solid var(--border-medium, #e2e8f0);
          border-radius: 18px;
          cursor: pointer;
          background: white;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: left;
        }

        .selection-card:hover {
          border-color: var(--accent-500, #3b82f6);
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(37, 99, 235, 0.08);
        }

        .selection-card-highlight {
          border-color: #93c5fd;
          background: linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%);
        }

        .storey-feature-tag {
          font-size: 0.6rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
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
          color: var(--primary-900, #0f172a);
          font-weight: 700;
        }

        .card-body p {
          margin: 0;
          font-size: 0.84rem;
          color: var(--primary-500, #64748b);
          line-height: 1.55;
        }

        .arrow {
          color: var(--primary-300, #cbd5e1);
          margin-top: 0.2rem;
        }

        .selection-card.ai-card {
          border-color: var(--quantra-blue-300, #93bdfd);
          background: linear-gradient(135deg, #eff6ff 0%, #fdf5d1 100%);
        }

        .card-icon.ai-icon {
          background: var(--quantra-blue-600, #1e6cf7);
          color: white;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.35rem;
        }

        .title-row h4 {
          margin: 0;
        }

        .premium-tag {
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          padding: 0.15rem 0.45rem;
          border-radius: 999px;
          background: var(--quantra-gold-500, #d4a017);
          color: white;
        }

        /* ═══════ STOREY PRESETS & SPECIFICATION ═══════ */
        .storey-presets-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.9rem;
          margin-bottom: 1.25rem;
        }

        .storey-card {
          display: flex;
          flex-direction: column;
          padding: 1.15rem 1rem;
          border: 1.5px solid #e2e8f0;
          border-radius: 16px;
          background: #ffffff;
          text-align: left;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }

        .storey-card:hover {
          border-color: #93c5fd;
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.07);
        }

        .storey-card.selected {
          border-color: #2563eb;
          background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1), 0 12px 28px rgba(37, 99, 235, 0.12);
        }

        .storey-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.65rem;
        }

        .storey-icon {
          font-size: 1.6rem;
        }

        .storey-badge {
          font-size: 0.62rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
        }

        .storey-card.selected .storey-badge {
          background: #2563eb;
          color: #ffffff;
        }

        .storey-card h4 {
          margin: 0 0 0.35rem;
          font-size: 0.96rem;
          font-weight: 800;
          color: #0f172a;
        }

        .storey-card p {
          margin: 0 0 0.75rem;
          font-size: 0.78rem;
          color: #64748b;
          line-height: 1.45;
          flex: 1;
        }

        .storey-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.6rem;
          border-top: 1px solid #f1f5f9;
        }

        .storey-card-footer span {
          font-size: 0.68rem;
          font-weight: 700;
          color: #2563eb;
        }

        .storey-custom-wrapper {
          border: 1.5px solid #e2e8f0;
          border-radius: 18px;
          padding: 1.25rem;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .storey-custom-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .storey-custom-header strong {
          display: block;
          font-size: 0.95rem;
          color: #0f172a;
          font-weight: 800;
        }

        .storey-custom-header span {
          font-size: 0.8rem;
          color: #64748b;
        }

        .storey-stepper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: white;
          padding: 0.35rem 0.5rem;
          border-radius: 14px;
          border: 1px solid #cbd5e1;
        }

        .stepper-btn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: #f1f5f9;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #0f172a;
          transition: all 0.2s;
        }
        .stepper-btn:hover:not(:disabled) {
          background: #2563eb;
          color: white;
        }
        .stepper-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .stepper-input-wrap {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0 0.5rem;
        }

        .stepper-input {
          width: 44px;
          text-align: center;
          border: none;
          font-size: 1.25rem;
          font-weight: 900;
          color: #0f172a;
          background: transparent;
          outline: none;
        }

        .stepper-unit {
          font-size: 0.78rem;
          font-weight: 700;
          color: #64748b;
        }

        .storey-live-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
          border-radius: 14px;
          padding: 1rem 1.25rem;
          border: 1px solid #e2e8f0;
          gap: 1.5rem;
        }

        .summary-left {
          flex: 1;
        }

        .summary-pill {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #2563eb;
          background: #eff6ff;
          padding: 0.18rem 0.55rem;
          border-radius: 999px;
          margin-bottom: 0.35rem;
        }

        .summary-left h4 {
          margin: 0 0 0.25rem;
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }

        .summary-left p {
          margin: 0;
          font-size: 0.8rem;
          color: #64748b;
          line-height: 1.4;
        }

        .summary-right {
          display: flex;
          gap: 1rem;
        }

        .summary-metric {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          background: #f8fafc;
          padding: 0.5rem 0.75rem;
          border-radius: 10px;
          border: 1px solid #f1f5f9;
        }

        .summary-metric span {
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #94a3b8;
          letter-spacing: 0.05em;
        }

        .summary-metric strong {
          font-size: 0.85rem;
          color: #0f172a;
          font-weight: 800;
        }

        /* ═══════ STOREY SWITCH BAR (STEP 3) ═══════ */
        .storey-switch-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #eff6ff 0%, #f0f7ff 100%);
          border: 1.5px solid #bfdbfe;
          border-radius: 14px;
          padding: 0.75rem 1.15rem;
          margin-bottom: 1.25rem;
        }

        .storey-switch-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .storey-badge-live {
          font-size: 0.78rem;
          font-weight: 900;
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
          background: #2563eb;
          color: white;
        }

        .storey-switch-info strong {
          font-size: 0.92rem;
          color: #1e3a8a;
          font-weight: 800;
        }

        .storey-switch-info span {
          font-size: 0.8rem;
          color: #3b82f6;
        }

        .btn-change-stories {
          background: white;
          border: 1px solid #93c5fd;
          color: #1d4ed8;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 0.4rem 0.85rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-change-stories:hover {
          background: #2563eb;
          color: white;
        }

        .section-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .section-summary > div,
        .summary-card {
          border: 1px solid var(--border-light, #e2e8f0);
          border-radius: 18px;
          background: #f8fafc;
          padding: 1rem 1.1rem;
        }

        .section-summary strong {
          display: block;
          font-size: 1.35rem;
          color: var(--primary-900, #0f172a);
        }

        .section-summary span {
          color: var(--primary-500, #64748b);
          font-size: 0.78rem;
        }

        .section-toolbar {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .toolbar-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          margin-right: 0.2rem;
        }

        .btn-toolbar {
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0.35rem 0.65rem;
          font-size: 0.74rem;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          transition: all 0.2s;
        }
        .btn-toolbar:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
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
          border: 1px solid var(--border-light, #e2e8f0);
          border-radius: 16px;
          padding: 1rem;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .checklist-item:hover {
          border-color: #93c5fd;
        }

        .checklist-item.selected {
          border-color: var(--accent-500, #3b82f6);
          background: #eff6ff;
        }

        .checklist-item input {
          margin-top: 0.25rem;
          cursor: pointer;
        }

        .checklist-content {
          flex: 1;
        }

        .checklist-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .checklist-content h4 {
          margin: 0 0 0.25rem;
          color: var(--primary-900, #0f172a);
          font-size: 0.92rem;
          font-weight: 700;
        }

        .checklist-content p {
          margin: 0;
          color: var(--primary-500, #64748b);
          font-size: 0.78rem;
          line-height: 1.5;
        }

        .checklist-footer-row {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-top: 0.6rem;
        }

        .checklist-meta {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--accent-700, #1d4ed8);
          background: rgba(37, 99, 235, 0.08);
          border-radius: 999px;
          padding: 0.22rem 0.55rem;
          align-self: flex-start;
        }

        .checklist-storey-note {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          color: #0369a1;
          background: #e0f2fe;
          border-radius: 6px;
          padding: 0.2rem 0.5rem;
          line-height: 1.35;
        }

        .check-icon {
          color: var(--accent-600, #2563eb);
          flex-shrink: 0;
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
          color: var(--primary-500, #64748b);
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.35rem 0;
          font-size: 0.86rem;
        }

        .summary-row span {
          color: var(--primary-500, #64748b);
        }

        .summary-row strong {
          color: var(--primary-900, #0f172a);
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
          transition: all 0.2s;
        }

        .btn-primary {
          background: var(--accent-600, #2563eb);
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          background: #1d4ed8;
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.25);
        }

        .btn-generate {
          background: #10b981;
          color: white;
        }
        .btn-generate:hover:not(:disabled) {
          background: #059669;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.25);
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

          .storey-presets-grid,
          .selection-grid,
          .checklist-grid,
          .summary-grid,
          .section-summary,
          .storey-live-summary {
            grid-template-columns: 1fr;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default ProjectWizard;
