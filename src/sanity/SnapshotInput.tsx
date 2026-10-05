import type {ObjectInputProps} from "sanity";

/** Preserves domain snapshots with dynamic keys and union-valued preferences. */
export function SnapshotInput({value}: ObjectInputProps) {
  return (
    <div style={{border: "1px solid var(--card-border-color, #ddd)", borderRadius: 6, padding: 16}}>
      <p style={{marginTop: 0, fontSize: 13}}>Read-only evidence from the placement desk.</p>
      <pre style={{margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, lineHeight: 1.6, maxHeight: 420, overflow: "auto"}}>{JSON.stringify(value ?? null, null, 2)}</pre>
    </div>
  );
}
