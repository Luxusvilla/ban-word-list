import * as fs from 'fs/promises';
import * as path from 'path';
import { normalizeText } from './normalizer.js';
import { BanRule, parseRuleLine } from './parser.js';
import { BannedWordError } from './errors.js';

/** One banned word found in a text. */
export interface MatchDetail {
  /** The word as written in the text. */
  word: string;
  /** The rule line that matched (as written in the .txt list). */
  rule: string;
  /** Name of the list the rule comes from (e.g. "fr", "en"). */
  list: string;
}

export interface CheckResult {
  isBlocked: boolean;
  matches: MatchDetail[];
}

// Splits a text into words and separators (whitespace / punctuation), keeping both.
const TOKEN_SPLIT = /(\s+|[.,!?;:"'()\[\]{}-]+)/;

export class NGWordFilter {
  // Rules grouped by list name ("fr", "en", ...).
  private rulesByList: Map<string, BanRule[]> = new Map();

  /** Adds rule lines to a list. Comments, empty lines and duplicates are ignored. */
  public addRules(listName: string, lines: string[]): void {
    const existing = this.rulesByList.get(listName) ?? [];
    for (const line of lines) {
      const rule = parseRuleLine(line, listName);
      if (rule && !existing.some((r) => r.raw === rule.raw)) {
        existing.push(rule);
      }
    }
    this.rulesByList.set(listName, existing);
  }

  /** Loads one .txt file. The list name defaults to the file name (fr.txt -> "fr"). */
  public async loadFile(filePath: string, listName?: string): Promise<void> {
    const resolvedName =
      listName ?? path.basename(filePath, path.extname(filePath)).toLowerCase();
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    this.addRules(resolvedName, lines);
  }

  /** Loads every .txt file of a directory and returns the loaded list names. */
  public async loadDirectory(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const loadedLists: string[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.txt')) {
        const listName = path.basename(entry.name, '.txt').toLowerCase();
        await this.loadFile(path.join(dirPath, entry.name), listName);
        loadedLists.push(listName);
      }
    }

    return loadedLists;
  }

  public getLoadedLists(): string[] {
    return Array.from(this.rulesByList.keys());
  }

  /** Removes one list, or every list when no name is given. */
  public clear(listName?: string): void {
    if (listName) {
      this.rulesByList.delete(listName);
    } else {
      this.rulesByList.clear();
    }
  }

  // Rules of the requested lists, or of all loaded lists when none is requested.
  private getActiveRules(lists?: string[]): BanRule[] {
    if (!lists || lists.length === 0) {
      return Array.from(this.rulesByList.values()).flat();
    }
    return lists.flatMap((name) => this.rulesByList.get(name.toLowerCase()) ?? []);
  }

  // The token must already be normalized (see normalizeText).
  private matchesRule(normalizedToken: string, rule: BanRule): boolean {
    switch (rule.type) {
      case 'exact':
        return normalizedToken === rule.normalized;
      case 'startsWith':
        return normalizedToken.startsWith(rule.normalized);
      case 'endsWith':
        return normalizedToken.endsWith(rule.normalized);
      case 'contains':
        return normalizedToken.includes(rule.normalized);
    }
  }

  /** Returns true as soon as one word of the text is banned. */
  public hasBannedWord(text: string, lists?: string[]): boolean {
    const activeRules = this.getActiveRules(lists);
    if (activeRules.length === 0 || !text) return false;

    for (const token of text.split(TOKEN_SPLIT)) {
      const normalized = normalizeText(token);
      if (!normalized) continue;

      if (activeRules.some((rule) => this.matchesRule(normalized, rule))) {
        return true;
      }
    }

    return false;
  }

  /** Lists every banned word found in the text. The text is never modified. */
  public check(text: string, lists?: string[]): CheckResult {
    const activeRules = this.getActiveRules(lists);
    if (activeRules.length === 0 || !text) {
      return { isBlocked: false, matches: [] };
    }

    const matches: MatchDetail[] = [];

    for (const token of text.split(TOKEN_SPLIT)) {
      const normalized = normalizeText(token);
      if (!normalized) continue;

      const matchedRule = activeRules.find((rule) =>
        this.matchesRule(normalized, rule)
      );

      if (matchedRule) {
        matches.push({
          word: token,
          rule: matchedRule.raw,
          list: matchedRule.listName,
        });
      }
    }

    return { isBlocked: matches.length > 0, matches };
  }

  /**
   * Never modifies the text: throws BannedWordError if it contains a banned word.
   */
  public assertClean(text: string, lists?: string[]): void {
    const result = this.check(text, lists);
    if (result.isBlocked) {
      throw new BannedWordError(result.matches);
    }
  }
}
