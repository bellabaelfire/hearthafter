import { WorldPage } from "@/components/world-page";
import { publicPageMetadata } from "../seo";

export const metadata = publicPageMetadata(
  "/world",
  "Our peculiar world | Hearthafter",
  "Discover the fictional Overlap and Hearthafter's ground rules for sharing a home: voluntary introductions, departed company, privacy, and a kind way to leave.",
);

export default function WorldRoute() {
  return <WorldPage />;
}
