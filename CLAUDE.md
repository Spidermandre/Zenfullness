# CLAUDE.md

Personal zen practice PWA (Italian UI). Single user, no backend, offline-first, deployed to
GitHub Pages. Spirit: a practice tool, not a productivity app — no gamification, streaks,
badges, guilt, nagging notifications. During a sitting the screen is dark and nearly empty.

## Commands

```sh
npm run dev        # Vite dev server (base "/")
npm run lint       # ESLint, --max-warnings 0
npm run format     # Prettier write (format:check in CI)
npm run typecheck  # tsc -b (app, test, node projects)
npm test           # Vitest (node env, src/**/*.test.ts)
npm run build      # tsc -b && vite build → dist/ with base "/Zenfullness/"
npm run e2e        # Playwright against dist/ served by scripts/serve-dist.mjs (needs a build)
npm run check      # lint + format:check + typecheck + test + build
```

Run `npm run check && npm run e2e` before every push.

## Conventions

- TypeScript strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`. No `any`.
- Code, comments and commits in English. Conventional Commits, small and descriptive.
- All UI copy in `src/ui/strings.it.ts`. Never hard-code Italian strings in components.
- All colours, px sizes, radii, shadows, durations in `src/ui/tokens.css`. Other CSS/TSX use
  `var(--…)` only — enforced by `src/ui/tokens.test.ts` (also checks WCAG AA contrast pairs).
  Deviations from `design/tokens.css` are annotated in tokens.css with `a11y:` / `added:`.
- Logic (`audio/`, `timer/`, `breath/`, `biofeedback/`, `path/`, `storage/`, `sessions/`) is
  framework-free and unit-tested; React lives in `ui/` only.
- Dependencies are minimal and each must be justified in this file.
- e2e tests fail on any console error (`e2e/fixtures.ts`). Import `test` from there.

## Reference device

The user practises on an **iPhone 14 Pro, iOS 27, Safari / home-screen PWA**. Design and test
every feature for it first (ProMotion 120 Hz, Dynamic Island safe areas, no `navigator.vibrate`,
no torch control, Web Audio muted by the silent switch unless `navigator.audioSession` is set,
Wake Lock available in standalone mode since iOS 18.4). Android Chrome is the second target.

## Architecture decisions

- **Stack:** Vite 8, React 19, TypeScript 6.0 (typescript-eslint does not support TS 7 yet).
- **Routing:** own hash router (`src/ui/router.ts`), Italian paths (`#/zazen`, `#/respiro`,
  `#/guidate`, `#/storico`, `#/impostazioni`). Hash routing needs no Pages rewrites.
- **PWA:** vite-plugin-pwa (generateSW, `registerType: 'prompt'`). New service workers wait;
  `src/pwa/update.ts` offers the reload only when `activity.isPracticing()` is false. Any
  practice screen must call `activity.begin()` and the returned end function.
- **Fonts:** system fonts only (user decision). Android falls back to the default serif.
- **CSP** in `index.html` forbids any third-party origin.
- **e2e server:** `scripts/serve-dist.mjs` instead of `vite preview` (Vite 8.3 preview returns
  404 for requests with `Sec-Fetch-Dest: script`). Mirrors Pages: `/Zenfullness/` base.
- **Git flow:** work on the feature branch, one PR into `main` per stage; `main` deploys.

## Product decisions (from the user)

- Settings: glass icon button top-right on Oggi (tab bar keeps the 5 design tabs).
- Breath: scheme chips fade out while the pacer runs, return on pause.
- Sitting screen ring: static, never a time indicator.
- Adaptive path: start at 10 min zazen, +5 min steps, cap 40 min.
- Import: merge by id, no duplicates.
- Wake Lock fallback: silent looping video, only when the API is missing or fails.
- `design/` copied into the repo without `support.js`.

## Dependencies

| Package                                                    | Why                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| react, react-dom                                           | UI framework (requested stack)                         |
| vite, @vitejs/plugin-react                                 | build/dev server                                       |
| vite-plugin-pwa, workbox-window                            | precache + SW lifecycle with deferred updates          |
| typescript, typescript-eslint, eslint, @eslint/js, globals | types + lint                                           |
| eslint-plugin-react-hooks, eslint-plugin-jsx-a11y          | hooks correctness, a11y lint                           |
| prettier                                                   | formatting                                             |
| vitest                                                     | unit tests                                             |
| @playwright/test                                           | e2e (pinned 1.56.1 to match the preinstalled Chromium) |
| @types/node                                                | types for tests/config                                 |

## Stage log

1. **Base, tokens, PWA, Pages** — done. App shell (tab bar, Oggi header, Impostazioni with
   offline status and version), placeholders for other tabs, CI + Pages deploy.
