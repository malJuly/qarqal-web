// Builds a CSV file in the browser and downloads it. Pure DOM, no Angular.

type Cell = string | number | null | undefined;

const escapeCell = (value: Cell): string => {
  const text = value === null || value === undefined ? '' : String(value);
  // A cell starting with = + - @ would run as a formula in Excel; prefix it so it stays text.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** downloadCsv('orders.csv', ['Name', 'Amount'], [['Ali', 10]]). The BOM keeps Excel reading UTF-8. */
export const downloadCsv = (filename: string, headers: string[], rows: Cell[][]): void => {
  const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
