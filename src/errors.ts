import type { MatchDetail } from './filter.js';

/**
 * Thrown when a text contains a banned word.
 * The text is NOT censored: the operation is simply rejected.
 */
export class BannedWordError extends Error {
  public readonly matches: MatchDetail[];

  constructor(matches: MatchDetail[]) {
    super('Text rejected: it contains a banned word. The operation did not succeed.');
    this.name = 'BannedWordError';
    this.matches = matches;
    Object.setPrototypeOf(this, BannedWordError.prototype);
  }
}
