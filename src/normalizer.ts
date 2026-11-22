// Leetspeak characters and the letter they usually stand for.
const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '+': 't',
};

/**
 * Normalizes a text so that common obfuscations match the same rule:
 * lower case, no accents, leetspeak converted to letters
 * and (optionally) repeated letters collapsed ("puuuute" -> "pute").
 */
export function normalizeText(input: string, collapseRepeats = true): string {
  let normalized = input
    .toLowerCase()
    .normalize('NFD') // split accented letters into letter + accent
    .replace(/[̀-ͯ]/g, '') // drop the accents
    .replace(/[0134578@$!+]/g, (char) => LEET_MAP[char] || char);

  if (collapseRepeats) {
    normalized = normalized.replace(/(.)\1+/g, '$1');
  }

  return normalized;
}
