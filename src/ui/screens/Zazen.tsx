import { useState } from 'react';
import { strike, unlockAudio } from '../../audio/engine';
import { samePeriods, type SavedPreset } from '../../storage/settings';
import { mixLabel } from '../../audio/soundscapes/mix';
import {
  clampMinutes,
  mainInstrument,
  sequence,
  type BellSet,
  type Period,
  type SittingConfig,
} from '../../timer/plan';
import { ScreenTitle } from '../components/ScreenTitle';
import { openPractice } from '../practice';
import { startAmbient } from '../ambient';
import { createSitting } from './Sitting';
import { t } from '../strings.it';
import { updateSettings, useSettings } from '../useSettings';

const DURATIONS = [15, 20, 25, 40] as const;
const PREP_STEPS: readonly number[] = [0, 10, 30, 60];
const BELL_SETS: readonly BellSet[] = ['traditional', 'inkin', 'wood'];
const DEFAULT_KINHIN = 10;

const next = <T,>(list: readonly T[], value: T): T =>
  list[(list.indexOf(value) + 1) % list.length] ?? value;

function presetLabel(periods: readonly Period[]): string {
  return periods.map((p) => p.minutes).join('·');
}

function setSitting(change: (s: SittingConfig) => SittingConfig): void {
  updateSettings((s) => ({ ...s, sitting: change(s.sitting) }));
}

