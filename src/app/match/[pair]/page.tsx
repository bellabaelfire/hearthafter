import {PairPage} from "@/components/matching-pages";
import { privatePageMetadata } from "../../seo";

export const metadata = privatePageMetadata(
  "Review an introduction",
  "A personal introduction review within the fictional Hearthafter experience, based on household answers saved in this browser.",
);

export default async function Page({params}:{params:Promise<{pair:string}>}){const {pair}=await params;return <PairPage pair={pair}/>;}
