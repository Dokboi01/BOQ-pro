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
import { getMaterials } from '../../db/database';
import { buildCompanyKey, deriveCompanyName } from '../../utils/companyAccess';
import {
  buildAutoRateResult,
  buildMaterialRateIndex,
  getBenchmarkConfidenceLabel,
  getBenchmarkRegionalFactor,
  getEffectiveBenchmarkRate,
  getItemTotal,
  getItemUnitRate,
  getProjectPricingAnalytics,
  isBenchmarkOutlier,
  repriceSectionsForRegion
} from '../../utils/pricing';
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
  SlidersHorizontal,
  RefreshCcw,
  Pencil
} from 'lucide-react';

const WORK_TYPE_LABELS = {
  general: 'General Building',
  concrete: 'Concrete',
  masonry: 'Masonry',
  plastering: 'Plastering',
  tiling: 'Tiling',
  painting: 'Painting',
  formwork: 'Formwork',
  reinforcement: 'Reinforcement',
  roofing: 'Roofing',
  pipework: 'Pipework',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  steelwork: 'Steelwork',
  roadwork: 'Roadwork',
  earthwork: 'Earthwork',
  entranceworks: 'Entrance / Gate Works'
};

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
  const marketRegionLabel = project?.region || 'Lagos';

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
          updatedItem.total = getItemTotal(updatedItem, project?.region || 'Lagos');
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

  const sanitizeNonNegativeNumber = (value) => {
    if (value === '' || value === null || typeof value === 'undefined') {
      return 0;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }

    return parsed;
  };

  const handleQuantityChange = (sectionId, item, rawValue) => {
    updateItem(sectionId, item.id, {
      qty: sanitizeNonNegativeNumber(rawValue),
      qtySource: 'manual'
    });
  };

  const handleCompletedQuantityChange = (sectionId, item, rawValue) => {
    const safeCompletedQty = sanitizeNonNegativeNumber(rawValue);
    const safeProjectQty = sanitizeNonNegativeNumber(item.qty);

    updateItem(sectionId, item.id, 'qtyCompleted', safeProjectQty > 0
      ? Math.min(safeCompletedQty, safeProjectQty)
      : safeCompletedQty);
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
      rate: sanitizeNonNegativeNumber(nextRate),
      rateSource: 'manual',
      useBenchmark: false,
      customPricing: null
    });
  };

  const openDetailedAnalysis = (sectionId, item) => {
    setCustomPricingItem(null);
    setAnalyzingItem({ sectionId, item });
  };

  const openCustomPricingStudio = (sectionId, item) => {
    setCustomPricingItem({
      sectionId,
      item: {
        ...item,
        useBenchmark: false
      }
    });
  };

  const activateCustomPricing = (sectionId, item) => {
    const nextRateSource = item.customPricing
      ? 'custom'
      : item.breakdown
        ? 'calculated'
        : item.rateSource === 'benchmark'
          ? 'manual'
          : (item.rateSource || 'manual');

    updateItem(sectionId, item.id, {
      useBenchmark: false,
      rateSource: nextRateSource
    });

    if (!item.customPricing) {
      openCustomPricingStudio(sectionId, {
        ...item,
        rateSource: nextRateSource
      });
    }
  };

  const activateBenchmarkPricing = (sectionId, item) => {
    const regionalFactor = getBenchmarkRegionalFactor(item, project?.region || 'Lagos');

    // Derive benchmark: stored > auto-rate > rate/factor fallback
    let derivedBenchmark = Number(item.benchmark) > 0 ? item.benchmark : 0;
    let matchSource = item.benchmarkMatchSource || null;

    if (!derivedBenchmark) {
      const fallbackAutoRate = buildAutoRateResult(item, {
        structureType: project?.subtype || project?.type,
        region: project?.region || 'Lagos'
      });
      derivedBenchmark = Number(fallbackAutoRate?.benchmark) || 0;
      matchSource = fallbackAutoRate?.matchSource || matchSource;

      // Last resort: derive from current rate
      if (!derivedBenchmark && Number(item.rate) > 0) {
        derivedBenchmark = Number(item.rate) / Math.max(regionalFactor, 0.001);
      }
    }

    updateItem(sectionId, item.id, {
      useBenchmark: true,
      rateSource: 'benchmark',
      benchmark: derivedBenchmark || 0,
      benchmarkMatchSource: matchSource,
      breakdown: item.breakdown || null,
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

  const handleRegionChange = (nextRegion) => {
    const repriced = repriceSectionsForRegion(sections, nextRegion);
    setSections(repriced);
    onUpdate(project.id, repriced, nextRegion);
    toast.success(`Workspace repriced for ${nextRegion.replace('_', ' ')} market conditions.`);
  };

  const autoRateProject = async () => {
    const dbMaterials = await getMaterials();
    const materialIndex = buildMaterialRateIndex(dbMaterials);
    let updatedCount = 0;
    let benchmarkedCount = 0;

    const updated = sections.map((section) => ({
      ...section,
      items: (section.items || []).map((item) => {
        const shouldPreserveManualRate = !item.useBenchmark && Number(item.rate) > 0 && item.rateSource === 'manual';
        const autoRated = buildAutoRateResult(item, {
          structureType: project?.type,
          region: project?.region || 'Lagos',
          materialIndex
        });

        const nextItem = {
          ...item,
          benchmark: Number(item.benchmark) > 0 ? item.benchmark : autoRated.benchmark,
          breakdown: item.breakdown || autoRated.breakdown,
          benchmarkMatchSource: item.benchmarkMatchSource || autoRated.matchSource,
        };

        if (!shouldPreserveManualRate && Number(item.rate) <= 0) {
          nextItem.rate = autoRated.rate;
          nextItem.rateSource = item.customPricing ? 'custom' : 'calculated';
          updatedCount += 1;
        }

        if (nextItem.benchmark > 0 && Number(item.benchmark) <= 0) {
          benchmarkedCount += 1;
        }

        nextItem.total = getItemTotal(nextItem, project?.region || 'Lagos');
        return nextItem;
      })
    }));

    setSections(updated);
    onUpdate(project.id, updated, project?.region);
    toast.success(`Auto-rated ${updatedCount} item${updatedCount === 1 ? '' : 's'} and benchmarked ${benchmarkedCount} item${benchmarkedCount === 1 ? '' : 's'}.`);
  };

  const refreshBenchmarks = async () => {
    const dbMaterials = await getMaterials();
    const materialIndex = buildMaterialRateIndex(dbMaterials);
    let refreshedCount = 0;

    const updated = sections.map((section) => ({
      ...section,
      items: (section.items || []).map((item) => {
        const autoRated = buildAutoRateResult(item, {
          structureType: project?.type,
          region: project?.region || 'Lagos',
          materialIndex
        });

        if (autoRated.benchmark <= 0) return item;

        refreshedCount += 1;
        const nextItem = {
          ...item,
          benchmark: autoRated.benchmark,
          breakdown: autoRated.breakdown,
          benchmarkMatchSource: autoRated.matchSource,
        };
        nextItem.total = getItemTotal(nextItem, project?.region || 'Lagos');
        return nextItem;
      })
    }));

    setSections(updated);
    onUpdate(project.id, updated, project?.region);
    toast.success(`Refreshed benchmarks for ${refreshedCount} item${refreshedCount === 1 ? '' : 's'} using latest market data.`);
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
    return isBenchmarkOutlier(rate, benchmark);
  };

  const getRateSourceMeta = (item) => {
    if (item.useBenchmark) return { label: `${marketRegionLabel} Market Benchmark`, tone: 'benchmark' };
    if (item.rateSource === 'custom') return { label: 'Custom Rate Override', tone: 'custom' };
    if (item.rateSource === 'calculated') return { label: 'Rate Analysis Build-Up', tone: 'calculated' };
    if (item.rateSource === 'benchmark') return { label: 'Benchmark-linked', tone: 'benchmark' };
    return { label: 'Manual Rate Entry', tone: 'manual' };
  };

  const getBenchmarkDeltaMeta = (item) => {
    if (item.useBenchmark) return null;

    const benchmarkRate = getEffectiveBenchmarkRate(item, project?.region || 'Lagos');
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

  const getCustomPricingSummary = (item) => {
    if (!item?.customPricing) return '';

    const segments = [];
    const workTypeLabel = WORK_TYPE_LABELS[item.customPricing.workType];
    if (workTypeLabel) {
      segments.push(workTypeLabel);
    }
    if (item.customPricing.pricingReference) {
      segments.push(item.customPricing.pricingReference);
    }
    if (item.customPricing.supplierQuote) {
      segments.push(item.customPricing.supplierQuote);
    }

    return segments.join(' • ');
  };

  const getQuantityFeedbackMeta = (item, benchmarkRate, unitRate) => {
    const quantity = sanitizeNonNegativeNumber(item?.qty);

    if (quantity <= 0) {
      return {
        text: 'Enter quantity, area, length, volume, or meter value to generate the amount.',
        tone: 'warning'
      };
    }

    if (item.useBenchmark && benchmarkRate > 0) {
      return {
        text: 'Price generated automatically.',
        tone: 'success'
      };
    }

    if (item.useBenchmark && benchmarkRate <= 0) {
      return {
        text: 'No benchmark rate available — switch to custom pricing.',
        tone: 'warning'
      };
    }

    if (unitRate > 0) {
      return {
        text: item.qtySource === 'calculated'
          ? 'Measured from geometric takeoff and priced successfully.'
          : 'Quantity captured and amount updated successfully.',
        tone: 'success'
      };
    }

    return {
      text: 'Quantity saved. Complete pricing to unlock the amount.',
      tone: 'muted'
    };
  };

  const getAutomationMeta = (item, benchmarkRate, unitRate) => {
    const quantity = sanitizeNonNegativeNumber(item?.qty);

    if (quantity <= 0) {
      return {
        title: 'Waiting for project quantity',
        detail: 'Amount will calculate as soon as quantity is entered.',
        tone: 'warning'
      };
    }

    if (item.useBenchmark) {
      if (benchmarkRate <= 0) {
        return {
          title: 'No benchmark rate available — switch to custom pricing',
          detail: `This item is not yet covered by the ${marketRegionLabel} market benchmark.`,
          tone: 'warning'
        };
      }

      return {
        title: 'Auto-priced using current market benchmark',
        detail: `Amount = Quantity × ${marketRegionLabel} market benchmark.`,
        tone: 'success'
      };
    }

    if (unitRate <= 0) {
      return {
        title: 'Custom rate still needed',
        detail: 'Open the pricing studio or enter a defendable custom rate to complete this item.',
        tone: 'warning'
      };
    }

    if (item.customPricing) {
      return {
        title: 'Custom rate override active',
        detail: getCustomPricingSummary(item) || 'Custom pricing allowances and basis have been saved for this item.',
        tone: 'custom'
      };
    }

    if (item.rateSource === 'calculated') {
      return {
        title: 'Rate analysis applied',
        detail: 'This amount is being driven by an analysis-backed unit rate.',
        tone: 'calculated'
      };
    }

    return {
      title: 'Custom pricing active',
      detail: 'Amount is being generated from the current custom unit rate.',
      tone: 'custom'
    };
  };

  const getItemStatusMeta = (item, benchmarkRate, unitRate) => {
    const quantity = sanitizeNonNegativeNumber(item?.qty);

    if (quantity <= 0) {
      return { label: 'Quantity Needed', tone: 'warning' };
    }

    if (item.useBenchmark && benchmarkRate <= 0) {
      return { label: 'Benchmark Missing', tone: 'warning' };
    }

    if (item.useBenchmark) {
      return { label: 'Benchmark Priced', tone: 'benchmark' };
    }

    if (item.customPricing) {
      return { label: 'Custom Override', tone: 'custom' };
    }

    if (item.rateSource === 'calculated') {
      return { label: 'Rate Analysed', tone: 'calculated' };
    }

    if (unitRate > 0) {
      return { label: 'Custom Priced', tone: 'manual' };
    }

    return { label: 'Rate Required', tone: 'warning' };
  };

  const getAmountFormula = (item, unitRate) => {
    const quantity = sanitizeNonNegativeNumber(item?.qty);
    const rate = sanitizeNonNegativeNumber(unitRate);

    if (quantity <= 0 || rate <= 0) {
      return null;
    }

    return `Amount = ${quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} × ₦${rate.toLocaleString()}`;
  };

  const getQuantityDisplayValue = (item) => {
    const quantity = sanitizeNonNegativeNumber(item?.qty);
    if (quantity <= 0) {
      return '0.00';
    }

    return quantity.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const getQuantitySourceLabel = (item) => {
    if (item?.qtySource === 'calculated') {
      return 'Measured from takeoff';
    }

    return 'Project quantity';
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

  const workspaceAnalytics = React.useMemo(() => (
    getProjectPricingAnalytics({ ...project, sections })
  ), [project, sections]);

  const calculateGrandTotal = workspaceAnalytics.totalValue;
  const totalQuantity = workspaceAnalytics.totalQuantity;

  const totalItems = workspaceAnalytics.totalItems;
  const totalColumnCount = viewMode === 'valuation' ? 9 : 8;
  const sectionHeaderSpan = viewMode === 'valuation' ? 8 : 7;
  const subtotalLeadingSpan = viewMode === 'valuation' ? 6 : 5;

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
            <select className="ws-region-sel" value={project?.region || 'Lagos'} onChange={(e) => handleRegionChange(e.target.value)}>
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
          <button className="ws-btn ws-btn-ghost" onClick={refreshBenchmarks} title="Recalculate all benchmarks with latest material prices">
            <RefreshCcw size={14} /> Refresh Benchmarks
          </button>
          <button className="ws-btn ws-btn-ghost" onClick={() => toast.success('Project saved as a reusable template.')} title="Save as Template">
            <Save size={14} /> Save Template
          </button>
          <button className="ws-btn ws-btn-ghost" onClick={onExport}><Download size={14} /> Export</button>
          <button className="ws-btn ws-btn-primary" onClick={onAddSection}><Plus size={14} /> Section</button>
        </div>
      </div>

      <div className="ws-mobile-summary">
        <div className="ws-mobile-stat-card">
          <span>Region</span>
          <strong>{project?.region || 'Lagos'}</strong>
        </div>
        <div className="ws-mobile-stat-card">
          <span>Sections / Items</span>
          <strong>{sections.length} / {totalItems}</strong>
        </div>
        <div className="ws-mobile-stat-card">
          <span>Total Qty</span>
          <strong>{totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
        </div>
        <div className="ws-mobile-stat-card ws-mobile-stat-card-total">
          <span>Contract Sum</span>
          <strong>₦{calculateGrandTotal.toLocaleString()}</strong>
        </div>
      </div>

      <div className="ws-insight-strip">
        <div className="ws-insight-card ws-insight-card-strong">
          <span className="ws-insight-label">Pricing Coverage</span>
          <strong className="ws-insight-value">{workspaceAnalytics.pricingCoveragePercent.toFixed(0)}%</strong>
          <p className="ws-insight-copy">
            {workspaceAnalytics.pricedItems} of {workspaceAnalytics.totalItems} items priced
            {workspaceAnalytics.benchmarkItems > 0 ? ` · ${workspaceAnalytics.benchmarkItems} auto-priced from benchmark` : ''}
            {workspaceAnalytics.unpricedItems > 0 ? ` · ${workspaceAnalytics.unpricedItems} still need review` : ' · full coverage reached'}
          </p>
        </div>
        <div className="ws-insight-card">
          <span className="ws-insight-label">Benchmark Automation</span>
          <strong className="ws-insight-value">
            {workspaceAnalytics.benchmarkItems} live · {workspaceAnalytics.customItems} override
          </strong>
          <p className="ws-insight-copy">
            {workspaceAnalytics.benchmarkReferencedItems} items linked to current market benchmark
          </p>
        </div>
        <div className="ws-insight-card">
          <span className="ws-insight-label">Market Tracking</span>
          <strong className="ws-insight-value">{workspaceAnalytics.benchmarkCoveragePercent.toFixed(0)}%</strong>
          <p className="ws-insight-copy">
            {workspaceAnalytics.outlierCount > 0
              ? `${workspaceAnalytics.outlierCount} item${workspaceAnalytics.outlierCount === 1 ? '' : 's'} outside tolerance`
              : 'No benchmark drift flags right now'}
          </p>
        </div>
        <div className="ws-insight-card">
          <span className="ws-insight-label">Commercial Driver</span>
          <strong className="ws-insight-value">
            {workspaceAnalytics.dominantSection ? workspaceAnalytics.dominantSection.title : 'Waiting for pricing'}
          </strong>
          <p className="ws-insight-copy">
            {workspaceAnalytics.dominantSection
              ? `${workspaceAnalytics.dominantSection.percentOfTotal.toFixed(1)}% of current contract sum`
              : 'Add rates to reveal the heaviest cost section'}
          </p>
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
              const sectionSubtotal = (section.items || []).reduce((a, i) => a + getItemTotal(i, project?.region || 'Lagos'), 0);
              const sectionQty = (section.items || []).reduce((a, i) => a + (Number(i.qty) || 0), 0);

              return (
                <React.Fragment key={section.id}>
                  {/* Section Header */}
                  <tr className="ws-section-row" onClick={() => toggleSection(section.id)}>
                    <td colSpan={sectionHeaderSpan} className="ws-section-cell">
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
                    const benchmarkRate = getEffectiveBenchmarkRate(item, project?.region || 'Lagos');
                    const outlier = !item.useBenchmark && isOutlier(item.rate, benchmarkRate);
                    const rate = getItemUnitRate(item, project?.region || 'Lagos');
                    const itemTotal = getItemTotal(item, project?.region || 'Lagos');
                    const rateSourceMeta = getRateSourceMeta(item);
                    const benchmarkDeltaMeta = getBenchmarkDeltaMeta(item);
                    const quantityFeedbackMeta = getQuantityFeedbackMeta(item, benchmarkRate, rate);
                    const automationMeta = getAutomationMeta(item, benchmarkRate, rate);
                    const itemStatusMeta = getItemStatusMeta(item, benchmarkRate, rate);
                    const amountFormula = getAmountFormula(item, rate);
                    const quantityDisplayValue = getQuantityDisplayValue(item);
                    const quantitySourceLabel = getQuantitySourceLabel(item);
                    const hasValidQuantity = sanitizeNonNegativeNumber(item.qty) > 0;
                    const hasBenchmarkRate = sanitizeNonNegativeNumber(benchmarkRate) > 0;
                    const hasUnitRate = sanitizeNonNegativeNumber(rate) > 0;
                    const isIncomplete = !hasValidQuantity || (item.useBenchmark ? !hasBenchmarkRate : !hasUnitRate);
                    const itemCode = `${String.fromCharCode(65 + sIdx)}.${idx + 1}`;
                    return (
                      <React.Fragment key={item.id}>
                        {showSubcategoryHeader && (
                          <tr className="ws-subcategory-row">
                            <td colSpan={totalColumnCount} className="ws-subcategory-cell">
                              <div className="ws-subcategory-inner">
                                <span className="ws-subcategory-label">Subcategory</span>
                                <span className="ws-subcategory-title">{currentSubcategory}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr className={`ws-item-row ${outlier ? 'ws-outlier' : ''} ${item.useBenchmark ? 'ws-item-row-benchmark' : 'ws-item-row-custom'} ${isIncomplete ? 'ws-item-incomplete' : ''}`}>
                        <td className="ws-num">{itemCode}</td>
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
                          <div className="ws-status-row">
                            <span className={`ws-state-pill ws-state-pill-${itemStatusMeta.tone}`}>{itemStatusMeta.label}</span>
                            {item.useBenchmark && hasBenchmarkRate && (
                              <span className="ws-state-pill ws-state-pill-info">Auto amount on quantity entry</span>
                            )}
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
                              min="0"
                              step="any"
                              onChange={(e) => handleQuantityChange(section.id, item, e.target.value)}
                            />
                            <button className="ws-geo-btn" onClick={() => setCalculatingQtyForItem({ sectionId: section.id, item })} title="Geometric Takeoff">
                              <Calculator size={10} />
                            </button>
                          </div>
                          <div className="ws-qty-display">
                            <strong className="ws-qty-main">{quantityDisplayValue}</strong>
                            <span className="ws-qty-unit-text">{item.unit || 'unit'}</span>
                          </div>
                          <div className="ws-qty-meta">
                            <span className="ws-qty-source">{quantitySourceLabel}</span>
                          </div>
                          <div className={`ws-field-feedback ws-field-feedback-${quantityFeedbackMeta.tone}`}>
                            {quantityFeedbackMeta.text}
                          </div>
                        </td>
                        {viewMode === 'valuation' ? (
                          <>
                            <td>
                              <input type="number" className="ws-input ws-sm-input" value={item.qtyCompleted || ''}
                                min="0"
                                step="any"
                                onChange={(e) => handleCompletedQuantityChange(section.id, item, e.target.value)} />
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
                                onClick={() => openCustomPricingStudio(section.id, item)}
                                title={item.customPricing ? 'Edit custom pricing studio' : 'Build custom pricing in the studio'}
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
                            {item.useBenchmark && hasBenchmarkRate && (
                              <span className={`ws-rate-chip ws-rate-chip-bm-confidence ws-rate-chip-bm-${getBenchmarkConfidenceLabel(item.benchmarkMatchSource).toLowerCase()}`}
                                title="Benchmark confidence based on breakdown match quality">
                                {getBenchmarkConfidenceLabel(item.benchmarkMatchSource)} confidence
                              </span>
                            )}
                            {benchmarkDeltaMeta && (
                              <span className={`ws-rate-chip ws-rate-chip-${benchmarkDeltaMeta.tone}`}>{benchmarkDeltaMeta.text}</span>
                            )}
                            {hasBenchmarkRate && !item.useBenchmark && (
                              <span className="ws-rate-chip ws-rate-chip-bm-ref" title="Current market benchmark for this item">
                                Benchmark: ₦{Math.round(benchmarkRate).toLocaleString()}
                              </span>
                            )}
                            {!item.useBenchmark && !item.customPricing && (
                              <button
                                className="ws-rate-link"
                                onClick={() => openCustomPricingStudio(section.id, item)}
                                title="Build a defendable custom rate"
                              >
                                Build in studio
                              </button>
                            )}
                          </div>
                          {/* Manual benchmark override when benchmark pricing is active */}
                          {item.useBenchmark && (
                            <div className="ws-benchmark-override">
                              <Pencil size={10} className="ws-benchmark-override-icon" />
                              <span className="ws-benchmark-override-label">Benchmark (₦):</span>
                              <input
                                type="number"
                                className="ws-input ws-benchmark-override-input"
                                value={item.benchmark || ''}
                                min="0"
                                step="any"
                                title="Override the benchmark rate with your own market data"
                                onChange={(e) => updateItem(section.id, item.id, {
                                  benchmark: sanitizeNonNegativeNumber(e.target.value),
                                })}
                              />
                            </div>
                          )}
                          <div className={`ws-rate-note ws-rate-note-${automationMeta.tone}`}>
                            <strong>{automationMeta.title}</strong>
                            <span>{automationMeta.detail}</span>
                          </div>
                        </td>
                        <td className="ws-total-cell">
                          <strong className="ws-total-main">₦{itemTotal.toLocaleString()}</strong>
                          {amountFormula && <span className="ws-total-formula">{amountFormula}</span>}
                          <span className={`ws-total-status ws-total-status-${automationMeta.tone}`}>{automationMeta.title}</span>
                        </td>
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
                      <tr className={`ws-mobile-row ${outlier ? 'ws-outlier' : ''} ${isIncomplete ? 'ws-item-incomplete' : ''}`}>
                        <td colSpan={totalColumnCount} className="ws-mobile-cell">
                          <div className={`ws-mobile-card ${item.useBenchmark ? 'ws-mobile-card-benchmark' : 'ws-mobile-card-custom'} ${isIncomplete ? 'ws-mobile-card-incomplete' : ''}`}>
                            <div className="ws-mobile-card-head">
                              <div className="ws-mobile-card-badges">
                                <span className="ws-mobile-item-code">{itemCode}</span>
                                {item.isVO && <span className="ws-vo">VO</span>}
                                <span className="ws-mobile-unit-pill">{item.unit}</span>
                                <span className={`ws-state-pill ws-state-pill-${itemStatusMeta.tone}`}>{itemStatusMeta.label}</span>
                              </div>
                              <div className="ws-mobile-card-total">
                                <span>Amount</span>
                                <strong>₦{itemTotal.toLocaleString()}</strong>
                                {amountFormula && <small>{amountFormula}</small>}
                              </div>
                            </div>

                            <div className="ws-mobile-field-block ws-mobile-field-block-full">
                              <label>Description</label>
                              <div className="ws-desc-inner">
                                <input
                                  type="text"
                                  className="ws-input ws-desc-input"
                                  value={item.description}
                                  onChange={(e) => updateItem(section.id, item.id, 'description', e.target.value)}
                                />
                                {outlier && <AlertCircle size={12} className="ws-outlier-icon" title="Rate variance detected" />}
                              </div>
                            </div>

                            <div className="ws-mobile-meta-grid">
                              <div className="ws-mobile-field-block">
                                <label>Subcategory</label>
                                <input
                                  type="text"
                                  className="ws-input ws-meta-input"
                                  value={item.subcategory || ''}
                                  onChange={(e) => updateItem(section.id, item.id, 'subcategory', e.target.value)}
                                  placeholder="Subcategory"
                                />
                              </div>
                              <div className="ws-mobile-field-block">
                                <label>Materials</label>
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
                                  placeholder="Materials"
                                />
                              </div>
                            </div>

                            <div className="ws-mobile-grid">
                              <div className="ws-mobile-field-block">
                                <label>Unit</label>
                                <input
                                  type="text"
                                  className="ws-input ws-unit-input"
                                  value={item.unit}
                                  onChange={(e) => updateItem(section.id, item.id, 'unit', e.target.value)}
                                />
                              </div>
                              <div className="ws-mobile-field-block">
                                <label>Quantity</label>
                                <div className="ws-qty-wrap">
                                  <input
                                    type="number"
                                    className="ws-input ws-qty-input"
                                    value={item.qty || ''}
                                    min="0"
                                    step="any"
                                    onChange={(e) => handleQuantityChange(section.id, item, e.target.value)}
                                  />
                                  <button className="ws-geo-btn ws-mobile-icon-btn" onClick={() => setCalculatingQtyForItem({ sectionId: section.id, item })} title="Geometric Takeoff">
                                    <Calculator size={11} />
                                  </button>
                                </div>
                                <div className="ws-qty-display ws-qty-display-mobile">
                                  <strong className="ws-qty-main">{quantityDisplayValue}</strong>
                                  <span className="ws-qty-unit-text">{item.unit || 'unit'}</span>
                                </div>
                                <div className="ws-qty-meta">
                                  <span className="ws-qty-source">{quantitySourceLabel}</span>
                                </div>
                                <div className={`ws-field-feedback ws-field-feedback-${quantityFeedbackMeta.tone}`}>
                                  {quantityFeedbackMeta.text}
                                </div>
                              </div>
                              {viewMode === 'valuation' ? (
                                <>
                                  <div className="ws-mobile-field-block">
                                    <label>Done</label>
                                    <input type="number" className="ws-input ws-sm-input" value={item.qtyCompleted || ''}
                                      min="0"
                                      step="any"
                                      onChange={(e) => handleCompletedQuantityChange(section.id, item, e.target.value)} />
                                  </div>
                                  <div className="ws-mobile-field-block">
                                    <label>Progress</label>
                                    <div className="ws-progress-bar">
                                      <div className="ws-progress-fill" style={{ width: `${Math.min(100, item.progressPercent || 0)}%` }}></div>
                                      <span>{Math.round(item.progressPercent || 0)}%</span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="ws-mobile-field-block ws-mobile-field-block-wide">
                                  <label>Pricing Strategy</label>
                                  <div className="ws-strategy-toggle ws-strategy-toggle-mobile">
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
                                </div>
                              )}
                            </div>

                            <div className="ws-mobile-field-block ws-mobile-field-block-full">
                              <label>Rate / Unit</label>
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
                                    className="ws-analysis-btn ws-custom-studio-btn ws-mobile-icon-btn"
                                    onClick={() => openCustomPricingStudio(section.id, item)}
                                    title={item.customPricing ? 'Edit custom pricing studio' : 'Build custom pricing in the studio'}
                                  >
                                    <SlidersHorizontal size={12} />
                                  </button>
                                )}
                                <button className="ws-analysis-btn ws-mobile-icon-btn" onClick={() => openDetailedAnalysis(section.id, item)} title="Detailed rate analysis">
                                  <Calculator size={12} />
                                </button>
                              </div>
                              <div className="ws-rate-meta ws-rate-meta-mobile">
                                <span className={`ws-rate-chip ws-rate-chip-${rateSourceMeta.tone}`}>{rateSourceMeta.label}</span>
                                {benchmarkDeltaMeta && (
                                  <span className={`ws-rate-chip ws-rate-chip-${benchmarkDeltaMeta.tone}`}>{benchmarkDeltaMeta.text}</span>
                                )}
                                {!item.useBenchmark && !item.customPricing && (
                                  <button
                                    className="ws-rate-link"
                                    onClick={() => openCustomPricingStudio(section.id, item)}
                                    title="Build a defendable custom rate"
                                  >
                                    Build in studio
                                  </button>
                                )}
                              </div>
                              <div className={`ws-rate-note ws-rate-note-${automationMeta.tone}`}>
                                <strong>{automationMeta.title}</strong>
                                <span>{automationMeta.detail}</span>
                              </div>
                            </div>

                            <div className="ws-mobile-actions">
                              {viewMode === 'valuation' ? (
                                <button className={`ws-mobile-action-btn ${item.isVO ? 'ws-vo-active' : ''}`}
                                  onClick={() => toggleVO(section.id, item.id)} title="Variation Order">
                                  <AlertTriangle size={14} />
                                  Variation Order
                                </button>
                              ) : (
                                <>
                                  <button className={`ws-mobile-action-btn ${item.bids?.length > 0 ? 'ws-bid-active' : ''}`}
                                    onClick={() => setBiddingItem({ sectionId: section.id, item })} title="Bids">
                                    <Gavel size={14} />
                                    Bids
                                  </button>
                                  <button className="ws-mobile-action-btn"
                                    onClick={() => duplicateItem(section.id, item.id)} title="Duplicate Item">
                                    <Copy size={14} />
                                    Duplicate
                                  </button>
                                  <button className="ws-mobile-action-btn ws-mobile-action-btn-danger"
                                    onClick={() => onDelete(project.id, section.id, item.id)} title="Delete">
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                      </React.Fragment>
                    );
                  })}
                  {/* Section Footer */}
                  {section.expanded && (
                    <>
                      <tr className="ws-subtotal-row">
                        <td colSpan={subtotalLeadingSpan}></td>
                        <td colSpan="2" className="ws-subtotal-val">
                          Section Total · Qty {sectionQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} · Amount ₦{sectionSubtotal.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                      <tr className="ws-add-row">
                        <td colSpan={totalColumnCount}>
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
          region={project?.region}
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
              qty: sanitizeNonNegativeNumber(newQty),
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

        .ws-mobile-summary,
        .ws-mobile-row {
          display: none;
        }

        .ws-mobile-summary {
          gap: 0.625rem;
          padding: 0.75rem;
          background: linear-gradient(180deg, #f8fafc, #eef2ff);
          border-bottom: 1px solid #e2e8f0;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .ws-mobile-summary::-webkit-scrollbar { display: none; }

        .ws-mobile-stat-card {
          min-width: 130px;
          display: flex;
          flex-direction: column;
          gap: 0.24rem;
          padding: 0.75rem 0.85rem;
          background: rgba(255,255,255,0.92);
          border: 1px solid #dbe4ee;
          border-radius: 14px;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
        }
        .ws-mobile-stat-card span {
          font-size: 0.56rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }
        .ws-mobile-stat-card strong {
          font-size: 0.92rem;
          font-weight: 900;
          color: #0f172a;
        }
        .ws-mobile-stat-card-total {
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          border-color: #bfdbfe;
        }
        .ws-mobile-stat-card-total strong {
          color: #1d4ed8;
        }

        .ws-insight-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.85rem;
          padding: 0.85rem;
          background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
          border-bottom: 1px solid #dbe4ee;
        }

        .ws-insight-card {
          display: flex;
          flex-direction: column;
          gap: 0.28rem;
          padding: 0.95rem 1rem;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #dbe4ee;
          box-shadow: 0 18px 28px rgba(15, 23, 42, 0.06);
        }

        .ws-insight-card-strong {
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          border-color: #bfdbfe;
        }

        .ws-insight-label {
          font-size: 0.62rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }

        .ws-insight-value {
          font-size: 1rem;
          font-weight: 900;
          color: #0f172a;
        }

        .ws-insight-copy {
          margin: 0;
          font-size: 0.72rem;
          line-height: 1.45;
          color: #475569;
        }

        .ws-mobile-cell {
          padding: 0.6rem 0.75rem !important;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .ws-mobile-card {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          padding: 0.95rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          box-shadow: 0 18px 32px rgba(15, 23, 42, 0.07);
        }
        .ws-mobile-card-benchmark {
          border-color: #bfdbfe;
          box-shadow: 0 18px 32px rgba(37, 99, 235, 0.08);
        }
        .ws-mobile-card-custom {
          border-color: #cbd5e1;
        }
        .ws-mobile-card-incomplete {
          border-color: #fdba74;
          background: #fffaf0;
        }

        .ws-mobile-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .ws-mobile-card-badges {
          display: flex;
          align-items: center;
          gap: 0.42rem;
          flex-wrap: wrap;
        }

        .ws-mobile-item-code,
        .ws-mobile-unit-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          font-size: 0.62rem;
          font-weight: 900;
          padding: 0.28rem 0.55rem;
        }

        .ws-mobile-item-code {
          background: #e2e8f0;
          color: #0f172a;
          letter-spacing: 0.03em;
        }

        .ws-mobile-unit-pill {
          background: #eff6ff;
          color: #1d4ed8;
          text-transform: lowercase;
        }

        .ws-mobile-card-total {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.16rem;
          flex-shrink: 0;
          text-align: right;
        }
        .ws-mobile-card-total span {
          font-size: 0.56rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }
        .ws-mobile-card-total strong {
          font-size: 0.95rem;
          font-weight: 900;
          color: #0f172a;
        }
        .ws-mobile-card-total small {
          max-width: 180px;
          font-size: 0.58rem;
          line-height: 1.35;
          color: #64748b;
        }

        .ws-mobile-meta-grid,
        .ws-mobile-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.7rem;
        }

        .ws-mobile-field-block {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          min-width: 0;
        }
        .ws-mobile-field-block .ws-rate-note {
          align-items: flex-start;
        }
        .ws-mobile-field-block .ws-qty-display,
        .ws-mobile-field-block .ws-qty-meta {
          justify-content: flex-start;
        }
        .ws-qty-display-mobile .ws-qty-main {
          font-size: 1rem;
        }
        .ws-mobile-field-block label {
          font-size: 0.6rem;
          font-weight: 900;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #64748b;
        }
        .ws-mobile-field-block-full {
          grid-column: 1 / -1;
        }
        .ws-mobile-field-block-wide {
          grid-column: span 2;
        }

        .ws-mobile-icon-btn {
          width: 30px;
          height: 30px;
          flex-shrink: 0;
        }

        .ws-strategy-toggle-mobile {
          width: 100%;
          justify-content: stretch;
        }
        .ws-strategy-toggle-mobile .ws-strat-btn {
          flex: 1;
        }

        .ws-rate-meta-mobile {
          justify-content: flex-start;
        }

        .ws-mobile-actions {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.1rem;
          scrollbar-width: none;
        }
        .ws-mobile-actions::-webkit-scrollbar { display: none; }

        .ws-mobile-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.38rem;
          min-height: 38px;
          padding: 0.65rem 0.9rem;
          border: 1px solid #dbe4ee;
          border-radius: 12px;
          background: #f8fafc;
          color: #334155;
          font-size: 0.7rem;
          font-weight: 800;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ws-mobile-action-btn:hover {
          background: #e2e8f0;
          border-color: #cbd5e1;
        }
        .ws-mobile-action-btn-danger {
          background: #fff5f5;
          border-color: #fecaca;
          color: #dc2626;
        }
        .ws-mobile-action-btn-danger:hover {
          background: #fee2e2;
          border-color: #fca5a5;
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
        .ws-th-qty { width: 146px; text-align: center; }
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
          transition: background 0.15s, box-shadow 0.15s;
        }
        .ws-item-row:hover { background: #f8fafc; }
        .ws-item-row td { padding: 0.375rem 0.625rem; vertical-align: middle; }
        .ws-outlier { background: #fffbeb !important; }
        .ws-item-row-benchmark td:first-child,
        .ws-item-row-custom td:first-child,
        .ws-item-incomplete td:first-child {
          box-shadow: inset 3px 0 0 transparent;
        }
        .ws-item-row-benchmark td:first-child { box-shadow: inset 3px 0 0 #2563eb; }
        .ws-item-row-custom td:first-child { box-shadow: inset 3px 0 0 #0f766e; }
        .ws-item-incomplete { background: #fffaf0 !important; }
        .ws-item-incomplete td:first-child { box-shadow: inset 3px 0 0 #f59e0b; }

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
        .ws-status-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.28rem;
          margin-top: 0.32rem;
        }
        .ws-state-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.14rem 0.46rem;
          border-radius: 999px;
          font-size: 0.55rem;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .ws-state-pill-benchmark { background: #dbeafe; color: #1d4ed8; }
        .ws-state-pill-custom { background: #ccfbf1; color: #0f766e; }
        .ws-state-pill-calculated { background: #ede9fe; color: #6d28d9; }
        .ws-state-pill-manual { background: #e2e8f0; color: #475569; }
        .ws-state-pill-warning { background: #ffedd5; color: #c2410c; }
        .ws-state-pill-info { background: #ecfdf5; color: #15803d; }
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
        .ws-qty-input { text-align: right; font-weight: 700; font-size: 0.88rem; }
        .ws-rate-input { text-align: right; font-weight: 600; }
        .ws-sm-input { text-align: center; font-weight: 600; width: 100%; }
        .ws-input:disabled { color: #94a3b8; background: #f8fafc; }
        .ws-qty-display {
          margin-top: 0.26rem;
          display: flex;
          align-items: baseline;
          justify-content: flex-end;
          gap: 0.26rem;
        }
        .ws-qty-main {
          font-size: 0.86rem;
          line-height: 1.1;
          font-weight: 900;
          color: #0f172a;
        }
        .ws-qty-unit-text {
          font-size: 0.62rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }
        .ws-qty-meta {
          margin-top: 0.12rem;
          display: flex;
          justify-content: flex-end;
        }
        .ws-qty-source {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.14rem 0.42rem;
          border-radius: 999px;
          font-size: 0.55rem;
          font-weight: 800;
          background: #eff6ff;
          color: #1d4ed8;
        }
        .ws-field-feedback {
          margin-top: 0.22rem;
          font-size: 0.62rem;
          line-height: 1.35;
        }
        .ws-field-feedback-success { color: #15803d; }
        .ws-field-feedback-warning { color: #c2410c; }
        .ws-field-feedback-muted { color: #64748b; }

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
          background: white;
          border: 1px solid #dbe4ee;
          border-radius: 999px;
          padding: 0.18rem;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
        }
        .ws-strat-btn {
          padding: 0.26rem 0.58rem;
          min-width: 72px;
          font-size: 0.56rem;
          font-weight: 800;
          border: 1px solid transparent;
          border-radius: 999px;
          background: transparent;
          color: #64748b;
          cursor: pointer; transition: all 0.15s;
        }
        .ws-strat-btn.active { color: white; }
        .ws-strat-btn:first-child.active { background: #0f766e; border-color: #0f766e; }
        .ws-strat-btn:last-child.active { background: #1d4ed8; border-color: #1d4ed8; }

        .ws-total-cell {
          text-align: right;
          font-weight: 700;
          color: #1e293b;
          font-size: 0.8125rem;
          white-space: normal;
        }
        .ws-total-main {
          display: block;
          font-size: 0.84rem;
          line-height: 1.15;
          color: #0f172a;
        }
        .ws-total-formula {
          display: block;
          font-size: 0.6rem;
          color: #64748b;
          line-height: 1.3;
          margin-top: 0.14rem;
        }
        .ws-total-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.14rem 0.44rem;
          border-radius: 999px;
          font-size: 0.55rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          margin-top: 0.2rem;
        }
        .ws-total-status-success { background: #dcfce7; color: #166534; }
        .ws-total-status-warning { background: #ffedd5; color: #c2410c; }
        .ws-total-status-custom { background: #ccfbf1; color: #0f766e; }
        .ws-total-status-calculated { background: #ede9fe; color: #6d28d9; }
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
          line-height: 1.35;
          display: flex;
          flex-direction: column;
          gap: 0.14rem;
          align-items: flex-end;
        }
        .ws-rate-note strong {
          font-size: 0.6rem;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        .ws-rate-note span {
          color: inherit;
        }
        .ws-rate-note-success { color: #166534; }
        .ws-rate-note-warning { color: #c2410c; }
        .ws-rate-note-custom { color: #0f766e; }
        .ws-rate-note-calculated { color: #6d28d9; }
        .ws-rate-note-manual { color: #475569; }
        .ws-rate-note-benchmark { color: #1d4ed8; }
        .ws-rate-note-muted { color: #64748b; }
        .ws-rate-link {
          border: none;
          background: #ecfeff;
          color: #0f766e;
          border-radius: 999px;
          padding: 0.16rem 0.46rem;
          font-size: 0.58rem;
          font-weight: 800;
          cursor: pointer;
        }
        .ws-rate-link:hover {
          background: #0f766e;
          color: white;
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
          .ws-container {
            height: auto;
            min-height: calc(100vh - 56px);
          }
          .ws-toolbar {
            flex-wrap: wrap;
            align-items: stretch;
            padding: 0.65rem;
            gap: 0.55rem;
          }
          .ws-toolbar-left,
          .ws-toolbar-right {
            width: 100%;
          }
          .ws-toolbar-left {
            flex-wrap: wrap;
          }
          .ws-toolbar-center {
            display: none;
          }
          .ws-search {
            width: 100%;
            min-width: 0;
          }
          .ws-mode-switch {
            flex: 1;
            min-width: 0;
          }
          .ws-mode-btn {
            flex: 1;
            justify-content: center;
            min-height: 34px;
          }
          .ws-region-sel {
            min-height: 34px;
          }
          .ws-toolbar-right {
            display: flex;
            flex-wrap: nowrap;
            overflow-x: auto;
            padding-bottom: 0.2rem;
            scrollbar-width: none;
          }
          .ws-toolbar-right::-webkit-scrollbar { display: none; }
          .ws-btn {
            flex-shrink: 0;
            min-height: 34px;
          }
          .ws-mobile-summary {
            display: grid;
            grid-auto-flow: column;
            grid-auto-columns: minmax(130px, 1fr);
          }
          .ws-insight-strip {
            display: grid;
            grid-auto-flow: column;
            grid-auto-columns: minmax(220px, 1fr);
            overflow-x: auto;
            padding-bottom: 0.95rem;
            scrollbar-width: none;
          }
          .ws-insight-strip::-webkit-scrollbar { display: none; }
          .ws-table-wrap {
            background: #f8fafc;
          }
          .ws-table {
            font-size: 0.75rem;
            background: transparent;
          }
          .ws-table thead {
            display: none;
          }
          .ws-item-row {
            display: none;
          }
          .ws-mobile-row {
            display: table-row;
          }
          .ws-section-row td,
          .ws-subcategory-cell,
          .ws-subtotal-val,
          .ws-add-row td,
          .ws-grand-total td {
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
          }
          .ws-section-cell {
            padding-top: 0.75rem !important;
          }
          .ws-section-inner {
            flex-wrap: wrap;
          }
          .ws-section-total {
            width: 100%;
            margin-left: 0;
            padding-left: 1.9rem;
          }
          .ws-subcategory-inner {
            flex-wrap: wrap;
          }
          .ws-item-meta-row {
            grid-template-columns: 1fr;
          }
          .ws-rate-wrap {
            width: 100%;
          }
          .ws-rate-input {
            min-width: 0;
          }
          .ws-subtotal-row td:first-child,
          .ws-subtotal-row td:last-child {
            display: none;
          }
          .ws-subtotal-val {
            display: block;
            text-align: left !important;
          }
          .ws-grand-total td:first-child {
            width: auto;
          }
        }

        @media (max-width: 560px) {
          .ws-insight-card {
            min-height: 120px;
          }
          .ws-mobile-meta-grid,
          .ws-mobile-grid {
            grid-template-columns: 1fr;
          }
          .ws-mobile-field-block-wide {
            grid-column: auto;
          }
          .ws-mobile-card-head {
            flex-direction: column;
            align-items: stretch;
          }
          .ws-mobile-card-total {
            align-items: flex-start;
            text-align: left;
          }
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
