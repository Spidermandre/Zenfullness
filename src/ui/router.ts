import { useSyncExternalStore } from 'react';

/**
 * Minimal hash router. Hash URLs keep deep links working on GitHub Pages
 * (no server-side rewrites) and inside the installed PWA.
 */
export const ROUTES = [
  'today',
  'zazen',
  'breath',
  'guided',
  'history',
  'settings',
  'soundscape',
] as const;
export type Route = (typeof ROUTES)[number];

const PATHS: Record<Route, string> = {
  today: '',
  zazen: 'zazen',
  breath: 'respiro',
  guided: 'guidate',
  history: 'storico',
  settings: 'impostazioni',
  soundscape: 'paesaggio',
};

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/+$/, '').split(/[/?]/)[0] ?? '';
  const match = ROUTES.find((route) => PATHS[route] === path);
  return match ?? 'today';
}

export function hrefFor(route: Route): string {
  return `#/${PATHS[route]}`;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
  };
}

function snapshot(): Route {
  return parseRoute(window.location.hash);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, snapshot, () => 'today' as const);
}

export function navigate(route: Route): void {
  window.location.hash = hrefFor(route);
}
