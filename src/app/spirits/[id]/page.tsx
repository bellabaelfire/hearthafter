import type { Metadata } from "next";
import { SpiritProfilePage } from "@/components/spirit-pages";
import { createInitialHearthState } from "@/lib/hearth/fixtures";
import { privatePageMetadata, publicPageMetadata } from "../../seo";

type Props = { params: Promise<{ id: string }> };

// Only the published fictional cast has stable, indexable profile identities.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const spirit = createInitialHearthState().spirits.find(item => item.id === id);
  if (!spirit) {
    return privatePageMetadata(
      "Profile unavailable",
      "This spirit profile is not in Hearthafter's known public register.",
    );
  }
  return publicPageMetadata(
    `/spirits/${encodeURIComponent(spirit.id)}`,
    `${spirit.name} - Spirit profile | Hearthafter`,
    `Meet ${spirit.name} in Hearthafter's fictional spirit register. Explore their life story, everyday routines, home needs, and boundaries.`,
  );
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <SpiritProfilePage id={id} />;
}
