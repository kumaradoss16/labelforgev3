import React from 'react';
import { LabelDocument, LabelObject, TextLabelObject, BarcodeLabelObject, ShapeLabelObject, ImageLabelObject } from '../../types/label';
import { resolveTemplateVariables } from '../../services/templateStorage';

interface TemplatePreviewCanvasProps {
  document: LabelDocument;
  sampleData?: Record<string, any>;
  className?: string;
  showGrid?: boolean;
}

export const TemplatePreviewCanvas: React.FC<TemplatePreviewCanvasProps> = ({
  document,
  sampleData = {},
  className = '',
  showGrid = false,
}) => {
  const { width, height, unit = 'mm', orientation = 'portrait', cornerRadius = 0 } = document.dimensions;

  // ViewBox bounds (scaled to document dimension in mm)
  const viewBoxWidth = width;
  const viewBoxHeight = height;

  const renderObject = (obj: LabelObject) => {
    if (!obj.visible) return null;

    const key = obj.id;
    const transform = `rotate(${obj.rotation || 0} ${obj.x + obj.width / 2} ${obj.y + obj.height / 2})`;

    switch (obj.type) {
      case 'text': {
        const textObj = obj as TextLabelObject;
        const resolvedText = resolveTemplateVariables(textObj.text || '', sampleData);
        const lines = resolvedText.split('\n');
        const fontSize = (textObj.style.fontSize || 10) * 0.352778; // pt to mm approx
        const lineHeight = fontSize * (textObj.style.lineHeight || 1.2);
        
        let textAnchor = 'start';
        let xPos = textObj.x;
        if (textObj.style.alignment === 'center') {
          textAnchor = 'middle';
          xPos = textObj.x + textObj.width / 2;
        } else if (textObj.style.alignment === 'right') {
          textAnchor = 'end';
          xPos = textObj.x + textObj.width;
        }

        return (
          <g key={key} transform={transform} opacity={textObj.opacity ?? 1}>
            <text
              x={xPos}
              y={textObj.y + fontSize}
              fill={textObj.style.color || '#000000'}
              fontFamily={textObj.style.fontFamily || 'Segoe UI, sans-serif'}
              fontSize={fontSize}
              fontWeight={textObj.style.fontWeight || 'normal'}
              textAnchor={textAnchor}
              style={{ userSelect: 'none' }}
            >
              {lines.map((line, idx) => (
                <tspan key={idx} x={xPos} dy={idx === 0 ? 0 : lineHeight}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      }

      case 'barcode': {
        const bcObj = obj as BarcodeLabelObject;
        const resolvedValue = resolveTemplateVariables(bcObj.value || '', sampleData);
        const style = bcObj.barcodeStyle;
        const strokeColor = style?.color || '#000000';
        const humanReadable = style?.humanReadable ?? true;

        // Generate synthetic barcode bars for high-fidelity vector rendering in preview
        const barCount = Math.max(12, Math.floor(bcObj.width / 1.5));
        const bars = [];
        for (let i = 0; i < barCount; i++) {
          // Semi-random deterministic bar patterns based on char codes
          const isThick = (i % 3 === 0) || ((resolvedValue.charCodeAt(i % resolvedValue.length) || 0) % 2 === 1);
          const barWidth = isThick ? 0.9 : 0.45;
          const xOffset = bcObj.x + (i * (bcObj.width / barCount));
          bars.push(
            <rect
              key={i}
              x={xOffset}
              y={bcObj.y}
              width={barWidth}
              height={humanReadable ? bcObj.height - 3.5 : bcObj.height}
              fill={strokeColor}
            />
          );
        }

        return (
          <g key={key} transform={transform} opacity={bcObj.opacity ?? 1}>
            {/* Barcode background if any */}
            {style?.backgroundColor && style.backgroundColor !== 'transparent' && (
              <rect
                x={bcObj.x}
                y={bcObj.y}
                width={bcObj.width}
                height={bcObj.height}
                fill={style.backgroundColor}
              />
            )}
            {bars}
            {humanReadable && (
              <text
                x={bcObj.x + bcObj.width / 2}
                y={bcObj.y + bcObj.height - 0.5}
                fill={strokeColor}
                fontFamily={style?.humanReadableFont || 'monospace'}
                fontSize={(style?.humanReadableSize || 8) * 0.3}
                fontWeight="bold"
                textAnchor="middle"
                style={{ userSelect: 'none' }}
              >
                {resolvedValue}
              </text>
            )}
          </g>
        );
      }

      case 'qrcode':
      case 'datamatrix': {
        const qrObj = obj as BarcodeLabelObject;
        const isDM = obj.type === 'datamatrix';
        const gridSize = isDM ? 10 : 8;
        const cellSize = Math.min(qrObj.width, qrObj.height) / gridSize;
        const color = qrObj.barcodeStyle?.color || '#000000';

        // Synthetic 2D matrix matrix points
        const cells = [];
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            // Corners always filled for QR finder patterns
            const isCorner =
              !isDM &&
              ((r < 3 && c < 3) ||
                (r < 3 && c >= gridSize - 3) ||
                (r >= gridSize - 3 && c < 3));
            const isFilled = isCorner || (r * c + r + c) % 3 === 0;

            if (isFilled) {
              cells.push(
                <rect
                  key={`${r}-${c}`}
                  x={qrObj.x + c * cellSize}
                  y={qrObj.y + r * cellSize}
                  width={cellSize * 0.95}
                  height={cellSize * 0.95}
                  fill={color}
                  rx={0.1}
                />
              );
            }
          }
        }

        return (
          <g key={key} transform={transform} opacity={qrObj.opacity ?? 1}>
            {cells}
          </g>
        );
      }

      case 'rect': {
        const shapeObj = obj as ShapeLabelObject;
        const fill = shapeObj.shapeStyle?.fillColor || 'transparent';
        const stroke = shapeObj.shapeStyle?.strokeColor || '#000000';
        const strokeWidth = shapeObj.shapeStyle?.strokeWidth || 0.5;
        const rx = shapeObj.shapeStyle?.borderRadius || 0;

        return (
          <rect
            key={key}
            x={shapeObj.x}
            y={shapeObj.y}
            width={shapeObj.width}
            height={shapeObj.height}
            rx={rx}
            ry={rx}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            transform={transform}
            opacity={shapeObj.opacity ?? 1}
          />
        );
      }

      case 'ellipse': {
        const shapeObj = obj as ShapeLabelObject;
        const fill = shapeObj.shapeStyle?.fillColor || 'transparent';
        const stroke = shapeObj.shapeStyle?.strokeColor || '#000000';
        const strokeWidth = shapeObj.shapeStyle?.strokeWidth || 0.5;

        return (
          <ellipse
            key={key}
            cx={shapeObj.x + shapeObj.width / 2}
            cy={shapeObj.y + shapeObj.height / 2}
            rx={shapeObj.width / 2}
            ry={shapeObj.height / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            transform={transform}
            opacity={shapeObj.opacity ?? 1}
          />
        );
      }

      case 'line': {
        const shapeObj = obj as ShapeLabelObject;
        const stroke = shapeObj.shapeStyle?.strokeColor || '#000000';
        const strokeWidth = shapeObj.shapeStyle?.strokeWidth || 0.5;

        return (
          <line
            key={key}
            x1={shapeObj.x}
            y1={shapeObj.y}
            x2={shapeObj.x + shapeObj.width}
            y2={shapeObj.y + shapeObj.height}
            stroke={stroke}
            strokeWidth={strokeWidth}
            transform={transform}
            opacity={shapeObj.opacity ?? 1}
          />
        );
      }

      case 'line': {
        const lineObj = obj as any;
        return (
          <line
            key={key}
            x1={lineObj.x}
            y1={lineObj.y}
            x2={lineObj.x + lineObj.width}
            y2={lineObj.y + lineObj.height}
            stroke={lineObj.style?.stroke || '#000000'}
            strokeWidth={lineObj.style?.strokeWidth || 0.8}
            transform={transform}
            opacity={lineObj.opacity ?? 1}
          />
        );
      }

      case 'image': {
        const imgObj = obj as ImageLabelObject;
        return (
          <image
            key={key}
            href={imgObj.src}
            x={imgObj.x}
            y={imgObj.y}
            width={imgObj.width}
            height={imgObj.height}
            preserveAspectRatio="none"
            transform={transform}
            opacity={imgObj.opacity ?? 1}
          />
        );
      }

      default:
        return null;
    }
  };

  return (
    <div
      className={`relative flex items-center justify-center p-2 bg-[#171920] rounded overflow-hidden select-none ${className}`}
    >
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full h-full max-h-full drop-shadow-md rounded"
        style={{
          aspectRatio: `${viewBoxWidth} / ${viewBoxHeight}`,
          backgroundColor: '#ffffff',
        }}
      >
        {/* Background Canvas Outline */}
        <rect
          x={0}
          y={0}
          width={viewBoxWidth}
          height={viewBoxHeight}
          fill="#ffffff"
          rx={cornerRadius}
          ry={cornerRadius}
        />

        {/* Optional subtle grid */}
        {showGrid && (
          <defs>
            <pattern id="preview-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
            </pattern>
          </defs>
        )}
        {showGrid && (
          <rect x="0" y="0" width={viewBoxWidth} height={viewBoxHeight} fill="url(#preview-grid)" />
        )}

        {/* Sort objects by z-index */}
        {[...document.objects]
          .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
          .map(renderObject)}
      </svg>
    </div>
  );
};
