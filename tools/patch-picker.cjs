const fs = require('fs');

const file = 'src/components/workspace/BOQItemPickerModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const originalLayoutStart = `        <div className="boq-picker-toolbar">
          <div className="boq-picker-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search by code, item, trade, hint, formula, or keyword"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
            />
          </div>
          <div className="boq-picker-summary">
            <span>{catalogItems.length} library items</span>
            <span>{availableToSelectCount} visible</span>
            <span>{selectedItems.length} selected</span>
          </div>
        </div>

        <div className="boq-picker-filter-strip">
          <div className="boq-picker-filter-group">
            <span className="boq-picker-filter-label">
              <ListFilter size={13} /> Filter
            </span>
            {FILTER_OPTIONS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={\\\`boq-picker-chip \${activeFilter === filter.id ? 'active' : ''}\\\`}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="boq-picker-filter-group">
            <span className="boq-picker-filter-label">Category</span>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={\\\`boq-picker-chip \${activeCategory === category ? 'active' : ''}\\\`}
                onClick={() => setActiveCategory(category)}
              >
                {category === 'all' ? 'All Categories' : category}
              </button>
            ))}
          </div>
        </div>

        <div className="boq-picker-list">`;

const newLayoutStart = `        <div className="boq-picker-body-split">
          
          <div className="boq-picker-sidebar">
            <div className="boq-picker-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search items..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
              />
            </div>
            
            <div className="boq-picker-filter-strip vertical">
              <div className="boq-picker-sidebar-group">
                <span className="boq-picker-sidebar-label">
                  <ListFilter size={13} /> Filter
                </span>
                <div className="boq-picker-sidebar-chips">
                  {FILTER_OPTIONS.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      className={\\\`boq-picker-sidebar-chip \${activeFilter === filter.id ? 'active' : ''}\\\`}
                      onClick={() => setActiveFilter(filter.id)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="boq-picker-sidebar-group">
                <span className="boq-picker-sidebar-label">Categories</span>
                <div className="boq-picker-sidebar-chips column">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={\\\`boq-picker-sidebar-chip \${activeCategory === category ? 'active' : ''}\\\`}
                      onClick={() => setActiveCategory(category)}
                    >
                      {category === 'all' ? 'All Categories' : category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="boq-picker-main">
            <div className="boq-picker-main-toolbar">
              <div className="boq-picker-summary">
                <span>{catalogItems.length} library items</span>
                <span>{availableToSelectCount} visible</span>
                <span className="highlight-selected">{selectedItems.length} selected</span>
              </div>
            </div>
            
            <div className="boq-picker-list">`;

content = content.replace(originalLayoutStart, newLayoutStart);

// Close the split layout before footer
const footerStart = `        <footer className="boq-picker-footer">`;
const footerStartNew = `          </div>
        </div>
        <footer className="boq-picker-footer">`;

content = content.replace(footerStart, footerStartNew);

// Add modern CSS styles
const additionalCSS = `
        /* --- NEW SPLIT-VIEW STYLES --- */
        .boq-picker-modal {
          width: min(1200px, 95vw) !important;
          max-height: 90vh !important;
        }
        
        .boq-picker-body-split {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .boq-picker-sidebar {
          width: 260px;
          flex-shrink: 0;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
        }

        .boq-picker-sidebar .boq-picker-search {
          margin: 1.25rem 1.25rem 0;
          border-radius: 10px;
          background: white;
        }
        .boq-picker-sidebar .boq-picker-search input {
           font-size: 0.8rem;
        }

        .boq-picker-filter-strip.vertical {
          padding: 1.25rem;
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          border: none;
          background: transparent;
        }

        .boq-picker-sidebar-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .boq-picker-sidebar-label {
           display: flex;
           align-items: center;
           gap: 0.35rem;
           font-size: 0.7rem;
           font-weight: 800;
           text-transform: uppercase;
           letter-spacing: 0.05em;
           color: #64748b;
        }

        .boq-picker-sidebar-chips {
           display: flex;
           flex-wrap: wrap;
           gap: 0.35rem;
        }
        
        .boq-picker-sidebar-chips.column {
           flex-direction: column;
        }

        .boq-picker-sidebar-chip {
           text-align: left;
           background: transparent;
           border: 1px solid transparent;
           color: #475569;
           padding: 0.4rem 0.6rem;
           border-radius: 6px;
           font-size: 0.76rem;
           font-weight: 600;
           cursor: pointer;
           transition: all 0.2s;
        }

        .boq-picker-sidebar-chip:hover {
           background: #f1f5f9;
        }

        .boq-picker-sidebar-chip.active {
           background: #eff6ff;
           color: #1d4ed8;
           border-color: #bfdbfe;
           font-weight: 700;
        }

        .boq-picker-main {
           flex: 1;
           display: flex;
           flex-direction: column;
           overflow: hidden;
           background: #f1f5f9;
        }
        
        .boq-picker-main-toolbar {
           padding: 0.75rem 1.5rem;
           border-bottom: 1px solid #e2e8f0;
           background: white;
           display: flex;
           justify-content: flex-end;
        }

        .boq-picker-summary span.highlight-selected {
           background: #0f172a;
           color: white;
        }

        .boq-picker-group-grid {
           grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important;
        }

        .boq-picker-card {
           border-radius: 12px !important;
           padding: 1.25rem !important;
           box-shadow: 0 4px 12px rgba(15,23,42,0.02);
        }
`;

content = content.replace('      <style jsx="true">{`', '      <style jsx="true">{`' + additionalCSS);

fs.writeFileSync(file, content);
console.log('Patch complete.');
