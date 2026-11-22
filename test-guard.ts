import * as path from 'path';
import { fileURLToPath } from 'url';
import { NGWordFilter, banWordGuard } from './src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fake Express request/response to show the behaviour without starting a server.
async function main() {
  const filter = new NGWordFilter();
  await filter.loadDirectory(path.join(__dirname, 'lists'));
  const guard = banWordGuard(filter);

  for (const text of ['hello everyone', 'pute', 'fuck you', 'salut ça va']) {
    let status = 200;
    guard(
      { body: { text } },
      { status: (code) => ((status = code), { json: () => undefined }) },
      () => undefined
    );
    console.log(`${JSON.stringify(text)} -> ${status === 400 ? '400 (post cancelled)' : 'passes'}`);
  }
}

main();
