import {
  OG_IMAGE_CONTENT_TYPE,
  OG_IMAGE_SIZE,
  OgCard,
} from "@/components/og/og-card";
import { type ArchivedDayParams, listArchivedDayParams } from "@/lib/archive";
import { formatLongDate } from "@/lib/date-display";
import { getProblem } from "@/lib/problems-repo";
import { SITE_NAME } from "@/lib/site";
import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

export const alt = `${SITE_NAME} card showing the challenge's title, difficulty and date`;
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const dynamicParams = false;

interface ProblemImageProps {
  params: Promise<ArchivedDayParams>;
}

export function generateStaticParams(): ArchivedDayParams[] {
  return listArchivedDayParams();
}

export default async function Image({ params }: ProblemImageProps) {
  const { year, month, day } = await params;
  const problem = await getProblem(year, month, day);
  if (!problem) notFound();

  return new ImageResponse(
    <OgCard
      title={problem.title}
      detail={formatLongDate(problem.date)}
      difficulty={problem.difficulty}
    />,
    size,
  );
}
