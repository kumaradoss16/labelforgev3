import { LabelObject } from '../types/label';

export type SnapGuideType =
  | 'canvas-center-x'
  | 'canvas-center-y'
  | 'canvas-edge-left'
  | 'canvas-edge-right'
  | 'canvas-edge-top'
  | 'canvas-edge-bottom'
  | 'object-center'
  | 'object-edge';

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
  isCanvasEdge?: boolean;
  snapType?: SnapGuideType;
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
  snapToCanvas?: boolean; // Magnetic snapping to label outer edges and center lines
  snapToCanvasCenter?: boolean; // Backward-compatible alias
  snapToObjects?: boolean; // Snapping to sibling objects
}

export interface IntelligentSnapResult {
  x: number;
  y: number;
  guides: ActiveSnapGuide[];
  hasSnappedX: boolean;
  hasSnappedY: boolean;
}

/**
 * Intelligent Object & Canvas Snapping Engine
 * Magnetically aligns dragged elements with:
 *  1. Canvas Center Lines (Horizontal & Vertical Midlines)
 *  2. Canvas Outer Edges (Left 0mm, Right Wmm, Top 0mm, Bottom Hmm)
 *  3. Adjacent sibling elements (Center lines & Edges)
 */
export function computeIntelligentSnap({
  draggedObj,
  otherObjects,
  canvasWidthMm,
  canvasHeightMm,
  thresholdMm = 1.5,
  enabled = true,
  snapToCanvas = true,
  snapToCanvasCenter = true,
  snapToObjects = true,
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

  // Determine whether canvas snapping is active (support both flags)
  const isCanvasSnapActive = snapToCanvas || snapToCanvasCenter;

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
  const candidates = snapToObjects
    ? otherObjects.filter((o) => o.id !== draggedObj.id && o.visible !== false)
    : [];

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
    isCanvasCenter?: boolean;
    isCanvasEdge?: boolean;
    snapType: SnapGuideType;
  } | null = null;

  // 1a. Canvas Center & Outer Edges (Magnetic Snap-to-Canvas)
  if (isCanvasSnapActive) {
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
        isCanvasCenter: true,
        isCanvasEdge: false,
        snapType: 'canvas-center-x',
      };
    }

    // Canvas Left Outer Edge (0mm)
    const leftEdgeDiff = Math.abs(draggedObj.x - 0);
    if (leftEdgeDiff <= thresholdMm && leftEdgeDiff < bestXDiff) {
      bestXDiff = leftEdgeDiff;
      bestXSnap = {
        snappedObjX: 0,
        guidePositionX: 0,
        targetY: 0,
        targetHeight: canvasHeightMm,
        targetName: 'Canvas Left Edge',
        isCanvasCenter: false,
        isCanvasEdge: true,
        snapType: 'canvas-edge-left',
      };
    }

    // Canvas Right Outer Edge (Wmm)
    const rightEdgeDiff = Math.abs(draggedRight - canvasWidthMm);
    if (rightEdgeDiff <= thresholdMm && rightEdgeDiff < bestXDiff) {
      bestXDiff = rightEdgeDiff;
      bestXSnap = {
        snappedObjX: canvasWidthMm - draggedObj.width,
        guidePositionX: canvasWidthMm,
        targetY: 0,
        targetHeight: canvasHeightMm,
        targetName: 'Canvas Right Edge',
        isCanvasCenter: false,
        isCanvasEdge: true,
        snapType: 'canvas-edge-right',
      };
    }
  }

  // 1b. Check Candidate Sibling Objects
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
        isCanvasCenter: false,
        isCanvasEdge: false,
        snapType: 'object-center',
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
        isCanvasCenter: false,
        isCanvasEdge: false,
        snapType: 'object-edge',
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
        isCanvasCenter: false,
        isCanvasEdge: false,
        snapType: 'object-edge',
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
        isCanvasCenter: false,
        isCanvasEdge: false,
        snapType: 'object-edge',
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
        isCanvasCenter: false,
        isCanvasEdge: false,
        snapType: 'object-edge',
      };
    }
  }

  if (bestXSnap) {
    snappedX = Number(bestXSnap.snappedObjX.toFixed(2));
    hasSnappedX = true;

    const isCanvasGuide = bestXSnap.isCanvasCenter || bestXSnap.isCanvasEdge;
    const startY = isCanvasGuide ? 0 : Math.max(0, Math.min(draggedObj.y, bestXSnap.targetY) - 2);
    const endY = isCanvasGuide
      ? canvasHeightMm
      : Math.min(canvasHeightMm, Math.max(draggedObj.y + draggedObj.height, bestXSnap.targetY + bestXSnap.targetHeight) + 2);

    guides.push({
      id: `snap-x-${bestXSnap.guidePositionX}-${bestXSnap.snapType}`,
      axis: 'x',
      positionMm: bestXSnap.guidePositionX,
      startMm: startY,
      endMm: endY,
      sourceCenter: { x: bestXSnap.guidePositionX, y: draggedObj.y + draggedObj.height / 2 },
      targetCenter: {
        x: bestXSnap.guidePositionX,
        y: isCanvasGuide ? canvasHeightMm / 2 : bestXSnap.targetY + bestXSnap.targetHeight / 2,
      },
      targetName: bestXSnap.targetName,
      isCanvasCenter: bestXSnap.isCanvasCenter,
      isCanvasEdge: bestXSnap.isCanvasEdge,
      snapType: bestXSnap.snapType,
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
    isCanvasCenter?: boolean;
    isCanvasEdge?: boolean;
    snapType: SnapGuideType;
  } | null = null;

  // 2a. Canvas Center & Outer Edges (Magnetic Snap-to-Canvas)
  if (isCanvasSnapActive) {
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
        isCanvasCenter: true,
        isCanvasEdge: false,
        snapType: 'canvas-center-y',
      };
    }

    // Canvas Top Outer Edge (0mm)
    const topEdgeDiff = Math.abs(draggedObj.y - 0);
    if (topEdgeDiff <= thresholdMm && topEdgeDiff < bestYDiff) {
      bestYDiff = topEdgeDiff;
      bestYSnap = {
        snappedObjY: 0,
        guidePositionY: 0,
        targetX: 0,
        targetWidth: canvasWidthMm,
        targetName: 'Canvas Top Edge',
        isCanvasCenter: false,
        isCanvasEdge: true,
        snapType: 'canvas-edge-top',
      };
    }

    // Canvas Bottom Outer Edge (Hmm)
    const bottomEdgeDiff = Math.abs(draggedBottom - canvasHeightMm);
    if (bottomEdgeDiff <= thresholdMm && bottomEdgeDiff < bestYDiff) {
      bestYDiff = bottomEdgeDiff;
      bestYSnap = {
        snappedObjY: canvasHeightMm - draggedObj.height,
        guidePositionY: canvasHeightMm,
        targetX: 0,
        targetWidth: canvasWidthMm,
        targetName: 'Canvas Bottom Edge',
        isCanvasCenter: false,
        isCanvasEdge: true,
        snapType: 'canvas-edge-bottom',
      };
    }
  }

  // 2b. Check Candidate Sibling Objects
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
        isCanvasCenter: false,
        isCanvasEdge: false,
        snapType: 'object-center',
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
        isCanvasCenter: false,
        isCanvasEdge: false,
        snapType: 'object-edge',
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
        isCanvasCenter: false,
        isCanvasEdge: false,
        snapType: 'object-edge',
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
        isCanvasCenter: false,
        isCanvasEdge: false,
        snapType: 'object-edge',
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
        isCanvasCenter: false,
        isCanvasEdge: false,
        snapType: 'object-edge',
      };
    }
  }

  if (bestYSnap) {
    snappedY = Number(bestYSnap.snappedObjY.toFixed(2));
    hasSnappedY = true;

    const effX = hasSnappedX ? snappedX : draggedObj.x;
    const isCanvasGuide = bestYSnap.isCanvasCenter || bestYSnap.isCanvasEdge;
    const startX = isCanvasGuide ? 0 : Math.max(0, Math.min(effX, bestYSnap.targetX) - 2);
    const endX = isCanvasGuide
      ? canvasWidthMm
      : Math.min(canvasWidthMm, Math.max(effX + draggedObj.width, bestYSnap.targetX + bestYSnap.targetWidth) + 2);

    guides.push({
      id: `snap-y-${bestYSnap.guidePositionY}-${bestYSnap.snapType}`,
      axis: 'y',
      positionMm: bestYSnap.guidePositionY,
      startMm: startX,
      endMm: endX,
      sourceCenter: { x: effX + draggedObj.width / 2, y: bestYSnap.guidePositionY },
      targetCenter: {
        x: isCanvasGuide ? canvasWidthMm / 2 : bestYSnap.targetX + bestYSnap.targetWidth / 2,
        y: bestYSnap.guidePositionY,
      },
      targetName: bestYSnap.targetName,
      isCanvasCenter: bestYSnap.isCanvasCenter,
      isCanvasEdge: bestYSnap.isCanvasEdge,
      snapType: bestYSnap.snapType,
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
