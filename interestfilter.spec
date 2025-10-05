<concept_spec>
concept InterestFilter

purpose
    allow users to express their interests so places can be filtered to match their preferences

principle
    users pick preference tags, or can describe their desired "vibe" or activity, 
    which gets translated into interest tags by LLMs, so places can be filtered to match their preferences

state
    a set of AllowedTag with
        a tag String
        a description String

    a set of UserPreferences with
        a user String
        a tags set String
        a source String // "manual" or "llm"

    a set of UserInferredPrefs with
        a user String
        a tags set String
        an exclusions set String
        a confidence Number
        a rationale String
        a lastPrompt String

    a set of PlaceTags with
        a place String
        a tags set String

    invariants
        every tag in UserPreferences.tags is in AllowedTag.tag
        every tag in UserInferredPrefs.tags is in AllowedTag.tag
        every tag in UserInferredPrefs.exclusions is in AllowedTag.tag
        confidence is between 0 and 1
        source is either "manual" or "llm"

actions    
    setPreferences(user: String, tags: set String)
        requires user is authenticated and tags is not empty
        effect saves or updates the user's preferences with the given tags and marks them as "manual"

    inferPreferencesFromText(user: String, text: String, radius?: Number, locationHint?: String)
        requires user is authenticated and text is not empty
        effect calls an AI model to interpret the text and suggest tags and optional exclusions,
          records confidence and rationale, stores them in UserInferredPrefs,
          and updates UserPreferences with source = "llm" and the inferred tags

    tagPlace(place: String, tag: String)
        requires place exists and tag in AllowedTags
        effect associates the tag with the place in PlaceTags

    clearPreferences(user: String)
        requires user is authenticated
        effect removes all UserPreferences and UserInferredPrefs for the user

    getMatchingPlaces(user: String, places: set Place) : (matches: set Place)
        requires user has either manual or llm preferences
        effect returns places whose tags overlap most strongly with the user's preferred tags,
          down-ranking places that match excluded tags

    whitelistValidator(tags: set String, exclusions: set String) : (valid: Flag)
        ensures every tag is in AllowedTags

    tagCountValidator(tags: set String) : (valid: Flag)
        ensures the number of tags is between 3 and 7

    contradictionValidator(tags: set String) : (valid: Flag)
        ensures no contradictory tag pairs are present

    confidenceValidator (confidence: Number) : (valid: Flag)
        ensures 0 ≤ confidence ≤ 1; if low, prompt user to confirm or edit

notes
    This concept augments the original InterestFilter with AI-powered preference inference.
    Users can now describe their preferences in natural language, which gets translated
    into structured tags using LLMs. The system maintains both manual and AI-derived
    preferences, with full audit trails for transparency.
</concept_spec>
