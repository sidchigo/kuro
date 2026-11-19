import type { TMDBRawMovie } from './types';
import { dotProduct } from './embeddingConfig';

export interface VibeAnchor {
  anchorId: string;
  theme: string;
  label: string;
  text: string;
}

export const HORROR_VIBE_ANCHORS: VibeAnchor[] = [
  {
    anchorId: 'folk_occult',
    theme: 'Folk ritual & occult dread',
    label: 'folk ritual & occult dread',
    text: 'folk ritual, pagan curse, shamanism, rural dread, and ancient sacrifice',
  },
  {
    anchorId: 'slow_burn',
    theme: 'Atmospheric slow-burn',
    label: 'atmospheric slow-burn tension',
    text: 'slow-burn atmospheric psychological tension and deliberate escalating dread',
  },
  {
    anchorId: 'possession_exorcism',
    theme: 'Demonic possession & ritual terror',
    label: 'demonic possession & religious terror',
    text: 'demonic possession, exorcism, evil spirit, and religious terror',
  },
  {
    anchorId: 'claustrophobic_survival',
    theme: 'Claustrophobic survival',
    label: 'claustrophobic survival',
    text: 'claustrophobic survival, trap, inescapable confinement, and relentless pursuit',
  },
  {
    anchorId: 'visceral_body_horror',
    theme: 'Visceral body horror',
    label: 'visceral body horror',
    text: 'visceral body horror, physical transformation, parasite, and biological mutation',
  },
  {
    anchorId: 'found_footage',
    theme: 'Found footage & analog horror',
    label: 'found footage & analog dread',
    text: 'found footage, mockumentary realism, lost video tapes, and analog horror',
  },
  {
    anchorId: 'grief_haunting',
    theme: 'Grief-driven haunting',
    label: 'grief-driven supernatural haunting',
    text: 'grief-driven supernatural haunting, familial bereavement, and generational ghost trauma',
  },
  {
    anchorId: 'cosmic_dread',
    theme: 'Cosmic dread & existential unknown',
    label: 'cosmic dread & existential unknown',
    text: 'cosmic dread, ancient incomprehensible entities, and existential unknown terror',
  },
  {
    anchorId: 'taboo_investigation',
    theme: 'Taboo mystery & spiral',
    label: 'taboo mystery & investigative spiral',
    text: 'taboo mystery, forbidden knowledge, urban legend, and investigative spiral into madness',
  },
  {
    anchorId: 'psychological_paranoia',
    theme: 'Psychological collapse',
    label: 'psychological paranoia & delirium',
    text: 'psychological paranoia, mental collapse, hallucinations, and unhinged reality',
  },
  {
    anchorId: 'slasher_stalker',
    theme: 'Slasher stalker & survival',
    label: 'masked stalker & brutal slasher violence',
    text: 'slasher stalking, masked killer, survival chase, and brutal gore',
  },
  {
    anchorId: 'monstrous_creature',
    theme: 'Creature feature & beast',
    label: 'monstrous creature & ancient evil',
    text: 'monstrous predator, cryptid creature feature, cave beast, and prehistoric terror',
  },
  {
    anchorId: 'witchcraft_coven',
    theme: 'Witchcraft & dark coven',
    label: 'witchcraft & sinister coven',
    text: 'witchcraft, sinister coven pacts, black magic rituals, and ancient sorcery',
  },
  {
    anchorId: 'isolation_quarantine',
    theme: 'Isolated quarantine dread',
    label: 'remote isolation & desolate dread',
    text: 'remote cabin isolation, frozen wilderness quarantine, and solitary confinement dread',
  },
];

export const ORIGIN_LANG_MAP: Record<string, string> = {
  th: 'Thai',
  id: 'Indonesian',
  ko: 'Korean',
  ja: 'Japanese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  sv: 'Swedish',
  no: 'Norwegian',
  tl: 'Filipino',
  en: 'Atmospheric',
  zh: 'Chinese',
  pt: 'Portuguese',
  ru: 'Russian',
  pl: 'Polish',
};

