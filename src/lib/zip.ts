/**
 * Minimal ZIP writer, STORE method only. WAV data doesn't compress
 * meaningfully, so storing keeps this dependency-free and byte-testable.
 */

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Fixed DOS timestamp (2026-08-24 00:00) keeps output deterministic.
const DOS_DATE = ((2026 - 1980) << 9) | (8 << 5) | 24;
const DOS_TIME = 0;

class ByteWriter {
  private chunks: Uint8Array[] = [];
  length = 0;
  u16(v: number): void {
    this.push(new Uint8Array([v & 0xff, (v >>> 8) & 0xff]));
  }
  u32(v: number): void {
    this.push(
      new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]),
    );
  }
  push(b: Uint8Array): void {
    this.chunks.push(b);
    this.length += b.length;
  }
  bytes(): Uint8Array {
    const out = new Uint8Array(this.length);
    let off = 0;
    for (const c of this.chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out;
  }
}

export function buildZip(entries: ZipEntry[]): Uint8Array {
  const w = new ByteWriter();
  const central: { name: Uint8Array; crc: number; size: number; offset: number }[] = [];
  const enc = new TextEncoder();

  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.data);
    central.push({ name, crc, size: e.data.length, offset: w.length });
    w.u32(0x04034b50); // local file header
    w.u16(20); // version needed
    w.u16(0); // flags
    w.u16(0); // method: STORE
    w.u16(DOS_TIME);
    w.u16(DOS_DATE);
    w.u32(crc);
    w.u32(e.data.length); // compressed
    w.u32(e.data.length); // uncompressed
    w.u16(name.length);
    w.u16(0); // extra length
    w.push(name);
    w.push(e.data);
  }

  const cdStart = w.length;
  for (const c of central) {
    w.u32(0x02014b50); // central directory header
    w.u16(20);
    w.u16(20);
    w.u16(0);
    w.u16(0);
    w.u16(DOS_TIME);
    w.u16(DOS_DATE);
    w.u32(c.crc);
    w.u32(c.size);
    w.u32(c.size);
    w.u16(c.name.length);
    w.u16(0);
    w.u16(0);
    w.u16(0);
    w.u16(0);
    w.u32(0);
    w.u32(c.offset);
    w.push(c.name);
  }
  const cdSize = w.length - cdStart;

  w.u32(0x06054b50); // EOCD
  w.u16(0);
  w.u16(0);
  w.u16(central.length);
  w.u16(central.length);
  w.u32(cdSize);
  w.u32(cdStart);
  w.u16(0);
  return w.bytes();
}
