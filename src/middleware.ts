import { NGWordFilter } from './filter.js';

// Minimal request/response shapes, so this works with Express (and anything similar)
// without adding it as a dependency.
interface RequestLike {
  body?: unknown;
}
interface ResponseLike {
  status(code: number): { json(body: unknown): unknown };
}
type NextFunction = (err?: unknown) => void;

export interface BanWordGuardOptions {
  /** Body fields to check (e.g. ['body', 'title']). Defaults to every string in the body. */
  fields?: string[];
  /** Lists to check (e.g. ['fr']). Defaults to every loaded list (fr.txt, en.txt, ...). */
  lists?: string[];
}

// Collects the strings of a request body (nested objects and arrays included).
function collectStrings(value: unknown, depth = 0): string[] {
  if (depth > 5) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((v) => collectStrings(v, depth + 1));
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap((v) => collectStrings(v, depth + 1));
  }
  return [];
}

/**
 * Express middleware: if the request body contains a banned word (from ANY loaded
 * .txt list), the request is cancelled with HTTP 400. Otherwise it passes untouched.
 *
 *   app.post('/posts', banWordGuard(filter), createPost);
 */
export function banWordGuard(filter: NGWordFilter, options: BanWordGuardOptions = {}) {
  return (req: RequestLike, res: ResponseLike, next: NextFunction): void => {
    const body = req.body;

    let texts: string[];
    if (options.fields && body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      texts = options.fields.flatMap((field) => collectStrings(record[field]));
    } else {
      texts = collectStrings(body);
    }

    for (const text of texts) {
      if (filter.check(text, options.lists).isBlocked) {
        res.status(400).json({
          error: 'banned_word',
          message: 'Post rejected: it contains a banned word.',
        });
        return;
      }
    }

    next();
  };
}
