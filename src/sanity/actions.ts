import type {DocumentActionComponent} from "sanity";

export const OpenPlacementDeskAction: DocumentActionComponent = (props) => {
  const record = props.published ?? props.draft;
  const value = props.type === "hearthPlacementEvent" ? record?.placementId : record?.id;
  const placementId = typeof value === "string" ? value : "";
  return {
    label: "Open placement desk",
    disabled: !placementId,
    onHandle: () => {
      if (placementId) window.location.assign(`/desk/placements?placement=${encodeURIComponent(placementId)}`);
      props.onComplete();
    },
  };
};
