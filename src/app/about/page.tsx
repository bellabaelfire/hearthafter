import {AboutPage} from "@/components/about-page";
import { publicPageMetadata } from "../seo";

export const metadata = publicPageMetadata(
  "/about",
  "About this service | Hearthafter",
  "Learn how Hearthafter's fictional service works, how household answers stay in your browser, and how the linked registry supports voluntary introductions.",
);

export default function Page(){return <AboutPage/>;}
