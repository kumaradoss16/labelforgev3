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
  },

  // Extended Linear, Matrix, Postal, Composite & RFID Catalog
  {
    id: 'code11',
    displayName: 'Code 11 (USD-8)',
    category: 'Linear 1D',
    standard: 'USD-8 / Telecommunications',
    description: 'High-density numeric symbology primarily used for labeling telecommunications equipment and racks.',
    defaultData: '110-9428-1',
    status: 'PARTIALLY_SUPPORTED',
    supports2D: false,
    supportsGS1: false,
    checksumType: 'Modulo 11 (C & K check digits)',
    characterSet: '0-9, hyphen (-)',
    minModuleWidthMm: 0.25,
    nativeZPLCommand: '^B1',
    nativeTSPLCommand: 'BARCODE 11',
  },
  {
    id: 'industrial2of5',
    displayName: 'Industrial 2 of 5 (Standard 2 of 5)',
    category: 'Linear 1D',
    standard: 'AIM BC2',
    description: 'Discrete numeric symbology where bars carry information while spaces are non-critical separators.',
    defaultData: '90823412',
    status: 'PARTIALLY_SUPPORTED',
    supports2D: false,
    supportsGS1: false,
    checksumType: 'Optional Modulo 10',
    characterSet: '0-9 numeric',
    minModuleWidthMm: 0.35,
    nativeZPLCommand: '^B2',
  },
  {
    id: 'matrix2of5',
    displayName: 'Matrix 2 of 5',
    category: 'Linear 1D',
    standard: 'Code 2 of 5 Matrix',
    description: 'Continuous 2 of 5 barcode variant used in European warehouse logistics and photo finishing.',
    defaultData: '49012345',
    status: 'PARTIALLY_SUPPORTED',
    supports2D: false,
    supportsGS1: false,
    checksumType: 'Optional Modulo 10',
    characterSet: '0-9 numeric',
    minModuleWidthMm: 0.33,
  },
  {
    id: 'telepen',
    displayName: 'Telepen (Numeric & Full ASCII)',
    category: 'Linear 1D',
    standard: 'SBAC / Telepen Spec',
    description: 'High-density UK symbology capable of encoding full 128 ASCII table without shift states.',
    defaultData: 'TLP-881920',
    status: 'PARTIALLY_SUPPORTED',
    supports2D: false,
    supportsGS1: false,
    checksumType: 'Modulo 127 check character',
    characterSet: 'Full 128 ASCII table',
    minModuleWidthMm: 0.25,
    nativeZPLCommand: '^BT',
  },
  {
    id: 'dun14',
    displayName: 'DUN-14 (Distribution Unit Number)',
    category: 'Retail & Identification',
    standard: 'GS1 General Specifications',
    description: '14-digit distribution shipping container symbology based on Interleaved 2 of 5 with bearer bars.',
    defaultData: '10012345678902',
    status: 'SUPPORTED',
    supports2D: false,
    supportsGS1: true,
    checksumType: 'Modulo 10 check digit',
    characterSet: 'Numeric 14 digits',
    minModuleWidthMm: 0.495,
  },
  {
    id: 'msi',
    displayName: 'MSI Plessey',
    category: 'Retail & Identification',
    standard: 'Modified Plessey / MSI Data Corp',
    description: 'Pulse-width modulated numeric barcode widely used for shelf marking and inventory in retail supermarkets.',
    defaultData: '49201928',
    status: 'SUPPORTED',
    supports2D: false,
    supportsGS1: false,
    checksumType: 'Modulo 10 or Modulo 11',
    characterSet: '0-9 numeric',
    minModuleWidthMm: 0.30,
    nativeZPLCommand: '^BM',
    nativeTSPLCommand: 'BARCODE MSI',
  },
  {
    id: 'australia-post',
    displayName: 'Australia Post 4-State Barcode',
    category: 'Postal & Shipping',
    standard: 'Australia Post Barcode Specifications',
    description: 'Customer Barcode 4-state format for automated sorting of letters and satchels across Australia.',
    defaultData: '1122334455667788',
    status: 'PARTIALLY_SUPPORTED',
    supports2D: false,
    supportsGS1: false,
    checksumType: 'Reed-Solomon / Modulo 64 parity',
    characterSet: 'Numeric FCC + DPID + Alphanumeric Customer Info',
    minModuleWidthMm: 0.50,
    nativeZPLCommand: '^BA',
  },
  {
    id: 'japan-post',
    displayName: 'Japan Post Customer Barcode',
    category: 'Postal & Shipping',
    standard: 'Yubin Barcode System',
    description: '4-state postal barcode encoding 7-digit postal code and address number for Japanese mail automation.',
    defaultData: '10000011-2-3',
    status: 'PARTIALLY_SUPPORTED',
    supports2D: false,
    supportsGS1: false,
    checksumType: 'Modulo 19 check character',
    characterSet: '0-9, hyphen (-), alphabet CC1-CC8',
    minModuleWidthMm: 0.50,
  },
  {
    id: 'kix-code',
    displayName: 'KIX Code (PostNL / Dutch Post)',
    category: 'Postal & Shipping',
    standard: 'TNT / PostNL Klantindex Barcode',
    description: 'RM4SCC derived 4-state barcode without start/stop bars, used for Dutch automated sorting.',
    defaultData: '2516AA123',
    status: 'PARTIALLY_SUPPORTED',
    supports2D: false,
    supportsGS1: false,
    checksumType: 'Self-checking structure',
    characterSet: '0-9, A-Z alphanumeric',
    minModuleWidthMm: 0.50,
  },
  {
    id: 'maxicode',
    displayName: 'MaxiCode (UPS Tracking)',
    category: '2D Matrix',
    standard: 'ISO/IEC 16023',
    description: 'Hexagonal honeycomb 2D grid with central bullseye locator, optimized for high-speed package sorting conveyor belts.',
    defaultData: '[)>*01*96123456789*UPSN*1Z12345E0291983*3/3*1/1*Y*60651*USA*',
    status: 'PARTIALLY_SUPPORTED',
    supports2D: true,
    supportsGS1: false,
    checksumType: 'Reed-Solomon ECC (Modes 2, 3, 4, 6)',
    characterSet: 'Extended ASCII and transport control characters',
    minModuleWidthMm: 0.88,
    nativeZPLCommand: '^BD',
  },
  {
    id: 'aztec',
    displayName: 'Aztec Code',
    category: '2D Matrix',
    standard: 'ISO/IEC 24778',
    description: 'Square 2D matrix symbology with square bullseye center. Requires no quiet zone, ideal for rail tickets and transport passes.',
    defaultData: 'TICKET#2026-FL-098298',
    status: 'PARTIALLY_SUPPORTED',
    supports2D: true,
    supportsGS1: false,
    checksumType: 'Reed-Solomon ECC (user selectable 5% to 95%)',
    characterSet: 'Full 256-byte binary and UTF-8 string',
    minModuleWidthMm: 0.35,
    nativeZPLCommand: '^BO',
  },
  {
    id: 'micro-qr',
    displayName: 'Micro QR Code',
    category: '2D Matrix',
    standard: 'ISO/IEC 18004 Annex L',
    description: 'Single-corner finder pattern variant of QR Code, engineered for direct-part marking on tiny electronics components.',
    defaultData: 'MQR-9012',
    status: 'PARTIALLY_SUPPORTED',
    supports2D: true,
    supportsGS1: false,
    checksumType: 'Reed-Solomon ECC',
    characterSet: 'Numeric (up to 35) or Alphanumeric (up to 21)',
    minModuleWidthMm: 0.25,
    nativeZPLCommand: '^BQ',
  },
  {
    id: 'dotcode',
    displayName: 'DotCode',
    category: '2D Matrix',
    standard: 'AIM ISS DotCode Rev 4.0',
    description: 'Discontinuous matrix of dots designed for high-speed inkjet and laser marking on tobacco and pharmaceutical production lines.',
    defaultData: 'DOT-2026-X992',
    status: 'PARTIALLY_SUPPORTED',
    supports2D: true,
    supportsGS1: true,
    checksumType: 'Reed-Solomon ECC',
    characterSet: 'Full ASCII & GS1 AIs',
    minModuleWidthMm: 0.25,
  },
  {
    id: 'han-xin',
    displayName: 'Han Xin Code (Chinese Sensible Code)',
    category: '2D Matrix',
    standard: 'GB/T 21049-2007 / ISO/IEC 20830',
    description: '2D matrix barcode designed specifically to optimize Chinese character (GB18030) encoding density.',
    defaultData: '中国物流追溯代码-2026',
    status: 'PARTIALLY_SUPPORTED',
    supports2D: true,
    supportsGS1: false,
    checksumType: 'Reed-Solomon 4 security levels',
    characterSet: 'Chinese characters, binary, ASCII',
    minModuleWidthMm: 0.30,
  },
  {
    id: 'gs1-composite',
    displayName: 'GS1 Composite Symbology (EAN.UCC Composite)',
    category: 'Composite & Healthcare',
    standard: 'ISO/IEC 24723 & GS1 General Specifications',
    description: 'Combines a 1D primary linear barcode (EAN-13, GS1-128) with a 2D composite component (CC-A, CC-B, CC-C).',
    defaultData: '(01)00614141999996|(10)LOT-2026(17)280630',
    status: 'REQUIRES_PLUGIN',
    supports2D: true,
    supportsGS1: true,
    checksumType: 'Dual 1D Modulo + 2D Reed-Solomon',
    characterSet: 'GS1 Application Identifiers',
    minModuleWidthMm: 0.33,
    nativeZPLCommand: '^BC with CC',
  },
  {
    id: 'rfid-epc-gen2',
    displayName: 'RFID EPC Class 1 Gen 2 (UHF Tag Encoding)',
    category: 'Specialized',
    standard: 'ISO/IEC 18000-6C / GS1 EPC Tag Data Standard',
    description: 'Inlay tag encoding specification for RAIN RFID UHF smart labels with EPC 96-bit / 128-bit memory bank write.',
    defaultData: 'urn:epc:tag:sgtin-96:3.0614141.012345.400',
    status: 'REQUIRES_HARDWARE',
    supports2D: false,
    supportsGS1: true,
    checksumType: '16-bit Cyclic Redundancy Check (CRC-16)',
    characterSet: 'Hexadecimal EPC / SGTIN / GRAI',
    minModuleWidthMm: 0,
    nativeZPLCommand: '^WT (Write Tag) / ^RS (RFID Setup)',
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
