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
import BOQFormulaModal from './BOQFormulaModal';
import BOQItemDetailPanel from './BOQItemDetailPanel';
import BOQSelectionStage from './BOQSelectionStage';
import BOQBillPanel from './BOQBillPanel';
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
  X,
  Globe,
  MousePointer2
} from 'lucide-react';

const buildSelectedCatalogItemMap = (sections = []) => (
  Object.fromEntries(
    (sections || []).map((section) => ([
      section.id,
      Array.from(new Set(
        (section.items || [])
          .map((item) => item.catalogItemId)
          .filter(Boolean)
      )),
    ]))
  )
);

const buildBoqBuilderState = (project, sections = []) => {
  const inferredSelections = buildSelectedCatalogItemMap(sections);
  const persistedSelections = project?.boqBuilder?.selectedCatalogItemIdsBySection || {};
  const selectedCatalogItemIdsBySection = Object.fromEntries(
    (sections || []).map((section) => {
      const hasPersistedValue = Object.prototype.hasOwnProperty.call(persistedSelections, section.id);
      const nextCodes = hasPersistedValue
        ? persistedSelections[section.id]
        : inferredSelections[section.id];

      return [
        section.id,
        Array.from(new Set(
          (Array.isArray(nextCodes) ? nextCodes : [])
            .filter(Boolean)
        )),
      ];
    })
  );

  const hasGeneratedRows = (sections || []).some((section) => (section.items || []).length > 0);
  const persistedStage = project?.boqBuilder?.stage;
  const stage = persistedStage === 'selection' || persistedStage === 'workspace'
    ? persistedStage
    : (project?.projectMode === 'structure-based' && !hasGeneratedRows ? 'selection' : 'workspace');
  const activeBillSectionId = (sections || []).some((section) => section.id === project?.boqBuilder?.activeBillSectionId)
    ? project.boqBuilder.activeBillSectionId
    : sections[0]?.id || null;

  return {
    stage,
    activeBillSectionId,
    selectedCatalogItemIdsBySection,
    generatedAt: project?.boqBuilder?.generatedAt || (hasGeneratedRows ? 'legacy-generated' : null),
  };
};