/**
 * Calibrates raw 256-d EmbeddingGemma cosine similarities (typically 0.18 - 0.55)
 * into an intuitive human-facing match percentage (75% - 98%).
 */
export function calibrateMatchPercentage(rawSimilarity: number): number {
  const floor = 0.18;
  const ceiling = 0.55;
  const clamped = Math.max(floor, Math.min(ceiling, rawSimilarity));
  const normalized = (clamped - floor) / (ceiling - floor);
  return Math.min(98, Math.max(72, Math.round(75 + normalized * 22)));
}

export function generateDeterministicExplanation(
  movie: { original_language?: string },
  movieVec: Float32Array,
  queryVec: Float32Array,
  similarity: number,
  anchorsMap: Map<string, { anchor: VibeAnchor; vector: Float32Array }>
): { explanation: string; topThemes: string[] } {
  const scoredAnchors: Array<{ anchor: VibeAnchor; score: number }> = [];

  for (const { anchor, vector: anchorVec } of anchorsMap.values()) {
    const movieAffinity = dotProduct(movieVec, anchorVec);
    const queryAffinity = dotProduct(queryVec, anchorVec);
    const resonance = movieAffinity * 0.65 + queryAffinity * 0.35;
    scoredAnchors.push({ anchor, score: resonance });
  }

  scoredAnchors.sort((a, b) => b.score - a.score);

  const top1 = scoredAnchors[0]?.anchor;
  const top2 = scoredAnchors[1]?.anchor;

  const langCode = (movie.original_language || '').toLowerCase();
  const originName = ORIGIN_LANG_MAP[langCode];
  const originPrefix = originName && langCode !== 'en' ? `${originName} ` : '';

  const pct = calibrateMatchPercentage(similarity);

  let explanation = '';
  if (top1 && top2 && top2.anchorId !== top1.anchorId) {
    explanation = `${pct}% match • ${originPrefix}${top1.label} • ${top2.theme}`;
  } else if (top1) {
    explanation = `${pct}% match • ${originPrefix}${top1.label}`;
  } else {
    explanation = `${pct}% match • Atmospheric dread`;
  }

  const topThemes = [top1?.theme, top2?.theme].filter(Boolean) as string[];

  return { explanation, topThemes };
}

export function createPitch(movie: TMDBRawMovie): string {
  const overview = (movie.overview || '').trim();
  if (!overview) {
    return `${movie.title} delivers an escalating atmosphere of supernatural tension and psychological dread.`;
  }
  const sentences = overview.split(/(?<=[.?!])\s+/).filter(Boolean);
  return sentences.slice(0, 2).join(' ') || overview;
}

export function createCatchWarning(movie: TMDBRawMovie, runtime?: number): string {
  const rt = runtime || movie.runtime || 0;
  const lang = (movie.original_language || '').toLowerCase();
  const count = movie.vote_count ?? 0;
  const rating = movie.vote_average ?? 0;

  if (rt > 135) {
    return `Extended runtime (${rt} min) with deliberate, methodical slow-burn pacing.`;
  }
  if (rt > 0 && rt < 85) {
    return `Brisk runtime (${rt} min) that escalates quickly with minimal exposition.`;
  }
  if (lang !== 'en' && lang !== '') {
    return `Original ${movie.original_language.toUpperCase()} audio; requires patience with subtitles for maximal atmospheric immersion.`;
  }
  if (count < 100) {
    return 'Obscure cult entry with polarized audience reactions and gritty lo-fi styling.';
  }
  if (rating >= 7.5) {
    return 'Acclaimed atmospheric tension that relies on psychological dread over cheap jump scares.';
  }
  return 'Deliberate, slow-burn pacing that demands patience before the dread surfaces.';
}
