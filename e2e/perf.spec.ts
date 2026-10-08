import { expect, test } from '@playwright/test';

/**
 * @perf — run with `npm run perf` (excluded from CI: shared runners are too noisy).
 * Breathing pacer under a 4× slower CPU (a mid-range phone): frame intervals must stay
 * close to 60 fps.
 */
test('@perf breathing pacer keeps 60 fps on a 4× slower CPU', async ({ page }) => {
  await page.goto('./#/respiro');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.getByRole('button', { name: 'Coerenza' }).click();
  await page.getByRole('button', { name: 'Inizia' }).click();
  await page.waitForTimeout(500);

  const intervals = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const times: number[] = [];
        const frame = (t: number) => {
          times.push(t);
          if (times.length < 300) requestAnimationFrame(frame);
          else resolve(times.slice(1).map((v, i) => v - (times[i] ?? v)));
        };
        requestAnimationFrame(frame);
      }),
  );
  const sorted = [...intervals].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  const dropped = intervals.filter((d) => d > 25).length;
  test.info().annotations.push({
    type: 'frames',
    description: `${String(intervals.length)} frames, p95 ${p95.toFixed(1)} ms, ${String(dropped)} over 25 ms`,
  });
  expect(p95).toBeLessThan(20);
  expect(dropped / intervals.length).toBeLessThan(0.02);
});
