"use client";

import {NextStudio} from "next-sanity/studio";
import config from "../../sanity.config";

export default function HearthStudio() {
  return <div style={{position: "fixed", inset: 0, zIndex: 100, overflow: "auto"}}><NextStudio config={config} /></div>;
}
