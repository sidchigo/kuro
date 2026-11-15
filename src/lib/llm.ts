import { z } from 'zod';
import type { SeedMovie, TMDBRawMovie } from './types';

export const IntentSchema = z.object({
  extractedMechanic: z.string(),
  tmdbKeywordTerms: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe('Core search keywords for TMDB, e.g. "cult", "isolation", "possession"'),
  targetLanguageCodes: z
    .array(z.string())
    .optional()
    .describe('ISO 639-1 language codes if user explicitly specifies a region/language'),
  avoidTropes: z.array(z.string()),
});

export type IntentResult = z.infer<typeof IntentSchema>;

export const RerankSchema = z.object({
  matches: z
    .array(
      z.object({
        id: z.number(),
        pitch: z
          .string()
          .describe("2 crisp sentences explaining strictly how this film satisfies the user's sentence"),
        catchWarning: z
          .string()
          .describe('1 honest caveat about pacing, extreme content, or style'),
      })
    )
    .min(0)
    .max(3),
  fallbackReason: z.string().optional(),
});

export type RerankResult = z.infer<typeof RerankSchema>;

interface CandidateSummary {
  id: number;
  title: string;
  release_date: string;
  original_language: string;
  vote_average: number;
  overview: string;
}

function getEnvKey(keyName: string): string | undefined {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env[keyName] as string)) ||
    (typeof process !== 'undefined' && process.env && process.env[keyName]) ||
    undefined
  );
}

function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim();
  }
  return cleaned;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes LLM call with 429 rate-limit backoff and multi-provider failover
 */
async function callLLMProvider(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const geminiKey = getEnvKey('GEMINI_API_KEY') || getEnvKey('GOOGLE_API_KEY');
  const groqKey = getEnvKey('GROQ_API_KEY');
  const openrouterKey = getEnvKey('OPENROUTER_API_KEY');

  // 1. Google Gemini (handles 429 with retry backoff across free-tier models)
  if (geminiKey) {
    const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-1.5-flash-8b'];
    for (const model of models) {
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000);

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ parts: [{ text: userPrompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2,
              },
            }),
          });
          clearTimeout(timeoutId);

          if (res.status === 429) {
            // Rate limited: inspect Retry-After or use exponential backoff
            const retryHeader = res.headers.get('retry-after');
            const waitMs = retryHeader ? Math.min(parseInt(retryHeader, 10) * 1000, 3000) : attempts * 1500;
            console.warn(`[LLM Gemini ${model}] 429 Rate limited. Backing off ${waitMs}ms (attempt ${attempts}/${maxAttempts})...`);
            await sleep(waitMs);
            continue;
          }

          if (!res.ok) {
            const errText = await res.text();
            console.error(`LLM Error [Gemini ${model} HTTP ${res.status}]:`, errText);
            break; // Try next model
          }

          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return cleanJsonString(text);
        } catch (err) {
          console.error(`LLM Error [Gemini ${model}]:`, err);
          break; // Try next model
        }
      }
    }
  }

  // 2. Groq
  if (groqKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return cleanJsonString(text);
      } else {
        const errText = await res.text();
        console.error(`LLM Error [Groq HTTP ${res.status}]:`, errText);
      }
    } catch (err) {
      console.error('LLM Error [Groq]:', err);
    }
  }

  // 3. OpenRouter
  if (openrouterKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openrouterKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return cleanJsonString(text);
      } else {
        const errText = await res.text();
        console.error(`LLM Error [OpenRouter HTTP ${res.status}]:`, errText);
      }
    } catch (err) {
      console.error('LLM Error [OpenRouter]:', err);
    }
  }

  return null;
}

/**
 * Stage 1: Seed Hydration & Intent Decomposition (LLM Call #1)
 */
