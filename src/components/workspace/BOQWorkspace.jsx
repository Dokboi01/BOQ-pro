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
import BOQItemPickerModal from './BOQItemPickerModal';
import BOQFormulaModal from './BOQFormulaModal';
import BOQItemDetailPanel from './BOQItemDetailPanel';
import { getMaterials } from '../../db/database';
import {
  cloneCatalogItemToProjectItem,
  createCustomBoqItem,
  getStructureSectionCatalog,
} from '../../data/boqCatalog';
import { buildCompanyKey, deriveCompanyName } from '../../utils/companyAccess';
import { buildCustomPricingFromRateAnalysis, WORK_TYPE_LABELS } from '../../utils/customPricing';
import {
  evaluateBoqFormulaRate,
  getFormulaDisplayText,
  getWorkedExamplePreview,
  isFormulaDrivenItem,
  normalizeEditableInputs,
} from '../../utils/boqFormulas';
import {
  applyBenchmarkRefreshToItem,
  buildAutoRateResult,
  buildMaterialRateIndex,
  getItemBenchmarkRefreshInsight,
  getBenchmarkConfidenceLabel,
  getItemBenchmarkEvidence,
  getBenchmarkRegionalFactor,
  getEffectiveBenchmarkRate,
  getItemTotal,
  getItemUnitRate,
  getProjectBenchmarkRefreshAnalytics,
  getProjectPricingAnalytics,
  isBenchmarkOutlier,
  repriceSectionsForRegion,
  resolveItemRateSource,
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
  Pencil,
  Info,
  X
} from 'lucide-react';

