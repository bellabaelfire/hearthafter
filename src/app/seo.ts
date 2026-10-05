import type { Metadata } from "next";

export const SITE_URL = "https://hearthafter.homes";
export const HOME_TITLE = "Hearthafter | Good company. A place to haunt.";
export const SITE_DESCRIPTION =
  "Explore Hearthafter, a fictional service helping living households and departed residents share maintained homes after the Overlap. No spirit is placed alone.";

const shareImage = {
  url: `${SITE_URL}/art/hearthafter-hero.png`,
  width: 1672,
  height: 941,
  type: "image/png",
  alt: "Two departed residents welcomed onto a warmly lit porch by a living household at sunset",
};

export function publicPageMetadata(path: string, title: string, description: string): Metadata {
  const url = new URL(path, SITE_URL).toString();
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: "Hearthafter",
      type: "website",
      locale: "en_US",
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: shareImage.url, alt: shareImage.alt }],
    },
  };
}

export function privatePageMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: { index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true },
    alternates: { canonical: null },
    openGraph: null,
    twitter: null,
  };
}
