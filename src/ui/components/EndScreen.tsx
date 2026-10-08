import { useState } from 'react';
import { formatMinutes } from '../format';
import { saveNote } from '../record';
import { t } from '../strings.it';
import { ScreenTitle } from './ScreenTitle';

/**
 * End of a practice (design proposal 08): title, practised time, optional note.
 * The practice is already saved; the note is added when the user closes.
 */
export function EndScreen({
  title,
  subtitle,
  seconds,
  entryId,
  onClose,
}: {
  title: string;
  subtitle?: string;
  seconds: number;
  entryId: string | undefined;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const close = () => {
    if (entryId && note.trim()) void saveNote(entryId, note);
    onClose();
  };
  return (
    <main className="night-screen night-screen--done">
      <ScreenTitle className="night-title">{title}</ScreenTitle>
      {subtitle && <p className="night-label guided-done-title">{subtitle}</p>}
      <dl className="done-summary">
        <dt className="night-label">{t.sitting.duration}</dt>
        <dd className="done-value">{formatMinutes(seconds)}</dd>
      </dl>
      {entryId && (
        <div className="done-note">
          <label className="night-label" htmlFor="practice-note">
            {t.history.noteLabel}
          </label>
          <textarea
            id="practice-note"
            className="done-note__input"
            rows={3}
            maxLength={2000}
            value={note}
            placeholder={t.history.notePlaceholder}
            onChange={(e) => {
              setNote(e.currentTarget.value);
            }}
          />
        </div>
      )}
      <div className="night-actions">
        <button type="button" className="btn glass glass--night" onClick={close}>
          {t.sitting.close}
        </button>
      </div>
    </main>
  );
}
