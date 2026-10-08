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

## Timer and audio (stage 2)

- `timer/plan.ts` turns a `SittingConfig` into segments + cues (offsets in seconds).
  Traditional counts: 3 strikes open each zazen, 2 open kinhin, 1 closes; optional soft
  mid-zazen strike. Bell sets change the instrument only (bowl / inkin / han+mokugyo).
- `timer/clock.ts`: elapsed time = f(Date.now(), startedAt, pauses). Never count ticks.
- `timer/scheduler.ts`: all future cues go to the AudioContext clock up front;
  `audioTime = ctx.currentTime + (cue.at − elapsed)`. Pause cancels unstarted strikes;
  resume/resync reschedules; a strike that already began is never repeated; cues more
  than 0.5 s late are skipped.
- `timer/session.ts`: framework-free sitting (start, pause, resume, resync, end). The UI
  calls `resync()` on `visibilitychange` and on AudioContext `statechange` → running.
  The sitting is created in the tap handler (outside React render) so StrictMode
  double-render can never start two schedulers.
- `audio/instruments.ts`: pure modal-synthesis recipes (inharmonic modes, frequency-
  dependent decay, doublets for beating, mallet noise, per-strike random variation).
  `audio/render.ts` turns a spec into Web Audio nodes; `audio/engine.ts` owns the single
  AudioContext, buses (bells, ambient) and a limiter. `unlockAudio()` must run inside the
  user's tap; it also sets `navigator.audioSession.type = 'playback'` (iOS silent switch).
- `timer/wakeLock.ts`: Screen Wake Lock, re-acquired on visibility; canvas-stream video
  fallback only when the API is missing or refuses.
- Sitting presets and the last configuration live in localStorage settings
  (`storage/settings.ts`, validated field by field). They are part of the future export.
- e2e uses `page.clock` to fast-forward sittings; don't use `waitForTimeout` with it.

## Breath (stage 3)

- `breath/patterns.ts`: built-in patterns (susokukan 4-0-6-0 counting, square 4-4-4-4,
  4-6, 4-7-8, coherence 5-0-5-0 = 6/min) + custom (clamped). `pacerAt(phases, elapsed)` is
  the single source for sphere size (cosine-eased fullness), word and susokukan count.
- `breath/session.ts` reuses `timer/practice.ts` (the generic timed practice extracted
  from the sitting): tones at inhale/exhale starts on the audio clock, a soft bowl at the
  end, sessions rounded up to whole breaths.
- The pacer animates outside React: one rAF loop writes `transform`/`opacity` and the
  word. No `backdrop-filter` on the animated sphere (cost with no visible effect).
  Reduced motion: size stays fixed, brightness follows the breath.
- Vibration via `navigator.vibrate` at inhale/exhale; the chip is hidden where the API
  does not exist (all iOS browsers).
- Respiro keeps a night-variant tab bar when idle (design shows none); hidden while
  running. Custom-pattern editor is a night glass panel (not in the design).
- e2e: prefer `page.clock.fastForward` for long jumps; `runFor` steps every frame.

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
2. **Timer engine, silent zazen, synthesized bells** — done. Zazen setup (stepper, duration
   chips + saved sequences, zazen/kinhin sequence, preparation, bell set, mid bell, show
   time), night sitting screen (label, static ring, Pausa/Riprendi, two-tap Termina), end
   screen with practised duration, bell volume + test in Impostazioni. Sittings are not yet
   recorded (stage 6).
3. **Guided breathing** — done. Respiro screen per design (glass sphere pacer, words only,
   scheme chips), duration/sound/vibration chips, custom pattern editor, pause/end,
   end screen. New app icon (brush ensō, `scripts/icons/`).
