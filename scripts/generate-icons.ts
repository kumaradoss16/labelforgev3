/**
 * LabelForge Desktop - Icon Generator
 * Generates valid PNG and Windows ICO icon assets in pure Node.js
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width: number, height: number, drawFn: (x: number, y: number) => [number, number, number, number]): Buffer {
  const rowBytes = width * 4;
  const rawData = Buffer.alloc((rowBytes + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1);
    rawData[rowStart] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y);
      const pixelStart = rowStart + 1 + x * 4;
      rawData[pixelStart] = r;
      rawData[pixelStart + 1] = g;
      rawData[pixelStart + 2] = b;
      rawData[pixelStart + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);

  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc >>> 0, 8 + len);
  return buf;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  table[n] = c;
}

function createIcoFromPng(pngBuffer: Buffer, width: number, height: number): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(1, 4); // 1 Image

  const entry = Buffer.alloc(16);
  entry[0] = width >= 256 ? 0 : width;
  entry[1] = height >= 256 ? 0 : height;
  entry[2] = 0; // Color palette
  entry[3] = 0; // Reserved
  entry.writeUInt16LE(1, 4); // Color planes
  entry.writeUInt16LE(32, 6); // Bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // Size of image data
  entry.writeUInt32LE(6 + 16, 12); // Offset to image data

  return Buffer.concat([header, entry, pngBuffer]);
}

// Generate LabelForge Brand Icon: Deep Slate Dark Navy background with Cobalt Blue and Cyan Label/Barcode Motif
function generateIcons() {
  const iconDir = path.resolve(process.cwd(), 'assets/icons');
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
  }
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sizes = [16, 32, 128, 192, 256, 512];
  let png256: Buffer | null = null;
  let png32: Buffer | null = null;

  for (const size of sizes) {
    const pngBuf = createPng(size, size, (x, y) => {
      // Coordinate space normalized to [0, 100]
      const px = (x / size) * 100;
      const py = (y / size) * 100;

      // 1. Outer Squircle mask (radius ~ 23 on 100 scale)
      const r = 23;
      const qx = Math.max(0, Math.abs(px - 50) - (50 - r));
      const qy = Math.max(0, Math.abs(py - 50) - (50 - r));
      const distSquircle = Math.sqrt(qx * qx + qy * qy);
      if (distSquircle > r) {
        return [0, 0, 0, 0]; // Transparent outside squircle
      }

      // 2. Cyan Targeting Bracket at Top-Right
      // Horizontal arm: px in [61, 71.5], py in [15.5, 19.5]
      // Vertical arm: px in [68, 72], py in [17, 28]
      const inHorizArm = px >= 61 && px <= 71.5 && Math.abs(py - 17.5) <= 1.8;
      const inVertArm = py >= 17.5 && py <= 28 && Math.abs(px - 71.5) <= 1.8;
      if (inHorizArm || inVertArm) {
        return [0, 229, 255, 255]; // Electric Cyan #00e5ff
      }

      // 3. Main White Tag Boundary Detection
      // Top: y ~ 16.5, Bottom: y ~ 55, Left: x ~ 36.5, Right: x ~ 69.5
      // Left edge: x = 36.5 (y between 23 and 45)
      // Top-left shoulder: (px - 43)^2 + (py - 23)^2 <= 6.5^2
      // Top edge: py in [16.5, 22], px between 43 and 52
      // Fold top-right: px in [52, 61], py in [16.5, 26]
      // Right edge: angled from (69.5, 34) down to (69.5, 43), then rounding
      const isInsideWhiteTag = (() => {
        if (px < 36.5 || px > 69.5 || py < 16.5 || py > 55.5) return false;
        // Top-left round corner cut
        if (px < 43 && py < 23) {
          const d = Math.hypot(px - 43, py - 23);
          if (d > 6.5) return false;
        }
        // Top-right dog ear angle (x from 52 to 69.5)
        if (py < 22 && px > 52 + (py - 16.5) * 1.5) {
          // outside tag top-right corner
          return false;
        }
        // Bottom-left rounded corner
        if (px < 42 && py > 47) {
          const d = Math.hypot(px - 42, py - 47);
          if (d > 6) return false;
        }
        // Bottom-right rounded angle
        if (px > 61 && py > 46) {
          if (px > 60 + (55.5 - py) * 1.2) return false;
        }
        return true;
      })();

      // 4. White Tag Interior Features
      if (isInsideWhiteTag) {
        // 4a. Eyelet Cutout Hole at (43, 23.5) with radius 4.2
        const eyeletDist = Math.hypot(px - 43, py - 23.5);
        if (eyeletDist <= 4.2) {
          // Inside eyelet: reveal deep navy background
          return [12, 26, 62, 255]; // Deep navy canvas
        }
        if (eyeletDist <= 4.8) {
          // Eyelet soft inner border
          return [210, 225, 245, 255];
        }

        // 4b. Dog-Ear Folded Triangle at Top Right (x in [52, 61], y in [16.5, 26])
        if (px >= 52 && py <= 26 && (px - 52) <= (py - 16.5) * 1.05 + 0.5) {
          // Crease line
          if (Math.abs((px - 52) - (py - 16.5)) < 0.8) {
            return [2, 132, 199, 255]; // Fold shadow crease
          }
          // Cyan folded flap with top highlight
          if (py <= 19) {
            return [56, 189, 248, 255]; // Cyan highlight
          }
          return [0, 196, 255, 255]; // Bright Cyan #00c4ff
        }

        // 4c. Precision Barcode Stripes (Inside White Tag)
        // Center barcode vertical range: py between 30 and 45
        if (py >= 30 && py <= 45) {
          const inBar1 = px >= 41.5 && px <= 44.3; // Wide bar
          const inBar2 = px >= 45.5 && px <= 47.5; // Med bar
          const inBar3 = px >= 48.7 && px <= 50.1; // Thin bar
          const inBar4 = px >= 51.3 && px <= 53.3; // Med bar
          const inBar5 = px >= 54.5 && px <= 57.3; // Wide bar
          const inBar6 = px >= 58.5 && px <= 59.9; // Thin bar

          if (inBar1 || inBar2 || inBar3 || inBar4 || inBar5 || inBar6) {
            return [9, 20, 48, 255]; // Dark Navy Barcode #091430
          }
        }

        // Crisp White Tag body with subtle vertical gradient
        const tagWhite = Math.round(255 - (py - 16.5) * 0.3);
        return [tagWhite, Math.min(255, tagWhite + 2), 255, 255];
      }

      // 5. Orange Accent Wedge at Lower Right
      // Polygon around x in [60.5, 71], y in [38, 51]
      const inOrangeWedge = (() => {
        if (px >= 60 && px <= 71.5 && py >= 37 && py <= 51) {
          if (px + py >= 100 && px - py <= 28) return true;
        }
        return false;
      })();
      if (inOrangeWedge) {
        if (py <= 42) {
          return [255, 150, 20, 255]; // Orange highlight
        }
        return [255, 122, 0, 255]; // Warm Orange #ff7a00
      }

      // 6. Layered 3D Electric Blue Offset Base Plate
      // Protruding to the left and bottom behind white tag
      const inBluePlate = (() => {
        // Base plate bounds: px in [29, 67], py in [28, 70]
        if (px >= 29 && px <= 67 && py >= 28 && py <= 70) {
          // Bottom curve
          if (py > 60 && (px < 33 || px > 63)) return false;
          // Left stepping
          if (px < 36.5 && py >= 32 && py <= 56) return true;
          // Bottom stepping
          if (py >= 53 && py <= 69 && px >= 33 && px <= 64) return true;
        }
        return false;
      })();

      if (inBluePlate) {
        // Underneath shadow vs top facet highlight
        if (py >= 65 || px <= 31) {
          return [0, 59, 135, 255]; // Deep shadow blue
        }
        if (px <= 34 || py <= 35) {
          return [56, 189, 248, 255]; // Cyan-blue edge shine
        }
        return [0, 112, 243, 255]; // Electric Azure Blue #0070f3
      }

      // 7. Background Canvas Gradient (Deep Rich Navy)
      // Subtle gradient from #0c1a3e at top to #071026 at bottom
      const t = py / 100;
      const rBg = Math.round(12 * (1 - t) + 7 * t);
      const gBg = Math.round(26 * (1 - t) + 16 * t);
      const bBg = Math.round(62 * (1 - t) + 38 * t);

      return [rBg, gBg, bBg, 255];
    });

    fs.writeFileSync(path.join(iconDir, `icon-${size}.png`), pngBuf);
    fs.writeFileSync(path.join(publicDir, `icon-${size}.png`), pngBuf);

    if (size === 256) {
      png256 = pngBuf;
      fs.writeFileSync(path.join(iconDir, 'icon.png'), pngBuf);
      fs.writeFileSync(path.join(publicDir, 'icon.png'), pngBuf);
      fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngBuf);
    }
    if (size === 32) {
      png32 = pngBuf;
    }
  }

  if (png256) {
    const icoBuf = createIcoFromPng(png256, 256, 256);
    fs.writeFileSync(path.join(iconDir, 'icon.ico'), icoBuf);
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);
  }

  console.log('✅ Generated assets/icons and public/ icon assets successfully matching reference!');
}

generateIcons();
