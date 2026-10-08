import { describe, expect, it, vi } from 'vitest';
import { createActivityTracker, shouldOfferUpdate } from './activity';

describe('activity tracker', () => {
  it('is idle by default', () => {
    expect(createActivityTracker().isPracticing()).toBe(false);
  });

  it('stays active until every practice has ended', () => {
    const tracker = createActivityTracker();
    const endA = tracker.begin();
    const endB = tracker.begin();
    endA();
    expect(tracker.isPracticing()).toBe(true);
    endB();
    expect(tracker.isPracticing()).toBe(false);
  });

  it('ignores a repeated end call', () => {
    const tracker = createActivityTracker();
    const endA = tracker.begin();
    tracker.begin();
    endA();
    endA();
    expect(tracker.isPracticing()).toBe(true);
  });

  it('notifies subscribers', () => {
    const tracker = createActivityTracker();
    const listener = vi.fn();
    const unsubscribe = tracker.subscribe(listener);
    const end = tracker.begin();
    end();
    unsubscribe();
    tracker.begin();
    expect(listener.mock.calls).toEqual([[true], [false]]);
  });
});

describe('shouldOfferUpdate', () => {
  it('never offers an update during a practice', () => {
    expect(shouldOfferUpdate(true, true)).toBe(false);
  });
  it('offers a pending update when idle', () => {
    expect(shouldOfferUpdate(true, false)).toBe(true);
  });
  it('offers nothing when up to date', () => {
    expect(shouldOfferUpdate(false, false)).toBe(false);
  });
});
