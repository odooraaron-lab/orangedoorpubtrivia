import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// The public pages, for search engines. The portal and admin are behind a login and left out.
const PAGES = ["", "/contact-us"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
