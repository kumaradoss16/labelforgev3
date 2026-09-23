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
 * Calculates center & edge alignments of dragged elements with adjacent sibling elements and canvas bounds.
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
  const draggedRight = draggedObj.x + draggedObj.width;
  const draggedBottom = draggedObj.y + draggedObj.height;

  // Filter valid candidate objects (visible, non-dragged)
  const candidates = otherObjects.filter(
    (o) => o.id !== draggedObj.id && o.visible !== false
  );

  // -------------------------------------------------------------
  // 1. Horizontal Snapping (X-axis alignment, vertical line)
  // -------------------------------------------------------------
  let bestXDiff = thresholdMm + 0.0001;
  let bestXSnap: {
    snappedObjX: number;
    guidePositionX: number;
    targetY: number;
    targetHeight: number;
    targetName: string;
    isCanvas?: boolean;
  } | null = null;

  // Check candidate objects
  for (const other of candidates) {
    const otherCenterX = other.x + other.width / 2;
    const otherRight = other.x + other.width;

    // Check Center-to-Center
    const centerDiff = Math.abs(draggedCenterX - otherCenterX);
    if (centerDiff <= thresholdMm && centerDiff < bestXDiff) {
      bestXDiff = centerDiff;
      bestXSnap = {
        snappedObjX: otherCenterX - draggedObj.width / 2,
        guidePositionX: otherCenterX,
        targetY: other.y,
        targetHeight: other.height,
        targetName: other.name || 'Object',
        isCanvas: false,
      };
    }

    // Check Left-to-Left
    const leftLeftDiff = Math.abs(draggedObj.x - other.x);
    if (leftLeftDiff <= thresholdMm && leftLeftDiff < bestXDiff) {
      bestXDiff = leftLeftDiff;
      bestXSnap = {
        snappedObjX: other.x,
        guidePositionX: other.x,
        targetY: other.y,
        targetHeight: other.height,
        targetName: other.name || 'Object',
        isCanvas: false,
      };
    }

    // Check Right-to-Right
    const rightRightDiff = Math.abs(draggedRight - otherRight);
    if (rightRightDiff <= thresholdMm && rightRightDiff < bestXDiff) {
      bestXDiff = rightRightDiff;
      bestXSnap = {
        snappedObjX: otherRight - draggedObj.width,
        guidePositionX: otherRight,
        targetY: other.y,
        targetHeight: other.height,
        targetName: other.name || 'Object',
        isCanvas: false,
      };
    }

    // Check Left-to-Right
    const leftRightDiff = Math.abs(draggedObj.x - otherRight);
    if (leftRightDiff <= thresholdMm && leftRightDiff < bestXDiff) {
      bestXDiff = leftRightDiff;
      bestXSnap = {
        snappedObjX: otherRight,
        guidePositionX: otherRight,
        targetY: other.y,
        targetHeight: other.height,
        targetName: other.name || 'Object',
        isCanvas: false,
      };
    }

    // Check Right-to-Left
    const rightLeftDiff = Math.abs(draggedRight - other.x);
    if (rightLeftDiff <= thresholdMm && rightLeftDiff < bestXDiff) {
      bestXDiff = rightLeftDiff;
      bestXSnap = {
        snappedObjX: other.x - draggedObj.width,
        guidePositionX: other.x,
        targetY: other.y,
        targetHeight: other.height,
        targetName: other.name || 'Object',
        isCanvas: false,
      };
    }
  }

  // Check Canvas Center & Edges
  if (snapToCanvasCenter) {
    const canvasCenterX = canvasWidthMm / 2;
    const centerDiff = Math.abs(draggedCenterX - canvasCenterX);
    if (centerDiff <= thresholdMm && centerDiff < bestXDiff) {
      bestXDiff = centerDiff;
      bestXSnap = {
        snappedObjX: canvasCenterX - draggedObj.width / 2,
        guidePositionX: canvasCenterX,
        targetY: 0,
        targetHeight: canvasHeightMm,
        targetName: 'Canvas Center',
        isCanvas: true,
      };
    }

    // Canvas Left Edge
    const leftDiff = Math.abs(draggedObj.x - 0);
    if (leftDiff <= thresholdMm && leftDiff < bestXDiff) {
      bestXDiff = leftDiff;
      bestXSnap = {
        snappedObjX: 0,
        guidePositionX: 0,
        targetY: 0,
        targetHeight: canvasHeightMm,
        targetName: 'Canvas Left Edge',
        isCanvas: true,
      };
    }

    // Canvas Right Edge
    const rightDiff = Math.abs(draggedRight - canvasWidthMm);
    if (rightDiff <= thresholdMm && rightDiff < bestXDiff) {
      bestXDiff = rightDiff;
      bestXSnap = {
        snappedObjX: canvasWidthMm - draggedObj.width,
        guidePositionX: canvasWidthMm,
        targetY: 0,
        targetHeight: canvasHeightMm,
        targetName: 'Canvas Right Edge',
        isCanvas: true,
      };
    }
  }

  if (bestXSnap) {
    snappedX = Number(bestXSnap.snappedObjX.toFixed(2));
    hasSnappedX = true;

    const minY = Math.min(draggedObj.y, bestXSnap.targetY);
    const maxY = Math.max(draggedObj.y + draggedObj.height, bestXSnap.targetY + bestXSnap.targetHeight);

    guides.push({
      id: `snap-x-${bestXSnap.guidePositionX}`,
      axis: 'x',
      positionMm: bestXSnap.guidePositionX,
      startMm: Math.max(0, minY - 2),
      endMm: Math.min(canvasHeightMm, maxY + 2),
      sourceCenter: { x: bestXSnap.guidePositionX, y: draggedObj.y + draggedObj.height / 2 },
      targetCenter: { x: bestXSnap.guidePositionX, y: bestXSnap.targetY + bestXSnap.targetHeight / 2 },
      targetName: bestXSnap.targetName,
      isCanvasCenter: bestXSnap.isCanvas,
    });
  }

  // -------------------------------------------------------------
  // 2. Vertical Snapping (Y-axis alignment, horizontal line)
  // -------------------------------------------------------------
  let bestYDiff = thresholdMm + 0.0001;
  let bestYSnap: {
    snappedObjY: number;
    guidePositionY: number;
    targetX: number;
    targetWidth: number;
    targetName: string;
    isCanvas?: boolean;
  } | null = null;

  // Check candidate objects
  for (const other of candidates) {
    const otherCenterY = other.y + other.height / 2;
    const otherBottom = other.y + other.height;

    // Check Center-to-Center
    const centerDiff = Math.abs(draggedCenterY - otherCenterY);
    if (centerDiff <= thresholdMm && centerDiff < bestYDiff) {
      bestYDiff = centerDiff;
      bestYSnap = {
        snappedObjY: otherCenterY - draggedObj.height / 2,
        guidePositionY: otherCenterY,
        targetX: other.x,
        targetWidth: other.width,
        targetName: other.name || 'Object',
        isCanvas: false,
      };
    }

    // Check Top-to-Top
    const topTopDiff = Math.abs(draggedObj.y - other.y);
    if (topTopDiff <= thresholdMm && topTopDiff < bestYDiff) {
      bestYDiff = topTopDiff;
      bestYSnap = {
        snappedObjY: other.y,
        guidePositionY: other.y,
        targetX: other.x,
        targetWidth: other.width,
        targetName: other.name || 'Object',
        isCanvas: false,
      };
    }

    // Check Bottom-to-Bottom
    const bottomBottomDiff = Math.abs(draggedBottom - otherBottom);
    if (bottomBottomDiff <= thresholdMm && bottomBottomDiff < bestYDiff) {
      bestYDiff = bottomBottomDiff;
      bestYSnap = {
        snappedObjY: otherBottom - draggedObj.height,
        guidePositionY: otherBottom,
        targetX: other.x,
        targetWidth: other.width,
        targetName: other.name || 'Object',
        isCanvas: false,
      };
    }

    // Check Top-to-Bottom
    const topBottomDiff = Math.abs(draggedObj.y - otherBottom);
    if (topBottomDiff <= thresholdMm && topBottomDiff < bestYDiff) {
      bestYDiff = topBottomDiff;
      bestYSnap = {
        snappedObjY: otherBottom,
        guidePositionY: otherBottom,
        targetX: other.x,
        targetWidth: other.width,
        targetName: other.name || 'Object',
        isCanvas: false,
      };
    }

    // Check Bottom-to-Top
    const bottomTopDiff = Math.abs(draggedBottom - other.y);
    if (bottomTopDiff <= thresholdMm && bottomTopDiff < bestYDiff) {
      bestYDiff = bottomTopDiff;
      bestYSnap = {
        snappedObjY: other.y - draggedObj.height,
        guidePositionY: other.y,
        targetX: other.x,
        targetWidth: other.width,
        targetName: other.name || 'Object',
        isCanvas: false,
      };
    }
  }

  // Check Canvas Center & Edges
  if (snapToCanvasCenter) {
    const canvasCenterY = canvasHeightMm / 2;
    const centerDiff = Math.abs(draggedCenterY - canvasCenterY);
    if (centerDiff <= thresholdMm && centerDiff < bestYDiff) {
      bestYDiff = centerDiff;
      bestYSnap = {
        snappedObjY: canvasCenterY - draggedObj.height / 2,
        guidePositionY: canvasCenterY,
        targetX: 0,
        targetWidth: canvasWidthMm,
        targetName: 'Canvas Center',
        isCanvas: true,
      };
    }

    // Canvas Top Edge
    const topDiff = Math.abs(draggedObj.y - 0);
    if (topDiff <= thresholdMm && topDiff < bestYDiff) {
      bestYDiff = topDiff;
      bestYSnap = {
        snappedObjY: 0,
        guidePositionY: 0,
        targetX: 0,
        targetWidth: canvasWidthMm,
        targetName: 'Canvas Top Edge',
        isCanvas: true,
      };
    }

    // Canvas Bottom Edge
    const bottomDiff = Math.abs(draggedBottom - canvasHeightMm);
    if (bottomDiff <= thresholdMm && bottomDiff < bestYDiff) {
      bestYDiff = bottomDiff;
      bestYSnap = {
        snappedObjY: canvasHeightMm - draggedObj.height,
        guidePositionY: canvasHeightMm,
        targetX: 0,
        targetWidth: canvasWidthMm,
        targetName: 'Canvas Bottom Edge',
        isCanvas: true,
      };
    }
  }

  if (bestYSnap) {
    snappedY = Number(bestYSnap.snappedObjY.toFixed(2));
    hasSnappedY = true;

    const effX = hasSnappedX ? snappedX : draggedObj.x;
    const minX = Math.min(effX, bestYSnap.targetX);
    const maxX = Math.max(effX + draggedObj.width, bestYSnap.targetX + bestYSnap.targetWidth);

    guides.push({
      id: `snap-y-${bestYSnap.guidePositionY}`,
      axis: 'y',
      positionMm: bestYSnap.guidePositionY,
      startMm: Math.max(0, minX - 2),
      endMm: Math.min(canvasWidthMm, maxX + 2),
      sourceCenter: { x: effX + draggedObj.width / 2, y: bestYSnap.guidePositionY },
      targetCenter: { x: bestYSnap.targetX + bestYSnap.targetWidth / 2, y: bestYSnap.guidePositionY },
      targetName: bestYSnap.targetName,
      isCanvasCenter: bestYSnap.isCanvas,
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
