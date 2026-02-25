import { defineConfig, devices } from '@playwright/test';

const GAME_PORTS = {
  dabble: 3001,
  jumble: 3002,
  carom: 3004,
  trio: 3005,
  inlay: 3006,
} as const;

export default defineConfig({
  testDir: './specs',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // Mobile tests for each game (using chromium with mobile viewport)
    ...Object.entries(GAME_PORTS).map(([game, port]) => ({
      name: `mobile-${game}`,
      testDir: './specs',
      use: {
        // Use chromium with iPhone viewport (instead of webkit)
        browserName: 'chromium' as const,
        viewport: { width: 390, height: 844 }, // iPhone 12 size
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        hasTouch: true,
        isMobile: true,
        baseURL: `http://localhost:${port}`,
      },
      metadata: { gameId: game, port },
    })),
    // Desktop tests (run against dabble as primary)
    {
      name: 'desktop',
      testDir: './specs/shared',
      use: {
        browserName: 'chromium' as const,
        viewport: { width: 1280, height: 720 },
        baseURL: `http://localhost:${GAME_PORTS.dabble}`,
      },
      metadata: { gameId: 'dabble', port: GAME_PORTS.dabble },
    },
  ],

  webServer: Object.entries(GAME_PORTS).map(([game, port]) => ({
    command: `npm run dev -w @grid-games/${game}`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  })),
});
