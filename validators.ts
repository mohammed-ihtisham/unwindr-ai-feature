import { z } from "zod";
import type { ContradictionPair } from "./data";

// Expected structure of AI inference response
export interface InferenceResult {
  tags: string[];
  exclusions: string[];
  confidence: number;
  rationale: string;
  warnings: string[];
}

// Zod schema for parsing AI responses
const InferenceSchema = z.object({
  tags: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  confidence: z.number(),
  rationale: z.string().default(""),
  warnings: z.array(z.string()).default([]),
});

// Remove duplicates while preserving order
function unique<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const v of arr) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

// Parse and validate raw AI response structure
export function parseInference(raw: unknown): InferenceResult {
  const parsed = InferenceSchema.parse(raw);
  return {
    tags: unique(parsed.tags),
    exclusions: unique(parsed.exclusions),
    confidence: parsed.confidence,
    rationale: parsed.rationale,
    warnings: parsed.warnings ?? [],
  };
}

// Ensure all tags are in the allowed whitelist
export function whitelistValidator(
  tags: string[],
  exclusions: string[],
  allowedTags: string[]
): void {
  const invalid = [...tags, ...exclusions].filter((t) => !allowedTags.includes(t));
  if (invalid.length) {
    throw new Error(
      `Whitelist violation: found non-allowed tags: ${invalid.join(", ")}`
    );
  }
}

// Validate tag count is within acceptable range
export function tagCountValidator(
  tags: string[],
  min = 3,
  max = 7
): void {
  if (tags.length < min || tags.length > max) {
    throw new Error(
      `Tag-count violation: expected between ${min} and ${max} tags, got ${tags.length}`
    );
  }
}

// Check for contradictory tag pairs
export function contradictionValidator(
  tags: string[],
  contradictionPairs: ContradictionPair[]
): void {
  const conflicts: string[] = [];
  for (const [a, b] of contradictionPairs) {
    if (tags.includes(a) && tags.includes(b)) {
      conflicts.push(`${a} vs ${b}`);
    }
  }
  if (conflicts.length) {
    throw new Error(
      `Contradiction violation: conflicting tags detected: ${conflicts.join("; ")}`
    );
  }
}

// Validate confidence score and check if above advisory threshold
export function confidenceValidator(
  confidence: number,
  advisoryThreshold = 0.65
): boolean {
  if (confidence < 0 || confidence > 1) {
    throw new Error(
      `Confidence violation: expected value in [0,1], got ${confidence}`
    );
  }
  return confidence >= advisoryThreshold;
}

// Run all validation checks on AI inference result
export function validateInference(
  result: InferenceResult,
  allowedTags: string[],
  contradictionPairs: ContradictionPair[],
  opts?: { minTags?: number; maxTags?: number; advisoryConfidence?: number }
): { needsConfirmation: boolean } {
  whitelistValidator(result.tags, result.exclusions, allowedTags);
  tagCountValidator(result.tags, opts?.minTags ?? 3, opts?.maxTags ?? 7);
  contradictionValidator(result.tags, contradictionPairs);
  const ok = confidenceValidator(result.confidence, opts?.advisoryConfidence ?? 0.65);
  return { needsConfirmation: !ok };
}
