import { InterestFilter } from "./interestfilter";
import {
  PLACES,
  ALLOWED_TAGS,
  ALLOWED_TAG_STRINGS,
  CONTRADICTION_PAIRS,
  type Place,
  type Tag
} from "./data";
import {
  PROMPT_BASELINE,
  PROMPT_CONTRACTIONS,
  PROMPT_FEWSHOT,
  type PromptBuilder
} from "./prompts";
import {
  parseInference,
  validateInference,
  type InferenceResult
} from "./validators";
import { callGeminiJSON } from "./interestfilter-llm";

// Display formatted section headers
function printHeader(title: string) {
  console.log("\n" + "=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
}

// Display AI inference results in readable format
function printInference(i: InferenceResult, needsConfirmation: boolean) {
  console.log("Inferred tags:    ", i.tags.join(", "));
  console.log("Exclusions:       ", i.exclusions.join(", ") || "—");
  console.log("Confidence:        ", i.confidence.toFixed(2));
  console.log("Rationale:        ", i.rationale);
  if (i.warnings?.length) console.log("Warnings:         ", i.warnings.join(" | "));
  if (needsConfirmation) {
    console.log("Low confidence — prompt user to confirm or edit these tags.");
  }
}

// Display matching places with relevance scores
function printMatches(matches: { place: Place; score: number }[]) {
  if (!matches.length) {
    console.log("\nNo matches found with current preferences.");
    return;
  }
  console.log("\nTop matches:");
  for (const m of matches) {
    console.log(` • ${m.place.name}  (score ${m.score})  [${m.place.tags.join(", ")}]`);
  }
}

// Run a complete LLM inference scenario and display results
async function runLLMScenario(opts: {
  title: string;
  userId: string;
  text: string;
  promptBuilder: PromptBuilder;
  radius?: number;
  locationHint?: string;
}) {
  const { title, userId, text, promptBuilder, radius, locationHint } = opts;
  printHeader(title);

  console.log("User input text:");
  console.log(`"${text}"`);
  console.log();

  const filter = new InterestFilter(PLACES);

  try {
    const prompt = promptBuilder({
      text,
      allowedTags: ALLOWED_TAGS,
      radius,
      locationHint
    });

    const raw = await callGeminiJSON(prompt);
    const inf = parseInference(raw);
    const { needsConfirmation } = validateInference(
      inf,
      ALLOWED_TAG_STRINGS,
      CONTRADICTION_PAIRS
    );

    await filter.inferPreferencesFromText(userId, text, {
      promptBuilder,
    });

    printInference(inf, needsConfirmation);

    const matches = filter.getMatchingPlaces(userId, PLACES);
    printMatches(matches);
  } catch (err: any) {
    console.error("Scenario error:", err?.message ?? String(err));
  }
}

// Test manual preference setting without AI
export async function testManualTagging() {
  console.log("\nTEST CASE 1: Manual Tagging");
  console.log("==========================");

  const filter = new InterestFilter(PLACES);
  
  const manualTags: Tag[] = ["quiet_spaces", "waterfront_views", "sunset_spots"];
  console.log("Setting manual preferences...");
  console.log("Manual tags chosen:", manualTags.join(", "));
  
  filter.setPreferences("u1", manualTags);
  
  const matches = filter.getMatchingPlaces("u1", PLACES);
  printMatches(matches);
}

// Test AI inference with natural language description
export async function testLLMInference() {
  await runLLMScenario({
    title: "TEST CASE 2: LLM-Assisted Tag Inference",
    userId: "u2",
    text: "quiet coastal sunset within 45 minutes of NYC, not crowded, somewhere calm by the water for reading",
    promptBuilder: PROMPT_BASELINE,
    radius: 45,
    locationHint: "NYC"
  });
}

// Test handling of contradictory user preferences
export async function testContradictionHandling() {
  await runLLMScenario({
    title: "TEST CASE 3: Contradiction Handling",
    userId: "u3",
    text: "I want a quiet place to read but also live music and lively nightlife around me",
    promptBuilder: PROMPT_CONTRACTIONS
  });
}

// Test AI understanding of casual/slang language
export async function testSlangyDescriptions() {
  await runLLMScenario({
    title: "TEST CASE 4: Slangy Descriptions",
    userId: "u4",
    text: "looking for tiktok-able cottagecore forests, mossy stone bridges, short drive",
    promptBuilder: PROMPT_FEWSHOT
  });
}

// Run all test cases in sequence
async function main() {
  console.log("InterestFilter Test Suite");
  console.log("========================\n");
  
  try {
    await testManualTagging();
    await testLLMInference();
    await testContradictionHandling();
    await testSlangyDescriptions();
    
    console.log("\nAll test cases completed successfully!");
    
  } catch (error) {
    console.error("Test error:", (error as Error).message);
    process.exit(1);
  }
}

// Run tests when file is executed directly
if (require.main === module) {
  main();
}
