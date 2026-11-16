/**
 * Tiny CSV writer. Quotes every cell, and defuses spreadsheet formula
 * injection (cells starting with = + - @ are prefixed with a quote).
 */
const cell = (value: unknown): string => {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export const toCsv = (rows: unknown[][]): string =>
  rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
