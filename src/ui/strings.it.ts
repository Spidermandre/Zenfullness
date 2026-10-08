/**
 * All user-facing Italian strings live here. Components never hard-code copy.
 * Keep the tone plain and calm: no exclamation marks, no praise, no guilt.
 */
export const t = {
  appName: 'Zenfullness',
  tabs: {
    label: 'Sezioni',
    today: 'Oggi',
    zazen: 'Zazen',
    breath: 'Respiro',
    guided: 'Guidate',
    history: 'Storico',
  },
  greeting: {
    morning: 'Buongiorno',
    afternoon: 'Buon pomeriggio',
    evening: 'Buonasera',
  },
  today: {
    otherPractices: 'Altre pratiche',
    breathing: 'Respirazione',
    guided: 'Guidata',
    soundscape: 'Paesaggio sonoro',
  },
  soundscape: {
    title: 'Paesaggio sonoro',
    back: 'Torna a Oggi',
    layers: 'Suoni',
    names: { rain: 'Pioggia', wind: 'Vento', water: 'Acqua', drone: 'Bordone' },
    level: 'Volume',
    silence: 'Silenzio',
    volume: 'Volume ambiente',
    listen: 'Ascolta',
    stop: 'Ferma',
    note: 'Suoni generati in tempo reale: non si ripetono mai uguali.',
  },
  settings: {
    title: 'Impostazioni',
    open: 'Apri le impostazioni',
    back: 'Torna indietro',
    version: 'Versione',
    offline: 'Uso senza rete',
    offlineReady: 'Pronta',
    offlinePending: 'In preparazione',
    offlineUnsupported: 'Non disponibile in questo browser',
    bellVolume: 'Volume campane',
    ambientVolume: 'Volume ambiente',
    testBell: 'Prova',
    testBellLabel: 'Prova il volume delle campane',
  },
  update: {
    available: 'È disponibile una nuova versione.',
    apply: 'Aggiorna',
  },
  zazen: {
    title: 'Zazen',
    minutes: 'minuti',
    decrease: 'Un minuto in meno',
    increase: 'Un minuto in più',
    presets: 'Durate',
    sequence: 'Sequenza',
    periodName: { zazen: 'Zazen', kinhin: 'Kinhin' },
    editing: 'in modifica',
    addRound: 'Aggiungi kinhin e zazen',
    removeRound: "Togli l'ultimo giro",
    prep: 'Preparazione',
    prepNone: 'Nessuna',
    bells: 'Campane',
    bellSets: { traditional: 'Tradizionali', inkin: 'Inkin', wood: 'Legno' },
    midBell: 'Campana a metà',
    showTime: 'Mostra tempo',
    ambient: 'Ambiente',
    yes: 'Sì',
    no: 'No',
    savePreset: 'Salva come durata',
    deletePreset: 'Elimina questa durata',
    start: 'Inizia la seduta',
  },
  sitting: {
    prep: 'Preparazione',
    of: 'di',
    paused: 'In pausa',
    pause: 'Pausa',
    resume: 'Riprendi',
    end: 'Termina',
    confirmEnd: 'Tocca ancora per terminare',
    remaining: 'Tempo rimanente nel periodo',
    doneTitle: 'Seduta conclusa',
    doneEarly: 'Seduta interrotta',
    duration: 'Durata',
    close: 'Chiudi',
    audioBlocked: "L'audio è sospeso. Tocca lo schermo per riattivarlo.",
  },
  breath: {
    title: 'Respiro',
    patterns: 'Schemi',
    chip: {
      susokukan: 'Susokukan',
      square: 'Quadrato',
      long46: '4–6',
      long478: '4–7–8',
      coherence: 'Coerenza',
      custom: 'Personale',
    },
    name: {
      susokukan: 'Conteggio dei respiri',
      square: 'Respiro quadrato',
      long46: 'Espirazione lunga',
      long478: 'Espirazione lunga',
      coherence: 'Coerenza',
      custom: 'Personale',
    },
    perMinute: 'al minuto',
    countRange: '1–10',
    phase: { inhale: 'inspira', holdIn: 'trattieni', exhale: 'espira', holdOut: 'pausa' },
    phaseLong: {
      inhale: 'Inspirazione',
      holdIn: 'Pausa a polmoni pieni',
      exhale: 'Espirazione',
      holdOut: 'Pausa a polmoni vuoti',
    },
    counts: ['uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci'],
    ready: 'pronto',
    duration: 'Durata',
    sound: 'Suono',
    haptics: 'Vibrazione',
    ambient: 'Ambiente',
    edit: 'Modifica',
    editTitle: 'Schema personale',
    seconds: 's',
    less: 'meno',
    more: 'più',
    done: 'Fatto',
    start: 'Inizia',
    pause: 'Pausa',
    resume: 'Riprendi',
    end: 'Termina',
    finished: 'Respiro concluso',
    endedEarly: 'Respiro interrotto',
  },
  guided: {
    title: 'Guidate',
    start: 'Inizia',
    minutes: 'min',
    recorded: 'registrata',
    voice: 'Lettura ad alta voce',
    voiceUnavailable: 'Non disponibile in questo browser',
    ambient: 'Ambiente',
    label: 'Guidata',
    finished: 'Meditazione conclusa',
    endedEarly: 'Meditazione interrotta',
  },
  path: {
    eyebrow: 'Pratica di oggi',
    zazenTitle: (minutes: number) => `Zazen, ${String(minutes)} minuti`,
    breathTitle: (minutes: number) => `Respiro, ${String(minutes)} minuti`,
    guidedTitle: (title: string, minutes: number) => `${title}, ${String(minutes)} minuti`,
    start: 'Inizia',
    why: 'Perché?',
    hideWhy: 'Nascondi',
    whyTitle: 'Perché questa proposta',
    footnote:
      'Regole semplici e fisse, calcolate sul telefono dal tuo storico. La proposta si può sempre ignorare.',
    /** One neutral line on the card. After a pause: no comment. */
    card: {
      'first-time': () => 'Si comincia con poco.',
      'steady-step-up': (v: Record<string, number>) =>
        `Hai praticato con regolarità. Si sale a ${String(v.minutes)} minuti.`,
      'steady-stay': (v: Record<string, number>) =>
        `Hai praticato con regolarità questa settimana. Si resta su ${String(v.minutes)} minuti.`,
      'steady-at-max': (v: Record<string, number>) => `Si resta su ${String(v.minutes)} minuti.`,
      'building-regularity': (v: Record<string, number>) =>
        `Si resta su ${String(v.minutes)} minuti.`,
      'short-break': () => 'Una seduta semplice.',
      'long-break': () => 'Una seduta semplice.',
      'ended-early': () => 'Una seduta semplice.',
      'already-sat-today': () => 'Oggi hai già fatto zazen. Una guidata, se ti va.',
      'late-evening': () => 'È tardi: un respiro lento prima di dormire.',
    },
    /** The rule behind the proposal, shown under "Perché?". Factual, never judging. */
    reasons: {
      'first-time': () => 'Non ci sono ancora sedute registrate: si parte da 10 minuti.',
      'steady-step-up': (v: Record<string, number>) =>
        `Hai praticato ${String(v.days)} giorni negli ultimi 7 e le ultime ${String(v.sittings)} sedute erano complete: la durata sale di 5 minuti, fino a un massimo di 40.`,
      'steady-stay': (v: Record<string, number>) =>
        `Hai praticato ${String(v.days)} giorni negli ultimi 7. La durata sale dopo 3 sedute complete a questa lunghezza.`,
      'steady-at-max': () =>
        '40 minuti è la durata più lunga che il percorso propone. Da Zazen puoi sempre sederti più a lungo.',
      'building-regularity': (v: Record<string, number>) =>
        `Negli ultimi 7 giorni hai praticato ${String(v.days)} ${v.days === 1 ? 'giorno' : 'giorni'}. La durata sale quando sono almeno 4.`,
      'short-break': (v: Record<string, number>) =>
        `L'ultima pratica è di ${String(v.days)} giorni fa: si riparte con 5 minuti in meno.`,
      'long-break': (v: Record<string, number>) =>
        `L'ultima pratica è di ${String(v.days)} giorni fa: si riparte con 10 minuti in meno.`,
      'ended-early': (v: Record<string, number>) =>
        `${String(v.early)} delle ultime ${String(v.of)} sedute sono terminate prima della fine: una durata un po' più breve.`,
      'already-sat-today': () =>
        "Oggi c'è già una seduta di zazen. Per variare, la meditazione guidata che non fai da più tempo.",
      'late-evening': () =>
        "Dopo le 21, se di solito non pratichi a quest'ora, una respirazione breve con espirazione lunga.",
    },
  },
  /** Short explanations for newcomers, shown under titles and options (never during a practice). */
  help: {
    zazen:
      'Meditazione seduta: schiena dritta, occhi socchiusi, mani unite in grembo. Non si cerca di pensare a nulla: si lasciano passare i pensieri e si torna alla postura e al respiro.',
    sequence:
      'Zazen è il periodo seduto. Kinhin è la meditazione camminata tra due periodi: passi lentissimi, mezzo passo a ogni respiro, mani unite davanti al petto. Tocca un periodo per cambiarne la durata con − e +.',
    duration: 'Scegli quanto dura ogni periodo di zazen. Se inizi ora, 10–15 minuti bastano.',
    prep: 'Tempo per sistemarti sul cuscino prima della prima campana.',
    bells:
      'Tre rintocchi aprono lo zazen, due il kinhin, uno chiude la seduta. Tocca per cambiare suono e sentirlo.',
    midBell: 'Un rintocco leggero a metà di ogni zazen, per sapere dove sei senza guardare.',
    showTime: 'Mostra il tempo che resta. Senza, lo schermo resta buio: è il modo tradizionale.',
    ambient: 'Aggiunge sotto le campane il paesaggio sonoro scelto in Oggi → Paesaggio sonoro.',
    savePreset: 'Salva la sequenza attuale tra le durate qui sopra, per ritrovarla con un tocco.',
    breath: {
      susokukan:
        'Conta le espirazioni da uno a dieci, poi ricomincia. Se perdi il conto, riparti da uno senza giudicarti. Il ritmo è naturale: la sfera è solo un appoggio.',
      square:
        'Inspira, trattieni, espira e resta a polmoni vuoti, quattro secondi ciascuno. Aiuta a ritrovare calma e attenzione.',
      long46:
        "Inspira per 4 secondi ed espira per 6. L'espirazione più lunga rallenta il battito e scioglie la tensione.",
      long478:
        'Inspira per 4 secondi, trattieni per 7, espira lentamente per 8. Indicato la sera, prima di dormire.',
      coherence:
        'Cinque secondi dentro e cinque fuori: sei respiri al minuto, un ritmo regolare e riposante.',
      custom: 'Scegli tu la durata di ogni fase con "Modifica".',
    },
    breathHow:
      'Segui la sfera: quando si allarga inspira, quando si restringe espira. Respira dal naso.',
    breathOptions: 'Durata, suono e ambiente: tocca per cambiarli.',
    guided:
      'Una voce ti accompagna con brevi istruzioni, separate da lunghi silenzi. Utili per imparare o quando sedersi da soli è difficile.',
    voice: 'Legge le istruzioni con la voce del telefono. Senza, compaiono solo come testo.',
    soundscape:
      'Suoni naturali generati sul momento, da usare durante la pratica o semplicemente per riposare. Accendi quelli che vuoi e regola il volume di ciascuno.',
    history:
      'Ogni pratica di almeno un minuto viene registrata qui. I giorni pieni nel calendario sono quelli in cui hai praticato.',
    settingsOffline: '"Pronta" significa che l\'app funziona anche senza internet.',
    settingsVolumes: 'Campane e ambiente hanno volumi separati. "Prova" fa suonare una campana.',
  },
  history: {
    title: 'Storico',
    sessions: (n: number) => (n === 1 ? 'seduta' : 'sedute'),
    inMonth: (month: string) => `in ${month}`,
    previousMonth: 'Mese precedente',
    nextMonth: 'Mese successivo',
    weekdays: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
    weekdayNames: ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'],
    practised: 'pratica registrata',
    today: 'oggi',
    yesterday: 'ieri',
    recent: 'Recenti',
    empty: 'Nessuna pratica registrata, per ora.',
    kind: { zazen: 'Zazen', breath: 'Respiro', guided: 'Guidata' },
    noteLabel: 'Nota',
    notePlaceholder: 'Facoltativa',
  },
} as const;
