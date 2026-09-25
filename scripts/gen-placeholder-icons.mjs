// One-off generator for placeholder CEP panel icons (23x23, Adobe's recommended panel-icon size).
// Draws a simple filled circle with a waveform notch so the two states (dark/light UI) are
// visually distinct. Replace src/assets/*.png with real branded icons before shipping.
import { deflateSync } from "zlib";
import { writeFileSync } from "fs";

const SIZE = 23;

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function buildPng(pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  for (let y = 0; y < SIZE; y++) {
    const rowStart = y * (SIZE * 4 + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b, a] = pixels(x, y);
      const off = rowStart + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function iconPixels(fg) {
  const cx = (SIZE - 1) / 2;
  const cy = (SIZE - 1) / 2;
  const r = SIZE / 2 - 1.5;
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > r) return [0, 0, 0, 0];
    // simple three-bar "waveform" notch inside the circle
    const barW = 2.4;
    const bars = [-5, 0, 5];
    for (const bx of bars) {
      if (Math.abs(dx - bx) < barW / 2 && Math.abs(dy) < (bx === 0 ? 7 : 4)) {
        return [...fg.bar, 255];
      }
    }
    return [...fg.fill, 235];
  };
}

// Dark-UI icon: light glyph (used when host app skin is dark)
writeFileSync(
  new URL("../src/assets/light-icon.png", import.meta.url),
  buildPng(iconPixels({ fill: [235, 235, 235], bar: [20, 20, 20] }))
);

// Light-UI icon: dark glyph (used when host app skin is light)
writeFileSync(
  new URL("../src/assets/dark-icon.png", import.meta.url),
  buildPng(iconPixels({ fill: [40, 40, 40], bar: [245, 245, 245] }))
);

console.log("Wrote placeholder icons to src/assets/*.png");
