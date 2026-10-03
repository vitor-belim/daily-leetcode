/** One square, PNG-encoded image inside an ICO file. */
export interface IcoFrame {
  /** Width and height in pixels, from 1 to 256. */
  size: number;
  /** The frame's PNG bytes. */
  png: Buffer;
}

const ICON_DIR_BYTES = 6;
const ICON_DIR_ENTRY_BYTES = 16;
const ICON_RESOURCE_TYPE = 1;
const COLOR_PLANES = 1;
const BITS_PER_PIXEL = 32;
const MAX_FRAME_SIZE = 256;

/**
 * Packs PNG frames into a Windows ICO container, the format browsers fetch
 * from `/favicon.ico`. Every frame is stored as PNG data, which ICO has
 * allowed since Windows Vista and every current browser reads, so no bitmap
 * conversion is needed. A 256px frame is written with the format's `0` size
 * byte, since a single byte cannot hold 256.
 *
 * @param frames The frames to pack, typically several sizes of one image, in
 *   the order they should appear in the directory.
 * @returns The bytes of the `.ico` file: the icon directory, one entry per
 *   frame, then each frame's PNG data in order.
 * @throws When `frames` is empty or a frame's size is not an integer from 1
 *   to 256.
 */
export function packIco(frames: IcoFrame[]): Buffer {
  if (frames.length === 0) {
    throw new Error("An ICO file needs at least one frame");
  }
  for (const { size } of frames) {
    if (!Number.isInteger(size) || size < 1 || size > MAX_FRAME_SIZE) {
      throw new Error(
        `Invalid ICO frame size ${size}; expected an integer from 1 to ${MAX_FRAME_SIZE}`,
      );
    }
  }

  const header = Buffer.alloc(ICON_DIR_BYTES);
  header.writeUInt16LE(ICON_RESOURCE_TYPE, 2);
  header.writeUInt16LE(frames.length, 4);

  const dataStart = ICON_DIR_BYTES + ICON_DIR_ENTRY_BYTES * frames.length;
  const entries = frames.map((frame, index) => {
    const offset = frames
      .slice(0, index)
      .reduce((total, previous) => total + previous.png.length, dataStart);
    const entry = Buffer.alloc(ICON_DIR_ENTRY_BYTES);
    entry.writeUInt8(frame.size % MAX_FRAME_SIZE, 0);
    entry.writeUInt8(frame.size % MAX_FRAME_SIZE, 1);
    entry.writeUInt16LE(COLOR_PLANES, 4);
    entry.writeUInt16LE(BITS_PER_PIXEL, 6);
    entry.writeUInt32LE(frame.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    return entry;
  });

  return Buffer.concat([header, ...entries, ...frames.map((f) => f.png)]);
}
