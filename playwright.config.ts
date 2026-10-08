import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/Zenfullness/`,
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [
    {
      // WebKit is not available in CI containers; Chromium with an iPhone 14 Pro
      // viewport covers layout. Real iOS behaviour is verified on device.
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `node scripts/serve-dist.mjs`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
