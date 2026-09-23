import { describe, it, expect } from 'vitest';
import { parseCsvText, parseCsvRow, evaluateExpression } from '../services/dataBinding';
import { SAMPLE_BARTENDER_TEMPLATES } from '../services/sampleData';
import { DEFAULT_BARTENDER_CONFIG, formatBarTenderIntegrationPayload } from '../services/barTenderPrintService';
import { SAMPLE_PRINTERS } from '../services/sampleData';

describe('Phase 4: BarTender Integration & Data Binding Integrity', () => {
  describe('4.1 Platform-Agnostic Template Paths', () => {
    it('ensures sample templates do not contain hardcoded Windows drive letters', () => {
      for (const tpl of SAMPLE_BARTENDER_TEMPLATES) {
        expect(tpl.bartenderTemplateReference).not.toMatch(/^[a-zA-Z]:\\/);
      }
      expect(DEFAULT_BARTENDER_CONFIG.templateRoot).not.toMatch(/^[a-zA-Z]:\\/);
    });
  });

  describe('4.3 RFC 4180 CSV Parsing & Expression Evaluation', () => {
    it('correctly parses CSV with commas inside quotes without dropping or shifting fields', () => {
      const csvData = `Product_Name,Address,Lot_No\n"Widget A, Premium","123 Main St, Suite 400",LOT-8819\n"Widget B",200 Industrial Pkwy,LOT-8820`;
      const parsed = parseCsvText(csvData);

      expect(parsed.fields).toEqual(['Product_Name', 'Address', 'Lot_No']);
      expect(parsed.records).toHaveLength(2);
      expect(parsed.records[0].Product_Name).toBe('Widget A, Premium');
      expect(parsed.records[0].Address).toBe('123 Main St, Suite 400');
      expect(parsed.records[0].Lot_No).toBe('LOT-8819');
    });

    it('handles escaped quotes inside quoted CSV fields', () => {
      const row = '"Widget ""Special"" Edition",100';
      const fields = parseCsvRow(row);
      expect(fields[0]).toBe('Widget "Special" Edition');
      expect(fields[1]).toBe('100');
    });

    it('evaluates dynamic template expressions with record data', () => {
      const template = 'Item: {{Product_Name}} | Lot: {{Lot_No}} | Date: {{TODAY}}';
      const record = { id: 1, Product_Name: 'Syringe 10ml', Lot_No: 'L-2026-X' };

      const result = evaluateExpression(template, record);
      expect(result).toContain('Item: Syringe 10ml');
      expect(result).toContain('Lot: L-2026-X');
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('BarTender Payload Formatting', () => {
    it('formats REST API payload cleanly with template reference', () => {
      const tpl = SAMPLE_BARTENDER_TEMPLATES[0];
      const prn = SAMPLE_PRINTERS[0];
      const res = formatBarTenderIntegrationPayload(tpl, prn, { Lot_Number: 'LOT-99' }, 2, 'REST_API');

      expect(res.contentType).toBe('application/json');
      const json = JSON.parse(res.payload);
      expect(json.Actions[0].DocumentFile).toBe(tpl.bartenderTemplateReference);
      expect(json.Actions[0].Copies).toBe(2);
    });
  });
});
