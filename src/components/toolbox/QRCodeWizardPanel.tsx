import React, { useState, useEffect, useId } from 'react';
import {
  QrCode,
  Globe,
  User,
  Mail,
  Wifi,
  MessageSquare,
  Phone,
  Code,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Sliders,
  Palette,
  Eye,
  Check,
  Layers,
  ArrowRight
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  QRErrorCorrectionLevel,
  QR_ECC_LEVELS,
  QRPayloadType,
  UrlPayloadConfig,
  VCardPayloadConfig,
  EmailPayloadConfig,
  WifiPayloadConfig,
  SmsPayloadConfig,
  generateUrlPayload,
  parseUrlPayload,
  generateVCardPayload,
  parseVCardPayload,
  generateEmailPayload,
  generateWifiPayload,
  generateSmsPayload,
  detectQRPayloadType,
} from '../../services/qrCodeGenerator';
import { LabelObject, BarcodeLabelObject, BarcodeStyle } from '../../types/label';
import { DataSourceDefinition, SerializationCounter } from '../../types/database';

interface QRCodeWizardPanelProps {
  selectedObject: LabelObject | null;
  onUpdateObject: (updated: Partial<LabelObject>) => void;
  onAddQRCodeWithOptions?: (options: {
    value: string;
    errorCorrectionLevel: QRErrorCorrectionLevel;
    size?: number;
    color?: string;
    backgroundColor?: string;
    name?: string;
  }) => void;
  activeDataSource?: DataSourceDefinition;
  counter?: SerializationCounter;
  onSwitchToProperties?: () => void;
}