const BOQWorkspace = ({ project, launchIntent, onLaunchIntentHandled, onUpdate, onAddSection, onExport, onDelete }) => {
  const [sections, setSections] = useState(project?.sections || []);
  const [analyzingItem, setAnalyzingItem] = useState(null);
  const [customPricingItem, setCustomPricingItem] = useState(null);
  const [calculatingQtyForItem, setCalculatingQtyForItem] = useState(null);
  const [biddingItem, setBiddingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [viewMode, setViewMode] = useState('estimation');
  const [showStructuralAnalyzer, setShowStructuralAnalyzer] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [itemPickerSectionId, setItemPickerSectionId] = useState(null);
  const [formulaItemContext, setFormulaItemContext] = useState(null);
  const [itemDetailPanelContext, setItemDetailPanelContext] = useState(null);
  const [activeBillSectionId, setActiveBillSectionId] = useState(project?.sections?.[0]?.id || null);
  const sectionRowRefs = React.useRef({});

  // Collaboration state
  const [showTeamHub, setShowTeamHub] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [benchmarkMaterialIndex, setBenchmarkMaterialIndex] = useState(null);
  const [benchmarkSyncState, setBenchmarkSyncState] = useState({
    status: 'idle',
    checkedAt: null,
    error: '',
  });

  const toast = useToast();
  const { user } = useAuth();
  const isCustomWorkspace = project?.projectMode === 'custom';
  const marketRegionLabel = project?.region || 'Lagos';
  const marketRegionDisplay = marketRegionLabel.replace(/_/g, ' ');

  const loadMarketBenchmarks = async ({ silent = false } = {}) => {
    try {
      setBenchmarkSyncState((prev) => ({
        ...prev,
        status: 'loading',
        error: '',
      }));

      const dbMaterials = await getMaterials();
      const nextMaterialIndex = buildMaterialRateIndex(dbMaterials);

      setBenchmarkMaterialIndex(nextMaterialIndex);
      setBenchmarkSyncState({
        status: 'ready',
        checkedAt: new Date().toISOString(),
        error: '',
      });

      return nextMaterialIndex;
    } catch (error) {
      setBenchmarkSyncState({
        status: 'error',
        checkedAt: null,
        error: error?.message || 'Unable to load market benchmark data.',
      });

      if (!silent) {
        toast.error('We could not load the latest benchmark library just now.');
      }

      return null;
    }
  };

  React.useEffect(() => {
    if (project?.sections) {
      setSections(project.sections);
    }
  }, [project]);

  React.useEffect(() => {
    if (!sections.length) {
      setActiveBillSectionId(null);
      return;
    }

    const activeSectionExists = sections.some((section) => section.id === activeBillSectionId);
    if (!activeSectionExists) {
      setActiveBillSectionId(sections[0].id);
    }
  }, [activeBillSectionId, sections]);

  useEffect(() => {
    if (!selectedCell) return;

    const stillExists = (sections || []).some((section) =>
      section.id === selectedCell.sectionId
      && (section.items || []).some((item) => item.id === selectedCell.itemId)
    );

    if (!stillExists) {
      setSelectedCell(null);
    }
  }, [sections, selectedCell]);

  useEffect(() => {
    let active = true;

    const hydrateBenchmarks = async () => {
      try {
        setBenchmarkSyncState((prev) => ({
          ...prev,
          status: 'loading',
          error: '',
        }));

        const dbMaterials = await getMaterials();
        const nextMaterialIndex = buildMaterialRateIndex(dbMaterials);
        if (!active) return;

        setBenchmarkMaterialIndex(nextMaterialIndex);
        setBenchmarkSyncState({
          status: 'ready',
          checkedAt: new Date().toISOString(),
          error: '',
        });
      } catch (error) {
        if (!active) return;
        setBenchmarkSyncState({
          status: 'error',
          checkedAt: null,
          error: error?.message || 'Unable to load market benchmark data.',
        });
      }
    };

    hydrateBenchmarks();

    return () => {
      active = false;
    };
  }, [project?.id, project?.region, project?.subtype, project?.type]);

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

  const syncBoqItemSnapshot = (item, section = null) => {
    const normalizedEditableInputs = normalizeEditableInputs(item.editableInputs).map((input) => ({
      ...input,
      value: input.value ?? input.defaultValue
    }));
    const itemWithInputs = { ...item, editableInputs: normalizedEditableInputs };
    // Compute fresh formula rate
    const formulaRate = evaluateBoqFormulaRate(itemWithInputs);
    const formulaCalculatedRate = sanitizeNonNegativeNumber(formulaRate);
    const quantity = sanitizeNonNegativeNumber(item.quantity ?? item.qty);
    const benchmarkRate = sanitizeNonNegativeNumber(item.benchmarkRate ?? item.benchmark);
    // Backward-compat shim: derive selectedRateSource from legacy flags if missing
    const selectedRateSource = resolveItemRateSource(item);
    // Manual rate — prefer explicit manualRate field
    const manualRate = sanitizeNonNegativeNumber(item.manualRate ?? (selectedRateSource === 'manual' ? (item.unitRate ?? item.rate) : 0));
    // Resolve the active unit rate from the tri-modal source
    const resolvedUnitRate = selectedRateSource === 'benchmark'
      ? getEffectiveBenchmarkRate(itemWithInputs, project?.region || 'Lagos')
      : selectedRateSource === 'formula'
        ? (formulaCalculatedRate || benchmarkRate)
        : manualRate;
    const legacyRateSource = selectedRateSource === 'manual'
      && item.rateSource
      && !['manual', 'benchmark', 'formula'].includes(item.rateSource)
      ? item.rateSource
      : selectedRateSource;

    const nextItem = {
      ...item,
      editableInputs: normalizedEditableInputs,
      quantity,
      qty: quantity,
      // --- new tri-modal fields ---
      selectedRateSource,
      formulaCalculatedRate,
      resolvedUnitRate,
      manualRate,
      // --- legacy aliases kept in sync ---
      unitRate: resolvedUnitRate,
      rate: resolvedUnitRate,
      benchmarkRate,
      benchmark: benchmarkRate,
      benchmarkMetadata: {
        rate: sanitizeNonNegativeNumber(item.benchmarkMetadata?.rate ?? benchmarkRate),
        currency: item.benchmarkMetadata?.currency || 'NGN',
        region: item.benchmarkMetadata?.region || project?.region || 'Lagos',
        sourceType: item.benchmarkMetadata?.sourceType || (benchmarkRate > 0 ? 'catalog' : 'manual'),
        sourceNote: item.benchmarkMetadata?.sourceNote || '',
        dateCaptured: item.benchmarkMetadata?.dateCaptured || null,
        confidenceLevel: item.benchmarkMetadata?.confidenceLevel || (benchmarkRate > 0 ? 'medium' : 'low'),
      },
      useBenchmark: selectedRateSource === 'benchmark',
      rateSource: legacyRateSource,
      billSectionTitle: item.billSectionTitle || section?.title || '',
      billSection: item.billSection || section?.billSectionId || section?.id || '',
      structureType: item.structureType || section?.structureType || project?.structureType || project?.type || '',
      name: item.name || item.description || 'Untitled BOQ Item',
    };
    nextItem.amount = quantity * resolvedUnitRate;
    nextItem.total = nextItem.amount;
    if (nextItem.qtyCompleted !== undefined) {
      nextItem.progressPercent = nextItem.qty > 0 ? (nextItem.qtyCompleted / nextItem.qty) * 100 : 0;
    }
    return nextItem;
  };

  const updateItem = (sectionId, itemId, fieldOrUpdates, valueOrBreakdown = null, breakdown = null) => {
    const updated = sections.map((section) => {
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
          return syncBoqItemSnapshot(updatedItem, section);
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

  const getSelectedRateSource = (item) => resolveItemRateSource(item);

  const getManualRateValue = (item) => sanitizeNonNegativeNumber(
    item?.manualRate ?? (
      getSelectedRateSource(item) === 'manual'
        ? (item?.unitRate ?? item?.rate)
        : 0
    )
  );

  const getFormulaRateValue = (item) => sanitizeNonNegativeNumber(
    item?.formulaCalculatedRate ?? evaluateBoqFormulaRate({
      ...item,
      editableInputs: normalizeEditableInputs(item?.editableInputs),
    })
  );

  const getBenchmarkRateValue = (item) => sanitizeNonNegativeNumber(
    getEffectiveBenchmarkRate(item, project?.region || 'Lagos')
  );

  const getRateOptionAvailability = (item) => {
    const benchmarkRate = getBenchmarkRateValue(item);
    const hasFormulaRate = isFormulaDrivenItem(item);
    const manualRate = getManualRateValue(item);
    const formulaRate = getFormulaRateValue(item);
    const benchmarkReference = sanitizeNonNegativeNumber(
      item?.benchmarkMetadata?.rate ?? item?.benchmarkRate ?? item?.benchmark
    );

    return {
      benchmarkRate,
      formulaRate,
      manualRate,
      hasBenchmarkRate: benchmarkRate > 0 || benchmarkReference > 0,
      hasFormulaRate,
    };
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
    const shouldPreserveCustomPricing = analyzingItem.preserveCustomPricing || Boolean(analyzingItem.item?.customPricing);
    const nextCustomPricing = shouldPreserveCustomPricing
      ? {
          ...buildCustomPricingFromRateAnalysis(
            analyzingItem.item,
            breakdown,
            analyzingItem.item?.customPricing
          ),
          savedAt: new Date().toISOString()
        }
      : null;
    const nextBreakdown = shouldPreserveCustomPricing
      ? {
          ...breakdown,
          analysisMode: 'custom-pricing-linked',
          linkedCustomPricing: nextCustomPricing
        }
      : breakdown;

    updateItem(analyzingItem.sectionId, analyzingItem.item.id, {
      selectedRateSource: 'manual',
      manualRate: sanitizeNonNegativeNumber(rate),
      rate: rate,
      rateSource: shouldPreserveCustomPricing ? 'custom' : 'calculated',
      useBenchmark: false,
      breakdown: nextBreakdown,
      customPricing: nextCustomPricing
    });
    setAnalyzingItem(null);
  };

  const handleCustomPricingSave = (rate, customPricing) => {
    if (!customPricingItem) return;

    updateItem(customPricingItem.sectionId, customPricingItem.item.id, {
      selectedRateSource: 'manual',
      manualRate: sanitizeNonNegativeNumber(rate),
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
    const safeRate = sanitizeNonNegativeNumber(nextRate);
    updateItem(sectionId, item.id, {
      manualRate: safeRate,
      rate: safeRate,
      unitRate: safeRate,
      selectedRateSource: 'manual',
      rateSource: 'manual',
      useBenchmark: false,
      customPricing: null,
    });
  };

  const handleRateSourceChange = (sectionId, item, nextSource) => {
    const availability = getRateOptionAvailability(item);
    if (nextSource === 'benchmark' && !availability.hasBenchmarkRate) {
      toast.info('No benchmark rate is available for this item yet.');
      return;
    }
    if (nextSource === 'formula' && !availability.hasFormulaRate) {
      toast.info('This item does not have a saved formula yet.');
      return;
    }

    const nextRateSource = nextSource === 'manual'
      ? (
          item.customPricing
            ? 'custom'
            : item.rateSource === 'calculated'
              ? 'calculated'
              : 'manual'
        )
      : nextSource;

    updateItem(sectionId, item.id, {
      selectedRateSource: nextSource,
      useBenchmark: nextSource === 'benchmark',
      rateSource: nextRateSource,
    });
  };

  const openItemDetailPanel = (sectionId, item) => {
    setItemDetailPanelContext({ sectionId, item });
  };

  const openDetailedAnalysis = (sectionId, item, draftCustomPricing = null) => {
    setCustomPricingItem(null);
    setAnalyzingItem({
      sectionId,
      preserveCustomPricing: Boolean(draftCustomPricing || item?.customPricing),
      item: {
        ...item,
        customPricing: draftCustomPricing || item?.customPricing || null
      }
    });
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
      : item.breakdown && !isFormulaDrivenItem(item)
        ? 'calculated'
        : 'manual';

    updateItem(sectionId, item.id, {
      selectedRateSource: 'manual',
      useBenchmark: false,
      rateSource: nextRateSource
    });

    if (!item.customPricing && !isFormulaDrivenItem(item)) {
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
    let benchmarkRegionalRates = item.benchmarkRegionalRates || null;
    let benchmarkEvidence = item.benchmarkEvidence || null;

    if (!derivedBenchmark) {
      const fallbackAutoRate = buildAutoRateResult(item, {
        structureType: project?.structureType || project?.subtype || project?.type,
        region: project?.region || 'Lagos',
        materialIndex: benchmarkMaterialIndex || []
      });
      derivedBenchmark = Number(fallbackAutoRate?.benchmark) || 0;
      matchSource = fallbackAutoRate?.matchSource || matchSource;
      benchmarkRegionalRates = fallbackAutoRate?.benchmarkRegionalRates || benchmarkRegionalRates;
      benchmarkEvidence = fallbackAutoRate?.benchmarkEvidence || benchmarkEvidence;

      // Last resort: derive from current rate
      if (!derivedBenchmark && Number(item.rate) > 0) {
        derivedBenchmark = Number(item.rate) / Math.max(regionalFactor, 0.001);
      }
    }

    updateItem(sectionId, item.id, {
      selectedRateSource: 'benchmark',
      useBenchmark: true,
      rateSource: 'benchmark',
      benchmark: derivedBenchmark || 0,
      benchmarkRegionalRates,
      benchmarkEvidence,
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
    const materialIndex = await loadMarketBenchmarks({ silent: true }) || benchmarkMaterialIndex || [];
    let updatedCount = 0;
    let benchmarkedCount = 0;

    const updated = sections.map((section) => ({
      ...section,
      items: (section.items || []).map((item) => {
        const selectedRateSource = resolveItemRateSource(item);
        const shouldPreserveManualRate = selectedRateSource === 'manual' && getManualRateValue(item) > 0 && item.rateSource === 'manual';
        const autoRated = buildAutoRateResult(item, {
          structureType: project?.structureType || project?.subtype || project?.type,
          region: project?.region || 'Lagos',
          materialIndex
        });

        const nextItem = {
          ...item,
          benchmark: Number(item.benchmark) > 0 ? item.benchmark : autoRated.benchmark,
          benchmarkRegionalRates: item.benchmarkRegionalRates || autoRated.benchmarkRegionalRates || null,
          benchmarkEvidence: item.benchmarkEvidence || autoRated.benchmarkEvidence || null,
          breakdown: item.breakdown || autoRated.breakdown,
          benchmarkMatchSource: item.benchmarkMatchSource || autoRated.matchSource,
        };

        if (!shouldPreserveManualRate && selectedRateSource === 'manual' && getManualRateValue(item) <= 0) {
          nextItem.manualRate = sanitizeNonNegativeNumber(autoRated.rate);
          nextItem.rate = autoRated.rate;
          nextItem.unitRate = autoRated.rate;
          nextItem.selectedRateSource = 'manual';
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

  const buildBenchmarkRefreshResult = (materialIndex, { targetSectionId = null, targetItemId = null } = {}) => {
    const region = project?.region || 'Lagos';
    const structureType = project?.structureType || project?.subtype || project?.type;
    let appliedCount = 0;
    let benchmarkRateUpdates = 0;
    let referenceOnlyUpdates = 0;
    let newBenchmarkLinks = 0;
    let reviewCount = 0;

    const updated = sections.map((section) => {
      if (targetSectionId && section.id !== targetSectionId) {
        return section;
      }

      let sectionChanged = false;
      const nextItems = (section.items || []).map((item) => {
        if (targetItemId && item.id !== targetItemId) {
          return item;
        }

        const insight = getItemBenchmarkRefreshInsight(item, {
          structureType,
          region,
          materialIndex,
        });

        if (!insight?.actionable) {
          return item;
        }

        if (insight.needsReviewOnly) {
          reviewCount += 1;
          return item;
        }

        const nextItem = applyBenchmarkRefreshToItem(item, insight, region);
        if (nextItem === item) {
          return item;
        }

        sectionChanged = true;
        appliedCount += 1;

        if (insight.pricingMode === 'benchmark') {
          benchmarkRateUpdates += 1;
        }
        if (insight.preservesRate) {
          referenceOnlyUpdates += 1;
        }
        if (insight.benchmarkNowAvailable) {
          newBenchmarkLinks += 1;
        }

        return nextItem;
      });

      return sectionChanged ? { ...section, items: nextItems } : section;
    });

    return {
      updated,
      appliedCount,
      benchmarkRateUpdates,
      referenceOnlyUpdates,
      newBenchmarkLinks,
      reviewCount,
    };
  };

  const applyBenchmarkRefresh = async ({ targetSectionId = null, targetItemId = null, scope = 'project' } = {}) => {
    const materialIndex = await loadMarketBenchmarks();
    if (!materialIndex) return;

    const {
      updated,
      appliedCount,
      benchmarkRateUpdates,
      referenceOnlyUpdates,
      newBenchmarkLinks,
      reviewCount,
    } = buildBenchmarkRefreshResult(materialIndex, { targetSectionId, targetItemId });

    if (appliedCount <= 0) {
      if (reviewCount > 0) {
        toast.warning(`${reviewCount} item${reviewCount === 1 ? '' : 's'} still need benchmark review before we refresh anything.`);
      } else if (scope === 'item') {
        toast.info('This item already matches the latest market benchmark.');
      } else if (scope === 'section') {
        toast.info('This section is already aligned with the latest benchmark library.');
      } else {
        toast.info('Project benchmarks already match the latest market library.');
      }
      return;
    }

    setSections(updated);
    onUpdate(project.id, updated, project?.region);

    const summary = [
      `${appliedCount} benchmark reference${appliedCount === 1 ? '' : 's'} refreshed`,
      benchmarkRateUpdates > 0 ? `${benchmarkRateUpdates} live benchmark amount${benchmarkRateUpdates === 1 ? '' : 's'} updated` : '',
      referenceOnlyUpdates > 0 ? `${referenceOnlyUpdates} custom/manual item${referenceOnlyUpdates === 1 ? '' : 's'} kept their saved rate` : '',
      newBenchmarkLinks > 0 ? `${newBenchmarkLinks} item${newBenchmarkLinks === 1 ? '' : 's'} gained a fresh benchmark link` : '',
    ].filter(Boolean).join(' · ');

    toast.success(summary);

    if (reviewCount > 0) {
      toast.warning(`${reviewCount} item${reviewCount === 1 ? '' : 's'} still need benchmark review because no live market rebuild was found.`);
    }
  };

  const refreshBenchmarks = async () => {
    await applyBenchmarkRefresh({ scope: 'project' });
  };

  const refreshSectionBenchmarks = async (sectionId) => {
    await applyBenchmarkRefresh({ targetSectionId: sectionId, scope: 'section' });
  };

  const refreshItemBenchmark = async (sectionId, itemId) => {
    await applyBenchmarkRefresh({ targetSectionId: sectionId, targetItemId: itemId, scope: 'item' });
  };

  const toggleVO = (sectionId, itemId) => {
    updateItem(sectionId, itemId, 'isVO', !sections.find(s => s.id === sectionId)?.items.find(i => i.id === itemId)?.isVO);
  };

  const addItemToSection = (sectionId) => {
    const updated = sections.map((section) => {
      if (section.id !== sectionId) return section;
      const nextItem = syncBoqItemSnapshot(createCustomBoqItem({
        structureType: project?.structureType || project?.type || '',
        billSectionId: section.billSectionId || section.id,
        billSectionTitle: section.title,
      }), section);
      return {
        ...section,
        items: [...section.items, nextItem]
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
      const duplicate = syncBoqItemSnapshot({
        ...sourceItem,
        id: Date.now() + Math.random(),
        description: `${sourceItem.description} (Copy)`,
        materials: Array.isArray(sourceItem.materials) ? [...sourceItem.materials] : [],
        breakdown: cloneBreakdown(sourceItem.breakdown),
        customPricing: sourceItem.customPricing ? { ...sourceItem.customPricing } : null,
        editableInputs: normalizeEditableInputs(sourceItem.editableInputs),
        exampleInputs: normalizeEditableInputs(sourceItem.exampleInputs),
      }, section);

      const nextItems = [...section.items];
      nextItems.splice(index + 1, 0, duplicate);
      return { ...section, items: nextItems };
    });

    setSections(updated);
    onUpdate(project.id, updated);
  };

  const addItemBelow = (sectionId, itemId) => {
    const updated = sections.map((section) => {
      if (section.id !== sectionId) return section;

      const index = (section.items || []).findIndex((itm) => itm.id === itemId);
      if (index < 0) return section;

      const sourceItem = section.items[index];
      const nextItem = syncBoqItemSnapshot({
        ...createCustomBoqItem({
          structureType: sourceItem?.structureType || project?.structureType || project?.type || '',
          billSectionId: section.billSectionId || section.id,
          billSectionTitle: section.title,
        }),
        id: Date.now() + Math.random(),
        unit: sourceItem?.unit || 'Nr',
        subcategory: sourceItem?.subcategory || section.title,
      }, section);

      const nextItems = [...(section.items || [])];
      nextItems.splice(index + 1, 0, nextItem);
      return { ...section, items: nextItems };
    });

    setSections(updated);
    onUpdate(project.id, updated);
  };

  const isOutlier = (rate, benchmark) => {
    return isBenchmarkOutlier(rate, benchmark);
  };

  const getRateSourceMeta = (item) => {
    const src = resolveItemRateSource(item);
    if (src === 'benchmark') return { label: `${marketRegionLabel} Market Benchmark`, tone: 'benchmark' };
    if (src === 'formula') return { label: 'Formula-Driven Rate', tone: 'calculated' };
    if (item.customPricing) return { label: 'Manual Override from Pricing Studio', tone: 'custom' };
    if (item.rateSource === 'calculated') return { label: 'Manual Build-Up Rate', tone: 'calculated' };
    return { label: 'Manual Rate Entry', tone: 'manual' };
  };

  const getBenchmarkDeltaMeta = (item) => {
    if (resolveItemRateSource(item) === 'benchmark') return null;

    const benchmarkRate = getEffectiveBenchmarkRate(item, project?.region || 'Lagos');
    const customRate = getItemUnitRate(item, project?.region || 'Lagos');
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

  const formatEvidenceUpdatedLabel = (value) => {
    if (!value) return '';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';

    return parsed.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatBenchmarkSyncLabel = (value) => {
    if (!value) return '';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';

    return parsed.toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getBenchmarkEvidenceMeta = (item) => {
    const evidence = getItemBenchmarkEvidence(item, project?.region || 'Lagos');
    const benchmarkRate = getEffectiveBenchmarkRate(item, project?.region || 'Lagos');
    if (!evidence || (!benchmarkRate && !item?.benchmark)) return null;

    let title = `${marketRegionDisplay} benchmark generated`;
    let chip = `${marketRegionDisplay} benchmark`;
    let tone = 'benchmark';

    if (evidence.mode === 'manual-override') {
      title = `${marketRegionDisplay} benchmark override active`;
      chip = 'Benchmark override';
      tone = 'custom';
    } else if (evidence.mode === 'exact-region') {
      title = `Exact ${marketRegionDisplay} benchmark used`;
      chip = `Exact ${marketRegionDisplay}`;
    } else if (evidence.mode === 'lagos-exact') {
      title = 'Exact Lagos benchmark used';
      chip = 'Exact Lagos';
    } else if (evidence.mode === 'regional-adjusted') {
      title = `${marketRegionDisplay} benchmark calibrated from market factors`;
      chip = `${marketRegionDisplay} calibrated`;
      tone = 'muted';
    } else if (evidence.mode === 'fallback') {
      title = 'Modeled benchmark estimate';
      chip = 'Modeled benchmark';
      tone = 'warning';
    }

    const detailParts = [];
    if (evidence.sourceCount > 0) {
      detailParts.push(`${evidence.sourceCount} market source${evidence.sourceCount === 1 ? '' : 's'}`);
    } else if (evidence.matchedMaterialCount > 0) {
      detailParts.push(`${evidence.matchedMaterialCount} material benchmark match${evidence.matchedMaterialCount === 1 ? '' : 'es'}`);
    }
    if (evidence.verifiedBy) {
      detailParts.push(`Verified by ${evidence.verifiedBy}`);
    }
    if (evidence.updatedAt) {
      detailParts.push(`Updated ${formatEvidenceUpdatedLabel(evidence.updatedAt)}`);
    }
    if (evidence.benchmarkBand) {
      detailParts.push(`Band ${evidence.benchmarkBand}`);
    }

    return {
      ...evidence,
      title,
      referenceTitle: `Benchmark reference: ${chip} available`,
      chip,
      tone,
      detail: detailParts.join(' | '),
      rateLabel: `Using ${marketRegionDisplay} benchmark of N${Math.round(benchmarkRate).toLocaleString()} per ${item?.unit || 'unit'}`,
      referenceRateLabel: `Current ${marketRegionDisplay} benchmark: N${Math.round(benchmarkRate).toLocaleString()} per ${item?.unit || 'unit'}`
    };
  };

  const getQuantityFeedbackMeta = (item, benchmarkRate, unitRate) => {
    const quantity = sanitizeNonNegativeNumber(item?.qty);
    const selectedRateSource = resolveItemRateSource(item);

    if (quantity <= 0) {
      return {
        text: 'Enter quantity, area, length, volume, or meter value to generate the amount.',
        tone: 'warning'
      };
    }

    if (selectedRateSource === 'benchmark' && benchmarkRate > 0) {
      return {
        text: 'Price generated automatically.',
        tone: 'success'
      };
    }

    if (selectedRateSource === 'benchmark' && benchmarkRate <= 0) {
      return {
        text: 'No benchmark rate available — switch to custom pricing.',
        tone: 'warning'
      };
    }

    if (selectedRateSource === 'formula' && unitRate > 0) {
      return {
        text: 'Formula inputs are active and the amount is updating from the calculated rate.',
        tone: 'success'
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
    const selectedRateSource = resolveItemRateSource(item);

    if (quantity <= 0) {
      return {
        title: 'Waiting for project quantity',
        detail: 'Amount will calculate as soon as quantity is entered.',
        tone: 'warning'
      };
    }

    if (selectedRateSource === 'benchmark') {
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

    if (selectedRateSource === 'formula') {
      if (unitRate <= 0) {
        return {
          title: 'Formula inputs still need review',
          detail: 'Update the formula inputs or switch rate source to complete this item.',
          tone: 'warning'
        };
      }

      return {
        title: 'Formula rate active',
        detail: 'Amount is being generated from the saved engineering formula inputs.',
        tone: 'calculated'
      };
    }

    if (unitRate <= 0) {
      return {
        title: 'Manual rate still needed',
        detail: 'Enter a unit rate, open the pricing studio, or switch to a benchmark or formula source.',
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
    const selectedRateSource = resolveItemRateSource(item);

    if (quantity <= 0) {
      return { label: 'Quantity Needed', tone: 'warning' };
    }

    if (selectedRateSource === 'benchmark' && benchmarkRate <= 0) {
      return { label: 'Benchmark Missing', tone: 'warning' };
    }

    if (selectedRateSource === 'benchmark') {
      return { label: 'Benchmark Priced', tone: 'benchmark' };
    }

    if (selectedRateSource === 'formula') {
      return { label: 'Formula Ready', tone: 'calculated' };
    }

    if (item.customPricing) {
      return { label: 'Manual Override', tone: 'custom' };
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

  const projectStructureType = project?.structureType || project?.type || '';

  const getSectionUiMeta = (section) => {
    const catalogSection = getStructureSectionCatalog(projectStructureType, section?.billSectionId || section?.id);
    const keywords = [
      ...(Array.isArray(section?.keywords) ? section.keywords : []),
      ...(Array.isArray(catalogSection?.keywords) ? catalogSection.keywords : []),
    ].filter(Boolean);
    const isPreliminaries = section?.isPreliminaries === true
      || catalogSection?.isPreliminaries === true
      || section?.billSectionId === 'preliminaries';

    return {
      catalogSection,
      isPreliminaries,
      trade: section?.trade || catalogSection?.trade || section?.title || '',
      description: section?.description || catalogSection?.description || '',
      pickerPrompt: section?.pickerPrompt || catalogSection?.pickerPrompt || '',
      emptyStateTitle: section?.emptyStateTitle || catalogSection?.emptyStateTitle || `No items selected for ${section?.title || 'this bill'}.`,
      emptyStateMessage: section?.emptyStateMessage || catalogSection?.emptyStateMessage || 'Use the item library to add standard BOQ lines, or add a custom line when needed.',
      keywords,
      libraryCount: catalogSection?.availableItems?.length || 0,
    };
  };

  const matchesWorkspaceSearch = (section, item, sectionMeta, normalizedQuery) => {
    const haystack = [
      section?.title,
      section?.description,
      section?.code,
      sectionMeta?.trade,
      item?.code,
      item?.name,
      item?.description,
      item?.unit,
      item?.subcategory,
      item?.category,
      item?.pickerHint,
      item?.formulaText,
      item?.notes,
      ...(Array.isArray(item?.keywords) ? item.keywords : []),
      ...(Array.isArray(item?.materials) ? item.materials : []),
      ...(Array.isArray(sectionMeta?.keywords) ? sectionMeta.keywords : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  };

  const matchesWorkspaceFilter = (section, item, sectionMeta) => {
    switch (workspaceFilter) {
      case 'active-bill':
        return section.id === activeBillSectionId;
      case 'needs-pricing': {
        const quantity = sanitizeNonNegativeNumber(item?.qty);
        const benchmarkRate = getEffectiveBenchmarkRate(item, project?.region || 'Lagos');
        const unitRate = getItemUnitRate(item, project?.region || 'Lagos');
        return quantity <= 0 || (resolveItemRateSource(item) === 'benchmark' ? benchmarkRate <= 0 : unitRate <= 0);
      }
      case 'formula':
        return isFormulaDrivenItem(item);
      case 'preliminaries':
        return sectionMeta?.isPreliminaries === true;
      default:
        return true;
    }
  };

  const filteredSections = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return (sections || []).map((section) => {
      const sectionMeta = getSectionUiMeta(section);
      const baseItems = (section.items || []).filter((item) => matchesWorkspaceFilter(section, item, sectionMeta));
      const sectionSearchText = [
        section.title,
        section.description,
        section.code,
        sectionMeta.trade,
        ...(sectionMeta.keywords || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const sectionMatchesQuery = normalizedQuery ? sectionSearchText.includes(normalizedQuery) : false;
      const nextItems = !normalizedQuery
        ? baseItems
        : (sectionMatchesQuery
          ? baseItems
          : baseItems.filter((item) => matchesWorkspaceSearch(section, item, sectionMeta, normalizedQuery)));
      const includeSection = nextItems.length > 0
        || sectionMatchesQuery
        || (workspaceFilter === 'active-bill' && section.id === activeBillSectionId && !normalizedQuery);

      if (!includeSection) {
        return null;
      }

      return {
        ...section,
        ...sectionMeta,
        items: nextItems,
        expanded: normalizedQuery || workspaceFilter === 'active-bill' ? true : section.expanded,
      };
    }).filter(Boolean);
  }, [activeBillSectionId, project?.region, projectStructureType, searchQuery, sections, workspaceFilter]);

  const workspaceAnalytics = React.useMemo(() => (
    getProjectPricingAnalytics({ ...project, sections })
  ), [project, sections]);
  const benchmarkRefreshAnalytics = React.useMemo(() => {
    if (!Array.isArray(benchmarkMaterialIndex)) {
      return {
        itemMap: {},
        sectionMap: {},
        actionableItems: 0,
        refreshableItems: 0,
        reviewItems: 0,
        benchmarkRateUpdates: 0,
        referenceOnlyUpdates: 0,
        newBenchmarkLinks: 0,
        highPriorityItems: 0,
      };
    }

    return getProjectBenchmarkRefreshAnalytics({ ...project, sections }, {
      structureType: project?.structureType || project?.subtype || project?.type,
      region: project?.region || 'Lagos',
      materialIndex: benchmarkMaterialIndex,
    });
  }, [benchmarkMaterialIndex, project, sections]);

  const calculateGrandTotal = workspaceAnalytics.totalValue;
  const totalQuantity = workspaceAnalytics.totalQuantity;

  const totalItems = workspaceAnalytics.totalItems;
  const totalColumnCount = viewMode === 'valuation' ? 9 : 8;
  const sectionHeaderSpan = viewMode === 'valuation' ? 8 : 7;
  const subtotalLeadingSpan = viewMode === 'valuation' ? 6 : 5;
  const benchmarkSyncLabel = formatBenchmarkSyncLabel(benchmarkSyncState.checkedAt);
  const filteredSectionCount = filteredSections.length;
  const filteredItemCount = filteredSections.reduce((sum, section) => sum + ((section.items || []).length), 0);
  const visibleGrandTotal = filteredSections.reduce((sum, section) => (
    sum + (section.items || []).reduce((itemSum, item) => itemSum + getItemTotal(item, project?.region || 'Lagos'), 0)
  ), 0);
  const isFilteredView = Boolean(searchQuery?.trim()) || workspaceFilter !== 'all';
  const activeProjectSection = (sections || []).find((section) => section.id === activeBillSectionId) || sections[0] || null;
  const activeSectionMeta = activeProjectSection ? getSectionUiMeta(activeProjectSection) : null;
  const activeSectionSubtotal = activeProjectSection
    ? (activeProjectSection.items || []).reduce((sum, item) => sum + getItemTotal(item, project?.region || 'Lagos'), 0)
    : 0;
  const activeSectionQty = activeProjectSection
    ? (activeProjectSection.items || []).reduce((sum, item) => sum + sanitizeNonNegativeNumber(item.qty), 0)
    : 0;
  const activeSectionPendingItems = activeProjectSection
    ? (activeProjectSection.items || []).filter((item) => matchesWorkspaceFilter(activeProjectSection, item, activeSectionMeta || {})).filter((item) => {
      const quantity = sanitizeNonNegativeNumber(item.qty);
      const benchmarkRate = getEffectiveBenchmarkRate(item, project?.region || 'Lagos');
      const unitRate = getItemUnitRate(item, project?.region || 'Lagos');
        return quantity <= 0 || (resolveItemRateSource(item) === 'benchmark' ? benchmarkRate <= 0 : unitRate <= 0);
    }).length
    : 0;
  const workspaceFilterOptions = [
    { id: 'all', label: 'All Items' },
    { id: 'active-bill', label: 'Active Bill' },
    { id: 'needs-pricing', label: 'Needs Review' },
    { id: 'formula', label: 'Formula Items' },
    { id: 'preliminaries', label: 'Preliminaries' },
  ];
  const activeWorkspaceFilterLabel = workspaceFilterOptions.find((entry) => entry.id === workspaceFilter)?.label || 'All Items';
  const activeSheetLabel = viewMode === 'valuation' ? 'Valuation Sheet' : 'Estimate Sheet';
  const workbookSubtitle = [projectStructureType, project?.subtype].filter(Boolean).join(' / ') || 'Construction pricing workbook';
  const pickerSection = sections.find((section) => section.id === itemPickerSectionId) || null;
  const pickerCatalogSection = pickerSection
    ? getStructureSectionCatalog(projectStructureType, pickerSection.billSectionId)
    : null;

  const openItemPicker = (sectionId) => {
    setItemPickerSectionId(sectionId);
    setActiveBillSectionId(sectionId);
  };

  const handleAddCatalogItems = (catalogItems) => {
    if (!pickerSection || !pickerCatalogSection) return;

    const existingCatalogIds = new Set((pickerSection.items || []).map((item) => item.catalogItemId).filter(Boolean));
    const nextCatalogItems = (catalogItems || []).filter((item) => !existingCatalogIds.has(item.code));

    if (nextCatalogItems.length === 0) {
      toast.info('Those BOQ items are already in this bill.');
      return;
    }

    const updated = sections.map((section) => {
      if (section.id !== pickerSection.id) return section;
      const nextItems = nextCatalogItems.map((catalogItem) => syncBoqItemSnapshot(
        cloneCatalogItemToProjectItem(catalogItem, {
          structureType: projectStructureType,
          billSectionId: section.billSectionId || section.id,
          billSectionTitle: section.title,
        }),
        section
      ));
      return {
        ...section,
        expanded: true,
        items: [...(section.items || []), ...nextItems]
      };
    });

    setSections(updated);
    onUpdate(project.id, updated);
    setItemPickerSectionId(null);
    toast.success(`Added ${nextCatalogItems.length} item${nextCatalogItems.length === 1 ? '' : 's'} to ${pickerSection.title}.`);
  };

  const scrollToSection = (sectionId) => {
    setActiveBillSectionId(sectionId);
    setSections((prev) => prev.map((section) => (
      section.id === sectionId ? { ...section, expanded: true } : section
    )));
    window.requestAnimationFrame(() => {
      sectionRowRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openFormulaEditor = (sectionId, item) => {
    setFormulaItemContext({ sectionId, item });
  };

  const handleFormulaInputsSave = (nextInputs) => {
    if (!formulaItemContext) return;
    updateItem(formulaItemContext.sectionId, formulaItemContext.item.id, {
      editableInputs: nextInputs,
      selectedRateSource: 'formula',
      rateSource: 'formula',
      useBenchmark: false,
    });
    setFormulaItemContext(null);
  };
  const benchmarkWorkspaceHealth = benchmarkSyncState.status === 'error'
    ? { label: 'Benchmark library offline', tone: 'warning' }
    : benchmarkSyncState.status === 'loading'
      ? { label: 'Checking benchmark market data', tone: 'muted' }
      : benchmarkRefreshAnalytics.actionableItems > 0
        ? {
            label: `${benchmarkRefreshAnalytics.actionableItems} item${benchmarkRefreshAnalytics.actionableItems === 1 ? '' : 's'} need market refresh`,
            tone: 'active'
          }
        : {
            label: benchmarkSyncLabel ? `Benchmark synced ${benchmarkSyncLabel}` : 'Benchmark library current',
            tone: 'success'
          };
  const spreadsheetColumns = viewMode === 'valuation'
    ? [
        { key: 'line', letter: 'A', label: 'Item No' },
        { key: 'description', letter: 'B', label: 'Description' },
        { key: 'unit', letter: 'C', label: 'Unit' },
        { key: 'quantity', letter: 'D', label: 'Quantity' },
        { key: 'done', letter: 'E', label: 'Done' },
        { key: 'progress', letter: 'F', label: 'Progress' },
        { key: 'rate', letter: 'G', label: 'Rate' },
        { key: 'amount', letter: 'H', label: 'Amount' },
        { key: 'actions', letter: 'I', label: 'Actions' },
      ]
    : [
        { key: 'line', letter: 'A', label: 'Item No' },
        { key: 'description', letter: 'B', label: 'Description' },
        { key: 'unit', letter: 'C', label: 'Unit' },
        { key: 'quantity', letter: 'D', label: 'Quantity' },
        { key: 'strategy', letter: 'E', label: 'Pricing Strategy' },
        { key: 'rate', letter: 'F', label: 'Rate' },
        { key: 'amount', letter: 'G', label: 'Amount' },
        { key: 'actions', letter: 'H', label: 'Actions' },
      ];
  const spreadsheetColumnTemplate = viewMode === 'valuation'
    ? '78px minmax(620px, 5.4fr) 88px 156px 104px 104px 190px 168px 74px'
    : '78px minmax(680px, 6fr) 88px 156px 156px 190px 168px 74px';

  const selectWorkspaceCell = ({ sectionId, itemId, columnKey, itemCode, rowNumber }) => {
    setSelectedCell({
      sectionId,
      itemId,
      columnKey,
      itemCode,
      rowNumber,
    });
  };

  const isWorkspaceCellSelected = (sectionId, itemId, columnKey) => (
    selectedCell?.sectionId === sectionId
    && selectedCell?.itemId === itemId
    && selectedCell?.columnKey === columnKey
  );

  const formulaBarMeta = (() => {
    if (!selectedCell) {
      return {
        address: '-',
        columnLabel: 'BOQ Workspace',
        value: 'Select any BOQ row to inspect its quantity, pricing basis, and amount logic.',
        detail: 'Live row context',
      };
    }

    const activeSection = (sections || []).find((section) => section.id === selectedCell.sectionId);
    const activeItem = (activeSection?.items || []).find((item) => item.id === selectedCell.itemId);
    const activeColumn = spreadsheetColumns.find((column) => column.key === selectedCell.columnKey);

    if (!activeItem || !activeColumn) {
      return {
        address: '-',
        columnLabel: 'BOQ Workspace',
        value: 'The selected cell is no longer available in this filtered view.',
        detail: 'Selection refreshed after a data change',
      };
    }

    const region = project?.region || 'Lagos';
    const benchmarkRate = getEffectiveBenchmarkRate(activeItem, region);
    const unitRate = getItemUnitRate(activeItem, region);
    const itemTotal = getItemTotal(activeItem, region);
    const amountFormula = getAmountFormula(activeItem, unitRate);
    const quantityFeedbackMeta = getQuantityFeedbackMeta(activeItem, benchmarkRate, unitRate);
    const rateSourceMeta = getRateSourceMeta(activeItem);
    const address = `${activeColumn.letter}${selectedCell.rowNumber || ''}`;
    const lineReference = selectedCell.itemCode ? ` | ${selectedCell.itemCode}` : '';

    if (selectedCell.columnKey === 'description') {
      return {
        address,
        columnLabel: `${activeColumn.label}${lineReference}`,
        value: activeItem.description || 'No description yet',
        detail: activeItem.subcategory
          ? `Subcategory: ${activeItem.subcategory}`
          : 'Describe the BOQ item clearly for pricing and reporting',
      };
    }

    if (selectedCell.columnKey === 'unit') {
      return {
        address,
        columnLabel: `${activeColumn.label}${lineReference}`,
        value: activeItem.unit || '-',
        detail: 'Unit of measurement used for quantity, rate, and amount',
      };
    }

    if (selectedCell.columnKey === 'quantity' || selectedCell.columnKey === 'done') {
      const value = selectedCell.columnKey === 'done'
        ? sanitizeNonNegativeNumber(activeItem.qtyCompleted).toLocaleString(undefined, { maximumFractionDigits: 2 })
        : sanitizeNonNegativeNumber(activeItem.qty).toLocaleString(undefined, { maximumFractionDigits: 2 });
      return {
        address,
        columnLabel: `${activeColumn.label}${lineReference}`,
        value,
        detail: selectedCell.columnKey === 'done'
          ? 'Completed quantity captured for valuation progress'
          : quantityFeedbackMeta.text,
      };
    }

    if (selectedCell.columnKey === 'progress') {
      return {
        address,
        columnLabel: `${activeColumn.label}${lineReference}`,
        value: `${Math.round(activeItem.progressPercent || 0)}%`,
        detail: 'Progress percentage derived from completed quantity against project quantity',
      };
    }

    if (selectedCell.columnKey === 'strategy') {
      const selectedRateSource = resolveItemRateSource(activeItem);
      return {
        address,
        columnLabel: `${activeColumn.label}${lineReference}`,
        value: `${selectedRateSource.charAt(0).toUpperCase()}${selectedRateSource.slice(1)} pricing`,
        detail: selectedRateSource === 'benchmark'
          ? `Auto-priced using the ${marketRegionLabel} market benchmark`
          : `${rateSourceMeta.label} is active for this item`,
      };
    }

    if (selectedCell.columnKey === 'rate') {
      const formulaText = getFormulaDisplayText(activeItem);
      return {
        address,
        columnLabel: `${activeColumn.label}${lineReference}`,
        value: unitRate > 0 ? `N${unitRate.toLocaleString()}` : 'N0',
        detail: resolveItemRateSource(activeItem) === 'benchmark'
          ? `Benchmark rate from ${marketRegionLabel} market data`
          : (isFormulaDrivenItem(activeItem) && formulaText
            ? `${rateSourceMeta.label} | ${formulaText}`
            : rateSourceMeta.label),
      };
    }

    if (selectedCell.columnKey === 'amount') {
      return {
        address,
        columnLabel: `${activeColumn.label}${lineReference}`,
        value: `N${itemTotal.toLocaleString()}`,
        detail: amountFormula || 'Amount will generate once both quantity and rate are available',
      };
    }

    return {
      address,
      columnLabel: `${activeColumn.label}${lineReference}`,
      value: selectedCell.itemCode || 'Selected row',
      detail: 'Row control cell',
    };
  })();
  const selectedItemContext = (() => {
    if (!selectedCell) return null;

    const section = (sections || []).find((entry) => entry.id === selectedCell.sectionId);
    const item = (section?.items || []).find((entry) => entry.id === selectedCell.itemId);
    if (!section || !item) return null;

    const benchmarkRate = getEffectiveBenchmarkRate(item, project?.region || 'Lagos');
    const unitRate = getItemUnitRate(item, project?.region || 'Lagos');
    const total = getItemTotal(item, project?.region || 'Lagos');

      return {
        section,
        item,
        itemCode: selectedCell.itemCode,
        formulaText: getFormulaDisplayText(item),
        workedExampleText: getWorkedExamplePreview(item, { preferEditableInputs: true }),
        benchmarkRate,
        unitRate,
        total,
      quantity: sanitizeNonNegativeNumber(item.qty),
      statusMeta: getItemStatusMeta(item, benchmarkRate, unitRate),
      rateSourceMeta: getRateSourceMeta(item),
    };
  })();
  let spreadsheetRowCounter = 1;

  return (
    <div className="ws-container">
      <div className="ws-workbook-top">
        <div className="ws-workbook-head">
          <div className="ws-workbook-copy">
            <span className="ws-workbook-eyebrow">BOQ-Pro Workbook</span>
            <div className="ws-workbook-title-row">
              <h1>{project?.name || 'Untitled Project'}</h1>
              <span className={`ws-workbook-health ws-workbook-health-${benchmarkWorkspaceHealth.tone}`}>
                {benchmarkWorkspaceHealth.label}
              </span>
            </div>
            <p>{workbookSubtitle} | {marketRegionDisplay} market benchmark | {activeSheetLabel}</p>
          </div>
          <div className="ws-workbook-metrics">
            <div className="ws-workbook-metric">
              <span>Estimated Cost</span>
              <strong>N{calculateGrandTotal.toLocaleString()}</strong>
            </div>
            <div className="ws-workbook-metric">
              <span>Pricing Coverage</span>
              <strong>{workspaceAnalytics.pricingCoveragePercent.toFixed(0)}%</strong>
            </div>
            <div className="ws-workbook-metric">
              <span>Sections / Items</span>
              <strong>{sections.length} / {totalItems}</strong>
            </div>
          </div>
        </div>
        <div className="ws-sheet-tabbar">
          <button
            className={`ws-sheet-tab ${viewMode === 'estimation' ? 'active' : ''}`}
            onClick={() => setViewMode('estimation')}
          >
            Estimate Sheet
          </button>
          <button
            className={`ws-sheet-tab ${viewMode === 'valuation' ? 'active' : ''}`}
            onClick={() => setViewMode('valuation')}
          >
            Valuation Sheet
          </button>
          <div className="ws-sheet-tabbar-meta">
            <span className="ws-sheet-meta-chip">{project?.region || 'Lagos'} Region</span>
            <span className="ws-sheet-meta-chip">{workspaceAnalytics.benchmarkItems} Benchmark Items</span>
            <span className="ws-sheet-meta-chip">{workspaceAnalytics.customItems} Custom Items</span>
          </div>
        </div>
      </div>
      {/* Toolbar */}
      <div className="ws-toolbar">
        <div className="ws-toolbar-left">
          <div className="ws-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search by bill, code, item, formula, hint, or keyword"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery?.trim() && (
              <button
                className="ws-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <span className="ws-search-results">
            {isFilteredView
              ? `${filteredItemCount} visible item${filteredItemCount === 1 ? '' : 's'} in ${filteredSectionCount} bill${filteredSectionCount === 1 ? '' : 's'}`
              : `${totalItems} live item${totalItems === 1 ? '' : 's'}`}
          </span>
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
          <button
            className="ws-btn ws-btn-ghost"
            onClick={refreshBenchmarks}
            title="Refresh benchmark references with the latest market prices"
          >
            <RefreshCcw size={14} /> {benchmarkSyncState.status === 'loading' ? 'Checking Market...' : 'Refresh Benchmarks'}
          </button>
          <button className="ws-btn ws-btn-ghost" onClick={() => toast.success('Project saved as a reusable template.')} title="Save as Template">
            <Save size={14} /> Save Template
          </button>
          <button className="ws-btn ws-btn-ghost" onClick={onExport}><Download size={14} /> Export</button>
          <button className="ws-btn ws-btn-primary" onClick={onAddSection}><Plus size={14} /> Section</button>
        </div>
      </div>

      <div className="ws-filter-bar">
        {workspaceFilterOptions.map((filterOption) => (
          <button
            key={filterOption.id}
            type="button"
            className={`ws-filter-chip ${workspaceFilter === filterOption.id ? 'active' : ''}`}
            onClick={() => setWorkspaceFilter(filterOption.id)}
          >
            {filterOption.label}
          </button>
        ))}
        {isFilteredView && (
          <button
            type="button"
            className="ws-filter-chip ws-filter-chip-clear"
            onClick={() => {
              setWorkspaceFilter('all');
              setSearchQuery('');
            }}
          >
            Clear Search and Filters
          </button>
        )}
      </div>

      <div className="ws-bill-nav">
        {(sections || []).map((section) => {
          const sectionTotal = (section.items || []).reduce((sum, item) => sum + getItemTotal(item, project?.region || 'Lagos'), 0);
          const sectionMeta = getSectionUiMeta(section);
          const hasCatalog = !!sectionMeta.catalogSection;
          const isActive = activeBillSectionId === section.id;
          return (
            <div key={section.id} className={`ws-bill-pill ${isActive ? 'active' : ''}`}>
              <button
                type="button"
                className="ws-bill-pill-main"
                onClick={() => scrollToSection(section.id)}
              >
                <span className="ws-bill-pill-title">{section.title}</span>
                <span className="ws-bill-pill-meta">
                  {(section.items || []).length} item{(section.items || []).length === 1 ? '' : 's'} · ₦{sectionTotal.toLocaleString()}
                </span>
              </button>
              {hasCatalog && (
                <button
                  type="button"
                  className="ws-bill-pill-picker"
                  onClick={() => openItemPicker(section.id)}
                >
                  Pick Items
                </button>
              )}
            </div>
          );
        })}
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

      <div className={`ws-refresh-banner ${
        benchmarkSyncState.status === 'error'
          ? 'ws-refresh-banner-warning'
          : benchmarkRefreshAnalytics.actionableItems > 0
            ? 'ws-refresh-banner-active'
            : 'ws-refresh-banner-calm'
      }`}>
        <div className="ws-refresh-banner-copy">
          <span className="ws-refresh-banner-eyebrow">Benchmark Refresh Workflow</span>
          {benchmarkSyncState.status === 'loading' && !benchmarkSyncLabel ? (
            <>
              <strong>Loading the latest market benchmark library</strong>
              <p>We are pulling fresh benchmark references so drift alerts and refresh actions stay reliable.</p>
            </>
          ) : benchmarkSyncState.status === 'error' ? (
            <>
              <strong>Market benchmark check is unavailable right now</strong>
              <p>{benchmarkSyncState.error || 'We could not load the latest market benchmark library.'}</p>
            </>
          ) : benchmarkRefreshAnalytics.actionableItems > 0 ? (
            <>
              <strong>{benchmarkRefreshAnalytics.actionableItems} benchmark item{benchmarkRefreshAnalytics.actionableItems === 1 ? '' : 's'} need review</strong>
              <p>
                {benchmarkRefreshAnalytics.benchmarkRateUpdates} live benchmark item{benchmarkRefreshAnalytics.benchmarkRateUpdates === 1 ? '' : 's'} can update amount now
                {' · '}
                {benchmarkRefreshAnalytics.referenceOnlyUpdates} custom/manual item{benchmarkRefreshAnalytics.referenceOnlyUpdates === 1 ? '' : 's'} will keep their current rate
                {benchmarkRefreshAnalytics.reviewItems > 0 ? ` · ${benchmarkRefreshAnalytics.reviewItems} still need manual benchmark review` : ''}
                {benchmarkSyncLabel ? ` · checked ${benchmarkSyncLabel}` : ''}
              </p>
            </>
          ) : (
            <>
              <strong>Benchmark references are current</strong>
              <p>
                This project is aligned with the latest market benchmark library.
                {benchmarkSyncLabel ? ` Last checked ${benchmarkSyncLabel}.` : ''}
              </p>
            </>
          )}
        </div>
        <div className="ws-refresh-banner-actions">
          {benchmarkSyncState.status === 'error' ? (
            <button className="ws-btn ws-btn-ghost" onClick={() => loadMarketBenchmarks()}>
              <RefreshCcw size={14} /> Retry market check
            </button>
          ) : (
            <button className="ws-btn ws-btn-ghost" onClick={refreshBenchmarks}>
              <RefreshCcw size={14} /> Refresh project benchmarks
            </button>
          )}
        </div>
      </div>

      <div className={`ws-sheet-tools ${selectedItemContext ? 'has-selection' : 'is-idle'}`}>
        <div className="ws-formula-bar">
          <div className="ws-formula-address">{formulaBarMeta.address}</div>
          <div className="ws-formula-fx">fx</div>
          <div className="ws-formula-body">
            <strong>{formulaBarMeta.columnLabel}</strong>
            <span>{formulaBarMeta.value}</span>
            <small>{formulaBarMeta.detail}</small>
          </div>
        </div>
        <div className={`ws-helper-strip ${selectedItemContext ? 'is-selected' : 'is-idle'}`}>
          {selectedItemContext ? (
            <>
              <div className="ws-helper-copy">
                <span className="ws-helper-label">Selected Row</span>
                <strong>{selectedItemContext.itemCode} · {selectedItemContext.item.description || 'Untitled BOQ item'}</strong>
                <small>
                  {selectedItemContext.section.title} | Qty {selectedItemContext.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} | Rate N{selectedItemContext.unitRate.toLocaleString()} | Amount N{selectedItemContext.total.toLocaleString()}
                </small>
                {selectedItemContext.formulaText && (
                  <small className="ws-helper-secondary">
                    Formula: {selectedItemContext.formulaText}
                    {selectedItemContext.workedExampleText ? ` | ${selectedItemContext.workedExampleText}` : ''}
                  </small>
                )}
              </div>
              <div className="ws-helper-actions">
                <span className={`ws-helper-chip ws-helper-chip-${selectedItemContext.statusMeta.tone}`}>{selectedItemContext.statusMeta.label}</span>
                <span className={`ws-helper-chip ws-helper-chip-${selectedItemContext.rateSourceMeta.tone}`}>{selectedItemContext.rateSourceMeta.label}</span>
                <button
                  className="ws-helper-btn"
                  onClick={() => setCalculatingQtyForItem({ sectionId: selectedItemContext.section.id, item: selectedItemContext.item })}
                >
                  <Calculator size={12} /> Takeoff
                </button>
                {isFormulaDrivenItem(selectedItemContext.item) && (
                  <button
                    className="ws-helper-btn"
                    onClick={() => openFormulaEditor(selectedItemContext.section.id, selectedItemContext.item)}
                  >
                    fx Formula Inputs
                  </button>
                )}
                {resolveItemRateSource(selectedItemContext.item) === 'manual' && (
                  <button
                    className="ws-helper-btn"
                    onClick={() => openCustomPricingStudio(selectedItemContext.section.id, selectedItemContext.item)}
                  >
                    <SlidersHorizontal size={12} /> Pricing Studio
                  </button>
                )}
                <button
                  className="ws-helper-btn"
                  onClick={() => openDetailedAnalysis(selectedItemContext.section.id, selectedItemContext.item)}
                >
                  <Pencil size={12} /> Detailed Analysis
                </button>
                <button
                  className="ws-helper-btn"
                  onClick={() => addItemBelow(selectedItemContext.section.id, selectedItemContext.item.id)}
                >
                  <Plus size={12} /> Add Line Below
                </button>
                <button
                  className="ws-helper-btn"
                  onClick={() => duplicateItem(selectedItemContext.section.id, selectedItemContext.item.id)}
                >
                  <Copy size={12} /> Duplicate
                </button>
                {benchmarkRefreshAnalytics.itemMap[`${selectedItemContext.section.id}:${selectedItemContext.item.id}`]?.canApplyRefresh && (
                  <button
                    className="ws-helper-btn ws-helper-btn-strong"
                    onClick={() => refreshItemBenchmark(selectedItemContext.section.id, selectedItemContext.item.id)}
                  >
                    <RefreshCcw size={12} /> Refresh Benchmark
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="ws-helper-copy">
                <span className="ws-helper-label">Workspace Flow</span>
                <strong>Select any row to unlock quick actions and pricing context.</strong>
                <small>Use search, quantity entry, custom pricing, and benchmark refresh directly inside the sheet.</small>
              </div>
              <div className="ws-helper-actions">
                <span className="ws-helper-chip ws-helper-chip-muted">{sections.length} sections ready</span>
                <button className="ws-helper-btn" onClick={() => sections[0] && openItemPicker(sections[0].id)}>
                  <Plus size={12} /> Pick BOQ Items
                </button>
                <button className="ws-helper-btn" onClick={onAddSection}>
                  <Plus size={12} /> Add Section
                </button>
                <button className="ws-helper-btn" onClick={autoRateProject}>
                  <Zap size={12} /> Auto-Rate Project
                </button>
                <button className="ws-helper-btn ws-helper-btn-strong" onClick={refreshBenchmarks}>
                  <RefreshCcw size={12} /> Refresh Benchmarks
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="ws-cost-rail">
        <div className="ws-cost-card">
          <span className="ws-cost-label">Active Bill</span>
          <strong className="ws-cost-value">{activeProjectSection?.title || 'No active bill'}</strong>
          <small className="ws-cost-meta">
            {activeProjectSection
              ? `${(activeProjectSection.items || []).length} line${(activeProjectSection.items || []).length === 1 ? '' : 's'} · Qty ${activeSectionQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : 'Choose a bill section to start measuring'}
          </small>
        </div>
        <div className="ws-cost-card">
          <span className="ws-cost-label">Active Bill Subtotal</span>
          <strong className="ws-cost-value">N{activeSectionSubtotal.toLocaleString()}</strong>
          <small className="ws-cost-meta">
            {activeSectionPendingItems > 0
              ? `${activeSectionPendingItems} line${activeSectionPendingItems === 1 ? '' : 's'} still need pricing review`
              : 'Current active bill is fully priced'}
          </small>
        </div>
        <div className="ws-cost-card">
          <span className="ws-cost-label">{isFilteredView ? `${activeWorkspaceFilterLabel} View` : 'Visible Sheet Total'}</span>
          <strong className="ws-cost-value">N{visibleGrandTotal.toLocaleString()}</strong>
          <small className="ws-cost-meta">
            {filteredSectionCount} visible bill{filteredSectionCount === 1 ? '' : 's'} · {filteredItemCount} visible item{filteredItemCount === 1 ? '' : 's'}
          </small>
        </div>
        <div className="ws-cost-card ws-cost-card-total">
          <span className="ws-cost-label">Project Grand Total</span>
          <strong className="ws-cost-value">N{calculateGrandTotal.toLocaleString()}</strong>
          <small className="ws-cost-meta">
            {project?.region || 'Lagos'} market basis · {workspaceAnalytics.totalItems} measured item{workspaceAnalytics.totalItems === 1 ? '' : 's'}
          </small>
        </div>
      </div>

      {/* Table */}
      <div className="ws-table-wrap">
        <div
          className="ws-column-letters"
          style={{ gridTemplateColumns: spreadsheetColumnTemplate }}
        >
          {spreadsheetColumns.map((column) => (
            <div
              key={column.key}
              className={`ws-column-letter ${selectedCell?.columnKey === column.key ? 'active' : ''}`}
              title={column.label}
            >
              <span>{column.letter}</span>
              <small>{column.label}</small>
            </div>
          ))}
        </div>
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
              const sectionRefreshMeta = benchmarkRefreshAnalytics.sectionMap[section.id] || null;

              return (
                <React.Fragment key={section.id}>
                  {/* Section Header */}
                  <tr
                    ref={(node) => { sectionRowRefs.current[section.id] = node; }}
                    className="ws-section-row"
                    onClick={() => {
                      setActiveBillSectionId(section.id);
                      toggleSection(section.id);
                    }}
                  >
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
                        {sectionRefreshMeta?.refreshableItems > 0 && (
                          <button
                            className="ws-section-refresh-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              refreshSectionBenchmarks(section.id);
                            }}
                            title="Refresh benchmark references in this section"
                          >
                            <RefreshCcw size={11} />
                            {`Refresh ${sectionRefreshMeta.refreshableItems}`}
                          </button>
                        )}
                        {sectionRefreshMeta?.refreshableItems <= 0 && sectionRefreshMeta?.reviewItems > 0 && (
                          <span className="ws-section-review-chip">
                            Review {sectionRefreshMeta.reviewItems}
                          </span>
                        )}
                        <span className="ws-section-meta">QTY {sectionQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span className="ws-section-badge">{section.items?.length || 0}</span>
                        {!section.expanded && (
                          <span className="ws-section-total">₦{sectionSubtotal.toLocaleString()}</span>
                        )}
                      </div>
                    </td>
                    <td className="ws-act-cell">
                      {getStructureSectionCatalog(projectStructureType, section.billSectionId) && (
                        <button
                          className="ws-btn-icon ws-btn-library"
                          onClick={(e) => {
                            e.stopPropagation();
                            openItemPicker(section.id);
                          }}
                          title="Pick BOQ items for this bill"
                        >
                          <Plus size={13} />
                        </button>
                      )}
                      <button className="ws-btn-icon ws-btn-danger" onClick={(e) => { e.stopPropagation(); onDelete(project.id, section.id); }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                  {/* Empty section CTA */}
                  {section.expanded && (section.items || []).length === 0 && (
                    <tr className="ws-empty-section-row">
                      <td colSpan={totalColumnCount} className="ws-empty-section-cell">
                        <div className="ws-empty-section">
                          <strong className="ws-empty-section-title">{sectionMeta.emptyStateTitle || `No items selected for ${section.title}.`}</strong>
                          <p className="ws-empty-section-msg">{sectionMeta.emptyStateMessage || "Add items from the library or create a custom line."}</p>
                          <div className="ws-empty-section-actions">
                            {sectionMeta.catalogSection && (
                              <button className="ws-btn ws-btn-primary" onClick={() => openItemPicker(section.id)}>
                                <Plus size={14} /> Pick Items from Library
                              </button>
                            )}
                            <button className="ws-btn ws-btn-ghost" onClick={() => addItemToSection(section.id)}>
                              <Plus size={14} /> Add Custom Line
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {/* Items */}
                  {section.expanded && (section.items || []).map((item, idx) => {
                    const spreadsheetRowNumber = spreadsheetRowCounter++;
                    const currentSubcategory = (item.subcategory || 'General').trim() || 'General';
                    const previousSubcategory = idx > 0
                      ? (((section.items || [])[idx - 1]?.subcategory || 'General').trim() || 'General')
                      : null;
                    const showSubcategoryHeader = idx === 0 || currentSubcategory !== previousSubcategory;
                    const benchmarkRate = getEffectiveBenchmarkRate(item, project?.region || 'Lagos');
                    const selectedRateSource = resolveItemRateSource(item);
                    const optionAvailability = getRateOptionAvailability(item);
                    const formulaRate = optionAvailability.formulaRate;
                    const manualRate = optionAvailability.manualRate;
                    const hasBenchmarkOption = optionAvailability.hasBenchmarkRate;
                    const hasFormulaOption = optionAvailability.hasFormulaRate;
                    const canEditManualRate = viewMode !== 'valuation' && selectedRateSource === 'manual';
                    const outlier = selectedRateSource !== 'benchmark' && isOutlier(getItemUnitRate(item, project?.region || 'Lagos'), benchmarkRate);
                    const rate = getItemUnitRate(item, project?.region || 'Lagos');
                    const itemTotal = getItemTotal(item, project?.region || 'Lagos');
                    const rateSourceMeta = getRateSourceMeta(item);
                    const benchmarkDeltaMeta = getBenchmarkDeltaMeta(item);
                    const benchmarkRefreshMeta = benchmarkRefreshAnalytics.itemMap[`${section.id}:${item.id}`] || null;
                    const benchmarkEvidenceMeta = getBenchmarkEvidenceMeta(item);
                    const quantityFeedbackMeta = getQuantityFeedbackMeta(item, benchmarkRate, rate);
                    const automationMeta = getAutomationMeta(item, benchmarkRate, rate);
                    const itemStatusMeta = getItemStatusMeta(item, benchmarkRate, rate);
                    const amountFormula = getAmountFormula(item, rate);
                    const quantityDisplayValue = getQuantityDisplayValue(item);
                    const quantitySourceLabel = getQuantitySourceLabel(item);
                    const hasValidQuantity = sanitizeNonNegativeNumber(item.qty) > 0;
                    const hasBenchmarkRate = sanitizeNonNegativeNumber(benchmarkRate) > 0;
                    const hasUnitRate = sanitizeNonNegativeNumber(rate) > 0;
                    const isIncomplete = !hasValidQuantity || (selectedRateSource === 'benchmark' ? !hasBenchmarkRate : !hasUnitRate);
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
                        <tr className={`ws-item-row ${outlier ? 'ws-outlier' : ''} ${selectedRateSource === 'benchmark' ? 'ws-item-row-benchmark' : 'ws-item-row-custom'} ${isIncomplete ? 'ws-item-incomplete' : ''} ${selectedCell?.sectionId === section.id && selectedCell?.itemId === item.id ? 'ws-item-row-selected' : ''}`}>
                        <td
                          className={`ws-num ${isWorkspaceCellSelected(section.id, item.id, 'line') ? 'ws-cell-selected' : ''}`}
                          onClick={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'line', itemCode, rowNumber: spreadsheetRowNumber })}
                        >
                          <span className="ws-row-number">{spreadsheetRowNumber}</span>
                          <strong className="ws-line-code">{itemCode}</strong>
                        </td>
                        <td
                          className={`ws-desc ${isWorkspaceCellSelected(section.id, item.id, 'description') ? 'ws-cell-selected' : ''}`}
                          onClick={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'description', itemCode, rowNumber: spreadsheetRowNumber })}
                        >
                          <div className="ws-desc-inner">
                            {item.isVO && <span className="ws-vo">VO</span>}
                            <textarea
                              rows={3}
                              className="ws-input ws-desc-input"
                              value={item.description}
                              onChange={(e) => updateItem(section.id, item.id, 'description', e.target.value)}
                              onFocus={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'description', itemCode, rowNumber: spreadsheetRowNumber })}
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
                            {selectedRateSource === 'benchmark' && hasBenchmarkRate && (
                              <span className="ws-state-pill ws-state-pill-info">Auto amount on quantity entry</span>
                            )}
                          </div>
                        </td>
                        <td
                          className={`ws-unit-cell ${isWorkspaceCellSelected(section.id, item.id, 'unit') ? 'ws-cell-selected' : ''}`}
                          onClick={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'unit', itemCode, rowNumber: spreadsheetRowNumber })}
                        >
                          <input
                            type="text"
                            className="ws-input ws-unit-input"
                            value={item.unit}
                            onChange={(e) => updateItem(section.id, item.id, 'unit', e.target.value)}
                            onFocus={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'unit', itemCode, rowNumber: spreadsheetRowNumber })}
                          />
                        </td>
                        <td
                          className={`ws-qty-cell ${isWorkspaceCellSelected(section.id, item.id, 'quantity') ? 'ws-cell-selected' : ''}`}
                          onClick={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'quantity', itemCode, rowNumber: spreadsheetRowNumber })}
                        >
                          <div className="ws-qty-wrap">
                            <input
                              type="number"
                              className="ws-input ws-qty-input"
                              value={item.qty || ''}
                              min="0"
                              step="any"
                              onChange={(e) => handleQuantityChange(section.id, item, e.target.value)}
                              onFocus={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'quantity', itemCode, rowNumber: spreadsheetRowNumber })}
                            />
                            <button
                              className="ws-geo-btn"
                              onClick={() => {
                                selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'quantity', itemCode, rowNumber: spreadsheetRowNumber });
                                setCalculatingQtyForItem({ sectionId: section.id, item });
                              }}
                              title="Geometric Takeoff"
                            >
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
                            <td
                              className={isWorkspaceCellSelected(section.id, item.id, 'done') ? 'ws-cell-selected' : ''}
                              onClick={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'done', itemCode, rowNumber: spreadsheetRowNumber })}
                            >
                              <input type="number" className="ws-input ws-sm-input" value={item.qtyCompleted || ''}
                                min="0"
                                step="any"
                                onChange={(e) => handleCompletedQuantityChange(section.id, item, e.target.value)}
                                onFocus={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'done', itemCode, rowNumber: spreadsheetRowNumber })} />
                            </td>
                            <td
                              className={isWorkspaceCellSelected(section.id, item.id, 'progress') ? 'ws-cell-selected' : ''}
                              onClick={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'progress', itemCode, rowNumber: spreadsheetRowNumber })}
                            >
                              <div className="ws-progress-bar">
                                <div className="ws-progress-fill" style={{ width: `${Math.min(100, item.progressPercent || 0)}%` }}></div>
                                <span>{Math.round(item.progressPercent || 0)}%</span>
                              </div>
                            </td>
                          </>
                        ) : (
                          <td
                            className={isWorkspaceCellSelected(section.id, item.id, 'strategy') ? 'ws-cell-selected' : ''}
                            onClick={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'strategy', itemCode, rowNumber: spreadsheetRowNumber })}
                          >
                            <div className="ws-rate-source-selector">
                              <div className="ws-rate-source-buttons">
                                <button
                                  className={`ws-src-btn ws-src-btn-bm ${selectedRateSource === 'benchmark' ? 'active' : ''} ${!hasBenchmarkOption ? 'ws-src-btn-disabled' : ''}`}
                                  onClick={() => {
                                    selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'strategy', itemCode, rowNumber: spreadsheetRowNumber });
                                    handleRateSourceChange(section.id, item, 'benchmark');
                                  }}
                                  disabled={!hasBenchmarkOption}
                                  title={hasBenchmarkOption ? 'Use benchmark pricing' : 'No benchmark rate available yet'}
                                >
                                  Benchmark
                                </button>
                                <button
                                  className={`ws-src-btn ws-src-btn-formula ${selectedRateSource === 'formula' ? 'active' : ''} ${!hasFormulaOption ? 'ws-src-btn-disabled' : ''}`}
                                  onClick={() => {
                                    selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'strategy', itemCode, rowNumber: spreadsheetRowNumber });
                                    handleRateSourceChange(section.id, item, 'formula');
                                  }}
                                  disabled={!hasFormulaOption}
                                  title={hasFormulaOption ? 'Use formula pricing' : 'No saved formula for this item'}
                                >
                                  Formula
                                </button>
                                <button
                                  className={`ws-src-btn ws-src-btn-manual ${selectedRateSource === 'manual' ? 'active' : ''}`}
                                  onClick={() => {
                                    selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'strategy', itemCode, rowNumber: spreadsheetRowNumber });
                                    activateCustomPricing(section.id, item);
                                  }}
                                  title="Use manual pricing"
                                >
                                  Manual
                                </button>
                              </div>
                              <small className="ws-rate-source-help">
                                {selectedRateSource === 'benchmark'
                                  ? 'Benchmark source active'
                                  : selectedRateSource === 'formula'
                                    ? 'Formula source active'
                                    : (item.customPricing ? 'Manual source with saved build-up' : 'Manual source ready for override')}
                              </small>
                            </div>
                          </td>
                        )}
                        <td
                          className={`ws-rate-cell ${isWorkspaceCellSelected(section.id, item.id, 'rate') ? 'ws-cell-selected' : ''}`}
                          onClick={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'rate', itemCode, rowNumber: spreadsheetRowNumber })}
                        >
                          <div className="ws-rate-wrap">
                            <input
                              type="number"
                              className="ws-input ws-rate-input"
                              value={selectedRateSource === 'manual' ? (item.manualRate ?? '') : (rate || '')}
                              onChange={(e) => handleManualRateChange(section.id, item, e.target.value)}
                              disabled={!canEditManualRate}
                              onFocus={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'rate', itemCode, rowNumber: spreadsheetRowNumber })}
                            />
                            {hasFormulaOption && (
                              <button
                                className="ws-analysis-btn ws-custom-studio-btn"
                                onClick={() => {
                                  selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'rate', itemCode, rowNumber: spreadsheetRowNumber });
                                  openFormulaEditor(section.id, item);
                                }}
                                title="Edit formula inputs"
                              >
                                fx
                              </button>
                            )}
                            {selectedRateSource === 'manual' && (
                              <button
                                className="ws-analysis-btn ws-custom-studio-btn"
                                onClick={() => {
                                  selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'rate', itemCode, rowNumber: spreadsheetRowNumber });
                                  openCustomPricingStudio(section.id, item);
                                }}
                                title={item.customPricing ? 'Edit custom pricing studio' : 'Build custom pricing in the studio'}
                              >
                                <SlidersHorizontal size={11} />
                              </button>
                            )}
                            <button
                              className="ws-analysis-btn"
                              onClick={() => {
                                selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'rate', itemCode, rowNumber: spreadsheetRowNumber });
                                openDetailedAnalysis(section.id, item);
                              }}
                              title="Detailed rate analysis"
                            >
                              <Calculator size={11} />
                            </button>
                            <button
                              className="ws-analysis-btn"
                              onClick={() => {
                                selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'rate', itemCode, rowNumber: spreadsheetRowNumber });
                                openItemDetailPanel(section.id, item);
                              }}
                              title="Item details"
                            >
                              <Info size={11} />
                            </button>
                          </div>
                          <div className="ws-rate-reference-row">
                            <span className={`ws-rate-ref-pill ${selectedRateSource === 'benchmark' ? 'ws-rate-ref-active' : ''}`}>
                              BM N{benchmarkRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                            <span className={`ws-rate-ref-pill ws-rate-ref-formula ${selectedRateSource === 'formula' ? 'ws-rate-ref-active' : ''}`}>
                              {hasFormulaOption
                                ? `FX N${formulaRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                                : 'FX Unavailable'}
                            </span>
                            <span className={`ws-rate-ref-pill ws-rate-ref-manual ${selectedRateSource === 'manual' ? 'ws-rate-ref-active' : ''}`}>
                              MAN N{manualRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="ws-rate-meta">
                            <span className={`ws-rate-chip ws-rate-chip-${rateSourceMeta.tone}`}>{rateSourceMeta.label}</span>
                            {selectedRateSource === 'benchmark' && hasBenchmarkRate && (
                              <span className={`ws-rate-chip ws-rate-chip-bm-confidence ws-rate-chip-bm-${getBenchmarkConfidenceLabel(item.benchmarkMatchSource).toLowerCase()}`}
                                title="Benchmark confidence based on breakdown match quality">
                                {getBenchmarkConfidenceLabel(item.benchmarkMatchSource)} confidence
                              </span>
                            )}
                            {benchmarkEvidenceMeta && hasBenchmarkRate && (
                              <span
                                className={`ws-rate-chip ws-rate-chip-${selectedRateSource === 'benchmark' ? benchmarkEvidenceMeta.tone : 'muted'}`}
                                title={selectedRateSource === 'benchmark' ? benchmarkEvidenceMeta.title : benchmarkEvidenceMeta.referenceTitle}
                              >
                                {benchmarkEvidenceMeta.chip}
                              </span>
                            )}
                            {benchmarkDeltaMeta && (
                              <span className={`ws-rate-chip ws-rate-chip-${benchmarkDeltaMeta.tone}`}>{benchmarkDeltaMeta.text}</span>
                            )}
                            {benchmarkRefreshMeta?.actionable && (
                              <span className={`ws-rate-chip ws-rate-chip-${benchmarkRefreshMeta.tone}`}>
                                {benchmarkRefreshMeta.chip}
                              </span>
                            )}
                            {hasBenchmarkRate && selectedRateSource !== 'benchmark' && (
                              <span className="ws-rate-chip ws-rate-chip-bm-ref" title="Current market benchmark for this item">
                                Benchmark: ₦{Math.round(benchmarkRate).toLocaleString()}
                              </span>
                            )}
                            {benchmarkRefreshMeta?.canApplyRefresh && (
                              <button
                                className="ws-rate-link ws-rate-link-strong"
                                onClick={() => refreshItemBenchmark(section.id, item.id)}
                                title={benchmarkRefreshMeta.actionDetail}
                              >
                                {benchmarkRefreshMeta.actionLabel}
                              </button>
                            )}
                            {selectedRateSource === 'manual' && !item.customPricing && (
                              <button
                                className="ws-rate-link"
                                onClick={() => openCustomPricingStudio(section.id, item)}
                                title="Build a defendable custom rate"
                              >
                                Build in studio
                              </button>
                            )}
                          </div>
                          {benchmarkEvidenceMeta && hasBenchmarkRate && (
                            <div className={`ws-benchmark-evidence ws-benchmark-evidence-${selectedRateSource === 'benchmark' ? benchmarkEvidenceMeta.tone : 'muted'}`}>
                              <strong>{selectedRateSource === 'benchmark' ? benchmarkEvidenceMeta.title : benchmarkEvidenceMeta.referenceTitle}</strong>
                              <span>{selectedRateSource === 'benchmark' ? benchmarkEvidenceMeta.rateLabel : benchmarkEvidenceMeta.referenceRateLabel}</span>
                              {benchmarkEvidenceMeta.detail && <small>{benchmarkEvidenceMeta.detail}</small>}
                            </div>
                          )}
                          {benchmarkRefreshMeta?.actionable && (
                            <div className={`ws-benchmark-refresh ws-benchmark-refresh-${benchmarkRefreshMeta.tone}`}>
                              <strong>{benchmarkRefreshMeta.title}</strong>
                              <span>{benchmarkRefreshMeta.detail}</span>
                              <small>{benchmarkRefreshMeta.actionDetail}</small>
                            </div>
                          )}
                          {/* Manual benchmark override when benchmark pricing is active */}
                          {selectedRateSource === 'benchmark' && (
                            <div className="ws-benchmark-override">
                              <Pencil size={10} className="ws-benchmark-override-icon" />
                              <span className="ws-benchmark-override-label">Benchmark (₦):</span>
                              <input
                                type="number"
                                className="ws-input ws-benchmark-override-input"
                                value={item.benchmarkRegionalRates?.[project?.region || 'Lagos'] || item.benchmark || ''}
                                min="0"
                                step="any"
                                title="Override the benchmark rate with your own market data"
                                onChange={(e) => {
                                  const nextBenchmark = sanitizeNonNegativeNumber(e.target.value);
                                  const nextRegion = project?.region || 'Lagos';
                                  const nextRegionalRates = {
                                    ...(item.benchmarkRegionalRates || {}),
                                    [nextRegion]: nextBenchmark,
                                  };
                                  const nextBaseBenchmark = nextRegion === 'Lagos'
                                    ? nextBenchmark
                                    : (item.benchmark || (nextBenchmark / Math.max(getBenchmarkRegionalFactor(item, nextRegion), 0.001)));

                                  updateItem(section.id, item.id, {
                                    benchmark: nextBaseBenchmark,
                                    benchmarkRegionalRates: nextRegionalRates,
                                    benchmarkEvidence: {
                                      ...(item.benchmarkEvidence || {}),
                                      mode: 'manual-override',
                                      overrideRegion: nextRegion,
                                      updatedAt: new Date().toISOString()
                                    },
                                  });
                                }}
                              />
                            </div>
                          )}
                          <div className={`ws-rate-note ws-rate-note-${automationMeta.tone}`}>
                            <strong>{automationMeta.title}</strong>
                            <span>{automationMeta.detail}</span>
                          </div>
                        </td>
                        <td
                          className={`ws-total-cell ${isWorkspaceCellSelected(section.id, item.id, 'amount') ? 'ws-cell-selected' : ''}`}
                          onClick={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'amount', itemCode, rowNumber: spreadsheetRowNumber })}
                        >
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
                          <div className={`ws-mobile-card ${selectedRateSource === 'benchmark' ? 'ws-mobile-card-benchmark' : 'ws-mobile-card-custom'} ${isIncomplete ? 'ws-mobile-card-incomplete' : ''}`}>
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
                                <textarea
                                  rows={3}
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
                                  <div className="ws-rate-source-selector ws-rate-source-selector-mobile">
                                    <div className="ws-rate-source-buttons ws-rate-source-buttons-mobile">
                                      <button
                                        className={`ws-src-btn ws-src-btn-bm ${selectedRateSource === 'benchmark' ? 'active' : ''} ${!hasBenchmarkOption ? 'ws-src-btn-disabled' : ''}`}
                                        onClick={() => handleRateSourceChange(section.id, item, 'benchmark')}
                                        disabled={!hasBenchmarkOption}
                                        title={hasBenchmarkOption ? 'Use benchmark pricing' : 'No benchmark rate available yet'}
                                      >
                                        Benchmark
                                      </button>
                                      <button
                                        className={`ws-src-btn ws-src-btn-formula ${selectedRateSource === 'formula' ? 'active' : ''} ${!hasFormulaOption ? 'ws-src-btn-disabled' : ''}`}
                                        onClick={() => handleRateSourceChange(section.id, item, 'formula')}
                                        disabled={!hasFormulaOption}
                                        title={hasFormulaOption ? 'Use formula pricing' : 'No saved formula for this item'}
                                      >
                                        Formula
                                      </button>
                                      <button
                                        className={`ws-src-btn ws-src-btn-manual ${selectedRateSource === 'manual' ? 'active' : ''}`}
                                        onClick={() => activateCustomPricing(section.id, item)}
                                        title="Use manual pricing"
                                      >
                                        Manual
                                      </button>
                                    </div>
                                    <small className="ws-rate-source-help">
                                      {selectedRateSource === 'benchmark'
                                        ? 'Benchmark source active'
                                        : selectedRateSource === 'formula'
                                          ? 'Formula source active'
                                          : (item.customPricing ? 'Manual source with saved build-up' : 'Manual source ready for override')}
                                    </small>
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
                                  value={selectedRateSource === 'manual' ? (item.manualRate ?? '') : (rate || '')}
                                  onChange={(e) => handleManualRateChange(section.id, item, e.target.value)}
                                  disabled={!canEditManualRate}
                                />
                                {hasFormulaOption && (
                                  <button
                                    className="ws-analysis-btn ws-custom-studio-btn ws-mobile-icon-btn"
                                    onClick={() => openFormulaEditor(section.id, item)}
                                    title="Edit formula inputs"
                                  >
                                    fx
                                  </button>
                                )}
                                {selectedRateSource === 'manual' && (
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
                                <button className="ws-analysis-btn ws-mobile-icon-btn" onClick={() => openItemDetailPanel(section.id, item)} title="Item details">
                                  <Info size={12} />
                                </button>
                              </div>
                              <div className="ws-rate-reference-row ws-rate-reference-row-mobile">
                                <span className={`ws-rate-ref-pill ${selectedRateSource === 'benchmark' ? 'ws-rate-ref-active' : ''}`}>
                                  BM N{benchmarkRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                                <span className={`ws-rate-ref-pill ws-rate-ref-formula ${selectedRateSource === 'formula' ? 'ws-rate-ref-active' : ''}`}>
                                  {hasFormulaOption
                                    ? `FX N${formulaRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                                    : 'FX Unavailable'}
                                </span>
                                <span className={`ws-rate-ref-pill ws-rate-ref-manual ${selectedRateSource === 'manual' ? 'ws-rate-ref-active' : ''}`}>
                                  MAN N{manualRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="ws-rate-meta ws-rate-meta-mobile">
                                <span className={`ws-rate-chip ws-rate-chip-${rateSourceMeta.tone}`}>{rateSourceMeta.label}</span>
                                {selectedRateSource === 'benchmark' && hasBenchmarkRate && (
                                  <span className={`ws-rate-chip ws-rate-chip-bm-confidence ws-rate-chip-bm-${getBenchmarkConfidenceLabel(item.benchmarkMatchSource).toLowerCase()}`}
                                    title="Benchmark confidence based on breakdown match quality">
                                    {getBenchmarkConfidenceLabel(item.benchmarkMatchSource)} confidence
                                  </span>
                                )}
                                {benchmarkEvidenceMeta && hasBenchmarkRate && (
                                  <span
                                    className={`ws-rate-chip ws-rate-chip-${selectedRateSource === 'benchmark' ? benchmarkEvidenceMeta.tone : 'muted'}`}
                                    title={selectedRateSource === 'benchmark' ? benchmarkEvidenceMeta.title : benchmarkEvidenceMeta.referenceTitle}
                                  >
                                    {benchmarkEvidenceMeta.chip}
                                  </span>
                                )}
                                {benchmarkDeltaMeta && (
                                  <span className={`ws-rate-chip ws-rate-chip-${benchmarkDeltaMeta.tone}`}>{benchmarkDeltaMeta.text}</span>
                                )}
                                {benchmarkRefreshMeta?.actionable && (
                                  <span className={`ws-rate-chip ws-rate-chip-${benchmarkRefreshMeta.tone}`}>
                                    {benchmarkRefreshMeta.chip}
                                  </span>
                                )}
                                {benchmarkRefreshMeta?.canApplyRefresh && (
                                  <button
                                    className="ws-rate-link ws-rate-link-strong"
                                    onClick={() => refreshItemBenchmark(section.id, item.id)}
                                    title={benchmarkRefreshMeta.actionDetail}
                                  >
                                    {benchmarkRefreshMeta.actionLabel}
                                  </button>
                                )}
                                {selectedRateSource === 'manual' && !item.customPricing && (
                                  <button
                                    className="ws-rate-link"
                                    onClick={() => openCustomPricingStudio(section.id, item)}
                                    title="Build a defendable custom rate"
                                  >
                                    Build in studio
                                  </button>
                                )}
                              </div>
                              {benchmarkEvidenceMeta && hasBenchmarkRate && (
                                <div className={`ws-benchmark-evidence ws-benchmark-evidence-${selectedRateSource === 'benchmark' ? benchmarkEvidenceMeta.tone : 'muted'}`}>
                                  <strong>{selectedRateSource === 'benchmark' ? benchmarkEvidenceMeta.title : benchmarkEvidenceMeta.referenceTitle}</strong>
                                  <span>{selectedRateSource === 'benchmark' ? benchmarkEvidenceMeta.rateLabel : benchmarkEvidenceMeta.referenceRateLabel}</span>
                                  {benchmarkEvidenceMeta.detail && <small>{benchmarkEvidenceMeta.detail}</small>}
                                </div>
                              )}
                              {benchmarkRefreshMeta?.actionable && (
                                <div className={`ws-benchmark-refresh ws-benchmark-refresh-${benchmarkRefreshMeta.tone}`}>
                                  <strong>{benchmarkRefreshMeta.title}</strong>
                                  <span>{benchmarkRefreshMeta.detail}</span>
                                  <small>{benchmarkRefreshMeta.actionDetail}</small>
                                </div>
                              )}
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
                          <div className="ws-add-row-actions">
                            {getStructureSectionCatalog(projectStructureType, section.billSectionId) && (
                              <button className="ws-add-btn ws-add-btn-primary" onClick={() => openItemPicker(section.id)}>
                                <Plus size={13} /> Pick from Library
                              </button>
                            )}
                            <button className="ws-add-btn" onClick={() => addItemToSection(section.id)}>
                              <Plus size={13} /> Add Custom Item
                            </button>
                          </div>
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
          structureType={projectStructureType}
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
          structureType={projectStructureType}
          onClose={() => setCustomPricingItem(null)}
          onSave={handleCustomPricingSave}
          onOpenDetailedAnalysis={(draftCustomPricing) => openDetailedAnalysis(customPricingItem.sectionId, customPricingItem.item, draftCustomPricing)}
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
              manualRate: selectedBid ? sanitizeNonNegativeNumber(selectedBid.rate) : getManualRateValue(biddingItem.item),
              selectedRateSource: selectedBid ? 'manual' : resolveItemRateSource(biddingItem.item),
              useBenchmark: selectedBid ? false : biddingItem.item.useBenchmark,
              rateSource: selectedBid ? 'calculated' : biddingItem.item.rateSource
            });
            setBiddingItem(null);
          }}
        />
      )}
      {itemDetailPanelContext && (() => {
        const panelSection = sections.find(s => s.id === itemDetailPanelContext.sectionId);
        const panelItem = (panelSection?.items || []).find(i => i.id === itemDetailPanelContext.item.id) || itemDetailPanelContext.item;
        const panelBenchmarkRate = getEffectiveBenchmarkRate(panelItem, project?.region || "Lagos");
        const panelFormulaRate = panelItem.formulaCalculatedRate || 0;
        const panelResolvedUnitRate = getItemUnitRate(panelItem, project?.region || "Lagos");
        const panelSelectedSource = resolveItemRateSource(panelItem);
        return (
          <BOQItemDetailPanel
            item={panelItem}
            section={panelSection}
            benchmarkRate={panelBenchmarkRate}
            formulaRate={panelFormulaRate}
            resolvedUnitRate={panelResolvedUnitRate}
            selectedRateSource={panelSelectedSource}
            onClose={() => setItemDetailPanelContext(null)}
            onNotesChange={(notes) => updateItem(itemDetailPanelContext.sectionId, panelItem.id, "notes", notes)}
            onOpenFormulaEditor={isFormulaDrivenItem(panelItem) ? () => { setItemDetailPanelContext(null); openFormulaEditor(itemDetailPanelContext.sectionId, panelItem); } : null}
          />
        );
      })()}
      {pickerSection && pickerCatalogSection && (
        <BOQItemPickerModal
          structureType={projectStructureType}
          section={pickerCatalogSection}
          catalogItems={pickerCatalogSection.availableItems || []}
          existingItems={pickerSection.items || []}
          onClose={() => setItemPickerSectionId(null)}
          onAddItems={handleAddCatalogItems}
        />
      )}
      {formulaItemContext && (
        <BOQFormulaModal
          item={formulaItemContext.item}
          sectionTitle={sections.find((section) => section.id === formulaItemContext.sectionId)?.title}
          onClose={() => setFormulaItemContext(null)}
          onSave={handleFormulaInputsSave}
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
        /*  BOQ WORKSPACE — FULL-PAGE SHEET           */
        /* ═══════════════════════════════════════════ */

        .ws-container {
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 56px);
          background: #f1f5f9;
          overflow: visible;
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
          gap: 0.55rem;
          padding: 0.45rem 0.75rem 0.5rem;
          background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
          border-bottom: 1px solid #dbe4ee;
        }

        .ws-insight-card {
          display: flex;
          flex-direction: column;
          gap: 0.16rem;
          padding: 0.62rem 0.72rem;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #dbe4ee;
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.05);
        }

        .ws-insight-card-strong {
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          border-color: #bfdbfe;
        }

        .ws-insight-label {
          font-size: 0.54rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }

        .ws-insight-value {
          font-size: 0.82rem;
          font-weight: 900;
          color: #0f172a;
        }

        .ws-insight-copy {
          margin: 0;
          font-size: 0.63rem;
          line-height: 1.38;
          color: #475569;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .ws-cost-rail {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.65rem;
          padding: 0.65rem 0.75rem 0.8rem;
          background: linear-gradient(180deg, #eef2ff 0%, #f8fafc 100%);
          border-bottom: 1px solid #dbe4ee;
        }

        .ws-cost-card {
          display: flex;
          flex-direction: column;
          gap: 0.24rem;
          padding: 0.78rem 0.9rem;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #dbe4ee;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
        }

        .ws-cost-card-total {
          background: linear-gradient(135deg, #0f172a, #1e3a8a);
          border-color: #1e3a8a;
        }

        .ws-cost-label {
          font-size: 0.56rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }

        .ws-cost-value {
          font-size: 1rem;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.2;
        }

        .ws-cost-meta {
          font-size: 0.68rem;
          line-height: 1.45;
          color: #475569;
        }

        .ws-cost-card-total .ws-cost-label,
        .ws-cost-card-total .ws-cost-value,
        .ws-cost-card-total .ws-cost-meta {
          color: #ffffff;
        }

        .ws-refresh-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.55rem 0.75rem;
          border-bottom: 1px solid #dbe4ee;
          background: #f8fafc;
        }
        .ws-refresh-banner-active {
          background: linear-gradient(135deg, #eff6ff, #eef2ff);
        }
        .ws-refresh-banner-calm {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
        }
        .ws-refresh-banner-warning {
          background: linear-gradient(135deg, #fff7ed, #fff1f2);
        }
        .ws-refresh-banner-copy {
          display: flex;
          flex-direction: column;
          gap: 0.14rem;
          min-width: 0;
        }
        .ws-refresh-banner-copy strong {
          font-size: 0.76rem;
          font-weight: 900;
          color: #0f172a;
        }
        .ws-refresh-banner-copy p {
          margin: 0;
          font-size: 0.64rem;
          line-height: 1.35;
          color: #475569;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .ws-refresh-banner-eyebrow {
          font-size: 0.52rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }
        .ws-refresh-banner-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .ws-workbook-top {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          padding: 0.75rem 0.75rem 0.55rem;
          background: linear-gradient(180deg, #f8fbff 0%, #eef2ff 100%);
          border-bottom: 1px solid #dbe4ee;
        }
        .ws-workbook-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }
        .ws-workbook-copy {
          display: flex;
          flex-direction: column;
          gap: 0.22rem;
          min-width: 0;
        }
        .ws-workbook-eyebrow {
          font-size: 0.56rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }
        .ws-workbook-title-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .ws-workbook-title-row h1 {
          margin: 0;
          font-size: 1.25rem;
          line-height: 1.1;
          font-weight: 900;
          color: #0f172a;
        }
        .ws-workbook-copy p {
          margin: 0;
          font-size: 0.7rem;
          line-height: 1.35;
          color: #475569;
        }
        .ws-workbook-health {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.18rem 0.6rem;
          border-radius: 999px;
          font-size: 0.56rem;
          font-weight: 900;
          letter-spacing: 0.03em;
          white-space: nowrap;
        }
        .ws-workbook-health-success {
          background: #dcfce7;
          color: #166534;
        }
        .ws-workbook-health-active {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .ws-workbook-health-warning {
          background: #ffedd5;
          color: #c2410c;
        }
        .ws-workbook-health-muted {
          background: #e2e8f0;
          color: #475569;
        }
        .ws-search-results {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.24rem 0.55rem;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.76);
          font-size: 0.58rem;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .ws-workbook-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.45rem;
          min-width: 340px;
        }
        .ws-workbook-metric {
          display: flex;
          flex-direction: column;
          gap: 0.16rem;
          padding: 0.58rem 0.68rem;
          border-radius: 14px;
          background: rgba(255,255,255,0.92);
          border: 1px solid #dbe4ee;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
        }
        .ws-workbook-metric span {
          font-size: 0.52rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }
        .ws-workbook-metric strong {
          font-size: 0.84rem;
          font-weight: 900;
          color: #0f172a;
        }
        .ws-sheet-tabbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.55rem;
          padding: 0.22rem 0.2rem 0;
          border-top: 1px solid rgba(148, 163, 184, 0.24);
        }
        .ws-sheet-tabbar-meta {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .ws-sheet-tab {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.46rem 0.86rem;
          border: 1px solid #dbe4ee;
          border-radius: 14px 14px 0 0;
          background: rgba(255,255,255,0.72);
          color: #475569;
          font-size: 0.68rem;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ws-sheet-tab:hover {
          background: rgba(255,255,255,0.92);
          color: #0f172a;
        }
        .ws-sheet-tab.active {
          background: white;
          color: #1d4ed8;
          border-color: #bfdbfe;
          box-shadow: 0 -1px 0 0 white, inset 0 3px 0 #2563eb;
        }
        .ws-sheet-meta-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.18rem 0.48rem;
          border-radius: 999px;
          background: rgba(255,255,255,0.82);
          border: 1px solid #dbe4ee;
          font-size: 0.52rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          color: #475569;
          white-space: nowrap;
        }

        .ws-sheet-tools {
          padding: 0.35rem 0.75rem 0;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          border-bottom: 1px solid #e2e8f0;
        }
        .ws-sheet-tools.is-idle {
          padding-bottom: 0.1rem;
        }
        .ws-formula-bar {
          display: grid;
          grid-template-columns: 76px 30px minmax(0, 1fr);
          align-items: stretch;
          border: 1px solid #dbe4ee;
          border-radius: 12px 12px 0 0;
          background: white;
          overflow: hidden;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
        }
        .ws-formula-address,
        .ws-formula-fx {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.64rem;
          font-weight: 900;
          letter-spacing: 0.05em;
          color: #334155;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
        }
        .ws-formula-fx {
          color: #2563eb;
          text-transform: lowercase;
        }
        .ws-formula-body {
          display: flex;
          flex-direction: column;
          gap: 0.12rem;
          padding: 0.42rem 0.6rem;
          min-width: 0;
        }
        .ws-formula-body strong {
          font-size: 0.56rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
        }
        .ws-formula-body span {
          font-size: 0.74rem;
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ws-formula-body small {
          font-size: 0.56rem;
          line-height: 1.35;
          color: #64748b;
        }
        .ws-helper-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.6rem;
          padding: 0.42rem 0.05rem 0.5rem;
        }
        .ws-helper-strip.is-idle {
          align-items: center;
        }
        .ws-helper-copy {
          display: flex;
          flex-direction: column;
          gap: 0.12rem;
          min-width: 0;
        }
        .ws-helper-label {
          font-size: 0.52rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }
        .ws-helper-copy strong {
          font-size: 0.74rem;
          font-weight: 900;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ws-helper-copy small {
          font-size: 0.61rem;
          line-height: 1.45;
          color: #475569;
        }
        .ws-helper-strip.is-idle .ws-helper-copy small {
          display: none;
        }
        .ws-helper-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.36rem;
          flex-wrap: wrap;
        }
        .ws-helper-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.18rem 0.46rem;
          border-radius: 999px;
          font-size: 0.5rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .ws-helper-chip-benchmark { background: #dbeafe; color: #1d4ed8; }
        .ws-helper-chip-custom { background: #ccfbf1; color: #0f766e; }
        .ws-helper-chip-calculated { background: #ede9fe; color: #6d28d9; }
        .ws-helper-chip-manual { background: #e2e8f0; color: #475569; }
        .ws-helper-chip-warning { background: #ffedd5; color: #c2410c; }
        .ws-helper-chip-muted { background: #f1f5f9; color: #64748b; }
        .ws-helper-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.42rem 0.62rem;
          border-radius: 10px;
          border: 1px solid #dbe4ee;
          background: white;
          color: #334155;
          font-size: 0.61rem;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .ws-helper-btn:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }
        .ws-helper-btn-strong {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1d4ed8;
        }
        .ws-helper-btn-strong:hover {
          background: #dbeafe;
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
        .ws-mobile-field-block .ws-benchmark-evidence {
          align-items: flex-start;
          text-align: left;
        }
        .ws-mobile-field-block .ws-benchmark-refresh {
          align-items: flex-start;
          text-align: left;
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

        .ws-bill-nav {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 0.75rem;
          padding: 0.75rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .ws-bill-pill {
          display: flex;
          align-items: stretch;
          gap: 0.45rem;
          padding: 0.45rem;
          border: 1px solid #dbe3ef;
          border-radius: 16px;
          background: white;
        }

        .ws-bill-pill.active {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }

        .ws-bill-pill-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.2rem 0.35rem;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
        }

        .ws-bill-pill-title {
          font-size: 0.84rem;
          font-weight: 800;
          color: #0f172a;
        }

        .ws-bill-pill-meta {
          font-size: 0.72rem;
          color: #64748b;
        }

        .ws-bill-pill-picker {
          align-self: center;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 12px;
          padding: 0.55rem 0.7rem;
          font-size: 0.72rem;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

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
        .ws-search-clear {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border: none;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.8);
          cursor: pointer;
          flex-shrink: 0;
        }
        .ws-search-clear:hover {
          background: rgba(255,255,255,0.18);
          color: white;
        }

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
          flex: 0 0 auto;
          overflow-y: visible;
          overflow-x: auto;
          min-height: 60vh;
          background: #f8fafc;
          padding-bottom: 2rem;
        }
        .ws-table-wrap::-webkit-scrollbar { width: 6px; height: 6px; }
        .ws-table-wrap::-webkit-scrollbar-track { background: #f1f5f9; }
        .ws-table-wrap::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

        .ws-column-letters {
          display: grid;
          position: sticky;
          top: 0;
          z-index: 14;
          min-width: 100%;
          border-top: 1px solid #dbe4ee;
          border-bottom: 1px solid #dbe4ee;
          background: #e2e8f0;
        }
        .ws-column-letter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.35rem;
          min-width: 0;
          padding: 0.38rem 0.65rem;
          border-right: 1px solid #cbd5e1;
          background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
          color: #475569;
        }
        .ws-column-letter:last-child {
          border-right: none;
        }
        .ws-column-letter span {
          font-size: 0.72rem;
          font-weight: 900;
          color: #0f172a;
        }
        .ws-column-letter small {
          font-size: 0.52rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ws-column-letter.active {
          background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
          color: #1d4ed8;
        }
        .ws-column-letter.active span,
        .ws-column-letter.active small {
          color: #1d4ed8;
        }

        .ws-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
          background: white;
          table-layout: fixed;
          min-width: 1480px;
        }

        .ws-table thead { position: sticky; top: 40px; z-index: 10; }
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
          border-right: 1px solid #e2e8f0;
          white-space: nowrap;
        }
        .ws-table th:last-child,
        .ws-table td:last-child { border-right: none; }

        .ws-th-num { width: 56px; text-align: center; }
        .ws-th-desc { width: 44%; }
        .ws-th-unit { width: 60px; text-align: center; }
        .ws-th-qty { width: 152px; text-align: center; }
        .ws-th-sm { width: 80px; text-align: center; }
        .ws-th-strategy { width: 154px; text-align: center; }
        .ws-th-rate { width: 170px; text-align: right; }
        .ws-th-total { width: 148px; text-align: right; }
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
        .ws-section-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.28rem;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 999px;
          padding: 0.22rem 0.5rem;
          font-size: 0.56rem;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ws-section-refresh-btn:hover {
          background: #1d4ed8;
          color: white;
          border-color: #1d4ed8;
        }
        .ws-section-review-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #fdba74;
          background: #fff7ed;
          color: #c2410c;
          border-radius: 999px;
          padding: 0.22rem 0.5rem;
          font-size: 0.56rem;
          font-weight: 900;
        }
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
        .ws-item-row-selected {
          background: #f8fbff !important;
        }
        .ws-item-row td {
          padding: 0.375rem 0.625rem;
          vertical-align: middle;
          border-right: 1px solid #eef2f7;
          border-bottom: 1px solid #eef2f7;
          background: inherit;
        }
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
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.12rem;
          text-align: center;
          font-size: 0.6875rem; font-weight: 700;
          color: #94a3b8;
          font-family: 'Inter', system-ui, monospace;
        }
        .ws-row-number {
          font-size: 0.58rem;
          font-weight: 800;
          color: #94a3b8;
        }
        .ws-line-code {
          font-size: 0.72rem;
          font-weight: 900;
          color: #334155;
        }

        .ws-desc-inner { display: flex; align-items: flex-start; gap: 0.375rem; }
        .ws-item-meta-row {
          display: grid;
          grid-template-columns: 180px minmax(0, 1fr);
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
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 0.25rem 0.375rem;
          border-radius: 6px;
          font-size: 0.8125rem;
          transition: all 0.15s;
          outline: none;
          color: #1e293b;
        }
        .ws-input:hover { border-color: #cbd5e1; }
        .ws-input:focus { background: white; border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.08); }

        .ws-desc-input {
          min-height: 4.6rem;
          font-weight: 600;
          line-height: 1.45;
          resize: vertical;
          white-space: pre-wrap;
        }
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
        .ws-item-row:hover .ws-analysis-btn,
        .ws-item-row-selected .ws-geo-btn,
        .ws-item-row-selected .ws-analysis-btn { opacity: 1; }
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
        .ws-rate-chip-down { background: #ecfdf5; color: #15803d; }
        .ws-rate-chip-muted { background: #f1f5f9; color: #64748b; }
        .ws-rate-chip-warning { background: #fff7ed; color: #c2410c; }
        .ws-cell-selected {
          position: relative;
          background: #eff6ff !important;
          box-shadow: inset 0 0 0 2px #2563eb;
        }
        .ws-cell-selected .ws-input {
          border-color: #93c5fd;
          background: #ffffff;
        }
        .ws-cell-selected .ws-geo-btn,
        .ws-cell-selected .ws-analysis-btn {
          opacity: 1;
        }
        .ws-th-num,
        .ws-num {
          position: sticky;
          left: 0;
          z-index: 5;
          background: inherit;
        }
        .ws-th-desc,
        .ws-desc {
          position: sticky;
          left: 56px;
          z-index: 4;
          background: inherit;
        }
        .ws-table thead .ws-th-num,
        .ws-table thead .ws-th-desc {
          z-index: 12;
          background: #f8fafc;
        }
        .ws-item-row .ws-num,
        .ws-item-row .ws-desc {
          background: white;
        }
        .ws-item-row:hover .ws-num,
        .ws-item-row:hover .ws-desc {
          background: #f8fafc;
        }
        .ws-outlier .ws-num,
        .ws-outlier .ws-desc {
          background: #fffbeb !important;
        }
        .ws-item-incomplete .ws-num,
        .ws-item-incomplete .ws-desc {
          background: #fffaf0 !important;
        }
        .ws-benchmark-evidence {
          margin-top: 0.26rem;
          padding: 0.42rem 0.56rem;
          border-radius: 10px;
          border: 1px solid #dbe4ee;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 0.14rem;
          align-items: flex-end;
        }
        .ws-benchmark-evidence strong {
          font-size: 0.6rem;
          font-weight: 900;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        .ws-benchmark-evidence span,
        .ws-benchmark-evidence small {
          font-size: 0.6rem;
          line-height: 1.35;
          color: inherit;
        }
        .ws-benchmark-evidence small {
          opacity: 0.85;
        }
        .ws-benchmark-evidence-benchmark {
          border-color: #bfdbfe;
          background: linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%);
          color: #1d4ed8;
        }
        .ws-benchmark-evidence-custom {
          border-color: #99f6e4;
          background: linear-gradient(180deg, #f4fffd 0%, #ecfeff 100%);
          color: #0f766e;
        }
        .ws-benchmark-evidence-muted {
          border-color: #dbe4ee;
          background: #f8fafc;
          color: #475569;
        }
        .ws-benchmark-evidence-warning {
          border-color: #fdba74;
          background: linear-gradient(180deg, #fffaf5 0%, #fff7ed 100%);
          color: #c2410c;
        }
        .ws-benchmark-refresh {
          margin-top: 0.26rem;
          padding: 0.42rem 0.56rem;
          border-radius: 10px;
          border: 1px solid #dbe4ee;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 0.14rem;
          align-items: flex-end;
        }
        .ws-benchmark-refresh strong {
          font-size: 0.6rem;
          font-weight: 900;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        .ws-benchmark-refresh span,
        .ws-benchmark-refresh small {
          font-size: 0.6rem;
          line-height: 1.35;
          color: inherit;
        }
        .ws-benchmark-refresh small {
          opacity: 0.85;
        }
        .ws-benchmark-refresh-benchmark {
          border-color: #bfdbfe;
          background: linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%);
          color: #1d4ed8;
        }
        .ws-benchmark-refresh-aligned,
        .ws-benchmark-refresh-down {
          border-color: #bbf7d0;
          background: linear-gradient(180deg, #f7fff9 0%, #ecfdf5 100%);
          color: #15803d;
        }
        .ws-benchmark-refresh-high,
        .ws-benchmark-refresh-warning {
          border-color: #fdba74;
          background: linear-gradient(180deg, #fffaf5 0%, #fff7ed 100%);
          color: #c2410c;
        }
        .ws-benchmark-refresh-muted {
          border-color: #dbe4ee;
          background: #f8fafc;
          color: #475569;
        }
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
        .ws-rate-link-strong {
          background: #eff6ff;
          color: #1d4ed8;
        }
        .ws-rate-link-strong:hover {
          background: #1d4ed8;
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
        .ws-section-row:hover .ws-btn-icon,
        .ws-item-row-selected .ws-btn-icon { opacity: 1; }
        .ws-btn-danger:hover { background: #fef2f2; color: #ef4444; }
        .ws-btn-library:hover { background: #eff6ff; color: #1d4ed8; }
        .ws-bid-active { opacity: 1 !important; color: #2563eb; }
        .ws-vo-active { opacity: 1 !important; color: #f59e0b; }
        .ws-btn-info { color: #64748b; }
        .ws-btn-info:hover { background: #eff6ff; color: #2563eb; opacity: 1 !important; }

        /* ── RATE SOURCE SELECTOR (3-button tri-modal) ── */
        .ws-rate-source-selector {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .ws-src-btn {
          padding: 0.3rem 0.6rem;
          border-radius: 8px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          font-size: 0.73rem;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: all 0.12s;
          white-space: nowrap;
        }

        .ws-src-btn:hover:not(:disabled) { border-color: #94a3b8; background: #f1f5f9; color: #0f172a; }
        .ws-src-btn.active { font-weight: 800; }
        .ws-src-btn-bm.active    { background: #eff6ff; border-color: #93c5fd; color: #1d4ed8; }
        .ws-src-btn-formula.active { background: #f5f3ff; border-color: #c4b5fd; color: #6d28d9; }
        .ws-src-btn-manual.active  { background: #f0fdf4; border-color: #86efac; color: #15803d; }
        .ws-src-btn-disabled { opacity: 0.38; cursor: not-allowed; }
        .ws-rate-source-buttons {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.32rem;
        }
        .ws-rate-source-help {
          display: block;
          margin-top: 0.08rem;
          font-size: 0.63rem;
          line-height: 1.35;
          color: #64748b;
        }

        /* ── RATE REFERENCE ROW ── */
        .ws-rate-reference-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
          margin: 0.35rem 0 0;
        }

        .ws-rate-ref-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.18rem 0.45rem;
          border-radius: 999px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 0.65rem;
          font-weight: 600;
        }

        .ws-rate-ref-pill.ws-rate-ref-active {
          background: #0f172a;
          border-color: #0f172a;
          color: white;
          font-weight: 800;
        }

        .ws-rate-ref-formula { border-color: #ddd6fe; color: #6d28d9; }
        .ws-rate-ref-manual  { border-color: #bbf7d0; color: #15803d; }
        .ws-rate-reference-row-mobile {
          margin-top: 0.45rem;
        }

        /* ── EMPTY SECTION CTA ── */
        .ws-empty-section-row td { padding: 0 !important; }
        .ws-empty-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.65rem;
          padding: 2.5rem 2rem;
          background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
          border-bottom: 2px dashed #bfdbfe;
          text-align: center;
        }
        .ws-empty-section-title { font-size: 0.9rem; color: #0f172a; display: block; }
        .ws-empty-section-msg {
          margin: 0;
          font-size: 0.8rem;
          color: #64748b;
          max-width: 480px;
          line-height: 1.6;
        }
        .ws-empty-section-actions {
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 0.25rem;
        }


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
        .ws-add-row-actions {
          display: flex;
          gap: 0.5rem;
        }
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
        .ws-add-btn-primary {
          border-style: solid;
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
        }

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
          .ws-workbook-top {
            padding: 0.75rem 0.7rem 0.65rem;
          }
          .ws-workbook-head {
            flex-direction: column;
            align-items: stretch;
          }
          .ws-workbook-title-row h1 {
            font-size: 1.15rem;
          }
          .ws-workbook-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            min-width: 0;
          }
          .ws-workbook-metric:last-child {
            grid-column: 1 / -1;
          }
          .ws-helper-strip {
            flex-direction: column;
            align-items: stretch;
            padding: 0.5rem 0 0.6rem;
          }
          .ws-helper-actions {
            justify-content: flex-start;
          }
          .ws-search-results {
            width: 100%;
            justify-content: center;
          }
          .ws-sheet-tabbar {
            flex-direction: column;
            align-items: stretch;
          }
          .ws-sheet-tabbar-meta {
            justify-content: flex-start;
          }
          .ws-sheet-tab {
            width: 100%;
            border-radius: 12px;
          }
          .ws-sheet-tools {
            padding: 0.35rem 0.6rem 0;
          }
          .ws-formula-bar {
            grid-template-columns: 68px 30px minmax(0, 1fr);
            border-radius: 12px;
          }
          .ws-refresh-banner {
            flex-direction: column;
            align-items: stretch;
            padding: 0.7rem 0.75rem;
          }
          .ws-refresh-banner-actions {
            width: 100%;
          }
          .ws-refresh-banner-actions .ws-btn {
            width: 100%;
            justify-content: center;
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
          .ws-bill-nav {
            grid-auto-flow: column;
            grid-auto-columns: minmax(220px, 1fr);
            overflow-x: auto;
            padding-bottom: 0.85rem;
            scrollbar-width: none;
          }
          .ws-bill-nav::-webkit-scrollbar { display: none; }
          .ws-search {
            width: 100%;
            min-width: 0;
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
            grid-auto-columns: minmax(190px, 1fr);
            overflow-x: auto;
            padding-bottom: 0.65rem;
            scrollbar-width: none;
          }
          .ws-insight-strip::-webkit-scrollbar { display: none; }
          .ws-cost-rail {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            padding: 0.6rem 0.65rem 0.75rem;
          }
          .ws-cost-card-total {
            grid-column: span 2;
          }
          .ws-table-wrap {
            background: #f8fafc;
          }
          .ws-column-letters {
            display: none;
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
          .ws-rate-source-buttons-mobile {
            grid-template-columns: 1fr;
          }
          .ws-rate-source-selector-mobile .ws-src-btn {
            text-align: center;
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
          .ws-section-refresh-btn {
            order: 3;
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
          .ws-add-row-actions {
            flex-direction: column;
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

