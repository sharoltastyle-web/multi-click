import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { BASE } from '../../app-base';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Minimal static server for PWA tests. The test controls it: stop it (real network loss),
 * switch the served build (new version at the same origin) or fail chosen files.
 */
export class TestServer {
  private server: Server | null = null;
  private port = 0;
  readonly failing = new Set<string>();

  constructor(private root: string) {}

  get url() {
    return `http://localhost:${this.port}${BASE}`;
  }

  serve(root: string) {
    this.root = root;
  }

  async start() {
    this.server = createServer(async (req, res) => {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      // Like GitHub Project Pages: only paths under BASE exist.
      if (!path.startsWith(BASE)) {
        res.writeHead(404).end();
        return;
      }
      const rel = path.slice(BASE.length - 1);
      const file = rel === '/' ? '/index.html' : rel;
      if ([...this.failing].some((f) => file.includes(f))) {
        res.writeHead(500).end();
        return;
      }
      try {
        const body = await readFile(join(this.root, normalize(decodeURIComponent(file))));
        res.writeHead(200, {
          'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
          'Cache-Control': 'no-cache',
        });
        res.end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
    await new Promise<void>((resolve) => this.server!.listen(this.port, 'localhost', resolve));
    const address = this.server.address();
    if (address && typeof address === 'object') this.port = address.port;
  }

  async stop() {
    const server = this.server;
    this.server = null;
    if (!server) return;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
