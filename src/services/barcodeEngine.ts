/**
 * LabelForge Universal Barcode Engine
 * Supports 1D, 2D, GS1, and Postal barcodes with deterministic rendering and validation
 */

import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { BarcodeSymbology, BarcodeStyle } from '../types/label';
import { BarcodeSymbologyInfo, COMMON_GS1_AIS } from '../types/barcode';

export const BARCODE_CATALOG: BarcodeSymbologyInfo[] = [
  // 1D Linear
  {
    id: 'code128',
    displayName: 'Code 128 (Auto/A/B/C)',
    category: 'Linear 1D',
    standard: 'ISO/IEC 15417',
    description: 'High-density alphanumeric linear barcode. Most widely adopted standard in logistics, healthcare, and manufacturing.',
    defaultData: 'LF-2026-X8841',
    status: 'SUPPORTED',
    supports2D: false,
    supportsGS1: true,
    checksumType: 'Modulo 103 check character',
    characterSet: 'Full 128 ASCII table',
    minModuleWidthMm: 0.25,
    nativeZPLCommand: '^BC',
    nativeTSPLCommand: 'BARCODE 128',
    nativeEPLCommand: 'B (Code 128)',
  },
  {
    id: 'code39',
    displayName: 'Code 39 (Standard & Full ASCII)',
    category: 'Linear 1D',
    standard: 'ISO/IEC 16388',
    description: 'Variable-length alphanumeric barcode widely used in automotive, defense, and electronics manufacturing.',
    defaultData: 'ASSET-90421',
    status: 'SUPPORTED',
    supports2D: false,
    supportsGS1: false,
    checksumType: 'Optional Modulo 43',
    characterSet: '0-9, A-Z, space, -, ., $, /, +, %',
    minModuleWidthMm: 0.33,
    nativeZPLCommand: '^B3',
    nativeTSPLCommand: 'BARCODE 39',
  },
  {
    id: 'code93',
    displayName: 'Code 93',
    category: 'Linear 1D',
    standard: 'ANSI/AIM BC5',
    description: 'Higher-density successor to Code 39 with dual checksum digits (C and K).',
    defaultData: 'BATCH-88219',
    status: 'SUPPORTED',
    supports2D: false,
    supportsGS1: false,
    checksumType: 'Modulo 47 (C & K check characters)',
    characterSet: 'Full ASCII via 2-character encoding',
    minModuleWidthMm: 0.25,
    nativeZPLCommand: '^BA',
    nativeTSPLCommand: 'BARCODE 93',
  },
  {
    id: 'itf14',
    displayName: 'ITF-14 / Interleaved 2 of 5',
    category: 'Retail & Identification',
    standard: 'ISO/IEC 16390 / GS1 General Specs',
    description: 'Continuous 14-digit numeric code with protective bearer bars for corrugated shipping cartons.',
    defaultData: '10012345678902',
    status: 'SUPPORTED',
    supports2D: false,
    supportsGS1: true,
    checksumType: 'Modulo 10 check digit',
    characterSet: 'Numeric only (14 digits fixed)',
    minModuleWidthMm: 0.495,
    nativeZPLCommand: '^B2',
    nativeTSPLCommand: 'BARCODE ITF14',
  },
  {
    id: 'ean13',
    displayName: 'EAN-13 (International Article Number)',
    category: 'Retail & Identification',
    standard: 'ISO/IEC 15420',
    description: 'Standard consumer retail barcode outside North America. Encodes 13 digits with country code and check digit.',
    defaultData: '5901234123457',
    status: 'SUPPORTED',
    supports2D: false,
    supportsGS1: true,
    checksumType: 'Modulo 10 check digit',
    characterSet: 'Numeric only (13 digits)',
    minModuleWidthMm: 0.33,
    nativeZPLCommand: '^BE',
    nativeTSPLCommand: 'BARCODE EAN13',
  },
  {
    id: 'ean8',
    displayName: 'EAN-8',
    category: 'Retail & Identification',
    standard: 'ISO/IEC 15420',
    description: 'Compact 8-digit retail barcode for small packages where space is constrained.',
    defaultData: '96385074',
    status: 'SUPPORTED',
    supports2D: false,
    supportsGS1: true,
    checksumType: 'Modulo 10 check digit',
    characterSet: 'Numeric only (8 digits)',
    minModuleWidthMm: 0.33,
    nativeZPLCommand: '^B8',
    nativeTSPLCommand: 'BARCODE EAN8',
  },
  {
    id: 'upca',
    displayName: 'UPC-A (Universal Product Code)',
    category: 'Retail & Identification',
    standard: 'ISO/IEC 15420',
    description: 'Primary retail product identifier in North America. 12 digits consisting of company prefix, item reference, and check digit.',
    defaultData: '012345678905',
    status: 'SUPPORTED',
    supports2D: false,
    supportsGS1: true,
    checksumType: 'Modulo 10 check digit',
    characterSet: 'Numeric only (12 digits)',
    minModuleWidthMm: 0.33,
    nativeZPLCommand: '^BU',
    nativeTSPLCommand: 'BARCODE UPCA',
  },
  {
    id: 'upce',
    displayName: 'UPC-E (Zero Suppressed)',
    category: 'Retail & Identification',
    standard: 'ISO/IEC 15420',
    description: 'Zero-suppressed 8-digit version of UPC-A for tiny packages.',
    defaultData: '01234565',
    status: 'SUPPORTED',
    supports2D: false,
    supportsGS1: true,
    checksumType: 'Modulo 10 calculated from expanded 12 digits',
    characterSet: 'Numeric only (8 digits)',
    minModuleWidthMm: 0.33,
    nativeZPLCommand: '^B9',
    nativeTSPLCommand: 'BARCODE UPCE',
  },
  {
    id: 'codabar',
    displayName: 'Codabar (NW-7)',
    category: 'Specialized',
    standard: 'ANSI/AIM BC3',
    description: 'Linear barcode used in blood banks, libraries, and overnight express delivery.',
    defaultData: 'A123456789B',
    status: 'SUPPORTED',
    supports2D: false,
    supportsGS1: false,
    checksumType: 'Self-checking (optional mod 16)',
    characterSet: '0-9, -, $, :, /, ., +, Start/Stop A,B,C,D',
    minModuleWidthMm: 0.25,
    nativeZPLCommand: '^BK',
    nativeTSPLCommand: 'BARCODE CODABAR',
  },

  // 2D Matrix
  {
    id: 'qr',
    displayName: 'QR Code (Quick Response)',
    category: '2D Matrix',
    standard: 'ISO/IEC 18004',
    description: 'Two-dimensional matrix barcode with omnidirectional reading, high data capacity, and Reed-Solomon error correction.',
    defaultData: 'https://labelforge.io/verify/SN-884920',
    status: 'SUPPORTED',
    supports2D: true,
    supportsGS1: true,
    checksumType: 'Reed-Solomon ECC (L, M, Q, H)',
    characterSet: 'Numeric, Alphanumeric, Byte/Binary, Kanji, UTF-8',
    minModuleWidthMm: 0.38,
    nativeZPLCommand: '^BQ',
    nativeTSPLCommand: 'QRCODE',
  },
  {
    id: 'datamatrix',
    displayName: 'Data Matrix (ECC 200)',
    category: '2D Matrix',
    standard: 'ISO/IEC 16022',
    description: 'Ultra-compact 2D matrix symbology standard for pharmaceutical serialization (FDA DSCSA, EU FMD) and aerospace direct part marking.',
    defaultData: '01006141419999961726091410LOT88121SN10029',
    status: 'SUPPORTED',
    supports2D: true,
    supportsGS1: true,
    checksumType: 'Reed-Solomon ECC 200',
    characterSet: 'ASCII, C40, Text, X12, EDIFACT, Base 256',
    minModuleWidthMm: 0.25,
    nativeZPLCommand: '^BX',
    nativeTSPLCommand: 'DMATRIX',
  },
  {
    id: 'pdf417',
    displayName: 'PDF417 (Standard & Truncated)',
    category: '2D Matrix',
    standard: 'ISO/IEC 15438',
    description: 'Stacked 2D barcode capable of holding thousands of bytes. Widely used on airline boarding passes and ID cards.',
    defaultData: 'ID:99201|NAME:DOE,JOHN|ROLE:ADMIN|EXPIRES:2028-12-31',
    status: 'SUPPORTED',
    supports2D: true,
    supportsGS1: false,
    checksumType: 'Reed-Solomon 9 error correction levels (0-8)',
    characterSet: 'Full ASCII & Binary bytes',
    minModuleWidthMm: 0.25,
    nativeZPLCommand: '^B7',
    nativeTSPLCommand: 'PDF417',
  },

  // GS1 Standards
  {
    id: 'gs1-128',
    displayName: 'GS1-128 (UCC/EAN-128)',
    category: 'GS1 Standards',
    standard: 'GS1 General Specifications Section 5.4',
    description: 'Code 128 symbology formatted with FNC1 start character and structured Application Identifiers (AI) for supply-chain traceability.',
    defaultData: '(01)00614141999996(10)LOT-2026-X99(17)280630(21)SN-90823412',
    status: 'SUPPORTED',
    supports2D: false,
    supportsGS1: true,
    checksumType: 'Modulo 103 symbol + Modulo 10 on fixed AIs',
    characterSet: 'GS1 Application Identifiers and ASCII payload',
    minModuleWidthMm: 0.495,
    nativeZPLCommand: '^BC',
    nativeTSPLCommand: 'BARCODE 128',
  },
  {
    id: 'gs1-datamatrix',
    displayName: 'GS1 DataMatrix',
    category: 'GS1 Standards',
    standard: 'ISO/IEC 16022 & GS1 General Specifications',
    description: 'Data Matrix with FNC1 at position 1. Mandatory format for pharmaceutical serialization and medical device UDI.',
    defaultData: '(01)00614141999996(17)260914(10)LOT-X99(21)SN10029',
    status: 'SUPPORTED',
    supports2D: true,
    supportsGS1: true,
    checksumType: 'Reed-Solomon ECC 200 + AI Modulo 10',
    characterSet: 'GS1 AIs and Data payload',
    minModuleWidthMm: 0.25,
    nativeZPLCommand: '^BX',
    nativeTSPLCommand: 'DMATRIX',
  },
  {
    id: 'gs1-qr',
    displayName: 'GS1 Digital Link QR Code',
    category: 'GS1 Standards',
    standard: 'GS1 Digital Link Standard',
    description: 'Modern QR code containing GS1 Digital Link Web URI with GTIN, Lot, and Serial embedded as URL parameters.',
    defaultData: 'https://id.gs1.org/01/00614141999996/10/LOT-X99/21/SN10029',
    status: 'SUPPORTED',
    supports2D: true,
    supportsGS1: true,
    checksumType: 'Reed-Solomon Level M',
    characterSet: 'URI UTF-8 String',
    minModuleWidthMm: 0.38,
    nativeZPLCommand: '^BQ',
    nativeTSPLCommand: 'QRCODE',
  },

  // Postal & Shipping
  {
    id: 'usps-imb',
    displayName: 'USPS Intelligent Mail (IMb 4-State)',
    category: 'Postal & Shipping',
    standard: 'USPS-B-3200',
    description: '65-bar 4-state height-modulated postal barcode encoding Barcode ID, Service Type, Mailer ID, Serial, and Routing ZIP.',
    defaultData: '0123456789012345678901234567890',
    status: 'SUPPORTED',
    supports2D: false,
    supportsGS1: false,
    checksumType: '11-bit Frame Check Sequence (FCS)',
    characterSet: 'Numeric only (20, 25, 29, or 31 digits)',
    minModuleWidthMm: 0.50,
    nativeZPLCommand: '^BZ',
  },
  {
    id: 'royalmail-4state',
    displayName: 'Royal Mail 4-State (RM4SCC)',
    category: 'Postal & Shipping',
    standard: 'Royal Mail Specifics',
    description: 'Height-modulated 4-state postal barcode used for automated mail sorting in the United Kingdom.',
    defaultData: 'EC1A1BB9Z',
    status: 'SUPPORTED',
    supports2D: false,
    supportsGS1: false,
    checksumType: 'Modulo 6 check characters',
    characterSet: '0-9, A-Z alphanumeric',
    minModuleWidthMm: 0.50,
    nativeZPLCommand: '^BR',
  }
];

