import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://r3zon.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/legal/"],
        disallow: [
          "/dashboard",
          "/clientes",
          "/citas",
          "/tareas",
          "/finanzas",
          "/ocr",
          "/ajustes",
          "/rgpd",
          "/onboarding",
          "/2fa",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
