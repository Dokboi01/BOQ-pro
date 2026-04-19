const fs = require('fs');

const file = 'src/components/workspace/BOQWorkspace.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add State
content = content.replace(
  '  const [activeBillSectionId, setActiveBillSectionId] = useState(project?.sections?.[0]?.id || null);\n  const sectionRowRefs = React.useRef({});',
  '  const [activeBillSectionId, setActiveBillSectionId] = useState(project?.sections?.[0]?.id || null);\n  const sectionRowRefs = React.useRef({});\n  const [showAnalytics, setShowAnalytics] = useState(false);'
);

// 2. Metrics to Toolbar
const origMetrics = `          <div className="ws-workbook-metrics">
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
          </div>`;

const newMetrics = `          <div className="ws-workbook-metrics-compact">
            <button className={\`ws-analytics-toggle \${showAnalytics ? 'active' : ''}\`} onClick={() => setShowAnalytics(!showAnalytics)}>
              {showAnalytics ? 'Hide Analytics Dashboard' : 'Workspace Metrics & Analytics'}
            </button>
          </div>`;

content = content.replace(origMetrics, newMetrics);

// 3. Unify the toolbars
const origToolbarCenter = `<div className="ws-toolbar-center">
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
        </div>`;

const newToolbarCenter = `<div className="ws-toolbar-center">
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
                className={\`ws-filter-chip-compact \${workspaceFilter === filterOption.id ? 'active' : ''}\`}
                onClick={() => setWorkspaceFilter(filterOption.id)}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
        </div>`;

content = content.replace(origToolbarCenter, newToolbarCenter);

// 4. Remove original filter bar
const originalFilterBar = `      <div className="ws-filter-bar">
        {workspaceFilterOptions.map((filterOption) => (
          <button
            key={filterOption.id}
            type="button"
            className={\`ws-filter-chip \${workspaceFilter === filterOption.id ? 'active' : ''}\`}
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
      </div>`;

content = content.replace(originalFilterBar, '');

// 5. Wrap analytics
content = content.replace(
  '<div className="ws-insight-strip">',
  '{showAnalytics && (\n        <div className="ws-analytics-board">\n      <div className="ws-insight-strip">'
);

// Close wrapper after cost rail
const originalCostRailEnd = `          <small className="ws-cost-meta">
            {project?.region || 'Lagos'} market basis · {workspaceAnalytics.totalItems} measured item{workspaceAnalytics.totalItems === 1 ? '' : 's'}
          </small>
        </div>
      </div>`;

const newCostRailEnd = `          <small className="ws-cost-meta">
            {project?.region || 'Lagos'} market basis · {workspaceAnalytics.totalItems} measured item{workspaceAnalytics.totalItems === 1 ? '' : 's'}
          </small>
        </div>
      </div>
      </div>
      )}`;

content = content.replace(originalCostRailEnd, newCostRailEnd);

// 6. Define additional CSS
const cssToInject = `
        /* --- NEW COMPACT LAYOUT STYLES --- */
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
`;

content = content.replace('      <style jsx="true">{`', '      <style jsx="true">{`' + cssToInject);

fs.writeFileSync(file, content);
console.log('Script completed.');
