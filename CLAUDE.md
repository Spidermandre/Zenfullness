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
- Logic (`audio/`, `timer/`, `breath/`, `path/`, `storage/`, `sessions/`) is
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
- e2e with time: `clock.install({ time })`, `goto`, then `clock.pauseAt(...)` so time only
  moves when the test says (a running fake clock drifts on slow CI). Use `fastForward` for
  long jumps, then `runFor(100)` before checking anything drawn by requestAnimationFrame
  (fastForward fires a pending rAF at most once, at an intermediate instant).

## Soundscapes (stage 4)

- `audio/soundscapes/noise.ts` (white/pink/brown, pure) and `modulation.ts` (bounded
  mean-reverting drifts, Poisson event times) are the tested core.
- `layers.ts`: rain (pink bed + brown rumble + Poisson drops at a drifting rate), wind
  (band-passed brown noise, gusting gain/Q/centre/pan), water (stream bed + resonant
  bubbles jumping in pitch), drone (D2 chord, detuned pairs, partials drifting in and
  out, slow low-pass). Noise beds loop two buffers of incommensurate length.
  Layers are balanced to ≈ −24 dBFS RMS (offline render check in Chromium).
- `player.ts`: one player on the ambient bus; `play(mix)` fades layers in/out (4 s / 3 s),
  a 1 s heartbeat steers drifts and schedules events 3 s ahead on the audio clock.
- Mix + ambient volume live in settings. Zazen/Respiro have an "Ambiente" option that
  starts the saved mix on the start tap and fades it out over 8 s when the practice ends.
- Soundscape screen `#/paesaggio` (not in the design): night style, back to Oggi, no tab
  bar; listening counts as a practice for the update guard. No wake lock while only
  listening.
- Oggi now shows the design's "Altre pratiche" list.

## Guided meditations (stage 5)

- Content: `src/sessions/content/*.md` (front matter `title`, `duration`, `order`,
  optional `audio`; body `[mm:ss] text`). Loaded with `import.meta.glob(..., '?raw')`;
  `sessions/format.ts` parses strictly; `catalog.test.ts` validates every file in CI.
  Runtime skips a broken file with `console.warn` instead of breaking the app.
- `sessions/session.ts`: timed practice + opening/closing bowl; the instruction on
  screen is a pure function of elapsed time.
- Speech: `sessions/speech.ts` (Web Speech API, best Italian voice via `voice.ts`,
  unlocked inside the start tap, cancelled on pause; each instruction spoken once).
- Recording: `audio:` path under `public/audio/` replaces speech; `recording.ts` keeps an
  HTMLAudioElement aligned (resync on visibility if drift > 0.75 s). Audio extensions are
  precached (limit 60 MB).
- Guided playback screen is not in the design (sitting-style night screen, instruction in
  the display face, 2.4 s fade). Guidate list has "Lettura ad alta voce" and "Ambiente".
- Content tone: sober, practical, no new-age language; long silences between
  instructions; nothing in the last 20 s before the bell (tested).

## History (stage 6)

- `storage/db.ts`: own ~100-line IndexedDB wrapper; `MIGRATIONS` is an ordered list,
  each upgrading from `version - 1`; all missing ones run in the single upgrade
  transaction. Schema v1: `log` (keyPath `id`, index `startedAt`) and `meta`. Tests use
  `fake-indexeddb` and simulate a future v2 migration over existing data.
- `storage/log.ts`: `LogEntry` (kind, startedAt, endedAt, planned/actual seconds,
  completed, detail, optional note). Only practices ≥ 60 s are saved; soundscape
  listening is not a practice. `navigator.storage.persist()` is requested on first use.
- `ui/record.ts`: `useRecordOnFinish` saves once when a practice finishes (natural or
  early); `EndScreen` (shared by sitting, breath, guided) adds the optional note.
- `history/stats.ts` (pure): month totals, practised days, Monday-first month grid,
  today/yesterday by calendar day. Storico follows design 06; added month navigation
  and weekday initials. The calendar is an ordered list with hidden full-date labels.

## Product decisions (from the user)

- **No import/export.** Stage 6 is history and stats only: no backup file, no import.
  Do not add it unless the user asks.
- **No biofeedback.** Stage 8 (microphone breath rate, camera heart rate) is dropped:
  no `biofeedback/` module, no microphone/camera permissions, no biofeedback fields in the
  session log. Do not reintroduce it unless the user asks.

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
| fake-indexeddb (dev)                                       | IndexedDB in Vitest (storage + migration tests)        |

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
4. **Generative soundscapes** — done. Rain, wind, water, drone; mixer screen; ambient
   option in Zazen and Respiro; separate bell/ambient volumes; Oggi "Altre pratiche".
5. **Guided meditations** — done. Markdown content format, six sessions (Postura,
   Consapevolezza del respiro, Scansione del corpo, Shikantaza, Suoni, Benevolenza),
   Guidate list per design, playback with text + Italian TTS or a recording.
6. **History** — done (no import/export, by user decision). IndexedDB log with
   migrations, note on the end screen, Storico per design.