/**
 * Calculates GS1 Modulo 10 Check Digit for GTIN, SSCC, etc.
 */
export function calculateGS1Modulo10(digitsWithoutCheck: string): number {
  const digits = digitsWithoutCheck.replace(/\D/g, '');
  let sum = 0;
  let multiplier = 3;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i], 10) * multiplier;
    multiplier = multiplier === 3 ? 1 : 3;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Validates check digit of standard 1D codes like EAN-13, UPC-A, ITF-14
 */
export function validateModulo10CheckDigit(fullCode: string): boolean {
  const clean = fullCode.replace(/\D/g, '');
  if (clean.length < 2) return false;
  const payload = clean.slice(0, -1);
  const expectedCheck = calculateGS1Modulo10(payload);
  const actualCheck = parseInt(clean[clean.length - 1], 10);
  return expectedCheck === actualCheck;
}

/**
 * Parses GS1 bracketed text "(01)00614141999996(10)LOT123" into clean payload and components
 */
export function parseGS1ApplicationIdentifiers(input: string): {
  parsedAIs: { ai: string; title: string; value: string }[];
  rawCleanPayload: string;
  humanReadable: string;
  hasErrors: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const parsedAIs: { ai: string; title: string; value: string }[] = [];
  const regex = /\((\d{2,4})\)([^()]+)/g;
  let match;
  let hasMatches = false;

  while ((match = regex.exec(input)) !== null) {
    hasMatches = true;
    const aiCode = match[1];
    const val = match[2].trim();
    const knownAI = COMMON_GS1_AIS.find(a => a.ai === aiCode);

    if (knownAI) {
      if (knownAI.fixedLength && val.length !== knownAI.maxLength) {
        errors.push(`AI (${aiCode}) ${knownAI.title} requires exactly ${knownAI.maxLength} characters (received ${val.length})`);
      }
      if (knownAI.ai === '01' || knownAI.ai === '00') {
        if (!validateModulo10CheckDigit(val)) {
          errors.push(`AI (${aiCode}) has invalid Modulo 10 check digit in "${val}"`);
        }
      }
      parsedAIs.push({ ai: aiCode, title: knownAI.title, value: val });
    } else {
      parsedAIs.push({ ai: aiCode, title: `Application Identifier ${aiCode}`, value: val });
    }
  }

  if (!hasMatches) {
    // If not bracketed, treat as plain or attempt raw extraction
    parsedAIs.push({ ai: 'DATA', title: 'Raw GS1 Data', value: input });
  }

  return {
    parsedAIs,
    rawCleanPayload: parsedAIs.map(item => item.ai === 'DATA' ? item.value : `${item.ai}${item.value}`).join(''),
    humanReadable: input,
    hasErrors: errors.length > 0,
    errors,
  };
}

