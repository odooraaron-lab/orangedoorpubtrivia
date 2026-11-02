import type { MetadataRoute } from "next";

// The portal is private: ask every search engine to stay out of the whole site.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
