"use client";

import {defineConfig} from "sanity";
import {structureTool} from "sanity/structure";
import {workflowDefaultDocumentNode, workflowStudioPlugin} from "@sanity/workflow-studio-plugin";
import HearthDeskTool from "./src/sanity/HearthDeskTool";
import {OpenPlacementDeskAction} from "./src/sanity/actions";
import {schemaTypes, protectedDocumentTypes, recordDocumentTypes, singletonDocumentTypes} from "./src/sanity/schemaTypes";
import {hearthStructure} from "./src/sanity/structure";
import {HEARTH_WORKFLOW_NAME, HEARTH_WORKFLOW_TAG} from "./src/lib/hearth/sanity/native-workflow";

// A syntactically valid placeholder permits offline schema inspection.
// The /desk page checks configuration before mounting the Studio.
export default defineConfig({
  name: "hearthafter",
  title: "HEARTHAFTER",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim() || "unconfigured",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production",
  basePath: "/desk",
  tools: (previous) => [{name: "placements", title: "Placement desk", component: HearthDeskTool}, ...previous],
  plugins: [
    structureTool({title: "Records", structure: hearthStructure, defaultDocumentNode: workflowDefaultDocumentNode()}),
    workflowStudioPlugin({
      tag: HEARTH_WORKFLOW_TAG,
      mappings: [{docType: "hearthPlacement", definition: HEARTH_WORKFLOW_NAME, label: "Placement readiness"}],
    }),
  ],
  schema: {
    types: schemaTypes,
    templates: (previous) => previous.filter((template) => !recordDocumentTypes.has(template.schemaType)),
  },
  document: {
    // Studio controls are UX; the API and dataset permissions enforce writes.
    actions: (previous, context) => {
      if (protectedDocumentTypes.has(context.schemaType)) return [OpenPlacementDeskAction];
      if (singletonDocumentTypes.has(context.schemaType)) return previous.filter((action) => !["duplicate", "delete", "unpublish"].includes(action.action || ""));
      return recordDocumentTypes.has(context.schemaType) ? previous.filter((action) => action.action !== "duplicate") : previous;
    },
    newDocumentOptions: (previous) => previous.filter((option) => !recordDocumentTypes.has(option.templateId)),
  },
});
