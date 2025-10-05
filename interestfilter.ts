import {
    ALLOWED_TAGS,
    ALLOWED_TAG_STRINGS,
    CONTRADICTION_PAIRS,
    type Tag,
    type Place,
  } from "./data";
  import { callGeminiJSON } from "./interestfilter-llm";
  import {
    PROMPT_BASELINE,
    type PromptBuilder,
  } from "./prompts";
  import {
    parseInference,
    validateInference,
    type InferenceResult,
  } from "./validators";
  
  // Source of user preferences (manual selection vs AI inference)
  export type PrefSource = "manual" | "llm";
  
  // User's active preferences for filtering places
  export interface UserPreferences {
    userId: string;
    tags: Tag[];
    source: PrefSource;
  }
  
  // Raw AI inference data for transparency and audit trails
  export interface UserInferredPrefs extends Omit<InferenceResult, "tags" | "exclusions"> {
    userId: string;
    tags: Tag[];
    exclusions: Tag[];
    lastPrompt: string;
  }
  
  // Place matching result with relevance score
  export interface MatchResult {
    place: Place;
    score: number;
  }
  
  // Main InterestFilter class for managing user preferences and place matching
  export class InterestFilter {
    private userPreferences = new Map<string, UserPreferences>();
    private userInferredPrefs = new Map<string, UserInferredPrefs>();
    private placeTags = new Map<string, Set<Tag>>();
  
    constructor(seedPlaces: Place[] = []) {
      // Initialize place tags from seed data
      for (const p of seedPlaces) {
        this.placeTags.set(p.id, new Set(p.tags));
      }
    }
  
    // Set user preferences manually (source: "manual")
    setPreferences(userId: string, tags: Tag[]): void {
      if (!userId) throw new Error("setPreferences: userId is required.");
      if (!tags || tags.length === 0) throw new Error("setPreferences: tags must be non-empty.");
      for (const t of tags) {
        if (!ALLOWED_TAG_STRINGS.includes(t)) {
          throw new Error(`setPreferences: tag "${t}" is not in AllowedTags.`);
        }
      }
      this.userPreferences.set(userId, { userId, tags: dedupe(tags), source: "manual" });
    }
  
    // Use AI to infer preferences from natural language text (source: "llm")
    async inferPreferencesFromText(
      userId: string,
      text: string,
      opts?: {
        radius?: number;
        locationHint?: string;
        promptBuilder?: PromptBuilder;
        minTags?: number;
        maxTags?: number;
        advisoryConfidence?: number;
      }
    ): Promise<{ inference: UserInferredPrefs; needsConfirmation: boolean }> {
      if (!userId) throw new Error("inferPreferencesFromText: userId is required.");
      if (!text || !text.trim()) throw new Error("inferPreferencesFromText: text must be non-empty.");
  
      const builder = opts?.promptBuilder ?? PROMPT_BASELINE;
      const prompt = builder({
        text,
        allowedTags: ALLOWED_TAGS,
        radius: opts?.radius,
        locationHint: opts?.locationHint,
      });
  
      const raw = await callGeminiJSON(prompt);
      const parsed = parseInference(raw);
  
      // Validate AI response against business rules
      const { needsConfirmation } = validateInference(
        parsed,
        ALLOWED_TAG_STRINGS,
        CONTRADICTION_PAIRS,
        {
          minTags: opts?.minTags ?? 3,
          maxTags: opts?.maxTags ?? 7,
          advisoryConfidence: opts?.advisoryConfidence ?? 0.65,
        }
      );
  
      const tags = parsed.tags as Tag[];
      const exclusions = parsed.exclusions as Tag[];
  
      // Store both raw inference and active preferences
      const inference: UserInferredPrefs = {
        userId,
        tags,
        exclusions,
        confidence: parsed.confidence,
        rationale: parsed.rationale,
        warnings: parsed.warnings,
        lastPrompt: text,
      };
  
      this.userInferredPrefs.set(userId, inference);
      this.userPreferences.set(userId, { userId, tags, source: "llm" });
  
      return { inference, needsConfirmation };
    }
  
    // Add a tag to a specific place
    tagPlace(placeId: string, tag: Tag): void {
      if (!ALLOWED_TAG_STRINGS.includes(tag)) {
        throw new Error(`tagPlace: tag "${tag}" is not in AllowedTags.`);
      }
      const curr = this.placeTags.get(placeId) ?? new Set<Tag>();
      curr.add(tag);
      this.placeTags.set(placeId, curr);
    }
  
    // Remove all preferences for a user
    clearPreferences(userId: string): void {
      if (!userId) throw new Error("clearPreferences: userId is required.");
      this.userPreferences.delete(userId);
      this.userInferredPrefs.delete(userId);
    }
  
    // Find places that match user preferences, ranked by relevance score
    getMatchingPlaces(userId: string, places: Place[]): MatchResult[] {
      const prefs = this.userPreferences.get(userId);
      if (!prefs) throw new Error("getMatchingPlaces: no preferences set for user.");
  
      const inferred = this.userInferredPrefs.get(userId);
      const activeTags = prefs.tags;
      const exclusions = inferred?.exclusions ?? [];
  
      const results: MatchResult[] = places.map((p) => {
        const pTags = this.placeTags.get(p.id) ?? new Set<Tag>(p.tags);
        // Calculate overlap score between user preferences and place tags
        let score = activeTags.reduce((acc, t) => (pTags.has(t) ? acc + 1 : acc), 0);
        // Zero out score if place matches any excluded tags
        const excludedHit = exclusions.some((ex) => pTags.has(ex));
        if (excludedHit) score = 0;
  
        return { place: p, score };
      });
  
      return results
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score);
    }
  
    // Get user's current preferences
    getUserPreferences(userId: string): UserPreferences | undefined {
      return this.userPreferences.get(userId);
    }
  
    // Get raw AI inference data for transparency
    getUserInference(userId: string): UserInferredPrefs | undefined {
      return this.userInferredPrefs.get(userId);
    }
  
    // Get all tags associated with a place
    getPlaceTags(placeId: string): Tag[] {
      return Array.from(this.placeTags.get(placeId) ?? []);
    }
  }
  
  // Utility function to remove duplicate values from array
  function dedupe<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
  }