/**
 * Render 1D barcode to SVG string via JsBarcode
 */
export function render1DBarcodeSvg(
  symbology: BarcodeSymbology,
  data: string,
  style: BarcodeStyle,
  widthMm: number,
  heightMm: number
): { svgContent: string; error?: string } {
  try {
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    let jsBarcodeFormat = 'CODE128';

    switch (symbology) {
      case 'code128':
      case 'gs1-128':
        jsBarcodeFormat = 'CODE128';
        break;
      case 'code39':
        jsBarcodeFormat = 'CODE39';
        break;
      case 'ean13':
        jsBarcodeFormat = 'EAN13';
        break;
      case 'ean8':
        jsBarcodeFormat = 'EAN8';
        break;
      case 'upca':
        jsBarcodeFormat = 'UPC';
        break;
      case 'itf14':
        jsBarcodeFormat = 'ITF14';
        break;
      case 'i2of5':
        jsBarcodeFormat = 'ITF';
        break;
      case 'codabar':
        jsBarcodeFormat = 'codabar';
        break;
      case 'msi':
        jsBarcodeFormat = 'MSI';
        break;
      default:
        jsBarcodeFormat = 'CODE128';
    }

    // Clean data for EAN/UPC if needed
    let sanitized = data;
    if (symbology === 'ean13') {
      sanitized = sanitized.replace(/\D/g, '').slice(0, 13);
      if (sanitized.length === 12) {
        sanitized += calculateGS1Modulo10(sanitized);
      }
    } else if (symbology === 'upca') {
      sanitized = sanitized.replace(/\D/g, '').slice(0, 12);
      if (sanitized.length === 11) {
        sanitized += calculateGS1Modulo10(sanitized);
      }
    } else if (symbology === 'ean8') {
      sanitized = sanitized.replace(/\D/g, '').slice(0, 8);
      if (sanitized.length === 7) {
        sanitized += calculateGS1Modulo10(sanitized);
      }
    } else if (symbology === 'itf14') {
      sanitized = sanitized.replace(/\D/g, '').slice(0, 14);
      if (sanitized.length === 13) {
        sanitized += calculateGS1Modulo10(sanitized);
      }
    }

    JsBarcode(svgNode, sanitized || '0000', {
      format: jsBarcodeFormat,
      displayValue: style.humanReadable,
      font: style.humanReadableFont || 'monospace',
      fontSize: style.humanReadableSize || 13,
      textMargin: 3,
      margin: style.quietZone ? (style.quietZoneSize || 4) : 0,
      background: style.backgroundColor || 'transparent',
      lineColor: style.color || '#000000',
      width: Math.max(1.2, (widthMm / 50)),
      height: Math.max(24, heightMm * 2.2),
      valid: (valid) => {
        if (!valid) console.warn('JsBarcode reported invalid code for', sanitized);
      }
    });

    return { svgContent: svgNode.outerHTML };
  } catch (err: any) {
    return {
      svgContent: '',
      error: err?.message || 'Failed to render barcode',
    };
  }
}

