import { describe, it, expect } from 'vitest';
import { computeIntelligentSnap } from '../services/intelligentSnapEngine';
import { LabelObject } from '../types/label';

describe('Intelligent Object & Canvas Snapping Engine', () => {
  const adjacentObj1: LabelObject = {
    id: 'adj-1',
    name: 'Shipping Address',
    type: 'text',
    x: 20,
    y: 30,
    width: 40,
    height: 20, // center is x=40, y=40
    rotation: 0,
    zIndex: 1,
    visible: true,
    locked: false,
    opacity: 1,
    text: '123 Test St',
    style: {
      fontFamily: 'Arial',
      fontSize: 12,
    },
  };

  const adjacentObj2: LabelObject = {
    id: 'adj-2',
    name: 'Barcode Item',
    type: 'barcode',
    x: 60,
    y: 80,
    width: 50,
    height: 30, // center is x=85, y=95
    rotation: 0,
    zIndex: 2,
    visible: true,
    locked: false,
    opacity: 1,
    value: 'TEST12345',
    barcodeStyle: {
      symbology: 'code128',
      humanReadable: true,
      humanReadableFont: 'Arial',
      humanReadableSize: 9,
      humanReadablePosition: 'bottom',
      moduleWidth: 0.3,
      quietZone: true,
      quietZoneSize: 2,
      color: '#000000',
      backgroundColor: '#ffffff',
    },
  };

  const otherObjects = [adjacentObj1, adjacentObj2];

  it('snaps dragged object horizontally to the center line of an adjacent element', () => {
    // Target center is adjacentObj1 at x=40.
    // Dragged object has width=20. So aligned x should be 40 - 10 = 30.
    // Propose raw x = 30.8 (within 1.5mm threshold of 30)
    const result = computeIntelligentSnap({
      draggedObj: {
        id: 'dragged-1',
        x: 30.8,
        y: 10,
        width: 20,
        height: 10,
      },
      otherObjects,
      canvasWidthMm: 100,
      canvasHeightMm: 150,
      thresholdMm: 1.5,
      enabled: true,
    });

    expect(result.hasSnappedX).toBe(true);
    expect(result.x).toBe(30); // 40 - 20/2
    expect(result.guides.length).toBeGreaterThanOrEqual(1);

    const xGuide = result.guides.find((g) => g.axis === 'x');
    expect(xGuide).toBeDefined();
    expect(xGuide?.positionMm).toBe(40);
    expect(xGuide?.targetName).toBe('Shipping Address');
  });

  it('snaps dragged object vertically to the center line of an adjacent element', () => {
    // Target center is adjacentObj1 at y=40.
    // Dragged object has height=10. So aligned y should be 40 - 5 = 35.
    // Propose raw y = 35.6 (within 1.5mm threshold of 35)
    const result = computeIntelligentSnap({
      draggedObj: {
        id: 'dragged-1',
        x: 100,
        y: 35.6,
        width: 20,
        height: 10,
      },
      otherObjects,
      canvasWidthMm: 150,
      canvasHeightMm: 150,
      thresholdMm: 1.5,
      enabled: true,
    });

    expect(result.hasSnappedY).toBe(true);
    expect(result.y).toBe(35); // 40 - 10/2
    const yGuide = result.guides.find((g) => g.axis === 'y');
    expect(yGuide).toBeDefined();
    expect(yGuide?.positionMm).toBe(40);
    expect(yGuide?.targetName).toBe('Shipping Address');
  });

  it('snaps both X and Y center lines simultaneously when within threshold', () => {
    // adjacentObj2 center is x=85, y=95
    // Dragged object width=30, height=20 (half: 15, 10)
    // Aligned position: x = 85 - 15 = 70, y = 95 - 10 = 85
    const result = computeIntelligentSnap({
      draggedObj: {
        id: 'dragged-1',
        x: 69.5,
        y: 85.8,
        width: 30,
        height: 20,
      },
      otherObjects,
      canvasWidthMm: 150,
      canvasHeightMm: 150,
      thresholdMm: 1.5,
      enabled: true,
    });

    expect(result.hasSnappedX).toBe(true);
    expect(result.x).toBe(70);
    expect(result.hasSnappedY).toBe(true);
    expect(result.y).toBe(85);
    expect(result.guides.length).toBe(2);
  });

  it('does not snap when distance exceeds the threshold', () => {
    const result = computeIntelligentSnap({
      draggedObj: {
        id: 'dragged-1',
        x: 10, // far from 30 (diff is 20mm > 1.5mm)
        y: 10,
        width: 20,
        height: 10,
      },
      otherObjects,
      canvasWidthMm: 100,
      canvasHeightMm: 150,
      thresholdMm: 1.5,
      enabled: true,
      snapToCanvas: false,
    });

    expect(result.hasSnappedX).toBe(false);
    expect(result.hasSnappedY).toBe(false);
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
    expect(result.guides.length).toBe(0);
  });

  it('magnetically snaps to canvas center horizontal and vertical midlines', () => {
    // Canvas center is (50, 75)
    // Dragged object width = 20, height = 10 -> aligned x = 50 - 10 = 40, aligned y = 75 - 5 = 70
    const result = computeIntelligentSnap({
      draggedObj: {
        id: 'dragged-1',
        x: 40.7,
        y: 69.4,
        width: 20,
        height: 10,
      },
      otherObjects: [], // no sibling objects
      canvasWidthMm: 100,
      canvasHeightMm: 150,
      thresholdMm: 1.5,
      enabled: true,
      snapToCanvas: true,
    });

    expect(result.hasSnappedX).toBe(true);
    expect(result.x).toBe(40);
    expect(result.hasSnappedY).toBe(true);
    expect(result.y).toBe(70);

    const xGuide = result.guides.find((g) => g.axis === 'x');
    expect(xGuide?.isCanvasCenter).toBe(true);
    expect(xGuide?.positionMm).toBe(50);

    const yGuide = result.guides.find((g) => g.axis === 'y');
    expect(yGuide?.isCanvasCenter).toBe(true);
    expect(yGuide?.positionMm).toBe(75);
  });

  it('magnetically snaps to canvas left and top outer edges (0mm)', () => {
    // Propose raw x = 0.8mm (close to 0), raw y = 0.5mm (close to 0)
    const result = computeIntelligentSnap({
      draggedObj: {
        id: 'dragged-1',
        x: 0.8,
        y: 0.5,
        width: 25,
        height: 15,
      },
      otherObjects: [],
      canvasWidthMm: 100,
      canvasHeightMm: 150,
      thresholdMm: 1.5,
      enabled: true,
      snapToCanvas: true,
    });

    expect(result.hasSnappedX).toBe(true);
    expect(result.x).toBe(0);
    expect(result.hasSnappedY).toBe(true);
    expect(result.y).toBe(0);

    const xGuide = result.guides.find((g) => g.axis === 'x');
    expect(xGuide?.isCanvasEdge).toBe(true);
    expect(xGuide?.targetName).toBe('Canvas Left Edge');

    const yGuide = result.guides.find((g) => g.axis === 'y');
    expect(yGuide?.isCanvasEdge).toBe(true);
    expect(yGuide?.targetName).toBe('Canvas Top Edge');
  });

  it('magnetically snaps to canvas right and bottom outer edges', () => {
    // Canvas dimensions: 100 x 150. Obj size: 20 x 10.
    // Target right snap: x = 100 - 20 = 80.
    // Target bottom snap: y = 150 - 10 = 140.
    const result = computeIntelligentSnap({
      draggedObj: {
        id: 'dragged-1',
        x: 79.4,
        y: 139.5,
        width: 20,
        height: 10,
      },
      otherObjects: [],
      canvasWidthMm: 100,
      canvasHeightMm: 150,
      thresholdMm: 1.5,
      enabled: true,
      snapToCanvas: true,
    });

    expect(result.hasSnappedX).toBe(true);
    expect(result.x).toBe(80);
    expect(result.hasSnappedY).toBe(true);
    expect(result.y).toBe(140);

    const xGuide = result.guides.find((g) => g.axis === 'x');
    expect(xGuide?.isCanvasEdge).toBe(true);
    expect(xGuide?.targetName).toBe('Canvas Right Edge');

    const yGuide = result.guides.find((g) => g.axis === 'y');
    expect(yGuide?.isCanvasEdge).toBe(true);
    expect(yGuide?.targetName).toBe('Canvas Bottom Edge');
  });

  it('respects snapToCanvas=false by bypassing canvas magnetic boundaries', () => {
    const result = computeIntelligentSnap({
      draggedObj: {
        id: 'dragged-1',
        x: 0.8,
        y: 0.5,
        width: 25,
        height: 15,
      },
      otherObjects: [],
      canvasWidthMm: 100,
      canvasHeightMm: 150,
      thresholdMm: 1.5,
      enabled: true,
      snapToCanvas: false,
      snapToCanvasCenter: false,
    });

    expect(result.hasSnappedX).toBe(false);
    expect(result.hasSnappedY).toBe(false);
    expect(result.x).toBe(0.8);
    expect(result.y).toBe(0.5);
  });

  it('bypasses snapping completely when enabled is false', () => {
    const result = computeIntelligentSnap({
      draggedObj: {
        id: 'dragged-1',
        x: 30.5,
        y: 35.5,
        width: 20,
        height: 10,
      },
      otherObjects,
      canvasWidthMm: 100,
      canvasHeightMm: 150,
      thresholdMm: 2.0,
      enabled: false,
    });

    expect(result.hasSnappedX).toBe(false);
    expect(result.hasSnappedY).toBe(false);
    expect(result.x).toBe(30.5);
    expect(result.y).toBe(35.5);
    expect(result.guides.length).toBe(0);
  });
});
