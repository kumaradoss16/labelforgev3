/**
 * LabelForge QR Code Payload Generator & Parser Service
 * Standard-compliant builders for URLs, vCards (RFC 2426 / RFC 6350 / MECARD),
 * Wi-Fi configs, Email/SMS, and Error Correction Level definitions (L, M, Q, H).
 */

export type QRErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QRECCInfo {
  level: QRErrorCorrectionLevel;
  label: string;
  shortName: string;
  recoveryPercentage: string;
  recoveryNumeric: number;
  description: string;
  bestFor: string;
  badgeColor: string;
}

export const QR_ECC_LEVELS: Record<QRErrorCorrectionLevel, QRECCInfo> = {
  L: {
    level: 'L',
    label: 'Level L (Low)',
    shortName: 'Low',
    recoveryPercentage: '~7%',
    recoveryNumeric: 7,
    description: 'Minimum redundancy (~7% recovery). Maximizes data capacity and keeps QR modules as small as possible.',
    bestFor: 'Clean high-density labels, direct thermal/thermal transfer printing on smooth synthetic stock.',
    badgeColor: 'text-emerald-400 bg-emerald-950/50 border-emerald-700/50',
  },
  M: {
    level: 'M',
    label: 'Level M (Medium)',
    shortName: 'Medium',
    recoveryPercentage: '~15%',
    recoveryNumeric: 15,
    description: 'Standard industrial default (~15% recovery). Offers optimal balance between scan speed and error resilience.',
    bestFor: 'General inventory tags, retail product packaging, asset tags, and standard carton shipping labels.',
    badgeColor: 'text-blue-400 bg-blue-950/50 border-blue-700/50',
  },
  Q: {
    level: 'Q',
    label: 'Level Q (Quartile)',
    shortName: 'Quartile',
    recoveryPercentage: '~25%',
    recoveryNumeric: 25,
    description: 'Elevated reliability (~25% recovery). Resists surface abrasions, partial tears, and dirty warehouse environments.',
    bestFor: 'Corrugated cartons, logistics pallets, outdoor lumber/steel tags, and freight transit labels.',
    badgeColor: 'text-amber-400 bg-amber-950/50 border-amber-700/50',
  },
  H: {
    level: 'H',
    label: 'Level H (High)',
    shortName: 'High',
    recoveryPercentage: '~30%',
    recoveryNumeric: 30,
    description: 'Maximum fault tolerance (~30% recovery). Survives substantial smudging, chemical stains, and punctures.',
    bestFor: 'Heavy industrial machinery labels, chemical drum hazmat tags, freezer/cryo labels, or center-logo overlays.',
    badgeColor: 'text-rose-400 bg-rose-950/50 border-rose-700/50',
  },
};

export type QRPayloadType = 'url' | 'vcard' | 'email' | 'wifi' | 'sms' | 'tel' | 'raw';

export interface UrlQueryParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface UrlPayloadConfig {
  protocol: 'https://' | 'http://' | 'ftp://' | 'custom' | 'none';
  customProtocol: string;
  hostPath: string;
  params: UrlQueryParam[];
  encodeParams: boolean;
}

export interface VCardPayloadConfig {
  version: '3.0' | '4.0' | 'mecard';
  prefix: string;
  firstName: string;
  lastName: string;
  middleName: string;
  suffix: string;
  organization: string;
  department: string;
  title: string;
  workPhone: string;
  cellPhone: string;
  workEmail: string;
  homeEmail: string;
  url: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  note: string;
}

export interface EmailPayloadConfig {
  to: string;
  subject: string;
  body: string;
}

