import { describe, expect, it } from "vitest";
import { buildZip, crc32 } from "../src/lib/zip";

const ascii = (s: string) => new TextEncoder().encode(s);
const u32 = (b: Uint8Array, off: number) =>
  (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
const u16 = (b: Uint8Array, off: number) => b[off] | (b[off + 1] << 8);

describe("crc32", () => {
  it("matches the standard check vector", () => {
    expect(crc32(ascii("123456789"))).toBe(0xcbf43926);
  });
  it("is 0 for empty input", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe("buildZip", () => {
  const zip = buildZip([
    { name: "a.txt", data: ascii("hello") },
    { name: "dir/b.bin", data: new Uint8Array([0, 255, 128]) },
  ]);

  it("starts with a local file header signature", () => {
    expect(u32(zip, 0)).toBe(0x04034b50);
  });
  it("uses STORE (method 0) and correct sizes in the first header", () => {
    expect(u16(zip, 8)).toBe(0); // compression method
    expect(u32(zip, 18)).toBe(5); // compressed size
    expect(u32(zip, 22)).toBe(5); // uncompressed size
    expect(u16(zip, 26)).toBe(5); // name length "a.txt"
  });
  it("stores the file bytes verbatim after the header", () => {
    const nameLen = u16(zip, 26);
    const body = zip.slice(30 + nameLen, 30 + nameLen + 5);
    expect(new TextDecoder().decode(body)).toBe("hello");
  });
  it("ends with an EOCD recording 2 entries", () => {
    const eocd = zip.length - 22;
    expect(u32(zip, eocd)).toBe(0x06054b50);
    expect(u16(zip, eocd + 10)).toBe(2); // total entries
  });
  it("central directory offset points at a central header", () => {
    const eocd = zip.length - 22;
    const cdOff = u32(zip, eocd + 16);
    expect(u32(zip, cdOff)).toBe(0x02014b50);
  });
});