export const QRCodeWizardPanel: React.FC<QRCodeWizardPanelProps> = ({
  selectedObject,
  onUpdateObject,
  onAddQRCodeWithOptions,
  activeDataSource,
  counter,
  onSwitchToProperties,
}) => {
  const isSelectedObjQR =
    selectedObject?.type === 'qrcode' ||
    (selectedObject?.type === 'barcode' &&
      ((selectedObject as BarcodeLabelObject).barcodeStyle?.symbology === 'qr' ||
        (selectedObject as BarcodeLabelObject).barcodeStyle?.symbology === 'gs1-qr'));

  const selectedBarcodeObj = isSelectedObjQR ? (selectedObject as BarcodeLabelObject) : null;

  // Active Payload Category
  const [payloadType, setPayloadType] = useState<QRPayloadType>('url');

  // Error Correction Level (L, M, Q, H)
  const [eccLevel, setEccLevel] = useState<QRErrorCorrectionLevel>('M');

  // URL Config State
  const [urlConfig, setUrlConfig] = useState<UrlPayloadConfig>({
    protocol: 'https://',
    customProtocol: '',
    hostPath: 'label.acme-logistics.com/item/00614141',
    params: [
      { id: 'p1', key: 'lot', value: 'LOT-9921', enabled: true },
      { id: 'p2', key: 'sn', value: '{{SERIAL}}', enabled: true },
    ],
    encodeParams: true,
  });

  // vCard Config State
  const [vcardConfig, setVcardConfig] = useState<VCardPayloadConfig>({
    version: '3.0',
    prefix: '',
    firstName: 'Marcus',
    lastName: 'Vance',
    middleName: 'E.',
    suffix: '',
    organization: 'Acme Global Supply Corp',
    department: 'Warehouse & Logistics',
    title: 'Operations Director',
    workPhone: '+1 (555) 234-8890',
    cellPhone: '+1 (555) 902-1144',
    workEmail: 'm.vance@acmesupply.com',
    homeEmail: '',
    url: 'https://acmesupply.com',
    street: '450 Industrial Parkway',
    city: 'Chicago',
    state: 'IL',
    postalCode: '60607',
    country: 'USA',
    note: 'Authorized Warehouse Supervisor — Keycard #A-994',
  });

  // Email Config State
  const [emailConfig, setEmailConfig] = useState<EmailPayloadConfig>({
    to: 'support@acmesupply.com',
    subject: 'RMA Return Inquiry [{{SERIAL}}]',
    body: 'Hello Support,\n\nPlease process this label batch return for Lot LOT-9921.',
  });

  // Wi-Fi Config State
  const [wifiConfig, setWifiConfig] = useState<WifiPayloadConfig>({
    ssid: 'ACME_WAREHOUSE_GUEST',
    password: 'SecureFreight2026!',
    encryption: 'WPA',
    hidden: false,
  });

  // SMS Config State
  const [smsConfig, setSmsConfig] = useState<SmsPayloadConfig>({
    phone: '+15552348890',
    message: 'STATUS {{SERIAL}} READY FOR DISPATCH',
  });

  // Raw text state
  const [rawText, setRawText] = useState<string>('https://gs1.org/gtin/00614141999996');

  // Appearance Settings
  const [qrSizeMm, setQrSizeMm] = useState<number>(25);
  const [fgColor, setFgColor] = useState<string>('#000000');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [isTransparentBg, setIsTransparentBg] = useState<boolean>(true);

  // Live preview data URL
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  // Generate the active raw payload string based on the chosen mode
  const currentPayloadString = React.useMemo(() => {
    switch (payloadType) {
      case 'url':
        return generateUrlPayload(urlConfig);
      case 'vcard':
        return generateVCardPayload(vcardConfig);
      case 'email':
        return generateEmailPayload(emailConfig);
      case 'wifi':
        return generateWifiPayload(wifiConfig);
      case 'sms':
        return generateSmsPayload(smsConfig);
      case 'tel':
        return `tel:${smsConfig.phone.trim()}`;
      case 'raw':
      default:
        return rawText;
    }
  }, [payloadType, urlConfig, vcardConfig, emailConfig, wifiConfig, smsConfig, rawText]);

  // Synchronize state when selectedObject changes (if user clicked a QR code on canvas)
  useEffect(() => {
    if (selectedBarcodeObj) {
      const val = selectedBarcodeObj.value || '';
      const ecc = selectedBarcodeObj.barcodeStyle?.errorCorrectionLevel || 'M';
      setEccLevel(ecc);
      if (selectedBarcodeObj.width) setQrSizeMm(Math.round(selectedBarcodeObj.width));
      if (selectedBarcodeObj.barcodeStyle?.color) setFgColor(selectedBarcodeObj.barcodeStyle.color);
      if (selectedBarcodeObj.barcodeStyle?.backgroundColor) {
        const bg = selectedBarcodeObj.barcodeStyle.backgroundColor;
        if (bg === 'transparent' || bg === 'rgba(0,0,0,0)') {
          setIsTransparentBg(true);
          setBgColor('#ffffff');
        } else {
          setIsTransparentBg(false);
          setBgColor(bg);
        }
      }

      // Detect payload type and pre-fill form
      const detected = detectQRPayloadType(val);
      setPayloadType(detected);

      if (detected === 'url') {
        const parsed = parseUrlPayload(val);
        if (parsed) setUrlConfig(parsed);
      } else if (detected === 'vcard') {
        const parsed = parseVCardPayload(val);
        if (parsed) {
          setVcardConfig((prev) => ({
            ...prev,
            ...parsed,
          }));
        }
      } else {
        setRawText(val);
      }
    }
  }, [selectedBarcodeObj?.id]);

  // Generate live QR code preview
  useEffect(() => {
    let active = true;
    const generatePreview = async () => {
      try {
        const data = currentPayloadString || 'EMPTY_QR_CODE';
        const url = await QRCode.toDataURL(data, {
          errorCorrectionLevel: eccLevel,
          margin: 1,
          color: {
            dark: fgColor.startsWith('#') ? fgColor : '#000000',
            light: isTransparentBg ? '#00000000' : bgColor.startsWith('#') ? bgColor : '#ffffff',
          },
          width: 320,
        });
        if (active) {
          setPreviewDataUrl(url);
          setPreviewError(null);
        }
      } catch (err: any) {
        if (active) {
          setPreviewError(err?.message || 'Payload exceeds QR capacity for selected ECC level.');
          setPreviewDataUrl('');
        }
      }
    };

    generatePreview();
    return () => {
      active = false;
    };
  }, [currentPayloadString, eccLevel, fgColor, bgColor, isTransparentBg]);

  // Copy payload to clipboard
  const handleCopyPayload = () => {
    if (navigator.clipboard && currentPayloadString) {
      navigator.clipboard.writeText(currentPayloadString);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    }
  };

  // Apply to currently selected QR object
  const handleApplyToSelected = () => {
    if (!selectedBarcodeObj) return;
    const currentStyle = selectedBarcodeObj.barcodeStyle || ({} as BarcodeStyle);
    onUpdateObject({
      value: currentPayloadString,
      width: qrSizeMm,
      height: qrSizeMm,
      barcodeStyle: {
        ...currentStyle,
        symbology: 'qr',
        errorCorrectionLevel: eccLevel,
        color: fgColor,
        backgroundColor: isTransparentBg ? 'transparent' : bgColor,
      },
    });
    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 2000);
  };

  // Insert as new QR code object onto canvas
  const handleInsertAsNew = () => {
    if (onAddQRCodeWithOptions) {
      onAddQRCodeWithOptions({
        value: currentPayloadString,
        errorCorrectionLevel: eccLevel,
        size: qrSizeMm,
        color: fgColor,
        backgroundColor: isTransparentBg ? 'transparent' : bgColor,
        name: `QR ${payloadType.toUpperCase()}`,
      });
      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 2000);
    }
  };

  // Insert variable into URL Host/Path
  const insertUrlVariable = (varName: string) => {
    setUrlConfig((prev) => ({
      ...prev,
      hostPath: `${prev.hostPath}{{${varName}}}`,
    }));
  };

  // Add query parameter row
  const handleAddParam = () => {
    setUrlConfig((prev) => ({
      ...prev,
      params: [
        ...prev.params,
        { id: `param-${Date.now()}`, key: '', value: '', enabled: true },
      ],
    }));
  };

  const handleUpdateParam = (id: string, field: 'key' | 'value' | 'enabled', val: any) => {
    setUrlConfig((prev) => ({
      ...prev,
      params: prev.params.map((p) => (p.id === id ? { ...p, [field]: val } : p)),
    }));
  };

  const handleDeleteParam = (id: string) => {
    setUrlConfig((prev) => ({
      ...prev,
      params: prev.params.filter((p) => p.id !== id),
    }));
  };

  return (
    <aside className="w-80 bg-[#1e2129] border-l border-[#2f333f] text-[#c8cbd2] select-none flex flex-col h-full text-xs overflow-y-auto">
      {/* 1. HEADER & STATUS */}
      <div className="p-2.5 font-semibold text-[11px] uppercase tracking-wider text-gray-300 border-b border-[#2d313d] flex items-center justify-between bg-[#242832]">
        <div className="flex items-center space-x-1.5">
          <QrCode className="w-3.5 h-3.5 text-emerald-400" />
          <span>QR Code Wizard</span>
        </div>
        {onSwitchToProperties && (
          <button
            onClick={onSwitchToProperties}
            className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center space-x-0.5 normal-case font-normal"
          >
            <Sliders className="w-3 h-3" />
            <span>Properties</span>
          </button>
        )}
      </div>

      {/* Mode Indicator Banner */}
      <div className="px-3 py-2 bg-[#161820] border-b border-[#2a2e3a] flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              isSelectedObjQR ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'
            }`}
          />
          <span className="text-[10px] text-gray-300 font-medium">
            {isSelectedObjQR
              ? `Target: "${selectedBarcodeObj?.name || 'Selected QR'}"`
              : 'Target: New QR Code on Canvas'}
          </span>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#252936] text-gray-400 font-mono">
          ISO 18004
        </span>
      </div>

      <div className="p-3 space-y-4">
        {/* 2. PAYLOAD TYPE SELECTOR */}
        <section className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center justify-between">
            <span>Payload Type</span>
            <span className="text-[9px] text-gray-500 lowercase font-normal">
              {payloadType}
            </span>
          </label>
          <div className="grid grid-cols-4 gap-1 bg-[#14161d] p-1 rounded border border-[#2b2f3d]">
            {[
              { id: 'url', label: 'URL / Link', icon: Globe },
              { id: 'vcard', label: 'vCard', icon: User },
              { id: 'email', label: 'Email', icon: Mail },
              { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
              { id: 'sms', label: 'SMS', icon: MessageSquare },
              { id: 'tel', label: 'Phone', icon: Phone },
              { id: 'raw', label: 'Raw / DB', icon: Code },
            ].map((t) => {
              const Icon = t.icon;
              const isActive =
                payloadType === t.id ||
                (payloadType === 'vCard' && t.id === 'vcard');
              return (
                <button
                  key={t.id}
                  onClick={() => setPayloadType(t.id as QRPayloadType)}
                  className={`py-1.5 px-1 rounded flex flex-col items-center justify-center space-y-0.5 text-[9px] font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#20242f]'
                  }`}
                  title={t.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="truncate w-full text-center">{t.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. ERROR CORRECTION LEVEL (L, M, Q, H) */}
        <section className="space-y-2 border-t border-[#2d313d] pt-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Error Correction (ECC)</span>
            </label>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${QR_ECC_LEVELS[eccLevel].badgeColor}`}
            >
              {QR_ECC_LEVELS[eccLevel].recoveryPercentage} Recovery
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {(['L', 'M', 'Q', 'H'] as QRErrorCorrectionLevel[]).map((lvl) => {
              const info = QR_ECC_LEVELS[lvl];
              const isSelected = eccLevel === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setEccLevel(lvl)}
                  className={`p-1.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50'
                      : 'bg-[#151720] border-[#2d313d] text-gray-400 hover:border-gray-500 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{lvl}</span>
                    <span className="text-[8px] font-mono text-gray-400">
                      {info.recoveryPercentage}
                    </span>
                  </div>
                  <div className="text-[8px] text-gray-400 mt-0.5 truncate">
                    {info.shortName}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-2 rounded bg-[#14161d] border border-[#2a2d37] space-y-1">
            <div className="text-[10px] text-gray-300 font-medium">
              {QR_ECC_LEVELS[eccLevel].label}
            </div>
            <p className="text-[9px] text-gray-400 leading-normal">
              {QR_ECC_LEVELS[eccLevel].description}
            </p>
            <div className="text-[8px] text-blue-400/90 pt-0.5">
              <strong>Best for:</strong> {QR_ECC_LEVELS[eccLevel].bestFor}
            </div>
          </div>
        </section>

        {/* 4. DYNAMIC SUB-FORMS */}

        {/* --- 4A. URL PAYLOAD FORM --- */}
        {payloadType === 'url' && (
          <section className="space-y-2 border-t border-[#2d313d] pt-3">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center justify-between">
              <span>URL Configuration & Encoding</span>
              <span className="text-[9px] text-emerald-400 font-mono">RFC 3986</span>
            </div>

            {/* Protocol & Host */}
            <div>
              <label className="text-[9px] text-gray-400 block mb-0.5">Protocol</label>
              <div className="grid grid-cols-4 gap-1 mb-1.5">
                {(['https://', 'http://', 'custom', 'none'] as const).map((proto) => (
                  <button
                    key={proto}
                    onClick={() => setUrlConfig((prev) => ({ ...prev, protocol: proto }))}
                    className={`py-1 text-[9px] rounded font-mono transition-colors ${
                      urlConfig.protocol === proto
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-[#16181f] text-gray-400 border border-[#2d313d] hover:text-white'
                    }`}
                  >
                    {proto === 'none' ? 'None' : proto}
                  </button>
                ))}
              </div>

              {urlConfig.protocol === 'custom' && (
                <div className="mb-1.5">
                  <label className="text-[9px] text-gray-400 block mb-0.5">Custom Scheme</label>
                  <input
                    type="text"
                    placeholder="e.g. myapp"
                    value={urlConfig.customProtocol}
                    onChange={(e) =>
                      setUrlConfig((prev) => ({ ...prev, customProtocol: e.target.value }))
                    }
                    className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <label className="text-[9px] text-gray-400 block mb-0.5">Domain / Host & Path</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="portal.acme.com/asset"
                  value={urlConfig.hostPath}
                  onChange={(e) =>
                    setUrlConfig((prev) => ({ ...prev, hostPath: e.target.value }))
                  }
                  className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Quick URL Presets */}
            <div>
              <span className="text-[9px] text-gray-500 block mb-1">Preset Schemas:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  {
                    name: '📦 Asset Tag',
                    url: 'trace.acme.com/asset',
                    params: [{ id: '1', key: 'sn', value: '{{SERIAL}}', enabled: true }],
                  },
                  {
                    name: '🚀 Product',
                    url: 'products.acme.com/item/00614141',
                    params: [{ id: '1', key: 'batch', value: 'LOT-9921', enabled: true }],
                  },
                  {
                    name: '🛡️ Support RMA',
                    url: 'support.acme.com/rma',
                    params: [
                      { id: '1', key: 'id', value: '{{SERIAL}}', enabled: true },
                      { id: '2', key: 'utm_source', value: 'box_qr', enabled: true },
                    ],
                  },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() =>
                      setUrlConfig((prev) => ({
                        ...prev,
                        protocol: 'https://',
                        hostPath: preset.url,
                        params: preset.params,
                      }))
                    }
                    className="px-1.5 py-0.5 rounded bg-[#222632] hover:bg-[#2f3545] text-[9px] text-gray-300 hover:text-white border border-[#313747]"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Query Parameters Section */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-gray-400 font-semibold">
                  Query Parameters ({urlConfig.params.length})
                </label>
                <button
                  onClick={handleAddParam}
                  className="text-[9px] text-blue-400 hover:text-blue-300 flex items-center space-x-0.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Param</span>
                </button>
              </div>

              {urlConfig.params.map((p) => (
                <div key={p.id} className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    onChange={(e) => handleUpdateParam(p.id, 'enabled', e.target.checked)}
                    className="rounded bg-[#16181f] border-gray-600 text-blue-600 w-3.5 h-3.5"
                    title="Enable/Disable parameter"
                  />
                  <input
                    type="text"
                    placeholder="key (e.g. sn)"
                    value={p.key}
                    onChange={(e) => handleUpdateParam(p.id, 'key', e.target.value)}
                    className="w-1/3 bg-[#16181f] border border-[#373c49] rounded px-1.5 py-0.5 text-[11px] text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-gray-500 font-mono">=</span>
                  <input
                    type="text"
                    placeholder="value"
                    value={p.value}
                    onChange={(e) => handleUpdateParam(p.id, 'value', e.target.value)}
                    className="flex-1 bg-[#16181f] border border-[#373c49] rounded px-1.5 py-0.5 text-[11px] text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleDeleteParam(p.id)}
                    className="text-gray-500 hover:text-red-400 p-0.5"
                    title="Remove parameter"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Encoding Option */}
              <label className="flex items-center space-x-1.5 cursor-pointer text-[10px] text-gray-300 pt-1">
                <input
                  type="checkbox"
                  checked={urlConfig.encodeParams}
                  onChange={(e) =>
                    setUrlConfig((prev) => ({ ...prev, encodeParams: e.target.checked }))
                  }
                  className="rounded bg-[#16181f] border-gray-600 text-blue-600 w-3.5 h-3.5"
                />
                <span>Auto URL-encode parameters (`encodeURIComponent`)</span>
              </label>
            </div>
          </section>
        )}

        {/* --- 4B. VCARD PAYLOAD FORM --- */}
        {(payloadType === 'vcard' || payloadType === 'vCard') && (
          <section className="space-y-2.5 border-t border-[#2d313d] pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                vCard Contact Profile
              </span>
              <div className="flex space-x-1">
                {(['3.0', '4.0', 'mecard'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVcardConfig((prev) => ({ ...prev, version: v }))}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono ${
                      vcardConfig.version === v
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-[#171922] text-gray-400 border border-[#2d313d]'
                    }`}
                  >
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Variable Chips */}
            <div>
              <span className="text-[9px] text-gray-500 block mb-0.5">
                Insert Database Variable into Name/Email:
              </span>
              <div className="flex flex-wrap gap-1">
                {activeDataSource?.fields.slice(0, 4).map((f) => (
                  <button
                    key={f.name}
                    onClick={() =>
                      setVcardConfig((prev) => ({
                        ...prev,
                        firstName: `{{${f.name}}}`,
                      }))
                    }
                    className="px-1.5 py-0.5 rounded bg-[#242936] text-[9px] text-cyan-300 font-mono hover:bg-[#303749]"
                  >
                    {`{{${f.name}}}`}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setVcardConfig((prev) => ({
                      ...prev,
                      workEmail: '{{CONTACT_EMAIL}}',
                    }))
                  }
                  className="px-1.5 py-0.5 rounded bg-[#242936] text-[9px] text-amber-300 font-mono hover:bg-[#303749]"
                >
                  {'{{CONTACT_EMAIL}}'}
                </button>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[9px] text-gray-400 block mb-0.5">First Name</label>
                <input
                  type="text"
                  value={vcardConfig.firstName}
                  onChange={(e) =>
                    setVcardConfig((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                  className="w-full bg-[#16181f] border border-[#373c49] rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-400 block mb-0.5">Last Name</label>
                <input
                  type="text"
                  value={vcardConfig.lastName}
                  onChange={(e) =>
                    setVcardConfig((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                  className="w-full bg-[#16181f] border border-[#373c49] rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Company & Role */}
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[9px] text-gray-400 block mb-0.5">Company / Org</label>
                <input
                  type="text"
                  value={vcardConfig.organization}
                  onChange={(e) =>
                    setVcardConfig((prev) => ({ ...prev, organization: e.target.value }))
                  }
                  className="w-full bg-[#16181f] border border-[#373c49] rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-400 block mb-0.5">Job Title</label>
                <input
                  type="text"
                  value={vcardConfig.title}
                  onChange={(e) =>
                    setVcardConfig((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full bg-[#16181f] border border-[#373c49] rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[9px] text-gray-400 block mb-0.5">Work Phone</label>
                <input
                  type="text"
                  value={vcardConfig.workPhone}
                  onChange={(e) =>
                    setVcardConfig((prev) => ({ ...prev, workPhone: e.target.value }))
                  }
                  className="w-full bg-[#16181f] border border-[#373c49] rounded px-1.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-400 block mb-0.5">Mobile Phone</label>
                <input
                  type="text"
                  value={vcardConfig.cellPhone}
                  onChange={(e) =>
                    setVcardConfig((prev) => ({ ...prev, cellPhone: e.target.value }))
                  }
                  className="w-full bg-[#16181f] border border-[#373c49] rounded px-1.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] text-gray-400 block mb-0.5">Email Address</label>
              <input
                type="email"
                value={vcardConfig.workEmail}
                onChange={(e) =>
                  setVcardConfig((prev) => ({ ...prev, workEmail: e.target.value }))
                }
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-1.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[9px] text-gray-400 block mb-0.5">Website / URL</label>
              <input
                type="text"
                value={vcardConfig.url}
                onChange={(e) =>
                  setVcardConfig((prev) => ({ ...prev, url: e.target.value }))
                }
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-1.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Postal Address */}
            <div className="space-y-1 bg-[#14161d] p-2 rounded border border-[#2a2d37]">
              <span className="text-[9px] text-gray-400 font-semibold block">
                Physical / Postal Address:
              </span>
              <input
                type="text"
                placeholder="Street Address (e.g. 450 Industrial Pkwy)"
                value={vcardConfig.street}
                onChange={(e) =>
                  setVcardConfig((prev) => ({ ...prev, street: e.target.value }))
                }
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none"
              />
              <div className="grid grid-cols-3 gap-1">
                <input
                  type="text"
                  placeholder="City"
                  value={vcardConfig.city}
                  onChange={(e) =>
                    setVcardConfig((prev) => ({ ...prev, city: e.target.value }))
                  }
                  className="bg-[#16181f] border border-[#373c49] rounded px-1.5 py-0.5 text-[11px] text-white"
                />
                <input
                  type="text"
                  placeholder="State/Prov"
                  value={vcardConfig.state}
                  onChange={(e) =>
                    setVcardConfig((prev) => ({ ...prev, state: e.target.value }))
                  }
                  className="bg-[#16181f] border border-[#373c49] rounded px-1.5 py-0.5 text-[11px] text-white"
                />
                <input
                  type="text"
                  placeholder="Zip/Postal"
                  value={vcardConfig.postalCode}
                  onChange={(e) =>
                    setVcardConfig((prev) => ({ ...prev, postalCode: e.target.value }))
                  }
                  className="bg-[#16181f] border border-[#373c49] rounded px-1.5 py-0.5 text-[11px] text-white"
                />
              </div>
            </div>
          </section>
        )}

        {/* --- 4C. EMAIL FORM --- */}
        {payloadType === 'email' && (
          <section className="space-y-2 border-t border-[#2d313d] pt-3">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Email (mailto:)
            </div>
            <div>
              <label className="text-[9px] text-gray-400 block mb-0.5">Recipient (To)</label>
              <input
                type="email"
                value={emailConfig.to}
                onChange={(e) => setEmailConfig((prev) => ({ ...prev, to: e.target.value }))}
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[9px] text-gray-400 block mb-0.5">Subject Line</label>
              <input
                type="text"
                value={emailConfig.subject}
                onChange={(e) => setEmailConfig((prev) => ({ ...prev, subject: e.target.value }))}
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[9px] text-gray-400 block mb-0.5">Email Body</label>
              <textarea
                rows={2}
                value={emailConfig.body}
                onChange={(e) => setEmailConfig((prev) => ({ ...prev, body: e.target.value }))}
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </section>
        )}

        {/* --- 4D. WI-FI FORM --- */}
        {payloadType === 'wifi' && (
          <section className="space-y-2 border-t border-[#2d313d] pt-3">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Wi-Fi Network Access
            </div>
            <div>
              <label className="text-[9px] text-gray-400 block mb-0.5">Network Name (SSID)</label>
              <input
                type="text"
                value={wifiConfig.ssid}
                onChange={(e) => setWifiConfig((prev) => ({ ...prev, ssid: e.target.value }))}
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[9px] text-gray-400 block mb-0.5">Security / Encryption</label>
              <div className="grid grid-cols-3 gap-1">
                {(['WPA', 'WEP', 'nopass'] as const).map((enc) => (
                  <button
                    key={enc}
                    onClick={() => setWifiConfig((prev) => ({ ...prev, encryption: enc }))}
                    className={`py-1 rounded text-[9px] font-mono ${
                      wifiConfig.encryption === enc
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-[#16181f] text-gray-400 border border-[#2d313d]'
                    }`}
                  >
                    {enc === 'nopass' ? 'Open (None)' : enc}
                  </button>
                ))}
              </div>
            </div>
            {wifiConfig.encryption !== 'nopass' && (
              <div>
                <label className="text-[9px] text-gray-400 block mb-0.5">Password</label>
                <input
                  type="text"
                  value={wifiConfig.password}
                  onChange={(e) =>
                    setWifiConfig((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </section>
        )}

        {/* --- 4E. RAW TEXT / EXPRESSION --- */}
        {payloadType === 'raw' && (
          <section className="space-y-2 border-t border-[#2d313d] pt-3">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Raw Payload & Dynamic Bindings
            </div>
            <textarea
              rows={3}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g. https://domain.com/item/{{SERIAL}}"
              className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </section>
        )}

        {/* 5. VISUAL CUSTOMIZATION (DIMENSIONS & COLORS) */}
        <section className="space-y-2 border-t border-[#2d313d] pt-3">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center justify-between">
            <span>Dimensions & Colors</span>
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
          </div>

          {/* Size in mm */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-gray-400 block mb-0.5">QR Size (mm)</label>
              <input
                type="number"
                min="10"
                max="150"
                step="1"
                value={qrSizeMm}
                onChange={(e) => setQrSizeMm(Math.max(8, parseInt(e.target.value) || 25))}
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[9px] text-gray-400 block mb-0.5">Quick Presets</label>
              <div className="grid grid-cols-3 gap-1">
                {[20, 25, 35].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQrSizeMm(s)}
                    className={`py-1 text-[9px] rounded font-mono ${
                      qrSizeMm === s
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-[#16181f] text-gray-400 border border-[#2d313d]'
                    }`}
                  >
                    {s}mm
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Foreground & Background Colors */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[9px] text-gray-400 block mb-0.5">Module (Dark)</label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="color"
                  value={fgColor.startsWith('#') ? fgColor : '#000000'}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-6 h-6 bg-transparent border-0 cursor-pointer p-0 shrink-0"
                />
                <input
                  type="text"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-full bg-[#16181f] border border-[#373c49] rounded px-1.5 py-0.5 text-[11px] text-white font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-[9px] text-gray-400 block mb-0.5">Background</label>
              <div className="flex items-center space-x-1.5">
                <label className="flex items-center space-x-1 text-[10px] text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTransparentBg}
                    onChange={(e) => setIsTransparentBg(e.target.checked)}
                    className="rounded bg-[#16181f] border-gray-600 text-blue-600 w-3.5 h-3.5"
                  />
                  <span>Transp.</span>
                </label>
                {!isTransparentBg && (
                  <input
                    type="color"
                    value={bgColor.startsWith('#') ? bgColor : '#ffffff'}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-5 h-5 bg-transparent border-0 cursor-pointer p-0"
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 6. REAL-TIME LIVE PREVIEW */}
        <section className="space-y-2 border-t border-[#2d313d] pt-3">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center justify-between">
            <span>Live Generated Preview</span>
            <span className="text-[9px] text-gray-500 font-mono">
              {currentPayloadString.length} chars
            </span>
          </div>

          <div className="bg-[#111319] p-3 rounded-lg border border-[#272b38] flex flex-col items-center justify-center relative group">
            {previewDataUrl ? (
              <div className="p-2 bg-white rounded shadow-md">
                <img
                  src={previewDataUrl}
                  alt="Generated QR Preview"
                  className="w-28 h-28 object-contain"
                />
              </div>
            ) : previewError ? (
              <div className="p-3 text-center text-rose-400 text-[10px] space-y-1">
                <p className="font-semibold">Generation Error:</p>
                <p className="text-[9px] text-gray-400">{previewError}</p>
              </div>
            ) : (
              <div className="py-6 text-gray-500 text-xs">Rendering preview...</div>
            )}

            {/* Quick Copy Payload overlay */}
            <button
              onClick={handleCopyPayload}
              className="mt-2 text-[9px] text-gray-400 hover:text-white flex items-center space-x-1 px-2 py-0.5 rounded bg-[#1f232e] border border-[#323847]"
              title="Copy Raw Payload String"
            >
              {copiedPayload ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-gray-400" />
                  <span>Copy Payload Text</span>
                </>
              )}
            </button>
          </div>

          {/* Compiled Payload Preview Box */}
          <div className="bg-[#14161d] p-2 rounded border border-[#2a2d37] space-y-1">
            <span className="text-[9px] text-gray-500 font-mono block">Compiled Payload:</span>
            <div className="text-[10px] font-mono text-gray-300 break-all max-h-16 overflow-y-auto pr-1 leading-tight select-text">
              {currentPayloadString || <span className="text-gray-600 italic">Empty payload</span>}
            </div>
          </div>
        </section>

        {/* 7. ACTION BUTTONS */}
        <section className="space-y-2 border-t border-[#2d313d] pt-3 pb-2">
          {isSelectedObjQR ? (
            <div className="space-y-1.5">
              <button
                onClick={handleApplyToSelected}
                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-md transition-colors"
              >
                {appliedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Applied to Selected QR!</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Apply to Selected QR</span>
                  </>
                )}
              </button>

              <button
                onClick={handleInsertAsNew}
                className="w-full py-1.5 px-3 rounded-lg bg-[#272b38] hover:bg-[#343a4c] text-gray-300 hover:text-white font-medium text-xs flex items-center justify-center space-x-1.5 border border-[#3a4154] transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                <span>Insert as New QR Code</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleInsertAsNew}
              className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-md transition-colors"
            >
              {appliedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Inserted onto Canvas!</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert QR Code into Canvas</span>
                </>
              )}
            </button>
          )}
        </section>
      </div>
    </aside>
  );
};
