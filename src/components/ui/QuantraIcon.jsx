import React from 'react';

/**
 * Quantra brand icon — green grid/spreadsheet with "Q" and magnifying glass.
 * Matches the official Quantra logo icon mark.
 *
 * Props: size (default 24), className
 */
const QuantraIcon = ({ size = 24, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
  >
    {/* Background rounded square */}
    <rect x="6" y="6" width="32" height="32" rx="4" fill="#2E9B6B" />

    {/* Grid lines (horizontal) */}
    <line x1="6" y1="16" x2="38" y2="16" stroke="#3AAF7A" strokeWidth="0.8" />
    <line x1="6" y1="22" x2="38" y2="22" stroke="#3AAF7A" strokeWidth="0.8" />
    <line x1="6" y1="28" x2="38" y2="28" stroke="#3AAF7A" strokeWidth="0.8" />

    {/* Grid lines (vertical) */}
    <line x1="16" y1="6" x2="16" y2="38" stroke="#3AAF7A" strokeWidth="0.8" />
    <line x1="26" y1="6" x2="26" y2="38" stroke="#3AAF7A" strokeWidth="0.8" />

    {/* Bold "Q" letter */}
    <text
      x="22"
      y="27"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="'Plus Jakarta Sans', Arial, sans-serif"
      fontWeight="800"
      fontSize="20"
      fill="white"
      letterSpacing="-0.5"
    >
      Q
    </text>

    {/* Magnifying glass overlay */}
    <circle cx="36" cy="36" r="7" fill="white" fillOpacity="0.95" />
    <circle cx="34.5" cy="34.5" r="4.5" stroke="#2E9B6B" strokeWidth="1.8" fill="none" />
    <line x1="38" y1="38" x2="42" y2="42" stroke="#2E9B6B" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default QuantraIcon;
