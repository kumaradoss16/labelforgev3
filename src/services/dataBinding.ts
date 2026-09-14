/**
 * LabelForge Data Binding & Dynamic Expression Evaluator
 */

import { DataRecord, SerializationCounter } from '../types/database';

/**
 * Resolves templated strings like "{{Product_Name}} - {{Lot_No}}" with active record
 */
export function evaluateExpression(
  template: string,
  record?: DataRecord,
  counter?: SerializationCounter
): string {
  if (!template) return '';

  let output = template;

  // Replace database fields: {{field_name}}
  if (record) {
    for (const [key, value] of Object.entries(record)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      output = output.replace(regex, value !== undefined && value !== null ? String(value) : '');
    }
  }

  // Replace standard dynamic date tokens: {{TODAY}}, {{NOW}}, {{DATE_YYMMDD}}, {{EXPIRY_1YR}}
  const now = new Date();
  const yyyy = now.getFullYear();
  const yy = String(yyyy).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  output = output.replace(/\{\{\s*TODAY\s*\}\}/gi, `${yyyy}-${mm}-${dd}`);
  output = output.replace(/\{\{\s*DATE_YYMMDD\s*\}\}/gi, `${yy}${mm}${dd}`);
  output = output.replace(/\{\{\s*NOW\s*\}\}/gi, now.toLocaleTimeString());
  
  const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const nextYy = String(nextYear.getFullYear()).slice(-2);
  const nextMm = String(nextYear.getMonth() + 1).padStart(2, '0');
  const nextDd = String(nextYear.getDate()).padStart(2, '0');
  output = output.replace(/\{\{\s*EXPIRY_1YR\s*\}\}/gi, `${nextYy}${nextMm}${nextDd}`);

  // Replace serialization counter: {{SERIAL}} or {{COUNTER}}
  if (counter) {
    const formattedVal = String(counter.currentValue).padStart(counter.padLength || 5, '0');
    const fullSerial = `${counter.prefix || ''}${formattedVal}${counter.suffix || ''}`;
    output = output.replace(/\{\{\s*SERIAL\s*\}\}/gi, fullSerial);
    output = output.replace(/\{\{\s*COUNTER\s*\}\}/gi, fullSerial);
  }

  return output;
}

/**
 * Parse uploaded CSV string into field definitions and records
 */
export function parseCsvText(csvText: string): { fields: string[]; records: DataRecord[] } {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return { fields: [], records: [] };

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const records: DataRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowValues = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    const rec: DataRecord = { id: i };
    headers.forEach((h, idx) => {
      rec[h] = rowValues[idx] || '';
    });
    records.push(rec);
  }

  return { fields: headers, records };
}
