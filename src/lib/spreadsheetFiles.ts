import { readSheet } from 'read-excel-file/browser';
import writeExcelFile from 'write-excel-file/browser';

export async function readXlsxRows(file: File): Promise<Record<string, unknown>[]> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('Please convert older .xls files to .xlsx or CSV before importing.');
  }
  if (file.size > 20 * 1024 * 1024) throw new Error('Spreadsheet exceeds the 20 MB import limit.');
  const rows = await readSheet(file);
  if (rows.length < 2) return [];
  if (rows.length > 50001 || rows[0].length > 200) throw new Error('Spreadsheet exceeds the 50,000-row or 200-column import limit.');
  const headers = rows[0].map((value, index) => String(value ?? `Column ${index + 1}`).trim());
  if (headers.some(header => !header)) throw new Error('Every spreadsheet column needs a header.');
  if (headers.some(header => ['__proto__', 'prototype', 'constructor'].includes(header.toLowerCase()))) {
    throw new Error('Spreadsheet contains a reserved column name.');
  }
  return rows.slice(1)
    .filter(row => row.some(value => value !== null && value !== ''))
    .map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

export async function downloadXlsxTemplate(sample: Record<string, string | number | boolean>, fileName: string): Promise<void> {
  const headers = Object.keys(sample);
  await writeExcelFile([
    headers,
    headers.map(header => sample[header])
  ]).toFile(fileName);
}
