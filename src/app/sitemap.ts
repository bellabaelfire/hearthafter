import type { MetadataRoute } from "next";
import { createInitialHearthState } from "@/lib/hearth/fixtures";
import { SITE_URL } from "./seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/world", "/about", "/spirits"];
  const profiles = createInitialHearthState().spirits.map(
    spirit => `/spirits/${encodeURIComponent(spirit.id)}`,
  );
  // No invented modification dates: the registry does not expose them here.
  return [...pages, ...profiles].map(path => ({
    url: new URL(path, SITE_URL).toString(),
  }));
}
