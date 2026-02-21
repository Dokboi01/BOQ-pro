import React, { useState, useMemo } from 'react';
import {
    Users,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Search,
    Filter,
    BarChart2,
    Trophy,
    ArrowLeft
} from 'lucide-react';

const TenderingHub = ({ project, onUpdate }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Flatten items for the leveling table
    const allItems = useMemo(() => {
        const sections = project?.sections || [];
        return sections.flatMap(s => s.items.map(i => ({ ...i, sectionTitle: s.title })));
    }, [project]);

    // Track use of onUpdate for lint compliance (will be used in later features)
    console.log('Tendering Engine Initialized for:', project?.name);

    const filteredItems = allItems.filter(item =>
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sectionTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Helper to get the best bid for an item
    const getBestBid = (bids) => {
        if (!bids || bids.length === 0) return null;
        return bids.reduce((min, b) => b.rate < min.rate ? b : min, bids[0]);
    };

    return (
        <div className="tendering-hub view-fade-in">
            <div className="hub-header">
                <div className="header-title">
                    <div className="icon-badge">
                        <Users size={20} />
                    </div>
                    <div>
                        <h2>Tender Management & Bid Leveling</h2>
                        <p>Compare subcontractor quotes against project benchmarks for {project?.name}</p>
                    </div>
                </div>

                <div className="header-stats">
                    <div className="stat-card premium-glass">
                        <span className="label">Covered Items</span>
                        <div className="stat-value-box">
                            <span className="val">
                                {allItems.filter(i => i.bids?.length > 0).length} / {allItems.length}
                            </span>
                            <div className="mini-progress">
                                <div className="p-f" style={{ width: `${(allItems.filter(i => i.bids?.length > 0).length / allItems.length) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="stat-card premium-glass highlight">
                        <span className="label">Total Potential Saving</span>
                        <span className="val text-success">₦0.00</span>
                    </div>
                </div>
            </div>

            <div className="hub-toolbar">
                <div className="search-wrapper">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search items or sections..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="toolbar-actions">
                    <button className="btn-secondary-sm">
                        <Filter size={14} /> Filter Analysts
                    </button>
                    <button className="btn-primary-sm">
                        Generate Comparison Report
                    </button>
                </div>
            </div>

            <div className="leveling-container">
                <table className="leveling-table">
                    <thead>
                        <tr>
                            <th className="sticky-col">ITEM DESCRIPTION</th>
                            <th>UNIT</th>
                            <th>QTY</th>
                            <th>ESTIMATE (₦)</th>
                            <th className="bidder-col">SUB A (N)</th>
                            <th className="bidder-col">SUB B (N)</th>
                            <th className="bidder-col">SUB C (N)</th>
                            <th>VARIANCE (%)</th>
                            <th>STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="empty-row">No items found.</td>
                            </tr>
                        ) : (
                            filteredItems.map((item) => {
                                const bestBid = getBestBid(item.bids);
                                const benchmark = item.useBenchmark ? item.benchmark : item.rate;
                                const variance = bestBid ? ((bestBid.rate - benchmark) / benchmark * 100).toFixed(1) : '0.0';

                                if (onUpdate) {
                                    // Provision for future interactive leveling
                                }

                                return (
                                    <tr key={item.id}>
                                        <td className="sticky-col">
                                            <div className="item-info">
                                                <span className="section-tag">{item.sectionTitle}</span>
                                                <span className="item-desc">{item.description}</span>
                                            </div>
                                        </td>
                                        <td className="center">{item.unit}</td>
                                        <td className="center">{item.qty}</td>
                                        <td className="right">₦{benchmark.toLocaleString()}</td>

                                        {/* Mock Bidder Data for now */}
                                        <td className="bidder-col right">
                                            {item.bids?.[0]?.rate.toLocaleString() || '-'}
                                        </td>
                                        <td className="bidder-col right">
                                            {item.bids?.[1]?.rate.toLocaleString() || '-'}
                                        </td>
                                        <td className="bidder-col right">
                                            {item.bids?.[2]?.rate.toLocaleString() || '-'}
                                        </td>

                                        <td className={`right font-bold ${parseFloat(variance) > 0 ? 'text-danger' : 'text-success'}`}>
                                            {bestBid ? `${variance}%` : '--'}
                                        </td>
                                        <td className="center">
                                            {bestBid ? (
                                                <span className="status-badge awarded">
                                                    <Trophy size={10} /> Awarded
                                                </span>
                                            ) : (
                                                <span className="status-badge pending">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <style jsx="true">{`
        .tendering-hub {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding-top: 1rem;
        }

        .hub-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .header-title {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .icon-badge {
          width: 48px;
          height: 48px;
          background: rgba(37, 99, 235, 0.1);
          color: var(--accent-600);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(37, 99, 235, 0.2);
        }

        .header-title h2 { font-size: 1.5rem; margin: 0; color: var(--primary-900); }
        .header-title p { margin: 0; color: var(--primary-500); font-size: 0.875rem; }

        .header-stats {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .stat-card {
          padding: 1.25rem 1.5rem;
          border-radius: 16px;
          min-width: 200px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .premium-glass {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .stat-card.highlight {
          background: rgba(34, 197, 94, 0.05);
          border-color: rgba(34, 197, 94, 0.1);
        }

        .stat-value-box { display: flex; flex-direction: column; gap: 0.35rem; }
        .mini-progress { height: 4px; background: #e2e8f0; border-radius: 10px; overflow: hidden; width: 60px; }
        .p-f { height: 100%; background: var(--accent-600); }

        .mini-stat .label { font-size: 0.625rem; font-weight: 800; color: var(--primary-500); text-transform: uppercase; letter-spacing: 0.05em; }
        .mini-stat .val { font-size: 1rem; font-weight: 700; color: var(--primary-900); }

        .hub-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .search-wrapper {
          position: relative;
          flex: 1;
          max-width: 400px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--primary-400);
        }

        .search-wrapper input {
          width: 100%;
          padding: 0.625rem 1rem 0.625rem 2.5rem;
          border-radius: 8px;
          border: 1px solid var(--border-medium);
          background: white;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .search-wrapper input:focus {
          border-color: var(--accent-600);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          outline: none;
        }

        .toolbar-actions { display: flex; gap: 0.75rem; }

        .leveling-container {
          background: white;
          border-radius: 16px;
          border: 1px solid var(--border-medium);
          overflow: auto;
          max-height: calc(100vh - 350px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
        }

        .leveling-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
        }

        .leveling-table th {
          background: #f8fafc;
          padding: 1rem;
          text-align: left;
          font-weight: 700;
          color: var(--primary-600);
          border-bottom: 1.5px solid var(--border-medium);
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .leveling-table td {
          padding: 1rem;
          border-bottom: 1px solid var(--border-light);
          vertical-align: middle;
        }

        .sticky-col {
          position: sticky;
          left: 0;
          background: white;
          z-index: 5;
          min-width: 320px;
          border-right: 2px solid #f1f5f9;
          box-shadow: 10px 0 15px -10px rgba(0,0,0,0.05);
        }

        .item-info { display: flex; flex-direction: column; gap: 0.25rem; }
        .section-tag { font-size: 0.625rem; font-weight: 800; color: var(--accent-600); text-transform: uppercase; background: rgba(37, 99, 235, 0.05); padding: 1px 4px; border-radius: 4px; align-self: flex-start; }
        .item-desc { font-weight: 600; color: var(--primary-900); }

        .center { text-align: center; }
        .right { text-align: right; }
        .font-bold { font-weight: 700; }
        
        .bidder-col {
          background: #fdfdfd;
          min-width: 100px;
        }

        .text-success { color: var(--success-600); }
        .text-danger { color: var(--danger-600); }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 0.25rem 0.625rem;
          border-radius: 100px;
          font-size: 0.6875rem;
          font-weight: 700;
        }

        .awarded { 
          background: rgba(34, 197, 94, 0.1); 
          color: #15803d; 
          border: 1px solid rgba(34, 197, 94, 0.2);
        }
        .pending { 
          background: #f8fafc; 
          color: #64748b; 
          border: 1px solid #e2e8f0;
        }

        .btn-primary-sm {
          background: var(--primary-900);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.8125rem;
          cursor: pointer;
        }

        .btn-secondary-sm {
          background: white;
          border: 1px solid var(--border-medium);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.8125rem;
          cursor: pointer;
        }

        .empty-row {
          padding: 3rem;
          text-align: center;
          color: var(--primary-400);
          font-style: italic;
        }
      `}</style>
        </div>
    );
};

export default TenderingHub;
