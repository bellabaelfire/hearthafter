"use client";
import type { ImageLoaderProps } from "next/image";

const offlineArtwork = new Set([
  "/art/hearthafter-hero.png",
  "/art/overlap-establishing.png",
  "/art/spirit-portraits-atlas.png",
]);

/** Images are fetched by the browser from Sanity; this is not a proxy endpoint. */
export default function sanityImageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (offlineArtwork.has(src)) return src;

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  if (!projectId || !/^[a-z0-9]+$/.test(projectId) || !/^[a-zA-Z0-9_-]+$/.test(dataset)) {
    throw new Error("Sanity image configuration is missing or invalid.");
  }
  let source: URL;
  try { source = new URL(src); } catch { throw new Error("Unsupported artwork source."); }
  const prefix = `/images/${projectId}/${dataset}/`;
  const asset = source.pathname.slice(prefix.length);
  if (
    source.protocol !== "https:" || source.hostname !== "cdn.sanity.io" || source.port ||
    source.username || source.password || source.search || source.hash ||
    !source.pathname.startsWith(prefix) ||
    !/^[a-f0-9]{40}-[1-9][0-9]*x[1-9][0-9]*\.(png|jpg|jpeg|webp|avif|gif)$/.test(asset)
  ) {
    throw new Error("Unsupported artwork source.");
  }
  if (!Number.isFinite(width) || width < 1 || (quality !== undefined && !Number.isFinite(quality))) {
    throw new Error("Invalid image dimensions or quality.");
  }
  source.searchParams.set("auto", "format");
  source.searchParams.set("fit", "max");
  source.searchParams.set("w", String(Math.min(1920, Math.max(1, Math.round(width)))));
  source.searchParams.set("q", String(Math.min(75, Math.max(1, Math.round(quality ?? 75)))));
  return source.href;
}