export interface WifiPayloadConfig {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export interface SmsPayloadConfig {
  phone: string;
  message: string;
}

/**
 * Generate standard compliant URL string with custom query parameters and encoding
 */
export function generateUrlPayload(config: UrlPayloadConfig): string {
  let base = config.hostPath.trim();
  if (!base) return '';

  // Apply protocol
  let protocolPrefix = '';
  if (config.protocol === 'custom') {
    protocolPrefix = config.customProtocol ? `${config.customProtocol.replace(/:?\/?\/?$/, '')}://` : '';
  } else if (config.protocol !== 'none') {
    // Strip existing protocol if user pasted it into hostPath
    base = base.replace(/^(https?:\/\/|ftp:\/\/|[a-z0-9_-]+:\/\/)/i, '');
    protocolPrefix = config.protocol;
  }

  // Handle query params
  const activeParams = (config.params || []).filter(p => p.enabled && p.key.trim() !== '');
  let queryString = '';

  if (activeParams.length > 0) {
    const separator = base.includes('?') ? '&' : '?';
    const encodedPairs = activeParams.map(p => {
      const k = config.encodeParams ? encodeURIComponent(p.key.trim()) : p.key.trim();
      const v = config.encodeParams ? encodeURIComponent(p.value.trim()) : p.value.trim();
      return `${k}=${v}`;
    });
    queryString = `${separator}${encodedPairs.join('&')}`;
  }

  return `${protocolPrefix}${base}${queryString}`;
}

/**
 * Parse a raw URL into structured config
 */
export function parseUrlPayload(raw: string): UrlPayloadConfig | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes('\n')) return null;

  try {
    let protocol: UrlPayloadConfig['protocol'] = 'none';
    let customProtocol = '';
    let hostAndRest = trimmed;

    if (/^https:\/\//i.test(trimmed)) {
      protocol = 'https://';
      hostAndRest = trimmed.substring(8);
    } else if (/^http:\/\//i.test(trimmed)) {
      protocol = 'http://';
      hostAndRest = trimmed.substring(7);
    } else if (/^ftp:\/\//i.test(trimmed)) {
      protocol = 'ftp://';
      hostAndRest = trimmed.substring(6);
    } else if (/^[a-z0-9_-]+:\/\//i.test(trimmed)) {
      const match = trimmed.match(/^([a-z0-9_-]+):\/\/(.*)$/i);
      if (match) {
        protocol = 'custom';
        customProtocol = match[1];
        hostAndRest = match[2];
      }
    }

    const qIndex = hostAndRest.indexOf('?');
    let hostPath = hostAndRest;
    const params: UrlQueryParam[] = [];

    if (qIndex !== -1) {
      hostPath = hostAndRest.substring(0, qIndex);
      const searchStr = hostAndRest.substring(qIndex + 1);
      const pairs = searchStr.split('&');
      pairs.forEach((pair, idx) => {
        if (!pair) return;
        const [k, ...vParts] = pair.split('=');
        const v = vParts.join('=');
        try {
          params.push({
            id: `param-${idx}-${Date.now()}`,
            key: decodeURIComponent(k),
            value: decodeURIComponent(v || ''),
            enabled: true,
          });
        } catch {
          params.push({
            id: `param-${idx}-${Date.now()}`,
            key: k,
            value: v || '',
            enabled: true,
          });
        }
      });
    }

    return {
      protocol,
      customProtocol,
      hostPath,
      params,
      encodeParams: true,
    };
  } catch {
    return null;
  }
}

/**
 * Clean and escape vCard text values per RFC specifications
 */
