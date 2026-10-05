import {VisitsPage} from "@/components/visits-page";
import { privatePageMetadata } from "../seo";

export const metadata = privatePageMetadata(
  "Your saved cases",
  "Return to the fictional Hearthafter cases saved in this browser during your visit.",
);

export default function Page(){return <VisitsPage/>;}
