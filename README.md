# Assignment 3 — An AI-Augmented Concept

## Unwindr
Unwindr reimagines how people explore nearby places, replacing endless reviews with instant, visual discovery.

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













--------- TEMPLATE BELOW ---------

# DayPlanner 
A simple day planner. This implementation focuses on the core concept of organizing activities for a single day with both manual and AI-assisted scheduling.

## Concept: DayPlanner

**Purpose**: Help you organize activities for a single day  
**Principle**: You can add activities one at a time, assign them to times, and then observe the completed schedule

### Core State
- **Activities**: Set of activities with title, duration, and optional startTime
- **Assignments**: Set of activity-to-time assignments
- **Time System**: All times in half-hour slots starting at midnight (0 = 12:00 AM, 13 = 6:30 AM)

### Core Actions
- `addActivity(title: string, duration: number): Activity`
- `removeActivity(activity: Activity)`
- `assignActivity(activity: Activity, startTime: number)`
- `unassignActivity(activity: Activity)`
- `requestAssignmentsFromLLM()` - AI-assisted scheduling with hardwired preferences

## Prerequisites

- **Node.js** (version 14 or higher)
- **TypeScript** (will be installed automatically)
- **Google Gemini API Key** (free at [Google AI Studio](https://makersuite.google.com/app/apikey))

## Quick Setup

### 0. Clone the repo locally and navigate to it
```cd intro-gemini-schedule```

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
npm run manual    # Manual scheduling only
npm run llm       # LLM-assisted scheduling only
npm run mixed     # Mixed manual + LLM scheduling
```

## File Structure

```
dayplanner/
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── config.json               # Your Gemini API key
├── dayplanner-types.ts       # Core type definitions
├── dayplanner.ts             # DayPlanner class implementation
├── dayplanner-llm.ts         # LLM integration
├── dayplanner-tests.ts       # Test cases and examples
├── dist/                     # Compiled JavaScript output
└── README.md                 # This file
```

## Test Cases

The application includes three comprehensive test cases:

### 1. Manual Scheduling
Demonstrates adding activities and manually assigning them to time slots:

```typescript
const planner = new DayPlanner();
const breakfast = planner.addActivity('Breakfast', 1); // 30 minutes
planner.assignActivity(breakfast, 14); // 7:00 AM
```

### 2. LLM-Assisted Scheduling
Shows AI-powered scheduling with hardwired preferences:

```typescript
const planner = new DayPlanner();
planner.addActivity('Morning Jog', 2);
planner.addActivity('Math Homework', 4);
await llm.requestAssignmentsFromLLM(planner);
```

### 3. Mixed Scheduling
Combines manual assignments with AI assistance for remaining activities.

## Sample Output

```
📅 Daily Schedule
==================
7:00 AM - Breakfast (30 min)
8:00 AM - Morning Workout (1 hours)
10:00 AM - Study Session (1.5 hours)
1:00 PM - Lunch (30 min)
3:00 PM - Team Meeting (1 hours)
7:00 PM - Dinner (30 min)
9:00 PM - Evening Reading (1 hours)

📋 Unassigned Activities
========================
All activities are assigned!
```

## Key Features

- **Simple State Management**: Activities and assignments stored in memory
- **Flexible Time System**: Half-hour slots from midnight (0-47)
- **Query-Based Display**: Schedule generated on-demand, not stored sorted
- **AI Integration**: Hardwired preferences in LLM prompt (no external hints)
- **Conflict Detection**: Prevents overlapping activities
- **Clean Architecture**: First principles implementation with no legacy code

## LLM Preferences (Hardwired)

The AI uses these built-in preferences:
- Exercise activities: Morning (6:00 AM - 10:00 AM)
- Study/Classes: Focused hours (9:00 AM - 5:00 PM)
- Meals: Regular intervals (breakfast 7-9 AM, lunch 12-1 PM, dinner 6-8 PM)
- Social/Relaxation: Evenings (6:00 PM - 10:00 PM)
- Avoid: Demanding activities after 10:00 PM

## Troubleshooting

### "Could not load config.json"
- Ensure `config.json` exists with your API key
- Check JSON format is correct

### "Error calling Gemini API"
- Verify API key is correct
- Check internet connection
- Ensure API access is enabled in Google AI Studio

### Build Issues
- Use `npm run build` to compile TypeScript
- Check that all dependencies are installed with `npm install`

## Next Steps

Try extending the DayPlanner:
- Add weekly scheduling
- Implement activity categories
- Add location information
- Create a web interface
- Add conflict resolution strategies
- Implement recurring activities

## Resources

- [Google Generative AI Documentation](https://ai.google.dev/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
