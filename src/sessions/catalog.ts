import { parseSession, type GuidedSession } from './format';

/**
 * All guided sessions, loaded at build time from `content/*.md`.
 * Adding a session means adding a file there: nothing else to change.
 * A malformed file is skipped (with a warning) instead of breaking the app;
 * `catalog.test.ts` makes such a file fail CI.
 */
const files = import.meta.glob<string>('./content/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export function loadCatalog(sources: Record<string, string>): GuidedSession[] {
  const sessions: GuidedSession[] = [];
  for (const [path, source] of Object.entries(sources)) {
    const id = path.replace(/^.*\//, '').replace(/\.md$/, '');
    try {
      sessions.push(parseSession(id, source));
    } catch (error) {
      console.warn(error instanceof Error ? error.message : String(error));
    }
  }
  return sessions.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'it'));
}

export const CATALOG: readonly GuidedSession[] = loadCatalog(files);

export function findSession(id: string): GuidedSession | undefined {
  return CATALOG.find((s) => s.id === id);
}
