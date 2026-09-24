import { describe, it, expect } from 'vitest';
import {
  generateUrlPayload,
  parseUrlPayload,
  generateVCardPayload,
  parseVCardPayload,
  generateWifiPayload,
  generateEmailPayload,
  generateSmsPayload,
  detectQRPayloadType,
  QR_ECC_LEVELS,
  QRErrorCorrectionLevel,
} from '../services/qrCodeGenerator';
import QRCode from 'qrcode';

describe('QR Code Configuration Wizard — Engine & Payloads', () => {
  describe('1. URL Encoding & Query Parameter Serialization', () => {
    it('generates standard HTTPS URL without parameters', () => {
      const url = generateUrlPayload({
        protocol: 'https://',
        customProtocol: '',
        hostPath: 'label.acme.com/verify',
        params: [],
        encodeParams: true,
      });
      expect(url).toBe('https://label.acme.com/verify');
    });

    it('generates URL with encoded query parameters', () => {
      const url = generateUrlPayload({
        protocol: 'https://',
        customProtocol: '',
        hostPath: 'label.acme.com/asset',
        params: [
          { id: '1', key: 'lot', value: 'LOT 9921/A', enabled: true },
          { id: '2', key: 'sku', value: 'ITEM#440', enabled: true },
          { id: '3', key: 'disabled', value: 'ignore', enabled: false },
        ],
        encodeParams: true,
      });

      expect(url).toBe('https://label.acme.com/asset?lot=LOT%209921%2FA&sku=ITEM%23440');
    });

    it('supports custom protocol schemes like app deep links', () => {
      const url = generateUrlPayload({
        protocol: 'custom',
        customProtocol: 'scanapp',
        hostPath: 'inventory/scan/9941',
        params: [],
        encodeParams: true,
      });
      expect(url).toBe('scanapp://inventory/scan/9941');
    });

    it('parses raw URL strings back into structured parameters', () => {
      const raw = 'https://portal.company.com/track?carrier=FEDEX&id=TRACK123';
      const parsed = parseUrlPayload(raw);

      expect(parsed).not.toBeNull();
      expect(parsed?.protocol).toBe('https://');
      expect(parsed?.hostPath).toBe('portal.company.com/track');
      expect(parsed?.params).toHaveLength(2);
      expect(parsed?.params[0].key).toBe('carrier');
      expect(parsed?.params[0].value).toBe('FEDEX');
      expect(parsed?.params[1].key).toBe('id');
      expect(parsed?.params[1].value).toBe('TRACK123');
    });
  });

  describe('2. vCard Contact Card Generation & Parsing', () => {
    it('generates compliant vCard 3.0 RFC 2426 payload', () => {
      const vcard = generateVCardPayload({
        version: '3.0',
        prefix: 'Dr.',
        firstName: 'Elena',
        lastName: 'Rostova',
        middleName: 'M.',
        suffix: 'PhD',
        organization: 'BioPharma Global',
        department: 'Cold Chain Logistics',
        title: 'Lead Scientist',
        workPhone: '+1-555-0199',
        cellPhone: '+1-555-0188',
        workEmail: 'elena@biopharma.org',
        homeEmail: '',
        url: 'https://biopharma.org/lab',
        street: '100 Science Park',
        city: 'Boston',
        state: 'MA',
        postalCode: '02115',
        country: 'USA',
        note: 'Hazmat Certified Supervisor',
      });

      expect(vcard).toContain('BEGIN:VCARD');
      expect(vcard).toContain('VERSION:3.0');
      expect(vcard).toContain('FN:Dr. Elena M. Rostova PhD');
      expect(vcard).toContain('N:Rostova;Elena;M.;Dr.;PhD');
      expect(vcard).toContain('ORG:BioPharma Global;Cold Chain Logistics');
      expect(vcard).toContain('TITLE:Lead Scientist');
      expect(vcard).toContain('TEL;TYPE=WORK,VOICE:+1-555-0199');
      expect(vcard).toContain('TEL;TYPE=CELL,VOICE:+1-555-0188');
      expect(vcard).toContain('EMAIL;TYPE=WORK:elena@biopharma.org');
      expect(vcard).toContain('ADR;TYPE=WORK:;;100 Science Park;Boston;MA;02115;USA');
      expect(vcard).toContain('END:VCARD');
    });

    it('generates compliant vCard 4.0 RFC 6350 payload', () => {
      const vcard = generateVCardPayload({
        version: '4.0',
        prefix: '',
        firstName: 'John',
        lastName: 'Doe',
        middleName: '',
        suffix: '',
        organization: 'Acme Corp',
        department: '',
        title: 'Manager',
        workPhone: '+1-555-1234',
        cellPhone: '',
        workEmail: 'jdoe@acme.com',
        homeEmail: '',
        url: 'https://acme.com',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        note: '',
      });

      expect(vcard).toContain('VERSION:4.0');
      expect(vcard).toContain('TEL;TYPE="work,voice";VALUE=uri:tel:+1-555-1234');
      expect(vcard).toContain('EMAIL;TYPE=work:jdoe@acme.com');
    });

    it('generates compact MECARD contact string', () => {
      const mecard = generateVCardPayload({
        version: 'mecard',
        prefix: '',
        firstName: 'Kenji',
        lastName: 'Sato',
        middleName: '',
        suffix: '',
        organization: 'Tokyo Electronics',
        department: '',
        title: '',
        workPhone: '+81-3-1234-5678',
        cellPhone: '',
        workEmail: 'sato@tokyo-elec.jp',
        homeEmail: '',
        url: 'https://tokyo-elec.jp',
        street: 'Chiyoda-ku',
        city: 'Tokyo',
        state: '',
        postalCode: '100-0001',
        country: 'Japan',
        note: 'Warehouse Gate B',
      });

      expect(mecard.startsWith('MECARD:')).toBe(true);
      expect(mecard).toContain('N:Sato,Kenji;');
      expect(mecard).toContain('ORG:Tokyo Electronics;');
      expect(mecard).toContain('TEL:+81-3-1234-5678;');
      expect(mecard).toContain('EMAIL:sato@tokyo-elec.jp;');
    });

    it('parses existing vCard 3.0 back into form fields accurately', () => {
      const sample = `BEGIN:VCARD\nVERSION:3.0\nN:Smith;Jane;;;\nFN:Jane Smith\nORG:Industrial Supplies Inc\nTITLE:Warehouse Lead\nTEL;TYPE=WORK,VOICE:+1-800-555-0100\nEMAIL;TYPE=WORK:jane@indsupplies.com\nADR;TYPE=WORK:;;22 Industrial Rd;Detroit;MI;48201;USA\nEND:VCARD`;
      const parsed = parseVCardPayload(sample);

      expect(parsed).not.toBeNull();
      expect(parsed?.firstName).toBe('Jane');
      expect(parsed?.lastName).toBe('Smith');
      expect(parsed?.organization).toBe('Industrial Supplies Inc');
      expect(parsed?.title).toBe('Warehouse Lead');
      expect(parsed?.workPhone).toBe('+1-800-555-0100');
      expect(parsed?.workEmail).toBe('jane@indsupplies.com');
      expect(parsed?.street).toBe('22 Industrial Rd');
      expect(parsed?.city).toBe('Detroit');
      expect(parsed?.state).toBe('MI');
      expect(parsed?.postalCode).toBe('48201');
    });
  });

  describe('3. Error Correction Levels (L, M, Q, H) Specifications', () => {
    it('provides all 4 ISO 18004 Error Correction levels with correct recovery percentages', () => {
      const levels: QRErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H'];
      
      expect(QR_ECC_LEVELS.L.recoveryPercentage).toBe('~7%');
      expect(QR_ECC_LEVELS.M.recoveryPercentage).toBe('~15%');
      expect(QR_ECC_LEVELS.Q.recoveryPercentage).toBe('~25%');
      expect(QR_ECC_LEVELS.H.recoveryPercentage).toBe('~30%');

      levels.forEach(lvl => {
        expect(QR_ECC_LEVELS[lvl].level).toBe(lvl);
        expect(QR_ECC_LEVELS[lvl].description).toBeDefined();
        expect(QR_ECC_LEVELS[lvl].bestFor).toBeDefined();
      });
    });

    it('successfully renders QR codes with each Error Correction Level via QRCode engine', async () => {
      const testData = 'https://example.com/asset-inspection/2026';
      
      for (const lvl of ['L', 'M', 'Q', 'H'] as QRErrorCorrectionLevel[]) {
        const dataUrl = await QRCode.toDataURL(testData, {
          errorCorrectionLevel: lvl,
        });
        expect(dataUrl).toMatch(/^data:image\/png;base64,/);
      }
    });
  });

  describe('4. Additional Payload Types (Wi-Fi, Email, SMS) & Payload Detector', () => {
    it('generates standard Wi-Fi configuration string', () => {
      const wifi = generateWifiPayload({
        ssid: 'WAREHOUSE_WIFI',
        password: 'PassWord123',
        encryption: 'WPA',
        hidden: false,
      });
      expect(wifi).toBe('WIFI:T:WPA;S:WAREHOUSE_WIFI;P:PassWord123;;');
    });

    it('generates standard Email mailto payload', () => {
      const email = generateEmailPayload({
        to: 'returns@acme.com',
        subject: 'Return Authorization',
        body: 'Please process return for SKU 1004.',
      });
      expect(email).toBe('mailto:returns@acme.com?subject=Return%20Authorization&body=Please%20process%20return%20for%20SKU%201004.');
    });

    it('generates standard SMS SMSTO payload', () => {
      const sms = generateSmsPayload({
        phone: '+15551234567',
        message: 'PICKUP CONFIRMED',
      });
      expect(sms).toBe('SMSTO:+15551234567:PICKUP CONFIRMED');
    });

    it('detects payload types correctly', () => {
      expect(detectQRPayloadType('https://google.com')).toBe('url');
      expect(detectQRPayloadType('BEGIN:VCARD\nVERSION:3.0\nEND:VCARD')).toBe('vcard');
      expect(detectQRPayloadType('MECARD:N:Doe,John;;')).toBe('vcard');
      expect(detectQRPayloadType('WIFI:S:MyNet;T:WPA;P:secret;;')).toBe('wifi');
      expect(detectQRPayloadType('mailto:test@example.com')).toBe('email');
      expect(detectQRPayloadType('SMSTO:+1555:Hi')).toBe('sms');
      expect(detectQRPayloadType('tel:+15551234567')).toBe('tel');
      expect(detectQRPayloadType('JUST SOME PLAIN TEXT')).toBe('raw');
    });
  });
});
