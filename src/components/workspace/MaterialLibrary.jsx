import React, { useState } from 'react';
import { useToast } from '../ui/useToast';
import {
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  Info,
  Edit2,
  ArrowRight,
  SearchCheck,
  AlertCircle,
  Activity,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { hasFeature } from '../../data/plans';
import { getMaterials, getMarketIndices, addMaterial, updateMaterial, deleteMaterial } from '../../db/database';
import { Loader2 } from 'lucide-react';
import {
  buildMaterialBenchmarkHistoryEntry,
  buildMaterialApprovedSnapshotEntry,
  getMaterialApprovalSnapshotComparison,
  getMaterialBenchmarkGovernance,
  getMaterialRegionalBenchmark,
  normalizeMaterialBenchmarkRecord
} from '../../utils/materialBenchmarks';

const MANAGED_REGIONS = ['Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Enugu', 'Ibadan'];

const getRegionFieldName = (region) => `region_rate_${String(region).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

const getManagedRegions = (material, activeRegion) => (
  Array.from(new Set([
    activeRegion,
    ...MANAGED_REGIONS,
    ...Object.keys(material?.regionRates || material?.regions || {})
  ].filter(Boolean)))
);

const toDateInputValue = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const toIsoDateFromInput = (value) => {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const buildMaterialBenchmarkEvidence = (material, activeRegion) => ({
  mode: activeRegion === 'Lagos' ? 'lagos-exact' : 'exact-region',
  sourceCount: Number(material?.sourceCount) || 0,
  sources: Array.isArray(material?.sources)
    ? material.sources.map((source) => source.label).filter(Boolean).slice(0, 4)
    : [],
  verifiedBy: material?.verifiedBy || 'Quantra Market Review',
  updatedAt: material?.updatedAt || null,
  benchmarkBand: material?.benchmarkBand || material?.range || '',
  exactRegions: Object.keys(material?.regionRates || material?.regions || {}),
  matchSource: 'material-library',
  matchedMaterialCount: 1
});

const formatBenchmarkTimelineStamp = (value) => {
  if (!value) return 'Recent update';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recent update';

  return parsed.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatSnapshotDeltaLabel = (comparison) => {
  if (!comparison || !Number.isFinite(comparison.deltaPercent)) return 'Approved baseline pending';
  if (Math.abs(comparison.deltaPercent) < 0.5) return 'Aligned with approved snapshot';
  return `${comparison.deltaPercent > 0 ? '+' : ''}${comparison.deltaPercent.toFixed(1)}% vs approved snapshot`;
};

const MaterialLibrary = ({ user, activeProject, onUpdate, onUpgrade }) => {
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [marketIndices, setMarketIndices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isManageMode, setIsManageMode] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const toast = useToast();
  const activeRegionLabel = activeProject?.region || 'Lagos';

  const getRegionalBenchmark = (material) => Number(
    getMaterialRegionalBenchmark(material, activeRegionLabel)
  );

  const getBenchmarkDriftMeta = (material) => {
    const benchmark = getRegionalBenchmark(material);
    const marketRead = Number(material?.price || 0);

    if (!benchmark || !marketRead) {
      return {
        label: 'Benchmark band pending',
        tone: 'pending'
      };
    }

    const delta = ((marketRead - benchmark) / benchmark) * 100;
    const flagged = Math.abs(delta) >= 5;

    return {
      label: flagged ? 'Benchmark drift flag' : 'Within benchmark band',
      tone: flagged ? 'flagged' : 'aligned',
      delta
    };
  };

  const defaultMaterials = React.useMemo(() => [
    {
      id: 1,
      name: 'OPC Cement (50kg)',
      category: 'Binder',
      price: 12500,
      unit: 'Bag',
      trend: 'up',
      benchmark: 11800,
      range: '₦11,200 - ₦13,500',
      lastUpdated: '2 hours ago',
      delta: '+4.2%',
      history: [11000, 11500, 11800, 12500],
      usage: 'Primary binder for all concrete works, plastering, and block making.',
      regions: { 'Lagos': 12500, 'Abuja': 13200, 'Port Harcourt': 12900, 'Kano': 13800, 'Enugu': 13000 }
    },
    {
      id: 2,
      name: 'Reinforcement Steel (12mm)',
      category: 'Metal',
      price: 1150000,
      unit: 'Ton',
      trend: 'down',
      benchmark: 1200000,
      range: '₦1,120,000 - ₦1,250,000',
      lastUpdated: '1 week ago',
      delta: '-2.1%',
      history: [1250000, 1220000, 1200000, 1150000],
      usage: 'High-tensile reinforcement for structural concrete elements.',
      regions: { 'Lagos': 1150000, 'Abuja': 1180000, 'Port Harcourt': 1175000, 'Kano': 1200000 }
    },
    {
      id: 3,
      name: 'Sharp Sand (Clean)',
      category: 'Aggregates',
      price: 28000,
      unit: 'Ton',
      trend: 'stable',
      benchmark: 28000,
      range: '₦26,000 - ₦30,000',
      lastUpdated: '3 days ago',
      delta: '0.0%',
      history: [27500, 28000, 28000, 28000],
      usage: 'Essential for concrete production and mortar mixes.',
      regions: { 'Lagos': 28000, 'Abuja': 30000, 'Port Harcourt': 29000, 'Ibadan': 26000 }
    },
    {
      id: 4,
      name: 'Granite (20mm)',
      category: 'Aggregates',
      price: 35000,
      unit: 'Ton',
      trend: 'up',
      benchmark: 32000,
      range: '₦30,000 - ₦38,000',
      lastUpdated: '2 days ago',
      delta: '+3.5%',
      history: [30000, 31000, 32000, 35000],
      usage: 'Coarse aggregate for structural concrete mixing.',
      regions: { 'Lagos': 35000, 'Abuja': 37000, 'Port Harcourt': 36000, 'Ibadan': 32000 }
    },
    {
      id: 5,
      name: 'Bitumen (Cold Mix)',
      category: 'Surface',
      price: 185000,
      unit: 'Drum',
      trend: 'up',
      benchmark: 172000,
      range: '₦170,000 - ₦195,000',
      lastUpdated: 'Yesterday',
      delta: '+7.5%',
      history: [165000, 170000, 172000, 185000],
      usage: 'Asphaltic surface dressing for road pavements.',
      regions: { 'Lagos': 185000, 'Abuja': 192000, 'Port Harcourt': 189000 }
    },
    {
      id: 6,
      name: 'Laterite (Filling)',
      category: 'Earthworks',
      price: 12000,
      unit: 'm³',
      trend: 'stable',
      benchmark: 12000,
      range: '₦10,000 - ₦14,000',
      lastUpdated: '4 days ago',
      delta: '0.0%',
      history: [11500, 12000, 12000, 12000],
      usage: 'Backfilling and sub-grade material for road construction.',
      regions: { 'Lagos': 12000, 'Abuja': 13000, 'Port Harcourt': 12500, 'Ibadan': 11000 }
    },
    {
      id: 7,
      name: '9-Inch Hollow Block',
      category: 'Masonry',
      price: 650,
      unit: 'Block',
      trend: 'up',
      benchmark: 580,
      range: '₦580 - ₦720',
      lastUpdated: '1 day ago',
      delta: '+5.8%',
      history: [520, 550, 580, 650],
      usage: 'Load-bearing and non-load-bearing external and internal walls.',
      regions: { 'Lagos': 650, 'Abuja': 700, 'Port Harcourt': 680, 'Kano': 620, 'Ibadan': 600 }
    },
    {
      id: 8,
      name: 'Plywood Formwork (18mm)',
      category: 'Timber',
      price: 8500,
      unit: 'Sheet',
      trend: 'up',
      benchmark: 7800,
      range: '₦7,500 - ₦9,500',
      lastUpdated: '3 days ago',
      delta: '+5.1%',
      history: [7000, 7500, 7800, 8500],
      usage: 'Concrete formwork for slabs, beams, columns, and walls.',
      regions: { 'Lagos': 8500, 'Abuja': 9000, 'Port Harcourt': 8800 }
    },
    {
      id: 9,
      name: 'Aluminium Long-Span Roofing (0.55mm)',
      category: 'Roofing',
      price: 3800,
      unit: 'm²',
      trend: 'up',
      benchmark: 3500,
      range: '₦3,300 - ₦4,200',
      lastUpdated: '2 days ago',
      delta: '+4.5%',
      history: [3100, 3300, 3500, 3800],
      usage: 'Industrial and commercial roofing; low-pitch roof covering.',
      regions: { 'Lagos': 3800, 'Abuja': 4000, 'Port Harcourt': 3900 }
    },
    {
      id: 10,
      name: 'uPVC Pipe (4-inch, Class B)',
      category: 'MEP',
      price: 6500,
      unit: 'Length',
      trend: 'up',
      benchmark: 5900,
      range: '₦5,600 - ₦7,200',
      lastUpdated: '5 days ago',
      delta: '+5.3%',
      history: [5200, 5600, 5900, 6500],
      usage: 'Foul and storm water drainage, sewerage reticulation piping.',
      regions: { 'Lagos': 6500, 'Abuja': 6900, 'Port Harcourt': 6700 }
    },
    {
      id: 11,
      name: 'Emulsion Paint (20L)',
      category: 'Finishes',
      price: 28500,
      unit: 'Bucket',
      trend: 'up',
      benchmark: 26000,
      range: '₦24,000 - ₦31,000',
      lastUpdated: '1 day ago',
      delta: '+3.9%',
      history: [23000, 24500, 26000, 28500],
      usage: 'Interior wall and ceiling paint finish — premium washable emulsion.',
      regions: { 'Lagos': 28500, 'Abuja': 30000, 'Port Harcourt': 29500 }
    },
    {
      id: 12,
      name: 'Bituminous Membrane (3mm SBS)',
      category: 'Waterproofing',
      price: 3800,
      unit: 'm²',
      trend: 'up',
      benchmark: 3400,
      range: '₦3,200 - ₦4,200',
      lastUpdated: '6 days ago',
      delta: '+5.6%',
      history: [3000, 3200, 3400, 3800],
      usage: 'Basement tanking, flat roof waterproofing, and below-slab barrier membrane.',
      regions: { 'Lagos': 3800, 'Abuja': 4100, 'Port Harcourt': 4000 }
    },
    {
      id: 13,
      name: 'Precast Concrete Pile (300mm)',
      category: 'Geotechnical',
      price: 85000,
      unit: 'm',
      trend: 'up',
      benchmark: 78000,
      range: '₦74,000 - ₦92,000',
      lastUpdated: '1 week ago',
      delta: '+5.3%',
      history: [70000, 74000, 78000, 85000],
      usage: 'Foundation piling for bridges, high-rise buildings, and soft-ground structures.',
      regions: { 'Lagos': 85000, 'Abuja': 90000, 'Port Harcourt': 88000 }
    },
  ].map((material) => normalizeMaterialBenchmarkRecord(material)), []);

  const defaultMarketIndices = React.useMemo(() => [
    { label: 'Overall CMCI', val: 148.3, delta: '+2.1%', trend: 'up' },
    { label: 'Binder Index', val: 156.2, delta: '+3.2%', trend: 'up' },
    { label: 'Metal Index', val: 128.9, delta: '-0.8%', trend: 'down' },
    { label: 'Aggregates', val: 115.4, delta: '+0.2%', trend: 'up' },
    { label: 'Masonry Index', val: 138.7, delta: '+5.5%', trend: 'up' },
    { label: 'Surface & Roads', val: 162.4, delta: '+6.8%', trend: 'up' },
    { label: 'MEP Index', val: 134.1, delta: '+3.7%', trend: 'up' },
    { label: 'Finishes Index', val: 122.9, delta: '+1.9%', trend: 'up' },
  ], []);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [mats, indices] = await Promise.all([
          getMaterials(),
          getMarketIndices()
        ]);

        const normalizedMaterials = (mats.length > 0 ? mats : defaultMaterials)
          .map((material) => normalizeMaterialBenchmarkRecord(material));

        setMaterials(normalizedMaterials);
        setMarketIndices(indices.length > 0 ? indices : defaultMarketIndices);
      } catch (err) {
        console.error('Failed to load library data:', err);
        setMaterials(defaultMaterials);
        setMarketIndices(defaultMarketIndices);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [defaultMarketIndices, defaultMaterials]);

  const filteredMaterials = React.useMemo(() => {
    return materials.filter(mat => {
      const matchesSearch = mat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mat.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || mat.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchQuery, categoryFilter]);

  const categories = React.useMemo(() => {
    const cats = new Set(materials.map(m => m.category));
    return ['All', ...Array.from(cats)];
  }, [materials]);

  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const benchmarkRegions = getManagedRegions(editingMaterial, activeRegionLabel);
    const marketRead = Number(formData.get('price')) || 0;
    const benchmark = Number(formData.get('benchmark')) || marketRead;
    const sourceCount = Number(formData.get('sourceCount')) || 0;
    const sourceNote = String(formData.get('sourceNote') || '').trim();
    const sourceType = String(formData.get('sourceType') || 'market-note').trim() || 'market-note';
    const sourceRegion = String(formData.get('sourceRegion') || activeRegionLabel).trim() || activeRegionLabel;
    const benchmarkBand = String(formData.get('benchmarkBand') || '').trim();
    const benchmarkDeskNote = String(formData.get('benchmarkDeskNote') || '').trim();
    const reviewCycleDays = Number(formData.get('reviewCycleDays')) || editingMaterial?.reviewCycleDays || 14;
    const approvalStatus = String(formData.get('approvalStatus') || editingMaterial?.approvalStatus || 'review').trim().toLowerCase();
    const approvedAt = toIsoDateFromInput(formData.get('approvedAt'));
    const nextReviewAt = toIsoDateFromInput(formData.get('nextReviewAt'));
    const confidencePercent = Number(formData.get('confidence')) || 0;
    const updatedAt = new Date().toISOString();
    const regionRates = benchmarkRegions.reduce((acc, region) => {
      const fieldValue = Number(formData.get(getRegionFieldName(region))) || 0;
      if (fieldValue > 0) {
        acc[region] = fieldValue;
      }
      return acc;
    }, {});

    if (!Object.keys(regionRates).length && benchmark > 0) {
      regionRates[activeRegionLabel] = benchmark;
    }

    if (!regionRates[activeRegionLabel] && benchmark > 0) {
      regionRates[activeRegionLabel] = benchmark;
    }

    if (!regionRates.Lagos) {
      regionRates.Lagos = benchmark || regionRates[activeRegionLabel] || marketRead;
    }

    const primaryBenchmark = regionRates.Lagos || benchmark || regionRates[activeRegionLabel] || marketRead;
    const preservedSources = Array.isArray(editingMaterial?.sources)
      ? editingMaterial.sources.filter((source) => source?.label && source.label !== sourceNote)
      : [];
    const managedSource = sourceNote ? [{
      id: editingMaterial?.sources?.[0]?.id || `${Date.now()}-source`,
      label: sourceNote,
      type: sourceType,
      region: sourceRegion,
      rate: regionRates[sourceRegion] || regionRates[activeRegionLabel] || primaryBenchmark || marketRead,
      capturedAt: updatedAt,
      note: benchmarkDeskNote || 'Captured from material benchmark admin workflow'
    }] : [];
    const newMat = {
      name: formData.get('name'),
      category: formData.get('category'),
      price: marketRead,
      unit: formData.get('unit'),
      benchmark: primaryBenchmark,
      trend: editingMaterial?.trend || 'stable',
      delta: editingMaterial?.delta || '0.0%',
      history: [
        ...(Array.isArray(editingMaterial?.history) ? editingMaterial.history.slice(-3) : []),
        marketRead
      ].filter(Boolean),
      usage: formData.get('usage'),
      updatedAt,
      verifiedBy: String(formData.get('verifiedBy') || '').trim() || editingMaterial?.verifiedBy || 'Quantra Market Review',
      sourceCount,
      confidence: confidencePercent > 0 ? confidencePercent / 100 : (editingMaterial?.confidence || undefined),
      benchmarkBand: benchmarkBand || editingMaterial?.benchmarkBand,
      benchmarkDeskNote,
      approvalStatus,
      approvedBy: String(formData.get('approvedBy') || '').trim() || editingMaterial?.approvedBy || '',
      approvedAt: approvalStatus === 'approved'
        ? (approvedAt || editingMaterial?.approvedAt || updatedAt)
        : null,
      reviewCycleDays,
      nextReviewAt: nextReviewAt || editingMaterial?.nextReviewAt || null,
      regionRates,
      sources: [...managedSource, ...preservedSources].slice(0, 6)
    };
    const previousApprovedSnapshot = editingMaterial?.approvedSnapshot
      || (Array.isArray(editingMaterial?.approvedSnapshots) ? editingMaterial.approvedSnapshots[0] : null);
    const snapshotRegionSignature = JSON.stringify(regionRates);
    const previousSnapshotSignature = JSON.stringify(previousApprovedSnapshot?.regionRates || {});
    const shouldCreateApprovedSnapshot = approvalStatus === 'approved' && (
      !previousApprovedSnapshot
      || Number(previousApprovedSnapshot?.benchmark) !== Number(newMat.benchmark)
      || snapshotRegionSignature !== previousSnapshotSignature
      || String(previousApprovedSnapshot?.approvedBy || '') !== String(newMat.approvedBy || '')
      || String(previousApprovedSnapshot?.approvedAt || '') !== String(newMat.approvedAt || '')
    );
    const approvedSnapshotEntry = shouldCreateApprovedSnapshot
      ? buildMaterialApprovedSnapshotEntry({
        previousSnapshot: previousApprovedSnapshot,
        material: newMat,
        actor: user?.displayName || user?.email || newMat.verifiedBy || 'Quantra Market Review',
        activeRegion: activeRegionLabel,
        approvedAt: newMat.approvedAt || updatedAt,
        note: benchmarkDeskNote || sourceNote
      })
      : null;
    newMat.approvedSnapshots = approvedSnapshotEntry
      ? [approvedSnapshotEntry, ...(Array.isArray(editingMaterial?.approvedSnapshots) ? editingMaterial.approvedSnapshots : [])].slice(0, 12)
      : (Array.isArray(editingMaterial?.approvedSnapshots) ? editingMaterial.approvedSnapshots : []);
    newMat.approvedSnapshot = newMat.approvedSnapshots[0] || null;
    const benchmarkHistoryEntry = buildMaterialBenchmarkHistoryEntry({
      previousMaterial: editingMaterial,
      nextMaterial: newMat,
      actor: user?.displayName || user?.email || newMat.verifiedBy || 'Quantra Market Review',
      activeRegion: activeRegionLabel,
      changedAt: updatedAt,
      reason: benchmarkDeskNote || sourceNote
    });
    newMat.benchmarkHistory = [
      benchmarkHistoryEntry,
      ...(Array.isArray(editingMaterial?.benchmarkHistory) ? editingMaterial.benchmarkHistory : [])
    ].slice(0, 18);

    try {
      if (editingMaterial?.id && typeof editingMaterial.id === 'string') {
        const updated = await updateMaterial(editingMaterial.id, newMat);
        setMaterials(prev => prev.map(m => m.id === editingMaterial.id ? updated : m));
        toast.success('Material updated successfully!');
      } else {
        const added = await addMaterial(newMat);
        setMaterials(prev => [added, ...prev]);
        toast.success('Material added successfully!');
      }
      setEditingMaterial(null);
    } catch {
      toast.error('Failed to save material.');
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (typeof id !== 'string') {
        toast.error('Cannot delete default system materials.');
        return;
    }
    if (window.confirm('Delete this material?')) {
        try {
            await deleteMaterial(id);
            setMaterials(prev => prev.filter(m => m.id !== id));
            toast.success('Material deleted.');
        } catch {
            toast.error('Failed to delete.');
        }
    }
  };

  const renderManageModal = () => {
    const benchmarkRegions = getManagedRegions(editingMaterial, activeRegionLabel);
    const governance = getMaterialBenchmarkGovernance(editingMaterial || {});
    const approvalSnapshotComparison = getMaterialApprovalSnapshotComparison(editingMaterial || {}, activeRegionLabel);

    return (
    <div className="detail-modal-overlay" onClick={() => setEditingMaterial(null)}>
      <form className="detail-modal enterprise-card" onClick={e => e.stopPropagation()} onSubmit={handleSaveMaterial}>
        <div className="modal-header">
          <div className="manage-header-copy">
            <h3>{editingMaterial?.id ? 'Manage Benchmark Record' : 'Create Benchmark Record'}</h3>
            <p className="manage-subtitle">Update regional benchmark rates, evidence, and approval state without leaving the existing library workflow.</p>
          </div>
          <button type="button" className="close-btn" onClick={() => setEditingMaterial(null)}>×</button>
        </div>
        <div className="modal-body benchmark-admin-body">
          <div className="benchmark-admin-banner">
            <span className={`benchmark-flag ${governance.approvalTone}`}>{governance.approvalLabel}</span>
            <span className={`benchmark-flag ${governance.freshnessTone}`}>{governance.freshnessLabel}</span>
            <span className="benchmark-evidence">{governance.coverageLabel}</span>
            <span className="benchmark-evidence">{governance.reviewWindowLabel}</span>
            {approvalSnapshotComparison && (
              <>
                <span className="benchmark-evidence">{approvalSnapshotComparison.label}</span>
                <span className={`benchmark-flag ${approvalSnapshotComparison.tone}`}>{formatSnapshotDeltaLabel(approvalSnapshotComparison)}</span>
              </>
            )}
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <h4>Material Identity</h4>
              <p>Keep the benchmark record anchored to the same market item your estimators will search and apply.</p>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Name</label>
                <input type="text" name="name" defaultValue={editingMaterial?.name || ''} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input type="text" name="category" defaultValue={editingMaterial?.category || ''} required />
              </div>
              <div className="form-group">
                <label>Unit</label>
                <input type="text" name="unit" defaultValue={editingMaterial?.unit || ''} required />
              </div>
              <div className="form-group">
                <label>Current Market Read (N)</label>
                <input type="number" name="price" defaultValue={editingMaterial?.price || ''} required />
              </div>
              <div className="form-group">
                <label>Lagos Base Benchmark (N)</label>
                <input type="number" name="benchmark" defaultValue={editingMaterial?.benchmark || editingMaterial?.price || ''} required />
              </div>
              <div className="form-group">
                <label>Benchmark Evidence Band</label>
                <input type="text" name="benchmarkBand" defaultValue={editingMaterial?.benchmarkBand || editingMaterial?.range || ''} placeholder="N11,200 - N13,500" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <h4>Regional Benchmark Matrix</h4>
              <p>Maintain region-by-region benchmark rates so the BOQ engine can prefer exact market reads before applying general calibration factors.</p>
            </div>
            <div className="regional-benchmark-grid">
              {benchmarkRegions.map((region) => (
                <div className="form-group regional-rate-group" key={region}>
                  <label>{region} Benchmark (N)</label>
                  <input
                    type="number"
                    name={getRegionFieldName(region)}
                    defaultValue={editingMaterial?.regionRates?.[region] || editingMaterial?.regions?.[region] || (region === activeRegionLabel ? editingMaterial?.benchmark : '')}
                    placeholder={`Set ${region} benchmark`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <h4>Evidence And Governance</h4>
              <p>Record how the benchmark was captured, who validated it, and when it needs to be reviewed again.</p>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Benchmark Sources</label>
                <input type="number" name="sourceCount" min="1" defaultValue={editingMaterial?.sourceCount || 3} />
              </div>
              <div className="form-group">
                <label>Confidence (%)</label>
                <input type="number" name="confidence" min="1" max="99" defaultValue={editingMaterial?.confidence ? Math.round(editingMaterial.confidence * 100) : ''} placeholder="72" />
              </div>
              <div className="form-group">
                <label>Verified By</label>
                <input type="text" name="verifiedBy" defaultValue={editingMaterial?.verifiedBy || ''} placeholder="QS lead or market desk" />
              </div>
              <div className="form-group">
                <label>Approval Status</label>
                <select name="approvalStatus" defaultValue={editingMaterial?.approvalStatus || 'review'}>
                  <option value="review">Review In Progress</option>
                  <option value="approved">Approved Benchmark</option>
                  <option value="draft">Draft Benchmark</option>
                  <option value="stale">Mark As Stale</option>
                </select>
              </div>
              <div className="form-group">
                <label>Approved By</label>
                <input type="text" name="approvedBy" defaultValue={editingMaterial?.approvedBy || ''} placeholder="Commercial manager or cost lead" />
              </div>
              <div className="form-group">
                <label>Approved Date</label>
                <input type="date" name="approvedAt" defaultValue={toDateInputValue(editingMaterial?.approvedAt)} />
              </div>
              <div className="form-group">
                <label>Review Cycle (Days)</label>
                <input type="number" name="reviewCycleDays" min="1" defaultValue={editingMaterial?.reviewCycleDays || 14} />
              </div>
              <div className="form-group">
                <label>Next Review Date</label>
                <input type="date" name="nextReviewAt" defaultValue={toDateInputValue(editingMaterial?.nextReviewAt)} />
              </div>
              <div className="form-group">
                <label>Source Type</label>
                <select name="sourceType" defaultValue={editingMaterial?.sources?.[0]?.type || 'market-note'}>
                  <option value="supplier-read">Supplier Read</option>
                  <option value="regional-spot-check">Regional Spot Check</option>
                  <option value="qs-review">QS Review</option>
                  <option value="procurement-log">Procurement Log</option>
                  <option value="market-note">Market Note</option>
                </select>
              </div>
              <div className="form-group">
                <label>Source Region</label>
                <select name="sourceRegion" defaultValue={editingMaterial?.sources?.[0]?.region || activeRegionLabel}>
                  {benchmarkRegions.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              <div className="form-group form-group-full">
                <label>Source Note</label>
                <input type="text" name="sourceNote" defaultValue={editingMaterial?.sources?.[0]?.label || ''} placeholder="Supplier quote, market call, or calibration note" />
              </div>
              <div className="form-group form-group-full">
                <label>Benchmark Desk Note</label>
                <textarea name="benchmarkDeskNote" defaultValue={editingMaterial?.benchmarkDeskNote || ''} rows={2} placeholder="Explain procurement context, drift reason, or approval comment" />
              </div>
              <div className="form-group form-group-full">
                <label>Usage Notes</label>
                <textarea name="usage" defaultValue={editingMaterial?.usage || ''} rows={3} />
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={() => setEditingMaterial(null)}>Cancel</button>
          <button type="submit" className="btn-primary">Save Benchmark Record</button>
        </div>
      </form>
    </div>
  );
  };

  const renderHistoryModal = () => {
    const timelineEntries = materials
      .flatMap((material) => (
        (material.benchmarkHistory || []).map((entry) => ({
          ...entry,
          materialId: material.id,
          materialName: material.name,
          category: material.category,
          benchmarkBand: material.benchmarkBand || material.range || ''
        }))
      ))
      .sort((left, right) => {
        const leftTime = Date.parse(left.changedAt || 0) || 0;
        const rightTime = Date.parse(right.changedAt || 0) || 0;
        return rightTime - leftTime;
      })
      .slice(0, 48);

    return (
      <div className="detail-modal-overlay" onClick={() => setShowHistoryModal(false)}>
        <div className="detail-modal enterprise-card history-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="mat-identity">
              <span className="cat-tag">Audit Trail</span>
              <h3>Benchmark Change History</h3>
            </div>
            <button className="close-btn" onClick={() => setShowHistoryModal(false)}>x</button>
          </div>
          <div className="modal-body">
            <div className="history-summary-strip">
              <span className="benchmark-evidence">{timelineEntries.length} recent benchmark events</span>
              <span className="benchmark-evidence">{materials.length} tracked benchmark records</span>
            </div>
            <div className="history-timeline">
              {timelineEntries.length === 0 && (
                <div className="history-empty-state">No benchmark changes have been recorded yet.</div>
              )}
              {timelineEntries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="history-event"
                  onClick={() => {
                    const nextMaterial = materials.find((material) => material.id === entry.materialId);
                    if (nextMaterial) {
                      setSelectedMaterial(nextMaterial);
                    }
                    setShowHistoryModal(false);
                  }}
                >
                  <div className="history-event-header">
                    <div>
                      <strong>{entry.title}</strong>
                      <span>{entry.materialName} • {entry.category}</span>
                    </div>
                    <span className="history-event-time">{formatBenchmarkTimelineStamp(entry.changedAt)}</span>
                  </div>
                  <div className="history-event-meta">
                    <span className="benchmark-evidence">{entry.actor || 'Quantra Market Review'}</span>
                    <span className={`benchmark-flag ${entry.approvalStatus || 'review'}`}>{entry.approvalStatus || 'review'}</span>
                    {entry.sourceCount > 0 && <span className="benchmark-evidence">{entry.sourceCount} sources</span>}
                  </div>
                  <div className="history-event-body">
                    <span>Benchmark: ₦{Math.round(Number(entry.benchmark) || 0).toLocaleString()}</span>
                    {entry.changeSummary && <span>{entry.changeSummary}</span>}
                    {entry.note && <small>{entry.note}</small>}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setShowHistoryModal(false)}>Close History</button>
          </div>
        </div>
      </div>
    );
  };

  const renderIntelligenceDashboard = () => {
    const isLocked = !hasFeature(user?.plan, 'material-intelligence');
    const averageConfidence = materials.length
      ? Math.round((materials.reduce((sum, material) => sum + (Number(material.confidence) || 0), 0) / materials.length) * 100)
      : 0;
    const sourceCoverage = materials.reduce((sum, material) => sum + (Number(material.sourceCount) || 0), 0);
    const approvedBenchmarks = materials.filter((material) => getMaterialBenchmarkGovernance(material).approvalStatus === 'approved').length;
    const reviewQueue = materials.filter((material) => {
      const governance = getMaterialBenchmarkGovernance(material);
      return governance.freshnessTone === 'due' || governance.freshnessTone === 'stale' || governance.approvalStatus !== 'approved';
    }).length;

    return (
      <div className={`intelligence-dashboard ${isLocked ? 'locked-view' : ''}`}>
        {isLocked && (
          <div className="locked-overlay glass-card">
            <Lock size={40} className="mb-4" />
            <h3>Premium Feature</h3>
            <p>Upgrade to Practitioner to unlock real-time market intelligence and cost indices.</p>
            <button className="btn-primary-action mt-4" onClick={onUpgrade}>View Plans</button>
          </div>
        )}
        <div className="dashboard-grid-mini">
          <div className="enterprise-card intel-metric glass-card">
            <div className="metric-header">
              <span className="label">Monthly CMCI Movement</span>
              <Activity size={16} className="text-accent" />
            </div>
            <div className="metric-val text-danger">+4.8%</div>
            <div className="metric-footer">{activeRegionLabel} market pulse vs regional average</div>
          </div>
          <div className="enterprise-card intel-metric">
            <div className="metric-header">
              <span className="label">Approved Benchmarks</span>
              <AlertCircle size={16} className="text-warning" />
            </div>
            <div className="metric-val">{approvedBenchmarks}</div>
            <div className="metric-subnote">{materials.length - approvedBenchmarks} records still need approval or recalibration</div>
            <div className="metric-footer">Avg. ₦185,000 per drum</div>
          </div>
          <div className="enterprise-card intel-metric">
            <div className="metric-header">
              <span className="label">Benchmark Confidence</span>
              <ShieldCheck size={16} className="text-success" />
            </div>
            <div className="metric-val">{averageConfidence}%</div>
            <div className="metric-footer">{sourceCoverage} supplier reads, spot checks, and QS calibration inputs. {reviewQueue} in review queue.</div>
          </div>
        </div>

        <div className="market-index-section enterprise-card glass-card">
          <div className="index-header">
            <div className="title-box">
              <h3>Construction Material Cost Index (CMCI)</h3>
              <p>Regional benchmark signals calibrated from supplier reads, market spot checks, and live QS updates</p>
            </div>
            <button className="btn-secondary small" onClick={() => setShowHistoryModal(true)}>View Full Benchmark History</button>
          </div>
          <div className="index-grid">
            {marketIndices.map((idx, i) => (
              <div key={i} className="index-item">
                <span className="idx-label">{idx.label}</span>
                <div className="idx-data">
                  <span className="idx-val">{idx.val}</span>
                  <span className={`idx-delta ${idx.trend}`}>
                    {idx.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {idx.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDetailModal = (mat) => {
    const benchmarkHistory = Array.isArray(mat.history) && mat.history.length
      ? mat.history
      : [getRegionalBenchmark(mat)];
    const governance = getMaterialBenchmarkGovernance(mat);
    const approvalSnapshotComparison = getMaterialApprovalSnapshotComparison(mat, activeRegionLabel);
    const approvedSnapshots = Array.isArray(mat.approvedSnapshots)
      ? mat.approvedSnapshots.slice(0, 6)
      : [];
    const benchmarkAuditHistory = Array.isArray(mat.benchmarkHistory)
      ? mat.benchmarkHistory.slice(0, 12)
      : [];

    return (
    <div className="detail-modal-overlay" onClick={() => setSelectedMaterial(null)}>
      <div className="detail-modal enterprise-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="mat-identity">
            <span className="cat-tag">{mat.category}</span>
            <h3>{mat.name} Market Benchmark Report</h3>
          </div>
          <button className="close-btn" onClick={() => setSelectedMaterial(null)}>×</button>
        </div>

        <div className="modal-body">
          <div className="report-grid">
            <div className="price-trends">
              <div className="section-title">{activeRegionLabel} Benchmark Trend (6 Months)</div>
              <div className="trend-chart-placeholder">
                <div className="chart-bars">
                  {benchmarkHistory.map((h, i) => (
                    <div key={i} className="chart-bar-group">
                      <div className="bar" style={{ height: `${(h / Math.max(...benchmarkHistory)) * 100}%` }}></div>
                      <span>M{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bench-stats">
              <div className="stat-box">
                <span className="s-label">{activeRegionLabel} Market Benchmark</span>
                <span className="s-val">₦{getRegionalBenchmark(mat).toLocaleString()}</span>
              </div>
              <div className="stat-box">
                <span className="s-label">Regional Market Spread</span>
                <div className="regional-list">
                  {mat.regions && Object.entries(mat.regions).map(([r, p]) => (
                    <div key={r} className="regional-item">
                      <span>{r}</span>
                      <span>₦{p.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="stat-box">
                <span className="s-label">Benchmark Confidence</span>
                <span className="s-val text-success">{mat.confidenceLabel.toUpperCase()}</span>
              </div>
              <div className="stat-box">
                <span className="s-label">Benchmark Evidence Band</span>
                <span className="s-val small">{mat.benchmarkBand || mat.range}</span>
              </div>
              <div className="stat-box">
                <span className="s-label">Evidence Sources</span>
                <span className="s-val small">{mat.sourceCount} market inputs</span>
              </div>
              <div className="stat-box">
                <span className="s-label">Verified By</span>
                <span className="s-val small">{mat.verifiedBy}</span>
              </div>
              <div className="stat-box">
                <span className="s-label">Approval State</span>
                <span className={`s-val small benchmark-text-${governance.approvalTone}`}>{governance.approvalLabel}</span>
              </div>
              <div className="stat-box">
                <span className="s-label">Review Window</span>
                <span className={`s-val small benchmark-text-${governance.freshnessTone}`}>{governance.reviewWindowLabel}</span>
              </div>
              {approvalSnapshotComparison && (
                <>
                  <div className="stat-box">
                    <span className="s-label">Approved Snapshot</span>
                    <span className="s-val small">{approvalSnapshotComparison.label}</span>
                  </div>
                  <div className="stat-box">
                    <span className="s-label">Snapshot Drift</span>
                    <span className={`s-val small benchmark-text-${approvalSnapshotComparison.tone}`}>{formatSnapshotDeltaLabel(approvalSnapshotComparison)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="usage-notes">
            <h4>Standard Usage Notes</h4>
            <p>{mat.usage}</p>
          </div>

          <div className="usage-notes">
            <h4>Benchmark Governance</h4>
            <div className="governance-grid">
              <div className="governance-card">
                <span>Status</span>
                <strong className={`benchmark-text-${governance.approvalTone}`}>{governance.approvalLabel}</strong>
                <small>{mat.approvedBy ? `Approved by ${mat.approvedBy}` : 'Awaiting commercial approval'}</small>
              </div>
              <div className="governance-card">
                <span>Review</span>
                <strong className={`benchmark-text-${governance.freshnessTone}`}>{governance.freshnessLabel}</strong>
                <small>{governance.reviewWindowLabel}</small>
              </div>
              <div className="governance-card">
                <span>Coverage</span>
                <strong>{governance.coverageLabel}</strong>
                <small>{governance.reviewCycleDays}-day review cycle</small>
              </div>
              <div className="governance-card">
                <span>Benchmark Health</span>
                <strong className={`benchmark-text-${governance.healthTone}`}>{governance.healthLabel}</strong>
                <small>{mat.benchmarkDeskNote || 'No benchmark desk note captured yet.'}</small>
              </div>
              {approvalSnapshotComparison && (
                <div className="governance-card">
                  <span>Approved Baseline</span>
                  <strong>{approvalSnapshotComparison.label}</strong>
                  <small className={`benchmark-text-${approvalSnapshotComparison.tone}`}>{formatSnapshotDeltaLabel(approvalSnapshotComparison)}. {approvalSnapshotComparison.summary}</small>
                </div>
              )}
            </div>
          </div>

          {approvedSnapshots.length > 0 && (
            <div className="usage-notes">
              <h4>Approved Snapshot Archive</h4>
              <div className="history-timeline">
                {approvedSnapshots.map((snapshot) => (
                  <div key={snapshot.id} className="history-event history-event-static">
                    <div className="history-event-header">
                      <div>
                        <strong>{snapshot.title}</strong>
                        <span>{snapshot.approvedBy || snapshot.actor || 'Quantra Market Review'}</span>
                      </div>
                      <span className="history-event-time">{formatBenchmarkTimelineStamp(snapshot.approvedAt)}</span>
                    </div>
                    <div className="history-event-meta">
                      <span className="benchmark-evidence">Version {snapshot.version}</span>
                      <span className="benchmark-evidence">₦{Math.round(Number(snapshot.benchmark) || 0).toLocaleString()} Lagos base</span>
                      {snapshot.sourceCount > 0 && <span className="benchmark-evidence">{snapshot.sourceCount} sources</span>}
                    </div>
                    <div className="history-event-body">
                      <span>{Object.keys(snapshot.regionRates || {}).length} region rates locked in this approval snapshot.</span>
                      {snapshot.note && <small>{snapshot.note}</small>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="usage-notes">
            <div className="history-section-header">
              <h4>Benchmark Audit Trail</h4>
              <button className="btn-secondary small" onClick={() => {
                setSelectedMaterial(null);
                setShowHistoryModal(true);
              }}>Open Full History</button>
            </div>
            <div className="history-timeline history-timeline-inline">
              {benchmarkAuditHistory.length === 0 && (
                <div className="history-empty-state">No benchmark history captured yet for this material.</div>
              )}
              {benchmarkAuditHistory.map((entry) => (
                <div key={entry.id} className="history-event history-event-static">
                  <div className="history-event-header">
                    <div>
                      <strong>{entry.title}</strong>
                      <span>{entry.actor || 'Quantra Market Review'}</span>
                    </div>
                    <span className="history-event-time">{formatBenchmarkTimelineStamp(entry.changedAt)}</span>
                  </div>
                  <div className="history-event-meta">
                    <span className={`benchmark-flag ${entry.approvalStatus || 'review'}`}>{entry.approvalStatus || 'review'}</span>
                    {entry.sourceCount > 0 && <span className="benchmark-evidence">{entry.sourceCount} sources</span>}
                    {entry.activeRegion && <span className="benchmark-evidence">{entry.activeRegion} focus</span>}
                  </div>
                  <div className="history-event-body">
                    <span>Benchmark: ₦{Math.round(Number(entry.benchmark) || 0).toLocaleString()}</span>
                    {entry.changeSummary && <span>{entry.changeSummary}</span>}
                    {entry.note && <small>{entry.note}</small>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="usage-notes">
            <h4>Benchmark Evidence Trail</h4>
            <div className="evidence-list">
              {(mat.sources || []).map((source) => (
                <div key={source.id} className="evidence-item">
                  <div>
                    <strong>{source.label}</strong>
                    <span>{source.region}{source.note ? ` - ${source.note}` : ''}</span>
                  </div>
                  <div>
                    <strong>{source.rate ? `₦${Math.round(source.rate).toLocaleString()}` : 'Trace only'}</strong>
                    <span>{source.capturedAt ? new Date(source.capturedAt).toLocaleDateString('en-NG') : 'Recently updated'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="trust-disclaimer">
            <Info size={14} />
            <span>Benchmarks are calibrated from {mat.sourceCount} market sources, regional spot checks, and live QS pricing signals. Use custom overrides when procurement conditions differ.</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => setSelectedMaterial(null)}>Close Report</button>
          <button
            className="btn-primary"
            onClick={() => {
              if (!activeProject) {
                toast.warning('Please select or open a project first.');
                return;
              }
              const benchmarkValue = getRegionalBenchmark(mat);
              const updatedSections = (activeProject.sections || []).map(section => ({
                ...section,
                items: section.items.map(item => {
                  // Matching logic: rudimentary check on description containing material name
                  if ((item.description || '').toLowerCase().includes(mat.name.toLowerCase().split(' ')[0])) {
                    return {
                      ...item,
                      benchmark: benchmarkValue,
                      benchmarkRegionalRates: { ...(mat.regionRates || mat.regions || {}) },
                      benchmarkEvidence: buildMaterialBenchmarkEvidence(mat, activeRegionLabel),
                      benchmarkMatchSource: 'material-library',
                      rate: benchmarkValue,
                      useBenchmark: true,
                      rateSource: 'benchmark',
                      total: (Number(item.qty) || 0) * benchmarkValue
                    };
                  }
                  return item;
                })
              }));
              onUpdate(activeProject.id, updatedSections);
              toast.success(`Applied the ${activeRegionLabel} benchmark for ${mat.name} at ₦${benchmarkValue.toLocaleString()} to matching items.`);
              setSelectedMaterial(null);
            }}
          >
            Apply Benchmark to Project
          </button>
        </div>
      </div>
    </div>
  );
  };

  return (
    <div className="library-intelligence-view view-fade-in">
      {loading && (
        <div className="loading-overlay-simple">
          <Loader2 className="animate-spin" size={32} />
          <span>Synchronizing Market Data...</span>
        </div>
      )}
      {/* Header */}
      <div className="library-header-premium">
        <div className="title-group">
          <h2>Market Benchmark Intelligence & Rate Library</h2>
          <p>Regional supplier reads, benchmark bands, and custom rate overrides for professional quantity surveying teams</p>
        </div>
        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={() => setIsManageMode(!isManageMode)}
          >
            {isManageMode ? 'Exit Benchmark Admin' : 'Manage Benchmark Engine'}
          </button>
          <button
            className="btn-primary-action"
            onClick={!hasFeature(user?.plan, 'material-intelligence') ? onUpgrade : undefined}
          >
            <SearchCheck size={18} /> {!hasFeature(user?.plan, 'material-intelligence') ? 'Upgrade to Audit' : 'Run Price Audit'}
          </button>
        </div>
      </div>

      {renderIntelligenceDashboard()}

      {/* Main Library List */}
      <div className="library-listing-section">
        <div className="listing-header">
          <div className="search-box-l">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search market benchmarks, supplier items, or trades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-actions">
            <select
              className="btn-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ appearance: 'none', paddingRight: '2rem' }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat} {cat === 'All' ? 'Categories' : ''}</option>
              ))}
            </select>
            {isManageMode && (
               <button className="btn-primary" onClick={() => setEditingMaterial({})}>
                 <Plus size={14} /> Add Material
               </button>
            )}
          </div>
        </div>

        <div className="intelligence-grid-l">
          {filteredMaterials.map((mat) => {
            const regionalBenchmark = getRegionalBenchmark(mat);
            const driftMeta = getBenchmarkDriftMeta(mat);
            const governance = getMaterialBenchmarkGovernance(mat);
            const approvalSnapshotComparison = getMaterialApprovalSnapshotComparison(mat, activeRegionLabel);

            return (
            <div key={mat.id} className="enterprise-card mat-intel-card glass-card" onClick={() => setSelectedMaterial(mat)}>
              <div className="card-top-row">
                <span className="cat-text">{mat.category}</span>
                <div className={`mini-trend ${mat.trend}`}>
                  {mat.delta}
                </div>
              </div>
              <div className="mat-name-row">
                <h4>{mat.name}</h4>
                <span className="unit-text">per {mat.unit}</span>
              </div>
              <div className="mat-price-row">
                <span className="p-label">Current Market Read</span>
                <div className="p-val">
                  <span className="curr">₦</span>
                  <span className="amount">{mat.price.toLocaleString()}</span>
                </div>
              </div>
              <div className="mat-benchmark-row">
                <span className="p-label">{activeRegionLabel} Market Benchmark</span>
                <strong className="benchmark-amount">₦{regionalBenchmark.toLocaleString()}</strong>
              </div>
              <div className="mat-support-row">
                <span className={`benchmark-flag ${governance.approvalTone}`}>{governance.approvalLabel}</span>
                <span className={`benchmark-flag ${governance.freshnessTone}`}>{governance.freshnessLabel}</span>
              </div>
              <div className="mat-support-row mat-support-row-secondary">
                <span className={`benchmark-flag ${driftMeta.tone}`}>{driftMeta.label}</span>
                <span className="benchmark-range">Band {mat.benchmarkBand || mat.range}</span>
              </div>
              <div className="mat-support-row mat-support-row-secondary">
                <span className="benchmark-evidence">{mat.sourceCount} sources</span>
                <span className="benchmark-evidence">{mat.confidenceLabel} confidence</span>
                <span className="benchmark-evidence">{governance.coverageLabel}</span>
              </div>
              {approvalSnapshotComparison && (
                <div className="mat-support-row mat-support-row-secondary">
                  <span className="benchmark-evidence">{approvalSnapshotComparison.label}</span>
                  <span className={`benchmark-flag ${approvalSnapshotComparison.tone}`}>{formatSnapshotDeltaLabel(approvalSnapshotComparison)}</span>
                </div>
              )}
              <div className="card-footer-l">
                <div className="last-sync">{governance.reviewWindowLabel} - {mat.verifiedBy}</div>
                {isManageMode ? (
                  <div className="manage-actions" style={{display: 'flex', gap: '0.5rem'}}>
                     <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setEditingMaterial(mat); }}><Edit2 size={13}/></button>
                     <button className="btn-icon text-danger" onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(mat.id); }}>X</button>
                  </div>
                ) : (
                  <div className="view-link">
                    Analysis <ArrowRight size={14} />
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
      </div>

      {editingMaterial && renderManageModal()}
      {showHistoryModal && renderHistoryModal()}
      {!editingMaterial && selectedMaterial && renderDetailModal(selectedMaterial)}

      <style jsx="true">{`
                .loading-overlay-simple {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(255,255,255,0.7);
                    z-index: 2000;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                    color: var(--accent-600);
                    font-weight: 600;
                }

                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                .library-intelligence-view {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    padding-bottom: 4rem;
                }

                .library-header-premium {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .header-actions {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 1rem;
                }

                .update-badge {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--primary-500);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: white;
                    padding: 0.4rem 0.8rem;
                    border-radius: 6px;
                    border: 1px solid var(--border-light);
                }

                .intelligence-dashboard {
                    display: grid;
                    grid-template-columns: 1fr 2fr;
                    gap: 1.5rem;
                    position: relative;
                }

                .locked-view { filter: blur(4px); pointer-events: none; opacity: 0.6; }
                .locked-overlay {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    z-index: 10;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.4);
                    text-align: center;
                    backdrop-filter: blur(2px);
                }
                .locked-overlay h3 { font-size: 1.5rem; margin-bottom: 0.5rem; }
                .locked-overlay p { font-size: 0.875rem; color: var(--primary-600); max-width: 300px; }
                .mt-4 { margin-top: 1rem; }
                .mb-4 { margin-bottom: 1rem; }

                /* Form Grid for Manage Modal */
                .benchmark-admin-body {
                   display: flex;
                   flex-direction: column;
                   gap: 1.25rem;
                }
                .modal-body.benchmark-admin-body { padding: 1.5rem 2rem; }
                .benchmark-admin-banner {
                   display: flex;
                   flex-wrap: wrap;
                   gap: 0.6rem;
                   padding: 0.9rem 1rem;
                   border: 1px solid var(--border-light);
                   border-radius: 12px;
                   background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.96));
                }
                .form-section {
                   display: flex;
                   flex-direction: column;
                   gap: 1rem;
                   padding: 1rem;
                   border: 1px solid var(--border-light);
                   border-radius: 14px;
                   background: rgba(248, 250, 252, 0.75);
                }
                .form-section-header {
                   display: flex;
                   flex-direction: column;
                   gap: 0.25rem;
                }
                .form-section-header h4 {
                   font-size: 0.95rem;
                   color: var(--primary-900);
                }
                .form-section-header p {
                   font-size: 0.78rem;
                   color: var(--primary-500);
                   line-height: 1.5;
                }
                .form-grid {
                   display: grid;
                   grid-template-columns: 1fr 1fr;
                   gap: 1rem;
                }
                .regional-benchmark-grid {
                   display: grid;
                   grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                   gap: 0.9rem;
                }
                .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
                .form-group label { font-size: 0.8125rem; font-weight: 700; color: var(--primary-600); }
                .form-group input, .form-group textarea, .form-group select {
                   padding: 0.6rem 0.8rem;
                   border: 1px solid var(--border-medium);
                   border-radius: var(--radius-sm);
                   font-size: 0.875rem;
                   background: white;
                }
                .form-group-full { grid-column: 1 / -1; }
                .manage-subtitle {
                   margin-top: 0.35rem;
                   font-size: 0.78rem;
                   color: var(--primary-500);
                   max-width: 580px;
                   line-height: 1.5;
                }
                .manage-header-copy {
                   display: flex;
                   flex-direction: column;
                   gap: 0.15rem;
                }
                .btn-icon { background: transparent; border: none; cursor: pointer; color: var(--primary-500); padding: 4px; border-radius: 4px; }
                .btn-icon:hover { background: var(--bg-main); color: var(--primary-900); }

                .dashboard-grid-mini {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .intel-metric {
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    transition: all 0.3s;
                    border-radius: 12px;
                }

                .intel-metric:hover {
                    background: rgba(37, 99, 235, 0.03);
                }

                .metric-header {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--primary-500);
                }

                .metric-val {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: var(--primary-900);
                }
                .metric-subnote {
                    font-size: 0.72rem;
                    color: var(--primary-500);
                    line-height: 1.45;
                }

                .metric-footer {
                    font-size: 0.6875rem;
                    color: var(--primary-400);
                }
                .dashboard-grid-mini .intel-metric:nth-child(2) .metric-footer {
                    display: none;
                }

                .market-index-section {
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .index-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .index-header h3 { font-size: 1.125rem; margin-bottom: 0.25rem; }
                .index-header p { font-size: 0.8125rem; color: var(--primary-500); }

                .index-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: 1.5rem;
                }

                .index-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .idx-label { font-size: 0.75rem; font-weight: 600; color: var(--primary-500); }
                .idx-data { display: flex; align-items: baseline; gap: 0.5rem; }
                .idx-val { font-size: 1.5rem; font-weight: 800; color: var(--primary-900); }
                .idx-delta { font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 0.2rem; }
                .idx-delta.up { color: var(--danger-600); }
                .idx-delta.down { color: var(--success-600); }

                .library-listing-section {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .listing-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .search-box-l {
                    background: white;
                    border: 1.5px solid var(--border-medium);
                    border-radius: 10px;
                    padding: 0.75rem 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    width: 400px;
                    transition: all 0.3s;
                }

                .search-box-l:focus-within {
                    border-color: var(--accent-500);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }

                .search-box-l input { border: none; outline: none; width: 100%; font-size: 0.875rem; }

                .filter-actions { display: flex; gap: 0.75rem; }
                .btn-filter {
                    background: white;
                    border: 1px solid var(--border-light);
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--primary-600);
                }

                .intelligence-grid-l {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.25rem;
                }

                .mat-intel-card {
                    padding: 1.25rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: 14px;
                }

                .mat-intel-card:hover { transform: translateY(-4px); border-color: var(--accent-500); box-shadow: 0 12px 30px rgba(37, 99, 235, 0.1); }

                .card-top-row { display: flex; justify-content: space-between; margin-bottom: 0.75rem; }
                .cat-text { font-size: 0.6875rem; font-weight: 700; color: var(--primary-400); text-transform: uppercase; }
                .mini-trend { font-size: 0.75rem; font-weight: 700; }
                .mini-trend.up { color: var(--danger-600); }
                .mini-trend.down { color: var(--success-600); }

                .mat-name-row h4 { font-size: 1rem; margin-bottom: 0.25rem; }
                .unit-text { font-size: 0.75rem; color: var(--primary-500); }

                .mat-price-row { margin-top: 1.25rem; display: flex; flex-direction: column; }
                .mat-benchmark-row {
                    margin-top: 0.85rem;
                    padding-top: 0.85rem;
                    border-top: 1px dashed var(--border-light);
                    display: flex;
                    flex-direction: column;
                    gap: 0.2rem;
                }
                .mat-support-row {
                    margin-top: 0.9rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }
                .mat-support-row-secondary {
                    margin-top: 0.5rem;
                }
                .benchmark-evidence {
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: var(--primary-600);
                    background: rgba(15, 23, 42, 0.04);
                    border: 1px solid var(--border-light);
                    border-radius: 999px;
                    padding: 0.3rem 0.65rem;
                }
                .p-label { font-size: 0.6875rem; font-weight: 600; color: var(--primary-400); }
                .p-val { display: flex; align-items: baseline; gap: 0.25rem; }
                .p-val .curr { font-weight: 700; color: var(--primary-600); }
                .p-val .amount { font-size: 1.5rem; font-weight: 800; color: var(--primary-900); }
                .benchmark-amount { font-size: 1rem; font-weight: 800; color: var(--primary-800); }
                .benchmark-flag {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.3rem 0.55rem;
                    border-radius: 999px;
                    font-size: 0.625rem;
                    font-weight: 800;
                }
                .benchmark-flag.aligned { background: rgba(22, 163, 74, 0.12); color: var(--success-600); }
                .benchmark-flag.flagged { background: rgba(234, 88, 12, 0.12); color: #c2410c; }
                .benchmark-flag.pending { background: rgba(148, 163, 184, 0.15); color: var(--primary-500); }
                .benchmark-flag.watch { background: rgba(251, 191, 36, 0.16); color: #b45309; }
                .benchmark-flag.high { background: rgba(239, 68, 68, 0.12); color: var(--danger-600); }
                .benchmark-flag.low { background: rgba(37, 99, 235, 0.12); color: var(--accent-600); }
                .benchmark-flag.approved { background: rgba(22, 163, 74, 0.12); color: var(--success-600); }
                .benchmark-flag.review,
                .benchmark-flag.due { background: rgba(245, 158, 11, 0.14); color: #b45309; }
                .benchmark-flag.draft { background: rgba(59, 130, 246, 0.12); color: var(--accent-600); }
                .benchmark-flag.stale { background: rgba(239, 68, 68, 0.12); color: var(--danger-600); }
                .benchmark-flag.fresh { background: rgba(15, 118, 110, 0.12); color: #0f766e; }
                .benchmark-text-approved { color: var(--success-600); }
                .benchmark-text-review,
                .benchmark-text-due { color: #b45309; }
                .benchmark-text-high { color: var(--danger-600); }
                .benchmark-text-low { color: var(--accent-600); }
                .benchmark-text-draft { color: var(--accent-600); }
                .benchmark-text-fresh { color: #0f766e; }
                .benchmark-text-pending { color: var(--primary-500); }
                .benchmark-text-building { color: var(--accent-600); }
                .benchmark-text-stale,
                .benchmark-text-watch { color: var(--danger-600); }
                .benchmark-text-ready { color: #0f766e; }
                .benchmark-range { font-size: 0.6875rem; color: var(--primary-500); font-weight: 600; }

                .card-footer-l {
                    margin-top: 1.5rem;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border-light);
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .last-sync { color: var(--primary-400); }
                .view-link { color: var(--accent-600); display: flex; align-items: center; gap: 0.25rem; }

                .detail-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.75);
                    backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: overlay-fade 0.25s ease;
                }

                @keyframes overlay-fade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .detail-modal {
                    width: 100%;
                    max-width: 820px;
                    background: white;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.4);
                    animation: modal-pop 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                @keyframes modal-pop {
                    from { transform: scale(0.95) translateY(10px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }

                .modal-header {
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid var(--border-light);
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 1rem;
                }

                .mat-identity h3 { font-size: 1.25rem; margin-top: 0.25rem; }
                .cat-tag { font-size: 0.625rem; background: var(--bg-main); padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 800; text-transform: uppercase; }

                .close-btn { font-size: 1.5rem; border: none; background: transparent; cursor: pointer; color: var(--primary-400); }

                .modal-body { padding: 2rem; display: flex; flex-direction: column; gap: 2rem; }

                .report-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
                .section-title { font-size: 0.875rem; font-weight: 700; margin-bottom: 1rem; color: var(--primary-600); }

                .trend-chart-placeholder {
                    height: 180px;
                    background: var(--bg-main);
                    border-radius: 8px;
                    display: flex;
                    align-items: flex-end;
                    padding: 1rem 2rem;
                }

                .chart-bars { display: flex; width: 100%; justify-content: space-between; align-items: flex-end; }
                .chart-bar-group { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
                .bar { width: 40px; background: linear-gradient(180deg, #3b82f6, #2563eb); border-radius: 6px 6px 0 0; transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
                .chart-bar-group span { font-size: 0.625rem; font-weight: 700; color: var(--primary-400); }

                .bench-stats { display: flex; flex-direction: column; gap: 1rem; }
                .stat-box { display: flex; flex-direction: column; padding: 1rem; background: var(--bg-main); border-radius: 8px; }
                .s-label { font-size: 0.6875rem; font-weight: 600; color: var(--primary-500); margin-bottom: 0.25rem; }
                .s-val { font-size: 1.125rem; font-weight: 800; }
                .s-val.small { font-size: 0.8125rem; }

                .regional-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.25rem; }
                .regional-item { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600; color: var(--primary-700); border-bottom: 1px dashed var(--border-light); padding-bottom: 2px; }
                .governance-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 0.85rem;
                }
                .governance-card {
                    display: flex;
                    flex-direction: column;
                    gap: 0.3rem;
                    padding: 0.95rem 1rem;
                    border: 1px solid var(--border-light);
                    border-radius: 10px;
                    background: rgba(248, 250, 252, 0.82);
                }
                .governance-card span {
                    font-size: 0.68rem;
                    font-weight: 700;
                    color: var(--primary-500);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .governance-card strong {
                    font-size: 0.9rem;
                }
                .governance-card small {
                    font-size: 0.74rem;
                    color: var(--primary-500);
                    line-height: 1.45;
                }
                .history-section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 0.85rem;
                }
                .history-modal {
                    max-width: 880px;
                }
                .history-summary-strip {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }
                .history-timeline {
                    display: flex;
                    flex-direction: column;
                    gap: 0.85rem;
                }
                .history-timeline-inline {
                    max-height: 360px;
                    overflow-y: auto;
                    padding-right: 0.25rem;
                }
                .history-event {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 0.55rem;
                    padding: 1rem 1.05rem;
                    border: 1px solid var(--border-light);
                    border-radius: 12px;
                    background: rgba(248, 250, 252, 0.92);
                    text-align: left;
                    transition: all 0.2s ease;
                    color: inherit;
                }
                button.history-event {
                    cursor: pointer;
                }
                button.history-event:hover {
                    border-color: var(--accent-500);
                    box-shadow: 0 10px 24px rgba(37, 99, 235, 0.08);
                    transform: translateY(-1px);
                }
                .history-event-static {
                    cursor: default;
                }
                .history-event-header {
                    display: flex;
                    justify-content: space-between;
                    gap: 1rem;
                    align-items: flex-start;
                }
                .history-event-header > div {
                    display: flex;
                    flex-direction: column;
                    gap: 0.18rem;
                }
                .history-event-header strong {
                    font-size: 0.9rem;
                    color: var(--primary-900);
                }
                .history-event-header span {
                    font-size: 0.74rem;
                    color: var(--primary-500);
                }
                .history-event-time {
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: var(--primary-500);
                    white-space: nowrap;
                }
                .history-event-meta {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.55rem;
                }
                .history-event-body {
                    display: flex;
                    flex-direction: column;
                    gap: 0.24rem;
                    font-size: 0.8rem;
                    color: var(--primary-700);
                    line-height: 1.45;
                }
                .history-event-body small {
                    font-size: 0.74rem;
                    color: var(--primary-500);
                }
                .history-empty-state {
                    padding: 1rem 1.1rem;
                    border: 1px dashed var(--border-medium);
                    border-radius: 12px;
                    color: var(--primary-500);
                    font-size: 0.82rem;
                    background: rgba(248, 250, 252, 0.78);
                }

                .usage-notes h4 { font-size: 0.875rem; margin-bottom: 0.5rem; }
                .usage-notes p { font-size: 0.875rem; color: var(--primary-600); line-height: 1.5; }
                .evidence-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                .evidence-item {
                    display: flex;
                    justify-content: space-between;
                    gap: 1rem;
                    padding: 0.85rem 1rem;
                    border: 1px solid var(--border-light);
                    border-radius: 10px;
                    background: rgba(255,255,255,0.7);
                }
                .evidence-item > div {
                    display: flex;
                    flex-direction: column;
                    gap: 0.2rem;
                }
                .evidence-item span {
                    font-size: 0.75rem;
                    color: var(--primary-500);
                    line-height: 1.45;
                }

                .trust-disclaimer {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem;
                    background: rgba(37, 99, 235, 0.03);
                    border-radius: 8px;
                    color: var(--accent-600);
                    font-size: 0.75rem;
                    font-weight: 500;
                }

                .modal-footer {
                    padding: 1.5rem 2rem;
                    border-top: 1px solid var(--border-light);
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    background: var(--bg-main);
                }

                @media (max-width: 900px) {
                    .library-header-premium,
                    .listing-header,
                    .index-header {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 1rem;
                    }

                    .header-actions {
                        align-items: stretch;
                    }

                    .search-box-l {
                        width: 100%;
                    }

                    .intelligence-dashboard,
                    .report-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 640px) {
                    .modal-header,
                    .modal-body,
                    .modal-body.benchmark-admin-body,
                    .modal-footer {
                        padding-left: 1rem;
                        padding-right: 1rem;
                    }

                    .form-grid,
                    .regional-benchmark-grid,
                    .governance-grid {
                        grid-template-columns: 1fr;
                    }

                    .filter-actions {
                        flex-direction: column;
                    }

                    .history-section-header,
                    .history-event-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                }
            `}</style>
    </div>
  );
};

export default MaterialLibrary;
