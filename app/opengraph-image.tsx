import {
  OG_IMAGE_CONTENT_TYPE,
  OG_IMAGE_SIZE,
  OgCard,
} from "@/components/og/og-card";
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { ImageResponse } from "next/og";

const TITLE = `${SITE_AUTHOR}'s challenge log`;

export const alt = `${SITE_NAME}: ${TITLE}`;
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    <OgCard title={TITLE} detail={SITE_DESCRIPTION} />,
    size,
  );
}