export function Zazen() {
  const { sitting, presets, mix } = useSettings();
  const { periods } = sitting;
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, periods.length - 1);
  const current = periods[index] ?? periods[0];
  const minutes = current?.minutes ?? 25;

  const setMinutes = (value: number) => {
    setSitting((s) => ({
      ...s,
      periods: s.periods.map((p, i) => (i === index ? { ...p, minutes: clampMinutes(value) } : p)),
    }));
  };

  /** Duration chips set every zazen period, keeping the sequence shape. */
  const applyDuration = (value: number) => {
    setSitting((s) => ({
      ...s,
      periods: s.periods.map((p) => (p.kind === 'zazen' ? { ...p, minutes: value } : p)),
    }));
  };

  const applyPreset = (preset: SavedPreset) => {
    setSelected(0);
    setSitting((s) => ({ ...s, periods: preset.periods }));
  };

  const savedPreset = presets.find((p) => samePeriods(p.periods, periods));
  const isBuiltIn = periods.length === 1 && DURATIONS.some((d) => d === periods[0]?.minutes);

  const savePreset = () => {
    updateSettings((s) => ({
      ...s,
      presets: [...s.presets, { id: `p${String(Date.now())}`, periods: s.sitting.periods }],
    }));
  };

  const deletePreset = (id: string) => {
    updateSettings((s) => ({ ...s, presets: s.presets.filter((p) => p.id !== id) }));
  };

  const addRound = () => {
    const zazen = periods.find((p) => p.kind === 'zazen')?.minutes ?? 25;
    setSitting((s) => ({
      ...s,
      periods: [...s.periods, ...sequence(zazen, DEFAULT_KINHIN, 2).slice(1)],
    }));
  };

  const removeRound = () => {
    setSelected(0);
    setSitting((s) => ({ ...s, periods: s.periods.slice(0, -2) }));
  };

  const cycleBells = () => {
    const bells = next(BELL_SETS, sitting.bells);
    setSitting((s) => ({ ...s, bells }));
    // Preview the new sound; the tap is the user gesture that allows audio.
    const ctx = unlockAudio();
    strike(mainInstrument(bells), ctx.currentTime);
  };

  const start = () => {
    unlockAudio();
    if (sitting.ambient) startAmbient();
    openPractice({ kind: 'sitting', config: sitting, sitting: createSitting(sitting) });
  };

  const durationChips: { key: string; label: string; pressed: boolean; onClick: () => void }[] = [
    ...DURATIONS.map((d) => ({
      key: `d${String(d)}`,
      label: String(d),
      pressed: periods.length === 1 && periods[0]?.minutes === d,
      onClick: () => {
        applyDuration(d);
      },
    })),
    ...presets.map((p) => ({
      key: p.id,
      label: presetLabel(p.periods),
      pressed: p === savedPreset,
      onClick: () => {
        applyPreset(p);
      },
    })),
  ];

  return (
    <main className="screen screen--with-action">
      <ScreenTitle>{t.zazen.title}</ScreenTitle>

      <div className="stepper">
        <button
          type="button"
          className="stepper__button glass"
          aria-label={t.zazen.decrease}
          onClick={() => {
            setMinutes(minutes - 1);
          }}
        >
          −
        </button>
        <p className="stepper__value" aria-live="polite">
          <span className="stepper__number">{minutes}</span>
          <span className="stepper__unit">
            {t.zazen.minutes}
            {periods.length > 1 && current
              ? ` · ${t.zazen.periodName[current.kind].toLowerCase()} ${String(index + 1)}`
              : ''}
          </span>
        </p>
        <button
          type="button"
          className="stepper__button glass"
          aria-label={t.zazen.increase}
          onClick={() => {
            setMinutes(minutes + 1);
          }}
        >
          +
        </button>
      </div>

      <ul className="chips" aria-label={t.zazen.presets}>
        {durationChips.map((chip) => (
          <li key={chip.key}>
            <button
              type="button"
              className="chip"
              aria-pressed={chip.pressed}
              onClick={chip.onClick}
            >
              {chip.label}
            </button>
          </li>
        ))}
      </ul>

      <h2 className="eyebrow section-label">{t.zazen.sequence}</h2>
      <ul className="rows">
        {periods.map((period, i) => (
          <li key={`${String(i)}-${period.kind}`}>
            <button
              type="button"
              className="row row--button"
              aria-current={periods.length > 1 && i === index ? 'true' : undefined}
              onClick={() => {
                setSelected(i);
              }}
            >
              <span>{t.zazen.periodName[period.kind]}</span>
              <span className="row__value">{period.minutes} min</span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="row row--button row--action" onClick={addRound}>
            <span>{t.zazen.addRound}</span>
            <span className="row__value" aria-hidden="true">
              +
            </span>
          </button>
        </li>
        {periods.length > 1 && (
          <li>
            <button type="button" className="row row--button row--action" onClick={removeRound}>
              <span>{t.zazen.removeRound}</span>
              <span className="row__value" aria-hidden="true">
                −
              </span>
            </button>
          </li>
        )}
      </ul>

      <ul className="rows rows--settings">
        <li>
          <button
            type="button"
            className="row row--button"
            onClick={() => {
              setSitting((s) => ({ ...s, prepSeconds: next(PREP_STEPS, s.prepSeconds) }));
            }}
          >
            <span>{t.zazen.prep}</span>
            <span className="row__value">
              {sitting.prepSeconds === 0 ? t.zazen.prepNone : `${String(sitting.prepSeconds)} s`}
            </span>
          </button>
        </li>
        <li>
          <button type="button" className="row row--button" onClick={cycleBells}>
            <span>{t.zazen.bells}</span>
            <span className="row__value">{t.zazen.bellSets[sitting.bells]}</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            role="switch"
            aria-checked={sitting.midBell}
            className="row row--button"
            onClick={() => {
              setSitting((s) => ({ ...s, midBell: !s.midBell }));
            }}
          >
            <span>{t.zazen.midBell}</span>
            <span className="row__value">{sitting.midBell ? t.zazen.yes : t.zazen.no}</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            role="switch"
            aria-checked={sitting.showTime}
            className="row row--button"
            onClick={() => {
              setSitting((s) => ({ ...s, showTime: !s.showTime }));
            }}
          >
            <span>{t.zazen.showTime}</span>
            <span className="row__value">{sitting.showTime ? t.zazen.yes : t.zazen.no}</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            role="switch"
            aria-checked={sitting.ambient}
            className="row row--button"
            onClick={() => {
              setSitting((s) => ({ ...s, ambient: !s.ambient }));
            }}
          >
            <span>{t.zazen.ambient}</span>
            <span className="row__value">
              {sitting.ambient
                ? mixLabel(mix, t.soundscape.names, t.soundscape.silence)
                : t.zazen.no}
            </span>
          </button>
        </li>
        {savedPreset ? (
          <li>
            <button
              type="button"
              className="row row--button row--action"
              onClick={() => {
                deletePreset(savedPreset.id);
              }}
            >
              <span>{t.zazen.deletePreset}</span>
            </button>
          </li>
        ) : (
          !isBuiltIn && (
            <li>
              <button type="button" className="row row--button row--action" onClick={savePreset}>
                <span>{t.zazen.savePreset}</span>
              </button>
            </li>
          )
        )}
      </ul>

      <div className="screen-action">
        <button
          type="button"
          className="btn btn--lg btn--block glass glass--primary"
          onClick={start}
        >
          {t.zazen.start}
        </button>
      </div>
    </main>
  );
}