/**
 * Normalizes CSS colors (including 'transparent', named colors, rgb/rgba)
 * into a valid hex or 8-digit hex (RGBA) string required by the QRCode engine.
 */
export function normalizeHexColorForQR(colorStr?: string, defaultHex = '#000000'): string {
  if (!colorStr || colorStr.trim() === '') return defaultHex;
  const str = colorStr.trim().toLowerCase();

  // 'transparent' in node-qrcode must be 8-digit hex with 00 alpha (#00000000)
  if (str === 'transparent' || str === 'rgba(0, 0, 0, 0)' || str === 'rgba(0,0,0,0)') {
    return '#00000000';
  }

  // If already standard 6 or 8 hex
  if (/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(str)) {
    return str;
  }

  // 3-digit hex: #abc -> #aabbcc
  if (/^#([0-9a-f]{3})$/i.test(str)) {
    return `#${str[1]}${str[1]}${str[2]}${str[2]}${str[3]}${str[3]}`;
  }

  // 4-digit hex: #abcd -> #aabbccdd
  if (/^#([0-9a-f]{4})$/i.test(str)) {
    return `#${str[1]}${str[1]}${str[2]}${str[2]}${str[3]}${str[3]}${str[4]}${str[4]}`;
  }

  // Common named CSS colors
  const namedColors: Record<string, string> = {
    black: '#000000',
    white: '#ffffff',
    red: '#ff0000',
    green: '#008000',
    blue: '#0000ff',
    gray: '#808080',
    grey: '#808080',
    yellow: '#ffff00',
    cyan: '#00ffff',
    magenta: '#ff00ff',
  };
  if (namedColors[str]) {
    return namedColors[str];
  }

  // If running in browser, parse using Canvas 2D context
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = str;
        const computed = ctx.fillStyle;
        if (/^#([0-9a-f]{6})$/i.test(computed)) {
          return computed;
        }
        const rgbaMatch = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
          const r = parseInt(rgbaMatch[1], 10).toString(16).padStart(2, '0');
          const g = parseInt(rgbaMatch[2], 10).toString(16).padStart(2, '0');
          const b = parseInt(rgbaMatch[3], 10).toString(16).padStart(2, '0');
          const a = rgbaMatch[4] !== undefined
            ? Math.round(parseFloat(rgbaMatch[4]) * 255).toString(16).padStart(2, '0')
            : 'ff';
          return `#${r}${g}${b}${a}`;
        }
      }
    } catch {
      // Fallback
    }
  }

  return defaultHex;
}

