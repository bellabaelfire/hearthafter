import { SpiritsPage } from "@/components/spirit-pages";
import { publicPageMetadata } from "../seo";

export const metadata = publicPageMetadata(
  "/spirits",
  "The spirit register | Hearthafter",
  "Meet the fictional spirits in Hearthafter's public register. Browse their life stories, daily routines, shared interests, home needs, and personal boundaries.",
);

export default function Page() { return <SpiritsPage />; }
