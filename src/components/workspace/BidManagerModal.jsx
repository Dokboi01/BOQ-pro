import React, { useState } from 'react';
import {
    X,
    Users,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    ChevronRight,
    Gavel
} from 'lucide-react';

const BidManagerModal = ({ item, onClose, onSave }) => {
    const [bids, setBids] = useState(item.bids || []);
    const [newBid, setNewBid] = useState({ subcontractor: '', rate: 0, notes: '' });

    const addBid = () => {
        if (!newBid.subcontractor || newBid.rate <= 0) return;
        const bidWithId = { ...newBid, id: Math.random().toString(36).substr(2, 9), selected: false };
        setBids([...bids, bidWithId]);
        setNewBid({ subcontractor: '', rate: 0, notes: '' });
    };

    const removeBid = (id) => {
        setBids(bids.filter(b => b.id !== id));
    };

    const toggleSelect = (id) => {
        setBids(bids.map(b => ({
            ...b,
            selected: b.id === id ? !b.selected : false
        })));
    };

    const benchmark = item.benchmark || 0;

    return (
        <div className="modal-overlay">
            <div className="modal-content bid-manager-modal view-fade-in">
                <div className="modal-header">
                    <div className="title-with-icon">
                        <div className="icon-circle">
                            <Gavel size={18} />
                        </div>
                        <div>
                            <h3>Market Bid Leveling</h3>
                            <p className="item-ref">{item.description}</p>
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body">
                    <div className="benchmark-bar">
                        <span className="label">Project Benchmark (Lagos)</span>
                        <span className="val">₦{benchmark.toLocaleString()}</span>
                    </div>

                    <div className="bids-list">
                        <h4>Active Subcontractor Quotes</h4>
                        {bids.length === 0 ? (
                            <div className="empty-bids">
                                <Users size={32} />
                                <p>No market bids entered for this item yet.</p>
                            </div>
                        ) : (
                            <div className="bids-grid">
                                {bids.map(bid => {
                                    const variance = ((bid.rate - benchmark) / benchmark * 100).toFixed(1);
                                    const isLow = bid.rate <= benchmark;

                                    return (
                                        <div key={bid.id} className={`bid-card ${bid.selected ? 'selected' : ''}`}>
                                            <div className="bid-card-header">
                                                <span className="sub-name">{bid.subcontractor}</span>
                                                <button className="btn-delete" onClick={() => removeBid(bid.id)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className="bid-card-body">
                                                <div className="bid-rate">₦{bid.rate.toLocaleString()}</div>
                                                <div className={`bid-variance ${isLow ? 'positive' : 'negative'}`}>
                                                    {isLow ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                                                    {Math.abs(variance)}% vs benchmark
                                                </div>
                                            </div>
                                            <button
                                                className={`btn-select-bid ${bid.selected ? 'active' : ''}`}
                                                onClick={() => toggleSelect(bid.id)}
                                            >
                                                {bid.selected ? <><CheckCircle2 size={14} /> Winning Bid</> : 'Select as Winner'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="add-bid-form">
                        <h4>Add New Market Quote</h4>
                        <div className="form-row">
                            <div className="input-group">
                                <label>Subcontractor Name</label>
                                <input
                                    type="text"
                                    value={newBid.subcontractor}
                                    onChange={(e) => setNewBid({ ...newBid, subcontractor: e.target.value })}
                                    placeholder="e.g. Julius Berger Bids"
                                />
                            </div>
                            <div className="input-group">
                                <label>Quote Rate (₦)</label>
                                <input
                                    type="number"
                                    value={newBid.rate}
                                    onChange={(e) => setNewBid({ ...newBid, rate: Number(e.target.value) })}
                                />
                            </div>
                            <button className="btn-add-bid" onClick={addBid} disabled={!newBid.subcontractor || newBid.rate <= 0}>
                                <Plus size={16} /> Add Bid
                            </button>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary-action" onClick={() => onSave(bids)}>
                        Save & Update Cost Plan
                    </button>
                </div>
            </div>

            <style jsx="true">{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fade-in 0.25s ease;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content.bid-manager-modal {
          background: white;
          width: 720px;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          animation: scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-header {
          padding: 1.5rem 2rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .title-with-icon { display: flex; gap: 1rem; align-items: center; }
        .icon-circle {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
        }

        .modal-header h3 { margin: 0; font-size: 1.25rem; color: var(--primary-900); }
        .item-ref { margin: 0; font-size: 0.8125rem; color: var(--primary-500); font-weight: 600; }

        .btn-close { background: none; border: none; color: var(--primary-400); cursor: pointer; }

        .modal-body {
          padding: 2rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .benchmark-bar {
          background: #f1f5f9;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-left: 4px solid var(--accent-600);
        }

        .benchmark-bar .label { font-size: 0.75rem; font-weight: 800; color: var(--primary-600); text-transform: uppercase; }
        .benchmark-bar .val { font-size: 1.25rem; font-weight: 900; color: var(--primary-900); }

        .bids-list h4, .add-bid-form h4 { font-size: 0.875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary-400); margin-bottom: 1rem; }

        .empty-bids {
          padding: 3rem;
          text-align: center;
          background: #fdfdfd;
          border: 2px dashed #e2e8f0;
          border-radius: 12px;
          color: var(--primary-400);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .bids-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .bid-card {
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .bid-card:hover {
          border-color: #94a3b8;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
          transform: translateY(-2px);
        }

        .bid-card.selected {
          border-color: #f59e0b;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          box-shadow: 0 8px 24px rgba(245, 158, 11, 0.15);
          transform: translateY(-2px);
        }

        .bid-card-header { display: flex; justify-content: space-between; align-items: center; }
        .sub-name { font-weight: 700; color: var(--primary-900); }
        .btn-delete { background: none; border: none; color: var(--primary-300); cursor: pointer; transition: color 0.2s; }
        .btn-delete:hover { color: var(--danger-600); }

        .bid-card-body { display: flex; flex-direction: column; gap: 0.25rem; }
        .bid-rate { font-size: 1.125rem; font-weight: 900; color: var(--primary-900); }
        .bid-variance { font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 0.25rem; }
        .bid-variance.positive { color: var(--success-600); }
        .bid-variance.negative { color: var(--danger-600); }

        .btn-select-bid {
          width: 100%;
          padding: 0.625rem;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: white;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-select-bid:hover { background: #f8fafc; border-color: var(--primary-300); }
        .btn-select-bid.active { background: #fbbf24; border-color: #d97706; color: #78350f; }

        .add-bid-form {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .form-row { display: flex; gap: 1rem; align-items: flex-end; }
        .input-group { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
        .input-group label { font-size: 0.6875rem; font-weight: 800; color: var(--primary-500); text-transform: uppercase; }
        .input-group input { padding: 0.75rem; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 0.875rem; transition: all 0.2s; }
        .input-group input:focus { border-color: #2563eb; outline: none; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

        .btn-add-bid {
          background: var(--primary-900);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
        }

        .btn-add-bid:hover {
          background: #1e293b;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
        }

        .btn-add-bid:disabled {
          opacity: 0.4;
          pointer-events: none;
        }

        .modal-footer {
          padding: 1.5rem 2rem;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          background: #fafbfc;
        }

        .btn-secondary { background: white; border: 1.5px solid #cbd5e1; padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
        .btn-secondary:hover { border-color: #94a3b8; background: #f8fafc; }
        .btn-primary-action { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 700; font-size: 0.875rem; cursor: pointer; box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3); transition: all 0.3s; }
        .btn-primary-action:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(37, 99, 235, 0.4); }
      `}</style>
        </div>
    );
};

export default BidManagerModal;
