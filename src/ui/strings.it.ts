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
  },
  update: {
    available: 'È disponibile una nuova versione.',
    apply: 'Aggiorna',
  },
  placeholder: {
    comingSoon: 'Questa sezione arriverà presto.',
  },
} as const;
