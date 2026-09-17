/**
 * Standard Windows TrueType (TTF) and OpenType (OTF) Font Catalog
 * Built for industrial label generation, compliance marking, and thermal printer rasterization.
 */

export type FontFormatCode = 'TTF' | 'OTF';
export type FontCategoryCode = 'sans-serif' | 'serif' | 'monospace' | 'display' | 'multilingual';

export interface WindowsFontDefinition {
  family: string;
  displayName: string;
  format: 'TrueType (TTF)' | 'OpenType (OTF)';
  formatCode: FontFormatCode;
  category: FontCategoryCode;
  categoryLabel: string;
  fallbackStack: string;
  description: string;
  bestFor: string;
  sampleText: string;
  windowsStandard: string;
  zplFontName?: string;
  tsplFontName?: string;
  direction?: 'ltr' | 'rtl';
  openTypeFeatures: string[];
}

export const WINDOWS_FONT_CATALOG: WindowsFontDefinition[] = [
  // =========================================================================
  // 1. STANDARD WINDOWS TRUETYPE (TTF) FONTS
  // =========================================================================
  {
    family: 'Arial',
    displayName: 'Arial (Standard TrueType)',
    format: 'TrueType (TTF)',
    formatCode: 'TTF',
    category: 'sans-serif',
    categoryLabel: 'Sans-Serif',
    fallbackStack: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
    description: 'Universal Windows core TrueType sans-serif. Standard for GS1, ODETTE, and AIAG compliance labels.',
    bestFor: 'Shipping cartons, SSCC-18, asset tracking, general packaging',
    sampleText: 'SHIP TO: DOCK 4A - ORDER #98842-XB (01)00614141999996',
    windowsStandard: 'Windows 3.1 - Windows 11 (Standard Core TTF)',
    zplFontName: 'ARIAL.TTF',
    tsplFontName: 'ARIAL.TTF',
    openTypeFeatures: ['TrueType Outlines', 'Standard Kerning', 'Direct ZPL ^CW Support'],
  },
  {
    family: 'Arial Black',
    displayName: 'Arial Black (Heavy TrueType)',
    format: 'TrueType (TTF)',
    formatCode: 'TTF',
    category: 'display',
    categoryLabel: 'Display & Hazard Warning',
    fallbackStack: "'Arial Black', 'Arial Bold', Gadget, sans-serif",
    description: 'Extra-heavy weight TrueType designed for high-contrast visibility at high warehouse speeds.',
    bestFor: 'HAZMAT hazard warnings, DANGEROUS GOODS, Pallet placard headers',
    sampleText: 'HAZMAT CLASS 3: FLAMMABLE LIQUID - KEEP AWAY FROM FIRE',
    windowsStandard: 'Windows 95 - Windows 11 (Standard Core TTF)',
    zplFontName: 'ARIBLK.TTF',
    tsplFontName: 'ARIBLK.TTF',
    openTypeFeatures: ['Ultra-Bold Weight', 'High Thermal Contrast', 'GHS Hazard Headers'],
  },
  {
    family: 'Tahoma',
    displayName: 'Tahoma (Compact TrueType)',
    format: 'TrueType (TTF)',
    formatCode: 'TTF',
    category: 'sans-serif',
    categoryLabel: 'Sans-Serif',
    fallbackStack: "Tahoma, Verdana, Segoe, sans-serif",
    description: 'Narrow letter spacing and high x-height engineered by Microsoft for tight thermal label layouts.',
    bestFor: 'Compact micro labels, electronics PCB serials, 203 DPI thermal printers',
    sampleText: 'SN: 884-A109-REV3 | DC: 24V 1.5A | MAC: 00:1A:2B:3C:4D:5E',
    windowsStandard: 'Windows 95 - Windows 11 (Standard Core TTF)',
    zplFontName: 'TAHOMA.TTF',
    tsplFontName: 'TAHOMA.TTF',
    openTypeFeatures: ['Tight Tracking', 'Micro-Text Legibility', 'Narrow Proportions'],
  },
  {
    family: 'Verdana',
    displayName: 'Verdana (Micro-Legible TrueType)',
    format: 'TrueType (TTF)',
    formatCode: 'TTF',
    category: 'sans-serif',
    categoryLabel: 'Sans-Serif',
    fallbackStack: "Verdana, Geneva, sans-serif",
    description: 'Generous letter spacing and large apertures engineered specifically for extreme small-point legibility.',
    bestFor: '6pt - 8pt ingredient lists, FDA pharmaceutical warnings, low-resolution thermal print heads',
    sampleText: 'Net Wt. 250g | Batch: B2026-X9 | Store below 25°C (77°F)',
    windowsStandard: 'Windows 95 - Windows 11 (Standard Core TTF)',
    zplFontName: 'VERDANA.TTF',
    tsplFontName: 'VERDANA.TTF',
    openTypeFeatures: ['Wide Apertures', 'High x-Height', 'Anti-Blur Thermal Hints'],
  },
  {
    family: 'Trebuchet MS',
    displayName: 'Trebuchet MS (Humanist TrueType)',
    format: 'TrueType (TTF)',
    formatCode: 'TTF',
    category: 'sans-serif',
    categoryLabel: 'Sans-Serif',
    fallbackStack: "'Trebuchet MS', 'Lucida Grande', 'Lucida Sans', sans-serif",
    description: 'Humanist sans-serif with distinct letterforms (curved lowercase l, open g) preventing character misreads.',
    bestFor: 'Retail tags, laboratory specimen identification, serialized equipment badges',
    sampleText: 'SPECIMEN ID: LAB-9042-B | COLLECTED: 2026-09-17 08:30',
    windowsStandard: 'Windows 98 - Windows 11 (Standard Core TTF)',
    zplFontName: 'TREBUC.TTF',
    tsplFontName: 'TREBUC.TTF',
    openTypeFeatures: ['Distinguishable Characters', 'Humanist Proportions'],
  },
  {
    family: 'Times New Roman',
    displayName: 'Times New Roman (Standard Serif TrueType)',
    format: 'TrueType (TTF)',
    formatCode: 'TTF',
    category: 'serif',
    categoryLabel: 'Serif & Regulatory',
    fallbackStack: "'Times New Roman', Times, 'Tinos', serif",
    description: 'Classic Windows serif TrueType standard. Required by numerous national pharmaceutical & legal standards.',
    bestFor: 'Chemical safety data, FDA drug facts, compliance inserts, formal warranty seals',
    sampleText: 'WARNING: Federal law restricts this device to sale by or on the order of a physician.',
    windowsStandard: 'Windows 3.1 - Windows 11 (Standard Core TTF)',
    zplFontName: 'TIMES.TTF',
    tsplFontName: 'TIMES.TTF',
    openTypeFeatures: ['Regulatory Standard', 'High Contrast Serifs', 'Formal Print'],
  },
  {
    family: 'Georgia',
    displayName: 'Georgia (High-Contrast Serif TrueType)',
    format: 'TrueType (TTF)',
    formatCode: 'TTF',
    category: 'serif',
    categoryLabel: 'Serif & Regulatory',
    fallbackStack: "Georgia, 'Palatino Linotype', serif",
    description: 'Sturdy serif with thick horizontals that resist thermal head wear and ribbon burnout.',
    bestFor: 'Specialty food packaging, wine & beverage labels, organic certifications',
    sampleText: 'Estate Bottled Vintage 2024 - Certified Organic Harvest No. 418',
    windowsStandard: 'Windows 95 - Windows 11 (Standard Core TTF)',
    zplFontName: 'GEORGIA.TTF',
    tsplFontName: 'GEORGIA.TTF',
    openTypeFeatures: ['Sturdy Serifs', 'Thermal Ribbon Burnout Resistance', 'Generous Proportions'],
  },
  {
    family: 'Courier New',
    displayName: 'Courier New (Fixed-Pitch Monospace TrueType)',
    format: 'TrueType (TTF)',
    formatCode: 'TTF',
    category: 'monospace',
    categoryLabel: 'Monospace & EDI',
    fallbackStack: "'Courier New', Courier, 'Cousine', monospace",
    description: 'Standard 10-pitch typewriter TrueType font. Ideal for mainframe print streams and raw EDI feeds.',
    bestFor: 'Legacy AS/400 printing, EDIFACT manifests, raw tabular column alignment',
    sampleText: 'LINE ITEM  QTY  UOM  PART NUMBER    UNIT PRICE  EXT PRICE\n0001       050  EA   X-9002-12B     $14.50      $725.00',
    windowsStandard: 'Windows 3.1 - Windows 11 (Standard Core TTF)',
    zplFontName: 'COUR.TTF',
    tsplFontName: 'COUR.TTF',
    openTypeFeatures: ['Strict 10-Pitch Monospace', 'Column Alignment Safe', 'Mainframe Compatibility'],
  },
  {
    family: 'Lucida Console',
    displayName: 'Lucida Console (Terminal TrueType)',
    format: 'TrueType (TTF)',
    formatCode: 'TTF',
    category: 'monospace',
    categoryLabel: 'Monospace & EDI',
    fallbackStack: "'Lucida Console', Monaco, monospace",
    description: 'Clear, modern monospace TrueType font originally designed for Windows NT and console applications.',
    bestFor: 'Data matrices verification strings, calibration certs, hexadecimal chip IDs',
    sampleText: 'HEX DUMP: 0x48 0x65 0x78 0x20 0x4C 0x61 0x62 0x65 0x6C 0x21',
    windowsStandard: 'Windows 95 - Windows 11 (Standard Core TTF)',
    zplFontName: 'LUCON.TTF',
    tsplFontName: 'LUCON.TTF',
    openTypeFeatures: ['Fixed-Pitch', 'Geometric Monospace', 'Console Tested'],
  },
  {
    family: 'Impact',
    displayName: 'Impact (Heavy Condensed TrueType)',
    format: 'TrueType (TTF)',
    formatCode: 'TTF',
    category: 'display',
    categoryLabel: 'Display & Hazard Warning',
    fallbackStack: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
    description: 'Extreme condensed bold TrueType headline font. Fits maximum point size into narrow label widths.',
    bestFor: 'CAUTION, FRAGILE, THIS SIDE UP, DO NOT DOUBLE STACK carton headers',
    sampleText: 'FRAGILE - HANDLE WITH CARE - DO NOT DROP',
    windowsStandard: 'Windows 95 - Windows 11 (Standard Core TTF)',
    zplFontName: 'IMPACT.TTF',
    tsplFontName: 'IMPACT.TTF',
    openTypeFeatures: ['Compressed Width', 'Max Font Size per Width', 'Hazard Placards'],
  },
  {
    family: 'Franklin Gothic Medium',
    displayName: 'Franklin Gothic Medium (Industrial Grotesque TrueType)',
    format: 'TrueType (TTF)',
    formatCode: 'TTF',
    category: 'sans-serif',
    categoryLabel: 'Sans-Serif',
    fallbackStack: "'Franklin Gothic Medium', 'Arial Narrow', sans-serif",
    description: 'Classic American industrial grotesque typeface. Heavy solid stems popular in automotive manufacturing.',
    bestFor: 'Automotive tier-1 parts labeling, AIAG B-10 compliance, machine nameplates',
    sampleText: 'PART NO: 84920-K110 | CAGE CODE: 1A990 | LOT: 202609',
    windowsStandard: 'Windows 95 - Windows 11 (Standard Core TTF)',
    zplFontName: 'FRAMD.TTF',
    tsplFontName: 'FRAMD.TTF',
    openTypeFeatures: ['Industrial Weight', 'Automotive AIAG Standard', 'Solid Thermal Deposition'],
  },
  {
    family: 'Palatino Linotype',
    displayName: 'Palatino Linotype (Book Serif TrueType)',
    format: 'TrueType (TTF)',
    formatCode: 'TTF',
    category: 'serif',
    categoryLabel: 'Serif & Regulatory',
    fallbackStack: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
    description: 'Hermann Zapf Renaissance serif font with OpenType mathematical and classical ligature extensions.',
    bestFor: 'Luxury retail tags, gourmet confectionery, certificates of authenticity',
    sampleText: 'Certificate of Conformance - Inspected & Approved QA-88',
    windowsStandard: 'Windows 2000 - Windows 11 (Standard Core TTF/OTF)',
    zplFontName: 'PALA.TTF',
    tsplFontName: 'PALA.TTF',
    openTypeFeatures: ['Classical Proportions', 'Extended Ligatures', 'Luxury Aesthetic'],
  },

  // =========================================================================
  // 2. STANDARD WINDOWS OPENTYPE (OTF) FONTS
  // =========================================================================
  {
    family: 'Segoe UI',
    displayName: 'Segoe UI (Windows Desktop OpenType Standard)',
    format: 'OpenType (OTF)',
    formatCode: 'OTF',
    category: 'sans-serif',
    categoryLabel: 'Sans-Serif',
    fallbackStack: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
    description: 'The standard Windows operating system typeface. Features advanced OpenType kerning, metric pairs, and broad script coverage.',
    bestFor: 'Modern enterprise labels, UDI healthcare barcodes, high-DPI 300/600 DPI print heads',
    sampleText: 'BATCH # 2026-09-EXP12 | SERIAL: 9021884 | GS1 VERIFIED',
    windowsStandard: 'Windows Vista - Windows 11 (Standard Windows Shell Font)',
    zplFontName: 'SEGOEUI.TTF',
    tsplFontName: 'SEGOEUI.TTF',
    openTypeFeatures: ['ClearType Optimized', 'Advanced Kerning Tables', 'Broad Latin/Cyrillic/Greek', 'Sub-pixel Hinting'],
  },
  {
    family: 'Calibri',
    displayName: 'Calibri (ClearType OpenType Standard)',
    format: 'OpenType (OTF)',
    formatCode: 'OTF',
    category: 'sans-serif',
    categoryLabel: 'Sans-Serif',
    fallbackStack: "Calibri, Carlito, 'Segoe UI', sans-serif",
    description: 'Modern Microsoft Office and Windows standard with softly rounded stems that prevent thermal pixel clipping.',
    bestFor: 'Logistics waybills, retail shelf tags, enterprise asset tags',
    sampleText: 'EXP: 12/2028 | LOT: K992-01 | WEIGHT: 14.80 KG',
    windowsStandard: 'Windows Vista - Windows 11 (Standard ClearType Collection)',
    zplFontName: 'CALIBRI.TTF',
    tsplFontName: 'CALIBRI.TTF',
    openTypeFeatures: ['ClearType Engine', 'Softened Stem Terminals', 'Office Document Parity', 'Sub-pixel Anti-aliasing'],
  },
  {
    family: 'Consolas',
    displayName: 'Consolas (ClearType Monospace OpenType)',
    format: 'OpenType (OTF)',
    formatCode: 'OTF',
    category: 'monospace',
    categoryLabel: 'Monospace & EDI',
    fallbackStack: "Consolas, 'Courier New', 'IBM Plex Mono', monospace",
    description: 'Engineered by Luc(as) de Groot for Microsoft ClearType. Slashed zeroes and distinct 1/I/l characters eliminate OCR misreads.',
    bestFor: 'GS1 Application Identifiers, Data Matrix human readable text, cryptographic hash seals',
    sampleText: '(01)00850000000000(10)LOT12345(17)261231(21)SN998811',
    windowsStandard: 'Windows Vista - Windows 11 (Standard ClearType Collection)',
    zplFontName: 'CONSOLA.TTF',
    tsplFontName: 'CONSOLA.TTF',
    openTypeFeatures: ['Slashed Zero (0 vs O)', 'ClearType Hints', 'Strict Glyph Widths', 'Anti-Substitution Geometry'],
  },
  {
    family: 'Cambria',
    displayName: 'Cambria (ClearType Serif OpenType)',
    format: 'OpenType (OTF)',
    formatCode: 'OTF',
    category: 'serif',
    categoryLabel: 'Serif & Regulatory',
    fallbackStack: "Cambria, Caladea, Georgia, serif",
    description: 'Engineered for optimal on-screen reading and high-resolution commercial label printing with even typographic color.',
    bestFor: 'Formal legal notices, medical device manuals, export customs paperwork',
    sampleText: 'Authorized Medical Device Manufacturer - ISO 13485 Certified',
    windowsStandard: 'Windows Vista - Windows 11 (Standard ClearType Collection)',
    zplFontName: 'CAMBRIA.TTF',
    tsplFontName: 'CAMBRIA.TTF',
    openTypeFeatures: ['ClearType Mathematical Font', 'Consistent Stroke Weight', 'Heavy Punctuation'],
  },
  {
    family: 'Candara',
    displayName: 'Candara (Humanist ClearType OpenType)',
    format: 'OpenType (OTF)',
    formatCode: 'OTF',
    category: 'sans-serif',
    categoryLabel: 'Sans-Serif',
    fallbackStack: "Candara, 'Segoe UI', sans-serif",
    description: 'Humanist sans-serif with subtle entasis and flared terminals for premium commercial product packaging.',
    bestFor: 'Cosmetics packaging, organic goods, luxury apparel tags',
    sampleText: 'Pure Botanical Formulation - Dermatologically Tested 100mL',
    windowsStandard: 'Windows Vista - Windows 11 (Standard ClearType Collection)',
    zplFontName: 'CANDARA.TTF',
    tsplFontName: 'CANDARA.TTF',
    openTypeFeatures: ['OpenType Ligatures', 'Humanist Flared Terminals', 'ClearType Tuned'],
  },
  {
    family: 'Corbel',
    displayName: 'Corbel (Geometric ClearType OpenType)',
    format: 'OpenType (OTF)',
    formatCode: 'OTF',
    category: 'sans-serif',
    categoryLabel: 'Sans-Serif',
    fallbackStack: "Corbel, 'Segoe UI', sans-serif",
    description: 'Uncluttered, clean geometric-humanist sans-serif designed for functional precision without visual fatigue.',
    bestFor: 'Cleanroom manufacturing, electronic component trays, high-tech branding',
    sampleText: 'STATIC SENSITIVE DEVICE - HANDLE ONLY AT ESD WORKSTATION',
    windowsStandard: 'Windows Vista - Windows 11 (Standard ClearType Collection)',
    zplFontName: 'CORBEL.TTF',
    tsplFontName: 'CORBEL.TTF',
    openTypeFeatures: ['Uncluttered Letterforms', 'ClearType Optimized', 'Open Counters'],
  },
  {
    family: 'Constantia',
    displayName: 'Constantia (Transitional ClearType OpenType)',
    format: 'OpenType (OTF)',
    formatCode: 'OTF',
    category: 'serif',
    categoryLabel: 'Serif & Regulatory',
    fallbackStack: "Constantia, Georgia, serif",
    description: 'Transitional serif with triangular serifs and soft cuts, ideal for luxury goods and artisanal labeling.',
    bestFor: 'Gourmet delicacies, spirits, luxury cosmetics, commemorative seals',
    sampleText: 'Artisanal Distillation Batch #44 - Aged 18 Years in French Oak',
    windowsStandard: 'Windows Vista - Windows 11 (Standard ClearType Collection)',
    zplFontName: 'CONSTAN.TTF',
    tsplFontName: 'CONSTAN.TTF',
    openTypeFeatures: ['Transitional Serifs', 'ClearType Tuned', 'Proportional Figures'],
  },
  {
    family: 'Bahnschrift',
    displayName: 'Bahnschrift (DIN 1451 Industrial OpenType)',
    format: 'OpenType (OTF)',
    formatCode: 'OTF',
    category: 'sans-serif',
    categoryLabel: 'Industrial Logistics (DIN)',
    fallbackStack: "Bahnschrift, 'DIN Alternate', 'Arial', sans-serif",
    description: 'Official German DIN 1451 transportation and logistics standard font built natively into Windows 10 & 11 as an OpenType variable font.',
    bestFor: 'Rail logistics, highway freight placards, industrial equipment ratings',
    sampleText: 'GATEWAY TERMINAL 08 - CARGO WT: 24,500 KG - TRUCK ID: TRK-9921',
    windowsStandard: 'Windows 10 (Fall Creators Update) - Windows 11 (Built-in Variable OpenType)',
    zplFontName: 'BAHN.TTF',
    tsplFontName: 'BAHN.TTF',
    openTypeFeatures: ['DIN 1451 Standard', 'Industrial Monoline', 'Variable Weight Axis', 'Extreme Distance Readability'],
  },

  // =========================================================================
  // 3. INDUSTRIAL MONOSPACE STANDARDS
  // =========================================================================
  {
    family: 'IBM Plex Mono',
    displayName: 'IBM Plex Mono (Industrial Logistics Monospace)',
    format: 'OpenType (OTF)',
    formatCode: 'OTF',
    category: 'monospace',
    categoryLabel: 'Monospace & EDI',
    fallbackStack: "'IBM Plex Mono', Consolas, monospace",
    description: 'Enterprise open-source industrial monospace standard developed for high-precision technical interfaces.',
    bestFor: 'GS1-128 Human Readable Interpretation, serialization verification, barcode match fields',
    sampleText: 'GTIN-14: 10061414199993 | LOT: 2026-X9 | EXP: 2029-01',
    windowsStandard: 'Universal Logistics Standard (OpenType/TTF)',
    zplFontName: 'IBMMONO.TTF',
    tsplFontName: 'IBMMONO.TTF',
    openTypeFeatures: ['OpenType Tabular Figures', 'Slashed Zero', 'Industrial Metric Precision'],
  },

  // =========================================================================
  // 4. MULTILINGUAL UNICODE WINDOWS FONTS
  // =========================================================================
  {
    family: 'Noto Sans Tamil',
    displayName: 'Noto Sans Tamil (தமிழ் - Indic TrueType/OpenType)',
    format: 'OpenType (OTF)',
    formatCode: 'OTF',
    category: 'multilingual',
    categoryLabel: 'Multilingual Unicode',
    fallbackStack: "'Noto Sans Tamil', 'Latha', 'Vijaya', sans-serif",
    description: 'Full Unicode Tamil script engine with complex conjunct vowel ligatures for South Asian distribution.',
    bestFor: 'Export pharmaceuticals to Tamil Nadu, Sri Lanka, Singapore & Malaysia',
    sampleText: 'மருத்துவ தயாரிப்பு விவரக்குறிப்பு - தொகுதி எண்: 98842',
    windowsStandard: 'Windows Tamil Language Pack (OTF/TTF)',
    direction: 'ltr',
    openTypeFeatures: ['OTF GSUB Conjunct Shaping', 'Vowel Sign Positioning', 'Unicode 15.0 Support'],
  },
  {
    family: 'Noto Sans Devanagari',
    displayName: 'Noto Sans Devanagari (हिन्दी - Indic TrueType/OpenType)',
    format: 'OpenType (OTF)',
    formatCode: 'OTF',
    category: 'multilingual',
    categoryLabel: 'Multilingual Unicode',
    fallbackStack: "'Noto Sans Devanagari', 'Mangal', 'Aparajita', sans-serif",
    description: 'Devanagari script support with Shirorekha headline and complex half-form conjunct ligatures for Hindi and Marathi.',
    bestFor: 'Indian Bureau of Standards (BIS), FSSAI food packaging, state excise stamps',
    sampleText: 'गुणवत्ता आश्वासन एवं औद्योगिक मुद्रण प्रणाली',
    windowsStandard: 'Windows Hindi/Devanagari Pack (Mangal/Aparajita compatible)',
    direction: 'ltr',
    openTypeFeatures: ['Shirorekha Continuity', 'GSUB Halfform Ligatures', 'Matra Reordering'],
  },
  {
    family: 'Noto Sans Arabic',
    displayName: 'Noto Sans Arabic (العربية - RTL TrueType/OpenType)',
    format: 'OpenType (OTF)',
    formatCode: 'OTF',
    category: 'multilingual',
    categoryLabel: 'Multilingual Unicode',
    fallbackStack: "'Noto Sans Arabic', 'Segoe UI Historic', 'Traditional Arabic', sans-serif",
    description: 'Right-to-Left (RTL) bidirectional Arabic script engine with 4 contextual glyph shaping states (isolated, initial, medial, final).',
    bestFor: 'GCC SASO Saudi Arabian customs, UAE Halal compliance, Middle East logistics',
    sampleText: 'مستودع التوزيع الدولي - شحنة رقمية معتمدة',
    windowsStandard: 'Windows Arabic Pack (Traditional Arabic / Segoe UI Arabic)',
    direction: 'rtl',
    openTypeFeatures: ['Contextual 4-State Glyph Shaping', 'RTL Bidi Engine', 'Nastaliq Ligatures'],
  },
  {
    family: 'Noto Sans SC',
    displayName: 'Noto Sans SC (简体中文 - CJK TrueType/OpenType)',
    format: 'OpenType (OTF)',
    formatCode: 'OTF',
    category: 'multilingual',
    categoryLabel: 'Multilingual Unicode',
    fallbackStack: "'Noto Sans SC', 'Microsoft YaHei', 'SimSun', sans-serif",
    description: 'Simplified Chinese ideographic font with full GB18030 compliance matching Windows Microsoft YaHei.',
    bestFor: 'China CCC certification, manufacturing BOMs, export packaging',
    sampleText: '企业级热敏标签设计与工业级打印系统',
    windowsStandard: 'Windows CJK Pack (Microsoft YaHei / SimSun)',
    direction: 'ltr',
    openTypeFeatures: ['Full GB18030 Glyph Set', 'Ideographic Monospace Alignment', 'Direct TSPL Chinese Font'],
  },
  {
    family: 'Noto Sans JP',
    displayName: 'Noto Sans JP (日本語 - CJK TrueType/OpenType)',
    format: 'OpenType (OTF)',
    formatCode: 'OTF',
    category: 'multilingual',
    categoryLabel: 'Multilingual Unicode',
    fallbackStack: "'Noto Sans JP', 'Meiryo', 'Yu Gothic', 'MS Gothic', sans-serif",
    description: 'Japanese Kanji, Hiragana, and Katakana support matching Windows Meiryo and Yu Gothic fonts.',
    bestFor: 'JIS compliant Japanese electronics labeling and traceability',
    sampleText: '高精度サーマルプリンター制御およびバーコード検証',
    windowsStandard: 'Windows Japanese Pack (Meiryo / Yu Gothic)',
    direction: 'ltr',
    openTypeFeatures: ['JIS X 0213 Kanji Support', 'Kana Proportional Spacing', 'Vertical Writing Ready'],
  },
];

