import React, { useState, useEffect } from 'react';
import { useToast } from '../ui/useToast';
import { useAuth } from '../../context/useAuth';
import RateAnalysisModal from './RateAnalysisModal';
import CustomPricingModal from './CustomPricingModal';
import GeometricCalculator from './GeometricCalculator';
import BidManagerModal from './BidManagerModal';
import TeamHubPanel from './TeamHubPanel';
import StructuralAnalyzer from './StructuralAnalyzer';
import ProjectNotesAccordion from './ProjectNotesAccordion';
import { getRegionalModifier } from '../../utils/aiService';
import { getMaterials } from '../../db/database';
import { buildCompanyKey, deriveCompanyName } from '../../utils/companyAccess';
import {
  startPresence,
  stopPresence,
  subscribeToPresence,
  subscribeToActivity,
} from '../../db/collaborationService';
import {
  Plus,
  Trash2,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  Calculator,
  ShieldCheck,
  AlertCircle,
  Zap,
  Gavel,
  AlertTriangle,
  Copy,
  MessagesSquare,
  Database,
  Save,
  SlidersHorizontal
} from 'lucide-react';

const BOQWorkspace = ({ project, launchIntent, onLaunchIntentHandled, onUpdate, onAddSection, onExport, onDelete }) => {
  const [sections, setSections] = useState(project?.sections || []);
  const [analyzingItem, setAnalyzingItem] = useState(null);
  const [customPricingItem, setCustomPricingItem] = useState(null);
  const [calculatingQtyForItem, setCalculatingQtyForItem] = useState(null);
  const [biddingItem, setBiddingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('estimation');
  const [showStructuralAnalyzer, setShowStructuralAnalyzer] = useState(false);

  // Collaboration state
  const [showTeamHub, setShowTeamHub] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);

  const toast = useToast();
  const { user } = useAuth();
  const isCustomWorkspace = project?.projectMode === 'custom';

  React.useEffect(() => {
    if (project?.sections) {
      setSections(project.sections);
    }
  }, [project]);

  useEffect(() => {
    if (!project?.id || !isCustomWorkspace || !user?.email) return;

    const company_name = project.company_name || deriveCompanyName({
      companyName: user.company_name,
      email: user.email
    });
    const company_key = project.company_key || buildCompanyKey({
      companyKey: user.company_key,
      companyName: company_name,
      email: user.email
    });

    const metadataUpdates = {};
    if (project.access_mode !== 'company') metadataUpdates.access_mode = 'company';
    if (project.company_name !== company_name) metadataUpdates.company_name = company_name;
    if (project.company_key !== company_key) metadataUpdates.company_key = company_key;
    if (!project.share_enabled) metadataUpdates.share_enabled = true;
    if (!project.collaboration_enabled) metadataUpdates.collaboration_enabled = true;

    if (Object.keys(metadataUpdates).length > 0) {
      onUpdate(project.id, sections, project.region, metadataUpdates);
    }
  }, [
    isCustomWorkspace,
    onUpdate,
    project,
    sections,
    user?.company_key,
    user?.company_name,
    user?.email
  ]);

  // Presence subscription
  useEffect(() => {
    if (!project?.id || !isCustomWorkspace) return;
    startPresence(project.id);
    const unsubPresence = subscribeToPresence(project.id, setPresenceUsers);
    return () => {
      stopPresence(project.id);
      unsubPresence();
    };
  }, [isCustomWorkspace, project?.id]);

  // Activity log subscription
  useEffect(() => {
    if (!project?.id || !isCustomWorkspace) return;
    const unsubActivity = subscribeToActivity(project.id, setActivityLog);
    return () => unsubActivity();
  }, [isCustomWorkspace, project?.id]);

  useEffect(() => {
    if (!launchIntent || launchIntent.type !== 'custom-pricing-test') return;
    if (launchIntent.projectId !== project?.id) return;

    const availableItems = (sections || []).flatMap((section) =>
      (section.items || []).map((item) => ({ sectionId: section.id, item }))
    );
    const target = launchIntent.itemId
      ? availableItems.find(({ item }) => item.id === launchIntent.itemId)
      : availableItems[0];

    const frameId = window.requestAnimationFrame(() => {
      if (target) {
        setCustomPricingItem(target);
      } else {
        toast.info('No item is available for the custom pricing test yet.');
      }

      onLaunchIntentHandled?.();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [launchIntent, onLaunchIntentHandled, project?.id, sections, toast]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2'];

  const cloneBreakdown = (breakdown) => {
    if (!breakdown) return null;

    return {
      ...breakdown,
      materials: Array.isArray(breakdown.materials) ? breakdown.materials.map((row) => ({ ...row })) : [],
      labor: Array.isArray(breakdown.labor) ? breakdown.labor.map((row) => ({ ...row })) : [],
      plant: Array.isArray(breakdown.plant) ? breakdown.plant.map((row) => ({ ...row })) : [],
      transport: Array.isArray(breakdown.transport) ? breakdown.transport.map((row) => ({ ...row })) : []
    };
  };

  const getEffectiveBenchmarkRate = (item) => {
    const baseBenchmark = Number(item?.benchmark) || 0;
    if (!baseBenchmark) return 0;
    return baseBenchmark * getRegionalModifier(project?.region || 'Lagos');
  };

  const toggleSection = (sectionId) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, expanded: !s.expanded } : s
    ));
  };

  const updateSectionTitle = (sectionId, newTitle) => {
    const updated = sections.map(s =>
      s.id === sectionId ? { ...s, title: newTitle } : s
    );
    setSections(updated);
    onUpdate(project.id, updated);
  };

  const updateItem = (sectionId, itemId, fieldOrUpdates, valueOrBreakdown = null, breakdown = null) => {
    const updated = sections.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        items: section.items.map(item => {
          if (item.id !== itemId) return item;
          let updatedItem;
          if (typeof fieldOrUpdates === 'object') {
            updatedItem = { ...item, ...fieldOrUpdates };
          } else {
            updatedItem = { ...item, [fieldOrUpdates]: valueOrBreakdown };
            if (breakdown) updatedItem.breakdown = breakdown;
          }
          const rateToUse = updatedItem.useBenchmark ? getEffectiveBenchmarkRate(updatedItem) : (Number(updatedItem.rate) || 0);
          updatedItem.total = updatedItem.qty * rateToUse;
          if (updatedItem.qtyCompleted !== undefined) {
            updatedItem.progressPercent = updatedItem.qty > 0 ? (updatedItem.qtyCompleted / updatedItem.qty) * 100 : 0;
          }
          return updatedItem;
        })
      };
    });
    setSections(updated);
    onUpdate(project.id, updated);
  };

  const handleRateApply = (rate, breakdown) => {
    if (!analyzingItem) return;
    updateItem(analyzingItem.sectionId, analyzingItem.item.id, {
      rate: rate,
      rateSource: 'calculated',
      useBenchmark: false,
      breakdown: breakdown,
      customPricing: null
    });
    setAnalyzingItem(null);
  };

  const handleCustomPricingSave = (rate, customPricing) => {
    if (!customPricingItem) return;

    updateItem(customPricingItem.sectionId, customPricingItem.item.id, {
      rate,
      rateSource: 'custom',
      useBenchmark: false,
      customPricing: {
        ...customPricing,
        savedAt: new Date().toISOString()
      }
    });
    setCustomPricingItem(null);
  };

  const handleManualRateChange = (sectionId, item, nextRate) => {
    updateItem(sectionId, item.id, {
      rate: Number(nextRate) || 0,
      rateSource: 'manual',
      useBenchmark: false,
      customPricing: null
    });
  };

  const openDetailedAnalysis = (sectionId, item) => {
    setCustomPricingItem(null);
    setAnalyzingItem({ sectionId, item });
  };

  const activateCustomPricing = (sectionId, item) => {
    updateItem(sectionId, item.id, {
      useBenchmark: false,
      rateSource: item.customPricing
        ? 'custom'
        : item.breakdown
          ? 'calculated'
          : item.rateSource === 'benchmark'
            ? 'manual'
            : (item.rateSource || 'manual')
    });
  };

  const activateBenchmarkPricing = (sectionId, item) => {
    const regionalModifier = getRegionalModifier(project?.region || 'Lagos');
    const derivedBenchmark = item.benchmark || ((Number(item.rate) || 0) / Math.max(regionalModifier, 0.001));

    updateItem(sectionId, item.id, {
      useBenchmark: true,
      rateSource: 'benchmark',
      benchmark: derivedBenchmark || 0
    });
  };

  const handleStructuralImport = (importedSections) => {
    // Append the new sections to the existing ones
    // We clean the sections to ensure IDs don't collide if they were generated statically
    const newSections = importedSections.map(section => ({
      ...section,
      id: section.id || `ext-${Date.now()}-${Math.random()}`,
      items: section.items.map(item => ({
        ...item,
        id: item.id || Date.now() + Math.random(),
        subcategory: item.subcategory || '',
        materials: Array.isArray(item.materials) ? item.materials : [],
        rate: 0,
        total: 0,
        benchmark: 0,
        useBenchmark: false,
        rateSource: 'manual',
        customPricing: null
      }))
    }));

    const updated = [...sections, ...newSections];
    setSections(updated);
    onUpdate(project.id, updated);
    setShowStructuralAnalyzer(false);
  };

  const autoRateProject = async () => {
    // 1. Fetch real-time benchmarks from the database
    const dbMaterials = await getMaterials();
    const regionMod = getRegionalModifier(project?.region || 'Lagos');

    // 2. Map database materials to a searchable dictionary
    const benchmarkMap = {};
    dbMaterials.forEach(mat => {
      const key = mat.name.toLowerCase().split(' ')[0]; // Use first word as key
      benchmarkMap[key] = Number(mat.benchmark || mat.price || 0);
    });

    // Fallback static benchmarks for common items not in DB
    const fallbacks = {
      'concrete': 75000,
      'reinforcement': 1250000,
      'steel': 1250000,
      'formwork': 12500,
      'excavation': 8500
    };

    const updated = sections.map(section => ({
      ...section,
      items: section.items.map(item => {
        if (item.rate > 0 && item.benchmark > 0) return item;

        const desc = item.description.toLowerCase();
        let matchedBenchmark = 0;

        // Try DB matches first
        for (const [key, benchmark] of Object.entries(benchmarkMap)) {
          if (desc.includes(key)) {
            matchedBenchmark = benchmark;
            break;
          }
        }

        // Try fallbacks if no DB match
        if (matchedBenchmark === 0) {
          for (const [key, price] of Object.entries(fallbacks)) {
            if (desc.includes(key)) {
              matchedBenchmark = price;
              break;
            }
          }
        }

        if (matchedBenchmark > 0) {
          const regionalBenchmark = matchedBenchmark * regionMod;
          const rateToKeep = Number(item.rate) > 0 ? Number(item.rate) : regionalBenchmark;
          const totalToUse = item.useBenchmark ? (Number(item.qty) || 0) * regionalBenchmark : (Number(item.qty) || 0) * rateToKeep;

          return {
            ...item,
            benchmark: matchedBenchmark,
            rate: rateToKeep,
            total: totalToUse,
            rateSource: Number(item.rate) > 0 ? item.rateSource : 'calculated'
          };
        }
        return item;
      })
    }));

    setSections(updated);
    onUpdate(project.id, updated, project?.region);
  };

  const toggleVO = (sectionId, itemId) => {
    updateItem(sectionId, itemId, 'isVO', !sections.find(s => s.id === sectionId)?.items.find(i => i.id === itemId)?.isVO);
  };

  const addItemToSection = (sectionId) => {
    const updated = sections.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        items: [...section.items, {
          id: Date.now(),
          description: 'New Work Item',
          unit: 'm²',
          qty: 0,
          rate: 0,
          total: 0,
          subcategory: 'Custom Item',
          materials: [],
          benchmark: 0,
          useBenchmark: false,
          rateSource: 'manual',
          qtySource: 'manual',
          customPricing: null
        }]
      };
    });
    setSections(updated);
    onUpdate(project.id, updated);
  };

  const duplicateItem = (sectionId, itemId) => {
    const updated = sections.map((section) => {
      if (section.id !== sectionId) return section;
      const index = (section.items || []).findIndex((itm) => itm.id === itemId);
      if (index < 0) return section;

      const sourceItem = section.items[index];
      const duplicate = {
        ...sourceItem,
        id: Date.now() + Math.random(),
        description: `${sourceItem.description} (Copy)`,
        materials: Array.isArray(sourceItem.materials) ? [...sourceItem.materials] : [],
        breakdown: cloneBreakdown(sourceItem.breakdown),
        customPricing: sourceItem.customPricing ? { ...sourceItem.customPricing } : null
      };

      const nextItems = [...section.items];
      nextItems.splice(index + 1, 0, duplicate);
      return { ...section, items: nextItems };
    });

    setSections(updated);
    onUpdate(project.id, updated);
  };

  const isOutlier = (rate, benchmark) => {
    if (!benchmark || benchmark === 0 || !rate) return false;
    const ratio = rate / benchmark;
    return ratio > 1.5 || ratio < 0.5;
  };

  const getRateSourceMeta = (item) => {
    if (item.useBenchmark) return { label: 'Benchmark', tone: 'benchmark' };
    if (item.rateSource === 'custom') return { label: 'Custom pricing', tone: 'custom' };
    if (item.rateSource === 'calculated') return { label: 'Rate analysis', tone: 'calculated' };
    if (item.rateSource === 'benchmark') return { label: 'Benchmarked', tone: 'benchmark' };
    return { label: 'Manual rate', tone: 'manual' };
  };

  const getBenchmarkDeltaMeta = (item) => {
    if (item.useBenchmark) return null;

    const benchmarkRate = getEffectiveBenchmarkRate(item);
    const customRate = Number(item.rate) || 0;
    if (!benchmarkRate || !customRate) return null;

    const delta = ((customRate - benchmarkRate) / benchmarkRate) * 100;
    const absDelta = Math.abs(delta);

    if (absDelta < 0.5) {
      return { text: 'At market benchmark', tone: 'aligned' };
    }

    return {
      text: `${delta > 0 ? '+' : ''}${delta.toFixed(1)}% vs benchmark`,
      tone: delta > 0 ? 'high' : 'low'
    };
  };

  const filteredSections = React.useMemo(() => {
    if (!searchQuery?.trim()) return sections || [];
    const query = searchQuery.toLowerCase();
    return (sections || []).map(section => {
      const filteredItems = (section.items || []).filter(item =>
        (item.description || '').toLowerCase().includes(query) ||
        (item.unit || '').toLowerCase().includes(query) ||
        (item.subcategory || '').toLowerCase().includes(query) ||
        (item.materials || []).join(' ').toLowerCase().includes(query)
      );
      if (filteredItems.length > 0 || (section.title || '').toLowerCase().includes(query)) {
        return { ...section, items: filteredItems, expanded: true };
      }
      return null;
    }).filter(Boolean);
  }, [sections, searchQuery]);

  const calculateGrandTotal = React.useMemo(() => {
    return (sections || []).reduce((acc, section) =>
      acc + (section.items || []).reduce((sum, item) => sum + (item.total || 0), 0), 0
    );
  }, [sections]);

  const totalQuantity = React.useMemo(() => {
    return (sections || []).reduce(
      (acc, section) => acc + (section.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
      0
    );
  }, [sections]);

  const totalItems = (sections || []).reduce((a, s) => a + (s.items?.length || 0), 0);

  return (
    <div className="ws-container">
      {/* Toolbar */}
      <div className="ws-toolbar">
        <div className="ws-toolbar-left">
          <div className="ws-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search items…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="ws-mode-switch">
            <button className={`ws-mode-btn ${viewMode === 'estimation' ? 'active' : ''}`} onClick={() => setViewMode('estimation')}>
              <Calculator size={12} /> Estimation
            </button>
            <button className={`ws-mode-btn ${viewMode === 'valuation' ? 'active' : ''}`} onClick={() => setViewMode('valuation')}>
              <ShieldCheck size={12} /> Valuation
            </button>
          </div>
        </div>
        <div className="ws-toolbar-center">
          <div className="ws-stat"><span className="ws-stat-label">Region</span>
            <select className="ws-region-sel" value={project?.region || 'Lagos'} onChange={(e) => onUpdate(project.id, sections, e.target.value)}>
              <option value="Lagos">Lagos</option>
              <option value="Abuja">Abuja</option>
              <option value="Port_Harcourt">PH</option>
              <option value="Ibadan">Ibadan</option>
              <option value="Kano">Kano</option>
            </select>
          </div>
          <div className="ws-stat"><span className="ws-stat-label">Sections</span><span className="ws-stat-val">{sections.length}</span></div>
          <div className="ws-stat"><span className="ws-stat-label">Items</span><span className="ws-stat-val">{totalItems}</span></div>
          <div className="ws-stat"><span className="ws-stat-label">Total Qty</span><span className="ws-stat-val">{totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
          <div className="ws-stat ws-stat-total"><span className="ws-stat-label">Total</span><span className="ws-stat-val">₦{calculateGrandTotal.toLocaleString()}</span></div>
        </div>
        <div className="ws-toolbar-right">
          {/* Presence Avatars */}
          {isCustomWorkspace && presenceUsers.length > 0 && (
            <div className="ws-presence">
              {presenceUsers.slice(0, 4).map((u, i) => (
                <div
                  key={u.id}
                  className="ws-avatar"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  title={`${u.displayName || u.email} (online)`}
                >
                  {getInitials(u.displayName || u.email)}
                  <span className="ws-avatar-dot" />
                </div>
              ))}
              {presenceUsers.length > 4 && (
                <div className="ws-avatar ws-avatar-more">+{presenceUsers.length - 4}</div>
              )}
            </div>
          )}
          {isCustomWorkspace && (
            <button className="ws-btn ws-btn-custom" onClick={() => setShowTeamHub(true)} title="Open company workspace">
              <MessagesSquare size={14} /> Custom Hub
            </button>
          )}
          <button className="ws-btn ws-btn-ghost" onClick={() => {
            const firstItem = (sections || []).flatMap(s => s.items || [])[0];
            if (firstItem) {
              setAnalyzingItem({ sectionId: sections.find(s => (s.items || []).includes(firstItem))?.id, item: firstItem });
            }
          }}>
            <Calculator size={14} /> Rate Analysis
          </button>
          <button className="ws-btn ws-btn-ghost" onClick={() => setShowStructuralAnalyzer(true)} title="Import Structural File">
            <Database size={14} /> Import Design
          </button>
          <button className="ws-btn ws-btn-ghost" onClick={autoRateProject} title="Auto-Assign Rates">
            <Zap size={14} className="text-accent-500" /> Auto-Rate
          </button>
          <button className="ws-btn ws-btn-ghost" onClick={() => toast.success('Project saved as a reusable template.')} title="Save as Template">
            <Save size={14} /> Save Template
          </button>
          <button className="ws-btn ws-btn-ghost" onClick={onExport}><Download size={14} /> Export</button>
          <button className="ws-btn ws-btn-primary" onClick={onAddSection}><Plus size={14} /> Section</button>
        </div>
      </div>

      {/* Table */}
      <div className="ws-table-wrap">
        <table className="ws-table">
          <thead>
            <tr>
              <th className="ws-th-num">Item No</th>
              <th className="ws-th-desc">Description</th>
              <th className="ws-th-unit">Unit</th>
              <th className="ws-th-qty">Quantity</th>
              {viewMode === 'valuation' ? (
                <>
                  <th className="ws-th-sm">DONE</th>
                  <th className="ws-th-sm">%</th>
                </>
              ) : (
                <th className="ws-th-strategy">STRATEGY</th>
              )}
              <th className="ws-th-rate">Rate (₦)</th>
              <th className="ws-th-total">Amount (₦)</th>
              <th className="ws-th-act"></th>
            </tr>
          </thead>
          <tbody>
            {filteredSections.map((section, sIdx) => {
              const sectionSubtotal = (section.items || []).reduce((a, i) => a + (i.total || 0), 0);
              const sectionQty = (section.items || []).reduce((a, i) => a + (Number(i.qty) || 0), 0);

              return (
                <React.Fragment key={section.id}>
                  {/* Section Header */}
                  <tr className="ws-section-row" onClick={() => toggleSection(section.id)}>
                    <td colSpan={viewMode === 'valuation' ? 8 : 7} className="ws-section-cell">
                      <div className="ws-section-inner">
                        {section.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span className="ws-section-letter">{String.fromCharCode(65 + sIdx)}</span>
                        <input
                          type="text"
                          className="ws-section-title-input"
                          value={section.title}
                          onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="ws-section-meta">QTY {sectionQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span className="ws-section-badge">{section.items?.length || 0}</span>
                        {!section.expanded && (
                          <span className="ws-section-total">₦{sectionSubtotal.toLocaleString()}</span>
                        )}
                      </div>
                    </td>
                    <td className="ws-act-cell">
                      <button className="ws-btn-icon ws-btn-danger" onClick={(e) => { e.stopPropagation(); onDelete(project.id, section.id); }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                  {/* Items */}
                  {section.expanded && (section.items || []).map((item, idx) => {
                    const currentSubcategory = (item.subcategory || 'General').trim() || 'General';
                    const previousSubcategory = idx > 0
                      ? (((section.items || [])[idx - 1]?.subcategory || 'General').trim() || 'General')
                      : null;
                    const showSubcategoryHeader = idx === 0 || currentSubcategory !== previousSubcategory;
                    const benchmarkRate = getEffectiveBenchmarkRate(item);
                    const outlier = !item.useBenchmark && isOutlier(item.rate, benchmarkRate);
                    const rate = item.useBenchmark ? benchmarkRate : item.rate;
                    const rateSourceMeta = getRateSourceMeta(item);
                    const benchmarkDeltaMeta = getBenchmarkDeltaMeta(item);
                    return (
                      <React.Fragment key={item.id}>
                        {showSubcategoryHeader && (
                          <tr className="ws-subcategory-row">
                            <td colSpan={viewMode === 'valuation' ? 9 : 8} className="ws-subcategory-cell">
                              <div className="ws-subcategory-inner">
                                <span className="ws-subcategory-label">Subcategory</span>
                                <span className="ws-subcategory-title">{currentSubcategory}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr className={`ws-item-row ${outlier ? 'ws-outlier' : ''}`}>
                        <td className="ws-num">{String.fromCharCode(65 + sIdx)}.{idx + 1}</td>
                        <td className="ws-desc">
                          <div className="ws-desc-inner">
                            {item.isVO && <span className="ws-vo">VO</span>}
                            <input
                              type="text"
                              className="ws-input ws-desc-input"
                              value={item.description}
                              onChange={(e) => updateItem(section.id, item.id, 'description', e.target.value)}
                            />
                            {outlier && <AlertCircle size={11} className="ws-outlier-icon" title="Rate variance detected" />}
                          </div>
                          <div className="ws-item-meta-row">
                            <input
                              type="text"
                              className="ws-input ws-meta-input"
                              value={item.subcategory || ''}
                              onChange={(e) => updateItem(section.id, item.id, 'subcategory', e.target.value)}
                              placeholder="Subcategory"
                            />
                            <input
                              type="text"
                              className="ws-input ws-meta-input"
                              value={(item.materials || []).join(', ')}
                              onChange={(e) => {
                                const parsed = e.target.value
                                  .split(',')
                                  .map((entry) => entry.trim())
                                  .filter(Boolean);
                                updateItem(section.id, item.id, 'materials', parsed);
                              }}
                              placeholder="Materials (comma separated)"
                            />
                          </div>
                        </td>
                        <td className="ws-unit-cell">
                          <input
                            type="text"
                            className="ws-input ws-unit-input"
                            value={item.unit}
                            onChange={(e) => updateItem(section.id, item.id, 'unit', e.target.value)}
                          />
                        </td>
                        <td className="ws-qty-cell">
                          <div className="ws-qty-wrap">
                            <input
                              type="number"
                              className="ws-input ws-qty-input"
                              value={item.qty || ''}
                              onChange={(e) => updateItem(section.id, item.id, 'qty', Number(e.target.value))}
                            />
                            <button className="ws-geo-btn" onClick={() => setCalculatingQtyForItem({ sectionId: section.id, item })} title="Geometric Takeoff">
                              <Calculator size={10} />
                            </button>
                          </div>
                        </td>
                        {viewMode === 'valuation' ? (
                          <>
                            <td>
                              <input type="number" className="ws-input ws-sm-input" value={item.qtyCompleted || ''}
                                onChange={(e) => updateItem(section.id, item.id, 'qtyCompleted', Number(e.target.value))} />
                            </td>
                            <td>
                              <div className="ws-progress-bar">
                                <div className="ws-progress-fill" style={{ width: `${Math.min(100, item.progressPercent || 0)}%` }}></div>
                                <span>{Math.round(item.progressPercent || 0)}%</span>
                              </div>
                            </td>
                          </>
                        ) : (
                          <td>
                            <div className="ws-strategy-toggle">
                              <button className={`ws-strat-btn ${!item.useBenchmark ? 'active' : ''}`}
                                onClick={() => activateCustomPricing(section.id, item)}
                                title="Use custom pricing">
                                Custom
                              </button>
                              <button className={`ws-strat-btn ${item.useBenchmark ? 'active' : ''}`}
                                onClick={() => activateBenchmarkPricing(section.id, item)}
                                title="Use benchmark pricing">
                                Benchmark
                              </button>
                            </div>
                          </td>
                        )}
                        <td className="ws-rate-cell">
                          <div className="ws-rate-wrap">
                            <input
                              type="number"
                              className="ws-input ws-rate-input"
                              value={rate || ''}
                              onChange={(e) => handleManualRateChange(section.id, item, e.target.value)}
                              disabled={item.useBenchmark}
                            />
                            {!item.useBenchmark && (
                              <button
                                className="ws-analysis-btn ws-custom-studio-btn"
                                onClick={() => setCustomPricingItem({ sectionId: section.id, item })}
                                title="Open custom pricing studio"
                              >
                                <SlidersHorizontal size={11} />
                              </button>
                            )}
                            <button className="ws-analysis-btn" onClick={() => openDetailedAnalysis(section.id, item)} title="Detailed rate analysis">
                              <Calculator size={11} />
                            </button>
                          </div>
                          <div className="ws-rate-meta">
                            <span className={`ws-rate-chip ws-rate-chip-${rateSourceMeta.tone}`}>{rateSourceMeta.label}</span>
                            {benchmarkDeltaMeta && (
                              <span className={`ws-rate-chip ws-rate-chip-${benchmarkDeltaMeta.tone}`}>{benchmarkDeltaMeta.text}</span>
                            )}
                          </div>
                          {!item.useBenchmark && item.customPricing?.pricingReference && (
                            <div className="ws-rate-note">{item.customPricing.pricingReference}</div>
                          )}
                        </td>
                        <td className="ws-total-cell">₦{(item.total || 0).toLocaleString()}</td>
                        <td className="ws-act-cell">
                          {viewMode === 'valuation' ? (
                            <button className={`ws-btn-icon ${item.isVO ? 'ws-vo-active' : ''}`}
                              onClick={() => toggleVO(section.id, item.id)} title="Variation Order">
                              <AlertTriangle size={12} />
                            </button>
                          ) : (
                            <div className="ws-act-group">
                              <button className={`ws-btn-icon ${item.bids?.length > 0 ? 'ws-bid-active' : ''}`}
                                onClick={() => setBiddingItem({ sectionId: section.id, item })} title="Bids">
                                <Gavel size={12} />
                              </button>
                              <button className="ws-btn-icon"
                                onClick={() => duplicateItem(section.id, item.id)} title="Duplicate Item">
                                <Copy size={12} />
                              </button>
                              <button className="ws-btn-icon ws-btn-danger"
                                onClick={() => onDelete(project.id, section.id, item.id)} title="Delete">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      </React.Fragment>
                    );
                  })}
                  {/* Section Footer */}
                  {section.expanded && (
                    <>
                      <tr className="ws-subtotal-row">
                        <td colSpan={viewMode === 'valuation' ? 6 : 5}></td>
                        <td colSpan="2" className="ws-subtotal-val">
                          Sub-Total Qty: {sectionQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} | Cost: ₦{sectionSubtotal.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                      <tr className="ws-add-row">
                        <td colSpan={viewMode === 'valuation' ? 9 : 8}>
                          <button className="ws-add-btn" onClick={() => addItemToSection(section.id)}>
                            <Plus size={13} /> Add Custom Item
                          </button>
                        </td>
                      </tr>
                    </>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="ws-grand-total">
              <td colSpan={viewMode === 'valuation' ? 7 : 6}>CONTRACT SUM</td>
              <td className="ws-grand-val">₦{calculateGrandTotal.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <ProjectNotesAccordion
          project={project}
          onChange={(updates) => onUpdate(project.id, sections, project.region, updates)}
        />
      </div>

      {/* Modals */}
      {analyzingItem && (
        <RateAnalysisModal
          key={analyzingItem.item.id}
          item={analyzingItem.item}
          structureType={project?.type}
          onClose={() => setAnalyzingItem(null)}
          onSave={handleRateApply}
        />
      )}
      {customPricingItem && (
        <CustomPricingModal
          key={customPricingItem.item.id}
          item={customPricingItem.item}
          region={project?.region}
          onClose={() => setCustomPricingItem(null)}
          onSave={handleCustomPricingSave}
          onOpenDetailedAnalysis={() => openDetailedAnalysis(customPricingItem.sectionId, customPricingItem.item)}
        />
      )}
      {calculatingQtyForItem && (
        <GeometricCalculator
          key={calculatingQtyForItem.item.id}
          item={calculatingQtyForItem.item}
          onClose={() => setCalculatingQtyForItem(null)}
          onApply={(newQty) => {
            updateItem(calculatingQtyForItem.sectionId, calculatingQtyForItem.item.id, {
              qty: newQty,
              qtySource: 'calculated'
            });
            setCalculatingQtyForItem(null);
          }}
        />
      )}
      {biddingItem && (
        <BidManagerModal
          item={biddingItem.item}
          onClose={() => setBiddingItem(null)}
          onSave={(updatedBids) => {
            const selectedBid = updatedBids.find(b => b.selected);
            updateItem(biddingItem.sectionId, biddingItem.item.id, {
              bids: updatedBids,
              rate: selectedBid ? selectedBid.rate : biddingItem.item.rate,
              useBenchmark: selectedBid ? false : biddingItem.item.useBenchmark,
              rateSource: selectedBid ? 'calculated' : biddingItem.item.rateSource
            });
            setBiddingItem(null);
          }}
        />
      )}

      {showStructuralAnalyzer && (
        <StructuralAnalyzer
          onClose={() => setShowStructuralAnalyzer(false)}
          onComplete={handleStructuralImport}
        />
      )}

      {showTeamHub && isCustomWorkspace && (
        <TeamHubPanel
          key={project.id}
          project={project}
          presenceUsers={presenceUsers}
          activityLog={activityLog}
          onClose={() => setShowTeamHub(false)}
        />
      )}



      <style jsx="true">{`
        /* ═══════════════════════════════════════════ */
        /*  BOQ WORKSPACE — FULL-PAGE SPREADSHEET     */
        /* ═══════════════════════════════════════════ */

        .ws-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 56px);
          background: #f1f5f9;
          overflow: hidden;
        }

        /* ── TOOLBAR ── */
        .ws-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.375rem 0.75rem;
          background: #0f172a;
          color: white;
          gap: 0.75rem;
          flex-shrink: 0;
        }
        .ws-toolbar-left { display: flex; align-items: center; gap: 0.5rem; }
        .ws-toolbar-center { display: flex; align-items: center; gap: 1rem; }
        .ws-toolbar-right { display: flex; align-items: center; gap: 0.375rem; }

        .ws-search {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 0.3rem 0.625rem;
          border-radius: 6px;
          color: white;
          width: 180px;
        }
        .ws-search input {
          background: none;
          border: none;
          outline: none;
          color: white;
          font-size: 0.6875rem;
          width: 100%;
        }
        .ws-search input::placeholder { color: rgba(255,255,255,0.4); }

        .ws-mode-switch { display: flex; background: rgba(255,255,255,0.06); border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
        .ws-mode-btn {
          display: flex; align-items: center; gap: 0.25rem;
          padding: 0.25rem 0.625rem;
          font-size: 0.625rem; font-weight: 700;
          color: rgba(255,255,255,0.5);
          background: none; border: none; cursor: pointer;
          transition: all 0.15s;
        }
        .ws-mode-btn.active { background: rgba(255,255,255,0.12); color: white; }

        .ws-stat { display: flex; flex-direction: column; align-items: center; gap: 1px; }
        .ws-stat-label { font-size: 0.5rem; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.06em; }
        .ws-stat-val { font-size: 0.75rem; font-weight: 900; color: white; }
        .ws-stat-total .ws-stat-val { color: #60a5fa; }

        .ws-region-sel {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          color: white;
          font-size: 0.625rem; font-weight: 800;
          padding: 1px 4px; border-radius: 4px;
          outline: none; cursor: pointer;
        }

        .ws-btn {
          display: flex; align-items: center; gap: 0.25rem;
          padding: 0.3rem 0.625rem; border-radius: 6px;
          font-size: 0.625rem; font-weight: 700; cursor: pointer;
          border: none; transition: all 0.15s;
        }
        .ws-btn-ghost { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.1); }
        .ws-btn-ghost:hover { background: rgba(255,255,255,0.12); color: white; }
        .ws-btn-custom {
          background: linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.95));
          color: white;
          box-shadow: 0 10px 20px rgba(5, 150, 105, 0.25);
        }
        .ws-btn-custom:hover {
          filter: brightness(1.05);
        }
        .ws-btn-primary { background: #2563eb; color: white; }
        .ws-btn-primary:hover { background: #1d4ed8; }

        /* ── TABLE ── */
        .ws-table-wrap {
          flex: 1;
          overflow-y: auto;
          overflow-x: auto;
          min-height: 0;
        }
        .ws-table-wrap::-webkit-scrollbar { width: 6px; height: 6px; }
        .ws-table-wrap::-webkit-scrollbar-track { background: #f1f5f9; }
        .ws-table-wrap::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

        .ws-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
          background: white;
          table-layout: fixed;
        }

        .ws-table thead { position: sticky; top: 0; z-index: 10; }
        .ws-table th {
          background: #f8fafc;
          padding: 0.5rem 0.625rem;
          text-align: left;
          font-size: 0.5625rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }

        .ws-th-num { width: 44px; text-align: center; }
        .ws-th-desc { /* auto width — takes remaining space */ }
        .ws-th-unit { width: 60px; text-align: center; }
        .ws-th-qty { width: 80px; text-align: center; }
        .ws-th-sm { width: 70px; text-align: center; }
        .ws-th-strategy { width: 150px; text-align: center; }
        .ws-th-rate { width: 180px; text-align: right; }
        .ws-th-total { width: 120px; text-align: right; }
        .ws-th-act { width: 64px; }

        /* ── SECTION ROW ── */
        .ws-section-row {
          cursor: pointer;
          background: #f0f4f8;
          border-top: 2px solid #e2e8f0;
          transition: background 0.15s;
        }
        .ws-section-row:hover { background: #e8eef4; }
        .ws-section-cell { padding: 0.5rem 0.625rem !important; }
        .ws-section-inner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #334155;
        }
        .ws-section-letter {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px;
          background: #1e293b; color: white;
          font-size: 0.625rem; font-weight: 900;
          border-radius: 5px; flex-shrink: 0;
        }
        .ws-section-title-input {
          background: none; border: none; outline: none;
          font-size: 0.8125rem; font-weight: 700; color: #1e293b;
          flex: 1; padding: 2px 4px; border-radius: 3px;
        }
        .ws-section-title-input:focus { background: white; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
        .ws-section-badge {
          font-size: 0.5625rem; font-weight: 800;
          background: #1e293b; color: white;
          padding: 1px 7px; border-radius: 100px;
          flex-shrink: 0;
        }
        .ws-section-meta {
          font-size: 0.625rem;
          font-weight: 700;
          color: #475569;
          background: rgba(148, 163, 184, 0.15);
          padding: 2px 6px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .ws-section-total {
          font-size: 0.75rem; font-weight: 800; color: #2563eb;
          margin-left: auto; flex-shrink: 0;
        }

        .ws-subcategory-row {
          background: linear-gradient(90deg, #f8fafc, #eef2ff);
        }

        .ws-subcategory-cell {
          padding: 0.35rem 0.625rem !important;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #eef2f7;
        }

        .ws-subcategory-inner {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }

        .ws-subcategory-label {
          font-size: 0.56rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }

        .ws-subcategory-title {
          font-size: 0.72rem;
          font-weight: 800;
          color: #1e293b;
        }

        /* ── ITEM ROW ── */
        .ws-item-row {
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.1s;
        }
        .ws-item-row:hover { background: #f8fafc; }
        .ws-item-row td { padding: 0.375rem 0.625rem; vertical-align: middle; }
        .ws-outlier { background: #fffbeb !important; }

        .ws-num {
          text-align: center;
          font-size: 0.6875rem; font-weight: 700;
          color: #94a3b8;
          font-family: 'Inter', system-ui, monospace;
        }

        .ws-desc-inner { display: flex; align-items: center; gap: 0.375rem; }
        .ws-item-meta-row {
          display: grid;
          grid-template-columns: 160px 1fr;
          gap: 0.375rem;
          margin-top: 0.2rem;
        }
        .ws-vo {
          font-size: 0.5rem; font-weight: 900;
          background: #fef3c7; color: #92400e;
          padding: 1px 5px; border-radius: 3px; flex-shrink: 0;
        }
        .ws-outlier-icon { color: #f59e0b; flex-shrink: 0; }

        /* ── INPUTS ── */
        .ws-input {
          width: 100%;
          border: 1px solid transparent;
          background: transparent;
          padding: 0.25rem 0.375rem;
          border-radius: 4px;
          font-size: 0.8125rem;
          transition: all 0.15s;
          outline: none;
          color: #1e293b;
        }
        .ws-input:hover { border-color: #e2e8f0; }
        .ws-input:focus { background: white; border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.08); }

        .ws-desc-input { font-weight: 600; }
        .ws-meta-input {
          border-color: #e2e8f0;
          background: #f8fafc;
          font-size: 0.6875rem;
          color: #475569;
          padding: 0.22rem 0.35rem;
        }
        .ws-unit-input { text-align: center; font-weight: 700; text-transform: uppercase; font-size: 0.6875rem; color: #64748b; letter-spacing: 0.04em; }
        .ws-qty-input { text-align: right; font-weight: 600; }
        .ws-rate-input { text-align: right; font-weight: 600; }
        .ws-sm-input { text-align: center; font-weight: 600; width: 100%; }
        .ws-input:disabled { color: #94a3b8; background: #f8fafc; }

        .ws-qty-wrap, .ws-rate-wrap { display: flex; align-items: center; gap: 0.25rem; }

        .ws-geo-btn, .ws-analysis-btn {
          display: flex; align-items: center; justify-content: center;
          width: 22px; height: 22px;
          border: none; background: #f1f5f9; color: #64748b;
          border-radius: 4px; cursor: pointer; flex-shrink: 0;
          transition: all 0.15s; opacity: 0;
        }
        .ws-item-row:hover .ws-geo-btn,
        .ws-item-row:hover .ws-analysis-btn { opacity: 1; }
        .ws-geo-btn:hover, .ws-analysis-btn:hover { background: #2563eb; color: white; }
        .ws-custom-studio-btn { background: #ecfeff; color: #0f766e; }
        .ws-custom-studio-btn:hover { background: #0f766e !important; color: white !important; }

        .ws-strategy-toggle {
          display: inline-flex;
          gap: 0.2rem;
          justify-content: center;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          padding: 0.18rem;
        }
        .ws-strat-btn {
          padding: 0.26rem 0.58rem;
          min-width: 64px;
          font-size: 0.56rem;
          font-weight: 800;
          border: 1px solid transparent;
          border-radius: 999px;
          background: transparent;
          color: #64748b;
          cursor: pointer; transition: all 0.15s;
        }
        .ws-strat-btn.active { background: #1e293b; color: white; border-color: #1e293b; }

        .ws-total-cell { text-align: right; font-weight: 700; color: #1e293b; font-size: 0.8125rem; white-space: nowrap; }
        .ws-rate-cell { text-align: right; }
        .ws-rate-meta {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 0.25rem;
          margin-top: 0.2rem;
        }
        .ws-rate-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.16rem 0.42rem;
          border-radius: 999px;
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }
        .ws-rate-chip-benchmark { background: #eff6ff; color: #1d4ed8; }
        .ws-rate-chip-custom { background: #ecfeff; color: #0f766e; }
        .ws-rate-chip-calculated { background: #f5f3ff; color: #6d28d9; }
        .ws-rate-chip-manual { background: #f8fafc; color: #475569; }
        .ws-rate-chip-aligned { background: #f0fdf4; color: #15803d; }
        .ws-rate-chip-high { background: #fff7ed; color: #c2410c; }
        .ws-rate-chip-low { background: #eff6ff; color: #2563eb; }
        .ws-rate-note {
          margin-top: 0.22rem;
          font-size: 0.62rem;
          color: #64748b;
          line-height: 1.35;
        }

        .ws-progress-bar {
          height: 18px; background: #f1f5f9;
          border-radius: 100px; position: relative;
          overflow: hidden; font-size: 0.5625rem;
          font-weight: 800; display: flex; align-items: center;
          justify-content: center; color: #1e293b;
        }
        .ws-progress-fill {
          position: absolute; top: 0; left: 0; bottom: 0;
          background: linear-gradient(90deg, #2563eb, #3b82f6);
          border-radius: 100px;
          transition: width 0.3s;
        }

        /* ── ACTIONS ── */
        .ws-act-cell { text-align: center; }
        .ws-act-group { display: flex; gap: 2px; justify-content: center; }
        .ws-btn-icon {
          display: flex; align-items: center; justify-content: center;
          width: 24px; height: 24px;
          border: none; background: transparent; color: #94a3b8;
          border-radius: 4px; cursor: pointer;
          transition: all 0.15s; opacity: 0;
        }
        .ws-item-row:hover .ws-btn-icon,
        .ws-section-row:hover .ws-btn-icon { opacity: 1; }
        .ws-btn-danger:hover { background: #fef2f2; color: #ef4444; }
        .ws-bid-active { opacity: 1 !important; color: #2563eb; }
        .ws-vo-active { opacity: 1 !important; color: #f59e0b; }

        /* ── SUBTOTAL ── */
        .ws-subtotal-row { background: #f8fafc; }
        .ws-subtotal-val {
          text-align: right !important;
          font-weight: 800; font-size: 0.75rem;
          color: #334155;
          padding: 0.375rem 0.625rem !important;
          border-bottom: 2px solid #e2e8f0;
        }

        .ws-add-row td { padding: 0.25rem 0.625rem !important; background: #fafbfc; border-bottom: 2px solid #e2e8f0; }
        .ws-add-btn {
          display: flex; align-items: center; gap: 0.25rem;
          background: none; border: 1px dashed #cbd5e1; color: #64748b;
          padding: 0.25rem 0.75rem; border-radius: 4px;
          font-size: 0.6875rem; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
          width: 100%;
          justify-content: center;
        }
        .ws-add-btn:hover { border-color: #2563eb; color: #2563eb; background: rgba(37,99,235,0.03); }

        /* ── GRAND TOTAL ── */
        .ws-grand-total {
          background: #0f172a;
          color: white;
        }
        .ws-grand-total td {
          padding: 0.75rem 0.625rem !important;
          font-weight: 900;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .ws-grand-val {
          text-align: right !important;
          font-size: 1rem !important;
          color: #60a5fa !important;
        }

        /* ── MOBILE ── */
        @media (max-width: 768px) {
          .ws-toolbar { flex-wrap: wrap; padding: 0.5rem; }
          .ws-toolbar-center { display: none; }
          .ws-search { width: 100%; }
          .ws-table { font-size: 0.75rem; }
          .ws-th-strategy, .ws-th-rate { display: none; }
          .ws-item-meta-row { grid-template-columns: 1fr; }
        }

        /* ── PRESENCE AVATARS ── */
        .ws-presence {
          display: flex;
          align-items: center;
          margin-right: 0.25rem;
        }
        .ws-avatar {
          width: 26px; height: 26px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.5rem; font-weight: 800;
          color: white; position: relative;
          border: 2px solid #0f172a;
          margin-left: -6px;
          cursor: default;
        }
        .ws-avatar:first-child { margin-left: 0; }
        .ws-avatar-dot {
          position: absolute; bottom: -1px; right: -1px;
          width: 8px; height: 8px;
          background: #22c55e; border: 2px solid #0f172a;
          border-radius: 50%;
        }
        .ws-avatar-more {
          background: #475569;
          font-size: 0.5rem;
        }

        /* ── COLLAB MODAL ── */
        .collab-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .collab-modal {
          background: white; width: 440px;
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 25px 50px rgba(0,0,0,0.25);
        }
        .collab-modal-header {
          padding: 1.25rem 1.5rem;
          display: flex; justify-content: space-between; align-items: center;
          border-bottom: 1px solid #f1f5f9;
        }
        .collab-title-row { display: flex; align-items: center; gap: 0.5rem; }
        .collab-title-row h3 { margin: 0; font-size: 1rem; font-weight: 800; }
        .collab-close {
          background: none; border: none; color: #94a3b8;
          cursor: pointer; padding: 4px; border-radius: 6px;
        }
        .collab-close:hover { background: #f1f5f9; color: #1e293b; }
        .collab-modal-body { padding: 1.25rem 1.5rem; }

        .collab-invite-row {
          display: flex; gap: 0.5rem; align-items: center;
        }
        .collab-input {
          flex: 1; padding: 0.625rem 0.75rem;
          border: 1px solid #e2e8f0; border-radius: 8px;
          font-size: 0.8125rem; outline: none;
        }
        .collab-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .collab-role-select {
          padding: 0.625rem 0.5rem; border: 1px solid #e2e8f0;
          border-radius: 8px; font-size: 0.75rem; font-weight: 700;
          background: white; cursor: pointer; outline: none;
        }
        .collab-invite-btn {
          width: 38px; height: 38px;
          display: flex; align-items: center; justify-content: center;
          background: #2563eb; color: white; border: none;
          border-radius: 8px; cursor: pointer; flex-shrink: 0;
        }
        .collab-invite-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .collab-invite-btn:hover:not(:disabled) { background: #1d4ed8; }

        .collab-list { margin-top: 1rem; }
        .collab-list-label {
          font-size: 0.5625rem; font-weight: 800; color: #94a3b8;
          text-transform: uppercase; letter-spacing: 0.06em;
          display: block; margin-bottom: 0.5rem;
        }
        .collab-person {
          display: flex; align-items: center; gap: 0.625rem;
          padding: 0.5rem 0; border-bottom: 1px solid #f8fafc;
        }
        .collab-person-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.5625rem; font-weight: 800; color: white; flex-shrink: 0;
        }
        .collab-person-info { flex: 1; display: flex; flex-direction: column; }
        .collab-person-email { font-size: 0.8125rem; font-weight: 600; color: #1e293b; }
        .collab-person-role {
          font-size: 0.625rem; font-weight: 700; color: #94a3b8;
          text-transform: uppercase;
        }
        .collab-remove-btn {
          background: none; border: none; color: #cbd5e1;
          font-size: 1.125rem; cursor: pointer; padding: 2px 6px; border-radius: 4px;
        }
        .collab-remove-btn:hover { background: #fef2f2; color: #ef4444; }

        /* ── ACTIVITY PANEL ── */
        .activity-panel {
          position: fixed; right: 0; top: 0; bottom: 0;
          width: 300px; background: white;
          box-shadow: -4px 0 20px rgba(0,0,0,0.1);
          z-index: 100; display: flex; flex-direction: column;
        }
        .activity-panel-header {
          padding: 1rem 1.25rem;
          display: flex; justify-content: space-between; align-items: center;
          border-bottom: 1px solid #f1f5f9;
        }
        .activity-panel-header h4 {
          margin: 0; font-size: 0.875rem; font-weight: 800;
          display: flex; align-items: center; gap: 0.5rem; color: #1e293b;
        }
        .activity-list { flex: 1; overflow-y: auto; padding: 0.75rem; }
        .activity-empty {
          text-align: center; color: #94a3b8;
          font-size: 0.8125rem; padding: 2rem 0;
        }
        .activity-entry {
          display: flex; gap: 0.625rem; padding: 0.5rem 0;
          border-bottom: 1px solid #f8fafc;
        }
        .activity-icon { font-size: 0.875rem; flex-shrink: 0; margin-top: 2px; }
        .activity-content { display: flex; flex-direction: column; flex: 1; }
        .activity-text { font-size: 0.75rem; font-weight: 600; color: #334155; }
        .activity-meta { font-size: 0.625rem; color: #94a3b8; margin-top: 1px; }
        /* Signatures Grid */
        .signatures-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-top: 1.5rem;
        }
        
        .sig-box {
          display: flex;
          align-items: center;
          gap: 1rem;
          border-top: 1px dashed var(--border-medium);
          padding-top: 1rem;
        }
        
        .sig-box span {
          font-weight: 700;
          font-size: 0.8125rem;
          color: var(--primary-600);
          white-space: nowrap;
        }
        
        .sig-box input {
          flex: 1;
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--primary-900);
          border-bottom: 1px solid var(--border-light);
          padding: 0.25rem 0.5rem;
        }
        
        .sig-box input:focus {
          outline: none;
          border-bottom-color: var(--accent-500);
        }

        .meta-form {
          margin-top: 3rem;
          padding: 2rem;
          background: white;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
        }

        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .meta-col {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .meta-col label {
          font-size: 0.8125rem;
          font-weight: 800;
          color: var(--primary-500);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .meta-col textarea {
          width: 100%;
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-sm);
          padding: 1rem;
          font-size: 0.875rem;
          color: var(--primary-800);
          resize: vertical;
          background: var(--bg-main);
          transition: all 0.2s;
        }

        .meta-col textarea:focus {
          outline: none;
          border-color: var(--accent-400);
          background: white;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.05);
        }

        .note-panel {
          gap: 0;
        }

        .note-panel-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }

        .note-panel-header:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .note-panel-title {
          font-size: 0.8125rem;
          font-weight: 800;
          color: var(--primary-500);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .note-panel-chevron {
          color: #64748b;
          transition: transform 0.25s ease, color 0.25s ease;
        }

        .note-panel.expanded .note-panel-chevron {
          transform: rotate(180deg);
          color: #2563eb;
        }

        .note-panel-content {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.3s ease, opacity 0.2s ease, padding-top 0.3s ease;
          padding-top: 0;
        }

        .note-panel.expanded .note-panel-content {
          max-height: 320px;
          opacity: 1;
          padding-top: 0.75rem;
        }

        /* Notes Accordion */
        .notes-launcher-row {
          display: flex;
          justify-content: flex-end;
          margin: 0 1.5rem;
        }

        .notes-launcher-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          background: #f8fafc;
          color: #334155;
          padding: 0.45rem 0.8rem;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .notes-launcher-btn:hover {
          border-color: #93c5fd;
          color: #1d4ed8;
          background: #eff6ff;
        }

        .notes-panel-controls {
          display: flex;
          justify-content: flex-end;
          margin: 0 1.5rem 0.5rem;
        }

        .notes-hide-btn {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          color: #475569;
          padding: 0.35rem 0.65rem;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .notes-hide-btn:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
          color: #334155;
        }

        .notes-accordion {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin: 0 1.5rem 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          overflow: hidden;
        }

        .notes-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.75rem;
          background: #f8fafc;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }

        .notes-header:hover {
          background: #f1f5f9;
        }

        .notes-content {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          padding: 0 2rem;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border-top: 1px solid transparent;
          background: white;
        }

        .notes-accordion.expanded .notes-content {
          max-height: 2000px;
          opacity: 1;
          padding: 2.5rem 2rem;
          border-top: 1px solid #e2e8f0;
        }

        .chevron-wrap {
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: transparent;
        }

        .chevron-wrap.active {
          transform: rotate(180deg);
          color: #2563eb;
          background: #eff6ff;
        }

        .chevron-icon {
           /* no base rotate here, let wrap handle it */
        }

        .signatures-grid {
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: center;
        }

        .sig-box {
          border-top: 1px dashed #cbd5e1;
          padding-top: 0.75rem;
        }


      `}</style>
    </div>
  );
};

export default BOQWorkspace;
