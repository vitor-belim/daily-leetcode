import { collectFilledDates } from "@/lib/archive";
import { blogPath } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

type SitemapEntry = MetadataRoute.Sitemap[number];

export default function sitemap(): MetadataRoute.Sitemap {
  const dates = collectFilledDates();

  const home: SitemapEntry = {
    url: SITE_URL.href,
    changeFrequency: "daily",
    priority: 1,
  };
  const newest = dates.at(-1);
  if (newest !== undefined) home.lastModified = newest;

  const challenges = dates.map(
    (date): SitemapEntry => ({
      url: new URL(blogPath(date), SITE_URL).href,
      lastModified: date,
    }),
  );

  return [home, ...challenges];
}
