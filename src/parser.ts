import { normalizeText } from './normalizer.js';

export type MatchType = 'exact' | 'startsWith' | 'endsWith' | 'contains';

export interface BanRule {
  /** The line as written in the .txt file. */
  raw: string;
  /** The pattern after normalization, without the ^ $ * markers. */
  normalized: string;
  type: MatchType;
  /** Name of the list the rule belongs to. */
  listName: string;
}

/**
 * Parses one line of a list file. Returns null for comments and empty lines.
 *
 *   word    -> exact match
 *   ^word   -> starts with "word"
 *   word$   -> ends with "word"
 *   ^word$  -> exact match
 *   *word*  -> contains "word"
 */
export function parseRuleLine(line: string, listName: string): BanRule | null {
  const trimmed = line.replace(/\r$/, '').trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  let pattern = trimmed;
  let type: MatchType = 'exact';

  if (pattern.startsWith('*') && pattern.endsWith('*') && pattern.length > 2) {
    type = 'contains';
    pattern = pattern.slice(1, -1);
  } else if (pattern.startsWith('^') && pattern.endsWith('$') && pattern.length > 2) {
    type = 'exact';
    pattern = pattern.slice(1, -1);
  } else if (pattern.startsWith('^') && pattern.length > 1) {
    type = 'startsWith';
    pattern = pattern.slice(1);
  } else if (pattern.endsWith('$') && pattern.length > 1) {
    type = 'endsWith';
    pattern = pattern.slice(0, -1);
  }

  // Rules are normalized like the text, so "c0nnard" matches the rule "connard".
  const normalized = normalizeText(pattern.trim());
  if (!normalized) {
    return null;
  }

  return {
    raw: trimmed,
    normalized,
    type,
    listName,
  };
}
