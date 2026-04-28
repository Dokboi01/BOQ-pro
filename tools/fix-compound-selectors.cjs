const fs = require('fs');
const path = require('path');

const FILES = [
  'src/components/workspace/BOQSelectionStage.jsx',
  'src/components/workspace/BOQWorkspace.jsx',
];

// Class names that the JSX uses as compound classes (multiple on one element)
// but the CSS lost their leading dots. Order longest first as belt-and-braces;
// the negative lookahead `(?![\w-])` already prevents prefix matches.
const BROKEN_CLASSES = [
  'glass-panel-summary', 'glass-panel-footer', 'glass-panel-head',
  'glass-panel-list', 'glass-panel-item', 'glass-panel',
  'glass-card-kicker', 'glass-card-heading', 'glass-card-summary',
  'glass-card-footer', 'glass-card-basis', 'glass-card-total',
  'glass-card-flags', 'glass-card-tags', 'glass-card-meta',
  'glass-card-list', 'glass-card-grid', 'glass-card-wrap',
  'glass-card-wide', 'glass-card-top',
  'glass-cards-row', 'glass-card',
  'glass-input',
  'emerald-text-gradient', 'emerald-button',
  'staggered-fade-in',
  'obsidian-surface',
];

// Match CSS rule space-then-classname when preceded by a word char or hyphen
// (so we land inside a `.foo glass-panel` selector, not at column-0 of a JSX line).
function fixCssBlock(css) {
  let count = 0;
  for (const cls of BROKEN_CLASSES) {
    const re = new RegExp(`(?<=[\\w-])\\s+${cls}(?![\\w-])`, 'g');
    css = css.replace(re, () => { count++; return '.' + cls; });
  }
  return { css, count };
}

const STYLE_BLOCK = /(<style[^>]*>\{`)([\s\S]*?)(`\}<\/style>)/g;

let grandTotal = 0;
for (const rel of FILES) {
  const file = path.resolve(rel);
  const original = fs.readFileSync(file, 'utf8');
  let perFile = 0;

  const updated = original.replace(STYLE_BLOCK, (m, open, css, close) => {
    const { css: nextCss, count } = fixCssBlock(css);
    perFile += count;
    return open + nextCss + close;
  });

  if (updated !== original) {
    fs.writeFileSync(file, updated, 'utf8');
    console.log(`${rel}: fixed ${perFile} selector(s)`);
  } else {
    console.log(`${rel}: no changes`);
  }
  grandTotal += perFile;
}

console.log(`\nTotal: ${grandTotal} selector(s) fixed`);
