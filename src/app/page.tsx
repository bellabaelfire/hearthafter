import { HomePage } from "@/components/home-page";
import { HOME_TITLE, SITE_DESCRIPTION, publicPageMetadata } from "./seo";

export const metadata = publicPageMetadata("/", HOME_TITLE, SITE_DESCRIPTION);

export default function Page(){return <HomePage/>}
