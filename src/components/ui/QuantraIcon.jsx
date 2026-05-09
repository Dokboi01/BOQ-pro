import React from 'react';

/**
 * Quantra brand icon — Stylized "Q" with ascending bar chart and gold growth arrow.
 * Matches the official Quantra branding guide.
 *
 * Props: size (default 24), className, variant ('full' | 'monochrome' | 'gold')
 */
const QuantraIcon = ({ size = 24, className = '', variant = 'full' }) => {
  const colors = {
    full: {
      qStroke: '#1e6cf7',       // Royal blue Q
      qFill: 'none',
      bars: ['#c0c8d4', '#d0d6de', '#e0e4ea', '#f0f2f5'],  // Silver gradient bars
      arrow: 'url(#goldGrad)',
      arrowFallback: '#d4a017',
    },
    monochrome: {
      qStroke: '#ffffff',
      qFill: 'none',
      bars: ['#999', '#aaa', '#bbb', '#ccc'],
      arrow: '#ffffff',
      arrowFallback: '#ffffff',
    },
    gold: {
      qStroke: '#d4a017',
      qFill: 'none',
      bars: ['#b8860b', '#c49a1a', '#d4a017', '#e0b830'],
      arrow: '#d4a017',
      arrowFallback: '#d4a017',
    },
  };

  const c = colors[variant] || colors.full;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b8860b" />
          <stop offset="50%" stopColor="#d4a017" />
          <stop offset="100%" stopColor="#f0d060" />
        </linearGradient>
        <linearGradient id="blueGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1557cc" />
          <stop offset="100%" stopColor="#3b8af7" />
        </linearGradient>
      </defs>

      {/* Stylized "Q" letter */}
      <path
        d="M24 6C13.5 6 5 14.5 5 25C5 35.5 13.5 44 24 44C28.5 44 32.5 42.5 35.5 39.8L40 44L43 41L38.5 36.8C41 33.5 42.5 29.5 42.5 25C42.5 14.5 34.5 6 24 6Z M24 11C31.7 11 38 17.3 38 25C38 28.3 36.9 31.3 35 33.7L30 28.7L27.5 31.2L32.5 36.2C30.1 37.9 27.2 39 24 39C16.3 39 10 32.7 10 25C10 17.3 16.3 11 24 11Z"
        fill={variant === 'full' ? 'url(#blueGrad)' : c.qStroke}
        opacity="0.9"
      />

      {/* Ascending bar chart (4 bars) */}
      <rect x="17" y="28" width="3.5" height="7" rx="1" fill={c.bars[0]} />
      <rect x="21.5" y="24" width="3.5" height="11" rx="1" fill={c.bars[1]} />
      <rect x="26" y="20" width="3.5" height="15" rx="1" fill={c.bars[2]} />
      <rect x="30.5" y="16" width="3.5" height="19" rx="1" fill={c.bars[3]} />

      {/* Growth arrow (sweeping upward) */}
      <path
        d="M15 33C18 28 22 22 28 17L33 12"
        stroke={variant === 'full' ? c.arrow : c.arrowFallback}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Arrow head */}
      <path
        d="M30 8L34 12L29 14"
        stroke={variant === 'full' ? c.arrow : c.arrowFallback}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

export default QuantraIcon;
