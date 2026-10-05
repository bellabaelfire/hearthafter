import type { Metadata } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import {HearthProvider} from "@/components/hearth-provider";
import { HOME_TITLE, SITE_DESCRIPTION, SITE_URL } from "./seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_TITLE, template: "%s | Hearthafter" },
  description: SITE_DESCRIPTION,
  robots: { index: true, follow: true },
};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><HearthProvider>{children}</HearthProvider></body></html>; }
