import {HouseholdQuiz} from "@/components/household-quiz";
import { privatePageMetadata } from "../seo";

export const metadata = privatePageMetadata(
  "Your household",
  "A personal household application within the fictional Hearthafter experience. Answers are saved in this browser.",
);

export default function Page(){return <HouseholdQuiz/>;}
