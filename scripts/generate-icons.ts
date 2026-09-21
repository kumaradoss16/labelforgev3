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
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
  }

  const sizes = [16, 32, 128, 256];
  let png256: Buffer | null = null;

  for (const size of sizes) {
    const pngBuf = createPng(size, size, (x, y) => {
      const u = x / size;
      const v = y / size;

      // Rounded rect border radius
      const r = 0.18;
      const dx = Math.max(0, Math.abs(u - 0.5) - (0.5 - r));
      const dy = Math.max(0, Math.abs(v - 0.5) - (0.5 - r));
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r) {
        return [0, 0, 0, 0]; // Transparent outside rounded corner
      }

      // Border glow
      if (dist > r - 0.03 || u < 0.04 || u > 0.96 || v < 0.04 || v > 0.96) {
        return [59, 130, 246, 255]; // Bright Electric Blue
      }

      // Inner tag area: Dark technical slate
      const isTagHeader = v < 0.32;
      if (isTagHeader) {
        return [30, 41, 59, 255]; // Slate Header
      }

      // Barcode lines in center area
      if (v > 0.42 && v < 0.78 && u > 0.18 && u < 0.82) {
        // Vertical barcode bars pattern
        const barPos = Math.floor((u - 0.18) * 40);
        const isBar = (barPos % 3 === 0) || (barPos % 7 === 1) || (barPos % 5 === 2);
        if (isBar) {
          return [56, 189, 248, 255]; // Cyan Bar
        }
      }

      // Bottom Status Pill
      if (v > 0.84 && v < 0.92 && u > 0.28 && u < 0.72) {
        return [16, 185, 129, 255]; // Emerald Ready
      }

      return [15, 23, 42, 255]; // Dark Navy Canvas #0f172a
    });

    fs.writeFileSync(path.join(iconDir, `icon-${size}.png`), pngBuf);
    if (size === 256) {
      png256 = pngBuf;
      fs.writeFileSync(path.join(iconDir, 'icon.png'), pngBuf);
    }
  }

  if (png256) {
    const icoBuf = createIcoFromPng(png256, 256, 256);
    fs.writeFileSync(path.join(iconDir, 'icon.ico'), icoBuf);
  }

  console.log('✅ Generated assets/icons/icon.ico and multi-resolution PNGs');
}

generateIcons();
