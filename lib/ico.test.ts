import { describe, it, expect } from "vitest";
import { packIco } from "./ico";

describe("packIco", () => {
  // Stand-in PNG payloads: packIco never decodes them, so distinct byte runs
  // of different lengths are enough to check placement and offsets.
  const small = Buffer.from([1, 2, 3]);
  const large = Buffer.from([4, 5, 6, 7, 8]);

  it("writes an icon directory header with the frame count", () => {
    const ico = packIco([
      { size: 16, png: small },
      { size: 32, png: large },
    ]);

    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(2);
  });

  it("describes each frame in its directory entry", () => {
    const ico = packIco([
      { size: 16, png: small },
      { size: 48, png: large },
    ]);

    // Entries start right after the 6-byte header, 16 bytes each.
    const second = 6 + 16;
    expect(ico.readUInt8(second)).toBe(48);
    expect(ico.readUInt8(second + 1)).toBe(48);
    expect(ico.readUInt8(second + 2)).toBe(0);
    expect(ico.readUInt8(second + 3)).toBe(0);
    expect(ico.readUInt16LE(second + 4)).toBe(1);
    expect(ico.readUInt16LE(second + 6)).toBe(32);
    expect(ico.readUInt32LE(second + 8)).toBe(large.length);
  });

  it("lays the PNG data out back to back after the directory, at the offsets the entries record", () => {
    const ico = packIco([
      { size: 16, png: small },
      { size: 32, png: large },
    ]);

    const dataStart = 6 + 16 * 2;
    expect(ico.readUInt32LE(6 + 12)).toBe(dataStart);
    expect(ico.readUInt32LE(6 + 16 + 12)).toBe(dataStart + small.length);
    expect(ico.subarray(dataStart)).toEqual(Buffer.concat([small, large]));
    expect(ico.length).toBe(dataStart + small.length + large.length);
  });

  it("encodes a 256px frame with the format's 0 size byte", () => {
    const ico = packIco([{ size: 256, png: small }]);

    expect(ico.readUInt8(6)).toBe(0);
    expect(ico.readUInt8(7)).toBe(0);
  });

  it("rejects an empty frame list", () => {
    expect(() => packIco([])).toThrow("at least one frame");
  });

  it.each([0, 257, 16.5])("rejects a frame size of %d", (size) => {
    expect(() => packIco([{ size, png: small }])).toThrow(
      "Invalid ICO frame size",
    );
  });
});
