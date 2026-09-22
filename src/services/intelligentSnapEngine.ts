import { LabelObject } from '../types/label';

export interface ActiveSnapGuide {
  id: string;
  axis: 'x' | 'y'; // 'x' = vertical alignment guide line (snapped horizontally), 'y' = horizontal alignment guide line (snapped vertically)
  positionMm: number; // constant coordinate in mm where the line is rendered
  startMm: number; // start along the perpendicular axis in mm
  endMm: number; // end along the perpendicular axis in mm
  sourceCenter: { x: number; y: number }; // center coordinates of the dragged object
  targetCenter: { x: number; y: number }; // center coordinates of the adjacent object snapped to
  targetName: string;
  isCanvasCenter?: boolean;
}

export interface IntelligentSnapParams {
  draggedObj: {
    id?: string;
    x: number; // proposed raw x (mm)
    y: number; // proposed raw y (mm)
    width: number; // (mm)
    height: number; // (mm)
  };
  otherObjects: LabelObject[];
  canvasWidthMm: number;
  canvasHeightMm: number;
  thresholdMm?: number;
  enabled?: boolean;
  snapToCanvasCenter?: boolean;
}

export interface IntelligentSnapResult {
  x: number;
  y: number;
  guides: ActiveSnapGuide[];
  hasSnappedX: boolean;
  hasSnappedY: boolean;
}

/**
 * Intelligent Object Snapping Engine
 * Calculates center-line alignments of dragged elements with adjacent sibling elements on the canvas.
 * If within the snapping threshold, it snaps the element to the center line and generates visual alignment guides.
 */
export function computeIntelligentSnap({
  draggedObj,
  otherObjects,
  canvasWidthMm,
  canvasHeightMm,
  thresholdMm = 1.5,
  enabled = true,
  snapToCanvasCenter = true,
}: IntelligentSnapParams): IntelligentSnapResult {
  if (!enabled) {
    return {
      x: draggedObj.x,
      y: draggedObj.y,
      guides: [],
      hasSnappedX: false,
      hasSnappedY: false,
    };
  }

  let snappedX = draggedObj.x;
  let snappedY = draggedObj.y;
  let hasSnappedX = false;
  let hasSnappedY = false;
  const guides: ActiveSnapGuide[] = [];

  const draggedCenterX = draggedObj.x + draggedObj.width / 2;
  const draggedCenterY = draggedObj.y + draggedObj.height / 2;

  // Filter valid candidate objects (visible, non-dragged)
  const candidates = otherObjects.filter(
    (o) => o.id !== draggedObj.id && o.visible !== false
  );

  // -------------------------------------------------------------
  // 1. Horizontal Center-to-Center Alignment (Vertical Line along X)
  // -------------------------------------------------------------
  let bestXDiff = thresholdMm + 0.0001;
  let bestXTarget: {
    centerX: number;
    centerY: number;
    name: string;
    y: number;
    height: number;
    isCanvas?: boolean;
  } | null = null;

  // Check candidate adjacent elements
  for (const other of candidates) {
    const otherCenterX = other.x + other.width / 2;
    const diff = Math.abs(draggedCenterX - otherCenterX);
    if (diff <= thresholdMm && diff < bestXDiff) {
      bestXDiff = diff;
      bestXTarget = {
        centerX: otherCenterX,
        centerY: other.y + other.height / 2,
        name: other.name || 'Object',
        y: other.y,
        height: other.height,
        isCanvas: false,
      };
    }
  }

  // Check canvas horizontal center line
  if (snapToCanvasCenter) {
    const canvasCenterX = canvasWidthMm / 2;
    const diff = Math.abs(draggedCenterX - canvasCenterX);
    if (diff <= thresholdMm && diff < bestXDiff) {
      bestXDiff = diff;
      bestXTarget = {
        centerX: canvasCenterX,
        centerY: canvasHeightMm / 2,
        name: 'Canvas Center',
        y: 0,
        height: canvasHeightMm,
        isCanvas: true,
      };
    }
  }

  if (bestXTarget) {
    snappedX = Number((bestXTarget.centerX - draggedObj.width / 2).toFixed(2));
    hasSnappedX = true;

    const sourceCenterY = draggedObj.y + draggedObj.height / 2;
    const minY = Math.min(draggedObj.y, bestXTarget.y);
    const maxY = Math.max(draggedObj.y + draggedObj.height, bestXTarget.y + bestXTarget.height);

    guides.push({
      id: `snap-center-x-${bestXTarget.centerX}`,
      axis: 'x',
      positionMm: bestXTarget.centerX,
      startMm: Math.max(0, minY - 2),
      endMm: Math.min(canvasHeightMm, maxY + 2),
      sourceCenter: { x: bestXTarget.centerX, y: sourceCenterY },
      targetCenter: { x: bestXTarget.centerX, y: bestXTarget.centerY },
      targetName: bestXTarget.name,
      isCanvasCenter: bestXTarget.isCanvas,
    });
  }

  // -------------------------------------------------------------
  // 2. Vertical Center-to-Center Alignment (Horizontal Line along Y)
  // -------------------------------------------------------------
  let bestYDiff = thresholdMm + 0.0001;
  let bestYTarget: {
    centerX: number;
    centerY: number;
    name: string;
    x: number;
    width: number;
    isCanvas?: boolean;
  } | null = null;

  // Check candidate adjacent elements
  for (const other of candidates) {
    const otherCenterY = other.y + other.height / 2;
    const diff = Math.abs(draggedCenterY - otherCenterY);
    if (diff <= thresholdMm && diff < bestYDiff) {
      bestYDiff = diff;
      bestYTarget = {
        centerX: other.x + other.width / 2,
        centerY: otherCenterY,
        name: other.name || 'Object',
        x: other.x,
        width: other.width,
        isCanvas: false,
      };
    }
  }

  // Check canvas vertical center line
  if (snapToCanvasCenter) {
    const canvasCenterY = canvasHeightMm / 2;
    const diff = Math.abs(draggedCenterY - canvasCenterY);
    if (diff <= thresholdMm && diff < bestYDiff) {
      bestYDiff = diff;
      bestYTarget = {
        centerX: canvasWidthMm / 2,
        centerY: canvasCenterY,
        name: 'Canvas Center',
        x: 0,
        width: canvasWidthMm,
        isCanvas: true,
      };
    }
  }

  if (bestYTarget) {
    snappedY = Number((bestYTarget.centerY - draggedObj.height / 2).toFixed(2));
    hasSnappedY = true;

    const sourceCenterX = (hasSnappedX ? snappedX : draggedObj.x) + draggedObj.width / 2;
    const minX = Math.min(hasSnappedX ? snappedX : draggedObj.x, bestYTarget.x);
    const maxX = Math.max((hasSnappedX ? snappedX : draggedObj.x) + draggedObj.width, bestYTarget.x + bestYTarget.width);

    guides.push({
      id: `snap-center-y-${bestYTarget.centerY}`,
      axis: 'y',
      positionMm: bestYTarget.centerY,
      startMm: Math.max(0, minX - 2),
      endMm: Math.min(canvasWidthMm, maxX + 2),
      sourceCenter: { x: sourceCenterX, y: bestYTarget.centerY },
      targetCenter: { x: bestYTarget.centerX, y: bestYTarget.centerY },
      targetName: bestYTarget.name,
      isCanvasCenter: bestYTarget.isCanvas,
    });
  }

  return {
    x: snappedX,
    y: snappedY,
    guides,
    hasSnappedX,
    hasSnappedY,
  };
}
