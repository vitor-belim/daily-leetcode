import { Monogram, MONOGRAM_ROUNDED_CORNERS } from "@/components/og/monogram";
import { type IcoFrame, packIco } from "@/lib/ico";
import fs from "fs";
import { ImageResponse } from "next/og";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";

const APP_DIR = path.join(process.cwd(), "app");
const SVG_ICON_PATH = path.join(APP_DIR, "icon.svg");
const FAVICON_PATH = path.join(APP_DIR, "favicon.ico");
const SVG_ICON_SIZE = 32;
const FAVICON_SIZES = [16, 32, 48];

async function renderPng(size: number): Promise<Buffer> {
  const response = new ImageResponse(
    <Monogram size={size} cornerRadius={MONOGRAM_ROUNDED_CORNERS} />,
    { width: size, height: size },
  );
  return Buffer.from(await response.arrayBuffer());
}

async function main(): Promise<void> {
  try {
    const svg = renderToStaticMarkup(
      <Monogram size={SVG_ICON_SIZE} cornerRadius={MONOGRAM_ROUNDED_CORNERS} />,
    );
    fs.writeFileSync(SVG_ICON_PATH, `${svg}\n`);
    console.log(`Wrote ${path.relative(process.cwd(), SVG_ICON_PATH)}`);

    const frames: IcoFrame[] = await Promise.all(
      FAVICON_SIZES.map(async (size) => ({ size, png: await renderPng(size) })),
    );
    fs.writeFileSync(FAVICON_PATH, packIco(frames));
    console.log(
      `Wrote ${path.relative(process.cwd(), FAVICON_PATH)} (${FAVICON_SIZES.map((size) => `${size}px`).join(", ")})`,
    );
    process.exit(0);
  } catch (error) {
    console.error(
      "Error generating icons:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

main();
