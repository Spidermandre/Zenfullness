# Design — Zazen app

Source of truth: `Zen App.dc.html` (open in browser; 6 mobile screens, 390×844) and `tokens.css`.

Screens: 01 Home (pratica del giorno + "Perché?"), 02 Zazen (durata, preset, sequenza zazen/kinhin, campane), 03 Seduta (schermo quasi nero, nessun timer, Pausa/Termina), 04 Respiro (pacer + schemi), 05 Guidate (lista sessioni), 06 Storico (calendario, totali, recenti, nessuna classifica).
Missing, to be proposed in the same style: Impostazioni (volumi, wake lock, export/import), Biofeedback (spiegazione permessi, indicatore qualità segnale, avviso "non è uno strumento medico"), editor schemi/preset.

Principles: minimal, paper-light day UI (sage + sand blurred blobs), near-black night UI for sessions; Iowan/Georgia for titles, Helvetica for UI; system fonts only.
Liquid glass: used on every button, chip, card and the tab bar — translucent gradient fill, backdrop blur+saturate, 1px light border, inset top highlight, soft drop shadow. Variants: light, primary (sage tint, white text), night. Needs a colorful/blurred background behind to read; provide fallback for `prefers-reduced-transparency`.
Pacer (Respiro): glass sphere that scales with inhale/exhale; label word only, no numbers.

---

_Note (repository copy):_ `support.js`, the Claude Design preview runtime, is intentionally
omitted, so `Zen App.dc.html` does not render interactively here. The app's tokens live in
`src/ui/tokens.css`; deviations from this export are annotated there.