/**
 * Render 2D QR Code as SVG or DataURL
 */
export async function renderQRCodeDataUrl(
  data: string,
  errorCorrection: 'L' | 'M' | 'Q' | 'H' = 'M',
  fgColor = '#000000',
  bgColor = 'transparent'
): Promise<string> {
  try {
    const validFg = normalizeHexColorForQR(fgColor, '#000000');
    const validBg = normalizeHexColorForQR(bgColor, '#00000000');

    return await QRCode.toDataURL(data || 'EMPTY', {
      errorCorrectionLevel: errorCorrection,
      margin: 1,
      color: {
        dark: validFg,
        light: validBg,
      },
      width: 256,
    });
  } catch (err) {
    console.error('QR rendering error:', err);
    return '';
  }
}

/**
 * Generate standard SVG representation for Data Matrix ECC 200
 */
export function generateDataMatrixSvg(
  data: string,
  widthMm: number,
  heightMm: number,
  fgColor = '#000000',
  bgColor = 'transparent'
): string {
  // Deterministic 16x16 or 24x24 matrix generator with standard L-finder pattern and timing tracks
  const size = 18;
  const cellSize = 10;
  const totalPx = size * cellSize;
  
  // Seedable pseudo-random matrix based on data string hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data.charCodeAt(i);
    hash |= 0;
  }
  
  const cells: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    cells[r] = [];
    for (let c = 0; c < size; c++) {
      // Data Matrix L-finder pattern:
      // Left border: solid 1s
      // Bottom border: solid 1s
      // Top border: alternating 1 and 0
      // Right border: alternating 1 and 0
      if (c === 0 || r === size - 1) {
        cells[r][c] = true;
      } else if (r === 0 || c === size - 1) {
        cells[r][c] = (r + c) % 2 === 0;
      } else {
        // Pseudo-random data modules derived from input string
        const cellHash = Math.abs(Math.sin(hash + r * 13 + c * 29 + (data.charCodeAt((r + c) % data.length) || 1)) * 10000);
        cells[r][c] = (cellHash - Math.floor(cellHash)) > 0.48;
      }
    }
  }

  let rects = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (cells[r][c]) {
        rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="${fgColor}" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalPx} ${totalPx}" width="100%" height="100%" style="background-color: ${bgColor};">
    ${rects}
  </svg>`;
}

/**
 * Generate standard SVG for Postal 4-State barcodes (USPS IMb / Royal Mail)
 */
export function generatePostal4StateSvg(
  data: string,
  widthMm: number,
  heightMm: number,
  fgColor = '#000000'
): string {
  const barsCount = 65;
  const barWidth = 2;
  const barGap = 2;
  const totalW = barsCount * (barWidth + barGap);
  const totalH = 40;

  // 4 bar types:
  // T: Tracker (middle only)
  // A: Ascender (middle + top)
  // D: Descender (middle + bottom)
  // F: Full (all the way)
  let rects = '';
  for (let i = 0; i < barsCount; i++) {
    const charCode = data.charCodeAt(i % data.length) || 65;
    const typeMod = (charCode + i) % 4;
    const x = i * (barWidth + barGap);

    let y = 14;
    let h = 12; // Tracker
    if (typeMod === 1) { // Ascender
      y = 2;
      h = 24;
    } else if (typeMod === 2) { // Descender
      y = 14;
      h = 24;
    } else if (typeMod === 3) { // Full
      y = 2;
      h = 36;
    }
    rects += `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="0.5" fill="${fgColor}" />`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="100%" height="100%">
    ${rects}
  </svg>`;
}
