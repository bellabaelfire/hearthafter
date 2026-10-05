import {PlacementPage} from "@/components/placement-page";
import { privatePageMetadata } from "../../seo";

export const metadata = privatePageMetadata(
  "Your placement review",
  "A fictional placement review and its decisions, saved in this browser as part of your Hearthafter visit.",
);

export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return <PlacementPage id={id}/>;
}
