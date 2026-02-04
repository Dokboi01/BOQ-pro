import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Info,
  Edit2,
  BarChart3,
  MapPin,
  Calendar,
  ArrowRight,
  SearchCheck,
  AlertCircle,
  ChevronRight,
  Activity,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { hasFeature, PLAN_NAMES } from '../../data/plans';
import { getMaterials, getMarketIndices } from '../../db/database';
import { Loader2 } from 'lucide-react';

const MaterialLibrary = ({ user, activeProject, onUpdate, onUpgrade }) => {
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [marketIndices, setMarketIndices] = useState([]);
  const [loading, setLoading] = useState(true);

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
      lastUpdated: '2 days ago',
      delta: '+4.2%',
      history: [11000, 11500, 11800, 12500],
      usage: 'Primary binder for all concrete works, plastering, and block making.'
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
      usage: 'High-tensile reinforcement for structural concrete elements.'
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
      usage: 'Essential for concrete production and mortar mixes.'
    },
    {
      id: 4,
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
      usage: 'Asphaltic surface dressing for road pavements.'
    }
  ], []);

  const defaultMarketIndices = React.useMemo(() => [
    { label: 'Overall CMCI', val: 142.5, delta: '+1.4%', trend: 'up' },
    { label: 'Binder Index', val: 156.2, delta: '+3.2%', trend: 'up' },
    { label: 'Metal Index', val: 128.9, delta: '-0.8%', trend: 'down' },
    { label: 'Aggregates', val: 115.4, delta: '+0.2%', trend: 'up' },
  ], []);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [mats, indices] = await Promise.all([
          getMaterials(),
          getMarketIndices()
        ]);

        // If Supabase is empty, use defaults for visual consistency, 
        // but ideally we seed the DB.
        setMaterials(mats.length > 0 ? mats : defaultMaterials);
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

  const renderIntelligenceDashboard = () => {
    const isLocked = !hasFeature(user?.plan, 'material-intelligence');

    return (
      <div className={`intelligence-dashboard ${isLocked ? 'locked-view' : ''}`}>
        {isLocked && (
          <div className="locked-overlay">
            <Lock size={40} className="mb-4" />
            <h3>Premium Feature</h3>
            <p>Upgrade to Practitioner to unlock real-time market intelligence and cost indices.</p>
            <button className="btn-primary-action mt-4" onClick={onUpgrade}>View Plans</button>
          </div>
        )}
        <div className="dashboard-grid-mini">
          <div className="enterprise-card intel-metric">
            <div className="metric-header">
              <span className="label">Monthly CMCI Movement</span>
              <Activity size={16} className="text-accent" />
            </div>
            <div className="metric-val text-danger">+4.8%</div>
            <div className="metric-footer">Across 12 major categories</div>
          </div>
          <div className="enterprise-card intel-metric">
            <div className="metric-header">
              <span className="label">Highest Exposure Category</span>
              <AlertCircle size={16} className="text-warning" />
            </div>
            <div className="metric-val">Bitumen & Oils</div>
            <div className="metric-footer">Avg. ₦185,000 per drum</div>
          </div>
          <div className="enterprise-card intel-metric">
            <div className="metric-header">
              <span className="label">Market Trust Score</span>
              <ShieldCheck size={16} className="text-success" />
            </div>
            <div className="metric-val">98.2%</div>
            <div className="metric-footer">Based on 1.4k regional inputs</div>
          </div>
        </div>

        <div className="market-index-section enterprise-card">
          <div className="index-header">
            <div className="title-box">
              <h3>Construction Material Cost Index (CMCI)</h3>
              <p>Industry-standard tracking of cost movements in West Africa</p>
            </div>
            <button className="btn-secondary small">View Full Index History</button>
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

  const renderDetailModal = (mat) => (
    <div className="detail-modal-overlay" onClick={() => setSelectedMaterial(null)}>
      <div className="detail-modal enterprise-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="mat-identity">
            <span className="cat-tag">{mat.category}</span>
            <h3>{mat.name} Intelligence Report</h3>
          </div>
          <button className="close-btn" onClick={() => setSelectedMaterial(null)}>×</button>
        </div>

        <div className="modal-body">
          <div className="report-grid">
            <div className="price-trends">
              <div className="section-title">Historical Benchmark Trend (6 Months)</div>
              <div className="trend-chart-placeholder">
                <div className="chart-bars">
                  {mat.history.map((h, i) => (
                    <div key={i} className="chart-bar-group">
                      <div className="bar" style={{ height: `${(h / Math.max(...mat.history)) * 100}%` }}></div>
                      <span>M{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bench-stats">
              <div className="stat-box">
                <span className="s-label">Market Benchmark</span>
                <span className="s-val">₦{mat.benchmark.toLocaleString()}</span>
              </div>
              <div className="stat-box">
                <span className="s-label">Regional Range (Lagos)</span>
                <span className="s-val small">{mat.range}</span>
              </div>
              <div className="stat-box">
                <span className="s-label">Confidence Rating</span>
                <span className="s-val text-success">HIGH</span>
              </div>
            </div>
          </div>

          <div className="usage-notes">
            <h4>Standard Usage Notes</h4>
            <p>{mat.usage}</p>
          </div>

          <div className="trust-disclaimer">
            <Info size={14} />
            <span>Rates reflect aggregated market data from registered suppliers. Benchmark values are advisory, not prescriptive.</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => setSelectedMaterial(null)}>Close Report</button>
          <button
            className="btn-primary"
            onClick={() => {
              if (!activeProject) {
                alert('Please select or open a project first.');
                return;
              }
              const updatedSections = (activeProject.sections || []).map(section => ({
                ...section,
                items: section.items.map(item => {
                  // Matching logic: rudimentary check on description containing material name
                  if (item.description.toLowerCase().includes(mat.name.toLowerCase().split(' ')[0])) {
                    return {
                      ...item,
                      rate: mat.price,
                      useBenchmark: false,
                      total: item.qty * mat.price
                    };
                  }
                  return item;
                })
              }));
              onUpdate(activeProject.id, updatedSections);
              alert(`Applied ${mat.name} benchmark rate of ₦${mat.price.toLocaleString()} to matching items.`);
              setSelectedMaterial(null);
            }}
          >
            Apply Benchmark to Project
          </button>
        </div>
      </div>
    </div>
  );

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
          <h2>Material Price Intelligence</h2>
          <p>Evidence-based market benchmarks for professional quantity surveying</p>
        </div>
        <div className="header-actions">
          <div className="update-badge">
            <Calendar size={14} />
            <span>Next Index Refresh: 14 Feb 2026</span>
          </div>
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
            <input type="text" placeholder="Search benchmark repository..." />
          </div>
          <div className="filter-actions">
            <button className="btn-filter"><Filter size={14} /> All Categories</button>
            <button className="btn-filter"><MapPin size={14} /> Region: Lagos</button>
          </div>
        </div>

        <div className="intelligence-grid-l">
          {materials.map((mat) => (
            <div key={mat.id} className="enterprise-card mat-intel-card" onClick={() => setSelectedMaterial(mat)}>
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
                <span className="p-label">Market Avg</span>
                <div className="p-val">
                  <span className="curr">₦</span>
                  <span className="amount">{mat.price.toLocaleString()}</span>
                </div>
              </div>
              <div className="card-footer-l">
                <div className="last-sync">Updated {mat.lastUpdated}</div>
                <div className="view-link">
                  Analysis <ArrowRight size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedMaterial && renderDetailModal(selectedMaterial)}

      {selectedMaterial && renderDetailModal(selectedMaterial)}

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

                .metric-footer {
                    font-size: 0.6875rem;
                    color: var(--primary-400);
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
                    grid-template-columns: repeat(4, 1fr);
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
                    border: 1px solid var(--border-medium);
                    border-radius: 8px;
                    padding: 0.625rem 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    width: 400px;
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
                    transition: transform 0.2s;
                }

                .mat-intel-card:hover { transform: translateY(-3px); border-color: var(--accent-600); }

                .card-top-row { display: flex; justify-content: space-between; margin-bottom: 0.75rem; }
                .cat-text { font-size: 0.6875rem; font-weight: 700; color: var(--primary-400); text-transform: uppercase; }
                .mini-trend { font-size: 0.75rem; font-weight: 700; }
                .mini-trend.up { color: var(--danger-600); }
                .mini-trend.down { color: var(--success-600); }

                .mat-name-row h4 { font-size: 1rem; margin-bottom: 0.25rem; }
                .unit-text { font-size: 0.75rem; color: var(--primary-500); }

                .mat-price-row { margin-top: 1.25rem; display: flex; flex-direction: column; }
                .p-label { font-size: 0.6875rem; font-weight: 600; color: var(--primary-400); }
                .p-val { display: flex; align-items: baseline; gap: 0.25rem; }
                .p-val .curr { font-weight: 700; color: var(--primary-600); }
                .p-val .amount { font-size: 1.5rem; font-weight: 800; color: var(--primary-900); }

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

                /* Modal Styles */
                .detail-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.7);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .detail-modal {
                    width: 100%;
                    max-width: 800px;
                    background: white;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                }

                .modal-header {
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid var(--border-light);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
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
                .bar { width: 40px; background: var(--accent-600); border-radius: 4px 4px 0 0; }
                .chart-bar-group span { font-size: 0.625rem; font-weight: 700; color: var(--primary-400); }

                .bench-stats { display: flex; flex-direction: column; gap: 1rem; }
                .stat-box { display: flex; flex-direction: column; padding: 1rem; background: var(--bg-main); border-radius: 8px; }
                .s-label { font-size: 0.6875rem; font-weight: 600; color: var(--primary-500); margin-bottom: 0.25rem; }
                .s-val { font-size: 1.125rem; font-weight: 800; }
                .s-val.small { font-size: 0.8125rem; }

                .usage-notes h4 { font-size: 0.875rem; margin-bottom: 0.5rem; }
                .usage-notes p { font-size: 0.875rem; color: var(--primary-600); line-height: 1.5; }

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
            `}</style>
    </div>
  );
};

export default MaterialLibrary;
