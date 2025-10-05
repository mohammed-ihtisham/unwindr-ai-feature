import type { AllowedTag } from "./data";

// Context passed to prompt builders
export interface PromptContext {
  text: string;
  allowedTags: AllowedTag[];
  radius?: number;
  locationHint?: string;
}

// Function that builds a complete prompt string from context
export type PromptBuilder = (ctx: PromptContext) => string;

// Convert allowed tags to JSON format for AI prompts
function allowedTagsTable(allowed: AllowedTag[]): string {
  const rows = allowed.map(({ tag, description }) => ({ tag, description }));
  return JSON.stringify(rows, null, 2);
}

// Basic prompt with strict JSON output requirements
export const PROMPT_BASELINE: PromptBuilder = ({
  text,
  allowedTags,
  radius,
  locationHint
}) => `
You map a user's natural-language request to a STRICT whitelist of canonical interest tags.

Return STRICT JSON ONLY (no prose) with this schema:
{
  "tags": string[],         // subset of allowed tags (3-7 items)
  "exclusions": string[],   // subset of allowed tags the user wants to avoid (0-3 items)
  "confidence": number,     // 0.0 - 1.0
  "rationale": string,      // one short sentence explaining why these tags fit
  "warnings": string[]      // optional notes (e.g., ambiguity)
}

Rules:
- Do NOT invent tags. Only use tags from the Allowed Tags table below.
- Prefer 4-6 tags unless the user gave very little information.
- Respect negations like "not crowded" by adding appropriate exclusions.
- Consider constraints if provided (radius/location), but do not output anything except the JSON object.
- Avoid logically contradictory tags (e.g., "quiet_spaces" vs "lively_nightlife").

Allowed Tags (canonical list with short meanings):
${allowedTagsTable(allowedTags)}

User text:
"""${text}"""

Constraints:
${JSON.stringify({ radius, locationHint })}
`;

// Few-shot prompt with examples to improve AI consistency
export const PROMPT_FEWSHOT: PromptBuilder = ({
  text,
  allowedTags,
  radius,
  locationHint
}) => `
You convert free-text "vibe" descriptions into STRICT canonical tags.

OUTPUT FORMAT: JSON only, matching this schema:
{"tags":[], "exclusions":[], "confidence":0.0, "rationale":"", "warnings":[]}

Examples (follow exactly):
Input: "aesthetic forests, cute old bridge"
Output: {"tags":["instagram_worthy","nature_walks","historic_charms"],"exclusions":[],"confidence":0.78,"rationale":"Photogenic + forest path + historic bridge.","warnings":[]}

Input: "reading by the water at sunset, not crowded"
Output: {"tags":["quiet_spaces","waterfront_views","sunset_spots"],"exclusions":["lively_nightlife"],"confidence":0.84,"rationale":"Quiet + waterfront + sunset; avoids nightlife/crowds.","warnings":[]}

Guidelines:
- Use ONLY the Allowed Tags list below; never invent new tags.
- Return 3-7 tags that best capture the user's intent.
- If the text implies an avoidance (e.g., "not crowded"), add an exclusion tag when appropriate.
- If the text is sparse, choose fewer, higher-confidence tags.

Allowed Tags:
${allowedTagsTable(allowedTags)}

User text:
"""${text}"""

Constraints:
${JSON.stringify({ radius, locationHint })}
`;

// Prompt specialized for handling contradictory user preferences
export const PROMPT_CONTRACTIONS: PromptBuilder = ({
  text,
  allowedTags,
  radius,
  locationHint
}) => `
Task: Map the user's text to canonical tags from the Allowed Tags list. Return STRICT JSON only.

Schema:
{"tags":[], "exclusions":[], "confidence":0.0, "rationale":"", "warnings":[]}

Policy for contradictions:
- If the text clearly favors one side (e.g., "quiet, calm, peaceful" vs "maybe some music"),
  choose the stronger side and omit the conflicting tag.
- If emphasis is truly balanced, prefer fewer tags and add a warning about the ambiguity,
  and reduce confidence accordingly.

Other rules:
- Only use tags from the Allowed Tags list; never invent tags.
- Prefer 4-6 tags when possible; keep output concise.

Allowed Tags:
${allowedTagsTable(allowedTags)}

User text:
"""${text}"""

Constraints:
${JSON.stringify({ radius, locationHint })}
`;

// Collection of all available prompt builders
export const PROMPTS = {
  baseline: PROMPT_BASELINE,
  fewshot: PROMPT_FEWSHOT,
  contradictions: PROMPT_CONTRACTIONS
};
