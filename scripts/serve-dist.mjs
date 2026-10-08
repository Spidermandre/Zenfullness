// Minimal static server that mimics GitHub Pages for end-to-end tests:
// serves dist/ under /Zenfullness/, no SPA rewrites (the app uses hash routing).
// Used instead of `vite preview`, which answers 404 to requests carrying
// `Sec-Fetch-Dest: script` (i.e. every module script a browser loads) in Vite 8.3.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const BASE = '/Zenfullness/';
const ROOT = join(import.meta.dirname, '..', 'dist');
const PORT = Number(process.env.PORT ?? 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith(BASE)) {
    res.writeHead(404).end();
    return;
  }
  let path = normalize(join(ROOT, decodeURIComponent(url.pathname.slice(BASE.length))));
  if (!path.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
    const body = await readFile(path);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(PORT, () => {
  process.stdout.write(`Serving dist/ at http://localhost:${PORT}${BASE}\n`);
});
