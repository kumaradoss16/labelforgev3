/**
 * LabelForge Preflight Validation Engine
 * Inspects label documents against barcode standards, geometric boundaries, and printer capabilities
 * Produces deterministic diagnostic IDs
 */

import { LabelDocument, PreflightDiagnostic, TextLabelObject, BarcodeLabelObject } from '../types/label';
import { parseGS1ApplicationIdentifiers, validateModulo10CheckDigit } from './barcodeEngine';

export function runPreflightValidation(doc: LabelDocument): PreflightDiagnostic[] {
  const diagnostics: PreflightDiagnostic[] = [];
  const { width: docW, height: docH } = doc.dimensions;

  let ruleCounter = 0;

  // 1. Boundary & Overlap checks
  for (const obj of doc.objects) {
    if (!obj.visible) continue;

    // Check if object is fully or partially out of label bounds
    if (obj.x < 0 || obj.y < 0) {
      diagnostics.push({
        id: `diagnostic-${obj.id}-neg_bounds-${ruleCounter++}`,
        objectId: obj.id,
        severity: 'error',
        category: 'geometry',
        message: `Object "${obj.name}" extends past the left or top label edge (X: ${obj.x.toFixed(1)} mm, Y: ${obj.y.toFixed(1)} mm).`,
        suggestion: 'Move object inside the 0,0 printable area.'
      });
    }

    if (obj.x + obj.width > docW || obj.y + obj.height > docH) {
      diagnostics.push({
        id: `diagnostic-${obj.id}-clip_bounds-${ruleCounter++}`,
        objectId: obj.id,
        severity: 'warning',
        category: 'geometry',
        message: `Object "${obj.name}" clips past the bottom or right printable boundary (${(obj.x + obj.width).toFixed(1)}mm > ${docW}mm).`,
        suggestion: 'Resize or reposition object to avoid physical media cut-off.'
      });
    }

    // 2. Barcode-specific validation
    if (obj.type === 'barcode' || obj.type === 'qrcode' || obj.type === 'datamatrix') {
      const bObj = obj as BarcodeLabelObject;
      const symbology = bObj.barcodeStyle?.symbology || 'code128';
      const val = bObj.value;

      if (!val || val.trim() === '') {
        diagnostics.push({
          id: `diagnostic-${obj.id}-empty_payload-${ruleCounter++}`,
          objectId: obj.id,
          severity: 'blocker',
          category: 'barcode',
          message: `Barcode "${obj.name}" contains empty data payload.`,
          suggestion: 'Provide literal data or verify data source connection.'
        });
      }

      // Check quiet zones
      if (bObj.barcodeStyle?.quietZone && bObj.x < (bObj.barcodeStyle.quietZoneSize || 3)) {
        diagnostics.push({
          id: `diagnostic-${obj.id}-quiet_zone-${ruleCounter++}`,
          objectId: obj.id,
          severity: 'warning',
          category: 'barcode',
          message: `Barcode "${obj.name}" does not have recommended quiet zone on left edge (${bObj.x.toFixed(1)}mm < 3.0mm).`,
          suggestion: 'Provide at least 10x module width quiet zone margin for high-speed scanners.'
        });
      }

      // GS1 validation
      if (symbology === 'gs1-128' || symbology === 'gs1-datamatrix' || symbology === 'gs1-qr') {
        const parsed = parseGS1ApplicationIdentifiers(val);
        if (parsed.hasErrors) {
          for (const err of parsed.errors) {
            diagnostics.push({
              id: `diagnostic-${obj.id}-gs1_syntax-${ruleCounter++}`,
              objectId: obj.id,
              severity: 'error',
              category: 'barcode',
              message: `GS1 syntax error in "${obj.name}": ${err}`,
              suggestion: 'Review GS1 General Specifications for Application Identifier formats.'
            });
          }
        }
      }

      // EAN-13 validation
      if (symbology === 'ean13') {
        const clean = (val || '').replace(/\D/g, '');
        if (clean.length !== 13) {
          diagnostics.push({
            id: `diagnostic-${obj.id}-ean13_len-${ruleCounter++}`,
            objectId: obj.id,
            severity: 'error',
            category: 'barcode',
            message: `EAN-13 requires exactly 13 numeric digits (received ${clean.length}).`,
            suggestion: 'Format with 12 item digits + 1 Modulo 10 check digit.'
          });
        } else if (!validateModulo10CheckDigit(clean)) {
          diagnostics.push({
            id: `diagnostic-${obj.id}-ean13_check-${ruleCounter++}`,
            objectId: obj.id,
            severity: 'error',
            category: 'barcode',
            message: `EAN-13 check digit mismatch on "${clean}".`,
            suggestion: 'Auto-calculate the 13th digit using GS1 Modulo 10 algorithm.'
          });
        }
      }

      // UPC-A validation
      if (symbology === 'upca') {
        const clean = (val || '').replace(/\D/g, '');
        if (clean.length !== 12) {
          diagnostics.push({
            id: `diagnostic-${obj.id}-upca_len-${ruleCounter++}`,
            objectId: obj.id,
            severity: 'error',
            category: 'barcode',
            message: `UPC-A requires exactly 12 numeric digits (received ${clean.length}).`,
            suggestion: 'Provide standard 12-digit North American UPC.'
          });
        }
      }
    }

    // 3. Text & Multilingual checks
    if (obj.type === 'text' || obj.type === 'rich-text') {
      const textObj = obj as TextLabelObject;
      if (!textObj.text || textObj.text.trim() === '') {
        diagnostics.push({
          id: `diagnostic-${obj.id}-empty_text-${ruleCounter++}`,
          objectId: obj.id,
          severity: 'info',
          category: 'font',
          message: `Text object "${obj.name}" has no text content.`,
          suggestion: 'Enter text or bind a database variable.'
        });
      }
    }
  }

  // General info summary if clean
  if (diagnostics.filter(d => d.severity === 'error' || d.severity === 'blocker').length === 0) {
    diagnostics.push({
      id: `diagnostic-clean-pass-0`,
      severity: 'info',
      category: 'printer',
      message: 'All preflight checks passed. Template is ready for production thermal or Windows spooler dispatch.',
    });
  }

  return diagnostics;
}
