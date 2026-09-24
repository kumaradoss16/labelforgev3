import React from 'react';
// @ts-ignore
import bwipjs from 'bwip-js';
import {
  LabelObject,
  TextLabelObject,
  BarcodeLabelObject,
  ShapeLabelObject,
  ImageLabelObject,
} from '../types/label';
import { DataRecord, SerializationCounter } from '../types/database';
import { evaluateExpression } from './dataBinding';
import { getFontCssStack } from './fontFamilies';
import { render1DBarcodeSvg, generateDataMatrixSvg, generatePostal4StateSvg } from './barcodeEngine';

/**
 * MM to Pixel conversion factor at standard 96 DPI CSS scale
 */
export const MM_TO_PX = 3.7795275591;

/**
 * Universal label object renderer used across Canvas, Print Substrate, Print Preview, and Thumbnails
 */
export function renderLabelObjectContent(
  obj: LabelObject,
  activeRecord?: DataRecord,
  counter?: SerializationCounter,
  qrCache: Record<string, string> = {}
): React.ReactNode {
  // 1. TEXT / RICH-TEXT
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
          textDecoration: textObj.style.underline
            ? 'underline'
            : textObj.style.strikeout
            ? 'line-through'
            : 'none',
          color: textObj.style.color || '#000000',
          backgroundColor: textObj.style.backgroundColor || 'transparent',
          textAlign: textObj.style.alignment || 'left',
          direction: textObj.style.direction || 'ltr',
          lineHeight: textObj.style.lineHeight || 1.2,
          letterSpacing: textObj.style.letterSpacing
            ? `${textObj.style.letterSpacing}mm`
            : 'normal',
          whiteSpace: textObj.style.wrap ? 'pre-wrap' : 'nowrap',
          wordBreak: textObj.style.wrap ? 'break-word' : 'normal',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          userSelect: 'none',
        }}
      >
        {evaluatedText}
      </div>
    );
  }

  // 2. 1D LINEAR / POSTAL BARCODE
  if (obj.type === 'barcode') {
    const bObj = obj as BarcodeLabelObject;
    const evaluatedVal = evaluateExpression(bObj.value, activeRecord, counter);
    const symbology = bObj.barcodeStyle.symbology;

    if (symbology === 'usps-imb' || symbology === 'royalmail-4state') {
      const svg = generatePostal4StateSvg(
        evaluatedVal,
        obj.width,
        obj.height,
        bObj.barcodeStyle.color || '#000000'
      );
      return (
        <div
          className="w-full h-full flex items-center justify-center overflow-hidden pointer-events-none"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      );
    }

    const { svgContent, error } = render1DBarcodeSvg(
      symbology,
      evaluatedVal,
      bObj.barcodeStyle,
      obj.width,
      obj.height
    );

    if (error || !svgContent) {
      return (
        <div className="w-full h-full border border-red-500/80 bg-red-500/10 text-red-400 text-[9px] p-1 flex items-center justify-center text-center font-mono">
          Barcode Error: {error || 'Invalid Data'}
        </div>
      );
    }

    return (
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden pointer-events-none"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  }

  // 3. 2D QR CODE
  if (obj.type === 'qrcode') {
    const bObj = obj as BarcodeLabelObject;
    const evaluatedVal = evaluateExpression(bObj.value, activeRecord, counter) || 'HTTPS://LABELFORGE.IO';
    const cacheKey = `${bObj.id}-${evaluatedVal}-${bObj.barcodeStyle.errorCorrectionLevel || 'M'}-${bObj.barcodeStyle.color || '#000000'}-${bObj.barcodeStyle.backgroundColor || 'transparent'}`;
    const qrDataUrl = qrCache[cacheKey];

    if (qrDataUrl) {
      return (
        <img
          src={qrDataUrl}
          alt="QR Code"
          className="w-full h-full object-contain pointer-events-none"
        />
      );
    }

    // Synchronous High-Precision Vector SVG Generation for QR Code
    try {
      const fg = (bObj.barcodeStyle.color || '#000000').replace('#', '');
      const bg =
        bObj.barcodeStyle.backgroundColor &&
        bObj.barcodeStyle.backgroundColor !== 'transparent'
          ? bObj.barcodeStyle.backgroundColor.replace('#', '')
          : undefined;

      const svg = bwipjs.toSVG({
        bcid: 'qrcode',
        text: evaluatedVal,
        eclevel: (bObj.barcodeStyle.errorCorrectionLevel || 'M').toLowerCase(),
        barcolor: fg,
        backgroundcolor: bg,
        paddingwidth: 1,
        paddingheight: 1,
      });

      return (
        <div
          className="w-full h-full flex items-center justify-center overflow-hidden pointer-events-none"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      );
    } catch {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-[9px] text-gray-700 font-mono p-1 border border-gray-300">
          QR: {evaluatedVal.slice(0, 15)}
        </div>
      );
    }
  }

  // 4. 2D DATA MATRIX (ECC 200)
  if (obj.type === 'datamatrix') {
    const bObj = obj as BarcodeLabelObject;
    const evaluatedVal = evaluateExpression(bObj.value, activeRecord, counter);
    const svg = generateDataMatrixSvg(
      evaluatedVal,
      obj.width,
      obj.height,
      bObj.barcodeStyle.color || '#000000'
    );

    return (
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden pointer-events-none"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  // 5. GRAPHIC / IMAGE ELEMENT
  if (obj.type === 'image') {
    const imgObj = obj as ImageLabelObject;
    return (
      <img
        src={imgObj.src}
        alt={imgObj.name || 'Label Graphic'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: imgObj.aspectRatioLocked ? 'contain' : 'fill',
          pointerEvents: 'none',
          userSelect: 'none',
          display: 'block',
        }}
        crossOrigin="anonymous"
        onError={(e) => {
          // Graceful fallback for broken image links
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
    );
  }

  // 6. SHAPE: RECTANGLE
  if (obj.type === 'rect') {
    const shape = obj as ShapeLabelObject;
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: shape.shapeStyle.fillColor || 'transparent',
          borderColor: shape.shapeStyle.strokeColor || '#000000',
          borderWidth: `${(shape.shapeStyle.strokeWidth || 0.5) * MM_TO_PX}px`,
          borderStyle: shape.shapeStyle.strokeDash || 'solid',
          borderRadius: shape.shapeStyle.borderRadius
            ? `${shape.shapeStyle.borderRadius * MM_TO_PX}px`
            : '0px',
          boxSizing: 'border-box',
          pointerEvents: 'none',
        }}
      />
    );
  }

  // 7. SHAPE: ELLIPSE
  if (obj.type === 'ellipse') {
    const shape = obj as ShapeLabelObject;
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: shape.shapeStyle.fillColor || 'transparent',
          borderColor: shape.shapeStyle.strokeColor || '#000000',
          borderWidth: `${(shape.shapeStyle.strokeWidth || 0.5) * MM_TO_PX}px`,
          borderStyle: shape.shapeStyle.strokeDash || 'solid',
          borderRadius: '9999px',
          boxSizing: 'border-box',
          pointerEvents: 'none',
        }}
      />
    );
  }

  // 8. SHAPE: VECTOR LINE
  if (obj.type === 'line') {
    const shape = obj as ShapeLabelObject;
    const strokeWidthPx = Math.max(1, (shape.shapeStyle.strokeWidth || 0.5) * MM_TO_PX);
    const strokeColor = shape.shapeStyle.strokeColor || '#000000';
    const strokeDash = shape.shapeStyle.strokeDash;

    return (
      <svg
        className="w-full h-full overflow-visible pointer-events-none"
        style={{ display: 'block' }}
      >
        <line
          x1="0"
          y1="50%"
          x2="100%"
          y2="50%"
          stroke={strokeColor}
          strokeWidth={strokeWidthPx}
          strokeDasharray={
            strokeDash === 'dashed'
              ? '6,4'
              : strokeDash === 'dotted'
              ? '2,2'
              : undefined
          }
        />
      </svg>
    );
  }

  return null;
}
