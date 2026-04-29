/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useToast } from '../components/ui/useToast';
import { useAuth } from './useAuth';
import { getMaterials } from '../db/database';
import {
  cloneCatalogItemToProjectItem,
  createCustomBoqItem,
  getStructureSectionCatalog,
} from '../data/boqCatalog';
import { buildCompanyKey, deriveCompanyName } from '../utils/companyAccess';
import { buildCustomPricingFromRateAnalysis, WORK_TYPE_LABELS } from '../utils/customPricing';
import {
  evaluateBoqFormulaRate,
  isFormulaDrivenItem,
  normalizeEditableInputs,
} from '../utils/boqFormulas';
import {
  applyBenchmarkRefreshToItem,
  buildAutoRateResult,
  buildMaterialRateIndex,
  getItemBenchmarkRefreshInsight,
  getItemBenchmarkEvidence,
  getItemUnitRate,
  getProjectBenchmarkRefreshAnalytics,
  getBenchmarkRegionalFactor,
  getEffectiveBenchmarkRate,
  getItemTotal,
  isBenchmarkOutlier,
  repriceSectionsForRegion,
  resolveItemRateSource,
} from '../utils/pricing';
import {
  startPresence,
  stopPresence,
  subscribeToPresence,
  subscribeToActivity,
} from '../db/collaborationService';

// ==========================================
// EXPORTED HELPERS
// ==========================================