function escapeVCardValue(val: string): string {
  if (!val) return '';
  return val
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate standard compliant vCard payload (vCard 3.0, 4.0, or MECARD)
 */
export function generateVCardPayload(config: VCardPayloadConfig): string {
  if (config.version === 'mecard') {
    // MECARD standard (Compact representation)
    const parts: string[] = ['MECARD:'];
    const namePart = [config.lastName.trim(), config.firstName.trim()].filter(Boolean).join(',');
    if (namePart) parts.push(`N:${namePart};`);
    if (config.organization) parts.push(`ORG:${config.organization.trim()};`);
    if (config.workPhone || config.cellPhone) parts.push(`TEL:${(config.workPhone || config.cellPhone).trim()};`);
    if (config.workEmail || config.homeEmail) parts.push(`EMAIL:${(config.workEmail || config.homeEmail).trim()};`);
    if (config.url) parts.push(`URL:${config.url.trim()};`);
    const addr = [config.street, config.city, config.state, config.postalCode, config.country].filter(Boolean).join(',');
    if (addr) parts.push(`ADR:;;${addr};`);
    if (config.note) parts.push(`NOTE:${config.note.trim()};`);
    parts.push(';');
    return parts.join('');
  }

  const isV4 = config.version === '4.0';
  const lines: string[] = ['BEGIN:VCARD', isV4 ? 'VERSION:4.0' : 'VERSION:3.0'];

  // Formatted Name (FN) is required in vCard standard
  const fullName = [config.prefix, config.firstName, config.middleName, config.lastName, config.suffix]
    .map(s => s.trim())
    .filter(Boolean)
    .join(' ');
  
  lines.push(`FN:${escapeVCardValue(fullName || config.firstName || config.organization || 'Contact')}`);

  // Structured Name: Family;Given;Additional;Prefix;Suffix
  const structName = [
    escapeVCardValue(config.lastName.trim()),
    escapeVCardValue(config.firstName.trim()),
    escapeVCardValue(config.middleName.trim()),
    escapeVCardValue(config.prefix.trim()),
    escapeVCardValue(config.suffix.trim())
  ].join(';');

  lines.push(`N:${structName}`);

  if (config.organization.trim()) {
    const orgVal = config.department.trim()
      ? `${escapeVCardValue(config.organization.trim())};${escapeVCardValue(config.department.trim())}`
      : escapeVCardValue(config.organization.trim());
    lines.push(`ORG:${orgVal}`);
  }

  if (config.title.trim()) {
    lines.push(`TITLE:${escapeVCardValue(config.title.trim())}`);
  }

  if (config.workPhone.trim()) {
    if (isV4) {
      lines.push(`TEL;TYPE="work,voice";VALUE=uri:tel:${config.workPhone.trim()}`);
    } else {
      lines.push(`TEL;TYPE=WORK,VOICE:${config.workPhone.trim()}`);
    }
  }

  if (config.cellPhone.trim()) {
    if (isV4) {
      lines.push(`TEL;TYPE="cell,voice";VALUE=uri:tel:${config.cellPhone.trim()}`);
    } else {
      lines.push(`TEL;TYPE=CELL,VOICE:${config.cellPhone.trim()}`);
    }
  }

  if (config.workEmail.trim()) {
    if (isV4) {
      lines.push(`EMAIL;TYPE=work:${config.workEmail.trim()}`);
    } else {
      lines.push(`EMAIL;TYPE=WORK:${config.workEmail.trim()}`);
    }
  }

  if (config.homeEmail.trim()) {
    if (isV4) {
      lines.push(`EMAIL;TYPE=home:${config.homeEmail.trim()}`);
    } else {
      lines.push(`EMAIL;TYPE=HOME:${config.homeEmail.trim()}`);
    }
  }

  if (config.url.trim()) {
    lines.push(`URL:${config.url.trim()}`);
  }

  // Address (ADR)
  const hasAddr = config.street || config.city || config.state || config.postalCode || config.country;
  if (hasAddr) {
    const adrVal = [
      '', // PO Box
      '', // Extended address
      escapeVCardValue(config.street.trim()),
      escapeVCardValue(config.city.trim()),
      escapeVCardValue(config.state.trim()),
      escapeVCardValue(config.postalCode.trim()),
      escapeVCardValue(config.country.trim()),
    ].join(';');
    lines.push(isV4 ? `ADR;TYPE=work:${adrVal}` : `ADR;TYPE=WORK:${adrVal}`);
  }

  if (config.note.trim()) {
    lines.push(`NOTE:${escapeVCardValue(config.note.trim())}`);
  }

  lines.push('END:VCARD');
  return lines.join('\n');
}

/**
 * Parse an existing vCard or MECARD payload string back into form fields
 */
export function parseVCardPayload(raw: string): Partial<VCardPayloadConfig> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('MECARD:')) {
    const res: Partial<VCardPayloadConfig> = { version: 'mecard' };
    const nMatch = trimmed.match(/N:([^;]+)/i);
    if (nMatch) {
      const parts = nMatch[1].split(',');
      res.lastName = parts[0] || '';
      res.firstName = parts[1] || '';
    }
    const orgMatch = trimmed.match(/ORG:([^;]+)/i);
    if (orgMatch) res.organization = orgMatch[1];
    const telMatch = trimmed.match(/TEL:([^;]+)/i);
    if (telMatch) res.workPhone = telMatch[1];
    const emailMatch = trimmed.match(/EMAIL:([^;]+)/i);
    if (emailMatch) res.workEmail = emailMatch[1];
    const urlMatch = trimmed.match(/URL:([^;]+)/i);
    if (urlMatch) res.url = urlMatch[1];
    const noteMatch = trimmed.match(/NOTE:([^;]+)/i);
    if (noteMatch) res.note = noteMatch[1];
    return res;
  }

  if (!trimmed.includes('BEGIN:VCARD')) return null;

  const res: Partial<VCardPayloadConfig> = {
    version: trimmed.includes('VERSION:4.0') ? '4.0' : '3.0',
    prefix: '',
    firstName: '',
    lastName: '',
    middleName: '',
    suffix: '',
    organization: '',
    department: '',
    title: '',
    workPhone: '',
    cellPhone: '',
    workEmail: '',
    homeEmail: '',
    url: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    note: '',
  };

  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.substring(0, colonIdx).toUpperCase();
    const val = line.substring(colonIdx + 1).replace(/\\n/g, '\n').replace(/\\([;,])/g, '$1').trim();

    if (key === 'N' || key.startsWith('N;')) {
      const parts = val.split(';');
      res.lastName = parts[0] || '';
      res.firstName = parts[1] || '';
      res.middleName = parts[2] || '';
      res.prefix = parts[3] || '';
      res.suffix = parts[4] || '';
    } else if (key === 'ORG' || key.startsWith('ORG;')) {
      const parts = val.split(';');
      res.organization = parts[0] || '';
      res.department = parts[1] || '';
    } else if (key === 'TITLE' || key.startsWith('TITLE;')) {
      res.title = val;
    } else if (key.startsWith('TEL')) {
      if (key.includes('CELL')) {
        res.cellPhone = val.replace(/^tel:/i, '');
      } else {
        res.workPhone = val.replace(/^tel:/i, '');
      }
    } else if (key.startsWith('EMAIL')) {
      if (key.includes('HOME')) {
        res.homeEmail = val;
      } else {
        res.workEmail = val;
      }
    } else if (key === 'URL' || key.startsWith('URL;')) {
      res.url = val;
    } else if (key.startsWith('ADR')) {
      const parts = val.split(';');
      res.street = parts[2] || '';
      res.city = parts[3] || '';
      res.state = parts[4] || '';
      res.postalCode = parts[5] || '';
      res.country = parts[6] || '';
    } else if (key === 'NOTE' || key.startsWith('NOTE;')) {
      res.note = val;
    }
  }

  return res;
}

