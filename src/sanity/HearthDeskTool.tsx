"use client";

import {lazy, Suspense} from "react";

const HearthDesk = lazy(() => import("./HearthDesk"));

export default function HearthDeskTool() {
  return <Suspense fallback={<div style={{padding: 32}}>Opening the placement desk…</div>}><HearthDesk /></Suspense>;
}