/**
 * Helper: Retrieve font definition by family name (case-insensitive)
 */
export function getFontDefinition(family?: string): WindowsFontDefinition {
  if (!family) return WINDOWS_FONT_CATALOG[0]; // Default to Arial or Segoe UI
  const match = WINDOWS_FONT_CATALOG.find(
    (f) => f.family.toLowerCase() === family.trim().toLowerCase()
  );
  if (match) return match;

  // Fallback if not directly found
  return {
    family,
    displayName: family,
    format: 'TrueType (TTF)',
    formatCode: 'TTF',
    category: 'sans-serif',
    categoryLabel: 'Standard Font',
    fallbackStack: `${family}, sans-serif`,
    description: 'System-provided font.',
    bestFor: 'General labeling',
    sampleText: 'SAMPLE TEXT 1234567890',
    windowsStandard: 'Installed Windows/System Font',
    openTypeFeatures: ['Standard Font Rendering'],
  };
}

/**
 * Helper: Get CSS font-family string with safe fallbacks
 */
export function getFontCssStack(family?: string): string {
  const def = getFontDefinition(family);
  return def.fallbackStack;
}

/**
 * Font groups for categorized dropdowns
 */
export const FONT_GROUPS = [
  {
    label: 'Windows TrueType (TTF) Families',
    fonts: WINDOWS_FONT_CATALOG.filter((f) => f.formatCode === 'TTF'),
  },
  {
    label: 'Windows OpenType (OTF) Families',
    fonts: WINDOWS_FONT_CATALOG.filter((f) => f.formatCode === 'OTF' && f.category !== 'multilingual'),
  },
  {
    label: 'Multilingual Unicode Windows Families',
    fonts: WINDOWS_FONT_CATALOG.filter((f) => f.category === 'multilingual'),
  },
];
