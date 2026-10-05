import type {PairRelationship} from "../domain";

type GuidanceEdit = (status: PairRelationship["status"]) => Promise<{submitted: () => Promise<unknown>}>;

/** SDK edits first resolve optimistically. A saved message requires server acceptance. */
export async function persistPairingGuidance(edit: GuidanceEdit, status: PairRelationship["status"]): Promise<void> {
  const result = await edit(status);
  await result.submitted();
}
