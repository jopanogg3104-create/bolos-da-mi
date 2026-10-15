import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return [
    "",
    "/bolos",
    "/monte-seu-bolo",
    "/referencias",
    "/sobre",
    "/contato",
    "/agenda",
    "/privacidade",
  ].map((p) => ({
    url: base + p,
    changeFrequency: "weekly",
    priority: p ? 0.7 : 1,
  }));
}
