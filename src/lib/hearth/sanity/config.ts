export const HEARTH_API_VERSION = '2026-10-02'
export const HEARTH_ARTWORK_ID = 'site'
export const DOCUMENT_TYPES = {
  artwork: 'hearthArtwork', spirits: 'hearthSpirit', homes: 'hearthHome', histories: 'hearthHistory',
  traits: 'hearthTrait', boundaries: 'hearthBoundary', pairRelationships: 'hearthPairRelationship',
  matchingPolicy: 'hearthMatchingPolicy', placements: 'hearthPlacement', events: 'hearthPlacementEvent',
} as const
const ID_PREFIXES: Record<string, string> = {
  hearthArtwork: 'ha-artwork', hearthSpirit: 'ha-spirit', hearthHome: 'ha-home', hearthHistory: 'ha-history',
  hearthTrait: 'ha-trait', hearthBoundary: 'ha-boundary', hearthPairRelationship: 'ha-pair',
  hearthMatchingPolicy: 'ha-policy', hearthPlacement: 'ha.placement', hearthPlacementEvent: 'ha.event',
}
export function hearthDocumentId(type: string, id: string) {
  const prefix = Object.hasOwn(ID_PREFIXES, type) ? ID_PREFIXES[type] : undefined
  if (!prefix || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id)) throw new Error('Invalid Hearthafter document identifier.')
  const documentId = `${prefix}-${id}`
  // Dots identify private document paths in Sanity, even in a public dataset.
  if (documentId.length > 128) throw new Error('Hearthafter document identifier is too long.')
  return documentId
}
function contentQuery(includeStaffRecords: boolean) { return `{
  "artwork": *[_type == "hearthArtwork" && id == "site"][0]{_id,_type,_rev,id,"heroUrl":hero.asset->url,"overlapUrl":overlap.asset->url,"portraitAtlasUrl":portraitAtlas.asset->url},
  "spirits": *[_type == "hearthSpirit"] | order(name asc),
  "homes": *[_type == "hearthHome"] | order(name asc),
  "histories": *[_type == "hearthHistory"],
  "traits": *[_type == "hearthTrait"],
  "boundaries": *[_type == "hearthBoundary"],
  "pairRelationships": *[_type == "hearthPairRelationship"],
  "matchingPolicy": *[_type == "hearthMatchingPolicy"][0],
  "placements": ${includeStaffRecords ? '*[_type == "hearthPlacement"] | order(updatedAt desc)' : '[]'},
  "events": ${includeStaffRecords ? '*[_type == "hearthPlacementEvent"] | order(at asc)' : '[]'}
}`
}
export const HEARTH_CONTENT_QUERY = contentQuery(true)
export const HEARTH_PUBLIC_CONTENT_QUERY = contentQuery(false)
