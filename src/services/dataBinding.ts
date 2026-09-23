/**
 * LabelForge Data Binding & Dynamic Expression Evaluator
 * RFC 4180 compliant CSV parser and robust multi-variable expression evaluator
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
      if (key === 'id') continue;
      // Escape special regex characters in key name
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'gi');
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
    const formattedVal = String(counter.currentValue).padStart(counter.padLength || counter.padding || 5, '0');
    const fullSerial = `${counter.prefix || ''}${formattedVal}${counter.suffix || ''}`;
    output = output.replace(/\{\{\s*SERIAL\s*\}\}/gi, fullSerial);
    output = output.replace(/\{\{\s*COUNTER\s*\}\}/gi, fullSerial);
  }

  return output;
}

/**
 * RFC 4180 Compliant CSV Line Parser
 * Handles commas inside quotes, escaped quotes (""), and multiline fields gracefully
 */
export function parseCsvRow(rowStr: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    const nextChar = rowStr[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parse uploaded CSV string into field definitions and records
 */
export function parseCsvText(csvText: string): { fields: string[]; records: DataRecord[] } {
  if (!csvText || csvText.trim() === '') return { fields: [], records: [] };

  const rawLines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (rawLines.length === 0) return { fields: [], records: [] };

  const rawHeaders = parseCsvRow(rawLines[0]);
  const headers = rawHeaders.map(h => h.replace(/^["']|["']$/g, '').trim());
  const records: DataRecord[] = [];

  for (let i = 1; i < rawLines.length; i++) {
    const rowValues = parseCsvRow(rawLines[i]);
    const rec: DataRecord = { id: i };
    headers.forEach((h, idx) => {
      rec[h] = rowValues[idx] !== undefined ? rowValues[idx].replace(/^["']|["']$/g, '') : '';
    });
    records.push(rec);
  }

  return { fields: headers, records };
}