export const buildSelectedCatalogItemMap = (sections = []) => (
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

export const buildBoqBuilderState = (project, sections = []) => {
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

export const sanitizeNonNegativeNumber = (value) => {
  if (value === '' || value === null || typeof value === 'undefined') {
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

const formatBenchmarkSyncLabel = (checkedAt) => {
  if (!checkedAt) return 'Not synced yet';
  const parsed = new Date(checkedAt);
  if (Number.isNaN(parsed.getTime())) return 'Recently synced';
  const now = new Date();
  const isSameDay = parsed.toDateString() === now.toDateString();
  return isSameDay
    ? `Synced today at ${parsed.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })}`
    : `Last synced ${parsed.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

// ==========================================
// CONTEXT
// ==========================================

const WorkspaceContext = createContext(null);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children, project, launchIntent, onLaunchIntentHandled, onUpdate, onAddSection, onExport, onDelete }) => {
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
  const sectionRowRefs = useRef({});
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

  useEffect(() => {
    if (!project?.id || !isCustomWorkspace) return;
    startPresence(project.id);
    const unsubPresence = subscribeToPresence(project.id, setPresenceUsers);
    return () => {
      stopPresence(project.id);
      unsubPresence();
    };
  }, [isCustomWorkspace, project?.id]);

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

  const syncBoqItemSnapshot = React.useCallback((item, section = null) => {
    const normalizedEditableInputs = normalizeEditableInputs(item.editableInputs).map((input) => ({
      ...input,
      value: input.value ?? input.defaultValue
    }));
    const itemWithInputs = { ...item, editableInputs: normalizedEditableInputs };
    const formulaRate = evaluateBoqFormulaRate(itemWithInputs);
    const formulaCalculatedRate = sanitizeNonNegativeNumber(formulaRate);
    const quantity = sanitizeNonNegativeNumber(item.quantity ?? item.qty);
    const benchmarkRate = sanitizeNonNegativeNumber(item.benchmarkRate ?? item.benchmark);
    const selectedRateSource = resolveItemRateSource(item);
    const manualRate = sanitizeNonNegativeNumber(item.manualRate ?? (selectedRateSource === 'manual' ? (item.unitRate ?? item.rate) : 0));
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
      selectedRateSource,
      formulaCalculatedRate,
      resolvedUnitRate,
      manualRate,
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
        calibrationFactor: item.benchmarkMetadata?.calibrationFactor || null,
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
  }, [project?.region, project?.structureType, project?.type]);

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
  ), [projectStructureType, syncBoqItemSnapshot]);

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

  const activateBenchmarkPricing = (sectionId, item) => {
    const regionalFactor = getBenchmarkRegionalFactor(item, project?.region || 'Lagos');

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
      if (targetSectionId && section.id !== targetSectionId) return section;

      let sectionChanged = false;
      const nextItems = (section.items || []).map((item) => {
        if (targetItemId && item.id !== targetItemId) return item;

        const insight = getItemBenchmarkRefreshInsight(item, { structureType, region, materialIndex });
        if (!insight?.actionable) return item;

        if (insight.needsReviewOnly) {
          reviewCount += 1;
          return item;
        }

        const nextItem = applyBenchmarkRefreshToItem(item, insight, region);
        if (nextItem === item) return item;

        sectionChanged = true;
        appliedCount += 1;

        if (insight.pricingMode === 'benchmark') benchmarkRateUpdates += 1;
        if (insight.preservesRate) referenceOnlyUpdates += 1;
        if (insight.benchmarkNowAvailable) newBenchmarkLinks += 1;

        return nextItem;
      });

      return sectionChanged ? { ...section, items: nextItems } : section;
    });

    return { updated, appliedCount, benchmarkRateUpdates, referenceOnlyUpdates, newBenchmarkLinks, reviewCount };
  };

  const applyBenchmarkRefresh = async ({ targetSectionId = null, targetItemId = null, scope = 'project' } = {}) => {
    const materialIndex = await loadMarketBenchmarks();
    if (!materialIndex) return;

    const {
      updated, appliedCount, benchmarkRateUpdates, referenceOnlyUpdates, newBenchmarkLinks, reviewCount
    } = buildBenchmarkRefreshResult(materialIndex, { targetSectionId, targetItemId });

    if (appliedCount <= 0) {
      if (reviewCount > 0) toast.warning(`${reviewCount} item${reviewCount === 1 ? '' : 's'} still need benchmark review before we refresh anything.`);
      else if (scope === 'item') toast.info('This item already matches the latest market benchmark.');
      else if (scope === 'section') toast.info('This section is already aligned with the latest benchmark library.');
      else toast.info('Project benchmarks already match the latest market library.');
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

  const refreshBenchmarks = async () => applyBenchmarkRefresh({ scope: 'project' });
  const refreshSectionBenchmarks = async (sectionId) => applyBenchmarkRefresh({ targetSectionId: sectionId, scope: 'section' });
  const refreshItemBenchmark = async (sectionId, itemId) => applyBenchmarkRefresh({ targetSectionId: sectionId, targetItemId: itemId, scope: 'item' });

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
      return { ...section, items: [...section.items, nextItem] };
    });
    setSections(updated);
    onUpdate(project.id, updated);
  };

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
        ...boqBuilder?.selectedCatalogItemIdsBySection,
        [sectionId]: normalizedCodes,
      },
    };

    setActiveBillSectionId(sectionId);
    persistBoqBuilderState(nextBuilder, sections);
  };

  const handleToggleCatalogSelection = (sectionId, code) => {
    const existingCodes = Array.isArray(boqBuilder?.selectedCatalogItemIdsBySection?.[sectionId])
      ? boqBuilder.selectedCatalogItemIdsBySection[sectionId]
      : [];
    const nextCodes = existingCodes.includes(code)
      ? existingCodes.filter((entry) => entry !== code)
      : [...existingCodes, code];

    updateSelectionForSection(sectionId, nextCodes);
  };

  const handleSelectVisibleCatalogItems = (sectionId, codes) => {
    const existingCodes = Array.isArray(boqBuilder?.selectedCatalogItemIdsBySection?.[sectionId])
      ? boqBuilder.selectedCatalogItemIdsBySection[sectionId]
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
    };

    focusSection(sectionId, { persist: false });
    persistBoqBuilderState(nextBuilder, sections);
  };

  const handleGenerateBoq = () => {
    const totalSelectedCatalogItems = Object.values(boqBuilder?.selectedCatalogItemIdsBySection || {}).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
    const hasGeneratedBoq = (sections || []).some((section) => (section.items || []).length > 0);

    if (totalSelectedCatalogItems <= 0) {
      toast.info('Pick at least one BOQ item before generating the sheet.');
      return;
    }

    const generatedBuilder = {
      ...(boqBuilder || buildBoqBuilderState(project, sections)),
      stage: 'workspace',
      activeBillSectionId: activeBillSectionId || sections[0]?.id || null,
      generatedAt: new Date().toISOString(),
    };
    const nextSections = buildSectionsFromSelection(sections, generatedBuilder);

    setSections(nextSections);
    persistBoqBuilderState(generatedBuilder, nextSections);
    toast.success(hasGeneratedBoq ? 'BOQ sheet updated from your selected items.' : 'BOQ sheet generated from the selected items.');
  };

  const returnToWorkspace = () => {
    const hasGeneratedBoq = (sections || []).some((section) => (section.items || []).length > 0);
    if (!hasGeneratedBoq) return;

    const nextBuilder = {
      ...(boqBuilder || buildBoqBuilderState(project, sections)),
      stage: 'workspace',
      activeBillSectionId: activeBillSectionId || sections[0]?.id || null,
      generatedAt: boqBuilder?.generatedAt || new Date().toISOString(),
    };

    persistBoqBuilderState(nextBuilder, sections);
  };

  const scrollToSection = (sectionId) => {
    focusSection(sectionId);
    const isSelectionStage = !isCustomWorkspace && boqBuilder?.stage === 'selection';
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

  const isSelectionStage = !isCustomWorkspace && boqBuilder?.stage === 'selection';
  const hasGeneratedBoq = (sections || []).some((section) => (section.items || []).length > 0);

  const isOutlier = React.useCallback((item, region = project?.region || 'Lagos') => {
    const benchmarkRate = getEffectiveBenchmarkRate(item, region);
    const unitRate = getItemUnitRate(item, region);
    return isBenchmarkOutlier(unitRate, benchmarkRate);
  }, [project?.region]);

  const workspaceVisibleSections = React.useMemo(() => {
    if (workspaceFilter === 'all') return sections || [];
    return (sections || []).filter((section) => {
      const hasMatch = (section.items || []).some((item) => {
        const query = searchQuery.toLowerCase();
        if (workspaceFilter === 'incomplete') return (item.qty || 0) <= 0 || (item.unitRate || 0) <= 0;
        if (workspaceFilter === 'outliers') return isOutlier(item, project?.region || 'Lagos');
        return (item.description || '').toLowerCase().includes(query) || (item.itemCode || '').toLowerCase().includes(query);
      });
      return hasMatch;
    });
  }, [isOutlier, project?.region, searchQuery, sections, workspaceFilter]);

  const selectionCountsBySection = React.useMemo(() => {
    const counts = {};
    Object.entries(boqBuilder?.selectedCatalogItemIdsBySection || {}).forEach(([sid, list]) => {
      counts[sid] = (list || []).length;
    });
    return counts;
  }, [boqBuilder?.selectedCatalogItemIdsBySection]);

  const sectionTotalsBySection = React.useMemo(() => {
    const totals = {};
    (sections || []).forEach((section) => {
      totals[section.id] = (section.items || []).reduce((sum, item) => sum + (getItemTotal(item, project?.region || 'Lagos') || 0), 0);
    });
    return totals;
  }, [sections, project?.region]);

  const calculateGrandTotal = React.useMemo(() => {
    return Object.values(sectionTotalsBySection).reduce((sum, val) => sum + val, 0);
  }, [sectionTotalsBySection]);

  const workspaceAnalytics = React.useMemo(() => {
    const allItems = (sections || []).flatMap((s) => s.items || []);
    const pricedItems = allItems.filter((i) => (getItemUnitRate(i, project?.region || 'Lagos') || 0) > 0);
    const totalItems = allItems.length;
    return {
      totalItems,
      pricedItems: pricedItems.length,
      pricingCoveragePercent: totalItems > 0 ? (pricedItems.length / totalItems) * 100 : 0,
      benchmarkItems: allItems.filter((i) => resolveItemRateSource(i) === 'benchmark').length,
      customItems: allItems.filter((i) => resolveItemRateSource(i) === 'manual').length,
    };
  }, [sections, project?.region]);

  const activeProjectSection = (sections || []).find((s) => s.id === activeBillSectionId);
  const activeSectionLineCount = (activeProjectSection?.items || []).length;
  const activeSectionPricedItems = (activeProjectSection?.items || []).filter((i) => (getItemUnitRate(i, project?.region || 'Lagos') || 0) > 0).length;
  const activeSectionPendingItems = activeSectionLineCount - activeSectionPricedItems;
  const totalSelectedCatalogItems = Object.values(selectionCountsBySection).reduce((sum, val) => sum + val, 0);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2'];

  const getAmountFormula = (item, unitRate) => {
    const qty = sanitizeNonNegativeNumber(item.qty);
    if (qty <= 0 || unitRate <= 0) return '';
    return `${qty.toLocaleString()} × N${unitRate.toLocaleString()}`;
  };

  const workspaceFilterOptions = [
    { id: 'all', label: 'All Items' },
    { id: 'active-bill', label: 'Active Bill' },
    { id: 'needs-pricing', label: 'Needs Review' },
    { id: 'formula', label: 'Formula Items' },
    { id: 'preliminaries', label: 'Preliminaries' },
  ];

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

  const formatEvidenceUpdatedLabel = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
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
    if (evidence.verifiedBy) detailParts.push(`Verified by ${evidence.verifiedBy}`);
    if (evidence.updatedAt) detailParts.push(`Updated ${formatEvidenceUpdatedLabel(evidence.updatedAt)}`);
    if (evidence.benchmarkBand) detailParts.push(`Band ${evidence.benchmarkBand}`);

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
      return { text: 'Price generated automatically.', tone: 'success' };
    }

    if (selectedRateSource === 'benchmark' && benchmarkRate <= 0) {
      return { text: 'No benchmark rate available - switch to custom pricing.', tone: 'warning' };
    }

    if (selectedRateSource === 'formula' && unitRate > 0) {
      return { text: 'Formula inputs are active and the amount is updating from the calculated rate.', tone: 'success' };
    }

    if (unitRate > 0) {
      const takeoffLabel = item?.takeoffMeta?.templateLabel;
      return {
        text: item.qtySource === 'calculated'
          ? `Measured from ${takeoffLabel || 'takeoff calculator'} and priced successfully.`
          : 'Quantity captured and amount updated successfully.',
        tone: 'success'
      };
    }

    return { text: 'Quantity saved. Complete pricing to unlock the amount.', tone: 'muted' };
  };

  const getCustomPricingSummary = (item) => {
    if (!item?.customPricing) return '';
    const segments = [];
    const workTypeLabel = WORK_TYPE_LABELS[item.customPricing.workType];
    if (workTypeLabel) segments.push(workTypeLabel);
    if (item.customPricing.pricingReference) segments.push(item.customPricing.pricingReference);
    if (item.customPricing.supplierQuote) segments.push(item.customPricing.supplierQuote);
    return segments.join(' | ');
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
          title: 'No benchmark rate available - switch to custom pricing',
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

    if (quantity <= 0) return { label: 'Quantity Needed', tone: 'warning' };
    if (selectedRateSource === 'benchmark' && benchmarkRate <= 0) return { label: 'Benchmark Missing', tone: 'warning' };
    if (selectedRateSource === 'benchmark') return { label: 'Benchmark Priced', tone: 'benchmark' };
    if (selectedRateSource === 'formula') return { label: 'Formula Ready', tone: 'calculated' };
    if (item.customPricing) return { label: 'Manual Override', tone: 'custom' };
    if (item.rateSource === 'calculated') return { label: 'Rate Analysed', tone: 'calculated' };
    if (unitRate > 0) return { label: 'Custom Priced', tone: 'manual' };
    return { label: 'Rate Required', tone: 'warning' };
  };


  const getQuantityDisplayValue = (item) => {
    const quantity = sanitizeNonNegativeNumber(item?.qty);
    if (quantity <= 0) return '0.00';
    return quantity.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const getQuantitySourceLabel = (item) => {
    if (item?.qtySource === 'calculated') {
      return item?.takeoffMeta?.templateLabel
        ? `Measured from ${item.takeoffMeta.templateLabel}`
        : 'Measured from takeoff';
    }
    return 'Project quantity';
  };

  const getRateSourceMeta = (item) => {
    const source = resolveItemRateSource(item);
    if (source === 'benchmark') {
      return { label: 'Benchmark', tone: 'benchmark', description: 'This item is priced from the market benchmark.' };
    }
    if (source === 'formula') {
      return { label: 'Formula', tone: 'calculated', description: 'This item is priced from saved formula inputs.' };
    }
    if (item?.customPricing) {
      return { label: 'Custom', tone: 'custom', description: 'This item uses a saved custom pricing breakdown.' };
    }
    if (item?.rateSource === 'calculated') {
      return { label: 'Analysed', tone: 'calculated', description: 'This item is priced from a rate analysis.' };
    }
    return { label: 'Manual', tone: 'manual', description: 'This item uses a manually entered unit rate.' };
  };

  const benchmarkSyncLabel = formatBenchmarkSyncLabel(benchmarkSyncState.checkedAt);

  const activeSheetLabel = viewMode === 'valuation' ? 'Valuation Sheet' : 'Estimate Sheet';

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

  const filteredSections = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const workspaceSections = activeBillSectionId
      ? workspaceVisibleSections.filter((section) => section.id === activeBillSectionId)
      : workspaceVisibleSections;

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

      if (!includeSection) return null;

      return {
        ...section,
        ...sectionMeta,
        items: nextItems,
        expanded: normalizedQuery || workspaceFilter === 'active-bill' ? true : section.expanded,
      };
    }).filter(Boolean);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBillSectionId, isOutlier, project?.region, projectStructureType, searchQuery, workspaceFilter, workspaceVisibleSections]);

  const filteredItemCount = React.useMemo(() => (
    (filteredSections || []).reduce((sum, section) => sum + (section.items || []).length, 0)
  ), [filteredSections]);

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

  const sectionLibraryCounts = React.useMemo(() => (
    Object.fromEntries(
      (sections || []).map((section) => ([
        section.id,
        getStructureSectionCatalog(projectStructureType, section.billSectionId)?.availableItems?.length || 0,
      ]))
    )
  ), [projectStructureType, sections]);

  const activeCatalogSection = activeProjectSection
    ? getStructureSectionCatalog(projectStructureType, activeProjectSection.billSectionId)
    : null;

  const activeSectionMeta = activeProjectSection ? getSectionUiMeta(activeProjectSection) : null;

  const selectedCatalogItemIdsBySection = boqBuilder?.selectedCatalogItemIdsBySection || {};

  const isFilteredView = Boolean(searchQuery?.trim()) || workspaceFilter !== 'all';
  const totalItems = workspaceAnalytics.totalItems;

  const totalColumnCount = 4;
  const sectionHeaderSpan = 4;
  const subtotalLeadingSpan = 2;

  const value = {
    // State
    sections, setSections,
    boqBuilder, setBoqBuilder,
    analyzingItem, setAnalyzingItem,
    customPricingItem, setCustomPricingItem,
    calculatingQtyForItem, setCalculatingQtyForItem,
    biddingItem, setBiddingItem,
    searchQuery, setSearchQuery,
    workspaceFilter, setWorkspaceFilter,
    viewMode, setViewMode,
    showStructuralAnalyzer, setShowStructuralAnalyzer,
    selectedCell, setSelectedCell,
    formulaItemContext, setFormulaItemContext,
    itemDetailPanelContext, setItemDetailPanelContext,
    activeBillSectionId, setActiveBillSectionId,
    _showAnalytics, _setShowAnalytics,
    showTeamHub, setShowTeamHub,
    presenceUsers, activityLog,
    benchmarkMaterialIndex, benchmarkSyncState,
    sectionRowRefs,
    
    // Derived Context Constants
    project,
    isCustomWorkspace,
    projectStructureType,
    marketRegionLabel,
    marketRegionDisplay,
    isSelectionStage,
    hasGeneratedBoq,
    workspaceVisibleSections,
    selectionCountsBySection,
    sectionTotalsBySection,
    calculateGrandTotal,
    workspaceAnalytics,
    activeProjectSection,
    activeSectionLineCount,
    activeSectionPricedItems,
    activeSectionPendingItems,
    totalSelectedCatalogItems,
    AVATAR_COLORS,
    benchmarkSyncLabel,
    activeSheetLabel,
    filteredSections,
    filteredItemCount,
    isFilteredView,
    totalItems,
    workspaceFilterOptions,
    totalColumnCount,
    sectionHeaderSpan,
    subtotalLeadingSpan,
    benchmarkRefreshAnalytics,
    sectionLibraryCounts,
    activeSectionMeta,
    activeCatalogSection,
    selectedCatalogItemIdsBySection,
    
    // Handlers & Helpers
    loadMarketBenchmarks,
    toggleSection,
    updateSectionTitle,
    persistBoqBuilderState,
    updateItem,
    handleQuantityChange,
    handleCompletedQuantityChange,
    handleRateApply,
    handleCustomPricingSave,
    handleManualRateChange,
    handleRateSourceChange,
    openItemDetailPanel,
    openDetailedAnalysis,
    openCustomPricingStudio,
    activateCustomPricing,
    activateBenchmarkPricing,
    handleStructuralImport,
    handleRegionChange,
    _autoRateProject,
    applyBenchmarkRefresh,
    refreshBenchmarks,
    refreshSectionBenchmarks,
    refreshItemBenchmark,
    toggleVO,
    addItemToSection,
    duplicateItem,
    addItemBelow,
    focusSection,
    updateSelectionForSection,
    handleToggleCatalogSelection,
    handleSelectVisibleCatalogItems,
    handleClearCatalogSelection,
    enterSelectionStage,
    handleGenerateBoq,
    returnToWorkspace,
    scrollToSection,
    openFormulaEditor,
    handleFormulaInputsSave,
    getInitials,
    getAmountFormula,
    getRateSourceMeta,
    getBenchmarkDeltaMeta,
    getBenchmarkEvidenceMeta,
    getQuantityFeedbackMeta,
    getAutomationMeta,
    getItemStatusMeta,
    getQuantityDisplayValue,
    getQuantitySourceLabel,
    getSectionUiMeta,
    getRateOptionAvailability,
    isOutlier,
    getManualRateValue,
    sanitizeNonNegativeNumber,
    onUpdate,
    onAddSection,
    onExport,
    onDelete,
    toast,
    user,
  };



  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