const BOQWorkspace = ({ project, launchIntent, onLaunchIntentHandled, onUpdate, onAddSection, onExport, onDelete }) => {
  const [sections, setSections] = useState(project?.sections || []);
  const [boqBuilder, setBoqBuilder] = useState(() => buildBoqBuilderState(project, project?.sections || []));
  const [analyzingItem, setAnalyzingItem] = useState(null);
  const [customPricingItem, setCustomPricingItem] = useState(null);
  const [calculatingQtyForItem, setCalculatingQtyForItem] = useState(null);
  const [biddingItem, setBiddingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [viewMode, setViewMode] = useState('estimation');
  const [showStructuralAnalyzer, setShowStructuralAnalyzer] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [formulaItemContext, setFormulaItemContext] = useState(null);
  const [itemDetailPanelContext, setItemDetailPanelContext] = useState(null);
  const [activeBillSectionId, setActiveBillSectionId] = useState(() => buildBoqBuilderState(project, project?.sections || []).activeBillSectionId);
  const sectionRowRefs = React.useRef({});
  const [_showAnalytics, _setShowAnalytics] = useState(false);

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
  const projectStructureType = project?.structureType || project?.type || '';
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
    const nextBuilderState = buildBoqBuilderState(project, project?.sections || []);
    setBoqBuilder(nextBuilderState);
  }, [project]);

  React.useEffect(() => {
    if (boqBuilder?.activeBillSectionId) {
      setActiveBillSectionId((current) => (
        current === boqBuilder.activeBillSectionId ? current : boqBuilder.activeBillSectionId
      ));
    }
  }, [boqBuilder?.activeBillSectionId]);

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

  const persistBoqBuilderState = React.useCallback((nextBuilder, nextSections = sections, region = project?.region, extraUpdates = {}) => {
    setBoqBuilder(nextBuilder);
    if (nextBuilder?.activeBillSectionId) {
      setActiveBillSectionId(nextBuilder.activeBillSectionId);
    }
    onUpdate(project.id, nextSections, region, {
      ...extraUpdates,
      boqBuilder: nextBuilder,
    });
  }, [onUpdate, project?.id, project?.region, sections]);

  const buildSectionsFromSelection = React.useCallback((sourceSections, builderState) => (
    (sourceSections || []).map((section) => {
      const catalogSection = getStructureSectionCatalog(projectStructureType, section.billSectionId);
      const catalogItems = catalogSection?.availableItems || [];
      const catalogItemsByCode = new Map(catalogItems.map((item) => [item.code, item]));
      const existingCatalogRows = new Map(
        (section.items || [])
          .filter((item) => item.catalogItemId)
          .map((item) => [item.catalogItemId, item])
      );
      const preservedCustomRows = (section.items || []).filter((item) => !item.catalogItemId);
      const selectedCodes = Array.isArray(builderState?.selectedCatalogItemIdsBySection?.[section.id])
        ? builderState.selectedCatalogItemIdsBySection[section.id]
        : [];

      const generatedRows = selectedCodes
        .map((code) => {
          const existingRow = existingCatalogRows.get(code);
          if (existingRow) {
            return syncBoqItemSnapshot(existingRow, section);
          }

          const catalogItem = catalogItemsByCode.get(code);
          if (!catalogItem) return null;

          return syncBoqItemSnapshot(
            cloneCatalogItemToProjectItem(catalogItem, {
              structureType: projectStructureType,
              billSectionId: section.billSectionId || section.id,
              billSectionTitle: section.title,
            }),
            section
          );
        })
        .filter(Boolean);

      return {
        ...section,
        expanded: true,
        items: [...generatedRows, ...preservedCustomRows],
      };
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [projectStructureType]);

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
    const safeQty = sanitizeNonNegativeNumber(rawValue);
    updateItem(sectionId, item.id, {
      qty: safeQty,
      quantity: safeQty,
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

  // eslint-disable-next-line no-unused-vars
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

  const _autoRateProject = async () => {
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

  const selectedCatalogItemIdsBySection = boqBuilder?.selectedCatalogItemIdsBySection || buildSelectedCatalogItemMap(sections);
  const selectionCountsBySection = React.useMemo(() => (
    Object.fromEntries(
      (sections || []).map((section) => ([
        section.id,
        Array.isArray(selectedCatalogItemIdsBySection?.[section.id])
          ? selectedCatalogItemIdsBySection[section.id].length
          : 0,
      ]))
    )
  ), [sections, selectedCatalogItemIdsBySection]);
  const sectionLibraryCounts = React.useMemo(() => (
    Object.fromEntries(
      (sections || []).map((section) => ([
        section.id,
        getStructureSectionCatalog(projectStructureType, section.billSectionId)?.availableItems?.length || 0,
      ]))
    )
  ), [projectStructureType, sections]);
  const sectionTotalsBySection = React.useMemo(() => (
    Object.fromEntries(
      (sections || []).map((section) => ([
        section.id,
        (section.items || []).reduce((sum, item) => sum + getItemTotal(item, project?.region || 'Lagos'), 0),
      ]))
    )
  ), [project?.region, sections]);
  const totalSelectedCatalogItems = React.useMemo(() => (
    Object.values(selectionCountsBySection).reduce((sum, count) => sum + count, 0)
  ), [selectionCountsBySection]);
  const hasGeneratedBoq = React.useMemo(() => (
    (sections || []).some((section) => (section.items || []).length > 0)
  ), [sections]);
  const isSelectionStage = !isCustomWorkspace && boqBuilder?.stage === 'selection';
  const workspaceVisibleSections = React.useMemo(() => {
    if (isSelectionStage) {
      return sections || [];
    }

    const visibleSections = (sections || []).filter((section) => {
      const hasItems = (section.items || []).length > 0;
      const hasCatalogDefinition = Boolean(getStructureSectionCatalog(projectStructureType, section.billSectionId));

      return hasItems || !hasCatalogDefinition;
    });

    return visibleSections.length > 0 ? visibleSections : (sections || []);
  }, [isSelectionStage, projectStructureType, sections]);
  const activeProjectSection = workspaceVisibleSections.find((section) => section.id === activeBillSectionId) || workspaceVisibleSections[0] || null;
  const activeSectionMeta = activeProjectSection ? getSectionUiMeta(activeProjectSection) : null;
  const activeCatalogSection = activeProjectSection
    ? getStructureSectionCatalog(projectStructureType, activeProjectSection.billSectionId)
    : null;
  const workspaceSections = activeBillSectionId
    ? workspaceVisibleSections.filter((section) => section.id === activeBillSectionId)
    : workspaceVisibleSections;

  React.useEffect(() => {
    if (isSelectionStage || !workspaceVisibleSections.length) {
      return;
    }

    const activeSectionStillVisible = workspaceVisibleSections.some((section) => section.id === activeBillSectionId);
    if (!activeSectionStillVisible) {
      const fallbackSectionId = workspaceVisibleSections[0].id;
      setActiveBillSectionId(fallbackSectionId);
      setBoqBuilder((prev) => (
        prev
          ? { ...prev, activeBillSectionId: fallbackSectionId }
          : prev
      ));
    }
  }, [activeBillSectionId, isSelectionStage, workspaceVisibleSections]);

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

    return (workspaceSections || []).map((section) => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBillSectionId, project?.region, projectStructureType, searchQuery, workspaceFilter, workspaceSections]);

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
  const _totalQuantity = workspaceAnalytics.totalQuantity;

  const totalItems = workspaceAnalytics.totalItems;
  const totalColumnCount = 4;
  const sectionHeaderSpan = 4;
  const subtotalLeadingSpan = 2;
  const benchmarkSyncLabel = formatBenchmarkSyncLabel(benchmarkSyncState.checkedAt);
  const _filteredSectionCount = filteredSections.length;
  const filteredItemCount = filteredSections.reduce((sum, section) => sum + ((section.items || []).length), 0);
  const _visibleGrandTotal = filteredSections.reduce((sum, section) => (
    sum + (section.items || []).reduce((itemSum, item) => itemSum + getItemTotal(item, project?.region || 'Lagos'), 0)
  ), 0);
  const isFilteredView = Boolean(searchQuery?.trim()) || workspaceFilter !== 'all';
  const _activeSectionSubtotal = activeProjectSection
    ? (activeProjectSection.items || []).reduce((sum, item) => sum + getItemTotal(item, project?.region || 'Lagos'), 0)
    : 0;
  const _activeSectionQty = activeProjectSection
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
  const activeSectionLineCount = activeProjectSection ? (activeProjectSection.items || []).length : 0;
  const activeSectionPricedItems = Math.max(activeSectionLineCount - activeSectionPendingItems, 0);
  const _activeCatalogSelectionCount = selectionCountsBySection?.[activeBillSectionId] || 0;
  const workspaceFilterOptions = [
    { id: 'all', label: 'All Items' },
    { id: 'active-bill', label: 'Active Bill' },
    { id: 'needs-pricing', label: 'Needs Review' },
    { id: 'formula', label: 'Formula Items' },
    { id: 'preliminaries', label: 'Preliminaries' },
  ];
  const _activeWorkspaceFilterLabel = workspaceFilterOptions.find((entry) => entry.id === workspaceFilter)?.label || 'All Items';
  const activeSheetLabel = viewMode === 'valuation' ? 'Valuation Sheet' : 'Estimate Sheet';
  const _workbookSubtitle = [projectStructureType, project?.subtype].filter(Boolean).join(' / ') || 'Construction pricing workbook';

  const focusSection = (sectionId, { persist = true } = {}) => {
    if (!sectionId) return;

    const nextSections = (sections || []).map((section) => (
      section.id === sectionId ? { ...section, expanded: true } : section
    ));
    const nextBuilder = {
      ...(boqBuilder || buildBoqBuilderState(project, sections)),
      activeBillSectionId: sectionId,
    };

    setSections(nextSections);
    if (persist) {
      persistBoqBuilderState(nextBuilder, nextSections);
      return;
    }

    setActiveBillSectionId(sectionId);
    setBoqBuilder(nextBuilder);
  };

  const updateSelectionForSection = (sectionId, nextCodes) => {
    const normalizedCodes = Array.from(new Set((nextCodes || []).filter(Boolean)));
    const nextBuilder = {
      ...(boqBuilder || buildBoqBuilderState(project, sections)),
      stage: 'selection',
      activeBillSectionId: sectionId,
      selectedCatalogItemIdsBySection: {
        ...selectedCatalogItemIdsBySection,
        [sectionId]: normalizedCodes,
      },
    };

    setActiveBillSectionId(sectionId);
    persistBoqBuilderState(nextBuilder, sections);
  };

  const handleToggleCatalogSelection = (sectionId, code) => {
    const existingCodes = Array.isArray(selectedCatalogItemIdsBySection?.[sectionId])
      ? selectedCatalogItemIdsBySection[sectionId]
      : [];
    const nextCodes = existingCodes.includes(code)
      ? existingCodes.filter((entry) => entry !== code)
      : [...existingCodes, code];

    updateSelectionForSection(sectionId, nextCodes);
  };

  const handleSelectVisibleCatalogItems = (sectionId, codes) => {
    const existingCodes = Array.isArray(selectedCatalogItemIdsBySection?.[sectionId])
      ? selectedCatalogItemIdsBySection[sectionId]
      : [];
    updateSelectionForSection(sectionId, [...existingCodes, ...(codes || [])]);
  };

  const handleClearCatalogSelection = (sectionId) => {
    updateSelectionForSection(sectionId, []);
  };

  const enterSelectionStage = (sectionId = activeBillSectionId || sections[0]?.id || null) => {
    if (!sectionId) return;

    const nextBuilder = {
      ...(boqBuilder || buildBoqBuilderState(project, sections)),
      stage: 'selection',
      activeBillSectionId: sectionId,
      selectedCatalogItemIdsBySection,
    };

    focusSection(sectionId, { persist: false });
    persistBoqBuilderState(nextBuilder, sections);
  };

  const handleGenerateBoq = () => {
    if (totalSelectedCatalogItems <= 0) {
      toast.info('Pick at least one BOQ item before generating the sheet.');
      return;
    }

    const generatedBuilder = {
      ...(boqBuilder || buildBoqBuilderState(project, sections)),
      stage: 'workspace',
      activeBillSectionId: activeBillSectionId || sections[0]?.id || null,
      selectedCatalogItemIdsBySection,
      generatedAt: new Date().toISOString(),
    };
    const nextSections = buildSectionsFromSelection(sections, generatedBuilder);

    setSections(nextSections);
    persistBoqBuilderState(generatedBuilder, nextSections);
    toast.success(hasGeneratedBoq ? 'BOQ sheet updated from your selected items.' : 'BOQ sheet generated from the selected items.');
  };

  const returnToWorkspace = () => {
    if (!hasGeneratedBoq) return;

    const nextBuilder = {
      ...(boqBuilder || buildBoqBuilderState(project, sections)),
      stage: 'workspace',
      activeBillSectionId: activeBillSectionId || sections[0]?.id || null,
      selectedCatalogItemIdsBySection,
      generatedAt: boqBuilder?.generatedAt || new Date().toISOString(),
    };

    persistBoqBuilderState(nextBuilder, sections);
  };

  const scrollToSection = (sectionId) => {
    focusSection(sectionId);
    if (isSelectionStage) return;
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
  const spreadsheetColumns = [
    { key: 'description', letter: 'A', label: 'Item Description' },
    { key: 'quantity', letter: 'B', label: 'Qty' },
    { key: 'rate', letter: 'C', label: 'Rate' },
    { key: 'amount', letter: 'D', label: 'Price' },
  ];
  const spreadsheetColumnTemplate = 'minmax(360px, 1fr) 150px 160px 170px';

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

  const _formulaBarMeta = (() => {
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

  const _renderBillTabs = (mode = 'workspace') => (
    <div className={`ws-bill-tabs-shell ${mode === 'selection' ? 'selection' : 'workspace'}`}>
      <div className="ws-bill-tabs">
        {(mode === 'selection' ? (sections || []) : workspaceVisibleSections).map((section, index) => {
          const isActive = activeBillSectionId === section.id;
          const sectionTotal = sectionTotalsBySection?.[section.id] || 0;
          const selectionCount = selectionCountsBySection?.[section.id] || 0;
          const itemCount = (section.items || []).length;
          const meta = mode === 'selection'
            ? `${selectionCount} selected`
            : `${itemCount} line${itemCount === 1 ? '' : 's'}${sectionTotal > 0 ? ` · N${sectionTotal.toLocaleString()}` : ''}`;

          return (
            <button
              key={section.id}
              type="button"
              className={`ws-bill-tab ${isActive ? 'active' : ''}`}
              onClick={() => scrollToSection(section.id)}
            >
              <span className="ws-bill-tab-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="ws-bill-tab-copy">
                <strong>{section.title}</strong>
                <small>{meta}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (isSelectionStage) {
    return (
      <div className="ws-container ws-container-selection">
        <BOQSelectionStage
          projectName={project?.name}
          marketRegion={marketRegionDisplay}
          structureType={projectStructureType}
          sections={sections}
          activeBillSectionId={activeBillSectionId}
          selectionCountsBySection={selectionCountsBySection}
          sectionLibraryCounts={sectionLibraryCounts}
          section={activeProjectSection}
          sectionMeta={activeSectionMeta}
          catalogItems={activeCatalogSection?.availableItems || []}
          selectedCodes={selectedCatalogItemIdsBySection?.[activeBillSectionId] || []}
          totalSelectedCount={totalSelectedCatalogItems}
          currentSectionSelectedCount={selectionCountsBySection?.[activeBillSectionId] || 0}
          onSelectBill={scrollToSection}
          onToggleItem={(code) => handleToggleCatalogSelection(activeBillSectionId, code)}
          onSelectVisible={(codes) => handleSelectVisibleCatalogItems(activeBillSectionId, codes)}
          onClearBill={() => handleClearCatalogSelection(activeBillSectionId)}
          onGenerate={handleGenerateBoq}
          generateLabel={hasGeneratedBoq ? 'Regenerate BOQ' : 'Generate BOQ'}
          hasGeneratedBoq={hasGeneratedBoq}
          onReturnToWorkspace={hasGeneratedBoq ? returnToWorkspace : null}
          onNextSection={() => {
            const currentIndex = sections.findIndex((section) => section.id === activeBillSectionId);
            const nextSection = currentIndex >= 0 ? sections[currentIndex + 1] : null;
            if (nextSection) {
              scrollToSection(nextSection.id);
            }
          }}
          hasNextSection={sections.findIndex((section) => section.id === activeBillSectionId) < sections.length - 1}
        />
      </div>
    );
  }

  return (
    <div className="ws-container">
      <div className="ws-workspace-body">
        <div className="ws-workspace-shell">
          <BOQBillPanel
            sections={workspaceVisibleSections}
            activeSectionId={activeBillSectionId}
            sectionTotalsBySection={sectionTotalsBySection}
            selectionCountsBySection={selectionCountsBySection}
            onSelectBill={scrollToSection}
          />
          <div className="ws-main-pane">
            {/* ── Compact Workspace Header ── */}
            <div className="ws-compact-header">
              <div className="ws-compact-header-top">
                <div className="ws-compact-header-left">
                  <span className="ws-compact-eyebrow">BOQ-Pro Workbook</span>
                  <div className="ws-compact-title-row">
                    <h2 className="ws-compact-title">{project?.name || 'Untitled Project'}</h2>
                    <span className={`ws-compact-sync-pill ws-compact-health-${benchmarkWorkspaceHealth.tone}`}>
                      {benchmarkSyncLabel ? `Synced ${benchmarkSyncLabel}` : benchmarkWorkspaceHealth.label}
                    </span>
                  </div>
                  <div className="ws-compact-meta-line">
                    <span className="ws-compact-bill-pill">{activeProjectSection?.title || 'No active bill'}</span>
                    <span>{activeSheetLabel}</span>
                    <span>{projectStructureType || 'General Works'}</span>
                    <span>{marketRegionDisplay}</span>
                    <span>
                      {activeSectionPendingItems > 0
                        ? `${activeSectionPendingItems} pending review`
                        : 'Bill currently priced'}
                    </span>
                  </div>
                </div>
                <div className="ws-compact-header-actions">
                  <div className="ws-compact-action-cluster">
                    <div className="ws-sheet-tabbar ws-sheet-tabbar-compact">
                      <button className={`ws-sheet-tab ${viewMode === 'estimation' ? 'active' : ''}`} onClick={() => setViewMode('estimation')}>Estimate</button>
                      <button className={`ws-sheet-tab ${viewMode === 'valuation' ? 'active' : ''}`} onClick={() => setViewMode('valuation')}>Valuation</button>
                    </div>
                  </div>
                  <div className="ws-compact-action-cluster ws-compact-action-cluster-tools">
                    <button className="ws-head-action ws-head-action-primary" onClick={() => enterSelectionStage(activeBillSectionId || sections[0]?.id)}>
                      <Plus size={13} /> Edit Selection
                    </button>
                    <button className="ws-head-action" onClick={refreshBenchmarks}>
                      <RefreshCcw size={13} /> Refresh
                    </button>
                    <button className="ws-head-action" onClick={onExport}>
                      <Download size={13} /> Export
                    </button>
                    <button className="ws-head-action" onClick={onAddSection}>
                      <Plus size={13} /> Section
                    </button>
                  </div>
                </div>
              </div>
              <div className="ws-compact-stats-row">
                <div className="ws-compact-stat">
                  <span>Active Bill</span>
                  <strong>{activeProjectSection?.title || '—'}</strong>
                  <small>
                    {activeSectionLineCount} line{activeSectionLineCount === 1 ? '' : 's'} · {activeSectionPricedItems} priced · {activeSectionPendingItems} pending
                  </small>
                </div>
                <div className="ws-compact-stat">
                  <span>Coverage</span>
                  <strong>{workspaceAnalytics.pricingCoveragePercent.toFixed(0)}%</strong>
                  <small>{workspaceAnalytics.pricedItems}/{workspaceAnalytics.totalItems} items</small>
                  <div className="ws-compact-progress-track">
                    <div
                      className="ws-compact-progress-fill"
                      style={{ width: `${workspaceAnalytics.pricingCoveragePercent}%` }}
                    />
                  </div>
                </div>
                <div className="ws-compact-stat ws-compact-stat-total">
                  <span>Project Total</span>
                  <strong>N{calculateGrandTotal.toLocaleString()}</strong>
                  <small>{workspaceAnalytics.benchmarkItems} benchmark · {workspaceAnalytics.customItems} custom</small>
                </div>
              </div>
            </div>
      {/* ── Search & Filter Toolbar ── */}
      <div className="ws-toolbar-clean">
        <div className="ws-toolbar-left">
          <div className="ws-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search items, codes, or descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery?.trim() && (
              <button className="ws-search-clear" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
          <span className="ws-search-results">
            {isFilteredView
              ? `${filteredItemCount} visible items`
              : `${totalItems} total items`}
          </span>
        </div>

        <div className="ws-toolbar-right">
          <div className="ws-filter-group">
            {workspaceFilterOptions.map((filterOption) => (
              <button
                key={filterOption.id}
                className={`ws-filter-pill ${workspaceFilter === filterOption.id ? 'active' : ''}`}
                onClick={() => setWorkspaceFilter(filterOption.id)}
              >
                {filterOption.label}
              </button>
            ))}
          </div>

          <div className="ws-divider-v" />

          <div className="ws-region-selector">
            <Globe size={14} />
            <select value={project?.region || 'Lagos'} onChange={(e) => handleRegionChange(e.target.value)}>
              <option value="Lagos">Lagos</option>
              <option value="Abuja">Abuja</option>
              <option value="Port_Harcourt">Port Harcourt</option>
              <option value="Ibadan">Ibadan</option>
              <option value="Kano">Kano</option>
            </select>
          </div>

          {isCustomWorkspace && presenceUsers.length > 0 && (
            <div className="ws-presence-avatars">
              {presenceUsers.slice(0, 3).map((u, i) => (
                <div
                  key={u.id}
                  className="ws-avatar-circle"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  title={u.displayName || u.email}
                >
                  {getInitials(u.displayName || u.email)}
                </div>
              ))}
              {presenceUsers.length > 3 && (
                <div className="ws-avatar-more">+{presenceUsers.length - 3}</div>
              )}
            </div>
          )}
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
              <th className="ws-th-desc">Item Description</th>
              <th className="ws-th-qty">Qty</th>
              <th className="ws-th-rate">Rate (₦)</th>
              <th className="ws-th-total">Amount (₦)</th>
            </tr>
          </thead>
          <tbody>
            {filteredSections.map((section, sIdx) => {
              const sectionSubtotal = (section.items || []).reduce((a, i) => a + getItemTotal(i, project?.region || 'Lagos'), 0);
              const sectionQty = (section.items || []).reduce((a, i) => a + (Number(i.qty) || 0), 0);
              const sectionRefreshMeta = benchmarkRefreshAnalytics.sectionMap[section.id] || null;
              const sectionMeta = getSectionUiMeta(section);

              return (
                <React.Fragment key={section.id}>
                  {/* Section Header */}
                  <tr
                    ref={(node) => { sectionRowRefs.current[section.id] = node; }}
                    className="ws-section-row"
                    onClick={() => {
                      focusSection(section.id);
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
                        <div className="ws-section-actions" onClick={(e) => e.stopPropagation()}>
                          {getStructureSectionCatalog(projectStructureType, section.billSectionId) && (
                            <button
                              className="ws-btn-icon ws-btn-library"
                              onClick={() => enterSelectionStage(section.id)}
                              title="Pick BOQ items for this bill"
                            >
                              <Plus size={13} />
                            </button>
                          )}
                          <button className="ws-btn-icon ws-btn-danger" onClick={() => onDelete(project.id, section.id)} title="Delete bill">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        {!section.expanded && (
                          <span className="ws-section-total">₦{sectionSubtotal.toLocaleString()}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {/* Empty section CTA */}
                  {section.expanded && (section.items || []).length === 0 && (
                    <tr className="ws-empty-section-row">
                      <td colSpan={totalColumnCount} className="ws-empty-section-cell">
                        <div className="ws-empty-section">
                          <span className="ws-empty-section-eyebrow">Bill Empty</span>
                          <strong className="ws-empty-section-title">{sectionMeta.emptyStateTitle || `No items selected for ${section.title}.`}</strong>
                          <p className="ws-empty-section-msg">{sectionMeta.emptyStateMessage || "Add items from the library or create a custom line."}</p>
                          <div className="ws-empty-section-actions">
                            {sectionMeta.catalogSection && (
                              <button className="ws-btn ws-btn-primary" onClick={() => enterSelectionStage(section.id)}>
                                <Plus size={14} /> Choose Items for Bill
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
                          className={`ws-desc ${isWorkspaceCellSelected(section.id, item.id, 'description') ? 'ws-cell-selected' : ''}`}
                          onClick={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'description', itemCode, rowNumber: spreadsheetRowNumber })}
                        >
                          <div className="ws-simple-desc">
                            <div className="ws-simple-desc-top">
                              <span className="ws-simple-item-code">{item.code || itemCode}</span>
                              <span className="ws-simple-unit-pill">{item.unit || 'unit'}</span>
                              {item.isVO && <span className="ws-vo">VO</span>}
                            </div>
                            <strong className="ws-item-name">{item.name || item.description || 'Untitled BOQ item'}</strong>
                            <p className="ws-desc-text">{item.description || 'No description provided'}</p>
                          </div>
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
                          </div>
                          <div className="ws-qty-display">
                            <strong className="ws-qty-main">{quantityDisplayValue}</strong>
                            <span className="ws-qty-unit-text">{item.unit || 'unit'}</span>
                          </div>
                        </td>
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
                            {viewMode !== 'valuation' && (
                              <select 
                                className={`ws-compact-source-badge ws-compact-source-${selectedRateSource}`}
                                value={selectedRateSource}
                                onChange={(e) => handleRateSourceChange(section.id, item, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                title="Change Pricing Strategy"
                              >
                                <option value="benchmark" disabled={!hasBenchmarkOption}>BM</option>
                                <option value="formula" disabled={!hasFormulaOption}>FX</option>
                                <option value="manual">MAN</option>
                              </select>
                            )}
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
                      </tr>
                      <tr className="ws-add-row">
                        <td colSpan={totalColumnCount}>
                          <div className="ws-add-row-actions">
                            {getStructureSectionCatalog(projectStructureType, section.billSectionId) && (
                              <button className="ws-add-btn ws-add-btn-primary" onClick={() => enterSelectionStage(section.id)}>
                                <Plus size={13} /> Edit Bill Selection
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
              <td colSpan={3}>CONTRACT SUM</td>
              <td className="ws-grand-val">₦{calculateGrandTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        </div>
      </div>
          <aside className={`ws-detail-dock right-panel ${selectedItemContext ? 'has-selection' : 'is-empty'}`}>
            {selectedItemContext ? (
              <>
                <div className="ws-detail-dock-header">
                  <div className="ws-detail-dock-copy">
                    <span className="ws-detail-dock-eyebrow">Right Bar Controls</span>
                    <h3 className="ws-detail-dock-title">
                      {selectedItemContext.itemCode} · {selectedItemContext.item.name || selectedItemContext.item.description || 'Untitled BOQ item'}
                    </h3>
                    <div className="ws-detail-dock-meta">
                      <span className="ws-detail-meta-pill">{selectedItemContext.section.title}</span>
                      <span className="ws-detail-meta-pill">Qty: {selectedItemContext.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      <span className="ws-detail-meta-pill">Rate: N{selectedItemContext.unitRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="ws-detail-dock-actions">
                    <button
                      className="ws-helper-btn"
                      onClick={() => setCalculatingQtyForItem({ sectionId: selectedItemContext.section.id, item: selectedItemContext.item })}
                      title="Geometric Takeoff"
                    >
                      <Calculator size={14} />
                    </button>
                    <button
                      className="ws-helper-btn ws-helper-btn-danger"
                      onClick={() => setSelectedCell(null)}
                      title="Close Panel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="ws-detail-guide">
                    <span>Use this panel for rate source, formula, benchmark, takeoff, notes, and item actions.</span>
                    <strong>Table stays simple: description, qty, rate, price.</strong>
                  </div>
                </div>

                <BOQItemDetailPanel
                  variant="docked"
                  item={selectedItemContext.item}
                  section={selectedItemContext.section}
                  benchmarkRate={selectedItemContext.benchmarkRate}
                  formulaRate={selectedItemContext.item.formulaCalculatedRate || 0}
                  resolvedUnitRate={selectedItemContext.unitRate}
                  selectedRateSource={resolveItemRateSource(selectedItemContext.item)}
                  onClose={() => setSelectedCell(null)}
                  onNotesChange={(notes) => updateItem(selectedItemContext.section.id, selectedItemContext.item.id, 'notes', notes)}
                  onDescriptionChange={(desc) => updateItem(selectedItemContext.section.id, selectedItemContext.item.id, 'description', desc)}
                  onRateSourceChange={(source) => handleRateSourceChange(selectedItemContext.section.id, selectedItemContext.item, source)}
                  onOpenFormulaEditor={isFormulaDrivenItem(selectedItemContext.item) ? () => openFormulaEditor(selectedItemContext.section.id, selectedItemContext.item) : null}
                  onOpenRateAnalysis={() => openDetailedAnalysis(selectedItemContext.section.id, selectedItemContext.item)}
                  onOpenCustomPricing={() => openCustomPricingStudio(selectedItemContext.section.id, selectedItemContext.item)}
                  onOpenTakeoff={() => setCalculatingQtyForItem({ sectionId: selectedItemContext.section.id, item: selectedItemContext.item })}
                  onOpenBidManager={() => setBiddingItem({ sectionId: selectedItemContext.section.id, item: selectedItemContext.item })}
                  onDuplicate={() => duplicateItem(selectedItemContext.section.id, selectedItemContext.item.id)}
                  onDelete={() => onDelete(project.id, selectedItemContext.section.id, selectedItemContext.item.id)}
                  onAddBelow={() => addItemBelow(selectedItemContext.section.id, selectedItemContext.item.id)}
                  onRefreshBenchmark={() => refreshItemBenchmark(selectedItemContext.section.id, selectedItemContext.item.id)}
                />
              </>
            ) : (
              <div className="ws-detail-empty">
                <div className="ws-detail-empty-inner">
                  <div className="ws-detail-empty-icon">
                    <MousePointer2 size={32} strokeWidth={1.5} />
                  </div>
                  <h3>Right Bar Controls</h3>
                  <p>Select any BOQ row. The table only shows the estimate sheet, while this panel handles formula, benchmark, takeoff, notes, and item actions.</p>
                  <div className="ws-detail-empty-hint">
                    <span>Click a row to edit details</span>
                  </div>
                </div>
              </div>
            )}


          </aside>
        </div>
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
            const safeQty = sanitizeNonNegativeNumber(newQty);
            focusSection(calculatingQtyForItem.sectionId);
            setSelectedCell((prev) => ({
              sectionId: calculatingQtyForItem.sectionId,
              itemId: calculatingQtyForItem.item.id,
              columnKey: 'quantity',
              itemCode: prev?.itemId === calculatingQtyForItem.item.id
                ? prev.itemCode
                : (calculatingQtyForItem.item.code || calculatingQtyForItem.item.ref || ''),
              rowNumber: prev?.itemId === calculatingQtyForItem.item.id ? prev.rowNumber : null
            }));
            updateItem(calculatingQtyForItem.sectionId, calculatingQtyForItem.item.id, {
              qty: safeQty,
              quantity: safeQty,
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
            onDescriptionChange={(desc) => updateItem(itemDetailPanelContext.sectionId, panelItem.id, "description", desc)}
            onRateSourceChange={(source) => handleRateSourceChange(itemDetailPanelContext.sectionId, panelItem, source)}
            onOpenFormulaEditor={isFormulaDrivenItem(panelItem) ? () => { setItemDetailPanelContext(null); openFormulaEditor(itemDetailPanelContext.sectionId, panelItem); } : null}
            onOpenRateAnalysis={() => { setItemDetailPanelContext(null); openDetailedAnalysis(itemDetailPanelContext.sectionId, panelItem); }}
            onOpenCustomPricing={() => { setItemDetailPanelContext(null); openCustomPricingStudio(itemDetailPanelContext.sectionId, panelItem); }}
            onOpenTakeoff={() => setCalculatingQtyForItem({ sectionId: itemDetailPanelContext.sectionId, item: panelItem })}
            onOpenBidManager={() => setBiddingItem({ sectionId: itemDetailPanelContext.sectionId, item: panelItem })}
            onDuplicate={() => duplicateItem(itemDetailPanelContext.sectionId, panelItem.id)}
            onDelete={() => { setItemDetailPanelContext(null); onDelete(project.id, itemDetailPanelContext.sectionId, panelItem.id); }}
            onAddBelow={() => addItemBelow(itemDetailPanelContext.sectionId, panelItem.id)}
            onRefreshBenchmark={() => refreshItemBenchmark(itemDetailPanelContext.sectionId, panelItem.id)}
          />
        );
      })()}
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

        /* --- NEW COMPACT LAYOUT STYLES --- */
        .ws-workspace-shell {
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr) 360px;
          gap: 0; /* Tighten gap for 3-panel feel */
          width: 100%;
          height: calc(100vh - 56px);
          overflow: hidden;
          background: #f1f5f9;
        }
        .ws-main-pane {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          min-width: 0;
          background: #f8fafc;
          border-left: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .ws-main-pane::-webkit-scrollbar { width: 7px; }
        .ws-main-pane::-webkit-scrollbar-track { background: transparent; }
        .ws-main-pane::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }

        .ws-detail-dock {
          width: 360px;
          min-width: 360px;
          max-width: 360px;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border-left: 1px solid #e2e8f0;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .ws-detail-dock.is-empty {
          background: #f8fafc;
        }
        .ws-detail-dock-header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.5rem;
          background: #ffffff;
          border-bottom: 1px solid #f1f5f9;
        }
        .ws-detail-dock-copy {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .ws-detail-dock-eyebrow {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #94a3b8;
        }
        .ws-detail-dock-title {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.3;
        }
        .ws-detail-dock-meta {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }
        .ws-detail-meta-pill {
          font-size: 0.62rem;
          font-weight: 800;
          padding: 0.2rem 0.5rem;
          background: #f1f5f9;
          color: #64748b;
          border-radius: 4px;
        }
        .ws-detail-dock-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .ws-detail-guide {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          padding: 0.72rem 0.8rem;
          border: 1px solid #dbeafe;
          border-radius: 14px;
          background: linear-gradient(180deg, #eff6ff 0%, #f8fbff 100%);
          color: #1e3a8a;
          font-size: 0.68rem;
          line-height: 1.4;
        }
        .ws-detail-guide span {
          color: #475569;
          font-weight: 650;
        }
        .ws-detail-guide strong {
          color: #1d4ed8;
          font-weight: 900;
        }
        .ws-helper-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #64748b;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ws-helper-btn:hover {
          background: #f8fafc;
          color: #1e293b;
          border-color: #cbd5e1;
        }
        .ws-helper-btn-danger:hover {
          background: #fef2f2;
          color: #ef4444;
          border-color: #fecaca;
        }

        .ws-detail-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          text-align: center;
        }
        .ws-detail-empty-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 240px;
        }
        .ws-detail-empty-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          color: #cbd5e1;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 20px rgba(0,0,0,0.02);
        }
        .ws-detail-empty h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          font-weight: 800;
          color: #1e293b;
        }
        .ws-detail-empty p {
          margin: 0;
          font-size: 0.82rem;
          color: #64748b;
          line-height: 1.5;
        }
        .ws-detail-empty-hint {
          margin-top: 2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.72rem;
          font-weight: 700;
          color: #3b82f6;
          padding: 0.5rem 1rem;
          background: #eff6ff;
          border-radius: 999px;
        }

          color: #0f172a;
          line-height: 1.4;
        }
        .ws-detail-dock-copy small {
          color: #64748b;
          font-size: 0.76rem;
          line-height: 1.5;
        }
        .ws-detail-dock-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }
        .ws-detail-empty {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0.75rem;
          padding: 1.5rem;
          flex: 1;
          background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
        }
        .ws-detail-empty strong {
          color: #0f172a;
          font-size: 1rem;
        }
        .ws-detail-empty p {
          margin: 0;
          color: #64748b;
          font-size: 0.84rem;
          line-height: 1.6;
        }
        .ws-detail-empty-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }
        .ws-summary-strip {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          padding: 0;
          border: none;
          border-radius: 26px;
          background: transparent;
          box-shadow: none;
        }
        .ws-summary-headline,
        .ws-summary-metrics-row {
          display: none;
        }
        .ws-summary-headline {
          display: flex;
          flex-direction: column;
          gap: 0.36rem;
        }
        .ws-summary-title-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .ws-summary-title-row h1 {
          margin: 0;
          font-size: 2rem;
          line-height: 1.02;
          color: #0f172a;
        }
        .ws-summary-headline p {
          margin: 0;
          color: #64748b;
          font-size: 0.88rem;
        }
        .ws-summary-metrics-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.8rem;
        }
        .ws-summary-metric {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.26rem;
          padding: 0.45rem 0.75rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
        }
        .ws-summary-badge {
          position: absolute;
          top: 0.8rem;
          right: 0.8rem;
          display: inline-flex;
          align-items: center;
          padding: 0.16rem 0.46rem;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 0.58rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .ws-summary-badge-strong {
          background: rgba(255,255,255,0.18);
          color: #ffffff;
        }
        .ws-summary-metric > span:not(.ws-summary-badge) {
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
        }
        .ws-summary-metric strong {
          font-size: 1.24rem;
          color: #0f172a;
          line-height: 1.2;
          padding-right: 1.25rem;
        }
        .ws-summary-metric small {
          color: #64748b;
          font-size: 0.76rem;
          line-height: 1.5;
        }
        .ws-summary-metric-secondary {
          background: #ffffff;
        }
        .ws-summary-metric-tertiary {
          background: #f8fafc;
          border-style: dashed;
        }
        .ws-summary-metric-tertiary strong {
          font-size: 1.05rem;
        }
        .ws-summary-metric-strong {
          background: linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%);
          border-color: #1e40af;
          box-shadow: 0 18px 36px rgba(37, 99, 235, 0.22);
          transform: translateY(-1px);
        }
        .ws-summary-metric-strong > span:not(.ws-summary-badge),
        .ws-summary-metric-strong strong,
        .ws-summary-metric-strong small {
          color: #ffffff;
        }
        .ws-summary-actions-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
          padding: 0;
        }
        .ws-summary-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .ws-sheet-tabbar-compact {
          margin: 0;
          padding: 0;
          border: none;
          background: transparent;
        }
        .ws-analytics-inline-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 0.9rem 1rem;
          border-radius: 18px;
          border: 1px solid #dbeafe;
          background: #eff6ff;
        }
        .ws-analytics-inline-copy {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .ws-analytics-inline-copy strong {
          color: #1e3a8a;
          font-size: 0.88rem;
        }
        .ws-analytics-inline-copy small {
          color: #475569;
          font-size: 0.76rem;
        }
        .ws-item-heading-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.35rem;
          margin-bottom: 0.15rem;
        }
        .ws-item-heading-copy {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          min-width: 0;
        }
        .ws-item-name {
          font-size: 0.78rem;
          color: #0f172a;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }
        .ws-item-code-pill {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 0.1rem 0.35rem;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 0.55rem;
          font-weight: 800;
        }
        .ws-item-indicators {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 0.2rem;
        }
        .ws-item-secondary {
          margin-top: 0.1rem;
          font-size: 0.6rem;
          color: #64748b;
          line-height: 1.3;
        }
        .ws-workbook-top,
        .ws-workspace-command-center,
        .ws-bill-tabs-shell.workspace,
        .ws-analytics-board,
        .ws-mobile-summary {
          display: none !important;
        }
        @media (max-width: 1500px) {
          .ws-workspace-shell {
            grid-template-columns: 280px minmax(0, 1fr) 360px;
          }
          .ws-summary-metrics-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 1180px) {
          .ws-container {
            height: auto;
            max-height: none;
            overflow: visible;
          }
          .ws-workspace-shell {
            grid-template-columns: 1fr;
            height: auto;
            overflow: visible;
          }
          .ws-main-pane {
            overflow-y: visible;
            overflow-x: visible;
          }
          .ws-compact-header-top {
            flex-direction: column;
            align-items: stretch;
          }
          .ws-compact-header-actions {
            max-width: none;
            width: 100%;
            justify-content: space-between;
          }
          .ws-compact-action-cluster-tools {
            justify-content: flex-start;
          }
          .ws-compact-stats-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .ws-detail-dock {
            position: static;
            width: 100%;
            min-width: 0;
            max-width: 100%;
            min-height: auto;
            overflow-y: visible;
          }
          .ws-summary-actions-row,
          .ws-analytics-inline-card {
            flex-direction: column;
            align-items: stretch;
          }
        }
        @media (max-width: 760px) {
          .ws-compact-header {
            padding: 0.8rem 0.8rem 0.75rem;
          }
          .ws-compact-title {
            font-size: 1.08rem;
          }
          .ws-compact-meta-line {
            font-size: 0.62rem;
          }
          .ws-compact-stats-row {
            grid-template-columns: 1fr;
          }
          .ws-compact-header-actions,
          .ws-compact-action-cluster,
          .ws-compact-action-cluster-tools {
            width: 100%;
            justify-content: flex-start;
          }
        }
        @media (max-width: 768px) {
          .ws-summary-metrics-row {
            grid-template-columns: 1fr;
          }
          .ws-summary-title-row h1 {
            font-size: 1.45rem;
          }
        }
        .ws-workbook-metrics-compact {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .ws-analytics-toggle {
          display: inline-flex;
          align-items: center;
          padding: 0.45rem 1.4rem;
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ws-analytics-toggle:hover {
          background: #dbeafe;
        }
        .ws-analytics-toggle.active {
          background: #1e3a8a;
          color: white;
          border-color: #1e3a8a;
        }
        .ws-analytics-board {
          display: flex;
          flex-direction: column;
          background: #f8fafc;
          border-bottom: 1px solid #dbe4ee;
          padding-bottom: 0.5rem;
          box-shadow: inset 0 6px 14px rgba(15,23,42,0.03);
        }
        .ws-stat-compact {
          display: flex; align-items: center; gap: 0.5rem;
        }
        .ws-region-sel-compact {
           background: rgba(255,255,255,0.1);
           border: 1px solid rgba(255,255,255,0.2);
           color: white;
           padding: 2px 6px;
           border-radius: 4px;
           outline: none;
           font-size: 0.65rem;
           cursor: pointer;
        }
        .ws-region-sel-compact:hover {
           background: rgba(255,255,255,0.15);
        }
        .ws-region-sel-compact option {
           background: #1e293b;
           color: white;
        }
        .ws-filter-group-compact {
           display: flex;
           gap: 0.25rem;
           background: rgba(0,0,0,0.15);
           padding: 0.22rem;
           border-radius: 6px;
        }
        .ws-filter-chip-compact {
           background: transparent;
           border: none;
           color: rgba(255,255,255,0.6);
           font-size: 0.64rem;
           font-weight: 800;
           padding: 0.25rem 0.6rem;
           border-radius: 4px;
           cursor: pointer;
           transition: all 0.2s;
        }
        .ws-filter-chip-compact:hover {
           color: white;
           background: rgba(255,255,255,0.1);
        }
        .ws-filter-chip-compact.active {
           background: rgba(255,255,255,0.2);
           color: white;
        }
        .ws-bill-nav {
           padding: 0.5rem 0.75rem !important;
        }
        .ws-bill-pill {
           padding: 0.25rem 0.5rem;
           border-radius: 999px;
           flex-direction: row;
           align-items: center;
           min-width: unset;
        }
        .ws-bill-pill-title {
           font-size: 0.72rem;
        }
        .ws-bill-pill-meta {
           display: none;
        }
        .ws-bill-pill-picker {
           padding: 0.15rem 0.45rem;
           font-size: 0.62rem;
           border-radius: 999px;
        }
        .ws-bill-nav-hidden {
          display: none !important;
        }
        .ws-workspace-body {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        .ws-bill-tabs-shell {
          position: sticky;
          top: 0;
          z-index: 18;
          background: rgba(248, 250, 252, 0.94);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
          padding: 0.85rem 1rem;
        }
        .ws-bill-tabs {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(220px, 1fr);
          gap: 0.65rem;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .ws-bill-tabs::-webkit-scrollbar { display: none; }
        .ws-bill-tab {
          border: 1px solid #dbe3ef;
          background: #ffffff;
          border-radius: 18px;
          padding: 0.8rem 0.9rem;
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr);
          gap: 0.75rem;
          align-items: center;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
        }
        .ws-bill-tab:hover {
          transform: translateY(-1px);
          border-color: #93c5fd;
          box-shadow: 0 14px 28px rgba(37, 99, 235, 0.08);
        }
        .ws-bill-tab.active {
          border-color: #2563eb;
          background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .ws-bill-tab-index {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #f1f5f9;
          color: #475569;
          font-size: 0.72rem;
          font-weight: 800;
        }
        .ws-bill-tab.active .ws-bill-tab-index {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .ws-bill-tab-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .ws-bill-tab-copy strong {
          font-size: 0.84rem;
          color: #0f172a;
          line-height: 1.35;
        }
        .ws-bill-tab-copy small {
          font-size: 0.72rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ws-stage-shell {
          display: block;
          min-height: 0;
          border-top: none;
          background: transparent;
        }
        .ws-stage-shell-selection {
          min-height: 0;
        }
        .ws-stage-main {
          width: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: transparent;
        }
        .ws-stage-main-selection {
          overflow: hidden;
        }
        .ws-selection-stage-chip {
          display: inline-flex;
          align-items: center;
          padding: 0.45rem 1rem;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          font-size: 0.72rem;
          font-weight: 800;
        }
        .ws-sheet-tabbar-selection {
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
        }
        .ws-selection-tabbar-copy {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          color: #0f172a;
        }
        .ws-selection-tabbar-copy strong {
          font-size: 0.92rem;
        }
        .ws-selection-tabbar-copy span {
          font-size: 0.78rem;
          line-height: 1.5;
          color: #475569;
        }

        /* --- NEW COMPACT 3-PANEL LAYOUT STYLES --- */
        .ws-compact-header {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          padding: 0.9rem 1rem 0.85rem;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          border-bottom: 1px solid #e2e8f0;
        }
        .ws-compact-header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }
        .ws-compact-header-left {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          min-width: 0;
          flex: 1;
        }
        .ws-compact-eyebrow {
          font-size: 0.58rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #94a3b8;
        }
        .ws-compact-title-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .ws-compact-title {
          margin: 0;
          font-size: 1.28rem;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.02em;
          min-width: 0;
        }
        .ws-compact-sync-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.24rem 0.58rem;
          border-radius: 999px;
          font-size: 0.58rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          border: 1px solid #e2e8f0;
          white-space: nowrap;
        }
        .ws-compact-meta-line {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          color: #64748b;
          font-size: 0.68rem;
          font-weight: 700;
        }
        .ws-compact-meta-line span {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }
        .ws-compact-meta-line span:not(.ws-compact-bill-pill)::before {
          content: '';
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #cbd5e1;
        }
        .ws-compact-bill-pill {
          padding: 0.24rem 0.58rem;
          border-radius: 999px;
          background: #e0f2fe;
          color: #0369a1;
          border: 1px solid #bae6fd;
          font-size: 0.62rem;
          font-weight: 900;
        }
        .ws-compact-meta-tags {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .ws-compact-meta-tag {
          font-size: 0.62rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.2rem 0.6rem;
          background: #f1f5f9;
          color: #64748b;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
        }
        .ws-compact-meta-tag.ws-compact-health-success { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
        .ws-compact-meta-tag.ws-compact-health-active { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
        .ws-compact-meta-tag.ws-compact-health-warning { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }

        .ws-compact-header-actions {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          flex-shrink: 0;
          flex-wrap: wrap;
          justify-content: flex-end;
          max-width: 52%;
        }
        .ws-compact-action-cluster {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .ws-compact-action-cluster-tools {
          justify-content: flex-end;
        }

        .ws-compact-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.7rem;
          margin-top: 0;
        }
        .ws-compact-stat {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          padding: 0.55rem 0.75rem;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
          transition: all 0.2s;
        }
        .ws-compact-stat:hover {
          background: #ffffff;
          border-color: #e2e8f0;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
        }
        .ws-compact-stat span {
          font-size: 0.6rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
        }
        .ws-compact-stat strong {
          font-size: 0.96rem;
          font-weight: 900;
          color: #1e293b;
          line-height: 1.2;
        }
        .ws-compact-stat small {
          font-size: 0.62rem;
          color: #64748b;
        }
        .ws-compact-progress-track {
          position: relative;
          width: 100%;
          height: 6px;
          margin-top: 0.25rem;
          background: #dbeafe;
          border-radius: 999px;
          overflow: hidden;
        }
        .ws-compact-progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%);
        }
        .ws-compact-stat-total {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border-color: #0f172a;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
        }
        .ws-compact-stat-total span { color: rgba(255,255,255,0.6); }
        .ws-compact-stat-total strong { color: #ffffff; }
        .ws-compact-stat-total small { color: rgba(255,255,255,0.5); }

        .ws-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 56px);
          max-height: calc(100vh - 56px);
          background: #f1f5f9;
          overflow: hidden;
        }

        /* --- CLEAN TOOLBAR --- */
        .ws-toolbar-clean {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.7rem;
          padding: 0.5rem 1rem;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          position: static;
          top: auto;
          z-index: auto;
        }
        .ws-toolbar-left {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex: 1;
          min-width: 0;
          flex-wrap: wrap;
        }
        .ws-search-box {
          position: relative;
          display: flex;
          align-items: center;
          width: 320px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0 0.75rem;
          transition: all 0.2s;
        }
        .ws-search-box:focus-within {
          background: #ffffff;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .ws-search-box svg { color: #94a3b8; }
        .ws-search-box input {
          width: 100%;
          border: none;
          background: transparent;
          padding: 0.5rem 0.5rem;
          font-size: 0.82rem;
          font-weight: 500;
          color: #1e293b;
          outline: none;
        }
        .ws-search-clear {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
        }
        .ws-search-clear:hover { color: #64748b; }
        .ws-search-results {
          font-size: 0.76rem;
          font-weight: 600;
          color: #64748b;
        }

        .ws-toolbar-right {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .ws-filter-group {
          display: flex;
          gap: 0.35rem;
        }
        .ws-filter-pill {
          background: transparent;
          border: 1px solid #e2e8f0;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          font-size: 0.7rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ws-filter-pill:hover {
          background: #f8fafc;
          color: #1e293b;
        }
        .ws-filter-pill.active {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
        }
        .ws-divider-v {
          width: 1px;
          height: 20px;
          background: #e2e8f0;
        }
        .ws-region-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
        }
        .ws-region-selector svg { color: #64748b; }
        .ws-region-selector select {
          background: transparent;
          border: none;
          font-size: 0.72rem;
          font-weight: 700;
          color: #1e293b;
          outline: none;
          cursor: pointer;
        }

        .ws-presence-avatars {
          display: flex;
          align-items: center;
          margin-left: 0.5rem;
        }
        .ws-avatar-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          font-weight: 800;
          color: #ffffff;
          margin-left: -8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .ws-avatar-circle:first-child { margin-left: 0; }
        .ws-avatar-more {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #f1f5f9;
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.55rem;
          font-weight: 800;
          color: #64748b;
          margin-left: -8px;
        }


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

        .ws-workspace-command-center {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          padding: 0.95rem 0.95rem 0;
          background: linear-gradient(180deg, #f8fbff 0%, #f8fafc 100%);
        }
        .ws-workbook-head {
          align-items: stretch;
          gap: 1.25rem;
        }
        .ws-workbook-console {
          min-width: min(560px, 100%);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .ws-workbook-metrics-compact {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.7rem;
        }
                .ws-head-stat-card {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          padding: 1.25rem 1.5rem;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          background: #ffffff;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.03);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .ws-head-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
          border-color: #e2e8f0;
        }
                .ws-head-stat-card span {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #94a3b8;
        }
                .ws-head-stat-card strong {
          font-size: 1.25rem;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.1;
        }
                .ws-head-stat-card small {
          font-size: 0.75rem;
          font-weight: 500;
          line-height: 1.5;
          color: #64748b;
          margin-top: 0.1rem;
        }
                .ws-head-stat-card-strong {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          border-color: #1e1b4b;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
        }
        .ws-head-stat-card-strong:hover {
          box-shadow: 0 15px 35px rgba(15, 23, 42, 0.2);
        }
        .ws-head-stat-card-strong span { color: rgba(255, 255, 255, 0.6); }
        .ws-head-stat-card-strong span,
        .ws-head-stat-card-strong strong,
        .ws-head-stat-card-strong small {
          color: #ffffff;
        }
        .ws-workbook-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 0.6rem;
        }
        .ws-head-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.58rem 0.8rem;
          border-radius: 14px;
          border: 1px solid #dbe4ee;
          background: rgba(255, 255, 255, 0.94);
          color: #334155;
          font-size: 0.72rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .ws-head-action:hover {
          border-color: #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
        }
        .ws-head-action-primary {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
          border-color: #2563eb;
          color: #ffffff;
          box-shadow: 0 10px 22px rgba(37, 99, 235, 0.18);
        }
        .ws-head-action-primary:hover {
          background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%);
          border-color: #1d4ed8;
          color: #ffffff;
        }
        .ws-head-action-strong {
          border-color: #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
        }
        .ws-analytics-toggle {
          padding: 0.72rem 1rem;
          border-radius: 14px;
          font-size: 0.78rem;
        }
        .ws-sheet-tabbar {
          padding-top: 0.7rem;
          margin-top: 0.1rem;
        }
        .ws-bill-tabs-shell {
          padding: 0.9rem 0.95rem;
          background: rgba(248, 250, 252, 0.98);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
        }
        .ws-cost-rail {
          padding: 0;
          background: transparent;
          border-bottom: none;
        }
        .ws-cost-card {
          border-radius: 18px;
          padding: 0.95rem 1rem;
        }
        .ws-sheet-tools {
          padding: 0;
          background: transparent;
          border-bottom: none;
        }
        .ws-formula-bar {
          border-radius: 18px 18px 0 0;
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.06);
        }
        .ws-helper-strip {
          padding: 0.9rem 1rem 1rem;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid #dbe4ee;
          border-top: none;
          border-radius: 0 0 18px 18px;
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.06);
        }
        .ws-analytics-board {
          border-radius: 22px;
          border: 1px solid #dbe4ee;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }
        .ws-toolbar {
          margin: 0.1rem 0 0;
          padding: 0.85rem 1rem;
          border-radius: 20px;
          border: 1px solid #dbe4ee;
          background: rgba(255, 255, 255, 0.96);
          color: #0f172a;
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06);
          flex-wrap: wrap;
        }
        .ws-toolbar-left,
        .ws-toolbar-center,
        .ws-toolbar-right {
          min-height: 44px;
        }
        .ws-toolbar-left {
          flex: 1 1 320px;
        }
        .ws-toolbar-center {
          flex: 1 1 320px;
          justify-content: center;
        }
        .ws-toolbar-right {
          flex: 1 1 420px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }
        .ws-search {
          width: min(360px, 100%);
          background: #f8fafc;
          border: 1px solid #dbe4ee;
          border-radius: 14px;
          padding: 0.72rem 0.85rem;
          color: #0f172a;
        }
        .ws-search input {
          color: #0f172a;
          font-size: 0.8rem;
        }
        .ws-search input::placeholder { color: #94a3b8; }
        .ws-search-results {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          font-size: 0.62rem;
        }
        .ws-stat-label {
          color: #64748b;
        }
        .ws-region-sel-compact {
          background: #ffffff;
          border: 1px solid #dbe4ee;
          color: #0f172a;
          border-radius: 10px;
          padding: 0.35rem 0.55rem;
          font-size: 0.72rem;
        }
        .ws-region-sel-compact option {
          background: #ffffff;
          color: #0f172a;
        }
        .ws-filter-group-compact {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.25rem;
          flex-wrap: wrap;
        }
        .ws-filter-chip-compact {
          color: #64748b;
          font-size: 0.7rem;
          border-radius: 10px;
          padding: 0.45rem 0.7rem;
        }
        .ws-filter-chip-compact:hover {
          color: #0f172a;
          background: #e2e8f0;
        }
        .ws-filter-chip-compact.active {
          background: #0f172a;
          color: #ffffff;
        }
        .ws-btn {
          padding: 0.55rem 0.8rem;
          border-radius: 12px;
          font-size: 0.72rem;
        }
        .ws-btn-ghost {
          background: #f8fafc;
          color: #334155;
          border: 1px solid #dbe4ee;
        }
        .ws-btn-ghost:hover {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
        }

        /* ── TABLE ── */
        .ws-table-wrap {
          flex: 0 0 auto;
          min-width: 0;
          min-height: 460px;
          overflow-x: auto;
          overflow-y: visible;
          background: #ffffff;
          box-sizing: border-box;
          position: relative;
        }

        .ws-table-wrap::-webkit-scrollbar { width: 6px; height: 6px; }
        .ws-table-wrap::-webkit-scrollbar-track { background: #f1f5f9; }
        .ws-table-wrap::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

        .ws-column-letters {
          display: grid;
          position: static;
          top: auto;
          z-index: 4;
          min-width: 100%;
          border-bottom: 1px solid #dbe4ee;
          background: #f8fafc;
        }
        .ws-column-letter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.35rem;
          min-width: 0;
          padding: 0.48rem 0.7rem;
          border-right: 1px solid #cbd5e1;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
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
          font-size: 0.82rem;
          background: white;
          table-layout: fixed;
          min-width: 840px;
        }

        .ws-table thead {
          position: static;
          top: auto;
          z-index: auto;
        }
        .ws-table th {
          background: #f8fafc;
          padding: 0.5rem 0.75rem;
          text-align: left;
          font-size: 0.6rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
          white-space: nowrap;
          box-shadow: 0 1px 0 #e2e8f0;
        }
        .ws-table th:last-child { border-right: none; }

        .ws-th-num { width: 50px; text-align: center; }
        .ws-th-desc { width: auto; }
        .ws-th-unit { width: 60px; text-align: center; }
        .ws-th-qty { width: 150px; text-align: right; }
        .ws-th-sm { width: 72px; text-align: center; }
        .ws-th-rate { width: 160px; text-align: right; }
        .ws-th-total { width: 170px; text-align: right; }
        .ws-th-act { width: 40px; }
        .ws-th-rate,
        .ws-th-total {
          font-size: 0;
        }
        .ws-th-rate::after,
        .ws-th-total::after {
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.08em;
        }
        .ws-th-rate::after { content: "Rate"; }
        .ws-th-total::after { content: "Price"; }

        /* ── SECTION ROW ── */
        .ws-section-row {
          cursor: pointer;
          background: #f1f5f9;
          border-top: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
        }
        .ws-section-row:hover { background: #e2e8f0; }
        .ws-section-cell { padding: 0.4rem 0.75rem !important; }
        .ws-section-inner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #334155;
        }
        .ws-section-letter {
          display: inline-flex; align-items: center; justify-content: center;
          width: 20px; height: 20px;
          background: #0f172a; color: white;
          font-size: 0.6rem; font-weight: 900;
          border-radius: 4px; flex-shrink: 0;
        }
        .ws-section-title-input {
          background: none; border: none; outline: none;
          font-size: 0.75rem; font-weight: 800; color: #0f172a;
          flex: 1; padding: 2px 4px;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        .ws-section-title-input:focus { background: white; border-radius: 4px; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
        .ws-section-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 999px;
          padding: 0.18rem 0.48rem;
          font-size: 0.56rem;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ws-section-refresh-btn:hover {
          background: #dbeafe;
          border-color: #93c5fd;
        }
        .ws-section-review-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #fdba74;
          background: #fff7ed;
          color: #c2410c;
          border-radius: 999px;
          padding: 0.18rem 0.48rem;
          font-size: 0.56rem;
          font-weight: 900;
        }
        .ws-section-meta {
          font-size: 0.58rem;
          font-weight: 800;
          color: #475569;
          background: rgba(148, 163, 184, 0.14);
          padding: 0.16rem 0.42rem;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .ws-section-badge {
          font-size: 0.56rem;
          font-weight: 900;
          background: #0f172a;
          color: white;
          padding: 0.12rem 0.42rem;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .ws-section-total {
          font-size: 0.75rem; font-weight: 900; color: #1d4ed8;
          margin-left: auto;
        }
        .ws-section-actions {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          margin-left: auto;
        }

        .ws-subcategory-row {
          background: linear-gradient(90deg, #f8fafc, #eef2ff);
        }

        .ws-subcategory-cell {
          padding: 0.2rem 0.4rem !important;
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
          transition: all 0.1s ease;
          background: #ffffff;
        }
        .ws-item-row:hover { background: #f8fbff; }
        .ws-item-row:nth-child(even) { background: #fafbfc; }

        .ws-item-row-selected {
          background: #eff6ff !important;
          box-shadow: inset 3px 0 0 #2563eb;
        }

        .ws-item-row td {
          padding: 0.62rem 0.8rem !important;
          font-size: 0.78rem;
          color: #334155;
          border-right: 1px solid #f1f5f9;
          vertical-align: middle;
          line-height: 1.4;
          background: inherit;
        }
        .ws-item-row td:last-child { border-right: none; }

        .ws-item-row-selected td {
          border-bottom-color: #dbeafe;
        }

        .ws-item-row-benchmark td:first-child { box-shadow: inset 3px 0 0 #2563eb; }
        .ws-item-row-custom td:first-child { box-shadow: inset 3px 0 0 #0f766e; }
        .ws-item-incomplete { background: #fffaf0 !important; }
        .ws-item-incomplete td:first-child { box-shadow: inset 3px 0 0 #f59e0b; }
        .ws-outlier { background: #fffbeb !important; }

        .ws-num {
          text-align: center;
          font-weight: 700;
          color: #64748b;
        }
        .ws-line-code {
          display: block;
          font-size: 0.65rem;
          color: #94a3b8;
          margin-top: 0.1rem;
        }

        .ws-row-number {
          font-size: 0.52rem;
          font-weight: 800;
          color: #94a3b8;
        }
        .ws-line-code {
          font-size: 0.68rem;
          font-weight: 900;
          color: #334155;
        }

        .ws-desc-inner { display: flex; align-items: flex-start; gap: 0.375rem; }
        .ws-desc-static {
          padding: 0;
          cursor: default;
        }
        .ws-desc-text {
          margin: 0;
          font-size: 0.72rem;
          font-weight: 550;
          color: #334155;
          line-height: 1.35;
          word-break: break-word;
          white-space: pre-wrap;
          user-select: text;
        }
        .ws-simple-desc {
          display: flex;
          flex-direction: column;
          gap: 0.22rem;
          min-width: 0;
        }
        .ws-simple-desc-top {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;
        }
        .ws-simple-item-code,
        .ws-simple-unit-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          font-size: 0.54rem;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          line-height: 1;
          padding: 0.18rem 0.44rem;
        }
        .ws-simple-item-code {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }
        .ws-simple-unit-pill {
          background: #f8fafc;
          color: #475569;
          border: 1px solid #e2e8f0;
        }
        .ws-desc,
        .ws-desc-inner,
        .ws-item-heading-row,
        .ws-item-heading-copy,
        .ws-item-secondary,
        .ws-rate-source-selector,
        .ws-rate-source-current,
        .ws-rate-source-buttons {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
          box-sizing: border-box;
        }
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
          padding: 0.08rem 0.3rem;
          border-radius: 999px;
          font-size: 0.46rem;
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
        .ws-availability-pill {
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
          border: 1px solid transparent;
        }
        .ws-availability-pill-formula {
          background: #f5f3ff;
          color: #6d28d9;
          border-color: #ddd6fe;
        }
        .ws-availability-pill-benchmark {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
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
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
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
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          min-height: 2.85rem;
          max-height: 120px;
          font-weight: 620;
          line-height: 1.4;
          resize: vertical;
          white-space: pre-wrap;
          font-size: 0.85rem;
          overflow-y: auto;
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
          margin-top: 0.1rem;
          display: flex;
          align-items: baseline;
          justify-content: flex-end;
          gap: 0.15rem;
        }
        .ws-qty-main {
          font-size: 0.76rem;
          line-height: 1.1;
          font-weight: 900;
          color: #0f172a;
        }
        .ws-qty-unit-text {
          font-size: 0.52rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }
        .ws-qty-meta {
          margin-top: 0.05rem;
          display: flex;
          justify-content: flex-end;
        }
        .ws-qty-source {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.08rem 0.3rem;
          border-radius: 999px;
          font-size: 0.48rem;
          font-weight: 800;
          background: #eff6ff;
          color: #1d4ed8;
        }
        .ws-field-feedback {
          margin-top: 0.08rem;
          font-size: 0.55rem;
          line-height: 1.2;
        }
        .ws-field-feedback-success { color: #15803d; }
        .ws-field-feedback-warning { color: #c2410c; }
        .ws-field-feedback-muted { color: #64748b; }

        .ws-qty-wrap, .ws-rate-wrap { display: flex; align-items: center; gap: 0.15rem; justify-content: flex-end; }

        .ws-geo-btn, .ws-analysis-btn {
          display: flex; align-items: center; justify-content: center;
          width: 18px; height: 18px;
          border: none; background: #f1f5f9; color: #64748b;
          border-radius: 3px; cursor: pointer; flex-shrink: 0;
          transition: all 0.15s; opacity: 0;
          font-size: 0.6rem;
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
          font-size: 0.72rem;
          white-space: normal;
        }
        .ws-total-main {
          display: block;
          font-size: 0.76rem;
          line-height: 1.15;
          color: #0f172a;
        }
        .ws-total-formula {
          display: block;
          font-size: 0.52rem;
          color: #64748b;
          line-height: 1.2;
          margin-top: 0.06rem;
        }
        .ws-total-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.08rem 0.3rem;
          border-radius: 999px;
          font-size: 0.48rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          margin-top: 0.08rem;
        }
        .ws-total-status-success { background: #dcfce7; color: #166534; }
        .ws-total-status-warning { background: #ffedd5; color: #c2410c; }
        .ws-total-status-custom { background: #ccfbf1; color: #0f766e; }
        .ws-total-status-calculated { background: #ede9fe; color: #6d28d9; }
        .ws-rate-cell { text-align: right; }
        .ws-rate-cell .ws-compact-source-badge,
        .ws-rate-cell .ws-analysis-btn,
        .ws-rate-reference-row,
        .ws-rate-meta,
        .ws-benchmark-evidence,
        .ws-benchmark-refresh,
        .ws-benchmark-override,
        .ws-rate-note,
        .ws-total-formula,
        .ws-total-status,
        .ws-act-cell {
          display: none !important;
        }
        .ws-rate-cell .ws-rate-input:disabled {
          background: #ffffff;
          border-color: #e2e8f0;
          color: #0f172a;
          opacity: 1;
          cursor: pointer;
        }
        .ws-rate-meta {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 0.15rem;
          margin-top: 0.08rem;
        }
        .ws-rate-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.08rem 0.3rem;
          border-radius: 999px;
          font-size: 0.5rem;
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
          background: #eef6ff !important;
          box-shadow: inset 0 0 0 2px #2563eb, inset 0 0 0 9999px rgba(255,255,255,0.08);
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
          z-index: 10;
          background: #ffffff;
        }
        .ws-th-desc,
        .ws-desc {
          position: sticky;
          left: 0;
          z-index: 11;
          background: #ffffff;
          min-width: 360px;
          max-width: none;
          width: auto;
          overflow: hidden;
          text-overflow: ellipsis;
          box-shadow: 1px 0 0 rgba(148, 163, 184, 0.22);
        }
        .ws-table thead .ws-th-num,
        .ws-table thead .ws-th-desc {
          z-index: 13;
          background: #f8fafc;
        }
        .ws-item-row .ws-num,
        .ws-item-row .ws-desc {
          background: white;
        }
        .ws-item-row:hover .ws-num,
        .ws-item-row:hover .ws-desc {
          background: #f8fafc !important;
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
          transition: all 0.15s;
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
          gap: 0.4rem;
        }

        .ws-rate-source-current {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.4rem;
        }

        .ws-rate-source-current-label {
          font-size: 0.58rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }

        .ws-rate-source-current-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.18rem 0.5rem;
          border-radius: 999px;
          font-size: 0.62rem;
          font-weight: 900;
          border: 1px solid transparent;
          white-space: nowrap;
        }

        .ws-rate-source-current-pill-benchmark {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
        }

        .ws-rate-source-current-pill-formula {
          background: #f5f3ff;
          color: #6d28d9;
          border-color: #ddd6fe;
        }

        .ws-rate-source-current-pill-manual {
          background: #f0fdf4;
          color: #15803d;
          border-color: #bbf7d0;
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
          gap: 0.7rem;
          padding: 2.6rem 2rem;
          background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
          border: 1px dashed #93c5fd;
          border-radius: 18px;
          margin: 1rem;
          text-align: center;
        }
        .ws-empty-section-eyebrow {
          font-size: 0.64rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #1d4ed8;
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
          margin-top: 0.35rem;
        }


        /* ── SUBTOTAL ── */
        .ws-subtotal-row { background: linear-gradient(180deg, #f8fafc 0%, #eef6ff 100%); }
        .ws-subtotal-val {
          text-align: right !important;
          font-weight: 900; font-size: 0.78rem;
          color: #1e293b;
          padding: 0.7rem 0.85rem !important;
          border-bottom: 2px solid #bfdbfe;
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
        @media (max-width: 1100px) {
          .ws-stage-shell {
            flex-direction: column;
          }

          .ws-stage-main {
            min-height: auto;
          }

          .ws-workbook-console {
            min-width: 0;
            width: 100%;
          }

          .ws-workbook-metrics-compact {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ws-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: #f8fafc;
          }
          .ws-container-selection {
            flex: 1;
            height: 100%;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          .ws-head-stat-card-strong {
            grid-column: 1 / -1;
          }

          .ws-workbook-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 768px) {
          .ws-container {
            height: auto;
            min-height: calc(100vh - 56px);
          }
          .ws-workspace-command-center {
            padding: 0.75rem 0.7rem 0;
            gap: 0.7rem;
          }
          .ws-bill-tabs-shell {
            padding: 0.65rem 0.7rem;
          }
          .ws-bill-tabs {
            grid-auto-columns: minmax(210px, 1fr);
          }
          .ws-bill-tab {
            padding: 0.72rem 0.78rem;
            grid-template-columns: 36px minmax(0, 1fr);
          }
          .ws-bill-tab-index {
            width: 36px;
            height: 36px;
          }
          .ws-workbook-top {
            padding: 0.75rem 0.7rem 0.65rem;
          }
          .ws-workbook-head {
            flex-direction: column;
            align-items: stretch;
          }
          .ws-workbook-console {
            min-width: 0;
            width: 100%;
          }
          .ws-workbook-metrics-compact {
            grid-template-columns: 1fr;
            gap: 0.55rem;
          }
          .ws-head-stat-card,
          .ws-head-stat-card-strong {
            padding: 0.85rem 0.9rem;
            border-radius: 16px;
          }
          .ws-workbook-actions {
            width: 100%;
            justify-content: stretch;
            gap: 0.5rem;
          }
          .ws-head-action,
          .ws-head-action-strong,
          .ws-analytics-toggle {
            width: 100%;
            justify-content: center;
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
            padding: 0.85rem 0.9rem 0.95rem;
            border-radius: 0 0 16px 16px;
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
          .ws-selection-tabbar-copy {
            width: 100%;
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
            margin: 0;
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
            display: flex;
            width: 100%;
            flex: 1 1 100%;
            justify-content: flex-start;
            overflow-x: auto;
            padding-bottom: 0.15rem;
            scrollbar-width: none;
          }
          .ws-toolbar-center::-webkit-scrollbar { display: none; }
          .ws-filter-group-compact {
            flex-wrap: nowrap;
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
            grid-template-columns: repeat(2, minmax(0, 1fr));
            margin: 0.05rem 0.7rem 0.75rem;
            padding: 0;
            background: transparent;
            border: none;
            gap: 0.55rem;
            overflow: visible;
          }
          .ws-mobile-stat-card {
            min-width: 0;
          }
          .ws-mobile-stat-card-total {
            grid-column: 1 / -1;
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
            padding: 0;
            gap: 0.65rem;
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


          /* --- Polish Refinements --- */
          .ws-table-row {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .ws-table-row:hover {
            background-color: #f8fafc !important;
            border: 1px solid rgba(147, 197, 253, 0.6) !important;
            box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04) !important;
            transform: translateY(-1px) !important;
            z-index: 10 !important;
          }
          .ws-table-row.selected {
            background: linear-gradient(90deg, #eff6ff 0%, #ffffff 100%) !important;
            border-left: 4px solid #2563eb !important;
            border-top: 1px solid rgba(59, 130, 246, 0.3) !important;
            border-bottom: 1px solid rgba(59, 130, 246, 0.3) !important;
            box-shadow: 0 8px 24px rgba(37, 99, 235, 0.08) !important;
          }
          .ws-table-cell {
            font-family: 'Inter', system-ui, sans-serif !important;
            letter-spacing: -0.01em;
          }
          .ws-rate-badge.benchmark { border: 1px solid #bfdbfe; background: linear-gradient(135deg, #eff6ff, #dbeafe) !important; }
          .ws-rate-badge.formula { border: 1px solid #ddd6fe; background: linear-gradient(135deg, #f5f3ff, #ede9fe) !important; }
          .ws-rate-badge.manual { border: 1px solid #bbf7d0; background: linear-gradient(135deg, #f0fdf4, #d1fae5) !important; }
          
          .ws-workspace-shell {
            gap: 1.15rem !important;
          }
          .ws-summary-strip {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
          }
          .ws-summary-headline {
            gap: 0.45rem !important;
          }
          .ws-summary-headline p {
            margin: 0 !important;
            font-size: 0.84rem !important;
            line-height: 1.55 !important;
            color: #64748b !important;
          }
          .ws-summary-metrics-row {
            gap: 0.9rem !important;
          }
          .ws-summary-metric {
            min-height: 122px !important;
            border-radius: 20px !important;
            padding: 1rem 1rem 0.95rem !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05) !important;
          }
          .ws-summary-metric strong {
            font-size: 1.34rem !important;
            padding-right: 1.45rem !important;
          }
          .ws-summary-metric-tertiary {
            background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%) !important;
            border-style: solid !important;
          }
          .ws-summary-metric-strong {
            background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%) !important;
            color: #ffffff !important;
            border-color: #1d4ed8 !important;
            box-shadow: 0 20px 40px rgba(29, 78, 216, 0.2) !important;
            transform: none !important;
          }
          .ws-summary-metric-strong strong { color: #ffffff !important; }
          .ws-summary-metric-strong small { color: rgba(255, 255, 255, 0.78) !important; }
          .ws-summary-metric-strong span:first-child { color: rgba(255, 255, 255, 0.82) !important; }
          .ws-summary-actions-row {
            padding-top: 0 !important;
            border-top: none !important;
          }
          .ws-sheet-tabbar-compact {
            padding: 0.38rem !important;
            border-radius: 18px !important;
            border: 1px solid #e2e8f0 !important;
            background: #f8fafc !important;
          }
          .ws-sheet-meta-chip {
            background: #ffffff !important;
            border: 1px solid #dbe4ee !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75) !important;
          }
          .ws-head-action,
          .ws-analytics-toggle {
            min-height: 42px !important;
            border-radius: 14px !important;
            box-shadow: 0 8px 16px rgba(15, 23, 42, 0.06) !important;
          }
          .ws-detail-dock {
            border: 1px solid #dbe4ee !important;
            border-radius: 28px !important;
            background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%) !important;
            box-shadow: 0 20px 46px rgba(15, 23, 42, 0.08) !important;
          }
          .ws-detail-dock-header {
            padding: 1.1rem 1.25rem !important;
            gap: 0.8rem !important;
            background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%) !important;
          }
          .ws-detail-dock-actions {
            gap: 0.5rem !important;
          }
          .ws-detail-empty {
            padding: 1.7rem !important;
            gap: 0.9rem !important;
            background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%) !important;
          }
          .ws-sheet-tools {
            padding: 0 !important;
            background: transparent !important;
            border-bottom: none !important;
            margin-top: 0.15rem !important;
          }
          .ws-formula-bar {
            border-radius: 18px 18px 0 0 !important;
            border-color: #dbe4ee !important;
            box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06) !important;
          }
          .ws-helper-strip {
            gap: 0.85rem !important;
            padding: 0.95rem 1rem 1rem !important;
            background: rgba(255, 255, 255, 0.96) !important;
            border: 1px solid #dbe4ee !important;
            border-top: none !important;
            border-radius: 0 0 18px 18px !important;
            box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06) !important;
          }
          .ws-helper-copy strong {
            font-size: 0.98rem !important;
            color: #0f172a !important;
          }
          .ws-helper-copy small {
            font-size: 0.77rem !important;
            line-height: 1.55 !important;
          }
          .ws-helper-chip {
            padding: 0.22rem 0.56rem !important;
            font-size: 0.58rem !important;
            border-radius: 999px !important;
          }
          .ws-helper-btn {
            min-height: 34px !important;
            border-radius: 10px !important;
            border: 1px solid #dbe4ee !important;
            background: #ffffff !important;
            box-shadow: 0 6px 12px rgba(15, 23, 42, 0.05) !important;
          }
          .ws-helper-btn:hover {
            transform: translateY(-1px);
            border-color: #bfdbfe !important;
            box-shadow: 0 10px 18px rgba(37, 99, 235, 0.08) !important;
          }
          .ws-table-wrap {
            margin-top: 0.2rem !important;
            background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%) !important;
            border: 1px solid #dbe4ee !important;
            border-radius: 26px !important;
            box-shadow: 0 22px 46px rgba(15, 23, 42, 0.06) !important;
            padding-bottom: 1rem !important;
          }
          .ws-column-letters {
            background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%) !important;
            border-bottom: 1px solid #dbe4ee !important;
          }
          .ws-table th {
            background: #f8fafc !important;
            color: #334155 !important;
            border-bottom: 2px solid #cbd5e1 !important;
            font-weight: 800 !important;
            letter-spacing: 0.05em !important;
            padding: 1rem !important;
          }
          .ws-table td {
            padding-top: 0.85rem !important;
            padding-bottom: 0.85rem !important;
          }
          .ws-item-row {
            transition: background 0.2s ease, box-shadow 0.2s ease !important;
            border-bottom: 1px solid #eef2f7 !important;
          }
          .ws-table tbody > tr.ws-item-row:nth-child(even) {
            background: linear-gradient(180deg, #fcfdff 0%, #fbfcfe 100%) !important;
          }
          .ws-item-row:hover {
            background-color: #f7fbff !important;
          }
          .ws-item-row.ws-item-row-selected {
            background: linear-gradient(90deg, rgba(219, 234, 254, 0.88) 0%, rgba(239, 246, 255, 0.96) 100%) !important;
            box-shadow: inset 4px 0 0 #2563eb, 0 12px 24px rgba(37, 99, 235, 0.08) !important;
          }
          .ws-item-row.ws-item-row-selected td {
            border-bottom: 1px solid #bfdbfe !important;
          }
          .ws-head-stat-card strong {
            font-size: 0.95rem;
            font-weight: 800;
            color: #0f172a;
          }
          .ws-compact-source-badge {
            margin-top: 0.35rem;
            padding: 0.15rem 0.35rem;
            font-size: 0.65rem;
            font-weight: 800;
            border-radius: 6px;
            cursor: pointer;
            border: 1px solid transparent;
            outline: none;
            width: fit-content;
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .ws-compact-source-benchmark { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
          .ws-compact-source-formula { background: #f5f3ff; color: #6d28d9; border-color: #ddd6fe; }
          .ws-compact-source-manual { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
          .ws-availability-pill {
            padding: 0.15rem 0.4rem !important;
            font-size: 0.62rem !important;
            border-radius: 999px !important;
            font-weight: 800 !important;
          }
          .ws-empty-section {
            padding: 2.5rem 1rem !important;
            background: #f8fafc !important;
            border: 1px dashed #cbd5e1 !important;
            border-radius: 16px !important;
          }
      `}</style>
    </div>
  );
};

export default BOQWorkspace;
