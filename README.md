# Assignment 3 — An AI-Augmented Concept

## Unwindr - Place Discovery with AI-Augmented Interest Filtering
This implementation focuses on the core concept of discovering places through AI-augmented interest filtering, allowing users to express their preferences in natural language and automatically filter places to match their desires.

## Concept Selection
I’m augmenting `InterestFilter` because users naturally describe what they want in messy language (“quiet coastal sunset spot, not crowded”) rather than picking tags. An LLM can map these descriptions into a curated tag ontology (e.g., quiet_spaces, waterfront_views) and add justification + confidence, while the original manual tagging flow still works when AI is off.

## Specifications

### Original Concept (unchanged):
```markdown
concept  InterestFilter [User, Place]
purpose allow users to express their interests so places can be filtered to match their preferences
principle users pick preference tags, and only matching places are shown to minimize irrelevant options

state
  a set of UserPreferences with
    a user User
    a tags set String
  
  a set of PlaceTags with
    a place Place
    a tags set String

actions
  setPreferences (user: User, tags: set String)
    requires user is authenticated and tags is not empty
    effect updates user's selected interest tags
  
  tagPlace (place: Place, tag: String)
    requires place exists and tag is valid
    effect associates tag with place
  
  getMatchingPlaces (user: User, places: set Place) : (matches: set Place)
    requires user has preferences set
    effect filters places by overlapping tags with user preferences
```

### AI-Augmented Concept:
```markdown
concept InterestFilter [User, Place]
purpose allow users to express their interests so places can be filtered to match their preferences
principle users pick interest tags that represent what they are looking for, or can describe their
  desired “vibe” or activity, which gets translated into interest tags by LLMs, so places can be
  filtered to match their preferences

state
  a set of AllowedTags with
    a tag String
    a description String

  a set of UserPreferences with
    a user User
    a tags set of Strings
    a source String // "manual" or "llm"

  a set of UserInferredPrefs with
    a user User
    a tags set of Strings
    an exclusions set of Strings
    a confidence Number
    a rationale String
    a lastPrompt String

  a set of PlaceTags with
    a place Place
    a tags set of Strings

actions
  setPreferences (user: User, tags: set String)
    requires user is authenticated and tags is not empty
    effect saves or updates the user’s preferences with the given tags and marks them as "manual"

  inferPreferencesFromText (user: User, text: String, radius: optional Number, locationHint: optional String)
    requires user is authenticated and text is not empty
    effect calls an AI model to interpret the text and suggest tags and optional exclusions,
      records confidence and rationale, stores them in UserInferredPrefs,
      and updates UserPreferences with source = "llm" and the inferred tags

  tagPlace (place: Place, tag: String)
    requires place exists and tag in AllowedTags
    effect associates the tag with the place in PlaceTags

  clearPreferences (user: User)
    requires user is authenticated
    effect removes all UserPreferences and UserInferredPrefs for the user

  getMatchingPlaces (user: User, places: set Place) : (matches: set Place)
    requires user has either manual or llm preferences
    effect returns places whose tags overlap most strongly with the user’s preferred tags,
      down-ranking places that match excluded tags

validators
  whitelistValidator (tags: set String, exclusions: set String) (valid: Flag)
    ensures every tag is in AllowedTags

  tagCountValidator (tags: set String) : (valid: Flag)
    ensures the number of tags is between 3 and 7

  contradictionValidator (tags: set String) : (valid: Flag)
    ensures conflicting tag pairs (e.g., quiet_spaces vs lively_nightlife) are not both present

  confidenceValidator (confidence: Number) : (valid: Flag)
    ensures 0 ≤ confidence ≤ 1; if low, prompt user to confirm or edit

# New Sync
sync aiPreferencesInferred
when InterestFilter.inferPreferencesFromText (user, text, radius, locationHint) succeeds
then InterestFilter.getMatchingPlaces (user, getVisiblePlaces())
```

## UI Sketches

