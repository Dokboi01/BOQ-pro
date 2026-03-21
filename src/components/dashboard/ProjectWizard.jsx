import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Layers,
  ClipboardList,
  MapPin,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import { STRUCTURE_DATA } from '../../data/structures';

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createCustomItem = () => ({
  id: makeId('item'),
  description: '',
  unit: 'Nr',
  qty: 1,
  rate: 0,
  subcategory: 'Custom Work',
  materials: []
});

const createCustomSection = () => ({
  id: makeId('section'),
  title: '',
  items: [createCustomItem()]
});

const ProjectWizard = ({ onSelect, onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    region: 'Lagos',
    notes: '',
    assumptions: '',
    exclusions: '',
    projectMode: 'default',
    isUnpricedTemplate: true
  });

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubtype, setSelectedSubtype] = useState(null);
  const [subtypeData, setSubtypeData] = useState(null);
  const [selectedSections, setSelectedSections] = useState([]);
  const [customSections, setCustomSections] = useState([]);

  const categories = Object.keys(STRUCTURE_DATA).map(key => ({
    id: key,
    label: key,
    icon: STRUCTURE_DATA[key].icon,
    data: STRUCTURE_DATA[key]
  }));

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedSubtype(null);
    setSubtypeData(null);
    setCustomSections([]);
    handleNext();
  };

  const handleSubtypeSelect = (name, data) => {
    setSelectedSubtype(name);
    setSubtypeData(data);
    setSelectedSections(data.sections.map(s => s.id)); // Auto-select all relevant sections
    handleNext();
  };

  const toggleSection = (sectionId) => {
    setSelectedSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  const addCustomSection = () => {
    setFormData(prev => ({ ...prev, projectMode: 'custom' }));
    setCustomSections(prev => [...prev, createCustomSection()]);
  };

  const updateCustomSectionTitle = (sectionId, title) => {
    setCustomSections(prev => prev.map(section =>
      section.id === sectionId ? { ...section, title } : section
    ));
  };

  const removeCustomSection = (sectionId) => {
    setCustomSections(prev => prev.filter(section => section.id !== sectionId));
  };

  const addCustomItem = (sectionId) => {
    setCustomSections(prev => prev.map(section =>
      section.id === sectionId
        ? { ...section, items: [...section.items, createCustomItem()] }
        : section
    ));
  };

  const updateCustomItem = (sectionId, itemId, field, value) => {
    setCustomSections(prev => prev.map(section =>
      section.id !== sectionId
        ? section
        : {
            ...section,
            items: section.items.map(item =>
              item.id === itemId ? { ...item, [field]: value } : item
            )
          }
    ));
  };

  const removeCustomItem = (sectionId, itemId) => {
    setCustomSections(prev => prev.map(section =>
      section.id !== sectionId
        ? section
        : {
            ...section,
            items: section.items.filter(item => item.id !== itemId)
          }
    ));
  };

  const normalizedCustomSections = customSections
    .map(section => ({
      ...section,
      title: section.title.trim(),
      items: (section.items || [])
        .map(item => ({
          ...item,
          description: item.description.trim(),
          unit: String(item.unit || 'Nr').trim() || 'Nr',
          qty: Number(item.qty) || 0,
          rate: Number(item.rate) || 0,
          subcategory: String(item.subcategory || 'Custom Work').trim() || 'Custom Work',
          materials: Array.isArray(item.materials) ? item.materials : []
        }))
        .filter(item => item.description)
    }))
    .filter(section => section.title && section.items.length > 0);

  const customItemCount = normalizedCustomSections.reduce((acc, section) => acc + section.items.length, 0);
  const totalPlannedSections = selectedSections.length + normalizedCustomSections.length;

  const handleGenerate = () => {
    const templateSections = subtypeData.sections.filter(s => selectedSections.includes(s.id));
    const customModeSections = normalizedCustomSections.map(section => ({
      id: section.id,
      title: section.title,
      items: section.items.map(item => ({
        description: item.description,
        unit: item.unit,
        qty: item.qty,
        rate: item.rate,
        subcategory: item.subcategory,
        materials: item.materials
      }))
    }));
    const finalSections = [...templateSections, ...customModeSections];

    if (finalSections.length === 0) return;
    
    const config = {
      name: formData.name,
      clientName: formData.clientName,
      region: formData.region,
      type: selectedCategory,
      subtype: selectedSubtype,
      sections: finalSections,
      notes: formData.notes,
      assumptions: formData.assumptions,
      exclusions: formData.exclusions,
      projectMode: formData.projectMode,
      customSectionCount: normalizedCustomSections.length,
      customItemCount,
      isUnpricedTemplate: formData.isUnpricedTemplate
    };
    
    onSelect(config);
  };

  // STEP 1: Project Details
  const renderStep1 = () => (
    <div className="wizard-step view-fade-in">
      <div className="step-header">
        <span className="step-number">Step 1 of 6</span>
        <h3>Project Details</h3>
        <p>Set up the basic information for your new project.</p>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>Project Name <span className="req">*</span></label>
          <input 
            type="text" 
            placeholder="e.g. Dangote Refinery Road Works" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Client / Owner <span className="req">*</span></label>
          <input 
            type="text" 
            placeholder="Client Name" 
            value={formData.clientName}
            onChange={(e) => setFormData({...formData, clientName: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Project Region <span className="req">*</span></label>
          <div className="input-icon-wrapper">
            <MapPin size={16} className="input-icon" />
            <select 
              value={formData.region}
              onChange={(e) => setFormData({...formData, region: e.target.value})}
              className="pl-8"
            >
              <option value="Lagos">Lagos</option>
              <option value="Abuja">Abuja</option>
              <option value="Port_Harcourt">Port Harcourt</option>
              <option value="Ibadan">Ibadan</option>
              <option value="Kano">Kano</option>
            </select>
          </div>
        </div>
      </div>

      <div className="wizard-actions right">
        <button 
          className="btn-primary" 
          disabled={!formData.name.trim() || !formData.clientName.trim()} 
          onClick={handleNext}
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  // STEP 2: Structure Category
  const renderStep2 = () => (
    <div className="wizard-step view-fade-in">
      <div className="step-header">
        <button className="btn-back" onClick={handleBack}><ChevronLeft size={16} /> Back</button>
        <span className="step-number">Step 2 of 6</span>
        <h3>Structure Category</h3>
        <p>What is the main classification of this engineering project?</p>
      </div>

      <div className="selection-grid">
        {categories.map((cat) => (
          <div key={cat.id} className="selection-card" onClick={() => handleCategorySelect(cat.id)}>
            <div className="card-icon">{cat.icon}</div>
            <div className="card-body">
              <h4>{cat.label}</h4>
              <p>Standard templates for {cat.label.toLowerCase()} works.</p>
            </div>
            <ChevronRight size={18} className="arrow" />
          </div>
        ))}
      </div>
    </div>
  );

  // STEP 3: Structure Subtype
  const renderStep3 = () => {
    const categoryData = STRUCTURE_DATA[selectedCategory];
    const subtypes = Object.entries(categoryData.subtypes);

    return (
      <div className="wizard-step view-fade-in">
        <div className="step-header">
          <button className="btn-back" onClick={handleBack}><ChevronLeft size={16} /> Back</button>
          <span className="step-number">Step 3 of 6</span>
          <h3>Select {selectedCategory} Type</h3>
          <p>Choose the specific subtype to load specialized structural members.</p>
        </div>

        <div className="selection-grid">
          {subtypes.map(([name, data]) => (
            <div key={name} className="selection-card subtype-card" onClick={() => handleSubtypeSelect(name, data)}>
              <div className="card-body">
                <div className="title-row">
                  <h4>{name}</h4>
                  <CheckCircle2 size={16} className="check-icon" />
                </div>
                <p>{data.description}</p>
                <div className="preview-tags">
                  {data.sections.slice(0, 3).map(s => (
                    <span key={s.id} className="tag">{s.title.split('.')[1] || s.title}</span>
                  ))}
                  {data.sections.length > 3 && <span className="tag">+{data.sections.length - 3} more</span>}
                </div>
              </div>
              <ChevronRight size={18} className="arrow" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // STEP 4: BOQ Categories
  const renderStep4 = () => (
    <div className="wizard-step view-fade-in">
      <div className="step-header">
        <button className="btn-back" onClick={handleBack}><ChevronLeft size={16} /> Back</button>
        <span className="step-number">Step 4 of 6</span>
        <h3>BOQ Categories</h3>
        <p>Select the standard divisions of work required for this project. You can leave this empty if you plan to build everything in Custom Mode on the next step.</p>
      </div>

      <div className="checklist-grid">
        {subtypeData?.sections.map(section => {
          const isSelected = selectedSections.includes(section.id);
          return (
            <label key={section.id} className={`checklist-item ${isSelected ? 'selected' : ''}`}>
              <input 
                type="checkbox" 
                checked={isSelected}
                onChange={() => toggleSection(section.id)}
              />
              <div className="checklist-content">
                <h4>{section.title}</h4>
                <p>{section.items?.length || 0} sub-items tracked</p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="wizard-actions right">
        <button className="btn-primary" onClick={handleNext}>
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  // STEP 5: Pricing Setup
  const renderStep5 = () => (
    <div className="wizard-step view-fade-in">
      <div className="step-header">
        <button className="btn-back" onClick={handleBack}><ChevronLeft size={16} /> Back</button>
        <span className="step-number">Step 5 of 6</span>
        <h3>Project Mode</h3>
        <p>Choose whether to start from the standard template only or build a custom BOQ mix with your own sections and line items.</p>
      </div>

      <div className="intelligence-preview">
        <div className="mode-grid">
          <button
            type="button"
            className={`intel-card pricing-card mode-card ${formData.projectMode === 'default' ? 'active' : ''}`}
            onClick={() => setFormData(prev => ({ ...prev, projectMode: 'default', isUnpricedTemplate: true }))}
          >
            <div className="pricing-card-icon">
              <ClipboardList className="text-accent" size={24} />
            </div>
            <span className="mode-badge">Default Mode</span>
            <h4>Standard BOQ Template</h4>
            <p>Use only the selected template sections. Rates start from zero so you can price the BOQ yourself inside the workspace.</p>
            <div className="pricing-highlights">
              <div className="pricing-highlight">
                <strong>{selectedSections.length}</strong>
                <span>template sections</span>
              </div>
              <div className="pricing-highlight">
                <strong>0.00</strong>
                <span>starting rate</span>
              </div>
              <div className="pricing-highlight">
                <strong>User</strong>
                <span>controls pricing</span>
              </div>
            </div>
          </button>

          <button
            type="button"
            className={`intel-card pricing-card mode-card ${formData.projectMode === 'custom' ? 'active' : ''}`}
            onClick={() => setFormData(prev => ({ ...prev, projectMode: 'custom' }))}
          >
            <div className="pricing-card-icon custom">
              <Layers className="text-accent" size={24} />
            </div>
            <span className="mode-badge alt">Custom Mode</span>
            <h4>Template + Custom Builder</h4>
            <p>Mix template sections with your own custom sections, blank line items, and optional starter rates before the BOQ is created.</p>
            <div className="pricing-highlights">
              <div className="pricing-highlight">
                <strong>{normalizedCustomSections.length}</strong>
                <span>custom sections</span>
              </div>
              <div className="pricing-highlight">
                <strong>{customItemCount}</strong>
                <span>custom items</span>
              </div>
              <div className="pricing-highlight">
                <strong>{formData.isUnpricedTemplate ? 'Zero' : 'Mixed'}</strong>
                <span>rate strategy</span>
              </div>
            </div>
          </button>
        </div>

        {formData.projectMode === 'custom' && (
          <div className="custom-builder">
            <div className="builder-header">
              <div>
                <h4>Custom Builder</h4>
                <p>Add new BOQ sections and line items before the project is generated.</p>
              </div>
              <button type="button" className="btn-outline" onClick={addCustomSection}>
                <Plus size={14} /> Add Section
              </button>
            </div>

            <div className="pricing-strategy">
              <span className="strategy-label">Rate Setup</span>
              <div className="strategy-toggle">
                <button
                  type="button"
                  className={`strategy-btn ${formData.isUnpricedTemplate ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, isUnpricedTemplate: true }))}
                >
                  Start Unpriced
                </button>
                <button
                  type="button"
                  className={`strategy-btn ${!formData.isUnpricedTemplate ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, isUnpricedTemplate: false }))}
                >
                  Keep Starter Rates
                </button>
              </div>
            </div>

            {customSections.length === 0 ? (
              <div className="builder-empty">
                <strong>No custom sections added yet.</strong>
                <span>Add one if you want a custom-only BOQ or extra work sections beyond the template.</span>
              </div>
            ) : (
              <div className="custom-sections-list">
                {customSections.map((section, sectionIndex) => (
                  <div key={section.id} className="custom-section-card">
                    <div className="custom-section-head">
                      <div className="form-group compact grow">
                        <label>Section Title</label>
                        <input
                          type="text"
                          placeholder={`e.g. ${sectionIndex + 1}. SPECIAL INSTALLATIONS`}
                          value={section.title}
                          onChange={(e) => updateCustomSectionTitle(section.id, e.target.value)}
                        />
                      </div>
                      <button type="button" className="btn-icon-danger" onClick={() => removeCustomSection(section.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="custom-items-list">
                      {section.items.map((item, itemIndex) => (
                        <div key={item.id} className="custom-item-card">
                          <div className="custom-item-top">
                            <span className="custom-item-label">Line Item {itemIndex + 1}</span>
                            <button type="button" className="btn-text-danger" onClick={() => removeCustomItem(section.id, item.id)}>
                              Remove
                            </button>
                          </div>
                          <div className="custom-item-grid">
                            <div className="form-group compact span-2">
                              <label>Description</label>
                              <input
                                type="text"
                                placeholder="Describe the work item"
                                value={item.description}
                                onChange={(e) => updateCustomItem(section.id, item.id, 'description', e.target.value)}
                              />
                            </div>
                            <div className="form-group compact">
                              <label>Unit</label>
                              <input
                                type="text"
                                placeholder="m2"
                                value={item.unit}
                                onChange={(e) => updateCustomItem(section.id, item.id, 'unit', e.target.value)}
                              />
                            </div>
                            <div className="form-group compact">
                              <label>Qty</label>
                              <input
                                type="number"
                                min="0"
                                value={item.qty}
                                onChange={(e) => updateCustomItem(section.id, item.id, 'qty', e.target.value)}
                              />
                            </div>
                            <div className="form-group compact">
                              <label>Rate</label>
                              <input
                                type="number"
                                min="0"
                                value={item.rate}
                                onChange={(e) => updateCustomItem(section.id, item.id, 'rate', e.target.value)}
                              />
                            </div>
                            <div className="form-group compact">
                              <label>Subcategory</label>
                              <input
                                type="text"
                                placeholder="Custom Work"
                                value={item.subcategory}
                                onChange={(e) => updateCustomItem(section.id, item.id, 'subcategory', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button type="button" className="btn-outline subtle" onClick={() => addCustomItem(section.id)}>
                      <Plus size={14} /> Add Item
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="wizard-actions right">
        <button className="btn-primary" disabled={totalPlannedSections === 0} onClick={handleNext}>
          Review Project <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  // STEP 6: Review
  const renderStep6 = () => (
    <div className="wizard-step view-fade-in">
      <div className="step-header">
        <button className="btn-back" onClick={handleBack}><ChevronLeft size={16} /> Back</button>
        <span className="step-number">Step 6 of 6</span>
        <h3>Final Review</h3>
        <p>Review the details before generating the BOQ spreadsheet.</p>
      </div>

      <div className="summary-card">
        <div className="summary-group">
          <h5>Project Meta</h5>
          <div className="summary-row"><span>Name:</span> <strong>{formData.name}</strong></div>
          <div className="summary-row"><span>Client:</span> <strong>{formData.clientName}</strong></div>
          <div className="summary-row"><span>Region:</span> <strong>{formData.region}</strong></div>
        </div>
        
        <div className="summary-group">
          <h5>Structure Classification</h5>
          <div className="summary-row"><span>Category:</span> <strong>{selectedCategory}</strong></div>
          <div className="summary-row"><span>Subtype:</span> <strong>{selectedSubtype}</strong></div>
          <div className="summary-row"><span>Mode:</span> <strong>{formData.projectMode === 'custom' ? 'Custom Builder' : 'Default Template'}</strong></div>
          <div className="summary-row"><span>Template Sections:</span> <strong>{selectedSections.length} selected</strong></div>
          <div className="summary-row"><span>Custom Sections:</span> <strong>{normalizedCustomSections.length}</strong></div>
          <div className="summary-row"><span>Custom Items:</span> <strong>{customItemCount}</strong></div>
          <div className="summary-row"><span>Total Sections:</span> <strong>{totalPlannedSections}</strong></div>
          <div className="summary-row"><span>Pricing:</span> <strong>{formData.isUnpricedTemplate ? 'User-priced BOQ (rates start at 0)' : 'Starter and custom rates included'}</strong></div>
        </div>

        <div className="form-group mt-4">
          <label>Initial Assumptions (Optional)</label>
          <textarea 
            placeholder="Enter any initial assumptions here..."
            value={formData.assumptions}
            onChange={(e) => setFormData({...formData, assumptions: e.target.value})}
            rows={2}
          />
        </div>

        <div className="form-group mt-3">
          <label>Standard Exclusions (Optional)</label>
          <textarea 
            placeholder="State any exclusions from this estimate..."
            value={formData.exclusions}
            onChange={(e) => setFormData({...formData, exclusions: e.target.value})}
            rows={2}
          />
        </div>
      </div>

      <div className="wizard-actions end">
        <button className="btn-generate" disabled={totalPlannedSections === 0} onClick={handleGenerate}>
          <Save size={16} /> Generate BOQ
        </button>
      </div>
    </div>
  );

  const getStepContent = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return renderStep1();
    }
  };

  // Calculate Progress Percent
  const progressPercent = ((step - 1) / 5) * 100;

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal enterprise-card">
        <header className="wizard-nav">
          <div className="brand">
            <Layers size={20} className="text-accent" />
            <span>Smart Project Builder</span>
          </div>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </header>

        {/* Progress Bar */}
        <div className="wizard-progress-bar">
          <div className="wizard-progress-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="wizard-content">
          {getStepContent()}
        </div>
      </div>

      <style jsx="true">{`
        .wizard-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1100; padding: 1rem;
        }

        .wizard-modal {
          width: 100%; max-width: 680px;
          background: white; padding: 0; overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          display: flex; flex-direction: column;
        }

        .wizard-nav {
          padding: 1.25rem 2rem; border-bottom: 1px solid var(--border-light);
          display: flex; justify-content: space-between; align-items: center;
          background: #f8fafc;
        }

        .brand {
          display: flex; align-items: center; gap: 0.75rem;
          font-weight: 800; font-size: 0.875rem; color: var(--primary-900);
        }

        .btn-close {
          background: transparent; border: none; color: var(--primary-400); cursor: pointer;
          transition: color 0.2s;
        }
        .btn-close:hover { color: var(--primary-900); }

        .wizard-progress-bar {
          height: 4px; background: var(--border-light); width: 100%;
        }
        .wizard-progress-fill {
          height: 100%; background: var(--accent-600);
          transition: width 0.3s ease;
        }

        .wizard-content {
          padding: 2.5rem; min-height: 450px; max-height: 80vh; overflow-y: auto;
          display: flex; flex-direction: column;
        }

        .step-header { margin-bottom: 2rem; position: relative; }
        .step-number {
          font-size: 0.625rem; font-weight: 800; text-transform: uppercase;
          color: var(--accent-600); letter-spacing: 0.1em; display: block; margin-bottom: 0.5rem;
        }
        .step-header h3 { font-size: 1.75rem; color: var(--primary-900); margin-bottom: 0.5rem; }
        .step-header p { font-size: 0.9375rem; color: var(--primary-500); }

        .btn-back {
          position: absolute; top: -3rem; left: 0;
          background: transparent; border: none;
          display: flex; align-items: center; gap: 0.25rem;
          font-size: 0.75rem; font-weight: 700; color: var(--primary-500); cursor: pointer;
        }

        /* Forms */
        .form-grid { display: flex; flex-direction: column; gap: 1.25rem; margin-bottom: 2rem; flex: 1; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-group label { font-size: 0.8125rem; font-weight: 700; color: var(--primary-700); }
        .form-group .req { color: #ef4444; }
        .form-group input, .form-group select, .form-group textarea {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          outline: none; transition: all 0.2s;
          background: white;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          border-color: var(--accent-500);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .input-icon-wrapper { position: relative; }
        .input-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--primary-400); pointer-events: none; }
        .pl-8 { padding-left: 2.5rem !important; }

        /* Step 2/3 Grids */
        .selection-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        .selection-card {
          display: flex; align-items: center; gap: 1.5rem; padding: 1.5rem;
          border: 1px solid var(--border-medium); border-radius: 12px; cursor: pointer;
          transition: all 0.2s; background: white;
        }
        .selection-card:hover { border-color: var(--accent-600); box-shadow: 0 4px 12px rgba(37,99,235,0.08); transform: translateX(4px); }
        .card-icon { width: 48px; height: 48px; background: rgba(37, 99, 235, 0.05); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
        .card-body { flex: 1; }
        .card-body h4 { font-size: 1.0625rem; color: var(--primary-900); }
        .card-body p { font-size: 0.8125rem; color: var(--primary-500); }
        .subtype-card .title-row { display: flex; align-items: center; justify-content: space-between; }
        .check-icon { color: transparent; transition: color 0.2s; }
        .selection-card:hover .check-icon { color: var(--accent-600); }
        .preview-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
        .tag { font-size: 0.625rem; font-weight: 700; background: rgba(37, 99, 235, 0.05); color: var(--accent-700); padding: 2px 8px; border-radius: 20px; }

        /* Step 4: Checklist */
        .checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
        .checklist-item {
          display: flex; gap: 1rem; align-items: flex-start; padding: 1rem;
          border: 1px solid var(--border-light); border-radius: 8px; cursor: pointer;
          transition: all 0.2s; background: #f8fafc;
        }
        .checklist-item.selected { border-color: var(--accent-500); background: #eff6ff; }
        .checklist-item input { margin-top: 0.25rem; cursor: pointer; }
        .checklist-content h4 { font-size: 0.875rem; color: var(--primary-900); margin-bottom: 0.25rem; }
        .checklist-content p { font-size: 0.75rem; color: var(--primary-500); }

        /* Step 5: Intel Preview */
        .intelligence-preview { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem; flex: 1; }
        .mode-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }
        .intel-card {
          background: #eff6ff; border: 1px solid #bfdbfe; padding: 2rem; border-radius: 12px;
          text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem;
        }
        .mode-card {
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .mode-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
        }
        .mode-card.active {
          border-color: var(--accent-600);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .intel-card h4 { font-size: 1.25rem; color: var(--primary-900); }
        .intel-card p { font-size: 0.875rem; color: var(--primary-600); line-height: 1.6; max-width: 400px; }
        .pricing-card {
          background: linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%);
          border-color: #cbd5e1;
        }
        .pricing-card-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(37, 99, 235, 0.08);
        }
        .pricing-card-icon.custom {
          background: rgba(16, 185, 129, 0.12);
        }
        .mode-badge {
          font-size: 0.6875rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--accent-700);
          background: rgba(37, 99, 235, 0.08);
          padding: 0.35rem 0.65rem;
          border-radius: 999px;
        }
        .mode-badge.alt {
          color: #047857;
          background: rgba(16, 185, 129, 0.12);
        }
        .pricing-highlights {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
          margin-top: 0.5rem;
        }
        .pricing-highlight {
          padding: 0.85rem;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.25);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .pricing-highlight strong {
          font-size: 1rem;
          color: var(--primary-900);
        }
        .pricing-highlight span {
          font-size: 0.75rem;
          color: var(--primary-500);
        }
        .custom-builder {
          background: #f8fafc;
          border: 1px solid var(--border-light);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .builder-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }
        .builder-header h4 {
          font-size: 1.0625rem;
          color: var(--primary-900);
          margin-bottom: 0.25rem;
        }
        .builder-header p {
          font-size: 0.8125rem;
          color: var(--primary-500);
        }
        .pricing-strategy {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 0.9rem 1rem;
          border: 1px solid var(--border-light);
          border-radius: 12px;
          background: white;
        }
        .strategy-label {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--primary-700);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .strategy-toggle {
          display: inline-flex;
          background: #e2e8f0;
          padding: 4px;
          border-radius: 999px;
          gap: 0.25rem;
        }
        .strategy-btn {
          border: none;
          background: transparent;
          border-radius: 999px;
          padding: 0.55rem 0.9rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
        }
        .strategy-btn.active {
          background: white;
          color: var(--accent-700);
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .builder-empty {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          padding: 1rem;
          border-radius: 12px;
          border: 1px dashed #cbd5e1;
          background: white;
          color: var(--primary-600);
        }
        .builder-empty strong {
          color: var(--primary-900);
        }
        .custom-sections-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .custom-section-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .custom-section-head {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }
        .grow { flex: 1; }
        .compact { gap: 0.35rem; }
        .compact label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .custom-items-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .custom-item-card {
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 0.9rem;
          background: #f8fafc;
        }
        .custom-item-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .custom-item-label {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--primary-700);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .custom-item-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }
        .span-2 {
          grid-column: span 2;
        }
        .btn-outline {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          background: white;
          color: var(--primary-700);
          border: 1px solid var(--border-medium);
          padding: 0.7rem 1rem;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-outline.subtle {
          align-self: flex-start;
          padding: 0.6rem 0.85rem;
          font-size: 0.75rem;
        }
        .btn-outline:hover {
          border-color: var(--accent-500);
          color: var(--accent-700);
        }
        .btn-icon-danger,
        .btn-text-danger {
          border: none;
          background: transparent;
          color: #dc2626;
          cursor: pointer;
          font-weight: 700;
        }
        .btn-icon-danger {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #fef2f2;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .btn-text-danger {
          font-size: 0.75rem;
        }

        /* Step 6: Summary */
        .summary-card { background: #f8fafc; border: 1px solid var(--border-light); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; flex: 1; }
        .summary-group { margin-bottom: 1.5rem; }
        .summary-group h5 { font-size: 0.75rem; font-weight: 800; color: var(--primary-400); text-transform: uppercase; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem; }
        .summary-row { display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.5rem; }
        .summary-row span { color: var(--primary-500); }
        .summary-row strong { color: var(--primary-900); font-weight: 600; }

        /* Wizard Nav Buttons */
        .wizard-actions { display: flex; gap: 1rem; margin-top: auto; }
        .wizard-actions.right { justify-content: flex-end; }
        .wizard-actions.end { justify-content: flex-end; }
        .btn-primary {
          display: flex; align-items: center; gap: 0.5rem;
          background: var(--accent-600); color: white; border: none; padding: 0.75rem 1.5rem;
          border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;
          transition: background 0.2s;
        }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary:hover:not(:disabled) { background: var(--accent-700); }
        
        .btn-generate {
          display: flex; align-items: center; gap: 0.5rem;
          background: #10b981; color: white; border: none; padding: 0.75rem 2rem;
          border-radius: var(--radius-sm); font-weight: 700; cursor: pointer;
          transition: background 0.2s; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }
        .btn-generate:hover { background: #059669; }
        .btn-generate:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }

        @media (max-width: 640px) {
          .wizard-modal { height: 100vh; max-height: 100vh; border-radius: 0; }
          .wizard-content { padding: 1.5rem; }
          .checklist-grid { grid-template-columns: 1fr; }
          .mode-grid { grid-template-columns: 1fr; }
          .pricing-highlights { grid-template-columns: 1fr; }
          .pricing-strategy,
          .builder-header,
          .custom-section-head,
          .custom-item-top {
            flex-direction: column;
            align-items: stretch;
          }
          .custom-item-grid { grid-template-columns: 1fr; }
          .span-2 { grid-column: span 1; }
        }
      `}</style>
    </div>
  );
};

export default ProjectWizard;
