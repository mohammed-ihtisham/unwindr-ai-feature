// Canonical set of interest tags that users can have and places can be tagged with
export type Tag =
  | "quiet_spaces"
  | "waterfront_views"
  | "nature_walks"
  | "sunset_spots"
  | "not_crowded"
  | "short_drive"
  | "instagram_worthy"
  | "lively_nightlife"
  | "live_music"
  | "historic_charms"
  | "family_friendly"
  | "coffee_nooks"
  | "scenic_overlook";

// Tag definition with human-readable description
export interface AllowedTag {
  tag: Tag;
  description: string;
}

// Place/location with associated tags
export interface Place {
  id: string;
  name: string;
  tags: Tag[];
}

// Pairs of tags that shouldn't coexist in user preferences
export type ContradictionPair = readonly [Tag, Tag];
// Complete list of allowed tags with descriptions for AI prompts
export const ALLOWED_TAGS: AllowedTag[] = [
  { tag: "quiet_spaces",       description: "calm, low-noise places for relaxing" },
  { tag: "waterfront_views",   description: "visible bodies of water nearby" },
  { tag: "nature_walks",       description: "walkable paths/trails in nature" },
  { tag: "sunset_spots",       description: "good west-facing sunset views" },
  { tag: "not_crowded",        description: "typically low foot traffic" },
  { tag: "short_drive",        description: "≈ within ~45 minutes by car" },
  { tag: "instagram_worthy",   description: "notably photogenic scenes" },
  { tag: "lively_nightlife",   description: "energetic evening venues/districts" },
  { tag: "live_music",         description: "scheduled musical performances" },
  { tag: "historic_charms",    description: "notable historic structures/areas" },
  { tag: "family_friendly",    description: "amenities suitable for families" },
  { tag: "coffee_nooks",       description: "cafés suited to lingering/reading" },
  { tag: "scenic_overlook",    description: "elevated viewpoint with vistas" }
];

// Sample places for testing and demonstration
export const PLACES: Place[] = [
  { id: "p1", name: "Larchmont Manor Park", tags: ["waterfront_views","quiet_spaces","nature_walks","sunset_spots","scenic_overlook"] },
  { id: "p2", name: "Harbor Lights Boardwalk", tags: ["waterfront_views","instagram_worthy","family_friendly"] },
  { id: "p3", name: "Riverside Jazz Nights", tags: ["live_music","lively_nightlife","waterfront_views"] },
  { id: "p4", name: "Maplewood Reading Garden", tags: ["quiet_spaces","coffee_nooks"] },
  { id: "p5", name: "Old Mill Stone Bridge", tags: ["historic_charms","instagram_worthy","nature_walks","scenic_overlook"] }
];

// Tag pairs that represent contradictory preferences
export const CONTRADICTION_PAIRS: ContradictionPair[] = [
  ["quiet_spaces","lively_nightlife"],
  ["quiet_spaces","live_music"]
] as const;

// Convenience array for validation (just the tag strings)
export const ALLOWED_TAG_STRINGS: Tag[] = ALLOWED_TAGS.map(t => t.tag);