export async function decomposeIntent(
  seed: SeedMovie,
  sentence: string,
  preset: string
): Promise<IntentResult> {
  const systemPrompt = `You are a film analysis assistant specializing in horror cinema.
Analyze the user's seed film and custom sentence to extract key horror themes, 2 to 5 relevant TMDB search keywords, and any tropes to avoid.

Rules:
- extractedMechanic: 1 concise sentence describing the core horror engine and atmosphere.
- tmdbKeywordTerms: 2 to 5 concise search keywords suitable for TMDB (e.g. "cult", "isolation", "curse", "found footage", "psychological", "paranoia"). Use standard single or two-word lowercase nouns.
- targetLanguageCodes: Array of ISO 639-1 language codes if the user explicitly requested a specific language or region in their sentence, or [] if none.
- avoidTropes: 1 to 3 clichés or tropes to avoid based on the desired tone.

Respond strictly in valid JSON matching this schema:
{
  "extractedMechanic": "string",
  "tmdbKeywordTerms": ["string"],
  "targetLanguageCodes": ["string"],
  "avoidTropes": ["string"]
}`;

  const userPrompt = `Seed Movie: "${seed.title}" (${seed.year}), Director: ${seed.director || 'Unknown'}
Overview: ${seed.overview}
Keywords: ${seed.keywords.join(', ')}
User Sentence: "${sentence}"
Preset: "${preset}"`;

  const rawJson = await callLLMProvider(systemPrompt, userPrompt);
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      const validated = IntentSchema.safeParse(parsed);
      if (validated.success) {
        return validated.data;
      }
    } catch (e) {
      console.error('LLM Error [Stage 1 Schema Validation]:', e);
    }
  }

  // Dynamic Fallback: Tokenize sentence words and merge with seed keywords (no hardcoded word lists)
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'about', 'just', 'movie', 'film', 'like', 'want', 'more', 'some', 'into'
  ]);
  const sentenceWords = sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  const fallbackTerms = Array.from(
    new Set([...sentenceWords, ...seed.keywords.map((k) => k.toLowerCase())])
  ).slice(0, 5);

  if (fallbackTerms.length < 2) {
    fallbackTerms.push('horror', 'psychological');
  }

  return {
    extractedMechanic: `Atmospheric dread combining ${seed.title}'s tone with the user's focus.`,
    tmdbKeywordTerms: fallbackTerms.slice(0, 5),
    targetLanguageCodes: [],
    avoidTropes: ['jump scares', 'cheap cgi', 'slasher clichés'],
  };
}

/**
 * Stage 3: Grounded Cross-Encoder Reranking (LLM Call #2)
 */
export async function rerankCandidates(
  candidates: TMDBRawMovie[],
  sentence: string,
  avoidTropes: string[],
  seedTitle?: string
): Promise<RerankResult> {
  const candidateSummaries: CandidateSummary[] = candidates.map((c) => ({
    id: c.id,
    title: c.title,
    release_date: c.release_date || 'Unknown',
    original_language: c.original_language?.toUpperCase() || 'EN',
    vote_average: Math.round((c.vote_average ?? 0) * 10) / 10,
    overview: c.overview || 'No overview available.',
  }));

  const systemPrompt = `You are a film discovery assistant.
Match the candidate horror films against the user's request and seed film ("${seedTitle || 'the seed'}").
Select the top 1 to 3 best matches.

Rules:
- ONLY select IDs from the provided candidate list. Never invent movie IDs.
- For each selected movie:
  - "pitch": Exactly 2 crisp sentences summarizing the film's premise and explaining why it satisfies the user's requested horror style.
  - "catchWarning": Exactly 1 honest caveat about pacing, extreme content, style, or gore.

Respond strictly in valid JSON matching this schema:
{
  "matches": [
    {
      "id": 12345,
      "pitch": "First sentence summarizing narrative mechanics. Second sentence connecting to dread.",
      "catchWarning": "One honest caveat about pacing, content, or style."
    }
  ]
}`;

  const userPrompt = `User Request / Sentence: "${sentence}"
Avoid Tropes: [${avoidTropes.join(', ')}]
Candidate Horror Pool (${candidateSummaries.length} candidates):
${JSON.stringify(candidateSummaries, null, 2)}`;

  const validIdSet = new Set(candidates.map((c) => c.id));
  const rawJson = await callLLMProvider(systemPrompt, userPrompt);

  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      const validated = RerankSchema.safeParse(parsed);
      if (validated.success) {
        const cleanMatches = validated.data.matches.filter((m) => validIdSet.has(m.id));
        if (cleanMatches.length > 0) {
          return {
            matches: cleanMatches.slice(0, 3),
            fallbackReason: validated.data.fallbackReason,
          };
        }
      }
    } catch (e) {
      console.error('LLM Error [Stage 3 Schema Validation]:', e);
    }
  }

  // Dynamic Fallback if LLM call is unavailable
  const selected = candidates.slice(0, 3);
  return {
    matches: selected.map((cand) => {
      const sentences = (cand.overview || '').split(/(?<=[.?!])\s+/);
      const plotOpening = sentences.slice(0, 2).join(' ') || cand.overview || 'A chilling supernatural narrative';
      return {
        id: cand.id,
        pitch: `${cand.title} centers on ${plotOpening.replace(/\.$/, '')}. Its escalating psychological dread delivers a deeply unsettling narrative experience.`,
        catchWarning: 'Deliberate, slow-burn pacing that demands patience before the dread surfaces.',
      };
    }),
  };
}
