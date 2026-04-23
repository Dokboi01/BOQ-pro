import { clampNumber } from './pricing';

export const getReportItemQuantity = (item) => (
  Math.max(clampNumber(item?.quantity ?? item?.qty), 0)
);

export const formatReportNumber = (value, options = {}) => (
  Number(value || 0).toLocaleString(undefined, options)
);

export const getReportItemDescription = (item) => (
  item?.description || item?.name || 'Untitled BOQ item'
);

export const getSafeReportFileName = (value, fallback = 'BOQ_Report') => {
  const baseName = String(value || fallback).trim() || fallback;
  return baseName.replace(/[^\w.-]+/g, '_');
};
