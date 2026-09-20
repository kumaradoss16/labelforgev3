import React from 'react';
import { LabelObject, TextLabelObject, BarcodeLabelObject, ShapeLabelObject } from '../types/label';
import { DataRecord, SerializationCounter } from '../types/database';
import { evaluateExpression } from './dataBinding';
import { getFontCssStack } from './fontFamilies';
import { render1DBarcodeSvg, generateDataMatrixSvg, generatePostal4StateSvg } from './barcodeEngine';

/**
 * Universal label object renderer used across Canvas, Print Substrate, and Print Preview
 */
export function renderLabelObjectContent(
  obj: LabelObject,
  activeRecord?: DataRecord,
  counter?: SerializationCounter,
  qrCache: Record<string, string> = {}
): React.ReactNode {
  if (obj.type === 'text' || obj.type === 'rich-text') {
    const textObj = obj as TextLabelObject;
    const evaluatedText = evaluateExpression(textObj.text, activeRecord, counter);

    return (
      <div
        style={{
          fontFamily: getFontCssStack(textObj.style.fontFamily),
          fontSize: `${textObj.style.fontSize}pt`,
          fontWeight: textObj.style.fontWeight || 'normal',
          fontStyle: textObj.style.fontStyle || 'normal',
          textDecoration: textObj.style.underline ? 'underline' : textObj.style.strikeout ? 'line-through' : 'none',
          color: textObj.style.color || '#000000',
          backgroundColor: textObj.style.backgroundColor || 'transparent',
          textAlign: textObj.style.alignment || 'left',
          direction: textObj.style.direction || 'ltr',
          lineHeight: textObj.style.lineHeight || 1.2,
          letterSpacing: textObj.style.letterSpacing ? `${textObj.style.letterSpacing}mm` : 'normal',
          whiteSpace: textObj.style.wrap ? 'pre-wrap' : 'nowrap',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {evaluatedText}
      </div>
    );
  }

  if (obj.type === 'barcode') {
    const bObj = obj as BarcodeLabelObject;
    const evaluatedVal = evaluateExpression(bObj.value, activeRecord, counter);
    const symbology = bObj.barcodeStyle.symbology;

    if (symbology === 'usps-imb' || symbology === 'royalmail-4state') {
      const svg = generatePostal4StateSvg(evaluatedVal, obj.width, obj.height, bObj.barcodeStyle.color || '#000000');
      return <div className="w-full h-full flex items-center justify-center overflow-hidden" dangerouslySetInnerHTML={{ __html: svg }} />;
    }

    const { svgContent, error } = render1DBarcodeSvg(symbology, evaluatedVal, bObj.barcodeStyle, obj.width, obj.height);
    if (error || !svgContent) {
      return (
        <div className="w-full h-full border border-red-500 bg-red-50 text-red-700 text-[9px] p-1 flex items-center justify-center text-center">
          Barcode Error: {error || 'Invalid Data'}
        </div>
      );
    }
    return (
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  }

  if (obj.type === 'qrcode') {
    const bObj = obj as BarcodeLabelObject;
    const evaluatedVal = evaluateExpression(bObj.value, activeRecord, counter);
    const cacheKey = `${bObj.id}-${evaluatedVal}-${bObj.barcodeStyle.errorCorrectionLevel || 'M'}-${bObj.barcodeStyle.color || '#000000'}-${bObj.barcodeStyle.backgroundColor || 'transparent'}`;
    const qrDataUrl = qrCache[cacheKey];

    if (!qrDataUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-[10px] text-gray-500 font-mono">
          QR: {evaluatedVal}
        </div>
      );
    }

    return (
      <img
        src={qrDataUrl}
        alt="QR Code"
        className="w-full h-full object-contain pointer-events-none"
      />
    );
  }

  if (obj.type === 'datamatrix') {
    const bObj = obj as BarcodeLabelObject;
    const evaluatedVal = evaluateExpression(bObj.value, activeRecord, counter);
    const svg = generateDataMatrixSvg(evaluatedVal, obj.width, obj.height, bObj.barcodeStyle.color || '#000000');

    return (
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  if (obj.type === 'rect') {
    const shape = obj as ShapeLabelObject;
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: shape.shapeStyle.fillColor || 'transparent',
          borderColor: shape.shapeStyle.strokeColor || '#000000',
          borderWidth: `${(shape.shapeStyle.strokeWidth || 0.5) * 3.7795}px`,
          borderStyle: shape.shapeStyle.strokeDash || 'solid',
          borderRadius: shape.shapeStyle.borderRadius ? `${shape.shapeStyle.borderRadius * 3.7795}px` : '0px',
        }}
      />
    );
  }

  if (obj.type === 'ellipse') {
    const shape = obj as ShapeLabelObject;
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: shape.shapeStyle.fillColor || 'transparent',
          borderColor: shape.shapeStyle.strokeColor || '#000000',
          borderWidth: `${(shape.shapeStyle.strokeWidth || 0.5) * 3.7795}px`,
          borderStyle: shape.shapeStyle.strokeDash || 'solid',
          borderRadius: '9999px',
        }}
      />
    );
  }

  if (obj.type === 'line') {
    const shape = obj as ShapeLabelObject;
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderTopColor: shape.shapeStyle.strokeColor || '#000000',
          borderTopWidth: `${(shape.shapeStyle.strokeWidth || 0.5) * 3.7795}px`,
          borderTopStyle: shape.shapeStyle.strokeDash || 'solid',
        }}
      />
    );
  }

  return null;
}
