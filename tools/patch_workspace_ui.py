import re
import os

workspace_path = "src/components/workspace/BOQWorkspace.jsx"
detail_path = "src/components/workspace/BOQItemDetailPanel.jsx"

# --- 1. BOQ Workspace UI Refinements ---
with open(workspace_path, 'r', encoding='utf-8') as f:
    ws_content = f.read()

# Enhance hover/selected row behavior
ws_content = re.sub(
    r'\.ws-table-row:hover \{[^}]+\}',
    r'.ws-table-row:hover { background: #f8fafc; border-color: rgba(59, 130, 246, 0.4); box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03); transform: translateY(-1px); z-index: 10; }',
    ws_content
)

# If ws-table-row:hover was not replaced because it didn't match exactly, we can do a broader replacement or append to styles if not found. Let's try appending.

# Let's insert targeted tweaks into the style blocks. 
# We'll use a reliable regex to replace the exact CSS classes.
# But since BOQWorkspace has dynamic row names like .ws-table-row, let's just append some overrides right before `</style>` at the end of BOQWorkspace.jsx

workspace_appends = """
          /* --- Polish Refinements --- */
          .ws-table-row {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .ws-table-row:hover {
            background-color: #f8fafc !important;
            border: 1px solid rgba(147, 197, 253, 0.6) !important;
            box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04) !important;
            transform: translateY(-1px) !important;
            z-index: 10 !important;
          }
          .ws-table-row.selected {
            background: linear-gradient(90deg, #eff6ff 0%, #ffffff 100%) !important;
            border-left: 4px solid #2563eb !important;
            border-top: 1px solid rgba(59, 130, 246, 0.3) !important;
            border-bottom: 1px solid rgba(59, 130, 246, 0.3) !important;
            box-shadow: 0 8px 24px rgba(37, 99, 235, 0.08) !important;
          }
          .ws-table-cell {
            font-family: 'Inter', system-ui, sans-serif !important;
            letter-spacing: -0.01em;
          }
          .ws-rate-badge.benchmark { border: 1px solid #bfdbfe; background: linear-gradient(135deg, #eff6ff, #dbeafe) !important; }
          .ws-rate-badge.formula { border: 1px solid #ddd6fe; background: linear-gradient(135deg, #f5f3ff, #ede9fe) !important; }
          .ws-rate-badge.manual { border: 1px solid #bbf7d0; background: linear-gradient(135deg, #f0fdf4, #d1fae5) !important; }
          
          .ws-summary-strip {
            box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.04) !important;
            border-bottom: 2px solid #e2e8f0 !important;
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
          }
"""

ws_content = ws_content.replace('</style>', workspace_appends + '\n        </style>')

with open(workspace_path, 'w', encoding='utf-8') as f:
    f.write(ws_content)

# --- 2. BOQ Detail Panel UI Refinements ---
with open(detail_path, 'r', encoding='utf-8') as f:
    dp_content = f.read()

# Enhance spacing and card hierarchy
dp_content = re.sub(
    r'\.idp-section-body \{[^\}]+\}',
    r'.idp-section-body { padding: 0.25rem 1.45rem 1.25rem; display: flex; flex-direction: column; gap: 0.85rem; }',
    dp_content
)

dp_content = re.sub(
    r'\.idp-section-header \{[^\}]+\}',
    r'.idp-section-header { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 1.45rem; background: none; border: none; cursor: pointer; color: #0f172a; transition: background 0.15s ease; }',
    dp_content
)

dp_content = re.sub(
    r'\.idp-overview-card \{[^\}]+\}',
    r'.idp-overview-card { display: flex; flex-direction: column; gap: 0.85rem; padding: 1.15rem; border-radius: 14px; background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%); border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.03); }',
    dp_content
)

# Formual / Benchmark Tags Polish
dp_content = re.sub(
    r'\.idp-tag-src-benchmark\s*\{[^}]+\}',
    r'.idp-tag-src-benchmark { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); color: #1d4ed8; border: 1px solid #bfdbfe; box-shadow: 0 2px 6px rgba(59, 130, 246, 0.1); }',
    dp_content
)

dp_content = re.sub(
    r'\.idp-tag-src-formula\s*\{[^}]+\}',
    r'.idp-tag-src-formula { background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); color: #6d28d9; border: 1px solid #ddd6fe; box-shadow: 0 2px 6px rgba(139, 92, 246, 0.1); }',
    dp_content
)

dp_content = re.sub(
    r'\.idp-tag-src-manual\s*\{[^}]+\}',
    r'.idp-tag-src-manual { background: linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%); color: #15803d; border: 1px solid #bbf7d0; box-shadow: 0 2px 6px rgba(34, 197, 94, 0.1); }',
    dp_content
)

dp_content = re.sub(
    r'\.idp-overview-chip-benchmark \{[^}]+\}',
    r'.idp-overview-chip-benchmark { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); color: #1d4ed8; border-color: #bfdbfe; box-shadow: 0 1px 4px rgba(59, 130, 246, 0.08); }',
    dp_content
)

dp_content = re.sub(
    r'\.idp-overview-chip-formula \{[^}]+\}',
    r'.idp-overview-chip-formula { background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); color: #6d28d9; border-color: #ddd6fe; box-shadow: 0 1px 4px rgba(139, 92, 246, 0.08); }',
    dp_content
)

with open(detail_path, 'w', encoding='utf-8') as f:
    f.write(dp_content)

print("Patch applied to BOQWorkspace and BOQItemDetailPanel successfully!")
