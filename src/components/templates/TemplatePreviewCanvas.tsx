import React from 'react';
import {
  LabelDocument,
  LabelObject,
  TextLabelObject,
  BarcodeLabelObject,
  ShapeLabelObject,
  ImageLabelObject,
} from '../../types/label';

interface TemplatePreviewCanvasProps {
  document: LabelDocument;
  className?: string;
  showGrid?: boolean;
}

export const TemplatePreviewCanvas: React.FC<TemplatePreviewCanvasProps> = ({
  document,
  className = '',
  showGrid = false,
}) => {
  const viewBoxWidth = document.dimensions?.width || 100;
  const viewBoxHeight = document.dimensions?.height || 150;
  const cornerRadius = document.dimensions?.cornerRadius || 0;

  const renderObject = (obj: LabelObject) => {
    if (!obj.visible) return null;

    const key = `preview-${obj.id}`;
    const transform = obj.rotation ? `rotate(${obj.rotation}, ${obj.x + obj.width / 2}, ${obj.y + obj.height / 2})` : undefined;

    switch (obj.type) {
      case 'text':
      case 'rich-text': {
        const textObj = obj as TextLabelObject;
        const fontSize = textObj.style?.fontSize ? textObj.style.fontSize * 0.352778 : 4; // Convert pt to mm approx
        const fill = textObj.style?.color || '#000000';
        const fontWeight = textObj.style?.fontWeight || 'normal';
        const fontFamily = textObj.style?.fontFamily || 'Inter, sans-serif';

        return (
          <text
            key={key}
            x={textObj.x}
            y={textObj.y + textObj.height * 0.8}
            fontSize={fontSize}
            fill={fill}
            fontWeight={fontWeight}
            fontFamily={fontFamily}
            transform={transform}
            opacity={textObj.opacity ?? 1}
          >
            {textObj.text || 'Text'}
          </text>
        );
      }

      case 'barcode': {
        const barcodeObj = obj as BarcodeLabelObject;
        const fill = barcodeObj.barcodeStyle?.color || '#000000';
        const numBars = 24;
        const barWidth = barcodeObj.width / numBars;

        return (
          <g key={key} transform={transform} opacity={barcodeObj.opacity ?? 1}>
            {/* Background */}
            <rect
              x={barcodeObj.x}
              y={barcodeObj.y}
              width={barcodeObj.width}
              height={barcodeObj.height}
              fill={barcodeObj.barcodeStyle?.backgroundColor || '#ffffff'}
            />
            {/* Simulated Barcode Lines */}
            {Array.from({ length: numBars }).map((_, i) => {
              if (i % 2 === 0 || i % 5 === 0) {
                return (
                  <rect
                    key={`bar-${i}`}
                    x={barcodeObj.x + i * barWidth}
                    y={barcodeObj.y}
                    width={barWidth * 0.8}
                    height={barcodeObj.height * (barcodeObj.barcodeStyle?.humanReadable ? 0.8 : 1.0)}
                    fill={fill}
                  />
                );
              }
              return null;
            })}
            {/* Human Readable Text */}
            {barcodeObj.barcodeStyle?.humanReadable && (
              <text
                x={barcodeObj.x + barcodeObj.width / 2}
                y={barcodeObj.y + barcodeObj.height - 0.5}
                fontSize={Math.min(3, barcodeObj.height * 0.18)}
                textAnchor="middle"
                fill={fill}
                fontFamily="Courier, monospace"
              >
                {barcodeObj.value || '12345678'}
              </text>
            )}
          </g>
        );
      }

      case 'qrcode':
      case 'datamatrix': {
        const barcodeObj = obj as BarcodeLabelObject;
        const fill = barcodeObj.barcodeStyle?.color || '#000000';
        const gridSize = 6;
        const cellSize = Math.min(barcodeObj.width, barcodeObj.height) / gridSize;

        return (
          <g key={key} transform={transform} opacity={barcodeObj.opacity ?? 1}>
            <rect
              x={barcodeObj.x}
              y={barcodeObj.y}
              width={barcodeObj.width}
              height={barcodeObj.height}
              fill={barcodeObj.barcodeStyle?.backgroundColor || '#ffffff'}
            />
            {/* 2D Pattern Simulation */}
            {Array.from({ length: gridSize }).map((_, r) =>
              Array.from({ length: gridSize }).map((_, c) => {
                if ((r + c) % 2 === 0 || (r === 0 && c === 0) || (r === 0 && c === gridSize - 1)) {
                  return (
                    <rect
                      key={`cell-${r}-${c}`}
                      x={barcodeObj.x + c * cellSize}
                      y={barcodeObj.y + r * cellSize}
                      width={cellSize}
                      height={cellSize}
                      fill={fill}
                    />
                  );
                }
                return null;
              })
            )}
          </g>
        );
      }

      case 'rect': {
        const shapeObj = obj as ShapeLabelObject;
        const fill = shapeObj.shapeStyle?.fillColor || 'transparent';
        const stroke = shapeObj.shapeStyle?.strokeColor || '#000000';
        const strokeWidth = shapeObj.shapeStyle?.strokeWidth || 0.5;

        return (
          <rect
            key={key}
            x={shapeObj.x}
            y={shapeObj.y}
            width={shapeObj.width}
            height={shapeObj.height}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            rx={shapeObj.shapeStyle?.borderRadius || 0}
            ry={shapeObj.shapeStyle?.borderRadius || 0}
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
