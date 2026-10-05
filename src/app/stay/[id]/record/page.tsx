import {CaseRecordPage} from "@/components/case-record";
import { privatePageMetadata } from "../../../seo";

export const metadata = privatePageMetadata(
  "Placement case record",
  "A personal case record for a fictional Hearthafter placement, using the decisions saved in this browser.",
);

export default async function Page({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  return <CaseRecordPage id={id}/>;
}
