# Zenfullness

Web app personale per la pratica zen quotidiana: zazen silenzioso, respirazione guidata,
meditazioni guidate, suoni generativi. Gira interamente nel browser, è installabile come PWA,
funziona senza rete e non invia dati a nessuno.

Pubblicata su GitHub Pages: <https://spidermandre.github.io/Zenfullness/>

## Avvio in locale

Serve Node.js 22 o superiore.

```sh
npm install
npm run dev          # server di sviluppo su http://localhost:5173
```

Altri comandi:

| Comando                       | Cosa fa                                                   |
| ----------------------------- | --------------------------------------------------------- |
| `npm run lint`                | ESLint, zero avvisi ammessi                               |
| `npm run typecheck`           | controllo dei tipi TypeScript (strict)                    |
| `npm test`                    | test unitari (Vitest)                                     |
| `npm run build`               | build di produzione in `dist/` (percorso `/Zenfullness/`) |
| `npm run e2e`                 | test end-to-end (Playwright) sulla build                  |
| `npm run check`               | tutto quanto sopra tranne e2e                             |
| `node scripts/serve-dist.mjs` | serve `dist/` come GitHub Pages su :4173                  |

Per provare l'installazione e l'uso offline: `npm run build && node scripts/serve-dist.mjs`,
poi apri <http://localhost:4173/Zenfullness/>.

## Struttura del progetto

```
design/          export di Claude Design (fonte di verità visiva)
public/icons/    icone della PWA
scripts/         utilità: server statico per gli e2e, generatore dell'icona (scripts/icons)
e2e/             test Playwright
src/
  audio/         sintesi in tempo reale (campane, legni, paesaggi sonori)      — tappa 2, 4
  timer/         motore del timer su istanti assoluti, wake lock               — tappa 2
  breath/        schemi e pacer del respiro                                   — tappa 3
  sessions/      meditazioni guidate: formato, contenuti (content/*.md), voce
  storage/       IndexedDB con migrazioni (registro), impostazioni leggere
  history/       statistiche dello storico (totali, calendario)
  path/          regole del percorso adattivo (spiegate in src/path/RULES.md)
  pwa/           service worker e aggiornamenti che non interrompono la seduta
  ui/            token di design, componenti, schermate, stringhe italiane
```

La logica (timer, sintesi, segnali, regole) non dipende da React e si testa senza interfaccia.

## Come aggiungere una meditazione guidata

Basta aggiungere un file `.md` in `src/sessions/content/`: il nome del file è l'identificativo,
la sessione compare nella lista Guidate al prossimo push (la pubblicazione è automatica).

```markdown
---
title: Camminare
duration: 12 # minuti: alla fine suona la campana
order: 7 # posizione nella lista (facoltativo)
---

[00:05] Alzati lentamente. Porta le mani in shashu, davanti al petto.

[00:40] A ogni respiro, mezzo passo.
Le righe senza orario continuano l'istruzione precedente.

[03:00] Un'istruzione successiva…
```

Regole: gli orari sono `mm:ss` (o `h:mm:ss`) dall'inizio, crescenti e prima della fine; una riga
vuota dentro un'istruzione crea un nuovo paragrafo. All'inizio e alla fine suona una ciotola.
Le istruzioni compaiono come testo e, se "Lettura ad alta voce" è attiva, vengono lette con la
voce italiana migliore del dispositivo. `npm test` verifica ogni file e indica l'errore esatto.

**Con una registrazione.** Metti il file audio in `public/audio/` (meglio `.m4a` o `.mp3`) e
aggiungi al front matter `audio: audio/nome-file.m4a`. La registrazione sostituisce la voce
sintetica e segue pausa e ripresa; gli orari `[mm:ss]` continuano a far comparire il testo.
Il file entra nella cache offline come il resto dell'app. Nessuna modifica al codice.

## Pubblicazione

Ogni push esegue lint, controllo dei tipi, test e build (`.github/workflows/ci.yml`).
I push su `main` pubblicano anche su GitHub Pages.

Configurazione una tantum del repository: **Settings → Pages → Build and deployment →
Source: GitHub Actions**.

## Limiti dei browser e comportamenti alternativi

Bersagli principali: Safari su iOS (riferimento: iPhone 14 Pro con iOS 27) e Chrome su Android.

| Limite                                    | Comportamento dell'app                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| L'audio parte solo dopo un gesto          | L'audio si sblocca al tocco su "Inizia"; nessun suono parte da solo.                                          |
| Interruttore silenzioso di iPhone         | `navigator.audioSession.type = 'playback'` (iOS 17+) fa suonare le campane anche in modalità silenziosa.      |
| Timer in background rallentati            | Lo stato si calcola sempre da istanti assoluti; le campane sono programmate sull'orologio dell'AudioContext.  |
| Schermo bloccato: iOS sospende l'audio    | Wake Lock tiene lo schermo acceso e viene riacquisito al ritorno in primo piano.                              |
| Wake Lock assente o non affidabile        | Ripiego: video muto e invisibile in loop. Su iOS 27 il Wake Lock standard funziona anche nell'app installata. |
| Vibrazione assente su iOS                 | Solo segnali visivi e sonori.                                                                                 |
| Sintesi vocale su iOS solo dopo un tocco  | La voce si sblocca sul tocco di avvio; senza voci italiane le istruzioni restano solo testo.                  |
| Aggiornamento dell'app durante una seduta | La nuova versione aspetta: viene proposta solo quando nessuna pratica è in corso.                             |

I dettagli tecnici si aggiornano a ogni tappa.

## Privacy

Nessun account, nessun backend, nessuna analisi d'uso. Nessuna richiesta di rete verso terze
parti: niente CDN, niente font esterni (la Content Security Policy lo impone). I dati restano
nel browser del dispositivo.
