import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://r3zon.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const publicPaths = [
    "",
    "/login",
    "/registro",
    "/legal/privacidad",
    "/legal/cookies",
    "/legal/terminos",
    "/legal/aviso-legal",
  ];
  return publicPaths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.6,
  }));
}
