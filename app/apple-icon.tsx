import { Monogram, MONOGRAM_SQUARE_CORNERS } from "@/components/og/monogram";
import {
  OG_IMAGE_CONTENT_TYPE,
  type OgImageSize,
} from "@/components/og/og-card";
import { ImageResponse } from "next/og";

export const size: OgImageSize = { width: 180, height: 180 };
export const contentType = OG_IMAGE_CONTENT_TYPE;

export default function AppleIcon() {
  return new ImageResponse(
    <Monogram size={size.width} cornerRadius={MONOGRAM_SQUARE_CORNERS} />,
    size,
  );
}