/**
 * Generate Email (mailto) link payload
 */
export function generateEmailPayload(config: EmailPayloadConfig): string {
  const to = config.to.trim();
  if (!to) return '';
  const params: string[] = [];
  if (config.subject.trim()) params.push(`subject=${encodeURIComponent(config.subject.trim())}`);
  if (config.body.trim()) params.push(`body=${encodeURIComponent(config.body.trim())}`);
  return params.length > 0 ? `mailto:${to}?${params.join('&')}` : `mailto:${to}`;
}

/**
 * Generate Wi-Fi configuration string (WIFI:T:...;S:...;P:...;;)
 */
export function generateWifiPayload(config: WifiPayloadConfig): string {
  if (!config.ssid.trim()) return '';
  const enc = config.encryption;
  const pass = enc !== 'nopass' ? config.password : '';
  const hidden = config.hidden ? 'H:true;' : '';
  return `WIFI:T:${enc};S:${config.ssid.trim()};P:${pass};${hidden};`;
}

/**
 * Generate SMS payload
 */
export function generateSmsPayload(config: SmsPayloadConfig): string {
  if (!config.phone.trim()) return '';
  return config.message.trim()
    ? `SMSTO:${config.phone.trim()}:${config.message.trim()}`
    : `SMSTO:${config.phone.trim()}`;
}

/**
 * Automatically identify QR code content type
 */
export function detectQRPayloadType(text: string): QRPayloadType {
  const trimmed = text.trim();
  if (!trimmed) return 'url';

  if (trimmed.startsWith('BEGIN:VCARD') || trimmed.startsWith('MECARD:')) {
    return 'vcard';
  }
  if (trimmed.startsWith('mailto:')) {
    return 'email';
  }
  if (trimmed.startsWith('WIFI:')) {
    return 'wifi';
  }
  if (trimmed.startsWith('SMSTO:') || trimmed.startsWith('sms:')) {
    return 'sms';
  }
  if (trimmed.startsWith('tel:')) {
    return 'tel';
  }
  if (/^https?:\/\//i.test(trimmed) || /^[a-z0-9_-]+:\/\//i.test(trimmed)) {
    return 'url';
  }
  return 'raw';
}
