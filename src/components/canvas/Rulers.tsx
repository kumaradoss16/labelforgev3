import React, { useState, useEffect, useRef } from 'react';
import { GuideLine } from '../../types/label';

export interface RulersProps {
  viewportWidth: number;
  viewportHeight: number;
  scrollLeft: number;
  scrollTop: number;
  originOffsetX: number;
  originOffsetY: number;
  labelWidthMm: number;
  labelHeightMm: number;
  zoom: number;
  cursorX: number; // in mm relative to template (0,0)
  cursorY: number; // in mm relative to template (0,0)
  unit: 'mm' | 'in' | 'cm' | 'pt';
  onUnitChange?: (unit: 'mm' | 'in' | 'cm' | 'pt') => void;
  onAddGuide?: (guide: GuideLine) => void;
  rulerThickness?: number;
}

export const Rulers: React.FC<RulersProps> = ({
  viewportWidth,
  viewportHeight,
  scrollLeft,
  scrollTop,
  originOffsetX,
  originOffsetY,
  labelWidthMm,
  labelHeightMm,
  zoom,
  cursorX,
  cursorY,
  unit,
  onUnitChange,
  onAddGuide,
  rulerThickness = 26,
}) => {
  const [showUnitMenu, setShowUnitMenu] = useState(false);
  const [dragGuideType, setDragGuideType] = useState<'h' | 'v' | null>(null);
  const [dragGuidePos, setDragGuidePos] = useState<number>(0);

  // Conversion rates relative to mm
  // 1 mm = 3.7795 px at 96 DPI CSS scale
  const pxPerMm = 3.7795 * zoom;

  let unitToMm = 1;
  let unitSuffix = 'mm';
  if (unit === 'cm') {
    unitToMm = 10;
    unitSuffix = 'cm';
  } else if (unit === 'in') {
    unitToMm = 25.4;
    unitSuffix = '"';
  } else if (unit === 'pt') {
    unitToMm = 25.4 / 72; // 1 pt = 1/72 inch
    unitSuffix = 'pt';
  }

  const pxPerUnit = pxPerMm * unitToMm;
  const labelWidthUnits = labelWidthMm / unitToMm;
  const labelHeightUnits = labelHeightMm / unitToMm;

  // Screen positions where template 0,0 is located
  const originScreenX = originOffsetX - scrollLeft;
  const originScreenY = originOffsetY - scrollTop;

  // Dimensions of ruler tracks
  const hRulerWidth = Math.max(100, viewportWidth - rulerThickness);
  const vRulerHeight = Math.max(100, viewportHeight - rulerThickness);

  // Determine tick step based on zoom and unit
  const determineStep = (pxUnit: number) => {
    const minPixelGap = 40;
    const standardSteps = unit === 'in'
      ? [0.125, 0.25, 0.5, 1, 2, 5, 10]
      : [0.5, 1, 2, 5, 10, 20, 50, 100, 200];

    for (const step of standardSteps) {
      if (step * pxUnit >= minPixelGap) {
        return step;
      }
    }
    return 10;
  };

  const majorStep = determineStep(pxPerUnit);
  const mediumStep = majorStep / 2;
  const minorStep = majorStep / 10;

  // --- HORIZONTAL RULER TICKS ---
  const hTicks: { pos: number; val: number; type: 'major' | 'medium' | 'minor'; label?: string }[] = [];
  const minHUnit = Math.floor((-originScreenX - 50) / pxPerUnit);
  const maxHUnit = Math.ceil((hRulerWidth - originScreenX + 50) / pxPerUnit);

  // Generate minor, medium, major ticks
  const startTick = Math.floor(minHUnit / majorStep) * majorStep;
  for (let u = startTick; u <= maxHUnit; u = Number((u + majorStep).toFixed(4))) {
    // Major tick
    const pos = originScreenX + u * pxPerUnit;
    if (pos >= -20 && pos <= hRulerWidth + 20) {
      let label = `${Math.round(u * 100) / 100}`;
      if (unit === 'in') label = `${u}"`;
      hTicks.push({ pos, val: u, type: 'major', label });
    }

    // Intermediate ticks if zoomed in enough
    if (majorStep * pxPerUnit > 30) {
      // Medium tick
      const medPos = pos + mediumStep * pxPerUnit;
      if (medPos >= -20 && medPos <= hRulerWidth + 20) {
        hTicks.push({ pos: medPos, val: u + mediumStep, type: 'medium' });
      }

      // Minor ticks
      if (minorStep * pxPerUnit >= 4) {
        for (let i = 1; i < 10; i++) {
          if (i === 5) continue; // medium tick spot
          const minPos = pos + i * minorStep * pxPerUnit;
          if (minPos >= -20 && minPos <= hRulerWidth + 20) {
            hTicks.push({ pos: minPos, val: u + i * minorStep, type: 'minor' });
          }
        }
      }
    }
  }

  // --- VERTICAL RULER TICKS ---
  const vTicks: { pos: number; val: number; type: 'major' | 'medium' | 'minor'; label?: string }[] = [];
  const minVUnit = Math.floor((-originScreenY - 50) / pxPerUnit);
  const maxVUnit = Math.ceil((vRulerHeight - originScreenY + 50) / pxPerUnit);

  const startVTick = Math.floor(minVUnit / majorStep) * majorStep;
  for (let u = startVTick; u <= maxVUnit; u = Number((u + majorStep).toFixed(4))) {
    const pos = originScreenY + u * pxPerUnit;
    if (pos >= -20 && pos <= vRulerHeight + 20) {
      let label = `${Math.round(u * 100) / 100}`;
      if (unit === 'in') label = `${u}"`;
      vTicks.push({ pos, val: u, type: 'major', label });
    }

    if (majorStep * pxPerUnit > 30) {
      const medPos = pos + mediumStep * pxPerUnit;
      if (medPos >= -20 && medPos <= vRulerHeight + 20) {
        vTicks.push({ pos: medPos, val: u + mediumStep, type: 'medium' });
      }

      if (minorStep * pxPerUnit >= 4) {
        for (let i = 1; i < 10; i++) {
          if (i === 5) continue;
          const minPos = pos + i * minorStep * pxPerUnit;
          if (minPos >= -20 && minPos <= vRulerHeight + 20) {
            vTicks.push({ pos: minPos, val: u + i * minorStep, type: 'minor' });
          }
        }
      }
    }
  }

  // Real-time cursor indicator on rulers (in screen pixels)
  const cursorScreenX = originScreenX + cursorX * pxPerMm;
  const cursorScreenY = originScreenY + cursorY * pxPerMm;

  // Active template boundaries on rulers
  const templateScreenStartH = originScreenX;
  const templateScreenEndH = originScreenX + labelWidthMm * pxPerMm;
  const templateScreenStartV = originScreenY;
  const templateScreenEndV = originScreenY + labelHeightMm * pxPerMm;

  // Units list for cycling
  const units: ('mm' | 'in' | 'cm' | 'pt')[] = ['mm', 'in', 'cm', 'pt'];
  const handleCycleUnit = () => {
    if (!onUnitChange) return;
    const nextIdx = (units.indexOf(unit) + 1) % units.length;
    onUnitChange(units[nextIdx]);
  };

  // Guide dragging handlers
  useEffect(() => {
    if (!dragGuideType) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragGuideType === 'h') {
        const clientY = e.clientY;
        setDragGuidePos(clientY);
      } else if (dragGuideType === 'v') {
        const clientX = e.clientX;
        setDragGuidePos(clientX);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (dragGuideType === 'h') {
        // Calculate position in mm relative to template origin
        const rawYPx = e.clientY - (rulerThickness + 40); // account for editor top
        const mm = (rawYPx - originScreenY) / pxPerMm;
        if (onAddGuide && Math.abs(mm) < 1000) {
          onAddGuide({
            id: `guide-h-${Date.now()}`,
            type: 'h',
            position: Math.round(mm * 10) / 10,
          });
        }
      } else if (dragGuideType === 'v') {
        const rawXPx = e.clientX - (rulerThickness + 40);
        const mm = (rawXPx - originScreenX) / pxPerMm;
        if (onAddGuide && Math.abs(mm) < 1000) {
          onAddGuide({
            id: `guide-v-${Date.now()}`,
            type: 'v',
            position: Math.round(mm * 10) / 10,
          });
        }
      }
      setDragGuideType(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragGuideType, originScreenX, originScreenY, pxPerMm, onAddGuide, rulerThickness]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20">
      {/* 1. TOP-LEFT CORNER ORIGIN BLOCK */}
      <div
        style={{ width: `${rulerThickness}px`, height: `${rulerThickness}px` }}
        className="absolute top-0 left-0 bg-[#16181f] border-r border-b border-[#2d313d] flex items-center justify-center pointer-events-auto cursor-pointer hover:bg-[#232732] transition-colors z-30 group shadow-sm"
        onClick={handleCycleUnit}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowUnitMenu(prev => !prev);
        }}
        title={`Unit: ${unit.toUpperCase()} (Click to cycle mm, in, cm, pt | Right-click for options)`}
      >
        <span className="text-[10px] font-mono font-bold text-blue-400 group-hover:text-blue-300">
          {unit}
        </span>
      </div>

      {/* Unit Context Menu */}
      {showUnitMenu && (
        <div
          className="absolute top-7 left-1 bg-[#1e222b] border border-[#3b4150] shadow-xl rounded py-1 px-1 z-40 text-xs text-gray-200 pointer-events-auto flex flex-col space-y-0.5"
          onMouseLeave={() => setShowUnitMenu(false)}
        >
          <div className="px-2 py-0.5 text-[10px] text-gray-400 font-semibold uppercase tracking-wider border-b border-[#2e3342] mb-1">
            Ruler Unit
          </div>
          {units.map((u) => (
            <button
              key={u}
              onClick={() => {
                onUnitChange?.(u);
                setShowUnitMenu(false);
              }}
              className={`px-3 py-1 rounded text-left flex items-center justify-between text-[11px] ${
                unit === u ? 'bg-blue-600 text-white font-medium' : 'hover:bg-[#2a2f3d] text-gray-300'
              }`}
            >
              <span>{u === 'mm' ? 'Millimeters (mm)' : u === 'in' ? 'Inches (in)' : u === 'cm' ? 'Centimeters (cm)' : 'Points (pt)'}</span>
              {unit === u && <span className="ml-2">✓</span>}
            </button>
          ))}
        </div>
      )}

      {/* 2. TOP HORIZONTAL RULER - COVERS ENTIRE EDITOR SECTION */}
      <div
        style={{
          left: `${rulerThickness}px`,
          top: 0,
          right: 0,
          height: `${rulerThickness}px`,
        }}
        className="absolute bg-[#181a22] border-b border-[#2b2f3b] overflow-hidden pointer-events-auto cursor-crosshair z-20"
        onMouseDown={(e) => {
          e.preventDefault();
          setDragGuideType('h');
          setDragGuidePos(e.clientY);
        }}
        title="Horizontal Ruler. Drag down to create a guide line."
      >
        <svg width="100%" height={rulerThickness} className="overflow-hidden block">
          {/* Subtle Background strip for template span */}
          {templateScreenEndH > templateScreenStartH && (
            <rect
              x={Math.max(0, templateScreenStartH)}
              y={0}
              width={Math.max(0, Math.min(hRulerWidth, templateScreenEndH) - Math.max(0, templateScreenStartH))}
              height={rulerThickness}
              fill="#1e2433"
              opacity={0.7}
            />
          )}

          {/* Template zero line marker (blue accent) */}
          {templateScreenStartH >= 0 && templateScreenStartH <= hRulerWidth && (
            <line
              x1={templateScreenStartH}
              y1={0}
              x2={templateScreenStartH}
              y2={rulerThickness}
              stroke="#3b82f6"
              strokeWidth={1.5}
            />
          )}

          {/* Template right edge marker */}
          {templateScreenEndH >= 0 && templateScreenEndH <= hRulerWidth && (
            <line
              x1={templateScreenEndH}
              y1={0}
              x2={templateScreenEndH}
              y2={rulerThickness}
              stroke="#3b82f6"
              strokeWidth={1.5}
            />
          )}

          {/* Active Template Span Indicator Bar at top */}
          {templateScreenEndH > templateScreenStartH && (
            <g>
              <rect
                x={templateScreenStartH}
                y={rulerThickness - 3}
                width={Math.max(0, templateScreenEndH - templateScreenStartH)}
                height={3}
                fill="#3b82f6"
              />
            </g>
          )}

          {/* All Ruler Ticks across entire editor section */}
          {hTicks.map((t, idx) => {
            const isOrigin = t.val === 0;
            return (
              <g key={`ht-${idx}-${t.val}`}>
                <line
                  x1={t.pos}
                  y1={t.type === 'major' ? 10 : t.type === 'medium' ? 16 : 20}
                  x2={t.pos}
                  y2={rulerThickness}
                  stroke={isOrigin ? '#60a5fa' : t.type === 'major' ? '#8e96a8' : '#454b5b'}
                  strokeWidth={isOrigin ? 1.5 : 1}
                />
                {t.type === 'major' && t.label && (
                  <text
                    x={t.pos + 2}
                    y={11}
                    fill={isOrigin ? '#93c5fd' : '#9ca3af'}
                    fontSize="9"
                    fontWeight={isOrigin ? 'bold' : 'normal'}
                    fontFamily="ui-monospace, monospace"
                  >
                    {t.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Dynamic Cursor tracking hairline */}
          {cursorScreenX >= 0 && cursorScreenX <= hRulerWidth && (
            <g transform={`translate(${cursorScreenX}, 0)`}>
              <line x1={0} y1={0} x2={0} y2={rulerThickness} stroke="#ef4444" strokeWidth={1.5} />
              <polygon points="-3,0 3,0 0,4" fill="#ef4444" />
            </g>
          )}
        </svg>
      </div>

      {/* 3. LEFT VERTICAL RULER - COVERS ENTIRE EDITOR SECTION */}
      <div
        style={{
          left: 0,
          top: `${rulerThickness}px`,
          width: `${rulerThickness}px`,
          bottom: 0,
        }}
        className="absolute bg-[#181a22] border-r border-[#2b2f3b] overflow-hidden pointer-events-auto cursor-crosshair z-20"
        onMouseDown={(e) => {
          e.preventDefault();
          setDragGuideType('v');
          setDragGuidePos(e.clientX);
        }}
        title="Vertical Ruler. Drag right to create a guide line."
      >
        <svg width={rulerThickness} height="100%" className="overflow-hidden block">
          {/* Subtle Background strip for template span */}
          {templateScreenEndV > templateScreenStartV && (
            <rect
              x={0}
              y={Math.max(0, templateScreenStartV)}
              width={rulerThickness}
              height={Math.max(0, Math.min(vRulerHeight, templateScreenEndV) - Math.max(0, templateScreenStartV))}
              fill="#1e2433"
              opacity={0.7}
            />
          )}

          {/* Template zero line marker (blue accent) */}
          {templateScreenStartV >= 0 && templateScreenStartV <= vRulerHeight && (
            <line
              x1={0}
              y1={templateScreenStartV}
              x2={rulerThickness}
              y2={templateScreenStartV}
              stroke="#3b82f6"
              strokeWidth={1.5}
            />
          )}

          {/* Template bottom edge marker */}
          {templateScreenEndV >= 0 && templateScreenEndV <= vRulerHeight && (
            <line
              x1={0}
              y1={templateScreenEndV}
              x2={rulerThickness}
              y2={templateScreenEndV}
              stroke="#3b82f6"
              strokeWidth={1.5}
            />
          )}

          {/* Active Template Span Indicator Bar at right */}
          {templateScreenEndV > templateScreenStartV && (
            <rect
              x={rulerThickness - 3}
              y={templateScreenStartV}
              width={3}
              height={Math.max(0, templateScreenEndV - templateScreenStartV)}
              fill="#3b82f6"
            />
          )}

          {/* All Ruler Ticks across entire vertical editor section */}
          {vTicks.map((t, idx) => {
            const isOrigin = t.val === 0;
            return (
              <g key={`vt-${idx}-${t.val}`}>
                <line
                  x1={t.type === 'major' ? 10 : t.type === 'medium' ? 16 : 20}
                  y1={t.pos}
                  x2={rulerThickness}
                  y2={t.pos}
                  stroke={isOrigin ? '#60a5fa' : t.type === 'major' ? '#8e96a8' : '#454b5b'}
                  strokeWidth={isOrigin ? 1.5 : 1}
                />
                {t.type === 'major' && t.label && (
                  <text
                    x={2}
                    y={t.pos - 2}
                    fill={isOrigin ? '#93c5fd' : '#9ca3af'}
                    fontSize="9"
                    fontWeight={isOrigin ? 'bold' : 'normal'}
                    fontFamily="ui-monospace, monospace"
                    transform={`rotate(-90 2 ${t.pos - 2})`}
                  >
                    {t.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Dynamic Cursor tracking hairline */}
          {cursorScreenY >= 0 && cursorScreenY <= vRulerHeight && (
            <g transform={`translate(0, ${cursorScreenY})`}>
              <line x1={0} y1={0} x2={rulerThickness} y2={0} stroke="#ef4444" strokeWidth={1.5} />
              <polygon points="0,-3 0,3 4,0" fill="#ef4444" />
            </g>
          )}
        </svg>
      </div>

      {/* 4. DRAGGING GUIDE GHOST PREVIEW */}
      {dragGuideType === 'h' && (
        <div
          style={{ top: `${dragGuidePos}px` }}
          className="fixed left-0 right-0 h-0 border-t border-cyan-400 border-dashed pointer-events-none z-50 flex items-center justify-end pr-4"
        >
          <span className="bg-cyan-600 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow">
            Y: {((dragGuidePos - (rulerThickness + 40) - originScreenY) / pxPerMm).toFixed(1)} {unitSuffix}
          </span>
        </div>
      )}

      {dragGuideType === 'v' && (
        <div
          style={{ left: `${dragGuidePos}px` }}
          className="fixed top-0 bottom-0 w-0 border-l border-cyan-400 border-dashed pointer-events-none z-50 flex items-start justify-end pt-4"
        >
          <span className="bg-cyan-600 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow -ml-8">
            X: {((dragGuidePos - (rulerThickness + 40) - originScreenX) / pxPerMm).toFixed(1)} {unitSuffix}
          </span>
        </div>
      )}
    </div>
  );
};
