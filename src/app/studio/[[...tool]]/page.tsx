import {redirect} from "next/navigation";
import { privatePageMetadata } from "../../seo";

export const metadata = privatePageMetadata(
  "Staff studio",
  "The staff studio for the fictional Hearthafter registry.",
);

export default function StudioAliasPage() {
  redirect("/desk");
}
