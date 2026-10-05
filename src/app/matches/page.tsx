import {MatchesPage} from "@/components/matching-pages";
import { privatePageMetadata } from "../seo";

export const metadata = privatePageMetadata(
  "Your household suggestions",
  "Personal suggestions based on the household answers saved in this browser for the fictional Hearthafter experience.",
);

export default function Page(){return <MatchesPage/>;}
