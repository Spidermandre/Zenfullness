# Percorso adattivo — regole

Modulo: `src/path/rules.ts` (funzioni pure, nessuna AI, nessuna rete). Test: `rules.test.ts`.
La proposta si può sempre ignorare; "Perché?" mostra la regola che l'ha prodotta.

## Principi

- Si allunga solo quando la pratica è stabile, un passo alla volta.
- Dopo una pausa si accorcia **senza commenti** sulla scheda: il motivo compare solo sotto "Perché?".
- Mai punitivo: nessun contatore, nessuna serie, nessun messaggio di colpa. Un giorno saltato non cambia nulla.

## Parametri

| Parametro                       | Valore       |
| ------------------------------- | ------------ |
| Durata iniziale                 | 10 min       |
| Durata massima proposta         | 40 min       |
| Passo                           | 5 min        |
| Giorni di pratica per "stabile" | 4 su 7       |
| Sedute complete prima di salire | 3            |
| Pausa breve / lunga             | 3 / 7 giorni |
| Sera tardi                      | 21:00–04:59  |

## Durata di riferimento dello zazen

La mediana delle ultime 3 sedute di zazen **complete** (durata prevista), arrotondata a 5 minuti
e tenuta tra 10 e 40. Senza sedute: 10 minuti.

## Regole, nell'ordine in cui vengono valutate

1. **Già seduto oggi** → una meditazione guidata, la meno praticata di recente
   (prima quelle mai fatte). Non si propone "ancora di più" della stessa cosa.
2. **Sera tardi** (21:00–04:59) e non è la propria ora abituale (meno della metà delle
   pratiche avviene di notte) → respirazione con espirazione lunga (4–6), 6 minuti.
3. Altrimenti **zazen**, con la durata così determinata:
   1. **Pausa lunga** (≥ 7 giorni dall'ultima pratica di qualsiasi tipo) → riferimento − 10 min.
   2. **Pausa breve** (3–6 giorni) → riferimento − 5 min.
   3. **Spesso interrotte** (2 delle ultime 3 sedute terminate prima della fine) → riferimento − 5 min.
   4. **Regolarità in costruzione** (meno di 4 giorni di pratica negli ultimi 7) → si resta.
   5. **Stabile e pronto** (≥ 4 giorni su 7, le ultime 3 sedute complete e tutte almeno alla
      durata di riferimento) → riferimento + 5 min, fino a 40.
   6. **Stabile** → si resta (oppure si resta a 40, il massimo).

Le durate risultanti restano sempre tra 10 e 40 minuti. I giorni sono giorni di calendario
locali (23:50 e 00:10 sono due giorni diversi).

## Cosa conta

- Per la **regolarità** contano tutte le pratiche registrate (zazen, respiro, guidate).
- Per la **durata** conta solo lo zazen.
- Le pratiche sotto il minuto non vengono registrate e quindi non contano.

## Modificare le regole

Cambiare i parametri in cima a `rules.ts`, aggiornare questa pagina e i test.
I testi mostrati sotto "Perché?" sono in `src/ui/strings.it.ts` (`path.reasons`).
