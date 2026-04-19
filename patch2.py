import os
import re

file_path = 'src/components/workspace/BOQWorkspace.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 2. Metrics to Toolbar
orig_metrics = """          <div className="ws-workbook-metrics">
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
          </div>"""

new_metrics = """          <div className="ws-workbook-metrics-compact">
            <button className={`ws-analytics-toggle ${showAnalytics ? 'active' : ''}`} onClick={() => setShowAnalytics(!showAnalytics)}>
              {showAnalytics ? 'Hide Analytics Dashboard' : 'Workspace Metrics & Analytics'}
            </button>
          </div>"""

content = content.replace(orig_metrics, new_metrics)
content = content.replace(orig_metrics.replace("\n", "\r\n"), new_metrics)

# 3. Unify the toolbars
orig_toolbar = """<div className="ws-toolbar-center">
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
        </div>"""

new_toolbar = """<div className="ws-toolbar-center">
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
        </div>"""

content = content.replace(orig_toolbar, new_toolbar)
content = content.replace(orig_toolbar.replace("\n", "\r\n"), new_toolbar)

# 4. Remove original filter bar
orig_filter_bar = """      <div className="ws-filter-bar">
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
      </div>"""

content = content.replace(orig_filter_bar, "")
content = content.replace(orig_filter_bar.replace("\n", "\r\n"), "")

# 5. Wrap analytics
content = content.replace('<div className="ws-insight-strip">', '{showAnalytics && (\n        <div className="ws-analytics-board">\n      <div className="ws-insight-strip">')

# 6. Add the closing div)} near the cost rail using regex since we don't know the exact string now!
# The string contains " {project?.region || 'Lagos'} market basis" and a bullet point.
# Find the end of cost rail and insert </div>)}
import re
content = re.sub(r'(<div className="ws-cost-card ws-cost-card-total">.*?</div>\n\s*</div>)', r'\1\n      </div>\n      )}', content, flags=re.DOTALL)


# 7. CSS
css = """
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
"""
content = content.replace('      <style jsx="true">{`', '      <style jsx="true">{`\n' + css)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