### Filter & Results Sidebar — Personalized Discovery
![Note Sep 28, 2027](https://github.com/user-attachments/assets/c3eabc5f-d254-47a0-b8f7-0b58e9f99a02)

### User Input & Smart Discovery — LLM-Assisted Personalization
![IMG_49D6DA32787B-1](https://github.com/user-attachments/assets/4875b777-77e4-423f-92f3-238c7ecf39bd)

### Conflict Resolution Modal — Smart Tag Disambiguation
![Note Sep 28, 2028](https://github.com/user-attachments/assets/b3818395-753c-4faf-91fa-371546360f6c)

### User Input & Smart Discovery — Manual Tag Selection
![IMG_59027D47D081-1 2](https://github.com/user-attachments/assets/bd2658f1-e150-41ea-b8e4-83f873ecb7b5)

## Tag Builder Modal — Guided Tag Creation & Selection
![IMG_03DAEA630CE8-1 2](https://github.com/user-attachments/assets/8c8a77de-b7f1-4b13-9b73-7edef669091b)

**User journey**: The user wants to narrow down their place options to areas that they might be interested in exploring so they click on the `Interests` button. The user has the option to input  a description of what they are looking for and letting the LLM generate relevant tags to filter places or click `Manually Add Tags` to manually choose the tags themselves. The user decides to use the LLM option and inputs "I want a quiet place to read but also live music and lively nightlife around me" and clicks the `Apply` button. Since quiet and live music are conflicting, the website generates an alert to the user asking them to select one of the two conflicting tags and apply the filter. If the user wants, they can click `Edit` or `Back` to revise their description but in this cases chooses to Click `Quiet` and then the `Apply` Button. The interactive map and options in the `Filter & Results Sidebar — Personalized Discovery` UI view update with the filtered options in descending order from the places that match the user's interests the most to the least. The user wants to conduct another search, so they click on the `Interests` button again but this time, it brings them to the `User Input & Smart Discovery — Manual Tag Selection` view with colored tags for their previous search. The user can click the `Let us find your vibe` option to filter similar to before but instead clicks `Add Tag` to manually update the filter. They go through the selected tags, adding and removing filters as desired from the list of valid tags, before clicking the `Apply` option once more. 

## Explore Richer Test Cases and Prompts

### Test Case 1 — Typical Intent (Baseline Success)

**Note:** The prompts variants mentioned in these experiments/test cases were updated to get the final versions in `prompts.ts`.

**Scenario:** The user opens Interests → AI-assisted and enters: “quiet coastal sunset within 45 minutes of NYC, not crowded, somewhere calm by the water for reading.” The system calls inferPreferencesFromText(user, text, radius=45, locationHint="NYC"). The LLM returns tags like quiet_spaces, waterfront_views, sunset_spots, not_crowded, short_drive, coffee_nooks with high confidence (~0.90). Validators pass (whitelist, tag count, contradictions, confidence), and getMatchingPlaces ranks Larchmont Manor Park highest (score 3), followed by Maplewood Reading Garden (2), Harbor Lights Boardwalk (1), and Riverside Jazz Nights (1).

**Prompt variants:**
- V1: PROMPT_BASELINE (strict JSON + whitelist)

- V2: PROMPT_FEWSHOT (same schema, adds two examples)

- V3: PROMPT_BASELINE + one-line exclusion hint (temporary tweak: add a single instruction line encouraging an exclusion when the text says “not crowded”)

**Analysis:** PROMPT_BASELINE consistently produced 5–6 canonical tags with clear rationale and high confidence, yielding sensible matches. PROMPT_FEWSHOT didn’t materially change the tags for this clean query but slightly improved explanation phrasing and stability across runs. The optional “baseline + exclusion hint” tweak encouraged the model to emit an explicit exclusion (e.g., avoiding nightlife) in addition to not_crowded, which can help down-rank borderline venues. The only remaining quirk is that some runs still express “not crowded” only as a positive tag; a tiny post-processor could convert frequent negations into exclusions reliably.

### Test Case 2 — Contradictory Intent (Conflict Handling)

**Scenario:** The user enters: “I want a quiet place to read but also live music and lively nightlife around me.” The system calls inferPreferencesFromText(user, text). In this run, the LLM returned conflicting tags and the contradiction validator threw a hard error: Contradiction violation: conflicting tags detected: quiet_spaces vs lively_nightlife; quiet_spaces vs live_music. The driver prints the error (modeling a UI modal) and would then prompt the user to pick a priority (e.g., “quiet” vs “live music/nightlife”) before re-running inference with that emphasis.

**Prompt variants:**
- V1: PROMPT_BASELINE (intentionally likely to produce a contradiction to exercise guardrails)

- V2: PROMPT_CONTRACTIONS (adds policy to prefer the stronger side or lower confidence if ambiguous)

- V3: PROMPT_CONTRACTIONS + appended user emphasis (e.g., “prioritize quiet, avoid nightlife/live music”)

**Analysis:** This scenario confirms the guardrails work as intended: PROMPT_BASELINE triggers a contradiction error, preventing conflicting preferences like “quiet” and “lively nightlife” from being stored. PROMPT_CONTRACTIONS reduces failures by favoring one dominant intent (usually “quiet”) and lowering confidence when ambiguity remains, while adding a short user emphasis (e.g., “prioritize quiet”) resolves conflicts entirely. The main limitation is that genuinely mixed goals—like quiet reading and live music—would require a more expressive, multi-context concept beyond this assignment’s scope.

### Test Case 3 — Slang/Aesthetic Input (Robust Mapping)

**Scenario:** The user enters: “tiktok-able cottagecore forests, mossy stone bridges, short drive.” The system calls inferPreferencesFromText(user, text). The LLM maps slang to canonical tags—instagram_worthy for “tiktok-able/cottagecore,” nature_walks for forests, historic_charms for stone bridges—often including short_drive. Validators pass with high confidence (~0.88). getMatchingPlaces ranks Old Mill Stone Bridge first (score 3), then Larchmont Manor Park and Harbor Lights Boardwalk (1 each).

**Prompt variants:**
- V1: PROMPT_BASELINE

- V2: PROMPT_FEWSHOT (two tiny examples to stabilize aesthetic → tag mappings)

- V3: PROMPT_BASELINE + one-line glossary hint (temporary tweak: “Treat ‘tiktok-able’, ‘aesthetic’, ‘instagrammable’ as instagram_worthy”)
  
**Analysis:** This test confirms the whitelist + strict JSON approach handles trend-driven language well when paired with minimal context. PROMPT_FEWSHOT delivered the most consistent outputs, preventing omissions like historic_charms and avoiding redundant visual tags, while keeping confidence high and hallucinations at zero. The “baseline + glossary hint” tweak worked, but it requires ongoing curation as slang evolves and so the few-shot approach is more maintainable.

## Validators

LLMs can produce subtle logical errors even when prompts are clear, so several validators were added to maintain reliability and interpretability. The whitelist validator ensures every tag and exclusion comes from the predefined AllowedTags, preventing the model from hallucinating or inventing new labels. The contradiction validator checks for known conflicting pairs like quiet_spaces versus lively_nightlife, blocking incoherent tag combinations before they reach the user interface. The tag count validator keeps the model’s output between three and seven tags, balancing precision and breadth so the results remain meaningful. Finally, the confidence validator verifies that confidence values stay within [0,1] and flags low-confidence outputs for user confirmation, maintaining a safe boundary between automation and human oversight. Together these checks form a lightweight but effective guardrail system that keeps AI-driven personalization trustworthy and explainable.


---
# Setting up Repository

## Prerequisites

- **Node.js** (version 14 or higher)
- **TypeScript** (will be installed automatically)
- **Google Gemini API Key** (free at [Google AI Studio](https://makersuite.google.com/app/apikey))

## Quick Setup

### 0. Clone the repo locally and navigate to it
```bash
cd unwindr-ai-feature
```

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Your API Key

**Why use a template?** The `config.json` file contains your private API key and should never be committed to version control. The template approach lets you:
- Keep the template file in git (safe to share)
- Create your own `config.json` locally (keeps your API key private)
- Easily set up the project on any machine

**Step 1:** Copy the template file:
```bash
cp config.json.template config.json
```

**Step 2:** Edit `config.json` and add your API key:
```json
{
  "apiKey": "YOUR_GEMINI_API_KEY_HERE"
  "model": "gemini-2.5-flash-lite",
  "maxOutputTokens": 256,
  "timeoutMs": 20000
}
```

**To get your API key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it into `config.json` (replacing `YOUR_GEMINI_API_KEY_HERE`)

### 3. Run the Application

**Run all test cases:**
```bash
npm start
```

**Run specific test cases:**
```bash
npm run test       # Run comprehensive test suite
npm run build      # Compile TypeScript to JavaScript
```

## File Structure

```
unwindr-ai-feature/
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── config.json                     # Your Gemini API key
├── interestfilter.ts               # Core InterestFilter implementation
├── interestfilter-llm.ts           # LLM integration for preference inference
├── interestfilter-tests.ts         # Test cases and examples
├── prompts.ts                      # LLM prompt templates and variants
├── validators.ts                   # Validation logic for AI outputs
├── data.ts                         # Sample place and tag data
├── dist/                           # Compiled JavaScript output
└── README.md                       # This file
```

## Test Cases

The application includes comprehensive test cases demonstrating different scenarios:

### 1. Typical Intent (Baseline Success)
Natural language input like "quiet coastal sunset within 45 minutes of NYC, not crowded, somewhere calm by the water for reading" gets translated into structured tags (quiet_spaces, waterfront_views, sunset_spots, not_crowded, short_drive, coffee_nooks) with high confidence.

### 2. Contradictory Intent (Conflict Handling)
Input like "I want a quiet place to read but also live music and lively nightlife around me" triggers contradiction detection, preventing conflicting tags from being stored and prompting user resolution.

### 3. Slang/Aesthetic Input (Robust Mapping)
Trendy language like "tiktok-able cottagecore forests, mossy stone bridges, short drive" gets mapped to canonical tags (instagram_worthy, nature_walks, historic_charms, short_drive) with high confidence.

## Sample Output

```
🎯 Interest Filter Results
==========================
Input: "quiet coastal sunset within 45 minutes of NYC, not crowded"
AI-Generated Tags: quiet_spaces, waterfront_views, sunset_spots, not_crowded, short_drive, coffee_nooks
Confidence: 0.90
Rationale: User seeks peaceful waterfront locations ideal for reading, within reasonable driving distance, avoiding crowds

📍 Matching Places (Ranked)
============================
1. Larchmont Manor Park (Score: 3) - quiet_spaces, waterfront_views, sunset_spots
2. Maplewood Reading Garden (Score: 2) - quiet_spaces, coffee_nooks
3. Harbor Lights Boardwalk (Score: 1) - waterfront_views, sunset_spots
4. Riverside Jazz Nights (Score: 1) - waterfront_views (excluded: not_crowded)
```

## Key Features

- **Natural Language Processing**: Converts messy user descriptions into structured tags
- **Conflict Detection**: Identifies and prevents contradictory preferences
- **Confidence Scoring**: Provides transparency in AI recommendations
- **Validation System**: Multiple validators ensure reliable AI outputs
- **Flexible Tag System**: Extensible ontology for place categorization
- **Manual Override**: Users can always manually select tags if preferred

## AI Prompt Variants

The system includes multiple prompt strategies:
- **PROMPT_BASELINE**: Strict JSON schema with whitelist validation
- **PROMPT_FEWSHOT**: Includes examples to improve consistency
- **PROMPT_CONTRACTIONS**: Handles conflicting preferences intelligently

## Validators

- **Whitelist Validator**: Ensures all tags come from predefined AllowedTags
- **Contradiction Validator**: Detects conflicting tag pairs (e.g., quiet_spaces vs lively_nightlife)
- **Tag Count Validator**: Maintains 3-7 tags for optimal filtering
- **Confidence Validator**: Ensures confidence values are within [0,1] range

## Troubleshooting

### "Could not load config.json"
- Ensure `config.json` exists with your API key
- Check JSON format is correct

### "Error calling Gemini API"
- Verify API key is correct
- Check internet connection
- Ensure API access is enabled in Google AI Studio

### "Contradiction violation"
- This is expected behavior for conflicting preferences
- User will be prompted to resolve the conflict manually

### Build Issues
- Use `npm run build` to compile TypeScript
- Check that all dependencies are installed with `npm install`

## Next Steps

Try extending the InterestFilter:
- Add location-based filtering
- Create a web interface
- Integrate with real place databases (Google Maps API)

## Resources

- [Google Generative AI Documentation](https://ai.google.dev/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
