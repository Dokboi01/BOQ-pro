import React from 'react';
import {
  Building2,
  Map,
  Construction as BridgeIcon,
  Box,
  Layers,
  X,
  ChevronRight,
  TrendingUp,
  Fence,
  Sparkles,
  Zap,
  ArrowRight
} from 'lucide-react';
import { STRUCTURE_TYPES } from '../../data/structures';

const StructureSelector = ({ onSelect, onClose }) => {
  const structureOptions = [
    {
      id: STRUCTURE_TYPES.RESIDENTIAL,
      label: 'Residential Building',
      icon: Building2,
      desc: 'Standard housing, apartments, or commercial blocks.',
      tags: ['Building', 'Architecture']
    },
    {
      id: STRUCTURE_TYPES.ROAD,
      label: 'Road Construction',
      icon: Map,
      desc: 'Highways, urban roads, or site access ways.',
      tags: ['Civil', 'Infrastructure']
    },
    {
      id: STRUCTURE_TYPES.BRIDGE,
      label: 'Bridge / Flyover',
      icon: BridgeIcon,
      desc: 'Structural spans, interchanges, and piling.',
      tags: ['Heavy Civil', 'Structural']
    },
    {
      id: STRUCTURE_TYPES.CULVERT,
      label: 'Box Culvert',
      icon: Box,
      desc: 'Drainage structures and water crossings.',
      tags: ['Drainage', 'Concrete']
    },
    {
      id: STRUCTURE_TYPES.RETAINING_WALL,
      label: 'Retaining Wall',
      icon: Fence,
      desc: 'Soil stabilization and slope protection.',
      tags: ['Geotechnical', 'Civil']
    },
    {
      id: STRUCTURE_TYPES.COMMERCIAL,
      label: 'Commercial Building',
      icon: Building2,
      desc: 'Plazas, offices, and large-scale complexes.',
      tags: ['Building', 'Structural']
    }
  ];

  const aiOption = {
    id: 'ai-analysis',
    label: 'AI Drawing Assistant',
    icon: Sparkles,
    desc: 'Instant takeoff from blueprints. Upload drawing files to auto-build your BOQ.',
    tags: ['AI Powered', 'Consultant Grade'],
    isPremium: true
  };

  return (
    <div className="selector-overlay">
      <div className="selector-modal enterprise-card view-fade-in">
        <header className="selector-header">
          <div>
            <h3>Select Structure Type</h3>
            <p>Picking a structure will pre-load your BOQ with industry-standard components and rates.</p>
          </div>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="selection-grid">
          <div className="selection-card ai-card" onClick={() => onSelect('ai-analysis', 'AI Drawing Draft')}>
            <div className="card-icon ai-icon">
              <Sparkles size={24} />
            </div>
            <div className="card-body">
              <div className="title-row">
                <h4>{aiOption.label}</h4>
                <span className="premium-tag">PREMIUM</span>
              </div>
              <p>{aiOption.desc}</p>
              <div className="card-tags">
                {aiOption.tags.map(tag => <span key={tag} className="tag ai-tag">{tag}</span>)}
              </div>
            </div>
            <ArrowRight size={18} className="arrow" />
          </div>

          <div className="grid-divider">
            <span>Or select a standard structure</span>
          </div>

          {structureOptions.map((opt) => (
            <div
              key={opt.id}
              className="selection-card"
              onClick={() => onSelect(opt.id, opt.label)}
            >
              <div className="card-icon">
                <opt.icon size={24} />
              </div>
              <div className="card-body">
                <h4>{opt.label}</h4>
                <p>{opt.desc}</p>
                <div className="card-tags">
                  {opt.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                </div>
              </div>
              <ChevronRight size={18} className="arrow" />
            </div>
          ))}
        </div>

        <footer className="selector-footer">
          <div className="hint">
            <TrendingUp size={14} />
            <span>AI Rate Engine will automatically build analysis for each component.</span>
          </div>
        </footer>
      </div>

      <style jsx="true">{`
        .selector-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .selector-modal {
          width: 100%;
          max-width: 640px;
          background: white;
          padding: 0;
          overflow: hidden;
        }

        .selector-header {
          padding: 2rem;
          background: var(--bg-main);
          border-bottom: 1px solid var(--border-light);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .selector-header h3 { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .selector-header p { font-size: 0.875rem; color: var(--primary-500); }

        .btn-close {
          background: transparent;
          border: none;
          color: var(--primary-400);
          cursor: pointer;
          padding: 4px;
        }

        .selection-grid {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 480px;
          overflow-y: auto;
        }

        .selection-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.25rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
        }

        .selection-card:hover {
          border-color: var(--accent-600);
          background: var(--bg-main);
          transform: translateX(4px);
        }

        .selection-card.ai-card {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: white;
        }

        .selection-card.ai-card:hover {
          transform: translateY(-2px) translateX(4px);
          border-color: var(--accent-500);
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }

        .ai-icon {
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          border: none;
          color: white;
        }

        .ai-card h4 { color: white; }
        .ai-card p { color: #94a3b8; }
        
        .title-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .premium-tag {
          font-size: 0.625rem;
          font-weight: 800;
          background: var(--accent-600);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .ai-tag {
          background: rgba(255,255,255,0.05);
          color: #60a5fa;
        }

        .grid-divider {
          display: flex;
          align-items: center;
          margin: 1rem 0;
          color: var(--primary-400);
          font-size: 0.625rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .grid-divider::before, .grid-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--border-light);
        }

        .grid-divider span { padding: 0 1rem; }

        .card-icon {
          width: 48px;
          height: 48px;
          background: white;
          border: 1px solid var(--border-medium);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-900);
          flex-shrink: 0;
        }

        .selection-card:hover .card-icon {
          background: var(--accent-600);
          color: white;
          border-color: var(--accent-600);
        }

        .card-body { flex: 1; }
        .card-body h4 { margin-bottom: 0.25rem; }
        .card-body p { font-size: 0.75rem; color: var(--primary-500); margin-bottom: 0.75rem; }

        .card-tags { display: flex; gap: 0.5rem; }
        .tag {
          font-size: 0.625rem;
          font-weight: 700;
          background: rgba(0,0,0,0.05);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--primary-600);
        }

        .arrow { color: var(--primary-300); }
        .selection-card:hover .arrow { color: var(--accent-600); }

        .selector-footer {
          padding: 1.25rem 2rem;
          background: var(--bg-main);
          border-top: 1px solid var(--border-light);
        }

        .hint {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent-600);
        }

        /* ── Selector Mobile Overrides ── */
        @media (max-width: 768px) {
          .selector-modal {
            width: 100%;
            height: 100vh;
            max-height: 100vh;
            display: flex;
            flex-direction: column;
            border-radius: 0;
            margin: 0;
          }

          .selector-header {
            padding: 1.5rem 1rem;
          }

          .selection-grid {
            padding: 1rem;
            flex: 1;
            overflow-y: auto;
            max-height: none;
          }

          .selection-card {
            padding: 1rem;
            gap: 1rem;
          }

          .selection-card .card-icon {
            width: 40px;
            height: 40px;
          }

          .selector-footer {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default StructureSelector;
