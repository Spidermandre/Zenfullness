/**
 * Guided-meditation file format (Markdown with front matter):
 *
 *   ---
 *   title: Postura
 *   duration: 10          # minutes; a closing bell sounds here
 *   order: 1              # position in the list (optional)
 *   audio: audio/postura.m4a   # optional recording under public/, replaces speech
 *   ---
 *   [00:05] Siediti sul cuscino.
 *   Lines without a timestamp continue the previous instruction.
 *
 *   [01:30] Next instruction…
 *
 * The id is the file name. Times are mm:ss (or h:mm:ss) from the start, strictly
 * increasing and before the end. Text inside an instruction is joined with spaces;
 * a blank line inside an instruction starts a new paragraph.
 */
export interface Instruction {
  /** Seconds from the start. */
  at: number;
  text: string;
}

export interface GuidedSession {
  id: string;
  title: string;
  minutes: number;
  order: number;
  /** Path relative to the app base, e.g. "audio/postura.m4a". */
  audio: string | undefined;
  instructions: Instruction[];
}

export class SessionFormatError extends Error {
  constructor(id: string, message: string) {
    super(`${id}: ${message}`);
    this.name = 'SessionFormatError';
  }
}

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const CUE = /^\[(\d{1,2}(?::\d{2}){1,2})\]\s*(.*)$/;

export function parseTime(value: string): number {
  const parts = value.split(':').map(Number);
  if (parts.some((n) => !Number.isInteger(n) || n < 0)) return NaN;
  return parts.reduce((total, n) => total * 60 + n, 0);
}

function parseFrontMatter(id: string, block: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const raw of block.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '').trim();
    if (line === '' || line.startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon <= 0) throw new SessionFormatError(id, `invalid front matter line "${raw}"`);
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (value !== '') fields[key] = value;
  }
  return fields;
}

export function parseSession(id: string, source: string): GuidedSession {
  const match = FRONT_MATTER.exec(source.replace(/^\uFEFF/, ''));
  if (!match) throw new SessionFormatError(id, 'missing front matter (--- … ---)');
  const fields = parseFrontMatter(id, match[1] ?? '');

  const title = fields.title;
  if (!title) throw new SessionFormatError(id, 'missing "title"');
  const minutes = Number(fields.duration);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 180) {
    throw new SessionFormatError(id, '"duration" must be minutes between 1 and 180');
  }
  const order = fields.order === undefined ? 999 : Number(fields.order);
  if (!Number.isFinite(order)) throw new SessionFormatError(id, '"order" must be a number');
  const audio = fields.audio?.replace(/^\/+/, '');

  const instructions: Instruction[] = [];
  let paragraphs: string[][] | undefined;
  const flush = () => {
    const last = instructions.at(-1);
    if (last && paragraphs) {
      last.text = paragraphs
        .map((p) => p.join(' '))
        .filter((p) => p !== '')
        .join('\n\n');
    }
  };

  for (const raw of (match[2] ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    const cue = CUE.exec(line);
    if (cue) {
      flush();
      const at = parseTime(cue[1] ?? '');
      if (Number.isNaN(at)) throw new SessionFormatError(id, `invalid time "${cue[1] ?? ''}"`);
      const previous = instructions.at(-1);
      if (previous && at <= previous.at) {
        throw new SessionFormatError(id, `time ${cue[1] ?? ''} is not after the previous one`);
      }
      if (at >= minutes * 60) {
        throw new SessionFormatError(id, `time ${cue[1] ?? ''} is after the end of the session`);
      }
      instructions.push({ at, text: '' });
      paragraphs = [[cue[2] ?? ''].filter((s) => s !== '')];
    } else if (paragraphs) {
      if (line === '') paragraphs.push([]);
      else (paragraphs.at(-1) ?? paragraphs[0])?.push(line);
    } else if (line !== '') {
      throw new SessionFormatError(id, `text before the first [mm:ss] instruction: "${line}"`);
    }
  }
  flush();
  if (instructions.length === 0) throw new SessionFormatError(id, 'no instructions');
  for (const instruction of instructions) {
    if (instruction.text === '') {
      throw new SessionFormatError(id, `empty instruction at ${String(instruction.at)} s`);
    }
  }
  return { id, title, minutes, order, audio, instructions };
}

/** The instruction showing at `elapsed` seconds (the last one that has started). */
export function instructionAt(
  session: GuidedSession,
  elapsed: number,
): { index: number; instruction: Instruction } | undefined {
  let found: { index: number; instruction: Instruction } | undefined;
  session.instructions.forEach((instruction, index) => {
    if (instruction.at <= elapsed) found = { index, instruction };
  });
  return found;
}
