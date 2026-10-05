import type {StructureResolver} from "sanity/structure";
import {PLACEMENT_STATUS_LABELS} from "../lib/hearth/domain";
import {HEARTH_ARTWORK_ID, hearthDocumentId} from "../lib/hearth/sanity/config";

export const hearthStructure: StructureResolver = (S) =>
  S.list().title("Hearthafter records").items([
    S.listItem().id("placements").title("Placement queues").child(
      S.list().title("Placement queues").items(
        Object.entries(PLACEMENT_STATUS_LABELS).map(([status, title]) =>
          S.listItem().id(status).title(title).child(
            S.documentList().id(`placements-${status}`).title(title).schemaType("hearthPlacement")
              .filter('_type == "hearthPlacement" && status == $status').params({status})
              .defaultOrdering([{field: "updatedAt", direction: "desc"}]).initialValueTemplates([]),
          ),
        ),
      ),
    ),
    S.documentTypeListItem("hearthSpirit").title("Spirits & their stories"),
    S.documentTypeListItem("hearthHome").title("Fictional homes"),
    S.listItem().id("site-artwork").title("Site artwork").child(
      S.document().schemaType("hearthArtwork").documentId(hearthDocumentId("hearthArtwork", HEARTH_ARTWORK_ID)).title("Site artwork"),
    ),
    S.divider(),
    S.listItem().id("shared-records").title("Shared matching records").child(
      S.list().title("Shared matching records").items([
        S.documentTypeListItem("hearthHistory").title("Histories"),
        S.documentTypeListItem("hearthTrait").title("Traits"),
        S.documentTypeListItem("hearthBoundary").title("Boundaries"),
        S.documentTypeListItem("hearthPairRelationship").title("Pair relationships"),
        S.documentTypeListItem("hearthMatchingPolicy").title("Matching policy"),
      ]),
    ),
    S.listItem().id("audit").title("Placement audit trail").child(
      S.documentTypeList("hearthPlacementEvent").title("Placement audit trail")
        .defaultOrdering([{field: "at", direction: "desc"}]).initialValueTemplates([]),
    ),
  ]);
