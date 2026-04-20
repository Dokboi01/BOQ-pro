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
  X
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
  const [showAnalytics, setShowAnalytics] = useState(false);

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
    // Manual rate â€” prefer explicit manualRate field
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
    ].filter(Boolean).join(' Â· ');

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

    return segments.join(' â€¢ ');
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
        text: 'No benchmark rate available â€” switch to custom pricing.',
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
          title: 'No benchmark rate available â€” switch to custom pricing',
          detail: `This item is not yet covered by the ${marketRegionLabel} market benchmark.`,
          tone: 'warning'
        };
      }

      return {
        title: 'Auto-priced using current market benchmark',
        detail: `Amount = Quantity Ã— ${marketRegionLabel} market benchmark.`,
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

    return `Amount = ${quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} Ã— â‚¦${rate.toLocaleString()}`;
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
  const totalQuantity = workspaceAnalytics.totalQuantity;

  const totalItems = workspaceAnalytics.totalItems;
  const totalColumnCount = viewMode === 'valuation' ? 9 : 7;
  const sectionHeaderSpan = viewMode === 'valuation' ? 8 : 6;
  const subtotalLeadingSpan = viewMode === 'valuation' ? 6 : 4;
  const benchmarkSyncLabel = formatBenchmarkSyncLabel(benchmarkSyncState.checkedAt);
  const filteredSectionCount = filteredSections.length;
  const filteredItemCount = filteredSections.reduce((sum, section) => sum + ((section.items || []).length), 0);
  const visibleGrandTotal = filteredSections.reduce((sum, section) => (
    sum + (section.items || []).reduce((itemSum, item) => itemSum + getItemTotal(item, project?.region || 'Lagos'), 0)
  ), 0);
  const isFilteredView = Boolean(searchQuery?.trim()) || workspaceFilter !== 'all';
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
  const activeSectionLineCount = activeProjectSection ? (activeProjectSection.items || []).length : 0;
  const activeSectionPricedItems = Math.max(activeSectionLineCount - activeSectionPendingItems, 0);
  const activeCatalogSelectionCount = selectionCountsBySection?.[activeBillSectionId] || 0;
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
        { key: 'rate', letter: 'E', label: 'Unit Rate' },
        { key: 'amount', letter: 'F', label: 'Amount' },
        { key: 'actions', letter: 'G', label: 'Actions' },
      ];
  const spreadsheetColumnTemplate = viewMode === 'valuation'
    ? '76px minmax(480px, 4.9fr) 92px 138px 96px 104px 150px 160px 72px'
    : '76px minmax(560px, 5.8fr) 92px 138px 210px 170px 72px';

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

  const renderBillTabs = (mode = 'workspace') => (
    <div className={`ws-bill-tabs-shell ${mode === 'selection' ? 'selection' : 'workspace'}`}>
      <div className="ws-bill-tabs">
        {(mode === 'selection' ? (sections || []) : workspaceVisibleSections).map((section, index) => {
          const isActive = activeBillSectionId === section.id;
          const sectionTotal = sectionTotalsBySection?.[section.id] || 0;
          const selectionCount = selectionCountsBySection?.[section.id] || 0;
          const itemCount = (section.items || []).length;
          const meta = mode === 'selection'
            ? `${selectionCount} selected`
            : `${itemCount} line${itemCount === 1 ? '' : 's'}${sectionTotal > 0 ? ` Â· N${sectionTotal.toLocaleString()}` : ''}`;

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
            <div className="ws-summary-strip">
              <div className="ws-summary-headline">
                <span className="ws-workbook-eyebrow">BOQ-Pro Workbook</span>
                <div className="ws-summary-title-row">
                  <h1>{project?.name || 'Untitled Project'}</h1>
                  <span className={`ws-workbook-health ws-workbook-health-${benchmarkWorkspaceHealth.tone}`}>
                    {benchmarkWorkspaceHealth.label}
                  </span>
                </div>
                <p>{workbookSubtitle} | {marketRegionDisplay} market benchmark | {activeSheetLabel}</p>
              </div>
              <div className="ws-summary-metrics-row">
                <article className="ws-summary-metric ws-summary-metric-secondary">
                  <span className="ws-summary-badge">Current</span>
                  <span>Active Bill</span>
                  <strong>{activeProjectSection?.title || 'No active bill'}</strong>
                  <small>{activeSectionLineCount} line{activeSectionLineCount === 1 ? '' : 's'} Â· {activeCatalogSelectionCount} selected</small>
                </article>
                <article className="ws-summary-metric ws-summary-metric-secondary">
                  <span>Bill Subtotal</span>
                  <strong>N{activeSectionSubtotal.toLocaleString()}</strong>
                  <small>{activeSectionPendingItems > 0 ? `${activeSectionPendingItems} pending pricing review` : 'Current bill fully priced'}</small>
                </article>
                <article className="ws-summary-metric ws-summary-metric-tertiary">
                  <span>Pricing Coverage</span>
                  <strong>{workspaceAnalytics.pricingCoveragePercent.toFixed(0)}%</strong>
                  <small>{workspaceAnalytics.pricedItems}/{workspaceAnalytics.totalItems} items priced</small>
                </article>
                <article className="ws-summary-metric ws-summary-metric-strong">
                  <span className="ws-summary-badge ws-summary-badge-strong">Total</span>
                  <span>Project Grand Total</span>
                  <strong>N{calculateGrandTotal.toLocaleString()}</strong>
                  <small>{marketRegionDisplay} basis Â· {workspaceAnalytics.benchmarkItems} benchmark-backed items</small>
                </article>
              </div>
              <div className="ws-summary-actions-row">
                <div className="ws-sheet-tabbar ws-sheet-tabbar-compact">
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
                <div className="ws-summary-actions">
                  <button className={`ws-analytics-toggle ${showAnalytics ? 'active' : ''}`} onClick={() => setShowAnalytics(!showAnalytics)}>
                    {showAnalytics ? 'Hide Analytics' : 'Workspace Analytics'}
                  </button>
                  <button className="ws-head-action" onClick={() => enterSelectionStage(activeBillSectionId || sections[0]?.id)}>
                    <Plus size={13} /> Edit BOQ Selection
                  </button>
                  <button className="ws-head-action ws-head-action-strong" onClick={refreshBenchmarks}>
                    <RefreshCcw size={13} /> Refresh Benchmarks
                  </button>
                </div>
              </div>
            </div>
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
          <div className="ws-workbook-console">
            <div className="ws-workbook-metrics-compact">
              <article className="ws-head-stat-card">
                <span>Active Bill</span>
                <strong>{activeProjectSection?.title || 'No active bill'}</strong>
                <small>{activeSectionLineCount} line{activeSectionLineCount === 1 ? '' : 's'} Â· {activeCatalogSelectionCount} selected for this bill</small>
              </article>
              <article className="ws-head-stat-card">
                <span>Pricing Coverage</span>
                <strong>{workspaceAnalytics.pricingCoveragePercent.toFixed(0)}%</strong>
                <small>{workspaceAnalytics.pricedItems}/{workspaceAnalytics.totalItems} items priced Â· {activeSectionPendingItems} pending in active bill</small>
              </article>
              <article className="ws-head-stat-card ws-head-stat-card-strong">
                <span>Project Total</span>
                <strong>N{calculateGrandTotal.toLocaleString()}</strong>
                <small>{marketRegionDisplay} market basis Â· {workspaceAnalytics.benchmarkItems} benchmark-backed items</small>
              </article>
            </div>
            <div className="ws-workbook-actions">
              <button className={`ws-analytics-toggle ${showAnalytics ? 'active' : ''}`} onClick={() => setShowAnalytics(!showAnalytics)}>
                {showAnalytics ? 'Hide Analytics Dashboard' : 'Workspace Metrics & Analytics'}
              </button>
              <button
                className="ws-head-action"
                onClick={() => enterSelectionStage(activeBillSectionId || sections[0]?.id)}
              >
                <Plus size={13} /> Edit BOQ Selection
              </button>
              <button className="ws-head-action ws-head-action-strong" onClick={refreshBenchmarks}>
                <RefreshCcw size={13} /> Refresh Benchmarks
              </button>
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
      {renderBillTabs('workspace')}
      <div className="ws-workspace-command-center">
      {workspaceFilter === '__hide__' ? (
      <div className="ws-cost-rail">
        <div className="ws-cost-card">
          <span className="ws-cost-label">Active Bill</span>
          <strong className="ws-cost-value">{activeProjectSection?.title || 'No active bill'}</strong>
          <small className="ws-cost-meta">
            {activeProjectSection
              ? `${activeSectionLineCount} line${activeSectionLineCount === 1 ? '' : 's'} Â· Qty ${activeSectionQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : 'Choose a bill section to start measuring'}
          </small>
        </div>
        <div className="ws-cost-card">
          <span className="ws-cost-label">Bill Progress</span>
          <strong className="ws-cost-value">{activeSectionPricedItems}/{activeSectionLineCount || 0}</strong>
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
            {filteredSectionCount} visible bill{filteredSectionCount === 1 ? '' : 's'} Â· {filteredItemCount} visible item{filteredItemCount === 1 ? '' : 's'}
          </small>
        </div>
        <div className="ws-cost-card ws-cost-card-total">
          <span className="ws-cost-label">Project Grand Total</span>
          <strong className="ws-cost-value">N{calculateGrandTotal.toLocaleString()}</strong>
          <small className="ws-cost-meta">
            {project?.region || 'Lagos'} market basis Â· {workspaceAnalytics.totalItems} measured item{workspaceAnalytics.totalItems === 1 ? '' : 's'}
          </small>
        </div>
      </div>
      ) : null}

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
                <strong>{selectedItemContext.itemCode} Â· {selectedItemContext.item.name || selectedItemContext.item.description || 'Untitled BOQ item'}</strong>
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
                <button className="ws-helper-btn" onClick={() => enterSelectionStage(activeBillSectionId || sections[0]?.id)}>
                  <Plus size={12} /> Edit BOQ Selection
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

      {showAnalytics && (
        <>
        <div className="ws-analytics-board">
      <div className="ws-insight-strip">
        <div className="ws-insight-card ws-insight-card-strong">
          <span className="ws-insight-label">Pricing Coverage</span>
          <strong className="ws-insight-value">{workspaceAnalytics.pricingCoveragePercent.toFixed(0)}%</strong>
          <p className="ws-insight-copy">
            {workspaceAnalytics.pricedItems} of {workspaceAnalytics.totalItems} items priced
            {workspaceAnalytics.benchmarkItems > 0 ? ` Â· ${workspaceAnalytics.benchmarkItems} auto-priced from benchmark` : ''}
            {workspaceAnalytics.unpricedItems > 0 ? ` Â· ${workspaceAnalytics.unpricedItems} still need review` : ' Â· full coverage reached'}
          </p>
        </div>
        <div className="ws-insight-card">
          <span className="ws-insight-label">Benchmark Automation</span>
          <strong className="ws-insight-value">
            {workspaceAnalytics.benchmarkItems} live Â· {workspaceAnalytics.customItems} override
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
                {' Â· '}
                {benchmarkRefreshAnalytics.referenceOnlyUpdates} custom/manual item{benchmarkRefreshAnalytics.referenceOnlyUpdates === 1 ? '' : 's'} will keep their current rate
                {benchmarkRefreshAnalytics.reviewItems > 0 ? ` Â· ${benchmarkRefreshAnalytics.reviewItems} still need manual benchmark review` : ''}
                {benchmarkSyncLabel ? ` Â· checked ${benchmarkSyncLabel}` : ''}
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
          <div className="ws-stat-compact"><span className="ws-stat-label">Region</span>
            <select className="ws-region-sel-compact" value={project?.region || 'Lagos'} onChange={(e) => handleRegionChange(e.target.value)}>
              <option value="Lagos">Lagos</option>
              <option value="Abuja">Abuja</option>
              <option value="Port_Harcourt">Port Harcourt</option>
              <option value="Ibadan">Ibadan</option>
              <option value="Kano">Kano</option>
            </select>
          </div>
          <div className="ws-filter-group-compact">
            {workspaceFilterOptions.map((filterOption) => (
              <button
                key={filterOption.id}
                type="button"
                className={`ws-filter-chip-compact ${workspaceFilter === filterOption.id ? 'active' : ''}`}
                onClick={() => setWorkspaceFilter(filterOption.id)}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
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
      </>
      )}
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
          <strong>â‚¦{calculateGrandTotal.toLocaleString()}</strong>
        </div>
      </div>

      {workspaceFilter === '__hide__' ? (
        <>
        <div className="ws-analytics-board">
      <div className="ws-insight-strip">
        <div className="ws-insight-card ws-insight-card-strong">
          <span className="ws-insight-label">Pricing Coverage</span>
          <strong className="ws-insight-value">{workspaceAnalytics.pricingCoveragePercent.toFixed(0)}%</strong>
          <p className="ws-insight-copy">
            {workspaceAnalytics.pricedItems} of {workspaceAnalytics.totalItems} items priced
            {workspaceAnalytics.benchmarkItems > 0 ? ` Â· ${workspaceAnalytics.benchmarkItems} auto-priced from benchmark` : ''}
            {workspaceAnalytics.unpricedItems > 0 ? ` Â· ${workspaceAnalytics.unpricedItems} still need review` : ' Â· full coverage reached'}
          </p>
        </div>
        <div className="ws-insight-card">
          <span className="ws-insight-label">Benchmark Automation</span>
          <strong className="ws-insight-value">
            {workspaceAnalytics.benchmarkItems} live Â· {workspaceAnalytics.customItems} override
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
                {' Â· '}
                {benchmarkRefreshAnalytics.referenceOnlyUpdates} custom/manual item{benchmarkRefreshAnalytics.referenceOnlyUpdates === 1 ? '' : 's'} will keep their current rate
                {benchmarkRefreshAnalytics.reviewItems > 0 ? ` Â· ${benchmarkRefreshAnalytics.reviewItems} still need manual benchmark review` : ''}
                {benchmarkSyncLabel ? ` Â· checked ${benchmarkSyncLabel}` : ''}
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
                <strong>{selectedItemContext.itemCode} Â· {selectedItemContext.item.description || 'Untitled BOQ item'}</strong>
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
                <button className="ws-helper-btn" onClick={() => enterSelectionStage(activeBillSectionId || sections[0]?.id)}>
                  <Plus size={12} /> Edit BOQ Selection
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
              ? `${(activeProjectSection.items || []).length} line${(activeProjectSection.items || []).length === 1 ? '' : 's'} Â· Qty ${activeSectionQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
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
            {filteredSectionCount} visible bill{filteredSectionCount === 1 ? '' : 's'} Â· {filteredItemCount} visible item{filteredItemCount === 1 ? '' : 's'}
          </small>
        </div>
        <div className="ws-cost-card ws-cost-card-total">
          <span className="ws-cost-label">Project Grand Total</span>
          <strong className="ws-cost-value">N{calculateGrandTotal.toLocaleString()}</strong>
          <small className="ws-cost-meta">
            {project?.region || 'Lagos'} market basis Â· {workspaceAnalytics.totalItems} measured item{workspaceAnalytics.totalItems === 1 ? '' : 's'}
          </small>
        </div>
      </div>
        </>
      ) : null}

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
              ) : null}
              <th className="ws-th-rate">Rate (â‚¦)</th>
              <th className="ws-th-total">Amount (â‚¦)</th>
              <th className="ws-th-act"></th>
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
                        {!section.expanded && (
                          <span className="ws-section-total">â‚¦{sectionSubtotal.toLocaleString()}</span>
                        )}
                      </div>
                    </td>
                    <td className="ws-act-cell">
                      {getStructureSectionCatalog(projectStructureType, section.billSectionId) && (
                        <button
                          className="ws-btn-icon ws-btn-library"
                          onClick={(e) => {
                            e.stopPropagation();
                            enterSelectionStage(section.id);
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
                          <div className="ws-item-heading-row">
                            <div className="ws-item-heading-copy">
                              <strong className="ws-item-name">{item.name || item.description || 'Untitled BOQ item'}</strong>
                              <span className="ws-item-code-pill">{item.code || itemCode}</span>
                            </div>
                            <div className="ws-item-indicators">
                              <span className={`ws-state-pill ws-state-pill-${itemStatusMeta.tone}`}>{itemStatusMeta.label}</span>
                              {hasFormulaOption && <span className="ws-availability-pill ws-availability-pill-formula">Formula</span>}
                              {hasBenchmarkRate && <span className="ws-availability-pill ws-availability-pill-benchmark">Benchmark</span>}
                            </div>
                          </div>
                          <div className="ws-desc-inner">
                            {item.isVO && <span className="ws-vo">VO</span>}
                            <textarea
                              rows={2}
                              className="ws-input ws-desc-input"
                              value={item.description}
                              onChange={(e) => updateItem(section.id, item.id, 'description', e.target.value)}
                              onFocus={() => selectWorkspaceCell({ sectionId: section.id, itemId: item.id, columnKey: 'description', itemCode, rowNumber: spreadsheetRowNumber })}
                            />
                            {outlier && <AlertCircle size={11} className="ws-outlier-icon" title="Rate variance detected" />}
                          </div>
                          <div className="ws-item-secondary">
                            {item.subcategory ? `Subcategory: ${item.subcategory}` : 'Description focused row editing'}
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
                        ) : null}
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
                                Benchmark: â‚¦{Math.round(benchmarkRate).toLocaleString()}
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
                              <span className="ws-benchmark-override-label">Benchmark (â‚¦):</span>
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
                          <strong className="ws-total-main">â‚¦{itemTotal.toLocaleString()}</strong>
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
                                <strong>â‚¦{itemTotal.toLocaleString()}</strong>
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
                          Section Total Â· Qty {sectionQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} Â· Amount â‚¦{sectionSubtotal.toLocaleString()}
                        </td>
                        <td></td>
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
              <td colSpan={viewMode === 'valuation' ? 7 : 6}>CONTRACT SUM</td>
              <td className="ws-grand-val">â‚¦{calculateGrandTotal.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <ProjectNotesAccordion
          project={project}
          onChange={(updates) => onUpdate(project.id, sections, project.region, updates)}
        />
      </div>
          </div>
          <aside className={`ws-detail-dock right-panel ${selectedItemContext ? 'has-selection' : 'is-empty'}`}>
            {selectedItemContext ? (
              <>
                <div className="ws-detail-dock-header">
                  <div className="ws-detail-dock-copy">
                    <span className="ws-detail-dock-eyebrow">Selected Row</span>
                    <strong>{selectedItemContext.itemCode} Â· {selectedItemContext.item.name || selectedItemContext.item.description || 'Untitled BOQ item'}</strong>
                    <small>
                      {selectedItemContext.section.title} Â· Qty {selectedItemContext.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} Â· Rate N{selectedItemContext.unitRate.toLocaleString()} Â· Amount N{selectedItemContext.total.toLocaleString()}
                    </small>
                  </div>
                  <div className="ws-detail-dock-actions">
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
                        fx Formula
                      </button>
                    )}
                    <button
                      className="ws-helper-btn"
                      onClick={() => openDetailedAnalysis(selectedItemContext.section.id, selectedItemContext.item)}
                    >
                      <Pencil size={12} /> Analysis
                    </button>
                    <button
                      className="ws-helper-btn"
                      onClick={() => setSelectedCell(null)}
                    >
                      Clear
                    </button>
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
                  onOpenFormulaEditor={isFormulaDrivenItem(selectedItemContext.item) ? () => openFormulaEditor(selectedItemContext.section.id, selectedItemContext.item) : null}
                />
              </>
            ) : (
              <div className="ws-detail-empty">
                <span className="ws-detail-empty-eyebrow">Item Intelligence Panel</span>
                <strong>Select a BOQ row to inspect its pricing logic.</strong>
                <p>
                  Formula text, pricing basis, benchmark metadata, worked examples, and notes will appear here
                  without cluttering the main estimate sheet.
                </p>
                <div className="ws-detail-empty-actions">
                  <button className="ws-btn ws-btn-primary" onClick={() => enterSelectionStage(activeBillSectionId || sections[0]?.id)}>
                    <Plus size={14} /> Edit Bill Selection
                  </button>
                  <button className="ws-btn ws-btn-ghost" onClick={refreshBenchmarks}>
                    <RefreshCcw size={14} /> Refresh Benchmarks
                  </button>
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
            onOpenFormulaEditor={isFormulaDrivenItem(panelItem) ? () => { setItemDetailPanelContext(null); openFormulaEditor(itemDetailPanelContext.sectionId, panelItem); } : null}
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
          /* --- WORKSPACE CORE LAYOUT --- */
          .ws-workspace-shell {
            display: grid;
            grid-template-columns: 280px minmax(0, 1fr) 360px;
            height: 100vh;
            overflow: hidden;
            background: #f8fafc;
          }
          .ws-main-pane {
            display: flex;
            flex-direction: column;
            min-width: 0;
            height: 100vh;
            overflow-y: auto;
            position: relative;
            background: #ffffff;
          }
          .ws-main-pane::-webkit-scrollbar { width: 6px; }
          .ws-main-pane::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

          /* --- WORKBOOK HEADER --- */
          .ws-workbook-top {
            padding: 0.6rem 1rem;
            background: linear-gradient(180deg, #f8fbff 0%, #f1f5f9 100%);
            border-bottom: 1px solid #e2e8f0;
            flex-shrink: 0;
          }
          .ws-workbook-title-row h1 {
            font-size: 1.1rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }
          .ws-head-stat-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 0.4rem 0.6rem;
            min-width: 140px;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .ws-head-stat-card span { font-size: 0.55rem; font-weight: 800; color: #64748b; text-transform: uppercase; }
          .ws-head-stat-card strong { font-size: 0.9rem; font-weight: 800; color: #0f172a; }
          .ws-head-stat-card small { font-size: 0.58rem; color: #94a3b8; }

          /* --- TABLE COMPACT STYLING --- */
          .ws-table-wrap {
            padding: 0;
            overflow-x: auto;
          }
          .ws-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.8rem;
            table-layout: fixed;
            min-width: 1200px;
          }
          .ws-table thead {
            position: sticky;
            top: 0;
            z-index: 20;
            background: #f8fafc;
            box-shadow: 0 1px 0 #e2e8f0;
          }
          .ws-table th {
            padding: 0.4rem 0.6rem;
            background: #f8fafc;
            color: #64748b;
            font-size: 0.58rem;
            font-weight: 800;
            text-transform: uppercase;
            border-bottom: 2px solid #e2e8f0;
            border-right: 1px solid #f1f5f9;
          }
          .ws-item-row td {
            padding: 0.35rem 0.55rem;
            vertical-align: middle;
            border-bottom: 1px solid #f1f5f9;
            border-right: 1px solid #f1f5f9;
            background: white;
          }
          .ws-item-row:hover td { background: #f8fafc; }
          .ws-item-row-selected td {
            background: #f0f7ff !important;
            border-bottom-color: #bfdbfe;
          }

          /* --- DESCRIPTOR COLUMN --- */
          .ws-th-desc, .ws-desc {
            width: 340px;
            max-width: 340px;
            min-width: 340px;
            position: sticky;
            left: 76px;
            z-index: 5;
            background: inherit;
          }
          .ws-desc-input {
            width: 100%;
            font-size: 0.8rem;
            font-weight: 600;
            min-height: 2rem;
            max-height: 120px;
            border: 1px solid transparent;
            background: transparent;
            resize: vertical;
            padding: 2px 4px;
          }
          .ws-item-row:hover .ws-desc-input,
          .ws-item-row-selected .ws-desc-input {
            background: white;
            border-color: #e2e8f0;
          }

          /* --- NUMERIC / UTILITY COLUMNS --- */
          .ws-th-num, .ws-num { width: 76px; position: sticky; left: 0; z-index: 6; background: inherit; }
          .ws-row-number { font-size: 0.55rem; color: #94a3b8; font-weight: 800; }
          .ws-line-code { font-size: 0.68rem; color: #1e293b; font-weight: 800; }

          /* --- MOBILE / ANALYTICS (HIDDEN IN COMPACT) --- */
          .ws-analytics-board { display: none; }
          
          /* --- BTNS & PILLS --- */
          .ws-state-pill {
            padding: 0.12rem 0.4rem;
            font-size: 0.52rem;
            font-weight: 900;
            border-radius: 999px;
            text-transform: uppercase;
          }
          .ws-state-pill-benchmark { background: #eff6ff; color: #1d4ed8; }
          .ws-state-pill-warning { background: #fff7ed; color: #c2410c; }
          
          .ws-btn {
            padding: 0.35rem 0.6rem;
            font-size: 0.65rem;
            font-weight: 800;
            border-radius: 8px;
            cursor: pointer;
          }
      `}</style>
    </div>
  );
};

export default BOQWorkspace;


