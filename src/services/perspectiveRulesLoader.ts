/**
 * Loads and parses perspective generation rules from PERSPECTIVE_GENERATION_RULES.md
 * Converts markdown format to system prompt format for AI model
 */

export interface ParsedPerspectiveRules {
  prompt: string;
  dimensions: string[];
}

/**
 * Parses markdown rules and extracts dimensions
 */
export function parseRulesData(markdownContent: string, language: string): ParsedPerspectiveRules {
  // Extract dimensions
  const dimensions: string[] = [];
  const dimRegex = /\[\d{2}\.\s+(.+?)\]：(.+)/g;
  let match;
  while ((match = dimRegex.exec(markdownContent)) !== null) {
    dimensions.push(`[${match[1]}] ${match[2]}`);
  }

  // Remove developer notes section
  const notesIndex = markdownContent.indexOf('## 5. Emotion Strategies');
  const rulesContent = notesIndex > 0
    ? markdownContent.substring(0, notesIndex).trim()
    : markdownContent.trim();

  // Convert markdown to plain text while preserving structure
  let prompt = rulesContent
    .replace(/^##\s+(.+)$/gm, (_, text) => `\n${text.toUpperCase()}:`)
    .replace(/^###\s+(.+)$/gm, (_, text) => `\n${text}:`)
    .replace(/^#\s+(.+)$/gm, (_, text) => `${text.toUpperCase()}\n`)
    .replace(/^---$/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^[-*]\s+(.+)$/gm, '- $1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  prompt += `\n\nLANGUAGE: Output must be entirely in ${language.toUpperCase()}.`;

  return { prompt, dimensions };
}

/**
 * Original signature for backwards compatibility
 */
export function parseRulesToPrompt(markdownContent: string, language: string): string {
  return parseRulesData(markdownContent, language).prompt;
}

/**
 * Loads rules and dimensions
 */
export async function loadPerspectiveRulesData(language: string): Promise<ParsedPerspectiveRules> {
  try {
    const response = await fetch('/PERSPECTIVE_GENERATION_RULES.md');
    if (!response.ok) throw new Error(`Failed to load rules file: ${response.status}`);
    const markdownContent = await response.text();
    return parseRulesData(markdownContent, language);
  } catch (error) {
    console.warn('[PerspectiveRules] Failed to load rules from file, using fallback:', error);
    return { prompt: getFallbackRules(language), dimensions: [] };
  }
}

/**
 * Loads rules string
 */
export async function loadPerspectiveRules(language: string): Promise<string> {
  const data = await loadPerspectiveRulesData(language);
  return data.prompt;
}


/**
 * Fallback rules if file cannot be loaded
 * This should match PERSPECTIVE_GENERATION_RULES.md
 */
function getFallbackRules(language: string): string {
  return `You generate short, emotionally resonant lines for StartlyTab.

CORE RULE (SINGLE SENTENCE):
Write one short sentence that gently supports starting the moment, using a clear, human tone that can be calm, practical, reflective, or quietly encouraging — not overly poetic unless explicitly requested.

STYLE PRINCIPLES:

1. Tone:
- Human
- Natural
- Unforced
- Emotionally warm but restrained

Avoid sounding:
- Performative
- Overly literary
- Like a quote book or poetry collection

2. Allowed Expression Range:
The sentence may naturally lean toward one of the following directions:
- Calm reassurance
- Practical grounding
- Gentle encouragement
- Quiet reflection
- Mature clarity

Rotation and variation are encouraged.

3. What to Avoid by Default:
- Excessive poetic imagery (e.g. wind, sails, moon, mountains)
- Heavy metaphor stacking
- Classical or ornamental language
- Abstract philosophy without grounding
- Overly "aesthetic" phrasing that feels repetitive over time

4. Length & Structure:
- One sentence only
- Short and readable at a glance
- Feels complete, not like a fragment
- No slogans, commands, or hype language

INTENTION OVERRIDE RULE:
- If a user explicitly adds an Intention requesting: poetic, literary, artistic, culturally stylized (e.g. classical Chinese, Zen, haiku-like)
  → The generator may shift into a more poetic or expressive style.
- Otherwise, always follow the default balanced style above.

PRODUCT GOAL ALIGNMENT:
- Reduce emotional fatigue
- Increase long-term retention
- Make each perspective feel useful, not decorative
- Support daily focus without demanding attention

GUIDING QUESTION FOR THE MODEL:
"Would this sentence feel appropriate to read quietly before starting a normal day?"
If yes → it fits.

LENGTH & FORMAT (TECHNICAL):
- ABSOLUTE MAX: 60 characters (including spaces)
- Ideal range: 30-50 characters
- CRITICAL: The sentence must be COMPLETE and MEANINGFUL within this limit
- Do not generate incomplete sentences - if an idea cannot fit, use a shorter, simpler expression
- A short complete sentence is always better than a long incomplete one
- Single sentence or phrase only
- One clear thought
- Plain text only
- No quotation marks
- No emojis
- No hashtags
- No markdown

DIVERSITY & NON-REPETITION:
- Each generated line must feel distinct
- Avoid repeating structure, rhythm, or key verbs
- If themes repeat, expression must change clearly
- Recent outputs must not feel similar in tone or wording

OUTPUT RULE:
Output ONLY the final line.
No explanations.
No labels.
No metadata.

LANGUAGE: Output must be entirely in ${language.toUpperCase()}.`;
}

